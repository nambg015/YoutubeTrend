const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateOutlierRatio,
  calculateCompositeScore,
  isVideoQualified,
  isChannelQualified,
  DEFAULT_CONFIG,
  TIMEFRAME_CONFIG
} = require('../api/_lib/niche_engine/scoring');

test('Niche Engine Scoring: Outlier Ratio & Clamping', async (t) => {
  await t.test('calculates normal outlier ratio with subs >= 100', () => {
    const res = calculateOutlierRatio(10000, 500);
    assert.strictEqual(res.ratio, 20.0);
    assert.strictEqual(res.isHidden, false);
    assert.strictEqual(res.formatted, '20x');
    assert.strictEqual(res.effectiveSubs, 500);
  });

  await t.test('clamps subs below 100 to floor 100 to avoid extreme artificial ratios', () => {
    // 5000 views on 10 subs: without floor it would be 500x; with floor 100 it is 50x
    const res = calculateOutlierRatio(5000, 10);
    assert.strictEqual(res.ratio, 50.0);
    assert.strictEqual(res.effectiveSubs, 100);

    const zeroSubs = calculateOutlierRatio(5000, 0);
    assert.strictEqual(zeroSubs.ratio, 50.0);
    assert.strictEqual(zeroSubs.effectiveSubs, 100);
  });

  await t.test('detects hidden subscriber count properly', () => {
    const nullSubs = calculateOutlierRatio(50000, null);
    assert.strictEqual(nullSubs.isHidden, true);
    assert.strictEqual(nullSubs.ratio, null);
    assert.strictEqual(nullSubs.formatted, 'Sub Ẩn');

    const undefinedSubs = calculateOutlierRatio(50000, undefined);
    assert.strictEqual(undefinedSubs.isHidden, true);
    assert.strictEqual(undefinedSubs.ratio, null);
  });
});

test('Niche Engine Scoring: Composite Score Engine', async (t) => {
  await t.test('computes Grade S for high outlier, high vph on young channel', () => {
    // 25k views, 500 subs (50x outlier), 800 vph, channel age 20 days
    const res = calculateCompositeScore({
      views: 25000,
      subs: 500,
      vph: 800,
      channelAgeDays: 20
    });

    assert.strictEqual(res.isHidden, false);
    assert.strictEqual(res.tier, 'S');
    assert.ok(res.score >= 80, `Expected score >= 80, got ${res.score}`);
    assert.strictEqual(res.breakdown.ageScore, 15);
    assert.ok(res.breakdown.outlierScore >= 50);
  });

  await t.test('marks hidden sub channels separately without false top ranking', () => {
    const res = calculateCompositeScore({
      views: 500000,
      subs: null,
      vph: 5000,
      channelAgeDays: 10,
      isHiddenSub: true
    });

    assert.strictEqual(res.isHidden, true);
    assert.strictEqual(res.score, null);
    assert.strictEqual(res.tier, 'HIDDEN');
    assert.strictEqual(res.tierLabel, 'Sub Ẩn');
  });

  await t.test('computes appropriate tiers for moderate and steady channels', () => {
    // 6k views, 2000 subs (3x outlier), 50 vph, channel age 120 days
    const res = calculateCompositeScore({
      views: 6000,
      subs: 2000,
      vph: 50,
      channelAgeDays: 120
    });

    assert.strictEqual(res.isHidden, false);
    assert.ok(['A', 'B'].includes(res.tier));
    assert.ok(res.score >= 35 && res.score <= 75, `Expected score between 35 and 75, got ${res.score}`);
  });
});

test('Niche Engine Scoring: Qualification Filters', async (t) => {
  const now = 1700000000000;
  const h = 3600000;

  await t.test('isVideoQualified validates within 7d default timeframe', () => {
    const freshVid = {
      views: 12000,
      subs: 1500,
      ts: now - 48 * h, // 2 days old
      format: 'long'
    };
    assert.strictEqual(isVideoQualified(freshVid, { timeframe: '7d', now }), true);

    const oldVid = {
      views: 12000,
      subs: 1500,
      ts: now - 200 * h, // > 7 days (168h)
      format: 'long'
    };
    assert.strictEqual(isVideoQualified(oldVid, { timeframe: '7d', now }), false);
  });

  await t.test('isVideoQualified enforces sub <= 5k and views >= 5k defaults', () => {
    const valid = {
      views: 5500,
      subs: 4800,
      ts: now - 24 * h,
      format: 'long'
    };
    assert.strictEqual(isVideoQualified(valid, { now }), true);

    const tooManySubs = {
      views: 20000,
      subs: 8000, // > 5000
      ts: now - 24 * h,
      format: 'long'
    };
    assert.strictEqual(isVideoQualified(tooManySubs, { now }), false);

    const tooFewViews = {
      views: 3200, // < 5000
      subs: 1000,
      ts: now - 24 * h,
      format: 'long'
    };
    assert.strictEqual(isVideoQualified(tooFewViews, { now }), false);
  });

  await t.test('isVideoQualified filters by minOutlier ratio (10x, 30x, 100x)', () => {
    const vid25x = {
      views: 25000,
      subs: 1000,
      outlierRatio: 25.0,
      ts: now - 24 * h,
      format: 'long'
    };

    assert.strictEqual(isVideoQualified(vid25x, { minOutlier: 10, now }), true);
    assert.strictEqual(isVideoQualified(vid25x, { minOutlier: 30, now }), false);
  });

  await t.test('isChannelQualified validates channel with long-form video breakout', () => {
    const ch = { id: 'ch_test_1', name: 'Creator A', subs: 2500 };
    const videos = [
      { id: 'v1', channelId: 'ch_test_1', views: 30000, subs: 2500, ts: now - 24 * h, format: 'short' }, // short-form doesn't qualify
      { id: 'v2', channelId: 'ch_test_1', views: 18000, subs: 2500, ts: now - 36 * h, format: 'long' }   // long-form qualifies!
    ];

    assert.strictEqual(isChannelQualified(ch, videos, { now }), true);

    // Channel with only shorts should be rejected
    const chShortsOnly = { id: 'ch_shorts', name: 'Shorts Only', subs: 1200 };
    const shortsVideos = [
      { id: 'v3', channelId: 'ch_shorts', views: 80000, subs: 1200, ts: now - 12 * h, format: 'short' }
    ];
    assert.strictEqual(isChannelQualified(chShortsOnly, shortsVideos, { now }), false);
  });
});
