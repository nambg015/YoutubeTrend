// Đã gỡ: web chỉ dành cho admin (không còn đăng ký, xác minh SĐT, gói trả phí). Có thể xoá file này.
module.exports = (req, res) => res.status(410).json({ success: false, code: 'REMOVED', message: 'Tính năng này đã được gỡ khỏi YouTrend.' });
