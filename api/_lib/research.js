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

async function gemini(key, body, timeoutMs, lite) {
  if (!key) { const e = new Error('NO_API_KEY'); e.code = 'NO_API_KEY'; throw e; }
  const t0 = Date.now(), total = timeoutMs || 24000;
  let last = null;
  // Vòng 2 chỉ chạy khi có model báo quá tải (503): chờ một nhịp rồi thử lại, vì quá tải thường chỉ kéo dài vài giây.
  for (let round = 0; round < 2; round++) {
  let busy = 0;
  if (round) { if (total - (Date.now() - t0) < 7000) break; await new Promise(r => setTimeout(r, 1500)); }
  for (const m of MODELS(lite)) {
    const left = total - (Date.now() - t0); if (left < 3000) break;
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body), signal: AbortSignal.timeout(left)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = ((j.error && j.error.message) || '').slice(0, 300);
      const e = new Error('Gemini ' + r.status + ': ' + msg);
      e.code = r.status === 429 ? 'GEMINI_LIMIT' : 'GEMINI_ERROR';
      if (r.status === 404 || /no longer available|is not found|not supported for generateContent/i.test(msg)) { DEAD.add(m); last = last || e; continue; }
      if (r.status === 429) { last = e; continue; }   // lỗi hạn mức được ưu tiên báo ra để phía trên biết đường chuyển sang chế độ dự phòng
      // model đang quá tải / lỗi tạm của Google: thử model kế tiếp thay vì báo lỗi ngay
      if (r.status === 503 || r.status === 500 || r.status === 502 || r.status === 504 || /high demand|overloaded|unavailable|try again later/i.test(msg)) { busy++; e.code = 'GEMINI_BUSY'; if (!last || last.code !== 'GEMINI_LIMIT') last = e; continue; }
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
const askJson = async (key, text, ms, lite) => parseJson((await gemini(key, { contents: [{ parts: [{ text }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }, ms, lite)).text);

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
 "sensitivity": "notes about victims, graphic content, legal or privacy care the creator should take"
}
Rules: 8-12 youtube_queries covering every type that fits THIS story (press briefings, news reports, on-scene footage, audio recordings, expert analysis, background on the people/objects involved). 6-10 image_queries. Latest and timeline newest information must reflect the report precisely.`;
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
  const r = await gemini(key, { contents: [{ parts: [{ text: structurePrompt(prompt, report, sources || [], lang) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }, 50000);
  return parseJson(r.text);
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
const BAD_IMG = /logo|icon|sprite|avatar|favicon|placeholder|blank|pixel|1x1|spacer|badge|button|banner-ad|advert|doubleclick|tracking|gravatar|emoji|\.svg(\?|$)|\.gif(\?|$)|data:/i;
function pickSrc(tag) {
  const g = n => { const m = new RegExp('\\s' + n + '\\s*=\\s*["\']([^"\']+)["\']', 'i').exec(tag); return m ? m[1] : ''; };
  const ss = g('srcset') || g('data-srcset');
  if (ss) { const best = ss.split(',').map(x => x.trim().split(/\s+/)).map(([u, w]) => [u, parseInt(w) || 0]).sort((a, b) => b[1] - a[1])[0]; if (best && best[0]) return { src: best[0], alt: g('alt'), w: +g('width') || 0 }; }
  return { src: g('data-src') || g('data-lazy-src') || g('data-original') || g('src'), alt: g('alt'), w: +g('width') || 0 };
}
function mediaFrom(html, base) {
  const imgs = [], seen = new Set(), vids = [], vseen = new Set();
  const abs = u => { try { return new URL(decode(u), base).href; } catch (e) { return ''; } };
  const body = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ');
  (body.match(/<img\b[^>]*>/gi) || []).forEach(tag => {
    const p = pickSrc(tag); const u = abs(p.src); if (!u || BAD_IMG.test(u) || seen.has(u) || (p.w && p.w < 300)) return;
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
    return {
      url: u.href, site: meta(html, ['og:site_name']) || site, level: level(site),
      title: meta(html, ['og:title', 'twitter:title']) || (titleTag ? decode(titleTag[1]) : ''),
      description: meta(html, ['og:description', 'description']).slice(0, 300),
      image: og, images: md.images, videos: md.videos,
      published: meta(html, ['article:published_time', 'og:published_time', 'datePublished', 'pubdate', 'date'])
    };
  }
  return null;
}
async function commons(queries, per) {
  per = Math.max(4, Math.min(30, per || 8));
  const out = [], seen = new Set();
  await Promise.all(queries.slice(0, 8).map(async q => {
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=' + per + '&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&gsrsearch=' + encodeURIComponent(q);
    try {
      const j = await (await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(7000) })).json();
      Object.values((j.query && j.query.pages) || {}).forEach(p => {
        const ii = (p.imageinfo || [])[0]; if (!ii || seen.has(p.title)) return; seen.add(p.title);
        if (!/\.(jpe?g|png|webp)$/i.test(p.title)) return;
        const m = ii.extmetadata || {};
        out.push({ q, title: p.title.replace(/^File:/, ''), thumb: ii.thumburl || ii.url, url: ii.url, page: ii.descriptionurl, license: decode((m.LicenseShortName || {}).value || ''), author: decode((m.Artist || {}).value || '').slice(0, 80), credit: decode((m.Credit || {}).value || '').slice(0, 120) });
      });
    } catch (e) { }
  }));
  return out.slice(0, Math.max(30, per * 6));
}
async function doEnrich(urls, imageQueries) {
  const list = [...new Set((urls || []).filter(Boolean))].slice(0, 24);
  const pages = await Promise.all(list.map(u => openPage(u).then(p => p && Object.assign({ from: u }, p)).catch(() => null)));
  return { pages: pages.filter(Boolean), commons: await commons(imageQueries || [], 12), openverse: await openverse((imageQueries || []).slice(0, 4)) };
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
- Make the list diverse (different years, places, kinds of story). Do not list the same event twice.
- Keep names of people, places and the story title in the ORIGINAL language of the country (e.g. Japanese for Japan), and also give a Vietnamese title.

Return ONLY a JSON object (no prose, no markdown fence) with this exact shape:
{"topics":[{
 "title": "name of the story in its original language",
 "title_vi": "tên vụ việc bằng tiếng Việt",
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
  return list.filter(t => t && (t.title || t.title_vi)).slice(0, 20).map(t => ({ title: S(t.title || t.title_vi, 200), title_vi: S(t.title_vi || t.title, 200), date: S(t.date, 40), place: S(t.place, 120), status_vi: S(t.status_vi, 120), summary_vi: S(t.summary_vi, 700), why_vi: S(t.why_vi, 300), visuals_vi: S(t.visuals_vi, 300), queries: (Array.isArray(t.queries) ? t.queries : []).map(q => S(q, 120)).filter(Boolean).slice(0, 5), brief_en: S(t.brief_en, 1200) }));
}
// Gói Gemini miễn phí không có Google Search: tin mới → đọc tiêu đề Google News; vụ kinh điển → kiến thức sẵn có của AI
async function topicsFree(key, o, budget) {
  const t0 = Date.now(), left = () => Math.max(4000, budget - (Date.now() - t0));
  let heads = [], queries = [];
  if (o.period === 'd7' || o.period === 'd30' || o.period === 'y1') {
    const where = o.country && !/^(global|all|)$/i.test(o.country) ? o.country : 'the world';
    try { queries = ((await askJson(key, `Give 4 short Google News search queries, written in the main language of ${where}, that would surface recent news stories about: "${String(o.cat || '').slice(0, 120)}" in ${where}. Return ONLY JSON {"queries":["..."]}`, Math.min(10000, left()), true)).queries || []).map(q => String(q).slice(0, 80)).filter(Boolean).slice(0, 5); } catch (e) { if (e.code === 'GEMINI_LIMIT' || e.code === 'NO_API_KEY') throw e; }
    if (queries.length) heads = (await doNews(queries, o.period === 'd7' ? 168 : o.period === 'd30' ? 720 : 0).catch(() => [])).filter(x => o.period !== 'y1' || !x.t || Date.now() - x.t < 366 * 864e5).slice(0, 45);
  }
  const basis = heads.length >= 4 ? 'news' : 'known';
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
    const r2 = await gemini(key, { contents: [{ parts: [{ text: 'Convert the following research notes into JSON with the shape {"topics":[{"title","title_vi","date","place","status_vi","summary_vi","why_vi","visuals_vi","queries":[],"brief_en"}]}. Fields ending in _vi must be Vietnamese. Keep only real stories found in the notes.\n\nNOTES:\n"""' + r.text.slice(0, 20000) + '"""' }] }], generationConfig: { temperature: 0.1, responseMimeType: 'application/json' } }, 16000);
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
  const text = `You help a YouTube creator make a BETTER follow-up video about the same real-world story as a reference video, without copying it.
Use only the material below. Do not add facts about the story from your own memory.

REFERENCE VIDEO
Title: ${title}
Channel: ${String(v.channel || '').slice(0, 120)}
Published: ${String(v.published || '').slice(0, 40)} | Length: ${Number(v.minutes) || '?'} min | Views: ${Number(v.views) || '?'}
Tags: ${(Array.isArray(v.tags) ? v.tags : []).slice(0, 25).join(', ').slice(0, 600)}
Description: <<<${String(v.description || '').slice(0, 4000)}>>>

TRANSCRIPT ${tr ? '(given)' : '(NOT given)'}:
<<<${tr}>>>

TOP VIEWER COMMENTS (text | likes):
${cm || '(none)'}

Tasks:
1. Identify the real-world story the video is about.
2. List what the video ALREADY covers. With a transcript, base it on the transcript ("basis":"transcript", 8-14 points). Without one, infer only from title, description and chapters ("basis":"description", 3-8 cautious points).
3. From the comments, extract what viewers still ask, want more of, dispute, or say is missing. Keep real informational demand; skip jokes, praise and insults. Most-liked first.

Return ONLY JSON:
{"event_vi":"1-2 câu tiếng Việt: vụ việc là gì",
 "event_query":"a precise research brief in the video's ORIGINAL language (who, what, where, when) for finding news about this exact story",
 "lang":"ISO code of the video's language","when":"date or period, or empty","where":"place or empty","people":["key names"],
 "basis":"transcript|description",
 "covered":["điểm video đã nói, tiếng Việt, ngắn"],
 "asked":[{"q_vi":"điều người xem muốn biết, tiếng Việt","kind":"hỏi|thiếu|phản bác","quote":"short original snippet under 20 words","likes":0}],
 "hook_vi":"1 câu: tiêu đề và ảnh bìa đang hứa điều gì khiến người ta bấm"}
Up to 10 items in "asked".`;
  const j = await askJson(key, text, 50000, true);
  const A = (x, n) => (Array.isArray(x) ? x : []).slice(0, n), S = (x, n) => String(x == null ? '' : x).slice(0, n);
  return { scan: {
    event_vi: S(j.event_vi, 500), event_query: S(j.event_query, 400) || title, lang: S(j.lang, 8), when: S(j.when, 80), where: S(j.where, 120), people: A(j.people, 10).map(x => S(x, 80)).filter(Boolean),
    basis: tr && j.basis !== 'description' ? 'transcript' : 'description',
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
  const refMin = Number(d.minutes) || 0, target = Math.max(6, Math.round((refMin || 10) * 1.25));
  const lang = String(d.vlang || 'the reference video language').slice(0, 40);
  const text = `A creator will make a follow-up video on the same story as a reference video ("${String(d.title || '').slice(0, 200)}", about ${refMin || '?'} minutes).
(A) What the reference video already covers${d.basis === 'transcript' ? ' (from its transcript)' : ' (INFERRED from its title and description only - treat as uncertain)'}:
${covered.map(x => '- ' + x).join('\n') || '(unknown)'}

(B) What its viewers ask for in the comments:
${asked.map(x => '- ' + x).join('\n') || '(nothing useful)'}

(C) DOSSIER researched from news sources. "src" numbers point to sources:
${dj}

Find what the DOSSIER contains that the reference video did NOT cover: that is the new value for viewers.
Rules: use ONLY facts in the DOSSIER and keep their src numbers. Never invent. Items taken from "unverified" or "reported_claims" must get confidence "chưa kiểm chứng". If a viewer question in (B) is answered by the dossier, name it in "answers_vi". Viewer questions the dossier cannot answer go to "open_questions".
The new video should run about ${target} minutes (roughly 25% more than the reference), and about a quarter to a third of it must be information the reference video lacks. Do not reuse the reference video's wording or structure.

Return ONLY JSON:
{"new_share_pct": 0,
 "gaps":[{"point_vi":"điểm mới, 1 câu","detail_vi":"1-2 câu có tên, ngày, con số cụ thể","answers_vi":"câu hỏi của người xem mà nó trả lời, hoặc rỗng","src":[1],"confidence":"có nguồn|chưa kiểm chứng"}],
 "open_questions":["câu hỏi của người xem mà hồ sơ chưa trả lời được"],
 "angle_vi":"1-2 câu: cùng vụ việc, video mới hứa điều gì khác",
 "titles":[{"t":"title in ${lang}","vi":"nghĩa tiếng Việt"}],
 "outline":[{"part":"tên đoạn","minutes":1,"content_vi":"đoạn này nói gì","is_new":true}],
 "target_minutes": ${target}}
"new_share_pct" = your estimate (integer) of the share of dossier facts absent from the reference video. Give 6-12 gaps (most valuable to viewers first), exactly 5 titles that promise the NEW information, and 6-9 outline parts whose minutes add up to about ${target}; open with the strongest new point and keep the shared background short.`;
  const j = await askJson(key, text, 50000, true);
  const A = (x, n) => (Array.isArray(x) ? x : []).slice(0, n), S = (x, n) => String(x == null ? '' : x).slice(0, n);
  return { gaps: {
    new_share_pct: Math.max(0, Math.min(100, Math.round(Number(j.new_share_pct) || 0))),
    gaps: A(j.gaps, 14).map(x => ({ point_vi: S(x && x.point_vi, 300), detail_vi: S(x && x.detail_vi, 500), answers_vi: S(x && x.answers_vi, 260), src: A(x && x.src, 6).map(Number).filter(n => n > 0 && n < 200), confidence: /chưa/i.test(String(x && x.confidence)) ? 'chưa kiểm chứng' : 'có nguồn' })).filter(x => x.point_vi),
    open_questions: A(j.open_questions, 10).map(x => S(x, 260)).filter(Boolean),
    angle_vi: S(j.angle_vi, 500),
    titles: A(j.titles, 6).map(x => ({ t: S(x && x.t, 140), vi: S(x && x.vi, 200) })).filter(x => x.t),
    outline: A(j.outline, 10).map(x => ({ part: S(x && x.part, 100), minutes: Math.round((Number(x && x.minutes) || 0) * 10) / 10, content_vi: S(x && x.content_vi, 400), is_new: !!(x && x.is_new) })).filter(x => x.part),
    target_minutes: target, ref_minutes: refMin, basis: d.basis === 'transcript' ? 'transcript' : 'description'
  } };
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

module.exports = { gemini, doRideScan, doRideGaps, doAsk, doTranslate, doAudience, doSeo, doScript, scriptStats, model: MODEL, models: MODELS, wiki, bingNews, searchFree, topicsFree, doTopics, topicsPrompt, cleanTopics, doImages, openverse, fetchImage, privateIp, doTitles, titlesPrompt, level, mediaFrom, doInsight, doSearch, doStructure, doNews, doEnrich, annotate, parseRss, parseJson, safeUrl, guessLang, searchPrompt, structurePrompt };
