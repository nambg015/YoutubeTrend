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
  process.env.GUEST_SECRET = 'bi-mat-de-test';
  const { requireUser, requireAdmin, roleOf, limitFor, guestList, guestTag } = require('../api/_lib/auth');
  const guests = require('../api/_lib/guests');
  const mkRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
  const req = claims => ({ headers: { authorization: 'Bearer ' + makeToken(claims) } });
  const pw = (email, name) => ({ email, name, firebase: { sign_in_provider: 'password' } });
  const signed = email => pw(email, guestTag(email));
  test('chủ đăng nhập bằng tên đăng nhập: vào được, role admin', async () => {
    const r = await requireUser(req(pw('adminh@youtrend.user')), mkRes(), opts);
    assert.strictEqual(r.role, 'admin');
  });
  test('khách được chủ ký: vào được API dùng chung, role guest, không qua được requireAdmin', async () => {
    const r = await requireUser(req(signed('lan@youtrend.user')), mkRes(), opts);
    assert.strictEqual(r.role, 'guest');
    const res = mkRes();
    assert.strictEqual(await requireAdmin(req(signed('lan@youtrend.user')), res, opts), null);
    assert.strictEqual(res.statusCode, 403);
  });
  test('tự đăng ký tên bất kỳ, không có chữ ký: 403 NOT_ALLOWED (kể cả tên "khach")', async () => {
    for (const c of [pw('khach@youtrend.user'), pw('ai-do@youtrend.user', 'ytg:gia-mao-chu-ky-000000000000000000'), pw('x@youtrend.user', guestTag('lan@youtrend.user'))]) {
      const res = mkRes();
      assert.strictEqual(await requireUser(req(c), res, opts), null);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.body.code, 'NOT_ALLOWED');
    }
  });
  test('chữ ký chỉ hợp lệ với đăng nhập bằng mật khẩu và không áp dụng cho email của chủ', () => {
    assert.strictEqual(roleOf({ sub: 'x', email: 'lan@youtrend.user', name: guestTag('lan@youtrend.user'), email_verified: true, firebase: { sign_in_provider: 'google.com' } }), '');
    assert.strictEqual(roleOf(signed('adminh@youtrend.user')), 'admin');
  });
  test('Gmail chủ chưa xác minh bị từ chối', () => {
    assert.strictEqual(roleOf({ sub: 'x', email: 'tranminh1135@gmail.com', email_verified: false, firebase: { sign_in_provider: 'password' } }), '');
  });
  test('hạn mức ngày của khách thấp hơn chủ', () => {
    assert.strictEqual(limitFor({ role: 'admin' }, 100), 100);
    assert.strictEqual(limitFor({ role: 'guest' }, 100), 30);
    assert.strictEqual(limitFor({ role: 'guest' }, 1), 1);
  });
  test('GUEST_EMAILS: danh sách cố định; GUESTS_DISABLED tắt mọi tài khoản khách', () => {
    assert.deepStrictEqual(guestList(), []);
    process.env.GUEST_EMAILS = 'ban@youtrend.user, adminh@youtrend.user';
    assert.deepStrictEqual(guestList(), ['ban@youtrend.user']);
    assert.strictEqual(roleOf(pw('ban@youtrend.user')), 'guest');
    assert.strictEqual(roleOf(pw('adminh@youtrend.user')), 'admin');
    process.env.GUESTS_DISABLED = '1';
    assert.strictEqual(roleOf(pw('ban@youtrend.user')), '');
    assert.strictEqual(roleOf(signed('lan@youtrend.user')), '');
    delete process.env.GUESTS_DISABLED; delete process.env.GUEST_EMAILS;
  });
  test('đổi khoá bí mật thì chữ ký cũ hết hiệu lực', () => {
    const c = signed('lan@youtrend.user');
    process.env.GUEST_SECRET = 'khoa-khac';
    assert.strictEqual(roleOf(c), '');
    process.env.GUEST_SECRET = 'bi-mat-de-test';
    assert.strictEqual(roleOf(c), 'guest');
  });
  test('online, lịch sử thao tác, khoá và xoá dấu vết', async () => {
    const e = 'lan@youtrend.user';
    await guests.ping(e, 'uid_lan', { route: 'niche', events: [{ t: Date.now(), a: 'nav', d: 'niche', r: 'niche' }, { a: 'click', d: 'Quét nhanh', r: 'niche' }, { a: 'la', d: '' }] }, 'Mozilla/5.0 (Windows NT 10.0) Chrome/130');
    let l = await guests.list();
    assert.strictEqual(l[0].email, e); assert.strictEqual(l[0].online, true); assert.strictEqual(l[0].route, 'niche'); assert.strictEqual(l[0].ua, 'Windows · Chrome');
    const log = await guests.log(e);
    assert.strictEqual(log.length, 2); assert.strictEqual(log[0].d, 'Quét nhanh');
    await guests.setBlocked(e, true);
    const res = mkRes();
    assert.strictEqual(await requireUser(req(signed(e)), res, opts), null);
    assert.strictEqual(res.body.code, 'BLOCKED');
    assert.strictEqual((await guests.list())[0].online, false);
    await guests.setBlocked(e, false);
    assert.strictEqual((await requireUser(req(signed(e)), mkRes(), opts)).role, 'guest');
    await guests.forget(e);
    assert.strictEqual((await guests.list()).length, 0); assert.strictEqual((await guests.log(e)).length, 0);
  });
  test('401 khi không gửi token', async () => {
    const res = mkRes();
    assert.strictEqual(await requireUser({ headers: {} }, res, opts), null);
    assert.strictEqual(res.statusCode, 401);
  });
});
