// Vercel Serverless Function: Secure SePay Payment Verification
// Protects your API key on the server side - hackers CANNOT see this key!
const https = require('https');

const SEPAY_API_KEY = process.env.SEPAY_API_KEY || 'J1CBHWNBTR9O5136HKVEGHOQIXLGBIHZ0GEORPVYPCWRUDNXSF2LVUQTTWY4MOYV';

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { orderCode, expectedAmount, tier, days } = req.query;

  if (!orderCode) {
    return res.status(400).json({ success: false, message: 'Thiếu mã đơn hàng (orderCode)' });
  }

  const reqAmount = Number(expectedAmount) || 0;

  try {
    const transactions = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'my.sepay.vn',
        path: '/userapi/transactions/list?limit=20',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SEPAY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      };

      const request = https.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve(parsed.transactions || []);
          } catch(e) {
            reject(e);
          }
        });
      });

      request.on('error', (err) => reject(err));
      request.end();
    });

    // Check if any transaction matches orderCode in transaction_content
    const matchedTx = transactions.find(tx => {
      const content = (tx.transaction_content || '').toUpperCase();
      const code = orderCode.toUpperCase();
      const amountIn = Number(tx.amount_in) || 0;
      return content.includes(code) && (reqAmount === 0 || amountIn >= reqAmount * 0.95);
    });

    if (matchedTx) {
      return res.status(200).json({
        success: true,
        verified: true,
        orderCode,
        tier: tier || 'PRO',
        days: Number(days) || 30,
        amountReceived: matchedTx.amount_in,
        transactionDate: matchedTx.transaction_date,
        message: 'Thanh toán thành công! Giao dịch đã được ghi nhận vào tài khoản ngân hàng.'
      });
    } else {
      return res.status(200).json({
        success: false,
        verified: false,
        orderCode,
        message: 'Chưa tìm thấy giao dịch chuyển khoản với nội dung "' + orderCode + '". Vui lòng đợi 30-60 giây để ngân hàng xử lý hoặc kiểm tra lại nội dung chuyển khoản.'
      });
    }
  } catch (error) {
    console.error('Lỗi kiểm tra SePay:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi kiểm tra giao dịch', error: error.message });
  }
};
