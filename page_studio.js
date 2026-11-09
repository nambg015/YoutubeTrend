// =========================================================================
// YOUTREND v4 — TẠO TÀI NGUYÊN + DỰ ÁN & CLAUDE (page_studio.js)
// Tìm tài nguyên → lưu thành thẻ phiên trong Dự án → tạo prompt "clone" nhiều video ăn theo chủ đề
// → copy sang claude.ai (Project bất kỳ, tài khoản bất kỳ) hoặc viết ngay bằng Claude API.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Seg = K.Seg, Tabs = K.Tabs, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Section = K.Section, Modal = K.Modal;

  function useSessions() {
    var s = useState(null), list = s[0], set = s[1];
    useEffect(function () {
      var load = function () { if (window.ResourceStore) window.ResourceStore.list().then(set); else set([]); };
      load(); window.addEventListener('res-history', load); return function () { window.removeEventListener('res-history', load); };
    }, []);
    return list;
  }
  function counts(r) {
    var sel = r.sel || {}, n = function (o) { return Object.keys(o || {}).filter(function (k) { return o[k]; }).length; };
    return { v: r.sel ? n(sel.v) : (r.videos || []).filter(function (v) { return v.related; }).length, i: r.sel ? n(sel.i) : (r.images || []).length, f: n(sel.f), c: (r.captures || []).length, w: (r.webVideos || []).length, s: (r.sources || []).length };
  }

  // ---------- Prompt sản xuất ----------
  var OUT = [['script', 'Kịch bản voice tiếng Anh'], ['scenes', 'Danh sách cảnh ≤ 3–4 giây gắn tài nguyên'], ['meta', 'Tiêu đề + mô tả + thumbnail']];
  function buildProduction(pj, r, o) {
    var dossier = window.ResourceStore ? window.ResourceStore.buildPrompt(r) : '';
    var words = Math.round(o.minutes * 150), L = [];
    L.push('# NHIỆM VỤ: SẢN XUẤT ' + o.count + ' VIDEO YOUTUBE ĂN THEO CHỦ ĐỀ NÀY');
    L.push('');
    L.push('Bạn là biên kịch + đạo diễn dựng cho một kênh YouTube dạng news explainer / documentary ngắn. Mục tiêu: làm video ăn theo đề xuất (suggested) của chủ đề đang lên, giữ người xem tới cuối.');
    if (pj) {
      L.push('');
      L.push('## KÊNH / DỰ ÁN: ' + pj.name);
      if (pj.desc) L.push(pj.desc);
      if (pj.refUrl) L.push('Video mẫu của kênh để bám phong cách: ' + pj.refUrl);
    }
    if (r.refVideo) L.push('Video mẫu của phiên tìm kiếm: "' + r.refVideo.title + '" — ' + r.refVideo.channel + ' — https://www.youtube.com/watch?v=' + r.refVideo.id);
    L.push('');
    L.push('## YÊU CẦU CHUNG');
    L.push('- Làm ' + o.count + ' video, mỗi video một GÓC KHÁC NHAU của cùng chủ đề (vd: diễn biến mới nhất, giải thích nguyên nhân, dòng thời gian, nhân vật/đối tượng, "điều chưa ai nói", so sánh với vụ tương tự…). Mỗi góc phải đủ hấp dẫn để đứng riêng.');
    L.push('- Lời đọc (voiceover) bằng TIẾNG ANH, giọng tin tức điềm tĩnh, câu ngắn. Độ dài mỗi video khoảng ' + o.minutes + ' phút ≈ ' + words + ' từ.');
    L.push('- Hook mạnh trong 10–15 giây đầu, mở vòng tò mò, nhắc lại câu hỏi chính giữa video, kết bằng câu chốt + gợi ý xem video tiếp theo.');
    L.push('- CHỈ dùng sự thật trong HỒ SƠ TÀI NGUYÊN bên dưới, ghi [n] nguồn sau mỗi ý quan trọng trong cột ghi chú. Không bịa số liệu, tên, trích dẫn.');
    L.push('- Tin chưa xác minh / chỉ một số nguồn đưa: được dùng NHƯNG phải rào đón, ví dụ "Some reports suggest…, but this has not been officially confirmed." hoặc "According to unverified social media posts…". Tuyệt đối không nói như sự thật.');
    L.push('- Tôn trọng nạn nhân, không giật gân về cái chết, không đoán bừa nguyên nhân khi cơ quan điều tra chưa kết luận.');
    if (o.out.scenes) {
      L.push('- Chia lời đọc thành các CẢNH, mỗi cảnh ≤ 3–4 giây (≈ 8–10 từ). Mỗi cảnh gắn MỘT hình ảnh cụ thể trong hồ sơ bằng mã: V# (video YouTube, ghi rõ đoạn mm:ss–mm:ss), F# (khung hình YouTube), C# (ảnh đã chụp), W# (video trong bài báo), I# (hình ảnh). Nếu không có tài nguyên phù hợp, ghi "TỰ TẠO:" + mô tả cảnh (bản đồ, đồ hoạ, chữ chạy, ảnh minh hoạ AI…).');
      L.push('- Mỗi cảnh có thể có chữ trên màn hình (nhãn kiểu "REAL PHOTO · N722BD", "NTSB BRIEFING · NOV 2", trích dẫn ngắn). Ghi rõ nguồn của hình khi là ảnh báo chí.');
    }
    if (o.note) L.push('- Ghi chú thêm của tôi: ' + o.note);
    L.push('');
    L.push('## ĐẦU RA CHO MỖI VIDEO (Markdown)');
    var n = 1;
    L.push((n++) + '. Góc khai thác + vì sao người xem sẽ bấm (1–2 câu, tiếng Việt).');
    if (o.out.meta) {
      L.push((n++) + '. 5 phương án TIÊU ĐỀ tiếng Anh (cùng phong cách video mẫu, ≤ 70 ký tự), đánh dấu phương án nên dùng.');
      L.push((n++) + '. MÔ TẢ YouTube tiếng Anh 150–250 từ (câu đầu chứa từ khoá chính, có dòng nguồn tham khảo) + 15 tag.');
      L.push((n++) + '. 3 ý tưởng THUMBNAIL: chữ trên ảnh ≤ 4 từ, bố cục, dùng hình nào trong hồ sơ (mã I#/F#/C#), điểm nhấn (khoanh đỏ, mũi tên…).');
    }
    if (o.out.script && o.out.scenes) L.push((n++) + '. KỊCH BẢN DẠNG BẢNG: | # | Thời gian | Lời đọc (EN) | Hình (mã tài nguyên + đoạn mm:ss) | Chữ trên màn hình | Nguồn [n] |');
    else if (o.out.script) L.push((n++) + '. KỊCH BẢN lời đọc tiếng Anh đầy đủ, chia đoạn, kèm [n] nguồn ở cuối mỗi đoạn.');
    else if (o.out.scenes) L.push((n++) + '. DANH SÁCH CẢNH: | # | Thời gian | Nội dung cảnh | Hình (mã tài nguyên + đoạn mm:ss) | Chữ trên màn hình |');
    L.push((n++) + '. Danh sách tài nguyên cần tải / chụp thêm cho video này.');
    L.push('');
    L.push('Viết lần lượt từng video, đầy đủ, không tóm tắt. Nếu quá dài cho một lần trả lời, viết hết video 1 rồi dừng và hỏi tôi có viết tiếp video 2 không.');
    L.push('');
    L.push('========================================================================');
    L.push(dossier);
    return L.join('\n');
  }

  // ---------- Thanh dự án trên hồ sơ ----------
  function ProjectBar(p) {
    K.useBus('projects');
    var r = p.r, projects = store.projects(), links = store.links(), pid = links[r.id] || '';
    var s0 = useState(false), creating = s0[0], setCreating = s0[1], s1 = useState(''), nm = s1[0], setNm = s1[1];
    async function save(newPid) { await p.save(Object.assign({}, r)); store.linkSession(r.id, newPid != null ? newPid : pid); K.toast(newPid || pid ? 'Đã lưu thẻ phiên vào dự án' : 'Đã lưu phiên'); }
    return h('div', { className: 'flex flex-wrap items-center gap-2 pt-3 mt-2 border-t border-white/[0.06]' },
      h('span', { className: 'text-[11px] text-zinc-400' }, 'Dự án'),
      creating ? h(Frag, null, h(Input, { value: nm, onChange: function (e) { setNm(e.target.value); }, placeholder: 'Tên dự án, ví dụ: Kênh tin máy bay', className: 'w-60 h-8', autoFocus: true }),
        h(Btn, { small: true, onClick: async function () { if (!nm.trim()) return; var pj = store.saveProject({ name: nm.trim() }); setCreating(false); setNm(''); await save(pj.id); } }, 'Tạo & lưu'), h(Btn, { small: true, onClick: function () { setCreating(false); } }, 'Huỷ'))
        : h('div', { className: 'w-56' }, h(Select, { value: pid, className: 'h-8 text-[12px]', onChange: function (v) { if (v === '__new') { setCreating(true); return; } save(v); }, options: [['', '— Chưa gắn dự án —']].concat(projects.map(function (x) { return [x.id, x.name]; }), [['__new', '+ Tạo dự án mới…']]) })),
      h(Btn, { small: true, onClick: function () { save(); } }, 'Lưu thẻ phiên'),
      h(Btn, { small: true, on: true, onClick: async function () { await save(); p.produce(r.id); } }, 'Sản xuất video với Claude', h(K.Icon, { name: 'right' })));
  }

  // ---------- Bảng sản xuất cho 1 phiên ----------
  function Producer(p) {
    K.useBus('productions'); K.useBus('claude');
    var r = p.r, pj = p.project;
    var s0 = useState(function () { return Object.assign({ count: 3, minutes: 8, out: { script: true, scenes: true, meta: true }, note: '' }, st.json('yt4_prod_opt', {})); }), o = s0[0], setO = s0[1];
    var s1 = useState(''), out = s1[0], setOut = s1[1], s2 = useState(false), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1], s4 = useState(null), cur = s4[0], setCur = s4[1];
    var ctl = useRef(null);
    function set(k, v) { setO(function (x) { var n = Object.assign({}, x); n[k] = v; st.put('yt4_prod_opt', n); return n; }); }
    var prompt = buildProduction(pj, r, o), cfg = Y.claude.cfg(), prods = store.productions(r.id);
    function copyOpen() { U.copy(prompt).then(function () { K.toast('Đã copy prompt (' + N(prompt.length) + ' ký tự). Dán vào Claude.'); }).catch(function () { K.toast('Trình duyệt chặn copy — dùng nút Tải .md'); }); window.open((pj && pj.claudeUrl) || 'https://claude.ai/new', '_blank', 'noopener'); }
    async function write() {
      setErr(''); setOut(''); setBusy(true); var id = 'pr_' + Date.now().toString(36); setCur(id);
      ctl.current = new AbortController();
      try {
        var res = await Y.claude.stream({ prompt: prompt, signal: ctl.current.signal, system: 'You are an expert YouTube scriptwriter and video editor. Follow the user\'s format exactly. Never invent facts beyond the provided dossier; hedge unverified claims.', onText: function (_, full) { setOut(full); } });
        store.saveProduction({ id: id, sid: r.id, pid: pj ? pj.id : '', at: Date.now(), model: cfg.model, opt: o, title: r.dossier && r.dossier.title, text: res.text, stop: res.stop });
        K.toast(res.stop === 'max_tokens' ? 'Claude dừng vì chạm giới hạn độ dài — bấm "Viết tiếp" hoặc giảm số video.' : 'Claude đã viết xong, đã lưu vào phiên');
      } catch (e) { if (e.name !== 'AbortError') setErr(e.message); }
      setBusy(false);
    }
    async function cont(prev) {
      setErr(''); setBusy(true); var base = prev.text; setOut(base); setCur(prev.id); ctl.current = new AbortController();
      try {
        var c = Y.claude.cfg(), r2 = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: ctl.current.signal, headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: c.model, max_tokens: c.maxTokens || 16000, messages: [{ role: 'user', content: prompt }, { role: 'assistant', content: base }, { role: 'user', content: 'Viết tiếp đúng chỗ đang dừng, giữ nguyên định dạng.' }] }) });
        var j = await r2.json(); if (!r2.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r2.status);
        var t = base + '\n\n' + ((j.content || []).map(function (x) { return x.text || ''; }).join('')); setOut(t);
        store.saveProduction(Object.assign({}, prev, { text: t, at: Date.now(), stop: j.stop_reason }));
      } catch (e) { if (e.name !== 'AbortError') setErr(e.message); }
      setBusy(false);
    }
    var shown = cur ? (prods.find(function (x) { return x.id === cur; }) || { text: out }) : null;
    var text = busy ? out : shown ? shown.text : '';
    return h('div', { className: 'space-y-4' },
      h('div', { className: 'flex flex-wrap items-center gap-3' }, h(Btn, { small: true, onClick: p.onBack }, h(K.Icon, { name: 'left' }), 'Dự án'), h('div', { className: 'text-[15px] text-cham-50 font-medium flex-1 min-w-0 truncate' }, (r.dossier && r.dossier.title) || r.prompt.slice(0, 80)), pj && h('span', { className: 'text-[12px] text-sky-300' }, pj.name)),
      h(Section, { title: 'Cấu hình sản xuất', sub: 'Prompt gồm yêu cầu sản xuất + toàn bộ hồ sơ tài nguyên đã chọn trong phiên (video, khung hình, ảnh chụp, ảnh báo, nguồn).' },
        h('div', { className: 'flex flex-wrap items-end gap-4' },
          h(Field, { label: 'Số video (mỗi video 1 góc)' }, h(Seg, { value: o.count, onChange: function (v) { set('count', +v); }, options: [[1, '1'], [3, '3'], [5, '5']] })),
          h(Field, { label: 'Độ dài mỗi video' }, h(Seg, { value: o.minutes, onChange: function (v) { set('minutes', +v); }, options: [[3, '3 phút'], [5, '5 phút'], [8, '8 phút'], [12, '12 phút'], [20, '20 phút']] })),
          h(Field, { label: 'Đầu ra' }, h('div', { className: 'flex flex-wrap gap-1.5' }, OUT.map(function (x) { var on = !!o.out[x[0]]; return h(Btn, { key: x[0], small: true, on: on, onClick: function () { var n = Object.assign({}, o.out); n[x[0]] = !on; set('out', n); } }, x[1]); })))),
        h('div', { className: 'mt-3' }, h(Input, { value: o.note, onChange: function (e) { set('note', e.target.value); }, placeholder: 'Ghi chú thêm cho Claude (tuỳ chọn): giọng kể, đối tượng người xem, điều cần tránh…' })),
        h('div', { className: 'flex flex-wrap items-center gap-2 mt-4' },
          h(Btn, { primary: true, onClick: copyOpen }, 'Copy prompt & mở ' + (pj && pj.claudeUrl ? 'Project trên claude.ai' : 'claude.ai')),
          h(Btn, { onClick: write, disabled: busy || !Y.claude.ready(), title: Y.claude.ready() ? '' : 'Thêm Claude API key trong Cài đặt' }, busy ? 'Claude đang viết…' : 'Viết ngay bằng Claude API'),
          busy && h(Btn, { small: true, onClick: function () { ctl.current && ctl.current.abort(); } }, 'Dừng'),
          h(Btn, { small: true, onClick: function () { U.download('prompt-' + r.id + '.md', new Blob([prompt], { type: 'text/markdown' })); } }, 'Tải prompt .md'),
          h('span', { className: 'text-[11px] text-zinc-400' }, N(prompt.length) + ' ký tự' + (Y.claude.ready() ? ' · ' + cfg.model : ' · chưa có Claude API key (Cài đặt → Claude)'))),
        err && h(Note, { error: true, className: 'mt-3' }, err)),
      prods.length > 0 && h('div', { className: 'flex flex-wrap items-center gap-1.5' }, h('span', { className: 'text-[11px] text-zinc-400 mr-1' }, 'Bản đã viết'), prods.map(function (x) { return h(Btn, { key: x.id, small: true, on: cur === x.id, onClick: function () { setCur(x.id); } }, new Date(x.at).toLocaleString('vi-VN') + (x.stop === 'max_tokens' ? ' (dở)' : '')); })),
      (busy || shown) && h(Section, {
        title: busy ? 'Claude đang viết…' : 'Kết quả', right: !busy && shown && h('div', { className: 'flex gap-1.5' },
          shown.stop === 'max_tokens' && h(Btn, { small: true, onClick: function () { cont(shown); } }, 'Viết tiếp'),
          h(Btn, { small: true, onClick: function () { U.copy(shown.text).then(function () { K.toast('Đã copy'); }); } }, 'Copy'),
          h(Btn, { small: true, onClick: function () { U.download('kich-ban-' + r.id + '.md', new Blob([shown.text], { type: 'text/markdown' })); } }, 'Tải .md'),
          h(Btn, { small: true, onClick: function () { if (window.confirm('Xoá bản này?')) { store.removeProduction(shown.id); setCur(null); } } }, 'Xoá'))
      }, h('pre', { className: 'whitespace-pre-wrap text-[12.5px] leading-relaxed text-zinc-200 font-sans max-h-[70vh] overflow-y-auto' }, text || '…')),
      h('details', { className: cx(K.C.card, 'p-4') }, h('summary', { className: 'cursor-pointer text-[13px] text-zinc-300' }, 'Xem toàn bộ prompt'), h('pre', { className: 'mt-3 whitespace-pre-wrap text-[11px] text-zinc-400 max-h-[60vh] overflow-y-auto' }, prompt)));
  }

  // ---------- Danh sách dự án + thẻ phiên ----------
  function ProjectModal(p) {
    var s = useState(Object.assign({ name: '', desc: '', claudeUrl: '', refUrl: '' }, p.pj)), f = s[0], setF = s[1];
    var set = function (k) { return function (e) { var v = e.target.value; setF(function (o) { var n = Object.assign({}, o); n[k] = v; return n; }); }; };
    return h(Modal, { title: f.id ? 'Sửa dự án' : 'Dự án mới', onClose: p.onClose }, h('div', { className: 'space-y-3' },
      h(Field, { label: 'Tên dự án / kênh' }, h(Input, { value: f.name, onChange: set('name'), placeholder: 'Ví dụ: Kênh tin hàng không', autoFocus: true })),
      h(Field, { label: 'Phong cách kênh (Claude sẽ bám theo)' }, h('textarea', { value: f.desc, onChange: set('desc'), rows: 4, placeholder: 'Ví dụ: news explainer về tai nạn máy bay, giọng điềm tĩnh, dựng từ dữ liệu NTSB, ATC audio, ảnh thật; cảnh ≤ 3–4s; nhãn REAL PHOTO / NTSB BRIEFING…', className: cx(K.C.input, 'h-auto py-2') })),
      h(Field, { label: 'Link Project trên claude.ai (tuỳ chọn)' }, h(Input, { value: f.claudeUrl, onChange: set('claudeUrl'), placeholder: 'https://claude.ai/project/…' })),
      h(Field, { label: 'Video mẫu của kênh (tuỳ chọn)' }, h(Input, { value: f.refUrl, onChange: set('refUrl'), placeholder: 'https://youtu.be/…' })),
      h('div', { className: 'flex justify-between gap-2 pt-1' },
        f.id ? h(Btn, { small: true, onClick: function () { if (window.confirm('Xoá dự án "' + f.name + '"? Các phiên vẫn còn, chỉ bỏ gắn.')) { store.removeProject(f.id); p.onClose(); } } }, 'Xoá dự án') : h('span'),
        h('div', { className: 'flex gap-2' }, h(Btn, { onClick: p.onClose }, 'Huỷ'), h(Btn, { primary: true, disabled: !f.name.trim(), onClick: function () { store.saveProject(f); p.onClose(); } }, 'Lưu')))));
  }
  function SessionCard(p) {
    var r = p.r, c = counts(r), D = r.dossier || {}, thumbs = (r.videos || []).filter(function (v) { return v.related; }).slice(0, 3);
    return h('div', { className: cx(K.C.card, 'overflow-hidden flex flex-col hover:border-sky-400/30 transition') },
      h('div', { className: 'grid grid-cols-3 gap-px bg-[#0b0c10]/60' }, [0, 1, 2].map(function (i) { var v = thumbs[i], cap = !v && (r.captures || [])[i]; return h('div', { key: i, className: 'aspect-video bg-zinc-900/80' }, v ? h('img', { src: U.thumb(v.id), loading: 'lazy', className: 'w-full h-full object-cover' }) : cap ? h('img', { src: cap.dataUrl, className: 'w-full h-full object-cover' }) : null); })),
      h('div', { className: 'p-3 flex-1 flex flex-col gap-2' },
        h('div', { className: 'flex items-center gap-1.5 text-[10px]' }, h('span', { className: cx('px-1.5 py-0.5 rounded', r.mode === 'ai' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-200') }, r.mode === 'ai' ? 'AI + Google' : 'Miễn phí'), D.category && h('span', { className: 'px-1.5 py-0.5 rounded bg-cham-800 text-zinc-400' }, D.category), h('span', { className: 'text-zinc-400 ml-auto' }, U.date(r.at))),
        h('div', { className: 'text-[13px] text-zinc-100 leading-snug line-clamp-2', title: D.title || r.prompt }, D.title || r.prompt.slice(0, 120)),
        h('div', { className: 'grid grid-cols-5 gap-1 text-center text-[10px]' }, [['Video', c.v, 'text-sky-300'], ['Khung', c.f, 'text-violet-300'], ['Chụp', c.c, 'text-amber-200'], ['Ảnh', c.i, 'text-emerald-300'], ['Nguồn', c.s, 'text-zinc-200']].map(function (x) { return h('div', { key: x[0], className: 'rounded bg-cham-900 py-1' }, h('div', { className: cx('text-[13px] font-medium', x[2]) }, x[1]), h('div', { className: 'text-zinc-500' }, x[0])); })),
        store.productions(r.id).length > 0 && h('div', { className: 'text-[11px] text-emerald-300/90' }, store.productions(r.id).length + ' bản kịch bản đã viết'),
        h('div', { className: 'flex flex-wrap gap-1.5 mt-auto pt-1' },
          h(Btn, { small: true, on: true, onClick: function () { p.produce(r.id); } }, 'Sản xuất'),
          h(Btn, { small: true, onClick: function () { p.open(r.id); } }, 'Mở hồ sơ'),
          p.projects.length > 0 && h('select', { value: store.links()[r.id] || '', onChange: function (e) { store.linkSession(r.id, e.target.value); }, className: 'h-7 px-1.5 rounded border border-zinc-800 bg-[#0b0c10]/60 text-[11px] text-zinc-400 cursor-pointer max-w-[130px]' }, [['', 'Chưa gắn']].concat(p.projects.map(function (x) { return [x.id, x.name]; })).map(function (x) { return h('option', { key: x[0], value: x[0] }, x[1]); })),
          h('button', { onClick: function () { if (window.confirm('Xoá phiên này (cả ảnh đã chụp)?')) window.ResourceStore.remove(r.id); }, className: 'ml-auto text-[11px] text-zinc-500 hover:text-rose-300 cursor-pointer' }, 'Xoá'))));
  }
  function Projects(p) {
    K.useBus('projects'); K.useBus('productions');
    var sessions = useSessions(), projects = store.projects(), links = store.links();
    var s0 = useState(p.pick || 'all'), pid = s0[0], setPid = s0[1], s1 = useState(null), edit = s1[0], setEdit = s1[1];
    if (!sessions) return h(Busy, null, 'Đang mở kho phiên…');
    var cnt = function (id) { return sessions.filter(function (r) { return id === 'all' ? true : id === 'none' ? !links[r.id] : links[r.id] === id; }).length; };
    var list = sessions.filter(function (r) { return pid === 'all' ? true : pid === 'none' ? !links[r.id] : links[r.id] === pid; });
    var cur = projects.find(function (x) { return x.id === pid; });
    var navBtn = function (id, label, n) { var on = pid === id; return h('button', { key: id, onClick: function () { setPid(id); }, className: cx('w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] cursor-pointer transition', on ? 'bg-emerald-500/10 text-emerald-200 border border-emerald-500/25' : 'text-zinc-400 hover:text-cham-50 hover:bg-cham-900 border border-transparent') }, h('span', { className: 'truncate' }, label), h('span', { className: 'text-[11px] text-zinc-500' }, n)); };
    return h('div', { className: 'grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]' },
      h('div', { className: 'space-y-1' }, h(Btn, { primary: true, className: 'w-full mb-3', onClick: function () { setEdit({}); } }, 'Tạo dự án'),
        navBtn('all', 'Tất cả phiên', cnt('all')), navBtn('none', 'Chưa gắn dự án', cnt('none')),
        projects.length > 0 && h('div', { className: K.C.label + ' pt-3' }, 'Dự án'), projects.map(function (x) { return navBtn(x.id, x.name, cnt(x.id)); })),
      h('div', { className: 'space-y-4 min-w-0' },
        cur && h('div', { className: cx(K.C.card, 'p-4 flex flex-wrap items-start gap-3') },
          h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-[15px] text-cham-50 font-medium' }, cur.name), cur.desc && h('div', { className: 'text-[12px] text-zinc-400 mt-1 whitespace-pre-line' }, cur.desc), cur.refUrl && h('a', { href: cur.refUrl, target: '_blank', rel: 'noopener noreferrer', className: 'text-[11px] text-sky-300 hover:underline' }, 'Video mẫu')),
          h('div', { className: 'flex gap-2' }, cur.claudeUrl && h('a', { href: cur.claudeUrl, target: '_blank', rel: 'noopener noreferrer', className: K.C.btn }, 'Mở Project claude.ai'), h(Btn, { onClick: function () { setEdit(cur); } }, 'Sửa'))),
        !list.length ? h(Empty, { title: sessions.length ? 'Chưa có phiên nào trong mục này' : 'Chưa có phiên tìm tài nguyên nào', sub: 'Tạo hồ sơ ở tab "Tìm tài nguyên", rồi bấm "Lưu thẻ phiên" và chọn dự án.' }, h(Btn, { onClick: p.goSearch }, 'Tìm tài nguyên'))
          : h('div', { className: 'grid gap-3 md:grid-cols-2 2xl:grid-cols-3' }, list.map(function (r) { return h(SessionCard, { key: r.id, r: r, projects: projects, produce: p.produce, open: p.open }); }))),
      edit && h(ProjectModal, { pj: edit, onClose: function () { setEdit(null); } }));
  }

  function Studio(p) {
    var s0 = useState(p.params && p.params.sub || 'search'), sub = s0[0], setSub = s0[1];
    var s1 = useState({ id: null, k: 0 }), open = s1[0], setOpen = s1[1], s2 = useState(null), prod = s2[0], setProd = s2[1];
    var sessions = useSessions();
    function produce(id) { setProd(id); setSub('projects'); window.scrollTo(0, 0); }
    function openSession(id) { setOpen({ id: id, k: Date.now() }); setSub('search'); window.scrollTo(0, 0); }
    var r = prod && sessions && sessions.find(function (x) { return x.id === prod; });
    var pj = r && store.projects().find(function (x) { return x.id === store.links()[r.id]; });
    return h('div', { className: 'space-y-5' },
      h('div', null, h('h1', { className: 'font-display text-[30px] leading-9 font-bold text-cham-50 tracking-tight' }, 'Tạo tài nguyên'), h('p', { className: 'text-[14px] text-cham-400 mt-1.5' }, 'Tìm tin, video, ảnh cho một chủ đề → lưu thành thẻ phiên trong dự án → để Claude viết kịch bản nhiều video ăn theo chủ đề.')),
      h(K.Help, { id: 'studio', title: 'Cách làm video ăn theo một sự kiện', steps: ['Tìm tài nguyên: dán thông tin vụ việc (và link video mẫu nếu có), bấm Tạo hồ sơ. Web tìm tin mới nhất, video họp báo/bản tin, ảnh trong bài báo.', 'Ở tab Video bấm vào khung hình nhỏ để chọn, hoặc Xem & chụp để tự chụp cảnh cần. Bỏ chọn những gì không dùng.', 'Chọn Dự án (kênh của bạn) rồi bấm Lưu thẻ phiên. Mọi phiên nằm trong tab Dự án & Claude.', 'Bấm Sản xuất video với Claude: chọn số video, độ dài, rồi Copy prompt sang claude.ai hoặc để Claude viết ngay.'], terms: [['Chưa xác minh', 'tin chỉ một số nguồn đưa; khi đọc phải nói kiểu "some reports suggest… but not officially confirmed"'], ['F#, C#, V#, W#, I#', 'mã khung hình, ảnh chụp, video, video trong báo, hình ảnh — Claude dùng mã này để gắn hình vào từng cảnh']] }),
      h(Tabs, { value: sub, onChange: function (v) { setSub(v); if (v !== 'projects') setProd(null); }, items: [['search', 'Tìm tài nguyên'], ['projects', 'Dự án & Claude', sessions ? sessions.length : null]] }),
      h('div', { style: { display: sub === 'search' ? 'block' : 'none' } }, window.ResourceStudio ? h(K.Mono, null, h(window.ResourceStudio, Object.assign({}, p.common, { openId: open.id, openKey: open.k, extraHead: function (R, promptText, save) { return h(ProjectBar, { r: R, save: save, produce: produce }); } }))) : h(K.Missing, { name: 'Tạo tài nguyên', file: 'resource_v1.js' })),
      sub === 'projects' && (r ? h(Producer, { r: r, project: pj, onBack: function () { setProd(null); } }) : h(Projects, { produce: produce, open: openSession, goSearch: function () { setSub('search'); } })));
  }
  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.studio = Studio;
  window.YT4Studio = { buildProduction: buildProduction };
})();
