// Webhook nhận sự kiện từ Telegram Bot để xác minh số điện thoại
const { normalizePhone, hashCode } = require('./_lib/phone_otp');
const store = require('./_lib/store');
const telegram = require('./_lib/telegram');

const TEN_YEARS = 315360000;

module.exports = async (req, res) => {
  // GET: Hỗ trợ tự động thiết lập Webhook cho Vercel (chỉ cần mở /api/telegram-webhook?setup=1 trên trình duyệt)
  if (req.method === 'GET') {
    if (req.query && req.query.setup === '1') {
      if (!telegram.isConfigured()) {
        return res.status(503).json({ success: false, message: 'Chưa cấu hình TELEGRAM_BOT_TOKEN trong biến môi trường.' });
      }
      try {
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const webhookUrl = `${proto}://${host}/api/telegram-webhook`;
        const r = await telegram.setWebhook(webhookUrl);
        return res.status(200).json({ success: true, message: 'Thiết lập Webhook Telegram thành công!', webhookUrl, result: r });
      } catch (e) {
        return res.status(500).json({ success: false, error: e.message });
      }
    }
    return res.status(200).json({ status: 'ok', service: 'YouTrend Telegram Webhook', configured: telegram.isConfigured() });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  // Telegram gửi bản tin qua POST
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }

  res.status(200).json({ ok: true }); // Luôn trả 200 sớm cho Telegram để tránh retry

  const message = body?.message;
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const fromId = message.from?.id;
  const firstName = message.from?.first_name || 'bạn';
  const text = (message.text || '').trim();

  try {
    // 1. Người dùng bấm link Deep Link: /start auth_<sessionToken>
    if (text.startsWith('/start')) {
      const parts = text.split(/\s+/);
      const startParam = parts[1] || '';

      if (startParam.startsWith('auth_')) {
        const sessionToken = startParam;
        const rawSession = await store.get('tg_session:' + sessionToken);

        if (!rawSession) {
          await telegram.sendMessage(chatId,
            '⚠️ <b>Phiên xác thực đã hết hạn hoặc không tồn tại.</b>\n\nVui lòng quay lại trang web YouTrend và bấm lại nút <b>"Xác minh qua Telegram"</b> để lấy liên kết mới.');
          return;
        }

        // Lưu liên kết giữa Telegram user và session này (trong 10 phút)
        await store.set('tg_user_sess:' + fromId, sessionToken, 600);

        await telegram.sendMessage(chatId,
          `👋 Xin chào <b>${firstName}</b>!\n\n` +
          `Để kích hoạt tài khoản <b>YouTrend</b> và chống tạo nhiều tài khoản spam:\n\n` +
          `👉 Hãy bấm nút <b>"📱 Gửi Số Điện Thoại Xác Thực"</b> ở bàn phím bên dưới:`,
          {
            reply_markup: {
              keyboard: [
                [{ text: '📱 Gửi Số Điện Thoại Xác Thực', request_contact: true }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }
        );
        return;
      }

      // /start không có token
      await telegram.sendMessage(chatId,
        `👋 Xin chào <b>${firstName}</b>! Đây là <b>Bot Xác Thực Tài Khoản YouTrend</b>.\n\n` +
        `Để xác minh số điện thoại, bạn hãy mở website YouTrend, đăng nhập và bấm nút <b>"Nhận Mã Qua Telegram"</b> nhé!`);
      return;
    }

    // 2. Người dùng bấm nút chia sẻ danh bạ (Share Contact)
    if (message.contact) {
      // Bảo mật chống giả mạo: contact được chia sẻ phải chính là user đang chat
      if (message.contact.user_id && message.contact.user_id !== fromId) {
        await telegram.sendMessage(chatId,
          '⚠️ Vui lòng bấm nút <b>"Gửi Số Điện Thoại Xác Thực"</b> chính chủ từ bàn phím Telegram (không chuyển tiếp danh bạ của người khác).');
        return;
      }

      const sessionToken = await store.get('tg_user_sess:' + fromId);
      if (!sessionToken) {
        await telegram.sendMessage(chatId,
          '⚠️ Không tìm thấy phiên xác thực đang chờ. Vui lòng quay lại trang web YouTrend và bấm lại nút <b>"Xác minh qua Telegram"</b>.');
        return;
      }

      const rawSession = await store.get('tg_session:' + sessionToken);
      let sessionData = null;
      try { sessionData = JSON.parse(rawSession || 'null'); } catch (e) {}

      if (!sessionData || !sessionData.uid) {
        await telegram.sendMessage(chatId,
          '⚠️ Phiên xác thực đã hết hạn. Vui lòng quay lại trang web YouTrend và thử lại.');
        return;
      }

      const p = normalizePhone(message.contact.phone_number);
      if (!p.ok) {
        await telegram.sendMessage(chatId,
          '⚠️ Số điện thoại không hợp lệ hoặc không thuộc định dạng được hỗ trợ.');
        return;
      }

      // Kiểm tra xem số điện thoại này đã được gắn với tài khoản khác chưa (Chống tạo nhiều acc clone)
      const existingOwner = await store.get('phone_owner:' + p.intl);
      if (existingOwner && existingOwner !== sessionData.uid) {
        await telegram.sendMessage(chatId,
          `⚠️ <b>Số điện thoại ${p.local} đã được gắn với một tài khoản YouTrend khác!</b>\n\n` +
          `Mỗi số điện thoại chỉ được kích hoạt 1 tài khoản YouTrend duy nhất để đảm bảo công bằng cho người dùng.`,
          { reply_markup: { remove_keyboard: true } });
        return;
      }

      // Sinh mã OTP 6 số ngẫu nhiên
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Lưu trạng thái đã xác minh vào session để Web polling nhận diện tự động
      await store.set('tg_session:' + sessionToken, JSON.stringify({
        uid: sessionData.uid,
        phone: p.intl,
        local: p.local,
        code,
        verified: true,
        verifiedAt: Date.now()
      }), 600);

      // Cập nhật quyền sở hữu SĐT & kích hoạt tài khoản
      await store.set('phone_owner:' + p.intl, sessionData.uid, TEN_YEARS);
      await store.set('user_phone:' + sessionData.uid, p.intl);
      await store.set('otp:' + sessionData.uid, JSON.stringify({
        h: hashCode(sessionData.uid, p.intl, code),
        phone: p.intl
      }), 600);

      await telegram.sendMessage(chatId,
        `✅ <b>XÁC MINH SỐ ĐIỆN THOẠI THÀNH CÔNG!</b>\n\n` +
        `📱 Số điện thoại: <b>${p.local}</b>\n` +
        `🔑 Mã OTP của bạn là: <code>${code}</code>\n\n` +
        `🎉 <i>Trang web YouTrend sẽ tự động nhận diện và kích hoạt trong giây lát! Hoặc bạn có thể nhập mã 6 số trên vào web.</i>`,
        { reply_markup: { remove_keyboard: true } }
      );
    }
  } catch (err) {
    console.error('[telegram-webhook] Lỗi xử lý:', err.message);
  }
};
