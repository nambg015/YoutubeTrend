// /api/mcp — Cổng MCP của YouTrend (Streamable HTTP, không giữ phiên).
// 1) Trình duyệt (đã đăng nhập) gọi POST { action: 'sync' | 'status' | 'revoke' } để đẩy bản chụp dữ liệu lên và lấy đường dẫn riêng.
// 2) Claude gọi POST JSON-RPC tới /mcp/<mã> (rewrite sang /api/mcp?t=<mã>) để đọc bản chụp đó qua các công cụ chỉ-đọc.
const crypto = require('crypto');
const auth = require('./_lib/auth');
const store = require('./_lib/store');

const TTL = 60 * 86400, MAX = 900000;
const kTok = t => 'mcp:tok:' + t, kUid = u => 'mcp:uid:' + u, kData = u => 'mcp:data:' + u;
const host = req => String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
const link = (req, t) => 'https://' + host(req) + '/mcp/' + t;

// ---------------- phần quản lý (trình duyệt) ----------------
async function manage(req, res, body) {
  const claims = await auth.requirePhoneVerified(req, res);
  if (!claims) return;
  const uid = String(claims.uid || claims.sub || ''), action = body.action;
  if (!uid) return res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
  let tok = await store.get(kUid(uid));
  if (action === 'status') {
    let at = 0; if (tok) { try { at = JSON.parse(await store.get(kData(uid)) || '{}').at || 0; } catch (e) { } }
    return res.json({ success: true, linked: !!tok, url: tok ? link(req, tok) : '', at, persistent: store.hasKv() });
  }
  if (action === 'revoke') {
    if (tok) await store.del(kTok(tok));
    await store.del(kUid(uid)); await store.del(kData(uid));
    return res.json({ success: true, linked: false });
  }
  if (action === 'sync') {
    const d = body.data && typeof body.data === 'object' ? body.data : null;
    if (!d) return res.status(400).json({ success: false, message: 'Thiếu dữ liệu để đồng bộ.' });
    const A = (v, n) => (Array.isArray(v) ? v : []).slice(0, n);
    const snap = { at: Date.now(), filters: String(d.filters || '').slice(0, 300), total: Number(d.total) || 0, channels: A(d.channels, 400), videos: A(d.videos, 500), niches: A(d.niches, 60), dream: A(d.dream, 200), saved: A(d.saved, 150) };
    const raw = JSON.stringify(snap);
    if (raw.length > MAX) return res.status(413).json({ success: false, message: 'Dữ liệu quá lớn để đồng bộ.' });
    if (!tok) { tok = crypto.randomBytes(24).toString('hex'); }
    await store.set(kTok(tok), uid, TTL); await store.set(kUid(uid), tok, TTL); await store.set(kData(uid), raw, TTL);
    return res.json({ success: true, linked: true, url: link(req, tok), at: snap.at, persistent: store.hasKv(), counts: { channels: snap.channels.length, videos: snap.videos.length, niches: snap.niches.length, dream: snap.dream.length, saved: snap.saved.length } });
  }
  return res.status(400).json({ success: false, message: 'action không hợp lệ' });
}

// ---------------- công cụ MCP (chỉ đọc bản chụp) ----------------
const num = { type: 'number' }, str = { type: 'string' };
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const TOOLS = [
  { name: 'youtrend_overview', title: 'Tổng quan dữ liệu YouTrend', annotations: RO, description: 'Overview of the YouTube research data the user synced from YouTrend: when it was synced, which filters were used, how many small channels / hot videos / niches it holds and the top niches. Call this first.', inputSchema: { type: 'object', properties: {} } },
  { name: 'youtrend_niches', title: 'Danh sách ngách', annotations: RO, description: 'List niches found by the Top Ngách scan with their score (0-100), number of small channels, money-farm channels, newly found channels, median views÷subs and 30-day views.', inputSchema: { type: 'object', properties: { sort: { type: 'string', enum: ['score', 'channels', 'farm', 'fresh', 'x', 'v30'], description: 'default score' }, limit: num } } },
  { name: 'youtrend_channels', title: 'Tìm kênh nhỏ', annotations: RO, description: 'Filter the small YouTube channels in the snapshot. Fields returned: id, name, sub, mk (country), niche, age (days), vids (total videos), v30 (views of the last 30 days), vpm (videos per month), score (farm score 0-100), verdict (farm = consistently earns views far above its subs, rise, fluke, cold, unk), x (median views ÷ subs), star / note (the user\'s own marks), best (their top video).', inputSchema: { type: 'object', properties: { max_sub: num, min_sub: num, min_score: num, min_v30: num, max_age_days: num, verdict: { type: 'string', enum: ['farm', 'rise', 'fluke', 'cold', 'unk'] }, country: { type: 'string', description: '2-letter code such as US, JP' }, niche: { type: 'string', description: 'substring of the niche name' }, starred: { type: 'boolean' }, sort: { type: 'string', enum: ['score', 'v30', 'sub', 'x', 'age', 'vpm'], description: 'default score' }, limit: { type: 'number', description: 'default 25, max 60' } } } },
  { name: 'youtrend_videos', title: 'Tìm video nổ', annotations: RO, description: 'Filter the breakout videos in the snapshot. Fields returned: id, ch (channel), chId, sub, t (title), v (views), vph (views per hour since upload), x (views ÷ subs), h (hours since upload at sync time), d (duration seconds), mk (country), niche, farm (channel is rated farm).', inputSchema: { type: 'object', properties: { max_hours: num, min_views: num, min_vph: num, min_x: num, max_sub: num, min_duration: num, country: str, niche: str, title_contains: str, channel_id: str, sort: { type: 'string', enum: ['vph', 'views', 'x', 'new'], description: 'default vph' }, limit: { type: 'number', description: 'default 25, max 60' } } } },
  { name: 'youtrend_dream100', title: 'Kênh đang theo dõi (Dream 100)', annotations: RO, description: 'Channels the user follows in YouTrend (their Dream 100 list): title, project group, subs, total views, v30 (views of uploads in the last 30 days), n30 (uploads in the last 30 days), country, subs gained since the earlier snapshot, and the user\'s note.', inputSchema: { type: 'object', properties: { group: { type: 'string', description: 'project name' }, sort: { type: 'string', enum: ['v30', 'sub', 'growth', 'n30'] }, limit: num } } },
  { name: 'youtrend_saved_videos', title: 'Video đã lưu', annotations: RO, description: 'Videos the user saved in YouTrend as references.', inputSchema: { type: 'object', properties: { limit: num } } }
];
const lc = v => String(v == null ? '' : v).toLowerCase();
const lim = (a, d, m) => Math.max(1, Math.min(m, Math.round(Number(a) || d)));
const by = (rows, key, asc) => rows.slice().sort((a, b) => ((Number(b[key]) || 0) - (Number(a[key]) || 0)) * (asc ? -1 : 1));
function runTool(name, a, S) {
  a = a || {};
  const meta = { synced_at: new Date(S.at).toISOString(), age_hours: Math.round((Date.now() - S.at) / 36e5) };
  if (name === 'youtrend_overview') return Object.assign(meta, { filters: S.filters, channels_in_store: S.total, small_channels: S.channels.length, farm_channels: S.channels.filter(c => c.verdict === 'farm').length, breakout_videos: S.videos.length, niches: S.niches.length, followed_channels: S.dream.length, saved_videos: S.saved.length, top_niches: by(S.niches, 'score').slice(0, 10), note: 'Data is a snapshot synced from the user\'s browser; ask them to press "Đồng bộ ngay" in YouTrend > Cài đặt if it looks stale.' });
  if (name === 'youtrend_niches') { const k = { score: 'score', channels: 'channels', farm: 'farm', fresh: 'fresh', x: 'x', v30: 'v30' }[a.sort] || 'score'; return Object.assign(meta, { niches: by(S.niches, k).slice(0, lim(a.limit, 30, 60)) }); }
  if (name === 'youtrend_channels') {
    let r = S.channels.filter(c => (a.max_sub == null || c.sub <= a.max_sub) && (a.min_sub == null || c.sub >= a.min_sub) && (a.min_score == null || (c.score || 0) >= a.min_score) && (a.min_v30 == null || (c.v30 || 0) >= a.min_v30) && (a.max_age_days == null || (c.age != null && c.age <= a.max_age_days)) && (!a.verdict || c.verdict === a.verdict) && (!a.country || lc(c.mk) === lc(a.country)) && (!a.niche || lc(c.niche).includes(lc(a.niche))) && (!a.starred || c.star));
    const k = { score: 'score', v30: 'v30', sub: 'sub', x: 'x', age: 'age', vpm: 'vpm' }[a.sort] || 'score';
    const n = r.length; r = by(r, k, k === 'age').slice(0, lim(a.limit, 25, 60));
    return Object.assign(meta, { matched: n, returned: r.length, channels: r.map(c => Object.assign({}, c, { url: 'https://www.youtube.com/channel/' + c.id })) });
  }
  if (name === 'youtrend_videos') {
    let r = S.videos.filter(v => (a.max_hours == null || v.h <= a.max_hours) && (a.min_views == null || v.v >= a.min_views) && (a.min_vph == null || v.vph >= a.min_vph) && (a.min_x == null || v.x >= a.min_x) && (a.max_sub == null || v.sub <= a.max_sub) && (a.min_duration == null || v.d >= a.min_duration) && (!a.country || lc(v.mk) === lc(a.country)) && (!a.niche || lc(v.niche).includes(lc(a.niche))) && (!a.title_contains || lc(v.t).includes(lc(a.title_contains))) && (!a.channel_id || v.chId === a.channel_id));
    const k = { vph: 'vph', views: 'v', x: 'x', new: 'h' }[a.sort] || 'vph';
    const n = r.length; r = by(r, k, k === 'h').slice(0, lim(a.limit, 25, 60));
    return Object.assign(meta, { matched: n, returned: r.length, videos: r.map(v => Object.assign({}, v, { url: 'https://www.youtube.com/watch?v=' + v.id })) });
  }
  if (name === 'youtrend_dream100') {
    let r = S.dream.filter(c => !a.group || lc(c.group) === lc(a.group));
    const k = { v30: 'v30', sub: 'sub', growth: 'sub_gain', n30: 'n30' }[a.sort] || 'v30';
    return Object.assign(meta, { groups: [...new Set(S.dream.map(c => c.group).filter(Boolean))], matched: r.length, channels: by(r, k).slice(0, lim(a.limit, 50, 200)).map(c => Object.assign({}, c, { url: 'https://www.youtube.com/channel/' + c.id })) });
  }
  if (name === 'youtrend_saved_videos') return Object.assign(meta, { videos: S.saved.slice(0, lim(a.limit, 50, 150)).map(v => Object.assign({}, v, { url: 'https://www.youtube.com/watch?v=' + v.id })) });
  return null;
}

// ---------------- JSON-RPC ----------------
const ok = (id, result) => ({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => ({ jsonrpc: '2.0', id: id === undefined ? null : id, error: { code, message } });
async function rpc(msg, load) {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return fail(msg && msg.id, -32600, 'Invalid Request');
  const id = msg.id, m = msg.method, p = msg.params || {};
  if (id === undefined || id === null) return null;                      // thông báo (notifications/*): không trả lời
  if (m === 'initialize') return ok(id, { protocolVersion: typeof p.protocolVersion === 'string' ? p.protocolVersion : '2025-06-18', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'youtrend', title: 'YouTrend', version: '1.0.0' }, instructions: 'Read-only access to the YouTube niche research the user collected in YouTrend (small channels that earn views far above their subscriber count, breakout videos, niches, followed channels). Start with youtrend_overview. All numbers come from a snapshot synced from the user\'s browser.' });
  if (m === 'ping') return ok(id, {});
  if (m === 'tools/list') return ok(id, { tools: TOOLS });
  if (m === 'tools/call') {
    if (!TOOLS.some(t => t.name === p.name)) return fail(id, -32602, 'Unknown tool: ' + p.name);
    const S = await load();
    if (!S) return ok(id, { content: [{ type: 'text', text: 'Chưa có dữ liệu. Hãy mở YouTrend > Cài đặt > Cổng MCP và bấm "Đồng bộ ngay".' }], isError: true });
    try { return ok(id, { content: [{ type: 'text', text: JSON.stringify(runTool(p.name, p.arguments, S)) }] }); }
    catch (e) { return ok(id, { content: [{ type: 'text', text: 'Lỗi khi đọc dữ liệu: ' + (e.message || e) }], isError: true }); }
  }
  if (m === 'resources/list') return ok(id, { resources: [] });
  if (m === 'prompts/list') return ok(id, { prompts: [] });
  return fail(id, -32601, 'Method not found: ' + m);
}

module.exports = async (req, res) => {
  auth.applyCors(req, res, 'Mcp-Session-Id, Mcp-Protocol-Version');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const isRpc = !!body && (Array.isArray(body) || body.jsonrpc);
  if (req.method === 'POST' && body && !isRpc && body.action) return manage(req, res, body);
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST, OPTIONS'); return res.status(405).json(fail(null, -32000, 'This MCP endpoint answers POST only.')); }
  if (!isRpc) return res.status(400).json(fail(null, -32700, 'Parse error'));

  const tok = String((req.query && req.query.t) || '').trim();
  const uid = /^[a-f0-9]{48}$/.test(tok) ? await store.get(kTok(tok)) : null;
  if (!uid) return res.status(401).json(fail(null, -32001, 'Đường dẫn MCP không đúng hoặc đã bị thu hồi. Tạo lại trong YouTrend > Cài đặt.'));
  let cache;
  const load = async () => { if (cache === undefined) { try { cache = JSON.parse(await store.get(kData(uid)) || 'null'); } catch (e) { cache = null; } } return cache; };

  const out = Array.isArray(body) ? (await Promise.all(body.map(m => rpc(m, load)))).filter(Boolean) : await rpc(body, load);
  if (!out || (Array.isArray(out) && !out.length)) { res.status(202).end(); return; }
  res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(JSON.stringify(out));
};
module.exports._test = { rpc, runTool, TOOLS };
