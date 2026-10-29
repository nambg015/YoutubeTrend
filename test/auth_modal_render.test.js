// Kiểm tra AuthModal dựng được giao diện ở cả 3 chế độ (React giả lập, không cần mạng).
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const vm = require('vm');

const src = fs.readFileSync(__dirname + '/../app.bundle.js', 'utf8');
const block = src.slice(src.indexOf('function AuthModal'), src.indexOf('// Simple API Key Prompt Modal'));

function render(mode) {
  let call = 0;
  const React = {
    Fragment: 'Fragment',
    createElement: (type, props, ...children) => ({ type, props, children }),
    useEffect: () => {},
  };
  const useState = init => { const i = call++; return [i === 0 ? mode : init, () => {}]; };
  const ctx = { React, useState, ytAuth: { currentUser: () => null, disposeVerifier() {} }, st: {}, window: {} };
  vm.createContext(ctx);
  vm.runInContext(block + '\nthis.__M = AuthModal;', ctx);
  return ctx.__M({ onClose() {}, onLoginSuccess() {}, showToast() {}, initialNotice: '' });
}
const text = n => (n == null || n === false) ? '' : Array.isArray(n) ? n.map(text).join(' ') : typeof n === 'object' ? text(n.children) : String(n);

test('login / register / verify_phone đều dựng được', () => {
  const login = text(render('login'));
  assert.match(login, /Tiếp tục với Google/);
  assert.match(login, /Đăng Nhập/);
  const reg = text(render('register'));
  assert.match(reg, /Nhập lại mật khẩu/);
  assert.match(reg, /xác minh số điện thoại/);
  const ver = text(render('verify_phone'));
  assert.match(ver, /Gửi mã OTP/);
  assert.match(ver, /Mỗi số điện thoại chỉ/);
});
