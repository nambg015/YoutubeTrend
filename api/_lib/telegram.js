// Module giao tiếp với Telegram Bot API qua native HTTPS (không cần thư viện ngoài)
const https = require('https');

const env = k => (process.env[k] || '').trim();
const getBotToken = () => env('TELEGRAM_BOT_TOKEN');
const getBotUsername = () => env('TELEGRAM_BOT_USERNAME');
const isConfigured = () => !!getBotToken();

function callTelegramApi(endpoint, body = null, timeoutMs = 10000) {
  const token = getBotToken();
  if (!token) return Promise.reject(new Error('Chưa cấu hình TELEGRAM_BOT_TOKEN'));

  return new Promise((resolve, reject) => {
    const url = new URL(`https://api.telegram.org/bot${token}${endpoint}`);
    const isPost = !!body;
    const payload = isPost ? JSON.stringify(body) : null;

    const headers = {};
    if (isPost) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = https.request({
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: isPost ? 'POST' : 'GET',
      headers
    }, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.ok) {
            resolve(json.result);
          } else {
            reject(new Error(`Telegram API lỗi (${json.error_code}): ${json.description || 'Không rõ'}`));
          }
        } catch (e) {
          reject(new Error(`Lỗi parse phản hồi Telegram (HTTP ${res.statusCode}): ${data.slice(0, 150)}`));
        }
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error('Quá thời gian chờ phản hồi từ Telegram API')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function sendMessage(chatId, text, extra = {}) {
  const body = Object.assign({
    chat_id: chatId,
    text,
    parse_mode: 'HTML'
  }, extra);
  return callTelegramApi('/sendMessage', body);
}

async function setWebhook(webhookUrl) {
  return callTelegramApi(`/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
}

async function getMe() {
  return callTelegramApi('/getMe');
}

module.exports = {
  getBotToken,
  getBotUsername,
  isConfigured,
  callTelegramApi,
  sendMessage,
  setWebhook,
  getMe
};
