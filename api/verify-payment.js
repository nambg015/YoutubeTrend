// Xác nhận thanh toán SePay. Khác bản cũ:
//  - KHÔNG còn key viết cứng trong code (chỉ đọc từ biến môi trường SEPAY_API_KEY)
//  - Bắt buộc đăng nhập + đã xác minh SĐT
//  - Giá/số ngày do SERVER quyết định (bảng giá bên dưới), không tin expectedAmount/tier/days từ trình duyệt
//  - Mã đơn phải đúng dạng YT + 6 số, số tiền phải đủ, và 1 giao dịch ngân hàng chỉ dùng được cho 1 tài khoản
const https = require('https');
const { requirePhoneVerified, applyCors } = require('./_lib/auth');
const store = require('./_lib/store');

const SEPAY_API_KEY = process.env.SEPAY_API_KEY;

// Phải khớp TIERS_DATA trong app.bundle.js
const PRICE_TABLE = {
  PRO:       { 30: 399000, 90: 699000,  365: 999000 },
  ULTRA_PRO: { 30: 599000, 90: 999000,  365: 1500000 }
};

function fetchTransactions() {
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'my.sepay.vn',
      path: '/userapi/transactions/list?limit=50',
      method: 'GET',
      headers: { Authorization: `Bearer ${SEPAY_API_KEY}`, 'Content-Type': 'application/json' }
    }, response => {
      let body = '';
      response.on('data', c => { body += c; });
      response.on('end', () => {
        try { resolve(JSON.parse(body).transactions || []); } catch (e) { reject(e); }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

module.exports = async (req, res) => {
  applyCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ success: false, message: 'Method Not Allowed' });

  if (!SEPAY_API_KEY) {
    return res.status(500).json({ success: false, message: 'Máy chủ chưa cấu hình SEPAY_API_KEY.' });
  }

  const claims = await requirePhoneVerified(req, res);
  if (!claims) return;
  const uid = claims.sub;

  const orderCode = String(req.query.orderCode || '').toUpperCase();
  const tier = String(req.query.tier || '');
  const days = Number(req.query.days);

  if (!/^YT\d{6}$/.test(orderCode)) {
    return res.status(400).json({ success: false, message: 'Mã đơn hàng không hợp lệ.' });
  }
  const price = PRICE_TABLE[tier] && PRICE_TABLE[tier][days];
  if (!price) {
    return res.status(400).json({ success: false, message: 'Gói hoặc thời hạn không hợp lệ.' });
  }

  try {
    const transactions = await fetchTransactions();
    const matched = transactions.find(tx => {
      const content = String(tx.transaction_content || '').toUpperCase();
      return content.includes(orderCode) && Number(tx.amount_in) >= price;
    });

    if (!matched) {
      return res.status(200).json({
        success: false, verified: false, orderCode,
        message: 'Chưa thấy giao dịch đủ số tiền ' + price.toLocaleString('vi-VN') + 'đ với nội dung "' + orderCode + '". Đợi 30–60 giây rồi bấm lại.'
      });
    }

    // 1 giao dịch ngân hàng chỉ gắn với 1 tài khoản (cùng tài khoản bấm lại thì vẫn được).
    const txKey = 'paytx:' + (matched.id || matched.reference_number || orderCode);
    const first = await store.setOnce(txKey, uid, 60 * 60 * 24 * 400);
    if (!first) {
      const owner = await store.get(txKey);
      if (owner !== uid) {
        return res.status(409).json({ success: false, verified: false, message: 'Giao dịch này đã được dùng cho tài khoản khác.' });
      }
    }

    // Lưu gói PRO/ULTRA vào KV theo UID để chống sửa F12 trên trình duyệt
    const userTierKey = 'user_tier:' + uid;
    const expiresAt = Date.now() + days * 86400000;
    await store.set(userTierKey, JSON.stringify({ tier, expiresAt, orderCode }), 60 * 60 * 24 * (days + 30));

    return res.status(200).json({
      success: true, verified: true, orderCode, tier, days,
      expiresAt,
      amountReceived: matched.amount_in,
      transactionDate: matched.transaction_date,
      message: 'Thanh toán thành công! Gói ' + tier + ' đã được kích hoạt trên hệ thống máy chủ.'
    });
  } catch (error) {
    console.error('Lỗi kiểm tra SePay:', error.message);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi kiểm tra giao dịch' });
  }
};
