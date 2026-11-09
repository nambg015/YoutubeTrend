// =========================================================================
// YOUTREND — BẢNG MÀU (theme.js)
// Phong cách học từ CutLab (obsidian): thẻ đen than, chữ trắng, tab trắng, nút chính vàng hổ phách,
// ngọc (kênh farm + con dấu), cam/tím (phối màu như CutLab),
// hoè (đang lên / cảnh báo), lá (ổn / thành công), chàm nhạt (thông tin), điều (lỗi).
// Các bảng màu cũ của Tailwind (zinc, emerald, sky...) được trỏ sang bảng mới để
// mọi mục, kể cả module nhúng cũ, cùng một hệ màu.
// =========================================================================
(function (root) {
  var S = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  function scale(hex) { var o = {}; S.forEach(function (k, i) { o[k] = hex[i]; }); return o; }
  var cham = scale(['#ecedf0', '#e2e3e7', '#cfd0d6', '#b3b5bd', '#9c9ea7', '#82848e', '#55575f', '#36373d', '#2a2b30', '#212226', '#18191c']);
  var ngoc = scale(['#ecfbf7', '#cff4ea', '#a3e8d6', '#74d6bf', '#4fc1a8', '#34a690', '#288574', '#22695d', '#1d534a', '#173f39', '#0d2723']);
  var son = scale(['#fff4ed', '#ffe6d5', '#ffc9a8', '#ffa26f', '#ff7a29', '#ff5e00', '#e05200', '#b84300', '#8f3600', '#4a1c00', '#2b1000']);
  var hoe = scale(['#fffbeb', '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e', '#451a03', '#2a1003']);
  var la = scale(['#eef7ef', '#d6ecd9', '#b2dab8', '#8fc699', '#6cae79', '#51935f', '#3f764c', '#315c3c', '#26472f', '#1a3021', '#0f1d14']);
  var nhat = scale(['#edf6fa', '#d6ebf3', '#b4d8e8', '#8ec2da', '#6eabc9', '#5590b0', '#45768f', '#385f73', '#2c4a59', '#203641', '#14232b']);
  var dieu = scale(['#fdeef0', '#fad6da', '#f5b2ba', '#ee8b98', '#e46476', '#cb465c', '#a8354a', '#832a3b', '#62202d', '#42161f', '#290d13']);
  var hoaca = scale(['#faf5ff', '#f3e8ff', '#e9d5ff', '#d8b4fe', '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8', '#3b0764', '#22053d']);
  var colors = {
    cham: cham, ngoc: ngoc, son: son, hoe: hoe, la: la, nhat: nhat, dieu: dieu, hoaca: hoaca,
    zinc: cham, neutral: cham, gray: cham, slate: cham, stone: cham,
    emerald: la, green: la, teal: ngoc, lime: la,
    sky: nhat, blue: nhat, cyan: nhat, indigo: nhat,
    amber: hoe, yellow: hoe, orange: son,
    rose: dieu, red: dieu, pink: dieu,
    violet: hoaca, purple: hoaca, fuchsia: hoaca,
    brand: { red: '#fbbf24', darkRed: '#f59e0b', dark: '#111215', surface: '#1e1f24', card: '#232429', border: '#36373d', hover: '#26272d' }
  };
  var font = ['"Be Vietnam Pro"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'];
  var display = ['"Space Grotesk"', '"Be Vietnam Pro"', 'system-ui', 'sans-serif'];
  var theme = { colors: colors, font: font, display: display };
  if (typeof module !== 'undefined' && module.exports) module.exports = theme;
  if (root) {
    root.YT_THEME = theme;
    root.tailwind = root.tailwind || {};
    root.tailwind.config = { theme: { extend: { fontFamily: { sans: font, display: display }, colors: colors } } };
  }
})(typeof window !== 'undefined' ? window : null);
