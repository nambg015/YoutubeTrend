// Xác minh SĐT bằng Telegram Bot (khuyên dùng, miễn phí 100%, tức thì) hoặc SMS OTP
const crypto = require('crypto');
const smsDefault = require('./sms');
const storeDefault = require('./store');
const telegramDefault = require('./telegram');

const OTP_TTL = 300, COOLDOWN = 60, MAX_TRIES = 5;
const LIMIT_UID_HOUR = 5, LIMIT_PHONE_DAY = 5, LIMIT_IP_HOUR = 20;
const TEN_YEARS = 315360000;

const phoneRequired = () => (process.env.REQUIRE_PHONE || '').trim().toLowerCase() !== 'false';

function normalizePhone(raw) {
  let d = String(raw || '').replace(/[\s.\-()]/g, '');
  if (d.startsWith('+84')) d = '0' + d.slice(3);
  else if (d.startsWith('84') && d.length === 11) d = '0' + d.slice(2);
  if (!/^0[35789]\d{8}$/.test(d)) return { ok: false };
  return { ok: true, local: d, intl: '+84' + d.slice(1) };
}
const toLocal = intl => (intl && intl.startsWith('+84') ? '0' + intl.slice(3) : (intl || ''));

function secret() {
  const s = (process.env.OTP_SECRET || '').trim();
  if (s) return s;
  return 'youtrend-secure-otp-secret-key-2026';
}
const hashCode = (uid, phone, code) => crypto.createHmac('sha256', secret()).update(uid + '|' + phone + '|' + code).digest('hex');
const safeEq = (a, b) => {
  if (!a || !b) return false;
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const out = (status, json) => ({ status, json });
const fail = (status, code, message, extra) => out(status, Object.assign({ success: false, code, message }, extra));

async function getVerifiedPhone(uid, store = storeDefault) {
  return (await store.get('user_phone:' + uid)) || '';
}

// claims: payload token Firebase đã xác thực. body: JSON từ trình duyệt. ip: IP người gọi.
async function handle({ claims, body, ip }, deps = {}) {
  const store = deps.store || storeDefault;
  const sms = deps.sms || smsDefault;
  const telegram = deps.telegram || telegramDefault;
  const uid = claims.sub;
  const action = (body && body.action) || 'status';

  if (action === 'status') {
    const phone = await getVerifiedPhone(uid, store);
    const botUser = telegram.getBotUsername() || 'YouTrendVerifyBot';
    return out(200, {
      success: true,
      required: phoneRequired(),
      verified: !!phone,
      phone: toLocal(phone),
      telegramConfigured: telegram.isConfigured(),
      smsConfigured: sms.isConfigured(),
      botUsername: botUser
    });
  }

  // 1. Tạo phiên xác thực qua Telegram Bot (Deep Link)
  if (action === 'create_telegram_session') {
    const sessionToken = 'auth_' + crypto.randomBytes(16).toString('hex');
    await store.set('tg_session:' + sessionToken, JSON.stringify({
      uid,
      email: claims.email || '',
      createdAt: Date.now(),
      verified: false
    }), 600); // 10 phút

    const botUser = telegram.getBotUsername() || 'YouTrendVerifyBot';
    const botUrl = `https://t.me/${botUser}?start=${sessionToken}`;
    return out(200, {
      success: true,
      sessionToken,
      botUsername: botUser,
      botUrl,
      configured: telegram.isConfigured(),
      expiresIn: 600
    });
  }

  // 2. Kiểm tra phiên xác thực Telegram (Web polling)
  if (action === 'check_telegram_session') {
    const sessionToken = String((body && body.sessionToken) || '').trim();
    if (!sessionToken) return fail(400, 'MISSING_SESSION', 'Thiếu mã phiên sessionToken.');

    const raw = await store.get('tg_session:' + sessionToken);
    let sessionData = null;
    try { sessionData = JSON.parse(raw || 'null'); } catch (e) {}

    if (!sessionData) return out(200, { success: true, verified: false, expired: true });

    if (sessionData.verified && sessionData.uid === uid) {
      return out(200, {
        success: true,
        verified: true,
        phone: toLocal(sessionData.phone),
        code: sessionData.code
      });
    }

    return out(200, { success: true, verified: false });
  }

  if (!phoneRequired()) return fail(400, 'PHONE_NOT_REQUIRED', 'Hệ thống đang tắt yêu cầu xác minh SĐT.');

  const p = normalizePhone(body && body.phone);
  if (!p.ok && (action === 'send' || (action === 'verify' && !body.codeOnly))) {
    return fail(400, 'INVALID_PHONE', 'Vui lòng nhập số di động Việt Nam hợp lệ (ví dụ 0912345678).');
  }

  if (action === 'send') {
    if (!sms.isConfigured()) {
      return fail(503, 'SMS_NOT_CONFIGURED', 'Hệ thống đang hỗ trợ xác minh tức thì qua Telegram Bot miễn phí 100%. Vui lòng bấm "Nhận Mã Qua Telegram".');
    }

    if (await getVerifiedPhone(uid, store)) return fail(409, 'ALREADY_VERIFIED', 'Tài khoản này đã xác minh số điện thoại rồi.');
    const owner = await store.get('phone_owner:' + p.intl);
    if (owner && owner !== uid) return fail(409, 'PHONE_TAKEN', 'Số điện thoại này đã gắn với một tài khoản khác. Mỗi SĐT chỉ dùng cho 1 tài khoản.');

    if (!(await store.setOnce('otp_cd:' + uid, '1', COOLDOWN))) {
      return fail(429, 'RATE_LIMITED', 'Vui lòng đợi ' + COOLDOWN + ' giây rồi bấm gửi lại mã.', { retryAfter: COOLDOWN });
    }
    const tooMany = (await store.incr('otp_h:' + uid, 3600)) > LIMIT_UID_HOUR
      || (await store.incr('otp_p:' + p.intl, 86400)) > LIMIT_PHONE_DAY
      || (ip && (await store.incr('otp_ip:' + ip, 3600)) > LIMIT_IP_HOUR);
    if (tooMany) return fail(429, 'RATE_LIMITED', 'Bạn đã yêu cầu quá nhiều mã. Vui lòng thử lại sau ít phút.', { retryAfter: 600 });

    let code = String(crypto.randomInt(100000, 1000000));
    try {
      const sent = await sms.sendOtpSms(p.local, code, deps.smsDeps);
      if (sent && sent.code) code = String(sent.code);
    } catch (e) {
      console.error('[sms] gửi thất bại:', e.message);
      return fail(502, 'SMS_FAILED', 'Không gửi được tin nhắn OTP. Bạn có thể chọn xác thực nhanh qua Telegram Bot.');
    }
    await store.set('otp:' + uid, JSON.stringify({ h: hashCode(uid, p.intl, code), phone: p.intl }), OTP_TTL);
    await store.del('otp_tries:' + uid);
    return out(200, { success: true, local: p.local, intl: p.intl, cooldown: COOLDOWN, ttl: OTP_TTL });
  }

  if (action === 'verify') {
    const code = String((body && body.code) || '').replace(/\D/g, '');
    if (code.length < 4 || code.length > 8) return fail(400, 'INVALID_CODE', 'Vui lòng nhập đủ mã OTP trong tin nhắn hoặc Telegram.');
    let rec = null;
    try { rec = JSON.parse((await store.get('otp:' + uid)) || 'null'); } catch (e) {}
    if (!rec) return fail(400, 'OTP_EXPIRED', 'Mã OTP đã hết hạn hoặc chưa được gửi. Hãy bấm "Gửi lại mã".');
    if (p.ok && rec.phone && rec.phone !== p.intl) return fail(400, 'OTP_PHONE_MISMATCH', 'Số điện thoại khác với số đã nhận mã.');

    if ((await store.incr('otp_tries:' + uid, OTP_TTL)) > MAX_TRIES) {
      await store.del('otp:' + uid);
      return fail(429, 'TOO_MANY_TRIES', 'Bạn đã nhập sai quá nhiều lần. Hãy bấm gửi lại mã mới.');
    }
    const targetPhone = rec.phone || (p.ok ? p.intl : '');
    if (!safeEq(rec.h, hashCode(uid, targetPhone, code))) return fail(400, 'OTP_WRONG', 'Mã OTP không đúng.');

    const claimed = await store.setOnce('phone_owner:' + targetPhone, uid, TEN_YEARS);
    if (!claimed && (await store.get('phone_owner:' + targetPhone)) !== uid) {
      await store.del('otp:' + uid);
      return fail(409, 'PHONE_TAKEN', 'Số điện thoại này đã gắn với một tài khoản khác. Mỗi SĐT chỉ dùng cho 1 tài khoản.');
    }
    await store.set('user_phone:' + uid, targetPhone);
    await store.del('otp:' + uid);
    await store.del('otp_tries:' + uid);
    return out(200, { success: true, verified: true, phone: toLocal(targetPhone) });
  }

  return fail(400, 'BAD_ACTION', 'Hành động không hợp lệ.');
}

module.exports = { handle, normalizePhone, getVerifiedPhone, phoneRequired, toLocal, hashCode };
