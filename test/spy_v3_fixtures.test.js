/**
 * Test Suite: SPY v3 Case File Fixtures (A, B, C) and Mathematical Derivations
 * Must pass all fixture expectations from SPY v3 specifications.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');

const { parseVNNumber, getVNNumberBounds, parseDeltaVsNormal } = require('../api/lib/vn_parser');
const { parseStudioDate, parseChartTooltipDate } = require('../api/lib/date_parser');
const {
  derivePublishWindow,
  deriveCaptureTime,
  deriveViewsAtCapture,
  deriveVelocityAndExpectedViews,
  deriveBaselineViews,
  deriveAvgViewDuration,
  deriveLanguageHint,
  computeSameChannelLikelihood,
  buildCaseFileFromClues
} = require('../api/lib/case_file');

describe('SPY v3 Unit Tests: Parsers & Mathematical Bounds', () => {
  test('parseVNNumber and getVNNumberBounds for Studio numbers', () => {
    // "1 Tr" -> bounds [0.95M, 1.05M]
    const b1Tr = getVNNumberBounds('1 Tr');
    assert.strictEqual(b1Tr.value, 1000000);
    assert.strictEqual(b1Tr.min, 950000);
    assert.strictEqual(b1Tr.max, 1050000);

    // "2,4 Tr" -> bounds [2.35M, 2.45M]
    const b24Tr = getVNNumberBounds('2,4 Tr');
    assert.strictEqual(b24Tr.value, 2400000);
    assert.strictEqual(b24Tr.min, 2350000);
    assert.strictEqual(b24Tr.max, 2450000);

    // Watch hours: "126,5 N"
    const b126N = getVNNumberBounds('126,5 N');
    assert.strictEqual(b126N.value, 126500);
    assert.strictEqual(b126N.min, 126450);
    assert.strictEqual(b126N.max, 126550);

    // Watch hours: "85,7 N"
    const b85N = getVNNumberBounds('85,7 N');
    assert.strictEqual(b85N.value, 85700);
    assert.strictEqual(b85N.min, 85650);
    assert.strictEqual(b85N.max, 85750);
  });

  test('parseDeltaVsNormal parses Studio delta strings', () => {
    const dA = parseDeltaVsNormal('cao hơn 2,3 Tr/118,9 N');
    assert.strictEqual(dA.viewsDelta, 2300000);
    assert.strictEqual(dA.watchHoursDelta, 118900);

    const dB = parseDeltaVsNormal('cao hơn 981,6 N/63,8 N');
    assert.strictEqual(dB.viewsDelta, 981600);
    assert.strictEqual(dB.watchHoursDelta, 63800);
  });
});

describe('SPY v3 Fixture A Verification', () => {
  // Ảnh A: header "30 thg 9, 2026 tới nay", views 2,4 Tr, giờ 126,5 N, +717 sub, x30,
  // "cao hơn 2,3 Tr/118,9 N", views48h 29.238,
  // tooltip "Thứ 7, 10 thg 10, 2026 (10 ngày 18 giờ đầu tiên) 692", trục tới ~13 ngày.

  const headerA = '30 thg 9, 2026 tới nay';
  const tooltipA = 'Thứ 7, 10 thg 10, 2026 (10 ngày 18 giờ đầu tiên) 692';
  const viewsA = '2,4 Tr';
  const hoursA = '126,5 N';
  const ratioA = 30;
  const deltaA = 'cao hơn 2,3 Tr/118,9 N';
  const v48A = 29238;
  const axisA = 13;

  test('Publish Window A: publish ≈ 30/9 (đầu ngày địa phương)', () => {
    const pubWin = derivePublishWindow({
      headerDateText: headerA,
      tooltipDateText: tooltipA,
      tzOffsetHours: 7
    });

    assert.strictEqual(pubWin.status, 'EXACT_INTERSECTION');
    // Intersection of [30/9 00:00, 30/9 23:59] and tooltip [29/9 06:00, 30/9 05:59]
    // is early hours of 30/9: [2026-09-30T00:00:00, 2026-09-30T05:59:59]
    assert.strictEqual(pubWin.localWindow.start, '2026-09-30T00:00:00');
    assert.strictEqual(pubWin.localWindow.end, '2026-09-30T05:59:59');
    // UTC window for UTC+7: subtract 7h -> starts 2026-09-29T17:00:00Z to 2026-09-29T22:59:59Z
    assert.ok(pubWin.utcWindow.publishedAfter.includes('2026-09-29T17:00:00'));
  });

  test('Baseline A: baseline ≈ 80k (with delta check 100k)', () => {
    const viewsBounds = deriveViewsAtCapture(viewsA);
    const baselineInfo = deriveBaselineViews({
      viewsAtCapture: viewsBounds,
      vsNormalRatio: ratioA,
      deltaText: deltaA
    });

    // 2.4M / 30 = 80,000
    assert.strictEqual(baselineInfo.baseline, 80000);
    // Delta base: 2.4M - 2.3M = 100,000
    assert.strictEqual(baselineInfo.deltaBase, 100000);
    // Cross-check passed
    assert.strictEqual(baselineInfo.crossCheckPass, true);
    // Range [80k / 1.5, 80k * 1.5] = [53333, 120000]
    assert.ok(baselineInfo.min <= 80000 && baselineInfo.max >= 80000);
  });

  test('Average View Duration A: avgViewDuration ≈ 186–194s', () => {
    const durInfo = deriveAvgViewDuration({
      watchHoursText: hoursA,
      totalViewsText: viewsA
    });

    assert.strictEqual(durInfo.minSec, 186);
    assert.strictEqual(durInfo.maxSec, 194);
    assert.ok(durInfo.avgSec >= 186 && durInfo.avgSec <= 194);
    // 190s > 185s -> Shorts penalized
    assert.strictEqual(durInfo.isShortsPenalized, true);
    // Video length requirement: >= 0.9 * 186s = 167s
    assert.ok(durInfo.minVideoDuration >= 165);
  });

  test('Expected Views Now A: expectedViewsNow ≈ [2,35M, ~2,8M]', () => {
    const viewsBounds = deriveViewsAtCapture(viewsA);
    const capInfo = deriveCaptureTime({
      publishLocalIso: '2026-09-30T03:00:00',
      captureAgeDays: axisA
    });
    // Capture time: 30/9 + 13 days = 13/10
    assert.strictEqual(capInfo.captureTimeLocal.slice(0, 10), '2026-10-13');

    // Suppose current time is 28/10 (15 days after capture)
    const nowTime = new Date('2026-10-28T12:00:00Z').getTime();
    const velInfo = deriveVelocityAndExpectedViews({
      views48h: v48A,
      viewsAtCapture: viewsBounds,
      captureTimeLocal: capInfo.captureTimeLocal,
      nowLocalMs: nowTime
    });

    // Min: 2.35M * 0.97 = 2,279,500 ~ 2.35M
    assert.ok(velInfo.expectedViewsNow[0] >= 2270000 && velInfo.expectedViewsNow[0] <= 2360000);
    // Max: 2.45M + (29238/2 * 15.4) ~ 2.45M + 225k = ~2.68M - 2.8M
    assert.ok(velInfo.expectedViewsNow[1] >= 2600000 && velInfo.expectedViewsNow[1] <= 2850000);
  });
});

describe('SPY v3 Fixture B Verification', () => {
  // Ảnh B: header "26 thg 9, 2026 tới nay", views 1 Tr, giờ 85,7 N, +874 sub, x16,
  // "cao hơn 981,6 N/63,8 N", views48h 26.586,
  // tooltip "06:00 Thứ 4, 7 thg 10 (10 ngày 12 giờ đầu tiên) 784.308", trục tới ~17,5 ngày, chữ lộ "大き".

  const headerB = '26 thg 9, 2026 tới nay';
  const tooltipB = '06:00 Thứ 4, 7 thg 10 (10 ngày 12 giờ đầu tiên) 784.308';
  const viewsB = '1 Tr';
  const hoursB = '85,7 N';
  const ratioB = 16;
  const deltaB = 'cao hơn 981,6 N/63,8 N';
  const v48B = 26586;
  const axisB = 17.5;
  const titleCharsB = '大き';

  test('Publish Window B: publish ≈ 26/9 khoảng 18:00 giờ địa phương', () => {
    const pubWin = derivePublishWindow({
      headerDateText: headerB,
      tooltipDateText: tooltipB,
      tzOffsetHours: 7
    });

    assert.strictEqual(pubWin.status, 'EXACT_INTERSECTION');
    // Tooltip: 7/10 06:00 minus 10d 12h = 26/9 18:00!
    // Window with +/- 2h bucket: [2026-09-26T16:00:00, 2026-09-26T20:00:00]
    assert.strictEqual(pubWin.localWindow.start, '2026-09-26T16:00:00');
    assert.strictEqual(pubWin.localWindow.end, '2026-09-26T20:00:00');
    assert.strictEqual(pubWin.localWindow.estimated, '2026-09-26T18:00:00');

    // UTC for UTC+7: 18:00 - 7h = 11:00 UTC
    assert.ok(pubWin.utcWindow.start.includes('2026-09-26T09:00:00'));
    assert.ok(pubWin.utcWindow.end.includes('2026-09-26T13:00:00'));
  });

  test('Baseline B: baseline ≈ 62k', () => {
    const viewsBounds = deriveViewsAtCapture(viewsB);
    const baselineInfo = deriveBaselineViews({
      viewsAtCapture: viewsBounds,
      vsNormalRatio: ratioB,
      deltaText: deltaB
    });

    // 1M / 16 = 62,500 ~ 62k
    assert.strictEqual(baselineInfo.baseline, 62500);
    // Delta base: 1M - 981.6k = 18.4k
    assert.strictEqual(baselineInfo.deltaBase, 18400);
    // Range [62.5k / 1.5, 62.5k * 1.5] = [41667, 93750]
    assert.ok(baselineInfo.min <= 62500 && baselineInfo.max >= 62500);
  });

  test('Average View Duration B: avgViewDuration ≈ 294–325s', () => {
    const durInfo = deriveAvgViewDuration({
      watchHoursText: hoursB,
      totalViewsText: viewsB
    });

    assert.strictEqual(durInfo.minSec, 294);
    assert.strictEqual(durInfo.maxSec, 325);
    assert.ok(durInfo.avgSec >= 294 && durInfo.avgSec <= 325);
    // 309s > 185s -> Shorts penalized
    assert.strictEqual(durInfo.isShortsPenalized, true);
  });

  test('Expected Views Now B: expectedViewsNow ≈ [0,97M, ~1,3M]', () => {
    const viewsBounds = deriveViewsAtCapture(viewsB);
    const capInfo = deriveCaptureTime({
      publishLocalIso: '2026-09-26T18:00:00',
      captureAgeDays: axisB
    });
    // Capture time: 26/9 18:00 + 17.5 days = 14/10 06:00
    assert.strictEqual(capInfo.captureTimeLocal.slice(0, 10), '2026-10-14');

    // Suppose current time is 28/10 (14.25 days after capture)
    const nowTime = new Date('2026-10-28T12:00:00Z').getTime();
    const velInfo = deriveVelocityAndExpectedViews({
      views48h: v48B,
      viewsAtCapture: viewsBounds,
      captureTimeLocal: capInfo.captureTimeLocal,
      nowLocalMs: nowTime
    });

    // Min: 0.95M * 0.97 = 921.5k ~ 0.97M
    assert.ok(velInfo.expectedViewsNow[0] >= 920000 && velInfo.expectedViewsNow[0] <= 975000);
    // Max: 1.05M + (26586/2 * 14.25) = 1.05M + 189k = ~1.24M - 1.3M
    assert.ok(velInfo.expectedViewsNow[1] >= 1200000 && velInfo.expectedViewsNow[1] <= 1350000);
  });

  test('Language Hint B: detects Japanese from "大き"', () => {
    const lang = deriveLanguageHint(titleCharsB);
    assert.strictEqual(lang.languageHint, 'ja');
    assert.strictEqual(lang.regionCode, 'JP');
    assert.strictEqual(lang.isRegionTentative, true);
    assert.strictEqual(lang.script, 'Japanese (Kana)');
  });
});

describe('Cross-Image: sameChannelLikelihood between Image A and B', () => {
  test('A and B yield high sameChannelLikelihood', () => {
    const caseA = buildCaseFileFromClues({
      imageId: 'img_A',
      clues: [
        { type: 'publishDate', value: '2026-09-30', source: { raw: '30 thg 9, 2026 tới nay', parsed: { raw: 'Thứ 7, 10 thg 10, 2026 (10 ngày 18 giờ đầu tiên) 692' } } },
        { type: 'totalViews', value: 2400000, note: '2,4 Tr' },
        { type: 'watchHours', value: 126500, note: '126,5 N' },
        { type: 'vsNormalRatio', value: 30 },
        { type: 'views48h', value: 29238 },
        { type: 'captureAgeDays', value: 13 }
      ]
    });

    const caseB = buildCaseFileFromClues({
      imageId: 'img_B',
      clues: [
        { type: 'publishDate', value: '2026-09-26', source: { raw: '26 thg 9, 2026 tới nay', parsed: { raw: '06:00 Thứ 4, 7 thg 10 (10 ngày 12 giờ đầu tiên) 784.308' } } },
        { type: 'totalViews', value: 1000000, note: '1 Tr' },
        { type: 'watchHours', value: 85700, note: '85,7 N' },
        { type: 'vsNormalRatio', value: 16 },
        { type: 'views48h', value: 26586 },
        { type: 'captureAgeDays', value: 17.5 },
        { type: 'visibleTitleChars', value: '大き' }
      ]
    });

    const matchResult = computeSameChannelLikelihood(caseA, caseB);
    assert.ok(matchResult.score >= 0.70, `Expected score >= 0.70, got ${matchResult.score}`);
    assert.strictEqual(matchResult.isSameChannelCandidate, true);
    // Time delta: 13/10 vs 14/10 -> ~1.1 days difference (< 2 days)
    assert.ok(matchResult.timeDeltaDays < 2.0);
    // Baseline ratio: 80k vs 62.5k -> 1.28x (< 2.0x)
    assert.ok(matchResult.baseRatio < 2.0);
  });
});

describe('SPY v3 Fixture C: Mobile Realtime Weak Signal', () => {
  test('Image C does NOT produce false anchors and is marked as weak', () => {
    // 20.869 view/48h, top 4,5N/3,8N/2,9N/2,1N/1,8N; no 870 axis label
    const caseC = buildCaseFileFromClues({
      imageId: 'img_C',
      screenType: 'studio_channel_realtime',
      clues: [
        { type: 'views48h', value: 20869 },
        { type: 'top_videos_48h', value: [4500, 3800, 2900, 2100, 1800] }
      ]
    });

    // No publishDate or totalViews anchor
    assert.strictEqual(caseC.hasAnchor, false);
    assert.strictEqual(caseC.publishWindow.status, 'MISSING');
    assert.strictEqual(caseC.viewsAtCapture, null);
    assert.strictEqual(caseC.screenType, 'studio_channel_realtime');
  });
});

describe('Publish Window Conflict Handling', () => {
  test('Disjoint Header and Tooltip falls back to Union with warning', () => {
    const pubWin = derivePublishWindow({
      headerDateText: '10 thg 10, 2026 tới nay',
      tooltipDateText: '06:00 Thứ 4, 7 thg 10 (10 ngày 12 giờ đầu tiên)', // publish 26/9
      tzOffsetHours: 7
    });

    // 10/10 and 26/9 are disjoint
    assert.strictEqual(pubWin.status, 'CONFLICT_UNION');
    assert.ok(pubWin.warning.includes('Mâu thuẫn'));
    // Union covers both dates
    assert.ok(pubWin.localWindow.start.includes('2026-09-26'));
    assert.ok(pubWin.localWindow.end.includes('2026-10-10'));
  });
});
