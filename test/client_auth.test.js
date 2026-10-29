// Chạy khối ytAuth của app.bundle.js trong sandbox với Firebase + fetch giả lập (không cần mạng).
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(__dirname + '/../app.bundle.js', 'utf8');
const start = src.indexOf('const ytAuth = {');
const end = src.indexOf('function AuthModal');
assert.ok(start > 0 && end > start, 'không tìm thấy khối ytAuth');
const block = src.slice(start, end);

// api: hàm (payload) => JSON server trả về. calls: ghi lại các payload đã gửi.
function makeEnv({ user = null, api } = {}) {
  const store = {};
  const events = [];
  const calls = [];
  const fakeUser = user && {
    uid: 'fb_uid_1', displayName: 'Hung', email: 'hung@gmail.com', photoURL: 'p.png', phoneNumber: user.phoneNumber || null,
    providerData: [{ providerId: 'google.com', uid: 'google_sub_999' }],
    getIdToken: async () => 'TOKEN123', reload: async () => {}, updateProfile: async () => {}
  };
  let listener = null;
  const firebase = {
    apps: [{}],
    auth: () => ({ currentUser: fakeUser, onAuthStateChanged: cb => { listener = cb; }, signOut: async () => {} })
  };
  const ctx = {
    firebase, console, Date, JSON, String, Number, Array, Promise, setTimeout,
    window: { FIREBASE_CONFIG: { apiKey: 'x' }, dispatchEvent: e => events.push(e) },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    document: {}, navigator: { userAgent: 'Mozilla/5.0 Chrome' },
    fetch: async (url, init) => {
      const payload = JSON.parse(init.body);
      calls.push({ url, headers: init.headers, payload });
      const json = api ? await api(payload) : { success: true, required: true, verified: false, phone: '' };
      return { status: 200, json: async () => json };
    },
    st: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; }, del: k => { delete store[k]; } }
  };
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.__ytAuth = ytAuth;', ctx);
  return { ytAuth: ctx.__ytAuth, store, events, calls, fire: u => listener && listener(u), ctx };
}

describe('ytAuth.normalizePhone', () => {
  const { ytAuth } = makeEnv();
  test('chuẩn hoá các kiểu nhập', () => {
    for (const raw of ['0912345678', '+84912345678', '84912345678', '091 234 5678', '0912.345.678']) {
      const r = ytAuth.normalizePhone(raw);
      assert.ok(r.ok, raw);
      assert.strictEqual(r.intl, '+84912345678');
      assert.strictEqual(r.local, '0912345678');
    }
  });
  test('từ chối số sai', () => {
    for (const raw of ['', '123', '0212345678', '091234567', '09123456789', '+14155550123', 'abc']) {
      assert.strictEqual(ytAuth.normalizePhone(raw).ok, false, raw);
    }
  });
});

describe('ytAuth.sendOtp / confirmOtp (qua server /api/phone-otp)', () => {
  test('báo lỗi tiếng Việt khi chưa đăng nhập', async () => {
    const { ytAuth, calls } = makeEnv({ user: null });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /đăng nhập/);
    assert.strictEqual(calls.length, 0);
  });
  test('gửi SĐT dạng 09... + kèm Bearer token lên server', async () => {
    const { ytAuth, calls } = makeEnv({ user: {}, api: async () => ({ success: true, cooldown: 60 }) });
    const r = await ytAuth.sendOtp('+84912345678');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.local, '0912345678');
    assert.strictEqual(calls[0].url, '/api/phone-otp');
    assert.strictEqual(calls[0].headers.Authorization, 'Bearer TOKEN123');
    assert.deepStrictEqual({ ...calls[0].payload }, { action: 'send', phone: '0912345678' });
  });
  test('SĐT đã thuộc tài khoản khác -> hiện đúng thông báo của server', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async () => ({ success: false, code: 'PHONE_TAKEN', message: 'Số điện thoại này đã gắn với một tài khoản khác.' }) });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /tài khoản khác/);
  });
  test('quá giới hạn -> trả retryAfter để giao diện đếm ngược', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async () => ({ success: false, code: 'RATE_LIMITED', message: 'đợi', retryAfter: 60 }) });
    assert.strictEqual((await ytAuth.sendOtp('0912345678')).retryAfter, 60);
  });
  test('từ chối OTP chưa gửi mã / không đủ 6 số, không gọi server', async () => {
    const { ytAuth, calls } = makeEnv({ user: {}, api: async () => ({ success: true }) });
    assert.strictEqual((await ytAuth.confirmOtp('123456')).success, false);
    await ytAuth.sendOtp('0912345678');
    const n = calls.length;
    assert.strictEqual((await ytAuth.confirmOtp('12')).success, false);
    assert.strictEqual(calls.length, n);
  });
  test('nhập đúng OTP -> hồ sơ phoneVerified=true + báo cho App', async () => {
    const { ytAuth, events, store } = makeEnv({ user: {}, api: async p => p.action === 'verify' ? { success: true, verified: true, phone: '0912345678' } : { success: true } });
    await ytAuth.sendOtp('0912345678');
    const r = await ytAuth.confirmOtp('123456');
    assert.strictEqual(r.success, true);
    assert.strictEqual(r.profile.phoneVerified, true);
    assert.strictEqual(JSON.parse(store.yt_user_profile).phone, '0912345678');
    assert.ok(events.some(e => e.type === 'yt-profile-changed' && e.detail.phoneVerified));
  });
  test('OTP sai -> giữ phiên để nhập lại', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async p => p.action === 'verify' ? { success: false, code: 'OTP_WRONG', message: 'Mã OTP không đúng.' } : { success: true } });
    await ytAuth.sendOtp('0912345678');
    const r = await ytAuth.confirmOtp('111111');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /không đúng/);
    assert.strictEqual((await ytAuth.confirmOtp('222222')).success, false); // vẫn gọi được, không báo "chưa gửi mã"
  });
  test('tài khoản đã xác minh thì không gọi gửi SMS nữa (tránh tốn tiền)', async () => {
    const { ytAuth, calls } = makeEnv({ user: { phoneNumber: '+84912345678' } });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.alreadyVerified, true);
    assert.strictEqual(calls.length, 0);
  });
  test('mất mạng -> thông báo tiếng Việt, không văng lỗi', async () => {
    const env = makeEnv({ user: {} });
    env.ctx.fetch = async () => { throw new Error('offline'); };
    const r = await env.ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /kết nối/);
  });
});

describe('ytAuth.refreshPhoneStatus / profileFromUser / bootstrap', () => {
  test('lấy trạng thái SĐT từ server và cập nhật hồ sơ', async () => {
    const { ytAuth, events, store } = makeEnv({ user: {}, api: async () => ({ success: true, required: true, verified: true, phone: '0912345678' }) });
    const r = await ytAuth.refreshPhoneStatus();
    assert.strictEqual(r.profile.phoneVerified, true);
    assert.strictEqual(r.profile.phone, '0912345678');
    assert.strictEqual(JSON.parse(store.yt_user_profile).phoneVerified, true);
    assert.ok(events.length >= 1);
  });
  test('server chưa xác minh -> phoneVerified=false', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async () => ({ success: true, required: true, verified: false, phone: '' }) });
    assert.strictEqual((await ytAuth.refreshPhoneStatus()).profile.phoneVerified, false);
  });
  test('server tắt yêu cầu SĐT (REQUIRE_PHONE=false) -> coi như đã xác minh', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async () => ({ success: true, required: false, verified: false, phone: '' }) });
    assert.strictEqual((await ytAuth.refreshPhoneStatus()).profile.phoneVerified, true);
  });
  test('server lỗi -> báo statusError, không tự cho qua', async () => {
    const { ytAuth } = makeEnv({ user: {}, api: async () => ({ success: false, message: 'Hệ thống đang bận' }) });
    const r = await ytAuth.refreshPhoneStatus();
    assert.strictEqual(r.profile.phoneVerified, false);
    assert.match(r.statusError, /bận/);
  });
  test('giữ nguyên id Google (sub) để không mất dữ liệu gói cũ', () => {
    const { ytAuth } = makeEnv({ user: { phoneNumber: '+84912345678' } });
    const p = ytAuth.profileFromUser(ytAuth.currentUser());
    assert.strictEqual(p.googleId, 'google_sub_999');
    assert.strictEqual(p.phone, '0912345678');
    assert.strictEqual(p.authType, 'google');
  });
  test('hồ sơ "đã đăng nhập" kiểu cũ (chỉ localStorage) bị xoá khi Firebase không có user', () => {
    const env = makeEnv({ user: null });
    env.store.yt_user_profile = JSON.stringify({ isAuth: true, authType: 'google', phoneVerified: true, name: 'fake' });
    env.ytAuth.bootstrap();
    env.fire(null);
    assert.strictEqual(env.store.yt_user_profile, undefined);
  });
  test('admin cũ không bị xoá hồ sơ khi bootstrap', () => {
    const env = makeEnv({ user: null });
    env.store.yt_user_profile = JSON.stringify({ isAuth: true, authType: 'admin', name: 'adminh' });
    env.ytAuth.bootstrap();
    env.fire(null);
    assert.ok(env.store.yt_user_profile);
  });
  test('admin mới (name: admin) không bị xoá hồ sơ khi bootstrap', () => {
    const env = makeEnv({ user: null });
    env.store.yt_user_profile = JSON.stringify({ isAuth: true, authType: 'admin', name: 'admin', isAdmin: true });
    env.ytAuth.bootstrap();
    env.fire(null);
    assert.ok(env.store.yt_user_profile);
    const p = JSON.parse(env.store.yt_user_profile);
    assert.strictEqual(p.isAdmin, true);
    assert.strictEqual(p.authType, 'admin');
  });
});

