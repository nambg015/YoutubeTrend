// =========================================================================
// YOUTREND v4 — LÕI (core.js)
// Lưu trữ, kho API key (tương thích dữ liệu cũ), gọi YouTube có xoay key, đăng nhập admin (Firebase),
// tiện ích dùng chung, dữ liệu người dùng (video đã lưu, kênh theo dõi, kế hoạch video), lớp đơn sắc cho module nhúng.
// Tất cả gắn vào window để các module (Top Ngách, Tạo tài nguyên, Spy, Trend v2, Studio) dùng chung.
// =========================================================================
(function () {
  'use strict';
  var W = window, MEM = {};

  // ---------- lưu trữ ----------
  var st = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return MEM[k] === undefined ? null : MEM[k]; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { MEM[k] = v; } },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) { } delete MEM[k]; },
    json: function (k, d) { try { var v = JSON.parse(this.get(k)); return v == null ? d : v; } catch (e) { return d; } },
    put: function (k, v) { this.set(k, JSON.stringify(v)); },
    keys: function () { try { var o = []; for (var i = 0; i < localStorage.length; i++) o.push(localStorage.key(i)); return o; } catch (e) { return Object.keys(MEM); } }
  };
  st.remove = st.del;
  W.st = st;

  // ---------- sự kiện nội bộ ----------
  var bus = {};
  function on(ev, fn) { (bus[ev] = bus[ev] || []).push(fn); return function () { bus[ev] = (bus[ev] || []).filter(function (f) { return f !== fn; }); }; }
  function emit(ev, data) { (bus[ev] || []).slice().forEach(function (f) { try { f(data); } catch (e) { console.error(e); } }); }

  // ---------- kho API key YouTube (giữ nguyên khoá lưu trữ cũ: yt_key_pool, yt_key, yt_key_usage, yt_key_day) ----------
  var ytKeyManager = {
    dayKey: function () { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }); },
    usage: function () { var u = st.json('yt_key_usage', {}); return u.d === this.dayKey() ? u.k || {} : {}; },
    trackUnits: function (key, n) { var k = this.usage(); k[key] = (k[key] || 0) + n; st.put('yt_key_usage', { d: this.dayKey(), k: k }); emit('quota'); },
    dayReset: function () {
      var d = this.dayKey(); if (st.get('yt_key_day') === d) return; st.set('yt_key_day', d);
      var raw = st.json('yt_key_pool', null);
      if (Array.isArray(raw) && raw.length) { raw.forEach(function (p) { if (p.status === 'quota_exceeded') p.status = 'standby'; }); if (!raw.some(function (p) { return p.status === 'active'; })) raw[0].status = 'active'; this.savePool(raw, true); }
    },
    getPool: function () {
      this.dayReset();
      var saved = st.json('yt_key_pool', null); if (Array.isArray(saved) && saved.length) return saved;
      var single = (st.get('yt_key') || st.get('yt_api_key') || '').trim();
      return single ? [{ id: 'k_main', name: 'Key 1', key: single, status: 'active', addedAt: Date.now() }] : [];
    },
    savePool: function (pool, silent) {
      var active = pool.find(function (p) { return p.status === 'active' && p.key; }) || pool.find(function (p) { return p.status !== 'quota_exceeded' && p.key; });
      if (active) active.status = 'active';
      st.put('yt_key_pool', pool); st.set('yt_key', active ? active.key : '');
      if (!silent) { emit('keys'); try { W.dispatchEvent(new CustomEvent('yt-keys-updated', { detail: { pool: pool, activeKey: active ? active.key : '' } })); } catch (e) { } }
      return active ? active.key : '';
    },
    getActiveKey: function () { var p = this.getPool(), a = p.find(function (x) { return x.status === 'active' && x.key; }) || p.find(function (x) { return x.status !== 'quota_exceeded' && x.key; }); return a ? a.key : ''; },
    addKey: function (name, key) {
      key = String(key || '').trim(); if (!key) return false; var pool = this.getPool(); if (pool.some(function (p) { return p.key === key; })) return false;
      pool.push({ id: 'k_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: String(name || '').trim() || 'Key ' + (pool.length + 1), key: key, status: pool.length ? 'standby' : 'active', addedAt: Date.now() });
      this.savePool(pool); return true;
    },
    removeKey: function (id) { var pool = this.getPool().filter(function (p) { return p.id !== id && p.key !== id; }); if (pool.length && !pool.some(function (p) { return p.status === 'active'; })) pool[0].status = 'active'; this.savePool(pool); return pool; },
    setActive: function (id) { var pool = this.getPool().map(function (p) { var o = Object.assign({}, p); if (p.id === id || p.key === id) o.status = 'active'; else if (o.status === 'active') o.status = 'standby'; return o; }); this.savePool(pool); },
    rename: function (id, name) { var pool = this.getPool(); pool.forEach(function (p) { if (p.id === id) p.name = name; }); this.savePool(pool); },
    resetStatus: function (id) { var pool = this.getPool(); pool.forEach(function (p) { if ((p.id === id || !id) && p.status === 'quota_exceeded') p.status = 'standby'; }); this.savePool(pool); },
    markQuotaExceeded: function (key) {
      var pool = this.getPool(), next = null;
      pool.forEach(function (p) { if (p.key === key) p.status = 'quota_exceeded'; });
      pool.forEach(function (p) { if (p.status === 'active') p.status = 'standby'; });
      var n = pool.find(function (p) { return p.status !== 'quota_exceeded' && p.key; }); if (n) { n.status = 'active'; next = n.key; }
      this.savePool(pool); return next;
    },
    stats: function () {
      var pool = this.getPool(), use = this.usage(), ok = pool.filter(function (k) { return k.status !== 'quota_exceeded' && k.key; });
      var left = ok.reduce(function (a, k) { return a + Math.max(0, 1e4 - (use[k.key] || 0)); }, 0);
      return { total: pool.length, ok: ok.length, left: left, used: pool.reduce(function (a, k) { return a + (use[k.key] || 0); }, 0) };
    }
  };
  W.ytKeyManager = ytKeyManager;

  // ---------- gọi YouTube Data API v3 (tự xoay key khi hết quota) ----------
  var COST = { search: 100 };
  async function yt(path, params, key) {
    var cands = [], first = key || ytKeyManager.getActiveKey();
    if (first) cands.push(first);
    ytKeyManager.getPool().forEach(function (p) { if (p.key && p.status !== 'quota_exceeded' && cands.indexOf(p.key) < 0) cands.push(p.key); });
    if (!cands.length) {
      var pool = ytKeyManager.getPool();
      throw pool.length ? { code: 'quotaExceeded', msg: 'Tất cả API key đã hết quota hôm nay (reset khoảng 14–15h giờ VN). Thêm key mới trong Cài đặt.' } : { code: 'MISSING', msg: 'Chưa có YouTube API key. Thêm key trong Cài đặt.' };
    }
    var tried = {};
    for (var i = 0; i < cands.length; i++) {
      var k = cands[i]; if (tried[k]) continue; tried[k] = 1;
      var u = new URL('https://www.googleapis.com/youtube/v3/' + path);
      Object.keys(params || {}).forEach(function (p) { var v = params[p]; if (v !== undefined && v !== null && v !== '') u.searchParams.set(p, v); });
      u.searchParams.set('key', k);
      var r, j;
      try { r = await fetch(u.toString()); } catch (e) { throw { code: 'NETWORK', msg: 'Không kết nối được YouTube: ' + e.message }; }
      j = await r.json().catch(function () { return {}; });
      if (r.ok) { ytKeyManager.trackUnits(k, COST[path] || 1); return j; }
      var reason = (j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || ('HTTP' + r.status);
      if (/quotaExceeded|dailyLimitExceeded|rateLimitExceeded/.test(reason)) { var nx = ytKeyManager.markQuotaExceeded(k); if (nx && !tried[nx]) cands.push(nx); continue; }
      if (reason === 'keyInvalid' || /API key not valid/i.test((j.error || {}).message || '')) throw { code: 'keyInvalid', msg: 'API key không hợp lệ: ' + k.slice(0, 8) + '…' };
      throw { code: reason, msg: (j.error && j.error.message) || reason, raw: j };
    }
    throw { code: 'quotaExceeded', msg: 'Tất cả API key đã hết quota hôm nay (reset khoảng 14–15h giờ VN). Thêm key mới trong Cài đặt.' };
  }
  W.yt = yt;
  function errMsg(e) { return (e && (e.msg || e.message)) || String(e || 'Lỗi không xác định'); }

  // ---------- đăng nhập (Firebase) — chỉ admin, kiểm tra ở máy chủ qua /api/me ----------
  var ytAuth = {
    init: function () {
      if (typeof firebase === 'undefined') return false;
      if (firebase.apps && firebase.apps.length) return true;
      var cfg = W.FIREBASE_CONFIG; if (!cfg || !cfg.apiKey) return false;
      try { firebase.initializeApp(cfg); return true; } catch (e) { console.warn(e); return false; }
    },
    currentUser: function () { return this.init() ? firebase.auth().currentUser : null; },
    getIdToken: async function (force) { var u = this.currentUser(); return u ? u.getIdToken(!!force) : ''; },
    authHeaders: async function () { try { var t = await this.getIdToken(false); return t ? { Authorization: 'Bearer ' + t } : {}; } catch (e) { return {}; } },
    toEmail: function (id) { id = String(id || '').trim(); return id.indexOf('@') >= 0 ? id : id.toLowerCase() + '@youtrend.user'; },
    mapError: function (e) {
      var c = (e && e.code) || '';
      var m = {
        'auth/invalid-credential': 'Sai tên đăng nhập hoặc mật khẩu.', 'auth/wrong-password': 'Sai mật khẩu.', 'auth/user-not-found': 'Không có tài khoản này.',
        'auth/invalid-email': 'Tên đăng nhập không hợp lệ.', 'auth/too-many-requests': 'Thử sai quá nhiều lần, đợi vài phút rồi thử lại.',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.', 'auth/popup-blocked': 'Trình duyệt chặn cửa sổ đăng nhập. Cho phép popup rồi thử lại.',
        'auth/unauthorized-domain': 'Tên miền chưa được thêm vào Firebase (Authentication → Settings → Authorized domains).',
        'auth/network-request-failed': 'Lỗi mạng, kiểm tra kết nối.'
      };
      return m[c] || (e && e.message) || 'Đăng nhập thất bại.';
    },
    signInGoogle: async function () {
      if (!this.init()) throw new Error('Không tải được Firebase. Tải lại trang.');
      var p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: 'select_account' });
      try { await firebase.auth().signInWithPopup(p); }
      catch (e) { if (e && e.code === 'auth/popup-blocked') { await firebase.auth().signInWithRedirect(p); return; } throw new Error(this.mapError(e)); }
    },
    signIn: async function (id, pass) {
      if (!this.init()) throw new Error('Không tải được Firebase. Tải lại trang.');
      try { await firebase.auth().signInWithEmailAndPassword(this.toEmail(id), pass); } catch (e) { throw new Error(this.mapError(e)); }
    },
    changePassword: async function (oldPass, newPass) {
      var u = this.currentUser(); if (!u) throw new Error('Chưa đăng nhập');
      try { var cred = firebase.auth.EmailAuthProvider.credential(u.email, oldPass); await u.reauthenticateWithCredential(cred); await u.updatePassword(newPass); }
      catch (e) { throw new Error(this.mapError(e)); }
    },
    signOut: async function () { try { if (this.init()) await firebase.auth().signOut(); } catch (e) { } },
    onChange: function (fn) { if (!this.init()) { fn(null); return function () { }; } return firebase.auth().onAuthStateChanged(fn); },
    // Hỏi máy chủ: tài khoản này có phải admin không
    checkAdmin: async function () {
      var hd = await this.authHeaders();
      var r = await fetch('/api/me', { headers: hd, cache: 'no-store' });
      var j = await r.json().catch(function () { return {}; });
      if (r.status === 403) return { admin: false, message: j.message || 'Tài khoản này không có quyền dùng web.' };
      if (!r.ok) { var e = new Error(j.message || ('Máy chủ lỗi ' + r.status)); e.status = r.status; throw e; }
      return j;
    }
  };
  W.ytAuth = ytAuth;

  // ---------- gọi API máy chủ (có token admin) ----------
  async function api(path, body) {
    var hd = Object.assign({ 'Content-Type': 'application/json' }, await ytAuth.authHeaders());
    var r = await fetch(path, { method: 'POST', headers: hd, body: JSON.stringify(body || {}) });
    var j = await r.json().catch(function () { return {}; });
    if (!r.ok || j.success === false) { var e = new Error(j.message || ('Lỗi máy chủ ' + r.status)); e.status = r.status; e.code = j.code; throw e; }
    return j;
  }

  // ---------- tiện ích ----------
  var U = {
    fmtN: function (n) { n = +n || 0; var a = Math.abs(n); return a >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : a >= 1e3 ? (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n)); },
    fmtInt: function (n) { return (Math.round(+n || 0)).toLocaleString('vi-VN'); },
    iso: function (s) { var m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0); },
    dur: function (s) { s = Math.round(s || 0); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0'); },
    ago: function (t) { var d = (Date.now() - t) / 1000; if (d < 3600) return Math.max(1, Math.round(d / 60)) + ' phút'; if (d < 86400) return Math.round(d / 3600) + ' giờ'; if (d < 86400 * 60) return Math.round(d / 86400) + ' ngày'; if (d < 86400 * 730) return Math.round(d / 86400 / 30) + ' tháng'; return Math.round(d / 86400 / 365) + ' năm'; },
    date: function (t) { return t ? new Date(t).toLocaleDateString('vi-VN') : ''; },
    median: function (a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); var m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; },
    pct: function (a, p) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; },
    chunk: function (a, n) { var r = []; for (var i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; },
    thumb: function (id, q) { return 'https://i.ytimg.com/vi/' + id + '/' + (q || 'mqdefault') + '.jpg'; },
    vurl: function (id) { return 'https://www.youtube.com/watch?v=' + id; },
    curl: function (id) { return 'https://www.youtube.com/channel/' + id; },
    csv: function (name, rows) {
      var b = new Blob(['﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n')], { type: 'text/csv' });
      U.download(name + '-' + new Date().toISOString().slice(0, 10) + '.csv', b);
    },
    download: function (name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000); },
    copy: function (t) { return navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject(new Error('no clipboard')); },
    // @handle | link kênh | UC… | link video → {handle|id|videoId}
    parseChannel: function (raw) {
      raw = String(raw || '').trim(); if (!raw) return null;
      var m;
      if ((m = /(?:youtube\.com\/)?(@[\w.\-]+)/.exec(raw))) return { handle: m[1] };
      if ((m = /channel\/(UC[\w-]{22})/.exec(raw)) || (m = /^(UC[\w-]{22})$/.exec(raw))) return { id: m[1] };
      if ((m = /(?:youtu\.be\/|v=|shorts\/|live\/)([\w-]{11})/.exec(raw))) return { videoId: m[1] };
      if ((m = /youtube\.com\/(?:c|user)\/([^/?#]+)/.exec(raw))) return { query: decodeURIComponent(m[1]) };
      return { query: raw };
    },
    // Gợi ý tìm kiếm YouTube (JSONP, miễn phí, không tốn quota)
    suggest: function (q, hl, gl) {
      return new Promise(function (resolve) {
        if (!q || !q.trim()) return resolve([]);
        var cb = 'yts_' + Math.random().toString(36).slice(2, 9), s = document.createElement('script'), done = false;
        var end = function (v) { if (done) return; done = true; try { delete W[cb]; } catch (e) { W[cb] = undefined; } s.remove(); resolve(v); };
        var t = setTimeout(function () { end([]); }, 3000);
        W[cb] = function (d) { clearTimeout(t); try { end((d[1] || []).map(function (x) { return Array.isArray(x) ? x[0] : x; }).filter(Boolean)); } catch (e) { end([]); } };
        s.src = 'https://suggestqueries.google.com/complete/search?client=youtube&ds=yt&hl=' + (hl || 'vi') + '&gl=' + (gl || 'VN') + '&q=' + encodeURIComponent(q.trim()) + '&jsonp=' + cb;
        s.onerror = function () { clearTimeout(t); end([]); };
        document.body.appendChild(s);
      });
    },
    errMsg: errMsg
  };

  // ---------- dữ liệu người dùng ----------
  // Kênh theo dõi: khoá mới yt4_channels, tự gộp các danh sách đối thủ cũ (yt_competitors*)
  function migrateChannels() {
    var cur = st.json('yt4_channels', null); if (Array.isArray(cur)) return cur;
    var out = [], seen = {};
    st.keys().filter(function (k) { return /^yt_competitors/.test(k); }).forEach(function (k) {
      (st.json(k, []) || []).forEach(function (c) { if (c && /^UC[\w-]{22}$/.test(c.id || '') && !seen[c.id]) { seen[c.id] = 1; out.push({ id: c.id, title: c.title, handle: c.handle || '', avatar: c.avatar || '', subs: +c.subs || 0, videoCount: +c.videoCount || 0, viewCount: +c.viewCount || 0, addedAt: Date.now() }); } });
    });
    st.put('yt4_channels', out); return out;
  }
  var store = {
    saved: function () { var a = st.json('yt_saved_cashcow_videos', []); return Array.isArray(a) ? a : []; },
    isSaved: function (id) { return this.saved().some(function (v) { return v.id === id; }); },
    toggleSave: function (v) {
      if (!v || !v.id) return false; var a = this.saved(), has = a.some(function (x) { return x.id === v.id; });
      a = has ? a.filter(function (x) { return x.id !== v.id; }) : [{ id: v.id, title: v.title || '', channel: v.channel || v.chName || '', channelId: v.channelId || v.ch || '', views: +v.views || 0, subs: v.subs != null ? +v.subs : null, dur: +v.dur || 0, published: v.published || (v.t ? new Date(v.t).toISOString() : ''), thumb: v.thumb || U.thumb(v.id), note: '', savedAt: Date.now() }].concat(a);
      st.put('yt_saved_cashcow_videos', a); emit('saved'); return !has;
    },
    updateSaved: function (id, patch) { var a = this.saved().map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); st.put('yt_saved_cashcow_videos', a); emit('saved'); },
    channels: function () { return migrateChannels(); },
    hasChannel: function (id) { return this.channels().some(function (c) { return c.id === id; }); },
    addChannel: function (c) { var a = this.channels(); if (!c || !c.id || a.some(function (x) { return x.id === c.id; })) return false; a.unshift(Object.assign({ addedAt: Date.now() }, c)); st.put('yt4_channels', a); emit('channels'); return true; },
    updateChannel: function (id, patch) { var a = this.channels().map(function (x) { return x.id === id ? Object.assign({}, x, patch) : x; }); st.put('yt4_channels', a); emit('channels'); },
    removeChannel: function (id) { st.put('yt4_channels', this.channels().filter(function (x) { return x.id !== id; })); emit('channels'); },
    ideas: function () { var a = st.json('yt_video_ideas_board', []); return Array.isArray(a) ? a : []; },
    saveIdeas: function (a) { st.put('yt_video_ideas_board', a); emit('ideas'); },
    addIdea: function (i) { var a = this.ideas(); a.unshift(Object.assign({ id: 'idea_' + Date.now().toString(36), status: 'todo', createdAt: new Date().toISOString() }, i)); this.saveIdeas(a); }
  };

  // ---------- Dự án (gom các phiên Tạo tài nguyên) + kết quả sản xuất ----------
  store.projects = function () { var a = st.json('yt4_projects', []); return Array.isArray(a) ? a : []; };
  store.saveProject = function (pj) { var a = store.projects(); if (!pj.id) { pj = Object.assign({ id: 'pj_' + Date.now().toString(36), createdAt: Date.now() }, pj); a.unshift(pj); } else a = a.map(function (x) { return x.id === pj.id ? Object.assign({}, x, pj) : x; }); st.put('yt4_projects', a); emit('projects'); return pj; };
  store.removeProject = function (id) { st.put('yt4_projects', store.projects().filter(function (x) { return x.id !== id; })); var l = store.links(); Object.keys(l).forEach(function (k) { if (l[k] === id) delete l[k]; }); st.put('yt4_session_project', l); emit('projects'); };
  store.links = function () { return st.json('yt4_session_project', {}) || {}; };
  store.linkSession = function (sid, pid) { var l = store.links(); if (pid) l[sid] = pid; else delete l[sid]; st.put('yt4_session_project', l); emit('projects'); };
  store.productions = function (sid) { var a = st.json('yt4_productions', []); a = Array.isArray(a) ? a : []; return sid ? a.filter(function (x) { return x.sid === sid; }) : a; };
  store.saveProduction = function (pr) { var a = store.productions().filter(function (x) { return x.id !== pr.id; }); a.unshift(pr); while (a.length > 40) a.pop(); try { st.put('yt4_productions', a); } catch (e) { st.put('yt4_productions', a.slice(0, 15)); } emit('productions'); };
  store.removeProduction = function (id) { st.put('yt4_productions', store.productions().filter(function (x) { return x.id !== id; })); emit('productions'); };

  // ---------- Claude API (gọi thẳng từ trình duyệt, key lưu trên máy này) ----------
  var CLAUDE_MODELS = [['claude-sonnet-5-5', 'Claude Sonnet 5.5 (cân bằng, khuyên dùng)'], ['claude-opus-5-5', 'Claude Opus 5.5 (mạnh nhất, đắt hơn)'], ['claude-haiku-5-5', 'Claude Haiku 5.5 (nhanh, rẻ)'], ['claude-fable-5-1', 'Claude Fable 5.1']];
  var claude = {
    models: CLAUDE_MODELS,
    cfg: function () { return Object.assign({ key: '', model: 'claude-sonnet-5-5', maxTokens: 16000 }, st.json('yt4_claude', {})); },
    save: function (c) { st.put('yt4_claude', Object.assign(this.cfg(), c)); emit('claude'); },
    ready: function () { return !!this.cfg().key; },
    // stream: onText(chunk, fullText); trả về toàn bộ văn bản
    stream: async function (o) {
      var c = this.cfg(); if (!c.key) throw new Error('Chưa có Claude API key (Cài đặt → Claude).');
      var r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: o.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': c.key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
        body: JSON.stringify({ model: o.model || c.model, max_tokens: o.maxTokens || c.maxTokens || 16000, stream: true, system: o.system || undefined, messages: [{ role: 'user', content: o.prompt }] }) });
      if (!r.ok) { var j = await r.json().catch(function () { return {}; }); var m = (j.error && j.error.message) || ('HTTP ' + r.status); if (r.status === 401) m = 'Claude API key không hợp lệ.'; if (r.status === 429) m = 'Claude đang giới hạn tốc độ / hết hạn mức: ' + m; throw new Error(m); }
      var rd = r.body.getReader(), dec = new TextDecoder(), buf = '', full = '', stop = '';
      while (true) {
        var x = await rd.read(); if (x.done) break; buf += dec.decode(x.value, { stream: true });
        var parts = buf.split('\n'); buf = parts.pop();
        parts.forEach(function (line) {
          if (line.indexOf('data:') !== 0) return; var d; try { d = JSON.parse(line.slice(5)); } catch (e) { return; }
          if (d.type === 'content_block_delta' && d.delta && d.delta.text) { full += d.delta.text; o.onText && o.onText(d.delta.text, full); }
          else if (d.type === 'message_delta' && d.delta && d.delta.stop_reason) stop = d.delta.stop_reason;
          else if (d.type === 'error') throw new Error((d.error && d.error.message) || 'Lỗi Claude');
        });
      }
      return { text: full, stop: stop };
    }
  };

  // Tra kênh từ link/@handle/ID/link video
  async function resolveChannel(raw) {
    var p = U.parseChannel(raw); if (!p) throw new Error('Nhập link kênh, @handle hoặc ID kênh');
    var part = 'snippet,statistics,contentDetails,brandingSettings', r;
    if (p.handle) r = await yt('channels', { part: part, forHandle: p.handle.replace('@', '') });
    else if (p.id) r = await yt('channels', { part: part, id: p.id });
    else if (p.videoId) { var v = await yt('videos', { part: 'snippet', id: p.videoId }); var cid = v.items && v.items[0] && v.items[0].snippet.channelId; if (!cid) throw new Error('Không tìm thấy video'); r = await yt('channels', { part: part, id: cid }); }
    else { var s = await yt('search', { part: 'snippet', type: 'channel', q: p.query, maxResults: 1 }); var id = s.items && s.items[0] && s.items[0].id.channelId; if (!id) throw new Error('Không tìm thấy kênh'); r = await yt('channels', { part: part, id: id }); }
    var c = r.items && r.items[0]; if (!c) throw new Error('Không tìm thấy kênh');
    return c;
  }
  // Lấy N video mới nhất của kênh qua playlist uploads (1 quota / 50 video)
  async function uploads(channelId, n) {
    var pl = 'UU' + channelId.slice(2), ids = [], token = '';
    while (ids.length < (n || 50)) {
      var r = await yt('playlistItems', { part: 'contentDetails', playlistId: pl, maxResults: 50, pageToken: token });
      (r.items || []).forEach(function (i) { ids.push(i.contentDetails.videoId); });
      token = r.nextPageToken; if (!token) break;
    }
    return videoDetails(ids.slice(0, n || 50));
  }
  async function videoDetails(ids) {
    var out = [];
    for (var i = 0, cs = U.chunk(ids, 50); i < cs.length; i++) {
      var r = await yt('videos', { part: 'snippet,statistics,contentDetails', id: cs[i].join(',') });
      (r.items || []).forEach(function (v) {
        var sn = v.snippet || {}, s = v.statistics || {};
        out.push({ id: v.id, title: sn.title || '', channel: sn.channelTitle || '', channelId: sn.channelId, t: Date.parse(sn.publishedAt), published: sn.publishedAt, views: +s.viewCount || 0, likes: +s.likeCount || 0, comments: +s.commentCount || 0, dur: U.iso((v.contentDetails || {}).duration), cat: sn.categoryId || '', tags: sn.tags || [], desc: (sn.description || '').slice(0, 600), live: sn.liveBroadcastContent, lang: sn.defaultAudioLanguage || sn.defaultLanguage || '' });
      });
    }
    return out;
  }
  async function channelStats(ids) {
    var out = {};
    for (var i = 0, cs = U.chunk(Array.from(new Set(ids)), 50); i < cs.length; i++) {
      var r = await yt('channels', { part: 'snippet,statistics', id: cs[i].join(',') });
      (r.items || []).forEach(function (c) { out[c.id] = { id: c.id, title: c.snippet.title, subs: c.statistics.hiddenSubscriberCount ? null : +c.statistics.subscriberCount, videos: +c.statistics.videoCount || 0, views: +c.statistics.viewCount || 0, country: c.snippet.country || '', created: Date.parse(c.snippet.publishedAt), avatar: ((c.snippet.thumbnails || {}).default || {}).url || '' }; });
    }
    return out;
  }

  // ---------- lớp đơn sắc cho module nhúng (Spy, Trend v2, Studio) ----------
  (function softCss() {
    var css = '.mono [class*="bg-[#121316]"],.mono [class*="bg-zinc-950"],.mono [class*="bg-[#0b1018]"],.mono [class*="bg-brand-card"],.mono [class*="bg-brand-surface"]{background-color:rgba(20,22,32,.94)!important}.mono [class*="text-zinc-500"]{color:#9ba3b4!important}.mono [class*="text-zinc-600"]{color:#808a9c!important}.mono [class*="border-zinc-800"]{border-color:rgba(255,255,255,.08)!important}.mono .text-white{color:#fff!important}'
      + '.mono [class*="bg-gradient-"]:not([class*="h-1"]):not([class*="h-1.5"]):not([class*="h-2"]){background-image:none!important;background-color:rgba(20,22,32,.94)!important}'
      + '.mono [class*="shadow-"]{box-shadow:0 8px 24px -12px rgba(0,0,0,.6)!important}.mono [class*="animate-pulse"],.mono [class*="animate-bounce"],.mono [class*="animate-ping"]{animation:none!important}'
      + '.mono [class*="backdrop-blur"]{backdrop-filter:none!important}.mono .font-black{font-weight:700!important}.mono p.font-mono,.mono span.font-mono:not([class*="tabular"]){font-family:inherit!important}.mono .tracking-widest.uppercase:not(button){display:none!important}';
    var el = document.createElement('style'); el.textContent = css; (document.head || document.documentElement).appendChild(el);
  })();
  // Gỡ emoji/biểu tượng trong vùng .mono (module cũ dùng emoji làm icon)
  var EMOJI = /(?:[☀-⛿✀-✒✔✖-➿⬀-⯿←-⇿⏩-⏺⤴⤵〰〽㊗㊙]|[\uD83C-\uD83E][\uDC00-\uDFFF]|️|‍|⃣)+\s?/g;
  var KEEP = /[✓✕↗→←↑↓]/;
  function strip(node) {
    if (node.nodeType === 3) { var v = node.nodeValue; if (v && EMOJI.test(v)) { EMOJI.lastIndex = 0; var nv = v.replace(EMOJI, function (m) { return KEEP.test(m) ? m : ''; }); if (nv !== v) node.nodeValue = nv; } EMOJI.lastIndex = 0; return; }
    if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE' || node.tagName === 'TEXTAREA') return;
    var w = document.createTreeWalker(node, NodeFilter.SHOW_TEXT), n; while ((n = w.nextNode())) strip(n);
  }
  function watchMono(el) {
    if (!el || el.__mono) return; el.__mono = true; strip(el);
    var mo = new MutationObserver(function (list) { list.forEach(function (m) { if (m.type === 'characterData') strip(m.target); else m.addedNodes.forEach(strip); }); });
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    el.__monoObs = mo;
  }

  W.YT4 = { claude: claude, st: st, yt: yt, keys: ytKeyManager, auth: ytAuth, api: api, U: U, store: store, on: on, emit: emit, resolveChannel: resolveChannel, uploads: uploads, videoDetails: videoDetails, channelStats: channelStats, watchMono: watchMono, stripEmoji: strip };
})();
