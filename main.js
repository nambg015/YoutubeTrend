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
  function Login(p) {
    var s0 = useState(''), id = s0[0], setId = s0[1], s1 = useState(''), pw = s1[0], setPw = s1[1], s2 = useState(''), busy = s2[0], setBusy = s2[1], s3 = useState(p.message || ''), err = s3[0], setErr = s3[1];
    useEffect(function () { setErr(p.message || ''); }, [p.message]);
    async function go(fn) { setErr(''); setBusy(fn === 'g' ? 'g' : 'p'); try { if (fn === 'g') await Y.auth.signInGoogle(); else await Y.auth.signIn(id, pw); } catch (e) { setErr(e.message); setBusy(''); } }
    return h('div', { className: 'min-h-screen flex items-center justify-center px-4' },
      h('div', { className: 'w-full max-w-[340px]' },
        h('div', { className: 'mb-8' }, h('div', { className: 'text-[22px] font-semibold tracking-tight text-white' }, 'YouTrend'), h('div', { className: 'text-[13px] text-zinc-400 mt-1' }, 'Đăng nhập để tiếp tục.')),
        h('button', { onClick: function () { go('g'); }, disabled: !!busy, className: 'w-full h-10 rounded-md bg-emerald-400 text-emerald-950 text-[13px] font-medium hover:bg-emerald-300 transition disabled:opacity-50 cursor-pointer' }, busy === 'g' ? 'Đang mở Google…' : 'Đăng nhập với Google'),
        h('div', { className: 'flex items-center gap-3 my-5 text-[11px] text-zinc-500' }, h('span', { className: 'flex-1 h-px bg-zinc-800' }), 'hoặc', h('span', { className: 'flex-1 h-px bg-zinc-800' })),
        h('form', { onSubmit: function (e) { e.preventDefault(); if (id && pw) go('p'); }, className: 'space-y-2' },
          h(Input, { value: id, onChange: function (e) { setId(e.target.value); }, placeholder: 'Tên đăng nhập', autoComplete: 'username', className: 'h-10' }),
          h(Input, { type: 'password', value: pw, onChange: function (e) { setPw(e.target.value); }, placeholder: 'Mật khẩu', autoComplete: 'current-password', className: 'h-10' }),
          h('button', { type: 'submit', disabled: !!busy || !id || !pw, className: 'w-full h-10 rounded-md border border-zinc-700 text-[13px] text-zinc-200 hover:border-zinc-500 hover:text-white transition disabled:opacity-40 cursor-pointer' }, busy === 'p' ? 'Đang đăng nhập…' : 'Đăng nhập')),
        err && h('div', { className: 'mt-4 text-[12px] text-red-300 leading-relaxed' }, err),
        h('div', { className: 'mt-10 text-[11px] text-zinc-500' }, 'Web nội bộ. Chỉ tài khoản quản trị được truy cập.')));
  }

  // ---------- KHUNG ----------
  function QuotaChip(p) {
    K.useBus('keys'); K.useBus('quota');
    var S = Y.keys.stats();
    return h('button', { onClick: p.onClick, title: 'Quota YouTube còn lại hôm nay', className: cx('h-8 px-3 rounded-md border text-[11px] font-mono transition cursor-pointer', !S.total ? 'border-zinc-700 border-dashed text-zinc-400' : !S.ok ? 'border-red-900 text-red-300' : 'border-emerald-500/25 text-emerald-200/90 hover:border-emerald-400/60') },
      !S.total ? 'Chưa có API key' : !S.ok ? 'Hết quota' : 'API ' + S.ok + '/' + S.total + ' · ' + N(S.left));
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
    else if (route === 'niche') page = window.TopNgachV3 ? h('div', { className: 'space-y-4' }, h(K.Help, { id: 'niche', title: 'Cách dùng Top Ngách', steps: ['Chọn chế độ: Ngách RPM cao (chỉ nước trả tiền cao) hoặc Toàn cầu (mọi nước, mọi loại content).', 'Bấm Quét nhanh ở cột trái. Kết quả được cộng dồn, càng quét nhiều lần càng ra nhiều kênh lạ.', 'Tab Ngách đề xuất: ngách nào đang có nhiều kênh nhỏ kiếm được view. Bấm Xem kênh để xem danh sách.', 'Kênh farm tiền = kênh nhỏ có ít nhất 3 video vượt số sub, ra view đều chứ không ăn may. Bấm Phân tích nếu kênh còn ghi Chưa phân tích.'], terms: [['Outlier', 'view chia cho sub; ×20 nghĩa là video có view gấp 20 lần số người đăng ký'], ['Điểm farm', '0–100, càng cao càng chứng tỏ kênh ra view đều đặn']] }), h(K.Mono, null, h(window.TopNgachV3, Object.assign({}, common, {
      isPro: true, onUpgradePrompt: function () { },
      onSelectKeywordForSearch: function (kw) { goto('explore', { q: kw }); },
      onAddCompetitor: function (v) { K.followChannel(v.channelId, v.channel); },
      onToggleSave: function (v) { store.toggleSave(v); }, isSaved: function (id) { return store.isSaved(id); }
    })))) : h(K.Missing, { name: 'Top Ngách', file: 'top_ngach_v3.js' });
    else if (route === 'resource') page = P.studio ? h(P.studio, { goto: goto, params: params, common: common }) : h(K.Missing, { name: 'Tạo tài nguyên', file: 'page_studio.js' });
    var user = Y.auth.currentUser(), label = user ? (user.email || '').replace('@youtrend.user', '') : '';
    return h('div', { className: 'min-h-screen' },
      h('header', { className: 'sticky top-0 z-40 bg-[#080b11]/70 backdrop-blur-xl border-b border-white/[0.07]' },
        h('div', { className: 'max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center gap-6' },
          h('button', { onClick: function () { goto('explore'); }, className: 'text-[15px] font-semibold tracking-tight cursor-pointer shrink-0 bg-gradient-to-r from-emerald-300 to-sky-300 bg-clip-text text-transparent' }, 'YouTrend'),
          h('nav', { className: 'flex-1 min-w-0 flex items-center gap-5 h-full overflow-x-auto no-scrollbar' }, NAV.map(function (n) {
            var on = route === n[0];
            return h('a', { key: n[0], href: '#' + n[0], onClick: function (e) { e.preventDefault(); goto(n[0]); }, className: cx('relative h-full flex items-center text-[13px] whitespace-nowrap transition', on ? 'text-white' : 'text-zinc-400 hover:text-zinc-200') }, n[1], on && h('span', { className: 'absolute left-0 right-0 bottom-0 h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400' }));
          })),
          h('div', { className: 'hidden sm:flex items-center gap-2 shrink-0' }, h(QuotaChip, { onClick: function () { goto('settings'); } }),
            h('button', { onClick: function () { goto('settings'); }, title: user ? user.email : '', className: 'h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-200 border border-emerald-500/30 text-[12px] font-semibold cursor-pointer' }, (label || '?').charAt(0).toUpperCase())))),
      noKey && route !== 'settings' && h('div', { className: 'border-b border-zinc-900' }, h('div', { className: 'max-w-[1400px] mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3 text-[12px] text-zinc-400' }, 'Chưa có YouTube API key, các tính năng tìm kiếm sẽ không chạy.', h('button', { onClick: function () { goto('settings'); }, className: 'text-white underline underline-offset-2 cursor-pointer' }, 'Thêm key'))),
      h('main', { className: 'max-w-[1400px] mx-auto px-4 sm:px-6 py-6 pb-20' }, h(ErrorBoundary, { key: route }, page)),
      h(K.Toaster));
  }
  var ErrorBoundary = (function () {
    function EB(props) { React.Component.call(this, props); this.state = { err: null }; }
    EB.prototype = Object.create(React.Component.prototype);
    EB.getDerivedStateFromError = function (err) { return { err: err }; };
    EB.prototype.componentDidCatch = function (err, info) { console.error(err, info); };
    EB.prototype.render = function () { if (this.state.err) return h('div', { className: 'py-16 text-center space-y-3' }, h('div', { className: 'text-[13px] text-zinc-300' }, 'Mục này gặp lỗi khi hiển thị.'), h('div', { className: 'text-[12px] text-zinc-500 font-mono' }, String(this.state.err && this.state.err.message || this.state.err)), h(Btn, { onClick: function () { location.reload(); } }, 'Tải lại trang')); return this.props.children; };
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
