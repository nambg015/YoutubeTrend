/**
 * Trends Provider Interface & Core Implementations for YouTrend Công cụ v2
 */

// Base Interface
class TrendsProvider {
  constructor(name = 'base') {
    this.name = name;
  }

  /**
   * Fetch or provide series for keywords
   * @param {Object} params - { keywords, geo, range }
   * @returns {Promise<Object>} Map of keyword -> { series: [{date, value}], isPartial, relatedQueries }
   */
  async getTrends(params) {
    throw new Error('TrendsProvider.getTrends must be implemented by subclass');
  }
}

/**
 * Mock Provider for development, testing, and offline usage
 */
class MockProvider extends TrendsProvider {
  constructor() {
    super('mock');
  }

  async getTrends({ keywords = [], geo = 'VN', range = 'today 3-m' }) {
    const pointsCount = range.includes('5-y') ? 60 : range.includes('12-m') ? 52 : 12;
    const result = {};
    const now = Date.now();
    const intervalMs = (range.includes('5-y') ? 30 : 7) * 24 * 3600 * 1000;

    keywords.forEach((kw, kwIdx) => {
      const baseSeed = (kw.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + kwIdx * 17) % 70 + 20;
      const series = [];

      for (let i = pointsCount - 1; i >= 0; i--) {
        const d = new Date(now - i * intervalMs);
        const dateStr = d.toISOString().slice(0, 10);
        // Trend wave simulation
        const noise = Math.sin((pointsCount - i) / 2) * 15 + ((i % 3) - 1) * 5;
        const val = Math.max(0, Math.min(100, Math.round(baseSeed + noise)));
        series.push({
          date: dateStr,
          value: val
        });
      }

      result[kw] = {
        keyword: kw,
        geo,
        range,
        series,
        isPartial: false,
        metrics: calculateTrendMetrics(series),
        relatedQueries: {
          top: [
            { query: `${kw} kiếm tiền`, value: 100 },
            { query: `${kw} youtube`, value: 85 },
            { query: `cách làm ${kw}`, value: 65 }
          ],
          rising: [
            { query: `${kw} 2026`, value: '+350%' },
            { query: `học ${kw} cơ bản`, value: '+180%' }
          ]
        },
        provider: 'mock'
      };
    });

    return result;
  }
}

/**
 * Cleans header column name to extract clean keyword
 * Examples:
 * "youtube: (Việt Nam)" -> "youtube"
 * "make money: (United States)" -> "make money"
 * "thời trang: (Toàn cầu)" -> "thời trang"
 * "Date" -> "date"
 */
function extractKeywordFromHeader(colName) {
  if (!colName) return '';
  let clean = colName.trim();
  // Remove BOM if present
  clean = clean.replace(/^\uFEFF/, '');
  // Match "keyword: (Region)" or "keyword:(Region)"
  const match = clean.match(/^(.*?):\s*\((.*?)\)$/);
  if (match) {
    return match[1].trim();
  }
  return clean;
}

/**
 * Resilient Google Trends CSV Parser
 * - Strips UTF-8 BOM (\uFEFF)
 * - Identifies header line (Vietnamese or English)
 * - Converts "<1" to 0.5
 * - Converts locale decimal separators
 * - Returns structured timeseries and parsed metadata
 */
function parseGoogleTrendsCsv(csvString) {
  if (!csvString || typeof csvString !== 'string') {
    throw new Error('CSV content must be a non-empty string');
  }

  // 1. Remove UTF-8 BOM
  let raw = csvString.replace(/^\uFEFF/, '').trim();
  const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  if (lines.length < 2) {
    throw new Error('CSV file has too few lines');
  }

  // 2. Find header line containing "Ngày", "Tuần", "Tháng", "Date", "Week", "Month"
  let headerIndex = -1;
  let isRelatedQueries = false;

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const lower = lines[i].toLowerCase();
    if (
      lower.startsWith('ngày,') || 
      lower.startsWith('tuần,') || 
      lower.startsWith('tháng,') ||
      lower.startsWith('date,') || 
      lower.startsWith('week,') || 
      lower.startsWith('month,') ||
      lower.includes(',date') ||
      lower.includes(',ngày')
    ) {
      headerIndex = i;
      break;
    }
    if (lower.includes('truy vấn có liên quan') || lower.includes('related queries')) {
      isRelatedQueries = true;
    }
  }

  if (isRelatedQueries && headerIndex === -1) {
    return parseRelatedQueriesCsv(lines);
  }

  if (headerIndex === -1) {
    // Fallback: check line 1 or 2
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (lines[i].includes(': (') || lines[i].includes(':(')) {
        headerIndex = i;
        break;
      }
    }
  }

  if (headerIndex === -1) {
    throw new Error('Could not detect Google Trends header row in CSV');
  }

  // 3. Parse headers
  const headerCols = splitCsvLine(lines[headerIndex]);
  const dateColName = headerCols[0];
  const keywordCols = headerCols.slice(1).map(c => extractKeywordFromHeader(c));

  const seriesByDate = [];
  const keywordSeriesMap = {};
  keywordCols.forEach(k => {
    keywordSeriesMap[k] = [];
  });

  // 4. Parse data rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    // Check if entered another section (e.g. Related Queries after blank line)
    if (!line || line.toLowerCase().includes('truy vấn') || line.toLowerCase().includes('related')) {
      break;
    }
    const cols = splitCsvLine(line);
    if (cols.length < 2) continue;

    const dateVal = cols[0].trim();
    // Validate date format (YYYY-MM-DD or similar)
    if (!/\d{4}/.test(dateVal)) continue;

    const rowObj = { date: dateVal, values: {} };

    for (let j = 1; j < headerCols.length; j++) {
      const kw = keywordCols[j - 1];
      const rawVal = (cols[j] || '').trim();
      let numVal = 0;

      if (rawVal === '<1') {
        numVal = 0.5;
      } else {
        // Replace comma decimal with dot if formatted e.g. "0,5"
        const sanitized = rawVal.replace(',', '.').replace(/[^0-9.]/g, '');
        numVal = parseFloat(sanitized);
        if (isNaN(numVal)) numVal = 0;
      }

      rowObj.values[kw] = numVal;
      if (keywordSeriesMap[kw]) {
        keywordSeriesMap[kw].push({ date: dateVal, value: numVal });
      }
    }

    seriesByDate.push(rowObj);
  }

  return {
    type: 'interest_over_time',
    dateColumn: dateColName,
    keywords: keywordCols,
    seriesByDate,
    keywordSeriesMap,
    rowCount: seriesByDate.length,
    isPartial: false
  };
}

/**
 * Split a CSV line respecting possible double quotes
 */
function splitCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses Google Trends Related Queries CSV (Top and Rising queries)
 */
function parseRelatedQueriesCsv(lines) {
  const top = [];
  const rising = [];
  let currentSection = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes('hàng đầu') || lower.includes('top')) {
      currentSection = 'top';
      continue;
    }
    if (lower.includes('gia tăng') || lower.includes('rising')) {
      currentSection = 'rising';
      continue;
    }
    const cols = splitCsvLine(line);
    if (cols.length >= 2 && currentSection) {
      const query = cols[0];
      const val = cols[1];
      if (query && val && query !== 'Truy vấn' && query !== 'Query') {
        if (currentSection === 'top') {
          top.push({ query, value: parseInt(val, 10) || val });
        } else {
          rising.push({ query, value: val });
        }
      }
    }
  }

  return {
    type: 'related_queries',
    top,
    rising
  };
}

/**
 * Calculates trend analytical metrics from a single keyword timeseries
 * - avgValue: Mean interest (0-100)
 * - slope: 4-week recent vs preceding 8-week ratio (momentum)
 * - volatility: Standard deviation of points
 * - isSpike: True if sharp spike that quickly falls
 * - isEvergreen: True if stable variation with high baseline
 */
function calculateTrendMetrics(series = []) {
  if (!Array.isArray(series) || series.length === 0) {
    return {
      avgValue: 0,
      recentAvg: 0,
      priorAvg: 0,
      slope: 1,
      momentum: 0,
      volatility: 0,
      isSpike: false,
      isEvergreen: false,
      trendType: 'unknown'
    };
  }

  const values = series.map(s => Number(s.value) || 0);
  const total = values.reduce((sum, v) => sum + v, 0);
  const avgValue = Math.round((total / values.length) * 10) / 10;

  // Recent 4 weeks vs preceding 8 weeks
  const n = values.length;
  const recent4 = values.slice(Math.max(0, n - 4));
  const prior8 = values.slice(Math.max(0, n - 12), Math.max(0, n - 4));

  const recentAvg = recent4.length ? recent4.reduce((s, v) => s + v, 0) / recent4.length : avgValue;
  const priorAvg = prior8.length ? prior8.reduce((s, v) => s + v, 0) / prior8.length : avgValue;

  let slope = 1;
  let momentum = 0; // % change
  if (priorAvg > 0) {
    slope = Math.round((recentAvg / priorAvg) * 100) / 100;
    momentum = Math.round(((recentAvg - priorAvg) / priorAvg) * 100);
  } else if (recentAvg > 0) {
    slope = 2.0;
    momentum = 100;
  }

  // Volatility (standard deviation)
  const variance = values.reduce((acc, v) => acc + Math.pow(v - avgValue, 2), 0) / values.length;
  const volatility = Math.round(Math.sqrt(variance) * 10) / 10;

  // Spike detection: peak is > 3x average and recent points dropped back near baseline
  const maxVal = Math.max(...values);
  const minVal = Math.min(...values);
  const isSpike = maxVal >= 70 && maxVal > avgValue * 2.5 && recentAvg < maxVal * 0.5;

  // Evergreen detection: consistently high baseline (minVal > 15), low volatility (< 25), avg > 30
  const isEvergreen = avgValue >= 30 && minVal >= 10 && volatility <= 22;

  let trendType = 'neutral';
  if (momentum >= 25) trendType = 'rising';
  else if (momentum <= -25) trendType = 'falling';
  else if (isEvergreen) trendType = 'evergreen';
  else if (isSpike) trendType = 'spike';

  return {
    avgValue,
    recentAvg: Math.round(recentAvg * 10) / 10,
    priorAvg: Math.round(priorAvg * 10) / 10,
    slope,
    momentum,
    volatility,
    isSpike,
    isEvergreen,
    trendType
  };
}

/**
 * Anchor Cross-Batch Normalization (Chuẩn hoá chéo batch theo từ neo)
 * 
 * Rules:
 * - Each batch contains 4 target keywords + 1 anchor keyword (e.g. "youtube" or designated anchor).
 * - Values in Google Trends are relative to the highest peak in that specific 5-keyword batch (=100).
 * - Cross-batch formula:
 *     V_normalized(kw, t) = V_batch(kw, t) * (Anchor_reference(t) / Anchor_batch(t))
 *   With numerical safeguards against division by zero (using average anchor ratio).
 * 
 * @param {Array<Object>} batchResults - Array of parsed CSV results or { keywords, keywordSeriesMap }
 * @param {string} anchorKeyword - The designated anchor keyword present in all batches
 * @returns {Object} { normalizedSeriesMap, anchorSummary, notes }
 */
function normalizeCrossBatches(batchResults = [], anchorKeyword) {
  if (!Array.isArray(batchResults) || batchResults.length === 0) {
    throw new Error('batchResults must be a non-empty array');
  }
  if (!anchorKeyword || typeof anchorKeyword !== 'string') {
    throw new Error('anchorKeyword must be specified');
  }

  const cleanAnchor = anchorKeyword.trim().toLowerCase();

  // Find reference batch (Batch 0 or the batch with the strongest anchor signal)
  const refBatch = batchResults[0];
  const refAnchorSeries = refBatch.keywordSeriesMap[
    Object.keys(refBatch.keywordSeriesMap).find(k => k.toLowerCase() === cleanAnchor)
  ];

  if (!refAnchorSeries || refAnchorSeries.length === 0) {
    throw new Error(`Anchor keyword "${anchorKeyword}" not found in reference batch (Batch 1)`);
  }

  // Calculate baseline anchor average in reference batch
  const refAnchorAvg = refAnchorSeries.reduce((s, p) => s + p.value, 0) / refAnchorSeries.length;
  if (refAnchorAvg === 0) {
    throw new Error(`Anchor keyword "${anchorKeyword}" has zero average in reference batch`);
  }

  const normalizedSeriesMap = {};

  // Store reference batch keywords as-is
  Object.keys(refBatch.keywordSeriesMap).forEach(kw => {
    const isAnchor = kw.toLowerCase() === cleanAnchor;
    normalizedSeriesMap[kw] = {
      keyword: kw,
      isAnchor,
      series: refBatch.keywordSeriesMap[kw].map(p => ({ date: p.date, value: p.value })),
      metrics: calculateTrendMetrics(refBatch.keywordSeriesMap[kw])
    };
  });

  // Normalize subsequent batches
  for (let bIdx = 1; bIdx < batchResults.length; bIdx++) {
    const currentBatch = batchResults[bIdx];
    const batchAnchorKey = Object.keys(currentBatch.keywordSeriesMap).find(k => k.toLowerCase() === cleanAnchor);
    const batchAnchorSeries = batchAnchorKey ? currentBatch.keywordSeriesMap[batchAnchorKey] : null;

    if (!batchAnchorSeries || batchAnchorSeries.length === 0) {
      throw new Error(`Anchor keyword "${anchorKeyword}" not found in Batch ${bIdx + 1}`);
    }

    const batchAnchorAvg = batchAnchorSeries.reduce((s, p) => s + p.value, 0) / batchAnchorSeries.length;
    // Anchor ratio for entire batch (smooth fallback if point-by-point has zero)
    const overallRatio = batchAnchorAvg > 0 ? (refAnchorAvg / batchAnchorAvg) : 1;

    // Build anchor date lookup map
    const anchorByDate = {};
    batchAnchorSeries.forEach(p => { anchorByDate[p.date] = p.value; });
    const refAnchorByDate = {};
    refAnchorSeries.forEach(p => { refAnchorByDate[p.date] = p.value; });

    // Normalize each keyword in this batch
    Object.keys(currentBatch.keywordSeriesMap).forEach(kw => {
      if (kw.toLowerCase() === cleanAnchor) return; // anchor already in map

      const rawSeries = currentBatch.keywordSeriesMap[kw];
      const scaledSeries = rawSeries.map(p => {
        const batchAnchorVal = anchorByDate[p.date];
        const refAnchorVal = refAnchorByDate[p.date];

        let scaledVal = p.value;
        if (batchAnchorVal !== undefined && refAnchorVal !== undefined && batchAnchorVal > 0) {
          // Precise point-by-point cross-batch normalization
          scaledVal = p.value * (refAnchorVal / batchAnchorVal);
        } else {
          // Smooth fallback via batch average ratio
          scaledVal = p.value * overallRatio;
        }

        // Clamp between 0 and 100 for standardized visualization
        const clampedVal = Math.max(0, Math.min(100, Math.round(scaledVal * 10) / 10));
        return {
          date: p.date,
          value: clampedVal,
          rawBatchValue: p.value
        };
      });

      normalizedSeriesMap[kw] = {
        keyword: kw,
        isAnchor: false,
        series: scaledSeries,
        metrics: calculateTrendMetrics(scaledSeries),
        batchIndex: bIdx,
        scalingRatioApplied: Math.round(overallRatio * 100) / 100
      };
    });
  }

  return {
    anchorKeyword,
    referenceAnchorAverage: Math.round(refAnchorAvg * 10) / 10,
    normalizedSeriesMap,
    notes: 'Số liệu chuẩn hoá tương đối, xấp xỉ dựa trên đối chiếu từ neo chung.'
  };
}

/**
 * Builds batches of 4 keywords + 1 anchor and creates official Google Trends explore URLs
 */
function createTrendsBatches(keywords = [], anchorKeyword = 'youtube', geo = 'VN', range = 'today 12-m') {
  const cleanAnchor = (anchorKeyword || 'youtube').trim();
  const nonAnchorKeywords = keywords.filter(k => k.trim().toLowerCase() !== cleanAnchor.toLowerCase());

  const batches = [];
  const batchSize = 4;

  for (let i = 0; i < nonAnchorKeywords.length; i += batchSize) {
    const chunk = nonAnchorKeywords.slice(i, i + batchSize);
    const batchKeywords = [...chunk, cleanAnchor];
    const encodedQ = batchKeywords.map(k => encodeURIComponent(k.trim())).join(',');
    const url = `https://trends.google.com/trends/explore?date=${encodeURIComponent(range)}&geo=${encodeURIComponent(geo)}&hl=vi&q=${encodedQ}`;

    batches.push({
      batchIndex: Math.floor(i / batchSize) + 1,
      targetKeywords: chunk,
      anchorKeyword: cleanAnchor,
      allKeywords: batchKeywords,
      url,
      geo,
      range,
      status: 'pending' // 'pending' | 'imported'
    });
  }

  return batches;
}

module.exports = {
  TrendsProvider,
  MockProvider,
  parseGoogleTrendsCsv,
  parseRelatedQueriesCsv,
  calculateTrendMetrics,
  normalizeCrossBatches,
  createTrendsBatches,
  extractKeywordFromHeader,
  splitCsvLine
};
