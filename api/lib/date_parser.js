/**
 * YouTube Studio Date Parser for Vercel deployment
 */

const MONTH_MAP = {
  'thg 1': 1, 'thg 01': 1, 'tháng 1': 1, 'tháng 01': 1,
  'thg 2': 2, 'thg 02': 2, 'tháng 2': 2, 'tháng 02': 2,
  'thg 3': 3, 'thg 03': 3, 'tháng 3': 3, 'tháng 03': 3,
  'thg 4': 4, 'thg 04': 4, 'tháng 4': 4, 'tháng 04': 4,
  'thg 5': 5, 'thg 05': 5, 'tháng 5': 5, 'tháng 05': 5,
  'thg 6': 6, 'thg 06': 6, 'tháng 6': 6, 'tháng 06': 6,
  'thg 7': 7, 'thg 07': 7, 'tháng 7': 7, 'tháng 07': 7,
  'thg 8': 8, 'thg 08': 8, 'tháng 8': 8, 'tháng 08': 8,
  'thg 9': 9, 'thg 09': 9, 'tháng 9': 9, 'tháng 09': 9,
  'thg 10': 10, 'tháng 10': 10,
  'thg 11': 11, 'tháng 11': 11,
  'thg 12': 12, 'tháng 12': 12,
  'jan': 1, 'january': 1,
  'feb': 2, 'february': 2,
  'mar': 3, 'march': 3,
  'apr': 4, 'april': 4,
  'may': 5,
  'jun': 6, 'june': 6,
  'jul': 7, 'july': 7,
  'aug': 8, 'august': 8,
  'sep': 9, 'sept': 9, 'september': 9,
  'oct': 10, 'october': 10,
  'nov': 11, 'november': 11,
  'dec': 12, 'december': 12
};

function formatIso(year, month, day) {
  const y = String(year);
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysToIso(isoDateStr, days) {
  if (!isoDateStr) return null;
  const d = new Date(isoDateStr + 'T00:00:00Z');
  if (isNaN(d.getTime())) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function parseSingleDateToken(str) {
  if (!str) return null;
  const s = String(str).trim();

  const isoMatch = s.match(/\b(20[2-3][0-9])-(0?[1-9]|1[0-2])-(0?[1-9]|[12][0-9]|3[01])\b/);
  if (isoMatch) {
    return formatIso(isoMatch[1], isoMatch[2], isoMatch[3]);
  }

  const slashMatch = s.match(/\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[0-2])[\/\-](20[2-3][0-9])\b/);
  if (slashMatch) {
    return formatIso(slashMatch[3], slashMatch[2], slashMatch[1]);
  }

  const vnMatch = s.match(/\b(0?[1-9]|[12][0-9]|3[01])\s*(?:thg|tháng)\s*(0?[1-9]|1[0-2])(?:,?\s*(?:năm\s*)?(20[2-3][0-9]))?\b/i);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    const year = vnMatch[3] ? parseInt(vnMatch[3], 10) : new Date().getFullYear();
    return formatIso(year, month, day);
  }

  const enMatch1 = s.match(/\b([a-z]+)\s+(0?[1-9]|[12][0-9]|3[01]),?\s*(20[2-3][0-9])\b/i);
  if (enMatch1) {
    const mStr = enMatch1[1].toLowerCase();
    if (MONTH_MAP[mStr]) {
      return formatIso(enMatch1[3], MONTH_MAP[mStr], enMatch1[2]);
    }
  }

  const enMatch2 = s.match(/\b(0?[1-9]|[12][0-9]|3[01])\s+([a-z]+),?\s*(20[2-3][0-9])\b/i);
  if (enMatch2) {
    const mStr = enMatch2[2].toLowerCase();
    if (MONTH_MAP[mStr]) {
      return formatIso(enMatch2[3], MONTH_MAP[mStr], enMatch2[1]);
    }
  }

  return null;
}

function parseChartTooltipDate(text) {
  if (!text) return null;
  const s = String(text);

  const elapsedMatch = s.match(/\((\d+)\s*(?:ngày|days?)(?:\s*(\d+)\s*(?:giờ|hours?))?[^\)]*đầu tiên/i) ||
                       s.match(/\((\d+)\s*(?:ngày|days?)(?:\s*(\d+)\s*(?:giờ|hours?))?[^\)]*since/i) ||
                       s.match(/(\d+)\s*(?:ngày|days?)(?:\s*(\d+)\s*(?:giờ|hours?))?\s*(?:đầu tiên|first)/i);

  if (!elapsedMatch) return null;

  const daysElapsed = parseInt(elapsedMatch[1], 10);
  const hoursElapsed = elapsedMatch[2] ? parseInt(elapsedMatch[2], 10) : 0;

  const baseDateIso = parseSingleDateToken(s);
  if (!baseDateIso) return null;

  const baseDate = new Date(baseDateIso + 'T12:00:00Z');
  const totalMsElapsed = (daysElapsed * 24 + hoursElapsed) * 3600 * 1000;
  const pubDate = new Date(baseDate.getTime() - totalMsElapsed);

  const estimatedPublishIso = pubDate.toISOString().slice(0, 10);

  return {
    baseDate: baseDateIso,
    daysElapsed,
    hoursElapsed,
    estimatedPublishIso,
    uncertaintyRange: [
      addDaysToIso(estimatedPublishIso, -1),
      addDaysToIso(estimatedPublishIso, 1)
    ]
  };
}

function parseStudioDate(text, options = {}) {
  if (!text) return null;
  const raw = String(text).trim();
  const lower = raw.toLowerCase();

  const isPublishedSince = lower.includes('từ khi xuất bản') ||
                           lower.includes('since published') ||
                           lower.includes('tới nay') ||
                           lower.includes('đến nay') ||
                           lower.includes('to present');

  const tooltipResult = parseChartTooltipDate(raw);
  if (tooltipResult) {
    const pubIso = tooltipResult.estimatedPublishIso;
    return {
      publishDate: pubIso,
      startDate: pubIso,
      endDate: tooltipResult.baseDate,
      paddedStart: addDaysToIso(pubIso, -1),
      paddedEnd: addDaysToIso(pubIso, 1),
      isPublishedSince: true,
      source: 'tooltip',
      daysElapsed: tooltipResult.daysElapsed,
      raw
    };
  }

  const rangeParts = raw.split(/\s*(?:–|—|-|tới|đến|to)\s*/i);
  if (rangeParts.length >= 2) {
    const firstPart = rangeParts[0].trim();
    const secondPart = rangeParts.slice(1).join(' ').trim();

    const startDateIso = parseSingleDateToken(firstPart);
    let endDateIso = parseSingleDateToken(secondPart);

    if (startDateIso) {
      if (isPublishedSince || !endDateIso) {
        return {
          publishDate: startDateIso,
          startDate: startDateIso,
          endDate: endDateIso || new Date().toISOString().slice(0, 10),
          paddedStart: addDaysToIso(startDateIso, -1),
          paddedEnd: addDaysToIso(startDateIso, 1),
          isPublishedSince: true,
          source: 'header_range',
          raw
        };
      } else {
        return {
          publishDate: isPublishedSince ? startDateIso : null,
          startDate: startDateIso,
          endDate: endDateIso,
          paddedStart: addDaysToIso(startDateIso, -1),
          paddedEnd: addDaysToIso(startDateIso, 1),
          isPublishedSince,
          source: 'range',
          raw
        };
      }
    }
  }

  const singleIso = parseSingleDateToken(raw);
  if (singleIso) {
    return {
      publishDate: isPublishedSince ? singleIso : singleIso,
      startDate: singleIso,
      endDate: singleIso,
      paddedStart: addDaysToIso(singleIso, -1),
      paddedEnd: addDaysToIso(singleIso, 1),
      isPublishedSince,
      source: 'single',
      raw
    };
  }

  return null;
}

module.exports = {
  MONTH_MAP,
  formatIso,
  addDaysToIso,
  parseSingleDateToken,
  parseChartTooltipDate,
  parseStudioDate
};
