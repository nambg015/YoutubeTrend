const { test, describe } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { verifyIdToken, requirePhoneVerified } = require('../api/_lib/auth');

// Tạo cặp khoá + chứng chỉ tự ký để giả lập chứng chỉ của Google (không cần mạng).
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'yt-auth-'));
execSync(`openssl req -x509 -newkey rsa:2048 -nodes -keyout ${dir}/k.pem -out ${dir}/c.pem -days 2 -subj "/CN=test" 2>/dev/null`);
const privateKey = fs.readFileSync(`${dir}/k.pem`, 'utf8');
const certPem = fs.readFileSync(`${dir}/c.pem`, 'utf8');
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

describe('requirePhoneVerified', () => {
  const mkRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(d) { this.body = d; return this; } });
  test('403 PHONE_REQUIRED khi token hợp lệ nhưng chưa có SĐT', async () => {
    const res = mkRes();
    const r = await requirePhoneVerified({ headers: { authorization: 'Bearer ' + makeToken() } }, res, opts);
    assert.strictEqual(r, null);
    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.body.code, 'PHONE_REQUIRED');
  });
  test('trả claims khi đã có SĐT', async () => {
    const res = mkRes();
    const r = await requirePhoneVerified({ headers: { authorization: 'Bearer ' + makeToken({ phone_number: '+84912345678' }) } }, res, opts);
    assert.strictEqual(r.sub, 'uid_123');
  });
  test('401 khi không gửi token', async () => {
    const res = mkRes();
    const r = await requirePhoneVerified({ headers: {} }, res, opts);
    assert.strictEqual(r, null);
    assert.strictEqual(res.statusCode, 401);
  });
});
