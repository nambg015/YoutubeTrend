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
    async function check(p) { setTest(function (t) { var n = Object.assign({}, t); n[p.id] = 'Đang thử…'; return n; }); var r, msg; try { r = await fetch('https://www.googleapis.com/youtube/v3/videos?part=id&chart=mostPopular&maxResults=1&key=' + encodeURIComponent(p.key)); var j = await r.json(); msg = r.ok ? 'Hoạt động' : ((j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || ('Lỗi ' + r.status)); if (r.ok) { Y.keys.trackUnits(p.key, 1); Y.keys.markOk(p.key); } else if (/keyInvalid|accessNotConfigured/.test(msg) || /API key not valid|SERVICE_BLOCKED|REFERRER_BLOCKED|has not been used|are blocked/i.test(JSON.stringify(j.error || ''))) { msg = /keyInvalid|not valid/i.test(msg + JSON.stringify(j.error || '')) ? 'Key sai hoặc đã bị xoá' : 'Key chưa bật YouTube Data API v3'; Y.keys.markInvalid(p.key, msg); } } catch (e) { msg = 'Lỗi mạng'; } setTest(function (t) { var n = Object.assign({}, t); n[p.id] = msg; return n; }); }
    var ST = { active: 'Đang dùng', standby: 'Dự phòng', quota_exceeded: 'Hết quota hôm nay', suspended: 'Project bị Google khoá', invalid: 'Không dùng được' };
    return h(Section, { title: 'YouTube API key', sub: 'Key chỉ lưu trên trình duyệt này. Mỗi key 10.000 quota/ngày, tự chuyển key khi hết. Reset khoảng 14–15h giờ VN.' },
      h('div', { className: 'grid grid-cols-3 gap-4 mb-4' }, h(Stat, { label: 'Key dùng được', value: S.ok + ' / ' + S.total }), h(Stat, { label: 'Quota còn hôm nay', value: N(S.left) }), h(Stat, { label: 'Đã dùng hôm nay', value: N(S.used) })),
      pool.length ? h(Table, { rows: pool, rowKey: function (p) { return p.id; }, cols: [
        { k: 'name', t: 'Tên', r: function (p) { return h('span', { className: 'text-zinc-200' }, p.name); } },
        { k: 'key', t: 'Key', r: function (p) { return h('span', { className: 'font-mono text-zinc-400' }, p.key.slice(0, 8) + '…' + p.key.slice(-4)); } },
        { k: 'st', t: 'Trạng thái', r: function (p) { return h('span', { title: p.why || null, className: p.status === 'active' ? 'text-emerald-300' : p.status === 'quota_exceeded' || p.status === 'suspended' || p.status === 'invalid' ? 'text-rose-300' : 'text-zinc-400' }, (ST[p.status] || p.status) + (p.status === 'invalid' && p.why ? ': ' + p.why : '')); } },
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
      h('div', { className: 'grid gap-4 sm:grid-cols-3' }, h(Stat, { label: 'Gemini (Tạo tài nguyên, nhận định AI)', value: me.gemini ? 'Đã cấu hình' : 'Chưa có GEMINI_API_KEY', sub: me.model || '' }), h(Stat, { label: 'Quyền', value: me.role === 'guest' ? 'Khách' : 'Chủ (admin)', sub: (me.email || '').replace('@youtrend.user', '') }), h(Stat, { label: 'Phiên bản', value: 'YouTrend v4' })),
      !me.gemini && me.role !== 'guest' && h(Note, { className: 'mt-3' }, 'Thêm GEMINI_API_KEY ở Vercel → Settings → Environment Variables (lấy miễn phí tại aistudio.google.com/apikey), rồi Redeploy.'));
  }
  // ---------- Tài khoản khách: danh sách, online / offline, lịch sử thao tác, đổi mật khẩu, khoá, xoá ----------
  // Danh sách (tên, mật khẩu, ghi chú) lưu trên trình duyệt của chủ; trạng thái và lịch sử lấy từ máy chủ.
  var ROUTE_VN = { today: 'Hôm nay', explore: 'Khám phá', niche: 'Top Ngách', channels: 'Kênh', resource: 'Tài nguyên', tools: 'Công cụ', library: 'Thư viện', settings: 'Cài đặt' };
  var AI_VN = { search: 'gom hồ sơ sự kiện', structure: 'dựng cấu trúc hồ sơ', news: 'tìm tin tức', enrich: 'bổ sung hồ sơ', insight: 'nhận định', titles: 'viết tiêu đề', topics: 'tìm đề tài', images: 'tìm hình ảnh', image: 'tải hình', translate: 'dịch tiêu đề', audience: 'đọc bình luận', seo: 'thông tin đăng video', ask: 'hỏi trợ lý trên bảng', script: 'phân tích kịch bản' };
  function GuestPanel(p) {
    var gName = function (e) { return String(e || '').replace('@youtrend.user', ''); };
    var s0 = useState(function () { return st.json('yt4_guests', []) || []; }), mine = s0[0], setMine0 = s0[1];
    function setMine(a) { setMine0(a); st.put('yt4_guests', a); }
    var s1 = useState(null), srv = s1[0], setSrv = s1[1], s2 = useState(''), busy = s2[0], setBusy = s2[1], s3 = useState(null), msg = s3[0], setMsg = s3[1];
    var s4 = useState({ n: '', p: '', note: '' }), F = s4[0], setF = s4[1];
    var s5 = useState(null), open = s5[0], setOpen = s5[1];         // { n, kind: 'log' | 'pw' | 'del', ... }
    var s6 = useState({}), show = s6[0], setShow = s6[1], s7 = useState({ n: '', p: '' }), AD = s7[0], setAD = s7[1], s8 = useState(0), tick = s8[0], setTick = s8[1];
    async function load() { try { var r = await Y.api('/api/me', { action: 'guests' }); setSrv(r); } catch (e) { setSrv(function (x) { return x || { list: [], persistent: false, signing: true, err: e.message }; }); } }
    useEffect(function () { load(); var t = setInterval(function () { if (!document.hidden) load(); }, 30000), t2 = setInterval(function () { setTick(function (x) { return x + 1; }); }, 20000); return function () { clearInterval(t); clearInterval(t2); }; }, []);
    function rnd() { var A = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint32Array(12), out = ''; (window.crypto || window.msCrypto).getRandomValues(b); for (var i = 0; i < b.length; i++) out += A[b[i] % A.length]; return out; }
    var okName = function (n) { return /^[a-z0-9][a-z0-9._-]{2,23}$/.test(n); };
    var needConsole = function (e) { return /operation-not-allowed|admin-restricted|phiên phụ/.test((e.code || '') + ' ' + (e.message || '')); };
    var info = function (g) { return 'Web: ' + location.origin + '\nTên đăng nhập: ' + g.n + '\nMật khẩu: ' + g.p; };
    var copy = function (t, what) { U.copy(t).then(function () { K.toast('Đã sao chép ' + what); }, function () { K.toast('Trình duyệt chặn sao chép, hãy bôi đen rồi Ctrl+C.'); }); };
    function put(g0) { var g = { n: g0.n, p: g0.p || '', note: g0.note || '', at: g0.at || Date.now() }, a = mine.slice(), i = a.findIndex(function (x) { return x.n === g.n; }); if (i >= 0) a[i] = g; else a.unshift(g); setMine(a.slice(0, 200)); }
    function drop(n) { setMine(mine.filter(function (x) { return x.n !== n; })); }

    async function create() {
      var n = F.n.trim().toLowerCase(), pw = F.p;
      if (!okName(n)) { setMsg({ err: 1, t: 'Tên đăng nhập gồm 3–24 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.' }); return; }
      if (pw.length < 8) { setMsg({ err: 1, t: 'Mật khẩu cần ít nhất 8 ký tự.' }); return; }
      setBusy('create'); setMsg(null);
      try { await Y.auth.createGuest(n, pw); put({ n: n, p: pw, note: F.note.trim().slice(0, 80), at: Date.now() }); setF({ n: '', p: '', note: '' }); setMsg({ t: 'Đã tạo tài khoản "' + n + '". Bấm "Chép" ở dòng của nó để lấy thông tin gửi cho khách.' }); load(); }
      catch (e) { setMsg({ err: 1, t: e.message, console: needConsole(e), name: n }); }
      setBusy('');
    }
    async function adopt() {
      var n = AD.n.trim().toLowerCase();
      if (!okName(n)) { setMsg({ err: 1, t: 'Tên đăng nhập gồm 3–24 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới.' }); return; }
      if (!AD.p) { setMsg({ err: 1, t: 'Nhập mật khẩu hiện tại của tài khoản đó.' }); return; }
      setBusy('adopt'); setMsg(null);
      try { await Y.auth.adoptGuest(n, AD.p); var old = mine.filter(function (x) { return x.n === n; })[0] || {}; put({ n: n, p: AD.p, note: old.note || '', at: old.at || Date.now() }); setAD({ n: '', p: '' }); setMsg({ t: 'Đã cấp quyền khách cho "' + n + '" và đưa vào danh sách.' }); load(); }
      catch (e) { setMsg({ err: 1, t: e.message }); }
      setBusy('');
    }
    async function changePw(g) {
      var o = g.p || open.old || '', nw = open.nw || '';
      if (!o) { setMsg({ err: 1, t: 'Máy này chưa lưu mật khẩu của "' + g.n + '". Nhập mật khẩu hiện tại của nó.' }); return; }
      if (nw.length < 8) { setMsg({ err: 1, t: 'Mật khẩu mới cần ít nhất 8 ký tự.' }); return; }
      setBusy('pw'); setMsg(null);
      try { await Y.auth.changeGuestPassword(g.n, o, nw); put(Object.assign({}, g, { p: nw })); setOpen(null); setMsg({ t: 'Đã đổi mật khẩu của "' + g.n + '". Mật khẩu cũ không còn đăng nhập được.' }); }
      catch (e) { setMsg({ err: 1, t: e.message }); }
      setBusy('');
    }
    async function block(g, on) {
      setBusy('blk'); setMsg(null);
      try { var r = await Y.api('/api/me', { action: 'guestBlock', name: g.n, blocked: on }); setMsg({ t: (on ? 'Đã khoá "' : 'Đã mở khoá "') + g.n + '".' + (on ? ' Khách bị đẩy ra trong vòng 1 phút.' : '') + (r.persistent ? '' : ' Lưu ý: máy chủ chưa gắn kho lưu nên lệnh khoá có thể không giữ được.') }); await load(); }
      catch (e) { setMsg({ err: 1, t: e.message }); }
      setBusy('');
    }
    async function remove(g) {
      var pw = g.p || open.old || '';
      setBusy('del'); setMsg(null);
      var gone = false, why = '';
      if (pw) { try { await Y.auth.deleteGuest(g.n, pw); gone = true; } catch (e) { why = e.message; } } else why = 'Máy này không có mật khẩu của tài khoản.';
      try {
        if (gone) { await Y.api('/api/me', { action: 'guestForget', name: g.n }); drop(g.n); setMsg({ t: 'Đã xoá hẳn tài khoản "' + g.n + '" khỏi Firebase và khỏi danh sách.' }); }
        else { await Y.api('/api/me', { action: 'guestBlock', name: g.n, blocked: true }); setMsg({ err: 1, t: 'Chưa xoá được "' + g.n + '" trong Firebase (' + why + '). Đã khoá tài khoản này trên web. Muốn xoá hẳn: Firebase Console → Authentication → Users → ' + g.n + '@youtrend.user → Delete account, rồi bấm "Gỡ khỏi danh sách".', drop: g.n }); }
      } catch (e) { setMsg({ err: 1, t: e.message }); }
      setOpen(null); setBusy(''); load();
    }
    async function forget(n) { try { await Y.api('/api/me', { action: 'guestForget', name: n }); } catch (e) { } drop(n); setMsg({ t: 'Đã gỡ "' + n + '" khỏi danh sách.' }); load(); }
    function openLog(g) { if (open && open.n === g.n && open.kind === 'log') { setOpen(null); return; } loadLog(g); }
    async function loadLog(g) {
      setOpen({ n: g.n, kind: 'log', ev: null });
      try { var r = await Y.api('/api/me', { action: 'guestLog', name: g.n, limit: 300 }); setOpen({ n: g.n, kind: 'log', ev: r.events || [] }); } catch (e) { setOpen({ n: g.n, kind: 'log', ev: [], err: e.message }); }
    }
    async function clearLog(g) { try { await Y.api('/api/me', { action: 'guestLogClear', name: g.n }); setOpen({ n: g.n, kind: 'log', ev: [] }); } catch (e) { setMsg({ err: 1, t: e.message }); } }

    // gộp danh sách trên máy này với những tài khoản máy chủ từng thấy
    var S = {}; ((srv && srv.list) || []).forEach(function (x) { S[gName(x.email)] = x; });
    var rows = mine.map(function (g) { return Object.assign({}, g, { s: S[g.n] || null }); });
    Object.keys(S).forEach(function (n) { if (!mine.some(function (g) { return g.n === n; })) rows.push({ n: n, p: '', note: '', at: S[n].first || 0, s: S[n], foreign: true }); });
    var now = Date.now(), onlineMs = (srv && srv.onlineMs) || 150000;
    var status = function (g) {
      var x = g.s;
      if (x && x.blocked) return { dot: 'bg-[#ff4e45]', cls: 'text-[#ff8a83]', t: 'Đang khoá' };
      if (x && x.at && now - x.at < onlineMs) return { dot: 'bg-[#2ba640] shadow-[0_0_0_3px_rgba(43,166,64,.25)]', cls: 'text-[#6fcf85]', t: 'Đang online', sub: (ROUTE_VN[x.route] || x.route || '') + (x.ua ? ' · ' + x.ua : '') };
      if (x && x.at) return { dot: 'bg-[#555]', cls: 'text-[#c8c8c8]', t: 'Offline', sub: 'lần cuối ' + U.ago(x.at) + ' trước' + (x.ua ? ' · ' + x.ua : '') };
      return { dot: 'bg-[#3a3a3a]', cls: 'text-[#888]', t: 'Chưa đăng nhập' };
    };
    var evText = function (e) { return e.a === 'nav' ? 'Mở mục ' + (ROUTE_VN[e.d] || e.d) : e.a === 'ai' ? 'Gọi AI: ' + (AI_VN[e.d] || e.d) : e.a === 'login' ? 'Mở web' : 'Bấm "' + e.d + '"'; };
    var evTone = function (e) { return e.a === 'nav' ? 'text-[#7cc3ff]' : e.a === 'ai' ? 'text-[#c9a7ff]' : e.a === 'login' ? 'text-[#6fcf85]' : 'text-[#e6e6e6]'; };
    var when = function (t) { var d = new Date(t), z = function (x) { return String(x).padStart(2, '0'); }; return z(d.getHours()) + ':' + z(d.getMinutes()) + ' · ' + z(d.getDate()) + '/' + z(d.getMonth() + 1); };
    var fld = 'h-9 bg-[#121212] border border-[#303030] rounded-lg px-3 text-[12.5px] text-[#f1f1f1] placeholder:text-[#717171] min-w-0';
    var act = function (label, fn, cls, on) { return h('button', { key: label, onClick: fn, disabled: !!busy, 'aria-pressed': on == null ? null : !!on, className: cx('h-7 px-2.5 rounded-full text-[11.5px] font-medium whitespace-nowrap cursor-pointer disabled:opacity-50', on ? 'bg-[#f1f1f1] text-[#0f0f0f]' : cls || 'bg-[#323232] hover:bg-[#424242] text-[#f1f1f1]') }, label); };
    var nOn = rows.filter(function (g) { return status(g).t === 'Đang online'; }).length;

    return h(Section, { title: 'Tài khoản khách' },
      h('p', { className: 'text-[12px] text-[#c8c8c8] leading-relaxed' }, 'Tạo tài khoản riêng cho từng người bạn muốn cho dùng web. Khách dùng được mọi công cụ, dữ liệu lưu trên máy của họ, phải tự nhập YouTube API key, lượt AI mỗi ngày bằng khoảng 30% của bạn. Bạn xem được ai đang online và họ đã làm gì; khách được báo rõ điều này trong Cài đặt của họ.'),
      srv && !srv.signing && h(Note, { error: true, className: 'mt-3' }, 'Máy chủ chưa có khoá để cấp quyền khách. Thêm biến GUEST_SECRET (một chuỗi dài bất kỳ) ở Vercel → Settings → Environment Variables rồi Redeploy.'),
      srv && !srv.persistent && h(Note, { className: 'mt-3' }, 'Máy chủ chưa gắn kho lưu (Upstash KV) nên trạng thái online, lịch sử thao tác và lệnh khoá chỉ giữ tạm, hay mất. Gắn ở Vercel → Storage → Upstash for Redis → Connect Project, rồi Redeploy. Tạo, đổi mật khẩu và xoá tài khoản vẫn chạy bình thường.'),
      h('div', { className: 'mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_minmax(0,1fr)_auto] items-center' },
        h('input', { type: 'text', value: F.n, onChange: function (e) { setF(Object.assign({}, F, { n: e.target.value.toLowerCase().replace(/\s+/g, '') })); }, placeholder: 'Tên đăng nhập, ví dụ: lan', 'aria-label': 'Tên đăng nhập của khách', autoComplete: 'off', spellCheck: false, className: fld }),
        h('input', { type: 'text', value: F.p, onChange: function (e) { setF(Object.assign({}, F, { p: e.target.value })); }, placeholder: 'Mật khẩu (ít nhất 8 ký tự)', 'aria-label': 'Mật khẩu cho khách', autoComplete: 'off', spellCheck: false, className: fld + ' font-mono' }),
        h(Btn, { onClick: function () { setF(Object.assign({}, F, { p: rnd() })); }, disabled: !!busy }, 'Ngẫu nhiên'),
        h('input', { type: 'text', value: F.note, onChange: function (e) { setF(Object.assign({}, F, { note: e.target.value })); }, placeholder: 'Ghi chú: cho ai', 'aria-label': 'Ghi chú cho tài khoản khách', className: fld }),
        h(Btn, { primary: true, onClick: create, disabled: !!busy || !F.n || !F.p }, busy === 'create' ? 'Đang tạo…' : 'Tạo tài khoản')),
      msg && h('div', { role: msg.err ? 'alert' : 'status', className: cx('mt-3 rounded-lg border px-3.5 py-2.5 text-[12px] leading-relaxed', msg.err ? 'border-[#ff4e45]/50 bg-[#2a1614] text-[#ffb4ae]' : 'border-[#2ba640]/50 bg-[#14261a] text-[#9fe0ad]') }, msg.t,
        msg.drop && h('button', { onClick: function () { forget(msg.drop); }, className: 'ml-3 h-7 px-3 rounded-full bg-[#3a1f1d] hover:bg-[#4a2624] text-[11.5px] font-semibold text-[#ffb4ae] cursor-pointer' }, 'Gỡ khỏi danh sách')),
      msg && msg.console && h('ol', { className: 'mt-2 list-decimal pl-5 space-y-1 text-[12px] text-[#d0d0d0] leading-relaxed' },
        h('li', null, 'Mở console.firebase.google.com, chọn dự án của web, vào Authentication → Users → Add user.'),
        h('li', null, 'Email: ', h('b', { className: 'text-white select-all' }, msg.name + '@youtrend.user'), ' · Password: mật khẩu bạn muốn đưa cho khách. Bấm Add user.'),
        h('li', null, 'Quay lại đây, mở "Thêm tài khoản đã có" bên dưới, nhập tên và mật khẩu đó để cấp quyền khách.')),

      h('div', { className: 'mt-4 flex items-center gap-3 text-[12px]' }, h('b', { className: 'text-white' }, 'Danh sách (' + rows.length + ')'), h('span', { className: 'text-[#6fcf85]' }, nOn + ' đang online'), h('span', { className: 'flex-1' }), h('button', { onClick: load, className: 'text-[11.5px] text-[#8ab4f8] hover:text-white cursor-pointer' }, 'Tải lại trạng thái')),
      !rows.length ? h('div', { className: 'mt-2 rounded-lg border border-dashed border-[#3a3a3a] px-4 py-5 text-center text-[12px] text-[#aaa]' }, 'Chưa có tài khoản khách nào. Điền tên và mật khẩu ở trên rồi bấm Tạo tài khoản.')
        : h('div', { className: 'mt-2 rounded-lg border border-[#2e2e2e] overflow-x-auto' }, h('table', { className: 'w-full text-[12px]' },
          h('thead', null, h('tr', { className: 'text-left text-[10.5px] uppercase tracking-wide text-[#aaa] bg-[#181818]' }, ['Trạng thái', 'Tên đăng nhập', 'Mật khẩu', 'Ghi chú', 'Tạo lúc', 'Thao tác'].map(function (x) { return h('th', { key: x, className: 'px-3 py-2 font-semibold whitespace-nowrap' }, x); }))),
          h('tbody', null, rows.map(function (g) {
            var stt = status(g), isOpen = open && open.n === g.n, blocked = !!(g.s && g.s.blocked);
            return h(Frag, { key: g.n },
              h('tr', { className: 'border-t border-[#2a2a2a] align-middle' },
                h('td', { className: 'px-3 py-2 whitespace-nowrap' }, h('div', { className: 'flex items-center gap-2' }, h('span', { 'aria-hidden': true, className: 'w-2.5 h-2.5 rounded-full shrink-0 ' + stt.dot }), h('div', null, h('div', { className: 'font-semibold ' + stt.cls }, stt.t), stt.sub && h('div', { className: 'text-[11px] text-[#aaa]' }, stt.sub)))),
                h('td', { className: 'px-3 py-2 font-semibold text-white whitespace-nowrap' }, g.n),
                h('td', { className: 'px-3 py-2 whitespace-nowrap' }, g.p ? h('span', { className: 'inline-flex items-center gap-2' }, h('span', { className: 'font-mono text-[#e6e6e6]' }, show[g.n] ? g.p : '••••••••'), h('button', { onClick: function () { var o = Object.assign({}, show); o[g.n] = !o[g.n]; setShow(o); }, className: 'text-[11px] text-[#8ab4f8] hover:text-white cursor-pointer' }, show[g.n] ? 'Ẩn' : 'Hiện')) : h('span', { className: 'text-[#888]', title: 'Tài khoản này được tạo từ máy khác nên máy này không có mật khẩu' }, 'không lưu trên máy này')),
                h('td', { className: 'px-3 py-2 min-w-[140px]' }, g.foreign ? h('span', { className: 'text-[#888]' }, '–') : h('input', { key: g.n + '|' + (g.note || ''), defaultValue: g.note || '', placeholder: 'Ghi chú…', 'aria-label': 'Ghi chú của ' + g.n, onBlur: function (e) { if (e.target.value !== (g.note || '')) put(Object.assign({}, g, { note: e.target.value.slice(0, 80) })); }, className: 'w-full h-7 bg-transparent border border-transparent hover:border-[#303030] focus:border-[#3ea6ff] rounded-md px-1.5 text-[#f1f1f1] placeholder:text-[#555]' })),
                h('td', { className: 'px-3 py-2 whitespace-nowrap text-[#aaa]' }, g.at ? new Date(g.at).toLocaleDateString('vi-VN') : '–'),
                h('td', { className: 'px-3 py-2' }, h('div', { className: 'flex flex-nowrap gap-1' },
                  act('Lịch sử', function () { openLog(g); }, null, isOpen && open.kind === 'log'),
                  g.p && act('Chép', function () { copy(info(g), 'thông tin đăng nhập của ' + g.n); }),
                  act('Đổi mật khẩu', function () { setOpen(isOpen && open.kind === 'pw' ? null : { n: g.n, kind: 'pw', nw: '', old: '' }); setMsg(null); }, null, isOpen && open.kind === 'pw'),
                  act(blocked ? 'Mở khoá' : 'Khoá', function () { block(g, !blocked); }, blocked ? 'bg-[#1d3a2a] hover:bg-[#25492f] text-[#9fe0ad]' : 'bg-[#3a3214] hover:bg-[#4a401a] text-[#f5c451]'),
                  act('Xoá', function () { setOpen(isOpen && open.kind === 'del' ? null : { n: g.n, kind: 'del', old: '' }); setMsg(null); }, 'bg-[#3a1f1d] hover:bg-[#4a2624] text-[#ff8a83]', isOpen && open.kind === 'del')))),
              isOpen && h('tr', { className: 'bg-[#161616]' }, h('td', { colSpan: 6, className: 'px-3 py-3' },
                open.kind === 'pw' ? h('div', { className: 'grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] items-center' },
                  g.p ? h('div', { className: 'text-[12px] text-[#c8c8c8]' }, 'Đặt mật khẩu mới cho ', h('b', { className: 'text-white' }, g.n), '. Người đang dùng mật khẩu cũ sẽ không đăng nhập lại được.') : h('input', { type: 'text', value: open.old, onChange: function (e) { setOpen(Object.assign({}, open, { old: e.target.value })); }, placeholder: 'Mật khẩu hiện tại của ' + g.n, 'aria-label': 'Mật khẩu hiện tại', autoComplete: 'off', className: fld + ' font-mono' }),
                  h('input', { type: 'text', value: open.nw, onChange: function (e) { setOpen(Object.assign({}, open, { nw: e.target.value })); }, placeholder: 'Mật khẩu mới (ít nhất 8 ký tự)', 'aria-label': 'Mật khẩu mới của khách', autoComplete: 'off', className: fld + ' font-mono' }),
                  h(Btn, { onClick: function () { setOpen(Object.assign({}, open, { nw: rnd() })); } }, 'Ngẫu nhiên'),
                  h(Btn, { primary: true, onClick: function () { changePw(g); }, disabled: !!busy || !open.nw }, busy === 'pw' ? 'Đang đổi…' : 'Lưu mật khẩu mới'))
                : open.kind === 'del' ? h('div', { className: 'flex flex-wrap items-center gap-2 text-[12px] text-[#e6e6e6]' },
                  h('span', null, 'Xoá hẳn tài khoản ', h('b', { className: 'text-white' }, g.n), '? Khách không đăng nhập được nữa và lịch sử của họ bị xoá.'),
                  !g.p && h('input', { type: 'text', value: open.old, onChange: function (e) { setOpen(Object.assign({}, open, { old: e.target.value })); }, placeholder: 'Mật khẩu hiện tại của ' + g.n, 'aria-label': 'Mật khẩu hiện tại', autoComplete: 'off', className: fld + ' font-mono w-64' }),
                  h('button', { onClick: function () { remove(g); }, disabled: !!busy, className: 'h-8 px-4 rounded-full bg-[#ff4e45] hover:brightness-110 text-white text-[12px] font-semibold cursor-pointer disabled:opacity-50' }, busy === 'del' ? 'Đang xoá…' : 'Xoá tài khoản này'),
                  h(Btn, { onClick: function () { setOpen(null); } }, 'Thôi'))
                : h('div', null,
                  h('div', { className: 'flex items-center gap-3 mb-2 text-[11.5px] text-[#aaa]' }, h('b', { className: 'text-white text-[12px]' }, 'Lịch sử thao tác của ' + g.n), open.ev && h('span', null, open.ev.length + ' dòng gần nhất'), h('span', { className: 'flex-1' }), h('button', { onClick: function () { loadLog(g); }, className: 'text-[#8ab4f8] hover:text-white cursor-pointer' }, 'Tải lại'), open.ev && open.ev.length > 0 && h('button', { onClick: function () { clearLog(g); }, className: 'text-[#ff8a83] hover:text-white cursor-pointer' }, 'Xoá lịch sử')),
                  !open.ev ? h(Busy, null, 'Đang tải lịch sử…')
                    : open.err ? h(Note, { error: true }, open.err)
                    : !open.ev.length ? h('div', { className: 'text-[12px] text-[#888]' }, 'Chưa có thao tác nào được ghi.' + (srv && !srv.persistent ? ' Máy chủ chưa gắn kho lưu nên lịch sử không giữ được lâu.' : ''))
                    : h('ol', { className: 'max-h-[320px] overflow-y-auto rounded-lg border border-[#2a2a2a] divide-y divide-[#242424]' }, open.ev.map(function (e, i) { return h('li', { key: i, className: 'grid grid-cols-[110px_110px_minmax(0,1fr)] gap-3 px-3 py-1.5 text-[12px]' }, h('span', { className: 'tabular-nums text-[#aaa]' }, when(e.t)), h('span', { className: 'text-[#c8c8c8] truncate' }, ROUTE_VN[e.r] || e.r || ''), h('span', { className: 'truncate ' + evTone(e), title: evText(e) }, evText(e))); }))))));
          })))),
      h('details', { className: 'mt-4 pt-3 border-t border-[#2a2a2a]' },
        h('summary', { className: 'text-[12px] font-medium text-[#c8c8c8] cursor-pointer hover:text-white' }, 'Thêm tài khoản đã có (tạo trong Firebase Console hoặc từ máy khác)'),
        h('div', { className: 'mt-2.5 grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]' },
          h('input', { type: 'text', value: AD.n, onChange: function (e) { setAD(Object.assign({}, AD, { n: e.target.value.toLowerCase().replace(/\s+/g, '') })); }, placeholder: 'Tên đăng nhập đã có', 'aria-label': 'Tên đăng nhập đã có', autoComplete: 'off', className: fld }),
          h('input', { type: 'text', value: AD.p, onChange: function (e) { setAD(Object.assign({}, AD, { p: e.target.value })); }, placeholder: 'Mật khẩu hiện tại của tài khoản đó', 'aria-label': 'Mật khẩu của tài khoản đã có', autoComplete: 'off', className: fld + ' font-mono' }),
          h(Btn, { onClick: adopt, disabled: !!busy || !AD.n || !AD.p }, busy === 'adopt' ? 'Đang kiểm tra…' : 'Cấp quyền khách')),
        h('p', { className: 'mt-2 text-[11.5px] text-[#aaa] leading-relaxed' }, 'Danh sách và mật khẩu khách lưu trên trình duyệt này (có trong file sao lưu) để bạn xem lại, đổi và xoá nhanh. Sang máy khác thì dùng ô này để đưa tài khoản vào danh sách.')));
  }
  function AccountPanel(p) {
    var user = Y.auth.currentUser(), isPass = !p.guest && user && (user.providerData || []).some(function (x) { return x.providerId === 'password'; });
    var s0 = useState(''), o = s0[0], setO = s0[1], s1 = useState(''), n = s1[0], setN = s1[1], s2 = useState(''), msg = s2[0], setMsg = s2[1];
    async function change() { setMsg(''); if (n.length < 8) { setMsg('Mật khẩu mới tối thiểu 8 ký tự'); return; } try { await Y.auth.changePassword(o, n); setMsg('Đã đổi mật khẩu'); setO(''); setN(''); } catch (e) { setMsg(e.message); } }
    return h(Section, { title: 'Tài khoản' },
      h('div', { className: 'flex flex-wrap items-center gap-3' }, h('div', { className: 'text-[10.5px] text-zinc-200' }, user ? (user.email || '').replace('@youtrend.user', ' (tài khoản mật khẩu)') : ''), h('span', { className: 'flex-1' }), h(Btn, { onClick: p.onLogout }, 'Đăng xuất')),
      isPass && h('div', { className: 'mt-4 pt-4 border-t border-zinc-900 grid gap-2 md:grid-cols-[1fr_1fr_auto]' }, h(Input, { type: 'password', value: o, onChange: function (e) { setO(e.target.value); }, placeholder: 'Mật khẩu hiện tại' }), h(Input, { type: 'password', value: n, onChange: function (e) { setN(e.target.value); }, placeholder: 'Mật khẩu mới (≥ 8 ký tự)' }), h(Btn, { onClick: change, disabled: !o || !n }, 'Đổi mật khẩu')),
      p.guest && h('p', { className: 'mt-3 text-[12px] text-[#c8c8c8] leading-relaxed' }, 'Bạn đang dùng tài khoản khách. Chủ web xem được lúc bạn online và lịch sử thao tác của tài khoản này (mục đã mở, nút đã bấm, lần gọi AI). Nội dung bạn gõ và API key của bạn không được ghi lại.'),
      msg && h('div', { className: 'text-[10.5px] text-zinc-400 mt-2' }, msg));
  }
  function DataPanel() {
    var inp = React.useRef(null);
    function backup() {
      var data = { app: 'youtrend', v: 4, at: new Date().toISOString(), keys: Y.keys.getPool(), saved: store.saved(), channels: store.channels(), ideas: store.ideas(), explore: st.json('yt4_explore_hist', []), channelHist: st.json('yt4_channel_hist', []), projects: store.projects(), briefs: store.briefs(), compare: store.compare(), nicheMarks: st.json('tn3_marks', {}), nichePresets: st.json('tn3_presets', []), countryGroups: st.json('tn3_cgroups', []), dreamGroups: st.json('yt4_groups', []), myPrompts: st.json('yt4_pr_mine', []), guests: st.json('yt4_guests', []) };
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
          if (Array.isArray(d.guests)) { var gg = st.json('yt4_guests', []) || [], gi = {}; gg.forEach(function (x) { gi[x.n] = 1; }); st.put('yt4_guests', gg.concat(d.guests.filter(function (x) { return x && typeof x.n === 'string' && !gi[x.n]; })).slice(0, 200)); }
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
      h(KeysPanel), h(ClaudePanel), window.YT4Mcp ? h(window.YT4Mcp.Box) : null, h(ServerPanel, { me: p.me }), p.me && p.me.admin ? h(GuestPanel, { me: p.me }) : null, h(AccountPanel, { onLogout: p.onLogout, guest: !!(p.me && p.me.role === 'guest') }), h(DataPanel));
  }

  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.library = Library;
  window.YT4Pages.settings = Settings;
})();
