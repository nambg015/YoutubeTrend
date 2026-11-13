// =========================================================================
// YOUTREND v4 — THƯ VIỆN (Video đã lưu + Kế hoạch video + Cẩm nang) và CÀI ĐẶT
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Tabs = K.Tabs, Stat = K.Stat, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Section = K.Section, Table = K.Table, Thumb = K.Thumb, Modal = K.Modal;

  // ---------- Video đã lưu ----------
  function Saved(p) {
    K.useBus('saved');
    var all = store.saved(), s0 = useState(''), q = s0[0], setQ = s0[1], s1 = useState(null), edit = s1[0], setEdit = s1[1];
    var list = all.filter(function (v) { return !q || (v.title + ' ' + v.channel + ' ' + (v.note || '')).toLowerCase().indexOf(q.toLowerCase()) >= 0; });
    var cols = [
      { k: 'th', t: '', r: function (v) { return h(Thumb, { id: v.id, className: 'w-28' }); } },
      { k: 'title', t: 'Video', cls: 'min-w-[260px]', v: function (v) { return v.title; }, r: function (v) { return h('div', null, h('a', { href: U.vurl(v.id), target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-zinc-100 hover:text-cham-50 line-clamp-2' }, v.title), h('button', { onClick: function () { v.channelId && p.goto('channels', { analyze: v.channelId }); }, className: 'text-[11px] text-zinc-400 hover:text-cham-50 cursor-pointer' }, v.channel + (v.subs != null ? ' · ' + N(v.subs) + ' sub' : '')), v.note && h('div', { className: 'text-[11px] text-zinc-400 mt-0.5' }, 'Ghi chú: ' + v.note)); } },
      { k: 'views', t: 'View (lúc lưu)', right: true, v: function (v) { return v.views || 0; }, r: function (v) { return N(v.views); } },
      { k: 'dur', t: 'Dài', right: true, v: function (v) { return v.dur || 0; }, r: function (v) { return v.dur ? U.dur(v.dur) : '–'; } },
      { k: 'savedAt', t: 'Lưu lúc', right: true, v: function (v) { return v.savedAt || 0; }, r: function (v) { return v.savedAt ? U.date(v.savedAt) : '–'; } },
      { k: 'a', t: '', r: function (v) { return h('div', { className: 'flex gap-1 justify-end' }, h(Btn, { small: true, onClick: function () { setEdit(v); } }, 'Ghi chú'), h(Btn, { small: true, onClick: function () { store.addIdea({ title: v.title, topic: v.channel, angle: v.note || '', whyTry: 'Lấy cảm hứng từ ' + U.vurl(v.id) }); K.toast('Đã thêm vào Kế hoạch video'); } }, 'Thành ý tưởng'), h(Btn, { small: true, onClick: function () { store.toggleSave(v); } }, 'Xoá')); } }
    ];
    return h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap gap-2' }, h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: 'Lọc theo tiêu đề, kênh, ghi chú', className: 'max-w-sm' }), h('span', { className: 'flex-1' }),
        h(Btn, { small: true, onClick: function () { U.csv('video-da-luu', [['Tiêu đề', 'Link', 'Kênh', 'View', 'Thời lượng', 'Ghi chú', 'Ngày lưu']].concat(list.map(function (v) { return [v.title, U.vurl(v.id), v.channel, v.views, v.dur ? U.dur(v.dur) : '', v.note || '', v.savedAt ? U.date(v.savedAt) : '']; }))); } }, 'Xuất CSV')),
      !all.length ? h(Empty, { title: 'Chưa lưu video nào', sub: 'Bấm "Lưu" ở bất kỳ danh sách video nào trong Khám phá, Top Ngách hoặc Kênh.' }) : h(K.VideoList, { rows: list, cols: cols, defSort: 'savedAt', sorts: [['savedAt', 'Lưu gần nhất', function (v) { return v.savedAt || 0; }], ['views', 'View cao nhất', function (v) { return v.views || 0; }]], onChannel: function (id) { p.goto('channels', { analyze: id }); }, actions: function (v) { return [h(Btn, { key: 'n', small: true, onClick: function () { setEdit(v); } }, 'Ghi chú'), h(Btn, { key: 'i', small: true, onClick: function () { store.addIdea({ title: v.title, topic: v.channel, angle: v.note || '', whyTry: 'Lấy cảm hứng từ ' + U.vurl(v.id) }); K.toast('Đã thêm vào Kế hoạch video'); } }, 'Thành ý tưởng'), h(Btn, { key: 'x', small: true, onClick: function () { store.toggleSave(v); } }, 'Xoá')]; } }),
      edit && h(NoteModal, { v: edit, onClose: function () { setEdit(null); } }));
  }
  function NoteModal(p) {
    var s = useState(p.v.note || ''), t = s[0], set = s[1];
    return h(Modal, { title: 'Ghi chú cho video', onClose: p.onClose }, h('div', { className: 'text-[10.5px] text-zinc-400 mb-2 line-clamp-2' }, p.v.title),
      h('textarea', { value: t, onChange: function (e) { set(e.target.value); }, rows: 5, className: cx(K.C.input, 'h-auto py-2') }),
      h('div', { className: 'flex justify-end gap-2 mt-3' }, h(Btn, { onClick: p.onClose }, 'Huỷ'), h(Btn, { primary: true, onClick: function () { store.updateSaved(p.v.id, { note: t }); p.onClose(); } }, 'Lưu')));
  }

  // ---------- Kế hoạch video ----------
  var COLS = [['todo', 'Ý tưởng'], ['scripting', 'Kịch bản'], ['editing', 'Dựng'], ['published', 'Đã đăng']];
  function Planner() {
    K.useBus('ideas');
    var ideas = store.ideas(), s0 = useState(null), edit = s0[0], setEdit = s0[1];
    function move(id, d) { var a = store.ideas().map(function (x) { if (x.id !== id) return x; var i = COLS.findIndex(function (c) { return c[0] === x.status; }); var n = COLS[Math.max(0, Math.min(COLS.length - 1, (i < 0 ? 0 : i) + d))][0]; return Object.assign({}, x, { status: n, updatedAt: Date.now() }); }); store.saveIdeas(a); }
    function del(id) { if (window.confirm('Xoá ý tưởng này?')) store.saveIdeas(store.ideas().filter(function (x) { return x.id !== id; })); }
    return h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-center gap-2' }, h(Btn, { primary: true, onClick: function () { setEdit({}); } }, 'Thêm ý tưởng'), h('span', { className: 'text-[10.5px] text-zinc-400' }, ideas.length + ' ý tưởng'), h('span', { className: 'flex-1' }),
        ideas.length > 0 && h(Btn, { small: true, onClick: function () { U.csv('ke-hoach-video', [['Tiêu đề', 'Chủ đề', 'Góc khai thác', 'Ghi chú', 'Trạng thái']].concat(ideas.map(function (x) { var c = COLS.find(function (c2) { return c2[0] === x.status; }); return [x.title, x.topic || '', x.angle || '', x.whyTry || '', c ? c[1] : x.status]; }))); } }, 'Xuất CSV')),
      h('div', { className: 'grid gap-3 md:grid-cols-2 xl:grid-cols-4' }, COLS.map(function (col, ci) {
        var items = ideas.filter(function (x) { return (x.status || 'todo') === col[0] || (ci === 0 && !COLS.some(function (c) { return c[0] === x.status; })); });
        return h('div', { key: col[0], className: cx(K.C.card, 'p-3 min-h-[200px]') },
          h('div', { className: 'flex justify-between text-[10.5px] mb-2' }, h('span', { className: 'text-zinc-200' }, col[1]), h('span', { className: 'text-zinc-500' }, items.length)),
          h('div', { className: 'space-y-2' }, items.map(function (x) {
            return h('div', { key: x.id, className: 'rounded-md border border-zinc-800 p-2.5 space-y-1.5' },
              h('button', { onClick: function () { setEdit(x); }, className: 'text-left text-[10.5px] text-zinc-100 hover:text-cham-50 leading-snug cursor-pointer' }, x.title),
              (x.topic || x.angle) && h('div', { className: 'text-[11px] text-zinc-400 line-clamp-3' }, [x.topic, x.angle].filter(Boolean).join(' — ')),
              h('div', { className: 'flex gap-1 pt-1' }, ci > 0 && h(Btn, { small: true, onClick: function () { move(x.id, -1); }, title: 'Chuyển sang cột trước' }, h(K.Icon, { name: 'left' })), ci < COLS.length - 1 && h(Btn, { small: true, onClick: function () { move(x.id, 1); } }, COLS[ci + 1][1] + ' →'), h('span', { className: 'flex-1' }), h(Btn, { small: true, onClick: function () { del(x.id); } }, 'Xoá')));
          })));
      })),
      edit && h(IdeaModal, { idea: edit, onClose: function () { setEdit(null); } }));
  }
  function IdeaModal(p) {
    var s = useState(Object.assign({ title: '', topic: '', angle: '', whyTry: '', status: 'todo' }, p.idea)), f = s[0], setF = s[1];
    var set = function (k) { return function (e) { var v = e && e.target ? e.target.value : e; setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }; };
    function save() { if (!f.title.trim()) return; if (f.id) store.saveIdeas(store.ideas().map(function (x) { return x.id === f.id ? f : x; })); else store.addIdea(f); p.onClose(); }
    return h(Modal, { title: f.id ? 'Sửa ý tưởng' : 'Ý tưởng mới', onClose: p.onClose }, h('div', { className: 'space-y-3' },
      h(Field, { label: 'Tiêu đề video' }, h(Input, { value: f.title, onChange: set('title'), autoFocus: true })),
      h(Field, { label: 'Chủ đề / ngách' }, h(Input, { value: f.topic, onChange: set('topic') })),
      h(Field, { label: 'Góc khai thác' }, h('textarea', { value: f.angle, onChange: set('angle'), rows: 3, className: cx(K.C.input, 'h-auto py-2') })),
      h(Field, { label: 'Ghi chú / vì sao nên làm' }, h('textarea', { value: f.whyTry, onChange: set('whyTry'), rows: 3, className: cx(K.C.input, 'h-auto py-2') })),
      h(Field, { label: 'Trạng thái' }, h(Select, { value: f.status, onChange: set('status'), options: COLS })),
      h('div', { className: 'flex justify-end gap-2' }, h(Btn, { onClick: p.onClose }, 'Huỷ'), h(Btn, { primary: true, onClick: save, disabled: !f.title.trim() }, 'Lưu'))));
  }

  // ---------- Cẩm nang (Wiki) ----------
  function Guide() {
    var cats = window.WIKI_CATEGORIES || [], arts = window.WIKI_ARTICLES || [];
    var s0 = useState(cats[0] ? cats[0].id : ''), cat = s0[0], setCat = s0[1], s1 = useState(null), open = s1[0], setOpen = s1[1], s2 = useState(''), q = s2[0], setQ = s2[1];
    if (!arts.length) return h(K.Missing, { name: 'Cẩm nang', file: 'wiki_data.js' });
    var list = arts.filter(function (a) { return q ? (a.title + ' ' + a.summary).toLowerCase().indexOf(q.toLowerCase()) >= 0 : a.category === cat; });
    if (open) {
      var blk = function (t, v) { return v ? h('div', { className: 'space-y-1' }, h('div', { className: K.C.label }, t), h('div', { className: 'text-[10.5px] text-zinc-300 leading-relaxed whitespace-pre-line' }, v)) : null; };
      return h('div', { className: 'max-w-3xl space-y-5' }, h(Btn, { small: true, onClick: function () { setOpen(null); } }, K.Icon && h(K.Icon, { name: 'left' }), 'Danh sách bài'),
        h('div', null, h('h2', { className: 'text-xl text-cham-50' }, open.title), h('div', { className: 'text-[10.5px] text-zinc-400 mt-1' }, [open.level, open.readTime].filter(Boolean).join(' · '))),
        blk('Tóm tắt', open.summary), blk('Hiểu đơn giản', open.simple), blk('Ví dụ', open.example), blk('Cách làm', open.howTo), blk('Sai lầm hay gặp', open.mistake), blk('Bài tập', open.exercise));
    }
    return h('div', { className: 'grid gap-5 md:grid-cols-[200px_1fr]' },
      h('div', { className: 'space-y-1' }, h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: 'Tìm bài', className: 'mb-2' }), cats.map(function (c) { return h('button', { key: c.id, onClick: function () { setCat(c.id); setQ(''); }, className: cx('block w-full text-left px-2.5 py-1.5 rounded text-[10.5px] cursor-pointer', cat === c.id && !q ? 'bg-zinc-900 text-cham-50' : 'text-zinc-400 hover:text-cham-50') }, c.name); })),
      h('div', { className: 'divide-y divide-zinc-900' }, list.map(function (a) { return h('button', { key: a.id, onClick: function () { setOpen(a); }, className: 'block w-full text-left py-3 cursor-pointer group' }, h('div', { className: 'text-[10.5px] text-zinc-100 group-hover:text-cham-50' }, a.title), h('div', { className: 'text-[10.5px] text-zinc-400 mt-0.5 line-clamp-2' }, a.summary)); })));
  }

  function Library(p) {
    K.useBus('saved'); K.useBus('ideas');
    var s = useState(p.params && p.params.sub || 'saved'), sub = s[0], setSub = s[1];
    return h('div', { className: 'space-y-5' },
      h('div', null, h('h1', { className: 'font-display text-[25px] leading-9 font-bold text-white tracking-tight' }, 'Thư viện'), h('p', { className: 'text-[13.5px] text-[#d0d0d0] mt-1 leading-relaxed' }, 'Video đã lưu, kế hoạch sản xuất và cẩm nang.')),
      h(K.Help, { id: 'library', title: 'Cách dùng Thư viện', steps: ['Video đã lưu: mọi video bạn bấm Lưu ở các mục khác đều nằm đây; thêm ghi chú hoặc biến thành ý tưởng.', 'Kế hoạch video: kéo ý tưởng qua các cột Ý tưởng → Kịch bản → Dựng → Đã đăng bằng nút mũi tên.', 'Cẩm nang: các bài hướng dẫn làm YouTube, đọc khi cần.'] }),
      h(Tabs, { value: sub, onChange: setSub, items: [['saved', 'Video đã lưu', store.saved().length], ['plan', 'Kế hoạch video', store.ideas().length], ['guide', 'Cẩm nang']] }),
      sub === 'saved' ? h(Saved, { goto: p.goto }) : sub === 'plan' ? h(Planner) : h(Guide));
  }

  // =================== CÀI ĐẶT ===================
  function KeysPanel() {
    K.useBus('keys'); K.useBus('quota');
    var pool = Y.keys.getPool(), use = Y.keys.usage(), S = Y.keys.stats();
    var s0 = useState(''), name = s0[0], setName = s0[1], s1 = useState(''), key = s1[0], setKey = s1[1], s2 = useState({}), test = s2[0], setTest = s2[1];
    function add() { var lines = key.split(/[\s,]+/).map(function (x) { return x.trim(); }).filter(Boolean); var n = 0; lines.forEach(function (k, i) { if (Y.keys.addKey(lines.length > 1 ? (name || 'Key') + ' ' + (pool.length + n + 1) : name, k)) n++; }); K.toast(n ? 'Đã thêm ' + n + ' key' : 'Key trống hoặc đã có'); setKey(''); setName(''); }
    async function check(p) { setTest(function (t) { var n = Object.assign({}, t); n[p.id] = 'Đang thử…'; return n; }); var r, msg; try { r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=' + encodeURIComponent(p.key)); var j = await r.json(); msg = r.ok ? 'Hoạt động' : ((j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || ('Lỗi ' + r.status)); if (r.ok) Y.keys.trackUnits(p.key, 1); } catch (e) { msg = 'Lỗi mạng'; } setTest(function (t) { var n = Object.assign({}, t); n[p.id] = msg; return n; }); }
    var ST = { active: 'Đang dùng', standby: 'Dự phòng', quota_exceeded: 'Hết quota hôm nay', suspended: 'Project bị Google khoá' };
    return h(Section, { title: 'YouTube API key', sub: 'Key chỉ lưu trên trình duyệt này. Mỗi key 10.000 quota/ngày, tự chuyển key khi hết. Reset khoảng 14–15h giờ VN.' },
      h('div', { className: 'grid grid-cols-3 gap-4 mb-4' }, h(Stat, { label: 'Key dùng được', value: S.ok + ' / ' + S.total }), h(Stat, { label: 'Quota còn hôm nay', value: N(S.left) }), h(Stat, { label: 'Đã dùng hôm nay', value: N(S.used) })),
      pool.length ? h(Table, { rows: pool, rowKey: function (p) { return p.id; }, cols: [
        { k: 'name', t: 'Tên', r: function (p) { return h('span', { className: 'text-zinc-200' }, p.name); } },
        { k: 'key', t: 'Key', r: function (p) { return h('span', { className: 'font-mono text-zinc-400' }, p.key.slice(0, 8) + '…' + p.key.slice(-4)); } },
        { k: 'st', t: 'Trạng thái', r: function (p) { return h('span', { className: p.status === 'active' ? 'text-emerald-300' : p.status === 'quota_exceeded' || p.status === 'suspended' ? 'text-rose-300' : 'text-zinc-400' }, ST[p.status] || p.status); } },
        { k: 'u', t: 'Đã dùng', right: true, r: function (p) { return N(use[p.key] || 0) + ' / 10K'; } },
        { k: 't', t: 'Kiểm tra', r: function (p) { return h('span', { className: 'text-zinc-400' }, test[p.id] || ''); } },
        { k: 'a', t: '', r: function (p) { return h('div', { className: 'flex gap-1 justify-end' }, h(Btn, { small: true, onClick: function () { check(p); } }, 'Thử'), p.status !== 'active' && h(Btn, { small: true, onClick: function () { Y.keys.setActive(p.id); } }, 'Dùng'), p.status === 'quota_exceeded' && h(Btn, { small: true, onClick: function () { Y.keys.resetStatus(p.id); } }, 'Đặt lại'), h(Btn, { small: true, onClick: function () { if (window.confirm('Xoá key ' + p.name + '?')) Y.keys.removeKey(p.id); } }, 'Xoá')); } }
      ] }) : h(Note, null, 'Chưa có key. Lấy key ở console.cloud.google.com → APIs & Services → bật "YouTube Data API v3" → Credentials → Create API key.'),
      h('div', { className: 'grid gap-2 md:grid-cols-[180px_1fr_auto] mt-4' }, h(Input, { value: name, onChange: function (e) { setName(e.target.value); }, placeholder: 'Tên (tuỳ chọn)' }), h(Input, { value: key, onChange: function (e) { setKey(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') add(); }, placeholder: 'Dán key (nhiều key: cách nhau dấu phẩy hoặc xuống dòng)' }), h(Btn, { primary: true, onClick: add, disabled: !key.trim() }, 'Thêm key')));
  }
  function ClaudePanel() {
    K.useBus('claude');
    var c = Y.claude.cfg(), s0 = useState(''), key = s0[0], setKey = s0[1], s1 = useState(''), msg = s1[0], setMsg = s1[1], s2 = useState(false), busy = s2[0], setBusy = s2[1];
    async function test() { setBusy(true); setMsg(''); try { var r = await Y.claude.stream({ prompt: 'Trả lời đúng 1 từ: OK', maxTokens: 10 }); setMsg('Kết nối được: ' + (r.text || 'OK').trim()); } catch (e) { setMsg(e.message); } setBusy(false); }
    return h(Section, { title: 'Claude', sub: 'Dùng ở Tạo tài nguyên → Dự án & Claude. Có 2 cách: copy prompt sang claude.ai (tài khoản Claude nào cũng được, không cần key), hoặc dán Claude API key để viết ngay trong web (trả phí theo lượng dùng tại console.anthropic.com).' },
      h('div', { className: 'grid gap-2 md:grid-cols-[1fr_260px_auto_auto]' },
        h(Input, { type: 'password', value: key, onChange: function (e) { setKey(e.target.value); }, placeholder: c.key ? 'Đã lưu key ' + c.key.slice(0, 10) + '…' + c.key.slice(-4) + ' — dán key mới để thay' : 'Dán Claude API key (sk-ant-…)' }),
        h(Select, { value: c.model, onChange: function (v) { Y.claude.save({ model: v }); }, options: Y.claude.models }),
        h(Btn, { primary: true, disabled: !key.trim(), onClick: function () { Y.claude.save({ key: key.trim() }); setKey(''); setMsg('Đã lưu key trên trình duyệt này.'); } }, 'Lưu key'),
        h(Btn, { disabled: !c.key || busy, onClick: test }, busy ? 'Đang thử…' : 'Thử kết nối')),
      h('div', { className: 'flex flex-wrap items-center gap-3 mt-3 text-[10.5px]' },
        h('span', { className: c.key ? 'text-emerald-300' : 'text-zinc-400' }, c.key ? 'Đã có key' : 'Chưa có key'),
        c.key && h('button', { onClick: function () { if (window.confirm('Xoá Claude API key khỏi trình duyệt này?')) Y.claude.save({ key: '' }); }, className: 'text-zinc-400 hover:text-rose-300 cursor-pointer' }, 'Xoá key'),
        h('a', { href: 'https://console.anthropic.com/settings/keys', target: '_blank', rel: 'noopener noreferrer', className: 'text-sky-300 hover:underline' }, 'Lấy key ở console.anthropic.com'),
        msg && h('span', { className: 'text-zinc-300' }, msg)));
  }
  function ServerPanel(p) {
    var me = p.me || {};
    return h(Section, { title: 'Máy chủ & AI' },
      h('div', { className: 'grid gap-4 sm:grid-cols-3' }, h(Stat, { label: 'Gemini (Tạo tài nguyên, nhận định AI)', value: me.gemini ? 'Đã cấu hình' : 'Chưa có GEMINI_API_KEY', sub: me.model || '' }), h(Stat, { label: 'Quyền', value: 'Admin', sub: me.email || '' }), h(Stat, { label: 'Phiên bản', value: 'YouTrend v4' })),
      !me.gemini && h(Note, { className: 'mt-3' }, 'Thêm GEMINI_API_KEY ở Vercel → Settings → Environment Variables (lấy miễn phí tại aistudio.google.com/apikey), rồi Redeploy.'));
  }
  function AccountPanel(p) {
    var user = Y.auth.currentUser(), isPass = user && (user.providerData || []).some(function (x) { return x.providerId === 'password'; });
    var s0 = useState(''), o = s0[0], setO = s0[1], s1 = useState(''), n = s1[0], setN = s1[1], s2 = useState(''), msg = s2[0], setMsg = s2[1];
    async function change() { setMsg(''); if (n.length < 8) { setMsg('Mật khẩu mới tối thiểu 8 ký tự'); return; } try { await Y.auth.changePassword(o, n); setMsg('Đã đổi mật khẩu'); setO(''); setN(''); } catch (e) { setMsg(e.message); } }
    return h(Section, { title: 'Tài khoản' },
      h('div', { className: 'flex flex-wrap items-center gap-3' }, h('div', { className: 'text-[10.5px] text-zinc-200' }, user ? (user.email || '').replace('@youtrend.user', ' (tài khoản mật khẩu)') : ''), h('span', { className: 'flex-1' }), h(Btn, { onClick: p.onLogout }, 'Đăng xuất')),
      isPass && h('div', { className: 'mt-4 pt-4 border-t border-zinc-900 grid gap-2 md:grid-cols-[1fr_1fr_auto]' }, h(Input, { type: 'password', value: o, onChange: function (e) { setO(e.target.value); }, placeholder: 'Mật khẩu hiện tại' }), h(Input, { type: 'password', value: n, onChange: function (e) { setN(e.target.value); }, placeholder: 'Mật khẩu mới (≥ 8 ký tự)' }), h(Btn, { onClick: change, disabled: !o || !n }, 'Đổi mật khẩu')),
      msg && h('div', { className: 'text-[10.5px] text-zinc-400 mt-2' }, msg));
  }
  function DataPanel() {
    var inp = React.useRef(null);
    function backup() {
      var data = { app: 'youtrend', v: 4, at: new Date().toISOString(), keys: Y.keys.getPool(), saved: store.saved(), channels: store.channels(), ideas: store.ideas(), explore: st.json('yt4_explore_hist', []), channelHist: st.json('yt4_channel_hist', []), projects: store.projects(), briefs: store.briefs(), compare: store.compare(), nicheMarks: st.json('tn3_marks', {}), nichePresets: st.json('tn3_presets', []), countryGroups: st.json('tn3_cgroups', []), dreamGroups: st.json('yt4_groups', []), myPrompts: st.json('yt4_pr_mine', []) };
      U.download('youtrend-sao-luu-' + new Date().toISOString().slice(0, 10) + '.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    }
    function restore(e) {
      var f = e.target.files[0]; if (!f) return; var r = new FileReader();
      r.onload = function () {
        try {
          var d = JSON.parse(r.result), n = 0;
          var keys = d.keys || d.keyPool; if (Array.isArray(keys)) keys.forEach(function (k) { if (k && k.key && Y.keys.addKey(k.name, k.key)) n++; });
          var saved = d.saved || d.savedVideos; if (Array.isArray(saved)) { var cur = store.saved(), ids = {}; cur.forEach(function (v) { ids[v.id] = 1; }); st.put('yt_saved_cashcow_videos', cur.concat(saved.filter(function (v) { return v && v.id && !ids[v.id]; }))); }
          var ch = d.channels || d.competitors; if (Array.isArray(ch)) ch.forEach(function (c) { if (c && /^UC/.test(c.id || '')) store.addChannel(c); });
          if (Array.isArray(d.ideas)) { var ci = store.ideas(), ii = {}; ci.forEach(function (x) { ii[x.id] = 1; }); store.saveIdeas(ci.concat(d.ideas.filter(function (x) { return x && !ii[x.id]; }))); }
          if (Array.isArray(d.projects)) { var cp = store.projects(), pi = {}; cp.forEach(function (x) { pi[x.id] = 1; }); st.put('yt4_projects', cp.concat(d.projects.filter(function (x) { return x && x.id && !pi[x.id]; }))); Y.emit('projects'); }
          if (Array.isArray(d.briefs)) { var cb = store.briefs(), bi = {}; cb.forEach(function (x) { bi[x.id] = 1; }); st.put('yt4_briefs', cb.concat(d.briefs.filter(function (x) { return x && x.id && !bi[x.id]; })).slice(0, 30)); Y.emit('briefs'); }
          if (d.nicheMarks && typeof d.nicheMarks === 'object') st.put('tn3_marks', Object.assign({}, d.nicheMarks, st.json('tn3_marks', {})));
          if (Array.isArray(d.nichePresets)) { var pp = st.json('tn3_presets', []) || [], pn = {}; pp.forEach(function (x) { pn[x[0]] = 1; }); st.put('tn3_presets', pp.concat(d.nichePresets.filter(function (x) { return Array.isArray(x) && !pn[x[0]]; })).slice(0, 12)); }
          if (Array.isArray(d.dreamGroups)) { var dg = st.json('yt4_groups', []) || []; d.dreamGroups.forEach(function (x) { if (typeof x === 'string' && x && dg.indexOf(x) < 0) dg.push(x.slice(0, 60)); }); st.put('yt4_groups', dg.slice(0, 40)); }
          if (Array.isArray(d.myPrompts)) { var mp = st.json('yt4_pr_mine', []) || [], mi = {}; mp.forEach(function (x) { mi[x.id || x.title] = 1; }); st.put('yt4_pr_mine', mp.concat(d.myPrompts.filter(function (x) { return x && (x.id || x.title) && !mi[x.id || x.title]; })).slice(0, 60)); }
          if (Array.isArray(d.countryGroups)) { var cg = st.json('tn3_cgroups', []) || [], ci = {}; cg.forEach(function (x) { ci[x.id] = 1; }); st.put('tn3_cgroups', cg.concat(d.countryGroups.filter(function (x) { return x && x.id && Array.isArray(x.mks) && !ci[x.id]; })).slice(0, 30)); }
          Y.emit('saved'); K.toast('Đã khôi phục (gộp với dữ liệu hiện có). Thêm ' + n + ' key mới.');
        } catch (err) { K.toast('File sao lưu không hợp lệ'); }
        e.target.value = '';
      };
      r.readAsText(f);
    }
    function clearCache() { if (!window.confirm('Xoá bộ nhớ đệm (lịch sử phân tích, video mới của kênh theo dõi)? Video đã lưu, kênh, ý tưởng, API key vẫn giữ.')) return; ['yt4_explore_cache', 'yt4_explore_hist', 'yt4_feed', 'yt4_channel_hist'].forEach(st.del); K.toast('Đã xoá bộ nhớ đệm'); }
    return h(Section, { title: 'Dữ liệu', sub: 'Toàn bộ dữ liệu nằm trên trình duyệt này. Sao lưu để chuyển sang máy khác.' },
      h('div', { className: 'flex flex-wrap gap-2' }, h(Btn, { onClick: backup }, 'Tải file sao lưu'), h(Btn, { onClick: function () { inp.current.click(); } }, 'Khôi phục từ file'), h(Btn, { onClick: clearCache }, 'Xoá bộ nhớ đệm'),
        h('input', { ref: inp, type: 'file', accept: '.json,application/json', className: 'hidden', onChange: restore })),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4' }, h(Stat, { label: 'Video đã lưu', value: store.saved().length }), h(Stat, { label: 'Kênh theo dõi', value: store.channels().length }), h(Stat, { label: 'Ý tưởng', value: store.ideas().length }), h(Stat, { label: 'API key', value: Y.keys.getPool().length })));
  }
  function Settings(p) {
    return h('div', { className: 'space-y-5 max-w-5xl' },
      h('div', null, h('h1', { className: 'font-display text-[25px] leading-9 font-bold text-white tracking-tight' }, 'Cài đặt'), h('p', { className: 'text-[13.5px] text-[#d0d0d0] mt-1 leading-relaxed' }, 'API key YouTube, Claude, tài khoản và sao lưu dữ liệu.')),
      h(K.Help, { id: 'settings', title: 'Thiết lập lần đầu', steps: ['Thêm YouTube API key: vào console.cloud.google.com, bật YouTube Data API v3, tạo API key rồi dán vào ô bên dưới. Nên có nhiều key để quét được nhiều hơn.', 'Gemini (cho Tạo tài nguyên và Nhận định AI) đặt trên Vercel, ô Máy chủ & AI cho biết đã có chưa.', 'Claude API key là tuỳ chọn: chỉ cần khi muốn Claude viết kịch bản ngay trong web.', 'Thỉnh thoảng bấm Tải file sao lưu để giữ dữ liệu khi đổi máy.'] }),
      h(KeysPanel), h(ClaudePanel), window.YT4Mcp ? h(window.YT4Mcp.Box) : null, h(ServerPanel, { me: p.me }), h(AccountPanel, { onLogout: p.onLogout }), h(DataPanel));
  }

  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.library = Library;
  window.YT4Pages.settings = Settings;
})();
