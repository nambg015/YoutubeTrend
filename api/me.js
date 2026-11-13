// /api/me
//  GET            — phiên đăng nhập là chủ (admin) hay khách (guest); tài khoản khác bị từ chối.
//  POST {action}  — ping (khách báo đang online + gửi lịch sử thao tác) và các việc quản lý tài khoản khách của chủ.
const auth = require('./_lib/auth');
const guests = require('./_lib/guests');

const NAME_RE = /^[a-z0-9][a-z0-9._-]{2,23}$/;
const toEmail = name => { name = String(name || '').trim().toLowerCase(); return name.indexOf('@') >= 0 ? name : name + '@youtrend.user'; };

module.exports = async (req, res) => {
  auth.applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  const claims = await auth.requireUser(req, res);
  if (!claims) return;
  res.setHeader('Cache-Control', 'no-store');
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const action = req.method === 'POST' && body && body.action;

  if (!action) {
    return res.json({
      success: true, admin: claims.role === 'admin', role: claims.role, uid: claims.sub, email: claims.email || '',
      gemini: !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
      model: process.env.GEMINI_MODEL || 'gemini-3.8-flash'
    });
  }

  try {
    if (action === 'ping') {
      if (claims.role !== 'guest') return res.json({ success: true });
      const r = await guests.ping(claims.email, claims.sub, body, req.headers['user-agent']);
      return res.json({ success: true, blocked: r.blocked });
    }

    // Từ đây chỉ dành cho chủ
    if (claims.role !== 'admin') return res.status(403).json({ success: false, code: 'NOT_ADMIN', message: 'Chỉ chủ web làm được việc này.' });
    if (action === 'guests') {
      return res.json({ success: true, list: await guests.list(), persistent: guests.persistent(), signing: !!auth.guestSecret(), fixed: auth.guestList(), onlineMs: guests.ONLINE_MS });
    }
    const email = toEmail(body.name), name = email.replace('@youtrend.user', '');
    if (!email.endsWith('@youtrend.user') || !NAME_RE.test(name)) return res.status(400).json({ success: false, code: 'BAD_NAME', message: 'Tên đăng nhập gồm 3–24 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.' });
    if (auth.adminList().emails.includes(email)) return res.status(400).json({ success: false, code: 'IS_ADMIN', message: 'Tên này là tài khoản của chủ, không dùng làm tài khoản khách được.' });
    if (action === 'guestSign') {
      const tag = auth.guestTag(email);
      if (!tag) return res.status(400).json({ success: false, code: 'NO_SECRET', message: 'Máy chủ chưa có khoá để cấp quyền khách. Thêm biến GUEST_SECRET (chuỗi bất kỳ, dài) trên Vercel rồi Redeploy.' });
      return res.json({ success: true, email, tag });
    }
    if (action === 'guestLog') return res.json({ success: true, events: await guests.log(email, body.limit), persistent: guests.persistent() });
    if (action === 'guestLogClear') { await guests.clearLog(email); return res.json({ success: true }); }
    if (action === 'guestBlock') { const e = await guests.setBlocked(email, !!body.blocked); return res.json({ success: true, blocked: !!e.blocked, persistent: guests.persistent() }); }
    if (action === 'guestForget') { await guests.forget(email); return res.json({ success: true }); }
    return res.status(400).json({ success: false, message: 'action không hợp lệ' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Máy chủ lỗi: ' + (e && e.message || 'không rõ') });
  }
};
