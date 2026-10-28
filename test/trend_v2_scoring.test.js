/**
 * Test Suite: Trend v2 Money Score Engine & YouTube Quota/Validation
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  calculateMoneyScore,
  resolveCpmTier,
  calculateDemandScore,
  calculateOpportunityScore,
  calculateMonetizationScore,
  calculateSustainabilityScore,
  calculateFeasibilityScore,
  calculatePolicyScore
} = require('../api/lib/trend_v2/money_score');

const {
  estimateQuotaBudget,
  analyzeYouTubeMetrics,
  createMockYouTubeValidation
} = require('../api/lib/trend_v2/yt_validator');

describe('Trend v2: Money Score Engine & 6 Pillars', () => {
  test('resolveCpmTier properly categorizes RPM strings', () => {
    assert.strictEqual(resolveCpmTier('$50 CPM B2B SaaS').score, 95);
    assert.strictEqual(resolveCpmTier('Kỳ án Mỹ $30').score, 85);
    assert.strictEqual(resolveCpmTier('Mẹo vặt gia đình $15').score, 70);
    assert.strictEqual(resolveCpmTier('Gaming giải trí $5').score, 50);
  });

  test('calculateDemandScore uses Trends data when available or falls back to YouTube velocity', () => {
    const withTrends = calculateDemandScore({ avg: 80, momentum: 40 });
    assert.ok(withTrends >= 85, 'Demand with high momentum should be high');

    const ytOnly = calculateDemandScore(null, { vph: 500, videoCount30d: 25 });
    assert.ok(ytOnly >= 75, 'High VPH in YouTubeOnly should yield solid demand score');
  });

  test('calculateOpportunityScore awards high scores for small channel breakout (>40%)', () => {
    const oppHigh = calculateOpportunityScore({
      smallChannelBreakoutRatio: 65,
      outlierRatio: 3.5,
      videoCount30d: 12
    });
    assert.ok(oppHigh >= 85, 'High breakout ratio must result in high opportunity score');

    const oppLow = calculateOpportunityScore({
      smallChannelBreakoutRatio: 5,
      outlierRatio: 0.8,
      videoCount30d: 150
    });
    assert.ok(oppLow <= 40, 'Low breakout and saturated market should yield low opportunity');
  });

  test('calculatePolicyScore reduces score on high risk or sensitive flag', () => {
    assert.strictEqual(calculatePolicyScore('high', false), 25);
    assert.strictEqual(calculatePolicyScore('none', true), 20); // sensitive flag dominates
    assert.strictEqual(calculatePolicyScore('none', false), 100);
  });

  test('calculateMoneyScore produces Grade S for exceptional niche & keyword', () => {
    const result = calculateMoneyScore({
      trendsData: { avg: 85, momentum: 45, type: 'steady' },
      youtubeData: {
        smallChannelBreakoutRatio: 70,
        outlierRatio: 4.0,
        videoCount30d: 15,
        vph: 450
      },
      cpmGroup: '$35 - $60 (Tài chính US)',
      searchIntent: 'commercial',
      affiliatePotential: true,
      contentType: 'faceless',
      policyRisk: 'none',
      sensitiveFlag: false
    });

    assert.ok(result.moneyScore >= 85, `Score should be >= 85, got ${result.moneyScore}`);
    assert.strictEqual(result.tierGrade, 'S');
    assert.strictEqual(result.source, 'GoogleTrendsAndYouTube');
    assert.strictEqual(result.dataCompleteness, 1.0);
  });

  test('calculateMoneyScore supports YouTubeOnly mode gracefully', () => {
    const result = calculateMoneyScore({
      trendsData: null,
      youtubeData: {
        smallChannelBreakoutRatio: 55,
        outlierRatio: 2.2,
        videoCount30d: 20,
        vph: 320
      },
      cpmGroup: '$20 - $35',
      searchIntent: 'transactional',
      contentType: 'faceless',
      policyRisk: 'none'
    });

    assert.ok(result.moneyScore >= 60, `Score should be healthy, got ${result.moneyScore}`);
    assert.strictEqual(result.source, 'YouTubeOnly');
    assert.strictEqual(result.dataCompleteness, 0.68);
  });
});

describe('Trend v2: YouTube Validator & Quota Budgeting', () => {
  test('estimateQuotaBudget calculates accurate API unit costs and respects cap', () => {
    const budget = estimateQuotaBudget(10, { quotaCap: 2000 });
    assert.strictEqual(budget.keywordCount, 10);
    assert.strictEqual(budget.costPerKeyword, 102); // 100 + 1 + 1
    assert.strictEqual(budget.totalUnits, 1020);
    assert.strictEqual(budget.isWithinBudget, true);

    const overBudget = estimateQuotaBudget(30, { quotaCap: 2000 });
    assert.strictEqual(overBudget.totalUnits, 3060);
    assert.strictEqual(overBudget.isWithinBudget, false);
  });

  test('analyzeYouTubeMetrics computes correct breakout and outlier ratios', () => {
    const now = new Date();
    const mockVideos = [
      {
        id: 'v1',
        title: 'Video 1',
        channelTitle: 'Small Channel 1',
        publishedAt: now.toISOString(),
        viewCount: 45000,
        subscriberCount: 15000
      },
      {
        id: 'v2',
        title: 'Video 2',
        channelTitle: 'Big Channel',
        publishedAt: now.toISOString(),
        viewCount: 120000,
        subscriberCount: 800000
      }
    ];

    const metrics = analyzeYouTubeMetrics(mockVideos);
    assert.strictEqual(metrics.videoCount30d, 2);
    assert.strictEqual(metrics.smallChannelBreakoutRatio, 50); // 1 out of 2
    assert.strictEqual(metrics.topVideos.length, 2);
  });

  test('createMockYouTubeValidation generates consistent test fixtures', () => {
    const mock = createMockYouTubeValidation('làm video ngắn ai');
    assert.strictEqual(mock.keyword, 'làm video ngắn ai');
    assert.ok(mock.avgViews > 0);
    assert.ok(mock.smallChannelBreakoutRatio >= 20);
    assert.strictEqual(mock.topVideos.length, 2);
  });
});
