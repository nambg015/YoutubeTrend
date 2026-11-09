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
  function buildPrompt(R, sel) {
    var D = R.dossier, L = [], E2 = D.entities || {};
    var vids = R.videos.filter(function (v) { return sel.v[v.id]; }), imgs = R.images.filter(function (i) { return sel.i[i.key]; });
    var sec = function (t) { L.push('', '## ' + t); };
    L.push('# HỒ SƠ TÀI NGUYÊN VIDEO — ' + (D.title || 'Không tên'));
    L.push('Tạo lúc: ' + new Date(R.at).toLocaleString('vi-VN') + ' • Chế độ: ' + (R.mode === 'ai' ? 'Gemini + Google Search' : 'miễn phí (Google News + YouTube)') + (D.category ? ' • Danh mục: ' + D.category : '') + (D.event_date ? ' • Ngày sự kiện: ' + D.event_date : '') + (D.status ? ' • Tình trạng: ' + D.status : ''));
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
      frames.forEach(function (f, i) { L.push('F' + (i + 1) + '. Khung hình ' + f.label + ' của "' + f.title + '" (' + f.channel + ')'); L.push('    Ảnh: ' + f.url + '  •  bản lớn: ' + f.big); L.push('    Video: https://www.youtube.com/watch?v=' + f.id); });
      caps.forEach(function (c, i) { L.push('C' + (i + 1) + '. Ảnh chụp tại ' + (c.t != null ? dur(c.t) : '?') + ' của "' + c.title + '" — https://www.youtube.com/watch?v=' + c.videoId + (c.t != null ? '&t=' + Math.floor(c.t) + 's' : '') + ' (file ảnh lưu trong phiên YouTrend)'); });
    }
    if (wv.length) {
      sec('VIDEO NHÚNG TRONG BÀI BÁO (' + wv.length + ')');
      wv.forEach(function (w, i) { L.push('W' + (i + 1) + '. [' + LV[w.level || 'other'] + '] ' + w.url + '  — từ bài: ' + (w.pageTitle || w.site) + ' (' + w.page + ')'); });
    }
    if (imgs.length) {
      sec('HÌNH ẢNH ĐÃ CHỌN (' + imgs.length + ')');
      imgs.forEach(function (x, i) { L.push('I' + (i + 1) + '. [' + x.kind + '] ' + x.title); L.push('    Ảnh: ' + x.url + (x.page ? '\n    Trang gốc: ' + x.page : '')); L.push('    Bản quyền: ' + x.license); });
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
      schema: 'youtrend.resource.v1', created: new Date(R.at).toISOString(), mode: R.mode, brief: R.prompt, reference_video: R.refVideo || null,
      dossier: R.dossier, sources: R.sources,
      videos: R.videos.filter(function (v) { return sel.v[v.id]; }).map(function (v) { return { id: v.id, url: 'https://www.youtube.com/watch?v=' + v.id, title: v.title, type: v.type, type_label: TYPES[v.type][1], channel: v.channel, channel_id: v.channelId, official: v.gov, published: new Date(v.t).toISOString(), duration_sec: v.dur, views: v.views, chapters: v.chapters, matched_keywords: v.hit, license_note: v.license }; }),
      images: R.images.filter(function (i) { return sel.i[i.key]; }).map(function (i) { return { kind: i.kind, verification: i.level || '', title: i.title, image_url: i.url, page_url: i.page || '', license_note: i.license, author: i.author || '' }; }),
      youtube_frames: frameList(R).filter(function (f) { return sel.f && sel.f[f.key]; }).map(function (f) { return { video_id: f.id, label: f.label, image_url: f.url, image_url_large: f.big, video_title: f.title }; }),
      captures: (R.captures || []).map(function (c) { return { video_id: c.videoId, time_sec: c.t, video_title: c.title, note: 'Ảnh lưu trong phiên YouTrend' }; }),
      web_videos: (R.webVideos || []).filter(function (w) { return sel.w && sel.w[w.key]; }).map(function (w) { return { kind: w.kind, url: w.url, verification: w.level, page: w.page, site: w.site }; }),
      image_search: R.imageLinks, reference_links: R.links, news: R.news
    };
  }
  return { LV: LV, frameList: frameList, TYPES: TYPES, TYPE_ORDER: TYPE_ORDER, iso: iso, dur: dur, fmtN: fmtN, ytId: ytId, keywords: keywords, freeDossier: freeDossier, classify: classify, chapters: chapters, collectVideos: collectVideos, topicLinks: topicLinks, imageLinks: imageLinks, buildPrompt: buildPrompt, buildJson: buildJson };
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
    return h('div', { className: 'fixed inset-0 z-[80] bg-[#111215]/85 flex items-start justify-center p-3 overflow-y-auto', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: 'w-full max-w-5xl mt-6 rounded-xl border border-zinc-800 bg-[#1e1f24] p-4 space-y-3' },
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
    var a2 = useState(function () { try { return Object.assign({ hours: 168, lang: 'vi', nq: 8 }, JSON.parse(localStorage.getItem('res1_opt') || '{}')); } catch (e) { return { hours: 168, lang: 'vi', nq: 8 }; } }), opt = a2[0], setOpt = a2[1];
    var a3 = useState(null), R = a3[0], setR = a3[1];
    var a4 = useState({ v: {}, i: {} }), sel = a4[0], setSel = a4[1];
    var a5 = useState(null), prog = a5[0], setProg = a5[1];
    var a6 = useState(''), err = a6[0], setErr = a6[1];
    var a7 = useState('over'), view = a7[0], setView = a7[1];
    var a8 = useState([]), hist = a8[0], setHist = a8[1];
    var a9 = useState(''), vType = a9[0], setVType = a9[1];
    var b0 = useState(false), showAll = b0[0], setShowAll = b0[1];
    var b1 = useState(''), msg = b1[0], setMsg = b1[1];
    useEffect(function () { dbGet('history').then(function (x) { setHist(x || []); }); }, []);
    function setO(k, v) { setOpt(function (o) { var n = Object.assign({}, o); n[k] = v; try { localStorage.setItem('res1_opt', JSON.stringify(n)); } catch (e) { } return n; }); }
    function toast(m) { p.showToast ? p.showToast(m) : setMsg(m); }
    var busy = !!prog;
    function defaultSel(r) { if (r.sel) return r.sel; var v = {}, i = {}, f = {}, w = {}; r.videos.forEach(function (x) { if (x.related) v[x.id] = true; }); r.images.slice(0, 30).forEach(function (x) { i[x.key] = true; }); E.frameList(r).slice(0, 15).forEach(function (x) { f[x.key] = true; }); (r.webVideos || []).forEach(function (x) { w[x.key] = true; }); return { v: v, i: i, f: f, w: w }; }
    async function saveHist(r) { var cur = (await dbGet('history')) || []; var list = [r].concat(cur.filter(function (x) { return x.id !== r.id; })).slice(0, 60); setHist(list); await dbSet('history', list); try { window.dispatchEvent(new CustomEvent('res-history')); } catch (e) { } }
    useEffect(function () { if (!p.openId) return; dbGet('history').then(function (l) { var r = (l || []).find(function (x) { return x.id === p.openId; }); if (r) openHist(r); }); }, [p.openId, p.openKey]);
    var c0 = useState(null), cap = c0[0], setCap = c0[1];
    async function addCapture(c) { var r = Object.assign({}, R, { captures: (R.captures || []).concat([c]) }); setR(r); await saveHist(Object.assign({}, r, { sel: sel })); toast('Đã lưu khung hình vào phiên'); }
    async function delCapture(key) { var r = Object.assign({}, R, { captures: (R.captures || []).filter(function (c) { return c.key !== key; }) }); setR(r); await saveHist(Object.assign({}, r, { sel: sel })); }

    async function run() {
      var text = prompt.trim(); if (text.length < 8) { setErr('Hãy mô tả vụ việc rõ hơn (ít nhất vài từ: sự kiện gì, ở đâu, khi nào).'); return; }
      if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return; }
      setErr(''); setMsg(''); var st = {}; var mark = function (k, s, note) { st[k] = [s, note || '']; setProg(Object.assign({}, st)); };
      var yt = function (path, prm) { return p.yt(path, prm, p.apiKey); };
      var res = { id: Date.now().toString(36), at: Date.now(), prompt: text, opt: opt, mode: 'ai', sources: [], news: [], videos: [], images: [], links: [], imageLinks: [], refVideo: null, units: 0 };
      try {
        // video mẫu (tuỳ chọn)
        var ctx = '', vid = E.ytId(ref);
        if (vid) { try { var rv = await yt('videos', { part: 'snippet', id: vid }); var it = (rv.items || [])[0]; if (it) { res.refVideo = { id: vid, title: it.snippet.title, channel: it.snippet.channelTitle }; ctx = 'Title: ' + it.snippet.title + '\nChannel: ' + it.snippet.channelTitle + '\nPublished: ' + it.snippet.publishedAt + '\nDescription: ' + String(it.snippet.description || '').slice(0, 1500); } } catch (e) { } }
        // B1 + B2: AI
        var D = null;
        mark('ai', 'run');
        try {
          var s1 = await api({ action: 'search', prompt: text, context: ctx, hours: opt.hours });
          res.sources = s1.sources || []; res.searchQueries = s1.queries || [];
          mark('ai', 'ok', res.sources.length + ' nguồn'); mark('struct', 'run');
          var s2 = await api({ action: 'structure', prompt: text, report: s1.report, sources: res.sources, lang: opt.lang });
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
        try { var nw = await api({ action: 'news', queries: D.news_queries.length ? D.news_queries : [D.title], hours: opt.hours }); res.news = nw.items || []; mark('news', 'ok', res.news.length + ' tin'); }
        catch (e) { if (e.code === 'QUOTA_EXCEEDED') throw e; mark('news', 'skip', e.message); }
        // B4: YouTube
        mark('yt', 'run');
        try {
          var cv = await E.collectVideos({ yt: yt, dossier: D, hours: opt.hours, maxQueries: opt.nq, onProgress: function (m) { mark('yt', 'run', m); } });
          res.videos = cv.videos; res.units = cv.units; mark('yt', 'ok', cv.videos.filter(function (v) { return v.related; }).length + ' liên quan / ' + cv.videos.length + ' video • ' + cv.units + ' quota');
        } catch (e) { mark('yt', 'skip', 'YouTube API: ' + (e.message || 'lỗi') + ' (hết quota thì đổi key)'); }
        // B5: ảnh + mở nguồn
        mark('media', 'run');
        var imgs = [];
        try {
          var urls = res.sources.map(function (s) { return s.uri; });
          var en = await api({ action: 'enrich', urls: urls, imageQueries: D.image_queries.map(function (x) { return x.q; }).slice(0, 5) });
          var byFrom = {}; (en.pages || []).forEach(function (pg) { byFrom[pg.from] = pg; });
          res.sources.forEach(function (s) { var pg = byFrom[s.uri]; if (pg) { s.real = pg.url; s.realTitle = pg.title || s.title; s.site = pg.site; s.published = pg.published; s.image = pg.image; } });
          var KIND = { official: 'Ảnh nguồn chính thức', news: 'Ảnh báo chí', social: 'Ảnh mạng xã hội — chưa xác minh', other: 'Ảnh web — chưa xác minh' }, seenI = {}, wv = [];
          (en.pages || []).forEach(function (pg) {
            var lv = pg.level || 'other';
            (pg.images || (pg.image ? [{ url: pg.image }] : [])).forEach(function (im) { if (seenI[im.url]) return; seenI[im.url] = 1; imgs.push({ key: 'pg:' + im.url, kind: KIND[lv], level: lv, title: (im.alt || pg.title || pg.site || '').slice(0, 160), url: im.url, page: pg.url, thumb: im.url, license: (lv === 'official' ? 'Tác phẩm của cơ quan nhà nước — thường được dùng, vẫn ghi nguồn ' : 'Có bản quyền của ') + (pg.site || 'trang gốc') + (lv === 'official' ? '' : ' — cần xin phép / dùng có bình luận, ghi nguồn') }); });
            (pg.videos || []).forEach(function (vv) { if (wv.some(function (x) { return x.url === vv.url; })) return; wv.push({ key: 'wv:' + vv.url, kind: vv.kind, url: vv.url, id: vv.id, level: vv.kind === 'x' || vv.kind === 'tiktok' ? 'social' : lv, page: pg.url, site: pg.site, pageTitle: pg.title }); });
          });
          res.webVideos = wv;
          (en.commons || []).forEach(function (c) { imgs.push({ key: 'wc:' + c.url, kind: 'Wikimedia Commons', title: c.title, url: c.url, page: c.page, thumb: c.thumb, author: c.author, license: (c.license || 'Xem trang gốc') + (c.author ? ' • tác giả: ' + c.author : '') + ' — ghi công theo giấy phép' }); });
          mark('media', 'ok', imgs.length + ' ảnh • ' + (res.webVideos || []).length + ' video trong bài báo');
        } catch (e) { mark('media', 'skip', e.message); }
        res.videos.filter(function (v) { return v.related; }).slice(0, 8).forEach(function (v) { imgs.push({ key: 'yt:' + v.id, kind: 'Thumbnail YouTube', title: v.title, url: 'https://i.ytimg.com/vi/' + v.id + '/maxresdefault.jpg', page: 'https://www.youtube.com/watch?v=' + v.id, thumb: 'https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg', license: 'Bản quyền của kênh ' + v.channel + ' — chỉ tham khảo bố cục' }); });
        res.images = imgs; res.links = E.topicLinks(D, text); res.imageLinks = E.imageLinks(D);
        setR(res); setSel(defaultSel(res)); setView('over'); setVType(''); setShowAll(false); await saveHist(res);
        toast('Xong hồ sơ: ' + res.videos.filter(function (v) { return v.related; }).length + ' video liên quan • ' + imgs.length + ' ảnh • ' + res.sources.length + ' nguồn');
      } catch (e) { setErr(e.message || 'Lỗi tạo hồ sơ'); }
      setProg(null);
    }

    var promptText = useMemo(function () { return R ? E.buildPrompt(R, sel) : ''; }, [R, sel]);
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
      h('div', null, h('h2', { className: 'text-[13px] font-semibold text-cham-50' }, 'Hồ sơ tài nguyên làm video'),
        h('div', { className: 'text-[11px] text-zinc-400' }, 'Dán thông tin vụ việc → tìm tin mới nhất có nguồn, timeline, trích dẫn, video họp báo/bản tin/hiện trường/ghi âm trên YouTube, ảnh thật kèm giấy phép, tài liệu gốc theo đúng loại sự kiện → xuất prompt + JSON.')),
      h('textarea', { value: prompt, onChange: function (e) { setPrompt(e.target.value); }, rows: 5, placeholder: 'Ví dụ: Vụ rơi máy bay Learjet 60 số hiệu N722BD ở Florida đầu tháng 11/2026. NTSB đã họp báo, tìm thấy động cơ và mảnh vỡ trên mái nhà. Cần tin mới nhất, ghi âm ATC, họp báo NTSB, ảnh thật của chiếc máy bay, đường bay...', className: 'w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 outline-none rounded-xl px-3 py-2.5 text-sm text-zinc-100 leading-relaxed' }),
      h('div', { className: 'grid gap-2 sm:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]' },
        h('div', null, lab('Link video YouTube mẫu (tuỳ chọn)'), h('input', { value: ref, onChange: function (e) { setRef(e.target.value); }, placeholder: 'https://youtu.be/... video bạn muốn làm theo', className: 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100' })),
        h('div', null, lab('Tin trong'), sel1('hours', [[24, '24 giờ qua'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày'], [0, 'Mọi lúc']])),
        h('div', null, lab('Ngôn ngữ hồ sơ'), sel1('lang', [['vi', 'Tiếng Việt'], ['en', 'English']])),
        h('div', null, lab('Độ sâu video'), sel1('nq', [[5, '5 truy vấn ≈ 0.5K quota'], [8, '8 truy vấn ≈ 0.8K quota'], [12, '12 truy vấn ≈ 1.2K quota']]))),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('button', { disabled: busy, onClick: function () { return run(); }, className: 'px-5 py-2.5 rounded-xl text-sm font-bold bg-[#e3b55a] hover:bg-[#ecc271] text-[#231a08] disabled:opacity-40 cursor-pointer' }, busy ? 'Đang tạo hồ sơ...' : 'Tạo hồ sơ tài nguyên'),
        h('span', { className: 'text-[10px] text-zinc-500' }, 'Mỗi hồ sơ: 1 lượt AI + ~' + (opt.nq * 100) + ' quota YouTube. AI lỗi/hết lượt sẽ tự chuyển chế độ miễn phí.')),
      err && h('div', { className: 'rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200' }, err),
      msg && h('div', { className: 'text-[11px] text-emerald-300' }, msg),
      prog && h('div', { className: 'grid gap-1.5 sm:grid-cols-5' }, STEPS.map(function (s) { var x = prog[s[0]] || ['wait', '']; return h('div', { key: s[0], className: cx('rounded-lg border px-2 py-1.5 text-[10px]', x[0] === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200' : x[0] === 'run' ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : x[0] === 'skip' ? 'border-zinc-700 bg-zinc-900 text-zinc-400' : 'border-zinc-800 text-zinc-600') }, h('div', { className: 'font-bold' }, (x[0] === 'ok' ? '✓ ' : x[0] === 'run' ? '' : x[0] === 'skip' ? '↷ ' : '○ ') + s[1]), x[1] && h('div', { className: 'mt-0.5 opacity-80 line-clamp-2' }, x[1])); })));

    var histBox = hist.length > 0 && h('div', { className: 'rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-1.5' }, lab('Hồ sơ đã tạo (' + hist.length + ')'),
      hist.map(function (x) { return h('div', { key: x.id, className: cx('flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]', R && R.id === x.id ? 'bg-zinc-800' : 'hover:bg-zinc-900') }, h('button', { onClick: function () { openHist(x); }, className: 'flex-1 min-w-0 text-left cursor-pointer' }, h('div', { className: 'font-bold text-zinc-100 truncate' }, (x.dossier && x.dossier.title) || x.prompt.slice(0, 60)), h('div', { className: 'text-[10px] text-zinc-500' }, new Date(x.at).toLocaleString('vi-VN') + ' • ' + x.videos.length + ' video')), h('button', { onClick: function () { delHist(x.id); }, title: 'Xoá', className: 'text-zinc-500 hover:text-rose-400 cursor-pointer' }, '✕')); }));

    if (!R) return h('section', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] animate-in fade-in duration-200' }, form, h('div', { className: 'space-y-3' }, histBox || h('div', { className: 'rounded-xl border border-dashed border-zinc-800 p-4 text-[11px] text-zinc-500 leading-relaxed' }, 'Hồ sơ bạn tạo sẽ được lưu ở đây (trên trình duyệt này) để mở lại bất cứ lúc nào.')));

    var D = R.dossier, E2 = D.entities || {};
    var rel = R.videos.filter(function (v) { return v.related; }), shownV = (showAll ? R.videos : rel).filter(function (v) { return !vType || v.type === vType; });
    var nSelV = Object.keys(sel.v).filter(function (k) { return sel.v[k]; }).length, nSelI = Object.keys(sel.i).filter(function (k) { return sel.i[k]; }).length;
    var head = h('div', { className: 'yt-card border-hoe-600/50 p-4 space-y-2' },
      h('div', { className: 'flex flex-wrap items-center gap-1.5 text-[10px]' },
        h('span', { className: 'px-2 py-0.5 rounded-md font-bold ' + (R.mode === 'ai' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40' : 'bg-zinc-800 text-zinc-300 border border-zinc-700') }, R.mode === 'ai' ? 'Gemini + Google Search' : 'Chế độ miễn phí'),
        D.category && h('span', { className: 'px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-bold' }, D.category),
        D.event_date && h('span', { className: 'px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700' }, '' + D.event_date),
        D.status && h('span', { className: 'px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30' }, D.status),
        h('span', { className: 'text-zinc-500' }, 'tạo ' + new Date(R.at).toLocaleString('vi-VN'))),
      R.mode !== 'ai' && R.aiError && h('div', { className: 'text-[11px] text-amber-200/90' }, 'Bước AI lỗi: ' + R.aiError + (/GEMINI_API_KEY|501/.test(R.aiError) ? ' — thêm GEMINI_API_KEY trên Vercel rồi Redeploy.' : ' — thử lại sau ít phút.')),
      h('h3', { className: 'text-lg sm:text-xl font-bold text-cham-50' }, D.title),
      h('div', { className: 'flex flex-wrap gap-2 pt-1' },
        h('button', { onClick: function () { copy(promptText, 'prompt'); }, className: 'px-4 py-2 rounded-xl text-xs font-bold bg-[#e3b55a] hover:bg-[#ecc271] text-[#231a08] cursor-pointer' }, 'Copy prompt'),
        h('button', { onClick: function () { download(slug(D.title) + '.json', JSON.stringify(E.buildJson(R, sel), null, 2), 'application/json'); }, className: 'px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-950 cursor-pointer' }, 'Tải JSON'),
        h('button', { onClick: function () { copy(JSON.stringify(E.buildJson(R, sel), null, 2), 'JSON'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Copy JSON'),
        h('button', { onClick: function () { download(slug(D.title) + '.txt', promptText, 'text/plain;charset=utf-8'); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-800 text-zinc-200 cursor-pointer' }, 'Tải .txt'),
        h('button', { onClick: function () { setR(null); }, className: 'px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 cursor-pointer' }, '＋ Hồ sơ mới'),
        h('span', { className: 'self-center text-[10px] text-zinc-400' }, 'Đang chọn ' + nSelV + ' video • ' + nSelI + ' ảnh • ' + Object.keys(sel.f || {}).filter(function (k) { return sel.f[k]; }).length + ' khung hình • ' + (R.captures || []).length + ' ảnh chụp')),
      p.extraHead && p.extraHead(Object.assign({}, R, { sel: sel }), promptText, function (r2) { setR(r2); return saveHist(r2); }));

    var tabs = [['over', 'Tổng quan'], ['vid', 'Video (' + rel.length + ')'], ['img', 'Hình ảnh (' + R.images.length + ')'], ['src', 'Tin & nguồn (' + (R.sources.length + R.news.length) + ')'], ['doc', 'Tài liệu gốc (' + R.links.length + ')'], ['prompt', 'Prompt']];
    var tabBar = h('div', { className: 'flex flex-wrap gap-1 border-b border-zinc-800' }, tabs.map(function (t) { return h('button', { key: t[0], onClick: function () { setView(t[0]); }, className: cx('px-3 py-2 text-xs font-bold border-b-2 cursor-pointer', view === t[0] ? 'border-amber-400 text-cham-50' : 'border-transparent text-zinc-500 hover:text-zinc-200') }, t[1]); }));

    var list = function (arr, render) { return arr.length ? h('ul', { className: 'space-y-1.5' }, arr.map(render)) : h('div', { className: 'text-[11px] text-zinc-500' }, 'Chưa có dữ liệu.'); };
    var li = function (k, a, b) { return h('li', { key: k, className: 'text-xs text-zinc-200 leading-relaxed flex gap-2' }, a ? h('span', { className: 'shrink-0 text-[10px] font-bold text-amber-300 min-w-[78px]' }, a) : null, h('span', null, b)); };
    var overview = h('div', { className: 'grid gap-3 xl:grid-cols-2' },
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
              h('span', { className: 'absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#111215]/85 text-cham-50' }, T[v.type][1]),
              v.gov && h('span', { className: 'absolute top-1.5 right-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-600 text-cham-50' }, 'Chính thức'),
              h('span', { className: 'absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-[#111215]/85 text-cham-50' }, v.live === 'live' ? 'LIVE' : E.dur(v.dur)),
              h('label', { className: 'absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#111215]/85 text-cham-50 cursor-pointer' }, h('input', { type: 'checkbox', checked: on, onChange: function () { toggle('v', v.id); } }), 'Chọn')),
            h('div', { className: 'p-2.5 space-y-1.5 flex-1 flex flex-col' },
              h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'text-xs font-semibold text-zinc-100 line-clamp-2 hover:text-amber-300' }, v.title),
              h('div', { className: 'text-[10px] text-zinc-400 truncate' }, v.channel + ' • ' + N(v.views) + ' view • ' + new Date(v.t).toLocaleDateString('vi-VN')),
              v.hit.length > 0 && h('div', { className: 'flex flex-wrap gap-1' }, v.hit.slice(0, 5).map(function (k) { return h('span', { key: k, className: 'text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' }, k); })),
              v.chapters.length > 0 && h('details', { className: 'text-[10px] text-zinc-400' }, h('summary', { className: 'cursor-pointer text-zinc-300 font-bold' }, '' + v.chapters.length + ' mốc thời gian'), h('div', { className: 'mt-1 space-y-0.5' }, v.chapters.map(function (c, i) { var sec = c.t.split(':').reduce(function (a, b) { return a * 60 + +b; }, 0); return h('a', { key: i, href: 'https://www.youtube.com/watch?v=' + v.id + '&t=' + sec + 's', target: '_blank', rel: 'noopener noreferrer', className: 'block hover:text-amber-300' }, c.t + '  ' + c.label); }))),
              v.related && h('div', { className: 'grid grid-cols-3 gap-1 pt-1' }, ['1', '2', '3'].map(function (n) { var k = v.id + ':' + n, onF = !!(sel.f && sel.f[k]); return h('button', { key: n, onClick: function () { toggle('f', k); }, title: 'Khung hình YouTube tự tạo — bấm để chọn/bỏ', className: cx('relative rounded overflow-hidden border cursor-pointer', onF ? 'border-amber-400' : 'border-zinc-800 opacity-70 hover:opacity-100') }, h('img', { src: 'https://i.ytimg.com/vi/' + v.id + '/hq' + n + '.jpg', loading: 'lazy', className: 'w-full aspect-video object-cover' }), onF && h('span', { className: 'absolute top-0.5 right-0.5 text-[8px] px-1 rounded bg-amber-400 text-cham-950 font-bold' }, '✓')); })),
              h('div', { className: 'flex items-center gap-2 mt-auto pt-1' }, h('div', { className: 'text-[9px] text-zinc-500 flex-1 line-clamp-2' }, '© ' + v.license), h('button', { onClick: function () { setCap(v); }, className: 'shrink-0 px-2 py-1 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Xem & chụp'))));
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
    var imgView = h('div', { className: 'space-y-3' }, capBox,
      h('div', { className: 'text-[11px] text-zinc-500' }, 'Ảnh Wikimedia Commons có giấy phép ghi rõ (thường được dùng nếu ghi công đúng). Ảnh báo chí và thumbnail YouTube có bản quyền — chỉ để tham khảo hoặc xin phép trước khi dùng.'),
      R.images.length ? h('div', { className: 'grid gap-2.5 grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }, R.images.map(function (x) {
        var on = !!sel.i[x.key];
        return h('div', { key: x.key, className: cx('rounded-xl border overflow-hidden bg-zinc-950/70 flex flex-col', on ? 'border-amber-500/60' : 'border-zinc-800') },
          h('a', { href: x.page || x.url, target: '_blank', rel: 'noopener noreferrer', className: 'relative block' }, h('img', { src: x.thumb || x.url, loading: 'lazy', referrerPolicy: 'no-referrer', className: 'w-full aspect-video object-cover bg-zinc-900' }), h('span', { className: 'absolute top-1 left-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#111215]/85 text-cham-50' }, x.kind)),
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
      h('div', { className: 'text-[11px] text-zinc-500' }, 'Prompt này gom mọi thứ bạn đã chọn (video, ảnh) + tin, timeline, trích dẫn, nguồn. Dán sang tab tổng hợp video của bạn hoặc AI khác. JSON chứa cùng dữ liệu ở dạng máy đọc được (schema youtrend.resource.v1).'),
      h('textarea', { readOnly: true, value: promptText, rows: 28, className: 'w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-[11px] font-mono text-zinc-200 leading-relaxed' }),
      h('div', { className: 'text-[10px] text-zinc-500' }, N(promptText.length) + ' ký tự'));

    return h('section', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] animate-in fade-in duration-200' },
      h('div', { className: 'space-y-3 min-w-0' }, form, head, tabBar, view === 'over' ? overview : view === 'vid' ? h('div', { className: 'space-y-3' }, vidView, webVidBox, capBox) : view === 'img' ? imgView : view === 'src' ? srcView : view === 'doc' ? docView : promptView),
      cap && h(Capture, { v: cap, onClose: function () { setCap(null); }, onShot: function (c) { return addCapture(c); } }),
      h('div', { className: 'space-y-3' }, histBox));
  }
  window.ResourceStudio = ResourceStudio;
})();
