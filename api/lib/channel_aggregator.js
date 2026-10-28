/**
 * Channel Aggregator & Verification Engine for SPY v3
 * Group by channelId, batch enrich (channels.list, UU uploads, videos.list),
 * outlier median calculation, log-likelihood ranking, multi-image cross match,
 * evidence coverage, and progressive relaxation cascade.
 */

const { parseIsoDuration } = require('./types_and_clues');

const TIER_VERY_HIGH = 'Rất nghi vấn';
const TIER_SUSPECT = 'Nghi vấn';
const TIER_WEAK = 'Yếu';

/**
 * 1. Filter raw videos and group by channelId
 */
function filterAndGroupVideos({
  videos = [],
  caseFiles = [],
  isSameChannelConfirmed = false
} = {}) {
  const channelGroups = new Map();

  videos.forEach(v => {
    if (!v || !v.id) return;
    const chId = v.snippet?.channelId || v.channelId;
    if (!chId) return;

    const views = Number(v.statistics?.viewCount || v.views || 0);
    const pubMs = v.snippet?.publishedAt ? new Date(v.snippet.publishedAt).getTime() : (v.publishedAt ? new Date(v.publishedAt).getTime() : 0);
    const title = v.snippet?.title || v.title || '';
    const durSec = v.contentDetails?.duration ? parseIsoDuration(v.contentDetails.duration) : (v.dur || 0);

    // Test against each case file
    const matchedCases = [];
    caseFiles.forEach(cf => {
      let timePass = true;
      let viewPass = true;

      // Hard filter: publishWindowUTC (+/- 1h buffer)
      if (cf.publishWindow?.utcWindow?.start && cf.publishWindow?.utcWindow?.end) {
        const winStart = new Date(cf.publishWindow.utcWindow.start).getTime() - 3600 * 1000;
        const winEnd = new Date(cf.publishWindow.utcWindow.end).getTime() + 3600 * 1000;
        if (pubMs > 0 && (pubMs < winStart || pubMs > winEnd)) {
          timePass = false;
        }
      }

      // Hard filter: viewCount >= 0.97 * min
      if (cf.viewsAtCapture?.min && views < Math.round(cf.viewsAtCapture.min * 0.97)) {
        viewPass = false;
      }

      if (timePass && viewPass) {
        matchedCases.push(cf.imageId);
      }
    });

    if (matchedCases.length === 0 && caseFiles.length > 0) {
      return; // Filtered out by hard criteria
    }

    if (!channelGroups.has(chId)) {
      channelGroups.set(chId, {
        channelId: chId,
        channelTitle: v.snippet?.channelTitle || v.channelTitle || '',
        matchedVideos: [],
        matchedCaseImageIds: new Set(),
        avatar: v.channelThumb || '',
        subs: v.channelSubs || 0
      });
    }

    const group = channelGroups.get(chId);
    matchedCases.forEach(id => group.matchedCaseImageIds.add(id));

    group.matchedVideos.push({
      id: v.id,
      title,
      views,
      publishedAt: v.snippet?.publishedAt || v.publishedAt || '',
      publishedMs: pubMs,
      durationSec: durSec,
      isShort: durSec > 0 && durSec <= 180,
      thumb: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url || v.thumb || '',
      matchedCaseImageIds: matchedCases
    });
  });

  return Array.from(channelGroups.values());
}

/**
 * 2. Enrich channels & compute baseline from Uploads playlist (UU...)
 */
async function enrichChannelsAndBaselines({
  channelGroups = [],
  apiCaller = null,
  queryCache = new Map(),
  quotaTracker = { spent: 0, max: 800 },
  maxChannelsToEnrich = 10
} = {}) {
  if (!apiCaller) return channelGroups;

  // Batch channels.list (up to 50 channels = 1 unit)
  const channelIds = channelGroups.map(g => g.channelId).filter(Boolean);
  if (channelIds.length > 0 && quotaTracker.spent + 1 <= quotaTracker.max) {
    const chunk = channelIds.slice(0, 50);
    const cacheKey = 'channels:' + chunk.sort().join(',');
    let cItems = [];
    if (queryCache.has(cacheKey)) {
      cItems = queryCache.get(cacheKey);
    } else {
      try {
        const cResp = await apiCaller('channels', {
          part: 'snippet,statistics',
          id: chunk.join(',')
        });
        quotaTracker.spent += 1;
        cItems = cResp?.items || [];
        queryCache.set(cacheKey, cItems);
      } catch (err) {}
    }

    const cMap = new Map();
    cItems.forEach(c => cMap.set(c.id, c));

    channelGroups.forEach(g => {
      const c = cMap.get(g.channelId);
      if (c) {
        g.channelTitle = c.snippet?.title || g.channelTitle;
        g.subs = parseInt(c.statistics?.subscriberCount || 0, 10);
        g.avatar = c.snippet?.thumbnails?.default?.url || g.avatar;
        g.videoCount = parseInt(c.statistics?.videoCount || 0, 10);
        g.country = c.snippet?.country || 'N/A';
      }
    });
  }

  // Uploads baseline for top channels (1 unit playlistItems + 1 unit videos per channel)
  const topGroups = channelGroups.slice(0, maxChannelsToEnrich);
  for (const g of topGroups) {
    if (quotaTracker.spent + 2 > quotaTracker.max) break;
    if (!g.channelId.startsWith('UC')) continue;

    const uploadsPlaylistId = 'UU' + g.channelId.slice(2);
    const plCacheKey = 'uploads:' + uploadsPlaylistId;
    let plVideoIds = [];

    if (queryCache.has(plCacheKey)) {
      plVideoIds = queryCache.get(plCacheKey);
    } else {
      try {
        const plResp = await apiCaller('playlistItems', {
          part: 'contentDetails',
          playlistId: uploadsPlaylistId,
          maxResults: 20
        });
        quotaTracker.spent += 1;
        plVideoIds = (plResp?.items || []).map(it => it.contentDetails?.videoId).filter(Boolean);
        queryCache.set(plCacheKey, plVideoIds);
      } catch (plErr) {}
    }

    if (plVideoIds.length > 0) {
      const vCacheKey = 'uploads_v:' + plVideoIds.sort().join(',');
      let recentVideos = [];

      if (queryCache.has(vCacheKey)) {
        recentVideos = queryCache.get(vCacheKey);
      } else if (quotaTracker.spent + 1 <= quotaTracker.max) {
        try {
          const vResp = await apiCaller('videos', {
            part: 'statistics',
            id: plVideoIds.join(',')
          });
          quotaTracker.spent += 1;
          recentVideos = (vResp?.items || []).map(it => ({
            id: it.id,
            views: parseInt(it.statistics?.viewCount || 0, 10)
          }));
          queryCache.set(vCacheKey, recentVideos);
        } catch (vErr) {}
      }

      if (recentVideos.length > 0) {
        // Exclude the candidate videos from baseline calculation
        const candidateIds = new Set(g.matchedVideos.map(mv => mv.id));
        const baselineVideos = recentVideos.filter(rv => !candidateIds.has(rv.id));
        const viewCounts = baselineVideos.map(bv => bv.views).sort((a, b) => a - b);

        if (viewCounts.length > 0) {
          const mid = Math.floor(viewCounts.length / 2);
          const medianViews = viewCounts[mid];
          g.baseline = {
            medianViews,
            sampleSize: viewCounts.length,
            minViews: viewCounts[0],
            maxViews: viewCounts[viewCounts.length - 1]
          };
        }
      }
    }
  }

  return channelGroups;
}

/**
 * 3. Score and rank channels using Log-Likelihood & Checklist
 */
function scoreAndRankChannels({
  channelGroups = [],
  caseFiles = [],
  isSameChannelConfirmed = false
} = {}) {
  const primaryCase = caseFiles[0] || {};
  const primaryBaseline = primaryCase.baselineViews?.baseline || 0;
  const primaryAvgDur = primaryCase.avgViewDuration?.avgSec || 0;
  const primaryExpected = primaryCase.velocityAndExpected?.expectedViewsNow || [0, Infinity];
  const primaryTitleChars = primaryCase.languageHint?.chars || '';

  const ranked = channelGroups.map(group => {
    let logOdds = 0;
    const checklist = [];
    let passedCount = 0;
    let totalCriteria = 0;
    const matchedCountImage = group.matchedCaseImageIds ? group.matchedCaseImageIds.size : 1;

    // Pick best candidate video of channel
    const bestVideo = [...group.matchedVideos].sort((a, b) => b.views - a.views)[0] || {};

    // 1. OUTLIER CRITERION
    totalCriteria++;
    if (group.baseline?.medianViews && primaryBaseline > 0) {
      const med = group.baseline.medianViews;
      const bMin = primaryBaseline / 2.0;
      const bMax = primaryBaseline * 6.0;
      const isWithinBaseline = (med >= bMin && med <= bMax);
      const outlierRatio = bestVideo.views / Math.max(1, med);
      const isOutlier = (outlierRatio >= 2.0);

      if (isWithinBaseline && isOutlier) {
        passedCount++;
        logOdds += 2.5;
        checklist.push({
          criterion: 'Outlier & Baseline Kênh',
          pass: true,
          details: `Median view kênh ${med.toLocaleString()} nằm trong [${Math.round(bMin).toLocaleString()} - ${Math.round(bMax).toLocaleString()}]. Video vượt trội x${outlierRatio.toFixed(1)} lần.`
        });
      } else if (isOutlier) {
        passedCount++;
        logOdds += 1.2;
        checklist.push({
          criterion: 'Outlier Kênh',
          pass: true,
          details: `Video đột biến x${outlierRatio.toFixed(1)} so với median kênh (${med.toLocaleString()}).`
        });
      } else {
        logOdds -= 1.0;
        checklist.push({
          criterion: 'Outlier & Baseline',
          pass: false,
          details: `Median kênh (${med.toLocaleString()}) lệch mốc baseline ảnh (${primaryBaseline.toLocaleString()}) hoặc không có độ vọt nổi bật.`
        });
      }
    } else {
      checklist.push({
        criterion: 'Baseline Kênh',
        pass: true,
        details: 'Chưa có mẫu Uploads (bỏ qua không phạt điểm).'
      });
    }

    // 2. VIDEO DURATION & SHORTS PENALTY
    totalCriteria++;
    const vDur = bestVideo.durationSec || 0;
    if (primaryAvgDur > 0) {
      const minReqDur = Math.round(primaryAvgDur * 0.9);
      const isShortsPenalized = (primaryAvgDur > 185 && bestVideo.isShort);

      if (isShortsPenalized) {
        logOdds -= 2.0;
        checklist.push({
          criterion: 'Độ dài video',
          pass: false,
          details: `Phạt nặng: Video là Shorts (${vDur}s), trong khi giờ xem TB ảnh là ${primaryAvgDur}s (> 185s).`
        });
      } else if (vDur >= minReqDur) {
        passedCount++;
        logOdds += 2.0;
        checklist.push({
          criterion: 'Độ dài video',
          pass: true,
          details: `Thời lượng ${Math.floor(vDur / 60)}:${String(vDur % 60).padStart(2, '0')} đạt mốc tối thiểu >= 0.9x giờ xem TB (${minReqDur}s).`
        });
      } else {
        logOdds -= 0.5;
        checklist.push({
          criterion: 'Độ dài video',
          pass: false,
          details: `Thời lượng ${vDur}s ngắn hơn ngưỡng tối thiểu ${minReqDur}s.`
        });
      }
    } else {
      checklist.push({
        criterion: 'Độ dài video',
        pass: true,
        details: `Thời lượng ${Math.floor(vDur / 60)}:${String(vDur % 60).padStart(2, '0')}.`
      });
    }

    // 3. CURRENT VIEWS VS EXPECTED VIEWS
    totalCriteria++;
    const [minExp, maxExp] = primaryExpected;
    if (minExp > 0) {
      if (bestVideo.views >= minExp && bestVideo.views <= maxExp) {
        passedCount++;
        logOdds += 2.2;
        checklist.push({
          criterion: 'Lượt xem hiện tại',
          pass: true,
          details: `Lượt xem ${bestVideo.views.toLocaleString()} nằm trọn trong vùng dự đoán [${minExp.toLocaleString()} - ${maxExp.toLocaleString()}].`
        });
      } else if (bestVideo.views >= minExp * 0.85 && bestVideo.views <= maxExp * 1.5) {
        passedCount++;
        logOdds += 1.0;
        checklist.push({
          criterion: 'Lượt xem mở rộng',
          pass: true,
          details: `Lượt xem ${bestVideo.views.toLocaleString()} thuộc vùng mở rộng x1.5.`
        });
      } else {
        logOdds -= 2.5;
        checklist.push({
          criterion: 'Lượt xem hiện tại',
          pass: false,
          details: `Lượt xem ${bestVideo.views.toLocaleString()} nằm ngoài vùng dự kiến [${minExp.toLocaleString()} - ${maxExp.toLocaleString()}].`
        });
      }
    }

    // 4. EXPOSED TITLE CHARACTERS
    if (primaryTitleChars && primaryTitleChars.length >= 2) {
      totalCriteria++;
      if (bestVideo.title.includes(primaryTitleChars)) {
        passedCount++;
        logOdds += 2.5;
        checklist.push({
          criterion: 'Ký tự tiêu đề lộ diện',
          pass: true,
          details: `Tiêu đề chứa chính xác cụm ký tự lộ "${primaryTitleChars}".`
        });
      } else {
        checklist.push({
          criterion: 'Ký tự tiêu đề lộ diện',
          pass: false,
          details: `Tiêu đề không chứa cụm ký tự "${primaryTitleChars}" (chỉ dùng cộng điểm, không loại cứng).`
        });
      }
    }

    // 5. MULTI-IMAGE CROSS-MATCH BONUS
    if (isSameChannelConfirmed && matchedCountImage >= 2) {
      logOdds += 4.0;
      checklist.push({
        criterion: 'Khớp chéo nhiều ảnh',
        pass: true,
        details: `Kênh có video khớp đồng thời ở ${matchedCountImage} ảnh bằng chứng (Độ bao phủ chéo xuất sắc)!`
      });
    }

    // TIER CLASSIFICATION
    let tier = TIER_WEAK;
    if ((passedCount >= 4) || (isSameChannelConfirmed && matchedCountImage >= 2)) {
      tier = TIER_VERY_HIGH;
    } else if (passedCount >= 2) {
      tier = TIER_SUSPECT;
    }

    const coveragePercentage = totalCriteria > 0 ? Math.round((passedCount / totalCriteria) * 100) : 50;

    return {
      channelId: group.channelId,
      channelTitle: group.channelTitle,
      avatar: group.avatar,
      subs: group.subs,
      videoCount: group.videoCount || 0,
      country: group.country || 'N/A',
      tier,
      logOdds: Math.round(logOdds * 10) / 10,
      evidenceCoverage: {
        passed: passedCount,
        total: totalCriteria,
        percentage: coveragePercentage,
        text: `Độ phủ bằng chứng: ${passedCount}/${totalCriteria} (${coveragePercentage}%)`
      },
      matchedVideos: group.matchedVideos,
      bestVideo,
      baseline: group.baseline || null,
      matchedCountImage,
      checklist
    };
  });

  // Sort descending by logOdds
  ranked.sort((a, b) => b.logOdds - a.logOdds);
  return ranked;
}

/**
 * 4. Progressive Relaxation Cascade (When 0 results)
 */
function getRelaxationSteps({
  publishWindowUTC = null,
  viewsAtCaptureMin = 0,
  tzOffsetHours = 7
} = {}) {
  return [
    {
      step: 1,
      name: 'Thử múi giờ khác',
      description: 'Chuyển giả định từ UTC+7 sang múi giờ Nhật Bản UTC+9 hoặc Hoa Kỳ UTC-7',
      params: {
        tzOffsetHours: tzOffsetHours === 7 ? 9 : 7
      }
    },
    {
      step: 2,
      name: 'Giãn khung giờ x2',
      description: 'Mở rộng gấp đôi khoảng thời gian publishWindowUTC',
      params: {
        expandHoursMultiplier: 2.0
      }
    },
    {
      step: 3,
      name: 'Hạ ngưỡng view x0.85',
      description: 'Hạ ngưỡng view lọc cứng từ 0.97x xuống 0.85x',
      params: {
        viewThresholdMultiplier: 0.85
      }
    },
    {
      step: 4,
      name: 'Bỏ lọc ngôn ngữ & vùng',
      description: 'Quét toàn cầu không giới hạn relevanceLanguage hoặc regionCode',
      params: {
        languageHint: 'any',
        regionCode: 'ALL'
      }
    }
  ];
}

module.exports = {
  TIER_VERY_HIGH,
  TIER_SUSPECT,
  TIER_WEAK,
  filterAndGroupVideos,
  enrichChannelsAndBaselines,
  scoreAndRankChannels,
  getRelaxationSteps
};
