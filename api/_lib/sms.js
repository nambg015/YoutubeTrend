// Gửi SMS OTP qua nhà cung cấp Việt Nam. Chọn bằng biến môi trường SMS_PROVIDER:
//   speedsms  -> SpeedSMS.vn  (SPEEDSMS_TOKEN; mặc định sms_type=2 không cần đăng ký brandname)
//   esms      -> eSMS.vn      (ESMS_API_KEY, ESMS_SECRET_KEY, ESMS_BRANDNAME; cần brandname + mẫu tin đã duyệt)
//   mock      -> chỉ in mã ra log Vercel (CHỈ để thử, tự bị chặn ở production)
const https = require('https');
const crypto = require('crypto');

const env = k => (process.env[k] || '').trim();
const isProd = () => env('VERCEL_ENV') === 'production' || env('NODE_ENV') === 'production';
const providerName = () => env('SMS_PROVIDER').toLowerCase();

const DEFAULT_TEMPLATE = 'Ma xac thuc YouTrend cua ban la {code}. Ma het han sau 5 phut. Tuyet doi khong chia se ma nay.';
// eSMS CSKH chỉ gửi được đúng mẫu đã đăng ký -> đặt SMS_TEMPLATE trùng mẫu đó, có chỗ {code}
const buildContent = code => (env('SMS_TEMPLATE') || DEFAULT_TEMPLATE).replace(/\{code\}/g, code);

function isConfigured() {
  switch (providerName()) {
    case 'speedsms': return !!env('SPEEDSMS_TOKEN');
    case 'esms': return !!(env('ESMS_API_KEY') && env('ESMS_SECRET_KEY') && env('ESMS_BRANDNAME'));
    case 'mock': return !isProd();
    default: return false;
  }
}

function postJson(url, headers, body, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const payload = JSON.stringify(body);
    const req = https.request({
      hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }, headers)
    }, r => {
      let b = '';
      r.on('data', c => { b += c; });
      r.on('end', () => {
        try { resolve({ status: r.statusCode, json: JSON.parse(b) }); }
        catch (e) { reject(new Error('Nhà SMS trả về dữ liệu không đọc được (HTTP ' + r.statusCode + '): ' + b.slice(0, 200))); }
      });
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error('Nhà SMS không phản hồi (quá thời gian chờ)')));
    req.on('error', reject);
    req.write(payload); req.end();
  });
}

async function sendSpeedSms(local, content, post) {
  const url = env('SPEEDSMS_URL') || 'https://api.speedsms.vn/index.php/sms/send';
  const auth = 'Basic ' + Buffer.from(env('SPEEDSMS_TOKEN') + ':x').toString('base64');
  const body = { to: [local], content, sms_type: Number(env('SPEEDSMS_SMS_TYPE')) || 2 };
  if (env('SPEEDSMS_SENDER')) body.sender = env('SPEEDSMS_SENDER');
  const { json } = await post(url, { Authorization: auth }, body);
  if (json && json.status === 'success') return { id: json.data && json.data.tranId };
  const e = new Error('SpeedSMS lỗi: ' + (json && (json.message || json.code) || 'không rõ'));
  e.providerCode = json && json.code;
  throw e;
}

async function sendEsms(local, content, post) {
  const url = env('ESMS_URL') || 'https://rest.esms.vn/MainService.svc/json/SendMultipleMessage_V4_post_json/';
  const { json } = await post(url, {}, {
    ApiKey: env('ESMS_API_KEY'), SecretKey: env('ESMS_SECRET_KEY'),
    Phone: local, Content: content, Brandname: env('ESMS_BRANDNAME'),
    SmsType: env('ESMS_SMS_TYPE') || '2', IsUnicode: '0',
    Sandbox: env('ESMS_SANDBOX') === '1' ? '1' : '0',
    RequestId: crypto.randomBytes(12).toString('hex')
  });
  if (json && String(json.CodeResult) === '100') return { id: json.SMSID };
  const e = new Error('eSMS lỗi ' + (json && json.CodeResult) + ': ' + (json && json.ErrorMessage || 'không rõ'));
  e.providerCode = json && json.CodeResult;
  throw e;
}

// local: số dạng 0912345678. Ném lỗi nếu gửi thất bại.
async function sendOtpSms(local, code, deps = {}) {
  const post = deps.post || postJson;
  const content = buildContent(code);
  switch (providerName()) {
    case 'speedsms': return sendSpeedSms(local, content, post);
    case 'esms': return sendEsms(local, content, post);
    case 'mock':
      if (isProd()) throw new Error('SMS_PROVIDER=mock bị chặn ở production');
      console.log('[MOCK OTP] ' + local + ' -> ' + code);
      return { id: 'mock' };
    default: throw new Error('Chưa cấu hình SMS_PROVIDER');
  }
}

module.exports = { isConfigured, sendOtpSms, buildContent, providerName, isProd };
