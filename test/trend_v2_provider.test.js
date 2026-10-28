/**
 * Test Suite: Trend v2 TrendsProvider, Resilient CSV Parser & Cross-Batch Anchor Normalization
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  MockProvider,
  parseGoogleTrendsCsv,
  parseRelatedQueriesCsv,
  calculateTrendMetrics,
  normalizeCrossBatches,
  createTrendsBatches,
  extractKeywordFromHeader
} = require('../api/lib/trend_v2/trends_provider');

describe('Trend v2 Core Engine: CSV Parser & Header Extraction', () => {
  test('extractKeywordFromHeader strips region suffixes and whitespace', () => {
    assert.strictEqual(extractKeywordFromHeader('youtube: (Việt Nam)'), 'youtube');
    assert.strictEqual(extractKeywordFromHeader('làm video ai: (Toàn cầu)'), 'làm video ai');
    assert.strictEqual(extractKeywordFromHeader('make money: (United States)'), 'make money');
    assert.strictEqual(extractKeywordFromHeader('tiền ảo:(Việt Nam)'), 'tiền ảo');
    assert.strictEqual(extractKeywordFromHeader('Date'), 'Date');
  });

  test('parseGoogleTrendsCsv parses Vietnamese CSV with BOM and "<1" values', () => {
    // Simulated Google Trends export in Vietnamese
    const vnCsvWithBom = '\uFEFF' + [
      'Mức độ quan tâm theo thời gian',
      'Danh mục: Tất cả các danh mục',
      '',
      'Ngày,làm video ai: (Việt Nam),youtube: (Việt Nam),viết kịch bản: (Việt Nam)',
      '2026-01-04,<1,85,12',
      '2026-01-11,2,90,14',
      '2026-01-18,5,82,10',
      '2026-01-25,12,78,16',
      '2026-02-01,25,88,20'
    ].join('\n');

    const result = parseGoogleTrendsCsv(vnCsvWithBom);

    assert.strictEqual(result.type, 'interest_over_time');
    assert.strictEqual(result.keywords.length, 3);
    assert.deepStrictEqual(result.keywords, ['làm video ai', 'youtube', 'viết kịch bản']);
    assert.strictEqual(result.rowCount, 5);

    // Verify "<1" converted to 0.5
    const firstRowValues = result.seriesByDate[0].values;
    assert.strictEqual(firstRowValues['làm video ai'], 0.5);
    assert.strictEqual(firstRowValues['youtube'], 85);
    assert.strictEqual(firstRowValues['viết kịch bản'], 12);

    // Verify keywordSeriesMap
    assert.strictEqual(result.keywordSeriesMap['làm video ai'].length, 5);
    assert.strictEqual(result.keywordSeriesMap['làm video ai'][0].value, 0.5);
    assert.strictEqual(result.keywordSeriesMap['làm video ai'][4].value, 25);
  });

  test('parseGoogleTrendsCsv parses English CSV with "Date" header and locale formatting', () => {
    const enCsv = [
      'Interest over time',
      'Category: All categories',
      '',
      'Date,faceless channel: (United States),youtube: (United States)',
      '2025-11-02,18,65',
      '2025-11-09,<1,70',
      '2025-11-16,22,68',
      '2025-11-23,45,72'
    ].join('\r\n');

    const result = parseGoogleTrendsCsv(enCsv);
    assert.strictEqual(result.type, 'interest_over_time');
    assert.deepStrictEqual(result.keywords, ['faceless channel', 'youtube']);
    assert.strictEqual(result.rowCount, 4);
    assert.strictEqual(result.keywordSeriesMap['faceless channel'][1].value, 0.5);
    assert.strictEqual(result.keywordSeriesMap['youtube'][3].value, 72);
  });

  test('parseGoogleTrendsCsv handles Related Queries sections (Top & Rising)', () => {
    const relatedCsv = [
      'Truy vấn có liên quan',
      'Hàng đầu',
      'Truy vấn,Mức độ quan tâm',
      'học làm youtube,100',
      'kênh faceless kiếm tiền,75',
      '',
      'Gia tăng',
      'Truy vấn,Mức độ quan tâm',
      'công cụ v2 youtrend,+450%',
      'prompt kịch bản video,+200%'
    ].join('\n');

    const result = parseRelatedQueriesCsv(relatedCsv.split('\n'));
    assert.strictEqual(result.type, 'related_queries');
    assert.strictEqual(result.top.length, 2);
    assert.strictEqual(result.top[0].query, 'học làm youtube');
    assert.strictEqual(result.top[0].value, 100);
    assert.strictEqual(result.rising.length, 2);
    assert.strictEqual(result.rising[0].query, 'công cụ v2 youtrend');
    assert.strictEqual(result.rising[0].value, '+450%');
  });
});

describe('Trend v2 Core Engine: Anchor Cross-Batch Normalization', () => {
  test('normalizeCrossBatches scales two batches using common anchor keyword', () => {
    // Batch 1 has: "youtube" (anchor), "niche_a", "niche_b"
    // In Batch 1, "youtube" averages 80
    const batch1 = {
      keywordSeriesMap: {
        'youtube': [
          { date: '2026-01-01', value: 80 },
          { date: '2026-01-08', value: 80 }
        ],
        'niche_a': [
          { date: '2026-01-01', value: 40 },
          { date: '2026-01-08', value: 40 }
        ],
        'niche_b': [
          { date: '2026-01-01', value: 20 },
          { date: '2026-01-08', value: 20 }
        ]
      }
    };

    // Batch 2 has: "youtube" (anchor), "niche_c", "niche_d"
    // In Batch 2, because of competing high terms, "youtube" only peaks at 40 (half of Batch 1)
    // Thus terms in Batch 2 should be scaled up by factor of ~2.0 (80 / 40)
    const batch2 = {
      keywordSeriesMap: {
        'youtube': [
          { date: '2026-01-01', value: 40 },
          { date: '2026-01-08', value: 40 }
        ],
        'niche_c': [
          { date: '2026-01-01', value: 30 }, // expected normalized ≈ 30 * 2 = 60
          { date: '2026-01-08', value: 30 }
        ],
        'niche_d': [
          { date: '2026-01-01', value: 10 }, // expected normalized ≈ 10 * 2 = 20
          { date: '2026-01-08', value: 10 }
        ]
      }
    };

    const normalized = normalizeCrossBatches([batch1, batch2], 'youtube');

    assert.strictEqual(normalized.anchorKeyword, 'youtube');
    assert.strictEqual(normalized.referenceAnchorAverage, 80);

    const nicheA = normalized.normalizedSeriesMap['niche_a'];
    const nicheC = normalized.normalizedSeriesMap['niche_c'];
    const nicheD = normalized.normalizedSeriesMap['niche_d'];

    // niche_a in Batch 1 stays 40
    assert.strictEqual(nicheA.series[0].value, 40);

    // niche_c in Batch 2 gets scaled by 80/40 = 2 => 60
    assert.strictEqual(nicheC.series[0].value, 60);

    // niche_d in Batch 2 gets scaled by 80/40 = 2 => 20
    assert.strictEqual(nicheD.series[0].value, 20);

    assert.strictEqual(nicheC.scalingRatioApplied, 2.0);
  });

  test('createTrendsBatches chunks keywords into 4 target + 1 anchor batches with explore URL', () => {
    const keywords = ['crypto ai', 'meditation sleep', 'billionaire story', 'stoic quotes', 'finance tips', 'tech review'];
    const batches = createTrendsBatches(keywords, 'youtube', 'US', 'today 12-m');

    assert.strictEqual(batches.length, 2);
    // Batch 1 has 4 keywords + youtube
    assert.strictEqual(batches[0].targetKeywords.length, 4);
    assert.strictEqual(batches[0].allKeywords.length, 5);
    assert.strictEqual(batches[0].allKeywords[4], 'youtube');
    assert.ok(batches[0].url.includes('trends.google.com/trends/explore'));
    assert.ok(batches[0].url.includes('geo=US'));
    assert.ok(batches[0].url.includes('youtube'));

    // Batch 2 has 2 keywords + youtube
    assert.strictEqual(batches[1].targetKeywords.length, 2);
    assert.strictEqual(batches[1].allKeywords.length, 3);
  });
});

describe('Trend v2 Core Engine: Trend Metrics & MockProvider', () => {
  test('calculateTrendMetrics detects rising, evergreen and spike dynamics', () => {
    // Rising series (recent 4 weeks significantly higher than prior 8 weeks)
    const risingSeries = [
      { date: 'w1', value: 10 }, { date: 'w2', value: 12 }, { date: 'w3', value: 11 },
      { date: 'w4', value: 10 }, { date: 'w5', value: 12 }, { date: 'w6', value: 14 },
      { date: 'w7', value: 15 }, { date: 'w8', value: 16 },
      { date: 'w9', value: 50 }, { date: 'w10', value: 65 }, { date: 'w11', value: 80 }, { date: 'w12', value: 95 }
    ];
    const risingMetrics = calculateTrendMetrics(risingSeries);
    assert.strictEqual(risingMetrics.trendType, 'rising');
    assert.ok(risingMetrics.momentum > 50);

    // Evergreen series (consistently strong baseline, low volatility)
    const evergreenSeries = Array.from({ length: 12 }, (_, i) => ({
      date: `w${i+1}`,
      value: 65 + ((i % 3) - 1) * 3 // stays between 62 and 68
    }));
    const evergreenMetrics = calculateTrendMetrics(evergreenSeries);
    assert.strictEqual(evergreenMetrics.isEvergreen, true);
    assert.strictEqual(evergreenMetrics.trendType, 'evergreen');
    assert.ok(evergreenMetrics.volatility < 10);
  });

  test('MockProvider outputs standardized series structure [{date, value}]', async () => {
    const provider = new MockProvider();
    const result = await provider.getTrends({
      keywords: ['thiền ngủ ngon', 'kể chuyện kinh doanh'],
      geo: 'VN',
      range: 'today 3-m'
    });

    assert.ok(result['thiền ngủ ngon']);
    assert.ok(result['kể chuyện kinh doanh']);

    const entry = result['thiền ngủ ngon'];
    assert.strictEqual(entry.keyword, 'thiền ngủ ngon');
    assert.ok(Array.isArray(entry.series));
    assert.strictEqual(entry.series.length, 12);
    assert.ok(entry.series[0].date);
    assert.ok(typeof entry.series[0].value === 'number');
    assert.ok(entry.metrics.avgValue >= 0);
    assert.ok(entry.relatedQueries.top.length > 0);
  });
});
