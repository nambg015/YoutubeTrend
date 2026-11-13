// GET/POST /api/me — kiểm tra phiên đăng nhập: chủ (admin) hay khách (guest); tài khoản khác bị từ chối.
const auth = require('./_lib/auth');

module.exports = async (req, res) => {
  auth.applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const claims = await auth.requireUser(req, res);
  if (!claims) return;
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    success: true, admin: claims.role === 'admin', role: claims.role, uid: claims.sub, email: claims.email || '',
    guests: claims.role === 'admin' ? auth.guestList() : undefined,
    gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  });
};
