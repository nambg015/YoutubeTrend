/**
 * Test Suite: SPY v3 Candidate Scanner & Saturation Bisection
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  searchInternalDatabase,
  estimateScanQuota,
  createInitialSlices,
  runCandidateScan
} = require('../api/_lib/candidate_scanner');

describe('SPY v3 Internal DB Search (0 Quota)', () => {
  test('searchInternalDatabase filters videos matching window and view threshold', () => {
    const internalCollections = {
      savedVideos: [
        { id: 'vid_1', title: 'Video 1', views: 2500000, published: '2026-09-30T04:00:00Z' },
        { id: 'vid_2', title: 'Video 2', views: 500000, published: '2026-09-30T04:00:00Z' } // too low views
      ],
      discoveredNiches: [
        {
          id: 'niche_1',
          videos: [
            { id: 'vid_3', title: 'Video 3', views: 2600000, published: '2026-09-30T02:00:00Z' },
            { id: 'vid_4', title: 'Video 4', views: 3000000, published: '2026-08-01T00:00:00Z' } // outside window
          ]
        }
      ]
    };

    const res = searchInternalDatabase({
      publishWindowUTC: {
        start: '2026-09-29T17:00:00Z',
        end: '2026-09-30T06:00:00Z'
      },
      viewsAtCaptureMin: 2350000,
      internalCollections
    });

    assert.strictEqual(res.matchCount, 2);
    const ids = res.candidates.map(c => c.id);
    assert.ok(ids.includes('vid_1'));
    assert.ok(ids.includes('vid_3'));
    assert.ok(!ids.includes('vid_2')); // filtered by view count
    assert.ok(!ids.includes('vid_4')); // filtered by publish window
  });
});

describe('SPY v3 Saturation Bisection & Quota Management', () => {
  test('estimateScanQuota calculates realistic quota within budget', () => {
    const est = estimateScanQuota({
      publishWindowUTC: {
        start: '2026-09-29T12:00:00Z',
        end: '2026-09-30T12:00:00Z'
      },
      maxBudget: 800
    });

    assert.strictEqual(est.durationHours, 24);
    assert.ok(est.estimatedQuota <= 800);
    assert.ok(est.initialSlices >= 4);
  });

  test('runCandidateScan detects saturation, divides slice in two (bisection), and caches queries', async () => {
    const apiCallHistory = [];

    // Mock API Caller
    const mockApiCaller = async (path, params) => {
      apiCallHistory.push({ path, params });

      if (path === 'search') {
        const sMs = new Date(params.publishedAfter).getTime();
        const eMs = new Date(params.publishedBefore).getTime();
        const durHours = (eMs - sMs) / 3600000;

        // If slice is large (>= 2 hours), simulate 50 results (saturated)
        if (durHours >= 2) {
          const items = Array.from({ length: 50 }, (_, i) => ({
            id: { videoId: `sat_vid_${durHours}_${i}` },
            snippet: { title: `Video ${i}`, publishedAt: params.publishedAfter }
          }));
          return { items };
        } else {
          // Smaller slice: only 15 results (complete, not saturated)
          const items = Array.from({ length: 15 }, (_, i) => ({
            id: { videoId: `comp_vid_${durHours}_${i}` },
            snippet: { title: `Video ${i}`, publishedAt: params.publishedAfter }
          }));
          return { items };
        }
      }

      if (path === 'videos') {
        const ids = params.id.split(',');
        const items = ids.map((id, idx) => ({
          id,
          statistics: {
            // For saturated mock, 50th item has 2.4M view (>= 2.35M min)
            viewCount: String(id.startsWith('sat_') && idx === 49 ? 2400000 : 1800000)
          },
          snippet: { title: `Title ${id}`, publishedAt: '2026-09-30T00:00:00Z' },
          contentDetails: { duration: 'PT15M30S' }
        }));
        return { items };
      }

      return {};
    };

    const cache = new Map();
    const result = await runCandidateScan({
      publishWindowUTC: {
        start: '2026-09-30T00:00:00Z',
        end: '2026-09-30T04:00:00Z'
      },
      viewsAtCaptureMin: 2350000,
      languageHint: 'ja',
      regionCode: 'JP',
      maxBudget: 800,
      apiCaller: mockApiCaller,
      queryCache: cache
    });

    // Check that at least one SATURATED_BISECT log was emitted
    const bisectLogs = result.logs.filter(l => l.type === 'SATURATED_BISECT');
    assert.ok(bisectLogs.length > 0, 'Expected at least one saturation bisection');

    // Check that SLICE_COMPLETE logs were emitted for smaller child slices
    const completeLogs = result.logs.filter(l => l.type === 'SLICE_COMPLETE');
    assert.ok(completeLogs.length > 0, 'Expected completed slices');
    assert.ok(completeLogs.some(l => l.message.includes('Quét đủ theo thứ tự của API')));

    // Check budget limit respected
    assert.ok(result.quotaSpent <= 800, `Quota spent ${result.quotaSpent} exceeded 800`);

    // Second run with queryCache: should spend 0 additional quota
    const secondCallCountBefore = apiCallHistory.length;
    const secondResult = await runCandidateScan({
      publishWindowUTC: {
        start: '2026-09-30T00:00:00Z',
        end: '2026-09-30T04:00:00Z'
      },
      viewsAtCaptureMin: 2350000,
      languageHint: 'ja',
      regionCode: 'JP',
      maxBudget: 800,
      apiCaller: mockApiCaller,
      queryCache: cache
    });


    assert.strictEqual(secondResult.quotaSpent, 0, 'Second scan should cost 0 quota from cache');
  });
});
