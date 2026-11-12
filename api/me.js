// GET/POST /api/me — kiểm tra phiên đăng nhập có phải admin không (web chỉ dành cho chủ).
const auth = require('./_lib/auth');

module.exports = async (req, res) => {
  auth.applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const claims = await auth.requireAdmin(req, res);
  if (!claims) return;
  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    success: true, admin: true, uid: claims.sub, email: claims.email || '',
    gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  });
};
