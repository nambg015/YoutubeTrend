// =========================================================================
// YOUTREND v4 — KHÁM PHÁ (gộp Xu hướng + Từ khoá + Phân tích ngách + Kiểm chứng nhu cầu + Khuôn tiêu đề + AI đề xuất ngách)
// Nhập 1 từ khoá → video nổ, kênh, chấm điểm ngách, từ khoá liên quan, khuôn tiêu đề, nhận định AI.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Tabs = K.Tabs, Stat = K.Stat, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Bar = K.Bar, Section = K.Section, Table = K.Table, More = K.More, Thumb = K.Thumb;

  var REGIONS = [['VN', 'Việt Nam', 'vi'], ['US', 'Mỹ', 'en'], ['GB', 'Anh', 'en'], ['CA', 'Canada', 'en'], ['AU', 'Úc', 'en'], ['DE', 'Đức', 'de'], ['FR', 'Pháp', 'fr'], ['ES', 'Tây Ban Nha', 'es'], ['MX', 'Mexico', 'es'], ['BR', 'Brazil', 'pt'], ['JP', 'Nhật', 'ja'], ['KR', 'Hàn', 'ko'], ['IN', 'Ấn Độ', 'en'], ['ID', 'Indonesia', 'id'], ['TH', 'Thái Lan', 'th'], ['PH', 'Philippines', 'en']];
  var RPM = { US: [6, 12], GB: [5, 10], CA: [5, 10], AU: [5, 10], DE: [4, 8], FR: [3, 6], ES: [1.5, 3.5], MX: [1, 3], BR: [1, 2.5], JP: [3, 6], KR: [2, 4], IN: [0.3, 1], ID: [0.4, 1], TH: [0.5, 1.5], PH: [0.4, 1.2], VN: [0.3, 0.8] };
  var CATK = { '27': 1.3, '28': 1.4, '25': 1, '26': 1.2, '2': 1.3, '22': 0.9, '24': 0.8, '1': 0.8, '19': 1, '20': 0.5, '23': 0.6, '10': 0.4, '17': 0.7, '15': 0.8 };
  var CATN = { '1': 'Phim & Hoạt hình', '2': 'Xe cộ', '10': 'Âm nhạc', '15': 'Thú cưng', '17': 'Thể thao', '19': 'Du lịch', '20': 'Gaming', '22': 'Đời sống & Vlog', '23': 'Hài hước', '24': 'Giải trí', '25': 'Tin tức', '26': 'Mẹo & Phong cách', '27': 'Giáo dục', '28': 'Khoa học & Công nghệ' };
  var QPREF = { vi: ['cách', 'tại sao', 'là gì', 'review', 'top'], en: ['how to', 'why', 'what is', 'best', 'vs'], es: ['como', 'por que', 'que es', 'mejor'], pt: ['como', 'por que', 'o que e', 'melhor'], de: ['wie', 'warum', 'was ist', 'beste'], fr: ['comment', 'pourquoi', 'c est quoi', 'meilleur'] };

  // ---------- PHÂN TÍCH TỪ KHOÁ ----------
  async function analyzeKeyword(o, say) {
    var now = Date.now(), reg = REGIONS.find(function (r) { return r[0] === o.gl; }) || REGIONS[0], hl = reg[2];
    var after = o.days ? new Date(now - o.days * 864e5).toISOString() : undefined;
    // 1) các lượt search: xoay thời lượng + kiểu xếp để không bị chỉ 1 nhóm kênh
    var plans = [];
    var durs = o.fmt === 'short' ? ['short'] : o.fmt === 'long' ? ['medium', 'long'] : ['any'];
    durs.forEach(function (d) { plans.push({ order: 'viewCount', d: d }); if (o.deep) plans.push({ order: 'relevance', d: d }); });
    if (o.deep && o.fmt === 'all') plans.push({ order: 'viewCount', d: 'any', page2: true });
    var found = {}, units = 0;
    for (var i = 0; i < plans.length; i++) {
      var P = plans[i]; say('Tìm video ' + (i + 1) + '/' + plans.length + '…');
      var params = { part: 'snippet', type: 'video', q: o.q, maxResults: 50, order: P.order, regionCode: o.gl, relevanceLanguage: hl, publishedAfter: after };
      if (P.d !== 'any') params.videoDuration = P.d;
      var r = await Y.yt('search', params); units += 100;
      (r.items || []).forEach(function (it, rank) { var id = it.id && it.id.videoId; if (id && !(id in found)) found[id] = rank; });
      if (P.page2 && r.nextPageToken) { params.pageToken = r.nextPageToken; var r2 = await Y.yt('search', params); units += 100; (r2.items || []).forEach(function (it) { var id = it.id && it.id.videoId; if (id && !(id in found)) found[id] = 99; }); }
    }
    say('Lấy số liệu ' + Object.keys(found).length + ' video…');
    var vids = await Y.videoDetails(Object.keys(found)); units += Math.ceil(vids.length / 50);
    if (o.fmt === 'long') vids = vids.filter(function (v) { return v.dur > 180; });
    if (o.fmt === 'short') vids = vids.filter(function (v) { return v.dur <= 180; });
    vids = vids.filter(function (v) { return v.live !== 'live' && v.live !== 'upcoming'; });
    say('Lấy số liệu kênh…');
    var chs = await Y.channelStats(vids.map(function (v) { return v.channelId; })); units += Math.ceil(Object.keys(chs).length / 50);
    vids.forEach(function (v) {
      var c = chs[v.channelId] || {}; v.subs = c.subs; v.country = c.country || '';
      v.hrs = Math.max(1, (now - v.t) / 36e5); v.vph = v.views / v.hrs;
      v.out = c.subs ? v.views / Math.max(c.subs, 100) : null; v.eng = v.views ? (v.likes + v.comments) / v.views : 0;
    });
    // 2) từ khoá liên quan (miễn phí): gợi ý YouTube a–z + câu hỏi
    say('Lấy từ khoá gợi ý…');
    var seeds = [o.q].concat('abcdefghijklmnopqrstuvwxyz'.split('').map(function (c) { return o.q + ' ' + c; })).concat((QPREF[hl] || QPREF.en).map(function (p) { return p + ' ' + o.q; }));
    var sug = {};
    var res = await Promise.all(seeds.map(function (s) { return U.suggest(s, hl, o.gl); }));
    res.forEach(function (list, si) { list.forEach(function (k, pos) { k = k.toLowerCase().trim(); if (k === o.q.toLowerCase()) return; var w = (si === 0 ? 3 : 1) * (1 - pos / 12); if (!sug[k]) sug[k] = { k: k, s: 0, n: 0 }; sug[k].s += w; sug[k].n++; }); });
    var suggestions = Object.values(sug).sort(function (a, b) { return b.s - a.s; }).slice(0, 150);
    // tags + cụm từ tiêu đề
    var tagC = {}; vids.forEach(function (v) { var seen = {}; (v.tags || []).forEach(function (t) { t = t.toLowerCase().trim(); if (!t || seen[t] || t.length > 60) return; seen[t] = 1; if (!tagC[t]) tagC[t] = { k: t, n: 0, views: 0 }; tagC[t].n++; tagC[t].views += v.views; }); });
    var tags = Object.values(tagC).filter(function (t) { return t.n >= 2; }).sort(function (a, b) { return b.n - a.n || b.views - a.views; }).slice(0, 80);
    var phrases = window.TopNgachEngine && window.TopNgachEngine.phrases ? window.TopNgachEngine.phrases(vids.slice().sort(function (a, b) { return (b.out || 0) - (a.out || 0); }).slice(0, 60).map(function (v) { return v.title; }), hl, 30) : [];
    return { q: o.q, opt: o, at: now, units: units, vids: vids, suggestions: suggestions, tags: tags, phrases: phrases, hl: hl };
  }
  function scoreNiche(R) {
    var v = R.vids, gl = R.opt.gl;
    if (!v.length) return null;
    var views = v.map(function (x) { return x.views; }), vph = v.map(function (x) { return x.vph; });
    var withSubs = v.filter(function (x) { return x.subs != null; });
    var small = withSubs.filter(function (x) { return x.subs < 10000; }), smallHit = small.filter(function (x) { return x.views >= Math.max(x.subs, 1000) * 2; });
    var big = withSubs.filter(function (x) { return x.subs >= 1e6; });
    var outs = withSubs.map(function (x) { return x.out; });
    var chans = {}; v.forEach(function (x) { chans[x.channelId] = (chans[x.channelId] || 0) + 1; });
    var nCh = Object.keys(chans).length, topShare = Math.max.apply(null, Object.values(chans)) / v.length;
    var fresh = v.filter(function (x) { return Date.now() - x.t < 7 * 864e5; }).length / v.length;
    var cats = {}; v.forEach(function (x) { cats[x.cat] = (cats[x.cat] || 0) + x.views; }); var topCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0] || '';
    var rp = RPM[gl] || [1, 3], ck = CATK[topCat] || 1, long = v.filter(function (x) { return x.dur > 480; }).length / v.length;
    var medV = U.median(views), medVph = U.median(vph), medOut = U.median(outs);
    var demand = Math.min(1, Math.log10(1 + medV) / 6);              // 1M view trung vị = tối đa
    var opening = Math.min(1, (small.length ? smallHit.length / Math.max(8, v.length * 0.3) : 0));   // kênh nhỏ có thắng không
    var outlier = Math.min(1, Math.log10(1 + medOut) / Math.log10(51));
    var saturation = Math.min(1, big.length / v.length * 1.5 + topShare);
    var score = Math.round(100 * (0.35 * demand + 0.35 * opening + 0.2 * outlier + 0.1 * (1 - saturation)));
    var verdict = score >= 65 ? 'Nên làm' : score >= 45 ? 'Cân nhắc' : 'Khó / bão hoà';
    var why = [];
    why.push('View trung vị top kết quả: ' + N(medV) + (medV > 1e5 ? ' (nhu cầu cao)' : medV > 1e4 ? ' (nhu cầu vừa)' : ' (nhu cầu thấp)'));
    why.push(smallHit.length + ' video từ kênh dưới 10K sub đạt view ≥ 2× sub' + (smallHit.length >= 5 ? ' — kênh nhỏ vẫn chen được' : smallHit.length ? ' — có cửa nhưng hẹp' : ' — kênh nhỏ khó chen'));
    why.push(Math.round(big.length / v.length * 100) + '% kết quả là kênh trên 1M sub' + (big.length / v.length > 0.4 ? ' — nhiều kênh lớn chiếm chỗ' : ''));
    why.push(nCh + ' kênh khác nhau trong ' + v.length + ' video' + (topShare > 0.3 ? ' — 1 kênh chiếm ' + Math.round(topShare * 100) + '%' : ''));
    why.push(Math.round(fresh * 100) + '% video đăng trong 7 ngày qua' + (fresh > 0.4 ? ' — chủ đề đang nóng' : ''));
    return { score: score, verdict: verdict, why: why, medV: medV, medVph: medVph, medOut: medOut, small: small.length, smallHit: smallHit.length, bigPct: big.length / v.length, nCh: nCh, fresh: fresh, topCat: topCat, rpm: [rp[0] * ck, rp[1] * ck], long: long, demand: demand, opening: opening, outlier: outlier, saturation: saturation };
  }
  function slim(R) { // bản gọn để lưu lịch sử
    return Object.assign({}, R, { vids: R.vids.map(function (v) { return { id: v.id, title: v.title, channel: v.channel, channelId: v.channelId, t: v.t, views: v.views, likes: v.likes, comments: v.comments, dur: v.dur, cat: v.cat, subs: v.subs, country: v.country, hrs: v.hrs, vph: v.vph, out: v.out, eng: v.eng, tags: [] }; }) });
  }

  function KeywordLab(p) {
    var s0 = useState(function () { return Object.assign({ q: '', gl: 'US', days: 30, fmt: 'long', deep: false }, st.json('yt4_explore_opt', {}), p.preset ? { q: p.preset } : {}); }), o = s0[0], setO = s0[1];
    var s1 = useState(null), R = s1[0], setR = s1[1], s2 = useState(''), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1];
    var s4 = useState('vid'), tab = s4[0], setTab = s4[1], s5 = useState(st.json('yt4_explore_hist', [])), hist = s5[0], setHist = s5[1];
    var s6 = useState({ size: 'all', sort: null }), vf = s6[0], setVf = s6[1], s7 = useState(40), lim = s7[0], setLim = s7[1];
    K.useBus('saved');
    var chans = useMemo(function () {
      if (!R) return []; var m = {}; R.vids.forEach(function (v) { var c = m[v.channelId] = m[v.channelId] || { id: v.channelId, title: v.channel, subs: v.subs, country: v.country, n: 0, views: 0, best: v, outs: [] }; c.n++; c.views += v.views; if (v.views > c.best.views) c.best = v; if (v.out != null) c.outs.push(v.out); });
      return Object.values(m).map(function (c) { c.medOut = U.median(c.outs); return c; });
    }, [R]);


    function set(k, v) { setO(function (x) { var n = Object.assign({}, x); n[k] = v; st.put('yt4_explore_opt', Object.assign({}, n, { q: '' })); return n; }); }
    useEffect(function () { if (p.preset) { setO(function (x) { return Object.assign({}, x, { q: p.preset }); }); run(p.preset); } }, [p.presetKey]);
    async function run(qq) {
      var q = String(qq != null ? qq : o.q).trim(); if (!q) { setErr('Nhập từ khoá cần phân tích'); return; }
      setErr(''); setBusy('Bắt đầu…'); setLim(40);
      try {
        var r = await analyzeKeyword(Object.assign({}, o, { q: q }), setBusy);
        r.score = scoreNiche(r); setR(r); setTab('vid');
        var cache = st.json('yt4_explore_cache', {}); cache[q.toLowerCase() + '|' + o.gl] = slim(r);
        var ks = Object.keys(cache).sort(function (a, b) { return cache[b].at - cache[a].at; }); ks.slice(6).forEach(function (k) { delete cache[k]; });
        try { st.put('yt4_explore_cache', cache); } catch (e) { }
        var hh = [{ q: q, gl: o.gl, days: o.days, fmt: o.fmt, at: Date.now(), score: r.score ? r.score.score : 0 }].concat(hist.filter(function (x) { return !(x.q === q && x.gl === o.gl); })).slice(0, 14);
        setHist(hh); st.put('yt4_explore_hist', hh);
      } catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    function openHist(x) { var c = st.json('yt4_explore_cache', {})[x.q.toLowerCase() + '|' + x.gl]; setO(function (o2) { return Object.assign({}, o2, { q: x.q, gl: x.gl, days: x.days, fmt: x.fmt }); }); if (c) { setR(c); setTab('vid'); } else run(x.q); }
    var S = R && R.score;

    var form = h('div', { className: cx(K.C.card, 'p-4 space-y-3') },
      h('div', { className: 'flex flex-col md:flex-row gap-2' },
        h(Input, { value: o.q, onChange: function (e) { set('q', e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') run(); }, placeholder: 'Nhập từ khoá, ví dụ: plane crash, true crime, cách làm giàu…', className: 'md:flex-1 h-10 text-[11px]' }),
        h(Btn, { primary: true, onClick: function () { run(); }, disabled: !!busy, className: 'h-10 px-6' }, busy ? 'Đang phân tích…' : 'Phân tích')),
      h('div', { className: 'flex flex-wrap items-end gap-3' },
        h(Field, { label: 'Thị trường', className: 'w-40' }, h(Select, { value: o.gl, onChange: function (v) { set('gl', v); }, options: REGIONS.map(function (r) { return [r[0], r[1] + (RPM[r[0]] ? '  ·  RPM ~$' + RPM[r[0]][0] + '–' + RPM[r[0]][1] : '')]; }) })),
        h(Field, { label: 'Đăng trong' }, h(Seg, { value: o.days, onChange: function (v) { set('days', +v); }, options: [[1, '24h'], [7, '7 ngày'], [30, '30 ngày'], [90, '90 ngày'], [365, '1 năm'], [0, 'Mọi lúc']] })),
        h(Field, { label: 'Định dạng' }, h(Seg, { value: o.fmt, onChange: function (v) { set('fmt', v); }, options: [['long', 'Video dài'], ['short', 'Shorts'], ['all', 'Tất cả']] })),
        h(Field, { label: 'Độ sâu' }, h(Seg, { value: o.deep ? 1 : 0, onChange: function (v) { set('deep', v === '1' || v === 1); }, options: [[0, 'Nhanh'], [1, 'Sâu']] })),
        h('div', { className: 'text-[11px] text-zinc-500 pb-2' }, 'Ước tính ' + ((o.fmt === 'long' ? 2 : 1) * (o.deep ? 2 : 1) * 100 + (o.deep && o.fmt === 'all' ? 100 : 0) + 3) + ' quota')),
      busy && h(Busy, null, busy), err && h(Note, { error: true }, err));

    var histBar = hist.length > 0 && !R && h('div', { className: 'space-y-2' }, h('div', { className: K.C.label }, 'Đã phân tích gần đây'),
      h('div', { className: 'flex flex-wrap gap-1.5' }, hist.map(function (x) { return h('button', { key: x.q + x.gl, onClick: function () { openHist(x); }, className: 'h-8 px-3 rounded-md border border-zinc-800 text-[10.5px] text-zinc-300 hover:border-zinc-500 cursor-pointer' }, x.q, h('span', { className: 'ml-2 text-zinc-500' }, x.gl + ' · ' + x.score)); })));

    if (!R) return h('div', { className: 'space-y-5' }, form, histBar, !busy && !hist.length && h(Empty, { title: 'Nhập một từ khoá để bắt đầu', sub: 'Một lần phân tích ra: video đang nổ, kênh nào đang thắng, điểm cơ hội của ngách, từ khoá liên quan, khuôn tiêu đề của video thắng và nhận định AI.' }));

    // ---------- kết quả ----------
    var vids = R.vids.filter(function (v) { return vf.size === 'all' ? true : v.subs != null && v.subs < +vf.size; });
    var head = S ? h('div', { className: cx(K.C.card, 'p-4') },
      h('div', { className: 'grid gap-5 lg:grid-cols-[220px_1fr]' },
        h('div', null, h('div', { className: 'text-[10.5px] text-cham-400' }, 'Điểm cơ hội'), h('div', { className: 'mt-1 flex items-baseline gap-2' }, h('span', { className: cx('text-5xl font-light tabular-nums', S.score >= 65 ? 'text-emerald-300' : S.score >= 45 ? 'text-amber-200' : 'text-rose-300') }, S.score), h('span', { className: 'text-zinc-500' }, '/100')),
          h('div', { className: cx('mt-1 text-[11px]', S.score >= 65 ? 'text-emerald-300' : S.score >= 45 ? 'text-amber-200' : 'text-rose-300') }, S.verdict), h('div', { className: 'mt-3 space-y-1.5' },
            [['Nhu cầu', S.demand], ['Cửa cho kênh nhỏ', S.opening], ['Mức nổ view/sub', S.outlier], ['Độ bão hoà', S.saturation]].map(function (x) { return h('div', { key: x[0] }, h('div', { className: 'flex justify-between text-[11px] text-zinc-400 mb-0.5' }, h('span', null, x[0]), h('span', null, Math.round(x[1] * 100))), h(Bar, { value: x[1] * 100 })); }))),
        h('div', { className: 'space-y-4' },
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4' },
            h(Stat, { label: 'View trung vị', value: N(S.medV), tone: 'sky' }), h(Stat, { label: 'View / giờ trung vị', value: N(S.medVph), tone: 'amber' }), h(Stat, { label: 'Outlier trung vị', value: '×' + (S.medOut >= 10 ? Math.round(S.medOut) : S.medOut.toFixed(1)), tone: 'emerald' }), h(Stat, { tone: 'violet', label: 'RPM ước tính', value: '$' + S.rpm[0].toFixed(1) + '–' + S.rpm[1].toFixed(1), sub: CATN[S.topCat] || '' }),
            h(Stat, { label: 'Video phân tích', value: R.vids.length }), h(Stat, { label: 'Kênh khác nhau', value: S.nCh }), h(Stat, { label: 'Kênh nhỏ thắng', value: S.smallHit + ' / ' + S.small, sub: 'dưới 10K sub, view ≥ 2× sub' }), h(Stat, { label: 'Kênh trên 1M sub', value: Math.round(S.bigPct * 100) + '%' })),
          h('ul', { className: 'space-y-1 border-t border-zinc-900 pt-3' }, S.why.map(function (w, i) { return h('li', { key: i, className: 'text-[10.5px] text-zinc-400' }, w); })))),
      h('div', { className: 'mt-4 pt-3 border-t border-zinc-900 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500' },
        h('span', null, '"' + R.q + '" · ' + R.opt.gl + ' · ' + (R.opt.days ? R.opt.days + ' ngày' : 'mọi lúc') + ' · ' + (R.opt.fmt === 'long' ? 'video dài' : R.opt.fmt === 'short' ? 'Shorts' : 'tất cả') + ' · ' + new Date(R.at).toLocaleString('vi-VN') + (R.units ? ' · ' + R.units + ' quota' : '')),
        h('span', { className: 'flex-1' }), h(Btn, { small: true, onClick: function () { setR(null); } }, 'Từ khoá khác'),
        h('a', { href: 'https://trends.google.com/trends/explore?q=' + encodeURIComponent(R.q) + '&geo=' + R.opt.gl + '&date=today%2012-m', target: '_blank', rel: 'noopener noreferrer', className: K.C.sm }, 'Google Trends'))) : h(Note, null, 'Không tìm được video nào với bộ lọc này. Thử "Mọi lúc" hoặc "Tất cả" định dạng.');

    var vidCols = [
      { k: 'th', t: '', r: function (v) { return h(Thumb, { id: v.id, className: 'w-28' }); }, w: 'w-28' },
      { k: 'title', t: 'Video', v: function (v) { return v.title; }, cls: 'min-w-[260px]', r: function (v) { return h('div', { className: 'space-y-0.5' }, h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 line-clamp-2' }, v.title), h('button', { onClick: function () { p.goto('channels', { analyze: v.channelId }); }, className: 'text-[11px] text-zinc-400 hover:text-cham-50 cursor-pointer text-left' }, v.channel + ' · ' + (v.subs == null ? 'ẩn sub' : N(v.subs) + ' sub'))); } },
      { k: 'views', t: 'View', right: true, v: function (v) { return v.views; }, r: function (v) { return N(v.views); } },
      { k: 'vph', t: 'View/giờ', right: true, v: function (v) { return v.vph; }, r: function (v) { return N(v.vph); } },
      { k: 'out', t: 'View ÷ sub', right: true, v: function (v) { return v.out || 0; }, r: function (v) { return v.out == null ? '–' : h('span', { className: v.out >= 5 ? 'text-emerald-300' : v.out >= 2 ? 'text-zinc-200' : 'text-zinc-400' }, '×' + (v.out >= 10 ? Math.round(v.out) : v.out.toFixed(1))); } },
      { k: 'eng', t: 'Tương tác', right: true, v: function (v) { return v.eng; }, r: function (v) { return (v.eng * 100).toFixed(1) + '%'; } },
      { k: 'dur', t: 'Dài', right: true, v: function (v) { return v.dur; }, r: function (v) { return U.dur(v.dur); } },
      { k: 't', t: 'Đăng', right: true, v: function (v) { return v.t; }, r: function (v) { return U.ago(v.t); } },
      { k: 'act', t: '', r: function (v) { var sv = store.isSaved(v.id); return h('div', { className: 'flex gap-1 justify-end' }, h(Btn, { small: true, on: sv, onClick: function () { store.toggleSave(v); } }, sv ? 'Đã lưu' : 'Lưu'), h(Btn, { small: true, onClick: function () { K.followChannel(v.channelId, v.channel); } }, 'Theo dõi')); } }
    ];
    var chCols = [
      { k: 'title', t: 'Kênh', v: function (c) { return c.title; }, r: function (c) { return h('div', null, h('button', { onClick: function () { p.goto('channels', { analyze: c.id }); }, className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 cursor-pointer text-left' }, c.title), h('div', { className: 'text-[11px] text-zinc-500' }, c.country || '')); } },
      { k: 'subs', t: 'Sub', right: true, v: function (c) { return c.subs || 0; }, r: function (c) { return c.subs == null ? 'ẩn' : N(c.subs); } },
      { k: 'n', t: 'Số video trong top', right: true, v: function (c) { return c.n; } },
      { k: 'views', t: 'Tổng view (các video này)', right: true, v: function (c) { return c.views; }, r: function (c) { return N(c.views); } },
      { k: 'medOut', t: 'View ÷ sub trung vị', right: true, v: function (c) { return c.medOut || 0; }, r: function (c) { return c.outs.length ? '×' + (c.medOut >= 10 ? Math.round(c.medOut) : c.medOut.toFixed(1)) : '–'; } },
      { k: 'best', t: 'Video tốt nhất', cls: 'max-w-[280px]', r: function (c) { return h('a', { href: U.vurl(c.best.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-zinc-400 hover:text-cham-50 line-clamp-1' }, c.best.title); } },
      { k: 'act', t: '', r: function (c) { return h('div', { className: 'flex gap-1 justify-end' }, h(Btn, { small: true, onClick: function () { p.goto('channels', { analyze: c.id }); } }, 'Phân tích'), h(Btn, { small: true, onClick: function () { K.followChannel(c.id, c.title); } }, 'Theo dõi')); } }
    ];
    var kwList = function (title, sub, items, render) { return h(Section, { title: title, sub: sub }, items.length ? h('div', { className: 'flex flex-wrap gap-1.5' }, items.map(render)) : h('div', { className: 'text-[10.5px] text-zinc-500' }, 'Không có dữ liệu.')); };
    var kwBtn = function (k, extra) { return h('button', { key: k, onClick: function () { setO(function (x) { return Object.assign({}, x, { q: k }); }); run(k); }, className: 'px-2 py-1 rounded border border-zinc-800 text-[10.5px] text-zinc-300 hover:border-zinc-500 hover:text-cham-50 cursor-pointer', title: 'Phân tích từ khoá này' }, k, extra ? h('span', { className: 'ml-1.5 text-zinc-500' }, extra) : null); };

    var body;
    if (tab === 'vid') body = h(K.VideoList, {
      rows: vids, cols: vidCols, ratio: function (v) { return v.out; }, ratioLabel: 'View ÷ sub', onChannel: function (id) { p.goto('channels', { analyze: id }); },
      sorts: [['out', 'View ÷ sub', function (v) { return v.out || 0; }], ['views', 'View cao nhất', function (v) { return v.views; }], ['vph', 'View/giờ', function (v) { return v.vph; }], ['t', 'Mới nhất', function (v) { return v.t; }], ['eng', 'Tương tác', function (v) { return v.eng; }]],
      left: h(Frag, null, h('span', { className: 'text-[10.5px] text-zinc-400' }, 'Quy mô kênh'), h(Seg, { value: vf.size, onChange: function (v) { setVf({ size: v }); }, options: [['all', 'Tất cả'], ['10000', 'Dưới 10K'], ['50000', 'Dưới 50K'], ['200000', 'Dưới 200K']] })),
      tools: h(Btn, { small: true, onClick: function () { U.csv('video-' + R.q, [['Tiêu đề', 'Link', 'Kênh', 'Sub', 'View', 'View/giờ', 'View÷sub', 'Tương tác %', 'Thời lượng', 'Ngày đăng']].concat(vids.map(function (v) { return [v.title, U.vurl(v.id), v.channel, v.subs, v.views, Math.round(v.vph), v.out ? v.out.toFixed(2) : '', (v.eng * 100).toFixed(2), U.dur(v.dur), U.date(v.t)]; }))); } }, 'Xuất CSV')
    });
    else if (tab === 'ch') body = h(Table, { cols: chCols, rows: chans, rowKey: function (c) { return c.id; }, sort: { k: 'medOut', d: -1 } });
    else if (tab === 'kw') body = h('div', { className: 'space-y-4' },
      kwList('Gợi ý tìm kiếm YouTube', 'Người dùng đang gõ những cụm này (gợi ý a–z + câu hỏi, miễn phí). Bấm để phân tích.', R.suggestions.slice(0, 120), function (x) { return kwBtn(x.k); }),
      h('div', { className: 'grid gap-4 lg:grid-cols-2' },
        kwList('Cụm từ trong tiêu đề video nổ', 'Lặp lại trong tiêu đề các video có view ÷ sub cao nhất', R.phrases, function (k) { return kwBtn(k); }),
        kwList('Thẻ tag các video dùng', 'Tag xuất hiện ở từ 2 video trở lên', R.tags.slice(0, 60), function (x) { return kwBtn(x.k, x.n); })),
      h('div', null, h(Btn, { small: true, onClick: function () { U.csv('tu-khoa-' + R.q, [['Từ khoá', 'Nguồn', 'Điểm']].concat(R.suggestions.map(function (x) { return [x.k, 'Gợi ý YouTube', x.s.toFixed(2)]; }), R.phrases.map(function (k) { return [k, 'Cụm từ tiêu đề', '']; }), R.tags.map(function (x) { return [x.k, 'Tag', x.n]; }))); } }, 'Xuất CSV từ khoá')));
    else if (tab === 'title') body = h(K.PatternView, { data: K.titlePatterns(R.vids.filter(function (v) { return v.out != null; }), function (v) { return v.out; }), metric: 'view ÷ sub' });
    else body = h(K.InsightBox, {
      kind: 'keyword', topic: R.q, onKeyword: function (k) { setO(function (x) { return Object.assign({}, x, { q: k }); }); run(k); },
      data: function () { return { keyword: R.q, market: R.opt.gl, window_days: R.opt.days, format: R.opt.fmt, metrics: S && { score: S.score, median_views: S.medV, median_views_per_hour: Math.round(S.medVph), median_view_sub_ratio: +S.medOut.toFixed(2), small_channels_winning: S.smallHit, small_channels_total: S.small, pct_channels_over_1M: Math.round(S.bigPct * 100), distinct_channels: S.nCh, pct_uploaded_last_7d: Math.round(S.fresh * 100), rpm_usd: S.rpm.map(function (x) { return +x.toFixed(1); }) }, top_videos: R.vids.slice().sort(function (a, b) { return (b.out || 0) - (a.out || 0); }).slice(0, 35).map(function (v) { return { title: v.title, views: v.views, subs: v.subs, days_old: Math.round(v.hrs / 24), minutes: Math.round(v.dur / 60), view_sub: v.out ? +v.out.toFixed(1) : null }; }), search_suggestions: R.suggestions.slice(0, 40).map(function (x) { return x.k; }), title_phrases: R.phrases }; }
    });

    return h('div', { className: 'space-y-5' }, form, head,
      h(Tabs, { value: tab, onChange: setTab, items: [['vid', 'Video', vids.length], ['ch', 'Kênh', chans.length], ['kw', 'Từ khoá', R.suggestions.length + R.tags.length], ['title', 'Khuôn tiêu đề'], ['ai', 'Nhận định AI']] }), body);
  }

  // ---------- Thịnh hành theo nước: bảng "đang hot" của YouTube ở từng quốc gia ----------
  function HotLab(p) {
    var E = window.TopNgachEngine, M = (E && E.M) || {};
    var LIST = useMemo(function () {
      var seen = {}, out = [];
      Object.keys(M).forEach(function (k) { var c = M[k][2]; if (seen[c]) return; seen[c] = 1; var hi = M[k][4][1]; out.push({ c: c, n: k === 'ES' ? 'Mexico' : M[k][1], hi: hi, tier: hi >= 6 ? 0 : hi >= 2.5 ? 1 : 2, rpm: '$' + M[k][4][0] + '–' + M[k][4][1] }); });
      if (!out.length) REGIONS.forEach(function (r) { out.push({ c: r[0], n: r[1], hi: 0, tier: 1, rpm: '' }); });
      return out.sort(function (a, b) { return a.tier - b.tier || b.hi - a.hi || a.n.localeCompare(b.n, 'vi'); });
    }, []);
    var saved = st.json('yt4_hot', {}) || {};
    var s0 = useState(saved.cc || 'US'), cc = s0[0], setCc = s0[1], s1 = useState(saved.cat || ''), cat = s1[0], setCat = s1[1], s2 = useState(saved.n || 100), nMax = s2[0], setNMax = s2[1];
    var s3 = useState(null), R = s3[0], setR = s3[1], s4 = useState(''), busy = s4[0], setBusy = s4[1], s5 = useState(''), err = s5[0], setErr = s5[1];
    var s6 = useState('all'), fmt = s6[0], setFmt = s6[1], s7 = useState(false), small = s7[0], setSmall = s7[1], s8 = useState(''), q = s8[0], setQ = s8[1];
    var s9 = useState(function () { return st.json('tn3_tr', {}) || {}; }), tr = s9[0], setTr = s9[1], sa = useState(''), trBusy = sa[0], setTrBusy = sa[1];
    K.useBus('saved');
    var cur = LIST.filter(function (x) { return x.c === cc; })[0] || LIST[0] || { c: cc, n: cc, rpm: '' };
    var flag = function (c) { return h('img', { src: 'https://flagcdn.com/w40/' + String(c).toLowerCase() + '.png', alt: '', width: 20, height: 15, onError: function (e) { e.target.style.visibility = 'hidden'; }, className: 'w-5 h-[15px] rounded-[2px] object-cover shrink-0 bg-[#303030]' }); };

    async function run() {
      setErr(''); setBusy('Đang lấy bảng thịnh hành của ' + cur.n + '…');
      st.put('yt4_hot', { cc: cc, cat: cat, n: nMax });
      try {
        var items = [], token = '', units = 0;
        while (items.length < nMax) {
          var prm = { part: 'snippet,statistics,contentDetails', chart: 'mostPopular', regionCode: cc, maxResults: 50 };
          if (cat) prm.videoCategoryId = cat; if (token) prm.pageToken = token;
          var r = await Y.yt('videos', prm); units++;
          (r.items || []).forEach(function (v) { items.push(v); });
          token = r.nextPageToken || ''; if (!token || !(r.items || []).length) break;
        }
        var chIds = [], seen = {}; items.forEach(function (v) { var id = v.snippet && v.snippet.channelId; if (id && !seen[id]) { seen[id] = 1; chIds.push(id); } });
        var CH = {};
        setBusy('Đang lấy số sub của ' + chIds.length + ' kênh…');
        for (var i = 0, cs = U.chunk(chIds, 50); i < cs.length; i++) {
          var rc = await Y.yt('channels', { part: 'snippet,statistics', id: cs[i].join(',') }); units++;
          (rc.items || []).forEach(function (c) { var sx = c.statistics || {}; CH[c.id] = { subs: sx.hiddenSubscriberCount ? null : (+sx.subscriberCount || 0), vc: +sx.videoCount || 0, country: (c.snippet || {}).country || '', cr: Date.parse((c.snippet || {}).publishedAt) || 0 }; });
        }
        var now = Date.now();
        var rows = items.map(function (v, i) {
          var sn = v.snippet || {}, sx = v.statistics || {}, c = CH[sn.channelId] || {}, t = Date.parse(sn.publishedAt) || now, views = +sx.viewCount || 0, hrs = Math.max(1, (now - t) / 3600000);
          return { rank: i + 1, id: v.id, title: sn.title || '', channel: sn.channelTitle || '', channelId: sn.channelId, t: t, views: views, likes: +sx.likeCount || 0, comments: +sx.commentCount || 0, dur: U.iso((v.contentDetails || {}).duration), cat: sn.categoryId || '', subs: c.subs, vc: c.vc || 0, chCountry: c.country || '', chAge: c.cr ? Math.round((now - c.cr) / 86400000) : null, vph: Math.round(views / hrs), out: c.subs ? views / c.subs : null };
        });
        setR({ rows: rows, cc: cc, name: cur.n, cat: cat, at: now, units: units });
        if (!rows.length) setErr('YouTube không trả bảng thịnh hành cho ' + cur.n + (cat ? ' ở danh mục này' : '') + '. Thử bỏ danh mục hoặc chọn nước khác.');
      } catch (e) { setErr((e && (e.msg || e.message)) || 'Không lấy được bảng thịnh hành.'); }
      setBusy('');
    }
    async function translate(list) {
      var need = list.filter(function (v) { return v.title && !tr[v.id]; }).slice(0, 200);
      if (!need.length) { K.toast('Các tiêu đề đang hiện đã được dịch.'); return; }
      var all = Object.assign({}, st.json('tn3_tr', {}) || {}, tr), done = 0;
      try {
        for (var i = 0; i < need.length; i += 40) {
          setTrBusy('Đang dịch ' + Math.min(need.length, i + 40) + '/' + need.length + '…');
          var r = await Y.api('/api/research', { action: 'translate', to: 'vi', items: need.slice(i, i + 40).map(function (v) { return { id: v.id, t: v.title }; }) });
          Object.keys(r.map || {}).forEach(function (id) { all[id] = r.map[id]; done++; });
          setTr(Object.assign({}, all));
        }
        K.toast('Đã dịch ' + done + ' tiêu đề');
      } catch (e) { K.toast('Dịch bị dừng: ' + ((e && (e.message || e.msg)) || 'lỗi AI')); }
      st.put('tn3_tr', all); setTrBusy('');
    }

    var SHORT = (E && E.SHORT_MAX) || 180;
    var rows = !R ? [] : R.rows.filter(function (v) {
      if (fmt === 'long' && v.dur <= SHORT) return false; if (fmt === 'short' && v.dur > SHORT) return false;
      if (small && !(v.subs != null && v.subs < 20000)) return false;
      if (q && (v.title + ' ' + v.channel).toLowerCase().indexOf(q.toLowerCase()) < 0) return false;
      return true;
    });
    var cellBtn = 'inline-flex items-center justify-center h-[2.1em] px-[0.9em] rounded-full bg-[#323232] hover:bg-[#424242] text-[0.92em] font-medium text-[#f1f1f1] whitespace-nowrap cursor-pointer';
    var hot = function (o) { return o == null ? 'text-[#717171]' : o >= 20 ? 'text-[#ff6b63] font-bold' : o >= 5 ? 'text-[#f5c451] font-semibold' : 'text-[#e6e6e6]'; };
    var cols = [
      { k: 'rank', t: 'Hạng', right: true, v: function (v) { return -v.rank; }, r: function (v) { return v.rank; } },
      { k: 'th', t: 'Ảnh bìa', r: function (v) { return h(K.GThumb, { id: v.id, title: v.title, br: U.dur(v.dur) }); } },
      { k: 'title', t: 'Tiêu đề gốc', w: 'min-w-[240px] max-w-[380px]', v: function (v) { return v.title.toLowerCase(); }, r: function (v) { return h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'block truncate text-[#f1f1f1] hover:text-white' }, v.title); } },
      { k: 'vi', t: 'Tiêu đề tiếng Việt', w: 'min-w-[200px] max-w-[340px]', r: function (v) { return tr[v.id] ? h('span', { title: tr[v.id], className: 'block truncate text-[#c8c8c8]' }, tr[v.id]) : h('span', { className: 'text-[#555]' }, '–'); } },
      { k: 'ch', t: 'Kênh', tone: 'b', w: 'min-w-[140px] max-w-[200px]', v: function (v) { return v.channel.toLowerCase(); }, r: function (v) { return h('button', { onClick: function () { p.goto('channels', { analyze: v.channelId }); }, title: 'Phân tích kênh này', className: 'block max-w-full truncate text-left font-semibold text-[#7cc3ff] hover:text-white cursor-pointer' }, v.channel); } },
      { k: 'subs', t: 'Sub', right: true, tone: 'y', v: function (v) { return v.subs == null ? -1 : v.subs; }, r: function (v) { return v.subs == null ? 'ẩn' : N(v.subs); } },
      { k: 'views', t: 'View', right: true, tone: 'g', v: function (v) { return v.views; }, r: function (v) { return N(v.views); } },
      { k: 'vph', t: 'View/giờ', right: true, tone: 'g', v: function (v) { return v.vph; }, r: function (v) { return N(v.vph) + '/h'; } },
      { k: 'out', t: '× sub', right: true, v: function (v) { return v.out == null ? -1 : v.out; }, r: function (v) { return h('span', { className: hot(v.out) }, v.out == null ? '–' : '×' + (v.out >= 10 ? Math.round(v.out) : v.out.toFixed(1))); } },
      { k: 'age', t: 'Ngày trên kênh', right: true, v: function (v) { return -v.t; }, r: function (v) { return U.ago(v.t); } },
      { k: 'dur', t: 'Thời lượng', right: true, v: function (v) { return v.dur; }, r: function (v) { return U.dur(v.dur); } },
      { k: 'hour', t: 'Giờ đăng (VN)', right: true, off: true, v: function (v) { var d = new Date(v.t + 7 * 3600000); return d.getUTCHours() * 60 + d.getUTCMinutes(); }, r: function (v) { var d = new Date(v.t + 7 * 3600000); return String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0'); } },
      { k: 'date', t: 'Ngày đăng', right: true, off: true, v: function (v) { return v.t; }, r: function (v) { return new Date(v.t).toLocaleDateString('vi-VN'); } },
      { k: 'cat', t: 'Danh mục', off: true, v: function (v) { return CATN[v.cat] || '~'; }, r: function (v) { return CATN[v.cat] || '–'; } },
      { k: 'vc', t: 'Tổng video kênh', right: true, off: true, v: function (v) { return v.vc; }, r: function (v) { return v.vc ? N(v.vc) : '–'; } },
      { k: 'chAge', t: 'Tuổi kênh', right: true, off: true, v: function (v) { return v.chAge == null ? 1e9 : v.chAge; }, r: function (v) { return v.chAge == null ? '–' : v.chAge < 365 ? v.chAge + ' ngày' : (v.chAge / 365).toFixed(1) + ' năm'; } },
      { k: 'a', t: 'Thao tác', r: function (v) { var sv = store.isSaved(v.id); return h('span', { className: 'inline-flex gap-1' }, h('button', { onClick: function () { store.toggleSave(v); }, className: cellBtn + (sv ? ' !bg-[#1d3a2a] !text-[#9fe0ad]' : '') }, sv ? 'Đã lưu' : 'Lưu'), h('button', { onClick: function () { K.followChannel(v.channelId, v.channel); }, className: cellBtn }, 'Theo dõi kênh'), h('button', { onClick: function () { p.goto('explore', { sub: 'kw', q: v.title.split(/[|:\-–—(]/)[0].trim().slice(0, 60) }); }, title: 'Phân tích cụm đầu của tiêu đề như một từ khoá', className: cellBtn }, 'Phân tích')); } }
    ];
    var nSmall = R ? R.rows.filter(function (v) { return v.subs != null && v.subs < 20000; }).length : 0;
    var chip = function (on, text, fn) { return h('button', { type: 'button', 'aria-pressed': !!on, onClick: fn, className: cx('h-7 px-3 rounded-full text-[11.5px] font-medium whitespace-nowrap cursor-pointer', on ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#323232] text-[#f1f1f1] hover:bg-[#424242]') }, text); };
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'yt-card p-4 flex flex-wrap items-end gap-3' },
        h('label', { className: 'block' }, h('span', { className: 'block text-[11.5px] text-[#aaa] mb-1' }, 'Quốc gia'),
          h('span', { className: 'flex items-center gap-2' }, flag(cc),
            h('select', { value: cc, 'aria-label': 'Quốc gia xem thịnh hành', onChange: function (e) { setCc(e.target.value); }, className: 'h-9 min-w-[210px] bg-[#121212] border border-[#303030] rounded-lg px-2.5 text-[12.5px] text-[#f1f1f1] cursor-pointer' },
              [0, 1, 2].map(function (t) { var g = LIST.filter(function (x) { return x.tier === t; }); return g.length ? h('optgroup', { key: t, label: ['RPM cao', 'RPM vừa', 'RPM thấp'][t] + ' (ước tính)' }, g.map(function (x) { return h('option', { key: x.c, value: x.c }, x.n + (x.rpm ? ' · ' + x.rpm : '')); })) : null; })))),
        h('label', { className: 'block' }, h('span', { className: 'block text-[11.5px] text-[#aaa] mb-1' }, 'Danh mục'),
          h('select', { value: cat, 'aria-label': 'Danh mục thịnh hành', onChange: function (e) { setCat(e.target.value); }, className: 'h-9 min-w-[170px] bg-[#121212] border border-[#303030] rounded-lg px-2.5 text-[12.5px] text-[#f1f1f1] cursor-pointer' }, [h('option', { key: '', value: '' }, 'Mọi danh mục')].concat(Object.keys(CATN).map(function (k) { return h('option', { key: k, value: k }, CATN[k]); })))),
        h('label', { className: 'block' }, h('span', { className: 'block text-[11.5px] text-[#aaa] mb-1' }, 'Số video'),
          h('select', { value: nMax, 'aria-label': 'Số video lấy về', onChange: function (e) { setNMax(+e.target.value); }, className: 'h-9 bg-[#121212] border border-[#303030] rounded-lg px-2.5 text-[12.5px] text-[#f1f1f1] cursor-pointer' }, [[50, '50 video'], [100, '100 video'], [200, '200 video (tối đa)']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); }))),
        h(Btn, { primary: true, onClick: run, disabled: !!busy }, busy ? 'Đang lấy…' : 'Xem thịnh hành'),
        h('span', { className: 'text-[11.5px] text-[#aaa] pb-2' }, 'Tốn khoảng ' + (Math.ceil(nMax / 50) * 2) + ' quota. Đây là bảng "Thịnh hành" công khai của YouTube tại nước đó.')),
      busy && h(Busy, null, busy),
      err && h(Note, { error: true }, err),
      !R && !busy && !err && h(Empty, { title: 'Chọn nước rồi bấm Xem thịnh hành', sub: 'Mỗi nước một bảng riêng: video nào đang được đẩy, kênh nhỏ nào lọt vào, tiêu đề và ảnh bìa đang ăn khách ở thị trường đó.' }),
      R && R.rows.length > 0 && h(Frag, null,
        h('div', { className: 'flex flex-wrap items-center gap-2 text-[12.5px] text-[#d0d0d0]' }, flag(R.cc), h('b', { className: 'text-white' }, R.name), '· ' + R.rows.length + ' video · ', h('b', { className: 'text-[#6fcf85]' }, nSmall), ' video của kênh dưới 20K sub · lấy lúc ' + new Date(R.at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' · ' + R.units + ' quota'),
        h(K.Grid, { storeKey: 'hot', cols: cols, rows: rows, rowKey: function (v) { return v.id; }, thumbs: true, limit: 60, empty: 'Không có video nào qua bộ lọc đang chọn.',
          rowClass: function (v) { return v.subs != null && v.subs < 20000 ? 'shadow-[inset_3px_0_0_#4bc167]' : ''; },
          left: h('div', { className: 'flex flex-wrap items-center gap-1.5' },
            h('input', { value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: 'Lọc theo tiêu đề, kênh', 'aria-label': 'Lọc bảng thịnh hành', className: 'h-7 w-44 bg-[#121212] border border-[#303030] rounded-full px-3 text-[11.5px] text-[#f1f1f1] placeholder:text-[#777]' }),
            chip(fmt === 'all', 'Tất cả', function () { setFmt('all'); }), chip(fmt === 'long', 'Video dài', function () { setFmt('long'); }), chip(fmt === 'short', 'Shorts', function () { setFmt('short'); }),
            chip(small, 'Chỉ kênh dưới 20K sub', function () { setSmall(!small); }),
            h('button', { onClick: function () { translate(rows); }, disabled: !!trBusy, className: 'h-7 px-3 rounded-full bg-[#1d2f45] hover:bg-[#25405e] text-[11.5px] font-medium text-[#8ab4f8] cursor-pointer disabled:opacity-50' }, trBusy || 'Dịch tiêu đề sang tiếng Việt'),
            h('button', { onClick: function () { U.csv('thinh-hanh-' + R.cc, [['Hạng', 'Tiêu đề', 'Tiêu đề tiếng Việt', 'Link', 'Kênh', 'Sub', 'View', 'View/giờ', 'View÷sub', 'Thời lượng (giây)', 'Ngày đăng', 'Danh mục']].concat(rows.map(function (v) { return [v.rank, v.title, tr[v.id] || '', U.vurl(v.id), v.channel, v.subs == null ? '' : v.subs, v.views, v.vph, v.out == null ? '' : v.out.toFixed(2), v.dur, new Date(v.t).toISOString(), CATN[v.cat] || '']; }))); }, className: 'h-7 px-3 rounded-full bg-[#3a3214] hover:bg-[#4a401a] text-[11.5px] font-medium text-[#f5c451] cursor-pointer' }, 'Xuất CSV')) })));
  }

  function Explore(p) {
    var okSub = function (v) { return ['kw', 'titles', 'thumb', 'hot'].indexOf(v) >= 0 ? v : ''; };
    var s = useState(okSub(p.params && p.params.sub) || 'kw'), sub = s[0], setSub = s[1];
    useEffect(function () { if (p.params && okSub(p.params.sub)) setSub(p.params.sub); else if (p.params && p.params.q) setSub('kw'); }, [p.params]);
    var W = window.YT4Workshop;
    return h('div', { className: 'space-y-5' },
      h('div', null, h('h1', { className: 'font-display text-[25px] leading-9 font-bold text-white tracking-tight' }, 'Khám phá'), h('p', { className: 'text-[13.5px] text-[#d0d0d0] mt-1 leading-relaxed' }, 'Phân tích một từ khoá, xem video đang thịnh hành ở từng nước, viết tiêu đề theo khuôn đang thắng và thử thumbnail giữa đối thủ.')),
      h(K.Help, { id: 'explore', title: 'Cách dùng Khám phá', steps: ['Gõ một từ khoá (ví dụ: plane crash), chọn thị trường, khoảng thời gian và định dạng, rồi bấm Phân tích.', 'Xem Điểm cơ hội: từ 65 trở lên là nên làm, 45–64 là cân nhắc, dưới 45 là khó vì kênh lớn chiếm hết.', 'Tab Video: video đang nổ. Bấm Lưu để giữ lại, Theo dõi để đưa kênh vào danh sách đối thủ, Kênh để phân tích kênh đó.', 'Tab Từ khoá: bấm vào cụm bất kỳ để phân tích tiếp. Tab Nhận định AI: AI đọc số liệu và gợi ý ý tưởng video.'], terms: [['View ÷ sub (outlier)', 'video được bao nhiêu lần số người đăng ký của kênh; ×5 trở lên là nổ thật sự'], ['View/giờ', 'tốc độ lên view từ lúc đăng'], ['RPM', 'tiền nhận được cho 1.000 view (ước tính theo nước và chủ đề)'], ['Quota', 'mỗi API key được 10.000 lượt/ngày; 1 lần phân tích nhanh tốn khoảng 100–200']] }),
      h(Tabs, { value: sub, onChange: setSub, items: [['kw', 'Phân tích từ khoá'], ['hot', 'Thịnh hành theo nước'], ['titles', 'Xưởng tiêu đề'], ['thumb', 'Thử thumbnail']] }),
      sub === 'kw' ? h(KeywordLab, { goto: p.goto, preset: p.params && p.params.q, presetKey: p.params && p.params._k })
        : sub === 'titles' ? (W ? h(W.TitleLab, { goto: p.goto, q: p.params && p.params.q }) : h(K.Missing, { name: 'Xưởng tiêu đề', file: 'page_workshop.js' }))
        : sub === 'hot' ? h(HotLab, { goto: p.goto })
        : sub === 'thumb' ? (W ? h(W.ThumbLab, { goto: p.goto }) : h(K.Missing, { name: 'Thử thumbnail', file: 'page_workshop.js' }))
        : h(KeywordLab, { goto: p.goto, preset: p.params && p.params.q, presetKey: p.params && p.params._k }));
  }
  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.explore = Explore;
  window.YT4Explore = { analyzeKeyword: analyzeKeyword, scoreNiche: scoreNiche, REGIONS: REGIONS };
})();
