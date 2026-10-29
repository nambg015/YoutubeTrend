// POST /api/phone-otp   { action: 'status' | 'send' | 'verify', phone, code }
// Cần header Authorization: Bearer <Firebase ID token> (đã đăng nhập Google hoặc tài khoản/mật khẩu).
const { verifyIdToken, bearer, applyCors } = require('./_lib/auth');
const { handle } = require('./_lib/phone_otp');

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  let claims;
  try { claims = await verifyIdToken(bearer(req)); }
  catch (e) { return res.status(401).json({ success: false, code: e.code || 'UNAUTHORIZED', message: e.message || 'Chưa đăng nhập' }); }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const ip = String(req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0] || '').trim();

  try {
    const r = await handle({ claims, body: body || {}, ip });
    return res.status(r.status).json(r.json);
  } catch (e) {
    console.error('[phone-otp] lỗi:', e.message);
    return res.status(503).json({ success: false, code: 'SERVER_ERROR', message: 'Hệ thống đang bận, vui lòng thử lại sau.' });
  }
};
