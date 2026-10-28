/**
 * Test Suite: Trend v2 AI Generator, Schema Validation & Policy Risk Detection
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const {
  validateNichesSchema,
  validateKeywordsSchema,
  detectPolicyRisk,
  detectIntent,
  deduplicateKeywords,
  buildNichesPrompt,
  buildKeywordsPrompt,
  generateFallbackNiches,
  generateFallbackKeywords
} = require('../api/_lib/trend_v2/ai_generator');

const trendAiHandler = require('../api/trend-v2-ai');

describe('Trend v2 AI: Schema Validation & Rules Enforcement', () => {
  test('validateNichesSchema validates valid niches and enforces isHypothesis: true', () => {
    const rawData = {
      niches: [
        {
          name: 'Kể Chuyện Tuổi Già Mỹ',
          description: 'Nội dung hướng tới người lớn tuổi',
          whyTrending: 'AVD cao, đối tượng khán giả xem không tắt ad',
          contentType: 'faceless',
          cpmGroup: '$25 - $48',
          targetAudience: 'Người 50+ tuổi tại Mỹ'
        }
      ]
    };

    const res = validateNichesSchema(rawData);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.niches.length, 1);
    assert.strictEqual(res.niches[0].isHypothesis, true);
    assert.strictEqual(res.niches[0].contentType, 'faceless');
  });

  test('validateNichesSchema rejects malformed data', () => {
    assert.strictEqual(validateNichesSchema(null).valid, false);
    assert.strictEqual(validateNichesSchema({ niches: [] }).valid, false);
    assert.strictEqual(validateNichesSchema({ niches: [{ description: 'No name' }] }).valid, false);
  });

  test('detectPolicyRisk flags sensitive finance, unverified health, and adult triggers', () => {
    const safe = detectPolicyRisk('Hướng dẫn làm vườn trên ban công');
    assert.strictEqual(safe.riskLevel, 'none');
    assert.strictEqual(safe.sensitiveFlag, false);

    const finance = detectPolicyRisk('Kèo x100 tiền ảo bí mật làm giàu nhanh');
    assert.strictEqual(finance.riskLevel, 'high');
    assert.strictEqual(finance.sensitiveFlag, true);
    assert.strictEqual(finance.category, 'finance');

    const health = detectPolicyRisk('Bài thuốc thần dược chữa dứt điểm ung thư');
    assert.strictEqual(health.riskLevel, 'high');
    assert.strictEqual(health.sensitiveFlag, true);
    assert.strictEqual(health.category, 'health');

    const adult = detectPolicyRisk('Bộ phim 18+ khiêu dâm lộ clip');
    assert.strictEqual(adult.riskLevel, 'high');
    assert.strictEqual(adult.sensitiveFlag, true);
  });

  test('detectIntent categorizes informational, commercial, and transactional keywords', () => {
    assert.strictEqual(detectIntent('hướng dẫn cách làm video ngắn'), 'informational');
    assert.strictEqual(detectIntent('how to start a faceless channel'), 'informational');
    assert.strictEqual(detectIntent('đánh giá so sánh capcut vs premiere'), 'commercial');
    assert.strictEqual(detectIntent('best ai tools for youtube review'), 'commercial');
    assert.strictEqual(detectIntent('mua khoá học kiếm tiền youtube'), 'transactional');
    assert.strictEqual(detectIntent('buy capcut pro lifetime deal'), 'transactional');
  });

  test('deduplicateKeywords removes exact matches, casing variants and near duplicates', () => {
    const list = [
      { keyword: 'cách làm youtube', searchIntent: 'informational' },
      { keyword: 'Cách Làm Youtube', searchIntent: 'informational' }, // exact case duplicate
      { keyword: 'cách làm youtube.', searchIntent: 'informational' }, // punctuation duplicate
      { keyword: 'học cách làm youtube', searchIntent: 'informational' }, // distinct
      { keyword: 'cách làm kênh youtube', searchIntent: 'informational' }
    ];

    const deduped = deduplicateKeywords(list);
    assert.strictEqual(deduped.length, 3);
    assert.strictEqual(deduped[0].keyword, 'cách làm youtube');
  });
});

describe('Trend v2 AI: Grounded Fallback Generators', () => {
  test('generateFallbackNiches generates realistic hypothesis niches with correct count', () => {
    const res = generateFallbackNiches({ targetRegion: 'US', count: 6 });
    assert.strictEqual(res.niches.length, 6);
    res.niches.forEach(n => {
      assert.ok(n.name);
      assert.ok(n.cpmGroup);
      assert.strictEqual(n.isHypothesis, true);
    });
  });

  test('generateFallbackKeywords generates keywords with correct intents and target language', () => {
    const niches = [{ id: 'n1', name: 'Triết Lý Khắc Kỷ' }];
    const res = generateFallbackKeywords({ selectedNiches: niches, count: 8, targetRegion: 'VN' });
    assert.strictEqual(res.keywords.length, 8);
    assert.strictEqual(res.keywords[0].targetLanguage, 'vi');
    assert.strictEqual(res.keywords[0].isHypothesis, true);
  });
});

describe('Trend v2 AI: Serverless Endpoint Mock Test', () => {
  function createMockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(data) { this.body = data; return this; },
      end() { return this; }
    };
  }

  test('api/trend-v2-ai handles propose_niches with grounded fallback when offline', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'propose_niches',
        targetRegion: 'US',
        count: 5
      }
    };
    const res = createMockRes();

    await trendAiHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.action, 'propose_niches');
    assert.strictEqual(res.body.niches.length, 5);
    assert.strictEqual(res.body.isHypothesis, true);
  });

  test('api/trend-v2-ai handles generate_keywords for selected niches', async () => {
    const req = {
      method: 'POST',
      headers: {},
      body: {
        action: 'generate_keywords',
        targetRegion: 'VN',
        selectedNiches: [{ id: 'n_vn_1', name: 'Kể Chuyện Trầm Cảm' }],
        count: 8
      }
    };
    const res = createMockRes();

    await trendAiHandler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.action, 'generate_keywords');
    assert.strictEqual(res.body.keywords.length, 8);
  });
});
