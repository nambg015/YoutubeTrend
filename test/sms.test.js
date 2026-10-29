const { test, describe, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const sms = require('../api/_lib/sms');

const KEYS = ['SMS_PROVIDER', 'SPEEDSMS_TOKEN', 'SPEEDSMS_SMS_TYPE', 'SPEEDSMS_SENDER', 'ESMS_API_KEY', 'ESMS_SECRET_KEY', 'ESMS_BRANDNAME', 'ESMS_SANDBOX', 'SMS_TEMPLATE', 'VERCEL_ENV', 'NODE_ENV'];
let saved;
beforeEach(() => { saved = {}; KEYS.forEach(k => { saved[k] = process.env[k]; delete process.env[k]; }); });
afterEach(() => { KEYS.forEach(k => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; }); });

describe('sms provider', () => {
  test('chưa đặt provider -> chưa cấu hình', () => assert.strictEqual(sms.isConfigured(), false));
  test('speedsms: gọi đúng URL, Basic auth token:x, body JSON', async () => {
    process.env.SMS_PROVIDER = 'speedsms'; process.env.SPEEDSMS_TOKEN = 'TOK';
    assert.strictEqual(sms.isConfigured(), true);
    let seen;
    const r = await sms.sendOtpSms('0912345678', '123456', { post: async (url, headers, body) => { seen = { url, headers, body }; return { json: { status: 'success', code: '00', data: { tranId: 77 } } }; } });
    assert.match(seen.url, /api\.speedsms\.vn\/index\.php\/sms\/send/);
    assert.strictEqual(seen.headers.Authorization, 'Basic ' + Buffer.from('TOK:x').toString('base64'));
    assert.deepStrictEqual(seen.body.to, ['0912345678']);
    assert.strictEqual(seen.body.sms_type, 2);
    assert.match(seen.body.content, /123456/);
    assert.strictEqual(r.id, 77);
  });
  test('speedsms: lỗi (hết tiền) -> ném lỗi', async () => {
    process.env.SMS_PROVIDER = 'speedsms'; process.env.SPEEDSMS_TOKEN = 'TOK';
    await assert.rejects(sms.sendOtpSms('0912345678', '1', { post: async () => ({ json: { status: 'error', code: '300', message: 'insufficient' } }) }), /insufficient/);
  });
  test('esms: cần đủ key + brandname; CodeResult 100 = thành công', async () => {
    process.env.SMS_PROVIDER = 'esms'; process.env.ESMS_API_KEY = 'K'; process.env.ESMS_SECRET_KEY = 'S';
    assert.strictEqual(sms.isConfigured(), false);
    process.env.ESMS_BRANDNAME = 'YOUTREND';
    assert.strictEqual(sms.isConfigured(), true);
    let seen;
    await sms.sendOtpSms('0912345678', '654321', { post: async (url, h, body) => { seen = body; return { json: { CodeResult: '100', SMSID: 'abc' } }; } });
    assert.strictEqual(seen.Brandname, 'YOUTREND');
    assert.strictEqual(seen.Phone, '0912345678');
    assert.strictEqual(seen.SmsType, '2');
    await assert.rejects(sms.sendOtpSms('0912345678', '1', { post: async () => ({ json: { CodeResult: '146', ErrorMessage: 'Sai template' } }) }), /146/);
  });
  test('SMS_TEMPLATE thay được nội dung, giữ {code}', () => {
    process.env.SMS_TEMPLATE = 'Ma OTP {code} cua ban';
    assert.strictEqual(sms.buildContent('111222'), 'Ma OTP 111222 cua ban');
  });
  test('mock bị chặn ở production', async () => {
    process.env.SMS_PROVIDER = 'mock'; process.env.VERCEL_ENV = 'production';
    assert.strictEqual(sms.isConfigured(), false);
    await assert.rejects(sms.sendOtpSms('0912345678', '1'));
  });
});
