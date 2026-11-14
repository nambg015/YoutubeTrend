// =========================================================================
// TẠO TÀI NGUYÊN v1 — đưa thông tin một vụ việc → hồ sơ tài nguyên làm video:
// tin mới nhất (có nguồn), timeline, số liệu, trích dẫn, video YouTube liên quan (họp báo, bản tin, hiện trường, audio...),
// hình ảnh (kèm giấy phép), tài liệu gốc theo từng loại sự kiện → xuất PROMPT văn bản + JSON.
// window.ResourceStudio (React, không JSX) • window.ResourceEngine (hàm thuần, test được)
// =========================================================================
(function (root, factory) {
  var E = factory();
  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.ResourceEngine = E;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var DAY = 864e5;
  var TYPES = {
    press: ['🎙️', 'Họp báo / phát biểu'], official: ['🏛️', 'Kênh chính thức'], news: ['📺', 'Bản tin'], footage: ['📹', 'Cảnh quay hiện trường'],
    audio: ['🎧', 'Âm thanh / ghi âm'], analysis: ['🧠', 'Phân tích / giải thích'], background: ['📚', 'Bối cảnh'], other: ['🎞️', 'Khác']
  };
  var TYPE_ORDER = ['press', 'official', 'footage', 'audio', 'news', 'analysis', 'background', 'other'];
  var GOV = /\b(NTSB|FAA|NASA|NOAA|USGS|FEMA|FBI|DOJ|Department|Dept\.?|Police|Sheriff|Fire Rescue|Fire Department|Coast Guard|White House|Senate|Congress|City of|County of|Ministry|Government|Gov\b|\.gov|U\.S\. Army|U\.S\. Navy|Air Force|Marine Corps|CDC|NIH|State of)\b/i;
  var STOP = new Set('the a an and or of in on at to for from with by is are was were be been this that these those it its as into about after before over new latest update video news vụ việc những các của và là có cho khi đã đang một này với tại trong từ được người theo làm'.split(' '));

  function iso(s) { var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
  function dur(s) { s = Math.round(s || 0); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); }
  function fmtN(n) { n = +n || 0; return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n)); }
  function chunk(a, n) { var r = []; for (var i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; }
  function ymd(t) { return t ? new Date(t).toISOString().slice(0, 10) : ''; }
  function ytId(u) { var m = /(?:youtu\.be\/|v=|shorts\/|embed\/|live\/)([\w-]{11})/.exec(String(u || '')); return m ? m[1] : (/^[\w-]{11}$/.test(String(u || '').trim()) ? String(u).trim() : ''); }
  function keywords(text, n) {
    var cnt = {}, w = String(text || '').replace(/https?:\/\/\S+/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}\-']*/gu) || [];
    w.forEach(function (x, i) { var k = x.toLowerCase(); if (k.length < 3 || STOP.has(k)) return; cnt[x] = (cnt[x] || 0) + 1 + (/^[A-Z0-9]/.test(x) ? 1 : 0) + (/\d/.test(x) && /[A-Za-z]/.test(x) ? 2 : 0) - i * 0.001; });
    return Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, n || 8);
  }
  // Chế độ miễn phí: dựng hồ sơ tối thiểu từ prompt
  function freeDossier(prompt) {
    var k = keywords(prompt, 8), base = k.slice(0, 5).join(' ');
    return {
      title: String(prompt).split(/[\n.!?]/)[0].slice(0, 120), category: 'other', event_date: null, status: '', summary: '',
      latest: [], timeline: [], numbers: [], quotes: [], entities: { people: [], organizations: [], places: [], objects: [] },
      match_keywords: k, unverified: [], sensitivity: '', angles: [], official_sources: [],
      youtube_queries: [[base, 'news'], [base + ' press conference', 'press'], [base + ' footage', 'footage'], [base + ' audio', 'audio'], [base + ' explained', 'analysis'], [k.slice(0, 3).join(' '), 'news']].map(function (x) { return { q: x[0], type: x[1], why: '' }; }),
      image_queries: [base, k.slice(0, 3).join(' ')].map(function (q) { return { q: q, what: '' }; }),
      news_queries: [base, k.slice(0, 3).join(' ')]
    };
  }

  // ---------- Phân loại video ----------
  function classify(title, desc, chTitle, hint, gov) {
    var t = (title + ' ' + (desc || '').slice(0, 300)).toLowerCase();
    if (/press conference|news conference|briefing|press briefing|media briefing|statement|remarks|họp báo|phát biểu|conférence de presse|pressekonferenz|記者会見|기자회견/.test(t)) return 'press';
    if (gov) return 'official';
    if (/\batc\b|air traffic control|cockpit voice|mayday|911 call|dispatch audio|radio traffic|liveatc|recording|audio|ghi âm|bodycam audio/.test(t)) return 'audio';
    if (/caught on camera|footage|dashcam|surveillance|cctv|eyewitness|on scene|scene video|drone video|moment|video shows|aftermath|raw video|bodycam|hiện trường|khoảnh khắc|clip/.test(t)) return 'footage';
    if (/explained|analysis|breakdown|what happened|why |how |deep dive|investigat|lessons|giải thích|phân tích|vì sao|tại sao/.test(t)) return 'analysis';
    if (/news|live|report|update|breaking|nbc|cbs|abc|cnn|fox|wsvn|wpbf|wptv|bản tin|tin tức|thời sự/.test(t + ' ' + chTitle.toLowerCase())) return 'news';
    return TYPES[hint] ? hint : 'other';
  }
  function chapters(desc) {
    var out = [];
    String(desc || '').split('\n').forEach(function (l) {
      var m = /^\s*[\(\[]?((?:\d{1,2}:)?\d{1,2}:\d{2})[\)\]]?\s*[-–—:|]?\s*(.{2,90})$/.exec(l) || /^\s*(.{2,90}?)\s*[-–—:|]\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*$/.exec(l);
      if (!m) return; var ts = /\d:\d{2}$/.test(m[1]) ? m[1] : m[2], lb = ts === m[1] ? m[2] : m[1];
      out.push({ t: ts, label: lb.trim() });
    });
    return out.length >= 2 ? out.slice(0, 25) : [];
  }
  function relevance(v, kws) {
    var t = v.title.toLowerCase(), d = (v.desc || '').slice(0, 600).toLowerCase(), s = 0, hit = [];
    kws.forEach(function (k) { k = String(k).toLowerCase().trim(); if (k.length < 2) return; if (t.indexOf(k) >= 0) { s += 2; hit.push(k); } else if (d.indexOf(k) >= 0) { s += 1; hit.push(k); } });
    return { s: s, hit: hit };
  }

  // ---------- Thu thập video YouTube ----------
  // o: {yt(path,params), dossier, hours, maxQueries, onProgress, now}
  async function collectVideos(o) {
    var D = o.dossier, now = o.now || Date.now(), yt = o.yt, say = o.onProgress || function () { };
    var kws = (D.match_keywords || []).concat(((D.entities || {}).objects || []).map(function (x) { return x.id; }).filter(Boolean));
    var orgs = ((D.entities || {}).organizations || []).map(function (x) { return String(x.name || '').toLowerCase(); }).filter(function (x) { return x.length > 2; });
    var evT = D.event_date ? Date.parse(D.event_date) : NaN;
    var after = o.hours ? now - o.hours * 3600e3 : 0;
    if (!isNaN(evT) && (!after || evT - 2 * DAY < after)) after = Math.max(after || 0, evT - 2 * DAY);
    var qs = (D.youtube_queries || []).slice(0, o.maxQueries || 8), found = {}, units = 0;
    for (var gi = 0, gs = chunk(qs, 3); gi < gs.length; gi++) {
      await Promise.all(gs[gi].map(async function (q) {
        var p = { part: 'snippet', type: 'video', maxResults: 25, q: q.q, order: 'relevance', safeSearch: 'none' };
        if (after && q.type !== 'background') p.publishedAfter = new Date(after).toISOString();
        try { var r = await yt('search', p); units += 100; (r.items || []).forEach(function (it, rank) { var id = it.id && it.id.videoId; if (!id) return; var f = found[id] = found[id] || { hints: [], rank: 99, qs: [] }; f.hints.push(q.type); f.rank = Math.min(f.rank, rank); f.qs.push(q.q); }); }
        catch (e) { if (e && (e.code === 'quotaExceeded' || /quota/i.test(e.message || ''))) throw e; }
      }));
      say('🎬 Tìm video ' + Math.min(qs.length, (gi + 1) * 3) + '/' + qs.length + ' truy vấn • ' + Object.keys(found).length + ' video');
    }
    var ids = Object.keys(found), out = [];
    for (var ci = 0, cs = chunk(ids, 50); ci < cs.length; ci++) {
      var vr = await yt('videos', { part: 'snippet,statistics,contentDetails', id: cs[ci].join(',') }); units += 1;
      (vr.items || []).forEach(function (v) {
        var sn = v.snippet || {}, f = found[v.id], chT = sn.channelTitle || '';
        var gov = GOV.test(chT) || orgs.some(function (o2) { return chT.toLowerCase().indexOf(o2) >= 0; });
        var x = { id: v.id, title: sn.title || '', channel: chT, channelId: sn.channelId, t: Date.parse(sn.publishedAt), views: +(v.statistics || {}).viewCount || 0, dur: iso((v.contentDetails || {}).duration), desc: sn.description || '', live: sn.liveBroadcastContent, gov: gov, qs: f.qs, rank: f.rank };
        x.type = classify(x.title, x.desc, chT, f.hints[0], gov);
        if (!isNaN(evT) && x.t < evT - DAY && x.type !== 'background') x.type = 'background';
        var r = relevance(x, kws); x.rel = r.s; x.hit = r.hit; x.chapters = chapters(x.desc); x.desc = x.desc.slice(0, 500);
        x.related = x.rel >= 2 || (x.rel >= 1 && f.hints.length >= 2) || (!kws.length && f.rank < 5);
        x.license = gov ? 'Kênh cơ quan nhà nước — tác phẩm của chính phủ Mỹ thường là public domain, vẫn nên kiểm tra và ghi nguồn' : 'Bản quyền thuộc kênh ' + chT + ' — chỉ dùng trích đoạn ngắn có bình luận, ghi nguồn';
        out.push(x);
      });
    }
    out.sort(function (a, b) { return (b.related - a.related) || (TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)) || (b.rel - a.rel) || (b.views - a.views); });
    return { videos: out, units: units };
  }

  // ---------- Link tra cứu theo loại sự kiện ----------

  // ---------- Dò YouTube xem đã có ai làm video về vụ này chưa: so tên vụ với tiêu đề video ----------
  var CJK_RE = /[぀-ヿ㐀-鿿가-힯]/;
  var COVER_STOP = { the: 1, of: 1, and: 1, 'in': 1, a: 1, 'case': 1, cases: 1, murder: 1, murders: 1, killing: 1, killings: 1, killer: 1, killers: 1, serial: 1, massacre: 1, missing: 1, disappearance: 1, unsolved: 1, mysterious: 1, death: 1, deaths: 1, incident: 1, mystery: 1, story: 1, true: 1, crime: 1, vu: 1, an: 1, vuan: 1, cua: 1, tai: 1, de: 1, la: 1, el: 1, del: 1, los: 1, las: 1, caso: 1, der: 1, die: 1, das: 1, fall: 1, le: 1, les: 1, du: 1, affaire: 1 };
  function coverNorm(t) { return String(t || '').normalize('NFKC').toLowerCase(); }
  function coverLatin(t) { return coverNorm(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim(); }
  // Trả 0..1: tiêu đề video khớp tên vụ tới mức nào. Từ 0.5 trở lên (và có phần riêng của tên vụ) coi là cùng vụ.
  function coverScore(name0, title) {
    var name = coverNorm(name0); title = coverNorm(title); if (!name || !title) return 0;
    if (CJK_RE.test(name)) {
      var strip = function (x) { return x.replace(/[^぀-ヿ㐀-鿿가-힯a-z0-9]/g, ''); };
      var core = strip(name).replace(/(事件|事故|사건|사고|案件|案)$/, ''), tt = strip(title);
      if (core.length < 2) return 0;
      if (tt.indexOf(core) >= 0) return 1;
      var grams = []; for (var i = 0; i < core.length - 1; i++) grams.push(core.slice(i, i + 2));
      var hit = grams.filter(function (g) { return tt.indexOf(g) >= 0; }).length, ratio = hit / grams.length;
      // 2 chữ đầu thường là tên riêng (địa danh, tên người): thiếu nó thì phải khớp gần hết mới tính
      return tt.indexOf(grams[0]) >= 0 ? ratio : (ratio >= 0.8 ? ratio : ratio * 0.5);
    }
    var tk = [], P = [], seen = {};
    String(name0 || '').normalize('NFKC').split(/[^\p{L}\p{N}]+/u).filter(Boolean).forEach(function (w0) {
      var w = coverLatin(w0); if (!w || seen[w]) return; if (w.length < 3 || COVER_STOP[w]) return; seen[w] = 1;
      tk.push(w); if (w0[0] !== w0[0].toLowerCase() || /\d/.test(w0)) P.push(w);          // viết hoa hoặc có số = tên riêng
    });
    if (!tk.length) tk = coverLatin(name).split(' ').filter(Boolean); if (!tk.length) return 0;
    if (!P.length) P = tk;
    var tw = ' ' + coverLatin(title) + ' ';
    var has = function (w) { return tw.indexOf(' ' + w + ' ') >= 0 || (w.length >= 5 && tw.indexOf(w) >= 0); };
    var r = tk.filter(has).length / tk.length, pr = P.filter(has).length / P.length;
    // đủ mọi tên riêng của vụ là coi như cùng vụ; thiếu thì phải khớp phần lớn các từ còn lại
    return pr === 1 ? Math.max(r, 0.6) : (has(P[0]) ? Math.max(pr, r) * 0.9 : r * 0.5);
  }
  // items: [{id,title,channel,views,t,dur}] → những video cùng vụ, nhiều view trước
  function coverMatch(names, items) {
    names = (Array.isArray(names) ? names : [names]).filter(Boolean);
    return (items || []).map(function (v) { var sc = 0; names.forEach(function (n) { sc = Math.max(sc, coverScore(n, v.title)); }); return Object.assign({}, v, { score: sc }); })
      .filter(function (v) { return v.score >= 0.5; }).sort(function (a, b) { return (b.views || 0) - (a.views || 0); });
  }

  function topicLinks(D, prompt) {
    var out = [], ents = D.entities || {}, objs = ents.objects || [], base = (D.match_keywords || keywords(prompt, 5)).slice(0, 4).join(' ') || D.title || prompt;
    var g = function (q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); };
    var add = function (group, name, url, what) { out.push({ group: group, name: name, url: url, what: what || '' }); };
    var tail = (objs.map(function (o) { return o.id; }).join(' ') + ' ' + prompt).match(/\b(N[1-9][0-9A-HJ-NP-Z]{1,5}|[A-Z]{1,2}-[A-Z0-9]{3,5}|VN-[A-Z0-9]{4,5})\b/g) || [];
    var isAir = D.category === 'aviation' || tail.length || /plane|aircraft|jet|airline|flight|crash landing|máy bay|chuyến bay/i.test(prompt + ' ' + (D.title || ''));
    if (isAir) {
      Array.from(new Set(tail)).slice(0, 3).forEach(function (r) {
        add('✈️ Máy bay ' + r, 'JetPhotos — ảnh thật của đúng chiếc máy bay', 'https://www.jetphotos.com/registration/' + r, 'Ảnh có bản quyền của người chụp — xin phép trước khi dùng');
        add('✈️ Máy bay ' + r, 'Planespotters — lịch sử & ảnh', 'https://www.planespotters.net/search?q=' + r);
        add('✈️ Máy bay ' + r, 'FlightAware — lịch sử chuyến bay', 'https://www.flightaware.com/live/flight/' + r);
        add('✈️ Máy bay ' + r, 'ADS-B Exchange — đường bay / quỹ đạo', 'https://globe.adsbexchange.com/?reg=' + r, 'Xem lại quỹ đạo, độ cao, tốc độ theo thời gian');
        if (/^N/.test(r)) add('✈️ Máy bay ' + r, 'FAA Registry — chủ sở hữu, đời máy', 'https://registry.faa.gov/AircraftInquiry/Search/NNumberResult?nNumberTxt=' + r, 'Dữ liệu chính phủ Mỹ');
        add('✈️ Máy bay ' + r, 'Aviation Safety Network — hồ sơ tai nạn', g('site:aviation-safety.net ' + r));
      });
      add('🏛️ Điều tra hàng không', 'NTSB CAROL — tra hồ sơ điều tra', 'https://data.ntsb.gov/carol-main-public/basic-search', 'Báo cáo sơ bộ/cuối cùng, docket (public domain)');
      add('🏛️ Điều tra hàng không', 'NTSB — họp báo & tin mới trên YouTube', 'https://www.youtube.com/results?search_query=' + encodeURIComponent('NTSB media briefing ' + base) + '&sp=CAI%253D');
      add('🎧 Ghi âm', 'LiveATC — kho ghi âm kiểm soát không lưu', 'https://www.liveatc.net/archive.php', 'Chọn sân bay + giờ UTC của sự kiện');
      add('🎧 Ghi âm', 'Tìm bản ATC đã được đăng lại', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(base + ' ATC audio'));
    }
    if (D.category === 'maritime' || /ship|vessel|boat|cruise|tàu|thuyền/i.test(prompt)) {
      add('🚢 Hàng hải', 'MarineTraffic — vị trí & lịch sử tàu', g('site:marinetraffic.com ' + base));
      add('🚢 Hàng hải', 'US Coast Guard — thông cáo', g('site:news.uscg.mil ' + base));
    }
    if (/crime|war|politics/.test(D.category || '') || /police|court|trial|lawsuit|arrest|murder|charged|cảnh sát|tòa|bắt giữ|vụ án/i.test(prompt)) {
      add('⚖️ Pháp lý', 'CourtListener — hồ sơ toà án', 'https://www.courtlistener.com/?q=' + encodeURIComponent(base));
      add('⚖️ Pháp lý', 'Thông cáo DOJ / cảnh sát', g(base + ' (site:justice.gov OR "police department" press release)'));
      add('⚖️ Pháp lý', 'Bodycam / họp báo cảnh sát trên YouTube', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(base + ' bodycam OR press conference'));
    }
    if (/disaster|weather/.test(D.category || '') || /earthquake|hurricane|storm|flood|wildfire|tornado|động đất|bão|lũ|cháy rừng/i.test(prompt)) {
      add('🌪️ Thiên tai', 'USGS — dữ liệu động đất', 'https://earthquake.usgs.gov/earthquakes/map/');
      add('🌪️ Thiên tai', 'NOAA / NHC — bão', 'https://www.nhc.noaa.gov/');
      add('🌪️ Thiên tai', 'NASA Earth Observatory — ảnh vệ tinh (public domain)', g('site:earthobservatory.nasa.gov ' + base));
      add('🌪️ Thiên tai', 'Copernicus EMS — bản đồ thiệt hại', 'https://emergency.copernicus.eu/mapping/list-of-activations-rapid');
    }
    if (/business|tech/.test(D.category || '')) {
      add('💼 Doanh nghiệp', 'SEC EDGAR — hồ sơ công ty niêm yết', 'https://efts.sec.gov/LATEST/search-index?q=' + encodeURIComponent('"' + base + '"'));
      add('💼 Doanh nghiệp', 'Thông cáo báo chí chính thức', g(base + ' press release'));
    }
    (D.official_sources || []).forEach(function (s) { if (s && s.name) add('🏛️ Nguồn gốc AI gợi ý', s.name, s.url || g(s.name + ' ' + base), (s.what || '') + (s.url ? ' • link do AI gợi ý, hãy kiểm tra' : '')); });
    add('🔎 Tìm rộng', 'Google News — tin mới nhất', 'https://news.google.com/search?q=' + encodeURIComponent(base));
    add('🔎 Tìm rộng', 'AP News', 'https://apnews.com/search?q=' + encodeURIComponent(base));
    add('🔎 Tìm rộng', 'Reuters', 'https://www.reuters.com/site-search/?query=' + encodeURIComponent(base));
    add('🔎 Tìm rộng', 'X (Twitter) — bài mới nhất, video người dân quay', 'https://x.com/search?q=' + encodeURIComponent(base) + '&f=live');
    add('🔎 Tìm rộng', 'Reddit — thảo luận, video, ảnh', 'https://www.reddit.com/search/?q=' + encodeURIComponent(base) + '&sort=new');
    add('🔎 Tìm rộng', 'YouTube — mới nhất', 'https://www.youtube.com/results?search_query=' + encodeURIComponent(base) + '&sp=CAI%253D');
    return out;
  }
  function imageLinks(D) {
    return (D.image_queries || []).map(function (x) {
      return { q: x.q, what: x.what || '', google: 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(x.q), getty: 'https://www.gettyimages.com/search/2/image?family=editorial&phrase=' + encodeURIComponent(x.q), commons: 'https://commons.wikimedia.org/w/index.php?search=' + encodeURIComponent(x.q) + '&title=Special:MediaSearch&type=image' };
    });
  }

  // ---------- Xuất PROMPT + JSON ----------
  function srcLabel(n, R) { return (n || []).map(function (i) { return '[' + i + ']'; }).join(''); }
  function pad(n, w) { n = String(n); while (n.length < (w || 3)) n = '0' + n; return n; }
  function buildPrompt(R, sel) {
    var D = R.dossier, L = [], E2 = D.entities || {};
    var vids = R.videos.filter(function (v) { return sel.v[v.id]; }), imgs = R.images.filter(function (i) { return sel.i[i.key]; });
    var sec = function (t) { L.push('', '## ' + t); };
    L.push('# HỒ SƠ TÀI NGUYÊN VIDEO — ' + (D.title || 'Không tên'));
    L.push('Tạo lúc: ' + new Date(R.at).toLocaleString('vi-VN') + ' • Chế độ: ' + (R.mode === 'ai' ? (R.grounded === false ? 'Gemini đọc Wikipedia + tin tức (không có Google Search)' : 'Gemini + Google Search') : 'miễn phí (Google News + YouTube)') + (D.category ? ' • Danh mục: ' + D.category : '') + (D.event_date ? ' • Ngày sự kiện: ' + D.event_date : '') + (D.status ? ' • Tình trạng: ' + D.status : ''));
    L.push('Ghi chú: mọi thông tin có [n] đều dẫn tới mục NGUỒN ở cuối. Mục "CHƯA XÁC MINH" không được nói như sự thật.');
    sec('YÊU CẦU GỐC CỦA NGƯỜI LÀM VIDEO'); L.push(R.prompt);
    if (D.summary) { sec('TÓM TẮT'); L.push(D.summary); }
    if ((D.latest || []).length) { sec('CẬP NHẬT MỚI NHẤT'); D.latest.forEach(function (x) { L.push('- ' + (x.date ? '[' + x.date + '] ' : '') + x.text + ' ' + srcLabel(x.src)); }); }
    if ((D.timeline || []).length) { sec('DÒNG THỜI GIAN'); D.timeline.forEach(function (x) { L.push('- ' + (x.time ? x.time + ' — ' : '') + x.text + ' ' + srcLabel(x.src)); }); }
    if ((D.numbers || []).length) { sec('SỐ LIỆU'); D.numbers.forEach(function (x) { L.push('- ' + x.label + ': ' + x.value + ' ' + srcLabel(x.src)); }); }
    if ((D.quotes || []).length) { sec('TRÍCH DẪN NGUYÊN VĂN'); D.quotes.forEach(function (x) { L.push('- "' + x.quote + '" — ' + x.who + (x.role ? ', ' + x.role : '') + (x.date ? ' (' + x.date + ')' : '') + ' ' + srcLabel(x.src)); }); }
    var ent = [].concat((E2.people || []).map(function (x) { return 'Người: ' + x.name + (x.role ? ' — ' + x.role : ''); }), (E2.organizations || []).map(function (x) { return 'Tổ chức: ' + x.name + (x.role ? ' — ' + x.role : ''); }), (E2.places || []).map(function (x) { return 'Địa điểm: ' + x.name + (x.note ? ' — ' + x.note : ''); }), (E2.objects || []).map(function (x) { return 'Đối tượng: ' + x.name + (x.id ? ' (' + x.id + ')' : '') + (x.note ? ' — ' + x.note : ''); }));
    if (ent.length) { sec('NHÂN VẬT • TỔ CHỨC • ĐỊA ĐIỂM • ĐỐI TƯỢNG'); ent.forEach(function (x) { L.push('- ' + x); }); }
    if (vids.length) {
      sec('VIDEO YOUTUBE ĐÃ CHỌN (' + vids.length + ')');
      vids.forEach(function (v, i) {
        L.push('V' + (i + 1) + '. [' + TYPES[v.type][1] + '] ' + v.title);
        L.push('    Kênh: ' + v.channel + (v.gov ? ' (chính thức)' : '') + ' • ' + dur(v.dur) + ' • ' + fmtN(v.views) + ' view • đăng ' + ymd(v.t));
        L.push('    Link: https://www.youtube.com/watch?v=' + v.id);
        if (v.chapters.length) L.push('    Mốc thời gian: ' + v.chapters.map(function (c) { return c.t + ' ' + c.label; }).join(' | '));
        L.push('    Bản quyền: ' + v.license);
      });
    }
    var frames = frameList(R).filter(function (f) { return sel.f && sel.f[f.key]; }), caps = (R.captures || []).filter(function (c) { return !sel.c || sel.c[c.key] !== false; }), wv = (R.webVideos || []).filter(function (w) { return sel.w && sel.w[w.key]; });
    if (frames.length || caps.length) {
      sec('KHUNG HÌNH TỪ VIDEO YOUTUBE (' + (frames.length + caps.length) + ')');
      frames.forEach(function (f, i) { L.push('F' + pad(i + 1, 2) + '. Khung hình ' + f.label + ' của "' + f.title + '" (' + f.channel + ')'); L.push('    Ảnh: ' + f.url + '  •  bản lớn: ' + f.big); L.push('    Video: https://www.youtube.com/watch?v=' + f.id); });
      caps.forEach(function (c, i) { L.push('C' + pad(i + 1, 2) + '. Ảnh chụp tại ' + (c.t != null ? dur(c.t) : '?') + ' của "' + c.title + '" — https://www.youtube.com/watch?v=' + c.videoId + (c.t != null ? '&t=' + Math.floor(c.t) + 's' : '') + ' (file ảnh lưu trong phiên YouTrend)'); });
    }
    if (wv.length) {
      sec('VIDEO NHÚNG TRONG BÀI BÁO (' + wv.length + ')');
      wv.forEach(function (w, i) { L.push('W' + (i + 1) + '. [' + LV[w.level || 'other'] + '] ' + w.url + '  — từ bài: ' + (w.pageTitle || w.site) + ' (' + w.page + ')'); });
    }
    if (imgs.length) {
      sec('HÌNH ẢNH ĐÃ CHỌN (' + imgs.length + ')');
      imgs.forEach(function (x, i) { L.push('I' + pad(i + 1) + '. [' + x.kind + '] ' + x.title); L.push('    File trong gói zip: anh/I' + pad(i + 1) + '_…  •  Ảnh gốc: ' + x.url + (x.page ? '\n    Trang gốc: ' + x.page : '')); L.push('    Bản quyền: ' + x.license); });
    }
    if ((R.imageLinks || []).length) { sec('TÌM THÊM ẢNH (link tìm kiếm)'); R.imageLinks.forEach(function (x) { L.push('- ' + x.q + (x.what ? ' — ' + x.what : '') + ': ' + x.google); }); }
    if ((R.links || []).length) { sec('TÀI LIỆU GỐC & DỮ LIỆU TRA CỨU'); R.links.forEach(function (x) { L.push('- ' + x.group + ' • ' + x.name + ': ' + x.url + (x.what ? ' — ' + x.what : '')); }); }
    var news = (R.news || []).slice(0, 15);
    if (news.length) { sec('TIN TỨC MỚI NHẤT (Google News)'); news.forEach(function (x) { L.push('- [' + (x.t ? new Date(x.t).toLocaleString('vi-VN') : '?') + '] ' + x.title + (x.source ? ' — ' + x.source : '') + '\n  ' + x.link); }); }
    if ((D.angles || []).length) { sec('GÓC KHAI THÁC / HOOK GỢI Ý'); D.angles.forEach(function (x) { L.push('- ' + x.hook + (x.why ? ' — ' + x.why : '')); }); }
    if ((D.reported_claims || []).length) { sec('TIN ĐANG ĐƯỢC ĐƯA NHƯNG CHƯA CÓ XÁC NHẬN CHÍNH THỨC — CHỈ DÙNG VỚI CÂU DẪN RÀO ĐÓN'); D.reported_claims.forEach(function (x) { L.push('- ' + x.claim + (x.reported_by ? ' (nguồn: ' + x.reported_by + ')' : '') + ' ' + srcLabel(x.src)); if (x.phrasing_en) L.push('  Câu đọc gợi ý: "' + x.phrasing_en + '"'); }); }
    if ((D.unverified || []).length) { sec('CHƯA XÁC MINH — KHÔNG NÓI NHƯ SỰ THẬT'); D.unverified.forEach(function (x) { L.push('- ' + x); }); }
    if (D.sensitivity) { sec('LƯU Ý NHẠY CẢM'); L.push(D.sensitivity); }
    if ((R.sources || []).length) { sec('NGUỒN'); R.sources.forEach(function (s) { L.push('[' + s.n + '] ' + (s.realTitle || s.title) + ' — ' + (s.real || s.uri)); }); }
    return L.join('\n');
  }
  var LV = { official: 'Nguồn chính thức', news: 'Báo chí', social: 'Mạng xã hội — chưa xác minh', other: 'Web khác — chưa xác minh' };
  // 3 khung hình YouTube tự tạo (đầu / giữa / cuối) cho mỗi video liên quan
  function frameList(R) { var out = []; (R.videos || []).filter(function (v) { return v.related; }).slice(0, 16).forEach(function (v) { [['1', 'đầu video (~25%)'], ['2', 'giữa video (~50%)'], ['3', 'cuối video (~75%)']].forEach(function (n) { out.push({ key: v.id + ':' + n[0], id: v.id, n: n[0], label: n[1], title: v.title, channel: v.channel, url: 'https://i.ytimg.com/vi/' + v.id + '/hq' + n[0] + '.jpg', big: 'https://i.ytimg.com/vi/' + v.id + '/maxres' + n[0] + '.jpg' }); }); }); return out; }
  function buildJson(R, sel) {
    return {
      schema: 'youtrend.resource.v1', created: new Date(R.at).toISOString(), mode: R.mode, brief: R.prompt, reference_video: R.refVideo || null, ride: R.ride ? { video: R.ride.video, covered: R.ride.scan.covered, covered_basis: R.ride.scan.basis, viewers_ask: R.ride.scan.asked, gaps: R.ride.gaps || null } : null,
      dossier: R.dossier, sources: R.sources,
      videos: R.videos.filter(function (v) { return sel.v[v.id]; }).map(function (v) { return { id: v.id, url: 'https://www.youtube.com/watch?v=' + v.id, title: v.title, type: v.type, type_label: TYPES[v.type][1], channel: v.channel, channel_id: v.channelId, official: v.gov, published: new Date(v.t).toISOString(), duration_sec: v.dur, views: v.views, chapters: v.chapters, matched_keywords: v.hit, license_note: v.license }; }),
      images: R.images.filter(function (i) { return sel.i[i.key]; }).map(function (i) { return { kind: i.kind, verification: i.level || '', title: i.title, image_url: i.url, page_url: i.page || '', license_note: i.license, author: i.author || '' }; }),
      youtube_frames: frameList(R).filter(function (f) { return sel.f && sel.f[f.key]; }).map(function (f) { return { video_id: f.id, label: f.label, image_url: f.url, image_url_large: f.big, video_title: f.title }; }),
      captures: (R.captures || []).map(function (c) { return { video_id: c.videoId, time_sec: c.t, video_title: c.title, note: 'Ảnh lưu trong phiên YouTrend' }; }),
      web_videos: (R.webVideos || []).filter(function (w) { return sel.w && sel.w[w.key]; }).map(function (w) { return { kind: w.kind, url: w.url, verification: w.level, page: w.page, site: w.site }; }),
      image_search: R.imageLinks, reference_links: R.links, news: R.news
    };
  }

  // ---------- Gói gửi Claude: danh sách file, prompt sản xuất, đóng zip ----------
  function fslug(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 36).replace(/-$/, ''); }
  function packList(R, sel) {
    var out = [];
    (R.images || []).filter(function (i) { return sel.i[i.key]; }).forEach(function (x, i) {
      var id = 'I' + pad(i + 1), tries = [x.url], sl = fslug(x.title);
      if (/^wc:/.test(x.key) && x.thumb && /\/\d+px-/.test(x.thumb)) tries.push(x.thumb.replace(/\/\d+px-/, '/1920px-'));
      if (/^yt:/.test(x.key)) tries.push(x.url.replace('maxresdefault', 'hqdefault'));
      if (x.thumb && tries.indexOf(x.thumb) < 0) tries.push(x.thumb);
      out.push({ id: id, dir: 'anh', base: id + (sl ? '_' + sl : ''), tries: tries, ref: x.page || '', title: x.title || '', kind: x.kind || '', page: x.page || '', url: x.url, license: x.license || '' });
    });
    frameList(R).filter(function (f) { return sel.f && sel.f[f.key]; }).forEach(function (f, i) {
      var id = 'F' + pad(i + 1, 2), pg = 'https://www.youtube.com/watch?v=' + f.id;
      out.push({ id: id, dir: 'khung-hinh', base: id + '_' + f.id + '_' + f.n, tries: [f.big, f.url], ref: pg, title: 'Khung hình ' + f.label + ' của "' + f.title + '"', kind: 'Khung hình YouTube', page: pg, url: f.url, license: 'Bản quyền của kênh ' + f.channel + ' — dùng kèm bình luận, ghi nguồn' });
    });
    (R.captures || []).filter(function (c) { return !sel.c || sel.c[c.key] !== false; }).forEach(function (c, i) {
      var id = 'C' + pad(i + 1, 2);
      out.push({ id: id, dir: 'khung-hinh', base: id + '_' + c.videoId + '_' + Math.floor(c.t || 0) + 's', dataUrl: c.dataUrl, tries: [], title: 'Ảnh chụp tại ' + dur(c.t || 0) + ' của "' + c.title + '"', kind: 'Ảnh chụp từ video', page: 'https://www.youtube.com/watch?v=' + c.videoId + '&t=' + Math.floor(c.t || 0) + 's', url: '', license: 'Bản quyền của kênh gốc — dùng kèm bình luận, ghi nguồn' });
    });
    return out;
  }
  var VLANG = { vi: 'tiếng Việt', en: 'tiếng Anh', ja: 'tiếng Nhật', ko: 'tiếng Hàn', es: 'tiếng Tây Ban Nha', pt: 'tiếng Bồ Đào Nha', de: 'tiếng Đức', fr: 'tiếng Pháp', hi: 'tiếng Hindi' };
  function claudePrompt(R, sel, o) {
    o = o || {}; var list = packList(R, sel), nI = list.filter(function (x) { return x.dir === 'anh'; }).length, nF = list.length - nI, L = [];
    var style = String(o.tstyle || '').trim();
    L.push('# VIỆC CẦN LÀM');
    L.push('Tôi gửi kèm một file zip tài nguyên do YouTrend gom. Trong zip có: `prompt-claude.md` (chính là nội dung này), `ho-so.json`, `danh-sach-anh.md`, `danh-sach-video.md`, thư mục `anh/` (' + nI + ' ảnh, mã I001…)' + (nF ? ' và thư mục `khung-hinh/` (' + nF + ' khung hình, mã F01… / C01…)' : '') + '.');
    L.push('Nếu tôi chưa gửi zip, hãy nhắc tôi gửi trước khi làm bước 3 và 4.');
    L.push('', 'Làm lần lượt từng bước, xong bước nào gửi bước đó để tôi duyệt:');
    L.push('1. KỊCH BẢN: viết lời đọc bằng ' + (VLANG[o.vlang] || VLANG.vi) + ', dài khoảng ' + (o.vmin || 12) + ' phút, chỉ dùng thông tin trong hồ sơ bên dưới. 15 giây đầu phải có hook. Giữ đúng tên riêng, ngày tháng, con số. Thông tin ở mục "CHƯA XÁC MINH" và "TIN ĐANG ĐƯỢC ĐƯA" phải nói kèm câu rào đón. Không khẳng định ai có tội khi toà chưa kết luận.');
    L.push('2. BẢNG PHÂN CẢNH: lập bảng gồm các cột Thời lượng | Lời đọc | Hình dùng (mã ảnh I…/F…/C…, hoặc video V…/W… kèm mốc thời gian) | Chữ chèn trên hình | Chuyển động (zoom, pan, khoanh đỏ, mũi tên). Mỗi cảnh 3–6 giây. Chỗ nào thiếu hình thì ghi "CẦN TÌM THÊM" kèm từ khoá tìm.');
    L.push('3. SỬA ẢNH: với các ảnh được dùng, xuất bản 1920×1080 đã thêm chữ, nhãn tên, ngày tháng, khoanh đỏ hoặc mũi tên theo bảng phân cảnh. Giữ nguyên nội dung ảnh gốc, không ghép hay vẽ thêm chi tiết không có thật. Làm mờ mặt trẻ em và người không liên quan tới vụ việc.');
    L.push('4. THUMBNAIL: thiết kế 3 phương án 1280×720' + (style ? ' theo phong cách: ' + style : '') + '. Chữ to, tối đa 3 dòng, đọc được khi thu nhỏ.');
    L.push('5. TIÊU ĐỀ VÀ MÔ TẢ: 5 tiêu đề, 1 mô tả có mục nguồn tin và ghi công ảnh theo `danh-sach-anh.md`.');
    L.push('', 'Bản quyền ảnh: cột "Bản quyền" trong `danh-sach-anh.md` cho biết ảnh nào có giấy phép mở (Wikimedia, Openverse: dùng được nếu ghi công) và ảnh nào của báo chí hoặc kênh khác (chỉ dùng kèm bình luận và ghi nguồn, ưu tiên thay bằng ảnh giấy phép mở khi có).');
    var rr = R.ride, g = rr && rr.gaps;
    if (rr) {
      L.push('', '# ĂN THEO VIDEO GỐC');
      L.push('Video mới làm về cùng vụ việc với video "' + rr.video.title + '" của kênh ' + rr.video.channel + ' (' + rr.video.minutes + ' phút, https://www.youtube.com/watch?v=' + rr.video.id + ').');
      L.push('Mục tiêu: người vừa xem video đó bấm vào video này vì nó có thêm thông tin. Viết kịch bản mới hoàn toàn từ hồ sơ, không chép lời, ví dụ hay bố cục của video gốc.');
      if (g) L.push('Độ dài mục tiêu: khoảng ' + g.target_minutes + ' phút (dùng số này thay cho độ dài ở bước 1). Khoảng một phần tư tới một phần ba thời lượng phải là các ĐIỂM MỚI bên dưới; phần bối cảnh trùng với video gốc thì kể gọn.');
      if (rr.scan.covered.length) { L.push('', '## Video gốc đã nói' + (rr.scan.basis === 'transcript' ? '' : ' (đoán từ tiêu đề và mô tả, chưa chắc đủ)')); rr.scan.covered.forEach(function (x) { L.push('- ' + x); }); }
      if (rr.scan.asked.length) { L.push('', '## Người xem video gốc còn hỏi'); rr.scan.asked.forEach(function (x) { L.push('- ' + x.q_vi + (x.likes ? ' (' + x.likes + ' thích)' : '')); }); }
      if (g && g.gaps.length) { L.push('', '## ĐIỂM MỚI: video gốc chưa nói, phải có trong kịch bản'); g.gaps.forEach(function (x, i) { L.push((i + 1) + '. ' + x.point_vi + (x.detail_vi ? ' ' + x.detail_vi : '') + (x.src.length ? ' [nguồn ' + x.src.join(', ') + ']' : '') + (x.confidence === 'có nguồn' ? '' : ' (CHƯA KIỂM CHỨNG: nói kèm câu rào đón)')); }); }
      if (g && g.open_questions.length) { L.push('', '## Câu hỏi của người xem mà hồ sơ chưa trả lời được (không được bịa câu trả lời; nếu nhắc tới thì nói rõ là chưa có thông tin chính thức)'); g.open_questions.forEach(function (x) { L.push('- ' + x); }); }
      if (g && g.angle_vi) L.push('', 'Góc tiếp cận: ' + g.angle_vi);
      if (g && g.outline.length) { L.push('', '## Dàn ý gợi ý'); g.outline.forEach(function (x, i) { L.push((i + 1) + '. ' + x.part + ' (' + (x.minutes || '?') + ' phút' + (x.is_new ? ', MỚI' : '') + '): ' + x.content_vi); }); }
    }
    return L.join('\n') + '\n\n---\n\n' + buildPrompt(R, sel);
  }
  function mdCell(s) { return String(s || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim(); }
  function imageSheet(list, res) {
    res = res || {}; var ok = list.filter(function (x) { return !res[x.id] || res[x.id].file; }), bad = list.filter(function (x) { return res[x.id] && res[x.id].error; });
    var L = ['# Danh sách ảnh trong gói', '', '| Mã | File | Mô tả | Loại | Trang gốc | Bản quyền |', '|---|---|---|---|---|---|'];
    ok.forEach(function (x) { L.push('| ' + x.id + ' | ' + ((res[x.id] && res[x.id].file) || x.dir + '/' + x.base) + ' | ' + mdCell(x.title) + ' | ' + mdCell(x.kind) + ' | ' + (x.page || x.url || '') + ' | ' + mdCell(x.license) + ' |'); });
    if (bad.length) { L.push('', '## Không tải được (' + bad.length + ') — mở link để lưu tay', ''); bad.forEach(function (x) { L.push('- ' + x.id + ' ' + mdCell(x.title) + ': ' + (x.url || x.page) + ' (' + res[x.id].error + ')'); }); }
    return L.join('\n') + '\n';
  }
  function videoSheet(R, sel) {
    var L = ['# Danh sách video tư liệu', '', 'Video không nằm trong zip. Mở link để xem và lấy đúng đoạn cần dùng.', ''];
    R.videos.filter(function (v) { return sel.v[v.id]; }).forEach(function (v, i) { L.push('- V' + (i + 1) + ' [' + TYPES[v.type][1] + '] ' + v.title + ' — ' + v.channel + ' • ' + dur(v.dur) + ' • https://www.youtube.com/watch?v=' + v.id + (v.chapters && v.chapters.length ? '\n  Mốc: ' + v.chapters.map(function (c) { return c.t + ' ' + c.label; }).join(' | ') : '') + '\n  Bản quyền: ' + v.license); });
    (R.webVideos || []).filter(function (w) { return sel.w && sel.w[w.key]; }).forEach(function (w, i) { L.push('- W' + (i + 1) + ' [' + (LV[w.level || 'other']) + '] ' + w.url + ' — từ bài: ' + (w.pageTitle || w.site || '') + ' (' + w.page + ')'); });
    return L.join('\n') + '\n';
  }
  var CRC = null;
  function crc32(u8) { if (!CRC) { CRC = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c >>> 0; } } var crc = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) crc = CRC[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8); return (crc ^ 0xFFFFFFFF) >>> 0; }
  // Zip không nén (ảnh JPEG/PNG vốn đã nén). files: [{ name, data: Uint8Array | string }] → mảng Uint8Array để đưa vào Blob
  function zipParts(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0, d = new Date(), csize = 0;
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30)); lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46)); ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name); csize += 46 + name.length;
      off += 30 + name.length + data.length;
    });
    var e = new DataView(new ArrayBuffer(22)); e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, csize, true); e.setUint32(16, off, true);
    return parts.concat(central, [new Uint8Array(e.buffer)]);
  }
  return { packList: packList, claudePrompt: claudePrompt, imageSheet: imageSheet, videoSheet: videoSheet, zipParts: zipParts, crc32: crc32, VLANG: VLANG, LV: LV, frameList: frameList, TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, iso: iso, dur: dur, fmtN: fmtN, ytId: ytId, keywords: keywords, freeDossier: freeDossier, classify: classify, chapters: chapters, collectVideos: collectVideos, topicLinks: topicLinks, coverScore: coverScore, coverMatch: coverMatch, imageLinks: imageLinks, buildPrompt: buildPrompt, buildJson: buildJson };
});

// ============================ GIAO DIỆN ============================
(function () {
  if (typeof window === 'undefined') return;
  var E = window.ResourceEngine, N = E.fmtN;
  var DB = 'youtrend_resource_v1';
  function idb() { return new Promise(function (res, rej) { try { var r = indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore('kv'); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); } }); }
  function dbGet(k) { return idb().then(function (d) { return new Promise(function (res) { var q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { return null; }); }
  function dbSet(k, v) { return idb().then(function (d) { return new Promise(function (res) { var t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }).catch(function () { return false; }); }
  var cx = function () { return Array.prototype.filter.call(arguments, Boolean).join(' '); };
  async function api(body) {
    var hd = { 'Content-Type': 'application/json' };
    try { if (window.ytAuth && window.ytAuth.authHeaders) Object.assign(hd, await window.ytAuth.authHeaders()); } catch (e) { }
    var r = await fetch('/api/research', { method: 'POST', headers: hd, body: JSON.stringify(body) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || !j.success) { var e = new Error(j.message || ('Lỗi máy chủ ' + r.status)); e.status = r.status; e.code = j.code || ''; throw e; }
    return j;
  }
  async function apiBin(body) {
    var hd = { 'Content-Type': 'application/json' };
    try { if (window.ytAuth && window.ytAuth.authHeaders) Object.assign(hd, await window.ytAuth.authHeaders()); } catch (e) { }
    var r = await fetch('/api/research', { method: 'POST', headers: hd, body: JSON.stringify(body) });
    var ct = (r.headers.get('content-type') || '').split(';')[0];
    if (!r.ok || !/^image\//.test(ct)) { var j = await r.json().catch(function () { return {}; }); var e = new Error(j.message || ('Lỗi máy chủ ' + r.status)); e.status = r.status; e.code = j.code || ''; throw e; }
    return { type: ct, data: new Uint8Array(await r.arrayBuffer()) };
  }
  function downloadBlob(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000); }
  // Danh mục tìm đề tài: [tên nhóm, tên nhóm gửi AI, [[danh mục, mô tả gửi AI]]]
  var CATS = [
    ['Tin tức', 'news and current affairs', [
      ['Vụ án có thật', 'true crime cases (murders, kidnappings, serial offenders, wrongful convictions)'],
      ['Mất tích bí ẩn', 'mysterious disappearances and missing-person cases'],
      ['Thảm hoạ & tai nạn', 'disasters and major accidents (plane crashes, shipwrecks, fires, collapses, natural disasters)'],
      ['Lừa đảo & tài chính', 'frauds, scams, Ponzi schemes and financial scandals'],
      ['Chính trị', 'political events, scandals and power struggles'],
      ['Chiến sự & quân sự', 'wars, military operations and security incidents'],
      ['Scandal người nổi tiếng', 'celebrity and public-figure scandals'],
      ['Công nghệ & AI', 'technology and AI industry stories (launches, failures, lawsuits)'],
      ['Kinh tế & doanh nghiệp', 'business stories: company collapses, takeovers, market shocks'],
      ['Thể thao', 'sports stories, controversies and record events']]],
    ['Lịch sử & bí ẩn', 'history and mysteries', [
      ['Vụ án chưa có lời giải', 'famous unsolved cases and cold cases'],
      ['Bí ẩn lịch sử', 'historical mysteries and unexplained events'],
      ['Trận đánh & chiến tranh', 'battles and wars in history'],
      ['Nhân vật lịch sử', 'remarkable or controversial historical figures'],
      ['Thảm hoạ trong lịch sử', 'historic disasters']]],
    ['Khoa học & đời sống', 'science and everyday life', [
      ['Vũ trụ & hàng không', 'space missions and aviation stories'],
      ['Y học & sức khoẻ', 'medical cases, outbreaks and health discoveries'],
      ['Thiên nhiên & động vật', 'nature and wildlife events'],
      ['Phát minh & công trình', 'inventions and megaprojects, including famous failures']]],
    ['Tự nhập', '', []]
  ];
  var COUNTRIES = [['Japan', 'Nhật Bản'], ['United States', 'Mỹ'], ['South Korea', 'Hàn Quốc'], ['United Kingdom', 'Anh'], ['Germany', 'Đức'], ['France', 'Pháp'], ['Spain and Latin America', 'Tây Ban Nha & Mỹ Latinh'], ['India', 'Ấn Độ'], ['China', 'Trung Quốc'], ['Vietnam', 'Việt Nam'], ['global', 'Toàn cầu']];
  var PERIODS = [['d7', 'Tin mới 7 ngày', 168], ['d30', 'Tin mới 30 ngày', 720], ['y1', '1 năm qua', 0], ['classic', 'Vụ kinh điển, mọi thời', 0]];
  // nước → [mã vùng YouTube, ngôn ngữ ưu tiên] để dò video đã có
  var YT_LOC = { Japan: ['JP', 'ja'], 'United States': ['US', 'en'], 'South Korea': ['KR', 'ko'], 'United Kingdom': ['GB', 'en'], Germany: ['DE', 'de'], France: ['FR', 'fr'], 'Spain and Latin America': ['MX', 'es'], India: ['IN', 'en'], China: ['', 'zh'], Vietnam: ['VN', 'vi'] };
  var COVER_TTL = 14 * 864e5;
  var FIND0 = { g: 0, c: 0, custom: '', country: 'Japan', period: 'classic', n: 10, note: '' };
  function lsJson(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? d : v; } catch (e) { return d; } }
  function lsPut(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  var EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
  function wcItem(c) { return { key: 'wc:' + c.url, kind: 'Wikimedia Commons', title: c.title, url: c.url, page: c.page, thumb: c.thumb, author: c.author, license: (c.license || 'Xem trang gốc') + (c.author ? ' • tác giả: ' + c.author : '') + ' — ghi công theo giấy phép' }; }
  function ovItem(o) { return { key: 'ov:' + o.url, kind: 'Openverse (giấy phép mở)', title: o.title, url: o.url, page: o.page, thumb: o.thumb || o.url, author: o.author, license: (o.license || 'CC') + (o.author ? ' • tác giả: ' + o.author : '') + (o.source ? ' • ' + o.source : '') + ' — ghi công theo giấy phép' }; }
  function imgGroup(x) { return /^(wc|ov):/.test(x.key) ? 'free' : /^yt:/.test(x.key) ? 'yt' : x.level === 'official' ? 'official' : 'news'; }
  function download(name, text, type) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type })); a.download = name; a.click(); }
  function slug(s) { return String(s || 'ho-so').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'ho-so'; }
  var STEPS = [['ai', 'Tìm tin mới nhất (Gemini + Google Search)'], ['struct', 'Dựng hồ sơ: timeline, số liệu, trích dẫn'], ['news', 'Tin tức Google News'], ['yt', 'Video YouTube liên quan'], ['media', 'Hình ảnh & mở link nguồn']];

  // ---------- Xem video & chụp khung hình (YouTube IFrame API + chia sẻ tab của trình duyệt) ----------
  var ytApi = null;
  function loadYT() { if (window.YT && window.YT.Player) return Promise.resolve(window.YT); if (ytApi) return ytApi; ytApi = new Promise(function (res) { var prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = function () { prev && prev(); res(window.YT); }; var sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc); }); return ytApi; }
  function Capture(p) {
    var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
    var box = useRef(null), player = useRef(null), vid = useRef(null), stream = useRef(null);
    var s0 = useState(''), msg = s0[0], setMsg = s0[1], s1 = useState(false), live = s1[0], setLive = s1[1], s2 = useState([]), shots = s2[0], setShots = s2[1];
    useEffect(function () {
      var dead = false;
      loadYT().then(function (YT) { if (dead || !box.current) return; var d = document.createElement('div'); d.id = 'cap-frame'; d.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'; box.current.appendChild(d); player.current = new YT.Player(d, { videoId: p.v.id, width: '100%', height: '100%', playerVars: { rel: 0, modestbranding: 1, playsinline: 1 } }); });
      return function () { dead = true; try { player.current && player.current.destroy(); } catch (e) { } stop(); };
    }, []);
    function stop() { if (stream.current) { stream.current.getTracks().forEach(function (t) { t.stop(); }); stream.current = null; } setLive(false); }
    async function start() {
      setMsg('');
      try {
        var st = await navigator.mediaDevices.getDisplayMedia({ video: { displaySurface: 'browser', frameRate: 30 }, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
        stream.current = st; vid.current.srcObject = st; await vid.current.play(); setLive(true);
        st.getVideoTracks()[0].onended = function () { setLive(false); };
      } catch (e) { setMsg('Chưa cho phép chia sẻ tab. Bấm lại và chọn đúng tab YouTrend này rồi bấm "Chia sẻ".'); }
    }
    async function shoot() {
      var v = vid.current, el = (box.current && box.current.querySelector('iframe')) || box.current;
      if (!v || !v.videoWidth || !el) { setMsg('Chưa bật chụp.'); return; }
      var r = el.getBoundingClientRect(), sx = v.videoWidth / window.innerWidth, sy = v.videoHeight / window.innerHeight;
      var cw = Math.round(r.width * sx), ch = Math.round(r.height * sy), k = Math.min(1, 1280 / cw);
      var c = document.createElement('canvas'); c.width = Math.round(cw * k); c.height = Math.round(ch * k);
      c.getContext('2d').drawImage(v, r.left * sx, r.top * sy, cw, ch, 0, 0, c.width, c.height);
      var t = null; try { t = player.current && player.current.getCurrentTime ? player.current.getCurrentTime() : null; } catch (e) { }
      var shot = { key: 'cap:' + p.v.id + ':' + Date.now(), videoId: p.v.id, t: t, title: p.v.title, channel: p.v.channel || '', dataUrl: c.toDataURL('image/jpeg', 0.88), at: Date.now() };
      setShots(function (a) { return [shot].concat(a); }); await p.onShot(shot);
    }
    var can = !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    return h('div', { className: 'fixed inset-0 z-[80] bg-black/80 flex items-start justify-center p-3 overflow-y-auto', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: 'w-full max-w-5xl mt-6 rounded-xl border border-zinc-800 bg-[#212121] p-4 space-y-3' },
        h('div', { className: 'flex items-center gap-3' }, h('div', { className: 'text-sm font-bold text-cham-50 truncate flex-1' }, p.v.title), h('button', { onClick: p.onClose, className: 'text-xs text-zinc-400 hover:text-cham-50 cursor-pointer' }, 'Đóng')),
        h('div', { ref: box, className: 'relative w-full aspect-video rounded-xl overflow-hidden bg-black' }),
        h('video', { ref: vid, muted: true, playsInline: true, className: 'hidden' }),
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          !live ? h('button', { onClick: start, disabled: !can, className: 'px-4 py-2 rounded-lg text-xs font-bold bg-sky-400 text-sky-950 hover:bg-sky-300 disabled:opacity-40 cursor-pointer' }, 'Bật chụp (cho phép chia sẻ tab này 1 lần)')
            : h('button', { onClick: shoot, className: 'px-5 py-2 rounded-lg text-xs font-bold bg-amber-400 text-cham-950 hover:bg-amber-300 cursor-pointer' }, 'Chụp khung hình'),
          live && h('button', { onClick: stop, className: 'px-3 py-2 rounded-lg text-xs bg-zinc-800 text-zinc-300 cursor-pointer' }, 'Tắt chụp'),
          h('span', { className: 'text-[11px] text-zinc-500' }, can ? 'Tua tới cảnh cần lấy, tạm dừng rồi bấm Chụp. Ảnh lưu vào phiên, tải về được.' : 'Trình duyệt này không hỗ trợ chụp tab — dùng Chrome/Edge trên máy tính.')),
        msg && h('div', { className: 'text-[11px] text-amber-200' }, msg),
        shots.length > 0 && h('div', { className: 'grid gap-2 grid-cols-3 md:grid-cols-6' }, shots.map(function (x) { return h('a', { key: x.key, href: x.dataUrl, download: 'khung-hinh-' + Math.floor(x.t || 0) + 's.jpg', title: 'Tải ảnh' }, h('img', { src: x.dataUrl, className: 'w-full aspect-video object-cover rounded border border-zinc-800' })); }))));
  }

  // Kho phiên (dùng chung với mục Dự án)
  window.ResourceStore = { list: function () { return dbGet('history').then(function (x) { return x || []; }); }, put: async function (r) { var cur = (await dbGet('history')) || []; var list = [r].concat(cur.filter(function (x) { return x.id !== r.id; })).slice(0, 60); await dbSet('history', list); try { window.dispatchEvent(new CustomEvent('res-history')); } catch (e) { } return list; }, remove: async function (id) { var cur = (await dbGet('history')) || []; await dbSet('history', cur.filter(function (x) { return x.id !== id; })); try { window.dispatchEvent(new CustomEvent('res-history')); } catch (e) { } }, buildPrompt: function (r) { return E.buildPrompt(r, r.sel || { v: {}, i: {}, f: {}, w: {} }); } };

  function ResourceStudio(props) {
    var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo;
    var p = props || {};
    var a0 = useState(''), prompt = a0[0], setPrompt = a0[1];
    var a1 = useState(''), ref = a1[0], setRef = a1[1];
    var a2 = useState(function () { try { return Object.assign({ hours: 168, lang: 'vi', nq: 8, vlang: 'vi', vmin: 12, tstyle: '' }, JSON.parse(localStorage.getItem('res1_opt') || '{}')); } catch (e) { return { hours: 168, lang: 'vi', nq: 8, vlang: 'vi', vmin: 12, tstyle: '' }; } }), opt = a2[0], setOpt = a2[1];
    var a3 = useState(null), R = a3[0], setR = a3[1];
    var a4 = useState({ v: {}, i: {} }), sel = a4[0], setSel = a4[1];
    var a5 = useState(null), prog = a5[0], setProg = a5[1];
    var a6 = useState(''), err = a6[0], setErr = a6[1];
    var a7 = useState('over'), view = a7[0], setView = a7[1];
    var a8 = useState([]), hist = a8[0], setHist = a8[1];
    var a9 = useState(''), vType = a9[0], setVType = a9[1];
    var b0 = useState(false), showAll = b0[0], setShowAll = b0[1];
    var b1 = useState(''), msg = b1[0], setMsg = b1[1];
    var d0 = useState(function () { return Object.assign({}, FIND0, lsJson('res1_find', {})); }), fd = d0[0], setFd = d0[1];
    var d1 = useState(function () { return lsJson('res1_topics', null); }), tp = d1[0], setTp = d1[1];
    var r1 = useState(function () { return Object.assign({ url: '', tr: '', open: false, busy: '', err: '', video: null, scan: null }, lsJson('res1_ride', null) || {}, { busy: '', err: '' }); }), rd = r1[0], setRd = r1[1], r2 = useState(false), rideBusy = r2[0], setRideBusy = r2[1];
    var c1 = useState(function () { var c = lsJson('res1_cover', {}) || {}, now = Date.now(); Object.keys(c).forEach(function (k) { if (!c[k] || now - c[k].at > COVER_TTL) delete c[k]; }); return c; }), cov = c1[0], setCov = c1[1], c2 = useState(null), cb = c2[0], setCb = c2[1], c3 = useState('all'), cf = c3[0], setCf = c3[1];
    var d2 = useState(false), tb = d2[0], setTb = d2[1];
    var d3 = useState(''), terr = d3[0], setTerr = d3[1];
    var d4 = useState(null), pk = d4[0], setPk = d4[1];
    var d5 = useState(''), iq = d5[0], setIq = d5[1];
    var d6 = useState(false), ib = d6[0], setIb = d6[1];
    var d7 = useState(''), iKind = d7[0], setIKind = d7[1];
    function setF(patch) { setFd(function (o) { var n = Object.assign({}, o, patch); lsPut('res1_find', n); return n; }); }
    useEffect(function () { dbGet('history').then(function (x) { setHist(x || []); }); }, []);
    function setO(k, v) { setOpt(function (o) { var n = Object.assign({}, o); n[k] = v; try { localStorage.setItem('res1_opt', JSON.stringify(n)); } catch (e) { } return n; }); }
    function toast(m) { p.showToast ? p.showToast(m) : setMsg(m); }
    var busy = !!prog;
    function defaultSel(r) { if (r.sel) return r.sel; var v = {}, i = {}, f = {}, w = {}; r.videos.forEach(function (x) { if (x.related) v[x.id] = true; }); r.images.slice(0, 150).forEach(function (x) { i[x.key] = true; }); E.frameList(r).slice(0, 15).forEach(function (x) { f[x.key] = true; }); (r.webVideos || []).forEach(function (x) { w[x.key] = true; }); return { v: v, i: i, f: f, w: w }; }
    async function saveHist(r) { var cur = (await dbGet('history')) || []; var list = [r].concat(cur.filter(function (x) { return x.id !== r.id; })).slice(0, 60); setHist(list); await dbSet('history', list); try { window.dispatchEvent(new CustomEvent('res-history')); } catch (e) { } }
    useEffect(function () { if (!p.openId) return; dbGet('history').then(function (l) { var r = (l || []).find(function (x) { return x.id === p.openId; }); if (r) openHist(r); }); }, [p.openId, p.openKey]);
    var c0 = useState(null), cap = c0[0], setCap = c0[1];
    async function addCapture(c) { var r = Object.assign({}, R, { captures: (R.captures || []).concat([c]) }); setR(r); await saveHist(Object.assign({}, r, { sel: sel })); toast('Đã lưu khung hình vào phiên'); }
    async function delCapture(key) { var r = Object.assign({}, R, { captures: (R.captures || []).filter(function (c) { return c.key !== key; }) }); setR(r); await saveHist(Object.assign({}, r, { sel: sel })); }

    async function run(t0, o0, x0) {
      var x = x0 || {}, o = o0 || opt, text = String(t0 || prompt).trim(); if (text.length < 8) { setErr('Hãy mô tả vụ việc rõ hơn (ít nhất vài từ: sự kiện gì, ở đâu, khi nào).'); return; }
      if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return; }
      setErr(''); setMsg(''); var st = {}; var mark = function (k, s, note) { st[k] = [s, note || '']; setProg(Object.assign({}, st)); };
      var yt = function (path, prm) { return p.yt(path, prm, p.apiKey); };
      var res = { id: Date.now().toString(36), at: Date.now(), prompt: text, opt: o, mode: 'ai', sources: [], news: [], videos: [], images: [], links: [], imageLinks: [], refVideo: null, units: 0 };
      try {
        // video mẫu (tuỳ chọn)
        var ctx = '', vid = E.ytId(x.ref || ref);
        if (vid) { try { var rv = await yt('videos', { part: 'snippet', id: vid }); var it = (rv.items || [])[0]; if (it) { res.refVideo = { id: vid, title: it.snippet.title, channel: it.snippet.channelTitle }; ctx = 'Title: ' + it.snippet.title + '\nChannel: ' + it.snippet.channelTitle + '\nPublished: ' + it.snippet.publishedAt + '\nDescription: ' + String(it.snippet.description || '').slice(0, 1500); } } catch (e) { } }
        // B1 + B2: AI
        var D = null;
        mark('ai', 'run');
        try {
          var s1 = await api({ action: 'search', prompt: text, context: ctx, hours: o.hours });
          res.sources = s1.sources || []; res.searchQueries = s1.queries || []; res.grounded = s1.grounded !== false;
          mark('ai', 'ok', res.sources.length + ' nguồn' + (res.grounded ? '' : ' • Wikipedia + tin tức, không có Google Search')); mark('struct', 'run');
          var s2 = await api({ action: 'structure', prompt: text, report: s1.report, sources: res.sources, lang: o.lang });
          D = s2.dossier; res.report = s1.report; mark('struct', 'ok');
        } catch (e) {
          if (e.status === 401 || e.status === 403) throw new Error('Bạn cần đăng nhập (và xác minh SĐT) để dùng Tạo tài nguyên.');
          if (e.code === 'QUOTA_EXCEEDED') throw e;
          res.mode = 'free'; res.aiError = e.message || 'lỗi'; D = E.freeDossier(text + ' ' + ctx.split('\n')[0].replace('Title: ', ''));
          mark('ai', 'skip', 'AI không dùng được (' + (e.message || 'lỗi') + ') → chế độ miễn phí'); mark('struct', 'skip', 'dùng từ khoá trong prompt');
        }
        ['entities', 'latest', 'timeline', 'numbers', 'quotes', 'youtube_queries', 'image_queries', 'news_queries', 'match_keywords', 'angles', 'unverified', 'official_sources'].forEach(function (k) { if (k === 'entities') D.entities = Object.assign({ people: [], organizations: [], places: [], objects: [] }, D.entities || {}); else if (!Array.isArray(D[k])) D[k] = []; });
        res.dossier = D;
        // B3: tin tức
        mark('news', 'run');
        try { var nw = await api({ action: 'news', queries: D.news_queries.length ? D.news_queries : [D.title], hours: o.hours }); res.news = nw.items || []; mark('news', 'ok', res.news.length + ' tin'); }
        catch (e) { if (e.code === 'QUOTA_EXCEEDED') throw e; mark('news', 'skip', e.message); }
        // B4: YouTube
        mark('yt', 'run');
        try {
          var cv = await E.collectVideos({ yt: yt, dossier: D, hours: o.hours, maxQueries: o.nq, onProgress: function (m) { mark('yt', 'run', m); } });
          res.videos = cv.videos; res.units = cv.units; mark('yt', 'ok', cv.videos.filter(function (v) { return v.related; }).length + ' liên quan / ' + cv.videos.length + ' video • ' + cv.units + ' quota');
        } catch (e) { mark('yt', 'skip', 'YouTube API: ' + (e.message || 'lỗi') + ' (hết quota thì đổi key)'); }
        // B5: ảnh + mở nguồn
        mark('media', 'run');
        var imgs = [];
        try {
          var urls = res.sources.map(function (s) { return s.uri; });
          var en = await api({ action: 'enrich', urls: urls, imageQueries: D.image_queries.map(function (x) { return x.q; }).slice(0, 8) });
          var byFrom = {}; (en.pages || []).forEach(function (pg) { byFrom[pg.from] = pg; });
          res.sources.forEach(function (s) { var pg = byFrom[s.uri]; if (pg) { s.real = pg.url; s.realTitle = pg.title || s.title; s.site = pg.site; s.published = pg.published; s.image = pg.image; } });
          var KIND = { official: 'Ảnh nguồn chính thức', news: 'Ảnh báo chí', social: 'Ảnh mạng xã hội — chưa xác minh', other: 'Ảnh web — chưa xác minh' }, seenI = {}, wv = [];
          (en.pages || []).forEach(function (pg) {
            var lv = pg.level || 'other';
            (pg.images || (pg.image ? [{ url: pg.image }] : [])).forEach(function (im) { if (seenI[im.url]) return; seenI[im.url] = 1; imgs.push({ key: 'pg:' + im.url, kind: KIND[lv], level: lv, title: (im.alt || pg.title || pg.site || '').slice(0, 160), url: im.url, page: pg.url, thumb: im.url, license: (lv === 'official' ? 'Tác phẩm của cơ quan nhà nước — thường được dùng, vẫn ghi nguồn ' : 'Có bản quyền của ') + (pg.site || 'trang gốc') + (lv === 'official' ? '' : ' — cần xin phép / dùng có bình luận, ghi nguồn') }); });
            (pg.videos || []).forEach(function (vv) { if (wv.some(function (x) { return x.url === vv.url; })) return; wv.push({ key: 'wv:' + vv.url, kind: vv.kind, url: vv.url, id: vv.id, level: vv.kind === 'x' || vv.kind === 'tiktok' ? 'social' : lv, page: pg.url, site: pg.site, pageTitle: pg.title }); });
          });
          res.webVideos = wv;
          (en.commons || []).forEach(function (c) { imgs.push(wcItem(c)); });
          (en.openverse || []).forEach(function (x) { if (!seenI[x.url]) { seenI[x.url] = 1; imgs.push(ovItem(x)); } });
          mark('media', 'ok', imgs.length + ' ảnh • ' + (res.webVideos || []).length + ' video trong bài báo');
        } catch (e) { mark('media', 'skip', e.message); }
        res.videos.filter(function (v) { return v.related; }).slice(0, 8).forEach(function (v) { imgs.push({ key: 'yt:' + v.id, kind: 'Thumbnail YouTube', title: v.title, url: 'https://i.ytimg.com/vi/' + v.id + '/maxresdefault.jpg', page: 'https://www.youtube.com/watch?v=' + v.id, thumb: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', license: 'Bản quyền của kênh ' + v.channel + ' — chỉ tham khảo bố cục' }); });
        res.images = imgs; res.links = E.topicLinks(D, text); res.imageLinks = E.imageLinks(D);
        // B6 (chỉ khi ăn theo một video): so hồ sơ với video gốc để tìm phần nó chưa nói
        if (x.ride) {
          res.ride = x.ride; mark('gaps', 'run');
          if (res.mode !== 'ai') { res.ride = Object.assign({}, x.ride, { gapsErr: 'AI không dùng được nên chưa có hồ sơ để so' }); mark('gaps', 'skip', 'chưa có hồ sơ AI'); }
          else { try { var gp = await rideGaps(res); res.ride = Object.assign({}, x.ride, { gaps: gp }); mark('gaps', 'ok', gp.gaps.length + ' điểm mới'); } catch (e) { res.ride = Object.assign({}, x.ride, { gapsErr: (e && e.message) || 'AI lỗi' }); mark('gaps', 'skip', (e && e.message) || 'AI lỗi'); } }
        }
        setR(res); setSel(defaultSel(res)); setView('over'); setVType(''); setShowAll(false); await saveHist(res);
        toast('Xong hồ sơ: ' + res.videos.filter(function (v) { return v.related; }).length + ' video liên quan • ' + imgs.length + ' ảnh • ' + res.sources.length + ' nguồn');
      } catch (e) { setErr(e.message || 'Lỗi tạo hồ sơ'); }
      setProg(null);
    }

    var promptText = useMemo(function () { return R ? E.buildPrompt(R, sel) : ''; }, [R, sel]);
    var claudeText = useMemo(function () { return R ? E.claudePrompt(R, sel, opt) : ''; }, [R, sel, opt]);
    // ----- tìm đề tài theo danh mục -----
    async function findTopics(more) {
      var G = CATS[fd.g] || CATS[0], C = G[2][fd.c] || G[2][0], catEn = G[2].length ? C[1] : fd.custom.trim();
      if (!catEn || catEn.length < 3) { setTerr('Hãy gõ danh mục bạn muốn tìm.'); return; }
      var cn = (COUNTRIES.filter(function (x) { return x[0] === fd.country; })[0] || COUNTRIES[0])[1], pn = (PERIODS.filter(function (x) { return x[0] === fd.period; })[0] || PERIODS[3])[1];
      var label = (G[2].length ? G[0] + ' › ' + C[0] : fd.custom.trim()) + ' · ' + cn + ' · ' + pn;
      setTerr(''); setTb(true);
      try {
        var prev = more && tp && tp.label === label ? tp.list : [];
        var r = await api({ action: 'topics', group: G[1], cat: catEn, country: fd.country, period: fd.period, n: fd.n, note: fd.note, skip: prev.map(function (t) { return t.title; }) });
        var seen = {}; prev.forEach(function (t) { seen[t.title] = 1; });
        var add = (r.topics || []).filter(function (t) { return !seen[t.title]; }), o = { at: Date.now(), label: label, period: fd.period, country: fd.country, list: prev.concat(add), grounded: r.grounded !== false, basis: r.basis || '' };
        setTp(o); lsPut('res1_topics', o); toast(prev.length ? 'Thêm ' + add.length + ' đề tài mới' : 'Tìm được ' + add.length + ' đề tài');
      } catch (e) { setTerr(e.status === 401 || e.status === 403 ? 'Bạn cần đăng nhập để dùng AI tìm đề tài.' : (e.message || 'AI lỗi, thử lại sau ít phút.')); }
      setTb(false);
    }
    // ----- ăn theo một video: đọc video gốc + bình luận → gom hồ sơ → tìm phần video gốc chưa nói -----
    async function rideScan() {
      var id = E.ytId(rd.url); if (!id) { setRd(Object.assign({}, rd, { err: 'Dán link một video YouTube (dạng youtube.com/watch?v=… hoặc youtu.be/…).' })); return; }
      if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return; }
      var yt = function (path, prm) { return p.yt(path, prm, p.apiKey); };
      setRd(Object.assign({}, rd, { busy: 'Đang đọc video và bình luận…', err: '' }));
      try {
        var rv = await yt('videos', { part: 'snippet,statistics,contentDetails', id: id }), it = (rv.items || [])[0];
        if (!it) throw new Error('Không tìm thấy video này (đã xoá, riêng tư hoặc link sai).');
        var sn = it.snippet || {}, sx = it.statistics || {}, dur = E.iso((it.contentDetails || {}).duration);
        var video = { id: id, title: sn.title || '', channel: sn.channelTitle || '', channelId: sn.channelId || '', published: sn.publishedAt || '', minutes: Math.round(dur / 6) / 10, dur: dur, views: +sx.viewCount || 0, likes: +sx.likeCount || 0, nComments: +sx.commentCount || 0, tags: (sn.tags || []).slice(0, 25), description: String(sn.description || '').slice(0, 4000) };
        var comments = [];
        try { var cr = await yt('commentThreads', { part: 'snippet', videoId: id, order: 'relevance', maxResults: 100, textFormat: 'plainText' }); comments = (cr.items || []).map(function (c) { var t = ((c.snippet || {}).topLevelComment || {}).snippet || {}; return { t: String(t.textDisplay || t.textOriginal || '').slice(0, 300), l: +t.likeCount || 0 }; }).filter(function (c) { return c.t.length > 12; }).sort(function (a, b) { return b.l - a.l; }).slice(0, 80); } catch (e) { }
        setRd(function (x) { return Object.assign({}, x, { busy: 'AI đang đọc ' + comments.length + ' bình luận' + (rd.tr.trim().length > 300 ? ' và phụ đề' : '') + '…' }); });
        var r = await api({ action: 'rideScan', data: { video: video, comments: comments, transcript: rd.tr } });
        var next = { url: rd.url, tr: rd.tr, open: rd.open, busy: '', err: '', video: Object.assign({}, video, { description: undefined }), scan: r.scan, nRead: comments.length, at: Date.now() };
        setRd(next); lsPut('res1_ride', Object.assign({}, next, { tr: next.tr.slice(0, 60000) }));
      } catch (e) { setRd(function (x) { return Object.assign({}, x, { busy: '', err: (e && (e.msg || e.message)) || 'Không phân tích được video.' }); }); }
    }
    function rideGo() {
      if (!rd.scan) return;
      var o = Object.assign({}, opt); if (o.hours && o.hours < 720) o.hours = 720;      // vụ việc của video gốc có thể đã diễn ra vài tuần
      setPrompt(rd.scan.event_query); setRef(rd.url);
      run(rd.scan.event_query, o, { ref: rd.url, ride: { video: rd.video, scan: rd.scan, nRead: rd.nRead } });
    }
    async function rideGaps(res) {
      var rr = res.ride, VL = { vi: 'Vietnamese', en: 'English', ja: 'Japanese', ko: 'Korean', es: 'Spanish', de: 'German', fr: 'French', hi: 'Hindi', pt: 'Portuguese' };
      var g = await api({ action: 'rideGaps', data: { title: rr.video.title, minutes: rr.video.minutes, covered: rr.scan.covered, asked: rr.scan.asked, basis: rr.scan.basis, vlang: VL[opt.vlang] || VL[rr.scan.lang] || 'the reference video language', dossier: res.dossier } });
      return g.gaps;
    }
    async function rideRetry() {
      if (!R || !R.ride || rideBusy) return; setRideBusy(true);
      try { var g = await rideGaps(R), nr = Object.assign({}, R, { ride: Object.assign({}, R.ride, { gaps: g, gapsErr: '' }) }); setR(nr); await saveHist(nr); toast('Đã so xong với video gốc: ' + g.gaps.length + ' điểm mới'); }
      catch (e) { toast('Chưa so được: ' + ((e && e.message) || 'AI lỗi')); }
      setRideBusy(false);
    }
    // ----- dò YouTube: đã có ai làm video về vụ này chưa -----
    function coverKey(t) { return (t.title || t.title_vi || '').toLowerCase().slice(0, 160); }
    async function coverOne(t) {
      var yt = function (path, prm) { return p.yt(path, prm, p.apiKey); };
      var loc = YT_LOC[(tp && tp.country) || ''] || ['', ''], q = t.title || t.title_vi;
      var prm = { part: 'snippet', q: q, type: 'video', maxResults: 25 }; if (loc[0]) prm.regionCode = loc[0]; if (loc[1]) prm.relevanceLanguage = loc[1];
      var sr = await yt('search', prm), ids = (sr.items || []).map(function (x) { return x.id && x.id.videoId; }).filter(Boolean), items = [];
      if (ids.length) {
        var vr = await yt('videos', { part: 'snippet,statistics,contentDetails', id: ids.join(',') });
        items = (vr.items || []).map(function (v) { return { id: v.id, title: (v.snippet || {}).title || '', channel: (v.snippet || {}).channelTitle || '', t: Date.parse((v.snippet || {}).publishedAt) || 0, views: +((v.statistics || {}).viewCount) || 0, dur: E.iso((v.contentDetails || {}).duration) }; });
      }
      var hit = E.coverMatch([t.title, t.title_vi], items);
      return { at: Date.now(), q: q, seen: items.length, n: hit.length, max: hit.length ? hit[0].views : 0, newest: hit.reduce(function (m, v) { return Math.max(m, v.t); }, 0), top: hit.slice(0, 3).map(function (v) { return { id: v.id, title: v.title, channel: v.channel, views: v.views, t: v.t }; }) };
    }
    async function coverRun(list) {
      if (cb) return;
      if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return; }
      var all = Object.assign({}, cov), done = 0, fail = '';
      setCb({ done: 0, total: list.length });
      for (var i = 0; i < list.length; i++) {
        try { all[coverKey(list[i])] = await coverOne(list[i]); done++; setCov(Object.assign({}, all)); lsPut('res1_cover', all); }
        catch (e) { fail = (e && (e.msg || e.message)) || 'YouTube lỗi'; break; }
        setCb({ done: i + 1, total: list.length });
      }
      setCb(null);
      toast(fail ? 'Dò bị dừng sau ' + done + ' vụ: ' + fail : list.length === 1 ? (all[coverKey(list[0])].n ? 'Đã có ' + all[coverKey(list[0])].n + ' video về vụ này' : 'Chưa thấy video nào về vụ này') : 'Đã dò xong ' + done + ' vụ');
    }
    function topicBrief(t) {
      return [t.brief_en || t.summary_vi || '', 'Tên vụ việc: ' + t.title + (t.title_vi && t.title_vi !== t.title ? ' (' + t.title_vi + ')' : ''), t.date ? 'Thời gian: ' + t.date : '', t.place ? 'Địa điểm: ' + t.place : '', (t.queries || []).length ? 'Từ khoá gốc: ' + t.queries.join(' | ') : '', 'Cần: diễn biến đầy đủ, mốc thời gian, nhân vật, bằng chứng, tình trạng hiện tại, hình ảnh và video tư liệu.'].filter(Boolean).join('\n');
    }
    function useTopic(t, go) {
      var text = topicBrief(t), hrs = (PERIODS.filter(function (x) { return x[0] === (tp && tp.period); })[0] || PERIODS[3])[2];
      setPrompt(text); setErr('');
      if (go) { setO('hours', hrs); run(text, Object.assign({}, opt, { hours: hrs })); } else toast('Đã điền vào ô mô tả, sửa thêm rồi bấm Tạo hồ sơ.');
    }
    // ----- tìm thêm ảnh giấy phép mở theo từ khoá -----
    async function moreImages() {
      var qs = iq.split(/[,\n]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 6); if (!qs.length || ib) return;
      setIb(true);
      try {
        var r = await api({ action: 'images', queries: qs }), have = {}, add = [];
        R.images.forEach(function (x) { have[x.key] = 1; });
        (r.commons || []).map(wcItem).concat((r.openverse || []).map(ovItem)).forEach(function (x) { if (!have[x.key]) { have[x.key] = 1; add.push(x); } });
        if (add.length) {
          var r2 = Object.assign({}, R, { images: R.images.concat(add) }), s2 = Object.assign({}, sel, { i: Object.assign({}, sel.i) });
          add.forEach(function (x) { s2.i[x.key] = true; });
          setR(r2); setSel(s2); await saveHist(Object.assign({}, r2, { sel: s2 }));
        }
        toast(add.length ? 'Thêm ' + add.length + ' ảnh giấy phép mở' : 'Không tìm thêm được ảnh nào với từ khoá này');
      } catch (e) { toast(e.message || 'Không tìm được ảnh'); }
      setIb(false);
    }
    function selectImages(on) { setSel(function (s0) { var n = Object.assign({}, s0, { i: Object.assign({}, s0.i) }); R.images.forEach(function (x) { if (!iKind || imgGroup(x) === iKind) n.i[x.key] = on; }); return n; }); }
    // ----- tải gói tài nguyên: ảnh + khung hình + prompt + danh sách -----
    async function pack() {
      if (pk) return;
      var list = E.packList(R, sel); if (!list.length) { toast('Chưa chọn ảnh nào để tải.'); return; }
      var res = {}, files = [], done = 0, fail = 0, next = 0, stop = '';
      setPk({ done: 0, total: list.length, fail: 0 });
      async function one(it) {
        try {
          var type, data;
          if (it.dataUrl) {
            var m = /^data:(image\/[\w+.-]+);base64,(.*)$/.exec(it.dataUrl); if (!m) throw new Error('ảnh chụp bị hỏng');
            var bin = atob(m[2]); data = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) data[k] = bin.charCodeAt(k); type = m[1];
          } else {
            var got = null, last = '';
            for (var t = 0; t < it.tries.length && !got; t++) { if (!it.tries[t]) continue; try { got = await apiBin({ action: 'image', url: it.tries[t], ref: it.ref }); } catch (e) { last = e.message; if (e.status === 401 || e.status === 403) { stop = 'Bạn cần đăng nhập lại để tải ảnh.'; throw e; } } }
            if (!got) throw new Error(last || 'không tải được');
            type = got.type; data = got.data;
          }
          var file = it.dir + '/' + it.base + '.' + (EXT[type] || 'jpg'); res[it.id] = { file: file }; files.push({ name: file, data: data });
        } catch (e) { fail++; res[it.id] = { error: e.message || 'lỗi' }; }
        done++; setPk({ done: done, total: list.length, fail: fail });
      }
      async function worker() { while (next < list.length && !stop) { await one(list[next++]); } }
      await Promise.all([worker(), worker(), worker(), worker()]);
      setPk(null);
      if (stop) { setErr(stop); return; }
      files.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
      var docs = [{ name: 'prompt-claude.md', data: claudeText }, { name: 'danh-sach-anh.md', data: E.imageSheet(list, res) }, { name: 'danh-sach-video.md', data: E.videoSheet(R, sel) }, { name: 'ho-so.json', data: JSON.stringify(E.buildJson(R, sel), null, 2) }];
      downloadBlob(slug(R.dossier.title) + '-goi-tai-nguyen.zip', new Blob(E.zipParts(docs.concat(files)), { type: 'application/zip' }));
      toast('Đã đóng gói ' + (list.length - fail) + '/' + list.length + ' ảnh' + (fail ? '. ' + fail + ' ảnh bị trang gốc chặn hoặc quá 4 MB, xem danh-sach-anh.md' : ''));
    }

    function copy(text, what) { (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { toast('Đã copy ' + what); }).catch(function () { setMsg('Trình duyệt chặn copy — dùng nút tải file.'); }); }
    function toggle(kind, key) { setSel(function (s) { var n = Object.assign({}, s); n[kind] = Object.assign({}, s[kind] || {}); n[kind][key] = !n[kind][key]; return n; }); }
    function openHist(r) { setR(r); setSel(defaultSel(r)); setPrompt(r.prompt); setView('over'); }
    async function delHist(id) { var list = hist.filter(function (x) { return x.id !== id; }); setHist(list); await dbSet('history', list); if (R && R.id === id) setR(null); }

    // ---------- mảnh giao diện ----------
    var lab = function (t) { return h('div', { className: 'text-[10.5px] font-medium text-cham-300 mb-1.5' }, t); };
    var sel1 = function (k, opts) { return h('select', { value: opt[k], onChange: function (e) { var v = e.target.value; setO(k, isNaN(+v) ? v : +v); }, className: 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 cursor-pointer' }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var src = function (arr) { return (arr || []).length ? h('span', { className: 'ml-1 text-[10px] text-sky-400 font-bold' }, arr.map(function (n) { var s = R.sources[n - 1]; return s ? h('a', { key: n, href: s.real || s.uri, target: '_blank', rel: 'noopener noreferrer', title: s.realTitle || s.title, className: 'hover:underline mr-0.5' }, '[' + n + ']') : null; })) : null; };
    var card = function (title, body, extra) { return h('div', { className: 'yt-card p-3.5 space-y-2 ' + (extra || '') }, h('div', { className: 'text-xs font-semibold text-cham-50' }, title), body); };

    var form = h('div', { className: 'yt-card p-4 space-y-3' },
      h('div', null, h('h2', { className: 'text-[13px] font-semibold text-cham-50' }, 'Đã có đề tài? Mô tả vụ việc'),
        h('div', { className: 'text-[11px] text-zinc-400' }, 'Dán thông tin vụ việc → tìm tin mới nhất có nguồn, timeline, trích dẫn, video họp báo/bản tin/hiện trường/ghi âm trên YouTube, ảnh thật kèm giấy phép, tài liệu gốc theo đúng loại sự kiện → xuất prompt + JSON.')),
      h('textarea', { value: prompt, onChange: function (e) { setPrompt(e.target.value); }, rows: 5, placeholder: 'Ví dụ: Vụ rơi máy bay Learjet 60 số hiệu N722BD ở Florida đầu tháng 11/2026. NTSB đã họp báo, tìm thấy động cơ và mảnh vỡ trên mái nhà. Cần tin mới nhất, ghi âm ATC, họp báo NTSB, ảnh thật của chiếc máy bay, đường bay...', className: 'w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 outline-none rounded-xl px-3 py-2.5 text-sm text-zinc-100 leading-relaxed' }),
      h('div', { className: 'grid gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]' },
        h('div', null, lab('Link video YouTube mẫu (tuỳ chọn)'), h('input', { value: ref, onChange: function (e) { setRef(e.target.value); }, placeholder: 'https://youtu.be/... video bạn muốn làm theo', className: 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100' })),
        h('div', null, lab('Tin trong'), sel1('hours', [[24, '24 giờ qua'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày'], [0, 'Mọi lúc']])),
        h('div', null, lab('Ngôn ngữ hồ sơ'), sel1('lang', [['vi', 'Tiếng Việt'], ['en', 'English']])),
        h('div', null, lab('Độ sâu video'), sel1('nq', [[5, '5 truy vấn ≈ 0.5K quota'], [8, '8 truy vấn ≈ 0.8K quota'], [12, '12 truy vấn ≈ 1.2K quota']]))),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('button', { disabled: busy, onClick: function () { return run(); }, className: 'px-5 py-2.5 rounded-xl text-sm font-bold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] disabled:opacity-40 cursor-pointer' }, busy ? 'Đang tạo hồ sơ...' : 'Tạo hồ sơ tài nguyên'),
        h('span', { className: 'text-[10px] text-zinc-500' }, 'Mỗi hồ sơ: 1 lượt AI + ~' + (opt.nq * 100) + ' quota YouTube. AI lỗi/hết lượt sẽ tự chuyển chế độ miễn phí.')),
      err && h('div', { className: 'rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200' }, err),
      msg && h('div', { className: 'text-[11px] text-emerald-300' }, msg),
      prog && h('div', { className: 'grid gap-1.5 sm:grid-cols-5' }, STEPS.concat(prog.gaps ? [['gaps', 'So với video gốc']] : []).map(function (s) { var x = prog[s[0]] || ['wait', '']; return h('div', { key: s[0], className: cx('rounded-lg border px-2 py-1.5 text-[10px]', x[0] === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : x[0] === 'run' ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : x[0] === 'skip' ? 'border-zinc-700 bg-zinc-900 text-zinc-400' : 'border-zinc-800 text-zinc-600') }, h('div', { className: 'font-bold' }, (x[0] === 'ok' ? '✓ ' : x[0] === 'run' ? '' : x[0] === 'skip' ? '↷ ' : '○ ') + s[1]), x[1] && h('div', { className: 'mt-0.5 opacity-80 line-clamp-2' }, x[1])); })));

    var chip = function (on, text, fn, key) { return h('button', { key: key, type: 'button', 'aria-pressed': !!on, onClick: fn, className: cx('h-8 px-3 rounded-lg text-[11.5px] font-medium whitespace-nowrap transition cursor-pointer', on ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3a3a3a]') }, text); };
    var selF = function (k, opts, aria) { return h('select', { value: fd[k], 'aria-label': aria, onChange: function (e) { var v = e.target.value, o = {}; o[k] = isNaN(+v) || v === '' ? v : +v; setF(o); }, className: 'w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2 text-[11.5px] text-zinc-200 cursor-pointer' }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var FG = CATS[fd.g] || CATS[0];
    var topicCard = function (t, i) {
      var cv = cov[coverKey(t)], ago = function (ms) { var d = Math.round((Date.now() - ms) / 864e5); return d < 1 ? 'hôm nay' : d < 31 ? d + ' ngày trước' : d < 365 ? Math.round(d / 30) + ' tháng trước' : (d / 365).toFixed(d < 3650 ? 1 : 0).replace('.0', '') + ' năm trước'; };
      return h('article', { key: t.title + i, className: cx('relative overflow-hidden rounded-xl bg-[#181818] border p-3 flex flex-col gap-1.5', cv ? (cv.n ? 'border-[#ff4e45]/45' : 'border-[#2ba640]/50') : 'border-[#303030]') },
        cv && h('div', { 'aria-hidden': true, className: cx('pointer-events-none absolute top-[37px] -right-[54px] w-[200px] rotate-45 text-center text-[9.5px] leading-[18px] font-bold tracking-wide shadow', cv.n ? 'bg-[#ff4e45] text-white' : 'bg-[#2ba640] text-white') }, cv.n ? 'ĐÃ CÓ NGƯỜI LÀM' : 'CHƯA THẤY AI LÀM'),
        h('div', { className: cx('flex items-start gap-2', cv && 'pr-24') }, h('span', { className: 'shrink-0 h-6 min-w-6 px-1 rounded-md bg-[#272727] text-[11px] font-bold text-[#aaa] grid place-items-center tabular-nums' }, i + 1),
          h('div', { className: 'min-w-0 flex-1' }, h('h3', { className: 'text-[12.5px] font-semibold text-cham-50 leading-snug' }, t.title_vi || t.title), t.title && t.title !== t.title_vi && h('div', { className: 'text-[11px] text-[#aaa] truncate', title: t.title }, t.title))),
        h('div', { className: 'flex flex-wrap items-center gap-1.5 text-[10.5px] text-[#aaa]' }, t.date && h('span', { className: 'px-1.5 py-0.5 rounded bg-[#272727] tabular-nums' }, t.date), t.place && h('span', { className: 'px-1.5 py-0.5 rounded bg-[#272727]' }, t.place), t.status_vi && h('span', { className: 'px-1.5 py-0.5 rounded bg-[#3a2a12] text-[#f5c451]' }, t.status_vi)),
        t.summary_vi && h('p', { className: 'text-[11.5px] text-zinc-200 leading-relaxed' }, t.summary_vi),
        t.why_vi && h('p', { className: 'text-[11px] text-[#6fcf85] leading-snug' }, 'Vì sao hợp làm video: ' + t.why_vi),
        t.visuals_vi && h('p', { className: 'text-[11px] text-[#aaa] leading-snug' }, 'Hình có sẵn: ' + t.visuals_vi),
        cv && h('div', { className: cx('rounded-lg px-2.5 py-2 mt-0.5', cv.n ? 'bg-[#2a1614]' : 'bg-[#14261a]') },
          h('div', { className: cx('text-[11.5px] font-semibold', cv.n ? 'text-[#ff8a83]' : 'text-[#6fcf85]') }, cv.n ? 'YouTube đã có ' + cv.n + (cv.n >= 25 ? '+' : '') + ' video về vụ này · cao nhất ' + N(cv.max) + ' view' + (cv.newest ? ' · mới nhất ' + ago(cv.newest) : '') : 'Chưa thấy video nào trùng tên vụ này trong ' + cv.seen + ' kết quả đầu của YouTube'),
          cv.n > 0 && h('div', { className: 'mt-1.5 grid grid-cols-[repeat(3,minmax(0,150px))] gap-1.5' }, cv.top.map(function (v) { return h('a', { key: v.id, href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', title: v.title + ' · ' + v.channel, className: 'block min-w-0 group' }, h('img', { src: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', alt: '', loading: 'lazy', className: 'w-full aspect-video object-cover rounded-md bg-black group-hover:opacity-85' }), h('span', { className: 'block mt-0.5 text-[10.5px] text-[#e6e6e6] tabular-nums truncate' }, N(v.views) + ' view · ' + ago(v.t)), h('span', { className: 'block text-[10px] text-[#aaa] truncate' }, v.channel)); })),
          h('div', { className: 'mt-1 text-[10px] text-[#888]' }, 'Dò lúc ' + new Date(cv.at).toLocaleString('vi-VN') + ' · tìm theo "' + cv.q + '"' + (cv.n ? '' : '. Có thể vẫn có video đặt tên khác, bấm Xem trên YouTube để chắc.'))),
        h('div', { className: 'flex flex-wrap gap-1.5 mt-auto pt-1' },
          h('button', { disabled: busy, onClick: function () { useTopic(t, true); }, className: 'h-7 px-3 rounded-full text-[11.5px] font-semibold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] disabled:opacity-40 cursor-pointer' }, 'Gom tài nguyên'),
          h('button', { onClick: function () { useTopic(t, false); }, className: 'h-7 px-3 rounded-full text-[11.5px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] cursor-pointer' }, 'Điền vào ô mô tả'),
          h('a', { href: 'https://www.google.com/search?q=' + encodeURIComponent((t.queries || [])[0] || t.title), target: '_blank', rel: 'noopener noreferrer', className: 'h-7 px-3 rounded-full text-[11.5px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] inline-flex items-center' }, 'Xem trên Google'),
          h('button', { disabled: !!cb, onClick: function () { coverRun([t]); }, title: 'Tìm trên YouTube xem đã có video về vụ này chưa. Tốn khoảng 101 quota.', className: 'h-7 px-3 rounded-full text-[11.5px] font-medium bg-[#3a1f1d] hover:bg-[#4a2624] text-[#ff8a83] disabled:opacity-40 cursor-pointer' }, cv ? 'Dò lại YouTube' : 'Dò YouTube'),
          cv && h('a', { href: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(t.title || t.title_vi), target: '_blank', rel: 'noopener noreferrer', className: 'h-7 px-3 rounded-full text-[11.5px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] inline-flex items-center' }, 'Xem trên YouTube')));
    };
    // ----- ô "Ăn theo một video" -----
    var rideAgo = function (iso) { var d = Math.round((Date.now() - Date.parse(iso)) / 864e5); return !isFinite(d) ? '' : d < 1 ? 'hôm nay' : d < 31 ? d + ' ngày trước' : d < 365 ? Math.round(d / 30) + ' tháng trước' : Math.round(d / 365) + ' năm trước'; };
    var rideBox = h('div', { className: 'yt-card p-4 space-y-3 border-[#f5c451]/40' },
      h('div', null, h('h2', { className: 'text-[13px] font-semibold text-cham-50' }, 'Ăn theo một video đang lên'),
        h('div', { className: 'text-[11px] text-zinc-400' }, 'Dán link video. Web đọc video và bình luận để biết nó đã nói gì và người xem còn hỏi gì, rồi gom tin về chính vụ đó và chỉ ra phần video kia chưa nói.')),
      h('div', { className: 'grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto]' },
        h('input', { value: rd.url, onChange: function (e) { setRd(Object.assign({}, rd, { url: e.target.value, err: '' })); }, onKeyDown: function (e) { if (e.key === 'Enter') rideScan(); }, placeholder: 'https://www.youtube.com/watch?v=…', 'aria-label': 'Link video muốn ăn theo', className: 'h-9 bg-[#121212] border border-[#303030] rounded-lg px-3 text-[12.5px] text-[#f1f1f1] placeholder:text-[#717171] min-w-0' }),
        h('button', { onClick: function () { setRd(Object.assign({}, rd, { open: !rd.open })); }, 'aria-expanded': !!rd.open, className: 'h-9 px-3 rounded-lg text-[12px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] cursor-pointer whitespace-nowrap' }, rd.tr.trim().length > 300 ? 'Đã dán phụ đề (' + N(rd.tr.trim().length) + ' ký tự)' : 'Dán phụ đề (nên có)'),
        h('button', { onClick: rideScan, disabled: !!rd.busy || !rd.url.trim(), className: 'h-9 px-4 rounded-lg text-[12.5px] font-semibold bg-[#f5c451] hover:brightness-110 text-[#2a1d00] disabled:opacity-40 cursor-pointer whitespace-nowrap' }, rd.busy ? 'Đang phân tích…' : rd.scan ? 'Phân tích lại' : 'Phân tích video')),
      rd.open && h('div', null,
        h('textarea', { value: rd.tr, onChange: function (e) { setRd(Object.assign({}, rd, { tr: e.target.value })); }, rows: 5, 'aria-label': 'Phụ đề của video gốc', placeholder: 'Dán phụ đề (bản chép lời) của video gốc vào đây.', className: 'w-full bg-[#121212] border border-[#303030] rounded-lg px-3 py-2 text-[11.5px] font-mono text-[#f1f1f1] placeholder:text-[#717171]' }),
        h('div', { className: 'text-[11px] text-[#aaa] mt-1' }, 'Có phụ đề thì web biết chính xác video đã nói gì. Không có thì chỉ đoán được từ tiêu đề và mô tả. Cách lấy: mở video, bấm "…thêm" dưới mô tả, chọn "Hiện bản chép lời", bôi đen rồi sao chép.')),
      rd.busy && h('div', { role: 'status', className: 'text-[12px] text-[#f5c451]' }, rd.busy),
      rd.err && h('div', { role: 'alert', className: 'rounded-lg border border-[#ff4e45]/50 bg-[#2a1614] px-3 py-2 text-[12px] text-[#ffb4ae]' }, rd.err),
      rd.scan && rd.video && h('div', { className: 'space-y-3 pt-1' },
        h('div', { className: 'flex gap-3' },
          h('a', { href: 'https://www.youtube.com/watch?v=' + rd.video.id, target: '_blank', rel: 'noopener noreferrer', className: 'shrink-0' }, h('img', { src: 'https://i.ytimg.com/vi/' + rd.video.id + '/mqdefault.jpg', alt: '', className: 'w-44 aspect-video object-cover rounded-lg bg-black' })),
          h('div', { className: 'min-w-0 space-y-1' },
            h('div', { className: 'text-[13px] font-semibold text-white leading-snug' }, rd.video.title),
            h('div', { className: 'text-[11.5px] text-[#aaa]' }, rd.video.channel + ' · ' + N(rd.video.views) + ' view · ' + rideAgo(rd.video.published) + ' · ' + rd.video.minutes + ' phút · đã đọc ' + (rd.nRead || 0) + ' bình luận'),
            h('div', { className: 'text-[12px] text-[#e6e6e6] leading-relaxed' }, h('b', { className: 'text-[#f5c451]' }, 'Vụ việc: '), rd.scan.event_vi),
            rd.scan.hook_vi && h('div', { className: 'text-[11.5px] text-[#c8c8c8] leading-relaxed' }, h('b', { className: 'text-[#c9a7ff]' }, 'Vì sao người ta bấm: '), rd.scan.hook_vi))),
        h('div', { className: 'grid gap-3 md:grid-cols-2' },
          h('div', { className: 'rounded-lg bg-[#161616] border border-[#2a2a2a] p-3' },
            h('div', { className: 'flex items-center gap-2 mb-2' }, h('span', { className: 'text-[12px] font-semibold text-[#7cc3ff]' }, 'Video đã nói (' + rd.scan.covered.length + ')'), h('span', { className: cx('px-1.5 py-0.5 rounded text-[10px] font-semibold', rd.scan.basis === 'transcript' ? 'bg-[#14261a] text-[#6fcf85]' : 'bg-[#3a3214] text-[#f5c451]') }, rd.scan.basis === 'transcript' ? 'theo phụ đề' : 'đoán từ tiêu đề + mô tả')),
            rd.scan.covered.length ? h('ul', { className: 'space-y-1 list-disc pl-4 text-[12px] text-[#e6e6e6] leading-snug' }, rd.scan.covered.map(function (x, i) { return h('li', { key: i }, x); })) : h('div', { className: 'text-[11.5px] text-[#888]' }, 'Chưa rút ra được. Dán phụ đề rồi phân tích lại.')),
          h('div', { className: 'rounded-lg bg-[#161616] border border-[#2a2a2a] p-3' },
            h('div', { className: 'text-[12px] font-semibold text-[#6fcf85] mb-2' }, 'Người xem còn hỏi (' + rd.scan.asked.length + ')'),
            rd.scan.asked.length ? h('ul', { className: 'space-y-1.5' }, rd.scan.asked.map(function (x, i) { return h('li', { key: i, className: 'text-[12px] text-[#e6e6e6] leading-snug' }, h('span', { className: cx('mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold', /phản/.test(x.kind) ? 'bg-[#2a1614] text-[#ff8a83]' : /thiếu/.test(x.kind) ? 'bg-[#3a3214] text-[#f5c451]' : 'bg-[#1d2f45] text-[#8ab4f8]') }, x.kind || 'hỏi'), x.q_vi, x.likes > 0 && h('span', { className: 'ml-1.5 text-[10.5px] text-[#aaa] tabular-nums' }, N(x.likes) + ' thích'), x.quote && h('div', { className: 'text-[10.5px] text-[#888] italic truncate', title: x.quote }, '"' + x.quote + '"')); })) : h('div', { className: 'text-[11.5px] text-[#888]' }, rd.nRead ? 'Bình luận chưa có câu hỏi nào đáng kể.' : 'Video tắt bình luận hoặc chưa có bình luận.'))),
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('button', { onClick: rideGo, disabled: !!prog, className: 'h-9 px-5 rounded-full text-[12.5px] font-semibold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] disabled:opacity-40 cursor-pointer' }, prog ? 'Đang gom…' : 'Gom tin và tìm phần video này chưa nói'),
          h('span', { className: 'text-[11px] text-[#aaa]' }, 'Dùng khoảng 3 lượt AI và quota YouTube như một lần gom hồ sơ thường.'))));
    var finder = h('div', { className: 'yt-card p-4 space-y-3' },
      h('div', null, h('h2', { className: 'text-[13px] font-semibold text-cham-50' }, 'Tìm đề tài bằng AI'),
        h('div', { className: 'text-[11px] text-zinc-400' }, 'Chọn danh mục, nước và thời gian. AI tìm trên Google các vụ việc có thật, bạn bấm một vụ để gom tin, hình và video.')),
      h('div', null, lab('Nhóm nội dung'), h('div', { className: 'flex flex-wrap gap-1.5' }, CATS.map(function (g, i) { return chip(fd.g === i, g[0], function () { setF({ g: i, c: 0 }); }, i); }))),
      FG[2].length ? h('div', null, lab('Danh mục'), h('div', { className: 'flex flex-wrap gap-1.5' }, FG[2].map(function (c, i) { return chip(fd.c === i, c[0], function () { setF({ c: i }); }, i); })))
        : h('div', null, lab('Danh mục tự nhập'), h('input', { value: fd.custom, onChange: function (e) { setF({ custom: e.target.value }); }, placeholder: 'Ví dụ: vụ cướp ngân hàng, tai nạn leo núi, vụ kiện bản quyền AI', className: 'w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 text-[11.5px] text-zinc-100' })),
      h('div', { className: 'grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_minmax(0,2fr)]' },
        h('div', null, lab('Nước'), selF('country', COUNTRIES, 'Nước')),
        h('div', null, lab('Thời gian'), selF('period', PERIODS, 'Thời gian')),
        h('div', null, lab('Số đề tài'), selF('n', [[6, '6'], [10, '10'], [15, '15']], 'Số đề tài')),
        h('div', null, lab('Ghi chú cho AI (tuỳ chọn)'), h('input', { value: fd.note, onChange: function (e) { setF({ note: e.target.value }); }, placeholder: 'Ví dụ: ưu tiên vụ có nhiều ảnh tư liệu, tránh vụ quá nổi tiếng', className: 'w-full h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 text-[11.5px] text-zinc-100' }))),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('button', { disabled: tb, onClick: function () { findTopics(false); }, className: 'px-5 py-2 rounded-full text-[12.5px] font-semibold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] disabled:opacity-40 cursor-pointer' }, tb ? 'AI đang tìm, chờ 20–40 giây…' : 'Tìm đề tài'),
        tp && tp.list.length > 0 && !tb && h('button', { onClick: function () { findTopics(true); }, className: 'px-4 py-2 rounded-full text-[12px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] cursor-pointer' }, 'Tìm thêm, không lặp lại'),
        h('span', { className: 'text-[10.5px] text-zinc-500' }, 'Mỗi lần tìm dùng 1 lượt AI, không tốn quota YouTube.')),
      terr && h('div', { className: 'rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200' }, terr),
      tp && tp.list.length > 0 && h('div', { className: 'space-y-2 pt-1' },
        h('div', { className: 'flex flex-wrap items-center gap-2 text-[11px] text-[#aaa]' }, h('span', null, tp.list.length + ' đề tài · ' + tp.label + ' · tìm lúc ' + new Date(tp.at).toLocaleString('vi-VN')), h('button', { onClick: function () { setTp(null); try { localStorage.removeItem('res1_topics'); } catch (e) { } }, className: 'text-[#aaa] hover:text-white underline cursor-pointer' }, 'Xoá danh sách')),
        tp.grounded === false && h('div', { className: 'rounded-lg bg-[#3a2a12] text-[#f5c451] px-3 py-2 text-[11px] leading-relaxed' }, 'Key Gemini đang ở gói miễn phí nên không dùng được Google Search. Danh sách này lấy từ ' + (tp.basis === 'news' ? 'tiêu đề Google News mới nhất' : 'kiến thức sẵn có của AI') + ', hãy bấm Xem trên Google để kiểm tra lại trước khi làm.'),
        (function () {
          var todo = tp.list.filter(function (t) { return !cov[coverKey(t)]; }), nDone = tp.list.length - todo.length, nFree = tp.list.filter(function (t) { var c = cov[coverKey(t)]; return c && !c.n; }).length;
          var show = cf === 'free' ? tp.list.filter(function (t) { var c = cov[coverKey(t)]; return c && !c.n; }) : cf === 'taken' ? tp.list.filter(function (t) { var c = cov[coverKey(t)]; return c && c.n; }) : tp.list;
          return h(React.Fragment, null,
            h('div', { className: 'flex flex-wrap items-center gap-2 rounded-lg bg-[#161616] border border-[#2a2a2a] px-3 py-2' },
              h('button', { disabled: !!cb || !todo.length, onClick: function () { coverRun(todo); }, className: 'h-8 px-4 rounded-full text-[12px] font-semibold bg-[#ff4e45] hover:brightness-110 text-white disabled:opacity-40 cursor-pointer' }, cb ? 'Đang dò ' + cb.done + '/' + cb.total + '…' : todo.length ? 'Dò YouTube ' + todo.length + ' vụ chưa dò' : 'Đã dò hết'),
              h('span', { className: 'text-[11px] text-[#aaa]' }, todo.length ? 'Tốn khoảng ' + N(todo.length * 101) + ' quota YouTube (mỗi vụ 101). Kết quả lưu 14 ngày.' : 'Kết quả lưu 14 ngày, bấm Dò lại trên từng thẻ nếu cần.'),
              nDone > 0 && h('span', { className: 'flex-1' }),
              nDone > 0 && chip(cf === 'all', 'Tất cả ' + tp.list.length, function () { setCf('all'); }, 'a'),
              nDone > 0 && chip(cf === 'free', 'Chưa thấy ai làm ' + nFree, function () { setCf('free'); }, 'f'),
              nDone > 0 && chip(cf === 'taken', 'Đã có người làm ' + (nDone - nFree), function () { setCf('taken'); }, 't')),
            show.length ? h('div', { className: 'grid gap-2.5 md:grid-cols-2' }, show.map(topicCard)) : h('div', { className: 'rounded-lg border border-dashed border-[#3a3a3a] px-4 py-5 text-center text-[12px] text-[#aaa]' }, 'Không có vụ nào ở nhóm này.'));
        })()));

    var histBox = hist.length > 0 && h('div', { className: 'rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5' }, lab('Hồ sơ đã tạo (' + hist.length + ')'),
      hist.map(function (x) { return h('div', { key: x.id, className: cx('flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]', R && R.id === x.id ? 'bg-zinc-800' : 'hover:bg-zinc-900') }, h('button', { onClick: function () { openHist(x); }, className: 'flex-1 min-w-0 text-left cursor-pointer' }, h('div', { className: 'font-bold text-zinc-100 truncate' }, (x.dossier && x.dossier.title) || x.prompt.slice(0, 60)), h('div', { className: 'text-[10px] text-zinc-500' }, new Date(x.at).toLocaleString('vi-VN') + ' • ' + x.videos.length + ' video')), h('button', { onClick: function () { delHist(x.id); }, title: 'Xoá', className: 'text-zinc-500 hover:text-rose-400 cursor-pointer' }, '✕')); }));

    if (!R) return h('section', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] animate-in fade-in duration-200' }, h('div', { className: 'space-y-4 min-w-0' }, rideBox, finder, form), h('div', { className: 'space-y-3' }, histBox || h('div', { className: 'rounded-xl border border-dashed border-zinc-800 p-4 text-[11px] text-zinc-500 leading-relaxed' }, 'Hồ sơ bạn tạo sẽ được lưu ở đây (trên trình duyệt này) để mở lại bất cứ lúc nào.')));

    var D = R.dossier, E2 = D.entities || {};
    var rel = R.videos.filter(function (v) { return v.related; }), shownV = (showAll ? R.videos : rel).filter(function (v) { return !vType || v.type === vType; });
    var nSelV = Object.keys(sel.v).filter(function (k) { return sel.v[k]; }).length, nSelI = Object.keys(sel.i).filter(function (k) { return sel.i[k]; }).length;
    var head = h('div', { className: 'yt-card border-hoe-600/50 p-4 space-y-2' },
      h('div', { className: 'flex flex-wrap items-center gap-1.5 text-[10px]' },
        h('span', { className: 'px-2 py-0.5 rounded-md font-bold ' + (R.mode === 'ai' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-300 border border-zinc-700') }, R.mode === 'ai' ? (R.grounded === false ? 'Gemini + Wikipedia + tin tức' : 'Gemini + Google Search') : 'Chế độ miễn phí'),
        D.category && h('span', { className: 'px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold' }, D.category),
        D.event_date && h('span', { className: 'px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700' }, '' + D.event_date),
        D.status && h('span', { className: 'px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30' }, D.status),
        h('span', { className: 'text-zinc-500' }, 'tạo ' + new Date(R.at).toLocaleString('vi-VN'))),
      R.mode === 'ai' && R.grounded === false && h('div', { className: 'text-[11px] text-amber-200/90' }, 'Key Gemini đang ở gói miễn phí nên không có Google Search. Hồ sơ này dựng từ Wikipedia và tiêu đề tin tức, có thể thiếu diễn biến mới nhất.'),
      R.mode !== 'ai' && R.aiError && h('div', { className: 'text-[11px] text-amber-200/90' }, 'Bước AI lỗi: ' + R.aiError + (/GEMINI_API_KEY|501/.test(R.aiError) ? ' — thêm GEMINI_API_KEY trên Vercel rồi Redeploy.' : ' — thử lại sau ít phút.')),
      h('h3', { className: 'text-lg sm:text-xl font-bold text-cham-50' }, D.title),
      h('div', { className: 'flex flex-wrap gap-2 pt-1' },
        h('button', { onClick: function () { copy(claudeText, 'prompt cho Claude'); }, className: 'px-4 py-2 rounded-xl text-xs font-bold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] cursor-pointer' }, 'Copy prompt cho Claude'),
        h('button', { disabled: !!pk, onClick: function () { pack(); }, title: 'Tải ảnh và khung hình đã chọn, kèm prompt, danh sách ảnh, danh sách video và hồ sơ JSON', className: 'px-4 py-2 rounded-xl text-xs font-bold bg-[#2ba640] hover:bg-[#35b84c] text-white disabled:opacity-60 cursor-pointer tabular-nums' }, pk ? 'Đang tải ảnh ' + pk.done + '/' + pk.total + '…' : 'Tải gói tài nguyên (.zip)'),
        h('button', { onClick: function () { download(slug(D.title) + '.json', JSON.stringify(E.buildJson(R, sel), null, 2), 'application/json'); }, className: 'px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-950 cursor-pointer' }, 'Tải JSON'),
        h('button', { onClick: function () { copy(JSON.stringify(E.buildJson(R, sel), null, 2), 'JSON'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Copy JSON'),
        h('button', { onClick: function () { download(slug(D.title) + '.txt', claudeText, 'text/plain;charset=utf-8'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Tải .txt'),
        h('button', { onClick: function () { setR(null); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-pointer' }, '＋ Hồ sơ mới'),
        h('span', { className: 'self-center text-[10px] text-zinc-400' }, 'Đang chọn ' + nSelV + ' video • ' + nSelI + ' ảnh • ' + Object.keys(sel.f || {}).filter(function (k) { return sel.f[k]; }).length + ' khung hình • ' + (R.captures || []).length + ' ảnh chụp')),
      h('div', { className: 'grid gap-2 sm:grid-cols-[150px_130px_minmax(0,1fr)] pt-1' },
        h('div', null, lab('Video làm bằng'), sel1('vlang', Object.keys(E.VLANG).map(function (k) { return [k, E.VLANG[k].charAt(0).toUpperCase() + E.VLANG[k].slice(1)]; }))),
        h('div', null, lab('Độ dài video'), sel1('vmin', [[5, '5 phút'], [8, '8 phút'], [12, '12 phút'], [20, '20 phút'], [30, '30 phút'], [45, '45 phút']])),
        h('div', null, lab('Phong cách thumbnail (tuỳ chọn, đưa vào prompt)'), h('input', { value: opt.tstyle || '', onChange: function (e) { setO('tstyle', e.target.value); }, placeholder: 'Ví dụ: ảnh nhân vật bên trái, nhãn đỏ góc trên, chữ vàng viền đen, dải chữ đen trên nền vàng ở đáy', className: 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100' }))),
      p.extraHead && p.extraHead(Object.assign({}, R, { sel: sel }), promptText, function (r2) { setR(r2); return saveHist(r2); }));

    var tabs = [['over', 'Tổng quan'], ['vid', 'Video (' + rel.length + ')'], ['img', 'Hình ảnh (' + R.images.length + ')'], ['src', 'Tin & nguồn (' + (R.sources.length + R.news.length) + ')'], ['doc', 'Tài liệu gốc (' + R.links.length + ')'], ['prompt', 'Prompt']];
    var tabBar = h('div', { className: 'flex flex-wrap gap-1 border-b border-zinc-800' }, tabs.map(function (t) { return h('button', { key: t[0], onClick: function () { setView(t[0]); }, className: cx('px-3 py-2 text-xs font-bold border-b-2 cursor-pointer', view === t[0] ? 'border-amber-400 text-cham-50' : 'border-transparent text-zinc-500 hover:text-zinc-200') }, t[1]); }));

    var list = function (arr, render) { return arr.length ? h('ul', { className: 'space-y-1.5' }, arr.map(render)) : h('div', { className: 'text-[11px] text-zinc-500' }, 'Chưa có dữ liệu.'); };
    var li = function (k, a, b) { return h('li', { key: k, className: 'text-xs text-zinc-200 leading-relaxed flex gap-2' }, a ? h('span', { className: 'shrink-0 text-[10px] font-bold text-amber-300 min-w-[78px]' }, a) : null, h('span', null, b)); };
    // ----- kết quả so với video gốc (khi hồ sơ được gom từ "Ăn theo một video") -----
    var rideView = R.ride ? (function () {
      var rr = R.ride, g = rr.gaps, copyT = function (t) { try { navigator.clipboard.writeText(t); toast('Đã sao chép'); } catch (e) { toast('Trình duyệt chặn sao chép'); } };
      return h('div', { className: 'yt-card p-4 space-y-3 border-[#f5c451]/50 xl:col-span-2' },
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('span', { className: 'text-[13px] font-semibold text-[#f5c451]' }, 'Ăn theo video'),
          h('a', { href: 'https://www.youtube.com/watch?v=' + rr.video.id, target: '_blank', rel: 'noopener noreferrer', className: 'text-[12px] text-white hover:underline truncate max-w-[520px]' }, rr.video.title),
          h('span', { className: 'text-[11px] text-[#aaa]' }, rr.video.channel + ' · ' + N(rr.video.views) + ' view · ' + rr.video.minutes + ' phút')),
        !g ? h('div', { className: 'flex flex-wrap items-center gap-2 text-[12px] text-[#ffb4ae]' }, 'Chưa so được hồ sơ với video gốc' + (rr.gapsErr ? ' (' + rr.gapsErr + ')' : '') + '.', h('button', { onClick: rideRetry, disabled: rideBusy, className: 'h-7 px-3 rounded-full bg-[#3a1f1d] hover:bg-[#4a2624] text-[11.5px] font-semibold text-[#ff8a83] cursor-pointer disabled:opacity-50' }, rideBusy ? 'Đang so…' : 'So lại'))
        : h(React.Fragment, null,
          h('div', { className: 'flex flex-wrap items-center gap-2' },
            [[g.gaps.length, 'điểm video gốc chưa nói', 'text-[#6fcf85]'], [g.new_share_pct + '%', 'thông tin trong hồ sơ là mới (AI ước tính)', 'text-[#f5c451]'], [g.target_minutes, 'phút nên làm (gốc ' + (g.ref_minutes || '?') + ' phút)', 'text-[#7cc3ff]']].map(function (x) { return h('span', { key: x[1], className: 'inline-flex items-baseline gap-1.5 h-8 px-3 rounded-lg bg-[#212121] border border-[#303030]' }, h('b', { className: 'text-[15px] tabular-nums ' + x[2] }, x[0]), h('span', { className: 'text-[11.5px] text-[#c8c8c8]' }, x[1])); }),
            g.basis !== 'transcript' && h('span', { className: 'text-[11px] text-[#f5c451]' }, 'Chưa có phụ đề nên "video đã nói gì" chỉ là đoán: kiểm lại các điểm dưới đây với video gốc trước khi dùng.')),
          g.angle_vi && h('p', { className: 'text-[12.5px] text-[#f1f1f1] leading-relaxed' }, h('b', { className: 'text-[#c9a7ff]' }, 'Góc của video mới: '), g.angle_vi),
          h('div', { className: 'grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]' },
            h('div', { className: 'space-y-3 min-w-0' },
              h('div', { className: 'rounded-lg bg-[#161616] border border-[#2ba640]/40 p-3' },
                h('div', { className: 'text-[12px] font-semibold text-[#6fcf85] mb-2' }, 'Điều video gốc chưa nói'),
                g.gaps.length ? h('ol', { className: 'space-y-2' }, g.gaps.map(function (x, i) { return h('li', { key: i, className: 'rounded-lg bg-[#212121] px-3 py-2' },
                  h('div', { className: 'text-[12.5px] font-medium text-white leading-snug' }, (i + 1) + '. ' + x.point_vi, src(x.src), h('span', { className: cx('ml-2 px-1.5 py-0.5 rounded text-[10px] font-semibold align-middle', x.confidence === 'có nguồn' ? 'bg-[#14261a] text-[#6fcf85]' : 'bg-[#3a3214] text-[#f5c451]') }, x.confidence)),
                  x.detail_vi && h('div', { className: 'text-[12px] text-[#d0d0d0] leading-snug mt-0.5' }, x.detail_vi),
                  x.answers_vi && h('div', { className: 'text-[11px] text-[#8ab4f8] mt-0.5' }, 'Trả lời câu hỏi của người xem: ' + x.answers_vi)); })) : h('div', { className: 'text-[11.5px] text-[#888]' }, 'Hồ sơ chưa có gì khác với video gốc. Thử nới "Tin trong" rộng hơn rồi gom lại.')),
              g.open_questions.length > 0 && h('div', { className: 'rounded-lg bg-[#161616] border border-[#ff4e45]/40 p-3' },
                h('div', { className: 'text-[12px] font-semibold text-[#ff8a83] mb-1.5' }, 'Người xem hỏi nhưng hồ sơ chưa trả lời được'),
                h('ul', { className: 'space-y-1 list-disc pl-4 text-[12px] text-[#e6e6e6] leading-snug' }, g.open_questions.map(function (x, i) { return h('li', { key: i }, x); })),
                h('div', { className: 'text-[10.5px] text-[#888] mt-1.5' }, 'Tìm được câu trả lời có nguồn cho các câu này là phần ăn điểm nhất của video mới.'))),
            h('div', { className: 'space-y-3 min-w-0' },
              g.titles.length > 0 && h('div', { className: 'rounded-lg bg-[#161616] border border-[#2a2a2a] p-3' },
                h('div', { className: 'text-[12px] font-semibold text-[#f5c451] mb-2' }, 'Tiêu đề gợi ý'),
                h('ul', { className: 'space-y-1.5' }, g.titles.map(function (x, i) { return h('li', { key: i, className: 'flex items-start gap-2' }, h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-[12.5px] text-white leading-snug' }, x.t), x.vi && x.vi !== x.t && h('div', { className: 'text-[11px] text-[#aaa]' }, x.vi)), h('button', { onClick: function () { copyT(x.t); }, className: 'shrink-0 h-6 px-2 rounded-full bg-[#323232] hover:bg-[#424242] text-[10.5px] text-[#f1f1f1] cursor-pointer' }, 'Chép')); }))),
              g.outline.length > 0 && h('div', { className: 'rounded-lg bg-[#161616] border border-[#2a2a2a] p-3' },
                h('div', { className: 'text-[12px] font-semibold text-[#7cc3ff] mb-2' }, 'Dàn ý ' + g.target_minutes + ' phút'),
                h('ol', { className: 'space-y-1.5' }, g.outline.map(function (x, i) { return h('li', { key: i, className: 'grid grid-cols-[52px_minmax(0,1fr)] gap-2 text-[12px]' }, h('span', { className: 'tabular-nums text-[#aaa]' }, (x.minutes || '?') + ' ph'), h('span', { className: 'min-w-0' }, h('b', { className: 'text-white' }, x.part), x.is_new && h('span', { className: 'ml-1.5 px-1.5 py-0.5 rounded bg-[#14261a] text-[#6fcf85] text-[10px] font-semibold' }, 'MỚI'), x.content_vi && h('span', { className: 'block text-[11.5px] text-[#c8c8c8] leading-snug' }, x.content_vi))); }))))),
          h('div', { className: 'text-[11px] text-[#aaa]' }, 'Phần so sánh này đã được đưa vào câu lệnh gửi Claude (tab Prompt). Kịch bản phải viết mới từ hồ sơ, không chép lời hay bố cục của video gốc.')));
    })() : null;
    var overview = h('div', { className: 'grid gap-3 xl:grid-cols-2' },
      rideView,
      D.summary ? card('Tóm tắt', h('p', { className: 'text-xs text-zinc-200 leading-relaxed' }, D.summary), 'xl:col-span-2') : card('Chế độ miễn phí', h('p', { className: 'text-xs text-zinc-400' }, 'Không có AI nên chưa có tóm tắt/timeline. Xem tab Video, Tin & nguồn, Tài liệu gốc — hoặc cấu hình GEMINI_API_KEY để có hồ sơ đầy đủ.'), 'xl:col-span-2'),
      card('Cập nhật mới nhất', list(D.latest, function (x, i) { return li(i, x.date, [x.text, src(x.src)]); })),
      card('Dòng thời gian', list(D.timeline, function (x, i) { return li(i, x.time, [x.text, src(x.src)]); })),
      card('Số liệu', list(D.numbers, function (x, i) { return li(i, null, [h('b', { key: 'l', className: 'text-cham-50' }, x.label + ': '), x.value, src(x.src)]); })),
      card('Trích dẫn nguyên văn', list(D.quotes, function (x, i) { return h('li', { key: i, className: 'text-xs text-zinc-200 border-l-2 border-amber-500/60 pl-2' }, h('div', { className: 'italic' }, '“' + x.quote + '”'), h('div', { className: 'text-[10px] text-zinc-400 mt-0.5' }, '— ' + x.who + (x.role ? ', ' + x.role : '') + (x.date ? ' • ' + x.date : ''), src(x.src))); })),
      card('Nhân vật • tổ chức • địa điểm • đối tượng', h('div', { className: 'flex flex-wrap gap-1.5' }, [].concat((E2.people || []).map(function (x) { return ['Người', x.name, x.role]; }), (E2.organizations || []).map(function (x) { return ['Tổ chức', x.name, x.role]; }), (E2.places || []).map(function (x) { return ['Địa điểm', x.name, x.note]; }), (E2.objects || []).map(function (x) { return ['Đối tượng', x.name + (x.id ? ' • ' + x.id : ''), x.note]; })).map(function (x, i) { return h('span', { key: i, title: x[2] || '', className: 'px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-200' }, h('span', { className: 'text-zinc-500' }, x[0] + ': '), x[1]); }))),
      card('Góc khai thác / hook gợi ý', list(D.angles, function (x, i) { return h('li', { key: i, className: 'text-xs' }, h('div', { className: 'font-bold text-cham-50' }, x.hook), x.why && h('div', { className: 'text-[11px] text-zinc-400' }, x.why)); })),
      (D.reported_claims || []).length > 0 && card('Tin đang được đưa nhưng chưa có xác nhận chính thức', h('div', { className: 'space-y-2' }, D.reported_claims.map(function (x, i) { return h('div', { key: i, className: 'text-xs space-y-0.5' }, h('div', { className: 'text-zinc-100' }, x.claim, src(x.src)), x.reported_by && h('div', { className: 'text-[10px] text-zinc-500' }, 'Nguồn đưa tin: ' + x.reported_by), x.phrasing_en && h('div', { className: 'text-[11px] text-amber-200/90 italic' }, '"' + x.phrasing_en + '"')); })), 'border-amber-500/30 xl:col-span-2'),
      (D.unverified || []).length > 0 && card('Chưa xác minh — không nói như sự thật', list(D.unverified, function (x, i) { return li(i, null, x); }), 'border-rose-500/30'),
      D.sensitivity && card('Lưu ý nhạy cảm', h('p', { className: 'text-xs text-zinc-300 leading-relaxed' }, D.sensitivity), 'border-amber-500/30'));

    var T = E.TYPES;
    var vidView = h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-center gap-1.5' },
        [['', 'Tất cả']].concat(E.TYPE_ORDER.filter(function (k) { return (showAll ? R.videos : rel).some(function (v) { return v.type === k; }); }).map(function (k) { return [k, T[k][1]]; })).map(function (x) { var c = (showAll ? R.videos : rel).filter(function (v) { return !x[0] || v.type === x[0]; }).length; return h('button', { key: x[0] || 'all', onClick: function () { setVType(x[0]); }, className: cx('px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer', vType === x[0] ? 'bg-white text-zinc-950 border-white' : 'bg-zinc-900 text-zinc-300 border-zinc-800') }, x[1] + ' ' + c); }),
        h('label', { className: 'ml-auto flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer' }, h('input', { type: 'checkbox', checked: showAll, onChange: function () { setShowAll(!showAll); } }), 'Hiện cả video có thể không liên quan (' + (R.videos.length - rel.length) + ')'),
        h('button', { onClick: function () { setSel(function (s) { var v = {}; shownV.forEach(function (x) { v[x.id] = true; }); return { v: Object.assign({}, s.v, v), i: s.i }; }); }, className: 'px-2 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Chọn hết'),
        h('button', { onClick: function () { setSel(function (s) { var v = Object.assign({}, s.v); shownV.forEach(function (x) { delete v[x.id]; }); return { v: v, i: s.i }; }); }, className: 'px-2 py-1 rounded-lg text-[11px] bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Bỏ chọn')),
      !shownV.length ? h('div', { className: 'text-xs text-zinc-500 py-8 text-center' }, R.videos.length ? 'Không có video ở mục này.' : 'Chưa tìm được video (kiểm tra API key YouTube / quota).') :
        h('div', { className: 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3' }, shownV.map(function (v) {
          var on = !!sel.v[v.id];
          return h('div', { key: v.id, className: cx('rounded-xl border overflow-hidden flex flex-col bg-zinc-950/70', on ? 'border-amber-500/60' : 'border-zinc-800') },
            h('div', { className: 'relative' },
              h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer' }, h('img', { src: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', loading: 'lazy', className: 'w-full aspect-video object-cover bg-zinc-900' })),
              h('span', { className: 'absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-cham-50' }, T[v.type][1]),
              v.gov && h('span', { className: 'absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-600 text-cham-50' }, 'Chính thức'),
              h('span', { className: 'absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-cham-50' }, v.live === 'live' ? 'LIVE' : E.dur(v.dur)),
              h('label', { className: 'absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-cham-50 cursor-pointer' }, h('input', { type: 'checkbox', checked: on, onChange: function () { toggle('v', v.id); } }), 'Chọn')),
            h('div', { className: 'p-2.5 space-y-1.5 flex-1 flex flex-col' },
              h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'text-xs font-semibold text-zinc-100 line-clamp-2 hover:text-amber-300' }, v.title),
              h('div', { className: 'text-[10px] text-zinc-400 truncate' }, v.channel + ' • ' + N(v.views) + ' view • ' + new Date(v.t).toLocaleDateString('vi-VN')),
              v.hit.length > 0 && h('div', { className: 'flex flex-wrap gap-1' }, v.hit.slice(0, 5).map(function (k) { return h('span', { key: k, className: 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' }, k); })),
              v.chapters.length > 0 && h('details', { className: 'text-[10px] text-zinc-400' }, h('summary', { className: 'cursor-pointer text-zinc-300 font-bold' }, '' + v.chapters.length + ' mốc thời gian'), h('div', { className: 'mt-1 space-y-0.5' }, v.chapters.map(function (c, i) { var sec = c.t.split(':').reduce(function (a, b) { return a * 60 + +b; }, 0); return h('a', { key: i, href: 'https://www.youtube.com/watch?v=' + v.id + '&t=' + sec + 's', target: '_blank', rel: 'noopener noreferrer', className: 'block hover:text-amber-300' }, c.t + '  ' + c.label); }))),
              v.related && h('div', { className: 'grid grid-cols-3 gap-1 pt-1' }, ['1', '2', '3'].map(function (n) { var k = v.id + ':' + n, onF = !!(sel.f && sel.f[k]); return h('button', { key: n, onClick: function () { toggle('f', k); }, title: 'Khung hình YouTube tự tạo — bấm để chọn/bỏ', className: cx('relative rounded overflow-hidden border cursor-pointer', onF ? 'border-amber-400' : 'border-zinc-800 opacity-70 hover:opacity-100') }, h('img', { src: 'https://i.ytimg.com/vi/' + v.id + '/hq' + n + '.jpg', loading: 'lazy', className: 'w-full aspect-video object-cover' }), onF && h('span', { className: 'absolute top-0.5 right-0.5 text-[8px] px-1 rounded bg-amber-400 text-cham-950 font-bold' }, '✓')); })),
              h('div', { className: 'flex items-center gap-2 mt-auto pt-1' }, h('div', { className: 'text-[9px] text-zinc-500 flex-1 line-clamp-2' }, '© ' + v.license), h('button', { onClick: function () { setCap(v); }, className: 'shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Xem & chụp'))));
        })));

    var wvs = R.webVideos || [];
    var webVidBox = wvs.length > 0 && card('Video nhúng trong các bài báo (' + wvs.length + ')', h('div', { className: 'space-y-1.5' }, wvs.map(function (w) {
      var onW = !!(sel.w && sel.w[w.key]);
      return h('div', { key: w.key, className: 'flex items-center gap-2 text-[11px]' }, h('input', { type: 'checkbox', checked: onW, onChange: function () { toggle('w', w.key); } }),
        h('span', { className: cx('shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold', w.level === 'official' ? 'bg-emerald-500/15 text-emerald-300' : w.level === 'news' ? 'bg-sky-500/15 text-sky-300' : 'bg-amber-500/15 text-amber-300') }, E.LV[w.level || 'other']),
        h('a', { href: w.url, target: '_blank', rel: 'noopener noreferrer', className: 'text-zinc-200 hover:text-cham-50 truncate' }, (w.kind === 'youtube' ? 'YouTube ' : w.kind === 'x' ? 'X/Twitter ' : w.kind === 'tiktok' ? 'TikTok ' : w.kind === 'file' ? 'File video ' : 'Video nhúng ') + '— ' + (w.pageTitle || w.site)),
        w.id && h('button', { onClick: function () { setCap({ id: w.id, title: w.pageTitle || w.url, channel: w.site }); }, className: 'ml-auto shrink-0 px-2 py-0.5 rounded text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Xem & chụp'));
    })));
    var capBox = (R.captures || []).length > 0 && card('Ảnh bạn đã chụp từ video (' + R.captures.length + ')', h('div', { className: 'grid gap-2 grid-cols-2 md:grid-cols-4' }, R.captures.map(function (c) {
      return h('div', { key: c.key, className: 'rounded-lg overflow-hidden border border-zinc-800' }, h('img', { src: c.dataUrl, className: 'w-full aspect-video object-cover' }),
        h('div', { className: 'p-1.5 flex items-center gap-1.5 text-[10px]' }, h('span', { className: 'text-zinc-400 truncate flex-1', title: c.title }, (c.t != null ? E.dur(c.t) + ' · ' : '') + c.title),
          h('a', { href: c.dataUrl, download: slug(c.title) + '-' + Math.floor(c.t || 0) + 's.jpg', className: 'text-sky-300 hover:underline' }, 'Tải'), h('button', { onClick: function () { delCapture(c.key); }, className: 'text-zinc-500 hover:text-rose-300 cursor-pointer' }, 'Xoá')));
    })));
    var IG = [['', 'Tất cả'], ['free', 'Giấy phép mở'], ['news', 'Báo chí & web'], ['official', 'Nguồn chính thức'], ['yt', 'Thumbnail YouTube']];
    var shownI = R.images.filter(function (x) { return !iKind || imgGroup(x) === iKind; });
    var imgBar = h('div', { className: 'yt-card p-3 space-y-2.5' },
      h('div', { className: 'flex flex-wrap items-center gap-1.5' },
        IG.map(function (g) { var n = R.images.filter(function (x) { return !g[0] || imgGroup(x) === g[0]; }).length; return n || !g[0] ? chip(iKind === g[0], g[1] + ' ' + n, function () { setIKind(g[0]); }, g[0] || 'all') : null; }),
        h('span', { className: 'flex-1' }),
        h('button', { onClick: function () { selectImages(true); }, className: 'h-8 px-3 rounded-lg text-[11.5px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] cursor-pointer' }, 'Chọn hết'),
        h('button', { onClick: function () { selectImages(false); }, className: 'h-8 px-3 rounded-lg text-[11.5px] font-medium bg-[#272727] hover:bg-[#3a3a3a] text-[#f1f1f1] cursor-pointer' }, 'Bỏ chọn'),
        h('button', { disabled: !!pk, onClick: function () { pack(); }, className: 'h-8 px-3.5 rounded-lg text-[11.5px] font-semibold bg-[#2ba640] hover:bg-[#35b84c] text-white disabled:opacity-60 cursor-pointer tabular-nums' }, pk ? 'Đang tải ' + pk.done + '/' + pk.total + '…' : 'Tải ' + nSelI + ' ảnh đã chọn (.zip)')),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('input', { value: iq, onChange: function (e) { setIq(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') moreImages(); }, 'aria-label': 'Từ khoá tìm thêm ảnh', placeholder: 'Tìm thêm ảnh giấy phép mở: gõ tên người, địa điểm, sự kiện (cách nhau bằng dấu phẩy, nên gõ cả tên gốc)', className: 'flex-1 min-w-[240px] h-8 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 text-[11.5px] text-zinc-100' }),
        h('button', { disabled: ib || !iq.trim(), onClick: moreImages, className: 'h-8 px-3.5 rounded-lg text-[11.5px] font-semibold bg-[#3ea6ff] hover:bg-[#65b8ff] text-[#0f0f0f] disabled:opacity-40 cursor-pointer' }, ib ? 'Đang tìm…' : 'Tìm thêm ảnh')),
      h('div', { className: 'text-[11px] text-zinc-500' }, 'Ảnh Wikimedia Commons và Openverse có giấy phép mở, dùng được nếu ghi công đúng. Ảnh báo chí và thumbnail YouTube có bản quyền: chỉ dùng kèm bình luận và ghi nguồn, hoặc xin phép trước.'));
    var imgView = h('div', { className: 'space-y-3' }, capBox, imgBar,
      shownI.length ? h('div', { className: 'grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }, shownI.map(function (x) {
        var on = !!sel.i[x.key];
        return h('div', { key: x.key, className: cx('rounded-xl border overflow-hidden bg-zinc-950/70 flex flex-col', on ? 'border-amber-500/60' : 'border-zinc-800') },
          h('a', { href: x.page || x.url, target: '_blank', rel: 'noopener noreferrer', className: 'relative block' }, h('img', { src: x.thumb || x.url, loading: 'lazy', referrerPolicy: 'no-referrer', className: 'w-full aspect-video object-cover bg-zinc-900' }), h('span', { className: 'absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-cham-50' }, x.kind)),
          h('div', { className: 'p-2 space-y-1 flex-1 flex flex-col' },
            h('div', { className: 'text-[11px] text-zinc-200 line-clamp-2', title: x.title }, x.title),
            h('div', { className: 'text-[9px] text-zinc-500 line-clamp-2', title: x.license }, '© ' + x.license),
            h('div', { className: 'flex items-center gap-2 mt-auto pt-1' }, h('label', { className: 'flex items-center gap-1 text-[10px] text-zinc-300 cursor-pointer' }, h('input', { type: 'checkbox', checked: on, onChange: function () { toggle('i', x.key); } }), 'Chọn'), h('a', { href: x.url, target: '_blank', rel: 'noopener noreferrer', className: 'ml-auto text-[10px] text-amber-300 hover:underline' }, 'Ảnh gốc ↗'))));
      })) : h('div', { className: 'text-xs text-zinc-500' }, 'Chưa tìm được ảnh tự động — dùng các link tìm ảnh bên dưới.'),
      R.imageLinks.length > 0 && card('Tìm thêm ảnh theo từng chủ đề', h('div', { className: 'space-y-1.5' }, R.imageLinks.map(function (x, i) { return h('div', { key: i, className: 'flex flex-wrap items-center gap-2 text-[11px]' }, h('span', { className: 'text-zinc-200 font-semibold' }, x.q), x.what && h('span', { className: 'text-zinc-500' }, '— ' + x.what), h('a', { href: x.google, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-300 hover:underline' }, 'Google Ảnh'), h('a', { href: x.getty, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-300 hover:underline' }, 'Getty (báo chí)'), h('a', { href: x.commons, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-300 hover:underline' }, 'Commons (miễn phí)')); }))));

    var srcView = h('div', { className: 'grid gap-3 xl:grid-cols-2' },
      card('Nguồn AI đã đọc (' + R.sources.length + ')', R.sources.length ? h('ol', { className: 'space-y-2' }, R.sources.map(function (s) { return h('li', { key: s.n, className: 'flex gap-2 text-xs' }, s.image ? h('img', { src: s.image, loading: 'lazy', referrerPolicy: 'no-referrer', className: 'w-20 aspect-video object-cover rounded bg-zinc-900 shrink-0' }) : h('span', { className: 'w-6 text-amber-300 font-bold shrink-0' }, '[' + s.n + ']'), h('div', { className: 'min-w-0' }, h('a', { href: s.real || s.uri, target: '_blank', rel: 'noopener noreferrer', className: 'text-zinc-100 hover:text-amber-300 font-semibold line-clamp-2' }, (s.image ? '[' + s.n + '] ' : '') + (s.realTitle || s.title)), h('div', { className: 'text-[10px] text-zinc-500 truncate' }, (s.site || s.title) + (s.published ? ' • ' + String(s.published).slice(0, 10) : '')))); })) : h('div', { className: 'text-[11px] text-zinc-500' }, 'Chế độ miễn phí không có nguồn AI.')),
      card('Tin mới nhất — Google News (' + R.news.length + ')', R.news.length ? h('ul', { className: 'space-y-2 max-h-[560px] overflow-auto pr-1' }, R.news.map(function (x, i) { return h('li', { key: i, className: 'text-xs' }, h('a', { href: x.link, target: '_blank', rel: 'noopener noreferrer', className: 'text-zinc-100 hover:text-amber-300 font-semibold' }, x.title), h('div', { className: 'text-[10px] text-zinc-500' }, (x.source || '') + (x.t ? ' • ' + new Date(x.t).toLocaleString('vi-VN') : ''))); })) : h('div', { className: 'text-[11px] text-zinc-500' }, 'Không lấy được tin.')),
      (R.searchQueries || []).length > 0 && card('AI đã tìm với', h('div', { className: 'flex flex-wrap gap-1.5' }, R.searchQueries.map(function (q, i) { return h('span', { key: i, className: 'text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300' }, q); })), 'xl:col-span-2'));

    var groups = {}; R.links.forEach(function (l) { (groups[l.group] = groups[l.group] || []).push(l); });
    var docView = h('div', { className: 'grid gap-3 md:grid-cols-2 xl:grid-cols-3' }, Object.keys(groups).map(function (g) { return card(g, h('ul', { className: 'space-y-1.5' }, groups[g].map(function (l, i) { return h('li', { key: i, className: 'text-xs' }, h('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-300 hover:underline font-semibold' }, l.name + ' ↗'), l.what && h('div', { className: 'text-[10px] text-zinc-500' }, l.what)); }))); }));

    var promptView = h('div', { className: 'space-y-2' },
      h('div', { className: 'text-[11px] text-zinc-500' }, 'Prompt gửi Claude: phần đầu là việc cần làm (kịch bản, bảng phân cảnh, sửa ảnh, thumbnail), phần sau là hồ sơ có nguồn và danh sách ảnh, video bạn đã chọn. Dán vào Claude rồi đính kèm file zip tài nguyên.'),
      h('textarea', { readOnly: true, value: claudeText, rows: 28, className: 'w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-200 leading-relaxed' }),
      h('div', { className: 'text-[10px] text-zinc-500' }, N(claudeText.length) + ' ký tự'));

    return h('section', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] animate-in fade-in duration-200' },
      h('div', { className: 'space-y-3 min-w-0' }, form, head, tabBar, view === 'over' ? overview : view === 'vid' ? h('div', { className: 'space-y-3' }, vidView, webVidBox, capBox) : view === 'img' ? imgView : view === 'src' ? srcView : view === 'doc' ? docView : promptView),
      cap && h(Capture, { v: cap, onClose: function () { setCap(null); }, onShot: function (c) { return addCapture(c); } }),
      h('div', { className: 'space-y-3' }, histBox));
  }
  window.ResourceStudio = ResourceStudio;
})();
