// YOUTREND CÔNG CỤ V2: YOUTUBE DATA API VALIDATOR
// Đánh giá cung cầu, tỷ lệ kênh nhỏ bứt phá (<30k sub) và tính toán quota budget

const DEFAULT_QUOTA_CAP = 2000; // Ngưỡng an toàn khuyến nghị per run
const UNITS_PER_SEARCH = 100;
const UNITS_PER_VIDEO_BATCH = 1;
const UNITS_PER_CHANNEL_BATCH = 1;

/**
 * Tính toán trước lượng điểm Quota tiêu tốn dự kiến
 * @param {number} keywordCount - Số lượng từ khoá cần thẩm định
 * @param {object} options - Tuỳ chọn thẩm định (chi tiết sub, video)
 */
function estimateQuotaBudget(keywordCount, options = {}) {
  const count = Math.max(0, parseInt(keywordCount, 10) || 0);
  const includeChannelDetails = options.includeChannelDetails !== false;
  const includeVideoStats = options.includeVideoStats !== false;

  const costPerKeyword = UNITS_PER_SEARCH + 
    (includeVideoStats ? UNITS_PER_VIDEO_BATCH : 0) + 
    (includeChannelDetails ? UNITS_PER_CHANNEL_BATCH : 0);

  const totalUnits = count * costPerKeyword;
  const cap = options.quotaCap || DEFAULT_QUOTA_CAP;

  return {
    keywordCount: count,
    costPerKeyword,
    totalUnits,
    quotaCap: cap,
    isWithinBudget: totalUnits <= cap,
    recommendedMaxKeywords: Math.floor(cap / costPerKeyword),
    breakdown: {
      searchCost: count * UNITS_PER_SEARCH,
      videoDetailsCost: includeVideoStats ? count * UNITS_PER_VIDEO_BATCH : 0,
      channelCost: includeChannelDetails ? count * UNITS_PER_CHANNEL_BATCH : 0
    }
  };
}

/**
 * Phân tích danh sách video trả về từ YouTube API để trích xuất metrics cung-cầu
 * @param {Array} videos - Mảng các video item đã kèm stats và channel info
 */
function analyzeYouTubeMetrics(videos = []) {
  if (!Array.isArray(videos) || videos.length === 0) {
    return {
      videoCount30d: 0,
      avgViews: 0,
      vph: 0,
      smallChannelBreakoutRatio: 0,
      outlierRatio: 1.0,
      hasRecentVideos: false,
      topVideos: []
    };
  }

  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let recentCount = 0;
  let totalViews = 0;
  let totalVph = 0;
  let smallChannelWins = 0;
  let outlierMultipliers = [];

  const analyzedVideos = videos.map(v => {
    const pubDate = new Date(v.publishedAt || v.snippet?.publishedAt || now);
    const ageHours = Math.max(1, (now - pubDate.getTime()) / (1000 * 60 * 60));
    const isWithin30d = (now - pubDate.getTime()) <= thirtyDaysMs;
    if (isWithin30d) recentCount++;

    const views = parseInt(v.viewCount || v.statistics?.viewCount, 10) || 0;
    const subs = parseInt(v.subscriberCount || v.channelSubscriberCount, 10) || 0;
    const vph = Math.round(views / ageHours);

    totalViews += views;
    totalVph += vph;

    // Kênh nhỏ: dưới 30,000 sub hoặc dưới 50,000 sub mà đạt view cao
    const isSmallChannel = subs > 0 && subs <= 50000;
    const outlierMultiplier = subs > 0 ? (views / subs) : 1;

    if (isSmallChannel && views >= 10000) {
      smallChannelWins++;
    }
    if (subs > 0) {
      outlierMultipliers.push(outlierMultiplier);
    }

    return {
      id: v.id?.videoId || v.id || '',
      title: v.snippet?.title || v.title || 'Video',
      channelTitle: v.snippet?.channelTitle || v.channelTitle || 'Channel',
      channelId: v.snippet?.channelId || v.channelId || '',
      publishedAt: pubDate.toISOString(),
      views,
      subs,
      vph,
      outlierMultiplier: Number(outlierMultiplier.toFixed(1)),
      isSmallChannel,
      thumbnail: v.snippet?.thumbnails?.medium?.url || v.thumbnail || ''
    };
  });

  const totalValid = analyzedVideos.length;
  const avgViews = Math.round(totalViews / totalValid);
  const avgVph = Math.round(totalVph / totalValid);
  const smallChannelBreakoutRatio = Math.round((smallChannelWins / totalValid) * 100);
  
  const avgOutlier = outlierMultipliers.length > 0 
    ? Number((outlierMultipliers.reduce((a, b) => a + b, 0) / outlierMultipliers.length).toFixed(1))
    : 1.0;

  return {
    videoCount30d: recentCount,
    avgViews,
    vph: avgVph,
    smallChannelBreakoutRatio,
    outlierRatio: avgOutlier,
    hasRecentVideos: recentCount > 0,
    topVideos: analyzedVideos.slice(0, 5)
  };
}

/**
 * Tạo dữ liệu mô phỏng nhanh khi test hoặc khi không có YouTube Key
 */
function createMockYouTubeValidation(keyword, niche = {}) {
  const hash = String(keyword).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const smallRatio = 20 + (hash % 65); // 20% - 85%
  const avgViews = 15000 + (hash % 450) * 1000;
  const vph = 50 + (hash % 350);
  const videoCount30d = 8 + (hash % 40);

  return {
    keyword,
    videoCount30d,
    avgViews,
    vph,
    smallChannelBreakoutRatio: smallRatio,
    outlierRatio: Number((1.5 + (hash % 50) / 10).toFixed(1)),
    hasRecentVideos: true,
    topVideos: [
      {
        id: `mock_${hash}_1`,
        title: `Cách kiếm tiền từ ${keyword} cho người mới bắt đầu (2026)`,
        channelTitle: `Creator ${hash % 99}`,
        views: Math.round(avgViews * 1.4),
        subs: 12500,
        vph: Math.round(vph * 1.3),
        outlierMultiplier: 2.8,
        isSmallChannel: true,
        thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'
      },
      {
        id: `mock_${hash}_2`,
        title: `Bí quyết tối ưu ${keyword} - Case Study thực chiến`,
        channelTitle: `Studio ${hash % 50}`,
        views: Math.round(avgViews * 0.9),
        subs: 28000,
        vph,
        outlierMultiplier: 1.6,
        isSmallChannel: true,
        thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80'
      }
    ]
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEFAULT_QUOTA_CAP,
    UNITS_PER_SEARCH,
    UNITS_PER_VIDEO_BATCH,
    UNITS_PER_CHANNEL_BATCH,
    estimateQuotaBudget,
    analyzeYouTubeMetrics,
    createMockYouTubeValidation
  };
}

if (typeof window !== 'undefined') {
  window.TrendV2Validator = {
    DEFAULT_QUOTA_CAP,
    estimateQuotaBudget,
    analyzeYouTubeMetrics,
    createMockYouTubeValidation
  };
}
