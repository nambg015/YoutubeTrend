// Quét hằng ngày: AI (Gemini) sinh ngách → quét YouTube (xoay vòng nhiều key) → lọc view nổ / sub thấp → data/top_ngach.json
// ENV: YT_API_KEYS="k1,k2,..."  GEMINI_API_KEY  [MARKETS=EN,VN,JP,...] [HOURS=72] [MAX_NICHES=1200] [MIN_OUTLIER=5]
const fs = require('fs'), OUT = 'data/top_ngach.json';
const KEYS = (process.env.YT_API_KEYS || process.env.YT_API_KEY || '').split(',').map(s => s.trim()).filter(Boolean);
const GEM = process.env.GEMINI_API_KEY, MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const HOURS = +process.env.HOURS || 72, MIN_OUT = +process.env.MIN_OUTLIER || 5, MAX = +process.env.MAX_NICHES || 1200;
const M = { EN: ['🇺🇸', 'US', 'en', 'English (global)'], VN: ['🇻🇳', 'VN', 'vi', 'Vietnamese'], JP: ['🇯🇵', 'JP', 'ja', 'Japanese'], KR: ['🇰🇷', 'KR', 'ko', 'Korean'], DE: ['🇩🇪', 'DE', 'de', 'German'], FR: ['🇫🇷', 'FR', 'fr', 'French'], ES: ['🇪🇸', 'MX', 'es', 'Spanish'], BR: ['🇧🇷', 'BR', 'pt', 'Portuguese'], IN: ['🇮🇳', 'IN', 'hi', 'Hindi'], ID: ['🇮🇩', 'ID', 'id', 'Indonesian'], TH: ['🇹🇭', 'TH', 'th', 'Thai'], RU: ['🇷🇺', 'RU', 'ru', 'Russian'] };
const MARKETS = (process.env.MARKETS || Object.keys(M).join(',')).split(',').filter(k => M[k]);
const dead = new Set(); let units = 0, ki = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const chunk = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; };

async function yt(path, p) {
  for (let t = 0; t < KEYS.length * 2; t++) {
    const live = KEYS.filter(k => !dead.has(k)); if (!live.length) throw new Error('Hết quota tất cả key');
    const key = live[ki++ % live.length], u = new URL('https://www.googleapis.com/youtube/v3/' + path);
    Object.entries({ ...p, key }).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u), j = await r.json().catch(() => ({}));
    if (r.ok) { units += path === 'search' ? 100 : 1; return j; }
    const why = j.error?.errors?.[0]?.reason || r.status;
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
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.9 } }) });
    return JSON.parse((await r.json()).candidates[0].content.parts[0].text);
  } catch (e) { console.warn('Gemini lỗi:', e.message); return null; }
}
const iso = s => { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); };

const STOP = new Set('the and with this that from what how you your for are was were have has had not but all can will just they them their his her its our out who why when where which about into over than then more most new video videos official full live part episode shorts trailer song music lyrics hd 4k de la le les el los las en un una que por para con del und der die das ein mit von como não uma dos das'.split(' '));
const words = (t, lang) => { try { return [...new Intl.Segmenter(lang, { granularity: 'word' }).segment(t.toLowerCase())].filter(x => x.isWordLike).map(x => x.segment); } catch (e) { return t.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []; } };
function phrases(titles, lang, minDf = 2, top = 40) { // cụm 2-3 từ lặp lại nhiều nhất trong tiêu đề = chủ đề đang nổ
  const df = new Map();
  titles.forEach(t => { const w = words(t.replace(/#\S+/g, ' '), lang).filter(x => !/^\d+$/.test(x)), cjk = /[\u3040-\u30ff\u4e00-\u9fff\uac00-\ud7af\u0e00-\u0e7f]/.test(t), seen = new Set();
    for (let n = 2; n <= 3; n++) for (let i = 0; i + n <= w.length; i++) { const g = w.slice(i, i + n); if (STOP.has(g[0]) || STOP.has(g[n - 1]) || (!cjk && g.some(x => x.length < 2))) continue; const k = g.join(cjk ? '' : ' '); if (!seen.has(k)) { seen.add(k); df.set(k, (df.get(k) || 0) + 1); } } });
  const out = []; for (const [k, c] of [...df].filter(([, c]) => c >= minDf).sort((a, b) => b[1] * b[0].length - a[1] * a[0].length)) { if (out.some(o => o.k.includes(k) && o.c >= c)) continue; out.push({ k, c }); if (out.length >= top) break; }
  return out.map(o => o.k);
}
async function gtrends(geo) { try { const x = await (await fetch('https://trends.google.com/trending/rss?geo=' + geo, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text(); return [...x.matchAll(/<(?:ht:news_item_title|title)>(?:<!\[CDATA\[)?([^<\]]+)/g)].map(m => m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").trim()).slice(1, 40); } catch (e) { return []; } }
// Dò trend hôm nay của 1 thị trường: mostPopular (8 danh mục) + Google Trends → AI biến thành truy vấn cụ thể theo sự kiện
async function trendQueries(mk, per) {
  const [, reg, lang, lname] = M[mk], titles = [];
  for (const c of ['', '25', '28', '24', '27', '22', '17', '20']) ((await yt('videos', { part: 'snippet', chart: 'mostPopular', regionCode: reg, maxResults: 50, videoCategoryId: c })).items || []).forEach(v => titles.push(v.snippet.title));
  const gt = await gtrends(reg), ph = phrases(titles, lang, 2, 50), seeds = [...new Set([...gt.slice(0, 20), ...ph])];
  const ai = await gemini(`Today is ${new Date().toISOString().slice(0, 10)}. These are what is trending right now in ${lname} market (Google Trends headlines + recurring phrases from YouTube's most popular videos):\n${JSON.stringify(seeds)}\nTurn them into ${per} DISTINCT YouTube search queries in ${lname} that small channels would cover to ride these events: specific events/people/incidents, with several angles each (breaking news, what happened, explained, timeline, documentary, reaction, analysis). Skip pure entertainment/sports scores/celebrity gossip unless huge. Return JSON array of strings.`);
  const qs = Array.isArray(ai) && ai.length ? ai.map(String) : seeds;
  return qs.slice(0, per).map(q => ({ name: q.slice(0, 40) + ' (Trend hôm nay)', query: q, mk }));
}
async function enrich(ids, niche, mk) {
  const out = [];
  for (const c of chunk(ids, 50)) {
    const vs = ((await yt('videos', { part: 'snippet,statistics,contentDetails', id: c.join(',') })).items || []).filter(v => v.snippet.liveBroadcastContent !== 'live');
    const subs = {};
    for (const cc of chunk([...new Set(vs.map(v => v.snippet.channelId))], 50))
      ((await yt('channels', { part: 'statistics', id: cc.join(',') })).items || []).forEach(x => { subs[x.id] = x.statistics.hiddenSubscriberCount ? null : +x.statistics.subscriberCount; });
    for (const v of vs) {
      const s = subs[v.snippet.channelId], views = +v.statistics.viewCount || 0;
      if (s == null || s > 1e5 || views < 1000 || views / Math.max(s, 1) < MIN_OUT) continue;
      out.push({ id: v.id, title: v.snippet.title, channel: v.snippet.channelTitle, channelId: v.snippet.channelId, published: v.snippet.publishedAt, t: Date.parse(v.snippet.publishedAt), views, subs: s, dur: iso(v.contentDetails.duration), niche, mk });
    }
  }
  return out;
}
const SEED = ['plane crash cockpit recording', 'true crime documentary', 'dark psychology', 'ancient civilization mystery', 'stock market crash explained', 'survival rescue story', 'ai tools tutorial', 'passive income side hustle', 'medieval history facts', 'military technology explained'];

(async () => {
  if (!KEYS.length) throw new Error('Thiếu YT_API_KEYS');
  const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};
  const budget = Math.min(MAX, Math.floor(KEYS.length * 9000 / 104));
  console.log(`Key: ${KEYS.length} • ngân sách ~${budget} ngách`);
  // 1) ngách: TREND hôm nay (45%) → ngách hôm qua có hit → AI evergreen; chừa 15% cho vòng Snowball
  const B1 = Math.floor(budget * .85), list = new Map(), add = (name, query, mk) => { const k = mk + '|' + query.toLowerCase(); if (!list.has(k) && list.size < B1) list.set(k, { name, query, mk }); };
  for (const g of chunk(MARKETS, 4)) await Promise.all(g.map(async mk => (await trendQueries(mk, Math.ceil(B1 * .45 / MARKETS.length))).forEach(x => add(x.name, x.query, x.mk))));
  console.log('Trend queries:', list.size);
  (prev.niches || []).filter(n => n.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, Math.floor(B1 * .2)).forEach(n => add(n.name, n.query, n.mk));
  const per = Math.ceil((B1 - list.size) / MARKETS.length);
  for (const g of chunk(MARKETS, 4)) await Promise.all(g.map(async mk => {
    const hot = (prev.niches || []).filter(n => n.mk === mk && n.hits > 0).slice(0, 8).map(n => n.query).join('; ');
    const r = await gemini(`You are a YouTube niche researcher. Today is ${new Date().toISOString().slice(0, 10)}. Generate ${Math.min(per, 150)} DISTINCT, specific YouTube search queries in ${M[mk][3]} for niches likely to be going viral on small/new channels (faceless-friendly, high RPM, evergreen+seasonal: disasters, crime, history, psychology, finance, AI, health, mystery, stories, tech, etc.). Mix broad and long-tail. Hot niches already found (avoid duplicates, explore neighbours): ${hot || 'none'}. Return JSON array of {"name":"short Vietnamese label","query":"search query"}.`);
    (Array.isArray(r) ? r : []).forEach(x => x?.query && add(x.name || x.query, String(x.query), mk));
  }));
  if (list.size < 30) SEED.forEach(q => add(q, q, 'EN'));
  // 2) quét
  const items = new Map(), seen = new Set(), stat = new Map(), after = new Date(Date.now() - HOURS * 36e5).toISOString();
  let done = 0, total = list.size;
  const run = async arr => { for (const grp of chunk(arr, 6)) {
    if (dead.size >= KEYS.length) break;
    await Promise.all(grp.map(async n => {
      const sr = await yt('search', { part: 'snippet', type: 'video', order: 'viewCount', maxResults: 50, q: n.query, publishedAfter: after, relevanceLanguage: M[n.mk][2], regionCode: M[n.mk][1] });
      const ids = (sr.items || []).map(i => i.id.videoId).filter(id => id && !seen.has(id)); ids.forEach(i => seen.add(i));
      const label = M[n.mk][0] + ' ' + n.name;
      const got = await enrich(ids, label, n.mk); got.forEach(v => items.set(v.id, v));
      stat.set(n.mk + '|' + n.query, { name: n.name, query: n.query, mk: n.mk, hits: got.length, top: Math.max(0, ...got.map(v => v.views / Math.max(v.subs, 1))) });
    }));
    if ((done += grp.length) % 60 < 6) console.log(`  ${done}/${total} ngách • ${items.size} video • ${units} units`);
  } };
  console.log('Vòng 1:', list.size, 'ngách'); await run([...list.values()]);
  // Snowball: lấy cụm từ lặp lại trong tiêu đề các video đã nổ → quét tiếp đúng chủ đề đó
  const sn = [], B2 = budget - list.size;
  for (const mk of MARKETS) {
    const ts = [...items.values()].filter(v => v.mk === mk).sort((a, b) => b.views / b.subs - a.views / a.subs).slice(0, 300).map(v => v.title);
    phrases(ts, M[mk][2], 2, Math.ceil(B2 / MARKETS.length)).forEach(p => { if (!list.has(mk + '|' + p)) sn.push({ name: p.slice(0, 40) + ' (Snowball)', query: p, mk }); });
  }
  total += Math.min(sn.length, B2); console.log('Vòng 2 Snowball:', Math.min(sn.length, B2), 'ngách'); await run(sn.slice(0, B2));
  // 3) nhân kênh nhỏ có video nổ (1 unit/kênh)
  const ch = [...new Map([...items.values()].sort((a, b) => b.views / b.subs - a.views / a.subs).map(v => [v.channelId, v])).values()].slice(0, Math.min(300, KEYS.length * 25));
  for (const grp of chunk(ch, 8)) await Promise.all(grp.map(async v => {
    const pl = await yt('playlistItems', { part: 'contentDetails', playlistId: 'UU' + v.channelId.slice(2), maxResults: 15 });
    const ids = (pl.items || []).map(i => i.contentDetails.videoId).filter(id => !seen.has(id)); ids.forEach(i => seen.add(i));
    (await enrich(ids, v.niche, v.mk)).filter(x => x.t >= Date.now() - HOURS * 36e5).forEach(x => items.set(x.id, x));
  }));
  const res = [...items.values()].sort((a, b) => b.views / b.subs - a.views / a.subs).slice(0, 6000);
  // 4) AI nhận định top ngách
  const g = {}; res.forEach(v => (g[v.niche] = g[v.niche] || []).push(v));
  const top = Object.entries(g).map(([n, a]) => ({ n, c: new Set(a.map(v => v.channelId)).size, o: Math.round(a[0].views / a[0].subs), t: a.slice(0, 3).map(v => v.title) })).sort((a, b) => b.c * Math.log10(1 + b.o) - a.c * Math.log10(1 + a.o)).slice(0, 12);
  const insights = await gemini(`Dưới đây là các ngách YouTube có kênh sub thấp nổ view hôm nay (c=số kênh nhỏ, o=outlier cao nhất, t=tiêu đề mẫu). Với mỗi ngách viết bằng tiếng Việt: "why" (1 câu vì sao đang nổ), "idea" (1 ý tưởng video có thể làm ngay), "risk" (thấp/vừa/cao về mức cạnh tranh). Trả JSON array {"niche","why","idea","risk"}.\n${JSON.stringify(top)}`) || [];
  fs.mkdirSync('data', { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({ updated: Date.now(), hours: HOURS, scanned: done, quota: units, items: res, niches: [...stat.values()], insights }));
  console.log(`Xong: ${res.length} video • ${done} ngách • ${units} units • ${dead.size}/${KEYS.length} key hết quota`);
})().catch(e => { console.error(e); process.exit(1); });
