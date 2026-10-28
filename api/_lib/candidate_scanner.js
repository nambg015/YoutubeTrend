/**
 * Candidate Scanner for SPY v3
 * Index-first internal DB search, sliced time-window search,
 * saturation bisection, pagination ceiling, and 800-unit quota budgeting.
 */

const { getVNNumberBounds } = require('./vn_parser');

const DEFAULT_QUOTA_BUDGET = 800;
const MIN_SLICE_DURATION_MS = 3600 * 1000; // 1 hour floor for bisection
const MAX_PAGES_AT_FLOOR = 3; // Max 3 pages when saturated at 1h floor

/**
 * 1. Simple query hash helper for caching search calls
 */
function createQueryHash(params) {
  const keys = Object.keys(params).sort();
  return keys.map(k => `${k}=${params[k]}`).join('&');
}

/**
 * 2. Search site internal database (0 Quota cost)
 * Scans discovered niches, saved videos, auto-update radar, competitor videos, and spy db.
 */
function searchInternalDatabase({
  publishWindowUTC = null,
  viewsAtCaptureMin = 0,
  internalCollections = {}
} = {}) {
  const discovered = new Map();
  let totalScanned = 0;

  const startMs = publishWindowUTC?.start ? new Date(publishWindowUTC.start).getTime() - 3600 * 1000 : 0;
  const endMs = publishWindowUTC?.end ? new Date(publishWindowUTC.end).getTime() + 3600 * 1000 : Infinity;
  const minRequiredViews = Math.round(viewsAtCaptureMin * 0.97);

  const processVideo = (v, sourceModule) => {
    totalScanned++;
    if (!v || (!v.id && !v.videoId)) return;
    const vId = v.id || v.videoId;
    const views = Number(v.views || v.viewCount || 0);
    const pubMs = v.published ? new Date(v.published).getTime() : (v.publishedAt ? new Date(v.publishedAt).getTime() : 0);

    // Hard filter: viewCount >= 0.97 * min
    if (minRequiredViews > 0 && views < minRequiredViews) return;

    // Hard filter: publishedAt within window (if published date exists)
    if (pubMs > 0 && (pubMs < startMs || pubMs > endMs)) return;

    if (!discovered.has(vId)) {
      discovered.set(vId, {
        id: vId,
        title: v.title || '',
        channelTitle: v.channel || v.channelTitle || '',
        channelId: v.channelId || null,
        channelSubs: v.subs || v.channelSubs || 0,
        views: views,
        dur: v.dur || 0,
        thumb: v.thumb || v.thumbnails?.high?.url || '',
        publishedAt: v.published || v.publishedAt || '',
        source: 'internal_db',
        sourceModule: sourceModule,
        snapshotAt: new Date().toISOString()
      });
    }
  };

  // 1. Saved cashcow videos
  if (Array.isArray(internalCollections.savedVideos)) {
    internalCollections.savedVideos.forEach(v => processVideo(v, 'saved_videos'));
  }

  // 2. Discovered niches
  if (Array.isArray(internalCollections.discoveredNiches)) {
    internalCollections.discoveredNiches.forEach(n => {
      if (Array.isArray(n.videos)) {
        n.videos.forEach(v => processVideo(v, 'top_ngach'));
      }
    });
  }

  // 3. Auto-update pending trends
  if (Array.isArray(internalCollections.pendingTrends)) {
    internalCollections.pendingTrends.forEach(v => processVideo(v, 'trend_radar'));
  }

  // 4. Competitor videos
  if (Array.isArray(internalCollections.competitorVideos)) {
    internalCollections.competitorVideos.forEach(v => processVideo(v, 'competitors'));
  }

  // 5. Previous SPY cached DB
  if (Array.isArray(internalCollections.spyInternalDb)) {
    internalCollections.spyInternalDb.forEach(v => processVideo(v, 'spy_cache'));
  }

  return {
    candidates: Array.from(discovered.values()),
    totalScanned,
    matchCount: discovered.size
  };
}

/**
 * 3. Estimate Quota required before scan
 */
function estimateScanQuota({
  publishWindowUTC = null,
  maxBudget = DEFAULT_QUOTA_BUDGET
} = {}) {
  if (!publishWindowUTC?.start || !publishWindowUTC?.end) {
    return {
      estimatedQuota: 202,
      estimatedSlices: 2,
      maxBudget
    };
  }

  const s = new Date(publishWindowUTC.start).getTime();
  const e = new Date(publishWindowUTC.end).getTime();
  const durationHours = Math.max(1, (e - s) / 3600000);

  // Default slice size 6 hours
  const initialSlices = Math.max(1, Math.ceil(durationHours / 6));
  // Average 1-2 bisections
  const estimatedCalls = Math.min(Math.floor(maxBudget / 101), Math.ceil(initialSlices * 1.5));
  const estimatedQuota = estimatedCalls * 101; // 100 search + 1 video enrich

  return {
    durationHours: Math.round(durationHours * 10) / 10,
    initialSlices,
    estimatedQuota: Math.min(maxBudget, estimatedQuota),
    maxBudget
  };
}

/**
 * 4. Generate initial time slices from publishWindowUTC
 */
function createInitialSlices(startMs, endMs) {
  const totalDurationMs = Math.max(MIN_SLICE_DURATION_MS, endMs - startMs);
  let sliceDurationMs;

  if (totalDurationMs <= 6 * 3600 * 1000) {
    sliceDurationMs = Math.max(MIN_SLICE_DURATION_MS, 2 * 3600 * 1000); // 2h slices
  } else if (totalDurationMs <= 24 * 3600 * 1000) {
    sliceDurationMs = 6 * 3600 * 1000; // 6h slices
  } else {
    sliceDurationMs = 12 * 3600 * 1000; // 12h slices
  }

  const slices = [];
  let cur = startMs;
  while (cur < endMs) {
    const next = Math.min(endMs, cur + sliceDurationMs);
    slices.push({
      startMs: cur,
      endMs: next,
      page: 1
    });
    cur = next;
  }
  return slices;
}

/**
 * 5. Run Candidate Scan with Saturation Bisection
 * Supports mock API for unit testing.
 */
async function runCandidateScan({
  publishWindowUTC = null,
  viewsAtCaptureMin = 0,
  languageHint = 'any',
  regionCode = null,
  maxBudget = DEFAULT_QUOTA_BUDGET,
  apiCaller = null, // async (path, params) => response
  queryCache = new Map(),
  onProgress = null, // ({ step, quotaUsed, log }) => void
  shouldCancel = () => false
} = {}) {
  if (!apiCaller) throw new Error('apiCaller function is required');

  const logs = [];
  let quotaSpent = 0;
  const discoveredVideoIds = new Set();
  const enrichedVideosMap = new Map();

  const addLog = (entry) => {
    logs.push(entry);
    if (onProgress) {
      onProgress({
        step: entry.message,
        quotaUsed: quotaSpent,
        log: entry
      });
    }
  };

  const startMs = publishWindowUTC?.start ? new Date(publishWindowUTC.start).getTime() : Date.now() - 864e5;
  const endMs = publishWindowUTC?.end ? new Date(publishWindowUTC.end).getTime() : Date.now();

  const sliceQueue = createInitialSlices(startMs, endMs);
  addLog({
    type: 'INIT',
    message: `Khởi tạo quét ${sliceQueue.length} khung thời gian (Trần ngân sách: ${maxBudget} units)...`,
    quotaSpent
  });

  while (sliceQueue.length > 0) {
    if (shouldCancel()) {
      addLog({ type: 'ABORT', message: 'Người dùng bấm dừng quét khẩn cấp.', quotaSpent });
      break;
    }

    if (quotaSpent + 101 > maxBudget) {
      addLog({
        type: 'BUDGET_REACHED',
        message: `Đã chạm trần ngân sách ${maxBudget} units. Dừng mở rộng khung quét.`,
        quotaSpent
      });
      break;
    }

    const currentSlice = sliceQueue.shift();
    const sliceStartIso = new Date(currentSlice.startMs).toISOString();
    const sliceEndIso = new Date(currentSlice.endMs).toISOString();
    const sliceDurationHours = (currentSlice.endMs - currentSlice.startMs) / 3600000;

    const searchParams = {
      part: 'snippet',
      type: 'video',
      maxResults: 50,
      order: 'viewCount',
      publishedAfter: sliceStartIso,
      publishedBefore: sliceEndIso,
      videoDuration: 'any'
    };

    if (languageHint && languageHint !== 'any') {
      searchParams.relevanceLanguage = languageHint;
    }
    if (regionCode && regionCode !== 'ALL') {
      searchParams.regionCode = regionCode;
    }
    if (currentSlice.pageToken) {
      searchParams.pageToken = currentSlice.pageToken;
    }

    const cacheKey = createQueryHash(searchParams);
    let searchResp = null;
    let fromCache = false;

    if (queryCache.has(cacheKey)) {
      searchResp = queryCache.get(cacheKey);
      fromCache = true;
    } else {
      try {
        searchResp = await apiCaller('search', searchParams);
        quotaSpent += 100;
        queryCache.set(cacheKey, searchResp);
      } catch (err) {
        addLog({
          type: 'ERROR',
          message: `Lỗi gọi search.list khung [${sliceStartIso.slice(11, 16)} - ${sliceEndIso.slice(11, 16)}]: ${err.message || String(err)}`,
          quotaSpent
        });
        continue;
      }
    }

    const items = searchResp?.items || [];
    const videoIdsInSlice = items.map(it => it.id?.videoId).filter(Boolean);

    // Enrich video statistics (1 unit per 50 videos)
    let enrichedItems = [];
    if (videoIdsInSlice.length > 0) {
      const vCacheKey = 'videos:' + videoIdsInSlice.sort().join(',');
      if (queryCache.has(vCacheKey)) {
        enrichedItems = queryCache.get(vCacheKey);
      } else {
        try {
          const vResp = await apiCaller('videos', {
            part: 'snippet,statistics,contentDetails',
            id: videoIdsInSlice.join(',')
          });
          quotaSpent += 1;
          enrichedItems = vResp?.items || [];
          queryCache.set(vCacheKey, enrichedItems);
        } catch (vErr) {
          enrichedItems = [];
        }
      }
    }

    enrichedItems.forEach(v => {
      discoveredVideoIds.add(v.id);
      enrichedVideosMap.set(v.id, v);
    });

    // Check Saturation:
    // If 50 items returned AND 50th item has viewCount >= viewsAtCaptureMin -> Saturated
    const lastItem = enrichedItems[enrichedItems.length - 1];
    const lastViewCount = lastItem ? parseInt(lastItem.statistics?.viewCount || 0, 10) : 0;
    const isSaturated = (items.length === 50 && lastViewCount >= viewsAtCaptureMin);

    if (isSaturated) {
      // Saturated! Can we divide (bisection)?
      const canBisect = (currentSlice.endMs - currentSlice.startMs) > MIN_SLICE_DURATION_MS;

      if (canBisect) {
        const midMs = Math.round((currentSlice.startMs + currentSlice.endMs) / 2);
        // Prepend child slices to queue
        sliceQueue.unshift(
          { startMs: midMs, endMs: currentSlice.endMs, page: 1 },
          { startMs: currentSlice.startMs, endMs: midMs, page: 1 }
        );
        addLog({
          type: 'SATURATED_BISECT',
          message: `Khung [${sliceStartIso.slice(11, 16)} - ${sliceEndIso.slice(11, 16)}Z] BÃO HÒA (video 50 có ${lastViewCount.toLocaleString()} view >= min). Chia đôi khung và quét lại.`,
          sliceStart: sliceStartIso,
          sliceEnd: sliceEndIso,
          videoCount: items.length,
          lastViewCount,
          quotaSpent
        });
      } else {
        // Floor reached (<= 1 hour): Paginate up to MAX_PAGES_AT_FLOOR
        if (searchResp?.nextPageToken && currentSlice.page < MAX_PAGES_AT_FLOOR) {
          sliceQueue.unshift({
            startMs: currentSlice.startMs,
            endMs: currentSlice.endMs,
            page: currentSlice.page + 1,
            pageToken: searchResp.nextPageToken
          });
          addLog({
            type: 'SATURATED_PAGINATE',
            message: `Khung 1h chạm sàn [${sliceStartIso.slice(11, 16)} - ${sliceEndIso.slice(11, 16)}Z] bão hòa. Phân trang trang ${currentSlice.page + 1}/${MAX_PAGES_AT_FLOOR}...`,
            quotaSpent
          });
        } else {
          addLog({
            type: 'SATURATED_FLOOR_COMPLETE',
            message: `Khung [${sliceStartIso.slice(11, 16)} - ${sliceEndIso.slice(11, 16)}Z] đã vét tối đa ${currentSlice.page} trang (sàn 1h).`,
            quotaSpent
          });
        }
      }
    } else {
      // Completed (not saturated)
      addLog({
        type: 'SLICE_COMPLETE',
        message: `Đã quét khung [${sliceStartIso.slice(11, 16)} - ${sliceEndIso.slice(11, 16)}Z]: ${items.length} video (video cuối ${lastViewCount.toLocaleString()} view < mốc) — Quét đủ theo thứ tự của API.`,
        sliceStart: sliceStartIso,
        sliceEnd: sliceEndIso,
        videoCount: items.length,
        lastViewCount,
        quotaSpent
      });
    }
  }

  return {
    videoIds: Array.from(discoveredVideoIds),
    enrichedVideos: Array.from(enrichedVideosMap.values()),
    quotaSpent,
    logs,
    isBudgetExhausted: quotaSpent >= maxBudget,
    scannedCount: discoveredVideoIds.size
  };
}

module.exports = {
  DEFAULT_QUOTA_BUDGET,
  MIN_SLICE_DURATION_MS,
  MAX_PAGES_AT_FLOOR,
  createQueryHash,
  searchInternalDatabase,
  estimateScanQuota,
  createInitialSlices,
  runCandidateScan
};
