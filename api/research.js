// /api/research — tab "Tạo tài nguyên" + AI dùng chung. action: search | structure | news | enrich | insight | titles | topics | images | image
const auth = require('./_lib/auth');
const { applyCors } = auth;
const { consumeDaily } = require('./_lib/store');
const R = require('./_lib/research');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

module.exports = async (req, res) => {
  applyCors(req, res, 'X-Gemini-Key');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  const claims = await auth.requirePhoneVerified(req, res);
  if (!claims) return;

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};
  const action = body.action;
  const prompt = String(body.prompt || '').slice(0, 4000);
  const key = req.headers['x-gemini-key'] || GEMINI_API_KEY;

  // Mỗi hồ sơ tính 1 lượt (đếm ở bước search — kể cả khi AI lỗi và chuyển sang chế độ miễn phí)
  const bucket = action === 'search' ? 'research' : action === 'insight' || action === 'titles' ? 'insight' : action === 'news' || action === 'enrich' || action === 'structure' || action === 'topics' || action === 'images' || action === 'translate' || action === 'audience' || action === 'seo' || action === 'script' || action === 'rideScan' || action === 'rideGaps' || action === 'rideThumb' || action === 'rideStyle' || action === 'chanScan' || action === 'chanIdeas' || action === 'dupScan' || action === 'dupIdeas' || action === 'ask' ? 'research_aux' : '';
  if (bucket) {
    const limit = auth.limitFor(claims, bucket === 'research' ? (Number(process.env.RESEARCH_DAILY_LIMIT) || 100) : bucket === 'insight' ? (Number(process.env.INSIGHT_DAILY_LIMIT) || 150) : 300);
    try {
      const q = await consumeDaily(claims.uid || claims.sub, bucket, limit);
      if (!q.allowed) return res.status(429).json({ success: false, code: 'QUOTA_EXCEEDED', message: 'Bạn đã dùng hết ' + q.limit + ' lượt ' + (bucket === 'insight' ? 'AI phân tích' : 'tạo tài nguyên') + ' hôm nay. Quay lại vào ngày mai nhé!' });
    } catch (e) {
      return res.status(503).json({ success: false, code: 'QUOTA_UNAVAILABLE', message: 'Hệ thống đếm hạn mức đang lỗi, thử lại sau.' });
    }
  }

  try {
    if (action === 'search') {
      if (prompt.length < 8) return res.status(400).json({ success: false, message: 'Mô tả vụ việc quá ngắn.' });
      const r = await R.doSearch(key, prompt, String(body.context || '').slice(0, 3000), Number(body.hours) || 0);
      return res.json({ success: true, model: R.model(), ...r });
    }
    if (action === 'structure') {
      const d = await R.doStructure(key, prompt, String(body.report || '').slice(0, 30000), Array.isArray(body.sources) ? body.sources.slice(0, 60) : [], body.lang === 'en' ? 'en' : 'vi');
      return res.json({ success: true, dossier: d });
    }
    if (action === 'insight') {
      return res.json({ success: true, insight: await R.doInsight(key, body.kind === 'channel' ? 'channel' : 'keyword', body.data || {}) });
    }
    if (action === 'titles') {
      const d = body.data || {};
      if (String(d.topic || '').trim().length < 4) return res.status(400).json({ success: false, message: 'Mô tả video quá ngắn.' });
      return res.json({ success: true, ...(await R.doTitles(key, d)) });
    }
    if (action === 'news') {
      const qs = (Array.isArray(body.queries) ? body.queries : [prompt]).map(String).filter(Boolean);
      return res.json({ success: true, items: await R.doNews(qs, Number(body.hours) || 0) });
    }
    if (action === 'enrich') {
      const r = await R.doEnrich(Array.isArray(body.urls) ? body.urls.map(String) : [], Array.isArray(body.imageQueries) ? body.imageQueries.map(String) : [], Array.isArray(body.entityQueries) ? body.entityQueries.map(String) : []);
      return res.json({ success: true, ...r });
    }
    if (action === 'translate') return res.json({ success: true, ...(await R.doTranslate(key, body.items, body.to)) });
    if (action === 'audience') return res.json({ success: true, ...(await R.doAudience(key, body.data)) });
    if (action === 'seo') return res.json({ success: true, ...(await R.doSeo(key, body.data)) });
    if (action === 'script') return res.json({ success: true, ...(await R.doScript(key, body.data)) });
    if (action === 'rideScan') return res.json({ success: true, ...(await R.doRideScan(key, body.data)) });
    if (action === 'rideGaps') return res.json({ success: true, ...(await R.doRideGaps(key, body.data)) });
    if (action === 'rideThumb') return res.json({ success: true, ...(await R.doRideThumb(key, body.data)) });
    if (action === 'rideStyle') return res.json({ success: true, ...(await R.doRideStyle(key, body.data)) });
    if (action === 'chanScan') return res.json({ success: true, ...(await R.doChanScan(key, body.data)) });
    if (action === 'chanIdeas') return res.json({ success: true, ...(await R.doChanIdeas(key, body.data)) });
    if (action === 'rideSheet') return res.json({ success: true, ...(await R.doRideSheet(body.data)) });
    if (action === 'dupScan') return res.json({ success: true, ...(await R.doDupScan(key, body.data)) });
    if (action === 'dupIdeas') return res.json({ success: true, ...(await R.doDupIdeas(key, body.data)) });
    if (action === 'ask') return res.json({ success: true, ...(await R.doAsk(key, body.data)) });
    if (action === 'topics') {
      return res.json({ success: true, ...(await R.doTopics(key, { group: body.group, cat: body.cat, country: body.country, period: body.period, n: body.n, note: body.note, skip: body.skip })) });
    }
    if (action === 'images') {
      return res.json({ success: true, ...(await R.doImages(Array.isArray(body.queries) ? body.queries : [prompt])) });
    }
    if (action === 'image') {
      // trả thẳng file ảnh (nhị phân) để trình duyệt đóng gói zip; lỗi vẫn trả JSON
      let im;
      try { im = await R.fetchImage(String(body.url || ''), String(body.ref || '')); }
      catch (e) { return res.status(e.code === 'TOO_BIG' ? 413 : e.code === 'BAD_URL' ? 400 : 502).json({ success: false, code: e.code || 'IMG_ERROR', message: e.message || 'Không tải được ảnh' }); }
      res.setHeader('Content-Type', im.type); res.setHeader('Cache-Control', 'private, max-age=600'); res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.status(200).send(im.buf);
    }
    return res.status(400).json({ success: false, message: 'action không hợp lệ' });
  } catch (e) {
    const code = e.code || 'ERROR';
    return res.status(code === 'NO_API_KEY' ? 501 : code === 'GEMINI_LIMIT' ? 429 : code === 'GEMINI_BUSY' ? 503 : 502).json({ success: false, code, message: code === 'NO_API_KEY' ? 'Máy chủ chưa cấu hình GEMINI_API_KEY.' : code === 'GEMINI_BUSY' ? 'Máy chủ AI của Google đang quá tải, web đã thử hết các model dự phòng mà chưa được. Lỗi này thường tự hết sau một hai phút, bấm lại là chạy.' : code === 'GEMINI_LIMIT' ? 'Key Gemini đã hết lượt của gói miễn phí hôm nay (đặt lại khoảng 15h giờ VN). Thử lại sau, hoặc bật thanh toán cho project trong Google AI Studio để có hạn mức cao hơn.' : e.message });
  }
};
