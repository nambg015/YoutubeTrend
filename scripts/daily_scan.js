// TOP NGÁCH v3 — quét tự động hằng ngày (GitHub Actions). Dùng CHUNG engine với web: ../top_ngach_v3.js
// Kho tích luỹ qua các ngày (data/top_ngach.json, v:3): nguồn đã quét được nhường chỗ cho nguồn mới → mỗi ngày ra thêm kênh lạ.
// ENV: YT_API_KEYS="k1,k2,..."  [GEMINI_API_KEY]  [PER_KEY=9500]  [HOURS=168]
const fs = require('fs'), path = require('path');
const E = require(path.join(__dirname, '..', 'top_ngach_v3.js'));
const OUT = path.join(__dirname, '..', 'data', 'top_ngach.json');
const KEYS = (process.env.YT_API_KEYS || process.env.YT_API_KEY || '').split(',').map(s => s.trim()).filter(Boolean);
const GEM = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const PER_KEY = +process.env.PER_KEY || 9500, HOURS = +process.env.HOURS || 168;
const dead = new Set(); let ki = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function yt(p, params) {
  for (let t = 0; t < KEYS.length * 2 + 2; t++) {
    const live = KEYS.filter(k => !dead.has(k));
    if (!live.length) { const e = new Error('Hết quota tất cả key'); e.code = 'quotaExceeded'; throw e; }
    const key = live[ki++ % live.length], u = new URL('https://www.googleapis.com/youtube/v3/' + p);
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v); });
    u.searchParams.set('key', key);
    let r, j;
    try { r = await fetch(u); j = await r.json().catch(() => ({})); } catch (e) { await sleep(1000); continue; }
    if (r.ok) return j;
    const why = (j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || String(r.status);
    if (/quota|dailyLimit|rateLimit/i.test(why)) { dead.add(key); continue; }
    if (r.status >= 500) { await sleep(800); continue; }
    return { items: [] };
  }
  return { items: [] };
}
async function gemini(prompt) {
  if (!GEM) return null;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEM}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 1 } }) });
    return JSON.parse((await r.json()).candidates[0].content.parts[0].text);
  } catch (e) { console.warn('Gemini lỗi:', e.message); return null; }
}
// AI nghĩ thêm truy vấn bản địa cho từng nước (đa dạng content, tránh trùng ngách đã có)
async function aiSeeds(store) {
  if (!GEM) return [];
  const out = [], have = {};
  Object.values(store.channels).forEach(c => { (have[c.mk] = have[c.mk] || new Set()).add(c.nc); });
  for (const group of E.chunk(E.ALL_MK, 5)) await Promise.all(group.map(async mk => {
    const m = E.M[mk], rpm = E.RPM_MK.includes(mk);
    const known = [...(have[mk] || [])].slice(0, 40).join('; ');
    const r = await gemini(`Today is ${new Date().toISOString().slice(0, 10)}. You research YouTube niches where SMALL channels (<20k subs) get far more views than subscribers. Market: ${m[1]} (language code ${m[3]}). Give 25 DISTINCT YouTube search queries written in that market's language, covering very different content types (${rpm ? 'lean towards high-RPM faceless long-form: finance, tech, AI, health, history, crime, documentary, stories, education — but also include some entertainment' : 'any content: gaming, comedy, kids, pets, cooking, DIY, beauty, sports, music covers, vlogs, stories, mystery, news, education'}). Prefer long-tail queries real people search this week. Avoid these niches already covered: ${known || 'none'}. Return JSON array of {"label":"short Vietnamese niche name","q":"query"}.`);
    (Array.isArray(r) ? r : []).forEach(x => { if (x && x.q) out.push({ label: String(x.label || x.q).slice(0, 40), q: String(x.q), mk }); });
  }));
  return out;
}

(async () => {
  if (!KEYS.length) throw new Error('Thiếu YT_API_KEYS');
  let store = E.emptyStore();
  try { const prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); if (prev && prev.v === 3) store = prev; } catch (e) { }
  const total = KEYS.length * PER_KEY, t0 = Date.now();
  console.log(`Key: ${KEYS.length} • ngân sách ${total} quota • kho cũ ${Object.keys(store.channels).length} kênh`);
  const extra = await aiSeeds(store); console.log('AI seed:', extra.length);
  const base = { country: '', maxSub: E.CAP_SUB, hours: HOURS, minView: 0, minOut: 1 };
  const passes = [
    ['Toàn cầu • video dài', { ...base, mode: 'all', fmt: 'long' }, 0.55],
    ['RPM cao • video dài', { ...base, mode: 'rpm', fmt: 'long' }, 0.25],
    ['Toàn cầu • Shorts', { ...base, mode: 'all', fmt: 'short' }, 0.20]
  ];
  let used = 0;
  for (const [name, f, share] of passes) {
    if (dead.size >= KEYS.length) break;
    const budget = Math.floor(total * share);
    const res = await E.scan({ yt, store, f, budget, extraSeeds: extra, searchShare: 0.55, maxProfiles: 3000, onProgress: m => { if (Math.random() < 0.05) console.log('   ', m); } });
    used += res.units;
    console.log(`${name}: ${res.searches} nguồn • +${res.newChannels} kênh • +${res.newVideos} video • so sánh ${res.profiled} kênh • ${res.units} quota${res.stop ? ' • dừng: ' + res.stop : ''}`);
  }
  const out = E.prune(store, { maxVideos: 12000, maxChannels: 4500, maxUploads: 24, videoDays: 45 });
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const farm = Object.values(out.channels).filter(c => E.analyze(c, Date.now(), false).v === 'farm').length;
  console.log(`Xong sau ${Math.round((Date.now() - t0) / 1000)}s: ${Object.keys(out.channels).length} kênh nhỏ (${farm} farm video dài) • ${Object.keys(out.videos).length} video • ${used} quota • ${dead.size}/${KEYS.length} key hết quota`);
})().catch(e => { console.error(e); process.exit(1); });
