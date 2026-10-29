// Xác thực Firebase ID token ở phía SERVER (không cần thư viện ngoài, chỉ dùng crypto của Node).
// Mục đích: chỉ cho gọi API tốn tiền (Gemini...) khi tài khoản ĐÃ xác minh SĐT, và đếm hạn mức theo uid.
const https = require('https');
const crypto = require('crypto');
const store = require('./store');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'sdt2804-84801';
const CERT_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://youtubetrend-rho.vercel.app')
  .split(',').map(s => s.trim()).filter(Boolean);

let certCache = { certs: null, expiresAt: 0 };

function fetchCerts() {
  return new Promise((resolve, reject) => {
    https.get(CERT_URL, resp => {
      let body = '';
      resp.on('data', c => { body += c; });
      resp.on('end', () => {
        try {
          const m = /max-age=(\d+)/.exec(resp.headers['cache-control'] || '');
          const ttl = (m ? Number(m[1]) : 3600) * 1000;
          resolve({ certs: JSON.parse(body), expiresAt: Date.now() + ttl });
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getCert(kid, certProvider) {
  if (certProvider) return (await certProvider())[kid];
  if (!certCache.certs || Date.now() > certCache.expiresAt || !certCache.certs[kid]) {
    certCache = await fetchCerts();
  }
  return certCache.certs[kid];
}

const b64urlToBuf = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// Trả về payload đã xác thực, hoặc ném lỗi có .code
async function verifyIdToken(token, opts = {}) {
  const projectId = opts.projectId || PROJECT_ID;
  const now = Math.floor((opts.now || Date.now()) / 1000);
  const fail = (code, msg) => { const e = new Error(msg); e.code = code; throw e; };

  if (!token || typeof token !== 'string') fail('NO_TOKEN', 'Thiếu token đăng nhập');
  const parts = token.split('.');
  if (parts.length !== 3) fail('BAD_TOKEN', 'Token sai định dạng');

  let header, payload;
  try {
    header = JSON.parse(b64urlToBuf(parts[0]).toString('utf8'));
    payload = JSON.parse(b64urlToBuf(parts[1]).toString('utf8'));
  } catch (e) { fail('BAD_TOKEN', 'Token không đọc được'); }

  if (header.alg !== 'RS256' || !header.kid) fail('BAD_TOKEN', 'Thuật toán token không hợp lệ');

  const cert = await getCert(header.kid, opts.certProvider);
  if (!cert) fail('BAD_TOKEN', 'Không tìm thấy khoá xác thực');

  const ok = crypto.createVerify('RSA-SHA256')
    .update(parts[0] + '.' + parts[1])
    .verify(cert, b64urlToBuf(parts[2]));
  if (!ok) fail('BAD_SIGNATURE', 'Chữ ký token không hợp lệ');

  if (payload.aud !== projectId) fail('BAD_AUD', 'Token không thuộc dự án này');
  if (payload.iss !== 'https://securetoken.google.com/' + projectId) fail('BAD_ISS', 'Token sai nguồn phát hành');
  if (!payload.sub || typeof payload.sub !== 'string') fail('BAD_SUB', 'Token thiếu uid');
  if (!payload.exp || payload.exp < now) fail('EXPIRED', 'Phiên đăng nhập đã hết hạn, hãy đăng nhập lại');
  if (payload.iat && payload.iat > now + 300) fail('BAD_IAT', 'Token có thời gian không hợp lệ');
  return payload;
}

function bearer(req) {
  const h = req.headers['authorization'] || req.headers['Authorization'] || '';
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : '';
}

// Dùng trong API: trả về payload nếu hợp lệ + đã có SĐT, nếu không thì tự trả lỗi và trả null.
async function requirePhoneVerified(req, res, opts = {}) {
  let claims;
  try {
    claims = await verifyIdToken(bearer(req), opts);
  } catch (e) {
    res.status(401).json({ success: false, code: e.code || 'UNAUTHORIZED', message: e.message || 'Chưa đăng nhập' });
    return null;
  }
  // Tắt yêu cầu SĐT (REQUIRE_PHONE=false) -> cho qua, chỉ cần đã đăng nhập.
  if ((process.env.REQUIRE_PHONE || '').trim().toLowerCase() === 'false') return claims;
  // SĐT được xác minh bởi server (api/phone-otp) và lưu ở KV; token Firebase cũ có phone_number vẫn được chấp nhận.
  if (!claims.phone_number) {
    try {
      const lookup = opts.phoneLookup || (uid => store.get('user_phone:' + uid));
      const phone = await lookup(claims.sub);
      if (phone) claims.phone_number = phone;
    } catch (e) {
      res.status(503).json({ success: false, code: 'STORE_UNAVAILABLE', message: 'Hệ thống đang bận, vui lòng thử lại sau.' });
      return null;
    }
  }
  if (!claims.phone_number) {
    res.status(403).json({ success: false, code: 'PHONE_REQUIRED', message: 'Tài khoản chưa xác minh số điện thoại' });
    return null;
  }
  return claims;
}

// CORS: chỉ phản hồi cho đúng domain của mình (gọi cùng domain thì không cần CORS).
function applyCors(req, res, extraHeaders = '') {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization' + (extraHeaders ? ', ' + extraHeaders : ''));
}

module.exports = { verifyIdToken, requirePhoneVerified, applyCors, bearer, ALLOWED_ORIGINS };
