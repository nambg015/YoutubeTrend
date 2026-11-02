/**
 * Niche Discovery Engine - Scoring & Qualification Module
 * Implements Step 1:
 * - Outlier Ratio with subs clamped at floor 100: views / Math.max(subs, 100)
 * - Composite Score (0-100) combining Outlier (60%), Velocity (25%), Channel Age (15%)
 * - Hidden subscriber detection and separate marking
 * - Threshold qualification (default: sub <= 5k, view >= 5k, 7d timeframe)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineScoring = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const TIMEFRAME_CONFIG = {
    '12h': { label: '12 giờ qua', hours: 12 },
    '24h': { label: '24 giờ qua', hours: 24 },
    '3d': { label: '3 ngày qua', hours: 72 },
    '7d': { label: '7 ngày qua', hours: 168 },
    '14d': { label: '14 ngày qua', hours: 336 },
    '30d': { label: '30 ngày qua', hours: 720 }
  };

  const DEFAULT_CONFIG = {
    timeframe: '7d',
    subLimit: 5000,
    minViews: 5000,
    minOutlier: 0,
    floorSubs: 100
  };

  /**
   * Calculates outlier ratio with subs clamped at floor 100.
   * If subscriber count is hidden (null, undefined, or explicitly hidden),
   * returns isHidden: true and ratio: null.
   */
  function calculateOutlierRatio(views, subs, floorSubs = 100) {
    const v = Number(views) || 0;
    if (subs === null || subs === undefined || subs === '') {
      return {
        ratio: null,
        numericRatio: 0,
        isHidden: true,
        formatted: 'Sub Ẩn'
      };
    }
    const s = Number(subs);
    if (isNaN(s) || s < 0) {
      return {
        ratio: null,
        numericRatio: 0,
        isHidden: true,
        formatted: 'Sub Ẩn'
      };
    }

    const effectiveSubs = Math.max(s, floorSubs);
    const numericRatio = v / effectiveSubs;
    const ratio = Number(numericRatio.toFixed(1));

    return {
      ratio: ratio,
      numericRatio: numericRatio,
      isHidden: false,
      formatted: ratio + 'x',
      effectiveSubs: effectiveSubs
    };
  }

  /**
   * Calculates composite breakout score (0-100).
   * Weights:
   * - Outlier Ratio: 60%
   * - Velocity (VPH): 25%
   * - Channel Age bonus: 15%
   * Hidden subscriber channels are flagged with isHidden: true and excluded from top outlier rank.
   */
  function calculateCompositeScore(params) {
    const {
      views = 0,
      subs = null,
      vph = 0,
      channelAgeDays = 365,
      isHiddenSub = false
    } = params || {};

    const v = Number(views) || 0;
    const velocity = Number(vph) || 0;
    const ageDays = Number(channelAgeDays) || 365;

    // Check hidden subscriber
    const isHidden = isHiddenSub || subs === null || subs === undefined || subs === '';
    if (isHidden) {
      return {
        score: null,
        tier: 'HIDDEN',
        tierLabel: 'Sub Ẩn',
        isHidden: true,
        outlierRatio: null,
        breakdown: {
          outlierScore: 0,
          vphScore: 0,
          ageScore: 0
        }
      };
    }

    // 1. Outlier Score (0 - 60 pts)
    const { ratio: outlierRatio } = calculateOutlierRatio(v, subs, DEFAULT_CONFIG.floorSubs);
    let outlierScore = 0;
    if (outlierRatio <= 0.5) {
      outlierScore = Math.max(1, Math.round(outlierRatio * 10)); // 0 - 5
    } else if (outlierRatio < 1) {
      outlierScore = 5 + Math.round((outlierRatio - 0.5) / 0.5 * 5); // 5 - 10
    } else if (outlierRatio < 3) {
      outlierScore = 10 + Math.round((outlierRatio - 1) / 2 * 12); // 10 - 22
    } else if (outlierRatio < 10) {
      outlierScore = 22 + Math.round((outlierRatio - 3) / 7 * 15); // 22 - 37
    } else if (outlierRatio < 50) {
      outlierScore = 37 + Math.round((outlierRatio - 10) / 40 * 15); // 37 - 52
    } else {
      outlierScore = Math.min(60, 52 + Math.round(Math.min(8, Math.log10(outlierRatio / 50) * 8))); // 52 - 60
    }

    // 2. Velocity (VPH) Score (0 - 25 pts)
    let vphScore = 0;
    if (velocity <= 0) {
      vphScore = 0;
    } else if (velocity < 50) {
      vphScore = Math.round(velocity / 50 * 5); // 0 - 5
    } else if (velocity < 500) {
      vphScore = 5 + Math.round((velocity - 50) / 450 * 10); // 5 - 15
    } else if (velocity < 3000) {
      vphScore = 15 + Math.round((velocity - 500) / 2500 * 8); // 15 - 23
    } else {
      vphScore = 25; // 23 - 25
    }

    // 3. Channel Age Freshness Bonus (0 - 15 pts)
    let ageScore = 2;
    if (ageDays <= 30) {
      ageScore = 15;
    } else if (ageDays <= 90) {
      ageScore = 12;
    } else if (ageDays <= 180) {
      ageScore = 8;
    } else if (ageDays <= 365) {
      ageScore = 5;
    }

    const totalScore = Math.min(100, Math.max(1, outlierScore + vphScore + ageScore));

    let tier = 'C';
    let tierLabel = 'Tiềm năng';
    if (totalScore >= 75) {
      tier = 'S';
      tierLabel = 'Siêu Bứt Phá';
    } else if (totalScore >= 55) {
      tier = 'A';
      tierLabel = 'Bứt Phá Mạnh';
    } else if (totalScore >= 35) {
      tier = 'B';
      tierLabel = 'Tăng Trưởng Tốt';
    }

    return {
      score: totalScore,
      tier: tier,
      tierLabel: tierLabel,
      isHidden: false,
      outlierRatio: outlierRatio,
      breakdown: {
        outlierScore: outlierScore,
        vphScore: vphScore,
        ageScore: ageScore
      }
    };
  }

  /**
   * Evaluates if a video is qualified according to filters:
   * - published within timeframe cutoff
   * - channel subs <= subLimit (if subLimit > 0)
   * - video views >= minViews (if minViews > 0)
   * - outlier ratio >= minOutlier (if minOutlier > 0)
   * - matches format (if format !== 'all')
   */
  function isVideoQualified(video, options = {}) {
    if (!video) return false;
    const {
      timeframe = '7d',
      subLimit = 5000,
      minViews = 5000,
      minOutlier = 0,
      format = 'all',
      now = Date.now()
    } = options;

    const tfHours = (TIMEFRAME_CONFIG[timeframe] || TIMEFRAME_CONFIG['7d']).hours;
    const cutoffMs = now - tfHours * 36e5;
    const pubMs = video.ts || (video.published ? new Date(video.published).getTime() : 0);
    const ageHours = (now - pubMs) / 36e5;

    // Timeframe check
    if (pubMs < cutoffMs || ageHours > tfHours) return false;

    // Sub limit check (if subLimit > 0)
    if (subLimit > 0) {
      if (video.subs !== null && video.subs !== undefined && video.subs > subLimit) {
        return false;
      }
    }

    // Min views check (if minViews > 0)
    const views = Number(video.views) || 0;
    if (minViews > 0 && views < minViews) return false;

    // Min outlier check (if minOutlier > 0)
    if (minOutlier > 0) {
      if (video.subs === null || video.subs === undefined) return false; // hidden subs cannot verify outlier
      const outlier = Number(video.outlierRatio) || (views / Math.max(Number(video.subs) || 0, DEFAULT_CONFIG.floorSubs));
      if (outlier < minOutlier) return false;
    }

    // Format check
    if (format && format !== 'all') {
      const vFormat = video.format || (video.isLive ? 'live' : video.isShort ? 'short' : 'long');
      if (vFormat !== format) return false;
    }

    return true;
  }

  /**
   * Determines if a channel qualifies as a "Kênh ngon":
   * 1. subs <= subLimit (default 5000)
   * 2. has >= 1 long-form video in timeframe with high outlier and views >= minViews (default 5000)
   * 3. channel is actively uploading (has videos)
   */
  function isChannelQualified(channel, videos = [], options = {}) {
    if (!channel) return false;
    const {
      subLimit = 5000,
      minViews = 5000,
      minOutlier = 1.0,
      timeframe = '7d',
      now = Date.now()
    } = options;

    // 1. Sub limit
    const subs = channel.subs !== undefined ? channel.subs : channel.subCount;
    if (subs !== null && subs !== undefined && subLimit > 0 && subs > subLimit) {
      return false;
    }

    // 2. Must have at least 1 qualified long-form video
    const channelVideos = videos.filter(v => (v.channelId === channel.id || v.channel === channel.name));
    const qualifiedLongForm = channelVideos.find(v => {
      // Must be long-form
      const isLive = v.isLive || v.format === 'live';
      const isShort = v.isShort || v.format === 'short';
      if (isLive || isShort) return false;

      // Must meet views & timeframe
      return isVideoQualified(v, {
        timeframe,
        subLimit,
        minViews,
        minOutlier,
        format: 'long',
        now
      });
    });

    return !!qualifiedLongForm;
  }

  return {
    TIMEFRAME_CONFIG,
    DEFAULT_CONFIG,
    calculateOutlierRatio,
    calculateCompositeScore,
    isVideoQualified,
    isChannelQualified
  };
}));
