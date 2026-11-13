// =========================================================================
// YOUTREND v4 — KÊNH (gộp Đối thủ + Phân tích kênh + Spy + Studio)
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Tabs = K.Tabs, Stat = K.Stat, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Bar = K.Bar, Section = K.Section, Table = K.Table, More = K.More, Thumb = K.Thumb;
  var WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  var CATN = { '1': 'Phim & Hoạt hình', '2': 'Xe cộ', '10': 'Âm nhạc', '15': 'Thú cưng', '17': 'Thể thao', '19': 'Du lịch', '20': 'Gaming', '22': 'Đời sống & Vlog', '23': 'Hài hước', '24': 'Giải trí', '25': 'Tin tức', '26': 'Mẹo & Phong cách', '27': 'Giáo dục', '28': 'Khoa học & Công nghệ' };
  var VERD = { farm: 'Đang farm view đều', rise: 'Đang lên', fluke: 'Ăn may 1–2 video', cold: 'View thấp', none: 'Chưa đủ video', unk: 'Chưa đủ dữ liệu' };

  // ---------- PHÂN TÍCH KÊNH ----------
  function fmtStats(arr, now) {
    if (!arr.length) return null;
    var ripe = arr.filter(function (v) { return now - v.t > 2 * 864e5; }); var base = ripe.length >= 3 ? ripe : arr;
    var med = U.median(base.map(function (v) { return v.views; }));
    var last60 = arr.filter(function (v) { return now - v.t <= 60 * 864e5; });
    var sorted = base.slice().sort(function (a, b) { return b.t - a.t; });
    var recent = sorted.slice(0, 10), prev = sorted.slice(10, 20);
    var mom = prev.length >= 5 ? U.median(recent.map(function (v) { return v.views; })) / Math.max(1, U.median(prev.map(function (v) { return v.views; }))) : null;
    return { n: arr.length, med: med, p90: U.pct(base.map(function (v) { return v.views; }), 0.9), avgDur: arr.reduce(function (a, v) { return a + v.dur; }, 0) / arr.length, perWeek: last60.length / (60 / 7), v30: arr.filter(function (v) { return now - v.t <= 30 * 864e5; }).reduce(function (a, v) { return a + v.views; }, 0), mom: mom, eng: U.median(arr.map(function (v) { return v.views ? (v.likes + v.comments) / v.views : 0; })) };
  }
  async function analyzeChannel(raw, n, say) {
    say('Tìm kênh…');
    var c = await Y.resolveChannel(raw), now = Date.now();
    say('Lấy ' + (n || 100) + ' video gần nhất…');
    var vids = await Y.uploads(c.id, n || 100);
    vids = vids.filter(function (v) { return v.live !== 'live' && v.live !== 'upcoming'; });
    var subs = c.statistics.hiddenSubscriberCount ? null : +c.statistics.subscriberCount;
    var long = vids.filter(function (v) { return v.dur > 180; }), short = vids.filter(function (v) { return v.dur <= 180; });
    var L = fmtStats(long, now), S = fmtStats(short, now);
    vids.forEach(function (v) { var F = v.dur > 180 ? L : S; v.rel = F && F.med ? v.views / F.med : null; v.out = subs ? v.views / Math.max(subs, 100) : null; v.eng = v.views ? (v.likes + v.comments) / v.views : 0; v.hrs = Math.max(1, (now - v.t) / 36e5); v.vph = v.views / v.hrs; });
    var E = window.TopNgachEngine, mk = E && E.CC[c.snippet.country] || 'EN';
    var cats = {}; long.forEach(function (v) { cats[v.cat] = (cats[v.cat] || 0) + 1; }); var topCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0] || '';
    var farm = E ? E.analyze({ s: subs || 0, u: vids.map(function (v) { return [v.views, v.dur, v.t]; }), cr: Date.parse(c.snippet.publishedAt), mk: mk, cat: topCat, nc: '' }, now, long.length < short.length) : null;
    var rpm = E ? E.rpmOf({ mk: mk, cat: topCat, nc: '' }) : [1, 3];
    // khung giờ đăng của các video tốt (giờ Việt Nam)
    var good = vids.filter(function (v) { return v.rel != null && v.rel >= 1.5; }), slot = {};
    good.forEach(function (v) { var d = new Date(v.t + 7 * 36e5); var k = WD[d.getUTCDay()] + ' ' + String(d.getUTCHours()).padStart(2, '0') + 'h'; slot[k] = (slot[k] || 0) + 1; });
    var slots = Object.keys(slot).sort(function (a, b) { return slot[b] - slot[a]; }).slice(0, 4).map(function (k) { return [k, slot[k]]; });
    var allSlot = {}; vids.forEach(function (v) { var d = new Date(v.t + 7 * 36e5); var k = WD[d.getUTCDay()]; allSlot[k] = (allSlot[k] || 0) + 1; });
    return {
      at: now, id: c.id, title: c.snippet.title, handle: c.snippet.customUrl || '', desc: (c.snippet.description || '').slice(0, 400), country: c.snippet.country || '', created: Date.parse(c.snippet.publishedAt), avatar: ((c.snippet.thumbnails || {}).medium || (c.snippet.thumbnails || {}).default || {}).url || '',
      subs: subs, views: +c.statistics.viewCount || 0, videoCount: +c.statistics.videoCount || 0, keywords: ((c.brandingSettings || {}).channel || {}).keywords || '',
      vids: vids, long: L, short: S, farm: farm, rpm: rpm, mk: mk, topCat: topCat, slots: slots, weekdays: allSlot
    };
  }

  // Cập nhật video mới của mọi kênh đang theo dõi (dùng chung cho tab Theo dõi và trang Hôm nay). ≈2 quota/kênh.
  async function refreshFeed(say) {
    var chans = store.channels(); say = say || function () { };
    if (!chans.length) return st.json('yt4_feed', { at: 0, items: [] });
    say('Cập nhật số liệu ' + chans.length + ' kênh…');
    var stats = await Y.channelStats(chans.map(function (c) { return c.id; }));
    var items = [], done = 0;
    for (var g = 0, gs = U.chunk(chans, 6); g < gs.length; g++) {
      await Promise.all(gs[g].map(async function (c) {
        try {
          var vids = await Y.uploads(c.id, 20), now = Date.now();
          var ripe = vids.filter(function (v) { return now - v.t > 2 * 864e5; }), med = U.median((ripe.length >= 3 ? ripe : vids).map(function (v) { return v.views; }));
          var s = stats[c.id] || {};
          var in30 = vids.filter(function (v) { return now - v.t <= 30 * 864e5; }), day = Math.floor(now / 864e5);
          var hist = (c.hist || []).filter(function (x) { return x[0] !== day; }).concat([[day, s.subs != null ? s.subs : c.subs || 0, s.views || c.viewCount || 0]]).slice(-90);
          store.updateChannel(c.id, { title: s.title || c.title, subs: s.subs != null ? s.subs : c.subs, prevSubs: c.subs, prevAt: c.checkedAt || 0, videoCount: s.videos || c.videoCount, viewCount: s.views || c.viewCount, avatar: s.avatar || c.avatar, med: med, lastUpload: vids[0] ? vids[0].t : 0, checkedAt: now, v30: in30.reduce(function (a, v) { return a + v.views; }, 0), n30: in30.length, n30cap: in30.length >= vids.length && vids.length >= 20, hist: hist });
          vids.filter(function (v) { return now - v.t <= 45 * 864e5; }).forEach(function (v) { items.push({ id: v.id, title: v.title, channel: s.title || c.title, channelId: c.id, subs: s.subs, t: v.t, views: v.views, dur: v.dur, rel: med ? v.views / med : null }); });
        } catch (e) { if (e && e.code === 'quotaExceeded') throw e; }
        done++; say('Cập nhật ' + done + '/' + chans.length + ' kênh…');
      }));
    }
    var f = { at: Date.now(), items: items.sort(function (a, b) { return b.t - a.t; }) }; st.put('yt4_feed', f); Y.emit('feed'); return f;
  }

  function ChannelLab(p) {
    var s0 = useState(''), q = s0[0], setQ = s0[1], s1 = useState(null), R = s1[0], setR = s1[1], s2 = useState(''), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1];
    var s4 = useState('vid'), tab = s4[0], setTab = s4[1], s5 = useState(100), n = s5[0], setN = s5[1], s6 = useState('all'), fmt = s6[0], setFmt = s6[1], s7 = useState(40), lim = s7[0], setLim = s7[1];
    var s8 = useState(st.json('yt4_channel_hist', [])), hist = s8[0], setHist = s8[1];
    K.useBus('saved'); K.useBus('channels');
    async function run(raw, tabAfter) {
      raw = String(raw != null ? raw : q).trim(); if (!raw) { setErr('Nhập link kênh, @handle, ID kênh hoặc link một video của kênh'); return; }
      setErr(''); setLim(40);
      try { var r = await analyzeChannel(raw, n, setBusy); setR(r); setTab(tabAfter || 'vid'); var hh = [{ id: r.id, title: r.title, subs: r.subs, at: r.at }].concat(hist.filter(function (x) { return x.id !== r.id; })).slice(0, 16); setHist(hh); st.put('yt4_channel_hist', hh); if (store.hasChannel(r.id)) store.updateChannel(r.id, { subs: r.subs, videoCount: r.videoCount, viewCount: r.views, med: r.long ? r.long.med : r.short ? r.short.med : 0 }); }
      catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    useEffect(function () { if (p.target) { setQ(p.target); run(p.target, p.tab); } }, [p.targetKey]);

    var form = h('div', { className: cx(K.C.card, 'p-4 space-y-3') },
      h('div', { className: 'flex flex-col md:flex-row gap-2' },
        h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') run(null, tab === 'clone' ? 'clone' : 'vid'); }, placeholder: 'Link kênh, @handle, ID kênh hoặc link một video của kênh', className: 'md:flex-1 h-10 text-[11px]' }),
        h('div', { className: 'w-40' }, h(Select, { value: n, onChange: function (v) { setN(+v); }, className: 'h-10', options: [[50, '50 video gần nhất'], [100, '100 video gần nhất'], [200, '200 video gần nhất']] })),
        h(Btn, { primary: true, onClick: function () { run(null, tab === 'clone' ? 'clone' : 'vid'); }, disabled: !!busy, className: 'h-10 px-6' }, busy ? 'Đang phân tích…' : 'Phân tích kênh')),
      busy && h(Busy, null, busy), err && h(Note, { error: true }, err),
      !R && hist.length > 0 && h('div', { className: 'flex flex-wrap gap-1.5 pt-1' }, hist.map(function (x) { return h('button', { key: x.id, onClick: function () { setQ(x.id); run(x.id); }, className: 'h-8 px-3 rounded-md border border-zinc-800 text-[10.5px] text-zinc-300 hover:border-zinc-500 cursor-pointer' }, x.title, h('span', { className: 'ml-2 text-zinc-500' }, x.subs == null ? '' : N(x.subs))); })));
    if (!R) return h('div', { className: 'space-y-5' }, form, !busy && h(Empty, { title: 'Phân tích một kênh bất kỳ', sub: 'So từng video với trung vị của chính kênh để thấy video nào thật sự vượt trội, kênh có farm view đều không, đăng giờ nào, tần suất, đà tăng, doanh thu ước tính và khuôn tiêu đề của video thắng.' }));

    var F = R.long && (!R.short || R.long.n >= R.short.n) ? R.long : R.short, fm = R.farm || {};
    var ageD = R.created ? Math.round((Date.now() - R.created) / 864e5) : null;
    var followed = store.hasChannel(R.id);
    var head = h('div', { className: cx(K.C.card, 'p-4 space-y-4') },
      h('div', { className: 'flex flex-wrap items-start gap-4' },
        R.avatar && h('img', { src: R.avatar, className: 'w-14 h-14 rounded-md bg-zinc-900 grayscale-[30%]' }),
        h('div', { className: 'flex-1 min-w-0' },
          h('a', { href: U.curl(R.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-lg text-cham-50 hover:underline' }, R.title),
          h('div', { className: 'text-[10.5px] text-zinc-400 mt-0.5' }, [R.handle, R.country, ageD != null ? 'tạo ' + (ageD < 365 ? ageD + ' ngày' : (ageD / 365).toFixed(1) + ' năm') + ' trước' : '', CATN[R.topCat]].filter(Boolean).join(' · ')),
          R.desc && h('div', { className: 'text-[10.5px] text-zinc-400 mt-1 line-clamp-2 max-w-3xl' }, R.desc)),
        h('div', { className: 'flex gap-2' },
          h(Btn, { onClick: function () { if (followed) { store.removeChannel(R.id); K.toast('Đã bỏ theo dõi'); } else { store.addChannel({ id: R.id, title: R.title, subs: R.subs || 0, videoCount: R.videoCount, viewCount: R.views, avatar: R.avatar, country: R.country, med: F ? F.med : 0 }); K.toast('Đã theo dõi ' + R.title); } } }, followed ? 'Đang theo dõi' : 'Theo dõi'),
          h(Btn, { onClick: function () { setTab('clone'); }, className: '!bg-[#3a2a5c] !text-[#d4bbff] hover:!bg-[#4a3673]' }, 'Hồ sơ clone'),
          h(Btn, { onClick: function () { var ok = store.addCompare({ id: R.id, title: R.title }); K.toast(ok ? 'Đã thêm vào so sánh (' + store.compare().length + '/4). Mở tab So sánh.' : 'Kênh đã có trong danh sách so sánh'); } }, 'So sánh'),
          h(Btn, { onClick: function () { p.goto('explore', { q: (R.vids.slice().sort(function (a, b) { return (b.rel || 0) - (a.rel || 0); })[0] || {}).title || R.title }); } }, 'Tìm ngách tương tự'),
          h(Btn, { onClick: function () { setR(null); } }, 'Kênh khác'))),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4' },
        h(Stat, { label: 'Người đăng ký', value: R.subs == null ? 'Ẩn' : N(R.subs), tone: 'emerald' }), h(Stat, { label: 'Tổng view', value: N(R.views), tone: 'sky' }), h(Stat, { label: 'Số video', value: N(R.videoCount) }),
        h(Stat, { label: 'Đánh giá', value: h('span', { className: fm.v === 'farm' ? 'text-emerald-300' : fm.v === 'rise' ? 'text-sky-300' : fm.v === 'fluke' ? 'text-amber-200' : 'text-zinc-300' }, VERD[fm.v] || '–'), sub: fm.score != null ? 'điểm ' + fm.score + '/100' : '' }),
        h(Stat, { label: 'View 30 ngày (video mới)', value: F ? N((R.long ? R.long.v30 : 0) + (R.short ? R.short.v30 : 0)) : '–' }),
        h(Stat, { label: 'Doanh thu ước tính 30 ngày', value: R.long && (R.subs || 0) >= 1000 ? '$' + N(R.long.v30 * R.rpm[0] / 1000) + '–' + N(R.long.v30 * R.rpm[1] / 1000) : (R.subs || 0) < 1000 ? 'Chưa đủ 1K sub' : '–', sub: 'video dài, RPM ~$' + R.rpm[0].toFixed(1) + '–' + R.rpm[1].toFixed(1) })),
      h('div', { className: 'grid gap-4 md:grid-cols-2' }, [['Video dài', R.long], ['Shorts', R.short]].map(function (x) {
        var S = x[1];
        return h('div', { key: x[0], className: 'rounded-md border border-zinc-900 p-3' }, h('div', { className: 'text-[10.5px] text-zinc-400 mb-2' }, x[0] + (S ? ' · ' + S.n + ' video' : '')),
          S ? h('div', { className: 'grid grid-cols-3 gap-3' }, h(Stat, { label: 'View trung vị', value: N(S.med) }), h(Stat, { label: 'Top 10% đạt', value: N(S.p90) }), h(Stat, { label: 'Đà tăng', value: S.mom == null ? '–' : '×' + S.mom.toFixed(2), sub: '10 video mới so với 10 video trước' }),
            h(Stat, { label: 'Tần suất', value: S.perWeek.toFixed(1) + ' / tuần', sub: '60 ngày qua' }), h(Stat, { label: 'Độ dài TB', value: U.dur(S.avgDur) }), h(Stat, { label: 'Tương tác trung vị', value: (S.eng * 100).toFixed(1) + '%' }))
            : h('div', { className: 'text-[10.5px] text-zinc-500' }, 'Không có video loại này.'));
      })),
      R.slots.length > 0 && h('div', { className: 'text-[10.5px] text-zinc-400' }, 'Khung giờ đăng của các video vượt trung vị ×1.5 (giờ VN): ', R.slots.map(function (s) { return s[0] + ' (' + s[1] + ')'; }).join(', ')));

    var list = R.vids.filter(function (v) { return fmt === 'all' ? true : fmt === 'long' ? v.dur > 180 : v.dur <= 180; });
    var cols = [
      { k: 'th', t: '', r: function (v) { return h(Thumb, { id: v.id, className: 'w-28' }); } },
      { k: 'title', t: 'Video', v: function (v) { return v.title; }, cls: 'min-w-[280px]', r: function (v) { return h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 line-clamp-2' }, v.title); } },
      { k: 'views', t: 'View', right: true, v: function (v) { return v.views; }, r: function (v) { return N(v.views); } },
      { k: 'rel', t: 'So với trung vị kênh', right: true, v: function (v) { return v.rel || 0; }, r: function (v) { return v.rel == null ? '–' : h('span', { className: v.rel >= 2 ? 'text-emerald-300' : v.rel < 0.5 ? 'text-zinc-500' : 'text-zinc-400' }, '×' + v.rel.toFixed(1)); } },
      { k: 'out', t: 'View ÷ sub', right: true, v: function (v) { return v.out || 0; }, r: function (v) { return v.out == null ? '–' : '×' + (v.out >= 10 ? Math.round(v.out) : v.out.toFixed(1)); } },
      { k: 'vph', t: 'View/giờ', right: true, v: function (v) { return v.vph; }, r: function (v) { return N(v.vph); } },
      { k: 'eng', t: 'Tương tác', right: true, v: function (v) { return v.eng; }, r: function (v) { return (v.eng * 100).toFixed(1) + '%'; } },
      { k: 'dur', t: 'Dài', right: true, v: function (v) { return v.dur; }, r: function (v) { return U.dur(v.dur); } },
      { k: 't', t: 'Đăng', right: true, v: function (v) { return v.t; }, r: function (v) { return U.date(v.t); } },
      { k: 'a', t: '', r: function (v) { var sv = store.isSaved(v.id); return h(Btn, { small: true, on: sv, onClick: function () { store.toggleSave(Object.assign({ subs: R.subs }, v)); } }, sv ? 'Đã lưu' : 'Lưu'); } }
    ];
    var body;
    if (tab === 'vid') body = h('div', { className: 'space-y-3' },
      h(K.VideoList, { rows: list, cols: cols, ratio: function (v) { return v.rel; }, ratioLabel: 'So với TB kênh', hotAt: 2, defSort: 't',
        sorts: [['t', 'Mới nhất', function (v) { return v.t; }], ['rel', 'Vượt trung vị kênh', function (v) { return v.rel || 0; }], ['views', 'View cao nhất', function (v) { return v.views; }], ['vph', 'View/giờ', function (v) { return v.vph; }]],
        left: h(Seg, { value: fmt, onChange: setFmt, options: [['all', 'Tất cả'], ['long', 'Video dài'], ['short', 'Shorts']] }),
        tools: h(Btn, { small: true, onClick: function () { U.csv('kenh-' + R.title, [['Tiêu đề', 'Link', 'View', 'So với trung vị', 'View÷sub', 'View/giờ', 'Tương tác %', 'Thời lượng', 'Ngày đăng']].concat(list.map(function (v) { return [v.title, U.vurl(v.id), v.views, v.rel ? v.rel.toFixed(2) : '', v.out ? v.out.toFixed(2) : '', Math.round(v.vph), (v.eng * 100).toFixed(2), U.dur(v.dur), U.date(v.t)]; }))); } }, 'Xuất CSV') }));
    else if (tab === 'clone') body = window.YT4Clone ? h(window.YT4Clone.ClonePanel, { R: R, goto: p.goto }) : h(K.Missing, { name: 'Hồ sơ clone', file: 'page_clone.js' });
    else if (tab === 'title') body = h(K.PatternView, { data: K.titlePatterns(R.vids.filter(function (v) { return v.rel != null && Date.now() - v.t > 2 * 864e5; }), function (v) { return v.rel; }), metric: 'mức vượt trung vị kênh' });
    else if (tab === 'time') {
      var max = Math.max.apply(null, WD.map(function (d) { return R.weekdays[d] || 0; }).concat([1]));
      body = h('div', { className: 'grid gap-4 lg:grid-cols-2' },
        h(Section, { title: 'Số video đăng theo thứ (giờ VN)' }, h('div', { className: 'space-y-1.5' }, ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(function (d) { var v = R.weekdays[d] || 0; return h('div', { key: d, className: 'grid grid-cols-[32px_1fr_32px] items-center gap-2 text-[10.5px]' }, h('span', { className: 'text-zinc-400' }, d), h(Bar, { value: v / max * 100 }), h('span', { className: 'text-right text-zinc-400 tabular-nums' }, v)); }))),
        h(Section, { title: 'Khung giờ của video vượt trội', sub: 'Video có view ≥ 1.5× trung vị kênh' }, R.slots.length ? h('div', { className: 'space-y-1' }, R.slots.map(function (s) { return h('div', { key: s[0], className: 'flex justify-between text-[10.5px]' }, h('span', { className: 'text-zinc-200' }, s[0]), h('span', { className: 'text-zinc-400' }, s[1] + ' video')); })) : h('div', { className: 'text-[10.5px] text-zinc-500' }, 'Chưa đủ video vượt trội.')),
        R.keywords && h(Section, { title: 'Từ khoá kênh tự khai', className: 'lg:col-span-2' }, h('div', { className: 'text-[10.5px] text-zinc-400' }, R.keywords)));
    }
    else body = h(K.InsightBox, {
      kind: 'channel', topic: R.title, onKeyword: function (k) { p.goto('explore', { q: k }); },
      data: function () { return { channel: R.title, subs: R.subs, total_views: R.views, videos: R.videoCount, country: R.country, age_days: ageD, category: CATN[R.topCat] || '', verdict: fm.v, farm_score: fm.score, long: R.long && { n: R.long.n, median_views: R.long.med, per_week: +R.long.perWeek.toFixed(1), avg_minutes: Math.round(R.long.avgDur / 60), momentum: R.long.mom && +R.long.mom.toFixed(2) }, shorts: R.short && { n: R.short.n, median_views: R.short.med, per_week: +R.short.perWeek.toFixed(1), momentum: R.short.mom && +R.short.mom.toFixed(2) }, best_slots_vn: R.slots, videos_sample: R.vids.slice().sort(function (a, b) { return b.t - a.t; }).slice(0, 60).map(function (v) { return { title: v.title, views: v.views, vs_channel_median: v.rel ? +v.rel.toFixed(2) : null, minutes: Math.round(v.dur / 60), days_old: Math.round(v.hrs / 24) }; }) }; }
    });
    return h('div', { className: 'space-y-5' }, form, head, h(Tabs, { value: tab, onChange: setTab, items: [['vid', 'Video', list.length], ['clone', 'Hồ sơ clone'], ['title', 'Khuôn tiêu đề'], ['time', 'Lịch đăng'], ['ai', 'Nhận định AI']] }), body);
  }

  // ---------- THEO DÕI ----------
  function Tracking(p) {
    K.useBus('channels'); K.useBus('saved');
    var chans = store.channels();
    var s0 = useState(st.json('yt4_feed', { at: 0, items: [] })), feed = s0[0], setFeed = s0[1], s1 = useState(''), busy = s1[0], setBusy = s1[1], s2 = useState(''), q = s2[0], setQ = s2[1];
    var s3 = useState(function () { return st.json('yt4_track_view', 'feed') === 'list' ? 'list' : 'feed'; }), view = s3[0], setView0 = s3[1], setView = function (v) { setView0(v); st.put('yt4_track_view', v); }, s4 = useState(false), onlyHot = s4[0], setOnlyHot = s4[1], s5 = useState(14), days = s5[0], setDays = s5[1], s6 = useState(''), err = s6[0], setErr = s6[1];
    async function add() {
      if (!q.trim()) return; setBusy('Tìm kênh…'); setErr('');
      try { var c = await Y.resolveChannel(q); var ok = store.addChannel({ id: c.id, title: c.snippet.title, subs: c.statistics.hiddenSubscriberCount ? 0 : +c.statistics.subscriberCount, videoCount: +c.statistics.videoCount, viewCount: +c.statistics.viewCount, avatar: ((c.snippet.thumbnails || {}).default || {}).url || '', country: c.snippet.country || '' }); K.toast(ok ? 'Đã theo dõi ' + c.snippet.title : 'Kênh đã có trong danh sách'); setQ(''); }
      catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    useEffect(function () { return Y.on('feed', function () { setFeed(st.json('yt4_feed', { at: 0, items: [] })); }); }, []);
    async function refresh() {
      if (!chans.length) return; setErr('');
      try { var f = await refreshFeed(setBusy); setFeed(f); K.toast('Đã cập nhật ' + chans.length + ' kênh, ' + f.items.length + ' video trong 45 ngày'); }
      catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    var items = feed.items.filter(function (v) { return Date.now() - v.t <= days * 864e5 && (!onlyHot || (v.rel || 0) >= 2) && chans.some(function (c) { return c.id === v.channelId; }); });
    var chCols = [
      { k: 'title', t: 'Kênh', v: function (c) { return c.title; }, r: function (c) { return h('div', { className: 'flex items-center gap-2' }, c.avatar && h('img', { src: c.avatar, className: 'w-6 h-6 rounded-md grayscale-[30%]' }), h('button', { onClick: function () { p.analyze(c.id); }, className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 cursor-pointer text-left' }, c.title)); } },
      { k: 'subs', t: 'Sub', right: true, v: function (c) { return c.subs || 0; }, r: function (c) { return N(c.subs); } },
      { k: 'grow', t: 'Tăng từ lần trước', right: true, v: function (c) { return c.prevSubs ? c.subs - c.prevSubs : 0; }, r: function (c) { if (!c.prevSubs || !c.prevAt) return '–'; var d = c.subs - c.prevSubs; return (d > 0 ? '+' : '') + N(d) + ' / ' + Math.max(1, Math.round((c.checkedAt - c.prevAt) / 864e5)) + ' ngày'; } },
      { k: 'med', t: 'View trung vị (20 video)', right: true, v: function (c) { return c.med || 0; }, r: function (c) { return c.med ? N(c.med) : '–'; } },
      { k: 'videoCount', t: 'Video', right: true, v: function (c) { return c.videoCount || 0; }, r: function (c) { return N(c.videoCount); } },
      { k: 'last', t: 'Đăng gần nhất', right: true, v: function (c) { return c.lastUpload || 0; }, r: function (c) { return c.lastUpload ? U.ago(c.lastUpload) + ' trước' : '–'; } },
      { k: 'a', t: '', r: function (c) { return h('div', { className: 'flex gap-1 justify-end' }, h(Btn, { small: true, onClick: function () { p.analyze(c.id); } }, 'Phân tích'), h(Btn, { small: true, onClick: function () { if (window.confirm('Bỏ theo dõi ' + c.title + '?')) store.removeChannel(c.id); } }, 'Bỏ')); } }
    ];
    var feedCols = [
      { k: 'th', t: '', r: function (v) { return h(Thumb, { id: v.id, className: 'w-28' }); } },
      { k: 'title', t: 'Video', cls: 'min-w-[260px]', v: function (v) { return v.title; }, r: function (v) { return h('div', null, h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 line-clamp-2' }, v.title), h('div', { className: 'text-[11px] text-zinc-400' }, v.channel)); } },
      { k: 'views', t: 'View', right: true, v: function (v) { return v.views; }, r: function (v) { return N(v.views); } },
      { k: 'rel', t: 'So với trung vị kênh', right: true, v: function (v) { return v.rel || 0; }, r: function (v) { return v.rel == null ? '–' : h('span', { className: v.rel >= 2 ? 'text-emerald-300' : 'text-zinc-400' }, '×' + v.rel.toFixed(1)); } },
      { k: 'dur', t: 'Dài', right: true, v: function (v) { return v.dur; }, r: function (v) { return U.dur(v.dur); } },
      { k: 't', t: 'Đăng', right: true, v: function (v) { return v.t; }, r: function (v) { return U.ago(v.t) + ' trước'; } },
      { k: 'a', t: '', r: function (v) { var sv = store.isSaved(v.id); return h(Btn, { small: true, on: sv, onClick: function () { store.toggleSave(v); } }, sv ? 'Đã lưu' : 'Lưu'); } }
    ];
    // ----- Dream 100: bảng theo dõi kênh theo dự án, có tăng trưởng giữa các lần cập nhật -----
    var g0 = useState(''), grp = g0[0], setGrp = g0[1], g1 = useState(function () { return st.json('yt4_groups', []); }), groups0 = g1[0], setGroups0 = g1[1];
    var groups = groups0.slice(); chans.forEach(function (c) { if (c.group && groups.indexOf(c.group) < 0) groups.push(c.group); });
    function addGroup() { var n = (window.prompt('Tên dự án mới (ví dụ: Bóng đá Anh, Vụ án Nhật):') || '').trim().slice(0, 40); if (!n) return; if (groups.indexOf(n) < 0) { var a = groups0.concat([n]); setGroups0(a); st.put('yt4_groups', a); } setGrp(n); }
    function growth(c, days) { var hs = c.hist || []; if (hs.length < 2) return null; var last = hs[hs.length - 1], base = null; for (var i = hs.length - 2; i >= 0; i--) { base = hs[i]; if (last[0] - hs[i][0] >= days) break; } return base ? { subs: last[1] - base[1], views: last[2] - base[2], days: last[0] - base[0] } : null; }
    var dRows = chans.filter(function (c) { return !grp || (grp === '_none' ? !c.group : c.group === grp); });
    var sum30 = dRows.reduce(function (a, c) { return a + (c.v30 || 0); }, 0);
    function exportDream(json) {
      if (json) return U.download('dream-100-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify({ app: 'youtrend', kind: 'dream100', at: Date.now(), groups: groups, channels: dRows }, null, 2)], { type: 'application/json' }));
      U.csv('dream-100', [['Kênh', 'Link', 'Dự án', 'Sub', 'Tổng view', 'View/tháng', 'Tổng video', 'Video/tháng', 'Nước', 'Ghi chú']].concat(dRows.map(function (c) { return [c.title, 'https://www.youtube.com/channel/' + c.id, c.group || '', c.subs || 0, c.viewCount || 0, c.v30 || 0, c.videoCount || 0, c.n30 || 0, c.country || '', c.note || '']; })));
    }
    function importDream(e) {
      var file = e.target.files && e.target.files[0]; if (!file) return; var rd = new FileReader();
      rd.onload = function () { try { var j = JSON.parse(rd.result), list = Array.isArray(j) ? j : j.channels || [], n = 0; list.forEach(function (c) { if (c && c.id && /^UC[\w-]{22}$/.test(c.id) && store.addChannel({ id: c.id, title: String(c.title || c.id).slice(0, 120), subs: +c.subs || 0, videoCount: +c.videoCount || 0, viewCount: +c.viewCount || 0, avatar: c.avatar || '', country: c.country || '', group: c.group || '', note: c.note || '' })) n++; }); K.toast('Đã nạp ' + n + ' kênh mới. Bấm Cập nhật tất cả để lấy số liệu.'); } catch (x) { K.toast('File JSON không đúng định dạng.'); } };
      rd.readAsText(file); e.target.value = '';
    }
    var cellBtn = 'inline-flex items-center justify-center h-[2.1em] px-[0.9em] rounded-full bg-[#323232] hover:bg-[#424242] text-[0.92em] font-medium text-[#f1f1f1] whitespace-nowrap cursor-pointer';
    var up = function (n) { return n == null ? h('span', { className: 'text-[#717171]' }, '–') : h('span', { className: n > 0 ? 'text-[#6fcf85]' : n < 0 ? 'text-[#ff8a83]' : 'text-[#aaa]' }, (n > 0 ? '+' : '') + N(n)); };
    var dCols = [
      { k: 'title', t: 'Tên kênh', w: 'min-w-[200px] max-w-[280px]', v: function (c) { return String(c.title || '').toLowerCase(); }, r: function (c) { return h('div', { className: 'flex items-center gap-2 min-w-0' }, c.avatar ? h('img', { src: c.avatar, alt: '', className: 'w-7 h-7 rounded-full shrink-0' }) : h('span', { className: 'w-7 h-7 rounded-full bg-[#323232] shrink-0' }), h('div', { className: 'min-w-0' }, h('button', { onClick: function () { p.analyze(c.id); }, title: 'Phân tích kênh này', className: 'block max-w-full text-left font-semibold text-[#7cc3ff] hover:text-white truncate cursor-pointer' }, c.title), h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', className: 'text-[0.86em] text-[#aaa] hover:text-white' }, 'Mở trên YouTube'))); } },
      { k: 'group', t: 'Dự án', v: function (c) { return c.group || '~'; }, r: function (c) { return h('select', { value: c.group || '', 'aria-label': 'Dự án của kênh', onChange: function (e) { store.updateChannel(c.id, { group: e.target.value }); }, className: 'h-[2.1em] max-w-[150px] bg-[#181818] border border-[#303030] rounded-md px-1.5 text-[0.95em] text-[#f1f1f1] cursor-pointer' }, [h('option', { key: '', value: '' }, 'Chưa xếp')].concat(groups.map(function (g) { return h('option', { key: g, value: g }, g); }))); } },
      { k: 'subs', t: 'Tổng sub', right: true, tone: 'y', v: function (c) { return c.subs || 0; }, r: function (c) { return N(c.subs); } },
      { k: 'g7', t: 'Sub tăng', right: true, v: function (c) { var g = growth(c, 7); return g ? g.subs : -1e15; }, r: function (c) { var g = growth(c, 7); return g ? h('span', { title: 'So với ' + g.days + ' ngày trước' }, up(g.subs), h('span', { className: 'text-[#717171]' }, ' /' + g.days + 'ng')) : up(null); } },
      { k: 'viewCount', t: 'Tổng view', right: true, v: function (c) { return c.viewCount || 0; }, r: function (c) { return N(c.viewCount); } },
      { k: 'v30', t: 'View/tháng', right: true, tone: 'g', v: function (c) { return c.v30 || 0; }, r: function (c) { return c.v30 != null ? N(c.v30) : '–'; } },
      { k: 'videoCount', t: 'Tổng video', right: true, v: function (c) { return c.videoCount || 0; }, r: function (c) { return N(c.videoCount); } },
      { k: 'n30', t: 'Video/tháng', right: true, v: function (c) { return c.n30 || 0; }, r: function (c) { return c.n30 != null ? c.n30 + (c.n30cap ? '+' : '') : '–'; } },
      { k: 'med', t: 'View trung vị', right: true, off: true, v: function (c) { return c.med || 0; }, r: function (c) { return c.med ? N(c.med) : '–'; } },
      { k: 'country', t: 'Nước', v: function (c) { return c.country || '~'; }, r: function (c) { return c.country || '–'; } },
      { k: 'last', t: 'Đăng gần nhất', right: true, v: function (c) { return c.lastUpload || 0; }, r: function (c) { return c.lastUpload ? U.ago(c.lastUpload) + ' trước' : '–'; } },
      { k: 'note', t: 'Ghi chú', w: 'min-w-[180px]', r: function (c) { return h('input', { key: c.id + (c.note || ''), defaultValue: c.note || '', placeholder: 'Ghi chú…', 'aria-label': 'Ghi chú cho kênh', onBlur: function (e) { if (e.target.value !== (c.note || '')) store.updateChannel(c.id, { note: e.target.value.slice(0, 200) }); }, className: 'w-full h-[2.1em] bg-transparent border border-transparent hover:border-[#303030] focus:border-[#3ea6ff] rounded-md px-1.5 text-[#f1f1f1] placeholder:text-[#555]' }); } },
      { k: 'a', t: 'Thao tác', r: function (c) { return h('span', { className: 'inline-flex gap-1' }, h('button', { onClick: function () { p.analyze(c.id); }, className: cellBtn }, 'Phân tích'), h('button', { onClick: function () { store.addCompare({ id: c.id, title: c.title }); K.toast('Đã thêm vào So sánh'); }, className: cellBtn }, 'So sánh'), h('button', { onClick: function () { if (window.confirm('Bỏ theo dõi ' + c.title + '?')) store.removeChannel(c.id); }, className: cellBtn + ' !text-[#ff8a83]' }, 'Bỏ')); } }
    ];
    var gchip = function (id, label, n) { return h('button', { key: id || 'all', onClick: function () { setGrp(id); }, 'aria-pressed': grp === id, className: cx('h-8 px-3 rounded-lg text-[11.5px] font-medium cursor-pointer whitespace-nowrap', grp === id ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3a3a3a]') }, label + ' ', h('span', { className: 'opacity-60 tabular-nums' }, n)); };
    var dream = function () {
      return h('div', { className: 'space-y-3' },
        h('div', { className: 'flex flex-wrap items-center gap-1.5' }, gchip('', 'Tất cả', chans.length), groups.map(function (g) { return gchip(g, g, chans.filter(function (c) { return c.group === g; }).length); }), chans.some(function (c) { return !c.group; }) && groups.length > 0 && gchip('_none', 'Chưa xếp', chans.filter(function (c) { return !c.group; }).length),
          h('button', { onClick: addGroup, className: 'h-8 px-3 rounded-lg text-[11.5px] font-semibold bg-[#1d3a2a] text-[#9fe0ad] hover:bg-[#25492f] cursor-pointer' }, '+ Thêm dự án')),
        h('div', { className: 'grid gap-3 grid-cols-2 lg:grid-cols-4' }, [[dRows.length, 'kênh trong danh sách', 'text-[#7cc3ff]'], [N(sum30), 'tổng view/tháng (video đăng 30 ngày)', 'text-[#6fcf85]'], [dRows.filter(function (c) { return c.subs >= 20000 && c.subs < 1e6; }).length, 'kênh 20K → 1M sub', 'text-[#f5c451]'], [dRows.filter(function (c) { return c.subs >= 1000 && c.subs < 20000; }).length, 'kênh 1K → 20K sub', 'text-[#c9a7ff]']].map(function (x) { return h('div', { key: x[1], className: 'yt-card px-4 py-3' }, h('div', { className: cx('text-[19px] font-bold tabular-nums', x[2]) }, x[0]), h('div', { className: 'text-[11px] text-[#aaa]' }, x[1])); })),
        h(K.Grid, { storeKey: 'dream', cols: dCols, rows: dRows, rowKey: function (c) { return c.id; }, thumbs: false, sort: { k: 'v30', d: -1 }, empty: 'Dự án này chưa có kênh nào. Chọn dự án ở cột "Dự án" của từng kênh.',
          left: h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('button', { onClick: function () { exportDream(false); }, className: 'h-7 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, 'Xuất CSV'),
            h('button', { onClick: function () { exportDream(true); }, className: 'h-7 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, 'Xuất JSON'),
            h('label', { className: 'h-7 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer inline-flex items-center' }, 'Nạp JSON', h('input', { type: 'file', accept: 'application/json,.json', onChange: importDream, className: 'hidden' })),
            h('span', { className: 'text-[11px] text-[#aaa]' }, 'Cột "Sub tăng" có số sau lần Cập nhật thứ hai trở đi.')) }));
    };
    return h('div', { className: 'space-y-4' },
      h('div', { className: cx(K.C.card, 'p-4 flex flex-col md:flex-row gap-2') },
        h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') add(); }, placeholder: 'Thêm kênh: link, @handle, ID hoặc link video', className: 'md:flex-1' }),
        h(Btn, { onClick: add, disabled: !!busy }, 'Thêm kênh'),
        h(Btn, { primary: true, onClick: refresh, disabled: !!busy || !chans.length }, 'Cập nhật tất cả'),
        h('span', { className: 'text-[11px] text-zinc-500 self-center' }, '≈' + (chans.length * 2 + 1) + ' quota')),
      busy && h(Busy, null, busy), err && h(Note, { error: true }, err),
      !chans.length ? h(Empty, { title: 'Chưa theo dõi kênh nào', sub: 'Thêm kênh đối thủ để xem video mới của họ, video nào đang vượt trung vị kênh và sub tăng bao nhiêu giữa các lần cập nhật.' }) : h(Frag, null,
        h('div', { className: 'flex flex-wrap items-center gap-3' }, h(Seg, { value: view, onChange: setView, options: [['feed', 'Video mới'], ['list', 'Dream 100 (' + chans.length + ' kênh)']] }),
          view === 'feed' && h(Seg, { value: days, onChange: function (v) { setDays(+v); }, options: [[3, '3 ngày'], [7, '7 ngày'], [14, '14 ngày'], [45, '45 ngày']] }),
          view === 'feed' && h('label', { className: 'flex items-center gap-2 text-[10.5px] text-zinc-400 cursor-pointer' }, h('input', { type: 'checkbox', checked: onlyHot, onChange: function () { setOnlyHot(!onlyHot); }, className: 'accent-white' }), 'Chỉ video vượt trung vị ×2'),
          h('span', { className: 'flex-1' }), feed.at ? h('span', { className: 'text-[11px] text-zinc-500' }, 'Cập nhật ' + U.ago(feed.at) + ' trước') : null),
        view === 'list' ? (K.Grid ? dream() : h(Table, { cols: chCols, rows: chans, rowKey: function (c) { return c.id; } }))
          : !feed.at ? h(Empty, { title: 'Bấm "Cập nhật tất cả" để lấy video mới', sub: 'Mỗi kênh tốn khoảng 2 quota.' })
            : h(K.VideoList, { rows: items, cols: feedCols, ratio: function (v) { return v.rel; }, ratioLabel: 'So với TB kênh', hotAt: 2, defSort: 't', onChannel: p.analyze, sorts: [['t', 'Mới nhất', function (v) { return v.t; }], ['rel', 'Vượt trung vị kênh', function (v) { return v.rel || 0; }], ['views', 'View cao nhất', function (v) { return v.views; }]] })));
  }

  var SUBS = ['track', 'lab', 'compare', 'spy', 'studio'];
  function Channels(p) {
    var s = useState((p.params && p.params.analyze) ? 'lab' : (p.params && SUBS.indexOf(p.params.sub) >= 0 ? p.params.sub : 'track')), sub = s[0], setSub = s[1];
    var s1 = useState({ target: p.params && p.params.analyze, key: p.params && p.params._k, tab: p.params && p.params.tab }), tg = s1[0], setTg = s1[1];
    K.useBus('compare');
    useEffect(function () { if (p.params && p.params.analyze) { setSub('lab'); setTg({ target: p.params.analyze, key: p.params._k, tab: p.params.tab }); } else if (p.params && SUBS.indexOf(p.params.sub) >= 0) setSub(p.params.sub); }, [p.params && p.params._k]);
    function analyze(id) { setSub('lab'); setTg({ target: id, key: Date.now() }); }
    var key = Y.keys.getActiveKey();
    return h('div', { className: 'space-y-5' },
      h('div', null, h('h1', { className: 'font-display text-[25px] leading-9 font-bold text-white tracking-tight' }, 'Kênh'), h('p', { className: 'text-[13.5px] text-[#d0d0d0] mt-1 leading-relaxed' }, 'Theo dõi đối thủ, phân tích và bóc hồ sơ clone một kênh, so sánh nhiều kênh, truy vết kênh ẩn danh và soi số liệu một video.')),
      h(K.Help, { id: 'channels', title: 'Cách dùng mục Kênh', steps: ['Theo dõi: dán link kênh hoặc @handle để thêm đối thủ, bấm Cập nhật tất cả để xem video mới nhất của họ.', 'Video có nhãn ×2 trở lên là đang vượt mức trung bình của chính kênh đó: đây là chủ đề đáng làm theo.', 'Phân tích kênh: dán link một kênh bất kỳ để xem kênh có ra view đều không, đăng giờ nào, tiêu đề kiểu gì thì thắng.', 'Truy vết kênh ẩn: tải ảnh chụp YouTube Studio của người khác để đoán ra kênh. Soi video: xem số liệu chi tiết một video.'], terms: [['So với trung vị kênh', 'view của video chia cho view thường gặp của kênh; ×1 là bình thường'], ['Đà tăng', '10 video mới nhất so với 10 video trước đó; lớn hơn 1 là kênh đang lên']] }),
      h(Tabs, { value: sub, onChange: setSub, items: [['track', 'Theo dõi', store.channels().length], ['lab', 'Phân tích & clone kênh'], ['compare', 'So sánh', store.compare().length || null], ['spy', 'Truy vết kênh ẩn'], ['studio', 'Soi video']] }),
      sub === 'track' ? h(Tracking, { analyze: analyze, goto: p.goto })
        : sub === 'lab' ? h(ChannelLab, { goto: p.goto, target: tg.target, targetKey: tg.key, tab: tg.tab })
          : sub === 'compare' ? (window.YT4Clone ? h(window.YT4Clone.Compare, { goto: p.goto, analyze: analyze }) : h(K.Missing, { name: 'So sánh kênh', file: 'page_clone.js' }))
          : sub === 'spy' ? (window.SpyToolSectionV3 ? h(K.Mono, null, h(window.SpyToolSectionV3, { apiKey: key, isUltraPro: true, onUpgradePrompt: function () { }, showToast: K.toast, onAddCompetitor: async function (title) { try { var c = await Y.resolveChannel(title); K.followChannel(c.id, c.snippet.title); } catch (e) { K.toast(U.errMsg(e)); } } })) : h(K.Missing, { name: 'Truy vết kênh', file: 'spy_v3_bundle.js' }))
            : (window.StudioChartSection ? h(K.Mono, null, h(window.StudioChartSection, { apiKey: key, showToast: K.toast })) : h(K.Missing, { name: 'Soi video', file: 'studio_chart_bundle.js' })));
  }
  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.channels = Channels;
  window.YT4Channels = { analyzeChannel: analyzeChannel, refreshFeed: refreshFeed };
})();
