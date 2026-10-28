/**
 * Test Suite: SPY v3 Channel Aggregator & Verification
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  TIER_VERY_HIGH,
  TIER_SUSPECT,
  TIER_WEAK,
  filterAndGroupVideos,
  enrichChannelsAndBaselines,
  scoreAndRankChannels,
  getRelaxationSteps
} = require('../api/_lib/channel_aggregator');

describe('SPY v3 Video Filtering & Channel Grouping', () => {
  const caseFiles = [
    {
      imageId: 'img_A',
      publishWindow: {
        utcWindow: {
          start: '2026-09-29T17:00:00.000Z',
          end: '2026-09-29T23:00:00.000Z'
        }
      },
      viewsAtCapture: { min: 2350000, value: 2400000, max: 2450000 }
    },
    {
      imageId: 'img_B',
      publishWindow: {
        utcWindow: {
          start: '2026-09-26T09:00:00.000Z',
          end: '2026-09-26T13:00:00.000Z'
        }
      },
      viewsAtCapture: { min: 950000, value: 1000000, max: 1050000 }
    }
  ];

  test('filters videos by hard criteria and groups by channelId', () => {
    const rawVideos = [
      {
        id: 'v1',
        snippet: { channelId: 'UC_Alpha', title: 'Video A1', publishedAt: '2026-09-29T20:00:00Z' },
        statistics: { viewCount: '2500000' },
        contentDetails: { duration: 'PT10M' }
      },
      {
        id: 'v2',
        snippet: { channelId: 'UC_Alpha', title: 'Video B1 大き', publishedAt: '2026-09-26T11:00:00Z' },
        statistics: { viewCount: '1100000' },
        contentDetails: { duration: 'PT12M' }
      },
      {
        id: 'v3',
        snippet: { channelId: 'UC_Beta', title: 'Video Low View', publishedAt: '2026-09-29T20:00:00Z' },
        statistics: { viewCount: '50000' }, // too low view count
        contentDetails: { duration: 'PT8M' }
      }
    ];

    const groups = filterAndGroupVideos({
      videos: rawVideos,
      caseFiles,
      isSameChannelConfirmed: true
    });

    assert.strictEqual(groups.length, 1); // Only UC_Alpha passed hard filters
    const alpha = groups[0];
    assert.strictEqual(alpha.channelId, 'UC_Alpha');
    assert.strictEqual(alpha.matchedVideos.length, 2);
    // UC_Alpha matched both img_A and img_B!
    assert.strictEqual(alpha.matchedCaseImageIds.size, 2);
  });
});

describe('SPY v3 Outlier Median & Scoring Engine', () => {
  test('ranks channel as "Rất nghi vấn" when multi-image matches or >= 4 criteria pass', () => {
    const channelGroups = [
      {
        channelId: 'UC_Alpha',
        channelTitle: 'Channel Alpha',
        subs: 50000,
        matchedCaseImageIds: new Set(['img_A', 'img_B']),
        matchedVideos: [
          {
            id: 'v1',
            title: 'Japanese Big Story 大き',
            views: 2600000,
            durationSec: 600,
            isShort: false
          }
        ],
        baseline: {
          medianViews: 75000, // Close to baseline 80k
          sampleSize: 15
        }
      },
      {
        channelId: 'UC_Gamma',
        channelTitle: 'Channel Gamma (Weak)',
        subs: 10000,
        matchedCaseImageIds: new Set(['img_A']),
        matchedVideos: [
          {
            id: 'v3',
            title: 'Irrelevant Short',
            views: 2400000,
            durationSec: 45, // Shorts!
            isShort: true
          }
        ],
        baseline: {
          medianViews: 500000 // Median is 500k, not an outlier (only 4.8x)
        }
      }
    ];

    const caseFiles = [
      {
        imageId: 'img_A',
        baselineViews: { baseline: 80000 },
        avgViewDuration: { avgSec: 190 }, // > 185s
        velocityAndExpected: { expectedViewsNow: [2350000, 2800000] },
        languageHint: { chars: '大き' }
      }
    ];

    const ranked = scoreAndRankChannels({
      channelGroups,
      caseFiles,
      isSameChannelConfirmed: true
    });

    assert.strictEqual(ranked[0].channelId, 'UC_Alpha');
    assert.strictEqual(ranked[0].tier, TIER_VERY_HIGH);
    assert.ok(ranked[0].evidenceCoverage.passed >= 4);
    assert.strictEqual(ranked[0].matchedCountImage, 2);

    // Channel Gamma should be penalized for Shorts and lack of title chars
    const gamma = ranked.find(r => r.channelId === 'UC_Gamma');
    assert.ok(gamma.tier !== TIER_VERY_HIGH);
    assert.ok(gamma.logOdds < ranked[0].logOdds);
  });

  test('getRelaxationSteps provides the 4-step progressive cascade', () => {
    const steps = getRelaxationSteps({ tzOffsetHours: 7 });
    assert.strictEqual(steps.length, 4);
    assert.strictEqual(steps[0].params.tzOffsetHours, 9);
    assert.strictEqual(steps[1].params.expandHoursMultiplier, 2.0);
    assert.strictEqual(steps[2].params.viewThresholdMultiplier, 0.85);
    assert.strictEqual(steps[3].params.languageHint, 'any');
  });
});
