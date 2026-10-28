/**
 * Case File Engine for SPY v3
 * Mathematical derivations, derived fields with min/max/confidence,
 * publish window intersection/conflict handling, and sameChannelLikelihood.
 */

const { parseVNNumber, getVNNumberBounds, parseDeltaVsNormal } = require('./vn_parser');
const { parseStudioDate, parseChartTooltipDate, addDaysToIso } = require('./date_parser');
const { validateVisibleTitleChars } = require('./types_and_clues');

/**
 * 1. derivePublishWindow
 * Intersection of:
 * (a) Header date ("26 thg 9, 2026 tới nay") as local day [00:00:00, 23:59:59]
 * (b) Tooltip: timestamp minus "X ngày Y giờ đầu tiên" (+/- 1-2h bucket)
 * If conflict, take union and flag warning.
 * Converts to UTC based on tzOffsetHours (default UTC+7).
 */
function derivePublishWindow({
  headerDateText = null,
  tooltipDateText = null,
  tzOffsetHours = 7,
  defaultYear = 2026
} = {}) {
  let headerWindowLocal = null;
  let tooltipWindowLocal = null;
  let headerParsed = null;
  let tooltipParsed = null;

  // (a) Header date
  if (headerDateText) {
    headerParsed = parseStudioDate(headerDateText);
    const pubIso = headerParsed?.publishDate || headerParsed?.startDate;
    if (pubIso) {
      headerWindowLocal = {
        start: `${pubIso}T00:00:00`,
        end: `${pubIso}T23:59:59`,
        isoDate: pubIso
      };
    }
  }

  // (b) Tooltip date
  if (tooltipDateText) {
    tooltipParsed = parseChartTooltipDate(tooltipDateText, defaultYear);
    if (tooltipParsed && tooltipParsed.localWindow) {
      tooltipWindowLocal = {
        start: tooltipParsed.localWindow.start,
        end: tooltipParsed.localWindow.end,
        estimatedPublishLocal: tooltipParsed.estimatedPublishLocal,
        estimatedPublishIso: tooltipParsed.estimatedPublishIso,
        hasTime: tooltipParsed.hasTime,
        timeToken: tooltipParsed.timeToken
      };
    }
  }

  let finalStartMs = null;
  let finalEndMs = null;
  let status = 'NONE';
  let warning = null;
  let localEstimatedIso = null;

  if (headerWindowLocal && tooltipWindowLocal) {
    const hStart = new Date(headerWindowLocal.start + 'Z').getTime();
    const hEnd = new Date(headerWindowLocal.end + 'Z').getTime();
    const tStart = new Date(tooltipWindowLocal.start + 'Z').getTime();
    const tEnd = new Date(tooltipWindowLocal.end + 'Z').getTime();

    const intersectStart = Math.max(hStart, tStart);
    const intersectEnd = Math.min(hEnd, tEnd);

    if (intersectStart <= intersectEnd) {
      // Overlap exists: keep tight intersection
      finalStartMs = intersectStart;
      finalEndMs = intersectEnd;
      status = 'EXACT_INTERSECTION';
      localEstimatedIso = new Date(Math.round((intersectStart + intersectEnd) / 2)).toISOString().slice(0, 19);
    } else {
      // Conflict: disjoint sets -> Fallback to union to avoid zero-recall, raise warning
      finalStartMs = Math.min(hStart, tStart);
      finalEndMs = Math.max(hEnd, tEnd);
      status = 'CONFLICT_UNION';
      warning = `Mâu thuẫn header (${headerWindowLocal.isoDate}) và tooltip (${tooltipWindowLocal.estimatedPublishIso}). Hệ thống tự động mở rộng vùng hợp để tránh sót ứng viên.`;
      localEstimatedIso = tooltipWindowLocal.estimatedPublishLocal || headerWindowLocal.start;
    }
  } else if (tooltipWindowLocal) {
    finalStartMs = new Date(tooltipWindowLocal.start + 'Z').getTime();
    finalEndMs = new Date(tooltipWindowLocal.end + 'Z').getTime();
    status = 'TOOLTIP_ONLY';
    localEstimatedIso = tooltipWindowLocal.estimatedPublishLocal;
  } else if (headerWindowLocal) {
    finalStartMs = new Date(headerWindowLocal.start + 'Z').getTime();
    finalEndMs = new Date(headerWindowLocal.end + 'Z').getTime();
    status = 'HEADER_ONLY';
    localEstimatedIso = headerWindowLocal.start;
  } else {
    return {
      status: 'MISSING',
      warning: 'Không tìm thấy mốc ngày xuất bản từ Header hoặc Tooltip',
      confidence: 0
    };
  }

  const localWindow = {
    start: new Date(finalStartMs).toISOString().slice(0, 19),
    end: new Date(finalEndMs).toISOString().slice(0, 19),
    estimated: localEstimatedIso
  };

  // Convert to UTC by subtracting timezone offset
  const tzMs = tzOffsetHours * 3600 * 1000;
  const utcStartMs = finalStartMs - tzMs;
  const utcEndMs = finalEndMs - tzMs;

  const utcWindow = {
    start: new Date(utcStartMs).toISOString(),
    end: new Date(utcEndMs).toISOString(),
    publishedAfter: new Date(utcStartMs).toISOString(),
    publishedBefore: new Date(utcEndMs).toISOString()
  };

  return {
    status,
    warning,
    localWindow,
    utcWindow,
    tzOffsetHours,
    headerWindow: headerWindowLocal,
    tooltipWindow: tooltipWindowLocal,
    confidence: status === 'EXACT_INTERSECTION' ? 0.98 : status === 'CONFLICT_UNION' ? 0.75 : 0.90
  };
}

/**
 * 2. deriveCaptureTime
 * publish + duration of drawn timeline axis (captureAgeDays)
 */
function deriveCaptureTime({
  publishLocalIso = null,
  captureAgeDays = null,
  userOverride = null
} = {}) {
  if (userOverride) {
    return {
      captureTimeLocal: userOverride,
      captureAgeDays: captureAgeDays || null,
      isUserModified: true,
      confidence: 0.95
    };
  }

  if (!publishLocalIso || !captureAgeDays) {
    return {
      captureTimeLocal: null,
      captureAgeDays: captureAgeDays || null,
      isUserModified: false,
      confidence: 0.50
    };
  }

  const pubMs = new Date(publishLocalIso + 'Z').getTime();
  const captureMs = pubMs + Math.round(Number(captureAgeDays) * 86400 * 1000);
  const captureTimeLocal = new Date(captureMs).toISOString().slice(0, 19);

  return {
    captureTimeLocal,
    captureAgeDays: Number(captureAgeDays),
    isUserModified: false,
    confidence: 0.88
  };
}

/**
 * 3. deriveViewsAtCapture
 * Parse bounds from Studio rounding ("1 Tr" -> [0.95M, 1.05M], "2,4 Tr" -> [2.35M, 2.45M])
 */
function deriveViewsAtCapture(rawViewsText) {
  if (!rawViewsText) return null;
  const b = getVNNumberBounds(rawViewsText);
  if (!b) return null;

  return {
    raw: rawViewsText,
    value: b.value,
    min: b.min,
    max: b.max,
    step: b.step,
    isRounded: b.isRounded,
    confidence: 0.95
  };
}

/**
 * 4. deriveVelocityAndExpectedViews
 * velocity = views48h / 2 per day
 * expectedViewsNow = [min * 0.97, max + velocity * daysSinceCapture * 1.0]
 * expanded zone x1.5, beyond x3 practically eliminated
 */
function deriveVelocityAndExpectedViews({
  views48h = null,
  viewsAtCapture = null,
  captureTimeLocal = null,
  nowLocalMs = Date.now()
} = {}) {
  if (!viewsAtCapture) return null;

  const v48 = views48h ? parseVNNumber(views48h) || Number(views48h) : 0;
  const velocityPerDay = v48 > 0 ? Math.round(v48 / 2) : 0;

  let daysSinceCapture = 0;
  if (captureTimeLocal) {
    const capMs = new Date(captureTimeLocal + 'Z').getTime();
    daysSinceCapture = Math.max(0, (nowLocalMs - capMs) / 864e5);
  }

  const minExpected = Math.round(viewsAtCapture.min * 0.97);
  const maxGrowth = velocityPerDay > 0 ? Math.round(velocityPerDay * Math.max(1, daysSinceCapture) * 1.0) : Math.round(viewsAtCapture.max * 0.15);
  const maxExpected = Math.round(viewsAtCapture.max + maxGrowth);

  // Bounds
  const expandedZone = [
    Math.round(minExpected * 0.85),
    Math.round(maxExpected * 1.5)
  ];
  const hardEliminationZone = [
    Math.round(minExpected * 0.70),
    Math.round(maxExpected * 3.0)
  ];

  return {
    views48h: v48,
    velocityPerDay,
    daysSinceCapture: Math.round(daysSinceCapture * 10) / 10,
    expectedViewsNow: [minExpected, maxExpected],
    expandedZone,
    hardEliminationZone,
    confidence: velocityPerDay > 0 ? 0.92 : 0.75
  };
}

/**
 * 5. deriveBaselineViews
 * baselineViews = viewsAtCapture / ratio [B / 1.5, B * 1.5]
 * Cross-checks with delta text ("cao hơn X so với bình thường")
 */
function deriveBaselineViews({
  viewsAtCapture = null,
  vsNormalRatio = null,
  deltaText = null
} = {}) {
  if (!viewsAtCapture) return null;

  const ratio = vsNormalRatio ? Number(vsNormalRatio) : null;
  let ratioBase = null;
  let min = null;
  let max = null;

  if (ratio && ratio > 1) {
    ratioBase = Math.round(viewsAtCapture.value / ratio);
    min = Math.round(ratioBase / 1.5);
    max = Math.round(ratioBase * 1.5);
  }

  // Cross-check with delta text if present (e.g. "cao hơn 2,3 Tr/118,9 N")
  let deltaInfo = null;
  let deltaBase = null;
  let crossCheckPass = null;

  if (deltaText) {
    deltaInfo = parseDeltaVsNormal(deltaText);
    if (deltaInfo && deltaInfo.viewsDelta) {
      deltaBase = Math.max(0, viewsAtCapture.value - deltaInfo.viewsDelta);
      if (ratioBase) {
        // Check if deltaBase is reasonably aligned with ratioBase (within 2.5x)
        const diffRatio = Math.max(deltaBase, ratioBase) / Math.max(1, Math.min(deltaBase, ratioBase));
        crossCheckPass = (diffRatio <= 2.5);
      } else {
        ratioBase = deltaBase;
        min = Math.round(deltaBase / 1.5);
        max = Math.round(deltaBase * 1.5);
      }
    }
  }

  if (!ratioBase && !deltaBase) return null;

  const finalBaseline = ratioBase || deltaBase;

  return {
    baseline: finalBaseline,
    min: min || Math.round(finalBaseline / 1.5),
    max: max || Math.round(finalBaseline * 1.5),
    ratio,
    deltaBase,
    deltaInfo,
    crossCheckPass,
    confidence: crossCheckPass ? 0.95 : ratio ? 0.88 : 0.80
  };
}

/**
 * 6. deriveAvgViewDuration
 * avgViewDuration = watchHours * 3600 / views (range)
 * Actual video length >= ~0.9 * avgViewDuration
 * Shorts max 180s: if avgViewDuration > 185s, penalize Shorts heavily
 */
function deriveAvgViewDuration({
  watchHoursText = null,
  totalViewsText = null,
  watchHoursValue = null,
  totalViewsValue = null
} = {}) {
  const wBounds = watchHoursText ? getVNNumberBounds(watchHoursText) : (watchHoursValue ? { value: watchHoursValue, min: watchHoursValue, max: watchHoursValue } : null);
  const vBounds = totalViewsText ? getVNNumberBounds(totalViewsText) : (totalViewsValue ? { value: totalViewsValue, min: totalViewsValue, max: totalViewsValue } : null);

  if (!wBounds || !vBounds || vBounds.value <= 0) return null;

  const minSec = Math.round((wBounds.min * 3600) / vBounds.max);
  const maxSec = Math.round((wBounds.max * 3600) / vBounds.min);
  const nominalSec = Math.round((wBounds.value * 3600) / vBounds.value);

  const minVideoDuration = Math.round(minSec * 0.9);
  const isShortsPenalized = nominalSec > 185;

  return {
    avgSec: nominalSec,
    minSec,
    maxSec,
    minVideoDuration,
    isShortsPenalized,
    penaltyNote: isShortsPenalized ? 'Giờ xem trung bình > 185s: Phạt nặng video Shorts <= 180s' : 'Phù hợp mọi định dạng',
    confidence: 0.92
  };
}

/**
 * 7. deriveLanguageHint
 * Inferred from exposed title characters (kana -> ja, hangul -> ko, cyrillic -> ru, vietnamese -> vi)
 * regionCode is only a tentative suggestion, not a conclusion.
 */
function deriveLanguageHint(visibleTitleChars, regionHint = null) {
  if (!visibleTitleChars) {
    return {
      languageHint: 'any',
      regionCode: regionHint || null,
      isRegionTentative: true,
      script: 'Unknown',
      confidence: 0.30
    };
  }

  const s = String(visibleTitleChars).trim();

  // Kana / Kanji (Japanese)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(s)) {
    return {
      languageHint: 'ja',
      regionCode: 'JP',
      isRegionTentative: true,
      script: 'Japanese (Kana)',
      chars: s,
      confidence: 0.95
    };
  }

  // Hangul (Korean)
  if (/[\uAC00-\uD7AF\u1100-\u11FF]/.test(s)) {
    return {
      languageHint: 'ko',
      regionCode: 'KR',
      isRegionTentative: true,
      script: 'Korean (Hangul)',
      chars: s,
      confidence: 0.95
    };
  }

  // Cyrillic (Russian)
  if (/[\u0400-\u04FF]/.test(s)) {
    return {
      languageHint: 'ru',
      regionCode: 'RU',
      isRegionTentative: true,
      script: 'Cyrillic',
      chars: s,
      confidence: 0.90
    };
  }

  // Thai
  if (/[\u0E00-\u0E7F]/.test(s)) {
    return {
      languageHint: 'th',
      regionCode: 'TH',
      isRegionTentative: true,
      script: 'Thai',
      chars: s,
      confidence: 0.90
    };
  }

  // CJK Kanji / Hanzi without kana
  if (/[\u4E00-\u9FAF]/.test(s)) {
    return {
      languageHint: 'ja',
      regionCode: 'JP',
      isRegionTentative: true,
      script: 'CJK Ideograph',
      chars: s,
      confidence: 0.70
    };
  }

  // Vietnamese diacritics
  if (/[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s)) {
    return {
      languageHint: 'vi',
      regionCode: 'VN',
      isRegionTentative: true,
      script: 'Vietnamese',
      chars: s,
      confidence: 0.95
    };
  }

  // Latin letters
  if (/[a-zA-Z]/.test(s)) {
    return {
      languageHint: 'en',
      regionCode: regionHint || 'US',
      isRegionTentative: true,
      script: 'Latin',
      chars: s,
      confidence: 0.65
    };
  }

  return {
    languageHint: 'any',
    regionCode: regionHint || null,
    isRegionTentative: true,
    script: 'Symbols',
    chars: s,
    confidence: 0.40
  };
}

/**
 * 8. computeSameChannelLikelihood
 * Between two Case Files:
 * - same redaction/UI layout
 * - captureTime diff < 2 days
 * - baseline within same order of magnitude (within 3x)
 * - same exposed title script
 */
function computeSameChannelLikelihood(caseA, caseB) {
  if (!caseA || !caseB) return { score: 0, isSameChannelCandidate: false, reasons: [] };

  const reasons = [];
  let score = 0;

  // 1. Capture Time Difference (< 2 days)
  const capA = caseA.captureTime?.captureTimeLocal;
  const capB = caseB.captureTime?.captureTimeLocal;
  let timeDeltaDays = null;
  if (capA && capB) {
    const msA = new Date(capA + 'Z').getTime();
    const msB = new Date(capB + 'Z').getTime();
    timeDeltaDays = Math.abs(msA - msB) / 864e5;
    if (timeDeltaDays < 2.0) {
      score += 0.35;
      reasons.push(`Thời điểm chụp rất gần nhau (lệch ${timeDeltaDays.toFixed(1)} ngày < 2 ngày)`);
    } else if (timeDeltaDays < 5.0) {
      score += 0.15;
      reasons.push(`Thời điểm chụp cách nhau ${timeDeltaDays.toFixed(1)} ngày`);
    }
  }

  // 2. Baseline order of magnitude (within 3x)
  const baseA = caseA.baselineViews?.baseline;
  const baseB = caseB.baselineViews?.baseline;
  let baseRatio = null;
  if (baseA && baseB && baseA > 0 && baseB > 0) {
    baseRatio = Math.max(baseA, baseB) / Math.min(baseA, baseB);
    if (baseRatio <= 2.0) {
      score += 0.35;
      reasons.push(`Baseline cùng bậc quy mô (lệch ${baseRatio.toFixed(1)}x <= 2x)`);
    } else if (baseRatio <= 3.5) {
      score += 0.20;
      reasons.push(`Baseline gần quy mô (lệch ${baseRatio.toFixed(1)}x <= 3.5x)`);
    } else {
      reasons.push(`Baseline lệch quy mô (${baseRatio.toFixed(1)}x)`);
    }
  }

  // 3. Exposed script match
  const scriptA = caseA.languageHint?.script;
  const scriptB = caseB.languageHint?.script;
  if (scriptA && scriptB && scriptA !== 'Unknown' && scriptB !== 'Unknown') {
    if (scriptA === scriptB || (scriptA.includes('Japanese') && scriptB.includes('Japanese'))) {
      score += 0.20;
      reasons.push(`Cùng hệ thống ký tự lộ (${scriptA})`);
    }
  }

  // 4. Same UI style / Vietnamese Studio
  score += 0.10; // Studio UI similarity bonus

  const normalizedScore = Math.min(1.0, Math.round(score * 100) / 100);
  const isSameChannelCandidate = (normalizedScore >= 0.70);

  return {
    score: normalizedScore,
    isSameChannelCandidate,
    timeDeltaDays: timeDeltaDays !== null ? Math.round(timeDeltaDays * 10) / 10 : null,
    baseRatio: baseRatio !== null ? Math.round(baseRatio * 10) / 10 : null,
    reasons,
    recommendation: isSameChannelCandidate
      ? 'Khả năng cao cùng một kênh! Gợi ý bật chế độ "Các ảnh này cùng kênh" để tăng trọng số giao tập.'
      : 'Chưa đủ bằng chứng để xác nhận cùng kênh.'
  };
}

/**
 * 9. buildCaseFileFromClues
 * Constructs a comprehensive Case File from raw clues array
 */
function buildCaseFileFromClues({
  imageId = 'img_1',
  fileName = 'screenshot.png',
  clues = [],
  screenType = 'studio_video_analytics',
  tzOffsetHours = 7,
  nowLocalMs = Date.now(),
  userEdits = {}
} = {}) {
  const cluesMap = {};
  clues.forEach(c => {
    cluesMap[c.type] = c;
  });

  // Extract raw inputs
  const headerDateText = userEdits.headerDate || cluesMap.publishDate?.source?.raw || cluesMap.publishDate?.value || null;
  const tooltipDateText = userEdits.tooltipDate || cluesMap.publishDate?.source?.parsed?.raw || cluesMap.chartTooltip?.value || null;
  const rawTotalViews = userEdits.targetViews || cluesMap.totalViews?.note || String(cluesMap.totalViews?.value || '');
  const rawWatchHours = userEdits.watchHours || cluesMap.watchHours?.note || String(cluesMap.watchHours?.value || '');
  const rawViews48h = userEdits.views48h || cluesMap.views48h?.value || null;
  const vsNormalRatio = userEdits.vsNormalRatio || cluesMap.vsNormalRatio?.value || null;
  const captureAgeDays = userEdits.captureAgeDays || cluesMap.captureAgeDays?.value || null;
  const visibleChars = userEdits.exposedChar || cluesMap.visibleTitleChars?.value || null;
  const deltaText = userEdits.deltaText || cluesMap.vsNormalDelta?.value || null;

  // Derivations
  const publishWindow = derivePublishWindow({
    headerDateText,
    tooltipDateText,
    tzOffsetHours
  });

  const captureTime = deriveCaptureTime({
    publishLocalIso: publishWindow?.localWindow?.estimated,
    captureAgeDays,
    userOverride: userEdits.captureTimeLocal
  });

  const viewsAtCapture = deriveViewsAtCapture(rawTotalViews);

  const velocityAndExpected = deriveVelocityAndExpectedViews({
    views48h: rawViews48h,
    viewsAtCapture,
    captureTimeLocal: captureTime?.captureTimeLocal,
    nowLocalMs
  });

  const baselineViews = deriveBaselineViews({
    viewsAtCapture,
    vsNormalRatio,
    deltaText
  });

  const avgViewDuration = deriveAvgViewDuration({
    watchHoursText: rawWatchHours,
    totalViewsText: rawTotalViews,
    watchHoursValue: cluesMap.watchHours?.value,
    totalViewsValue: viewsAtCapture?.value
  });

  const languageHint = deriveLanguageHint(visibleChars, userEdits.regionCode);

  return {
    imageId,
    fileName,
    screenType,
    clues,
    publishWindow,
    captureTime,
    viewsAtCapture,
    velocityAndExpected,
    baselineViews,
    avgViewDuration,
    languageHint,
    tzOffsetHours,
    hasAnchor: Boolean(publishWindow?.localWindow || viewsAtCapture)
  };
}

module.exports = {
  derivePublishWindow,
  deriveCaptureTime,
  deriveViewsAtCapture,
  deriveVelocityAndExpectedViews,
  deriveBaselineViews,
  deriveAvgViewDuration,
  deriveLanguageHint,
  computeSameChannelLikelihood,
  buildCaseFileFromClues
};
