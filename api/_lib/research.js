// TẠO TÀI NGUYÊN — logic máy chủ (không phụ thuộc Vercel, test được bằng node).
// B1 search   : Gemini + Google Search viết báo cáo có trích nguồn thật (groundingMetadata)
// B2 structure: Gemini (JSON) chuẩn hoá thành hồ sơ: tóm tắt, timeline, số liệu, trích dẫn, thực thể, truy vấn YouTube/ảnh, nguồn gốc
// B3 enrich   : mở link nguồn → URL thật, tiêu đề, ảnh đại diện (og:image), ngày đăng; ảnh Wikimedia Commons (có giấy phép)
// B0 news     : Google News RSS (miễn phí, luôn chạy; là phương án dự phòng khi Gemini lỗi/hết lượt)
'use strict';

const MODEL = () => process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const UA = 'Mozilla/5.0 (compatible; YouTrendResearch/1.0; +https://youtubetrend-rho.vercel.app)';

async function gemini(key, body, timeoutMs) {
  if (!key) { const e = new Error('NO_API_KEY'); e.code = 'NO_API_KEY'; throw e; }
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs || 24000)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error('Gemini ' + r.status + ': ' + ((j.error && j.error.message) || '').slice(0, 200));
    e.code = r.status === 429 ? 'GEMINI_LIMIT' : 'GEMINI_ERROR'; throw e;
  }
  const c = (j.candidates || [])[0] || {};
  const text = ((c.content && c.content.parts) || []).map(p => p.text || '').join('');
  if (!text) { const e = new Error('Gemini trả về rỗng'); e.code = 'GEMINI_EMPTY'; throw e; }
  return { text, meta: c.groundingMetadata || {} };
}

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

async function doSearch(key, prompt, ctx, hours) {
  const r = await gemini(key, { contents: [{ parts: [{ text: searchPrompt(prompt, ctx, hours) }] }], tools: [{ google_search: {} }], generationConfig: { temperature: 0.2 } }, 26000);
  return annotate(r.text, r.meta);
}
async function doStructure(key, prompt, report, sources, lang) {
  const r = await gemini(key, { contents: [{ parts: [{ text: structurePrompt(prompt, report, sources || [], lang) }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }, 26000);
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
async function openPage(u0) {
  let u = safeUrl(u0); if (!u) return null;
  for (let hop = 0; hop < 5; hop++) {
    const r = await fetch(u.href, { redirect: 'manual', headers: { 'User-Agent': UA, Accept: 'text/html' }, signal: AbortSignal.timeout(7000) });
    if (r.status >= 300 && r.status < 400 && r.headers.get('location')) { u = safeUrl(new URL(r.headers.get('location'), u).href); if (!u) return null; continue; }
    if (!r.ok || !/html/i.test(r.headers.get('content-type') || '')) return { url: u.href, site: u.hostname.replace(/^www\./, '') };
    const reader = r.body.getReader(); let html = '', got = 0;
    while (got < 400000) { const { done, value } = await reader.read(); if (done) break; got += value.length; html += Buffer.from(value).toString('utf8'); if (/<\/head>/i.test(html)) break; }
    try { reader.cancel(); } catch (e) { }
    const img = meta(html, ['og:image', 'twitter:image', 'twitter:image:src']);
    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    return {
      url: u.href, site: meta(html, ['og:site_name']) || u.hostname.replace(/^www\./, ''),
      title: meta(html, ['og:title', 'twitter:title']) || (titleTag ? decode(titleTag[1]) : ''),
      description: meta(html, ['og:description', 'description']).slice(0, 300),
      image: img ? new URL(img, u).href : '',
      published: meta(html, ['article:published_time', 'og:published_time', 'datePublished', 'pubdate', 'date'])
    };
  }
  return null;
}
async function commons(queries) {
  const out = [], seen = new Set();
  await Promise.all(queries.slice(0, 6).map(async q => {
    const u = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrnamespace=6&gsrlimit=8&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&gsrsearch=' + encodeURIComponent(q);
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
  return out.slice(0, 30);
}
async function doEnrich(urls, imageQueries) {
  const list = [...new Set((urls || []).filter(Boolean))].slice(0, 14);
  const pages = await Promise.all(list.map(u => openPage(u).then(p => p && Object.assign({ from: u }, p)).catch(() => null)));
  return { pages: pages.filter(Boolean), commons: await commons(imageQueries || []) };
}

module.exports = { doSearch, doStructure, doNews, doEnrich, annotate, parseRss, parseJson, safeUrl, guessLang, searchPrompt, structurePrompt };
