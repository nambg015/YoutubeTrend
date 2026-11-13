// =========================================================================
// YOUTREND v5 — CÔNG CỤ (page_tools.js)
// 1) Quét bình luận: dán link video → lấy bình luận (1 quota / 100 bình luận) → lọc, xuất TXT/CSV
//    → AI đọc bình luận: nhu cầu thật, câu hỏi, điều khen/chê, ý tưởng video, chân dung khán giả (ước đoán).
// 2) Bộ thông tin đăng video: tên tệp chuẩn, 5 tiêu đề, mô tả, thẻ từ khoá, hashtag, bình luận ghim.
// 3) Câu lệnh AI soạn sẵn: điền ngách/ngôn ngữ một lần, sao chép là dùng; lưu được câu lệnh riêng.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useMemo = React.useMemo, Frag = React.Fragment;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var Btn = K.Btn, Field = K.Field, Input = K.Input, Select = K.Select, Empty = K.Empty, Note = K.Note, Busy = K.Busy, Section = K.Section, Tabs = K.Tabs;
  var TA = 'w-full bg-[#121212] border border-[#303030] rounded-lg px-3 py-2 text-[12px] text-[#f1f1f1] placeholder:text-[#717171] leading-relaxed';
  var copy = function (t, what) { U.copy(t).then(function () { K.toast('Đã sao chép ' + (what || '')); }, function () { K.toast('Trình duyệt chặn sao chép, hãy bôi đen rồi Ctrl+C.'); }); };
  function vid(s) { s = String(s || '').trim(); var m = /(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/.exec(s) || /^([\w-]{11})$/.exec(s); return m ? m[1] : ''; }
  function slugFile(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').split('-').slice(0, 10).join('-'); }

  // ------------------------------------------------------------------
  // 1) QUÉT BÌNH LUẬN
  // ------------------------------------------------------------------
  function Comments(p) {
    var s0 = useState(st.json('yt4_cm_links', '')), links = s0[0], setLinks = s0[1];
    var s1 = useState(st.json('yt4_cm_opt', { max: 300, order: 'relevance' })), opt = s1[0], setOpt0 = s1[1];
    var s2 = useState(function () { return st.json('yt4_cm_last', null); }), R = s2[0], setR = s2[1];
    var s3 = useState(''), busy = s3[0], setBusy = s3[1], s4 = useState(''), err = s4[0], setErr = s4[1];
    var s5 = useState(''), q = s5[0], setQ = s5[1], s6 = useState(''), flt = s6[0], setFlt = s6[1];
    var s7 = useState(false), aiBusy = s7[0], setAiBusy = s7[1];
    function setOpt(k, v) { var n = Object.assign({}, opt); n[k] = v; setOpt0(n); st.put('yt4_cm_opt', n); }
    var ids = useMemo(function () { var seen = {}, out = []; links.split(/[\s,]+/).forEach(function (x) { var id = vid(x); if (id && !seen[id]) { seen[id] = 1; out.push(id); } }); return out.slice(0, 30); }, [links]);
    var saved = store.saved ? store.saved() : [];

    async function scan() {
      if (!ids.length) { setErr('Dán ít nhất 1 link video YouTube.'); return; }
      setErr(''); st.put('yt4_cm_links', links);
      var rows = [], vids = [], skipped = [];
      try {
        setBusy('Lấy thông tin ' + ids.length + ' video…');
        var info = {};
        try { var j0 = await Y.yt('videos', { part: 'snippet,statistics', id: ids.join(','), maxResults: 50 }); (j0.items || []).forEach(function (x) { info[x.id] = { title: x.snippet.title, channel: x.snippet.channelTitle, comments: +(x.statistics.commentCount || 0) }; }); } catch (e) { if (e && e.code === 'quotaExceeded') throw e; }
        for (var i = 0; i < ids.length; i++) {
          var id = ids[i], got = 0, token = '', meta = info[id] || { title: id, channel: '' };
          try {
            do {
              setBusy('Video ' + (i + 1) + '/' + ids.length + ': đã lấy ' + got + ' bình luận…');
              var j = await Y.yt('commentThreads', { part: 'snippet', videoId: id, maxResults: 100, order: opt.order, textFormat: 'plainText', pageToken: token || undefined });
              (j.items || []).forEach(function (x) { var c = ((x.snippet || {}).topLevelComment || {}).snippet || {}; var t = String(c.textOriginal || c.textDisplay || '').trim(); if (t) rows.push({ k: x.id, v: id, t: t, l: +c.likeCount || 0, r: +(x.snippet.totalReplyCount || 0), d: Date.parse(c.publishedAt) || 0 }); });
              got += (j.items || []).length; token = j.nextPageToken || '';
            } while (token && got < opt.max);
            vids.push({ id: id, title: meta.title, channel: meta.channel, n: got });
          } catch (e) {
            if (e && e.code === 'quotaExceeded') throw e;
            skipped.push((meta.title || id) + ': ' + (/disabled/i.test((e && (e.code + ' ' + e.msg)) || '') ? 'kênh đã tắt bình luận' : U.errMsg(e)));
            if (got) vids.push({ id: id, title: meta.title, channel: meta.channel, n: got });
          }
        }
        var res = { at: Date.now(), vids: vids, rows: rows, skipped: skipped, ai: null };
        setR(res); try { st.put('yt4_cm_last', Object.assign({}, res, { rows: rows.slice(0, 3000) })); } catch (e) { }
        K.toast('Đã lấy ' + N(rows.length) + ' bình luận từ ' + vids.length + ' video');
      } catch (e) { setErr(U.errMsg(e)); }
      setBusy('');
    }
    async function readAI() {
      if (!R || !R.rows.length) return; setAiBusy(true); setErr('');
      try {
        // mẫu gửi AI: 200 bình luận nhiều like nhất + 120 bình luận rải đều
        var byLike = R.rows.slice().sort(function (a, b) { return b.l - a.l; }), top = byLike.slice(0, 200), rest = byLike.slice(200), step = Math.max(1, Math.floor(rest.length / 120));
        var sample = top.concat(rest.filter(function (_, i) { return i % step === 0; }).slice(0, 120));
        var r = await Y.api('/api/research', { action: 'audience', data: { titles: R.vids.map(function (v) { return v.title; }), comments: sample.map(function (c) { return { t: c.t, l: c.l }; }) } });
        var n = Object.assign({}, R, { ai: r.audience, aiN: sample.length }); setR(n); try { st.put('yt4_cm_last', Object.assign({}, n, { rows: n.rows.slice(0, 3000) })); } catch (e) { }
      } catch (e) { setErr(e.message || 'AI lỗi, thử lại sau.'); }
      setAiBusy(false);
    }
    var title = function (id) { var v = R && R.vids.filter(function (x) { return x.id === id; })[0]; return v ? v.title : id; };
    var rows = useMemo(function () {
      if (!R) return []; var lc = q.trim().toLowerCase();
      return R.rows.filter(function (c) { if (lc && c.t.toLowerCase().indexOf(lc) < 0) return false; if (flt === 'q' && c.t.indexOf('?') < 0 && c.t.indexOf('？') < 0) return false; if (flt === 'like' && c.l < 5) return false; if (flt === 'long' && c.t.length < 120) return false; if (flt === 'reply' && c.r < 1) return false; return true; });
    }, [R, q, flt]);
    var words = useMemo(function () {
      if (!R || !K.words) return []; var cnt = {}; R.rows.slice(0, 2500).forEach(function (c) { var seen = {}; K.words(c.t).forEach(function (w) { if (w.length > 2 && !seen[w]) { seen[w] = 1; cnt[w] = (cnt[w] || 0) + 1; } }); });
      return Object.keys(cnt).map(function (w) { return [w, cnt[w]]; }).filter(function (x) { return x[1] >= 3; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 28);
    }, [R]);
    function exportTxt() { U.download('binh-luan-' + new Date().toISOString().slice(0, 10) + '.txt', new Blob([rows.map(function (c) { return c.t.replace(/\s+/g, ' '); }).join('\n')], { type: 'text/plain;charset=utf-8' })); }
    function exportCsv() { U.csv('binh-luan', [['STT', 'Video', 'Link video', 'Nội dung', 'Like', 'Trả lời', 'Ngày']].concat(rows.map(function (c, i) { return [i + 1, title(c.v), U.vurl(c.v), c.t, c.l, c.r, c.d ? new Date(c.d).toISOString().slice(0, 10) : '']; }))); }
    var prompt = R ? ['Bạn là chuyên gia phát triển kênh YouTube. Dưới đây là ' + Math.min(rows.length, 400) + ' bình luận thật (kèm số like) từ các video: ' + R.vids.map(function (v) { return '"' + v.title + '"'; }).join(', ') + '.', '', 'Hãy:', '1. Gom bình luận thành 5–8 nhóm nhu cầu, mỗi nhóm kèm 2 bình luận nguyên văn và ước lượng tỉ lệ.', '2. Liệt kê các câu hỏi lặp lại và điều khán giả chê.', '3. Vẽ chân dung người xem điển hình (đây là ước đoán, nói rõ độ chắc chắn).', '4. Đề xuất 10 video tiếp theo, mỗi video có tiêu đề, hook 15 giây đầu và bình luận nào dẫn tới ý đó.', '', 'BÌNH LUẬN:'].concat(rows.slice().sort(function (a, b) { return b.l - a.l; }).slice(0, 400).map(function (c) { return '- (' + c.l + ' like) ' + c.t.replace(/\s+/g, ' ').slice(0, 400); })).join('\n') : '';
    var G = K.Grid, A = R && R.ai;
    var cols = [
      { k: 'v', t: 'Video', w: 'max-w-[220px]', v: function (c) { return title(c.v); }, r: function (c) { return h('div', { className: 'flex items-center gap-2 min-w-0' }, h(K.GThumb, { id: c.v }), h('span', { className: 'text-[#aaa] line-clamp-2 leading-snug', title: title(c.v) }, title(c.v))); } },
      { k: 't', t: 'Nội dung', w: 'min-w-[360px]', v: function (c) { return c.t.toLowerCase(); }, r: function (c) { return h('span', { className: 'text-[#f1f1f1] whitespace-pre-line leading-snug line-clamp-4', title: c.t }, c.t); } },
      { k: 'l', t: 'Like', right: true, tone: 'y', v: function (c) { return c.l; }, r: function (c) { return N(c.l); } },
      { k: 'r', t: 'Trả lời', right: true, tone: 'b', v: function (c) { return c.r; }, r: function (c) { return N(c.r); } },
      { k: 'd', t: 'Ngày', right: true, v: function (c) { return c.d; }, r: function (c) { return c.d ? new Date(c.d).toLocaleDateString('vi-VN') : '–'; } },
      { k: 'a', t: 'Sao chép', r: function (c) { return h('button', { onClick: function () { copy(c.t, 'bình luận'); }, className: 'h-[2em] px-[0.8em] rounded-full bg-[#323232] hover:bg-[#424242] text-[0.92em] text-[#f1f1f1] cursor-pointer' }, 'Chép'); } }
    ];
    var list = function (ttl, arr, tone) { return arr && arr.length ? h('div', { className: 'rounded-xl bg-[#181818] border border-[#303030] p-3' }, h('div', { className: cx('text-[11.5px] font-semibold mb-1.5', tone) }, ttl), h('ul', { className: 'space-y-1.5' }, arr.map(function (x, i) { return h('li', { key: i, className: 'text-[12px] text-[#e6e6e6] leading-snug flex gap-2' }, h('span', { className: 'text-[#717171]' }, i + 1 + '.'), h('span', null, x)); }))) : null; };
    return h('div', { className: 'space-y-4' },
      h(Section, { title: 'Quét bình luận' },
        h('div', { className: 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]' },
          h('div', null, h('textarea', { value: links, onChange: function (e) { setLinks(e.target.value); }, rows: 5, placeholder: 'Dán link video YouTube, mỗi dòng một link (tối đa 30 video)\nhttps://www.youtube.com/watch?v=…', className: TA }),
            h('div', { className: 'flex flex-wrap items-center gap-2 mt-2' }, h('span', { className: 'text-[11px] text-[#aaa]' }, ids.length + ' video hợp lệ'),
              saved.length > 0 && h('button', { onClick: function () { setLinks(saved.slice(0, 15).map(function (v) { return U.vurl(v.id); }).join('\n')); }, className: 'text-[11px] text-[#7cc3ff] hover:underline cursor-pointer' }, 'Lấy ' + Math.min(15, saved.length) + ' video đã lưu'))),
          h('div', { className: 'space-y-2' },
            h(Field, { label: 'Số bình luận mỗi video' }, h(Select, { value: opt.max, onChange: function (v) { setOpt('max', +v); }, options: [[100, '100 (≈1 quota)'], [300, '300 (≈3 quota)'], [1000, '1.000 (≈10 quota)'], [3000, '3.000 (≈30 quota)']] })),
            h(Field, { label: 'Thứ tự lấy' }, h(Select, { value: opt.order, onChange: function (v) { setOpt('order', v); }, options: [['relevance', 'Nổi bật nhất trước'], ['time', 'Mới nhất trước']] })),
            h(Btn, { primary: true, onClick: scan, disabled: !!busy || !ids.length, className: 'w-full' }, busy ? 'Đang quét…' : 'Quét bình luận'))),
        busy && h('div', { className: 'mt-3' }, h(Busy, null, busy)), err && h('div', { className: 'mt-3' }, h(Note, { error: true }, err))),
      !R ? h(Empty, { title: 'Chưa có bình luận nào', sub: 'Dán link các video đang thắng trong ngách của bạn. Bình luận cho biết khán giả muốn xem gì tiếp, họ hỏi gì và chê gì.' }) : h(Frag, null,
        h('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4' },
          [['Bình luận đã lấy', N(R.rows.length), 'text-[#6fcf85]'], ['Video', R.vids.length, 'text-[#7cc3ff]'], ['Câu hỏi', N(R.rows.filter(function (c) { return /[?？]/.test(c.t); }).length), 'text-[#f5c451]'], ['Từ 5 like trở lên', N(R.rows.filter(function (c) { return c.l >= 5; }).length), 'text-[#c9a7ff]']].map(function (x) { return h('div', { key: x[0], className: 'yt-card px-4 py-3' }, h('div', { className: cx('text-[19px] font-bold tabular-nums', x[2]) }, x[1]), h('div', { className: 'text-[11px] text-[#aaa]' }, x[0])); })),
        R.skipped && R.skipped.length > 0 && h(Note, null, 'Bỏ qua ' + R.skipped.length + ' video: ' + R.skipped.join(' · ')),
        h(Section, { title: 'AI đọc bình luận', right: h(Btn, { primary: !A, small: !!A, onClick: readAI, disabled: aiBusy || R.rows.length < 5 }, aiBusy ? 'AI đang đọc, chờ 15–30 giây…' : A ? 'Đọc lại' : 'Để AI đọc ' + N(Math.min(320, R.rows.length)) + ' bình luận') },
          !A ? h('p', { className: 'text-[12px] text-[#aaa]' }, 'AI gom bình luận thành nhu cầu thật, câu hỏi hay gặp, điều khán giả khen và chê, ý tưởng video tiếp theo và chân dung người xem. Dùng 1 lượt AI.')
            : h('div', { className: 'space-y-3' },
              A.summary && h('p', { className: 'text-[12.5px] text-[#f1f1f1] leading-relaxed' }, A.summary),
              h('div', { className: 'grid gap-3 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]' },
                h('div', { className: 'rounded-xl bg-[#181818] border border-[#2ba640]/50 p-3' }, h('div', { className: 'text-[11.5px] font-semibold text-[#6fcf85] mb-2' }, 'Nhu cầu thật của khán giả'),
                  h('div', { className: 'space-y-2' }, A.needs.map(function (x, i) { return h('div', { key: i, className: 'rounded-lg bg-[#212121] px-3 py-2' }, h('div', { className: 'flex items-start gap-2' }, h('span', { className: 'flex-1 text-[12.5px] font-medium text-[#f1f1f1]' }, x.need), x.share && h('span', { className: 'shrink-0 px-1.5 py-0.5 rounded bg-[#1d3a2a] text-[#9fe0ad] text-[11px] font-semibold' }, x.share)), x.evidence && h('div', { className: 'text-[11.5px] text-[#aaa] mt-1 italic' }, '"' + x.evidence + '"')); }))),
                h('div', { className: 'rounded-xl bg-[#181818] border border-[#3ea6ff]/50 p-3' }, h('div', { className: 'text-[11.5px] font-semibold text-[#7cc3ff] mb-2' }, 'Chân dung người xem (ước đoán)'),
                  A.persona.who && h('p', { className: 'text-[12.5px] text-[#f1f1f1] leading-snug mb-2' }, A.persona.who),
                  h('dl', { className: 'grid grid-cols-2 gap-1.5' }, [['Độ tuổi', 'age'], ['Giới tính', 'gender'], ['Khu vực', 'region'], ['Ngôn ngữ', 'language'], ['Mức độ', 'level'], ['Độ chắc chắn', 'confidence']].map(function (x) { return A.persona[x[1]] ? h('div', { key: x[1], className: 'rounded-lg bg-[#212121] px-2.5 py-1.5' }, h('dt', { className: 'text-[10.5px] text-[#aaa]' }, x[0]), h('dd', { className: 'text-[12px] font-medium text-[#f1f1f1]' }, A.persona[x[1]])) : null; })),
                  A.persona.basis && h('p', { className: 'text-[11px] text-[#aaa] mt-2 leading-snug' }, 'Dựa vào: ' + A.persona.basis),
                  h('p', { className: 'text-[10.5px] text-[#717171] mt-1.5' }, 'YouTube không công khai tuổi và giới tính người xem của kênh khác, nên đây là suy đoán từ cách họ viết bình luận.'))),
              h('div', { className: 'grid gap-3 md:grid-cols-3' }, list('Câu hỏi hay gặp', A.questions, 'text-[#f5c451]'), list('Điều họ thích', A.loves, 'text-[#6fcf85]'), list('Điều họ chê', A.complaints, 'text-[#ff8a83]')),
              A.ideas.length > 0 && h('div', { className: 'rounded-xl bg-[#181818] border border-[#a970ff]/50 p-3' }, h('div', { className: 'text-[11.5px] font-semibold text-[#c9a7ff] mb-2' }, 'Ý tưởng video từ bình luận'),
                h('div', { className: 'grid gap-2 md:grid-cols-2' }, A.ideas.map(function (x, i) { return h('div', { key: i, className: 'rounded-lg bg-[#212121] px-3 py-2 flex items-start gap-2' }, h('div', { className: 'flex-1 min-w-0' }, h('div', { className: 'text-[12.5px] font-medium text-[#f1f1f1]' }, x.title), x.why && h('div', { className: 'text-[11px] text-[#aaa] mt-0.5' }, x.why)), store.addIdea && h('button', { onClick: function () { store.addIdea({ title: x.title, note: 'Từ bình luận: ' + x.why, source: 'comments' }); K.toast('Đã thêm vào kế hoạch'); }, className: 'shrink-0 h-7 px-2.5 rounded-full bg-[#323232] hover:bg-[#424242] text-[11px] text-[#f1f1f1] cursor-pointer' }, 'Thêm kế hoạch')); }))))),
        words.length > 0 && h('div', { className: 'flex flex-wrap items-center gap-1.5' }, h('span', { className: 'text-[11.5px] text-[#aaa] mr-1' }, 'Từ được nhắc nhiều:'), words.map(function (w) { return h('button', { key: w[0], onClick: function () { setQ(q === w[0] ? '' : w[0]); }, className: cx('h-7 px-2.5 rounded-lg text-[11.5px] cursor-pointer', q === w[0] ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3a3a3a]') }, w[0] + ' ', h('span', { className: 'opacity-60 tabular-nums' }, w[1])); })),
        G && h(G, { storeKey: 'cm', cols: cols, rows: rows, rowKey: function (c) { return c.k; }, limit: 400, sort: { k: 'l', d: -1 }, empty: 'Không có bình luận nào khớp bộ lọc.',
          left: h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('input', { value: q, onChange: function (e) { setQ(e.target.value); }, placeholder: 'Lọc theo chữ trong bình luận', 'aria-label': 'Lọc bình luận', className: 'h-7 w-56 bg-[#121212] border border-[#303030] rounded-full px-3 text-[11.5px] text-[#f1f1f1]' }),
            [['', 'Tất cả'], ['q', 'Chỉ câu hỏi'], ['like', 'Từ 5 like'], ['reply', 'Có trả lời'], ['long', 'Bình luận dài']].map(function (x) { return h('button', { key: x[0], onClick: function () { setFlt(x[0]); }, 'aria-pressed': flt === x[0], className: cx('h-7 px-3 rounded-full text-[11.5px] font-medium cursor-pointer', flt === x[0] ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#323232] text-[#f1f1f1] hover:bg-[#424242]') }, x[1]); }),
            h('span', { className: 'text-[11px] text-[#aaa] tabular-nums' }, N(rows.length) + ' dòng' + (rows.length > 400 ? ' (hiện 400, xuất file để lấy hết)' : '')),
            h('button', { onClick: exportTxt, className: 'h-7 px-3 rounded-full bg-[#263850] hover:bg-[#2f4666] text-[11.5px] font-medium text-[#b0daff] cursor-pointer' }, 'Xuất TXT'),
            h('button', { onClick: exportCsv, className: 'h-7 px-3 rounded-full bg-[#3a2a12] hover:bg-[#4a3617] text-[11.5px] font-medium text-[#f5c451] cursor-pointer' }, 'Xuất CSV')) }),
        K.ClaudeBox && h(K.ClaudeBox, { title: 'Gửi bình luận sang Claude để phân tích sâu hơn', kind: 'comments', prompt: prompt, file: 'phan-tich-binh-luan', meta: { videos: R.vids.length } })));
  }

  // ------------------------------------------------------------------
  // 2) BỘ THÔNG TIN ĐĂNG VIDEO
  // ------------------------------------------------------------------
  var LANGS = [['Vietnamese', 'Tiếng Việt'], ['English', 'Tiếng Anh'], ['Japanese', 'Tiếng Nhật'], ['Korean', 'Tiếng Hàn'], ['Spanish', 'Tiếng Tây Ban Nha'], ['Portuguese', 'Tiếng Bồ Đào Nha'], ['German', 'Tiếng Đức'], ['French', 'Tiếng Pháp'], ['Hindi', 'Tiếng Hindi']];
  function Upload() {
    var s0 = useState(st.json('yt4_seo_in', { topic: '', keyword: '', lang: 'Vietnamese', refs: '' })), f = s0[0], setF0 = s0[1];
    var s1 = useState(st.json('yt4_seo_out', null)), R = s1[0], setR = s1[1], s2 = useState(false), busy = s2[0], setBusy = s2[1], s3 = useState(''), err = s3[0], setErr = s3[1];
    function setF(k, v) { var n = Object.assign({}, f); n[k] = v; setF0(n); st.put('yt4_seo_in', n); }
    var localName = slugFile((f.keyword ? f.keyword + ' ' : '') + f.topic.split('\n')[0]);
    async function run() {
      if (f.topic.trim().length < 4) { setErr('Hãy mô tả video của bạn.'); return; }
      setBusy(true); setErr('');
      try { var r = await Y.api('/api/research', { action: 'seo', data: { topic: f.topic, keyword: f.keyword, lang: f.lang, refs: f.refs.split('\n').map(function (x) { return x.trim(); }).filter(Boolean) } }); setR(r.seo); st.put('yt4_seo_out', r.seo); }
      catch (e) { setErr(e.message || 'AI lỗi, thử lại sau.'); }
      setBusy(false);
    }
    var box = function (ttl, text, extra) { return h('div', { className: 'rounded-xl bg-[#181818] border border-[#303030] p-3' }, h('div', { className: 'flex items-center gap-2 mb-1.5' }, h('span', { className: 'flex-1 text-[11.5px] font-semibold text-[#aaa]' }, ttl), extra, h('button', { onClick: function () { copy(text, ttl.toLowerCase()); }, className: 'h-7 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, 'Sao chép')), h('div', { className: 'text-[12.5px] text-[#f1f1f1] whitespace-pre-line leading-relaxed break-words' }, text)); };
    var tags = R ? R.tags.join(', ') : '';
    return h('div', { className: 'space-y-4' },
      h(Section, { title: 'Bộ thông tin đăng video' },
        h('div', { className: 'grid gap-3 lg:grid-cols-2' },
          h('div', { className: 'space-y-2' },
            h(Field, { label: 'Video nói về gì (1–3 câu)' }, h('textarea', { value: f.topic, onChange: function (e) { setF('topic', e.target.value); }, rows: 4, placeholder: 'Ví dụ: Cách tìm ngách YouTube view ngoại cho người mới, 5 bước, có ví dụ kênh nhỏ dưới 5K sub', className: TA })),
            h('div', { className: 'grid gap-2 sm:grid-cols-2' }, h(Field, { label: 'Từ khoá chính' }, h(Input, { value: f.keyword, onChange: function (e) { setF('keyword', e.target.value); }, placeholder: 'ngách view ngoại' })), h(Field, { label: 'Ngôn ngữ video' }, h(Select, { value: f.lang, onChange: function (v) { setF('lang', v); }, options: LANGS })))),
          h('div', { className: 'space-y-2' },
            h(Field, { label: 'Tiêu đề video đang thắng trong ngách (tuỳ chọn, mỗi dòng một tiêu đề)' }, h('textarea', { value: f.refs, onChange: function (e) { setF('refs', e.target.value); }, rows: 4, placeholder: 'Dán vài tiêu đề đối thủ để AI viết theo đúng kiểu đang ăn view', className: TA })),
            h('div', { className: 'flex items-center gap-2' }, h(Btn, { primary: true, onClick: run, disabled: busy }, busy ? 'AI đang viết…' : 'Tạo tiêu đề, mô tả, thẻ'), h('span', { className: 'text-[11px] text-[#aaa]' }, 'Dùng 1 lượt AI')))),
        err && h('div', { className: 'mt-3' }, h(Note, { error: true }, err))),
      h('div', { className: 'rounded-xl bg-[#181818] border border-[#2ba640]/50 p-3 flex flex-wrap items-center gap-3' },
        h('span', { className: 'px-2 py-1 rounded-md bg-[#1d3a2a] text-[#9fe0ad] text-[11px] font-semibold' }, 'Tên tệp chuẩn'),
        h('code', { className: 'flex-1 min-w-[200px] text-[13px] text-[#6fcf85] break-all' }, ((R && R.file_name) || localName || 'ten-video') + '.mp4'),
        h('button', { onClick: function () { copy(((R && R.file_name) || localName || 'ten-video') + '.mp4', 'tên tệp'); }, className: 'h-7 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, 'Sao chép'),
        h('span', { className: 'basis-full text-[11px] text-[#aaa]' }, 'Tên tệp không dấu, có từ khoá chính giúp bạn quản lý file gọn. YouTube chưa từng xác nhận tên tệp ảnh hưởng tới đề xuất; tiêu đề, ảnh bìa và 30 giây đầu mới là phần quyết định.')),
      !R ? h(Empty, { title: 'Chưa tạo bộ thông tin nào', sub: 'Mô tả video rồi bấm tạo: bạn nhận 5 tiêu đề, mô tả, thẻ từ khoá, hashtag và một bình luận ghim.' }) : h('div', { className: 'grid gap-3 lg:grid-cols-2' },
        h('div', { className: 'rounded-xl bg-[#181818] border border-[#3ea6ff]/50 p-3' }, h('div', { className: 'text-[11.5px] font-semibold text-[#7cc3ff] mb-2' }, 'Tiêu đề'),
          h('div', { className: 'space-y-1.5' }, R.titles.map(function (t, i) { return h('div', { key: i, className: 'flex items-center gap-2 rounded-lg bg-[#212121] px-3 py-2' }, h('span', { className: 'flex-1 text-[12.5px] text-[#f1f1f1]' }, t), h('span', { className: cx('text-[11px] tabular-nums', t.length > 70 ? 'text-[#ff8a83]' : 'text-[#aaa]') }, t.length), h('button', { onClick: function () { copy(t, 'tiêu đề'); }, className: 'h-7 px-2.5 rounded-full bg-[#323232] hover:bg-[#424242] text-[11px] text-[#f1f1f1] cursor-pointer' }, 'Chép')); }))),
        box('Mô tả', R.description),
        box('Thẻ từ khoá', tags, h('span', { className: cx('text-[11px] tabular-nums', tags.length > 500 ? 'text-[#ff8a83]' : 'text-[#aaa]') }, tags.length + '/500 ký tự')),
        h('div', { className: 'space-y-3' }, box('Hashtag', R.hashtags.join(' ')), R.pinned_comment && box('Bình luận ghim', R.pinned_comment))));
  }

  // ------------------------------------------------------------------
  // 3) CÂU LỆNH AI SOẠN SẴN
  // ------------------------------------------------------------------
  var HEAD = 'Bối cảnh: tôi làm kênh YouTube ngách {NGÁCH}, video bằng {NGÔN NGỮ}, khán giả chính ở {THỊ TRƯỜNG}.\n';
  var PROMPTS = [
    ['Ảnh bìa', 'Phân tích ảnh bìa', 'Đánh giá độ hút mắt, màu, chữ, bố cục và so với đối thủ', HEAD + 'Tôi gửi kèm ảnh bìa (thumbnail) của tôi và 3–5 ảnh bìa đang thắng trong ngách.\nHãy:\n1. Chấm ảnh của tôi theo thang 10 cho: độ nổi bật khi thu nhỏ, độ rõ của chủ thể, chữ (số từ, cỡ, tương phản), cảm xúc, sự tò mò.\n2. Chỉ ra 3 điểm khiến người xem lướt qua.\n3. So với từng ảnh đối thủ: họ làm gì mà tôi chưa làm.\n4. Đề xuất 3 phiên bản mới, mỗi bản mô tả cụ thể bố cục, màu nền, chữ (tối đa 4 từ) và biểu cảm.\nNói thẳng, không khen xã giao.'],
    ['Ảnh bìa', 'Lên ý tưởng 5 ảnh bìa để thử A/B', 'Từ tiêu đề video sinh 5 hướng ảnh bìa khác hẳn nhau', HEAD + 'Tiêu đề video: [DÁN TIÊU ĐỀ]\nNội dung chính: [1–2 CÂU]\nHãy đề xuất 5 hướng ảnh bìa khác hẳn nhau (ví dụ: trước–sau, con số lớn, khoảnh khắc căng nhất, so sánh, câu hỏi). Mỗi hướng ghi: bố cục, chủ thể, màu chủ đạo, chữ trên ảnh (tối đa 4 từ), vì sao người xem bấm. Cuối cùng chọn 2 hướng nên thử A/B trước và giải thích.'],
    ['Tiêu đề', 'Phân tích tiêu đề so với top 10 cùng ngách', 'Tìm khuôn tiêu đề đang thắng và sửa tiêu đề của bạn', HEAD + 'Tiêu đề của tôi: [DÁN TIÊU ĐỀ]\n10 tiêu đề đang nhiều view nhất trong ngách:\n[DÁN 10 TIÊU ĐỀ, MỖI DÒNG MỘT TIÊU ĐỀ KÈM SỐ VIEW]\nHãy:\n1. Rút ra khuôn chung của 10 tiêu đề (độ dài, từ mở đầu, con số, cảm xúc, lời hứa).\n2. Chấm tiêu đề của tôi theo từng tiêu chí đó.\n3. Viết lại 10 phiên bản theo đúng khuôn đang thắng, dưới 70 ký tự, không giật tít sai sự thật.\n4. Chọn 3 bản tốt nhất và nói lý do.'],
    ['Tiêu đề', 'Bản địa hoá tiêu đề sang thị trường khác', 'Dịch theo cách người bản xứ thật sự tìm và bấm', HEAD + 'Các tiêu đề gốc:\n[DÁN TIÊU ĐỀ]\nHãy chuyển sang {NGÔN NGỮ} theo cách người bản xứ hay viết trên YouTube, không dịch từng chữ. Mỗi tiêu đề cho 2 phương án, ghi chú từ khoá người bản xứ hay tìm và điều cần tránh về văn hoá.'],
    ['Kịch bản', 'Phân tích kịch bản và đoạn mở đầu', 'Tìm chỗ người xem dễ thoát và viết lại 30 giây đầu', HEAD + 'Đây là kịch bản (hoặc phụ đề) video của tôi:\n[DÁN KỊCH BẢN]\nHãy:\n1. Chia kịch bản thành các đoạn theo thời gian và ghi mục đích từng đoạn.\n2. Đánh dấu những chỗ người xem dễ thoát (lan man, lặp ý, thiếu lý do xem tiếp) và sửa cụ thể.\n3. Viết lại 30 giây đầu theo 3 kiểu hook: câu hỏi, kết quả trước, mâu thuẫn.\n4. Thêm 3 điểm giữ chân ở giữa video (mở vòng lặp, hứa điều sắp tới).'],
    ['Kịch bản', 'Bóc công thức kịch bản của video đối thủ', 'Biến phụ đề video đang thắng thành dàn ý dùng lại được', HEAD + 'Đây là phụ đề một video đang thắng trong ngách:\n[DÁN PHỤ ĐỀ]\nHãy bóc thành công thức: cấu trúc từng phần kèm mốc thời gian ước lượng, kiểu hook, cách chuyển đoạn, nhịp câu, cách kết và lời kêu gọi. Sau đó viết một dàn ý mới theo đúng công thức đó cho chủ đề: [CHỦ ĐỀ CỦA TÔI]. Không chép câu chữ của video gốc.'],
    ['Kịch bản', 'Viết kịch bản hoàn chỉnh', 'Từ ý tưởng tới lời đọc, có hook và điểm giữ chân', HEAD + 'Chủ đề: [CHỦ ĐỀ]\nĐộ dài mong muốn: [SỐ PHÚT] phút\nTài liệu / số liệu tôi có: [DÁN NẾU CÓ]\nHãy viết kịch bản lời đọc hoàn chỉnh: hook 15 giây, lời hứa của video, 4–6 phần có tiêu đề, mỗi 60–90 giây có một điểm giữ chân, kết bằng tóm tắt và câu hỏi mời bình luận. Câu ngắn, dễ đọc thành tiếng. Chỗ nào cần hình minh hoạ thì ghi trong ngoặc vuông.'],
    ['Kênh & ngách', 'Đánh giá một ngách trước khi làm', 'Cung, cầu, độ khó và góc vào cho kênh nhỏ', HEAD + 'Dữ liệu tôi thu được (kênh, sub, view/tháng, video nổ):\n[DÁN BẢNG TỪ TOP NGÁCH HOẶC FILE CSV]\nHãy đánh giá: nhu cầu có thật không, kênh nhỏ có cửa không, kiểu video nào đang thắng, rủi ro (bản quyền, chính sách, phụ thuộc xu hướng). Kết luận nên làm hay không, và nếu làm thì 3 góc vào khác biệt cho kênh mới.'],
    ['Kênh & ngách', 'Lập kế hoạch 30 video đầu tiên', 'Chuỗi video cho kênh mới, có thứ tự và lý do', HEAD + 'Kênh mẫu tôi muốn học theo: [TÊN / LINK KÊNH]\nĐiểm mạnh của tôi: [VÍ DỤ: GIỌNG ĐỌC, DỰNG NHANH]\nHãy lập kế hoạch 30 video đầu: chia 3 chuỗi nội dung, mỗi video có tiêu đề, ý chính, kiểu ảnh bìa. Xếp thứ tự đăng để 10 video đầu dễ được đề xuất nhất và nói rõ vì sao.'],
    ['Bình luận', 'Đọc bình luận tìm nhu cầu thật', 'Gom nhóm nhu cầu, câu hỏi và ý tưởng video tiếp theo', HEAD + 'Đây là bình luận từ các video trong ngách (xuất từ mục Quét bình luận):\n[DÁN FILE TXT]\nHãy gom thành các nhóm nhu cầu kèm tỉ lệ ước lượng và 2 bình luận nguyên văn cho mỗi nhóm; liệt kê câu hỏi lặp lại, điều họ chê; rồi đề xuất 10 video tiếp theo đáp đúng các nhu cầu đó.'],
    ['Đăng video', 'Viết mô tả, thẻ và chương', 'Mô tả có từ khoá, mốc thời gian và lời kêu gọi', HEAD + 'Tiêu đề: [TIÊU ĐỀ]\nDàn ý kèm mốc thời gian: [DÁN]\nHãy viết: mô tả 150 từ có từ khoá chính ở câu đầu, danh sách chương theo mốc thời gian, 20 thẻ từ khoá (tổng dưới 450 ký tự), 3 hashtag và 1 bình luận ghim mời người xem trả lời.'],
    ['Đăng video', 'Mổ xẻ video vừa đăng bị ít view', 'Tìm nguyên nhân từ số liệu YouTube Studio', HEAD + 'Số liệu video sau [SỐ GIỜ / NGÀY]: hiển thị [..], tỉ lệ nhấp [..]%, thời gian xem trung bình [..], giữ chân ở giây 30 [..]%, nguồn lưu lượng chính [..].\nTiêu đề: [..]\nMô tả ảnh bìa: [..]\nHãy chẩn đoán vấn đề nằm ở đâu (chủ đề, bao bì hay nội dung), đưa 3 thay đổi nên làm ngay với video này và 3 bài học cho video sau.']
  ];
  function Prompts() {
    var s0 = useState(st.json('yt4_pr_vars', { niche: '', lang: 'tiếng Việt', market: 'Việt Nam' })), V = s0[0], setV0 = s0[1];
    var s1 = useState(st.json('yt4_pr_mine', [])), mine = s1[0], setMine0 = s1[1], s2 = useState(''), cat = s2[0], setCat = s2[1], s3 = useState(null), open = s3[0], setOpen = s3[1];
    var s4 = useState({ t: '', b: '' }), nw = s4[0], setNw = s4[1];
    function setV(k, v) { var n = Object.assign({}, V); n[k] = v; setV0(n); st.put('yt4_pr_vars', n); }
    function setMine(a) { setMine0(a); st.put('yt4_pr_mine', a); }
    var fill = function (t) { return t.replace(/\{NGÁCH\}/g, V.niche || '[NGÁCH CỦA BẠN]').replace(/\{NGÔN NGỮ\}/g, V.lang || '[NGÔN NGỮ]').replace(/\{THỊ TRƯỜNG\}/g, V.market || '[THỊ TRƯỜNG]'); };
    var all = PROMPTS.map(function (x, i) { return { id: 'p' + i, cat: x[0], t: x[1], d: x[2], b: x[3] }; }).concat(mine.map(function (x) { return { id: x.id, cat: 'Của tôi', t: x.t, d: 'Câu lệnh bạn tự lưu', b: x.b, mine: true }; }));
    var cats = []; all.forEach(function (x) { if (cats.indexOf(x.cat) < 0) cats.push(x.cat); });
    var shown = all.filter(function (x) { return !cat || x.cat === cat; });
    var TONE = { 'Ảnh bìa': '#a970ff', 'Tiêu đề': '#3ea6ff', 'Kịch bản': '#f5c451', 'Kênh & ngách': '#ff4e45', 'Bình luận': '#22c3b5', 'Đăng video': '#4bc167', 'Của tôi': '#f1f1f1' };
    return h('div', { className: 'space-y-4' },
      h(Section, { title: 'Điền một lần, mọi câu lệnh tự khớp' },
        h('div', { className: 'grid gap-2 sm:grid-cols-3' },
          h(Field, { label: 'Ngách của bạn' }, h(Input, { value: V.niche, onChange: function (e) { setV('niche', e.target.value); }, placeholder: 'ví dụ: vụ án có thật' })),
          h(Field, { label: 'Ngôn ngữ video' }, h(Input, { value: V.lang, onChange: function (e) { setV('lang', e.target.value); }, placeholder: 'tiếng Nhật' })),
          h(Field, { label: 'Thị trường' }, h(Input, { value: V.market, onChange: function (e) { setV('market', e.target.value); }, placeholder: 'Nhật Bản' })))),
      h('div', { className: 'flex flex-wrap gap-1.5' }, [''].concat(cats).map(function (c) { return h('button', { key: c || 'all', onClick: function () { setCat(c); }, 'aria-pressed': cat === c, className: cx('h-8 px-3 rounded-lg text-[11.5px] font-medium cursor-pointer', cat === c ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3a3a3a]') }, c || 'Tất cả ' + all.length); })),
      h('div', { className: 'space-y-2' }, shown.map(function (x) {
        var text = fill(x.b), on = open === x.id;
        return h('div', { key: x.id, className: 'yt-card p-3', style: { borderLeft: '3px solid ' + (TONE[x.cat] || '#aaa') } },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            h('div', { className: 'flex-1 min-w-[220px]' }, h('div', { className: 'flex items-center gap-2' }, h('span', { className: 'px-1.5 py-0.5 rounded text-[10.5px] font-semibold bg-[#272727]', style: { color: TONE[x.cat] || '#aaa' } }, x.cat), h('span', { className: 'text-[13px] font-semibold text-[#f1f1f1]' }, x.t)), h('div', { className: 'text-[11.5px] text-[#aaa] mt-0.5' }, x.d)),
            h('button', { onClick: function () { setOpen(on ? null : x.id); }, className: 'h-8 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, on ? 'Thu gọn' : 'Xem'),
            h('button', { onClick: function () { copy(text, 'câu lệnh'); }, className: 'h-8 px-4 rounded-full bg-[#3ea6ff] hover:bg-[#65b8ff] text-[12px] font-semibold text-[#0f0f0f] cursor-pointer' }, 'Sao chép'),
            h('button', { onClick: function () { copy(text, 'câu lệnh, dán vào Claude'); window.open('https://claude.ai/new', '_blank', 'noopener'); }, className: 'h-8 px-3 rounded-full bg-[#323232] hover:bg-[#424242] text-[11.5px] text-[#f1f1f1] cursor-pointer' }, 'Chép & mở Claude'),
            x.mine && h('button', { onClick: function () { setMine(mine.filter(function (m) { return m.id !== x.id; })); }, className: 'h-8 px-3 rounded-full bg-[#3a1f1d] hover:bg-[#4a2624] text-[11.5px] text-[#ff8a83] cursor-pointer' }, 'Xoá')),
          on && h('pre', { className: 'mt-3 rounded-lg bg-[#121212] border border-[#303030] p-3 text-[12px] text-[#e6e6e6] whitespace-pre-wrap leading-relaxed font-sans' }, text));
      })),
      h(Section, { title: 'Lưu câu lệnh của riêng bạn' },
        h('div', { className: 'space-y-2' }, h(Input, { value: nw.t, onChange: function (e) { setNw({ t: e.target.value, b: nw.b }); }, placeholder: 'Tên câu lệnh' }),
          h('textarea', { value: nw.b, onChange: function (e) { setNw({ t: nw.t, b: e.target.value }); }, rows: 4, placeholder: 'Nội dung câu lệnh. Dùng {NGÁCH}, {NGÔN NGỮ}, {THỊ TRƯỜNG} để tự điền.', className: TA }),
          h(Btn, { onClick: function () { if (!nw.t.trim() || !nw.b.trim()) { K.toast('Điền tên và nội dung câu lệnh.'); return; } setMine([{ id: 'm' + Date.now(), t: nw.t.trim(), b: nw.b }].concat(mine).slice(0, 60)); setNw({ t: '', b: '' }); K.toast('Đã lưu câu lệnh'); } }, 'Lưu câu lệnh'))));
  }

  function Tools(p) {
    var ok = function (v) { return ['cm', 'up', 'pr'].indexOf(v) >= 0 ? v : ''; };
    var s = useState(ok(p.params && p.params.sub) || ok(st.json('yt4_tools_tab', 'cm')) || 'cm'), sub = s[0], setSub0 = s[1];
    function setSub(v) { setSub0(v); st.put('yt4_tools_tab', v); }
    return h('div', { className: 'space-y-5' },
      h('div', null, h('h1', { className: 'font-display text-[19px] leading-8 font-bold text-cham-50 tracking-tight' }, 'Công cụ'), h('p', { className: 'text-[11px] text-cham-400 mt-1.5' }, 'Quét bình luận để biết khán giả muốn gì, tạo bộ thông tin đăng video và dùng câu lệnh AI soạn sẵn.')),
      h(Tabs, { value: sub, onChange: setSub, items: [['cm', 'Quét bình luận'], ['up', 'Thông tin đăng video'], ['pr', 'Câu lệnh AI', PROMPTS.length]] }),
      sub === 'cm' ? h(Comments, { goto: p.goto }) : sub === 'up' ? h(Upload, null) : h(Prompts, null));
  }
  window.YT4Pages = window.YT4Pages || {};
  window.YT4Pages.tools = Tools;
})();
