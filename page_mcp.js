// =========================================================================
// YOUTREND v5 — CỔNG MCP CHO CLAUDE (page_mcp.js)
// Dữ liệu quét nằm trong trình duyệt. File này chụp gọn dữ liệu (kênh nhỏ, video nổ, ngách, Dream 100, video đã lưu),
// đẩy lên máy chủ và nhận một đường dẫn riêng. Dán đường dẫn đó vào Claude (Customize > Connectors) để Claude đọc trực tiếp.
// =========================================================================
(function () {
  'use strict';
  var React = window.React, h = React.createElement, useState = React.useState, useEffect = React.useEffect;
  var Y = window.YT4, U = Y.U, N = U.fmtN, st = Y.st, store = Y.store, K = window.YT4UI, cx = K.cx;
  var KEY = 'yt4_mcp';
  var info = function () { return st.json(KEY, { on: false, url: '', at: 0 }); };

  async function snapshot() {
    var out = { filters: '', total: 0, channels: [], videos: [], niches: [], dream: [], saved: [] }, TD = window.TopNgachData, E = window.TopNgachEngine;
    try {
      var TN = TD && await Promise.resolve(TD.load());
      if (TN && TN.store && E) {
        var uf = TD.filters() || {}, marks = TD.marks() || {};
        var f = Object.assign({}, TD.DEF, { mode: uf.mode || 'rpm', fmt: uf.fmt || 'long', maxSub: uf.maxSub || 5000 }, { country: '', niche: '', text: '', verdict: 'all', cSort: 'score', vSort: 'vph', hours: 720, perCh: 3, minOut: 2, minView: 1000, maxAge: 0, cat: '', minDur: 0 });
        f.chanFilter = function (c) { return !(marks[c.id] && marks[c.id].h); };
        var d = E.build(TN.store, f, Date.now()), r1 = function (x) { return x == null ? null : Math.round(x * 10) / 10; };
        out.total = Object.keys(TN.store.channels || {}).length;
        out.filters = 'chế độ ' + f.mode + ', video ' + (f.fmt === 'short' ? 'Shorts' : 'dài') + ', kênh dưới ' + f.maxSub + ' sub, video đăng trong 30 ngày, view ≥ 2 lần sub';
        out.channels = d.channels.slice(0, 400).map(function (c) { var m = marks[c.id] || {}, b = c.vids && c.vids[0]; return { id: c.id, name: c.name, sub: c.subs, mk: c.country || c.mk || '', niche: c.niche, age: c.cr ? Math.round((Date.now() - c.cr) / 864e5) : null, vids: c.vc || null, v30: c.a.n ? c.a.v30 : null, vpm: c.a.n ? Math.round(c.a.cad * 4.35) : null, score: c.a.n ? c.a.score : null, verdict: c.a.v, x: c.a.n ? r1(c.a.medOut) : null, star: m.s ? true : undefined, note: m.note || undefined, best: b ? { id: b.id, t: String(b.title || '').slice(0, 100), v: b.views } : undefined }; });
        out.videos = d.videos.slice(0, 500).map(function (v) { return { id: v.id, ch: v.chName, chId: v.ch, sub: v.subs, t: String(v.title || '').slice(0, 120), v: v.views, vph: v.vph, x: r1(v.out), h: Math.round(v.hrs), d: v.dur, mk: v.mk || '', niche: v.niche, farm: v.a && v.a.v === 'farm' ? true : undefined }; });
        out.niches = d.niches.slice(0, 60).map(function (g) { return { name: g.name, score: g.score, channels: g.chans.length, farm: g.farm, rise: g.rise, fresh: g.fresh, x: r1(g.medOut), v30: g.v30, countries: (g.topMk || []).slice(0, 3).join(',') }; });
      }
    } catch (e) { }
    out.dream = store.channels().slice(0, 200).map(function (c) { var hs = c.hist || [], a = hs[0], b = hs[hs.length - 1]; return { id: c.id, title: c.title, group: c.group || '', sub: c.subs || 0, views: c.viewCount || 0, v30: c.v30 == null ? null : c.v30, n30: c.n30 == null ? null : c.n30, country: c.country || '', note: c.note || undefined, sub_gain: hs.length > 1 ? b[1] - a[1] : null, gain_days: hs.length > 1 ? b[0] - a[0] : null }; });
    out.saved = (store.saved ? store.saved() : []).slice(0, 150).map(function (v) { return { id: v.id, title: String(v.title || '').slice(0, 120), channel: v.channel || '', views: v.views || null }; });
    return out;
  }
  var busyNow = false;
  async function sync(silent) {
    if (busyNow) return null; busyNow = true;
    try {
      var r = await Y.api('/api/mcp', { action: 'sync', data: await snapshot() });
      st.put(KEY, { on: true, url: r.url, at: r.at, persistent: r.persistent, counts: r.counts }); Y.emit && Y.emit('mcp');
      if (!silent) K.toast('Đã đồng bộ ' + r.counts.channels + ' kênh, ' + r.counts.videos + ' video cho Claude');
      return r;
    } catch (e) { if (!silent) throw e; return null; }
    finally { busyNow = false; }
  }
  // tự đồng bộ nền (tối đa 10 phút một lần) khi đã bật cổng
  function auto() { var i = info(); if (i.on && Date.now() - (i.at || 0) > 10 * 60000) sync(true); }

  function Box() {
    K.useBus('mcp');
    var i = info(), s0 = useState(''), busy = s0[0], setBusy = s0[1], s1 = useState(''), err = s1[0], setErr = s1[1];
    useEffect(function () { Y.api('/api/mcp', { action: 'status' }).then(function (r) { if (r.linked) { st.put(KEY, Object.assign({}, info(), { on: true, url: r.url, at: r.at || info().at, persistent: r.persistent })); } else if (info().on) st.put(KEY, { on: false, url: '', at: 0 }); Y.emit && Y.emit('mcp'); }, function () { }); }, []);
    async function run(fn, label) { setBusy(label); setErr(''); try { await fn(); } catch (e) { setErr((e && e.message) || 'Lỗi máy chủ, thử lại sau.'); } setBusy(''); }
    var copy = function () { U.copy(i.url).then(function () { K.toast('Đã chép đường dẫn MCP'); }, function () { K.toast('Trình duyệt chặn sao chép, hãy bôi đen rồi Ctrl+C.'); }); };
    var step = function (n, t) { return h('li', { key: n, className: 'flex gap-2.5 text-[12px] text-[#e6e6e6] leading-relaxed' }, h('span', { className: 'shrink-0 w-5 h-5 rounded-full bg-[#2a2140] text-[#c9a7ff] text-[11px] font-bold grid place-items-center mt-0.5' }, n), h('span', null, t)); };
    return h(K.Section, { title: 'Cổng MCP cho Claude', sub: 'Cho Claude đọc thẳng dữ liệu bạn quét được: kênh nhỏ, video nổ, ngách, Dream 100 và video đã lưu. Claude chỉ đọc, không sửa được gì.' },
      h('div', { className: 'space-y-3' },
        !i.on ? h('div', { className: 'flex flex-wrap items-center gap-3' },
          h(K.Btn, { primary: true, disabled: !!busy, onClick: function () { run(function () { return sync(false); }, 'Đang tạo…'); } }, busy || 'Tạo đường dẫn và đồng bộ'),
          h('span', { className: 'text-[11.5px] text-[#aaa]' }, 'Web chụp gọn dữ liệu đang có trong trình duyệt và gửi lên máy chủ của bạn.'))
          : h('div', { className: 'space-y-2' },
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('input', { readOnly: true, value: i.url, 'aria-label': 'Đường dẫn MCP', onFocus: function (e) { e.target.select(); }, className: 'flex-1 min-w-[260px] h-9 bg-[#121212] border border-[#303030] rounded-lg px-3 text-[12px] text-[#6fcf85] font-mono' }),
              h(K.Btn, { primary: true, onClick: copy }, 'Sao chép'),
              h(K.Btn, { disabled: !!busy, onClick: function () { run(function () { return sync(false); }, 'Đang đồng bộ…'); } }, busy || 'Đồng bộ ngay'),
              h(K.Btn, { disabled: !!busy, onClick: function () { if (!window.confirm('Thu hồi đường dẫn này? Claude sẽ không đọc được nữa cho tới khi bạn tạo đường dẫn mới.')) return; run(async function () { await Y.api('/api/mcp', { action: 'revoke' }); st.put(KEY, { on: false, url: '', at: 0 }); Y.emit && Y.emit('mcp'); K.toast('Đã thu hồi đường dẫn MCP'); }, 'Đang thu hồi…'); } }, 'Thu hồi')),
            h('div', { className: 'text-[11.5px] text-[#aaa]' }, 'Đồng bộ lần cuối: ' + (i.at ? new Date(i.at).toLocaleString('vi-VN') : 'chưa') + (i.counts ? ' · ' + N(i.counts.channels) + ' kênh nhỏ, ' + N(i.counts.videos) + ' video, ' + i.counts.niches + ' ngách, ' + i.counts.dream + ' kênh theo dõi' : '') + '. Web tự đồng bộ lại khi bạn chuyển mục (tối đa 10 phút một lần).'),
            i.persistent === false && h(K.Note, { error: true }, 'Máy chủ chưa gắn kho lưu nên dữ liệu đồng bộ chỉ tồn tại vài phút và đường dẫn sẽ hỏng. Vào Vercel → project YoutubeTrend → Storage → tạo Upstash for Redis, nối vào project rồi Redeploy, sau đó bấm Đồng bộ ngay.')),
        err && h(K.Note, { error: true }, err),
        h('ol', { className: 'space-y-1.5 pt-1' },
          step(1, 'Mở claude.ai, vào Customize → Connectors, bấm Add custom connector.'),
          step(2, 'Đặt tên YouTrend, dán đường dẫn ở trên vào ô địa chỉ máy chủ MCP rồi bấm Add. Không cần điền phần OAuth.'),
          step(3, 'Trong cuộc trò chuyện, bật connector YouTrend rồi hỏi, ví dụ: "Dùng YouTrend, tìm 10 kênh dưới 2K sub có view/tháng cao nhất và nói vì sao đáng clone".')),
        h('p', { className: 'text-[11px] text-[#aaa] leading-relaxed' }, 'Ai có đường dẫn này đều đọc được bản chụp dữ liệu, nên đừng gửi cho người khác. Nếu lỡ lộ, bấm Thu hồi rồi tạo lại.')));
  }
  window.YT4Mcp = { snapshot: snapshot, sync: sync, auto: auto, Box: Box, info: info };
})();
