// =========================================================================
// YOUTREND v5 — HỒ SƠ CLONE KÊNH + SO SÁNH KÊNH (page_clone.js)
// Hồ sơ clone: bóc mô hình một kênh từ số liệu thật (tiêu đề, độ dài, nhịp đăng, chủ đề, tag, video thắng/flop)
// → checklist SOP + prompt cho Claude. So sánh: đặt 2–4 kênh cạnh nhau.
// Dùng kết quả của YT4Channels.analyzeChannel (page_channels.js).
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Bar = K.Bar, Section = K.Section;
  var DAY = 864e5;
  var CATN = { '1': 'Phim & Hoạt hình', '2': 'Xe cộ', '10': 'Âm nhạc', '15': 'Thú cưng', '17': 'Thể thao', '19': 'Du lịch', '20': 'Gaming', '22': 'Đời sống & Vlog', '23': 'Hài hước', '24': 'Giải trí', '25': 'Tin tức', '26': 'Mẹo & Phong cách', '27': 'Giáo dục', '28': 'Khoa học & Công nghệ' };
  var VERD = { farm: 'Đang farm view đều', rise: 'Đang lên', fluke: 'Ăn may 1–2 video', cold: 'View thấp', none: 'Chưa đủ video', unk: 'Chưa đủ dữ liệu' };
  var LANGN = { en: 'tiếng Anh', vi: 'tiếng Việt', es: 'tiếng Tây Ban Nha', pt: 'tiếng Bồ Đào Nha', de: 'tiếng Đức', fr: 'tiếng Pháp', ja: 'tiếng Nhật', ko: 'tiếng Hàn', hi: 'tiếng Hindi', ur: 'tiếng Urdu', id: 'tiếng Indonesia', th: 'tiếng Thái', ru: 'tiếng Nga', ar: 'tiếng Ả Rập', nl: 'tiếng Hà Lan', sv: 'tiếng Thuỵ Điển', no: 'tiếng Na Uy', it: 'tiếng Ý', tr: 'tiếng Thổ Nhĩ Kỳ', bn: 'tiếng Bengal', zh: 'tiếng Trung' };
  var fx = function (x) { return x == null ? '–' : '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); };
  var mins = function (s) { return s >= 60 ? U.dur(s) : Math.round(s) + ' giây'; };
  var esc = function (t) { return String(t || '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim(); };

  // ---------- Bóc mô hình kênh từ kết quả phân tích ----------
  function cloneModel(R) {
    var now = Date.now(), E = window.TopNgachEngine;
    var long = R.vids.filter(function (v) { return v.dur > 180; }), short = R.vids.filter(function (v) { return v.dur <= 180; });
    var isShort = short.length > long.length, main = isShort ? short : long, F = isShort ? R.short : R.long;
    var ripe = main.filter(function (v) { return now - v.t > 2 * DAY && v.rel != null; });
    var sorted = ripe.slice().sort(function (a, b) { return b.rel - a.rel; }), k = Math.max(3, Math.ceil(sorted.length / 4));
    var win = sorted.slice(0, k), flop = sorted.length > k + 2 ? sorted.slice(-Math.min(5, sorted.length - k)).reverse() : [];
    // ngôn ngữ
    var lc = {}; main.forEach(function (v) { var l = String(v.lang || '').slice(0, 2).toLowerCase(); if (l) lc[l] = (lc[l] || 0) + 1; });
    var lang = Object.keys(lc).sort(function (a, b) { return lc[b] - lc[a]; })[0] || (E && E.M[R.mk] ? E.M[R.mk][3] : 'en');
    // độ dài
    var durs = main.map(function (v) { return v.dur; }), BK = isShort ? [[0, 20, 'Dưới 20 giây'], [20, 40, '20–40 giây'], [40, 60, '40–60 giây'], [60, 181, '1–3 phút']] : [[181, 300, 'Dưới 5 phút'], [300, 480, '5–8 phút'], [480, 720, '8–12 phút'], [720, 1200, '12–20 phút'], [1200, 3600, '20–60 phút'], [3600, 1e9, 'Trên 60 phút']];
    var buckets = BK.map(function (b) { var a = ripe.filter(function (v) { return v.dur >= b[0] && v.dur < b[1]; }); return { label: b[2], n: a.length, med: U.median(a.map(function (v) { return v.views; })), rel: U.median(a.map(function (v) { return v.rel; })) }; }).filter(function (b) { return b.n > 0; });
    var bestB = buckets.filter(function (b) { return b.n >= Math.min(3, Math.max(2, Math.floor(ripe.length / 8))); }).sort(function (a, b) { return b.rel - a.rel; })[0] || null;
    // nhịp đăng
    var ts = main.map(function (v) { return v.t; }).sort(function (a, b) { return a - b; }), gaps = []; for (var i = 1; i < ts.length; i++) gaps.push((ts[i] - ts[i - 1]) / DAY);
    // tiêu đề
    var P = K.titlePatterns(ripe, function (v) { return v.rel; });
    var caps = main.length ? main.filter(function (v) { return /\b[A-ZÀ-Ỹ]{3,}\b/.test(v.title); }).length / main.length : 0;
    var wordN = Math.round(U.median(main.map(function (v) { return K.words(v.title).length; })));
    // chủ đề lặp lại (cụm 2–3 từ trong tiêu đề video thắng) + hiệu quả của từng cụm trên toàn kênh
    var ph = E && E.phrases ? E.phrases(win.concat(sorted.slice(k, k * 2)).map(function (v) { return v.title; }), lang, 14) : [];
    var topics = ph.map(function (q) { var a = ripe.filter(function (v) { return v.title.toLowerCase().indexOf(q) >= 0; }); return { q: q, n: a.length, rel: U.median(a.map(function (v) { return v.rel; })), views: U.median(a.map(function (v) { return v.views; })) }; }).filter(function (t) { return t.n >= 2; }).sort(function (a, b) { return b.rel * Math.log(1 + b.n) - a.rel * Math.log(1 + a.n); }).slice(0, 10);
    // tag + hashtag
    var tc = {}; win.forEach(function (v) { var seen = {}; (v.tags || []).forEach(function (t) { t = t.toLowerCase().trim(); if (!t || seen[t] || t.length > 50) return; seen[t] = 1; tc[t] = (tc[t] || 0) + 1; }); });
    var tags = Object.keys(tc).filter(function (t) { return tc[t] >= 2; }).sort(function (a, b) { return tc[b] - tc[a]; }).slice(0, 30).map(function (t) { return [t, tc[t]]; });
    var hc = {}; main.forEach(function (v) { ((v.title + ' ' + (v.desc || '')).match(/#[\p{L}\p{N}_]+/gu) || []).forEach(function (x) { x = x.toLowerCase(); hc[x] = (hc[x] || 0) + 1; }); });
    var hashtags = Object.keys(hc).filter(function (x) { return hc[x] >= 3; }).sort(function (a, b) { return hc[b] - hc[a]; }).slice(0, 12).map(function (x) { return [x, hc[x]]; });
    var tagRate = main.length ? main.filter(function (v) { return (v.tags || []).length > 0; }).length / main.length : 0;
    // mô tả
    var descs = win.map(function (v) { return v.desc || ''; }).filter(Boolean);
    var descInfo = { links: descs.filter(function (d) { return /https?:\/\//.test(d); }).length, stamps: descs.filter(function (d) { return /\b\d{1,2}:\d{2}\b/.test(d); }).length, n: descs.length, len: Math.round(U.median(descs.map(function (d) { return d.length; }))) };
    // video đầu tiên bứt phá (chỉ tính được khi đã lấy gần hết video của kênh)
    var first = null;
    if (R.videoCount && R.videoCount <= R.vids.length + 2 && F && F.med) { var asc = main.slice().sort(function (a, b) { return a.t - b.t; }); var ix = asc.findIndex(function (v) { return v.views >= F.med * 2; }); if (ix >= 0) first = { nth: ix + 1, days: Math.round((asc[ix].t - asc[0].t) / DAY), title: asc[ix].title }; }
    return { isShort: isShort, main: main, F: F, ripe: ripe, win: win, flop: flop, lang: lang, share: R.vids.length ? main.length / R.vids.length : 0,
      durMed: U.median(durs), durLo: U.pct(durs, 0.25), durHi: U.pct(durs, 0.75), buckets: buckets, bestB: bestB, gapMed: U.median(gaps), P: P, caps: caps, wordN: wordN, topics: topics, tags: tags, hashtags: hashtags, tagRate: tagRate, descInfo: descInfo, first: first };
  }
  function sopSteps(R, m) {
    var F = m.F || {}, out = [], feats = m.P ? m.P.rows.filter(function (r) { return r.lift >= 0.1; }).slice(0, 3).map(function (r) { return r.name.toLowerCase(); }) : [];
    out.push('Làm đúng định dạng của kênh mẫu: ' + (m.isShort ? 'Shorts' : 'video dài') + ' khoảng ' + mins(m.durMed) + (m.bestB ? ' (nhóm ' + m.bestB.label.toLowerCase() + ' đang cho view tốt nhất, ' + fx(m.bestB.rel) + ' trung vị kênh)' : '') + '.');
    out.push('Giữ nhịp ' + (F.perWeek ? F.perWeek.toFixed(1) : '?') + ' video/tuần' + (m.gapMed ? ' (cách nhau khoảng ' + (m.gapMed < 1 ? Math.round(m.gapMed * 24) + ' giờ' : m.gapMed.toFixed(1) + ' ngày') + ')' : '') + (R.slots.length ? ', ưu tiên đăng ' + R.slots.slice(0, 2).map(function (s) { return s[0]; }).join(' hoặc ') + ' (giờ VN)' : '') + '.');
    out.push('Tiêu đề dài khoảng ' + (m.P ? m.P.lenWin : '?') + ' ký tự (' + m.wordN + ' từ)' + (feats.length ? ', nên ' + feats.join(', ') : '') + (m.P && m.P.openers.length ? '; mở đầu kiểu "' + m.P.openers[0][0] + ' …"' : '') + '.');
    if (m.topics.length) out.push('Bắt đầu bằng các chủ đề đã chứng minh: ' + m.topics.slice(0, 4).map(function (t) { return '"' + t.q + '" (' + t.n + ' video, ' + fx(t.rel) + ')'; }).join(', ') + '.');
    out.push('Mở 8 thumbnail thắng bên dưới, ghi lại bố cục, chữ và màu lặp lại. Web không đọc được hình nên phần này bạn tự nhìn.');
    out.push('Xem kỹ 3 video đứng đầu danh sách "nên xem": 30 giây đầu nói gì, mỗi cảnh dài bao lâu, giọng đọc và nhạc kiểu gì.');
    if (m.flop.length) out.push('Xem lướt các video flop để biết chủ đề kênh mẫu đã thử mà không lên, tránh làm lại.');
    out.push('Mốc kiểm tra: sau 10 video đầu, so view trung vị của bạn với ' + N(F.med || 0) + ' của kênh mẫu' + (m.first ? ' (kênh mẫu bứt phá ở video thứ ' + m.first.nth + ', sau ' + m.first.days + ' ngày)' : '') + '.');
    return out;
  }
  // Hồ sơ dạng Markdown: dùng để tải về và làm phần dữ liệu trong prompt Claude
  function cloneMarkdown(R, m) {
    var L = [], F = m.F || {}, fm = R.farm || {}, ageD = R.created ? Math.round((Date.now() - R.created) / DAY) : null;
    L.push('## KÊNH MẪU: ' + R.title + (R.handle ? ' (' + R.handle + ')' : ''));
    L.push('- Link: https://www.youtube.com/channel/' + R.id);
    L.push('- Người đăng ký: ' + (R.subs == null ? 'ẩn' : N(R.subs)) + ' · Tổng view: ' + N(R.views) + ' · Số video: ' + N(R.videoCount) + (ageD != null ? ' · Tuổi kênh: ' + ageD + ' ngày' : '') + (R.country ? ' · Quốc gia: ' + R.country : ''));
    L.push('- Danh mục: ' + (CATN[R.topCat] || '?') + ' · Ngôn ngữ video: ' + (LANGN[m.lang] || m.lang) + ' · Đánh giá: ' + (VERD[fm.v] || '?') + (fm.score != null ? ' (điểm farm ' + fm.score + '/100)' : ''));
    if (R.desc) L.push('- Mô tả kênh: ' + esc(R.desc));
    if (R.keywords) L.push('- Từ khoá kênh tự khai: ' + esc(R.keywords));
    L.push('');
    L.push('## MÔ HÌNH (đo trên ' + R.vids.length + ' video gần nhất)');
    L.push('- Định dạng chính: ' + (m.isShort ? 'Shorts' : 'video dài') + ' (' + Math.round(m.share * 100) + '% số video)');
    L.push('- Độ dài: trung vị ' + mins(m.durMed) + ', phổ biến ' + mins(m.durLo) + ' đến ' + mins(m.durHi) + (m.bestB ? '; nhóm thắng nhất: ' + m.bestB.label + ' (' + fx(m.bestB.rel) + ' trung vị kênh, ' + m.bestB.n + ' video)' : ''));
    L.push('- Nhịp đăng: ' + (F.perWeek ? F.perWeek.toFixed(1) : '?') + ' video/tuần' + (m.gapMed ? ', khoảng cách trung vị ' + m.gapMed.toFixed(1) + ' ngày' : '') + (R.slots.length ? '; khung giờ của video thắng (giờ VN): ' + R.slots.map(function (s) { return s[0]; }).join(', ') : ''));
    L.push('- View: trung vị ' + N(F.med || 0) + ', top 10% đạt ' + N(F.p90 || 0) + (F.mom != null ? ', đà tăng ×' + F.mom.toFixed(2) + ' (10 video mới so với 10 video trước)' : '') + ', tương tác trung vị ' + ((F.eng || 0) * 100).toFixed(1) + '%');
    if (R.long && (R.subs || 0) >= 1000) L.push('- Doanh thu ước tính 30 ngày (video dài, RPM ~$' + R.rpm[0].toFixed(1) + '–' + R.rpm[1].toFixed(1) + '): $' + N(R.long.v30 * R.rpm[0] / 1000) + '–' + N(R.long.v30 * R.rpm[1] / 1000));
    if (m.first) L.push('- Video bứt phá đầu tiên: video thứ ' + m.first.nth + ', ' + m.first.days + ' ngày sau video đầu ("' + esc(m.first.title) + '")');
    if (m.P) {
      L.push(''); L.push('## TIÊU ĐỀ');
      L.push('- Độ dài trung vị: nhóm thắng ' + m.P.lenWin + ' ký tự, còn lại ' + m.P.lenRest + ' ký tự; khoảng ' + m.wordN + ' từ; ' + Math.round(m.caps * 100) + '% tiêu đề có từ VIẾT HOA');
      m.P.rows.filter(function (r) { return Math.abs(r.lift) >= 0.1; }).forEach(function (r) { L.push('- ' + r.name + ': nhóm thắng ' + Math.round(r.win * 100) + '%, còn lại ' + Math.round(r.rest * 100) + '% (' + (r.lift > 0 ? 'nên dùng' : 'nên tránh') + ')'); });
      if (m.P.openers.length) L.push('- Cách mở đầu lặp lại: ' + m.P.openers.map(function (x) { return '"' + x[0] + ' …" (' + x[1] + ')'; }).join(', '));
      if (m.P.hooks.length) L.push('- Từ lặp lại trong tiêu đề thắng: ' + m.P.hooks.map(function (x) { return x[0] + ' (' + x[1] + ')'; }).join(', '));
    }
    if (m.topics.length) { L.push(''); L.push('## CHỦ ĐỀ / SERIES LẶP LẠI'); m.topics.forEach(function (t) { L.push('- "' + t.q + '": ' + t.n + ' video, ' + fx(t.rel) + ' trung vị kênh, view trung vị ' + N(t.views)); }); }
    if (m.tags.length || m.hashtags.length) { L.push(''); L.push('## TAG & HASHTAG'); if (m.tags.length) L.push('- Tag trong video thắng: ' + m.tags.map(function (x) { return x[0]; }).join(', ')); if (m.hashtags.length) L.push('- Hashtag hay dùng: ' + m.hashtags.map(function (x) { return x[0]; }).join(' ')); L.push('- ' + Math.round(m.tagRate * 100) + '% video có gắn tag'); }
    if (m.descInfo.n) L.push('- Mô tả video thắng: dài trung vị ' + m.descInfo.len + '+ ký tự, ' + m.descInfo.links + '/' + m.descInfo.n + ' có link, ' + m.descInfo.stamps + '/' + m.descInfo.n + ' có mốc thời gian');
    L.push(''); L.push('## VIDEO THẮNG (xếp theo mức vượt trung vị kênh)');
    L.push('| # | Tiêu đề | View | × trung vị kênh | Dài | Ngày đăng | Link |'); L.push('|---|---|---|---|---|---|---|');
    m.win.slice(0, 30).forEach(function (v, i) { L.push('| ' + [i + 1, esc(v.title), N(v.views), fx(v.rel), U.dur(v.dur), U.date(v.t), 'https://youtu.be/' + v.id].join(' | ') + ' |'); });
    if (m.flop.length) { L.push(''); L.push('## VIDEO FLOP (thấp nhất so với trung vị kênh)'); m.flop.forEach(function (v) { L.push('- ' + esc(v.title) + ' — ' + N(v.views) + ' view (' + fx(v.rel) + '), ' + U.dur(v.dur)); }); }
    var recent = m.main.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 25);
    L.push(''); L.push('## 25 VIDEO MỚI NHẤT (để thấy hướng đi hiện tại)');
    recent.forEach(function (v) { L.push('- ' + U.date(v.t) + ' · ' + esc(v.title) + ' · ' + N(v.views) + ' view' + (v.rel != null ? ' (' + fx(v.rel) + ')' : '') + ' · ' + U.dur(v.dur)); });
    return L.join('\n');
  }
  function clonePrompt(R, m, o) {
    var L = [], tl = o.lang === 'same' ? (LANGN[m.lang] || m.lang) + ' (giữ ngôn ngữ kênh mẫu)' : o.lang === 'other' ? (o.langOther || 'chưa chọn') : LANGN[o.lang] || o.lang;
    L.push('# NHIỆM VỤ: BÓC TÁCH MÔ HÌNH KÊNH YOUTUBE "' + R.title + '" VÀ LẬP KẾ HOẠCH LÀM KÊNH CLONE');
    L.push('');
    L.push('Bạn là chuyên gia chiến lược kênh YouTube. Dưới đây là hồ sơ số liệu thật của một kênh mẫu tôi muốn làm theo. Hãy bóc mô hình của kênh thành công thức làm lại được, rồi lập kế hoạch cho kênh của tôi.');
    L.push('');
    L.push('## KÊNH CỦA TÔI');
    L.push('- Ngôn ngữ / thị trường: ' + tl);
    if (o.twist) L.push('- Điểm khác biệt tôi muốn có: ' + o.twist);
    if (o.tools) L.push('- Cách tôi sản xuất: ' + o.tools);
    L.push('');
    L.push('========== HỒ SƠ SỐ LIỆU (YouTube Data API, ' + new Date().toLocaleDateString('vi-VN') + ') ==========');
    L.push(cloneMarkdown(R, m));
    L.push('========== HẾT HỒ SƠ ==========');
    L.push('');
    L.push('## YÊU CẦU ĐẦU RA (viết tiếng Việt, Markdown; riêng tiêu đề video viết bằng ' + tl.replace(/ \(.*/, '') + ')');
    L.push('1. TIÊU ĐỀ: công thức đặt tiêu đề của kênh, 5 khuôn mẫu có chỗ trống để điền, mỗi khuôn 2 ví dụ.');
    L.push('2. KỊCH BẢN: cấu trúc một video (hook, các phần, độ dài từng phần, cách giữ người xem) suy ra từ tiêu đề và độ dài.');
    L.push('3. HÌNH ẢNH: loại hình nhiều khả năng được dùng (cảnh quay, ảnh tĩnh, hoạt hình, AI…), nguồn lấy.');
    L.push('4. DỰNG: nhịp cắt, chuyển cảnh, độ dài cảnh.');
    L.push('5. CHỮ TRÊN MÀN HÌNH: phụ đề, nhãn, điểm nhấn.');
    L.push('6. ÂM THANH: giọng đọc, nhạc nền, hiệu ứng.');
    L.push('7. THUMBNAIL: công thức bố cục, chữ, màu; 5 ý tưởng thumbnail cho 5 video đầu.');
    L.push('8. SOP: quy trình làm một video từng bước, kèm thời gian ước tính và công cụ.');
    L.push('9. SETUP KÊNH: 5 tên kênh, mô tả kênh, từ khoá kênh.');
    L.push('10. ' + o.ideas + ' Ý TƯỞNG VIDEO ĐẦU TIÊN: tiêu đề + góc khai thác + vì sao sẽ lên, bám các chủ đề đã thắng trong hồ sơ, không chép nguyên tiêu đề của kênh mẫu.');
    L.push('11. LỊCH ĐĂNG 4 TUẦN và các mốc số liệu để biết kênh đang đi đúng hướng.');
    L.push('');
    L.push('Lưu ý quan trọng: bạn chỉ có số liệu và tiêu đề, không xem được video. Ở mục 2 đến 7, điều gì là suy đoán thì ghi "(suy đoán, cần kiểm tra)" và nêu đúng video nào trong bảng tôi nên mở để xác nhận. Không bịa số liệu ngoài hồ sơ.');
    return L.join('\n');
  }

  // ---------- Tab "Hồ sơ clone" trong Phân tích kênh ----------
  function ClonePanel(p) {
    var R = p.R, m = useMemo(function () { return cloneModel(R); }, [R]);
    var s0 = useState(function () { return Object.assign({ lang: 'same', langOther: '', twist: '', tools: '', ideas: 20 }, st.json('yt4_clone_opt', {})); }), o = s0[0], setO = s0[1];
    function set(k, v) { setO(function (x) { var n = Object.assign({}, x); n[k] = v; st.put('yt4_clone_opt', n); return n; }); }
    if (m.ripe.length < 5) return h(Empty, { title: 'Chưa đủ video để bóc mô hình', sub: 'Kênh cần ít nhất 5 video đã đăng trên 2 ngày. Thử tăng số video phân tích lên 100 hoặc 200.' });
    var F = m.F || {}, steps = sopSteps(R, m), md = cloneMarkdown(R, m), prompt = clonePrompt(R, m, o);
    var li = function (k, v) { return h('div', { key: k, className: 'flex gap-3 text-[12px] py-1.5 border-b border-cham-800/60 last:border-0' }, h('dt', { className: 'w-32 shrink-0 text-cham-400' }, k), h('dd', { className: 'text-cham-100 leading-relaxed min-w-0' }, v)); };
    var maxRel = Math.max.apply(null, m.buckets.map(function (b) { return b.rel || 0; }).concat([1]));
    var vrow = function (v) { return h('a', { key: v.id, href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'flex gap-2.5 items-start group' }, h('img', { src: U.thumb(v.id), loading: 'lazy', alt: '', className: 'w-28 aspect-video object-cover rounded-md shrink-0 bg-black' }), h('div', { className: 'min-w-0' }, h('div', { className: 'text-[12px] text-cham-100 leading-snug line-clamp-2 group-hover:text-white' }, v.title), h('div', { className: 'text-[11px] text-cham-400 tabular-nums mt-0.5' }, N(v.views) + ' view · ', h('span', { className: v.rel >= 2 ? 'text-[#6fcf85]' : v.rel < 0.5 ? 'text-[#ff8a83]' : '' }, fx(v.rel) + ' trung vị'), ' · ' + U.dur(v.dur)))); };
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('p', { className: 'text-[12px] text-cham-300 flex-1 min-w-[240px] leading-relaxed' }, 'Hồ sơ bóc từ ' + m.ripe.length + ' ' + (m.isShort ? 'Shorts' : 'video dài') + ' của kênh. "Nhóm thắng" là ' + m.win.length + ' video vượt trung vị kênh nhiều nhất.'),
        h(Btn, { onClick: function () { U.download('ho-so-clone-' + R.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40) + '.md', new Blob(['# HỒ SƠ CLONE KÊNH\n\n' + md + '\n\n## CHECKLIST SOP\n' + steps.map(function (s, i) { return (i + 1) + '. ' + s; }).join('\n')], { type: 'text/markdown' })); } }, 'Tải hồ sơ .md'),
        h(Btn, { onClick: function () { U.copy(md).then(function () { K.toast('Đã copy hồ sơ'); }); } }, 'Copy hồ sơ')),
      h('div', { className: 'grid gap-4 lg:grid-cols-2' },
        h(Section, { title: 'Mô hình kênh' }, h('dl', null,
          li('Định dạng', (m.isShort ? 'Shorts' : 'Video dài') + ' · ' + Math.round(m.share * 100) + '% số video · ' + (LANGN[m.lang] || m.lang) + (CATN[R.topCat] ? ' · ' + CATN[R.topCat] : '')),
          li('Độ dài', 'Trung vị ' + mins(m.durMed) + ', phổ biến ' + mins(m.durLo) + ' đến ' + mins(m.durHi)),
          li('Nhịp đăng', (F.perWeek ? F.perWeek.toFixed(1) : '?') + ' video/tuần' + (m.gapMed ? ', cách nhau khoảng ' + (m.gapMed < 1 ? Math.round(m.gapMed * 24) + ' giờ' : m.gapMed.toFixed(1) + ' ngày') : '')),
          li('Giờ đăng thắng', R.slots.length ? R.slots.map(function (s) { return s[0] + ' (' + s[1] + ')'; }).join(', ') + ' · giờ VN' : 'Chưa đủ video vượt trội'),
          li('Mức view', 'Trung vị ' + N(F.med || 0) + ' · top 10% đạt ' + N(F.p90 || 0) + (F.mom != null ? ' · đà ×' + F.mom.toFixed(2) : '')),
          li('Doanh thu', R.long && (R.subs || 0) >= 1000 ? '$' + N(R.long.v30 * R.rpm[0] / 1000) + '–' + N(R.long.v30 * R.rpm[1] / 1000) + ' / 30 ngày (ước tính)' : 'Chưa ước tính được'),
          m.first && li('Bứt phá', 'Video thứ ' + m.first.nth + ', ' + m.first.days + ' ngày sau video đầu tiên'))),
        h(Section, { title: 'Checklist làm theo', sub: 'Tự sinh từ số liệu của kênh' }, h('ol', { className: 'space-y-2' }, steps.map(function (s, i) { return h('li', { key: i, className: 'flex gap-2.5 text-[12px] text-cham-100 leading-relaxed' }, h('span', { className: 'shrink-0 w-5 h-5 rounded-md bg-[#3a2a5c] text-[#d4bbff] text-[11px] font-semibold flex items-center justify-center mt-0.5 tabular-nums' }, i + 1), h('span', null, s)); })))),
      h('div', { className: 'grid gap-4 lg:grid-cols-2' },
        h(Section, { title: 'Độ dài nào thắng', sub: 'Mức vượt trung vị kênh theo nhóm độ dài' }, h('div', { className: 'space-y-2' }, m.buckets.map(function (b) { var best = m.bestB && b.label === m.bestB.label; return h('div', { key: b.label, className: 'grid grid-cols-[92px_1fr_86px] items-center gap-2 text-[11.5px]' }, h('span', { className: best ? 'text-[#6fcf85] font-medium' : 'text-cham-300' }, b.label), h(Bar, { value: (b.rel || 0) / maxRel * 100, color: best ? 'bg-[#4bc167]' : 'bg-[#3ea6ff]' }), h('span', { className: 'text-right tabular-nums text-cham-300' }, fx(b.rel) + ' · ' + b.n + ' video')); }))),
        h(Section, { title: 'Chủ đề / series lặp lại', sub: 'Cụm từ xuất hiện nhiều trong tiêu đề video thắng' }, m.topics.length ? h('div', { className: 'space-y-1.5' }, m.topics.map(function (t) { return h('div', { key: t.q, className: 'flex items-center justify-between gap-3 text-[12px]' }, h('button', { onClick: function () { p.goto && p.goto('explore', { q: t.q }); }, title: 'Phân tích từ khoá này', className: 'text-left text-cham-100 hover:text-[#7cc3ff] truncate cursor-pointer' }, t.q), h('span', { className: 'shrink-0 tabular-nums text-cham-400' }, t.n + ' video · ', h('span', { className: t.rel >= 1.5 ? 'text-[#6fcf85]' : 'text-cham-300' }, fx(t.rel)))); })) : h('div', { className: 'text-[12px] text-cham-400' }, 'Không có cụm từ nào lặp lại đủ nhiều.'))),
      h('div', null, h('h3', { className: 'text-[12.5px] font-semibold text-cham-50 mb-2' }, 'Công thức tiêu đề'), h(K.PatternView, { data: m.P, metric: 'mức vượt trung vị kênh' })),
      h(Section, { title: 'Thumbnail của video thắng', sub: 'Nhìn để tìm bố cục, chữ, màu lặp lại' }, h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' }, m.win.slice(0, 8).map(function (v) { return h('a', { key: v.id, href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'relative block rounded-lg overflow-hidden bg-black' }, h('img', { src: U.thumb(v.id, 'hqdefault'), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }), h('span', { className: 'absolute top-1 right-1 text-[10.5px] font-bold px-1 rounded bg-[#f5c451] text-[#2a1d00] tabular-nums' }, fx(v.rel))); }))),
      h('div', { className: 'grid gap-4 lg:grid-cols-2' },
        h(Section, { title: 'Video nên xem kỹ để bắt chước' }, h('div', { className: 'space-y-2.5' }, m.win.slice(0, 6).map(vrow))),
        h('div', { className: 'space-y-4' },
          m.flop.length > 0 && h(Section, { title: 'Video flop của kênh', sub: 'Chủ đề kênh đã thử mà không lên' }, h('div', { className: 'space-y-2.5' }, m.flop.slice(0, 4).map(vrow))),
          (m.tags.length > 0 || m.hashtags.length > 0) && h(Section, { title: 'Tag & hashtag', sub: Math.round(m.tagRate * 100) + '% video có gắn tag', right: m.tags.length > 0 && h(Btn, { small: true, onClick: function () { U.copy(m.tags.map(function (x) { return x[0]; }).join(', ')).then(function () { K.toast('Đã copy ' + m.tags.length + ' tag'); }); } }, 'Copy tag') },
            h('div', { className: 'flex flex-wrap gap-1.5' }, m.hashtags.map(function (x) { return h('span', { key: x[0], className: 'px-2 py-1 rounded-md bg-[#3ea6ff]/15 text-[11.5px] text-[#7cc3ff]' }, x[0]); }), m.tags.map(function (x) { return h('span', { key: x[0], className: 'px-2 py-1 rounded-md bg-[#272727] text-[11.5px] text-cham-200' }, x[0], h('span', { className: 'ml-1.5 text-cham-500' }, x[1])); }))))),
      h(Section, { title: 'Nhờ Claude viết bản bóc tách đầy đủ + kế hoạch kênh', sub: '11 mục: tiêu đề, kịch bản, hình ảnh, dựng, chữ, âm thanh, thumbnail, SOP, setup kênh, ý tưởng video, lịch đăng' },
        h('div', { className: 'flex flex-wrap items-end gap-3 mb-3' },
          h(Field, { label: 'Kênh của bạn làm bằng' }, h('div', { className: 'w-56' }, h(Select, { value: o.lang, onChange: function (v) { set('lang', v); }, options: [['same', 'Giữ ' + (LANGN[m.lang] || m.lang) + ' như kênh mẫu'], ['en', 'Tiếng Anh'], ['vi', 'Tiếng Việt'], ['es', 'Tiếng Tây Ban Nha'], ['hi', 'Tiếng Hindi'], ['other', 'Ngôn ngữ khác…']] }))),
          o.lang === 'other' && h(Field, { label: 'Ngôn ngữ' }, h(Input, { value: o.langOther, onChange: function (e) { set('langOther', e.target.value); }, placeholder: 'Ví dụ: tiếng Đức', className: 'w-40' })),
          h(Field, { label: 'Số ý tưởng video' }, h(Seg, { value: o.ideas, onChange: function (v) { set('ideas', +v); }, options: [[10, '10'], [20, '20'], [30, '30']] })),
          h(Field, { label: 'Điểm khác biệt (tuỳ chọn)', className: 'flex-1 min-w-[220px]' }, h(Input, { value: o.twist, onChange: function (e) { set('twist', e.target.value); }, placeholder: 'Ví dụ: cùng dạng nhưng về lịch sử Đông Nam Á' })),
          h(Field, { label: 'Cách bạn sản xuất (tuỳ chọn)', className: 'flex-1 min-w-[220px]' }, h(Input, { value: o.tools, onChange: function (e) { set('tools', e.target.value); }, placeholder: 'Ví dụ: giọng AI, ảnh AI, dựng CapCut' }))),
        h(K.ClaudeBox, { key: R.id, kind: 'clone', title: 'Clone kênh: ' + R.title, file: 'clone-' + R.title.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40), prompt: prompt, meta: { channelId: R.id } })));
  }

  // ---------- So sánh 2–4 kênh ----------
  var CACHE = {};
  function metrics(R) {
    var useShort = R.short && (!R.long || R.short.n > R.long.n), F = (useShort ? R.short : R.long) || {}, fm = R.farm || {};
    var v30 = (R.long ? R.long.v30 : 0) + (R.short ? R.short.v30 : 0), elig = (R.subs || 0) >= 1000 && R.long;
    return { F: F, fm: fm, useShort: useShort, v30: v30, out: R.subs ? (F.med || 0) / Math.max(R.subs, 100) : null, revLo: elig ? R.long.v30 * R.rpm[0] / 1000 : null, revHi: elig ? R.long.v30 * R.rpm[1] / 1000 : null, ageD: R.created ? Math.round((Date.now() - R.created) / DAY) : null };
  }
  function comparePrompt(list) {
    var L = ['# NHIỆM VỤ: SO SÁNH ' + list.length + ' KÊNH YOUTUBE VÀ CHỌN KÊNH ĐÁNG LÀM THEO NHẤT', '', 'Số liệu từ YouTube Data API ngày ' + new Date().toLocaleDateString('vi-VN') + '. "× trung vị" là view của video chia cho view trung vị của chính kênh đó.', ''];
    list.forEach(function (R) {
      var m = metrics(R), F = m.F;
      L.push('## ' + R.title + ' — https://www.youtube.com/channel/' + R.id);
      L.push('- Sub ' + (R.subs == null ? 'ẩn' : N(R.subs)) + ' · tuổi kênh ' + (m.ageD != null ? m.ageD + ' ngày' : '?') + ' · ' + (CATN[R.topCat] || '?') + ' · ' + (R.country || '?') + ' · định dạng chính: ' + (m.useShort ? 'Shorts' : 'video dài'));
      L.push('- Đánh giá: ' + (VERD[m.fm.v] || '?') + ' (điểm ' + (m.fm.score != null ? m.fm.score : '?') + '), ' + (m.fm.n ? m.fm.hits + '/' + m.fm.n + ' video đạt mức sub' : ''));
      L.push('- View trung vị ' + N(F.med || 0) + ' (' + fx(m.out) + ' sub) · top 10% ' + N(F.p90 || 0) + ' · view 30 ngày ' + N(m.v30) + ' · ' + (F.perWeek ? F.perWeek.toFixed(1) : '?') + ' video/tuần · dài TB ' + mins(F.avgDur || 0) + (F.mom != null ? ' · đà ×' + F.mom.toFixed(2) : '') + (m.revHi != null ? ' · ước tính $' + N(m.revLo) + '–' + N(m.revHi) + '/30 ngày' : ''));
      L.push('- Video tốt nhất: ' + R.vids.slice().sort(function (a, b) { return (b.rel || 0) - (a.rel || 0); }).slice(0, 8).map(function (v) { return '"' + esc(v.title) + '" (' + N(v.views) + ', ' + fx(v.rel) + ')'; }).join('; '));
      L.push('- 8 video mới nhất: ' + R.vids.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 8).map(function (v) { return '"' + esc(v.title) + '" (' + N(v.views) + ')'; }).join('; '));
      L.push('');
    });
    L.push('## YÊU CẦU ĐẦU RA (tiếng Việt, Markdown)');
    L.push('1. Bảng so sánh ngắn: điểm mạnh, điểm yếu, mức dễ clone của từng kênh.');
    L.push('2. Kênh nào đáng làm theo nhất với người mới bắt đầu, vì sao. Kênh nào nên tránh.');
    L.push('3. Điểm chung trong tiêu đề và chủ đề của các video thắng ở cả ' + list.length + ' kênh.');
    L.push('4. Khoảng trống: chủ đề hoặc góc mà các kênh này chưa làm tốt.');
    L.push('5. 10 ý tưởng video kết hợp điểm mạnh của các kênh.');
    L.push('Không bịa số liệu ngoài dữ liệu trên.');
    return L.join('\n');
  }
  function Compare(p) {
    K.useBus('compare'); K.useBus('channels');
    var list = store.compare();
    var s0 = useState(''), q = s0[0], setQ = s0[1], s1 = useState(''), busy = s1[0], setBusy = s1[1], s2 = useState(''), err = s2[0], setErr = s2[1], s3 = useState(0), tick = s3[0], setTick = s3[1], s4 = useState(false), ask = s4[0], setAsk = s4[1];
    async function add(raw) {
      raw = String(raw || q).trim(); if (!raw) return; if (list.length >= 4) { setErr('Tối đa 4 kênh. Bỏ bớt một kênh trước khi thêm.'); return; }
      setErr(''); setBusy('Tìm kênh…');
      try { var c = await Y.resolveChannel(raw); store.addCompare({ id: c.id, title: c.snippet.title }); setQ(''); } catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    async function run() {
      setErr('');
      try { for (var i = 0; i < list.length; i++) { var c = list[i]; if (CACHE[c.id] && Date.now() - CACHE[c.id].at < 6 * 36e5) continue; CACHE[c.id] = await window.YT4Channels.analyzeChannel(c.id, 50, function (m) { setBusy((i + 1) + '/' + list.length + ' · ' + c.title + ': ' + m); }); setTick(Date.now()); } }
      catch (e) { setErr(U.errMsg(e)); }
      setBusy(''); setTick(Date.now());
    }
    var data = list.map(function (c) { return CACHE[c.id]; }), ready = list.length >= 2 && data.every(Boolean), need = list.filter(function (c) { return !CACHE[c.id]; }).length;
    var sug = store.channels().filter(function (c) { return !list.some(function (x) { return x.id === c.id; }); }).slice(0, 8);
    var top = h('div', { className: cx(K.C.card, 'p-4 space-y-3') },
      h('div', { className: 'flex flex-col md:flex-row gap-2' },
        h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') add(); }, placeholder: 'Thêm kênh để so sánh: link, @handle, ID hoặc link video', className: 'md:flex-1 h-9 text-[12px]' }),
        h(Btn, { onClick: function () { add(); }, disabled: !!busy || !q.trim() || list.length >= 4, className: 'h-9' }, 'Thêm kênh'),
        h(Btn, { primary: true, onClick: run, disabled: !!busy || list.length < 2, className: 'h-9 px-6' }, busy ? 'Đang lấy số liệu…' : need ? 'So sánh (≈' + need * 3 + ' quota)' : 'So sánh lại')),
      list.length > 0 && h('div', { className: 'flex flex-wrap gap-1.5' }, list.map(function (c) { return h('span', { key: c.id, className: 'inline-flex items-center rounded-lg bg-[#272727] text-[12px] text-cham-50' }, h('span', { className: 'pl-3 pr-1 py-1.5 max-w-[220px] truncate' }, c.title), h('button', { onClick: function () { store.removeCompare(c.id); }, 'aria-label': 'Bỏ ' + c.title, title: 'Bỏ khỏi so sánh', className: 'h-8 w-7 inline-flex items-center justify-center text-cham-400 hover:text-white cursor-pointer' }, h(K.Icon, { name: 'x', size: 12 }))); })),
      list.length < 4 && sug.length > 0 && h('div', { className: 'flex flex-wrap items-center gap-1.5' }, h('span', { className: 'text-[11px] text-cham-400 mr-1' }, 'Từ kênh đang theo dõi:'), sug.map(function (c) { return h('button', { key: c.id, onClick: function () { store.addCompare({ id: c.id, title: c.title }); }, className: 'h-7 px-2.5 rounded-lg bg-[#1f1f1f] text-[11.5px] text-cham-200 hover:bg-[#333] cursor-pointer max-w-[180px] truncate' }, '+ ' + c.title); })),
      busy && h(Busy, null, busy), err && h(Note, { error: true }, err));
    if (list.length < 2) return h('div', { className: 'space-y-4' }, top, h(Empty, { title: 'Chọn 2 đến 4 kênh để đặt cạnh nhau', sub: 'Thêm kênh ở ô phía trên, hoặc bấm "Thêm vào so sánh" trong cửa sổ chi tiết kênh ở Top Ngách. Mỗi kênh tốn khoảng 3 quota.' }));
    if (!ready) return h('div', { className: 'space-y-4' }, top, !busy && h(Empty, { title: 'Bấm So sánh để lấy số liệu ' + list.length + ' kênh', sub: 'Web lấy 50 video gần nhất của mỗi kênh rồi tính cùng một bộ chỉ số.' }));
    var MS = data.map(metrics);
    // hàng: [nhãn, hàm giá trị số (để tô xanh giá trị tốt nhất) hoặc null, hàm hiển thị]
    var rows = [
      ['Người đăng ký', null, function (R) { return R.subs == null ? 'Ẩn' : N(R.subs); }],
      ['Tuổi kênh', null, function (R, m) { return m.ageD == null ? '–' : m.ageD < 365 ? m.ageD + ' ngày' : (m.ageD / 365).toFixed(1) + ' năm'; }],
      ['Định dạng chính', null, function (R, m) { return (m.useShort ? 'Shorts' : 'Video dài') + (CATN[R.topCat] ? ' · ' + CATN[R.topCat] : ''); }],
      ['Đánh giá', function (R, m) { return m.fm.score || 0; }, function (R, m) { return (VERD[m.fm.v] || '–') + (m.fm.score != null ? ' · ' + m.fm.score + ' điểm' : ''); }],
      ['Tỉ lệ video đạt mức sub', function (R, m) { return m.fm.hr || 0; }, function (R, m) { return m.fm.n ? m.fm.hits + '/' + m.fm.n + ' · ' + Math.round(m.fm.hr * 100) + '%' : '–'; }],
      ['View trung vị', function (R, m) { return m.F.med || 0; }, function (R, m) { return N(m.F.med || 0); }],
      ['View trung vị ÷ sub', function (R, m) { return m.out || 0; }, function (R, m) { return fx(m.out); }],
      ['Top 10% video đạt', function (R, m) { return m.F.p90 || 0; }, function (R, m) { return N(m.F.p90 || 0); }],
      ['View 30 ngày (video mới)', function (R, m) { return m.v30; }, function (R, m) { return N(m.v30); }],
      ['Nhịp đăng', function (R, m) { return m.F.perWeek || 0; }, function (R, m) { return m.F.perWeek != null ? m.F.perWeek.toFixed(1) + ' / tuần' : '–'; }],
      ['Độ dài trung bình', null, function (R, m) { return m.F.avgDur ? mins(m.F.avgDur) : '–'; }],
      ['Đà tăng', function (R, m) { return m.F.mom || 0; }, function (R, m) { return m.F.mom == null ? '–' : '×' + m.F.mom.toFixed(2); }],
      ['Tương tác trung vị', function (R, m) { return m.F.eng || 0; }, function (R, m) { return m.F.eng != null ? (m.F.eng * 100).toFixed(1) + '%' : '–'; }],
      ['Ước tính doanh thu 30 ngày', function (R, m) { return m.revHi || 0; }, function (R, m) { return m.revHi == null ? 'Chưa đủ 1K sub' : '$' + N(m.revLo) + '–' + N(m.revHi); }]
    ];
    var spark = function (R, m) { var a = R.vids.filter(function (v) { return m.useShort ? v.dur <= 180 : v.dur > 180; }).slice().sort(function (x, y) { return x.t - y.t; }).slice(-24), mx = Math.max.apply(null, a.map(function (v) { return v.views; }).concat([1])), med = m.F.med || 0; return h('svg', { viewBox: '0 0 240 56', className: 'w-full h-14', role: 'img', 'aria-label': 'View 24 video gần nhất' }, a.map(function (v, i) { var hh = Math.max(2, v.views / mx * 50); return h('rect', { key: v.id, x: i * 10 + 1, y: 54 - hh, width: 8, height: hh, rx: 1.5, fill: v.views >= med * 2 ? '#4bc167' : v.views >= med ? '#3ea6ff' : '#5a5a5a' }, h('title', null, v.title + ' · ' + N(v.views))); }), med > 0 && h('line', { x1: 0, x2: 240, y1: 54 - med / mx * 50, y2: 54 - med / mx * 50, stroke: '#f5c451', strokeWidth: 1, strokeDasharray: '4 4' })); };
    var grid = { gridTemplateColumns: '180px repeat(' + data.length + ', minmax(170px, 1fr))' };
    return h('div', { className: 'space-y-4' }, top,
      h('div', { className: cx(K.C.card, 'p-3 overflow-x-auto') },
        h('div', { className: 'grid gap-x-3 min-w-max md:min-w-0', style: grid },
          h('div', null), data.map(function (R) { return h('div', { key: R.id, className: 'pb-3' }, h('div', { className: 'flex items-center gap-2' }, R.avatar && h('img', { src: R.avatar, alt: '', className: 'w-8 h-8 rounded-full bg-black' }), h('button', { onClick: function () { p.analyze && p.analyze(R.id); }, title: 'Phân tích sâu kênh này', className: 'text-left text-[12.5px] font-semibold text-cham-50 hover:text-[#7cc3ff] cursor-pointer line-clamp-2' }, R.title))); }),
          h('div', { className: 'text-[11.5px] text-cham-400 self-center' }, 'View 24 video gần nhất', h('div', { className: 'text-[10.5px] text-cham-500' }, 'Vạch vàng: trung vị kênh')), data.map(function (R, i) { return h('div', { key: R.id, className: 'pb-2' }, spark(R, MS[i])); }),
          rows.map(function (r) {
            var vals = r[1] ? data.map(function (R, i) { return r[1](R, MS[i]); }) : null, best = vals ? Math.max.apply(null, vals) : null, uniq = vals && vals.filter(function (x) { return x === best; }).length === 1 && best > 0;
            return h(Frag, { key: r[0] }, h('div', { className: 'py-2 border-t border-cham-800/70 text-[11.5px] text-cham-400' }, r[0]), data.map(function (R, i) { var on = uniq && vals[i] === best; return h('div', { key: R.id, className: cx('py-2 border-t border-cham-800/70 text-[12px] tabular-nums', on ? 'text-[#6fcf85] font-semibold' : 'text-cham-100') }, r[2](R, MS[i])); }));
          }),
          h('div', { className: 'py-2 border-t border-cham-800/70 text-[11.5px] text-cham-400' }, 'Video tốt nhất'), data.map(function (R) { return h('div', { key: R.id, className: 'py-2 border-t border-cham-800/70 space-y-2' }, R.vids.slice().sort(function (a, b) { return (b.rel || 0) - (a.rel || 0); }).slice(0, 3).map(function (v) { return h('a', { key: v.id, href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'block group' }, h('div', { className: 'relative rounded-md overflow-hidden bg-black' }, h('img', { src: U.thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }), h('span', { className: 'absolute top-1 right-1 text-[10px] font-bold px-1 rounded bg-[#f5c451] text-[#2a1d00] tabular-nums' }, fx(v.rel))), h('div', { className: 'mt-1 text-[11px] text-cham-200 leading-snug line-clamp-2 group-hover:text-white' }, v.title)); })); }))),
      h('p', { className: 'text-[11px] text-cham-400' }, 'Số xanh là giá trị tốt nhất trong hàng. Mỗi kênh tính trên 50 video gần nhất, định dạng chính của kênh đó.'),
      ask ? h(Section, { title: 'Nhờ Claude so sánh và chọn kênh nên làm theo' }, h(K.ClaudeBox, { key: list.map(function (c) { return c.id; }).join(), kind: 'compare', title: 'So sánh: ' + data.map(function (R) { return R.title; }).join(' vs '), file: 'so-sanh-kenh', prompt: comparePrompt(data) }))
        : h(Btn, { onClick: function () { setAsk(true); } }, 'Nhờ Claude so sánh ' + data.length + ' kênh này'));
  }

  window.YT4Clone = { ClonePanel: ClonePanel, Compare: Compare, cloneModel: cloneModel, cloneMarkdown: cloneMarkdown, clonePrompt: clonePrompt, metrics: metrics };
})();
