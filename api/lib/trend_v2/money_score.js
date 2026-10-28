// YOUTREND CÔNG CỤ V2: MONEY SCORE ENGINE (0 - 100)
// Chấm điểm tiềm năng kiếm tiền đa chiều dựa trên 6 trụ cột (Demand, Opportunity, Monetization, Sustainability, Feasibility, Policy)

const CPM_TIER_SCORES = {
  ultra: { minRpm: 35, score: 95, label: '$35 - $60+ (Tài chính, B2B, Tech)' },
  high: { minRpm: 25, score: 85, label: '$25 - $45 (Case study, Kỳ án US, Kể chuyện)' },
  mid: { minRpm: 15, score: 70, label: '$15 - $30 (Đời sống, Năng suất, Học tập)' },
  low: { minRpm: 5, score: 50, label: '$5 - $15 (Giải trí, Gaming, Vlog)' }
};

const INTENT_BONUS = {
  transactional: 15, // Mua hàng, định giá, đăng ký
  commercial: 10,   // So sánh, đánh giá, review top
  informational: 0  // Thông tin thuần túy
};

const DEFAULT_WEIGHTS = {
  demand: 0.25,        // Nhu cầu & Tốc độ tăng trưởng
  opportunity: 0.25,   // Cơ hội cho kênh nhỏ (Sub thấp view cao)
  monetization: 0.20,  // Khả năng kiếm tiền & RPM
  sustainability: 0.12,// Tính bền vững (Evergreen vs Spike)
  feasibility: 0.10,   // Tính khả thi (Faceless/AI friendly)
  policy: 0.08         // Mức độ an toàn chính sách YouTube
};

/**
 * Phân loại nhóm CPM dựa trên chuỗi RPM hoặc tên ngách
 */
function resolveCpmTier(cpmGroupStr) {
  if (!cpmGroupStr) return CPM_TIER_SCORES.mid;
  const str = String(cpmGroupStr).toLowerCase();
  const numMatches = str.match(/\d+/g);
  const maxVal = numMatches ? Math.max(...numMatches.map(Number)) : 20;

  if (maxVal >= 45 || str.includes('tài chính') || str.includes('finance') || str.includes('b2b') || str.includes('saas')) {
    return CPM_TIER_SCORES.ultra;
  }
  if (maxVal >= 25 || str.includes('kinh doanh') || str.includes('case study') || str.includes('ai') || str.includes('us')) {
    return CPM_TIER_SCORES.high;
  }
  if (maxVal >= 15 || str.includes('mẹo vặt') || str.includes('productivity') || str.includes('sách')) {
    return CPM_TIER_SCORES.mid;
  }
  return CPM_TIER_SCORES.low;
}

/**
 * Tính điểm Trụ cột 1: Demand (Nhu cầu tìm kiếm / xem)
 */
function calculateDemandScore(trendsData, ytData) {
  // Trường hợp 1: Có dữ liệu Google Trends đầy đủ
  if (trendsData && typeof trendsData.avg === 'number' && trendsData.avg > 0) {
    const avgScore = Math.min(100, Math.max(0, trendsData.avg));
    const momentum = trendsData.momentum || 0;
    // Momentum bonus: +50% -> +15đ, -30% -> -15đ
    const momentumDelta = Math.min(20, Math.max(-20, Math.round(momentum * 0.3)));
    return Math.min(100, Math.max(10, avgScore + momentumDelta));
  }

  // Trường hợp 2: Chế độ YouTubeOnly (Tính từ VPH và 30-day view velocity)
  if (ytData) {
    const vph = Number(ytData.vph || ytData.medianVph || 0);
    const totalViews = Number(ytData.totalViews || 0);
    // VPH: 50 vph = 50đ, 200 vph = 80đ, 500+ vph = 95đ
    const vphScore = Math.min(95, Math.max(20, Math.round(25 + Math.sqrt(vph) * 3.5)));
    const viewFactor = totalViews > 100000 ? 5 : totalViews > 20000 ? 0 : -5;
    return Math.min(100, Math.max(15, vphScore + viewFactor));
  }

  // Fallback mặc định
  return 50;
}

/**
 * Tính điểm Trụ cột 2: Opportunity (Kênh nhỏ làm được không?)
 */
function calculateOpportunityScore(ytData) {
  if (!ytData) return 65; // Giả định trung bình

  let smallRatio = 0.35;
  if (typeof ytData.smallChannelRatio === 'number') {
    smallRatio = ytData.smallChannelRatio > 1 ? ytData.smallChannelRatio / 100 : ytData.smallChannelRatio;
  } else if (typeof ytData.smallChannelBreakoutRatio === 'number') {
    smallRatio = ytData.smallChannelBreakoutRatio > 1 ? ytData.smallChannelBreakoutRatio / 100 : ytData.smallChannelBreakoutRatio;
  } else if (typeof ytData.smallChannelsCount === 'number') {
    smallRatio = Number(ytData.smallChannelsCount || 0) / Math.max(1, Number(ytData.totalAnalyzed || 15));
  }

  const maxOutlier = Number(ytData.outlierRatio || ytData.maxOutlier || ytData.medianOutlier || 1);
  const bigChannelDominance = Number(ytData.bigChannelCount || 0) / Math.max(1, Number(ytData.totalAnalyzed || 15));

  // Tỷ lệ kênh nhỏ: 0% -> 20, 20% -> 50, 40% -> 75, 60%+ -> 90+
  let ratioScore = Math.min(95, Math.round(20 + smallRatio * 90));
  if (smallRatio < 0.10) ratioScore = Math.min(ratioScore, 32);

  // Outlier bonus: Nếu có video kênh nhỏ đạt view/sub cao
  const outlierBonus = maxOutlier >= 5 ? 15 : maxOutlier >= 2.5 ? 10 : maxOutlier >= 1.5 ? 5 : 0;

  // Giant channel & saturation penalty
  const dominancePenalty = bigChannelDominance > 0.6 ? 20 : bigChannelDominance > 0.4 ? 10 : 0;
  const saturationPenalty = Number(ytData.videoCount30d || 0) > 100 ? 15 : Number(ytData.videoCount30d || 0) > 50 ? 5 : 0;

  return Math.min(100, Math.max(10, ratioScore + outlierBonus - dominancePenalty - saturationPenalty));
}

/**
 * Tính điểm Trụ cột 3: Monetization (RPM & Khả năng sinh lời)
 */
function calculateMonetizationScore(cpmGroup, searchIntent, affiliatePotential) {
  const tier = resolveCpmTier(cpmGroup);
  let score = tier.score;

  // Ý định tìm kiếm thương mại / mua hàng
  const intentBonus = INTENT_BONUS[searchIntent] || 0;
  score += intentBonus;

  // Tiềm năng affiliate / tài trợ
  if (affiliatePotential || String(cpmGroup).toLowerCase().includes('affiliate')) {
    score += 5;
  }

  return Math.min(100, Math.max(20, score));
}

/**
 * Tính điểm Trụ cột 4: Sustainability (Độ bền vững)
 */
function calculateSustainabilityScore(trendType, trendsData) {
  const type = String(trendType || '').toLowerCase();
  if (type.includes('evergreen') || type.includes('bền vững')) return 92;
  if (type.includes('tăng trưởng') || type.includes('rising')) return 85;
  if (type.includes('giảm') || type.includes('declining')) return 35;
  if (type.includes('spike') || type.includes('đột biến')) return 50;

  if (trendsData && trendsData.series && trendsData.series.length >= 10) {
    const vals = trendsData.series.map(s => Number(s.value) || 0);
    const zeroCount = vals.filter(v => v === 0).length;
    if (zeroCount > vals.length * 0.5) return 40; // Đứt gãy nhiều
    return 75;
  }

  return 70;
}

/**
 * Tính điểm Trụ cột 5: Feasibility (Tính khả thi làm nội dung faceless / AI)
 */
function calculateFeasibilityScore(contentType) {
  const type = String(contentType || 'faceless').toLowerCase();
  if (type.includes('faceless') || type.includes('không lộ mặt') || type.includes('ai')) return 92;
  if (type.includes('voiceover') || type.includes('podcast')) return 82;
  if (type.includes('studio') || type.includes('high-budget') || type.includes('đoàn làm phim')) return 50;
  return 80;
}

/**
 * Tính điểm Trụ cột 6: Policy Risk (An toàn chính sách & tắt kiếm tiền)
 */
function calculatePolicyScore(policyRisk, sensitiveFlag) {
  if (sensitiveFlag) return 20;
  const risk = String(policyRisk || 'none').toLowerCase();
  if (risk === 'high') return 25;
  if (risk === 'medium') return 55;
  if (risk === 'low') return 85;
  return 100; // An toàn tuyệt đối
}

/**
 * CÔNG THỨC CHẤM ĐIỂM MONEY SCORE TỔNG HỢP (0 - 100)
 */
function calculateMoneyScore(input, customWeights = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  const hasTrends = Boolean(input.trendsData && typeof input.trendsData.avg === 'number' && input.trendsData.avg > 0);
  const isYouTubeOnly = !hasTrends;

  // Tính điểm 6 trụ cột
  const demand = calculateDemandScore(input.trendsData, input.youtubeData);
  const opportunity = calculateOpportunityScore(input.youtubeData);
  const monetization = calculateMonetizationScore(input.cpmGroup || input.niche?.cpmGroup, input.searchIntent, input.affiliatePotential);
  const sustainability = calculateSustainabilityScore(input.trendType || input.trendsData?.type, input.trendsData);
  const feasibility = calculateFeasibilityScore(input.contentType || input.niche?.contentType);
  const policy = calculatePolicyScore(input.policyRisk || input.niche?.policyRisk, input.sensitiveFlag);

  // Trọng số nhân tổng
  let rawScore = (
    demand * weights.demand +
    opportunity * weights.opportunity +
    monetization * weights.monetization +
    sustainability * weights.sustainability +
    feasibility * weights.feasibility +
    policy * weights.policy
  );

  // Điều chỉnh mức độ hoàn thiện dữ liệu
  const dataCompleteness = isYouTubeOnly ? 0.68 : 1.0;
  const finalScore = Math.min(99, Math.max(15, Math.round(rawScore)));

  // Xếp loại hạng (Tier badge)
  let tierGrade = 'B';
  let tierBadge = 'TIỀM NĂNG';
  let color = '#3b82f6'; // blue
  if (finalScore >= 85) {
    tierGrade = 'S';
    tierBadge = 'MỎ VÀNG 💎';
    color = '#10b981'; // emerald
  } else if (finalScore >= 72) {
    tierGrade = 'A';
    tierBadge = 'BỨT PHÁ 🚀';
    color = '#06b6d4'; // cyan
  } else if (finalScore >= 55) {
    tierGrade = 'B';
    tierBadge = 'TIỀM NĂNG ⚡';
    color = '#f59e0b'; // amber
  } else {
    tierGrade = 'C';
    tierBadge = 'CÂN NHẮC ⚠️';
    color = '#ef4444'; // rose
  }

  return {
    moneyScore: finalScore,
    tierGrade,
    tierBadge,
    color,
    source: isYouTubeOnly ? 'YouTubeOnly' : 'GoogleTrendsAndYouTube',
    dataCompleteness,
    pillars: {
      demand: Math.round(demand),
      opportunity: Math.round(opportunity),
      monetization: Math.round(monetization),
      sustainability: Math.round(sustainability),
      feasibility: Math.round(feasibility),
      policy: Math.round(policy)
    },
    cpmTier: resolveCpmTier(input.cpmGroup || input.niche?.cpmGroup).label
  };
}

module.exports = {
  CPM_TIER_SCORES,
  DEFAULT_WEIGHTS,
  resolveCpmTier,
  calculateDemandScore,
  calculateOpportunityScore,
  calculateMonetizationScore,
  calculateSustainabilityScore,
  calculateFeasibilityScore,
  calculatePolicyScore,
  calculateMoneyScore
};
