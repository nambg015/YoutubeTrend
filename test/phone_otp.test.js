const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
delete process.env.KV_REST_API_URL; delete process.env.KV_REST_API_TOKEN;
delete process.env.UPSTASH_REDIS_REST_URL; delete process.env.UPSTASH_REDIS_REST_TOKEN;
process.env.OTP_SECRET = 'test-secret';
process.env.SMS_PROVIDER = 'mock';
const { handle } = require('../api/_lib/phone_otp');
const sms = require('../api/_lib/sms');
const store = require('../api/_lib/store');
const { requirePhoneVerified } = require('../api/_lib/auth');

// SMS giả: ghi lại mã đã "gửi"
function fakeSms() {
  const sent = [];
  return { sent, isConfigured: () => true, isProd: () => false, sendOtpSms: async (phone, code) => { sent.push({ phone, code }); } };
}
let n = 0;
const uid = () => 'u' + (++n) + '_' + Date.now();
const send = (u, phone, s, ip = '1.1.1.1') => handle({ claims: { sub: u }, body: { action: 'send', phone }, ip }, { sms: s });
const verify = (u, phone, code, s) => handle({ claims: { sub: u }, body: { action: 'verify', phone, code }, ip: '' }, { sms: s });

describe('phone_otp: gửi mã', () => {
  test('gửi OTP 6 số tới đúng số, trả cooldown', async () => {
    const s = fakeSms(), u = uid();
    const r = await send(u, '+84912340001', s);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(s.sent[0].phone, '0912340001');
    assert.match(s.sent[0].code, /^\d{6}$/);
    assert.strictEqual(r.json.cooldown, 60);
    assert.ok(!JSON.stringify(r.json).includes(s.sent[0].code), 'không được trả mã OTP về trình duyệt');
  });
  test('số sai định dạng -> 400, không gửi SMS', async () => {
    const s = fakeSms();
    const r = await send(uid(), '12345', s);
    assert.strictEqual(r.status, 400);
    assert.strictEqual(s.sent.length, 0);
  });
  test('bấm gửi lại trong 60s -> 429', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340002', s);
    const r = await send(u, '0912340002', s);
    assert.strictEqual(r.status, 429);
    assert.strictEqual(s.sent.length, 1);
  });
  test('nhà SMS lỗi -> 502, xoá mã, không lộ chi tiết', async () => {
    const s = fakeSms(); s.sendOtpSms = async () => { throw new Error('SpeedSMS lỗi: 300 hết tiền'); };
    const r = await send(uid(), '0912340003', s);
    assert.strictEqual(r.status, 502);
    assert.strictEqual(r.json.code, 'SMS_FAILED');
    assert.ok(!/SpeedSMS|300/.test(r.json.message));
  });
  test('chưa cấu hình nhà SMS -> 503 SMS_NOT_CONFIGURED', async () => {
    const s = fakeSms(); s.isConfigured = () => false;
    const r = await send(uid(), '0912340004', s);
    assert.strictEqual(r.status, 503);
    assert.strictEqual(r.json.code, 'SMS_NOT_CONFIGURED');
  });
  test('1 IP gửi quá 20 lần/giờ -> 429', async () => {
    const s = fakeSms();
    let last;
    for (let i = 0; i < 22; i++) last = await send(uid(), '09123410' + String(10 + i), s, '9.9.9.9');
    assert.strictEqual(last.status, 429);
    assert.ok(s.sent.length <= 20);
  });
});

describe('phone_otp: xác minh', () => {
  test('nhập đúng mã -> gắn SĐT vào tài khoản; status báo đã xác minh', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340010', s);
    const r = await verify(u, '0912340010', s.sent[0].code, s);
    assert.strictEqual(r.status, 200);
    assert.strictEqual(r.json.verified, true);
    const st = await handle({ claims: { sub: u }, body: { action: 'status' } });
    assert.deepStrictEqual({ v: st.json.verified, p: st.json.phone }, { v: true, p: '0912340010' });
  });
  test('mã dùng 1 lần: dùng lại -> hết hạn', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340011', s);
    await verify(u, '0912340011', s.sent[0].code, s);
    assert.strictEqual((await verify(u, '0912340011', s.sent[0].code, s)).json.code, 'OTP_EXPIRED');
  });
  test('sai mã -> 400; sai quá 5 lần -> khoá, mã đúng cũng không còn dùng được', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340012', s);
    const good = s.sent[0].code;
    const bad = good === '000000' ? '111111' : '000000';
    for (let i = 0; i < 5; i++) assert.strictEqual((await verify(u, '0912340012', bad, s)).json.code, 'OTP_WRONG');
    assert.strictEqual((await verify(u, '0912340012', bad, s)).json.code, 'TOO_MANY_TRIES');
    assert.strictEqual((await verify(u, '0912340012', good, s)).json.code, 'OTP_EXPIRED');
  });
  test('mã của số này không dùng được cho số khác', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340013', s);
    assert.strictEqual((await verify(u, '0912340014', s.sent[0].code, s)).json.code, 'OTP_PHONE_MISMATCH');
  });
  test('mã gửi cho tài khoản A không dùng được ở tài khoản B', async () => {
    const s = fakeSms(), a = uid(), b = uid();
    await send(a, '0912340015', s);
    assert.strictEqual((await verify(b, '0912340015', s.sent[0].code, s)).json.code, 'OTP_EXPIRED');
  });
  test('1 SĐT chỉ cho 1 tài khoản: tài khoản thứ 2 bị từ chối ngay lúc gửi', async () => {
    const s = fakeSms(), a = uid(), b = uid();
    await send(a, '0912340016', s);
    await verify(a, '0912340016', s.sent[0].code, s);
    const r = await send(b, '0912340016', s);
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.json.code, 'PHONE_TAKEN');
    assert.strictEqual(s.sent.length, 1);
  });
  test('2 tài khoản cùng nhận mã cho 1 số: người xác minh sau bị từ chối', async () => {
    const s = fakeSms(), a = uid(), b = uid();
    await send(a, '0912340017', s); await send(b, '0912340017', s);
    assert.strictEqual((await verify(a, '0912340017', s.sent[0].code, s)).status, 200);
    const r = await verify(b, '0912340017', s.sent[1].code, s);
    assert.strictEqual(r.status, 409);
    assert.strictEqual(r.json.code, 'PHONE_TAKEN');
  });
  test('tài khoản đã xác minh không gửi thêm SMS', async () => {
    const s = fakeSms(), u = uid();
    await send(u, '0912340018', s);
    await verify(u, '0912340018', s.sent[0].code, s);
    const r = await send(u, '0912340019', s);
    assert.strictEqual(r.json.code, 'ALREADY_VERIFIED');
    assert.strictEqual(s.sent.length, 1);
  });
});

describe('REQUIRE_PHONE + requirePhoneVerified đọc SĐT từ server', () => {
  const mkRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
  const crypto = require('crypto');
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } });
  const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const token = sub => {
    const now = Math.floor(Date.now() / 1000);
    const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k' })), p = b64u(JSON.stringify({ aud: 'px', iss: 'https://securetoken.google.com/px', sub, iat: now - 5, exp: now + 600 }));
    return h + '.' + p + '.' + b64u(crypto.createSign('RSA-SHA256').update(h + '.' + p).sign(privateKey));
  };
  const opts = { projectId: 'px', certProvider: async () => ({ k: publicKey }) };

  test('có user_phone trong KV -> được qua; chưa có -> 403', async () => {
    const u = uid();
    let res = mkRes();
    assert.strictEqual(await requirePhoneVerified({ headers: { authorization: 'Bearer ' + token(u) } }, res, opts), null);
    assert.strictEqual(res.statusCode, 403);
    await store.set('user_phone:' + u, '+84912340099');
    res = mkRes();
    const c = await requirePhoneVerified({ headers: { authorization: 'Bearer ' + token(u) } }, res, opts);
    assert.strictEqual(c.phone_number, '+84912340099');
  });
  test('REQUIRE_PHONE=false -> chỉ cần đăng nhập', async () => {
    process.env.REQUIRE_PHONE = 'false';
    try {
      const c = await requirePhoneVerified({ headers: { authorization: 'Bearer ' + token(uid()) } }, mkRes(), opts);
      assert.ok(c && c.sub);
      const st = await handle({ claims: { sub: 'x' }, body: { action: 'status' } });
      assert.strictEqual(st.json.required, false);
    } finally { delete process.env.REQUIRE_PHONE; }
  });
  test('KV lỗi -> 503 chứ không cho qua', async () => {
    const res = mkRes();
    const r = await requirePhoneVerified({ headers: { authorization: 'Bearer ' + token(uid()) } }, res, { ...opts, phoneLookup: async () => { throw new Error('kv down'); } });
    assert.strictEqual(r, null);
    assert.strictEqual(res.statusCode, 503);
  });
});
