// TẠO TÀI NGUYÊN — logic máy chủ (không phụ thuộc Vercel, test được bằng node).
// B1 search   : Gemini + Google Search viết báo cáo có trích nguồn thật (groundingMetadata)
// B2 structure: Gemini (JSON) chuẩn hoá thành hồ sơ: tóm tắt, timeline, số liệu, trích dẫn, thực thể, truy vấn YouTube/ảnh, nguồn gốc
// B3 enrich   : mở link nguồn → URL thật, tiêu đề, ảnh đại diện (og:image), ngày đăng; ảnh Wikimedia Commons (có giấy phép)
// B0 news     : Google News RSS (miễn phí, luôn chạy; là phương án dự phòng khi Gemini lỗi/hết lượt)
'use strict';

// Model mặc định + dự phòng. Google ngừng cấp model cũ cho key mới (404) và mỗi model có hạn mức riêng (429),
// nên gặp 2 lỗi đó thì tự thử model kế tiếp. lite = ưu tiên Flash-Lite (hạn mức miễn phí lớn hơn nhiều).
const BASE = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];
const LITE = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-2.5-flash'];
const DEAD = new Set();
const MODELS = lite => { const all = [...new Set((lite ? LITE : [process.env.GEMINI_MODEL].concat(BASE)).filter(Boolean))], live = all.filter(m => !DEAD.has(m)); return live.length ? live : all; };
let LAST = '';
const MODEL = () => LAST || MODELS()[0];
const UA = 'Mozilla/5.0 (compatible; YouTrendResearch/1.0; +https://youtubetrend-rho.vercel.app)';

// slice: số mili giây tối đa cho MỘT model. Có slice thì model trả lời chậm bị bỏ để thử model kế tiếp, thay vì ngồi chờ hết cả quỹ thời gian.
async function gemini(key, body, timeoutMs, lite, slice) {
  if (!key) { const e = new Error('NO_API_KEY'); e.code = 'NO_API_KEY'; throw e; }
  const t0 = Date.now(), total = timeoutMs || 24000;
  let last = null;
  // Vòng 2 chỉ chạy khi có model báo quá tải (503): chờ một nhịp rồi thử lại, vì quá tải thường chỉ kéo dài vài giây.
  for (let round = 0; round < 2; round++) {
  let busy = 0;
  if (round) { if (total - (Date.now() - t0) < 7000) break; await new Promise(r => setTimeout(r, 1500)); }
  for (const m of MODELS(lite)) {
    const left = total - (Date.now() - t0); if (left < 3000) break;
    let r, j;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body), signal: AbortSignal.timeout(slice ? Math.min(left, slice) : left)
      });
      j = await r.json().catch(() => ({}));
    } catch (err) {
      // quá thời gian chờ hoặc rớt mạng tới Google: không ném lỗi thô ra ngoài, thử model kế tiếp nếu còn thời gian
      busy++; if (!last || last.code !== 'GEMINI_LIMIT') last = Object.assign(new Error('AI trả lời quá lâu (' + m + ').'), { code: 'GEMINI_SLOW' });
      continue;
    }
    if (!r.ok) {
      const msg = ((j.error && j.error.message) || '').slice(0, 300);
      const e = new Error('Gemini ' + r.status + ': ' + msg);
      e.code = r.status === 429 ? 'GEMINI_LIMIT' : 'GEMINI_ERROR';
      if (r.status === 404 || /no longer available|is not found|not supported for generateContent/i.test(msg)) { DEAD.add(m); last = last || e; continue; }
      if (r.status === 429) { last = e; continue; }   // lỗi hạn mức được ưu tiên báo ra để phía trên biết đường chuyển sang chế độ dự phòng
      // model đang quá tải / lỗi tạm của Google: thử model kế tiếp thay vì báo lỗi ngay
      if (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504 || (r.status !== 400 && r.status !== 403 && /high demand|overloaded|unavailable|try again later/i.test(msg))) { busy++; e.code = 'GEMINI_BUSY'; if (!last || last.code !== 'GEMINI_LIMIT') last = e; continue; }
      throw e;
    }
    LAST = m;
    const c = (j.candidates || [])[0] || {};
    const text = ((c.content && c.content.parts) || []).map(p => p.text || '').join('');
    if (!text) { const e = new Error('Gemini trả về rỗng'); e.code = 'GEMINI_EMPTY'; throw e; }
    return { text, meta: c.groundingMetadata || {} };
  }
  if (!busy) break;
  }
  throw last || Object.assign(new Error('Gemini quá thời gian chờ'), { code: 'GEMINI_ERROR' });
}
const askJson = async (key, text, ms, lite, slice) => parseJson((await gemini(key, { contents: [{ parts: [{ text }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }, ms, lite, slice)).text);

// Gắn [n] vào câu theo groundingSupports → mỗi ý trong báo cáo đều trỏ về nguồn thật
function annotate(text, meta) {
  const chunks = (meta.groundingChunks || []).map(c => c.web || {}).map(w => ({ uri: w.uri || '', title: w.title || '' }));
  const ins = [];
  let from = 0;
  (meta.groundingSupports || []).forEach(s => {
    const seg = s.segment && s.segment.text; if (!seg) return;
    let at = text.indexOf(seg, from); if (at < 0) at = text.indexOf(seg); if (at < 0) return;
    from = at; const ids = (s.groundingChunkIndices || []).filter(i => chunks[i]).map(i => i + 1);
    if (ids.length) ins.push([at + seg.length, ' [' + [...new Set(ids)].join(',') + ']']);
  });
  ins.sort((a, b) => b[0] - a[0]);
  let out = text; const done = new Set();
  ins.forEach(([pos, tag]) => { if (done.has(pos)) return; done.add(pos); out = out.slice(0, pos) + tag + out.slice(pos); });
  return { report: out, sources: chunks.map((c, i) => ({ n: i + 1, title: c.title, uri: c.uri })), queries: meta.webSearchQueries || [] };
}

function searchPrompt(userPrompt, ctx, hours) {
  const today = new Date().toISOString().slice(0, 10);
  return `Today is ${today}. You are a meticulous news researcher preparing source material for a YouTube documentary/news-explainer video.
Research THIS story using Google Search. Focus on the LATEST information${hours ? ' (especially the last ' + (hours >= 48 ? Math.round(hours / 24) + ' days' : hours + ' hours') + ')' : ''}, and cover the background needed to explain it.

STORY / BRIEF FROM THE CREATOR:
"""${userPrompt}"""
${ctx ? '\nREFERENCE VIDEO THE CREATOR WANTS TO FOLLOW:\n"""' + ctx + '"""\n' : ''}
Write a factual research report in English with these sections:
1. What happened (who, what, where, when — exact dates/times and time zones when known).
2. Latest updates, newest first, each with its date.
3. Timeline of events from start to now.
4. Key numbers (casualties, speeds, altitudes, amounts, distances... whatever applies).
5. Official statements and direct quotes — exact words, who said it, their role, when.
6. People, organizations, places, and specific objects/identifiers involved (e.g. aircraft model + registration/tail number, ship name, case number, company ticker).
7. Official primary sources that exist for this story (agency reports, dockets, court filings, press briefings, recordings, data trackers).
8. What is still unknown, disputed or unconfirmed.
9. Claims circulating in media or social posts that are NOT officially confirmed yet (who reports them, where).
Only state what sources support. Clearly mark rumors or unconfirmed claims.`;
}

function structurePrompt(userPrompt, report, sources, lang) {
  const L = lang === 'en' ? 'English' : 'Vietnamese (tiếng Việt)';
  return `You convert a research report into a structured resource dossier for a YouTube video creator.
Write all descriptive fields in ${L}. Keep direct quotes, names, identifiers and search queries in their ORIGINAL language.
Every factual item must cite source numbers from the report's [n] markers in "src" (array of integers). If an item has no [n] support, put it in "unverified" instead.

CREATOR BRIEF: """${userPrompt}"""

REPORT (with [n] source markers):
"""${report}"""

SOURCES: ${sources.map(s => '[' + s.n + '] ' + s.title).join(' | ')}

Return ONLY JSON with this exact shape:
{
 "title": "short headline for the story",
 "category": "aviation|maritime|crime|disaster|weather|politics|war|business|tech|science|health|sports|entertainment|other",
 "event_date": "YYYY-MM-DD of the main event or null",
 "status": "one line: ongoing / under investigation / resolved ...",
 "summary": "5-7 sentence summary",
 "latest": [{"date": "YYYY-MM-DD or text", "text": "...", "src": [1]}],
 "timeline": [{"time": "date/time", "text": "...", "src": [2]}],
 "numbers": [{"label": "...", "value": "...", "src": [1]}],
 "quotes": [{"who": "...", "role": "...", "quote": "exact words", "date": "...", "src": [3]}],
 "entities": {
   "people": [{"name": "...", "role": "..."}],
   "organizations": [{"name": "...", "role": "..."}],
   "places": [{"name": "...", "note": "..."}],
   "objects": [{"name": "e.g. Learjet 60", "id": "e.g. N722BD or empty", "kind": "aircraft|vessel|vehicle|company|case|product|other", "note": "..."}]
 },
 "match_keywords": ["6-12 short distinctive words/phrases (original language) that a RELATED video title would contain, e.g. tail number, place, aircraft model, agency"],
 "youtube_queries": [{"q": "YouTube search query in the story's original language", "type": "press|news|footage|audio|analysis|official|background", "why": "..."}],
 "image_queries": [{"q": "image search query", "what": "what the image should show"}],
 "news_queries": ["3-5 short web news queries in the story's original language"],
 "official_sources": [{"name": "...", "url": "only if you are confident it exists, else empty", "what": "what the creator gets there"}],
 "angles": [{"hook": "a strong video title/hook idea", "why": "why viewers care"}],
 "unverified": ["claims that are rumors / not confirmed / disputed"],
 "reported_claims": [{"claim": "a claim reported by some outlets/social posts but not officially confirmed", "reported_by": "who reports it", "src": [1], "phrasing_en": "ready-to-read English narration line that hedges it, e.g. Some reports suggest ..., but this has not been officially confirmed."}],
 "sensitivity": "notes about victims, graphic content, legal or privacy care the creator should take",
 "privacy": [{"name": "name of a private individual that appears in the sources", "reason": "why the video should NOT name or show them: minor, victim, bystander, low-ranking person not named by officials, family member ...", "src": [2]}],
 "map_places": [{"name": "place as written in the story", "wiki": "title of its English Wikipedia article (city, base, building, country)", "kind": "scene|base|outlet|other", "country": "country name in English", "lat": 0.0, "lon": 0.0, "why": "why it belongs on a map of this story"}],
 "key_dates": [{"date": "YYYY-MM-DD", "what": "what happened that day, one short sentence", "src": [1]}]
}
Rules: 8-12 youtube_queries covering every type that fits THIS story (press briefings, news reports, on-scene footage, audio recordings, expert analysis, background on the people/objects involved). 6-10 image_queries. map_places: 3-8 places for an animated map - where it happened (kind scene), the headquarters or base of the units and organisations involved (kind base), and the city or country of each foreign outlet that reported it (kind outlet); give your best latitude/longitude, they will be checked. key_dates: the day it happened and every later day with a new development, oldest first, only dates stated in the report. privacy.src: the sources that print that name. Latest and timeline newest information must reflect the report precisely.`;
}

function parseJson(t) {
  try { return JSON.parse(t); } catch (e) { }
  const m = /```(?:json)?\s*([\s\S]*?)```/.exec(t) || /(\{[\s\S]*\})/.exec(t);
  if (m) { try { return JSON.parse(m[1]); } catch (e) { } }
  const e = new Error('AI trả về JSON lỗi'); e.code = 'BAD_JSON'; throw e;
}

// Key miễn phí: nhớ trong 15 phút là Google Search không dùng được, khỏi thử lại mỗi lần
let noSearchUntil = 0;
async function doSearch(key, prompt, ctx, hours) {
  const t0 = Date.now();
  if (t0 < noSearchUntil) return searchFree(key, prompt, ctx, hours, 54000);
  try {
    const r = await gemini(key, { contents: [{ parts: [{ text: searchPrompt(prompt, ctx, hours) }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } }, 52000);
    return Object.assign(annotate(r.text, r.meta), { grounded: true });
  } catch (e) {
    // Gói Gemini miễn phí không có Google Search (429) → tự gom Wikipedia + tin tức rồi nhờ AI viết báo cáo
    if (e.code !== 'GEMINI_LIMIT' || Date.now() - t0 > 12000) throw e;
    noSearchUntil = Date.now() + 15 * 60000;
    return searchFree(key, prompt, ctx, hours, 54000 - (Date.now() - t0));
  }
}
// Wikipedia: tìm bài theo từ khoá, lấy toàn văn dạng chữ
async function wiki(lang, queries) {
  if (!/^[a-z]{2,3}$/.test(lang || '')) lang = 'en';
  const out = [];
  await Promise.all((queries || []).map(q => String(q || '').trim()).filter(Boolean).slice(0, 3).map(async q => {
    try {
      const u = 'https://' + lang + '.wikipedia.org/w/api.php?action=query&format=json&redirects=1&generator=search&gsrlimit=1&gsrsearch=' + encodeURIComponent(q) + '&prop=extracts|info&explaintext=1&exlimit=1&inprop=url';
      const j = await (await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) })).json();
      Object.values((j.query && j.query.pages) || {}).forEach(p => { if (p && p.extract && p.extract.length > 200) out.push({ lang, title: p.title, url: p.fullurl || 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(p.title), text: p.extract }); });
    } catch (e) { }
  }));
  return out;
}
// Bing News RSS: cho link bài báo thật (Google News chỉ cho link trung gian) → mở được bài để lấy ảnh. Có thì tốt, lỗi thì bỏ qua.
async function bingNews(queries) {
  const out = [], seen = new Set();
  await Promise.all((queries || []).map(q => String(q || '').trim()).filter(Boolean).slice(0, 4).map(async q => {
    try {
      const r = await fetch('https://www.bing.com/news/search?format=rss&q=' + encodeURIComponent(q), { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Accept: 'application/rss+xml,application/xml,text/xml' }, signal: AbortSignal.timeout(7000) });
      if (!r.ok) return;
      parseRss(await r.text()).slice(0, 8).forEach(x => {
        let link = x.link; const m = /[?&]url=([^&]+)/.exec(link); if (m) { try { link = decodeURIComponent(m[1]); } catch (e) { } }
        const u = safeUrl(link); if (!u || /(^|\.)bing\.com$/i.test(u.hostname) || seen.has(u.href)) return;
        seen.add(u.href); out.push({ title: x.title, link: u.href, t: x.t, source: u.hostname.replace(/^www\./, '') });
      });
    } catch (e) { }
  }));
  return out;
}
async function searchFree(key, prompt, ctx, hours, budget) {
  const t0 = Date.now(), left = () => Math.max(4000, (budget || 50000) - (Date.now() - t0));
  let plan = {};
  try { plan = await askJson(key, `A video creator needs research material for this story:\n"""${String(prompt).slice(0, 1500)}"""\nReturn ONLY JSON: {"lang":"two-letter code of the story's main local language, e.g. ja, en, ko, vi","wiki":["1-3 Wikipedia search queries in that language naming the event or person exactly"],"wiki_en":["1-2 English Wikipedia search queries"],"news":["3 short news search queries in the local language","1 in English"]}`, Math.min(10000, left()), true); } catch (e) { if (e.code === 'GEMINI_LIMIT' || e.code === 'NO_API_KEY') throw e; }
  const arr = v => (Array.isArray(v) ? v : []).map(x => String(x || '').slice(0, 120)).filter(Boolean);
  const nq = arr(plan.news).length ? arr(plan.news) : [String(prompt).split('\n')[0].slice(0, 100)];
  const [w1, w2, bn, gn] = await Promise.all([wiki(String(plan.lang || 'en').toLowerCase(), arr(plan.wiki)), wiki('en', arr(plan.wiki_en)), bingNews(nq), doNews(nq, hours).catch(() => [])]);
  const pages = [], seenW = new Set();
  w1.concat(w2).forEach(p => { if (!seenW.has(p.url)) { seenW.add(p.url); pages.push(p); } });
  const sources = pages.slice(0, 4).map(p => ({ title: p.title + ' — Wikipedia (' + p.lang + ')', uri: p.url, kind: 'wiki', text: p.text.slice(0, 9000) }))
    .concat(bn.slice(0, 12).map(x => ({ title: x.title + ' — ' + x.source, uri: x.link, kind: 'news', t: x.t })))
    .concat(gn.slice(0, 8).map(x => ({ title: x.title + (x.source ? ' — ' + x.source : ''), uri: x.link, kind: 'news', t: x.t })))
    .map((x, i) => Object.assign({ n: i + 1 }, x));
  const material = sources.map(x => x.kind === 'wiki' ? `[${x.n}] WIKIPEDIA ARTICLE: ${x.title}\n${x.text}` : `[${x.n}] NEWS HEADLINE${x.t ? ' (' + new Date(x.t).toISOString().slice(0, 10) + ')' : ''}: ${x.title}`).join('\n\n');
  const text = searchPrompt(prompt, ctx, hours)
    .replace('Research THIS story using Google Search.', 'You have NO web access in this run. Research THIS story using ONLY the SOURCE MATERIAL at the end plus widely known background.')
    .replace('Only state what sources support. Clearly mark rumors or unconfirmed claims.', 'After every fact taken from the material put its source marker, e.g. [1] or [2][5]. A fact that comes only from your own memory must be listed in section 8 as unverified, not stated as confirmed. Clearly mark rumors or unconfirmed claims.')
    + '\n\nSOURCE MATERIAL:\n' + (material || '(nothing found — rely on widely known background and say so)');
  const r = await gemini(key, { contents: [{ parts: [{ text }] }], generationConfig: { temperature: 0.2 } }, left(), true);
  return { report: r.text, sources: sources.map(x => ({ n: x.n, title: x.title, uri: x.uri })), queries: nq, grounded: false };
}
async function doStructure(key, prompt, report, sources, lang) {
  const t0 = Date.now();
  const r = await gemini(key, { contents: [{ parts: [{ text: structurePrompt(prompt, report, sources || [], lang) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }, 50000);
  const D = parseJson(r.text);
  if (D && typeof D === 'object' && !Array.isArray(D)) {
    D.map_places = await geoPlaces(D.map_places, Date.now() - t0 > 46000);   // sắp hết 60 giây thì không tra Wikipedia nữa, giữ toạ độ AI ước lượng
    D.key_dates = (Array.isArray(D.key_dates) ? D.key_dates : []).slice(0, 12).map(x => ({ date: String((x && x.date) || '').slice(0, 20), what: String((x && x.what) || '').slice(0, 240), src: Array.isArray(x && x.src) ? x.src.slice(0, 4) : [] })).filter(x => x.date && x.what);
  }
  return D;
}

// ---------- Google News RSS (miễn phí) ----------
function decode(s) { return String(s || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/<[^>]+>/g, '').trim(); }
function parseRss(xml) {
  const out = [];
  (String(xml).match(/<item>[\s\S]*?<\/item>/g) || []).forEach(it => {
    const g = tag => { const m = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)</' + tag + '>').exec(it); return m ? decode(m[1]) : ''; };
    const src = /<source[^>]*url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/.exec(it);
    const t = Date.parse(g('pubDate'));
    out.push({ title: g('title'), link: g('link'), t: isNaN(t) ? 0 : t, source: src ? decode(src[2]) : '', site: src ? src[1] : '' });
  });
  return out;
}
const NEWS_LOC = { en: ['en-US', 'US', 'US:en'], vi: ['vi', 'VN', 'VN:vi'], es: ['es-419', 'MX', 'MX:es-419'], fr: ['fr', 'FR', 'FR:fr'], de: ['de', 'DE', 'DE:de'], ja: ['ja', 'JP', 'JP:ja'], ko: ['ko', 'KR', 'KR:ko'], pt: ['pt-BR', 'BR', 'BR:pt-419'] };
function guessLang(s) { s = String(s || ''); if (/[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(s)) return 'vi'; if (/[぀-ヿ]/.test(s)) return 'ja'; if (/[가-힯]/.test(s)) return 'ko'; return 'en'; }
async function doNews(queries, hours) {
  const seen = new Set(), items = [];
  const when = hours && hours <= 720 ? ' when:' + (hours <= 48 ? Math.max(1, Math.round(hours)) + 'h' : Math.round(hours / 24) + 'd') : '';
  await Promise.all(queries.slice(0, 6).map(async q => {
    const loc = NEWS_LOC[guessLang(q)] || NEWS_LOC.en;
    const u = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q + when) + '&hl=' + loc[0] + '&gl=' + loc[1] + '&ceid=' + loc[2];
    try {
      const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return;
      parseRss(await r.text()).slice(0, 25).forEach(x => { const k = x.title.toLowerCase(); if (!seen.has(k)) { seen.add(k); items.push(Object.assign({ q }, x)); } });
    } catch (e) { }
  }));
  return items.sort((a, b) => b.t - a.t).slice(0, 60);
}

// ---------- Mở link nguồn: URL thật + og:image (chặn địa chỉ nội bộ) ----------
function safeUrl(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:' && x.protocol !== 'http:') return null;
    const h = x.hostname.toLowerCase();
    if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || h === 'metadata.google.internal') return null;
    return x;
  } catch (e) { return null; }
}
function meta(html, names) {
  for (const n of names) {
    const re1 = new RegExp('<meta[^>]+(?:property|name|itemprop)=["\']' + n + '["\'][^>]*content=["\']([^"\']+)["\']', 'i');
    const re2 = new RegExp('<meta[^>]+content=["\']([^"\']+)["\'][^>]*(?:property|name|itemprop)=["\']' + n + '["\']', 'i');
    const m = re1.exec(html) || re2.exec(html); if (m) return decode(m[1]);
  }
  return '';
}
const NEWS = /(^|\.)(apnews|reuters|bbc|nytimes|cnn|nbcnews|abcnews|go|cbsnews|foxnews|washingtonpost|wsj|theguardian|usatoday|npr|latimes|nypost|axios|politico|bloomberg|cnbc|time|newsweek|aljazeera|dw|france24|skynews|independent|telegraph|dailymail|thehill|wpbf|wptv|wsvn|local10|nbcmiami|cbs12|wflx|palmbeachpost|miamiherald|sun-sentinel|vnexpress|tuoitre|thanhnien|vietnamnet|dantri|zingnews|znews|vtv|nhk|asahi|yomiuri|kyodonews|yonhap|scmp|straitstimes|abc|cbc|globalnews|news|aviationherald|avherald|flightglobal|simpleflying|aerotime|thepointsguy|aviation-safety)\./i;
const SOCIAL = /(^|\.)(x|twitter|facebook|fb|instagram|tiktok|reddit|youtube|youtu|threads|t|telegram|weibo|rumble|bitchute)\.(com|me|be|net|org)$/i;
function level(host) {
  host = String(host || '').toLowerCase().replace(/^www\./, '');
  if (/\.gov(\.[a-z]{2})?$|\.mil$|(^|\.)(ntsb|faa|nasa|noaa|fema|fbi|justice|police|sheriff|whitehouse|un|who|easa|icao)\./.test(host)) return 'official';
  if (SOCIAL.test(host)) return 'social';
  if (NEWS.test(host + '.')) return 'news';
  return 'other';
}
const BAD_IMG = /logo|icon|sprite|avatar|favicon|placeholder|blank|pixel|1x1|spacer|badge|button|banner|advert|[-_\/]ads?[-_\/.]|sponsor|promo|doubleclick|tracking|gravatar|emoji|payment|visa|mastercard|paypal|amex|app-?store|google-?play|newsletter|subscribe|paywall|share|social|footer|header|masthead|widget|related|recommend|outbrain|taboola|thumb(nail)?s?[-_\/]\d{2,3}x\d{2,3}|\.svg(\?|$)|\.gif(\?|$)|data:/i;
// chữ thay thế (alt) của ảnh rác: quảng cáo, logo, phương thức thanh toán, nút chia sẻ
const BAD_ALT = /\b(logo|advertis|sponsored|banner|subscribe|newsletter|sign up|download (the|our) app|app store|google play|visa|mastercard|paypal|payment|follow us|share (on|this)|icon)\b/i;
function pickSrc(tag) {
  const g = n => { const m = new RegExp('\\s' + n + '\\s*=\\s*["\']([^"\']+)["\']', 'i').exec(tag); return m ? m[1] : ''; };
  const ss = g('srcset') || g('data-srcset');
  if (ss) { const best = ss.split(',').map(x => x.trim().split(/\s+/)).map(([u, w]) => [u, parseInt(w) || 0]).sort((a, b) => b[1] - a[1])[0]; if (best && best[0]) return { src: best[0], alt: g('alt'), w: +g('width') || 0, h: +g('height') || 0 }; }
  return { src: g('data-src') || g('data-lazy-src') || g('data-original') || g('src'), alt: g('alt'), w: +g('width') || 0, h: +g('height') || 0 };
}
// Thân bài: <article>, <main> hoặc khối có itemprop=articleBody; không có thì trả cả trang đã bỏ nav/aside/footer.
function mainHtml(body) {
  const strip = x => x.replace(/<(nav|aside|footer|header|form)\b[\s\S]*?<\/\1>/gi, ' ');
  const pick = re => { let best = ''; let m; while ((m = re.exec(body))) { if (m[0].length > best.length) best = m[0]; } return best; };
  const art = pick(/<article\b[\s\S]*?<\/article>/gi) || pick(/<main\b[\s\S]*?<\/main>/gi);
  return strip(art && art.length > 1500 ? art : body);
}
// Trích 3-5 câu chính của bài (tối đa ~650 ký tự) để kịch bản không phải suy từ tiêu đề.
function excerptFrom(html) {
  const body = mainHtml(html.replace(/<(script|style|noscript|svg|figure|figcaption)[\s\S]*?<\/\1>/gi, ' '));
  const ps = (body.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) || []).map(x => decode(x.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim())
    .filter(t => t.length >= 70 && !/cookie|subscribe|newsletter|sign up|all rights reserved|advertisement|click here|follow us|©/i.test(t));
  let out = '';
  for (const t of ps) { if (out.length >= 520) break; out += (out ? ' ' : '') + t; }
  if (out.length > 650) { const cut = out.slice(0, 650), k = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('。'), cut.lastIndexOf('! '), cut.lastIndexOf('? ')); out = k > 300 ? cut.slice(0, k + 1) : cut + '…'; }
  return out;
}
// Wikipedia: lấy đoạn trích nguyên văn (CC BY-SA) qua API thay vì đọc HTML
async function wikiExcerpt(u) {
  const m = /^([a-z]{2,3})\.(?:m\.)?wikipedia\.org$/.exec(u.hostname), t = /^\/wiki\/(.+)$/.exec(u.pathname); if (!m || !t) return null;
  try {
    const api = 'https://' + m[1] + '.wikipedia.org/w/api.php?action=query&format=json&redirects=1&prop=extracts&explaintext=1&exchars=2600&titles=' + encodeURIComponent(decodeURIComponent(t[1]));
    const j = await (await fetch(api, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) })).json();
    const pg = Object.values((j.query && j.query.pages) || {})[0];
    return pg && pg.extract ? String(pg.extract).replace(/\n{3,}/g, '\n\n').slice(0, 2600) : null;
  } catch (e) { return null; }
}
function mediaFrom(html, base) {
  const imgs = [], seen = new Set(), vids = [], vseen = new Set();
  const abs = u => { try { return new URL(decode(u), base).href; } catch (e) { return ''; } };
  const body0 = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ');
  // chỉ lấy ảnh trong thân bài (bỏ menu, cột bên, chân trang, khối "bài liên quan") khi trang có đánh dấu thân bài
  const body = mainHtml(body0);
  (body.match(/<img\b[^>]*>/gi) || []).forEach(tag => {
    const p = pickSrc(tag); const u = abs(p.src); if (!u || BAD_IMG.test(u) || BAD_ALT.test(p.alt || '') || seen.has(u) || (p.w && p.w < 300) || (p.h && p.h < 160) || (p.w && p.h && (p.w / p.h > 3.2 || p.h / p.w > 2.5))) return;
    seen.add(u); imgs.push({ url: u, alt: decode(p.alt).slice(0, 160) });
  });
  const addV = (kind, url, id) => { const k = kind + ':' + (id || url); if (vseen.has(k)) return; vseen.add(k); vids.push({ kind, url, id: id || '' }); };
  (html.match(/<iframe\b[^>]*>/gi) || []).forEach(tag => {
    const m = /src\s*=\s*["']([^"']+)["']/i.exec(tag); if (!m) return; const u = abs(m[1]);
    let y = /(?:youtube(?:-nocookie)?\.com\/embed\/|youtu\.be\/)([\w-]{11})/.exec(u); if (y) return addV('youtube', 'https://www.youtube.com/watch?v=' + y[1], y[1]);
    if (/player\.vimeo\.com\/video\/(\d+)/.test(u)) return addV('vimeo', u.replace('player.vimeo.com/video', 'vimeo.com'));
    if (/(twitter|x)\.com|tiktok\.com|facebook\.com\/plugins\/video|instagram\.com|dailymotion|jwplayer|brightcove|cnn\.com\/videos|nbcnews|cbsnews|anvato|vidible|ooyala/i.test(u)) addV('embed', u);
  });
  (html.match(/https?:\/\/(?:twitter|x)\.com\/[\w]+\/status\/\d+/gi) || []).slice(0, 6).forEach(u => addV('x', u));
  (html.match(/https?:\/\/(?:www\.)?tiktok\.com\/@[\w.]+\/video\/\d+/gi) || []).slice(0, 4).forEach(u => addV('tiktok', u));
  (html.match(/<(?:video|source)\b[^>]*src\s*=\s*["']([^"']+\.(?:mp4|m3u8|webm)[^"']*)["']/gi) || []).forEach(tag => { const m = /src\s*=\s*["']([^"']+)["']/i.exec(tag); if (m) addV('file', abs(m[1])); });
  const ogv = meta(html, ['og:video:secure_url', 'og:video:url', 'og:video', 'twitter:player']); if (ogv) { const u = abs(ogv); const y = /(?:embed\/|v=|youtu\.be\/)([\w-]{11})/.exec(u); y ? addV('youtube', 'https://www.youtube.com/watch?v=' + y[1], y[1]) : addV('embed', u); }
  return { images: imgs.slice(0, 14), videos: vids.slice(0, 10) };
}
async function openPage(u0) {
  let u = safeUrl(u0); if (!u) return null;
  for (let hop = 0; hop < 5; hop++) {
    const r = await fetch(u.href, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8' }, signal: AbortSignal.timeout(9000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = safeUrl(new URL(r.headers.get('location'), u).href); if (!u) return null; continue; }
    const site = u.hostname.replace(/^www\./, '');
    if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) return { url: u.href, site, level: level(site), images: [], videos: [] };
    const reader = r.body.getReader(); let html = '', got = 0;
    while (got < 900000) { const { done, value } = await reader.read(); if (done) break; got += value.length; html += Buffer.from(value).toString('utf8'); }
    try { reader.cancel(); } catch (e) { }
    const img = meta(html, ['og:image', 'twitter:image', 'twitter:image:src']);
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    const md = mediaFrom(html, u.href), og = img ? new URL(img, u).href : '';
    if (og && !md.images.some(x => x.url === og)) md.images.unshift({ url: og, alt: 'Ảnh đại diện bài viết' });
    const wx = await wikiExcerpt(u);
    return {
      excerpt: wx || excerptFrom(html), excerpt_kind: wx ? 'wikipedia' : 'article',
      url: u.href, site: meta(html, ['og:site_name']) || site, level: level(site),
      title: meta(html, ['og:title', 'twitter:title']) || (titleTag ? decode(titleTag[1]) : ''),
      description: meta(html, ['og:description', 'description']).slice(0, 300),
      image: og, images: md.images, videos: md.videos,
      published: meta(html, ['article:published_time', 'og:published_time', 'datePublished', 'pubdate', 'date'])
    };
  }
  return null;
}
const PD_RE = /public domain|^pd\b|cc0|no restrictions/i, GOV_RE = /\b(u\.?s\.? (army|navy|air force|marine|coast guard|government|department)|department of (defense|war|state)|dod|dvids|nasa|noaa|usgs|library of congress|national archives|white house|federal|ministry|government)\b/i;
async function commons(queries, per, cap) {
  per = Math.max(4, Math.min(30, per || 8));
  const out = [], seen = new Set(), qs = [...new Set((queries || []).map(q => String(q || '').trim()).filter(q => q.length >= 2))].slice(0, cap || 8);
  const one = async q => {
    // iiurlwidth=960: một trong các cỡ thumbnail chuẩn của Commons (330, 500, 960, 1280, 1920…), cỡ lạ dễ bị 429
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=' + per + '&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=960&gsrsearch=' + encodeURIComponent(q);
    try {
      const j = await (await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(8000) })).json();
      Object.values((j.query && j.query.pages) || {}).forEach(p => {
        const ii = (p.imageinfo || [])[0]; if (!ii || seen.has(p.title)) return; seen.add(p.title);
        if (!/\.(jpe?g|png|webp)$/i.test(p.title)) return;
        if (ii.width && ii.width < 640) return;
        const m = ii.extmetadata || {}, txt = k => decode(String((m[k] || {}).value || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
        const license = txt('LicenseShortName'), author = txt('Artist').slice(0, 100), credit = txt('Credit').slice(0, 140), desc = txt('ImageDescription').slice(0, 320);
        const pd = PD_RE.test(license) || PD_RE.test(txt('UsageTerms')), gov = GOV_RE.test(author + ' ' + credit + ' ' + desc);
        out.push({ q, title: p.title.replace(/^File:/, ''), thumb: ii.thumburl || ii.url, url: ii.url, page: ii.descriptionurl, license, author, credit, desc, date: (txt('DateTimeOriginal') || txt('DateTime')).slice(0, 40), w: ii.width || 0, h: ii.height || 0, pd, gov });
      });
    } catch (e) { }
  };
  for (let i = 0; i < qs.length; i += 4) await Promise.all(qs.slice(i, i + 4).map(one));   // từng đợt 4 truy vấn để không dồn dập vào Commons
  // ảnh public domain của cơ quan nhà nước lên đầu, rồi public domain khác, rồi CC
  out.sort((a, b) => (b.pd && b.gov ? 2 : b.pd ? 1 : 0) - (a.pd && a.gov ? 2 : a.pd ? 1 : 0));
  return out.slice(0, Math.max(30, Math.min(160, per * qs.length)));
}
async function doEnrich(urls, imageQueries, entityQueries) {
  const list = [...new Set((urls || []).filter(Boolean))].slice(0, 24);
  const iq = (imageQueries || []).slice(0, 10), eq = (entityQueries || []).slice(0, 14);
  const [pages, cm, ov] = await Promise.all([
    Promise.all(list.map(u => openPage(u).then(p => p && Object.assign({ from: u }, p)).catch(() => null))),
    commons(iq.concat(eq), 10, 24), openverse(iq.slice(0, 4))]);
  return { pages: pages.filter(Boolean), commons: cm, openverse: ov };
}

// ---------- Openverse: ảnh giấy phép mở (Flickr, bảo tàng...), không cần key ----------
async function openverse(queries) {
  const out = [], seen = new Set();
  await Promise.all((queries || []).slice(0, 6).map(async q => {
    try {
      const r = await fetch('https://api.openverse.org/v1/images/?page_size=20&q=' + encodeURIComponent(q), { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
      if (!r.ok) return;
      const j = await r.json();
      (j.results || []).forEach(x => {
        if (!x || !x.url || seen.has(x.url)) return; seen.add(x.url);
        out.push({ q, title: String(x.title || q).slice(0, 160), url: x.url, thumb: x.thumbnail || x.url, page: x.foreign_landing_url || '', author: String(x.creator || '').slice(0, 80), license: 'CC ' + String(x.license || '').toUpperCase() + (x.license_version ? ' ' + x.license_version : ''), source: x.source || x.provider || '' });
      });
    } catch (e) { }
  }));
  return out.slice(0, 100);
}
// Tìm thêm ảnh theo từ khoá người dùng gõ
async function doImages(queries) {
  const qs = [...new Set((queries || []).map(q => String(q || '').trim()).filter(q => q.length >= 2))].slice(0, 6);
  const [c, o] = await Promise.all([commons(qs, 20), openverse(qs)]);
  return { commons: c, openverse: o };
}

// ---------- Tải 1 ảnh về máy chủ rồi trả lại trình duyệt (để đóng gói zip) ----------
const dns = require('dns').promises;
function privateIp(ip) {
  ip = String(ip || '').toLowerCase();
  const m4 = /^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip);
  if (m4) { const a = +m4[1], b = +m4[2]; return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224; }
  return ip === '::' || ip === '::1' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip);
}
async function publicHost(u) {
  try { const a = await dns.lookup(u.hostname, { all: true }); return a.length > 0 && !a.some(x => privateIp(x.address)); } catch (e) { return false; }
}
const IMG_MAX = 4.2 * 1024 * 1024;
async function fetchImage(u0, ref) {
  const fail = (code, msg) => { const e = new Error(msg); e.code = code; return e; };
  let u = safeUrl(u0); if (!u) throw fail('BAD_URL', 'Link ảnh không hợp lệ');
  const r0 = safeUrl(ref || '');
  for (let hop = 0; hop < 5; hop++) {
    if (!(await publicHost(u))) throw fail('BAD_URL', 'Link ảnh không hợp lệ');
    const r = await fetch(u.href, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8', Referer: r0 ? r0.href : u.origin + '/' }, signal: AbortSignal.timeout(12000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = safeUrl(new URL(r.headers.get('location'), u).href); if (!u) throw fail('BAD_URL', 'Link ảnh không hợp lệ'); continue; }
    if (!r.ok) throw fail('IMG_HTTP', 'Trang gốc từ chối (' + r.status + ')');
    const type = String(r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    if (!/^image\/(jpeg|jpg|png|webp|gif|avif)$/.test(type)) throw fail('NOT_IMAGE', 'Không phải file ảnh');
    if (+r.headers.get('content-length') > IMG_MAX) throw fail('TOO_BIG', 'Ảnh lớn hơn 4 MB');
    const reader = r.body.getReader(), parts = []; let got = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; got += value.length; if (got > IMG_MAX) { try { reader.cancel(); } catch (e) { } throw fail('TOO_BIG', 'Ảnh lớn hơn 4 MB'); } parts.push(Buffer.from(value)); }
    if (got < 200) throw fail('NOT_IMAGE', 'File ảnh rỗng');
    return { buf: Buffer.concat(parts), type: type === 'image/jpg' ? 'image/jpeg' : type, url: u.href };
  }
  throw fail('BAD_URL', 'Chuyển hướng quá nhiều lần');
}

// ---------- Tìm đề tài theo danh mục (Gemini + Google Search) ----------
const PERIODS = { d7: 'that happened or had major new developments in the LAST 7 DAYS', d30: 'that happened or had major new developments in the LAST 30 DAYS', y1: 'from the LAST 12 MONTHS', classic: 'from ANY era — well-documented classic cases, mixing famous ones with lesser-known ones' };
function topicsPrompt(o, mode, heads) {
  const today = new Date().toISOString().slice(0, 10), n = Math.max(4, Math.min(15, Number(o.n) || 10));
  const where = o.country && !/^(global|all|)$/i.test(o.country) ? 'that took place in or mainly concern ' + o.country : 'from anywhere in the world';
  const cat = '"' + String(o.cat || 'true crime cases').slice(0, 120) + '"' + (o.group ? ' (content group: ' + String(o.group).slice(0, 60) + ')' : '');
  const task = mode === 'news' ? `Below are recent news headlines from Google News. Pick up to ${n} DISTINCT real stories from these headlines that fit this category: ${cat}, ${where}. Use ONLY stories that appear in the headlines; add background only if it is widely known.`
    : mode === 'known' ? `You have NO web access in this run. From your own knowledge, list ${n} real, well-documented stories in this category: ${cat}, ${where}, ${PERIODS[o.period] || PERIODS.classic}. Include only events you are confident really happened; if unsure of the exact day give only the year.`
      : `Use Google Search to find ${n} real stories in this category: ${cat}, ${where}, ${PERIODS[o.period] || PERIODS.classic}.`;
  return `Today is ${today}. You research story ideas for a YouTube channel that makes documentary / explainer videos about REAL events.
${task}
${o.note ? 'EXTRA WISHES FROM THE CREATOR: """' + String(o.note).slice(0, 400) + '"""\n' : ''}${Array.isArray(o.skip) && o.skip.length ? 'DO NOT repeat these already-suggested stories: ' + o.skip.slice(0, 40).map(x => String(x).slice(0, 80)).join(' | ') + '\n' : ''}
Selection rules:
- Only real, verifiable events covered by reputable sources. No fiction, no urban legends presented as fact.
- Prefer stories with plenty of public visual material (news photos, footage, maps, court or agency documents) and a clear narrative arc or an open question.
- Make the list diverse (different years, places, kinds of story). Do not list the same event twice.${o.rare ? '\n- IMPORTANT: the creator already knows the famous cases. Do NOT list the most-retold stories of this category (the ones in every "top 10" list, with long English Wikipedia articles, films or TV dramas about them). Pick LESSER-KNOWN but well-documented stories instead: regional cases, cases reported mainly in local media, older cases that are rarely revisited, recent cases that got little follow-up.' : ''}
- Keep names of people, places and the story title in the ORIGINAL language of the country (e.g. Japanese for Japan), and also give a Vietnamese title.

Return ONLY a JSON object (no prose, no markdown fence) with this exact shape:
{"topics":[{
 "title": "name of the story in its original language",
 "title_vi": "tên vụ việc bằng tiếng Việt",
 "title_en": "the name English-language media use for this story",
 "date": "YYYY-MM-DD, YYYY-MM or YYYY of the main event",
 "place": "city / region, country",
 "status_vi": "ví dụ: chưa phá án / đã kết án / đang điều tra / đang diễn ra",
 "summary_vi": "2-3 câu tiếng Việt: chuyện gì xảy ra, ai liên quan",
 "why_vi": "1 câu tiếng Việt: vì sao hợp làm video (bí ẩn gì, tranh cãi gì)",
 "visuals_vi": "1 câu tiếng Việt: có sẵn loại hình ảnh / video tư liệu nào",
 "queries": ["2-3 search queries in the original language", "1 query in English"],
 "brief_en": "One paragraph research brief in English with the exact names, dates and places, ready to hand to a researcher"
}]}${mode === 'news' ? '\n\nHEADLINES:\n' + (heads || []).map((x, i) => (i + 1) + '. ' + (x.t ? '(' + new Date(x.t).toISOString().slice(0, 10) + ') ' : '') + x.title + (x.source ? ' — ' + x.source : '')).join('\n') : ''}`;
}
function cleanTopics(j) {
  const list = Array.isArray(j) ? j : (j && Array.isArray(j.topics) ? j.topics : []);
  const S = (v, n) => String(v == null ? '' : v).slice(0, n);
  return list.filter(t => t && (t.title || t.title_vi)).slice(0, 20).map(t => ({ title: S(t.title || t.title_vi, 200), title_vi: S(t.title_vi || t.title, 200), title_en: S(t.title_en, 200), date: S(t.date, 40), place: S(t.place, 120), status_vi: S(t.status_vi, 120), summary_vi: S(t.summary_vi, 700), why_vi: S(t.why_vi, 300), visuals_vi: S(t.visuals_vi, 300), queries: (Array.isArray(t.queries) ? t.queries : []).map(q => S(q, 120)).filter(Boolean).slice(0, 5), brief_en: S(t.brief_en, 1200) }));
}
// Gói Gemini miễn phí không có Google Search: tin mới → đọc tiêu đề Google News; vụ kinh điển → kiến thức sẵn có của AI
// ---------- Tìm đề tài không cần Google Search: lấy vụ việc có thật từ các chuyên mục Wikipedia của nước đó, AI chỉ chọn và tóm tắt ----------
const WIKI_LANG = { japan: 'ja', 'united states': 'en', 'south korea': 'ko', 'united kingdom': 'en', germany: 'de', france: 'fr', 'spain and latin america': 'es', india: 'en', china: 'zh', vietnam: 'vi' };
async function wikiApi(lang, params, ms) {
  const u = 'https://' + lang + '.wikipedia.org/w/api.php?format=json&formatversion=2&origin=*&' + Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
  const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(ms || 6000) });
  if (!r.ok) throw new Error('Wikipedia ' + r.status);
  return r.json();
}
const WIKI_SKIP = /^(list of|lists of|liste |lista |年表|一覧|目录|danh sách)|一覧$|の一覧|\(disambiguation\)|曖昧さ回避|^\d{3,4}年?$|^\d{4}年の/i;
async function topicsWiki(key, o, budget) {
  const t0 = Date.now(), left = () => budget - (Date.now() - t0);
  const lang = WIKI_LANG[String(o.country || '').toLowerCase()] || 'en', where = o.country && !/^(global|all|)$/i.test(o.country) ? o.country : '';
  // 1) AI gợi ý tên chuyên mục + từ khoá bằng ngôn ngữ của Wikipedia đó (chỉ là gợi ý: cái nào không tồn tại thì Wikipedia trả rỗng)
  let cats = [], kws = [];
  try {
    const j = await askJson(key, `Wikipedia language edition: "${lang}". Topic: "${String(o.cat || '').slice(0, 120)}"${where ? ' in ' + where : ''}.
Give category names of that Wikipedia edition (written exactly in its language, WITHOUT the "Category:" prefix) whose member pages are individual real events / cases of this topic${where ? ' in ' + where : ''}, and short search phrases in the same language for finding such categories.
Return ONLY JSON {"categories":["up to 6 category names, most specific first"],"keywords":["3 short phrases"]}`, Math.max(6000, Math.min(12000, left() - 30000)), true, 9000);
    cats = (Array.isArray(j.categories) ? j.categories : []).map(x => String(x).replace(/^[^:：]{1,12}[:：]/, '').trim().slice(0, 100)).filter(Boolean).slice(0, 6);
    kws = (Array.isArray(j.keywords) ? j.keywords : []).map(x => String(x).trim().slice(0, 60)).filter(Boolean).slice(0, 3);
  } catch (e) { if (e.code === 'GEMINI_LIMIT' || e.code === 'NO_API_KEY') throw e; }
  // 2) chuyên mục có thật khớp từ khoá (tìm trong không gian tên Category)
  await Promise.all(kws.map(async k => { try { const r = await wikiApi(lang, { action: 'query', list: 'search', srnamespace: 14, srlimit: 5, srsearch: k }, 5000); ((r.query || {}).search || []).forEach(x => cats.push(String(x.title).replace(/^[^:：]+[:：]/, ''))); } catch (e) { } }));
  cats = [...new Set(cats)].slice(0, 10);
  if (!cats.length) return null;
  // 3) trang trong các chuyên mục đó, và trong chuyên mục con cấp 1
  const pages = new Map(), subs = [];
  const members = async (c, deep) => { try { const r = await wikiApi(lang, { action: 'query', list: 'categorymembers', cmtitle: 'Category:' + c, cmtype: deep ? 'page|subcat' : 'page', cmlimit: 200 }, 6000); ((r.query || {}).categorymembers || []).forEach(m => { if (m.ns === 14) subs.push(String(m.title).replace(/^[^:：]+[:：]/, '')); else if (m.ns === 0 && !WIKI_SKIP.test(m.title)) pages.set(m.title, c); }); } catch (e) { } };
  await Promise.all(cats.map(c => members(c, true)));
  if (pages.size < 60 && subs.length && left() > 34000) await Promise.all([...new Set(subs)].slice(0, 8).map(c => members(c, false)));
  const skip = new Set((Array.isArray(o.skip) ? o.skip : []).map(x => String(x).toLowerCase()));
  let titles = [...pages.keys()].filter(t => !skip.has(t.toLowerCase()));
  if (titles.length < 4) return null;
  // 4) lượt xem 30 ngày của từng trang: ít lượt xem = ít người biết
  const views = {};
  const shuffled = titles.slice().sort(() => Math.random() - 0.5).slice(0, 300);
  await Promise.all(Array.from({ length: Math.ceil(shuffled.length / 50) }, (_, k) => shuffled.slice(k * 50, k * 50 + 50)).map(async part => { try { const r = await wikiApi(lang, { action: 'query', prop: 'pageviews', pvipdays: 30, titles: part.join('|') }, 6000); ((r.query || {}).pages || []).forEach(p => { if (p.pageviews) views[p.title] = Object.values(p.pageviews).reduce((a, b) => a + (Number(b) || 0), 0); }); } catch (e) { } }));
  const hasViews = Object.keys(views).length >= 4, n = Math.max(4, Math.min(15, Number(o.n) || 10));
  let pick;
  if (hasViews) {
    const ranked = shuffled.filter(t => views[t] != null).sort((a, b) => views[a] - views[b]);
    const usable = ranked.filter(t => views[t] >= 40);                      // dưới 40 lượt/tháng thường là trang sơ khai, không đủ tài liệu
    const base = usable.length >= 8 ? usable : ranked;
    pick = o.rare ? base.slice(0, 26) : base.slice(Math.floor(base.length / 2)).sort(() => Math.random() - 0.5).slice(0, 14).concat(base.slice(0, Math.floor(base.length / 2)).sort(() => Math.random() - 0.5).slice(0, 12));
  } else pick = shuffled.slice(0, 26);
  // 5) đoạn mở đầu của từng trang
  const info = {};
  await Promise.all(Array.from({ length: Math.ceil(pick.length / 20) }, (_, k) => pick.slice(k * 20, k * 20 + 20)).map(async part => { try { const r = await wikiApi(lang, { action: 'query', prop: 'extracts', exintro: 1, explaintext: 1, exlimit: 20, titles: part.join('|') }, 7000); ((r.query || {}).pages || []).forEach(p => { if (p.extract && p.extract.length > 80) info[p.title] = String(p.extract).replace(/\s+/g, ' ').slice(0, 650); }); } catch (e) { } }));
  const cands = pick.filter(t => info[t]);
  if (cands.length < 4) return null;
  // 6) AI chọn và tóm tắt, chỉ từ các đoạn trích này
  const j = await askJson(key, `You research story ideas for a YouTube channel that makes documentary videos about REAL events. Category wanted: "${String(o.cat || '').slice(0, 120)}"${where ? ', concerning ' + where : ''}.
Below are real Wikipedia (${lang}) articles with their opening paragraph${hasViews ? ' and page views in the last 30 days (fewer views = less known)' : ''}.
${cands.map((t, k) => `[${k + 1}] ${t}${views[t] != null ? ' (' + views[t] + ' views)' : ''}: ${info[t]}`).join('\n')}
${o.note ? '\nEXTRA WISHES FROM THE CREATOR: """' + String(o.note).slice(0, 400) + '"""' : ''}
Pick up to ${n} articles that are single real events / cases fitting the category${o.rare ? ', preferring the LESS viewed ones' : ''}. Skip articles that are people biographies, laws, organisations or general concepts. Use ONLY facts in the paragraphs; if a detail is not there, leave it out.
Return ONLY a JSON object:
{"topics":[{"n":1,"title":"the article title exactly as given","title_vi":"tên vụ việc bằng tiếng Việt","title_en":"English name of the story","date":"YYYY-MM-DD, YYYY-MM or YYYY","place":"city / region, country","status_vi":"ví dụ: chưa phá án / đã kết án","summary_vi":"2-3 câu tiếng Việt","why_vi":"1 câu: vì sao hợp làm video","visuals_vi":"hình ảnh có thể tìm","queries":["2-3 search queries in the original language"],"brief_en":"3-4 sentence English brief for a researcher"}]}`, Math.max(12000, left() - 1500), true, 24000);
  const byN = {}; (Array.isArray(j.topics) ? j.topics : []).forEach(t => { const k = Number(t && t.n); if (cands[k - 1]) { byN[cands[k - 1]] = 1; t.title = cands[k - 1]; } });
  const topics = cleanTopics(j).filter(t => info[t.title]).map(t => Object.assign(t, { wiki: 'https://' + lang + '.wikipedia.org/wiki/' + encodeURIComponent(t.title.replace(/ /g, '_')), views30: views[t.title] != null ? views[t.title] : null }));
  if (topics.length < 2) return null;
  return { topics, sources: topics.map(t => ({ title: t.title, uri: t.wiki })), queries: cats.slice(0, 6), grounded: false, basis: 'wikipedia', wiki_lang: lang, pool: titles.length };
}
async function topicsFree(key, o, budget) {
  const t0 = Date.now(), left = () => Math.max(4000, budget - (Date.now() - t0));
  let heads = [], queries = [];
  if (o.period === 'd7' || o.period === 'd30' || o.period === 'y1') {
    const where = o.country && !/^(global|all|)$/i.test(o.country) ? o.country : 'the world';
    try { queries = ((await askJson(key, `Give 4 short Google News search queries, written in the main language of ${where}, that would surface recent news stories about: "${String(o.cat || '').slice(0, 120)}" in ${where}. Return ONLY JSON {"queries":["..."]}`, Math.min(10000, left()), true)).queries || []).map(q => String(q).slice(0, 80)).filter(Boolean).slice(0, 5); } catch (e) { if (e.code === 'GEMINI_LIMIT' || e.code === 'NO_API_KEY') throw e; }
    if (queries.length) heads = (await doNews(queries, o.period === 'd7' ? 168 : o.period === 'd30' ? 720 : 0).catch(() => [])).filter(x => o.period !== 'y1' || !x.t || Date.now() - x.t < 366 * 864e5).slice(0, 45);
  }
  const basis = heads.length >= 4 ? 'news' : 'known';
  if (basis === 'known') {      // vụ cũ: lấy từ Wikipedia trước; không được mới nhờ AI tự nhớ
    try { const w = await topicsWiki(key, o, left() - 9000); if (w) return w; } catch (e) { if (e.code === 'GEMINI_LIMIT' || e.code === 'NO_API_KEY') throw e; }
  }
  const j = await askJson(key, topicsPrompt(o, basis, heads), left(), true);
  const topics = cleanTopics(j);
  if (!topics.length) { const e = new Error('AI không tìm được đề tài phù hợp, thử đổi danh mục hoặc thời gian.'); e.code = 'NO_TOPICS'; throw e; }
  return { topics, sources: heads.slice(0, 30).map(x => ({ title: x.title, uri: x.link })), queries, grounded: false, basis };
}
async function doTopics(key, o) {
  o = o || {};
  const t0 = Date.now();
  if (t0 < noSearchUntil) return topicsFree(key, o, 52000);
  let r;
  try { r = await gemini(key, { contents: [{ parts: [{ text: topicsPrompt(o) }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.6 } }, 40000); }
  catch (e) { if (e.code !== 'GEMINI_LIMIT' || Date.now() - t0 > 12000) throw e; noSearchUntil = Date.now() + 15 * 60000; return topicsFree(key, o, 52000 - (Date.now() - t0)); }
  const sources = ((r.meta && r.meta.groundingChunks) || []).map(c => c.web || {}).filter(w => w.uri).slice(0, 40).map(w => ({ title: w.title || '', uri: w.uri }));
  let topics = [];
  try { topics = cleanTopics(parseJson(r.text)); } catch (e) { }
  if (!topics.length) {
    // AI trả về văn xuôi → nhờ chuyển sang JSON (không tìm web lần nữa)
    const r2 = await gemini(key, { contents: [{ parts: [{ text: 'Convert the following research notes into JSON with the shape {"topics":[{"title","title_vi","title_en","date","place","status_vi","summary_vi","why_vi","visuals_vi","queries":[],"brief_en"}]}. Fields ending in _vi must be Vietnamese. Keep only real stories found in the notes.\n\nNOTES:\n"""' + r.text.slice(0, 20000) + '"""' }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }, 16000);
    topics = cleanTopics(parseJson(r2.text));
  }
  if (!topics.length) { const e = new Error('AI không tìm được đề tài phù hợp, thử đổi danh mục hoặc thời gian.'); e.code = 'NO_TOPICS'; throw e; }
  return { topics, sources, queries: (r.meta && r.meta.webSearchQueries) || [], grounded: true, basis: 'search' };
}


// ---------- Nhận định AI cho Khám phá / Phân tích kênh (không tìm web, chỉ đọc số liệu đã đo) ----------
function insightPrompt(kind, data) {
  const head = kind === 'channel'
    ? 'You are a senior YouTube strategist. Analyze this channel using ONLY the measured data below (real YouTube API numbers). Explain why the winners won, what pattern to copy, and how a NEW small channel could compete.'
    : 'You are a senior YouTube niche strategist. Analyze this keyword/niche using ONLY the measured data below (real YouTube API numbers for the top videos). Judge demand vs competition for a NEW small channel and give concrete next steps.';
  return head + `
Write every field in Vietnamese (tiếng Việt), concise, specific, no fluff. Keep video titles/keywords in original language.
DATA (JSON):
${JSON.stringify(data).slice(0, 24000)}

Return ONLY JSON:
{
 "verdict": "nen_lam | can_nhac | bao_hoa",
 "verdict_text": "1-2 sentences",
 "why": ["3-5 reasons grounded in the numbers"],
 "patterns": ["3-6 content/title/format patterns the winners share"],
 "angles": [{"title": "a concrete video title idea in the niche's original language", "why": "why it can win"}],
 "keywords": ["6-10 long-tail keywords to target, original language"],
 "risks": ["2-4 risks or things to avoid"],
 "plan": ["3-5 step action plan for the next 2 weeks"]
}
Give 6-8 angles.`;
}
async function doInsight(key, kind, data) {
  const r = await gemini(key, { contents: [{ parts: [{ text: insightPrompt(kind, data) }] }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } }, 26000);
  return parseJson(r.text);
}

// Xưởng tiêu đề: sinh tiêu đề theo khuôn của các video đang thắng (chỉ dựa trên dữ liệu gửi lên)
function titlesPrompt(d) {
  const n = Math.max(5, Math.min(30, Number(d.n) || 12));
  const refs = (Array.isArray(d.refs) ? d.refs : []).slice(0, 40).map((r, i) => `${i + 1}. ${String(r.title || '').slice(0, 140)} (${r.views || '?'} view, x${r.x || '?'})`).join('\n');
  const pt = d.patterns || {};
  const feats = (Array.isArray(pt.features) ? pt.features : []).slice(0, 10).map(f => `- ${f.name}: nhóm thắng ${f.win}%, còn lại ${f.rest}%`).join('\n');
  return `Bạn là chuyên gia đặt tiêu đề YouTube. Nhiệm vụ: viết ${n} tiêu đề cho video của tôi, bám theo khuôn của các video ĐANG THẮNG trong ngách (danh sách bên dưới, xếp theo mức view vượt số sub).

VIDEO CỦA TÔI: ${String(d.topic || '').slice(0, 800)}
NGÔN NGỮ TIÊU ĐỀ: ${String(d.lang || 'English').slice(0, 40)}
${d.note ? 'GHI CHÚ: ' + String(d.note).slice(0, 300) : ''}

KHUÔN ĐO ĐƯỢC TỪ VIDEO THẮNG:
- Độ dài trung vị tiêu đề thắng: ${pt.len || '?'} ký tự
${feats}
- Cách mở đầu hay gặp: ${(pt.openers || []).slice(0, 8).join(' | ') || 'không rõ'}
- Từ lặp lại: ${(pt.hooks || []).slice(0, 18).join(', ') || 'không rõ'}

TIÊU ĐỀ VIDEO THẮNG ĐỂ THAM KHẢO:
${refs}

YÊU CẦU:
- Mỗi tiêu đề dùng một khuôn/góc khác nhau, độ dài gần mức trung vị, đúng ngôn ngữ yêu cầu, tự nhiên như người bản xứ viết.
- Không chép nguyên tiêu đề tham khảo. Không bịa số liệu hay sự kiện không có trong mô tả video của tôi; nếu cần con số thì dùng dạng chung (ví dụ số thứ tự, "3 lý do").
- Không giật tít sai sự thật.

Trả về JSON đúng dạng: {"titles":[{"title":"...","formula":"khuôn đã dùng, viết tiếng Việt ngắn gọn","why":"vì sao người xem bấm, tiếng Việt, 1 câu"}],"thumbnail_texts":["chữ trên thumbnail tối đa 4 từ, đúng ngôn ngữ tiêu đề", "..."]}. thumbnail_texts gồm 5 phương án.`;
}
async function doTitles(key, data) {
  const r = await gemini(key, { contents: [{ parts: [{ text: titlesPrompt(data || {}) }] }], generationConfig: { temperature: 0.9, responseMimeType: 'application/json' } }, 40000);
  const j = parseJson(r.text) || {};
  return { titles: (Array.isArray(j.titles) ? j.titles : []).filter(t => t && t.title).slice(0, 30).map(t => ({ title: String(t.title).trim(), formula: String(t.formula || '').trim(), why: String(t.why || '').trim() })), thumbs: (Array.isArray(j.thumbnail_texts) ? j.thumbnail_texts : []).map(String).slice(0, 8) };
}

// ---------- Dịch tiêu đề video (theo lô) ----------
async function doTranslate(key, items, to) {
  const list = (Array.isArray(items) ? items : []).filter(x => x && x.id && x.t).slice(0, 50).map(x => ({ id: String(x.id).slice(0, 20), t: String(x.t).slice(0, 220) }));
  if (!list.length) return { map: {} };
  const lang = to === 'en' ? 'English' : 'Vietnamese';
  const j = await askJson(key, `Translate each YouTube video title below into natural ${lang}. Keep names of people, brands, games and numbers as they are; keep it as short and punchy as the original; no quotation marks. If a title is already in ${lang}, return it unchanged.\nReturn ONLY a JSON object that maps each id to its translation, e.g. {"abc":"..."}.\n\nTITLES:\n${JSON.stringify(list)}`, 26000, true);
  const map = {}; list.forEach(x => { const v = j && j[x.id]; if (typeof v === 'string' && v.trim()) map[x.id] = v.trim().slice(0, 260); });
  return { map };
}

// ---------- AI đọc bình luận: nhu cầu thật + chân dung khán giả ----------
async function doAudience(key, d) {
  d = d || {};
  const cm = (Array.isArray(d.comments) ? d.comments : []).slice(0, 320).map(c => ({ t: String((c && c.t) || '').slice(0, 260), l: Number(c && c.l) || 0 })).filter(c => c.t.length > 2);
  if (cm.length < 5) { const e = new Error('Cần ít nhất 5 bình luận để AI đọc.'); e.code = 'NO_DATA'; throw e; }
  const titles = (Array.isArray(d.titles) ? d.titles : []).slice(0, 20).map(t => String(t).slice(0, 160));
  const text = `You analyse YouTube comments for a video creator. Below are ${cm.length} real comments ("l" = likes) from these videos: ${JSON.stringify(titles)}.
Read them and report what viewers actually want. Base every point on the comments; do not invent. Write all text values in Vietnamese; keep quoted comments in their original language.
The audience portrait is an ESTIMATE from wording, topics and language of the comments (YouTube does not expose real demographics) - say how sure you are.

Return ONLY JSON:
{"summary":"2-3 câu tổng quan khán giả đang nói gì",
 "needs":[{"need":"nhu cầu / mong muốn","evidence":"1 bình luận tiêu biểu nguyên văn","share":"ước lượng % bình luận nhắc tới"}],
 "questions":["câu hỏi khán giả hay hỏi"],
 "loves":["điều họ khen / thích"],
 "complaints":["điều họ chê / khó chịu"],
 "ideas":[{"title":"ý tưởng video tiếp theo","why":"dựa trên bình luận nào"}],
 "persona":{"who":"1 câu mô tả người xem điển hình","age":"khoảng tuổi ước đoán","gender":"ước đoán giới tính chiếm đa số hoặc 'không rõ'","region":"nước / khu vực","language":"ngôn ngữ chính","level":"mới bắt đầu / có kinh nghiệm / fan lâu năm ...","confidence":"thấp / vừa / cao","basis":"dựa vào dấu hiệu nào trong bình luận"}}
Give 4-7 needs, up to 8 questions, up to 6 loves, up to 6 complaints, 6-10 ideas.

COMMENTS:
${JSON.stringify(cm)}`;
  const j = await askJson(key, text, 40000, true);
  const A = (v, n) => (Array.isArray(v) ? v : []).slice(0, n), S = (v, n) => String(v == null ? '' : v).slice(0, n);
  return { audience: { summary: S(j.summary, 600), needs: A(j.needs, 8).map(x => ({ need: S(x && x.need, 200), evidence: S(x && x.evidence, 300), share: S(x && x.share, 20) })).filter(x => x.need), questions: A(j.questions, 10).map(x => S(x, 240)), loves: A(j.loves, 8).map(x => S(x, 240)), complaints: A(j.complaints, 8).map(x => S(x, 240)), ideas: A(j.ideas, 12).map(x => ({ title: S(x && x.title, 200), why: S(x && x.why, 260) })).filter(x => x.title), persona: Object.fromEntries(['who', 'age', 'gender', 'region', 'language', 'level', 'confidence', 'basis'].map(k => [k, S((j.persona || {})[k], 300)])) } };
}

// ---------- Phân tích kịch bản từ phụ đề: mở đầu, cấu trúc, thủ pháp giữ chân, chân dung người xem ----------
function scriptStats(text) {
  const words = (text.replace(/\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/g, ' ').match(/[\p{L}\p{N}'’-]+/gu) || []).length;
  let last = 0; const re = /(?:^|\s)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?=\s|$)/g; let m;
  while ((m = re.exec(text))) { const t = (+m[1] || 0) * 3600 + (+m[2]) * 60 + (+m[3]); if (t > last && t < 6 * 3600) last = t; }
  const minutes = last >= 60 ? last / 60 : words / 150;
  return { words, minutes: Math.round(minutes * 10) / 10, timed: last >= 60, wpm: last >= 60 ? Math.round(words / (last / 60)) : null };
}
async function doScript(key, d) {
  d = d || {};
  const raw = String(d.transcript || '').replace(/\r/g, '').trim();
  if (raw.length < 300) { const e = new Error('Phụ đề quá ngắn. Dán ít nhất vài đoạn (khoảng 300 ký tự trở lên).'); e.code = 'NO_DATA'; throw e; }
  const text0 = raw.slice(0, 60000), cut = raw.length > text0.length;
  const stats = scriptStats(text0);
  const title = String(d.title || '').slice(0, 200), niche = String(d.niche || '').slice(0, 120);
  const text = `You are a YouTube script analyst. Below is the transcript (subtitles) of a YouTube video${title ? ' titled "' + title + '"' : ''}. ${stats.timed ? 'It contains timestamps.' : 'It has no timestamps, so describe positions as a share of the script (for example "10% đầu").'}
Analyse HOW the script holds attention so a creator can reuse the method${niche ? ' in the niche "' + niche + '"' : ''}. Base everything on the transcript; do not invent facts about the video.
Write all explanations in Vietnamese. Quote the transcript only in short snippets (under 20 words each), in the original language.
Real retention numbers are NOT available: "drops" are your reasoned guesses about where viewers may leave, not measured data.
The viewer portrait is an ESTIMATE from vocabulary, topic and tone - say how sure you are.

Return ONLY JSON:
{"summary":"2-3 câu: video nói gì và kịch bản được dựng theo kiểu nào",
 "hook":{"text":"trích ngắn câu mở đầu","technique":"kỹ thuật mở đầu được dùng","why":"vì sao nó giữ người xem","score":"điểm x/10"},
 "structure":[{"part":"tên đoạn","range":"mốc thời gian hoặc phần trăm kịch bản","what":"đoạn này nói gì","job":"vai trò giữ chân của đoạn"}],
 "devices":[{"name":"thủ pháp giữ chân (vòng lặp mở, hứa trước trả sau, con số, đổi nhịp...)","example":"trích ngắn"}],
 "drops":["chỗ người xem có thể thoát và lý do (suy đoán)"],
 "formula":"công thức kịch bản rút ra, viết thành các bước đánh số để dùng lại",
 "persona":{"who":"1 câu mô tả người xem điển hình","age":"khoảng tuổi ước đoán","gender":"ước đoán hoặc 'không rõ'","region":"nước / khu vực","language":"ngôn ngữ","level":"mới bắt đầu / có kinh nghiệm ...","confidence":"thấp / vừa / cao","basis":"dựa vào dấu hiệu nào trong kịch bản"},
 "rewrite":["câu mở đầu mới theo cùng kỹ thuật${niche ? ', cho ngách ' + niche : ''}"]}
Give 4-8 structure parts, 4-8 devices, up to 5 drops, exactly 3 rewrite lines (write them in the transcript's language).

TRANSCRIPT:
${text0}`;
  const j = await askJson(key, text, 50000, true);
  const A = (v, n) => (Array.isArray(v) ? v : []).slice(0, n), S = (v, n) => String(v == null ? '' : v).slice(0, n);
  const hk = j.hook || {};
  return { script: {
    summary: S(j.summary, 700),
    hook: { text: S(hk.text, 300), technique: S(hk.technique, 240), why: S(hk.why, 400), score: S(hk.score, 12) },
    structure: A(j.structure, 10).map(x => ({ part: S(x && x.part, 80), range: S(x && x.range, 40), what: S(x && x.what, 300), job: S(x && x.job, 300) })).filter(x => x.part || x.what),
    devices: A(j.devices, 10).map(x => ({ name: S(x && x.name, 120), example: S(x && x.example, 240) })).filter(x => x.name),
    drops: A(j.drops, 6).map(x => S(x, 300)).filter(Boolean),
    formula: S(j.formula, 1500),
    persona: Object.fromEntries(['who', 'age', 'gender', 'region', 'language', 'level', 'confidence', 'basis'].map(k => [k, S((j.persona || {})[k], 300)])),
    rewrite: A(j.rewrite, 5).map(x => S(x, 300)).filter(Boolean),
    stats: Object.assign({}, stats, { cut })
  } };
}

// ---------- Ăn theo một video: (1) đọc video gốc + bình luận, (2) so với hồ sơ đã gom để tìm phần video gốc chưa nói ----------
async function doRideScan(key, d) {
  d = d || {}; const v = d.video || {};
  const title = String(v.title || '').slice(0, 300);
  if (!title) { const e = new Error('Thiếu thông tin video gốc.'); e.code = 'NO_DATA'; throw e; }
  const tr = String(d.transcript || '').replace(/\r/g, '').trim().slice(0, 60000);
  const cm = (Array.isArray(d.comments) ? d.comments : []).slice(0, 80).map(c => '- ' + String((c && c.t) || '').replace(/\s+/g, ' ').slice(0, 280) + ' | ' + (Number(c && c.l) || 0)).filter(x => x.length > 8).join('\n');
  const chs = (Array.isArray(v.chapters) ? v.chapters : []).slice(0, 30).map(c => ({ t: String((c && c.t) || '').slice(0, 10), label: String((c && c.label) || '').slice(0, 120) })).filter(c => c.label);
  const text = `You help a YouTube creator make a BETTER follow-up video about the same real-world story as a reference video, without copying it.
Use only the material below. Do not add facts about the story from your own memory.

REFERENCE VIDEO
Title: ${title}
Channel: ${String(v.channel || '').slice(0, 120)}
Published: ${String(v.published || '').slice(0, 40)} | Length: ${Number(v.minutes) || '?'} min | Views: ${Number(v.views) || '?'}
Tags: ${(Array.isArray(v.tags) ? v.tags : []).slice(0, 25).join(', ').slice(0, 600)}
Declared language: ${String(v.language || '?').slice(0, 12)}
Chapters (time label): ${chs.map(c => c.t + ' ' + c.label).join(' | ') || '(none in the description)'}
Description: <<<${String(v.description || '').slice(0, 4000)}>>>

TRANSCRIPT ${tr ? '(given)' : '(NOT given)'}:
<<<${tr}>>>

TOP VIEWER COMMENTS (text | likes):
${cm || '(none)'}

Tasks:
1. Identify the real-world story the video is about.
2. Break the video into its chapters. Use the chapter list when there is one; with a transcript but no chapter list, split the transcript into 5-9 parts yourself with approximate time marks. For each chapter give a 1-2 sentence summary of its IDEAS in Vietnamese (never quote the narration). Without a transcript leave "summary_vi" empty - do not guess what a chapter says from its name.
   Then list what the video ALREADY covers, built from the chapters and their summaries: with a transcript "basis":"transcript" (8-14 points); with chapters only "basis":"chapters" (one cautious point per chapter); with neither "basis":"description" (3-6 cautious points).
3. From the comments, extract what viewers still ask, want more of, dispute, or say is missing. Keep real informational demand; skip jokes, praise and insults. Most-liked first.

Return ONLY JSON:
{"event_vi":"1-2 câu tiếng Việt: vụ việc là gì",
 "event_query":"a precise research brief in the video's ORIGINAL language (who, what, where, when) for finding news about this exact story",
 "lang":"ISO 639-1 code of the language SPOKEN in the video","lang_name":"that language's English name, e.g. English","when":"date or period, or empty","where":"place or empty","people":["key names"],
 "basis":"transcript|chapters|description",
 "chapters":[{"t":"0:00","title":"chapter name in the original language","summary_vi":"ý chính của chương, 1-2 câu, hoặc rỗng"}],
 "covered":["điểm video đã nói, tiếng Việt, ngắn"],
 "asked":[{"q_vi":"điều người xem muốn biết, tiếng Việt","kind":"hỏi|thiếu|phản bác","quote":"short original snippet under 20 words","likes":0}],
 "hook_vi":"1 câu: tiêu đề và ảnh bìa đang hứa điều gì khiến người ta bấm"}
Up to 10 items in "asked".`;
  const j = await askJson(key, text, 50000, true);
  const A = (x, n) => (Array.isArray(x) ? x : []).slice(0, n), S = (x, n) => String(x == null ? '' : x).slice(0, n);
  return { scan: {
    event_vi: S(j.event_vi, 500), event_query: S(j.event_query, 400) || title, lang: S(j.lang, 8).toLowerCase() || String(v.language || '').slice(0, 2).toLowerCase(), lang_name: S(j.lang_name, 30),
    chapters: (A(j.chapters, 30).map(x => ({ t: S(x && x.t, 10), title: S(x && x.title, 140), summary_vi: tr ? S(x && x.summary_vi, 400) : '' })).filter(x => x.title).length ? A(j.chapters, 30).map(x => ({ t: S(x && x.t, 10), title: S(x && x.title, 140), summary_vi: tr ? S(x && x.summary_vi, 400) : '' })).filter(x => x.title) : chs.map(c => ({ t: c.t, title: c.label, summary_vi: '' }))),
    when: S(j.when, 80), where: S(j.where, 120), people: A(j.people, 10).map(x => S(x, 80)).filter(Boolean),
    basis: tr ? 'transcript' : chs.length ? 'chapters' : 'description',
    covered: A(j.covered, 16).map(x => S(x, 260)).filter(Boolean),
    asked: A(j.asked, 10).map(x => ({ q_vi: S(x && x.q_vi, 260), kind: S(x && x.kind, 12), quote: S(x && x.quote, 200), likes: Number(x && x.likes) || 0 })).filter(x => x.q_vi),
    hook_vi: S(j.hook_vi, 300)
  } };
}

async function doRideGaps(key, d) {
  d = d || {}; const D = d.dossier || {};
  const covered = (Array.isArray(d.covered) ? d.covered : []).slice(0, 16).map(x => String(x).slice(0, 260));
  const asked = (Array.isArray(d.asked) ? d.asked : []).slice(0, 10).map(x => String((x && x.q_vi) || x || '').slice(0, 260)).filter(Boolean);
  const pick = {}; ['title', 'status', 'summary', 'latest', 'timeline', 'numbers', 'quotes', 'unverified', 'reported_claims', 'angles'].forEach(k => { if (D[k] != null) pick[k] = D[k]; });
  const dj = JSON.stringify(pick).slice(0, 22000);
  if (dj.length < 200) { const e = new Error('Hồ sơ chưa đủ thông tin để so với video gốc.'); e.code = 'NO_DATA'; throw e; }
  const refMin = Number(d.minutes) || 0, target = Math.max(3, Math.min(90, Math.round(Number(d.target) || Math.ceil(refMin || 10)))), ratio = Math.max(50, Math.min(90, Math.round(Number(d.ratio) || 70)));
  const wpm = Math.max(120, Math.min(220, Number(d.wpm) || 170)), words = Math.round(target * wpm / 50) * 50;
  const lang = String(d.vlang || 'the reference video language').slice(0, 40);
  const chapters = (Array.isArray(d.chapters) ? d.chapters : []).slice(0, 30).map(c => '- ' + String((c && c.t) || '').slice(0, 10) + ' ' + String((c && c.title) || '').slice(0, 140) + (c && c.summary_vi ? ': ' + String(c.summary_vi).slice(0, 400) : '')).join('\n');
  const basisNote = d.basis === 'transcript' ? ' (from its transcript)' : d.basis === 'chapters' ? ' (from its chapter names only - no transcript, treat as uncertain)' : ' (INFERRED from its title and description only - treat as uncertain)';
  const text = `A creator will make a follow-up video on the same story as a reference video ("${String(d.title || '').slice(0, 200)}", about ${refMin || '?'} minutes).
(A) Chapters of the reference video${basisNote}:
${chapters || '(no chapter list)'}
What it already covers:
${covered.map(x => '- ' + x).join('\n') || '(unknown)'}

(B) What its viewers ask for in the comments:
${asked.map(x => '- ' + x).join('\n') || '(nothing useful)'}

(C) DOSSIER researched from news sources. "src" numbers point to sources:
${dj}

Find what the DOSSIER contains that the reference video did NOT cover: that is the new value for viewers.
Rules: use ONLY facts in the DOSSIER and keep their src numbers. Never invent. Items taken from "unverified" or "reported_claims" must get confidence "chưa kiểm chứng". If a viewer question in (B) is answered by the dossier, name it in "answers_vi". Viewer questions the dossier cannot answer go to "open_questions".
Plan of the new video: about ${target} minutes (about ${words} narrated words at ${wpm} words per minute). Roughly ${ratio}% of the runtime re-tells the IDEAS of the reference video's chapters - every chapter covered, in a DIFFERENT order, in entirely new wording (never its sentences) - and roughly ${100 - ratio}% is the new information the reference video lacks.

Return ONLY JSON:
{"new_share_pct": 0,
 "gaps":[{"point_vi":"điểm mới, 1 câu","detail_vi":"1-2 câu có tên, ngày, con số cụ thể","answers_vi":"câu hỏi của người xem mà nó trả lời, hoặc rỗng","src":[1],"confidence":"có nguồn|chưa kiểm chứng"}],
 "open_questions":["câu hỏi của người xem mà hồ sơ chưa trả lời được"],
 "angle_vi":"1-2 câu: cùng vụ việc, video mới hứa điều gì khác",
 "titles":[{"t":"title in ${lang}, at most 100 characters","vi":"nghĩa tiếng Việt"}],
 "outline":[{"part":"tên phần của video mới","minutes":1,"ref_chapter":"tên chương video gốc mà phần này phủ, hoặc rỗng nếu phần hoàn toàn mới","ref_vi":"ý của video gốc được kể lại ở phần này","new_vi":"điểm mới chèn vào phần này, hoặc rỗng","is_new":false}],
 "target_minutes": ${target}}
"new_share_pct" = your estimate (integer) of the share of dossier facts absent from the reference video. Give 6-12 gaps (most valuable to viewers first). Give exactly 5 truthful titles; prefer the form "the question the reference video raises + the new answer". Outline: one part per reference chapter (reordered) plus parts that are entirely new ("is_new": true); minutes add up to about ${target}; open with the strongest new point.`;
  const j = await askJson(key, text, 50000, true);
  const A = (x, n) => (Array.isArray(x) ? x : []).slice(0, n), S = (x, n) => String(x == null ? '' : x).slice(0, n);
  return { gaps: {
    new_share_pct: Math.max(0, Math.min(100, Math.round(Number(j.new_share_pct) || 0))),
    gaps: A(j.gaps, 14).map(x => ({ point_vi: S(x && x.point_vi, 300), detail_vi: S(x && x.detail_vi, 500), answers_vi: S(x && x.answers_vi, 260), src: A(x && x.src, 6).map(Number).filter(n => n > 0 && n < 200), confidence: /chưa/i.test(String(x && x.confidence)) ? 'chưa kiểm chứng' : 'có nguồn' })).filter(x => x.point_vi),
    open_questions: A(j.open_questions, 10).map(x => S(x, 260)).filter(Boolean),
    angle_vi: S(j.angle_vi, 500),
    titles: A(j.titles, 6).map(x => ({ t: S(x && x.t, 100), vi: S(x && x.vi, 200) })).filter(x => x.t),
    outline: A(j.outline, 16).map(x => ({ part: S(x && x.part, 100), minutes: Math.round((Number(x && x.minutes) || 0) * 10) / 10, ref_chapter: S(x && x.ref_chapter, 140), ref_vi: S(x && (x.ref_vi || x.content_vi), 400), new_vi: S(x && x.new_vi, 400), is_new: !!(x && x.is_new) })).filter(x => x.part),
    titles_note: '', target_minutes: target, target_words: words, wpm, ratio, ref_minutes: refMin, basis: d.basis === 'transcript' ? 'transcript' : d.basis === 'chapters' ? 'chapters' : 'description'
  } };
}

// ---------- Phân tích bố cục ảnh bìa (thumbnail) của video gốc bằng AI nhìn ảnh ----------
async function doRideThumb(key, d) {
  const id = String((d && d.id) || ''); if (!/^[\w-]{11}$/.test(id)) { const e = new Error('Thiếu mã video.'); e.code = 'NO_DATA'; throw e; }
  let img = null;
  for (const n of ['maxresdefault', 'sddefault', 'hqdefault']) { try { img = await fetchImage('https://i.ytimg.com/vi/' + id + '/' + n + '.jpg'); if (img && img.buf && img.buf.length > 8000) break; img = null; } catch (e) { img = null; } }
  if (!img) { const e = new Error('Không tải được ảnh bìa của video gốc.'); e.code = 'NO_DATA'; throw e; }
  const text = `This is the thumbnail of a YouTube video titled "${String((d && d.title) || '').slice(0, 200)}". A creator wants to design their own thumbnail with a SIMILAR LAYOUT (not a copy of the picture).
Describe only what is visible. Write descriptions in Vietnamese; keep the text that appears on the image in its original language.
Return ONLY JSON:
{"layout_vi":"2-3 câu tả bố cục tổng thể: ai/cái gì ở đâu, to nhỏ ra sao",
 "main_subject":{"what_vi":"nhân vật / vật chính","position":"trái|giữa|phải","size":"lớn|vừa|nhỏ"},
 "others_vi":["nhân vật / chi tiết phụ và vị trí"],
 "text":{"content":"chữ trên ảnh, nguyên văn, hoặc rỗng","word_count":0,"position_vi":"vị trí chữ","color_vi":"màu chữ và viền","font_vi":"kiểu chữ (ví dụ Impact đậm, có vết rỉ)"},
 "has_label":false,"label_vi":"nhãn / dải chữ / mũi tên / khoanh đỏ nếu có, hoặc rỗng",
 "background_vi":"nền: sáng tối, tông màu, bối cảnh",
 "looks_ai_generated":false,"ai_signs_vi":"dấu hiệu cho thấy ảnh do AI dựng hoặc ghép (nếu có), hoặc rỗng",
 "text_over_face":false}`;
  const j = parseJson((await gemini(key, { contents: [{ parts: [{ inline_data: { mime_type: img.type || 'image/jpeg', data: img.buf.toString('base64') } }, { text }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }, 40000, true)).text);
  const S = (x, n) => String(x == null ? '' : x).slice(0, n), ms = j.main_subject || {}, tx = j.text || {};
  return { thumb: {
    layout_vi: S(j.layout_vi, 500), main_subject: { what_vi: S(ms.what_vi, 160), position: S(ms.position, 12), size: S(ms.size, 12) },
    others_vi: (Array.isArray(j.others_vi) ? j.others_vi : []).slice(0, 6).map(x => S(x, 160)).filter(Boolean),
    text: { content: S(tx.content, 120), word_count: Math.max(0, Math.round(Number(tx.word_count) || 0)), position_vi: S(tx.position_vi, 100), color_vi: S(tx.color_vi, 100), font_vi: S(tx.font_vi, 120) },
    has_label: !!j.has_label, label_vi: S(j.label_vi, 160), background_vi: S(j.background_vi, 200),
    looks_ai_generated: !!j.looks_ai_generated, ai_signs_vi: S(j.ai_signs_vi, 240), text_over_face: !!j.text_over_face
  } };
}

// ---------- Phong cách dựng của video gốc: Gemini xem thẳng video YouTube công khai (hình 1 khung/giây + tiếng) ----------
const STYLE_WINDOW = 480;   // chỉ xem 8 phút đầu để kịp giới hạn 60 giây của máy chủ
async function doRideStyle(key, d) {
  const id = String((d && d.id) || ''); if (!/^[\w-]{11}$/.test(id)) { const e = new Error('Thiếu mã video.'); e.code = 'NO_DATA'; throw e; }
  const secs = Math.max(0, Math.round(Number(d && d.seconds) || 0)), clip = !secs || secs > STYLE_WINDOW + 30;
  const text = `You are a video editor studying HOW this YouTube video is edited (not what it says), so another editor can reproduce the same editing style with different pictures.
Title: "${String((d && d.title) || '').slice(0, 200)}".
Describe only what you actually see and hear. If you cannot tell something, write "không rõ". Do not invent hex colours you cannot see; give the nearest colour you observe.
Write every description in Vietnamese. Keep sample on-screen text in its original language.
Return ONLY JSON:
{"background_vi":"nền: sáng/tối, độ bão hoà, ảnh và b-roll có bị làm tối phía sau đồ hoạ không (ước lượng %), gam màu chủ đạo",
 "images_vi":"cách đặt ảnh tĩnh: toàn màn hình hay thẻ ảnh nổi trên nền mờ (ước lượng tỉ lệ mỗi kiểu và cỡ thẻ), zoom/pan, vignette, viền, đổ bóng",
 "text":{"font_vi":"kiểu chữ (hẹp/rộng, có chân/không chân, in hoa hay thường, giống font nào)","main_color":"màu chữ chính","accent_color":"màu nhấn từ khoá, kèm mã hex gần đúng nếu thấy rõ","caption_vi":"chú thích trên hình: số chữ, vị trí","chapter_title_vi":"tiêu đề chương trông thế nào","animation_vi":"chữ hiện ra kiểu gì, khoảng bao lâu","samples":["2-4 dòng chữ mẫu, nguyên văn"]},
 "graphics_vi":["từng loại đồ hoạ xuất hiện: thẻ tên, thẻ số liệu, giấy tờ, trích dẫn, dòng thời gian, bản đồ, so sánh... mỗi loại một dòng tả hình dạng và màu"],
 "transitions_vi":"chuyển cảnh: cắt thẳng, mờ dần, trượt, flash... cái nào là chính, đồ hoạ vào ra thế nào",
 "pace":{"avg_shot_seconds":0,"note_vi":"nhịp cắt: ước lượng mỗi hình giữ mấy giây, đoạn nào nhanh hơn"},
 "audio":{"music_vi":"nhạc nền: có liên tục không, thể loại, to nhỏ so với giọng","sfx_vi":"tiếng động: whoosh, hit, tiếng gõ... dùng lúc nào","voice_vi":"giọng đọc: nam/nữ, tốc độ, có ngắt nghỉ dài không"},
 "source_labels_vi":"cách ghi nguồn trên hình (FILE PHOTO, SOURCE...), vị trí; có dùng clip có logo đài không và xử lý logo thế nào",
 "ai_imagery":{"used":false,"note_vi":"có ảnh/cảnh do AI dựng về người thật không, dấu hiệu"},
 "map":{"used":false,"note_vi":"có bản đồ không; nếu có: màu nền, màu vùng được tô, có zoom, ghim, đường nối không"},
 "hook_vi":"15-20 giây đầu dựng thế nào: hình gì, chữ gì, hiệu ứng gì, theo thứ tự",
 "has_music":true,
 "summary_vi":"2 câu tóm tắt phong cách dựng"}`;
  const part = { fileData: { fileUri: 'https://www.youtube.com/watch?v=' + id } };
  if (clip) part.videoMetadata = { startOffset: '0s', endOffset: STYLE_WINDOW + 's' };
  let out;
  try { out = await gemini(key, { contents: [{ parts: [part, { text }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }, 54000); }
  catch (e) {
    if (e && e.code === 'GEMINI_ERROR' && !/^Gemini (429|5\d\d)/.test(e.message || '')) { const x = new Error('AI không xem được video này (video riêng tư, không công khai, giới hạn tuổi hoặc quá dài). ' + String(e.message || '').slice(0, 160)); x.code = 'STYLE_FAIL'; throw x; }
    throw e;
  }
  const j = parseJson(out.text), S = (x, n) => String(x == null ? '' : x).trim().slice(0, n), tx = j.text || {}, pc = j.pace || {}, au = j.audio || {}, ai = j.ai_imagery || {};
  const style = {
    background_vi: S(j.background_vi, 400), images_vi: S(j.images_vi, 500),
    text: { font_vi: S(tx.font_vi, 240), main_color: S(tx.main_color, 80), accent_color: S(tx.accent_color, 100), caption_vi: S(tx.caption_vi, 240), chapter_title_vi: S(tx.chapter_title_vi, 300), animation_vi: S(tx.animation_vi, 200), samples: (Array.isArray(tx.samples) ? tx.samples : []).slice(0, 4).map(x => S(x, 80)).filter(Boolean) },
    graphics_vi: (Array.isArray(j.graphics_vi) ? j.graphics_vi : []).slice(0, 10).map(x => S(x, 220)).filter(Boolean),
    transitions_vi: S(j.transitions_vi, 400),
    pace: { avg_shot_seconds: Math.max(0, Math.round((Number(pc.avg_shot_seconds) || 0) * 10) / 10), note_vi: S(pc.note_vi, 240) },
    audio: { music_vi: S(au.music_vi, 240), sfx_vi: S(au.sfx_vi, 200), voice_vi: S(au.voice_vi, 200) },
    source_labels_vi: S(j.source_labels_vi, 300),
    ai_imagery: { used: !!ai.used, note_vi: S(ai.note_vi, 240) },
    map: { used: !!(j.map && j.map.used), note_vi: S(j.map && j.map.note_vi, 300) }, hook_vi: S(j.hook_vi, 500), has_music: j.has_music == null ? null : !!j.has_music,
    summary_vi: S(j.summary_vi, 400),
    window_seconds: clip ? STYLE_WINDOW : secs, whole: !clip, method: 'gemini-video-1fps'
  };
  if (!style.background_vi && !style.images_vi && !style.text.font_vi && !style.transitions_vi) { const e = new Error('AI không tả được phong cách dựng của video này.'); e.code = 'STYLE_FAIL'; throw e; }
  return { style };
}

// ---------- Ăn theo một kênh đang lên: đọc danh sách video của kênh → công thức kênh → đề xuất đề tài kèm lý do ----------
function chanVideos(d) {
  return (Array.isArray(d && d.videos) ? d.videos : []).slice(0, 60).map((v, k) => ({ i: k + 1, id: String((v && v.id) || '').slice(0, 11), title: String((v && v.title) || '').slice(0, 160), views: Math.max(0, Math.round(Number(v && v.views) || 0)), ratio: Math.round((Number(v && v.ratio) || 0) * 100) / 100, days: Math.max(0, Math.round(Number(v && v.days) || 0)), min: Math.round((Number(v && v.min) || 0) * 10) / 10 })).filter(v => v.title);
}
// AI có khi trả số dạng "#3", "3", {i:3} hoặc "video 3": gom hết về số nguyên
const idxList = x => (Array.isArray(x) ? x : x == null ? [] : [x]).map(v => { if (typeof v === 'number') return v; const m = /\d+/.exec(typeof v === 'object' && v ? String(v.i || v.n || v.index || v.id || '') : String(v)); return m ? Number(m[0]) : NaN; }).filter(n => isFinite(n));
const chanList = vs => vs.map(v => `#${v.i} | ${v.title} | ${v.views} views | ${v.ratio}x channel median | ${v.days} days ago | ${v.min} min`).join('\n');
const medianOf = a => { const s = a.filter(x => isFinite(x)).sort((x, y) => x - y); return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0; };
async function doChanScan(key, d) {
  d = d || {}; const vs = chanVideos(d), ch = d.channel || {};
  if (vs.length < 5) { const e = new Error('Kênh có quá ít video để phân tích (cần ít nhất 5).'); e.code = 'NO_DATA'; throw e; }
  const j = await askJson(key, `A creator wants to make videos for the same audience as a fast-growing YouTube channel. Study the channel's recent uploads and explain its content formula.
Channel: "${String(ch.title || '').slice(0, 120)}" (${Number(ch.subs) || 0} subscribers, country ${String(ch.country || '?').slice(0, 4)}). Description: ${String(ch.desc || '').slice(0, 500)}
Recent videos, newest first. "x channel median" compares the video's views with the channel's median views, so 2x means twice a typical video:
${chanList(vs)}

Use ONLY this list. Group the videos into 3-6 topic groups (every video number in exactly one group). Judge what performs from the "x channel median" numbers, not from guesses.
Write explanations in Vietnamese. Keep titles and title patterns in the channel's language.
Return ONLY JSON:
{"lang":"ISO 639-1 code of the channel's videos","lang_name":"language name in English",
 "niche_vi":"2 câu: kênh làm về gì, cho ai xem",
 "formula_vi":"2-3 câu: công thức video của kênh (kiểu đề tài, độ dài, cách đặt vấn đề)",
 "title_patterns":[{"pattern":"mẫu tiêu đề với chỗ trống, ví dụ: What Happens to the X Who Y","example":3,"note_vi":"vì sao mẫu này kéo người bấm"}],
 "groups":[{"name_vi":"tên nhóm đề tài","videos":[1,4,7],"note_vi":"nhóm này lên hay không lên, vì sao (dựa trên số liệu)"}],
 "winners_vi":"điểm chung của các video vượt xa mức trung vị",
 "losers_vi":"điểm chung của các video dưới mức trung vị",
 "news_queries":["4-6 truy vấn tin tức ngắn, bằng ngôn ngữ của kênh, để tìm vụ việc MỚI cùng dạng với nhóm đề tài đang lên"],
 "finder_cat_en":"one short English phrase naming the kind of REAL stories the best-performing group covers, usable as a research category, e.g. unsolved murder cases",
 "story_country":"the country most of its stories come from, as an English country name, or global",
 "timely":false}
"timely" is true only if most videos react to news of the last few weeks; false if they retell older or classic stories.`, 50000, true, 22000);
  const S = (x, n) => String(x == null ? '' : x).trim().slice(0, n), byI = {}; vs.forEach(v => { byI[v.i] = v; });
  const groups = (Array.isArray(j.groups) ? j.groups : []).slice(0, 8).map(g => {
    const idx = [...new Set((Array.isArray(g && g.videos) ? g.videos : []).map(Number).filter(n => byI[n]))];
    const rs = idx.map(n => byI[n].ratio);
    return { name_vi: S(g && g.name_vi, 80), videos: idx, n: idx.length, median_ratio: Math.round(medianOf(rs) * 100) / 100, best: idx.slice().sort((a, b) => byI[b].ratio - byI[a].ratio)[0] || 0, note_vi: S(g && g.note_vi, 300) };
  }).filter(g => g.name_vi && g.n).sort((a, b) => b.median_ratio - a.median_ratio);
  return { scan: {
    lang: S(j.lang, 5).toLowerCase(), lang_name: S(j.lang_name, 30), niche_vi: S(j.niche_vi, 400), formula_vi: S(j.formula_vi, 500),
    title_patterns: (Array.isArray(j.title_patterns) ? j.title_patterns : []).slice(0, 5).map(p => ({ pattern: S(p && p.pattern, 140), example: byI[Number(p && p.example)] ? Number(p.example) : 0, note_vi: S(p && p.note_vi, 200) })).filter(p => p.pattern),
    groups, winners_vi: S(j.winners_vi, 400), losers_vi: S(j.losers_vi, 400),
    news_queries: (Array.isArray(j.news_queries) ? j.news_queries : []).map(q => S(q, 100)).filter(Boolean).slice(0, 6),
    finder_cat_en: S(j.finder_cat_en, 120), story_country: S(j.story_country, 40), timely: !!j.timely
  } };
}
async function doChanIdeas(key, d) {
  d = d || {}; const vs = chanVideos(d), ch = d.channel || {}, sc = d.scan || {}, byI = {}; vs.forEach(v => { byI[v.i] = v; });
  if (vs.length < 5) { const e = new Error('Thiếu danh sách video của kênh.'); e.code = 'NO_DATA'; throw e; }
  const news = (Array.isArray(d.news) ? d.news : []).slice(0, 40).map((x, k) => ({ n: k + 1, title: String((x && x.title) || '').slice(0, 200), source: String((x && x.source) || '').slice(0, 60), days: Math.max(0, Math.round(Number(x && x.days) || 0)), link: String((x && x.link) || '').slice(0, 500) })).filter(x => x.title);
  const n = Math.max(4, Math.min(10, Number(d.n) || 6)), avoid = (Array.isArray(d.avoid) ? d.avoid : []).slice(0, 30).map(x => String(x).slice(0, 120));
  const groups = (Array.isArray(sc.groups) ? sc.groups : []).slice(0, 8).map(g => `- ${String(g.name_vi || '').slice(0, 80)}: videos ${(g.videos || []).slice(0, 20).map(x => '#' + x).join(' ')} | median ${g.median_ratio}x`).join('\n');
  const j = await askJson(key, `A creator wants to publish videos that the audience of the YouTube channel "${String(ch.title || '').slice(0, 120)}" would click. Propose ${n} video topics.
Channel formula: ${String(sc.formula_vi || '').slice(0, 500)}
What wins on the channel: ${String(sc.winners_vi || '').slice(0, 400)}
Topic groups (median = views compared with the channel median):
${groups || '(none)'}
The channel's recent videos, newest first:
${chanList(vs)}

Fresh news headlines found with the channel's kind of topics (may be empty):
${news.map(x => `[N${x.n}] ${x.title} (${x.source}, ${x.days} days ago)`).join('\n') || '(none)'}
${avoid.length ? '\nDo NOT repeat these topics already proposed:\n' + avoid.map(x => '- ' + x).join('\n') : ''}
Three kinds of topic:
- "tin mới": a real story from the headlines above that fits a winning group and that the channel has NOT made yet. Must cite the headline numbers in "news". Never invent a story.
- "ăn theo video thắng": a follow-up or a different angle on one of the channel's videos at 1.5x median or more. Cite that video in "like".
- "khoảng trống": an evergreen subject of the same kind that the channel has not covered. Only well-known real subjects; say so in "risk_vi" if the facts need checking.
${sc.timely === false ? 'This channel retells older or classic stories, so most topics should be "khoảng trống": well-documented real stories of the same kind that are NOT in the list above.' : 'Prefer "tin mới" when the headlines allow it.'} Every topic must cite 1-3 channel videos of the same kind in "like" and the reason must COMPARE with them using their numbers (for example: the channel's 3 videos about X run at 2.4x median, this is the same kind and the channel has not done it). Do not propose a topic the channel already published.
Titles: in the channel's language (${String(sc.lang_name || 'the channel language').slice(0, 30)}), 100 characters or fewer, following one of the channel's title patterns, truthful. Everything ending in _vi in Vietnamese.
Return ONLY JSON:
{"ideas":[{"title":"...","title_vi":"nghĩa tiếng Việt","topic_vi":"1-2 câu: vụ việc / đề tài là gì","kind":"tin mới|ăn theo video thắng|khoảng trống","group":"tên nhóm đề tài","news":[2],"like":[3,9],"why_vi":"2-3 câu: lý do nên chọn, so với các video cùng dạng trên kênh, có số liệu","gap_vi":"kênh đã làm đề tài này chưa, làm tới đâu","risk_vi":"rủi ro hoặc điều cần kiểm tra, có thể rỗng","search_query":"truy vấn ngắn bằng ngôn ngữ gốc của vụ việc để gom tin"}]}`, 52000, true, 23000);
  const S = (x, m) => String(x == null ? '' : x).trim().slice(0, m), byN = {}; news.forEach(x => { byN[x.n] = x; });
  const ideas = (Array.isArray(j.ideas) ? j.ideas : []).slice(0, 12).map(x => {
    x = x || {};
    let like = [...new Set(idxList(x.like).filter(k => byI[k]))].slice(0, 3), likeAuto = false;
    if (!like.length) {   // AI không chỉ ra video nào: lấy các video tốt nhất của nhóm đề tài nó nêu, không có nhóm thì lấy nhóm đang lên nhất
      const gn = String(x.group || '').toLowerCase().trim(), G = (Array.isArray(sc.groups) ? sc.groups : []).filter(g => g && Array.isArray(g.videos) && g.videos.some(k => byI[k]));
      const g = (gn && G.filter(g => { const n = String(g.name_vi || '').toLowerCase(); return n && (n.indexOf(gn) >= 0 || gn.indexOf(n) >= 0); })[0]) || G[0];
      like = (g ? g.videos.filter(k => byI[k]) : vs.map(v => v.i)).slice().sort((a, b) => byI[b].ratio - byI[a].ratio).slice(0, 2); likeAuto = like.length > 0;
    }
    const nw = [...new Set(idxList(x.news).filter(k => byN[k]))].slice(0, 3);
    let kind = /tin/i.test(String(x.kind)) ? 'tin mới' : /ăn theo|thắng/i.test(String(x.kind)) ? 'ăn theo video thắng' : 'khoảng trống';
    if (kind === 'tin mới' && !nw.length) kind = 'khoảng trống';      // nói là tin mới mà không chỉ ra được tiêu đề tin nào → không coi là tin đã kiểm
    const rs = like.map(k => byI[k].ratio);
    return { title: S(x.title, 100), title_vi: S(x.title_vi, 200), topic_vi: S(x.topic_vi, 400), kind, group: S(x.group, 80), why_vi: S(x.why_vi, 600), gap_vi: S(x.gap_vi, 300), risk_vi: S(x.risk_vi, 300), search_query: S(x.search_query, 140),
      like_auto: likeAuto, like: like.map(k => ({ i: k, id: byI[k].id, title: byI[k].title, views: byI[k].views, ratio: byI[k].ratio })), like_ratio: Math.round(medianOf(rs) * 100) / 100,
      news: nw.map(k => ({ title: byN[k].title, source: byN[k].source, days: byN[k].days, link: byN[k].link })) };
  }).filter(x => x.title && x.like.length);
  if (!ideas.length) { const e = new Error('AI trả về danh sách rỗng. Bấm thử lại, hoặc dùng nút "Tìm đề tài cùng dạng" ở trên.'); e.code = 'NO_DATA'; throw e; }
  const rank = { 'tin mới': 0, 'ăn theo video thắng': 1, 'khoảng trống': 2 };
  ideas.sort((a, b) => (rank[a.kind] - rank[b.kind]) || (b.like_ratio - a.like_ratio));
  return { ideas, used_news: news.length };
}

// ---------- Kiểm tra một video: đề tài này chỉ mình kênh đó làm hay đã có kênh khác làm; đề xuất đề tài tương tự ----------
async function doDupScan(key, d) {
  const v = (d && d.video) || {}, title = String(v.title || '').slice(0, 200);
  if (title.length < 4) { const e = new Error('Thiếu tiêu đề video.'); e.code = 'NO_DATA'; throw e; }
  const j = await askJson(key, `A YouTube creator wants to know whether OTHER channels have already made a video about the same story or subject as this video.
Title: "${title}"
Channel: ${String(v.channel || '').slice(0, 100)}
Tags: ${(Array.isArray(v.tags) ? v.tags : []).slice(0, 20).map(t => String(t).slice(0, 40)).join(', ')}
Description: ${String(v.description || '').slice(0, 1500)}

Work out the specific story / event / subject (not the general category). Use only what the title, tags and description say.
Return ONLY JSON:
{"event_vi":"1-2 câu tiếng Việt: video nói về vụ việc / đề tài cụ thể nào",
 "kind_vi":"dạng nội dung, ví dụ: giải thích một vụ kỷ luật quân nhân đang gây tranh cãi",
 "names":["2-3 short names of the story in its ORIGINAL language, built from its proper nouns (people, places, organisations), the way other creators would title it"],
 "queries":["2 YouTube search queries in the original language that would find OTHER videos about exactly this story"],
 "news_queries":["3 short news queries in the original language: one for new developments of this story, two for other recent stories of the same kind"],
 "lang":"ISO 639-1 code of the video language","region":"ISO 3166-1 alpha-2 country the story is about, or empty"}`, 40000, true, 18000);
  const S = (x, n) => String(x == null ? '' : x).trim().slice(0, n), A = (x, n, m) => (Array.isArray(x) ? x : []).map(q => S(q, m)).filter(Boolean).slice(0, n);
  const out = { event_vi: S(j.event_vi, 400), kind_vi: S(j.kind_vi, 200), names: A(j.names, 3, 100), queries: A(j.queries, 2, 120), news_queries: A(j.news_queries, 3, 100), lang: S(j.lang, 5).toLowerCase(), region: S(j.region, 2).toUpperCase() };
  if (!out.queries.length) out.queries = [title.slice(0, 100)];
  if (!out.names.length) out.names = [title.slice(0, 100)];
  return { topic: out };
}
async function doDupIdeas(key, d) {
  d = d || {}; const v = d.video || {}, tp = d.topic || {};
  const cands = (Array.isArray(d.candidates) ? d.candidates : []).slice(0, 50).map((x, k) => ({ i: k + 1, title: String((x && x.title) || '').slice(0, 160), channel: String((x && x.channel) || '').slice(0, 60), views: Math.max(0, Math.round(Number(x && x.views) || 0)), days: Math.max(0, Math.round(Number(x && x.days) || 0)) })).filter(x => x.title);
  const news = (Array.isArray(d.news) ? d.news : []).slice(0, 40).map((x, k) => ({ n: k + 1, title: String((x && x.title) || '').slice(0, 200), source: String((x && x.source) || '').slice(0, 60), days: Math.max(0, Math.round(Number(x && x.days) || 0)), link: String((x && x.link) || '').slice(0, 500) })).filter(x => x.title);
  const n = Math.max(3, Math.min(8, Number(d.n) || 5)), avoid = (Array.isArray(d.avoid) ? d.avoid : []).slice(0, 30).map(x => String(x).slice(0, 120));
  const j = await askJson(key, `Reference YouTube video: "${String(v.title || '').slice(0, 200)}" by channel "${String(v.channel || '').slice(0, 100)}" (${Number(v.views) || 0} views, ${Number(v.days) || 0} days ago).
Its story: ${String(tp.event_vi || '').slice(0, 400)}
Kind of content: ${String(tp.kind_vi || '').slice(0, 200)}

TASK 1. Other YouTube videos found by search. Mark the ones that are about the SAME specific story as the reference video (same people / same event), not merely the same category:
${cands.map(x => `#${x.i} | ${x.title} | ${x.channel} | ${x.views} views | ${x.days} days ago`).join('\n') || '(none found)'}

TASK 2. Propose ${n} SIMILAR video topics for a creator who wants the same audience. Fresh news headlines (may be empty):
${news.map(x => `[N${x.n}] ${x.title} (${x.source}, ${x.days} days ago)`).join('\n') || '(none)'}
${avoid.length ? '\nDo NOT repeat these topics already proposed:\n' + avoid.map(x => '- ' + x).join('\n') : ''}
Kinds: "diễn biến mới" = a new development of the same story found in the headlines (cite them in "news"); "vụ tương tự" = a DIFFERENT real story of the same kind, from the headlines when possible (cite them) - never invent a story; "góc khác" = the same story from an angle that none of the videos in TASK 1 took.
Titles in the reference video's language, 100 characters or fewer, truthful. Fields ending in _vi in Vietnamese. In "why_vi" compare with the reference video and with how many channels already covered it.
Return ONLY JSON:
{"same":[1,4],
 "ideas":[{"title":"...","title_vi":"nghĩa tiếng Việt","topic_vi":"1-2 câu: đề tài là gì","kind":"diễn biến mới|vụ tương tự|góc khác","why_vi":"2 câu: vì sao nên làm","news":[2],"risk_vi":"điều cần kiểm tra, có thể rỗng","search_query":"truy vấn ngắn bằng ngôn ngữ gốc để gom tin và dò YouTube"}]}`, 52000, true, 23000);
  const S = (x, m) => String(x == null ? '' : x).trim().slice(0, m), byN = {}; news.forEach(x => { byN[x.n] = x; });
  const same = [...new Set(idxList(j.same).filter(k => k >= 1 && k <= cands.length))];
  const ideas = (Array.isArray(j.ideas) ? j.ideas : []).slice(0, 10).map(x => {
    x = x || {}; const nw = [...new Set(idxList(x.news).filter(k => byN[k]))].slice(0, 3);
    const kind = /diễn biến/i.test(String(x.kind)) ? 'diễn biến mới' : /góc/i.test(String(x.kind)) ? 'góc khác' : 'vụ tương tự';
    return { title: S(x.title, 100), title_vi: S(x.title_vi, 200), topic_vi: S(x.topic_vi, 400), kind, why_vi: S(x.why_vi, 500), risk_vi: S(x.risk_vi, 300), search_query: S(x.search_query, 140), grounded: kind === 'góc khác' || nw.length > 0, news: nw.map(k => ({ title: byN[k].title, source: byN[k].source, days: byN[k].days, link: byN[k].link })) };
  }).filter(x => x.title);
  return { same, ideas, used_news: news.length };
}

// ---------- Toạ độ cho bản đồ: lấy từ Wikipedia theo tên địa điểm; không có thì giữ số AI ước lượng và ghi rõ ----------
async function geoPlaces(list, skipLookup) {
  const S = (x, n) => String(x == null ? '' : x).trim().slice(0, n);
  const places = (Array.isArray(list) ? list : []).slice(0, 12).map(p => {
    p = p || {}; const lat = Number(p.lat), lon = Number(p.lon), ok = isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 && !(lat === 0 && lon === 0);
    return { name: S(p.name, 120), wiki: S(p.wiki || p.name, 120), kind: /scene|hiện trường/i.test(p.kind) ? 'scene' : /base|unit|trụ sở/i.test(p.kind) ? 'base' : /outlet|press|báo/i.test(p.kind) ? 'outlet' : 'other', country: S(p.country, 60), why: S(p.why, 200), lat: ok ? Math.round(lat * 1e4) / 1e4 : null, lon: ok ? Math.round(lon * 1e4) / 1e4 : null, coord_src: ok ? 'ai' : '' };
  }).filter(p => p.name);
  if (!places.length) return places;
  if (!skipLookup) try {
    const r = await fetch('https://en.wikipedia.org/w/api.php?action=query&prop=coordinates&redirects=1&format=json&colimit=50&titles=' + encodeURIComponent(places.map(p => p.wiki).join('|')), { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(4500) });
    if (r.ok) {
      const q = (await r.json()).query || {}, map = {}, back = {};
      (q.normalized || []).concat(q.redirects || []).forEach(x => { back[x.to] = back[x.to] || []; back[x.to].push(x.from); });
      const all = t => { const out = [t]; (back[t] || []).forEach(f => all(f).forEach(z => out.push(z))); return out; };
      Object.values(q.pages || {}).forEach(pg => { const c = (pg.coordinates || [])[0]; if (c && isFinite(c.lat) && isFinite(c.lon)) all(pg.title).forEach(t => { map[String(t).toLowerCase()] = c; }); });
      places.forEach(p => { const c = map[p.wiki.toLowerCase()]; if (c) { p.lat = Math.round(c.lat * 1e4) / 1e4; p.lon = Math.round(c.lon * 1e4) / 1e4; p.coord_src = 'wikipedia'; } });
    }
  } catch (e) { }
  places.forEach(p => { delete p.wiki; });
  return places.filter(p => p.lat != null);
}

// ---------- Contact sheet của video gốc: ảnh ghép khung hình (storyboard) mà chính YouTube tạo sẵn. Không đọc được trang video thì bỏ qua ----------
function storyboardSheets(spec, n) {
  const parts = String(spec || '').split('|'); if (parts.length < 2 || !/^https:\/\/i\d?\.ytimg\.com\//.test(parts[0])) return [];
  const levels = parts.slice(1).map((p, i) => { const a = p.split('#'); return { i, w: +a[0], h: +a[1], count: +a[2], cols: +a[3], rows: +a[4], ms: +a[5] || 0, name: a[6] || '', sigh: a[7] || '' }; }).filter(l => l.w && l.cols && l.rows && l.count && l.sigh && /\$M/.test(l.name));
  if (!levels.length) return [];
  const L = levels.filter(l => l.w >= 120).sort((a, b) => a.w - b.w)[0] || levels[levels.length - 1];
  const per = L.cols * L.rows, pages = Math.ceil(L.count / per), want = Math.max(1, Math.min(n || 2, pages));
  const pick = want === 1 ? [0] : [0, Math.floor(pages / 2)];
  return [...new Set(pick)].map(pg => ({ url: parts[0].replace('$L', String(L.i)).replace('$N', L.name.replace('$M', String(pg))) + '&sigh=' + L.sigh, page: pg, pages, cols: L.cols, rows: L.rows, frame_w: L.w, frame_h: L.h, from_s: Math.round(pg * per * L.ms / 1000), step_s: Math.round(L.ms / 100) / 10, frames: Math.min(per, L.count - pg * per) }));
}
async function doRideSheet(d) {
  const id = String((d && d.id) || ''); if (!/^[\w-]{11}$/.test(id)) { const e = new Error('Thiếu mã video.'); e.code = 'NO_DATA'; throw e; }
  let html = '';
  try { const r = await fetch('https://www.youtube.com/watch?v=' + id + '&hl=en', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36', 'Accept-Language': 'en-US,en;q=0.9', Cookie: 'CONSENT=YES+1' }, signal: AbortSignal.timeout(9000) }); if (r.ok) html = (await r.text()).slice(0, 3000000); } catch (e) { }
  const m = /"playerStoryboardSpecRenderer":\{"spec":"((?:[^"\\]|\\.)*)"/.exec(html);
  let spec = ''; if (m) { try { spec = JSON.parse('"' + m[1] + '"'); } catch (e) { } }
  const sheets = storyboardSheets(spec, 2);
  if (!sheets.length) { const e = new Error('YouTube không cho máy chủ đọc bảng khung hình của video này.'); e.code = 'NO_SHEET'; throw e; }
  return { sheets };
}

// ---------- Thử xem key Gemini này có dùng được Google Search không, và Google trả lời chính xác điều gì ----------
async function doSearchProbe(key) {
  try {
    const r = await gemini(key, { contents: [{ parts: [{ text: 'Use Google Search. What is one major news headline from today? Answer in one short sentence.' }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0 } }, 30000);
    const m = r.meta || {}, sources = (m.groundingChunks || []).length, queries = (m.webSearchQueries || []).length;
    if (sources || queries) noSearchUntil = 0;      // dùng được rồi thì bỏ luôn 15 phút tạm ngưng
    return { probe: { ok: !!(sources || queries), model: LAST, sources, queries, answer: String(r.text || '').slice(0, 200), paused: false } };
  } catch (e) {
    return { probe: { ok: false, code: e.code || 'ERROR', error: String(e.message || '').slice(0, 400), paused: Date.now() < noSearchUntil, pause_min: Math.max(0, Math.ceil((noSearchUntil - Date.now()) / 60000)) } };
  }
}

// ---------- Bộ thông tin đăng video: tiêu đề, mô tả, thẻ từ khoá ----------
async function doSeo(key, d) {
  d = d || {};
  const topic = String(d.topic || '').slice(0, 600); if (topic.length < 4) { const e = new Error('Hãy mô tả video của bạn.'); e.code = 'NO_DATA'; throw e; }
  const lang = String(d.lang || 'Vietnamese').slice(0, 40), kw = String(d.keyword || '').slice(0, 120), refs = (Array.isArray(d.refs) ? d.refs : []).slice(0, 15).map(t => String(t).slice(0, 140));
  const j = await askJson(key, `Write the upload metadata for a YouTube video. Language of the output: ${lang}.
VIDEO: """${topic}"""
${kw ? 'MAIN KEYWORD: ' + kw + '\n' : ''}${refs.length ? 'TITLES OF WINNING VIDEOS IN THIS NICHE (match their style, do not copy): ' + JSON.stringify(refs) + '\n' : ''}
Rules: titles under 70 characters, curiosity without lying; description 120-180 words with the main keyword in the first sentence, a short outline of what the viewer gets and a call to action; tags are short search phrases (total under 450 characters); no hashtags inside the description.
Return ONLY JSON: {"titles":["5 options"],"description":"...","tags":["15-22 tags"],"hashtags":["3 hashtags starting with #"],"file_name":"main keyword and topic as lowercase ascii words joined by hyphens, max 8 words, no extension","pinned_comment":"a first comment that invites replies"}`, 30000, true);
  const A = (v, n, m) => (Array.isArray(v) ? v : []).map(x => String(x || '').slice(0, m)).filter(Boolean).slice(0, n);
  return { seo: { titles: A(j.titles, 6, 120), description: String(j.description || '').slice(0, 2500), tags: A(j.tags, 25, 60), hashtags: A(j.hashtags, 5, 40), file_name: String(j.file_name || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80), pinned_comment: String(j.pinned_comment || '').slice(0, 500) } };
}

// ---------- Trợ lý AI trên bảng: trả lời câu hỏi về các dòng đang hiện và chọn ra dòng khớp ----------
const ASK_LEGEND = {
  video: 'id, ch = channel name, sub = subscribers, t = title, v = views, vph = views per hour since upload, x = views divided by subscribers, h = hours since upload, d = duration in seconds, mk = country, n = niche, farm = channel is rated a money-farm channel',
  channel: 'id, name, sub = subscribers, mk = country, n = niche, age = channel age in days, vids = total videos, v30 = views in the last 30 days, vpm = videos per month, score = farm score 0-100, verdict (farm / rise / fluke / cold / unk), x = median views divided by subscribers'
};
async function doAsk(key, d) {
  d = d || {};
  const q = String(d.q || '').trim().slice(0, 400), kind = d.kind === 'channel' ? 'channel' : 'video';
  const rows = (Array.isArray(d.rows) ? d.rows : []).filter(r => r && r.id).slice(0, 240);
  if (q.length < 3 || !rows.length) { const e = new Error('Hãy gõ câu hỏi và quét dữ liệu trước.'); e.code = 'NO_DATA'; throw e; }
  const j = await askJson(key, `You are the data assistant inside a YouTube research tool. Today is ${new Date().toISOString().slice(0, 10)}.
The user asks a question (usually in Vietnamese) about the table of ${kind} rows below.
Fields: ${ASK_LEGEND[kind]}.
Rules:
- Use ONLY these rows. Never invent rows or numbers.
- "ids": the ids of the rows that match what the user asked for, best first, at most 80. Use [] when the question is not about selecting rows.
- "answer": 1-4 Vietnamese sentences. Name the top 3 matches with their key numbers. Do NOT state how many rows matched (the app counts the ids itself).
- If the question cannot be answered from these fields, say so in "answer" and suggest which column or filter to use instead.
Return ONLY JSON: {"answer":"...","ids":["..."]}

QUESTION: """${q}"""

ROWS:
${JSON.stringify(rows).slice(0, 60000)}`, 30000, true);
  const ok = new Set(rows.map(r => String(r.id)));
  const ids = (Array.isArray(j.ids) ? j.ids : []).map(String).filter(id => ok.has(id)).slice(0, 80);
  return { answer: String(j.answer || '').slice(0, 900), ids };
}

module.exports = { gemini, doRideScan, doRideGaps, doRideThumb, doRideStyle, doChanScan, doChanIdeas, doDupScan, doDupIdeas, doRideSheet, storyboardSheets, geoPlaces, topicsWiki, doSearchProbe, mediaFrom, excerptFrom, commons, doAsk, doTranslate, doAudience, doSeo, doScript, scriptStats, model: MODEL, models: MODELS, wiki, bingNews, searchFree, topicsFree, doTopics, topicsPrompt, cleanTopics, doImages, openverse, fetchImage, privateIp, doTitles, titlesPrompt, level, mediaFrom, doInsight, doSearch, doStructure, doNews, doEnrich, annotate, parseRss, parseJson, safeUrl, guessLang, searchPrompt, structurePrompt };
