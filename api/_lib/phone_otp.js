// Xác minh SĐT bằng OTP do SERVER tự sinh + gửi qua nhà SMS Việt Nam (không dùng Firebase Phone Auth nữa).
// Dữ liệu lưu trong KV (Upstash):
//   otp:<uid>            {h, phone}   mã băm HMAC, sống 5 phút
//   otp_tries:<uid>      số lần nhập sai
//   phone_owner:<+84..>  uid đang sở hữu SĐT  (1 SĐT = 1 tài khoản)
//   user_phone:<uid>     +84.. đã xác minh của tài khoản
const crypto = require('crypto');
const smsDefault = require('./sms');
const storeDefault = require('./store');

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
  if (smsDefault.isProd()) return '';
  return 'dev-only-secret';
}
const hashCode = (uid, phone, code) => crypto.createHmac('sha256', secret()).update(uid + '|' + phone + '|' + code).digest('hex');
const safeEq = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };

const out = (status, json) => ({ status, json });
const fail = (status, code, message, extra) => out(status, Object.assign({ success: false, code, message }, extra));

async function getVerifiedPhone(uid, store = storeDefault) {
  return (await store.get('user_phone:' + uid)) || '';
}

// claims: payload token Firebase đã xác thực. body: JSON từ trình duyệt. ip: IP người gọi.
async function handle({ claims, body, ip }, deps = {}) {
  const store = deps.store || storeDefault;
  const sms = deps.sms || smsDefault;
  const uid = claims.sub;
  const action = (body && body.action) || 'status';

  if (action === 'status') {
    const phone = await getVerifiedPhone(uid, store);
    return out(200, { success: true, required: phoneRequired(), verified: !!phone, phone: toLocal(phone) });
  }

  if (!phoneRequired()) return fail(400, 'PHONE_NOT_REQUIRED', 'Hệ thống đang tắt yêu cầu xác minh SĐT.');

  if (!sms.isConfigured()) return fail(503, 'SMS_NOT_CONFIGURED', 'Hệ thống chưa cấu hình dịch vụ gửi SMS. Vui lòng liên hệ quản trị viên.');
  if (!secret()) return fail(503, 'SERVER_MISCONFIGURED', 'Máy chủ thiếu OTP_SECRET.');
  if (!store.hasKv() && sms.isProd()) return fail(503, 'KV_REQUIRED', 'Máy chủ chưa gắn Redis/KV nên chưa thể xác minh SĐT.');

  const p = normalizePhone(body && body.phone);
  if (!p.ok) return fail(400, 'INVALID_PHONE', 'Vui lòng nhập số di động Việt Nam hợp lệ (ví dụ 0912345678).');

  if (action === 'send') {
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

    const code = String(crypto.randomInt(100000, 1000000));
    await store.set('otp:' + uid, JSON.stringify({ h: hashCode(uid, p.intl, code), phone: p.intl }), OTP_TTL);
    await store.del('otp_tries:' + uid);
    try {
      await sms.sendOtpSms(p.local, code, deps.smsDeps);
    } catch (e) {
      console.error('[sms] gửi thất bại:', e.message);
      await store.del('otp:' + uid);
      return fail(502, 'SMS_FAILED', 'Không gửi được tin nhắn OTP. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
    }
    return out(200, { success: true, local: p.local, intl: p.intl, cooldown: COOLDOWN, ttl: OTP_TTL });
  }

  if (action === 'verify') {
    const code = String((body && body.code) || '').replace(/\D/g, '');
    if (code.length !== 6) return fail(400, 'INVALID_CODE', 'Mã OTP gồm 6 chữ số.');
    let rec = null;
    try { rec = JSON.parse((await store.get('otp:' + uid)) || 'null'); } catch (e) {}
    if (!rec) return fail(400, 'OTP_EXPIRED', 'Mã OTP đã hết hạn hoặc chưa được gửi. Hãy bấm "Gửi lại mã".');
    if (rec.phone !== p.intl) return fail(400, 'OTP_PHONE_MISMATCH', 'Số điện thoại khác với số đã nhận mã. Hãy gửi lại mã cho số này.');

    if ((await store.incr('otp_tries:' + uid, OTP_TTL)) > MAX_TRIES) {
      await store.del('otp:' + uid);
      return fail(429, 'TOO_MANY_TRIES', 'Bạn đã nhập sai quá nhiều lần. Hãy bấm "Gửi lại mã" để nhận mã mới.');
    }
    if (!safeEq(rec.h, hashCode(uid, p.intl, code))) return fail(400, 'OTP_WRONG', 'Mã OTP không đúng.');

    const claimed = await store.setOnce('phone_owner:' + p.intl, uid, TEN_YEARS);
    if (!claimed && (await store.get('phone_owner:' + p.intl)) !== uid) {
      await store.del('otp:' + uid);
      return fail(409, 'PHONE_TAKEN', 'Số điện thoại này đã gắn với một tài khoản khác. Mỗi SĐT chỉ dùng cho 1 tài khoản.');
    }
    await store.set('user_phone:' + uid, p.intl);
    await store.del('otp:' + uid);
    await store.del('otp_tries:' + uid);
    return out(200, { success: true, verified: true, phone: p.local });
  }

  return fail(400, 'BAD_ACTION', 'Hành động không hợp lệ.');
}

module.exports = { handle, normalizePhone, getVerifiedPhone, phoneRequired, toLocal };
