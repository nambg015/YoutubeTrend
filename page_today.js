// =========================================================================
// YOUTREND v5 — HÔM NAY (page_today.js)
// Trang mở đầu: video đang nổ từ kênh theo dõi (cảnh báo), ngách và kênh farm mới trong kho Top Ngách,
// việc đang làm dở, lối tắt tới các công cụ.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Input = K.Input, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Section = K.Section;
  var DAY = 864e5, HOUR = 36e5;
  var STATUS = { todo: ['Ý tưởng', 'bg-[#272727] text-cham-200'], scripting: ['Kịch bản', 'bg-[#3ea6ff]/15 text-[#7cc3ff]'], editing: ['Dựng', 'bg-[#f2b52c]/15 text-[#f5c451]'], published: ['Đã đăng', 'bg-[#2ba640]/20 text-[#6fcf85]'] };
  var KIND = { clone: 'Clone kênh', niche: 'Phân tích ngách', compare: 'So sánh kênh', titles: 'Tiêu đề', note: 'Ghi chú' };
  var fx = function (x) { return x == null ? '' : '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); };

  // Số video nổ mới (vượt trung vị kênh ×2) kể từ lần xem trang Hôm nay gần nhất: dùng cho chấm đỏ trên menu
  function hotItems(days) { var f = st.json('yt4_feed', { at: 0, items: [] }), now = Date.now(), ids = {}; store.channels().forEach(function (c) { ids[c.id] = 1; }); return (f.items || []).filter(function (v) { return ids[v.channelId] && now - v.t <= (days || 7) * DAY && (v.rel || 0) >= 2; }); }
  function unseenCount() { var seen = +st.get('yt4_alert_seen') || 0; return hotItems(7).filter(function (v) { return v.t > seen; }).length; }

  function Today(p) {
    K.useBus('channels'); K.useBus('ideas'); K.useBus('saved'); K.useBus('briefs'); K.useBus('projects'); K.useBus('keys'); K.useBus('quota'); K.useBus('feed');
    var s0 = useState(''), busy = s0[0], setBusy = s0[1], s1 = useState(''), err = s1[0], setErr = s1[1], s2 = useState(null), TN = s2[0], setTN = s2[1], s3 = useState(''), q = s3[0], setQ = s3[1];
    var s4 = useState(st.get('yt4_auto_feed') !== '0'), auto = s4[0], setAuto = s4[1], s5 = useState(null), sessions = s5[0], setSessions = s5[1];
    var s6 = useState(function () { return +st.get('yt4_alert_seen') || 0; }), seenAt = s6[0];
    var chans = store.channels(), feed = st.json('yt4_feed', { at: 0, items: [] }), keys = Y.keys.stats(), ideas = store.ideas(), briefs = store.briefs();

    async function refresh() {
      if (busy || !chans.length) return; setErr('');
      try { await window.YT4Channels.refreshFeed(setBusy); } catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    useEffect(function () {
      // đánh dấu đã xem cảnh báo (chấm đỏ trên menu tắt sau khi mở trang)
      var t = setTimeout(function () { st.set('yt4_alert_seen', String(Date.now())); Y.emit('alerts'); }, 1500);
      if (window.TopNgachData) window.TopNgachData.load().then(setTN).catch(function () { setTN({ store: null }); }); else setTN({ store: null });
      if (window.ResourceStore) window.ResourceStore.list().then(setSessions).catch(function () { setSessions([]); }); else setSessions([]);
      // tự cập nhật kênh theo dõi nếu dữ liệu cũ hơn 12 giờ (≈2 quota/kênh)
      if (auto && chans.length && keys.ok && Date.now() - (feed.at || 0) > 12 * HOUR) refresh();
      return function () { clearTimeout(t); };
    }, []);

    var hot = useMemo(function () { return hotItems(7).sort(function (a, b) { return (b.t > seenAt) - (a.t > seenAt) || (b.rel || 0) - (a.rel || 0); }); }, [feed.at, chans.length, seenAt]);
    var fresh = hot.filter(function (v) { return v.t > seenAt; }).length;
    var D = useMemo(function () {
      if (!TN || !TN.store || !window.TopNgachEngine) return null;
      var uf = window.TopNgachData.filters() || {}, f = Object.assign({}, window.TopNgachData.DEF, { mode: uf.mode || 'rpm', fmt: uf.fmt || 'long', maxSub: uf.maxSub || 5000 }, { verdict: 'good', cSort: 'score', hours: 168 }), marks = window.TopNgachData.marks();
      Object.keys(marks).forEach(function (id) { if (marks[id].h) delete TN.store.channels[id]; });
      var d = window.TopNgachEngine.build(TN.store, f, Date.now());
      d.f = f; d.total = Object.keys(TN.store.channels).length; d.at = Math.max(TN.store.at || 0, TN.daily ? TN.daily.at || 0 : 0);
      d.newFarm = d.allChannels.filter(function (c) { return c.a.v === 'farm' || c.a.v === 'rise'; }).sort(function (a, b) { return (b.isNew - a.isNew) || (b.fs || 0) - (a.fs || 0) || b.a.score - a.a.score; }).slice(0, 8);
      d.topN = d.niches.slice().sort(function (a, b) { return (b.medOut - a.medOut) || (b.score - a.score); }).slice(0, 6);
      return d;
    }, [TN]);

    function go() { var v = q.trim(); if (!v) return; if (/youtu\.?be|^@|^UC[\w-]{22}$/.test(v)) p.goto('channels', { analyze: v }); else p.goto('explore', { q: v }); }
    var open = ideas.filter(function (x) { return x.status !== 'published'; });
    var kpi = function (val, lbl, tone, fn) { return h('button', { onClick: fn, className: 'bg-[#212121] px-4 py-3 min-w-0 text-left hover:bg-[#2a2a2a] transition cursor-pointer' }, h('div', { className: cx('text-[18px] leading-7 font-bold tabular-nums tracking-tight', tone || 'text-cham-50') }, val), h('div', { className: 'text-[11px] text-cham-400 leading-tight' }, lbl)); };
    var d = new Date(), hello = d.getHours() < 11 ? 'Chào buổi sáng' : d.getHours() < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    var link = 'text-[11.5px] text-[#7cc3ff] hover:text-[#b0daff] cursor-pointer';

    var alerts = h(Section, {
      title: 'Video đang nổ từ kênh bạn theo dõi' + (fresh ? ' · ' + fresh + ' mới' : ''), sub: 'Video 7 ngày qua có view từ ×2 trung vị của chính kênh đó: chủ đề đáng làm theo ngay',
      right: h('div', { className: 'flex flex-wrap items-center gap-2 justify-end' },
        feed.at ? h('span', { className: 'text-[11px] text-cham-400' }, 'Cập nhật ' + U.ago(feed.at) + ' trước') : null,
        h('label', { className: 'flex items-center gap-1.5 text-[11px] text-cham-300 cursor-pointer', title: 'Khi mở trang Hôm nay, nếu dữ liệu cũ hơn 12 giờ thì tự cập nhật. Tốn khoảng 2 quota mỗi kênh.' }, h('input', { type: 'checkbox', checked: auto, onChange: function () { var n = !auto; setAuto(n); st.set('yt4_auto_feed', n ? '1' : '0'); } }), 'Tự cập nhật'),
        h(Btn, { small: true, onClick: refresh, disabled: !!busy || !chans.length }, busy ? 'Đang cập nhật…' : 'Cập nhật (≈' + (chans.length * 2 + 1) + ' quota)'))
    },
      busy && h('div', { className: 'mb-3' }, h(Busy, null, busy)), err && h(Note, { error: true, className: 'mb-3' }, err),
      !chans.length ? h(Empty, { title: 'Chưa theo dõi kênh nào', sub: 'Thêm vài kênh đối thủ. Mỗi lần mở web, bạn sẽ thấy ngay video nào của họ đang vượt mức thường.' }, h(Btn, { primary: true, onClick: function () { p.goto('channels', { sub: 'track' }); } }, 'Thêm kênh theo dõi'))
        : !feed.at ? h(Empty, { title: 'Chưa có dữ liệu video', sub: 'Bấm Cập nhật để lấy video mới của ' + chans.length + ' kênh đang theo dõi.' })
          : !hot.length ? h('p', { className: 'text-[12px] text-cham-300 py-2' }, 'Chưa có video nào vượt ×2 trung vị kênh trong 7 ngày qua. ', h('button', { onClick: function () { p.goto('channels', { sub: 'track' }); }, className: link }, 'Xem tất cả video mới'))
            : h(Frag, null,
              h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(210px,1fr))]' }, hot.slice(0, 10).map(function (v) {
                var isNew = v.t > seenAt, sv = store.isSaved(v.id);
                return h('article', { key: v.id, className: 'flex flex-col gap-2 rounded-xl bg-[#181818] p-2' },
                  h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'relative block rounded-lg overflow-hidden bg-black' },
                    h('img', { src: U.thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
                    isNew && h('span', { className: 'absolute top-1.5 left-1.5 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ff4e45] text-white' }, 'Mới'),
                    h('span', { className: cx('absolute top-1.5 right-1.5 text-[10.5px] font-bold px-1.5 py-0.5 rounded-md tabular-nums', v.rel >= 5 ? 'bg-[#ff4e45] text-white' : 'bg-[#f5c451] text-[#2a1d00]'), title: 'So với view trung vị của kênh' }, fx(v.rel)),
                    v.dur > 0 && h('span', { className: 'absolute bottom-1.5 right-1.5 text-[10.5px] px-1.5 py-0.5 rounded-md bg-black/80 text-cham-50 tabular-nums' }, U.dur(v.dur))),
                  h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'text-[11.5px] font-medium text-cham-50 leading-snug line-clamp-2 hover:text-white px-0.5' }, v.title),
                  h('button', { onClick: function () { p.goto('channels', { analyze: v.channelId }); }, className: 'text-left text-[11px] text-cham-300 hover:text-[#7cc3ff] truncate cursor-pointer px-0.5' }, v.channel),
                  h('div', { className: 'flex items-center justify-between gap-2 text-[11px] text-cham-400 tabular-nums px-0.5 mt-auto' }, h('span', null, N(v.views) + ' view · ' + U.ago(v.t) + ' trước'),
                    h('span', { className: 'inline-flex gap-1' }, h(Btn, { small: true, on: sv, onClick: function () { store.toggleSave(v); } }, sv ? 'Đã lưu' : 'Lưu'), h(Btn, { small: true, title: 'Tìm video cùng chủ đề', onClick: function () { p.goto('explore', { q: v.title }); } }, 'Tương tự'))));
              })),
              hot.length > 10 && h('div', { className: 'pt-3' }, h('button', { onClick: function () { p.goto('channels', { sub: 'track' }); }, className: link }, 'Xem cả ' + hot.length + ' video đang nổ'))));

    var niche = h(Section, { title: 'Ngách view cao, sub thấp trong kho Top Ngách', sub: D ? N(D.total) + ' kênh nhỏ trong kho' + (D.at ? ' · quét gần nhất ' + U.ago(D.at) + ' trước' : '') : '', right: h(Btn, { small: true, onClick: function () { p.goto('niche'); } }, 'Mở Top Ngách') },
      !TN ? h(Busy, null, 'Đang mở kho Top Ngách…') : !D || !D.total ? h(Empty, { title: 'Kho Top Ngách đang trống', sub: 'Quét lần đầu để web tìm kênh nhỏ đang ra view vượt sub.' }, h(Btn, { primary: true, onClick: function () { p.goto('niche'); } }, 'Tới Top Ngách để quét'))
        : !D.topN.length ? h('p', { className: 'text-[12px] text-cham-300' }, 'Chưa có ngách nào qua bộ lọc đang lưu. Mở Top Ngách để nới bộ lọc hoặc quét thêm.')
          : h('div', { className: 'grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3' }, D.topN.map(function (g) {
            var th = []; g.chans.forEach(function (c) { (c.vids || []).forEach(function (v) { th.push(v); }); }); th.sort(function (a, b) { return b.out - a.out; });
            return h('button', { key: g.name, onClick: function () { p.goto('niche'); }, className: 'text-left rounded-xl bg-[#181818] hover:bg-[#242424] p-3 transition cursor-pointer space-y-2' },
              h('div', { className: 'flex items-start justify-between gap-2' }, h('div', { className: 'min-w-0' }, h('div', { className: 'text-[12.5px] font-semibold text-cham-50 truncate' }, g.name), h('div', { className: 'text-[11px] text-cham-400 tabular-nums' }, g.chans.length + ' kênh nhỏ · ' + g.farm + ' farm · view÷sub ' + fx(g.medOut))),
                g.fresh > 0 && h('span', { className: 'shrink-0 text-[10.5px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ff4e45] text-white' }, '+' + g.fresh + ' mới')),
              th.length > 0 && h('div', { className: 'grid grid-cols-3 gap-1.5' }, th.slice(0, 3).map(function (v) { return h('div', { key: v.id, className: 'relative rounded-md overflow-hidden bg-black' }, h('img', { src: U.thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }), h('span', { className: cx('absolute top-1 right-1 text-[10px] font-bold px-1 rounded tabular-nums', v.out >= 20 ? 'bg-[#ff4e45] text-white' : 'bg-[#f5c451] text-[#2a1d00]') }, '×' + Math.round(v.out))); })));
          })));

    var farm = D && D.newFarm.length > 0 && h(Section, { title: 'Kênh nhỏ đang làm được, mới phát hiện trước', sub: 'Bấm tên kênh để phân tích, Clone để bóc hồ sơ làm theo' },
      h('div', { className: 'divide-y divide-cham-800/70' }, D.newFarm.map(function (c) {
        return h('div', { key: c.id, className: 'py-2 flex items-center gap-3' },
          c.best ? h('img', { src: U.thumb(c.best.id), loading: 'lazy', alt: '', className: 'w-20 aspect-video object-cover rounded-md bg-black shrink-0' }) : h('span', { className: 'w-20 aspect-video rounded-md bg-[#181818] shrink-0' }),
          h('div', { className: 'min-w-0 flex-1' },
            h('div', { className: 'flex items-center gap-1.5' }, c.isNew && h('span', { className: 'text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#ff4e45] text-white' }, 'Mới'), h('button', { onClick: function () { p.goto('channels', { analyze: c.id }); }, className: 'text-left text-[12px] font-medium text-cham-50 hover:text-[#7cc3ff] truncate cursor-pointer' }, c.name)),
            h('div', { className: 'text-[11px] text-cham-400 truncate tabular-nums' }, N(c.subs) + ' sub · ' + c.niche + (c.a.n ? ' · ' + c.a.hits + '/' + c.a.n + ' video đạt · view trung vị ' + N(c.a.med) : ''))),
          h('span', { className: cx('shrink-0 text-[11px] font-semibold px-2 py-1 rounded-md tabular-nums', c.a.v === 'farm' ? 'bg-[#2ba640]/20 text-[#6fcf85]' : 'bg-[#f2b52c]/15 text-[#f5c451]') }, (c.a.v === 'farm' ? 'Farm ' : 'Đang lên ') + c.a.score),
          h(Btn, { small: true, onClick: function () { p.goto('channels', { analyze: c.id, tab: 'clone' }); } }, 'Clone'));
      })));

    var work = h(Section, { title: 'Việc đang làm', right: h(Btn, { small: true, onClick: function () { p.goto('library', { sub: 'plan' }); } }, 'Kế hoạch video') },
      !open.length && !briefs.length && !(sessions && sessions.length) ? h('p', { className: 'text-[12px] text-cham-300' }, 'Chưa có việc nào. Ý tưởng video, bản phân tích gửi Claude và phiên tài nguyên sẽ hiện ở đây.')
        : h('div', { className: 'space-y-3' },
          open.length > 0 && h('div', { className: 'space-y-1.5' }, open.slice(0, 6).map(function (x) { var s = STATUS[x.status] || STATUS.todo; return h('button', { key: x.id, onClick: function () { p.goto('library', { sub: 'plan' }); }, className: 'w-full flex items-center gap-2.5 text-left cursor-pointer group' }, h('span', { className: 'shrink-0 w-16 text-center text-[10.5px] font-medium px-1.5 py-1 rounded-md ' + s[1] }, s[0]), h('span', { className: 'text-[12px] text-cham-100 truncate group-hover:text-white' }, x.title)); }), open.length > 6 && h('div', { className: 'text-[11px] text-cham-400' }, 'và ' + (open.length - 6) + ' ý tưởng khác')),
          briefs.length > 0 && h('div', { className: 'pt-2 border-t border-cham-800/70 space-y-1.5' }, h('div', { className: 'text-[11px] text-cham-400' }, 'Bản phân tích gửi Claude'), briefs.slice(0, 4).map(function (b) { return h('button', { key: b.id, onClick: function () { p.goto('resource', { sub: 'projects' }); }, className: 'w-full flex items-center gap-2.5 text-left cursor-pointer group' }, h('span', { className: 'shrink-0 text-[10.5px] font-medium px-1.5 py-1 rounded-md bg-[#3a2a5c] text-[#d4bbff]' }, KIND[b.kind] || 'Bản lưu'), h('span', { className: 'text-[12px] text-cham-100 truncate group-hover:text-white flex-1' }, b.title), h('span', { className: 'shrink-0 text-[11px] text-cham-500' }, b.text ? 'đã có kết quả' : 'mới có prompt')); })),
          sessions && sessions.length > 0 && h('div', { className: 'pt-2 border-t border-cham-800/70 space-y-1.5' }, h('div', { className: 'text-[11px] text-cham-400' }, 'Phiên tài nguyên gần đây'), sessions.slice(0, 3).map(function (r) { return h('button', { key: r.id, onClick: function () { p.goto('resource', { sub: 'projects' }); }, className: 'w-full flex items-center gap-2.5 text-left cursor-pointer group' }, h('span', { className: 'shrink-0 text-[11px] text-cham-500 tabular-nums w-16' }, U.date(r.at)), h('span', { className: 'text-[12px] text-cham-100 truncate group-hover:text-white' }, (r.dossier && r.dossier.title) || String(r.prompt || '').slice(0, 90))); }))));

    var TOOLS = [['Quét kênh nhỏ farm view', 'Top Ngách', '#ff4e45', function () { p.goto('niche'); }], ['Bóc hồ sơ clone một kênh', 'Kênh', '#a970ff', function () { p.goto('channels', { sub: 'lab' }); }], ['So sánh 2–4 kênh', 'Kênh', '#a970ff', function () { p.goto('channels', { sub: 'compare' }); }], ['Sinh tiêu đề theo khuôn thắng', 'Khám phá', '#3ea6ff', function () { p.goto('explore', { sub: 'titles' }); }], ['Thử thumbnail giữa đối thủ', 'Khám phá', '#3ea6ff', function () { p.goto('explore', { sub: 'thumb' }); }], ['Gom tài nguyên cho một sự kiện', 'Tài nguyên', '#f5c451', function () { p.goto('resource'); }]];
    var tools = h(Section, { title: 'Làm gì tiếp' }, h('div', { className: 'grid gap-2 sm:grid-cols-2' }, TOOLS.map(function (t) { return h('button', { key: t[0], onClick: t[3], className: 'flex items-center gap-3 text-left rounded-lg bg-[#181818] hover:bg-[#242424] px-3 py-2.5 transition cursor-pointer' }, h('span', { className: 'w-1.5 h-8 rounded-full shrink-0', style: { background: t[2] } }), h('span', { className: 'min-w-0' }, h('span', { className: 'block text-[12px] font-medium text-cham-50 truncate' }, t[0]), h('span', { className: 'block text-[11px] text-cham-400' }, t[1]))); })));

    return h('div', { className: 'space-y-5' },
      h('div', { className: 'flex flex-wrap items-end justify-between gap-4' },
        h('div', null, h('h1', { className: 'font-display text-[19px] leading-8 font-bold text-cham-50 tracking-tight' }, hello), h('p', { className: 'text-[11.5px] text-cham-400 mt-1' }, d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }) + ' · bấm Ctrl+K để tìm nhanh mọi thứ')),
        h('form', { onSubmit: function (e) { e.preventDefault(); go(); }, className: 'flex gap-2 w-full sm:w-auto' }, h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: 'Dán link kênh để phân tích, hoặc gõ từ khoá', className: 'h-9 text-[12px] sm:w-80' }), h(Btn, { primary: true, type: 'submit', disabled: !q.trim(), className: 'h-9' }, 'Đi'))),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px bg-[#303030] rounded-xl overflow-hidden' },
        kpi(fresh || hot.length, fresh ? 'video nổ mới từ kênh theo dõi' : 'video đang nổ (7 ngày)', 'text-[#ff6b63]', function () { p.goto('channels', { sub: 'track' }); }),
        kpi(chans.length, 'kênh đang theo dõi', 'text-[#c9a7ff]', function () { p.goto('channels', { sub: 'track' }); }),
        kpi(D ? N(D.stats.farm) : '–', 'kênh farm trong kho Top Ngách', 'text-[#4bc167]', function () { p.goto('niche'); }),
        kpi(D ? N(D.stats.fresh) : '–', 'kênh mới phát hiện (24 giờ)', 'text-[#5fdccf]', function () { p.goto('niche'); }),
        kpi(open.length, 'ý tưởng đang làm', 'text-[#f5c451]', function () { p.goto('library', { sub: 'plan' }); }),
        kpi(!keys.total ? 'Chưa có' : N(keys.left), !keys.total ? 'API key YouTube' : 'quota còn lại hôm nay', keys.total && !keys.ok ? 'text-[#ff8a83]' : null, function () { p.goto('settings'); })),
      alerts,
      h('div', { className: 'grid gap-5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' }, h('div', { className: 'space-y-5 min-w-0' }, niche, farm), h('div', { className: 'space-y-5 min-w-0' }, work, tools)));
  }

  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.today = Today;
  window.YT4Today = { unseenCount: unseenCount, hotItems: hotItems };
})();
