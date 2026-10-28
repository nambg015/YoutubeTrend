const { parseVNNumber, getVNNumberBounds } = require('./vn_parser');

const STUDIO_UI_WORDS = new Set([
  'nội', 'dung', 'của', 'kênh', 'số', 'liệu', 'phân', 'tích', 'về', 'video',
  'tổng', 'quan', 'phạm', 'vi', 'tiếp', 'cận', 'mức', 'độ', 'tương', 'tác',
  'đối', 'tượng', 'người', 'xem', 'doanh', 'thu', 'ước', 'tính', 'tuyệt', 'vời',
  'đang', 'thu', 'hút', 'nhiều', 'khán', 'giả', 'hơn', 'góp', 'phần', 'giúp',
  'tăng', 'gấp', 'lần', 'so', 'với', 'thường', 'lệ', 'chi', 'tiết', 'trình',
  'biên', 'tập', 'bình', 'luận', 'ngôn', 'ngữ', 'thông', 'báo', 'xác', 'nhận',
  'đoạn', 'trích', 'và', 'cài', 'đặt', 'gửi', 'phản', 'hồi', 'chế', 'độ', 'nâng', 'cao',
  'thời', 'gian', 'thực', 'cập', 'nhật', 'giờ', 'qua', 'ngày', 'bây', 'nguồn', 'lưu',
  'lượng', 'hàng', 'đầu', 'các', 'tính', 'năng', 'duyệt', 'đề', 'xuất', 'tìm', 'kiếm',
  'trang', 'khác', 'xem', 'thêm', 'từ', 'khi', 'xuất', 'bản', 'tới', 'nay',
  'bạn', 'thứ', 'thg', 'tháng', 'đầu', 'tiên', 'youtube', 'studio', 'analytics',
  'overview', 'reach', 'engagement', 'audience', 'revenue', 'content', 'channel',
  'dashboard', 'realtime', 'views', 'watch', 'time', 'hours', 'subscribers', 'details'
]);

const AXIS_LABEL_REGEX = /^(870|580|290|0|100|200|500|1000|2000)$/;

function parseIsoDuration(duration) {
  if (!duration) return 0;
  const match = duration.match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const days = parseInt(match[1] || 0, 10);
  const hours = parseInt(match[2] || 0, 10);
  const minutes = parseInt(match[3] || 0, 10);
  const seconds = parseInt(match[4] || 0, 10);
  return days * 86400 + hours * 3600 + minutes * 60 + seconds;
}

function validateVisibleTitleChars(str) {
  if (!str) return null;
  const s = String(str).trim();
  if (!s || s.length > 30) return null;

  if (/^[0-9.,\s]+$/.test(s)) return null;
  if (AXIS_LABEL_REGEX.test(s)) return null;
  if (/^[-—_~|/\s]{2,}$/.test(s)) return null;
  if (/[-—_~]{2,}/.test(s)) return null;

  if (STUDIO_UI_WORDS.has(s.toLowerCase())) return null;

  const isCJK = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005]/.test(s);
  const cjkChars = s.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005]/g) || [];
  const latinLetters = s.match(/[a-zA-Z]/g) || [];

  if (s.length === 1 || (s.length === 2 && s.includes('々'))) {
    return {
      text: s,
      strength: 'weak',
      confidence: 0.4
    };
  }

  if (isCJK) {
    if (cjkChars.length >= 2) {
      return { text: s, strength: 'soft', confidence: 0.85 };
    }
  } else {
    if (latinLetters.length >= 3) {
      return { text: s, strength: 'soft', confidence: 0.85 };
    }
  }

  return null;
}

function createClue({ type, value, min = null, max = null, confidence = 0.9, strength = 'soft', source = {}, note = '' }) {
  return {
    type,
    value,
    min,
    max,
    confidence,
    strength,
    source,
    note
  };
}

module.exports = {
  STUDIO_UI_WORDS,
  parseIsoDuration,
  validateVisibleTitleChars,
  createClue
};
