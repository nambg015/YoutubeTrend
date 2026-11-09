// =========================================================================
// YOUTREND v4 — KHUNG WEB (main.js): đăng nhập admin, thanh menu, chuyển trang
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, store = Y.store, K = window.YT4UI, cx = K.cx, P = window.YT4Pages || {};
  var Btn = K.Btn, Input = K.Input, Note = K.Note;

  var NAV = [['explore', 'Khám phá'], ['niche', 'Top Ngách'], ['channels', 'Kênh'], ['resource', 'Tạo tài nguyên'], ['library', 'Thư viện'], ['settings', 'Cài đặt']];
  var OLD = { search: 'explore', keywords: 'explore', niche: 'explore', rpm: 'niche', competitors: 'channels', spy: 'channels', studio_chart: 'channels', wiki: 'library' };
  function readRoute() { var hsh = (location.hash || '').replace(/^#\/?/, '').split('/')[0]; if (NAV.some(function (n) { return n[0] === hsh; })) return hsh; var q = new URLSearchParams(location.search).get('tab'); return OLD[q] || 'explore'; }

  // ---------- ĐĂNG NHẬP ----------
  function Mark(p) { return h('span', { className: 'inline-flex items-center gap-2.5' }, h('span', { 'aria-hidden': true, className: cx('grid place-items-center rounded-md bg-[#e3b55a] text-[#231a08] font-display font-bold', p.big ? 'w-10 h-9 text-[13px]' : 'w-7 h-7 text-[10.5px]') }, 'YT'), h('span', { className: cx('font-display font-bold tracking-[-0.06em] text-cham-50', p.big ? 'text-[22px]' : 'text-[16.5px]') }, 'YouTrend')); }
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

  // ---------- KHUNG ----------
  function QuotaChip(p) {
    K.useBus('keys'); K.useBus('quota');
    var S = Y.keys.stats(), tone = !S.total ? 'border-dashed border-white/20 text-cham-300' : !S.ok ? 'border-dieu-400/40 bg-dieu-500/15 text-dieu-200' : 'border-ngoc-400/35 bg-ngoc-400/15 text-ngoc-200 hover:border-ngoc-300/60';
    return h('button', { onClick: p.onClick, title: 'Quota YouTube còn lại hôm nay. Bấm để quản lý API key.', className: cx('h-7 px-3 rounded-md border text-[10.5px] font-semibold tabular-nums transition cursor-pointer whitespace-nowrap', tone) },
      !S.total ? 'Chưa có key' : !S.ok ? 'Hết quota' : h(Frag, null, h('span', { className: 'sm:hidden' }, N(S.left)), h('span', { className: 'hidden sm:inline' }, 'Quota ' + N(S.left) + ' · ' + S.ok + '/' + S.total + ' key')));
  }
  function Shell(p) {
    var s0 = useState(readRoute()), route = s0[0], setRoute = s0[1], s1 = useState({}), params = s1[0], setParams = s1[1];
    K.useBus('keys');
    useEffect(function () { var f = function () { setRoute(readRoute()); }; window.addEventListener('hashchange', f); return function () { window.removeEventListener('hashchange', f); }; }, []);
    useEffect(function () { if (location.search) history.replaceState(null, '', location.pathname + '#' + route); }, []);
    function goto(r, prm) { setParams(Object.assign({ _k: Date.now() }, prm || {})); if (r !== route) { location.hash = r; setRoute(r); } window.scrollTo(0, 0); }
    var key = Y.keys.getActiveKey(), noKey = !Y.keys.getPool().length;
    var common = { apiKey: key, yt: Y.yt, ytKeyManager: Y.keys, showToast: K.toast, onOpenApiModal: function () { goto('settings'); } };
    var page;
    if (route === 'explore') page = h(P.explore, { goto: goto, params: params });
    else if (route === 'channels') page = h(P.channels, { goto: goto, params: params });
    else if (route === 'library') page = h(P.library, { goto: goto, params: params });
    else if (route === 'settings') page = h(P.settings, { goto: goto, me: p.me, onLogout: p.onLogout });
    else if (route === 'niche') page = window.TopNgachV3 ? h('div', { className: 'space-y-4' }, h(K.Help, { id: 'niche', title: 'Cách dùng Top Ngách', steps: ['Chọn chế độ: Ngách RPM cao (chỉ nước trả tiền cao) hoặc Toàn cầu (mọi nước, mọi loại content).', 'Bấm Quét nhanh ở cột trái. Kết quả được cộng dồn, càng quét nhiều lần càng ra nhiều kênh lạ.', 'Tab Ngách đề xuất: ngách nào đang có nhiều kênh nhỏ kiếm được view. Bấm Xem kênh để xem danh sách.', 'Kênh farm tiền = kênh nhỏ có ít nhất 3 video vượt số sub, ra view đều chứ không ăn may. Bấm Phân tích nếu kênh còn ghi Chưa phân tích.'], terms: [['View ÷ sub (outlier)', '×20 nghĩa là video có view gấp 20 lần số người đăng ký'], ['Điểm farm', '0–100, càng cao càng chứng tỏ kênh ra view đều đặn']] }), h('div', null, h(window.TopNgachV3, Object.assign({}, common, {
      isPro: true, onUpgradePrompt: function () { },
      onSelectKeywordForSearch: function (kw) { goto('explore', { q: kw }); },
      onAddCompetitor: function (v) { K.followChannel(v.channelId, v.channel); },
      onToggleSave: function (v) { store.toggleSave(v); }, isSaved: function (id) { return store.isSaved(id); }
    })))) : h(K.Missing, { name: 'Top Ngách', file: 'top_ngach_v3.js' });
    else if (route === 'resource') page = P.studio ? h(P.studio, { goto: goto, params: params, common: common }) : h(K.Missing, { name: 'Tạo tài nguyên', file: 'page_studio.js' });
    var user = Y.auth.currentUser(), label = user ? (user.email || '').replace('@youtrend.user', '') : '';
    return h('div', { className: 'min-h-screen' },
      h('header', { className: 'sticky top-0 z-40 bg-[#17181b]/[0.92] backdrop-blur-[10px] border-b border-white/[0.08]' },
        h('div', { className: 'max-w-[1600px] mx-auto px-4 sm:px-6 h-12 flex items-center gap-4' },
          h('button', { onClick: function () { goto('explore'); }, 'aria-label': 'YouTrend, về Khám phá', className: 'cursor-pointer shrink-0' }, h(Mark)),
          h('nav', { 'aria-label': 'Mục chính', className: 'flex-1 min-w-0 flex items-center gap-1 overflow-x-auto no-scrollbar' }, NAV.map(function (n) {
            var on = route === n[0];
            return h('a', { key: n[0], href: '#' + n[0], onClick: function (e) { e.preventDefault(); goto(n[0]); }, 'aria-current': on ? 'page' : null, ref: on ? function (el) { if (el && el.scrollIntoView && window.innerWidth < 768) el.scrollIntoView({ block: 'nearest', inline: 'center' }); } : null, className: cx('h-7 flex items-center px-3 rounded-md text-[10.5px] font-medium whitespace-nowrap transition', on ? 'bg-white/[0.1] text-cham-50 shadow-[inset_0_0_0_1px_rgba(255,255,255,.12)]' : 'text-cham-400 hover:text-hoe-300') }, n[1]);
          })),
          h('div', { className: 'flex items-center gap-2 shrink-0' }, h(QuotaChip, { onClick: function () { goto('settings'); } }),
            h('button', { onClick: function () { goto('settings'); }, title: user ? user.email : '', 'aria-label': 'Tài khoản và cài đặt', className: 'h-7 w-8 rounded-md bg-hoaca-500/20 text-hoaca-200 border border-hoaca-400/40 text-[10.5px] font-semibold cursor-pointer hover:border-hoaca-300' }, (label || '?').charAt(0).toUpperCase())))),
      noKey && route !== 'settings' && h('div', { className: 'border-b border-hoe-400/25 bg-hoe-400/10' }, h('div', { className: 'max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex items-center gap-3 text-[10.5px] text-hoe-100' }, 'Chưa có YouTube API key nên các mục tìm kiếm chưa chạy được.', h('button', { onClick: function () { goto('settings'); }, className: K.C.sm }, 'Thêm key'))),
      h('main', { className: 'max-w-[1600px] mx-auto px-4 sm:px-6 py-5 pb-16' }, h(ErrorBoundary, { key: route }, page)),
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
