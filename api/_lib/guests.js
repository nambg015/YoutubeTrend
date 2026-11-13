// Tài khoản khách: trạng thái online, lịch sử thao tác, khoá / mở khoá.
// Lưu ở KV (Upstash). Chưa gắn KV thì chỉ nằm trong RAM của một instance nên hay mất: giao diện sẽ báo rõ.
const store = require('./store');

const IDX = 'guests:idx';
const kLog = email => 'guests:log:' + email;
const ONLINE_MS = 150 * 1000;       // khách gửi nhịp mỗi 60 giây; quá 150 giây không thấy thì coi là offline
const MAX_LOG = 400, LOG_TTL = 60 * 24 * 3600;
const ACTS = ['login', 'nav', 'click', 'ai'];
const S = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

async function readJson(key, dflt) {
  try { const v = await store.get(key); if (!v) return dflt; const j = typeof v === 'string' ? JSON.parse(v) : v; return j && typeof j === 'object' ? j : dflt; }
  catch (e) { return dflt; }
}
const index = () => readJson(IDX, {});
const saveIndex = idx => store.set(IDX, JSON.stringify(idx));

function device(ua) {
  ua = String(ua || '');
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return [os, br].filter(Boolean).join(' · ');
}

async function isBlocked(email) {
  try { const e = (await index())[String(email).toLowerCase()]; return !!(e && e.blocked); } catch (x) { return false; }
}

// Khách báo "tôi đang mở web" + gửi kèm các thao tác vừa làm.
async function ping(email, uid, body, ua) {
  email = String(email).toLowerCase(); const now = Date.now();
  const idx = await index(); const cur = idx[email] || { first: now };
  cur.uid = uid; cur.at = now; cur.route = S(body && body.route, 40); cur.ua = device(ua);
  idx[email] = cur; await saveIndex(idx);
  const ev = (Array.isArray(body && body.events) ? body.events : []).slice(0, 40).map(e => ({
    t: Math.min(now, Math.max(now - 3600 * 1000, Number(e && e.t) || now)), a: ACTS.includes(e && e.a) ? e.a : 'click', d: S(e && e.d, 80), r: S(e && e.r, 30)
  })).filter(e => e.d);
  if (ev.length) {
    const log = await readJson(kLog(email), []);
    await store.set(kLog(email), JSON.stringify((Array.isArray(log) ? log : []).concat(ev).slice(-MAX_LOG)), LOG_TTL);
  }
  return { blocked: !!cur.blocked };
}

async function list() {
  const idx = await index(), now = Date.now();
  return Object.keys(idx).map(email => {
    const e = idx[email] || {};
    return { email, at: e.at || 0, first: e.first || 0, route: e.route || '', ua: e.ua || '', blocked: !!e.blocked, online: !e.blocked && !!e.at && now - e.at < ONLINE_MS };
  }).sort((a, b) => b.at - a.at);
}

async function log(email, limit) {
  const l = await readJson(kLog(String(email).toLowerCase()), []);
  return (Array.isArray(l) ? l : []).slice(-(Math.min(MAX_LOG, Number(limit) || 200))).reverse();
}
const clearLog = email => store.del(kLog(String(email).toLowerCase()));

async function setBlocked(email, blocked) {
  email = String(email).toLowerCase(); const idx = await index();
  idx[email] = Object.assign({ first: Date.now() }, idx[email], { blocked: !!blocked });
  await saveIndex(idx); return idx[email];
}
async function forget(email) {
  email = String(email).toLowerCase(); const idx = await index();
  delete idx[email]; await saveIndex(idx); await clearLog(email);
}

module.exports = { ping, list, log, clearLog, setBlocked, forget, isBlocked, device, ONLINE_MS, persistent: () => store.hasKv() };
