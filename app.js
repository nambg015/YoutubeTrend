// =========================================================================
// YOUTREND v4 — GIAO DIỆN (app.js)
// Web riêng của admin. 6 mục: Khám phá • Top Ngách • Kênh • Tạo tài nguyên • Thư viện • Cài đặt
// Tối giản trắng-đen, không icon. Cần core.js nạp trước.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store;
  var cx = function () { return Array.prototype.filter.call(arguments, Boolean).join(' '); };

  // ===================== THÀNH PHẦN GIAO DIỆN =====================
  var C = {
    btn: 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-md border border-zinc-700 bg-[#0a0f17]/80 text-[13px] text-zinc-200 hover:border-zinc-600 hover:text-white transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
    pri: 'inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-md bg-emerald-400 text-emerald-950 text-[13px] font-medium hover:bg-emerald-300 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap',
    sm: 'inline-flex items-center justify-center h-7 px-2.5 rounded border border-zinc-700 bg-[#0a0f17]/80 text-[11px] text-zinc-300 hover:border-zinc-600 hover:text-white transition disabled:opacity-40 cursor-pointer whitespace-nowrap',
    smOn: 'inline-flex items-center justify-center h-7 px-2.5 rounded border border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-200 cursor-pointer whitespace-nowrap',
    input: 'h-9 px-3 rounded-md bg-[#05080d]/90 border border-zinc-700 text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500/60 outline-none transition w-full',
    select: 'h-9 px-2.5 rounded-md bg-[#05080d] border border-zinc-700 text-[13px] text-zinc-200 focus:border-zinc-500 outline-none cursor-pointer w-full',
    card: 'rounded-xl border border-white/[0.11] bg-[#0a0f17]/[0.93] backdrop-blur-md shadow-[0_10px_34px_rgba(0,0,0,.35)]',
    label: 'block text-[11px] uppercase tracking-wider text-zinc-300/80 mb-1.5',
    link: 'text-zinc-200 hover:text-white underline decoration-zinc-700 underline-offset-2 hover:decoration-zinc-400'
  };
  function Btn(p) { return h('button', { type: p.type || 'button', onClick: p.onClick, disabled: p.disabled, title: p.title, className: cx(p.primary ? C.pri : p.small ? (p.on ? C.smOn : C.sm) : C.btn, p.className) }, p.children); }
  function Field(p) { return h('label', { className: cx('block min-w-0', p.className) }, p.label && h('span', { className: C.label }, p.label), p.children); }
  function Input(p) { return h('input', Object.assign({}, p, { className: cx(C.input, p.className) })); }
  function Select(p) { return h('select', { value: p.value, onChange: function (e) { p.onChange(e.target.value); }, className: cx(C.select, p.className) }, p.options.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); }
  function Seg(p) { return h('div', { className: 'inline-flex flex-wrap rounded-md border border-zinc-700 bg-[#05080d]/80 p-0.5' }, p.options.map(function (o) { var on = String(p.value) === String(o[0]); return h('button', { key: o[0], type: 'button', onClick: function () { p.onChange(o[0]); }, className: cx('h-7 px-3 rounded text-[12px] whitespace-nowrap transition cursor-pointer', on ? 'bg-emerald-500/20 text-emerald-100' : 'text-zinc-300 hover:text-white') }, o[1]); })); }
  function Tabs(p) { return h('div', { className: cx('flex gap-6 border-b border-zinc-800/80 overflow-x-auto no-scrollbar', p.className) }, p.items.map(function (t) { var on = p.value === t[0]; return h('button', { key: t[0], type: 'button', onClick: function () { p.onChange(t[0]); }, className: cx('relative h-10 text-[13px] whitespace-nowrap cursor-pointer transition', on ? 'text-white' : 'text-zinc-400 hover:text-zinc-200') }, t[1], t[2] != null ? h('span', { className: 'ml-1.5 text-[11px] text-zinc-500' }, t[2]) : null, on && h('span', { className: 'absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-sky-400' })); })); }
  var TONE = { emerald: 'text-emerald-300', sky: 'text-sky-300', amber: 'text-amber-200', violet: 'text-violet-300', rose: 'text-rose-300' };
  function Stat(p) { return h('div', { className: cx('min-w-0', p.className) }, h('div', { className: 'text-[11px] text-zinc-400 truncate' }, p.label), h('div', { className: cx('mt-0.5 font-medium tracking-tight truncate', p.big ? 'text-2xl' : 'text-[15px]', TONE[p.tone] || (p.big ? 'text-white' : 'text-zinc-100')) }, p.value), p.sub && h('div', { className: 'text-[11px] text-zinc-500 truncate' }, p.sub)); }
  function Empty(p) { return h('div', { className: 'py-16 text-center' }, h('div', { className: 'text-[13px] text-zinc-300' }, p.title), p.sub && h('div', { className: 'mt-1 text-[12px] text-zinc-500 max-w-md mx-auto' }, p.sub), p.children && h('div', { className: 'mt-4' }, p.children)); }
  function Note(p) { return h('div', { className: cx('rounded-md border px-3 py-2 text-[12px]', p.error ? 'border-rose-500/30 bg-rose-500/5 text-rose-200' : 'border-sky-500/20 bg-sky-500/5 text-sky-100/80', p.className) }, p.children); }
  function Busy(p) { return h('div', { className: 'flex items-center gap-2 text-[12px] text-zinc-400' }, h('span', { className: 'inline-block w-3 h-3 rounded-full border border-zinc-600 border-t-emerald-400 animate-spin' }), p.children); }
  function Bar(p) { return h('div', { className: 'h-1 rounded-full bg-zinc-900 overflow-hidden' }, h('div', { className: 'h-full rounded-full bg-gradient-to-r from-emerald-500/70 to-emerald-300', style: { width: Math.max(2, Math.min(100, p.value)) + '%' } })); }
  function Section(p) { return h('section', { className: cx(C.card, 'p-4', p.className) }, (p.title || p.right) && h('div', { className: 'flex items-center justify-between gap-3 mb-3' }, h('div', null, h('div', { className: 'text-[13px] font-medium text-white' }, p.title), p.sub && h('div', { className: 'text-[11px] text-zinc-400 mt-0.5' }, p.sub)), p.right), p.children); }
  function Modal(p) {
    useEffect(function () { var f = function (e) { if (e.key === 'Escape') p.onClose(); }; window.addEventListener('keydown', f); return function () { window.removeEventListener('keydown', f); }; }, []);
    return h('div', { className: 'fixed inset-0 z-50 bg-black/80 flex items-start justify-center p-4 overflow-y-auto', onMouseDown: function (e) { if (e.target === e.currentTarget) p.onClose(); } },
      h('div', { className: cx('w-full mt-12 rounded-lg border border-zinc-800 bg-[#0a0a0a] p-5', p.wide ? 'max-w-3xl' : 'max-w-lg') },
        h('div', { className: 'flex items-center justify-between mb-4' }, h('div', { className: 'text-[15px] font-medium text-white' }, p.title), h('button', { onClick: p.onClose, className: 'text-[12px] text-zinc-400 hover:text-white cursor-pointer' }, 'Đóng')), p.children));
  }
  // Bảng có sắp xếp
  function Table(p) {
    var s = useState(p.sort || null), sort = s[0], setSort = s[1];
    var rows = useMemo(function () { if (!sort) return p.rows; var col = p.cols.find(function (c) { return c.k === sort.k; }); if (!col || !col.v) return p.rows; return p.rows.slice().sort(function (a, b) { var x = col.v(a), y = col.v(b); return (x > y ? 1 : x < y ? -1 : 0) * (sort.d); }); }, [p.rows, sort]);
    var lim = p.limit || rows.length;
    return h('div', { className: 'overflow-x-auto' }, h('table', { className: 'w-full text-[12px] border-collapse' },
      h('thead', null, h('tr', { className: 'border-b border-zinc-800' }, p.cols.map(function (c) {
        var on = sort && sort.k === c.k;
        return h('th', { key: c.k, onClick: c.v ? function () { setSort({ k: c.k, d: on ? -sort.d : -1 }); } : null, className: cx('py-2 px-2 font-normal text-zinc-400 whitespace-nowrap select-none', c.right ? 'text-right' : 'text-left', c.v && 'cursor-pointer hover:text-zinc-200', c.w) }, c.t, on ? (sort.d < 0 ? ' ↓' : ' ↑') : '');
      }))),
      h('tbody', null, rows.slice(0, lim).map(function (r, i) { return h('tr', { key: p.rowKey ? p.rowKey(r) : i, className: 'border-b border-zinc-900 hover:bg-zinc-900/40' }, p.cols.map(function (c) { return h('td', { key: c.k, className: cx('py-2 px-2 align-middle', c.right && 'text-right tabular-nums', c.cls) }, c.r ? c.r(r, i) : c.v(r)); })); }))));
  }
  function More(p) { if (p.total <= p.lim) return null; return h('div', { className: 'pt-3 flex gap-2 justify-center' }, h(Btn, { small: true, onClick: function () { p.setLim(p.lim + p.step); } }, 'Xem thêm ' + Math.min(p.step, p.total - p.lim)), h(Btn, { small: true, onClick: function () { p.setLim(p.total); } }, 'Hiện hết ' + p.total)); }
  function Thumb(p) { return h('a', { href: U.vurl(p.id), target: '_blank', rel: 'noopener noreferrer', className: cx('block shrink-0 overflow-hidden rounded bg-zinc-900', p.className || 'w-24') }, h('img', { src: U.thumb(p.id), loading: 'lazy', className: 'w-full aspect-video object-cover' })); }
  function useBus(ev) { var s = useState(0); useEffect(function () { return Y.on(ev, function () { s[1](function (n) { return n + 1; }); }); }, [ev]); return s[0]; }
  function useLS(key, def) { var s = useState(function () { return st.json(key, def); }); return [s[0], function (v) { var n = typeof v === 'function' ? v(s[0]) : v; s[1](n); st.put(key, n); }]; }

  // toast
  var toastFn = function () { };
  function Toaster() {
    var s = useState([]), list = s[0], set = s[1];
    useEffect(function () { toastFn = function (m) { var id = Math.random(); set(function (l) { return l.concat([{ id: id, m: String(m) }]); }); setTimeout(function () { set(function (l) { return l.filter(function (x) { return x.id !== id; }); }); }, 3500); }; }, []);
    return h('div', { className: 'fixed bottom-4 right-4 z-[70] space-y-2 max-w-sm' }, list.map(function (t) { return h('div', { key: t.id, className: 'rounded-lg border border-emerald-500/30 bg-[#0f1714] px-3.5 py-2.5 text-[12px] text-emerald-50 shadow-2xl' }, t.m); }));
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
  // Khuôn tiêu đề: so đặc điểm tiêu đề nhóm thắng (top 25% outlier) với phần còn lại
  function titlePatterns(vids, score) {
    if (!vids.length) return null;
    var sorted = vids.slice().sort(function (a, b) { return score(b) - score(a); }), k = Math.max(3, Math.ceil(sorted.length / 4));
    var win = sorted.slice(0, k), rest = sorted.slice(k);
    var feats = [
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
    var rate = function (arr, f) { return arr.length ? arr.filter(function (v) { return f(v.title); }).length / arr.length : 0; };
    var rows = feats.map(function (x) { var a = rate(win, x[1]), b = rate(rest, x[1]); return { name: x[0], win: a, rest: b, lift: a - b }; }).sort(function (a, b) { return b.lift - a.lift; });
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
          return h('div', { key: r.name, className: 'grid grid-cols-[1fr_60px_60px_56px] items-center gap-2 text-[12px]' },
            h('span', { className: 'text-zinc-300' }, r.name), h('span', { className: 'text-right tabular-nums text-white' }, Math.round(r.win * 100) + '%'), h('span', { className: 'text-right tabular-nums text-zinc-400' }, Math.round(r.rest * 100) + '%'),
            h('span', { className: cx('text-right tabular-nums', r.lift > 0.1 ? 'text-emerald-300' : r.lift < -0.1 ? 'text-zinc-500' : 'text-zinc-400') }, (r.lift > 0 ? '+' : '') + Math.round(r.lift * 100)));
        }), h('div', { className: 'grid grid-cols-[1fr_60px_60px_56px] gap-2 text-[10px] text-zinc-500 pt-1' }, h('span'), h('span', { className: 'text-right' }, 'Nhóm thắng'), h('span', { className: 'text-right' }, 'Còn lại'), h('span', { className: 'text-right' }, 'Chênh')),
        h('div', { className: 'text-[12px] text-zinc-400 pt-2 border-t border-zinc-900' }, 'Độ dài tiêu đề trung vị: nhóm thắng ' + P.lenWin + ' ký tự, còn lại ' + P.lenRest + ' ký tự.'))),
      h('div', { className: 'space-y-4' },
        h(Section, { title: 'Từ khoá lặp lại trong tiêu đề thắng' }, P.hooks.length ? h('div', { className: 'flex flex-wrap gap-1.5' }, P.hooks.map(function (x) { return h('span', { key: x[0], className: 'px-2 py-1 rounded border border-zinc-800 text-[12px] text-zinc-300' }, x[0], h('span', { className: 'ml-1.5 text-zinc-500' }, x[1])); })) : h('div', { className: 'text-[12px] text-zinc-500' }, 'Không có từ lặp lại đủ nhiều.')),
        h(Section, { title: 'Cách mở đầu tiêu đề hay gặp' }, P.openers.length ? h('div', { className: 'space-y-1' }, P.openers.map(function (x) { return h('div', { key: x[0], className: 'flex justify-between text-[12px]' }, h('span', { className: 'text-zinc-300' }, '"' + x[0] + ' …"'), h('span', { className: 'text-zinc-500' }, x[1] + ' video')); })) : h('div', { className: 'text-[12px] text-zinc-500' }, 'Không có cách mở đầu lặp lại.')),
        h(Section, { title: 'Tiêu đề nhóm thắng' }, h('div', { className: 'space-y-1.5 max-h-80 overflow-y-auto pr-1' }, P.win.slice(0, 25).map(function (v) { return h('div', { key: v.id, className: 'text-[12px] text-zinc-300 leading-snug' }, h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'hover:text-white' }, v.title)); })))));
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
    var list = function (t, a) { return a && a.length ? h(Section, { title: t }, h('ul', { className: 'space-y-1.5' }, a.map(function (x, i) { return h('li', { key: i, className: 'text-[12px] text-zinc-300 leading-relaxed pl-3 relative' }, h('span', { className: 'absolute left-0 text-zinc-500' }, '–'), x); }))) : null; };
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex flex-wrap items-center gap-3' }, h(Btn, { primary: !res, onClick: run, disabled: busy }, busy ? 'Đang phân tích…' : res ? 'Phân tích lại' : 'Phân tích bằng AI'), h('span', { className: 'text-[11px] text-zinc-500' }, 'Gemini đọc số liệu thật vừa đo (không bịa thêm số), 1 lượt AI.')),
      err && h(Note, { error: true }, err),
      res && h(Frag, null,
        h('div', { className: cx(C.card, 'p-4') }, h('div', { className: 'text-[11px] uppercase tracking-wider text-zinc-400' }, 'Kết luận'), h('div', { className: cx('mt-1 text-lg', res.verdict === 'nen_lam' ? 'text-emerald-300' : res.verdict === 'bao_hoa' ? 'text-rose-300' : 'text-amber-200') }, V[res.verdict] || res.verdict), h('div', { className: 'mt-1 text-[13px] text-zinc-300 leading-relaxed' }, res.verdict_text)),
        h('div', { className: 'grid gap-4 lg:grid-cols-2' }, list('Lý do', res.why), list('Điểm chung của video thắng', res.patterns)),
        res.angles && res.angles.length > 0 && h(Section, { title: 'Ý tưởng video' }, h('div', { className: 'divide-y divide-zinc-900' }, res.angles.map(function (a, i) {
          return h('div', { key: i, className: 'py-2 flex items-start justify-between gap-3' }, h('div', { className: 'min-w-0' }, h('div', { className: 'text-[13px] text-white' }, a.title), h('div', { className: 'text-[12px] text-zinc-400' }, a.why)),
            h(Btn, { small: true, onClick: function () { store.addIdea({ title: a.title, topic: p.topic || '', angle: a.why || '', whyTry: 'Từ AI nhận định: ' + (p.topic || '') }); toast('Đã thêm vào Kế hoạch video'); } }, 'Thêm vào kế hoạch'));
        }))),
        res.keywords && res.keywords.length > 0 && h(Section, { title: 'Từ khoá nên nhắm' }, h('div', { className: 'flex flex-wrap gap-1.5' }, res.keywords.map(function (k) { return h('button', { key: k, onClick: function () { p.onKeyword && p.onKeyword(k); }, className: 'px-2 py-1 rounded border border-zinc-800 text-[12px] text-zinc-300 hover:border-zinc-500 hover:text-white cursor-pointer' }, k); }))),
        h('div', { className: 'grid gap-4 lg:grid-cols-2' }, list('Rủi ro', res.risks), list('Kế hoạch 2 tuần', res.plan))));
  }

  // ---------- Danh sách video: dạng thẻ (mặc định) hoặc bảng ----------
  function fmtX(x) { return x == null ? '' : '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); }
  function VideoCard(p) {
    var v = p.v, ratio = p.ratio ? p.ratio(v) : null, sv = store.isSaved(v.id), sub = v.subs;
    var hot = ratio != null && ratio >= (p.hotAt || 5);
    return h('div', { className: cx('group rounded-xl overflow-hidden border bg-[#0a0f17]/[0.94] backdrop-blur-md flex flex-col transition hover:-translate-y-0.5', hot ? 'border-emerald-500/40 hover:border-emerald-400/70' : 'border-white/[0.11] hover:border-sky-400/40') },
      h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'relative block bg-zinc-900' },
        h('img', { src: U.thumb(v.id), loading: 'lazy', className: 'w-full aspect-video object-cover group-hover:brightness-110 transition' }),
        sub != null && h('span', { className: 'absolute top-2 left-2 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/75 text-white backdrop-blur' }, N(sub) + ' sub'),
        ratio != null && h('span', { className: cx('absolute top-2 right-2 text-[11px] font-semibold px-1.5 py-0.5 rounded-md', hot ? 'bg-emerald-400 text-emerald-950' : ratio >= 2 ? 'bg-sky-400/90 text-sky-950' : 'bg-black/75 text-zinc-200') }, fmtX(ratio)),
        v.dur > 0 && h('span', { className: 'absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded-md bg-black/75 text-white' }, v.dur <= 180 ? 'Shorts ' + U.dur(v.dur) : U.dur(v.dur))),
      h('div', { className: 'p-3 flex-1 flex flex-col gap-2' },
        h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', title: v.title, className: 'text-[13px] leading-snug text-zinc-100 hover:text-white line-clamp-2' }, v.title),
        h('button', { onClick: function () { p.onChannel && v.channelId && p.onChannel(v.channelId); }, className: 'text-left text-[11px] text-zinc-400 hover:text-sky-300 truncate cursor-pointer' }, v.channel || ''),
        h('div', { className: 'grid grid-cols-3 gap-1 text-[11px] mt-auto' },
          h('div', null, h('div', { className: 'text-zinc-500' }, 'View'), h('div', { className: 'text-sky-300 font-medium' }, N(v.views))),
          h('div', null, h('div', { className: 'text-zinc-500' }, v.vph != null ? 'View/giờ' : p.ratioLabel || ''), h('div', { className: 'text-amber-200 font-medium' }, v.vph != null ? N(v.vph) : fmtX(ratio))),
          h('div', { className: 'text-right' }, h('div', { className: 'text-zinc-500' }, 'Đăng'), h('div', { className: 'text-zinc-300' }, v.t ? U.ago(v.t) : v.savedAt ? U.date(v.savedAt) : '–'))),
        v.note && h('div', { className: 'text-[11px] text-violet-200/80 line-clamp-2' }, 'Ghi chú: ' + v.note),
        h('div', { className: 'flex gap-1.5 pt-1' }, p.actions ? p.actions(v) : [
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
        view === 'card' && p.sorts && h('div', { className: 'w-44' }, h(Select, { value: sort, onChange: setSort, className: 'h-8 text-[12px]', options: p.sorts.map(function (x) { return [x[0], 'Xếp: ' + x[1]]; }) })),
        h(Seg, { value: view, onChange: function (v) { setView(v); st.set('yt4_view', v); }, options: [['card', 'Thẻ'], ['table', 'Bảng']] }), p.tools),
      !rows.length ? h(Empty, { title: p.empty || 'Không có video' })
        : view === 'card' ? h(Frag, null, h('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' }, rows.slice(0, lim).map(function (v) { return h(VideoCard, { key: v.id, v: v, ratio: p.ratio, ratioLabel: p.ratioLabel, hotAt: p.hotAt, onChannel: p.onChannel, actions: p.actions }); })), h(More, { total: rows.length, lim: lim, setLim: setLim, step: p.step || 24 }))
          : h(Frag, null, h(Table, { cols: p.cols, rows: rows, rowKey: function (v) { return v.id; }, limit: lim }), h(More, { total: rows.length, lim: lim, setLim: setLim, step: p.step || 24 })));
  }

  // ---------- Hướng dẫn nhanh: hiện lần đầu, bấm "Đã hiểu" để ẩn, nút "Hướng dẫn" để xem lại ----------
  function Help(p) {
    var key = 'yt4_help_' + p.id, s = useState(st.get(key) !== '1'), open = s[0], set = s[1];
    if (!open) return h('div', { className: 'flex justify-end -mb-2' }, h('button', { onClick: function () { set(true); st.del(key); }, className: 'text-[12px] text-sky-300/90 hover:text-sky-200 cursor-pointer' }, 'Hướng dẫn mục này'));
    return h('div', { className: 'rounded-xl border border-sky-400/25 bg-[#081420]/[0.94] p-4' },
      h('div', { className: 'flex items-start justify-between gap-3' },
        h('div', { className: 'text-[13px] font-medium text-sky-100' }, p.title || 'Cách dùng'),
        h('button', { onClick: function () { set(false); st.set(key, '1'); }, className: 'shrink-0 h-7 px-3 rounded-md bg-sky-400/15 border border-sky-400/30 text-[12px] text-sky-100 hover:bg-sky-400/25 cursor-pointer' }, 'Đã hiểu, ẩn đi')),
      h('ol', { className: 'mt-3 grid gap-2 ' + (['', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4'][Math.min(4, p.steps.length)]) }, p.steps.map(function (x, i) {
        return h('li', { key: i, className: 'flex gap-2.5 text-[12.5px] text-zinc-200 leading-relaxed' }, h('span', { className: 'shrink-0 w-5 h-5 rounded-full bg-sky-400/20 text-sky-200 text-[11px] flex items-center justify-center mt-0.5' }, i + 1), h('span', null, x));
      })),
      p.terms && h('div', { className: 'mt-3 pt-3 border-t border-white/[0.07] grid gap-x-6 gap-y-1.5 md:grid-cols-2' }, p.terms.map(function (t) { return h('div', { key: t[0], className: 'text-[12px] text-zinc-300' }, h('span', { className: 'text-emerald-300 font-medium' }, t[0] + ': '), t[1]); })));
  }

  window.YT4UI = { Help: Help, VideoList: VideoList, VideoCard: VideoCard, C: C, Btn: Btn, Field: Field, Input: Input, Select: Select, Seg: Seg, Tabs: Tabs, Stat: Stat, Empty: Empty, Note: Note, Busy: Busy, Bar: Bar, Section: Section, Modal: Modal, Table: Table, More: More, Thumb: Thumb, useBus: useBus, useLS: useLS, Toaster: Toaster, toast: toast, Mono: Mono, Missing: Missing, followChannel: followChannel, titlePatterns: titlePatterns, PatternView: PatternView, InsightBox: InsightBox, words: words, STOP: STOP, cx: cx };
})();
