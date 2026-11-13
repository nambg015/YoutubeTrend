// =========================================================================
// YOUTREND v4 — KHUNG WEB (main.js): đăng nhập admin, thanh menu, chuyển trang
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, store = Y.store, K = window.YT4UI, cx = K.cx, P = window.YT4Pages || {};
  var Btn = K.Btn, Input = K.Input, Note = K.Note;

  var NAV = [['today', 'Hôm nay', 0, '#f1f1f1'], ['explore', 'Khám phá', 0, '#3ea6ff'], ['niche', 'Top Ngách', 0, '#ff4e45'], ['channels', 'Kênh', 0, '#a970ff'], ['resource', 'Tạo tài nguyên', 'Tài nguyên', '#f5c451'], ['tools', 'Công cụ', 0, '#22c3b5'], ['library', 'Thư viện', 0, '#4bc167'], ['settings', 'Cài đặt', 0, '#aaaaaa']];
  var OLD = { search: 'explore', keywords: 'explore', niche: 'explore', rpm: 'niche', competitors: 'channels', spy: 'channels', studio_chart: 'channels', wiki: 'library' };
  // Lộ trình 5 bước nghiên cứu một ngách. Mỗi bước là một ô vuông bo nhẹ, dùng đúng tên, biểu tượng và màu của mục bên trái mà nó mở.
  // [số, tên bước, route, tham số, mô tả ngắn]
  var FLOW = [
    [1, 'Tìm ngách', 'niche', null, 'Quét kênh nhỏ ăn view'],
    [2, 'Chân dung khán giả', 'tools', { sub: 'cm' }, 'AI đọc bình luận'],
    [3, 'Đối thủ', 'channels', { sub: 'track' }, 'Bảng Dream 100'],
    [4, 'Công thức', 'explore', { sub: 'titles' }, 'Khuôn tiêu đề thắng'],
    [5, 'Xu hướng', 'today', null, 'Video đang nổ']
  ];
  function Flow(p) {
    var cur = FLOW.findIndex(function (x) { return x[2] === p.route; });
    if (p.off) return h('div', { className: 'relative h-0' }, h('button', { onClick: p.onToggle, title: 'Hiện lại lộ trình 5 bước', className: 'absolute right-0 -top-[19px] inline-flex items-center gap-1.5 h-5 px-2.5 rounded-md bg-[#212121] border border-[#303030] text-[11.5px] font-medium text-[#c8c8c8] hover:text-white hover:border-[#555] cursor-pointer' }, h(K.Icon, { name: 'left', size: 13, stroke: 2 }), 'Hiện lộ trình 5 bước'));
    return h('nav', { 'aria-label': 'Lộ trình nghiên cứu', className: 'mb-4 flex items-stretch gap-2' },
      h('ol', { className: 'flex-1 min-w-0 grid grid-flow-col auto-cols-[minmax(200px,1fr)] gap-2 overflow-x-auto' }, FLOW.map(function (x, i) {
        var on = i === cur, nav = NAV.filter(function (n) { return n[0] === x[2]; })[0] || [x[2], x[1], 0, '#aaaaaa'], col = nav[3];
        return h('li', { key: x[0], className: 'min-w-0' },
          h('button', { onClick: function () { if (x[2] === 'channels') { try { localStorage.setItem('yt4_track_view', JSON.stringify('list')); } catch (e) { } } p.goto(x[2], x[3] || {}); }, 'aria-current': on ? 'step' : null,
            className: cx('w-full h-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition cursor-pointer', on ? 'bg-[#212121]' : 'bg-[#181818]/90 border-[#303030] hover:bg-[#212121] hover:border-[#4a4a4a]'), style: on ? { borderColor: col, boxShadow: 'inset 0 -3px 0 ' + col } : null },
            h('span', { className: 'shrink-0 w-9 h-9 rounded-md grid place-items-center text-[14px] font-bold tabular-nums', style: on ? { background: col, color: '#0f0f0f' } : { background: '#272727', color: col } }, x[0]),
            h('span', { className: 'min-w-0 flex-1' },
              h('span', { className: cx('block text-[13.5px] font-semibold leading-5 truncate', on ? 'text-white' : 'text-[#e6e6e6]') }, x[1]),
              h('span', { className: 'flex items-center gap-1.5 text-[11.5px] leading-4 text-[#aaa] min-w-0' },
                h('span', { className: 'shrink-0 inline-flex items-center gap-1 font-medium', style: { color: col } }, h(K.Icon, { name: nav[0], size: 13, stroke: 2 }), nav[1]),
                h('span', { className: 'truncate' }, '· ' + x[4])))));
      })),
      h('button', { onClick: p.onToggle, title: 'Ẩn lộ trình 5 bước', 'aria-label': 'Ẩn lộ trình 5 bước', className: 'shrink-0 w-9 rounded-lg bg-[#181818]/90 border border-[#303030] text-[#aaa] hover:text-white hover:border-[#555] grid place-items-center cursor-pointer' }, h(K.Icon, { name: 'right', size: 16, stroke: 2 })));
  }
  function readRoute() { var hsh = (location.hash || '').replace(/^#\/?/, '').split('/')[0]; if (NAV.some(function (n) { return n[0] === hsh; })) return hsh; var q = new URLSearchParams(location.search).get('tab'); return OLD[q] || 'today'; }

  // ---------- ĐĂNG NHẬP ----------
  function Mark(p) {
    var box = p.big ? 40 : 28;
    return h('span', { className: 'inline-flex items-center gap-2', 'aria-label': 'YouTrend' },
      h('span', { 'aria-hidden': true, className: 'grid place-items-center rounded-lg bg-[#1f1f1f] border border-[#3a3a3a]', style: { width: box, height: box } },
        h('svg', { width: box * 0.62, height: box * 0.62, viewBox: '0 0 24 24', fill: 'none', stroke: '#ff4e45', strokeWidth: 2.6, strokeLinecap: 'round', strokeLinejoin: 'round' }, h('path', { d: 'M3 17l6-6 4 4 8-8' }), h('path', { d: 'M15 7h6v6' }))),
      h('span', { 'aria-hidden': true, className: cx('brand leading-none whitespace-nowrap', p.big ? 'text-[32px]' : 'text-[24px]') }, h('span', { className: 'text-[#f1f1f1]' }, 'You'), h('span', { className: 'text-[#ff4e45]' }, 'Trend')));
  }
  function Login(p) {
    var s0 = useState(''), id = s0[0], setId = s0[1], s1 = useState(''), pw = s1[0], setPw = s1[1], s2 = useState(''), busy = s2[0], setBusy = s2[1], s3 = useState(p.message || ''), err = s3[0], setErr = s3[1];
    useEffect(function () { setErr(p.message || ''); }, [p.message]);
    async function go(fn) { setErr(''); setBusy(fn === 'g' ? 'g' : 'p'); try { if (fn === 'g') await Y.auth.signInGoogle(); else await Y.auth.signIn(id, pw); } catch (e) { setErr(e.message); setBusy(''); } }
    return h('div', { className: 'min-h-screen flex items-center justify-center px-4' },
      h('div', { className: 'yt-card w-full max-w-[380px] p-7' },
        h(Mark, { big: true }),
        h('p', { className: 'text-[10.5px] text-cham-300 mt-3 mb-6 leading-relaxed' }, 'Bàn làm việc riêng: săn kênh nhỏ đang farm view, gom tài nguyên, viết kịch bản.'),
        h('button', { onClick: function () { go('g'); }, disabled: !!busy, className: cx(K.C.pri, 'w-full h-9') }, busy === 'g' ? 'Đang mở Google…' : 'Đăng nhập với Google'),
        h('div', { className: 'flex items-center gap-3 my-5 text-[10.5px] text-cham-400' }, h('span', { className: 'flex-1 h-px bg-cham-800' }), 'hoặc tài khoản quản trị', h('span', { className: 'flex-1 h-px bg-cham-800' })),
        h('form', { onSubmit: function (e) { e.preventDefault(); if (id && pw) go('p'); }, className: 'space-y-2.5' },
          h(K.Field, { label: 'Tên đăng nhập' }, h(Input, { value: id, onChange: function (e) { setId(e.target.value); }, autoComplete: 'username', className: 'h-9' })),
          h(K.Field, { label: 'Mật khẩu' }, h(Input, { type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); }, autoComplete: 'current-password', className: 'h-9' })),
          h('button', { type: 'submit', disabled: !!busy || !id || !pw, className: cx(K.C.btn, 'w-full h-9 mt-1') }, busy === 'p' ? 'Đang đăng nhập…' : 'Đăng nhập')),
        err && h(Note, { error: true, className: 'mt-4' }, err),
        h('p', { className: 'mt-6 text-[10.5px] text-cham-400' }, 'Web nội bộ, chỉ tài khoản quản trị vào được.')));
  }

  // ---------- TÌM NHANH (Ctrl+K hoặc phím /) ----------
  function Palette(p) {
    var s0 = useState(''), q = s0[0], setQ = s0[1], s1 = useState(0), ix = s1[0], setIx = s1[1];
    var fold = function (x) { return String(x || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'); };
    var t = q.trim(), lc = fold(t), items = [], hit = function (x) { return !lc || fold(x).indexOf(lc) >= 0; };
    var push = function (group, label, sub, fn) { items.push({ g: group, label: label, sub: sub, fn: fn }); };
    if (t) {
      if (/youtu\.?be|^@[\w.\-]+$|^UC[\w-]{22}$/.test(t)) { push('Làm ngay', 'Phân tích kênh này', t, function () { p.goto('channels', { analyze: t }); }); push('Làm ngay', 'Bóc hồ sơ clone kênh này', t, function () { p.goto('channels', { analyze: t, tab: 'clone' }); }); }
      else { push('Làm ngay', 'Phân tích từ khoá "' + t + '"', 'Khám phá · tốn quota khi chạy', function () { p.goto('explore', { q: t }); }); push('Làm ngay', 'Viết tiêu đề theo khuôn của "' + t + '"', 'Xưởng tiêu đề', function () { p.goto('explore', { sub: 'titles', q: t }); }); push('Làm ngay', 'Tìm kênh tên "' + t + '" để phân tích', 'Kênh · 100 quota', function () { p.goto('channels', { analyze: t }); }); }
    }
    NAV.filter(function (n) { return hit(n[1]); }).forEach(function (n) { push('Mục', n[1], '', function () { p.goto(n[0]); }); });
    [['Xưởng tiêu đề', 'explore', { sub: 'titles' }], ['Thử thumbnail', 'explore', { sub: 'thumb' }], ['So sánh kênh', 'channels', { sub: 'compare' }], ['Hồ sơ clone kênh', 'channels', { sub: 'lab' }], ['Kế hoạch video', 'library', { sub: 'plan' }], ['Dự án & Claude', 'resource', { sub: 'projects' }]].filter(function (x) { return hit(x[0]); }).forEach(function (x) { push('Mục', x[0], '', function () { p.goto(x[1], x[2]); }); });
    store.channels().filter(function (c) { return hit(c.title); }).slice(0, 6).forEach(function (c) { push('Kênh theo dõi', c.title, N(c.subs) + ' sub', function () { p.goto('channels', { analyze: c.id }); }); });
    if (t) {
      store.saved().filter(function (v) { return hit(v.title) || hit(v.channel); }).slice(0, 5).forEach(function (v) { push('Video đã lưu', v.title, v.channel, function () { window.open(U.vurl(v.id), '_blank', 'noopener'); }); });
      store.ideas().filter(function (x) { return hit(x.title) || hit(x.topic); }).slice(0, 4).forEach(function (x) { push('Ý tưởng', x.title, x.topic || '', function () { p.goto('library', { sub: 'plan' }); }); });
      store.projects().filter(function (x) { return hit(x.name); }).slice(0, 4).forEach(function (x) { push('Dự án', x.name, '', function () { p.goto('resource', { sub: 'projects' }); }); });
      store.briefs().filter(function (x) { return hit(x.title); }).slice(0, 4).forEach(function (x) { push('Bản phân tích', x.title, '', function () { p.goto('resource', { sub: 'projects' }); }); });
    }
    var sel = Math.min(ix, Math.max(0, items.length - 1));
    function run(i) { var it = items[i]; if (!it) return; p.onClose(); it.fn(); }
    function key(e) { if (e.key === 'ArrowDown') { e.preventDefault(); setIx(Math.min(items.length - 1, sel + 1)); } else if (e.key === 'ArrowUp') { e.preventDefault(); setIx(Math.max(0, sel - 1)); } else if (e.key === 'Enter') { e.preventDefault(); run(sel); } else if (e.key === 'Escape') p.onClose(); }
    var last = '';
    return h('div', { className: 'fixed inset-0 z-[60] bg-black/70 flex items-start justify-center p-4 pt-[12vh]', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { role: 'dialog', 'aria-label': 'Tìm nhanh', className: 'w-full max-w-[600px] rounded-2xl bg-[#212121] border border-[#3f3f3f] shadow-[0_24px_60px_rgba(0,0,0,.6)] overflow-hidden' },
        h('div', { className: 'flex items-center gap-3 px-4 h-12 border-b border-[#303030] text-[#aaaaaa]' }, h(K.Icon, { name: 'search', size: 16 }),
          h('input', { autoFocus: true, value: q, onChange: function (e) { setQ(e.target.value); setIx(0); }, onKeyDown: key, 'aria-label': 'Tìm nhanh', placeholder: 'Gõ tên kênh, từ khoá, hoặc dán link kênh / video', style: { outline: 'none' }, className: 'flex-1 bg-transparent text-[13.5px] text-[#f1f1f1] placeholder:text-[#717171]' }),
          h('kbd', { className: 'text-[10.5px] px-1.5 py-0.5 rounded bg-[#303030] font-sans' }, 'Esc')),
        h('div', { className: 'max-h-[56vh] overflow-y-auto py-1.5' }, !items.length ? h('div', { className: 'px-4 py-6 text-[12px] text-[#aaaaaa] text-center' }, 'Không có kết quả') : items.map(function (it, i) {
          var head = it.g !== last ? h('div', { className: 'px-4 pt-2.5 pb-1 text-[10.5px] font-medium text-[#909090]' }, it.g) : null; last = it.g;
          return h(Frag, { key: i }, head, h('button', { onMouseEnter: function () { setIx(i); }, onClick: function () { run(i); }, className: cx('w-full flex items-center justify-between gap-3 px-4 h-9 text-left cursor-pointer', i === sel ? 'bg-[#3a3a3a]' : '') }, h('span', { className: 'text-[12.5px] text-[#f1f1f1] truncate' }, it.label), it.sub && h('span', { className: 'text-[11px] text-[#909090] truncate max-w-[45%]' }, it.sub)));
        })),
        h('div', { className: 'px-4 h-8 flex items-center gap-4 border-t border-[#303030] text-[10.5px] text-[#909090]' }, h('span', null, '↑ ↓ để chọn'), h('span', null, 'Enter để mở'), h('span', null, 'Phím / hoặc Ctrl K để mở lại'))));
  }

  // ---------- KHUNG ----------
  function QuotaChip(p) {
    K.useBus('keys'); K.useBus('quota');
    var S = Y.keys.stats(), tone = !S.total ? 'border-dashed border-[#3f3f3f] text-[#aaaaaa]' : !S.ok ? 'border-transparent bg-[#3a1d1d] text-[#ff8a80]' : 'border-transparent bg-[#323232] text-[#f1f1f1] hover:bg-[#424242]';
    return h('button', { onClick: p.onClick, title: 'Quota YouTube còn lại hôm nay. Bấm để quản lý API key.', className: cx('h-9 px-4 rounded-full border text-[12.5px] font-medium tabular-nums transition cursor-pointer whitespace-nowrap', tone) },
      !S.total ? 'Chưa có key' : !S.ok ? (S.susp === S.total ? 'Key bị khoá' : 'Hết quota') : h(Frag, null, h('span', { className: 'sm:hidden' }, N(S.left)), h('span', { className: 'hidden sm:inline' }, 'Quota ' + N(S.left) + ' · ' + S.ok + '/' + S.total + ' key')));
  }
  function Shell(p) {
    var w0 = useState(function () { try { return localStorage.getItem('yt4_nav_wide') === '1'; } catch (e) { return false; } }), wide = w0[0], setWide0 = w0[1], w1 = useState(false), drawer = w1[0], setDrawer = w1[1];
    function setWide(v) { setWide0(v); try { localStorage.setItem('yt4_nav_wide', v ? '1' : '0'); } catch (e) { } }
    var ls1 = function (k) { try { return localStorage.getItem(k) === '1'; } catch (e) { return false; } }, put1 = function (k, v) { try { localStorage.setItem(k, v ? '1' : '0'); } catch (e) { } };
    var w2 = useState(function () { return ls1('yt4_nav_off'); }), navOff = w2[0], setNavOff0 = w2[1], w3 = useState(function () { return ls1('yt4_flow_off'); }), flowOff = w3[0], setFlowOff0 = w3[1];
    function setNavOff(v) { setNavOff0(v); put1('yt4_nav_off', v); }
    function setFlowOff(v) { setFlowOff0(v); put1('yt4_flow_off', v); }
    var s0 = useState(readRoute()), route = s0[0], setRoute = s0[1], s1 = useState({}), params = s1[0], setParams = s1[1];
    K.useBus('keys'); K.useBus('feed'); K.useBus('alerts');
    var sp = useState(false), pal = sp[0], setPal = sp[1];
    useEffect(function () {
      var f = function (e) { var tag = (e.target && e.target.tagName) || ''; if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); setPal(function (x) { return !x; }); } else if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(tag) && !(e.target && e.target.isContentEditable)) { e.preventDefault(); setPal(true); } };
      window.addEventListener('keydown', f); return function () { window.removeEventListener('keydown', f); };
    }, []);
    useEffect(function () { var f = function () { setRoute(readRoute()); }; window.addEventListener('hashchange', f); return function () { window.removeEventListener('hashchange', f); }; }, []);
    useEffect(function () { if (location.search) history.replaceState(null, '', location.pathname + '#' + route); }, []);
    useEffect(function () { if (window.YT4Mcp) { try { window.YT4Mcp.auto(); } catch (e) { } } }, [route]);
    function goto(r, prm) { setParams(Object.assign({ _k: Date.now() }, prm || {})); if (r !== route) { location.hash = r; setRoute(r); } window.scrollTo(0, 0); }
    var key = Y.keys.getActiveKey(), noKey = !Y.keys.getPool().length;
    var common = { apiKey: key, yt: Y.yt, ytKeyManager: Y.keys, showToast: K.toast, onOpenApiModal: function () { goto('settings'); } };
    var page;
    if (route === 'today') page = P.today ? h(P.today, { goto: goto, params: params }) : h(K.Missing, { name: 'Hôm nay', file: 'page_today.js' });
    else if (route === 'explore') page = h(P.explore, { goto: goto, params: params });
    else if (route === 'channels') page = h(P.channels, { goto: goto, params: params });
    else if (route === 'library') page = h(P.library, { goto: goto, params: params });
    else if (route === 'tools') page = P.tools ? h(P.tools, { goto: goto, params: params }) : h(K.Missing, { name: 'Công cụ', file: 'page_tools.js' });
    else if (route === 'settings') page = h(P.settings, { goto: goto, me: p.me, onLogout: p.onLogout });
    else if (route === 'niche') page = window.TopNgachV3 ? h('div', { className: 'space-y-4' }, h(K.Help, { id: 'niche', title: 'Cách dùng Top Ngách', steps: ['Chọn một Bộ lọc nhanh hoặc tự chỉnh chế độ, quy mô, tuổi kênh, thời gian. Bấm Lưu bộ lọc đang chọn để dùng lại.', 'Bấm Quét nhanh ở cột trái. Kết quả cộng dồn, kênh và video vừa tìm thấy có nhãn Mới trong 24 giờ.', 'Tab Ngách: bấm Xem kênh để lọc theo ngách, Gửi Claude để nhờ phân tích ngách và lên 15 ý tưởng video.', 'Tab Kênh: bấm tên kênh để xem chi tiết, gắn sao kênh ngon, ẩn kênh rác, Clone để bóc hồ sơ làm theo. Đổi sang dạng Bảng khi cần lướt nhanh.'], terms: [['View ÷ sub (outlier)', '×20 nghĩa là video có view gấp 20 lần số người đăng ký'], ['Điểm farm', '0–100, càng cao càng chứng tỏ kênh ra view đều đặn']] }), h('div', null, h(window.TopNgachV3, Object.assign({}, common, {
      isPro: true, onUpgradePrompt: function () { },
      onSelectKeywordForSearch: function (kw) { goto('explore', { q: kw }); },
      onAddCompetitor: function (v) { K.followChannel(v.channelId, v.channel); },
      onOpenChannel: function (id, tab) { goto('channels', { analyze: id, tab: tab }); },
      onToggleSave: function (v) { store.toggleSave(v); }, isSaved: function (id) { return store.isSaved(id); }
    })))) : h(K.Missing, { name: 'Top Ngách', file: 'top_ngach_v3.js' });
    else if (route === 'resource') page = P.studio ? h(P.studio, { goto: goto, params: params, common: common }) : h(K.Missing, { name: 'Tạo tài nguyên', file: 'page_studio.js' });
    var user = Y.auth.currentUser(), label = user ? (user.email || '').replace('@youtrend.user', '') : '';
    var alertN = route !== 'today' && window.YT4Today ? window.YT4Today.unseenCount() : 0;
    var badge = function (n) { return n[0] === 'today' && alertN > 0 && h('span', { className: 'absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#ff4e45] text-white text-[10px] font-bold leading-4 text-center tabular-nums', title: alertN + ' video nổ mới từ kênh đang theo dõi' }, alertN > 9 ? '9+' : alertN); };
    // mode: 'rail' = thanh hẹp (biểu tượng trên, chữ dưới) · 'row' = thanh rộng (biểu tượng + chữ một hàng) · 'mobile' = thanh đáy điện thoại
    var navItem = function (n, mode) {
      var on = route === n[0], row = mode === 'row';
      return h('a', { key: n[0], href: '#' + n[0], onClick: function (e) { e.preventDefault(); setDrawer(false); goto(n[0]); }, 'aria-current': on ? 'page' : null, title: n[1],
        className: cx('flex items-center rounded-xl transition', row ? 'w-full h-12 px-4 gap-5' : 'flex-col justify-center gap-1.5 text-center ' + (mode === 'mobile' ? 'h-14 px-1' : 'w-[76px] py-3.5'), on ? 'bg-[#323232] text-[#f1f1f1]' : 'text-[#aaaaaa] hover:bg-[#272727] hover:text-[#f1f1f1]'), style: on ? { boxShadow: (row ? 'inset 3px 0 0 ' : 'inset 0 -2px 0 ') + n[3] } : null },
        h('span', { className: 'relative shrink-0', style: { color: n[3] } }, h(K.Icon, { name: n[0], size: mode === 'mobile' ? 22 : 25, stroke: on ? 2.2 : 1.7 }), badge(n)),
        h('span', { className: cx(row ? 'text-[14.5px] truncate' : 'leading-tight ' + (mode === 'mobile' ? 'text-[9.5px]' : 'text-[11.5px]'), on && (row ? 'font-semibold' : 'font-medium')) }, row ? n[1] : n[2] || n[1]));
    };
    var burger = h('button', { type: 'button', onClick: function () { if (window.innerWidth >= 1024) { if (navOff) setNavOff(false); else setWide(!wide); } else setDrawer(!drawer); }, 'aria-label': wide ? 'Thu gọn thanh bên trái' : 'Mở rộng thanh bên trái', 'aria-expanded': wide || drawer, className: 'shrink-0 w-10 h-10 -ml-1 rounded-full grid place-items-center text-[#f1f1f1] hover:bg-[#272727] cursor-pointer' }, h(K.Icon, { name: 'menu', size: 24, stroke: 1.8 }));
    return h('div', { className: 'min-h-screen' },
      h('header', { className: 'fixed top-0 inset-x-0 z-40 h-14 bg-[#0f0f0f]/90 backdrop-blur-md flex items-center gap-3 pl-4 lg:pl-5 pr-4' },
        burger,
        h('button', { onClick: function () { goto('today'); }, 'aria-label': 'YouTrend, về trang Hôm nay', className: 'cursor-pointer shrink-0' }, h(Mark)),
        h('div', { className: 'flex-1 flex justify-center min-w-0' }, h('button', { onClick: function () { setPal(true); }, 'aria-label': 'Tìm nhanh', className: 'hidden md:flex items-center gap-2.5 w-full max-w-[520px] h-9 px-4 rounded-full border border-[#303030] bg-[#121212] text-[12.5px] text-[#aaaaaa] hover:border-[#4a4a4a] cursor-text transition' }, h(K.Icon, { name: 'search', size: 15 }), h('span', { className: 'flex-1 text-left truncate' }, 'Tìm kênh, video đã lưu, ý tưởng hoặc gõ từ khoá'), h('kbd', { className: 'text-[10.5px] px-1.5 py-0.5 rounded bg-[#272727] text-[#aaaaaa] font-sans' }, 'Ctrl K'))),
        h('button', { onClick: function () { setPal(true); }, 'aria-label': 'Tìm nhanh', className: 'md:hidden h-9 w-9 rounded-full bg-[#272727] text-[#f1f1f1] inline-flex items-center justify-center cursor-pointer' }, h(K.Icon, { name: 'search', size: 16 })),
        h('div', { className: 'flex items-center gap-2 shrink-0' }, h(QuotaChip, { onClick: function () { goto('settings'); } }),
          h('button', { onClick: function () { goto('settings'); }, title: user ? user.email : '', 'aria-label': 'Tài khoản và cài đặt', className: 'h-8 w-8 rounded-full bg-[#5e35b1] text-white text-[13px] font-medium cursor-pointer hover:brightness-110' }, (label || '?').charAt(0).toUpperCase()))),
      h('nav', { 'aria-label': 'Mục chính', className: cx('fixed left-0 top-14 bottom-0 z-30 flex-col gap-1 pt-2 bg-[#0f0f0f]/85 backdrop-blur-md overflow-y-auto', navOff ? 'hidden' : 'hidden lg:flex', wide ? 'w-[236px] px-3 items-stretch' : 'w-[84px] items-center') }, NAV.map(function (n) { return navItem(n, wide ? 'row' : 'rail'); })),
      h('button', { onClick: function () { setNavOff(!navOff); }, title: navOff ? 'Hiện thanh bên trái' : 'Ẩn thanh bên trái', 'aria-label': navOff ? 'Hiện thanh bên trái' : 'Ẩn thanh bên trái', className: 'hidden lg:grid fixed top-1/2 -translate-y-1/2 z-40 w-7 h-7 rounded-full bg-[#272727] border border-[#4a4a4a] text-[#f1f1f1] hover:bg-[#3a3a3a] place-items-center cursor-pointer shadow-lg transition-[left] duration-150', style: { left: (navOff ? 6 : (wide ? 236 : 84) - 14) + 'px' } }, h(K.Icon, { name: navOff ? 'right' : 'left', size: 15, stroke: 2.2 })),
      h('nav', { 'aria-label': 'Mục chính', className: 'lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-8 bg-[#0f0f0f] border-t border-[#272727]' }, NAV.map(function (n) { return navItem(n, 'mobile'); })),
      drawer && h('div', { className: 'lg:hidden fixed inset-0 z-50' },
        h('div', { className: 'absolute inset-0 bg-black/60', onClick: function () { setDrawer(false); } }),
        h('nav', { 'aria-label': 'Mục chính', className: 'absolute left-0 top-0 bottom-0 w-[264px] bg-[#0f0f0f] flex flex-col gap-1 px-3 pb-4 overflow-y-auto' },
          h('div', { className: 'h-14 flex items-center gap-3 pl-1' }, burger, h(Mark)),
          NAV.map(function (n) { return navItem(n, 'row'); }))),
      h('div', { className: cx('pt-14 transition-[padding] duration-150', navOff ? 'lg:pl-3' : wide ? 'lg:pl-[236px]' : 'lg:pl-[84px]') },
        noKey && route !== 'settings' && h('div', { className: 'mx-4 sm:mx-6 mt-3 rounded-xl bg-[#272727] px-4 py-2.5 flex items-center gap-3 text-[12px] text-[#f1f1f1]' }, 'Chưa có YouTube API key nên các mục tìm kiếm chưa chạy được.', h('button', { onClick: function () { goto('settings'); }, className: K.C.sm }, 'Thêm key')),
        h('main', { className: 'max-w-[1760px] mx-auto px-4 sm:px-6 py-5 pb-24 lg:pb-12' }, FLOW.some(function (x) { return x[2] === route; }) && h(Flow, { route: route, goto: goto, off: flowOff, onToggle: function () { setFlowOff(!flowOff); } }), h(ErrorBoundary, { key: route }, page))),
      pal && h(Palette, { goto: goto, onClose: function () { setPal(false); } }),
      h(K.Toaster));
  }
  var ErrorBoundary = (function () {
    function EB(props) { React.Component.call(this, props); this.state = { err: null }; }
    EB.prototype = Object.create(React.Component.prototype);
    EB.getDerivedStateFromError = function (err) { return { err: err }; };
    EB.prototype.componentDidCatch = function (err, info) { console.error(err, info); };
    EB.prototype.render = function () { if (this.state.err) return h('div', { className: 'py-16 text-center space-y-3' }, h('div', { className: 'text-[11px] text-cham-100' }, 'Mục này gặp lỗi khi hiển thị. Tải lại trang để thử lại.'), h('div', { className: 'text-[10.5px] text-cham-400 font-mono' }, String(this.state.err && this.state.err.message || this.state.err)), h(Btn, { onClick: function () { location.reload(); } }, 'Tải lại trang')); return this.props.children; };
    return EB;
  })();

  // ---------- GỐC: kiểm tra quyền admin ở máy chủ ----------
  function Root() {
    var s0 = useState({ s: 'loading' }), S = s0[0], set = s0[1];
    useEffect(function () {
      if (!Y.auth.init()) { set({ s: 'error', msg: 'Không tải được Firebase. Kiểm tra mạng rồi tải lại trang.' }); return; }
      var t = setTimeout(function () { set(function (x) { return x.s === 'loading' ? { s: 'login' } : x; }); }, 8000);
      return Y.auth.onChange(async function (u) {
        clearTimeout(t);
        if (!u) { set(function (x) { return { s: 'login', msg: x.denied || '' }; }); return; }
        set({ s: 'loading' });
        try {
          var me = await Y.auth.checkAdmin();
          if (me.admin) set({ s: 'ready', me: me });
          else { var m = (u.email || '') + ': ' + (me.message || 'không có quyền.'); await Y.auth.signOut(); set({ s: 'login', msg: m, denied: m }); }
        } catch (e) { set({ s: 'error', msg: 'Không kiểm tra được quyền đăng nhập (' + e.message + ').' }); }
      });
    }, []);
    async function logout() { await Y.auth.signOut(); set({ s: 'login' }); }
    if (S.s === 'loading') return h('div', { className: 'min-h-screen flex items-center justify-center' }, h(K.Busy, null, 'Đang kiểm tra đăng nhập…'));
    if (S.s === 'error') return h('div', { className: 'min-h-screen flex items-center justify-center px-4' }, h('div', { className: 'max-w-sm space-y-4' }, h(Note, { error: true }, S.msg), h('div', { className: 'flex gap-2' }, h(Btn, { onClick: function () { location.reload(); } }, 'Thử lại'), h(Btn, { onClick: logout }, 'Đăng xuất'))));
    if (S.s === 'login') return h(Login, { message: S.msg });
    return h(Shell, { me: S.me, onLogout: logout });
  }

  var rootEl = document.getElementById('root');
  (ReactDOM.createRoot ? ReactDOM.createRoot(rootEl).render(h(Root)) : ReactDOM.render(h(Root), rootEl));
})();
