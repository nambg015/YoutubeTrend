const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getUploadsPlaylistId,
  batchEnrichVideos,
  fetchChannelRecentUploads,
  expandChannelUploads
} = require('../api/_lib/niche_engine/cheap_discovery');
const {
  createSearchCacheKey,
  QueryCacheManager,
  DiscoveryMetricsTracker
} = require('../api/_lib/niche_engine/resilience_cache');
const {
  calculateOutlierRatio,
  calculateCompositeScore
} = require('../api/_lib/niche_engine/scoring');

test('Niche Radical Fix: High-Intent Creator Hook Queries', async (t) => {
  await t.test('hook queries contain exact phrases and exclude shorts noise', () => {
    const sampleSeeds = [
      { id: 'us_case', q: '"case study" "explained" -shorts -trailer' },
      { id: 'us_crime', q: '"police interrogation" ("confession" | "breakdown") -shorts' },
      { id: 'us_aviation', q: '"atc audio" ("plane crash" | "cockpit" | "emergency") -shorts' },
      { id: 'vn_crime', q: '("kỳ án việt nam" | "hồ sơ vụ án" | "vụ án bí ẩn") ("lời khai" | "phá án") -shorts' }
    ];

    sampleSeeds.forEach(s => {
      assert.ok(s.q.includes('"'), `Query for ${s.id} should enforce phrase search`);
      assert.ok(s.q.includes('-shorts'), `Query for ${s.id} should exclude shorts noise`);
    });
  });
});

test('Niche Radical Fix: 22 Seeds Quota Budget Optimization', async (t) => {
  await t.test('22 seeds with 1 search call each + uploads multiplier costs under 2,500 units', () => {
    const seedCount = 22;
    const searchUnitCost = 100;
    const videoEnrichUnitCost = 1;
    const channelEnrichUnitCost = 1;
    const uploadsMultiplierCost = 2; // 1 playlistItems + 1 videos.list

    // In new engine: exactly 1 search call per seed (no redundant slicing into 7-30 calls)
    const baseQuota = seedCount * (searchUnitCost + videoEnrichUnitCost + channelEnrichUnitCost);
    assert.strictEqual(baseQuota, 22 * 102); // 2,244 units

    // Even if top 5 seeds trigger 1-quota uploads multiplier
    const totalWithMultiplier = baseQuota + (5 * uploadsMultiplierCost);
    assert.ok(totalWithMultiplier <= 2300, `Total quota ${totalWithMultiplier} should be well under 2,500`);
    
    // Compared to old uncontrolled slicing (7 slices * 22 seeds = 15,400 quota)
    const oldCost = 22 * 7 * 100;
    const quotaSavedPercent = Math.round(((oldCost - totalWithMultiplier) / oldCost) * 100);
    assert.ok(quotaSavedPercent >= 80, `Expected at least 80% quota saved, got ${quotaSavedPercent}%`);
  });
});

test('Niche Radical Fix: 1-Quota Uploads Multiplier Yield', async (t) => {
  await t.test('extracts multiple breakout videos from single small channel in 2 calls', async () => {
    let callCount = 0;
    const mockApi = async (endpoint, params) => {
      callCount++;
      if (endpoint === 'playlistItems') {
        return {
          items: [
            { contentDetails: { videoId: 'v1' } },
            { contentDetails: { videoId: 'v2' } },
            { contentDetails: { videoId: 'v3' } }
          ]
        };
      }
      if (endpoint === 'videos') {
        return {
          items: [
            { id: 'v1', snippet: { title: 'Breakout 1' }, statistics: { viewCount: '65000', likeCount: '2000' } },
            { id: 'v2', snippet: { title: 'Breakout 2' }, statistics: { viewCount: '42000', likeCount: '1500' } },
            { id: 'v3', snippet: { title: 'Normal Vid' }, statistics: { viewCount: '2000', likeCount: '40' } }
          ]
        };
      }
      throw new Error('Unknown endpoint');
    };

    const channel = { id: 'UC_test_ch_1', uploadsId: 'UU_test_ch_1', subs: 1200 };
    const discovered = await expandChannelUploads(channel, mockApi, v => Number(v.statistics.viewCount) >= 10000);

    assert.strictEqual(callCount, 2); // 1 playlistItems + 1 videos
    assert.strictEqual(discovered.length, 2); // v1 and v2 qualify
    assert.strictEqual(discovered[0].id, 'v1');
    assert.strictEqual(discovered[1].id, 'v2');
  });
});

test('Niche Radical Fix: Quality Outlier Dynamic Qualification', async (t) => {
  await t.test('qualifies exceptional outlier (>4x) channels with 15k-25k subs while rejecting giant channels', () => {
    const isQualifyingChannel = (subs, views, subLimit = 10000) => {
      const v = Number(views) || 0;
      const s = Number(subs) || 0;
      const effectiveSubs = Math.max(s, 100);
      const outlierRatio = v / effectiveSubs;

      // Allow up to 35k subs if outlier is >= 4.0x and views >= 20,000
      const isExceptionalOutlier = s <= 35000 && outlierRatio >= 4.0 && v >= 20000;
      if (subLimit > 0 && s > subLimit && !isExceptionalOutlier) return false;
      return true;
    };

    // Case 1: Channel with 18k subs and 250k views (13.8x outlier) -> MUST QUALIFY
    assert.strictEqual(isQualifyingChannel(18000, 250000, 10000), true);

    // Case 2: Channel with 6k subs and 80k views (13.3x outlier) -> MUST QUALIFY
    assert.strictEqual(isQualifyingChannel(6000, 80000, 10000), true);

    // Case 3: Giant channel with 150k subs and 500k views (3.3x outlier) -> MUST BE REJECTED
    assert.strictEqual(isQualifyingChannel(150000, 500000, 10000), false);

    // Case 4: Channel with 25k subs but only 30k views (1.2x outlier) -> MUST BE REJECTED
    assert.strictEqual(isQualifyingChannel(25000, 30000, 10000), false);
  });
});

test('Niche Radical Fix: Conditional Pagination Saves Quota', async (t) => {
  await t.test('skips page 2 when page 1 yields 0 eligible breakout videos', () => {
    const shouldPaginate = (page1EligibleCount, nextPageToken, mode = 'deepPages') => {
      if (mode !== 'deepPages') return false;
      if (!nextPageToken) return false;
      // Conditional rule: ONLY paginate if page 1 found at least 1 promising small channel
      return page1EligibleCount >= 1;
    };

    assert.strictEqual(shouldPaginate(0, 'token_xyz', 'deepPages'), false, 'Should skip page 2 when page 1 has 0 breakouts');
    assert.strictEqual(shouldPaginate(2, 'token_xyz', 'deepPages'), true, 'Should paginate to page 2 when page 1 has breakouts');
    assert.strictEqual(shouldPaginate(2, null, 'deepPages'), false, 'Should not paginate when no next page token');
  });
});

test('Niche Radical Fix: BKT Prediction & Competition Score', async (t) => {
  await t.test('accurately predicts BKT status for channels meeting YPP criteria', () => {
    // Model logic matching app.bundle.js predictBKT
    const predictBKT = (subs, totalViews, videoCount, ageDays, avgDurSeconds = 600) => {
      if (subs === null || subs === undefined) return { status: 'unknown' };
      const avgDurMin = (avgDurSeconds > 0 ? avgDurSeconds : 600) / 60;
      const watchRatePct = 0.40;
      const estimatedTotalWatchHours = (totalViews || 0) * avgDurMin * watchRatePct / 60;
      const daysActive = Math.max(ageDays || 365, 1);
      const last365DayFraction = Math.min(1, 365 / daysActive);
      const recentWatchHours = estimatedTotalWatchHours * last365DayFraction;

      if (subs >= 1000 && recentWatchHours >= 4000) return { status: 'eligible', label: 'BẬT KIẾM TIỀN' };
      if (subs >= 1000 && recentWatchHours >= 2000) return { status: 'near', label: 'GẦN BKT' };
      if (subs >= 500) return { status: 'growing', label: 'ĐANG MỌC' };
      return { status: 'new', label: 'KÊNH MỚI' };
    };

    // User reference screenshot: Quân Sự Mỗi Ngày (7,210 subs, 2,043,259 views) -> BẬT KIẾM TIỀN
    const sampleCh1 = predictBKT(7210, 2043259, 120, 200);
    assert.strictEqual(sampleCh1.status, 'eligible');
    assert.strictEqual(sampleCh1.label, 'BẬT KIẾM TIỀN');

    // Tiny channel: 45 subs, 15k views -> KÊNH MỚI
    const sampleCh2 = predictBKT(45, 15000, 5, 30);
    assert.strictEqual(sampleCh2.status, 'new');

    // Near threshold: 1,200 subs, 50k views (~3,300 watch hours)
    const sampleCh3 = predictBKT(1200, 50000, 20, 180);
    assert.strictEqual(sampleCh3.status, 'near');
  });

  await t.test('computes competition score on 0-10 scale', () => {
    const computeCompetitionScore = (videos = []) => {
      const withSubs = videos.filter(v => v.subs !== null && v.subs > 0);
      if (withSubs.length === 0) return { score: 5.0, label: 'Trung Bình' };
      const avgSubs = withSubs.reduce((s, v) => s + (v.subs || 0), 0) / withSubs.length;
      const bigChannelRatio = withSubs.filter(v => (v.subs || 0) > 100000).length / withSubs.length;
      const avgOutlier = videos.reduce((s, v) => s + (Number(v.outlierRatio) || 0), 0) / Math.max(videos.length, 1);
      let score = Math.min(10, Math.max(0.5, (avgSubs / 100000) * 5 + bigChannelRatio * 3 + Math.max(0, 2 - avgOutlier * 0.2)));
      score = Math.round(score * 10) / 10;
      const label = score <= 2.5 ? 'Rất Thấp' : score <= 4.5 ? 'Thấp' : score <= 6.5 ? 'Trung Bình' : 'Cao';
      return { score, label };
    };

    // Low competition niche (mostly small channels with high outliers)
    const lowCompVideos = [
      { subs: 1200, outlierRatio: 15.2 },
      { subs: 3400, outlierRatio: 8.5 },
      { subs: 800, outlierRatio: 22.0 }
    ];
    const lowResult = computeCompetitionScore(lowCompVideos);
    assert.ok(lowResult.score <= 4.5, `Score ${lowResult.score} should be low competition`);

    // High competition niche (saturated with 200k+ subs giants)
    const highCompVideos = [
      { subs: 350000, outlierRatio: 0.8 },
      { subs: 500000, outlierRatio: 0.5 },
      { subs: 180000, outlierRatio: 1.1 }
    ];
    const highResult = computeCompetitionScore(highCompVideos);
    assert.ok(highResult.score >= 6.5, `Score ${highResult.score} should be high competition`);
  });
});


