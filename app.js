// =========================================================================
// YOUTREND v4 — GIAO DIỆN (app.js)
// Web riêng của admin. 6 mục: Khám phá • Top Ngách • Kênh • Tạo tài nguyên • Thư viện • Cài đặt
// Màu tranh Đông Hồ (xem theme.js). Cần core.js nạp trước.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store;
  var cx = function () { return Array.prototype.filter.call(arguments, Boolean).join(' '); };

  // ===================== THÀNH PHẦN GIAO DIỆN =====================
  var C = {
    btn: 'inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full border border-transparent bg-[#323232] text-[12.5px] font-medium text-cham-100 hover:bg-[#424242] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
    pri: 'inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full bg-[#3ea6ff] text-[#0f0f0f] text-[12.5px] font-medium hover:bg-[#65b8ff] active:bg-[#2b8fe0] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
    sm: 'inline-flex items-center justify-center h-7 px-3 rounded-full border border-transparent bg-[#323232] text-[12px] text-cham-200 hover:bg-[#424242] transition disabled:opacity-40 cursor-pointer whitespace-nowrap',
    smOn: 'inline-flex items-center justify-center h-7 px-3 rounded-full border border-ngoc-400/40 bg-ngoc-400/15 text-[12px] text-ngoc-200 cursor-pointer whitespace-nowrap',
    input: 'h-8 px-3 rounded-lg bg-[#121212] border border-[#303030] text-[10.5px] text-cham-50 placeholder:text-cham-500 hover:border-[#3f3f3f] focus:border-[#3ea6ff] outline-none transition w-full',
    select: 'h-8 px-2.5 rounded-lg bg-[#121212] border border-[#303030] text-[10.5px] text-cham-100 hover:border-[#3f3f3f] focus:border-[#3ea6ff] outline-none cursor-pointer w-full',
    card: 'yt-card',
    label: 'block text-[10.5px] font-medium text-cham-300 mb-1.5',
    link: 'text-cham-100 hover:text-cham-50 underline decoration-cham-600 underline-offset-2 hover:decoration-ngoc-400'
  };
  // Bộ icon nét mảnh (SVG, một độ dày nét)
  var ICONS = { ext: 'M7 17 17 7M9 7h8v8', x: 'M6 6l12 12M18 6 6 18', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 4 4', scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10',
    explore: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm3.5-12.5-2 5-5 2 2-5 5-2Z', niche: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1.2-3.6 2.3-4.6.3 1.6 1.1 2.6 2.2 2.6 0-3 .5-5.6.5-8Z',
    channels: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 4.15a3.5 3.5 0 0 1 0 6.7',
    resource: 'M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Zm8 4v5m-2.5-2.5h5', library: 'M5 5h14M4 9h16v10H4V9Zm6.5 2.5v5l4-2.5-4-2.5Z',
    today: 'M4 11.5 12 4l8 7.5V20a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8.5Z', star: 'M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5Z',
    hide: 'M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c5 0 8.5 4.5 9.5 6-.4.7-1.3 1.9-2.6 3.1M6.2 7.8C4.3 9.2 3 11 2.5 12c1 1.5 4.5 6 9.5 6 1.5 0 2.8-.4 4-1M9.9 9.9a3 3 0 0 0 4.2 4.2',
    note: 'M5 4h14v12l-4 4H5V4Zm10 16v-4h4M8 9h8M8 13h5', check: 'M5 12.5l4.5 4.5L19 7.5', plus: 'M12 5v14M5 12h14', copy: 'M9 9h10v11H9V9Zm-4 6V4h10', bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3Z',
    settings: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4l-.3 2.5a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1l.3 2.5h4l.3-2.5c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6Z' };
  function Icon(p) { return h('svg', { width: p.size || 14, height: p.size || 14, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: p.stroke || 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true, className: p.className }, h('path', { d: ICONS[p.name] || '' })); }
  function Btn(p) { return h('button', { type: p.type || 'button', onClick: p.onClick, disabled: p.disabled, title: p.title, className: cx(p.primary ? C.pri : p.small ? (p.on ? C.smOn : C.sm) : C.btn, p.className) }, p.children); }
  function Field(p) { return h('label', { className: cx('block min-w-0', p.className) }, p.label && h('span', { className: C.label }, p.label), p.children); }
  function Input(p) { return h('input', Object.assign({}, p, { className: cx(C.input, p.className) })); }
  function Select(p) { return h('select', { value: p.value, onChange: function (e) { p.onChange(e.target.value); }, className: cx(C.select, p.className) }, p.options.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); }
  function Seg(p) { return h('div', { className: 'inline-flex flex-wrap gap-1.5' }, p.options.map(function (o) { var on = String(p.value) === String(o[0]); return h('button', { key: o[0], type: 'button', 'aria-pressed': on, onClick: function () { p.onChange(o[0]); }, className: cx('h-7 px-3.5 rounded-lg text-[10.5px] font-medium whitespace-nowrap transition cursor-pointer', on ? 'bg-[#f1f1f1] text-[#0f0f0f] font-medium' : 'text-[#f1f1f1] bg-transparent hover:bg-[#424242]') }, o[1]); })); }
  function Tabs(p) { return h('div', { role: 'tablist', className: cx('flex max-w-full gap-2 overflow-x-auto no-scrollbar', p.className) }, p.items.map(function (t) { var on = p.value === t[0]; return h('button', { key: t[0], type: 'button', role: 'tab', 'aria-selected': on, onClick: function () { p.onChange(t[0]); }, className: cx('h-7 px-3.5 rounded-lg text-[10.5px] whitespace-nowrap cursor-pointer transition', on ? 'bg-[#f1f1f1] text-[#0f0f0f] font-medium' : 'text-[#f1f1f1] font-medium bg-[#272727] hover:bg-[#424242]') }, t[1], t[2] != null ? h('span', { className: cx('ml-1.5 text-[11px] tabular-nums', on ? 'text-cham-600' : 'text-cham-500') }, t[2]) : null); })); }
  var TONE = { emerald: 'text-la-300', sky: 'text-nhat-300', amber: 'text-hoe-300', violet: 'text-hoaca-300', rose: 'text-dieu-300', son: 'text-ngoc-300' };
  function Stat(p) { return h('div', { className: cx('min-w-0', p.className) }, h('div', { className: 'text-[10.5px] text-cham-400 truncate' }, p.label), h('div', { className: cx('mt-0.5 font-semibold tracking-tight truncate tabular-nums', p.big ? 'text-[20.5px] leading-8' : 'text-[12px]', TONE[p.tone] || 'text-cham-50') }, p.value), p.sub && h('div', { className: 'text-[11px] text-cham-400 truncate' }, p.sub)); }
  function Empty(p) { return h('div', { className: 'py-14 px-6 text-center rounded-xl border border-dashed border-cham-700 bg-cham-950/60' }, h('div', { className: 'text-[11px] font-medium text-cham-100' }, p.title), p.sub && h('div', { className: 'mt-1.5 text-[10.5px] text-cham-400 max-w-md mx-auto leading-relaxed' }, p.sub), p.children && h('div', { className: 'mt-4' }, p.children)); }
  function Note(p) { return h('div', { role: p.error ? 'alert' : null, className: cx('rounded-lg border px-3.5 py-2.5 text-[10.5px] leading-relaxed', p.error ? 'border-dieu-500/50 bg-dieu-950 text-dieu-100' : 'border-nhat-600/40 bg-nhat-950 text-nhat-100', p.className) }, p.children); }
  function Busy(p) { return h('div', { role: 'status', className: 'flex items-center gap-2 text-[10.5px] text-cham-300' }, h('span', { className: 'inline-block w-3.5 h-3.5 rounded-md border-2 border-cham-700 border-t-ngoc-400 animate-spin' }), p.children); }
  function Bar(p) { return h('div', { className: 'h-1.5 rounded-md bg-[#3f3f3f] overflow-hidden' }, h('div', { className: cx('h-full rounded-md', p.color || 'bg-[#3ea6ff]'), style: { width: Math.max(2, Math.min(100, p.value)) + '%' } })); }
  function Section(p) { return h('section', { className: cx(C.card, 'p-4', p.className) }, (p.title || p.right) && h('div', { className: 'flex items-center justify-between gap-3 mb-3' }, h('div', null, h('h3', { className: 'text-[11px] font-semibold text-cham-50' }, p.title), p.sub && h('div', { className: 'text-[10.5px] text-cham-400 mt-0.5' }, p.sub)), p.right), p.children); }
  function Modal(p) {
    useEffect(function () { var f = function (e) { if (e.key === 'Escape') p.onClose(); }; window.addEventListener('keydown', f); return function () { window.removeEventListener('keydown', f); }; }, []);
    return h('div', { className: 'fixed inset-0 z-50 bg-[#050608]/80 flex items-start justify-center p-4 overflow-y-auto', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: cx('yt-card w-full mt-12 p-5', p.wide ? 'max-w-3xl' : 'max-w-lg') },
        h('div', { className: 'flex items-center justify-between mb-4' }, h('h2', { className: 'text-[13px] font-semibold text-cham-50' }, p.title), h('button', { onClick: p.onClose, className: C.sm }, 'Đóng')), p.children));
  }
  // Bảng có sắp xếp
  function Table(p) {
    var s = useState(p.sort || null), sort = s[0], setSort = s[1];
    var rows = useMemo(function () { if (!sort) return p.rows; var col = p.cols.find(function (c) { return c.k === sort.k; }); if (!col || !col.v) return p.rows; return p.rows.slice().sort(function (a, b) { var x = col.v(a), y = col.v(b); return (x > y ? 1 : x < y ? -1 : 0) * (sort.d); }); }, [p.rows, sort]);
    var lim = p.limit || rows.length;
    return h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[10.5px] border-collapse' },
      h('thead', null, h('tr', { className: 'border-b border-cham-700' }, p.cols.map(function (c) {
        var on = sort && sort.k === c.k;
        return h('th', { key: c.k, onClick: c.v ? function () { setSort({ k: c.k, d: on ? -sort.d : -1 }); } : null, className: cx('py-2.5 px-2 text-[10.5px] font-medium text-cham-400 whitespace-nowrap select-none', c.right ? 'text-right' : 'text-left', c.v && 'cursor-pointer hover:text-cham-100', on && 'text-cham-50', c.w) }, c.t, on ? (sort.d < 0 ? ' ↓' : ' ↑') : '');
      }))),
      h('tbody', null, rows.slice(0, lim).map(function (r, i) { return h('tr', { key: p.rowKey ? p.rowKey(r) : i, className: 'border-b border-cham-800/70 hover:bg-cham-800/40' }, p.cols.map(function (c) { return h('td', { key: c.k, className: cx('py-2 px-2 align-middle', c.right && 'text-right tabular-nums', c.cls) }, c.r ? c.r(r, i) : c.v(r)); })); }))));
  }
  function More(p) { if (p.total <= p.lim) return null; return h('div', { className: 'pt-3 flex gap-2 justify-center' }, h(Btn, { small: true, onClick: function () { p.setLim(p.lim + p.step); } }, 'Xem thêm ' + Math.min(p.step, p.total - p.lim)), h(Btn, { small: true, onClick: function () { p.setLim(p.total); } }, 'Hiện hết ' + p.total)); }
  function Thumb(p) { return h('a', { href: U.vurl(p.id), target: '_blank', rel: 'noopener noreferrer', className: cx('block shrink-0 overflow-hidden rounded-md bg-cham-900', p.className || 'w-24') }, h('img', { src: U.thumb(p.id), loading: 'lazy', className: 'w-full aspect-video object-cover' })); }
  function useBus(ev) { var s = useState(0); useEffect(function () { return Y.on(ev, function () { s[1](function (n) { return n + 1; }); }); }, [ev]); return s[0]; }
  function useLS(key, def) { var s = useState(function () { return st.json(key, def); }); return [s[0], function (v) { var n = typeof v === 'function' ? v(s[0]) : v; s[1](n); st.put(key, n); }]; }

  // toast
  var toastFn = function () { };
  function Toaster() {
    var s = useState([]), list = s[0], set = s[1];
    useEffect(function () { toastFn = function (m) { var id = Math.random(); set(function (l) { return l.concat([{ id: id, m: String(m) }]); }); setTimeout(function () { set(function (l) { return l.filter(function (x) { return x.id !== id; }); }); }, 3500); }; }, []);
    return h('div', { className: 'fixed bottom-4 right-4 z-[70] space-y-2 max-w-sm' }, list.map(function (t) { return h('div', { key: t.id, className: 'yt-card px-3.5 py-2.5 text-[10.5px] text-cham-50 border-la-600/60' }, t.m); }));
  }
  function toast(m) { toastFn(m); }

  // Bọc module nhúng: đơn sắc + bỏ emoji
  function Mono(p) { var ref = useRef(null); useEffect(function () { Y.watchMono(ref.current); }, []); return h('div', { ref: ref, className: 'mono' }, p.children); }
  function Missing(p) { return h(Empty, { title: 'Chưa tải được ' + p.name, sub: 'Kiểm tra file ' + p.file + ' đã có trên GitHub chưa, rồi tải lại trang (Ctrl+Shift+R).' }); }

  // Thêm kênh theo dõi từ id kênh
  async function followChannel(id, fallbackTitle) {
    if (!id) return; if (store.hasChannel(id)) { toast('Kênh đã có trong danh sách theo dõi'); return; }
    try { var m = await Y.channelStats([id]); var c = m[id]; store.addChannel({ id: id, title: c ? c.title : fallbackTitle || id, subs: c ? c.subs || 0 : 0, videoCount: c ? c.videos : 0, viewCount: c ? c.views : 0, avatar: c ? c.avatar : '', country: c ? c.country : '' }); toast('Đã theo dõi ' + (c ? c.title : 'kênh')); }
    catch (e) { store.addChannel({ id: id, title: fallbackTitle || id }); toast('Đã theo dõi kênh (chưa lấy được số liệu: ' + U.errMsg(e) + ')'); }
  }

  // ===================== PHÂN TÍCH DÙNG CHUNG =====================
  var STOP = new Set(('the a an and or of in on at to for from with by is are was were be this that it its as you your how what why when who i my me we our vs video full new official part ep episode shorts short live 2024 2025 2026 '
    + 'và của là có cho khi đã đang một này với tại trong từ được người những các không thì mà nè ơi ạ nhé ko bị đi ra vào lại rất quá').split(' '));
  function words(t) { return (String(t || '').toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu) || []); }
  // Đặc điểm tiêu đề dùng chung (Khuôn tiêu đề, Hồ sơ clone, Xưởng tiêu đề)
  var TITLE_FEATS = [
    ['Có con số', function (t) { return /\d/.test(t); }],
    ['Dạng câu hỏi', function (t) { return /\?|^(why|how|what|who|when|where|is|can|did|does|tại sao|vì sao|làm sao|có nên|liệu)\b/i.test(t); }],
    ['Có dấu | hoặc :', function (t) { return /[|:–—]/.test(t); }],
    ['Có từ VIẾT HOA', function (t) { return /\b[A-ZÀ-Ỹ]{3,}\b/.test(t); }],
    ['Có ngoặc ( ) [ ]', function (t) { return /[\(\[]/.test(t); }],
    ['Nói tới tiền / số lớn', function (t) { return /\$|million|billion|triệu|tỷ|\d{3,}/i.test(t); }],
    ['Ngôi thứ 2 (you / bạn)', function (t) { return /\byou(r)?\b|\bbạn\b/i.test(t); }],
    ['Phủ định / cảnh báo', function (t) { return /\bnever|don'?t|stop|warning|mistake|đừng|không bao giờ|sai lầm|cảnh báo/i.test(t); }],
    ['So sánh (vs)', function (t) { return /\bvs\.?\b|versus|so với/i.test(t); }],
    ['Có emoji', function (t) { return /[\uD83C-\uD83E][\uDC00-\uDFFF]/.test(t); }]
  ];
  // Khuôn tiêu đề: so đặc điểm tiêu đề nhóm thắng (top 25% outlier) với phần còn lại
  function titlePatterns(vids, score) {
    if (!vids.length) return null;
    var sorted = vids.slice().sort(function (a, b) { return score(b) - score(a); }), k = Math.max(3, Math.ceil(sorted.length / 4));
    var win = sorted.slice(0, k), rest = sorted.slice(k);
    var rate = function (arr, f) { return arr.length ? arr.filter(function (v) { return f(v.title); }).length / arr.length : 0; };
    var rows = TITLE_FEATS.map(function (x) { var a = rate(win, x[1]), b = rate(rest, x[1]); return { name: x[0], win: a, rest: b, lift: a - b }; }).sort(function (a, b) { return b.lift - a.lift; });
    var len = function (arr) { return Math.round(U.median(arr.map(function (v) { return v.title.length; }))); };
    var cnt = {}; win.forEach(function (v) { var seen = {}; words(v.title).forEach(function (w) { if (w.length < 3 || STOP.has(w) || /^\d+$/.test(w) || seen[w]) return; seen[w] = 1; cnt[w] = (cnt[w] || 0) + 1; }); });
    var hooks = Object.keys(cnt).filter(function (w) { return cnt[w] >= 2; }).sort(function (a, b) { return cnt[b] - cnt[a]; }).slice(0, 18).map(function (w) { return [w, cnt[w]]; });
    var firstW = {}; win.forEach(function (v) { var w = words(v.title).slice(0, 2).join(' '); if (w) firstW[w] = (firstW[w] || 0) + 1; });
    var openers = Object.keys(firstW).filter(function (w) { return firstW[w] >= 2; }).sort(function (a, b) { return firstW[b] - firstW[a]; }).slice(0, 8).map(function (w) { return [w, firstW[w]]; });
    return { win: win, rows: rows, lenWin: len(win), lenRest: len(rest), hooks: hooks, openers: openers, k: k };
  }
  function PatternView(p) {
    var P = p.data; if (!P) return h(Empty, { title: 'Chưa đủ dữ liệu' });
    return h('div', { className: 'grid gap-4 lg:grid-cols-2' },
      h(Section, { title: 'Đặc điểm tiêu đề của nhóm thắng', sub: 'Nhóm thắng = ' + P.k + ' video có ' + (p.metric || 'outlier') + ' cao nhất, so với phần còn lại' },
        h('div', { className: 'space-y-2' }, P.rows.map(function (r) {
          return h('div', { key: r.name, className: 'grid grid-cols-[1fr_60px_60px_56px] items-center gap-2 text-[10.5px]' },
            h('span', { className: 'text-cham-300' }, r.name), h('span', { className: 'text-right tabular-nums text-cham-50' }, Math.round(r.win * 100) + '%'), h('span', { className: 'text-right tabular-nums text-cham-400' }, Math.round(r.rest * 100) + '%'),
            h('span', { className: cx('text-right tabular-nums', r.lift > 0.1 ? 'text-la-300' : r.lift < -0.1 ? 'text-cham-500' : 'text-cham-400') }, (r.lift > 0 ? '+' : '') + Math.round(r.lift * 100)));
        }), h('div', { className: 'grid grid-cols-[1fr_60px_60px_56px] gap-2 text-[10px] text-cham-500 pt-1' }, h('span'), h('span', { className: 'text-right' }, 'Nhóm thắng'), h('span', { className: 'text-right' }, 'Còn lại'), h('span', { className: 'text-right' }, 'Chênh')),
        h('div', { className: 'text-[10.5px] text-cham-400 pt-2 border-t border-cham-900' }, 'Độ dài tiêu đề trung vị: nhóm thắng ' + P.lenWin + ' ký tự, còn lại ' + P.lenRest + ' ký tự.'))),
      h('div', { className: 'space-y-4' },
        h(Section, { title: 'Từ khoá lặp lại trong tiêu đề thắng' }, P.hooks.length ? h('div', { className: 'flex flex-wrap gap-1.5' }, P.hooks.map(function (x) { return h('span', { key: x[0], className: 'px-2 py-1 rounded border border-cham-800 text-[10.5px] text-cham-300' }, x[0], h('span', { className: 'ml-1.5 text-cham-500' }, x[1])); })) : h('div', { className: 'text-[10.5px] text-cham-500' }, 'Không có từ lặp lại đủ nhiều.')),
        h(Section, { title: 'Cách mở đầu tiêu đề hay gặp' }, P.openers.length ? h('div', { className: 'space-y-1' }, P.openers.map(function (x) { return h('div', { key: x[0], className: 'flex justify-between text-[10.5px]' }, h('span', { className: 'text-cham-300' }, '"' + x[0] + ' …"'), h('span', { className: 'text-cham-500' }, x[1] + ' video')); })) : h('div', { className: 'text-[10.5px] text-cham-500' }, 'Không có cách mở đầu lặp lại.')),
        h(Section, { title: 'Tiêu đề nhóm thắng' }, h('div', { className: 'space-y-1.5 max-h-80 overflow-y-auto pr-1' }, P.win.slice(0, 25).map(function (v) { return h('div', { key: v.id, className: 'text-[10.5px] text-cham-300 leading-snug' }, h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'hover:text-cham-50' }, v.title)); })))));
  }
  // Ô nhận định AI dùng chung
  function InsightBox(p) {
    var s0 = useState(p.cached || null), res = s0[0], setRes = s0[1], s1 = useState(false), busy = s1[0], setBusy = s1[1], s2 = useState(''), err = s2[0], setErr = s2[1];
    async function run() {
      setBusy(true); setErr('');
      try { var j = await Y.api('/api/research', { action: 'insight', kind: p.kind, data: p.data() }); setRes(j.insight); p.onResult && p.onResult(j.insight); }
      catch (e) { setErr(e.status === 501 ? 'Máy chủ chưa có GEMINI_API_KEY (Vercel → Settings → Environment Variables).' : U.errMsg(e)); }
      setBusy(false);
    }
    var V = { nen_lam: 'Nên làm', can_nhac: 'Cân nhắc', bao_hoa: 'Bão hoà' };
    var list = function (t, a) { return a && a.length ? h(Section, { title: t }, h('ul', { className: 'space-y-1.5' }, a.map(function (x, i) { return h('li', { key: i, className: 'text-[10.5px] text-cham-300 leading-relaxed pl-3 relative' }, h('span', { className: 'absolute left-0 text-cham-500' }, '–'), x); }))) : null; };
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex flex-wrap items-center gap-3' }, h(Btn, { primary: !res, onClick: run, disabled: busy }, busy ? 'Đang phân tích…' : res ? 'Phân tích lại' : 'Phân tích bằng AI'), h('span', { className: 'text-[11px] text-cham-500' }, 'Gemini đọc số liệu thật vừa đo (không bịa thêm số), 1 lượt AI.')),
      err && h(Note, { error: true }, err),
      res && h(Frag, null,
        h('div', { className: cx(C.card, 'p-4') }, h('div', { className: 'text-[10.5px] text-cham-400' }, 'Kết luận'), h('div', { className: cx('mt-1 text-lg', res.verdict === 'nen_lam' ? 'text-la-300' : res.verdict === 'bao_hoa' ? 'text-dieu-300' : 'text-hoe-200') }, V[res.verdict] || res.verdict), h('div', { className: 'mt-1 text-[10.5px] text-cham-300 leading-relaxed' }, res.verdict_text)),
        h('div', { className: 'grid gap-4 lg:grid-cols-2' }, list('Lý do', res.why), list('Điểm chung của video thắng', res.patterns)),
        res.angles && res.angles.length > 0 && h(Section, { title: 'Ý tưởng video' }, h('div', { className: 'divide-y divide-zinc-900' }, res.angles.map(function (a, i) {
          return h('div', { key: i, className: 'py-2 flex items-start justify-between gap-3' }, h('div', { className: 'min-w-0' }, h('div', { className: 'text-[10.5px] text-cham-50' }, a.title), h('div', { className: 'text-[10.5px] text-cham-400' }, a.why)),
            h(Btn, { small: true, onClick: function () { store.addIdea({ title: a.title, topic: p.topic || '', angle: a.why || '', whyTry: 'Từ AI nhận định: ' + (p.topic || '') }); toast('Đã thêm vào Kế hoạch video'); } }, 'Thêm vào kế hoạch'));
        }))),
        res.keywords && res.keywords.length > 0 && h(Section, { title: 'Từ khoá nên nhắm' }, h('div', { className: 'flex flex-wrap gap-1.5' }, res.keywords.map(function (k) { return h('button', { key: k, onClick: function () { p.onKeyword && p.onKeyword(k); }, className: 'px-2 py-1 rounded border border-cham-800 text-[10.5px] text-cham-300 hover:border-cham-500 hover:text-cham-50 cursor-pointer' }, k); }))),
        h('div', { className: 'grid gap-4 lg:grid-cols-2' }, list('Rủi ro', res.risks), list('Kế hoạch 2 tuần', res.plan))));
  }

  // ---------- Danh sách video: dạng thẻ (mặc định) hoặc bảng ----------
  function fmtX(x) { return x == null ? '' : '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); }
  function VideoCard(p) {
    var v = p.v, ratio = p.ratio ? p.ratio(v) : null, sv = store.isSaved(v.id), sub = v.subs;
    var hot = ratio != null && ratio >= (p.hotAt || 5);
    var chip = 'absolute text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums';
    return h('article', { className: 'group flex flex-col gap-2.5 rounded-xl bg-[#181818]/95 p-2 hover:bg-[#212121] transition' },
      h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'relative block rounded-xl overflow-hidden bg-[#272727]' },
        h('img', { src: U.thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
        sub != null && h('span', { className: cx(chip, 'top-2 left-2 bg-black/80 text-cham-50') }, N(sub) + ' sub'),
        ratio != null && (hot ? h('span', { className: 'seal sm absolute top-2 right-2 !w-auto !h-auto px-1.5 py-0.5 text-[11px] font-bold', title: 'View gấp ' + Math.round(ratio) + ' lần sub' }, fmtX(ratio))
          : h('span', { className: cx(chip, 'top-2 right-2', ratio >= 2 ? 'bg-hoe-400 text-hoe-950' : 'bg-black/80 text-cham-100') }, fmtX(ratio))),
        v.dur > 0 && h('span', { className: cx(chip, 'bottom-2 right-2 bg-black/80 text-cham-50 font-medium') }, v.dur <= 180 ? 'Shorts ' + U.dur(v.dur) : U.dur(v.dur))),
      h('div', { className: 'flex-1 flex flex-col gap-1 px-0.5' },
        h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'text-[10.5px] font-medium leading-snug text-cham-50 hover:text-ngoc-200 line-clamp-2' }, v.title),
        h('button', { onClick: function () { p.onChannel && v.channelId && p.onChannel(v.channelId); }, className: 'text-left text-[10.5px] text-cham-300 hover:text-nhat-200 truncate cursor-pointer' }, v.channel || ''),
        h('dl', { className: 'grid grid-cols-3 gap-1 text-[10.5px] mt-auto pt-1.5' },
          h('div', null, h('dt', { className: 'text-cham-400' }, 'View'), h('dd', { className: 'text-cham-50 font-semibold tabular-nums' }, N(v.views))),
          h('div', null, h('dt', { className: 'text-cham-400' }, v.vph != null ? 'View/giờ' : p.ratioLabel || ''), h('dd', { className: 'text-hoe-300 font-semibold tabular-nums' }, v.vph != null ? N(v.vph) : fmtX(ratio))),
          h('div', { className: 'text-right' }, h('dt', { className: 'text-cham-400' }, 'Đăng'), h('dd', { className: 'text-cham-200 tabular-nums' }, v.t ? U.ago(v.t) : v.savedAt ? U.date(v.savedAt) : '–'))),
        v.note && h('div', { className: 'text-[10.5px] text-hoaca-200 line-clamp-2' }, 'Ghi chú: ' + v.note),
        h('div', { className: 'flex gap-1.5 pt-1.5' }, p.actions ? p.actions(v) : [
          h(Btn, { key: 's', small: true, on: sv, onClick: function () { store.toggleSave(v); } }, sv ? 'Đã lưu' : 'Lưu'),
          v.channelId && h(Btn, { key: 'f', small: true, onClick: function () { followChannel(v.channelId, v.channel); } }, 'Theo dõi'),
          p.onChannel && v.channelId && h(Btn, { key: 'c', small: true, onClick: function () { p.onChannel(v.channelId); } }, 'Kênh')
        ])));
  }
  // p: rows, cols (bảng), sorts [[key,label,fn]], ratio(v), ratioLabel, onChannel, actions, tools (nút thêm bên phải)
  function VideoList(p) {
    useBus('saved');
    var s0 = useState(st.get('yt4_view') || 'card'), view = s0[0], setView = s0[1];
    var s1 = useState(p.defSort || (p.sorts && p.sorts[0][0])), sort = s1[0], setSort = s1[1], s2 = useState(p.step || 24), lim = s2[0], setLim = s2[1];
    useEffect(function () { setLim(p.step || 24); }, [p.rows]);
    var rows = useMemo(function () { var S = (p.sorts || []).find(function (x) { return x[0] === sort; }); return S ? p.rows.slice().sort(function (a, b) { return S[2](b) - S[2](a); }) : p.rows; }, [p.rows, sort]);
    return h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-center gap-2' }, p.left,
        h('span', { className: 'flex-1' }),
        view === 'card' && p.sorts && h('div', { className: 'w-44' }, h(Select, { value: sort, onChange: setSort, className: 'h-7 text-[10.5px]', options: p.sorts.map(function (x) { return [x[0], 'Xếp: ' + x[1]]; }) })),
        h(Seg, { value: view, onChange: function (v) { setView(v); st.set('yt4_view', v); }, options: [['card', 'Thẻ'], ['table', 'Bảng']] }), p.tools),
      !rows.length ? h(Empty, { title: p.empty || 'Không có video' })
        : view === 'card' ? h(Frag, null, h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' }, rows.slice(0, lim).map(function (v) { return h(VideoCard, { key: v.id, v: v, ratio: p.ratio, ratioLabel: p.ratioLabel, hotAt: p.hotAt, onChannel: p.onChannel, actions: p.actions }); })), h(More, { total: rows.length, lim: lim, setLim: setLim, step: p.step || 24 }))
          : h(Frag, null, h(Table, { cols: p.cols, rows: rows, rowKey: function (v) { return v.id; }, limit: lim }), h(More, { total: rows.length, lim: lim, setLim: setLim, step: p.step || 24 })));
  }

  // ---------- Hộp gửi Claude: copy prompt sang claude.ai, hoặc viết ngay bằng Claude API; lưu thành bản phân tích trong Dự án ----------
  // p: title, kind ('clone'|'niche'|'compare'|'titles'), prompt (chuỗi), system, brief (bản đã lưu để mở lại), meta
  function ClaudeBox(p) {
    useBus('projects'); useBus('claude');
    var b0 = p.brief || {};
    var s0 = useState(b0.text || ''), out = s0[0], setOut = s0[1], s1 = useState(false), busy = s1[0], setBusy = s1[1], s2 = useState(''), err = s2[0], setErr = s2[1];
    var s3 = useState(b0.pid || ''), pid = s3[0], setPid = s3[1], s4 = useState(b0.id || ''), bid = s4[0], setBid = s4[1], s5 = useState(b0.stop || ''), stop = s5[0], setStop = s5[1];
    var ctl = useRef(null), prompt = p.prompt || b0.prompt || '', projects = store.projects(), pj = projects.find(function (x) { return x.id === pid; }), cfg = Y.claude.cfg();
    function save(text, st2, quiet) { var b = store.saveBrief({ id: bid || undefined, kind: p.kind || b0.kind || 'note', title: p.title || b0.title || 'Bản phân tích', prompt: prompt, text: text != null ? text : out, pid: pid, stop: st2 != null ? st2 : stop, meta: p.meta || b0.meta || null, at: Date.now() }); setBid(b.id); if (!quiet) toast(pid ? 'Đã lưu vào dự án' : 'Đã lưu (xem ở Tạo tài nguyên → Dự án & Claude)'); return b; }
    function copyOpen() { U.copy(prompt).then(function () { toast('Đã copy prompt (' + N(prompt.length) + ' ký tự). Dán vào Claude.'); }).catch(function () { toast('Trình duyệt chặn copy, dùng nút Tải .md'); }); window.open((pj && pj.claudeUrl) || 'https://claude.ai/new', '_blank', 'noopener'); }
    async function write() {
      setErr(''); setOut(''); setBusy(true); ctl.current = new AbortController();
      try { var res = await Y.claude.stream({ prompt: prompt, signal: ctl.current.signal, system: p.system || 'Bạn là chuyên gia chiến lược nội dung YouTube. Chỉ dựa trên số liệu được cung cấp, không bịa số. Trả lời bằng tiếng Việt, Markdown, cụ thể và làm được ngay.', onText: function (_, full) { setOut(full); } }); setStop(res.stop || ''); save(res.text, res.stop || '', true); toast(res.stop === 'max_tokens' ? 'Claude dừng vì chạm giới hạn độ dài.' : 'Claude đã viết xong, đã lưu.'); }
      catch (e) { if (e.name !== 'AbortError') setErr(e.message); }
      setBusy(false);
    }
    return h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h(Btn, { primary: true, onClick: copyOpen }, 'Copy prompt & mở ' + (pj && pj.claudeUrl ? 'Project claude.ai' : 'claude.ai')),
        h(Btn, { onClick: write, disabled: busy || !Y.claude.ready(), title: Y.claude.ready() ? '' : 'Thêm Claude API key trong Cài đặt' }, busy ? 'Claude đang viết…' : 'Viết ngay bằng Claude API'),
        busy && h(Btn, { small: true, onClick: function () { ctl.current && ctl.current.abort(); } }, 'Dừng'),
        h(Btn, { small: true, onClick: function () { U.download((p.file || 'prompt') + '.md', new Blob([prompt], { type: 'text/markdown' })); } }, 'Tải prompt .md'),
        h('span', { className: 'flex-1' }),
        h('div', { className: 'w-44' }, h(Select, { value: pid, onChange: setPid, className: 'h-7', options: [['', 'Chưa gắn dự án']].concat(projects.map(function (x) { return [x.id, x.name]; })) })),
        h(Btn, { small: true, on: !!bid, onClick: function () { save(); } }, bid ? 'Đã lưu · lưu lại' : 'Lưu vào Dự án')),
      h('div', { className: 'text-[11px] text-cham-400' }, N(prompt.length) + ' ký tự' + (Y.claude.ready() ? ' · ' + cfg.model : ' · chưa có Claude API key (Cài đặt → Claude) nên chỉ copy được prompt')),
      err && h(Note, { error: true }, err),
      (busy || out) && h(Section, { title: busy ? 'Claude đang viết…' : 'Kết quả từ Claude', right: !busy && out && h('div', { className: 'flex gap-1.5' }, h(Btn, { small: true, onClick: function () { U.copy(out).then(function () { toast('Đã copy'); }); } }, 'Copy'), h(Btn, { small: true, onClick: function () { U.download((p.file || 'ket-qua') + '-claude.md', new Blob([out], { type: 'text/markdown' })); } }, 'Tải .md')) },
        h('pre', { className: 'whitespace-pre-wrap text-[11.5px] leading-relaxed text-cham-100 font-sans max-h-[65vh] overflow-y-auto' }, out || '…')),
      h('details', { className: cx(C.card, 'p-3') }, h('summary', { className: 'cursor-pointer text-[11px] text-cham-300' }, 'Xem toàn bộ prompt'), h('pre', { className: 'mt-3 whitespace-pre-wrap text-[11px] text-cham-400 max-h-[50vh] overflow-y-auto' }, prompt)));
  }

  // ---------- Hướng dẫn nhanh: hiện lần đầu, bấm "Đã hiểu" để ẩn, nút "Hướng dẫn" để xem lại ----------
  function Help(p) {
    var key = 'yt4_help_open_' + p.id, s = useState(st.get(key) === '1'), open = s[0], set = s[1];
    if (!open) return h('div', { className: 'relative h-0 z-10' }, h('button', { onClick: function () { set(true); st.set(key, '1'); }, className: 'absolute right-0 top-0 h-8 px-3 rounded-full bg-[#323232] text-[12px] font-medium text-[#f1f1f1] hover:bg-[#424242] cursor-pointer' }, 'Hướng dẫn'));
    return h('div', { className: 'yt-card border-nhat-600/50 p-4' },
      h('div', { className: 'flex items-start justify-between gap-3' },
        h('h2', { className: 'text-[11px] font-semibold text-cham-50' }, p.title || 'Cách dùng'),
        h('button', { onClick: function () { set(false); st.del(key); }, className: C.sm }, 'Ẩn hướng dẫn')),
      h('ol', { className: 'mt-3 grid gap-x-5 gap-y-2.5 ' + (['', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'][Math.min(4, p.steps.length)]) }, p.steps.map(function (x, i) {
        return h('li', { key: i, className: 'flex gap-2.5 text-[10.5px] text-cham-200 leading-relaxed' }, h('span', { className: 'shrink-0 w-5 h-5 rounded-md bg-nhat-800 text-nhat-100 text-[11px] font-semibold flex items-center justify-center mt-0.5 tabular-nums' }, i + 1), h('span', null, x));
      })),
      p.terms && h('dl', { className: 'mt-3 pt-3 border-t border-cham-800 grid gap-x-6 gap-y-1.5 md:grid-cols-2' }, p.terms.map(function (t) { return h('div', { key: t[0], className: 'text-[10.5px] text-cham-300' }, h('dt', { className: 'inline text-hoe-300 font-semibold' }, t[0] + ': '), h('dd', { className: 'inline' }, t[1])); })));
  }

  window.YT4UI = { ClaudeBox: ClaudeBox, Icon: Icon, Help: Help, VideoList: VideoList, VideoCard: VideoCard, C: C, Btn: Btn, Field: Field, Input: Input, Select: Select, Seg: Seg, Tabs: Tabs, Stat: Stat, Empty: Empty, Note: Note, Busy: Busy, Bar: Bar, Section: Section, Modal: Modal, Table: Table, More: More, Thumb: Thumb, useBus: useBus, useLS: useLS, Toaster: Toaster, toast: toast, Mono: Mono, Missing: Missing, followChannel: followChannel, titlePatterns: titlePatterns, PatternView: PatternView, InsightBox: InsightBox, words: words, STOP: STOP, TITLE_FEATS: TITLE_FEATS, cx: cx };
})();
