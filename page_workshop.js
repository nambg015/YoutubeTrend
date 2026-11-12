// =========================================================================
// YOUTREND v5 — XƯỞNG TIÊU ĐỀ & THỬ THUMBNAIL (page_workshop.js)
// Xưởng tiêu đề: lấy video đang thắng làm mẫu (từ khoá / ngách trong Top Ngách / video đã lưu) → đo khuôn tiêu đề
//   → AI viết tiêu đề cho video của bạn theo đúng khuôn, chấm mức khớp khuôn.
// Thử thumbnail: đặt thumbnail của bạn vào giữa lưới video đối thủ như trên YouTube (tối/sáng, trang chủ/đề xuất/điện thoại).
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useMemo = React.useMemo, useRef = React.useRef, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Section = K.Section;
  var LANGS = [['English', 'Tiếng Anh'], ['Tiếng Việt', 'Tiếng Việt'], ['Español', 'Tiếng Tây Ban Nha'], ['Português', 'Tiếng Bồ Đào Nha'], ['Deutsch', 'Tiếng Đức'], ['Français', 'Tiếng Pháp'], ['हिन्दी', 'Tiếng Hindi'], ['日本語', 'Tiếng Nhật'], ['한국어', 'Tiếng Hàn'], ['Bahasa Indonesia', 'Tiếng Indonesia']];
  var fx = function (x) { return x == null ? '' : '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); };

  // Video mẫu dùng chung cho cả hai công cụ (giữ khi đổi tab trong phiên)
  var REF = { list: [], label: '' };

  // ---------- Chọn nguồn video mẫu ----------
  function RefPicker(p) {
    K.useBus('saved');
    var s0 = useState(st.get('yt4_ws_src') || 'kw'), src = s0[0], setSrc = s0[1], s1 = useState(p.q || ''), q = s1[0], setQ = s1[1], s2 = useState(st.get('yt4_ws_gl') || 'US'), gl = s2[0], setGl = s2[1];
    var s3 = useState(''), busy = s3[0], setBusy = s3[1], s4 = useState(''), err = s4[0], setErr = s4[1], s5 = useState(null), TN = s5[0], setTN = s5[1], s6 = useState(''), nk = s6[0], setNk = s6[1];
    var saved = store.saved().filter(function (v) { return v.subs; });
    useEffect(function () {
      if (src !== 'niche' || TN) return;
      if (!window.TopNgachData) { setTN({ niches: [] }); return; }
      window.TopNgachData.load().then(function (x) {
        var uf = window.TopNgachData.filters() || {}, f = Object.assign({}, window.TopNgachData.DEF, { mode: uf.mode || 'rpm', fmt: uf.fmt || 'long', maxSub: uf.maxSub || 5000 }, { hours: 720, perCh: 0, verdict: 'all', minOut: 2, minView: 1000 });
        var D = window.TopNgachEngine.build(x.store, f, Date.now()), by = {};
        D.videos.forEach(function (v) { (by[v.niche] = by[v.niche] || []).push(v); });
        var niches = Object.keys(by).map(function (k) { return { name: k, vids: by[k] }; }).filter(function (g) { return g.vids.length >= 5; }).sort(function (a, b) { return b.vids.length - a.vids.length; });
        setTN({ niches: niches }); if (niches.length) setNk(niches[0].name);
      }).catch(function () { setTN({ niches: [] }); });
    }, [src]);
    function done(list, label) { REF.list = list; REF.label = label; p.onRefs(list, label); }
    async function runKw() {
      if (!q.trim()) { setErr('Nhập từ khoá của ngách'); return; } setErr('');
      try {
        var R = await window.YT4Explore.analyzeKeyword({ q: q.trim(), gl: gl, days: 90, fmt: p.fmt || 'long', deep: false }, setBusy);
        var list = R.vids.filter(function (v) { return v.out != null; }).sort(function (a, b) { return b.out - a.out; }).slice(0, 48).map(function (v) { return { id: v.id, title: v.title, channel: v.channel, views: v.views, subs: v.subs, x: v.out, t: v.t, dur: v.dur }; });
        if (list.length < 6) setErr('Chỉ tìm được ' + list.length + ' video có số sub. Thử từ khoá rộng hơn.'); else done(list, 'từ khoá "' + q.trim() + '"');
      } catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    function useNiche() { var g = TN && TN.niches.find(function (x) { return x.name === nk; }); if (!g) return; done(g.vids.slice().sort(function (a, b) { return b.out - a.out; }).slice(0, 48).map(function (v) { return { id: v.id, title: v.title, channel: v.chName, views: v.views, subs: v.subs, x: v.out, t: v.t, dur: v.dur }; }), 'ngách "' + g.name + '" trong Top Ngách'); }
    function useSaved() { done(saved.map(function (v) { return { id: v.id, title: v.title, channel: v.channel, views: v.views, subs: v.subs, x: v.views / Math.max(v.subs, 100), t: Date.parse(v.published) || v.savedAt, dur: v.dur }; }).sort(function (a, b) { return b.x - a.x; }).slice(0, 48), 'video đã lưu'); }
    return h(Section, { title: 'Bước 1 · Chọn video mẫu đang thắng', sub: 'Web đo khuôn từ các video có view vượt số sub nhiều nhất', right: p.count > 0 && h('span', { className: 'text-[11.5px] font-medium px-2 py-1 rounded-md bg-[#2ba640]/20 text-[#6fcf85]' }, 'Đang dùng ' + p.count + ' video · ' + p.label) },
      h('div', { className: 'space-y-3' },
        h(Seg, { value: src, onChange: function (v) { setSrc(v); st.set('yt4_ws_src', v); setErr(''); }, options: [['kw', 'Tìm theo từ khoá'], ['niche', 'Ngách trong Top Ngách'], ['saved', 'Video đã lưu (' + saved.length + ')']] }),
        src === 'kw' ? h('div', { className: 'flex flex-col md:flex-row gap-2' },
          h(Input, { value: q, onChange: function (e) { setQ(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') runKw(); }, placeholder: 'Từ khoá của ngách, ví dụ: true crime documentary', className: 'md:flex-1 h-9 text-[12px]' }),
          h('div', { className: 'w-40' }, h(Select, { value: gl, onChange: function (v) { setGl(v); st.set('yt4_ws_gl', v); }, className: 'h-9', options: window.YT4Explore.REGIONS.map(function (r) { return [r[0], r[1]]; }) })),
          h(Btn, { primary: true, onClick: runKw, disabled: !!busy, className: 'h-9' }, busy ? 'Đang tìm…' : 'Lấy video mẫu (≈' + ((p.fmt || 'long') === 'long' ? 200 : 100) + ' quota)'))
          : src === 'niche' ? (!TN ? h(Busy, null, 'Đang mở kho Top Ngách…') : !TN.niches.length ? h('p', { className: 'text-[12px] text-cham-300' }, 'Kho Top Ngách chưa có ngách nào đủ 5 video. Quét ở mục Top Ngách trước, hoặc dùng nguồn Từ khoá.')
            : h('div', { className: 'flex flex-col md:flex-row gap-2' }, h('div', { className: 'md:flex-1' }, h(Select, { value: nk, onChange: setNk, className: 'h-9', options: TN.niches.map(function (g) { return [g.name, g.name + ' (' + g.vids.length + ' video nổ)']; }) })), h(Btn, { primary: true, onClick: useNiche, className: 'h-9' }, 'Dùng ngách này (không tốn quota)')))
            : saved.length < 6 ? h('p', { className: 'text-[12px] text-cham-300' }, 'Cần ít nhất 6 video đã lưu có số sub. Hiện có ' + saved.length + '.') : h(Btn, { primary: true, onClick: useSaved, className: 'h-9' }, 'Dùng ' + Math.min(48, saved.length) + ' video đã lưu'),
        busy && h(Busy, null, busy), err && h(Note, { error: true }, err)));
  }

  // ---------- Xưởng tiêu đề ----------
  function TitleLab(p) {
    K.useBus('ideas');
    var s0 = useState(REF.list), refs = s0[0], setRefs = s0[1], s1 = useState(REF.label), label = s1[0], setLabel = s1[1];
    var s2 = useState(function () { return Object.assign({ topic: '', lang: 'English', n: 12, note: '' }, st.json('yt4_title_opt', {})); }), o = s2[0], setO = s2[1];
    var s3 = useState(function () { return st.json('yt4_title_last', null); }), res = s3[0], setRes = s3[1], s4 = useState(false), busy = s4[0], setBusy = s4[1], s5 = useState(''), err = s5[0], setErr = s5[1];
    function set(k, v) { setO(function (x) { var n = Object.assign({}, x); n[k] = v; st.put('yt4_title_opt', n); return n; }); }
    var P = useMemo(function () { return refs.length >= 6 ? K.titlePatterns(refs, function (v) { return v.x; }) : null; }, [refs]);
    var good = P ? P.rows.filter(function (r) { return r.lift >= 0.1; }) : [];
    function payload() { return { topic: o.topic, lang: o.lang, n: o.n, note: o.note, patterns: P ? { len: P.lenWin, features: P.rows.filter(function (r) { return Math.abs(r.lift) >= 0.1; }).map(function (r) { return { name: r.name, win: Math.round(r.win * 100), rest: Math.round(r.rest * 100) }; }), openers: P.openers.map(function (x) { return x[0]; }), hooks: P.hooks.map(function (x) { return x[0]; }) } : {}, refs: refs.slice(0, 40).map(function (r) { return { title: r.title, views: N(r.views), x: r.x >= 10 ? Math.round(r.x) : +r.x.toFixed(1) }; }) }; }
    function promptText() {
      var d = payload(), L = ['# NHIỆM VỤ: VIẾT ' + d.n + ' TIÊU ĐỀ YOUTUBE THEO KHUÔN CỦA VIDEO ĐANG THẮNG', '', 'Video của tôi: ' + (d.topic || '(chưa nhập)'), 'Ngôn ngữ tiêu đề: ' + d.lang];
      if (d.note) L.push('Ghi chú: ' + d.note);
      L.push('', '## KHUÔN ĐO ĐƯỢC (' + label + ')', '- Độ dài trung vị tiêu đề thắng: ' + (d.patterns.len || '?') + ' ký tự');
      (d.patterns.features || []).forEach(function (f) { L.push('- ' + f.name + ': nhóm thắng ' + f.win + '%, còn lại ' + f.rest + '%'); });
      if (d.patterns.openers && d.patterns.openers.length) L.push('- Cách mở đầu hay gặp: ' + d.patterns.openers.join(' | '));
      if (d.patterns.hooks && d.patterns.hooks.length) L.push('- Từ lặp lại: ' + d.patterns.hooks.join(', '));
      L.push('', '## TIÊU ĐỀ VIDEO THẮNG (xếp theo view ÷ sub)'); d.refs.forEach(function (r, i) { L.push((i + 1) + '. ' + r.title + ' (' + r.views + ' view, ×' + r.x + ')'); });
      L.push('', '## YÊU CẦU', '- Mỗi tiêu đề một khuôn/góc khác nhau, độ dài gần mức trung vị, tự nhiên như người bản xứ.', '- Không chép nguyên tiêu đề mẫu, không bịa số liệu hay sự kiện, không giật tít sai sự thật.', '- Với mỗi tiêu đề ghi: khuôn đã dùng và vì sao người xem bấm (tiếng Việt, 1 câu).', '- Cuối cùng đề xuất 5 dòng chữ cho thumbnail (tối đa 4 từ).');
      return L.join('\n');
    }
    async function gen() {
      if (o.topic.trim().length < 4) { setErr('Mô tả video của bạn ở Bước 2 trước (ít nhất vài từ).'); return; }
      setErr(''); setBusy(true);
      try { var j = await Y.api('/api/research', { action: 'titles', data: payload() }); var r = { at: Date.now(), topic: o.topic, titles: j.titles || [], thumbs: j.thumbs || [] }; if (!r.titles.length) throw new Error('AI không trả về tiêu đề nào, thử lại.'); setRes(r); st.put('yt4_title_last', r); }
      catch (e) { setErr(e.status === 501 ? 'Máy chủ chưa có GEMINI_API_KEY (Vercel → Settings → Environment Variables). Bạn vẫn dùng được nút Copy prompt sang Claude bên dưới.' : U.errMsg(e)); }
      setBusy(false);
    }
    function fit(t) { var hit = good.filter(function (r) { var f = K.TITLE_FEATS.find(function (x) { return x[0] === r.name; }); return f && f[1](t); }); return { hit: hit, lenOk: P ? Math.abs(t.length - P.lenWin) <= 15 : true, score: good.length ? Math.round(hit.length / good.length * 100) : null }; }
    var ideas = store.ideas();
    return h('div', { className: 'space-y-4' },
      h(RefPicker, { onRefs: function (l, lb) { setRefs(l); setLabel(lb); }, count: refs.length, label: label, q: p.q }),
      refs.length >= 6 && h(Frag, null,
        h('details', { className: cx(K.C.card, 'p-4') }, h('summary', { className: 'cursor-pointer text-[12.5px] font-semibold text-cham-50' }, 'Khuôn tiêu đề đo được từ ' + refs.length + ' video mẫu', h('span', { className: 'ml-2 font-normal text-[11.5px] text-cham-400' }, good.length ? 'Nên dùng: ' + good.map(function (r) { return r.name.toLowerCase(); }).join(', ') + ' · dài khoảng ' + P.lenWin + ' ký tự' : 'dài khoảng ' + (P ? P.lenWin : '?') + ' ký tự')), h('div', { className: 'mt-4' }, h(K.PatternView, { data: P, metric: 'view ÷ sub' }))),
        h(Section, { title: 'Bước 2 · Video của bạn' },
          h('div', { className: 'space-y-3' },
            h('textarea', { value: o.topic, onChange: function (e) { set('topic', e.target.value); }, rows: 3, placeholder: 'Video của bạn nói về gì? Càng cụ thể càng tốt. Ví dụ: vụ rơi máy bay Cessna ở Arizona ngày 3/11, phi công 62 tuổi mất liên lạc sau 4 phút cất cánh, NTSB đang điều tra động cơ.', className: 'w-full rounded-lg bg-[#121212] border border-[#303030] px-3 py-2 text-[12px] text-cham-50 placeholder:text-cham-500 focus:border-[#3ea6ff] outline-none leading-relaxed' }),
            h('div', { className: 'flex flex-wrap items-end gap-3' },
              h(Field, { label: 'Ngôn ngữ tiêu đề' }, h('div', { className: 'w-48' }, h(Select, { value: o.lang, onChange: function (v) { set('lang', v); }, options: LANGS }))),
              h(Field, { label: 'Số tiêu đề' }, h(Seg, { value: o.n, onChange: function (v) { set('n', +v); }, options: [[8, '8'], [12, '12'], [20, '20']] })),
              h(Field, { label: 'Ghi chú cho AI (tuỳ chọn)', className: 'flex-1 min-w-[220px]' }, h(Input, { value: o.note, onChange: function (e) { set('note', e.target.value); }, placeholder: 'Ví dụ: giọng nghiêm túc, không dùng từ SHOCKING' })),
              h(Btn, { primary: true, onClick: gen, disabled: busy, className: 'h-9 px-5' }, busy ? 'AI đang viết…' : res ? 'Viết lại' : 'Viết tiêu đề bằng AI')),
            err && h(Note, { error: true }, err))),
        res && res.titles.length > 0 && h(Section, { title: 'Bước 3 · ' + res.titles.length + ' tiêu đề đề xuất', sub: 'Cho: ' + String(res.topic || '').slice(0, 110), right: h(Btn, { small: true, onClick: function () { U.copy(res.titles.map(function (t) { return t.title; }).join('\n')).then(function () { K.toast('Đã copy ' + res.titles.length + ' tiêu đề'); }); } }, 'Copy tất cả') },
          h('div', { className: 'divide-y divide-cham-800/70' }, res.titles.map(function (t, i) {
            var f = fit(t.title), added = ideas.some(function (x) { return x.title === t.title; });
            return h('div', { key: i, className: 'py-2.5 flex flex-wrap items-start gap-3' },
              h('span', { className: 'shrink-0 w-6 h-6 rounded-md bg-[#272727] text-[11px] font-semibold text-cham-300 flex items-center justify-center tabular-nums mt-0.5' }, i + 1),
              h('div', { className: 'flex-1 min-w-[240px]' },
                h('div', { className: 'text-[13px] font-medium text-cham-50 leading-snug' }, t.title),
                h('div', { className: 'mt-1 flex flex-wrap items-center gap-1.5' },
                  h('span', { className: cx('text-[10.5px] font-medium px-1.5 py-0.5 rounded tabular-nums', f.lenOk ? 'bg-[#2ba640]/20 text-[#6fcf85]' : 'bg-[#f2b52c]/15 text-[#f5c451]'), title: P ? 'Tiêu đề thắng dài khoảng ' + P.lenWin + ' ký tự' : '' }, t.title.length + ' ký tự'),
                  f.score != null && h('span', { className: cx('text-[10.5px] font-medium px-1.5 py-0.5 rounded tabular-nums', f.score >= 50 ? 'bg-[#2ba640]/20 text-[#6fcf85]' : 'bg-[#272727] text-cham-300'), title: 'Số đặc điểm của tiêu đề thắng mà tiêu đề này có' }, 'Khớp khuôn ' + f.hit.length + '/' + good.length),
                  f.hit.map(function (r) { return h('span', { key: r.name, className: 'text-[10.5px] px-1.5 py-0.5 rounded bg-[#272727] text-cham-300' }, r.name); })),
                (t.formula || t.why) && h('div', { className: 'mt-1 text-[11.5px] text-cham-400 leading-relaxed' }, [t.formula, t.why].filter(Boolean).join(' · '))),
              h('div', { className: 'flex gap-1.5 shrink-0' }, h(Btn, { small: true, onClick: function () { U.copy(t.title).then(function () { K.toast('Đã copy'); }); } }, 'Copy'), h(Btn, { small: true, on: added, disabled: added, onClick: function () { store.addIdea({ title: t.title, topic: res.topic || '', angle: t.formula || '', whyTry: t.why || '' }); K.toast('Đã thêm vào Kế hoạch video'); } }, added ? 'Đã thêm' : 'Thêm vào kế hoạch')));
          })),
          res.thumbs.length > 0 && h('div', { className: 'mt-3 pt-3 border-t border-cham-800/70' }, h('div', { className: 'text-[11.5px] text-cham-400 mb-1.5' }, 'Chữ gợi ý cho thumbnail'), h('div', { className: 'flex flex-wrap gap-1.5' }, res.thumbs.map(function (x, i) { return h('button', { key: i, onClick: function () { U.copy(x).then(function () { K.toast('Đã copy'); }); }, title: 'Bấm để copy', className: 'px-2.5 py-1.5 rounded-md bg-[#f5c451] text-[#2a1d00] text-[12px] font-bold cursor-pointer hover:brightness-110' }, x); })))),
        h('details', { className: cx(K.C.card, 'p-4') }, h('summary', { className: 'cursor-pointer text-[12px] text-cham-200' }, 'Hoặc gửi cùng dữ liệu sang Claude'), h('div', { className: 'mt-3' }, h(K.ClaudeBox, { kind: 'titles', title: 'Tiêu đề: ' + (o.topic || '').slice(0, 60), file: 'tieu-de', prompt: promptText() })))),
      refs.length < 6 && h(Empty, { title: 'Chọn video mẫu để bắt đầu', sub: 'Tiêu đề hay là tiêu đề giống cái đang thắng trong đúng ngách của bạn. Lấy video mẫu ở Bước 1, web đo khuôn rồi AI viết theo khuôn đó cho video của bạn.' }));
  }

  // ---------- Thử thumbnail ----------
  function ThumbLab(p) {
    var s0 = useState(REF.list), refs = s0[0], setRefs = s0[1], s1 = useState(REF.label), label = s1[0], setLabel = s1[1];
    var s2 = useState([]), imgs = s2[0], setImgs = s2[1], s3 = useState(0), cur = s3[0], setCur = s3[1];
    var s4 = useState(function () { return Object.assign({ title: '', channel: '', layout: 'home', theme: 'dark', mark: false }, st.json('yt4_thumb_opt', {})); }), o = s4[0], setO = s4[1], s5 = useState(2), pos = s5[0], setPos = s5[1], s6 = useState(false), drag = s6[0], setDrag = s6[1];
    var inp = useRef(null);
    function set(k, v) { setO(function (x) { var n = Object.assign({}, x); n[k] = v; st.put('yt4_thumb_opt', n); return n; }); }
    function addFiles(files) { var a = Array.prototype.filter.call(files || [], function (f) { return /^image\//.test(f.type); }).slice(0, 3); if (!a.length) return; setImgs(function (cur0) { var n = cur0.concat(a.map(function (f) { return { url: URL.createObjectURL(f), name: f.name || 'ảnh dán' }; })).slice(-3); setCur(n.length - 1); return n; }); }
    useEffect(function () { var f = function (e) { if (e.clipboardData && e.clipboardData.files && e.clipboardData.files.length) addFiles(e.clipboardData.files); }; window.addEventListener('paste', f); return function () { window.removeEventListener('paste', f); }; }, []);
    var dark = o.theme === 'dark', me = imgs[cur], count = o.layout === 'side' ? 9 : o.layout === 'mobile' ? 5 : 11;
    var others = refs.slice(0, count);
    var cards = others.map(function (r) { return { r: r }; }); if (me) cards.splice(Math.min(pos, cards.length), 0, { me: true });
    var tx = dark ? 'text-[#f1f1f1]' : 'text-[#0f0f0f]', sub = dark ? 'text-[#aaaaaa]' : 'text-[#606060]';
    var card = function (c, i) {
      var isMe = c.me, title = isMe ? (o.title || 'Tiêu đề video của bạn') : c.r.title, ch = isMe ? (o.channel || 'Kênh của bạn') : c.r.channel, meta = isMe ? '12K lượt xem · 3 giờ trước' : N(c.r.views) + ' lượt xem · ' + (c.r.t ? U.ago(c.r.t) + ' trước' : '');
      var img = h('div', { className: cx('relative overflow-hidden bg-black shrink-0', o.layout === 'side' ? 'w-[168px] rounded-lg' : 'w-full rounded-xl', isMe && o.mark && 'ring-2 ring-[#3ea6ff] ring-offset-2 ' + (dark ? 'ring-offset-[#0f0f0f]' : 'ring-offset-white')) }, h('img', { src: isMe ? me.url : U.thumb(c.r.id, o.layout === 'side' ? 'mqdefault' : 'hqdefault'), alt: '', className: 'w-full aspect-video object-cover' }), h('span', { className: 'absolute bottom-1 right-1 text-[11px] font-medium px-1 rounded bg-black/80 text-white tabular-nums' }, isMe ? '10:24' : U.dur(c.r.dur || 600)));
      if (o.layout === 'side') return h('div', { key: i, className: 'flex gap-2' }, img, h('div', { className: 'min-w-0' }, h('div', { className: cx('text-[13px] font-medium leading-snug line-clamp-2', tx) }, title), h('div', { className: cx('text-[11.5px] mt-1 truncate', sub) }, ch), h('div', { className: cx('text-[11.5px]', sub) }, meta)));
      return h('div', { key: i, className: 'min-w-0' }, img, h('div', { className: 'flex gap-2.5 mt-2.5' }, h('span', { className: cx('w-8 h-8 rounded-full shrink-0', dark ? 'bg-[#3f3f3f]' : 'bg-[#d9d9d9]') }), h('div', { className: 'min-w-0' }, h('div', { className: cx('text-[13.5px] font-medium leading-snug line-clamp-2', tx) }, title), h('div', { className: cx('text-[12px] mt-1 truncate', sub) }, ch), h('div', { className: cx('text-[12px]', sub) }, meta))));
    };
    return h('div', { className: 'space-y-4' },
      h(RefPicker, { onRefs: function (l, lb) { setRefs(l); setLabel(lb); }, count: refs.length, label: label, fmt: 'long' }),
      h(Section, { title: 'Bước 2 · Thumbnail của bạn', sub: 'Tải tối đa 3 phương án để so. Ảnh chỉ nằm trên máy bạn, không gửi đi đâu.' },
        h('div', { className: 'grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]' },
          h('div', { onDragOver: function (e) { e.preventDefault(); setDrag(true); }, onDragLeave: function () { setDrag(false); }, onDrop: function (e) { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }, className: cx('rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center gap-3 min-h-[150px] transition', drag ? 'border-[#3ea6ff] bg-[#3ea6ff]/10' : 'border-[#3f3f3f] bg-[#181818]') },
            imgs.length > 0 && h('div', { className: 'flex flex-wrap gap-2 justify-center' }, imgs.map(function (m, i) { return h('button', { key: m.url, onClick: function () { setCur(i); }, 'aria-pressed': cur === i, title: m.name, className: cx('relative rounded-lg overflow-hidden cursor-pointer', cur === i ? 'ring-2 ring-[#f1f1f1]' : 'opacity-70 hover:opacity-100') }, h('img', { src: m.url, alt: 'Phương án ' + 'ABC'[i], className: 'w-32 aspect-video object-cover' }), h('span', { className: 'absolute top-1 left-1 text-[10.5px] font-bold px-1.5 rounded bg-black/80 text-white' }, 'ABC'[i])); })),
            h('div', { className: 'text-[12px] text-cham-300 text-center' }, imgs.length ? 'Bấm một ảnh để đặt vào lưới. Kéo thả hoặc dán (Ctrl+V) để thêm.' : 'Kéo thả ảnh vào đây, dán bằng Ctrl+V, hoặc chọn file. Nên dùng ảnh 1280×720.'),
            h('div', { className: 'flex gap-2' }, h(Btn, { primary: !imgs.length, onClick: function () { inp.current.click(); } }, imgs.length ? 'Thêm ảnh' : 'Chọn ảnh thumbnail'), imgs.length > 0 && h(Btn, { onClick: function () { setImgs([]); setCur(0); } }, 'Xoá hết')),
            h('input', { ref: inp, type: 'file', accept: 'image/*', multiple: true, className: 'hidden', onChange: function (e) { addFiles(e.target.files); e.target.value = ''; } })),
          h('div', { className: 'space-y-3' },
            h(Field, { label: 'Tiêu đề video của bạn' }, h(Input, { value: o.title, onChange: function (e) { set('title', e.target.value); }, placeholder: 'Tiêu đề sẽ hiện dưới thumbnail', className: 'h-9 text-[12px]' })),
            h(Field, { label: 'Tên kênh' }, h(Input, { value: o.channel, onChange: function (e) { set('channel', e.target.value); }, placeholder: 'Kênh của bạn', className: 'h-9 text-[12px]' }))))),
      !refs.length ? h(Empty, { title: 'Chọn video mẫu ở Bước 1', sub: 'Thumbnail của bạn sẽ được đặt giữa thumbnail thật của các video đang thắng trong ngách, đúng như người xem nhìn thấy trên YouTube.' })
        : h(Section, { title: 'Bước 3 · Nhìn như người xem', sub: me ? 'Thumbnail của bạn đang ở vị trí thứ ' + (Math.min(pos, others.length) + 1) + '. Lùi ra xa màn hình và xem mắt bạn dừng ở đâu trước.' : 'Chưa có ảnh của bạn. Tải ảnh ở Bước 2 để chèn vào lưới.',
          right: h('div', { className: 'flex flex-wrap items-center gap-2 justify-end' },
            h(Seg, { value: o.layout, onChange: function (v) { set('layout', v); }, options: [['home', 'Trang chủ'], ['side', 'Cột đề xuất'], ['mobile', 'Điện thoại']] }),
            h(Seg, { value: o.theme, onChange: function (v) { set('theme', v); }, options: [['dark', 'Nền tối'], ['light', 'Nền sáng']] }),
            h(Btn, { small: true, onClick: function () { setPos(Math.floor(Math.random() * Math.max(1, others.length))); }, disabled: !me }, 'Đổi vị trí'),
            h(Btn, { small: true, on: o.mark, onClick: function () { set('mark', !o.mark); }, disabled: !me }, 'Khoanh ảnh của tôi')) },
          h('div', { className: cx('rounded-xl p-4 sm:p-5', dark ? 'bg-[#0f0f0f]' : 'bg-white') },
            o.layout === 'home' ? h('div', { className: 'grid gap-x-4 gap-y-7 grid-cols-2 md:grid-cols-3 xl:grid-cols-4' }, cards.map(card))
              : o.layout === 'side' ? h('div', { className: 'max-w-[402px] space-y-2' }, cards.map(card))
                : h('div', { className: 'max-w-[390px] mx-auto space-y-5' }, cards.map(card)))),
      h('p', { className: 'text-[11px] text-cham-400' }, 'Lượt xem và thời gian dưới ảnh của bạn là số giả để lưới trông tự nhiên. Số của các video khác là số thật lúc lấy mẫu.'));
  }

  window.YT4Workshop = { TitleLab: TitleLab, ThumbLab: ThumbLab };
})();
