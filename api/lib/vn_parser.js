/**
 * Vietnamese & Standard Number Parser for YouTube Studio Analytics
 */

function detectMultiplier(s) {
  if (/(?:^|[^a-z0-9])tỷ(?:\b|$)|[0-9]\s*(?:tỷ|b)(?:\b|$)/i.test(s)) {
    return 1000000000;
  }
  if (/(?:^|[^a-z0-9])(?:tr|triệu)(?:\b|$)|[0-9]\s*(?:tr|triệu|m)(?:\b|$)/i.test(s)) {
    return 1000000;
  }
  if (/(?:^|[^a-z0-9])(?:nghìn|ngàn)(?:\b|$)|[0-9]\s*(?:n|k|nghìn|ngàn)(?:\b|$)/i.test(s)) {
    return 1000;
  }
  return 1;
}

function parseVNNumber(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  if (!s) return null;

  const multiplier = detectMultiplier(s);

  // Extract numeric portion (including decimals/separators)
  const numPartMatch = s.match(/([0-9]+(?:[.,][0-9]+)*)/);
  if (!numPartMatch) return null;
  let numStr = numPartMatch[1];

  // Case 1: Has unit suffix (N, Tr, M, K)
  if (multiplier > 1) {
    if (numStr.includes('.') && numStr.includes(',')) {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    } else if (numStr.includes(',')) {
      const parts = numStr.split(',');
      if (parts.length === 2 && parts[1].length <= 3) {
        numStr = parts[0] + '.' + parts[1];
      } else {
        numStr = numStr.replace(/,/g, '');
      }
    } else if (numStr.includes('.')) {
      const parts = numStr.split('.');
      if (parts.length === 2 && parts[1].length <= 3) {
        numStr = parts[0] + '.' + parts[1];
      } else {
        numStr = numStr.replace(/\./g, '');
      }
    }
    const baseVal = parseFloat(numStr);
    if (isNaN(baseVal)) return null;
    return Math.round(baseVal * multiplier);
  }

  // Case 2: No unit suffix (pure numbers like "20.869", "1.234.567", "717")
  if (numStr.includes('.') && numStr.includes(',')) {
    const lastDot = numStr.lastIndexOf('.');
    const lastComma = numStr.lastIndexOf(',');
    if (lastDot > lastComma) {
      numStr = numStr.replace(/,/g, '');
    } else {
      numStr = numStr.replace(/\./g, '').replace(',', '.');
    }
    return Math.round(parseFloat(numStr));
  }

  if (numStr.includes('.')) {
    const parts = numStr.split('.');
    const isThousands = parts.slice(1).every(p => p.length === 3);
    if (isThousands) {
      return parseInt(numStr.replace(/\./g, ''), 10);
    } else {
      return Math.round(parseFloat(numStr));
    }
  }

  if (numStr.includes(',')) {
    const parts = numStr.split(',');
    const isThousands = parts.slice(1).every(p => p.length === 3);
    if (isThousands) {
      return parseInt(numStr.replace(/,/g, ''), 10);
    } else {
      return Math.round(parseFloat(numStr.replace(',', '.')));
    }
  }

  const res = parseInt(numStr, 10);
  return isNaN(res) ? null : res;
}

function getVNNumberBounds(str) {
  if (str === null || str === undefined) return null;
  const s = String(str).trim();
  const val = parseVNNumber(s);
  if (val === null) return null;

  const multiplier = detectMultiplier(s);

  if (multiplier === 1) {
    return { value: val, min: val, max: val, isRounded: false, step: 1 };
  }

  const numPartMatch = s.match(/([0-9]+(?:[.,][0-9]+)*)/);
  let decimals = 0;
  if (numPartMatch) {
    const numStr = numPartMatch[1];
    const decMatch = numStr.match(/[.,]([0-9]+)$/);
    if (decMatch && decMatch[1].length <= 3) {
      decimals = decMatch[1].length;
    }
  }

  let step = multiplier / Math.pow(10, decimals);
  // YouTube Studio Vietnamese UI rounds to 0.1 Tr even when displaying integer "1 Tr"
  if (multiplier === 1000000 && decimals === 0) {
    step = 100000;
  } else if (multiplier === 1000000000 && decimals === 0) {
    step = 100000000;
  }
  const halfStep = step / 2;

  return {
    value: val,
    min: Math.max(0, Math.round(val - halfStep)),
    max: Math.round(val + halfStep),
    isRounded: true,
    step: step
  };
}

function parseDeltaVsNormal(str) {
  if (!str) return null;
  const s = String(str).trim();
  // e.g. "cao hơn 2,3 Tr/118,9 N" or "2,3 Tr/118,9 N" or "cao hơn 981,6 N"
  const m = s.match(/(?:cao\s*hơn\s*)?([0-9.,]+\s*(?:tỷ|tr|triệu|m|k|n|nghìn|ngàn|b)?)(?:\s*\/\s*([0-9.,]+\s*(?:tỷ|tr|triệu|m|k|n|nghìn|ngàn|b|h|giờ)?))?/i);
  if (!m) return null;

  const viewsDelta = m[1] ? parseVNNumber(m[1]) : null;
  const watchHoursDelta = m[2] ? parseVNNumber(m[2]) : null;

  return {
    viewsDelta,
    watchHoursDelta,
    raw: s
  };
}

module.exports = {
  detectMultiplier,
  parseVNNumber,
  getVNNumberBounds,
  parseDeltaVsNormal
};

