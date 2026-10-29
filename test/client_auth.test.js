// Chạy khối ytAuth của app.bundle.js trong sandbox với Firebase giả lập (không cần mạng).
const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(__dirname + '/../app.bundle.js', 'utf8');
const start = src.indexOf('const ytAuth = {');
const end = src.indexOf('function AuthModal');
assert.ok(start > 0 && end > start, 'không tìm thấy khối ytAuth');
const block = src.slice(start, end);

function makeEnv({ user = null, linkImpl } = {}) {
  const store = {};
  const events = [];
  const fakeUser = user && {
    uid: 'fb_uid_1', displayName: 'Hung', email: 'hung@gmail.com', photoURL: 'p.png', phoneNumber: user.phoneNumber || null,
    providerData: [{ providerId: 'google.com', uid: 'google_sub_999' }],
    getIdToken: async () => 'TOKEN123', reload: async () => {}, updateProfile: async () => {},
    linkWithPhoneNumber: linkImpl || (async () => ({ confirm: async () => {} }))
  };
  let listener = null;
  const firebase = {
    apps: [{}],
    auth: Object.assign(() => ({
      currentUser: fakeUser,
      onAuthStateChanged: cb => { listener = cb; },
      signOut: async () => {}
    }), { RecaptchaVerifier: function () { this.clear = () => {}; } })
  };
  const ctx = {
    firebase, console, Date, JSON, String, Number, Array, Promise, setTimeout,
    window: { FIREBASE_CONFIG: { apiKey: 'x' }, dispatchEvent: e => events.push(e), },
    CustomEvent: function (type, init) { this.type = type; this.detail = init && init.detail; },
    document: { createElement: () => ({ style: {} }), body: { appendChild() {}, removeChild() {} } },
    navigator: { userAgent: 'Mozilla/5.0 Chrome' },
    st: { get: k => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; }, del: k => { delete store[k]; } }
  };
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.__ytAuth = ytAuth;', ctx);
  return { ytAuth: ctx.__ytAuth, store, events, fire: u => listener && listener(u), ctx };
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

describe('ytAuth.sendOtp / confirmOtp', () => {
  test('báo lỗi tiếng Việt khi chưa đăng nhập', async () => {
    const { ytAuth } = makeEnv({ user: null });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /đăng nhập/);
  });
  test('gắn SĐT vào đúng tài khoản đang đăng nhập (+84...)', async () => {
    let calledWith = null;
    const { ytAuth } = makeEnv({ user: {}, linkImpl: async (p) => { calledWith = p; return { confirm: async () => {} }; } });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.success, true);
    assert.strictEqual(calledWith, '+84912345678');
  });
  test('SĐT đã thuộc tài khoản khác -> thông báo rõ ràng', async () => {
    const { ytAuth } = makeEnv({ user: {}, linkImpl: async () => ({ confirm: async () => { const e = new Error('x'); e.code = 'auth/credential-already-in-use'; throw e; } }) });
    assert.strictEqual((await ytAuth.sendOtp('0912345678')).success, true);
    const r = await ytAuth.confirmOtp('123456');
    assert.strictEqual(r.success, false);
    assert.match(r.error, /1 tài khoản/);
  });
  test('từ chối OTP không đủ 6 số / chưa gửi mã', async () => {
    const { ytAuth } = makeEnv({ user: {} });
    assert.strictEqual((await ytAuth.confirmOtp('123456')).success, false);
    await ytAuth.sendOtp('0912345678');
    const r = await ytAuth.confirmOtp('12');
    assert.strictEqual(r.success, false);
  });
  test('tài khoản đã có SĐT thì không gửi SMS nữa (tránh tốn tiền SMS)', async () => {
    let called = false;
    const { ytAuth } = makeEnv({ user: { phoneNumber: '+84912345678' }, linkImpl: async () => { called = true; return {}; } });
    const r = await ytAuth.sendOtp('0912345678');
    assert.strictEqual(r.alreadyVerified, true);
    assert.strictEqual(called, false);
  });
});

describe('ytAuth.profileFromUser / bootstrap', () => {
  test('giữ nguyên id Google (sub) để không mất dữ liệu gói cũ; phoneVerified theo Firebase', () => {
    const { ytAuth } = makeEnv({ user: { phoneNumber: '+84912345678' } });
    const u = ytAuth.currentUser();
    const p = ytAuth.profileFromUser(u);
    assert.strictEqual(p.googleId, 'google_sub_999');
    assert.strictEqual(p.phone, '0912345678');
    assert.strictEqual(p.phoneVerified, true);
    assert.strictEqual(p.authType, 'google');
    const p2 = ytAuth.profileFromUser(Object.assign({}, u, { phoneNumber: null }));
    assert.strictEqual(p2.phoneVerified, false);
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
});
