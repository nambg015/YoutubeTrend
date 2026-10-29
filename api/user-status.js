// Vercel Serverless Function: Authoritative User Status, Tier & Daily Quota
const { verifyIdToken, bearer, applyCors } = require('./_lib/auth');
const store = require('./_lib/store');

const ADMIN_UIDS = (process.env.ADMIN_UIDS || '').split(',').map(s => s.trim()).filter(Boolean);

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  let claims = null;
  try {
    claims = await verifyIdToken(bearer(req));
  } catch (err) {
    return res.status(401).json({
      success: false,
      isAuth: false,
      code: err.code || 'UNAUTHORIZED',
      message: err.message || 'Token xác thực Firebase không hợp lệ hoặc đã hết hạn.'
    });
  }

  const uid = claims.sub;
  let phone = claims.phone_number || '';
  if (!phone) { try { phone = (await store.get('user_phone:' + claims.sub)) || ''; } catch (e) {} }
  const email = claims.email || '';
  const isAdmin = ADMIN_UIDS.includes(uid) || (email && email.toLowerCase() === 'tranminh1135@gmail.com');

  // Lấy gói của user từ KV
  let rawTier = await store.get('user_tier:' + uid);
  let userTier = { tier: 'FREE', expiresAt: null };
  if (rawTier) {
    try {
      const parsed = JSON.parse(rawTier);
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        userTier = { tier: 'FREE', expiresAt: parsed.expiresAt, expired: true };
      } else {
        userTier = parsed;
      }
    } catch (e) {}
  }

  const effectiveIsAdmin = Boolean(isAdmin);
  const effectiveIsUltra = effectiveIsAdmin || userTier.tier === 'ULTRA_PRO' || userTier.tier === 'ULTRA';
  const effectiveIsPro = effectiveIsAdmin || effectiveIsUltra || userTier.tier === 'PRO';
  const effectiveTier = effectiveIsAdmin ? 'ADMIN' : (effectiveIsUltra ? 'ULTRA_PRO' : (effectiveIsPro ? 'PRO' : 'FREE'));

  // POST: Trừ hạn mức (consume_quota) hoặc Admin cấp quyền
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const action = body?.action || 'consume_quota';

    if (action === 'consume_quota') {
      if (effectiveIsPro) {
        return res.status(200).json({
          success: true,
          allowed: true,
          remaining: 999999,
          limit: 'unlimited',
          tier: effectiveTier
        });
      }

      // Tài khoản miễn phí: hạn mức 5 từ khóa/ngày
      const quotaRes = await store.consumeDaily(uid, 'keywords', 5);
      if (!quotaRes.allowed) {
        return res.status(403).json({
          success: false,
          code: 'DAILY_LIMIT_EXCEEDED',
          message: 'Tài khoản của bạn đã sử dụng hết 5 lượt tìm kiếm hôm nay. Vui lòng nâng cấp gói PRO để tiếp tục!',
          quota: {
            used: quotaRes.used,
            limit: 5,
            remaining: 0
          }
        });
      }

      return res.status(200).json({
        success: true,
        allowed: true,
        quota: {
          used: quotaRes.used,
          limit: 5,
          remaining: Math.max(0, 5 - quotaRes.used)
        }
      });
    }

    if (action === 'admin_grant_tier') {
      if (!effectiveIsAdmin) {
        return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền cấp gói!' });
      }
      const { targetUid, grantTier, grantDays } = body;
      if (!targetUid) return res.status(400).json({ success: false, message: 'Thiếu targetUid' });

      const days = Number(grantDays) || 30;
      const expiresAt = Date.now() + days * 86400000;
      const tierRecord = { tier: (grantTier || 'PRO').toUpperCase(), expiresAt, grantedBy: uid };
      await store.set('user_tier:' + targetUid, JSON.stringify(tierRecord), 60 * 60 * 24 * (days + 30));

      return res.status(200).json({ success: true, message: 'Cấp gói thành công!', data: tierRecord });
    }

    return res.status(400).json({ success: false, message: 'Hành động không hợp lệ' });
  }

  // GET: Trả về trạng thái tổng quan
  const today = new Date().toISOString().slice(0, 10);
  const usedCount = Number(await store.get(`quota:keywords:${uid}:${today}`)) || 0;
  const freeLimit = 5;

  return res.status(200).json({
    success: true,
    isAuth: true,
    uid,
    phone,
    phoneVerified: !!phone,
    email,
    tier: effectiveTier,
    isPro: effectiveIsPro,
    isUltra: effectiveIsUltra,
    isAdmin: effectiveIsAdmin,
    expiresAt: userTier.expiresAt,
    quota: {
      used: usedCount,
      limit: effectiveIsPro ? 'unlimited' : freeLimit,
      remaining: effectiveIsPro ? 999999 : Math.max(0, freeLimit - usedCount)
    }
  });
};
