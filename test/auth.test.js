const { test, describe } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifyIdToken } = require('../api/_lib/auth');

// Tạo cặp khoá RSA bằng built-in crypto của Node (chạy mượt trên cả Windows, Linux, macOS mà không cần cài openssl ngoài).
const { publicKey: certPem, privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});
const certProvider = async () => ({ kid1: certPem });

const b64u = b => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function makeToken(claims = {}, { kid = 'kid1', alg = 'RS256', key = privateKey } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: 'proj-x', iss: 'https://securetoken.google.com/proj-x', sub: 'uid_123',
    iat: now - 10, exp: now + 3600, ...claims
  };
  const head = b64u(JSON.stringify({ alg, kid, typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = crypto.createSign('RSA-SHA256').update(head + '.' + body).sign(key);
  return head + '.' + body + '.' + b64u(sig);
}
const opts = { projectId: 'proj-x', certProvider };
const expectCode = async (fn, code) => {
  await assert.rejects(fn, e => { assert.strictEqual(e.code, code); return true; });
};

describe('verifyIdToken', () => {
  test('chấp nhận token hợp lệ', async () => {
    const c = await verifyIdToken(makeToken({ phone_number: '+84912345678' }), opts);
    assert.strictEqual(c.sub, 'uid_123');
    assert.strictEqual(c.phone_number, '+84912345678');
  });
  test('từ chối token hết hạn', async () => {
    await expectCode(() => verifyIdToken(makeToken({ exp: Math.floor(Date.now() / 1000) - 5 }), opts), 'EXPIRED');
  });
  test('từ chối sai project (aud) và sai issuer', async () => {
    await expectCode(() => verifyIdToken(makeToken({ aud: 'other' }), opts), 'BAD_AUD');
    await expectCode(() => verifyIdToken(makeToken({ iss: 'https://evil.example' }), opts), 'BAD_ISS');
  });
  test('từ chối token ký bằng khoá khác (giả mạo)', async () => {
    const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
    await expectCode(() => verifyIdToken(makeToken({}, { key: other }), opts), 'BAD_SIGNATURE');
  });
  test('từ chối alg=none và token rác', async () => {
    const none = b64u('{"alg":"none","kid":"kid1"}') + '.' + b64u('{"sub":"x"}') + '.';
    await expectCode(() => verifyIdToken(none, opts), 'BAD_TOKEN');
    await expectCode(() => verifyIdToken('abc', opts), 'BAD_TOKEN');
    await expectCode(() => verifyIdToken('', opts), 'NO_TOKEN');
  });
  test('từ chối kid lạ', async () => {
    await expectCode(() => verifyIdToken(makeToken({}, { kid: 'nope' }), opts), 'BAD_TOKEN');
  });
});

describe('quyền: chủ, khách, người lạ', () => {
  const { requireUser, requireAdmin, roleOf, limitFor, guestList } = require('../api/_lib/auth');
  const mkRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
  const req = claims => ({ headers: { authorization: 'Bearer ' + makeToken(claims) } });
  const pw = email => ({ email, firebase: { sign_in_provider: 'password' } });
  test('chủ đăng nhập bằng tên đăng nhập: vào được, role admin', async () => {
    const r = await requireUser(req(pw('adminh@youtrend.user')), mkRes(), opts);
    assert.strictEqual(r.role, 'admin');
  });
  test('khách: vào được API dùng chung, role guest, không qua được requireAdmin', async () => {
    const r = await requireUser(req(pw('khach@youtrend.user')), mkRes(), opts);
    assert.strictEqual(r.role, 'guest');
    const res = mkRes();
    assert.strictEqual(await requireAdmin(req(pw('khach@youtrend.user')), res, opts), null);
    assert.strictEqual(res.statusCode, 403);
  });
  test('tài khoản lạ: 403 NOT_ALLOWED', async () => {
    const res = mkRes();
    assert.strictEqual(await requireUser(req(pw('ai-do@youtrend.user')), res, opts), null);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'NOT_ALLOWED');
  });
  test('tên khách đăng nhập kiểu Google (không phải mật khẩu) bị từ chối', () => {
    assert.strictEqual(roleOf({ sub: 'x', email: 'khach@youtrend.user', email_verified: true, firebase: { sign_in_provider: 'google.com' } }), '');
  });
  test('Gmail chủ chưa xác minh bị từ chối', () => {
    assert.strictEqual(roleOf({ sub: 'x', email: 'tranminh1135@gmail.com', email_verified: false, firebase: { sign_in_provider: 'password' } }), '');
  });
  test('hạn mức ngày của khách thấp hơn chủ', () => {
    assert.strictEqual(limitFor({ role: 'admin' }, 100), 100);
    assert.strictEqual(limitFor({ role: 'guest' }, 100), 30);
    assert.strictEqual(limitFor({ role: 'guest' }, 1), 1);
  });
  test('GUEST_EMAILS rỗng thì tắt tài khoản khách; email chủ không bao giờ thành khách', () => {
    const old = process.env.GUEST_EMAILS;
    process.env.GUEST_EMAILS = '';
    assert.deepStrictEqual(guestList(), []);
    assert.strictEqual(roleOf(pw('khach@youtrend.user')), '');
    process.env.GUEST_EMAILS = 'ban@youtrend.user, adminh@youtrend.user';
    assert.deepStrictEqual(guestList(), ['ban@youtrend.user']);
    assert.strictEqual(roleOf(pw('adminh@youtrend.user')), 'admin');
    if (old === undefined) delete process.env.GUEST_EMAILS; else process.env.GUEST_EMAILS = old;
  });
  test('401 khi không gửi token', async () => {
    const res = mkRes();
    assert.strictEqual(await requireUser({ headers: {} }, res, opts), null);
    assert.strictEqual(res.statusCode, 401);
  });
});
