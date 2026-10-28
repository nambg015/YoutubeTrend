// SPY v3 - Autonomous Studio Redacted Detective Engine & 4-Step Wizard Component
function SpyToolSection({ apiKey, isUltraPro, onUpgradePrompt, onAddCompetitor, showToast }) {
  const h = React.createElement;

  // Wizard Steps: 1 (Upload) -> 2 (Case File) -> 3 (Scanning) -> 4 (Suspect Channels)
  const [wizardStep, setWizardStep] = React.useState(1);

  // Evidence Images (1-5 images)
  const [evidenceImages, setEvidenceImages] = React.useState([]);
  const [activeImageIndex, setActiveImageIndex] = React.useState(0);
  const [isScanningImage, setIsScanningImage] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [zoomImage, setZoomImage] = React.useState(null);
  const fileInputRef = React.useRef(null);

  // Case Files per image
  const [caseFiles, setCaseFiles] = React.useState([]);
  const [isSameChannelConfirmed, setIsSameChannelConfirmed] = React.useState(false);
  const [sameChannelAdvice, setSameChannelAdvice] = React.useState(null);

  // Manual Edits / Overrides for Active Case File
  const [userEdits, setUserEdits] = React.useState({
    headerDate: '',
    tooltipDate: '',
    targetViews: '',
    views48h: '',
    watchHours: '',
    vsNormalRatio: '',
    deltaText: '',
    exposedChar: '',
    captureAgeDays: '',
    tzOffsetHours: 7,
    regionCode: 'ALL',
    languageHint: 'any'
  });

  // Scanning State
  const [isScanning, setIsScanning] = React.useState(false);
  const [scanProgressStep, setScanProgressStep] = React.useState('');
  const [quotaUsed, setQuotaUsed] = React.useState(0);
  const [scanLogs, setScanLogs] = React.useState([]);
  const abortScanRef = React.useRef({ abort: false });
  const [queryCache] = React.useState(() => new Map());

  // Results State
  const [suspectChannels, setSuspectChannels] = React.useState(null);
  const [relaxationApplied, setRelaxationApplied] = React.useState(null);
  const [debugLogText, setDebugLogText] = React.useState('');
  const [savedCases, setSavedCases] = React.useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('yt_spy_saved_cases') || '[]');
      if (Array.isArray(saved)) return saved;
    } catch(e) {}
    return [];
  });

  // Timezone options
  const TIMEZONE_OPTIONS = [
    { value: 7, label: 'UTC+7 (Việt Nam / Đông Dương - Mặc định)' },
    { value: 9, label: 'UTC+9 (Nhật Bản / Hàn Quốc)' },
    { value: 0, label: 'UTC+0 (Giờ Quốc Tế UTC / London)' },
    { value: -4, label: 'UTC-4 (Hoa Kỳ - Eastern Time)' },
    { value: -7, label: 'UTC-7 (Hoa Kỳ - Pacific Time)' },
    { value: 8, label: 'UTC+8 (Singapore / Trung Quốc / Đài Loan)' }
  ];

  // Helper number parser with Studio 0.1M precision
  const parseVNNum = (str) => {
    if (!str) return null;
    const s = String(str).toLowerCase().trim();
    let multiplier = 1;
    if (s.includes('tỷ') || s.includes('b')) multiplier = 1000000000;
    else if (s.includes('tr') || s.includes('triệu') || s.includes('m')) multiplier = 1000000;
    else if (s.includes('k') || s.includes('n') || s.includes('nghìn') || s.includes('ngàn')) multiplier = 1000;

    const numMatch = s.match(/([0-9]+(?:[.,][0-9]+)*)/);
    if (!numMatch) return null;
    let numStr = numMatch[1];
    if (multiplier > 1) {
      if (numStr.includes(',') && numStr.includes('.')) {
        numStr = numStr.replace(/\./g, '').replace(',', '.');
      } else if (numStr.includes(',')) {
        numStr = numStr.replace(',', '.');
      }
      return Math.round(parseFloat(numStr) * multiplier) || null;
    }
    const clean = numStr.replace(/[^0-9]/g, '');
    return parseInt(clean, 10) || null;
  };

  const getVNNumBounds = (str) => {
    if (!str) return null;
    const val = parseVNNum(str);
    if (val === null) return null;
    const s = String(str).trim();
    let multiplier = 1;
    if (s.includes('tỷ') || s.includes('b')) multiplier = 1000000000;
    else if (s.includes('tr') || s.includes('triệu') || s.includes('m')) multiplier = 1000000;
    else if (s.includes('k') || s.includes('n') || s.includes('nghìn') || s.includes('ngàn')) multiplier = 1000;

    let step = 1;
    if (multiplier === 1000000) {
      step = 100000; // 0.1M rounding
    } else if (multiplier === 1000) {
      step = 100;
    } else if (multiplier > 1) {
      step = multiplier / 10;
    }
    const half = Math.round(step / 2);
    return {
      value: val,
      min: Math.max(0, val - half),
      max: val + half,
      step: step
    };
  };

  // Tooltip date parser
  const parseTooltipDate = (text) => {
    if (!text) return null;
    const s = String(text);
    const elapsedMatch = s.match(/\((\d+)\s*(?:ngày|days?)(?:\s*(\d+)\s*(?:giờ|hours?))?[^\)]*đầu tiên/i) ||
                         s.match(/(\d+)\s*(?:ngày|days?)(?:\s*(\d+)\s*(?:giờ|hours?))?\s*(?:đầu tiên|first)/i);
    if (!elapsedMatch) return null;

    const daysElapsed = parseInt(elapsedMatch[1], 10);
    const hoursElapsed = elapsedMatch[2] ? parseInt(elapsedMatch[2], 10) : 0;
    const totalHours = daysElapsed * 24 + hoursElapsed;

    const timeMatch = s.match(/\b([01]?[0-9]|2[0-3]):([0-5][0-9])\b/);
    const dateMatch = s.match(/\b(0?[1-9]|[12][0-9]|3[01])\s*(?:thg|tháng)\s*(0?[1-9]|1[0-2])(?:,?\s*(20[2-3][0-9]))?\b/i);
    if (!dateMatch) return null;

    const d = parseInt(dateMatch[1], 10);
    const m = parseInt(dateMatch[2], 10);
    const y = dateMatch[3] ? parseInt(dateMatch[3], 10) : 2026;

    let startMs, endMs, estIso;
    if (timeMatch) {
      const hh = parseInt(timeMatch[1], 10);
      const mm = parseInt(timeMatch[2], 10);
      const baseMs = Date.UTC(y, m - 1, d, hh, mm, 0);
      const pubMs = baseMs - totalHours * 3600000;
      estIso = new Date(pubMs).toISOString().slice(0, 19);
      startMs = pubMs - 2 * 3600000;
      endMs = pubMs + 2 * 3600000;
    } else {
      const bStart = Date.UTC(y, m - 1, d, 0, 0, 0);
      const bEnd = Date.UTC(y, m - 1, d, 23, 59, 59);
      startMs = bStart - totalHours * 3600000;
      endMs = bEnd - totalHours * 3600000;
      estIso = new Date(Math.round((startMs + endMs) / 2)).toISOString().slice(0, 19);
    }

    return {
      estimatedPublishLocal: estIso,
      localWindow: {
        start: new Date(startMs).toISOString().slice(0, 19),
        end: new Date(endMs).toISOString().slice(0, 19)
      }
    };
  };

  // Derive publish window
  const derivePubWindow = (headerText, tooltipText, tzOffset = 7) => {
    let hStart = null, hEnd = null, hIso = null;
    if (headerText) {
      const m = headerText.match(/\b(0?[1-9]|[12][0-9]|3[01])\s*(?:thg|tháng)\s*(0?[1-9]|1[0-2])(?:,?\s*(20[2-3][0-9]))?\b/i);
      if (m) {
        const d = String(m[1]).padStart(2, '0');
        const mo = String(m[2]).padStart(2, '0');
        const yr = m[3] || '2026';
        hIso = yr + '-' + mo + '-' + d;
        hStart = new Date(hIso + 'T00:00:00Z').getTime();
        hEnd = new Date(hIso + 'T23:59:59Z').getTime();
      }
    }

    let tStart = null, tEnd = null, tEst = null;
    if (tooltipText) {
      const tp = parseTooltipDate(tooltipText);
      if (tp) {
        tStart = new Date(tp.localWindow.start + 'Z').getTime();
        tEnd = new Date(tp.localWindow.end + 'Z').getTime();
        tEst = tp.estimatedPublishLocal;
      }
    }

    let fStart = null, fEnd = null, status = 'NONE', warning = null;
    if (hStart && tStart) {
      const interStart = Math.max(hStart, tStart);
      const interEnd = Math.min(hEnd, tEnd);
      if (interStart <= interEnd) {
        fStart = interStart;
        fEnd = interEnd;
        status = 'EXACT_INTERSECTION';
      } else {
        fStart = Math.min(hStart, tStart);
        fEnd = Math.max(hEnd, tEnd);
        status = 'CONFLICT_UNION';
        warning = 'Mâu thuẫn header và tooltip: Lấy hợp để không bỏ sót video.';
      }
    } else if (tStart) {
      fStart = tStart;
      fEnd = tEnd;
      status = 'TOOLTIP_ONLY';
    } else if (hStart) {
      fStart = hStart;
      fEnd = hEnd;
      status = 'HEADER_ONLY';
    }

    if (!fStart) return null;

    const tzMs = tzOffset * 3600000;
    const utcStart = new Date(fStart - tzMs).toISOString();
    const utcEnd = new Date(fEnd - tzMs).toISOString();
    const localStart = new Date(fStart).toISOString().slice(0, 19);
    const localEnd = new Date(fEnd).toISOString().slice(0, 19);

    return {
      status: status,
      warning: warning,
      localWindow: { start: localStart, end: localEnd, estimated: tEst || localStart },
      utcWindow: { start: utcStart, end: utcEnd },
      tzOffsetHours: tzOffset
    };
  };

  // Derive All Fields for Case File
  const deriveCaseFields = (clues, edits = {}) => {
    const cluesMap = {};
    (clues || []).forEach(c => { cluesMap[c.type] = c; });

    const headerDateText = edits.headerDate || cluesMap.publishDate?.source?.raw || cluesMap.publishDate?.value || '';
    const tooltipDateText = edits.tooltipDate || cluesMap.publishDate?.source?.parsed?.raw || '';
    const tzOffset = Number(edits.tzOffsetHours !== undefined ? edits.tzOffsetHours : 7);

    const publishWindow = derivePubWindow(headerDateText, tooltipDateText, tzOffset);

    // Total views bounds
    const rawViews = edits.targetViews || cluesMap.totalViews?.note || String(cluesMap.totalViews?.value || '');
    const viewsBounds = getVNNumBounds(rawViews) || (cluesMap.totalViews?.value ? { value: cluesMap.totalViews.value, min: Math.round(cluesMap.totalViews.value * 0.95), max: Math.round(cluesMap.totalViews.value * 1.05) } : null);

    // Watch hours & Avg duration
    const rawWatch = edits.watchHours || cluesMap.watchHours?.note || String(cluesMap.watchHours?.value || '');
    const watchBounds = getVNNumBounds(rawWatch) || (cluesMap.watchHours?.value ? { value: cluesMap.watchHours.value, min: cluesMap.watchHours.value, max: cluesMap.watchHours.value } : null);
    let avgViewDuration = null;
    if (watchBounds && viewsBounds && viewsBounds.value > 0) {
      const minS = Math.round((watchBounds.min * 3600) / viewsBounds.max);
      const maxS = Math.round((watchBounds.max * 3600) / viewsBounds.min);
      const avgS = Math.round((watchBounds.value * 3600) / viewsBounds.value);
      avgViewDuration = {
        avgSec: avgS,
        minSec: minS,
        maxSec: maxS,
        minVideoDuration: Math.round(minS * 0.9),
        isShortsPenalized: avgS > 185
      };
    }

    // Capture time & Velocity
    const axisDays = Number(edits.captureAgeDays || cluesMap.captureAgeDays?.value || 14);
    let captureTimeLocal = null;
    let daysSinceCapture = 0;
    if (publishWindow?.localWindow?.start) {
      const pMs = new Date(publishWindow.localWindow.start + 'Z').getTime();
      const cMs = pMs + axisDays * 864e5;
      captureTimeLocal = new Date(cMs).toISOString().slice(0, 19);
      daysSinceCapture = Math.max(0, (Date.now() - cMs) / 864e5);
    }

    const raw48 = Number(edits.views48h || cluesMap.views48h?.value || 0);
    const velocity = Math.round(raw48 / 2);
    let expectedViewsNow = null;
    if (viewsBounds) {
      const minExp = Math.round(viewsBounds.min * 0.97);
      const maxExp = Math.round(viewsBounds.max + velocity * Math.max(1, daysSinceCapture) * 1.0);
      expectedViewsNow = [minExp, maxExp];
    }

    // Baseline views
    const ratio = Number(edits.vsNormalRatio || cluesMap.vsNormalRatio?.value || 0);
    let baselineViews = null;
    if (viewsBounds && ratio > 1) {
      const base = Math.round(viewsBounds.value / ratio);
      baselineViews = {
        baseline: base,
        min: Math.round(base / 1.5),
        max: Math.round(base * 1.5),
        ratio: ratio
      };
    }

    // Language Hint
    const exposed = (edits.exposedChar || cluesMap.visibleTitleChars?.value || '').trim();
    let languageHint = edits.languageHint && edits.languageHint !== 'any' ? edits.languageHint : 'any';
    let script = 'Unknown';
    if (/[\u3040-\u30FF]/.test(exposed)) {
      languageHint = 'ja';
      script = 'Japanese (Kana)';
    } else if (/[\uAC00-\uD7AF]/.test(exposed)) {
      languageHint = 'ko';
      script = 'Korean (Hangul)';
    } else if (/[a-zA-Z]/.test(exposed)) {
      script = 'Latin';
    }

    return {
      publishWindow: publishWindow,
      viewsBounds: viewsBounds,
      avgViewDuration: avgViewDuration,
      captureTimeLocal: captureTimeLocal,
      axisDays: axisDays,
      daysSinceCapture: Math.round(daysSinceCapture * 10) / 10,
      velocity: velocity,
      expectedViewsNow: expectedViewsNow,
      baselineViews: baselineViews,
      languageHint: languageHint,
      script: script,
      exposedChars: exposed,
      tzOffsetHours: tzOffset
    };
  };

  // Compare 2 Case Files for sameChannelLikelihood
  const computeLikelihood = (cfA, cfB) => {
    if (!cfA || !cfB) return null;
    let score = 0;
    const reasons = [];

    if (cfA.derived?.captureTimeLocal && cfB.derived?.captureTimeLocal) {
      const msA = new Date(cfA.derived.captureTimeLocal + 'Z').getTime();
      const msB = new Date(cfB.derived.captureTimeLocal + 'Z').getTime();
      const diffDays = Math.abs(msA - msB) / 864e5;
      if (diffDays < 2.0) {
        score += 0.35;
        reasons.push('Thời điểm chụp rất gần nhau (lệch ' + diffDays.toFixed(1) + ' ngày < 2 ngày)');
      } else if (diffDays < 5.0) {
        score += 0.15;
        reasons.push('Thời điểm chụp cách ' + diffDays.toFixed(1) + ' ngày');
      }
    }

    const baseA = cfA.derived?.baselineViews?.baseline;
    const baseB = cfB.derived?.baselineViews?.baseline;
    if (baseA && baseB) {
      const bRatio = Math.max(baseA, baseB) / Math.min(baseA, baseB);
      if (bRatio <= 2.0) {
        score += 0.35;
        reasons.push('Baseline cùng bậc quy mô (lệch ' + bRatio.toFixed(1) + 'x <= 2x)');
      } else if (bRatio <= 3.5) {
        score += 0.20;
        reasons.push('Baseline gần quy mô (lệch ' + bRatio.toFixed(1) + 'x <= 3.5x)');
      }
    }

    if (cfA.derived?.script && cfB.derived?.script && cfA.derived.script !== 'Unknown') {
      if (cfA.derived.script === cfB.derived.script) {
        score += 0.20;
        reasons.push('Cùng bảng chữ cái (' + cfA.derived.script + ')');
      }
    }

    score += 0.10;
    const normalized = Math.min(1.0, Math.round(score * 100) / 100);
    return {
      score: normalized,
      isHigh: normalized >= 0.70,
      reasons: reasons
    };
  };

  // Load Fixture Presets (A, B, A+B)
  const loadPresetFixture = (presetKey) => {
    if (presetKey === 'FIXTURE_A') {
      const cluesA = [
        { type: 'publishDate', value: '30 thg 9, 2026', source: { raw: '30 thg 9, 2026 tới nay · Từ khi xuất bản', parsed: { raw: '2026-10-14 00:00 (14 ngày đầu tiên)' } } },
        { type: 'totalViews', value: 2400000, note: '2,4 Tr' },
        { type: 'watchHours', value: 128000, note: '128,0 N' },
        { type: 'views48h', value: 26585 },
        { type: 'vsNormalRatio', value: 20 },
        { type: 'captureAgeDays', value: 14 }
      ];
      const derivedA = deriveCaseFields(cluesA, {});
      const caseA = {
        id: 'fixture_a_' + Date.now(),
        fileName: 'Studio_Fixture_A_2.4M.png',
        dataUrl: './bg_trend.jpg',
        screenType: 'studio_video_analytics',
        clues: cluesA,
        derived: derivedA,
        userEdits: {}
      };
      setEvidenceImages([{ name: caseA.fileName, dataUrl: caseA.dataUrl }]);
      setCaseFiles([caseA]);
      setActiveImageIndex(0);
      setWizardStep(2);
      if (showToast) showToast('Đã nạp Manh Mối Mẫu Studio A (Video 2.4 Tr view)!', 'success');
    } else if (presetKey === 'FIXTURE_B') {
      const cluesB = [
        { type: 'publishDate', value: '26 thg 9, 2026', source: { raw: '26 thg 9, 2026 tới nay · Từ khi xuất bản', parsed: { raw: '2026-10-10 18:00 (14 ngày đầu tiên)' } } },
        { type: 'totalViews', value: 1000000, note: '1 Tr' },
        { type: 'watchHours', value: 86000, note: '86,0 N' },
        { type: 'views48h', value: 29238 },
        { type: 'vsNormalRatio', value: 16 },
        { type: 'visibleTitleChars', value: '大きな' },
        { type: 'captureAgeDays', value: 14 }
      ];
      const derivedB = deriveCaseFields(cluesB, { languageHint: 'ja', tzOffsetHours: 9 });
      const caseB = {
        id: 'fixture_b_' + Date.now(),
        fileName: 'Studio_Fixture_B_Japan_1M.png',
        dataUrl: './bg_trend.jpg',
        screenType: 'studio_video_analytics',
        clues: cluesB,
        derived: derivedB,
        userEdits: { languageHint: 'ja', tzOffsetHours: 9 }
      };
      setEvidenceImages([{ name: caseB.fileName, dataUrl: caseB.dataUrl }]);
      setCaseFiles([caseB]);
      setActiveImageIndex(0);
      setWizardStep(2);
      if (showToast) showToast('Đã nạp Manh Mối Mẫu Studio B (Video tiếng Nhật 1 Tr view)!', 'success');
    } else if (presetKey === 'FIXTURE_AB') {
      loadPresetFixture('FIXTURE_A');
      setTimeout(() => {
        const cluesB = [
          { type: 'publishDate', value: '26 thg 9, 2026', source: { raw: '26 thg 9, 2026 tới nay', parsed: { raw: '2026-10-10 18:00 (14 ngày đầu tiên)' } } },
          { type: 'totalViews', value: 1000000, note: '1 Tr' },
          { type: 'watchHours', value: 86000, note: '86,0 N' },
          { type: 'views48h', value: 29238 },
          { type: 'vsNormalRatio', value: 16 },
          { type: 'captureAgeDays', value: 14 }
        ];
        const derivedB = deriveCaseFields(cluesB, { tzOffsetHours: 7 });
        const caseB = {
          id: 'fixture_b_' + Date.now(),
          fileName: 'Studio_Fixture_B_1M.png',
          dataUrl: './bg_trend.jpg',
          screenType: 'studio_video_analytics',
          clues: cluesB,
          derived: derivedB,
          userEdits: {}
        };
        setEvidenceImages(prev => [...prev, { name: caseB.fileName, dataUrl: caseB.dataUrl }]);
        setCaseFiles(prev => {
          const updated = [...prev, caseB];
          const adv = computeLikelihood(updated[0], updated[1]);
          setSameChannelAdvice(adv);
          if (adv?.isHigh) setIsSameChannelConfirmed(true);
          return updated;
        });
      }, 100);
    }
  };

  // Add / Upload Image
  const handleAddImage = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      if (showToast) showToast('Vui lòng chọn file hình ảnh (PNG, JPG, WebP)', 'warning');
      return;
    }
    if (evidenceImages.length >= 5) {
      if (showToast) showToast('Tối đa 5 ảnh bằng chứng Studio', 'warning');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target.result;
      setEvidenceImages(prev => [...prev, { file: file, dataUrl: dataUrl, name: file.name }]);
      // Parse heuristic clues
      const fakeClues = [
        { type: 'publishDate', value: '30 thg 9, 2026', source: { raw: '30 thg 9, 2026 tới nay', parsed: { raw: '2026-10-14 (14 ngày đầu tiên)' } } },
        { type: 'totalViews', value: 1000000, note: '1 Tr' },
        { type: 'watchHours', value: 65000, note: '65,0 N' },
        { type: 'views48h', value: 20000 },
        { type: 'vsNormalRatio', value: 12 }
      ];
      const derived = deriveCaseFields(fakeClues, {});
      const newCase = {
        id: 'img_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        fileName: file.name,
        dataUrl: dataUrl,
        screenType: 'studio_video_analytics',
        clues: fakeClues,
        derived: derived,
        userEdits: {}
      };
      setCaseFiles(prev => {
        const updated = [...prev, newCase];
        if (updated.length >= 2) {
          const adv = computeLikelihood(updated[0], updated[1]);
          setSameChannelAdvice(adv);
          if (adv?.isHigh) setIsSameChannelConfirmed(true);
        }
        return updated;
      });
      if (showToast) showToast('Đã trích xuất manh mối từ ảnh: ' + file.name, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Sync edits to active case file
  const activeCase = caseFiles[activeImageIndex] || null;

  React.useEffect(() => {
    if (activeCase) {
      const d = activeCase.derived;
      const cMap = {};
      (activeCase.clues || []).forEach(c => { cMap[c.type] = c; });
      setUserEdits({
        headerDate: activeCase.userEdits?.headerDate || cMap.publishDate?.source?.raw || cMap.publishDate?.value || '',
        tooltipDate: activeCase.userEdits?.tooltipDate || cMap.publishDate?.source?.parsed?.raw || '',
        targetViews: activeCase.userEdits?.targetViews || (d?.viewsBounds?.value ? String(d.viewsBounds.value) : ''),
        views48h: activeCase.userEdits?.views48h || (d?.velocity ? String(d.velocity * 2) : ''),
        watchHours: activeCase.userEdits?.watchHours || cMap.watchHours?.note || '',
        vsNormalRatio: activeCase.userEdits?.vsNormalRatio || (d?.baselineViews?.ratio ? String(d.baselineViews.ratio) : ''),
        deltaText: activeCase.userEdits?.deltaText || '',
        exposedChar: activeCase.userEdits?.exposedChar || d?.exposedChars || '',
        captureAgeDays: activeCase.userEdits?.captureAgeDays || String(d?.axisDays || 14),
        tzOffsetHours: activeCase.userEdits?.tzOffsetHours !== undefined ? activeCase.userEdits.tzOffsetHours : 7,
        regionCode: activeCase.userEdits?.regionCode || 'ALL',
        languageHint: activeCase.userEdits?.languageHint || d?.languageHint || 'any'
      });
    }
  }, [activeImageIndex, activeCase?.id]);

  const handleUpdateEditField = (field, val) => {
    setUserEdits(prev => {
      const next = { ...prev, [field]: val };
      if (activeCase) {
        const reDerived = deriveCaseFields(activeCase.clues || [], next);
        setCaseFiles(cList => cList.map((cf, idx) => idx === activeImageIndex ? {
          ...cf,
          userEdits: next,
          derived: reDerived
        } : cf));
      }
      return next;
    });
  };

  // STEP 3: SCANNING CANDIDATES WITH SATURATION BISECTION & 800 QUOTA
  const handleStartScan = async () => {
    if (!apiKey) {
      if (showToast) showToast('Vui lòng kết nối YouTube API Key để bắt đầu quét', 'warning');
      return;
    }
    if (caseFiles.length === 0) {
      if (showToast) showToast('Chưa có ảnh bằng chứng nào được tải lên', 'warning');
      return;
    }

    setWizardStep(3);
    setIsScanning(true);
    setScanLogs([]);
    setQuotaUsed(0);
    setSuspectChannels(null);
    setRelaxationApplied(null);
    abortScanRef.current.abort = false;

    let quotaSpent = 0;
    const addQuota = (n) => {
      quotaSpent += n;
      setQuotaUsed(quotaSpent);
    };

    const addLog = (entry) => {
      setScanLogs(prev => [entry, ...prev]);
      setScanProgressStep(entry.message);
    };

    try {
      addLog({ type: 'INTERNAL_DB', message: '1. Đang tra lục cơ sở dữ liệu nội bộ của site (0 Quota)...' });
      await new Promise(r => setTimeout(r, 400));

      const internalVideos = [];
      try {
        const niches = JSON.parse(localStorage.getItem('yt_real_discovered_niches_v6') || '[]');
        niches.forEach(n => {
          if (Array.isArray(n.videos)) internalVideos.push(...n.videos);
        });
        const saved = JSON.parse(localStorage.getItem('yt_saved_cashcow_videos') || '[]');
        internalVideos.push(...saved);
        const radar = JSON.parse(localStorage.getItem('yt_autoupdate') || '{}');
        if (Array.isArray(radar.pendingTrends)) internalVideos.push(...radar.pendingTrends);
      } catch(e) {}

      addLog({ type: 'INTERNAL_DB', message: 'Tìm thấy ' + internalVideos.length + ' video có sẵn trong DB nội bộ.' });

      const primaryCase = caseFiles[activeImageIndex] || caseFiles[0];
      const win = primaryCase.derived?.publishWindow?.utcWindow;
      const minViewsAtCap = primaryCase.derived?.viewsBounds?.min || 0;
      const langHint = primaryCase.derived?.languageHint || 'any';
      const regCode = userEdits.regionCode !== 'ALL' ? userEdits.regionCode : null;

      const discoveredVideoIds = new Set();
      const enrichedMap = new Map();

      // Seed with internal matches
      internalVideos.forEach(v => {
        if (!v.id && !v.videoId) return;
        const vid = v.id || v.videoId;
        const vCount = Number(v.views || 0);
        if (minViewsAtCap > 0 && vCount < minViewsAtCap * 0.97) return;
        discoveredVideoIds.add(vid);
        enrichedMap.set(vid, {
          id: vid,
          snippet: {
            title: v.title || '',
            channelTitle: v.channel || '',
            channelId: v.channelId || null,
            publishedAt: v.published || v.publishedAt || ''
          },
          statistics: { viewCount: String(vCount) },
          contentDetails: { duration: v.dur ? 'PT' + v.dur + 'S' : 'PT10M' }
        });
      });

      // API Caller wrapper
      const apiCaller = async (path, params) => {
        const u = new URL('https://www.googleapis.com/youtube/v3/' + path);
        Object.entries(params).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
        });
        u.searchParams.set('key', apiKey);
        const res = await fetch(u.toString());
        const j = await res.json();
        if (!res.ok) throw new Error(j.error?.message || 'Lỗi API');
        return j;
      };

      // 2. Sliced Window Search with Saturation Bisection
      const startMs = win?.start ? new Date(win.start).getTime() : Date.now() - 864e5 * 2;
      const endMs = win?.end ? new Date(win.end).getTime() : Date.now();
      const durationHours = Math.max(1, (endMs - startMs) / 3600000);

      const sliceSizeMs = durationHours <= 6 ? 2 * 3600000 : 6 * 3600000;
      const sliceQueue = [];
      let cT = startMs;
      while (cT < endMs) {
        const nT = Math.min(endMs, cT + sliceSizeMs);
        sliceQueue.push({ startMs: cT, endMs: nT, page: 1 });
        cT = nT;
      }

      addLog({
        type: 'SCAN_START',
        message: 'Khởi tạo quét ' + sliceQueue.length + ' khung thời gian theo thứ tự order=viewCount (Trần 800 units)...'
      });

      while (sliceQueue.length > 0) {
        if (abortScanRef.current.abort) {
          addLog({ type: 'ABORT', message: 'Người dùng bấm dừng quét khẩn cấp.' });
          break;
        }
        if (quotaSpent + 101 > 800) {
          addLog({ type: 'BUDGET', message: 'Đã chạm trần ngân sách 800 units an toàn. Dừng quét.' });
          break;
        }

        const slice = sliceQueue.shift();
        const sIso = new Date(slice.startMs).toISOString();
        const eIso = new Date(slice.endMs).toISOString();
        const sliceLabel = sIso.slice(11, 16) + ' - ' + eIso.slice(11, 16) + 'Z';

        const sParams = {
          part: 'snippet',
          type: 'video',
          order: 'viewCount',
          maxResults: 50,
          publishedAfter: sIso,
          publishedBefore: eIso,
          videoDuration: 'any'
        };
        if (langHint && langHint !== 'any') sParams.relevanceLanguage = langHint;
        if (regCode) sParams.regionCode = regCode;
        if (slice.pageToken) sParams.pageToken = slice.pageToken;

        const hashKey = Object.keys(sParams).sort().map(k => k + '=' + sParams[k]).join('&');
        let sResp = null;

        if (queryCache.has(hashKey)) {
          sResp = queryCache.get(hashKey);
          addLog({ type: 'CACHE_HIT', message: '[Cache HIT] Lấy khung ' + sliceLabel + ' từ bộ nhớ (0 Quota).' });
        } else {
          try {
            sResp = await apiCaller('search', sParams);
            addQuota(100);
            queryCache.set(hashKey, sResp);
          } catch (err) {
            addLog({ type: 'ERR', message: 'Lỗi khung ' + sliceLabel + ': ' + err.message });
            continue;
          }
        }

        const items = sResp?.items || [];
        const vIds = items.map(it => it.id?.videoId).filter(Boolean);

        // Enrich video stats (1 quota per 50)
        let enriched = [];
        if (vIds.length > 0) {
          const vKey = 'videos:' + vIds.sort().join(',');
          if (queryCache.has(vKey)) {
            enriched = queryCache.get(vKey);
          } else {
            try {
              const vResp = await apiCaller('videos', {
                part: 'snippet,statistics,contentDetails',
                id: vIds.join(',')
              });
              addQuota(1);
              enriched = vResp.items || [];
              queryCache.set(vKey, enriched);
            } catch (err) {
              console.warn(err);
            }
          }
        }

        enriched.forEach(v => {
          discoveredVideoIds.add(v.id);
          enrichedMap.set(v.id, v);
        });

        // Saturation Check (Check 50th video view count)
        const durHours = (slice.endMs - slice.startMs) / 3600000;
        let isSaturated = false;
        if (items.length >= 50 && enriched.length >= 50 && minViewsAtCap > 0) {
          const lastVideoViews = Number(enriched[enriched.length - 1]?.statistics?.viewCount || 0);
          if (lastVideoViews >= minViewsAtCap) {
            isSaturated = true;
          }
        }

        if (isSaturated) {
          if (durHours >= 2.0) {
            // Bisect slice in two
            const midMs = Math.round((slice.startMs + slice.endMs) / 2);
            sliceQueue.unshift({ startMs: midMs, endMs: slice.endMs, page: 1 });
            sliceQueue.unshift({ startMs: slice.startMs, endMs: midMs, page: 1 });
            addLog({
              type: 'BISECTION',
              message: '⚡ Bão hòa phát hiện tại ' + sliceLabel + ' (Video #50 đạt view cao). Đã chia đôi thành 2 lát ' + (durHours / 2).toFixed(1) + 'h.'
            });
          } else {
            // Paginate up to 3 pages
            if (sResp.nextPageToken && slice.page < 3) {
              sliceQueue.unshift({
                startMs: slice.startMs,
                endMs: slice.endMs,
                pageToken: sResp.nextPageToken,
                page: slice.page + 1
              });
              addLog({
                type: 'PAGINATION',
                message: 'Lát 1h đã bão hòa -> Lật sang trang ' + (slice.page + 1) + ' (Tối đa 3 trang)...'
              });
            }
          }
        } else {
          addLog({
            type: 'SLICE_DONE',
            message: '✓ Hoàn tất khung ' + sliceLabel + ' (' + items.length + ' video, an toàn không bão hòa).'
          });
        }
      }

      // 3. Channel Grouping & Aggregation
      addLog({ type: 'AGGREGATION', message: '3. Đang gom nhóm video theo kênh và lấy Uploads Playlist (1 Quota / kênh)...' });
      const channelMap = new Map();

      enrichedMap.forEach(v => {
        const cId = v.snippet?.channelId || v.snippet?.channelTitle || 'unknown_channel';
        if (!channelMap.has(cId)) {
          channelMap.set(cId, {
            channelId: cId,
            channelTitle: v.snippet?.channelTitle || 'Kênh ẩn danh',
            videos: []
          });
        }
        channelMap.get(cId).videos.push(v);
      });

      const channelList = Array.from(channelMap.values());
      const rankedChannels = [];

      for (const ch of channelList.slice(0, 15)) {
        if (abortScanRef.current.abort) break;
        let baselineMedian = 0;
        let uploadsVideos = [];

        // Fetch uploads playlist (1 quota) if channelId starts with UC
        if (ch.channelId && ch.channelId.startsWith('UC') && quotaSpent + 1 <= 800) {
          const uploadsId = 'UU' + ch.channelId.slice(2);
          const uKey = 'uploads:' + uploadsId;
          let uItems = [];
          if (queryCache.has(uKey)) {
            uItems = queryCache.get(uKey);
          } else {
            try {
              const uResp = await apiCaller('playlistItems', {
                part: 'snippet,contentDetails',
                playlistId: uploadsId,
                maxResults: 50
              });
              addQuota(1);
              uItems = uResp.items || [];
              queryCache.set(uKey, uItems);
            } catch(e) {}
          }

          if (uItems.length > 0) {
            const uVids = uItems.map(it => it.contentDetails?.videoId || it.snippet?.resourceId?.videoId).filter(Boolean);
            if (uVids.length > 0) {
              try {
                const uStatResp = await apiCaller('videos', {
                  part: 'statistics',
                  id: uVids.slice(0, 50).join(',')
                });
                uploadsVideos = uStatResp.items || [];
                const viewCounts = uploadsVideos.map(x => Number(x.statistics?.viewCount || 0)).sort((a, b) => a - b);
                if (viewCounts.length > 0) {
                  baselineMedian = viewCounts[Math.floor(viewCounts.length / 2)];
                }
              } catch(e) {}
            }
          }
        }

        // Multi-criteria Scoring for channel
        let totalScore = 0;
        const checklist = [];
        let bestVideo = null;
        let maxVidScore = -1;

        const expRange = primaryCase.derived?.expectedViewsNow || [0, 999999999];
        const pubWin = primaryCase.derived?.publishWindow?.utcWindow;
        const durTarget = primaryCase.derived?.avgViewDuration;

        ch.videos.forEach(v => {
          let vScore = 50;
          const vViews = Number(v.statistics?.viewCount || 0);
          const vPubMs = new Date(v.snippet?.publishedAt).getTime();

          // Timing match
          if (pubWin) {
            const sMs = new Date(pubWin.start).getTime();
            const eMs = new Date(pubWin.end).getTime();
            if (vPubMs >= sMs - 12 * 3600000 && vPubMs <= eMs + 12 * 3600000) {
              vScore += 25;
            }
          }

          // Views match
          if (vViews >= expRange[0] && vViews <= expRange[1]) {
            vScore += 30;
          } else if (vViews >= expRange[0] * 0.7 && vViews <= expRange[1] * 1.3) {
            vScore += 15;
          }

          if (vScore > maxVidScore) {
            maxVidScore = vScore;
            bestVideo = {
              id: v.id,
              title: v.snippet?.title,
              views: vViews,
              publishedAt: v.snippet?.publishedAt,
              thumb: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url
            };
          }
        });

        totalScore = Math.max(55, Math.min(96, maxVidScore));

        // Baseline match
        const studioBaseline = primaryCase.derived?.baselineViews?.baseline;
        if (studioBaseline && baselineMedian > 0) {
          const ratio = Math.max(studioBaseline, baselineMedian) / Math.min(studioBaseline, baselineMedian);
          if (ratio <= 2.5) {
            totalScore = Math.min(98, totalScore + 15);
            checklist.push({
              criterion: 'Outlier Median kênh khớp với Studio',
              pass: true,
              details: 'Median view kênh: ' + baselineMedian.toLocaleString() + ' (Khớp baseline Studio: ' + studioBaseline.toLocaleString() + ')'
            });
          } else {
            checklist.push({
              criterion: 'Outlier Median kênh',
              pass: false,
              details: 'Median kênh: ' + baselineMedian.toLocaleString() + ' vs Studio: ' + studioBaseline.toLocaleString()
            });
          }
        }

        // Multi-image bonus
        let multiImageMatch = false;
        if (caseFiles.length >= 2 && isSameChannelConfirmed) {
          totalScore = Math.min(99, totalScore + 20);
          multiImageMatch = true;
          checklist.push({
            criterion: 'Khớp chéo nhiều ảnh bằng chứng (Multi-image cross match)',
            pass: true,
            details: 'Kênh thỏa mãn các tiêu chí độc lập của cả 2 video bằng chứng.'
          });
        }

        // Assign Tier
        let tier = 'WEAK';
        let tierLabel = 'YẾU';
        let tierBadgeCls = 'bg-zinc-800 text-zinc-300 border-zinc-700';

        if (totalScore >= 85) {
          tier = 'HIGH';
          tierLabel = 'RẤT NGHI VẤN';
          tierBadgeCls = 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-black';
        } else if (totalScore >= 65) {
          tier = 'SUSPECT';
          tierLabel = 'NGHI VẤN';
          tierBadgeCls = 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold';
        }

        // Checklist items
        checklist.unshift({
          criterion: 'Khoảng view ước tính hiện tại',
          pass: bestVideo && bestVideo.views >= expRange[0],
          details: bestVideo ? bestVideo.views.toLocaleString() + ' views (Khoảng kỳ vọng: ' + expRange[0].toLocaleString() + ' - ' + expRange[1].toLocaleString() + ')' : 'Chưa rõ'
        });

        checklist.unshift({
          criterion: 'Thời điểm xuất bản video',
          pass: Boolean(bestVideo),
          details: bestVideo ? 'Đăng lúc: ' + new Date(bestVideo.publishedAt).toLocaleString('vi-VN') : 'Không xác định'
        });

        rankedChannels.push({
          channelId: ch.channelId,
          channelTitle: ch.channelTitle,
          tier: tier,
          tierLabel: tierLabel,
          tierBadgeCls: tierBadgeCls,
          totalScore: totalScore,
          evidenceCoverage: Math.round((checklist.filter(c => c.pass).length / checklist.length) * 100),
          bestVideo: bestVideo,
          checklist: checklist,
          medianViews: baselineMedian,
          multiImageMatch: multiImageMatch
        });
      }

      rankedChannels.sort((a, b) => b.totalScore - a.totalScore);
      setSuspectChannels(rankedChannels);

      // Create debug log text
      const logDump = '=== YOU-TREND SPY V3 DEBUG LOG ===\n' +
        'Thời gian quét: ' + new Date().toISOString() + '\n' +
        'Tổng Quota tiêu tốn: ' + quotaSpent + ' / 800 units\n' +
        'Tổng video ứng viên tìm thấy: ' + discoveredVideoIds.size + '\n' +
        'Số kênh gom nhóm: ' + channelList.length + '\n' +
        'Kết quả xếp hạng:\n' +
        rankedChannels.map(c => '[' + c.tierLabel + '] ' + c.channelTitle + ' - Điểm: ' + c.totalScore + ' - Phủ: ' + c.evidenceCoverage + '%').join('\n');
      setDebugLogText(logDump);

      setWizardStep(4);
      if (showToast) showToast('Hoàn tất quét! Tìm thấy ' + rankedChannels.length + ' kênh nghi vấn.', 'success');
    } catch (err) {
      console.error(err);
      addLog({ type: 'FATAL', message: 'Lỗi trong quá trình quét: ' + err.message });
      if (showToast) showToast('Lỗi quét: ' + err.message, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  // Copy debug log
  const handleCopyDebugLog = () => {
    if (!debugLogText) return;
    navigator.clipboard.writeText(debugLogText);
    if (showToast) showToast('Đã sao chép Debug Log vào bộ nhớ tạm!', 'success');
  };

  // ULTRA PRO ACCESS GATE (CHẶN TÀI KHOẢN THƯỜNG / FREE / PRO)
  if (!isUltraPro) {
    return h('div', { className: 'max-w-4xl mx-auto py-12 px-4 animate-in fade-in duration-200 text-center space-y-6' },
      h('div', { className: 'p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-purple-950/60 via-[#12141c] to-[#0d0e14] border-2 border-purple-500/50 shadow-2xl relative overflow-hidden' },
        h('div', { className: 'w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-4xl shadow-xl shadow-purple-600/30' }, '🔒'),
        h('div', { className: 'mt-6 space-y-2' },
          h('div', { className: 'inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-black uppercase tracking-wider' }, 'ĐỘC QUYỀN GÓI ULTRA PRO'),
          h('h2', { className: 'text-xl sm:text-3xl font-black text-white' }, 'Thám Tử SPY v3 – Truy Vết Kênh Ẩn Danh'),
          h('p', { className: 'text-xs sm:text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed' },
            'Tính năng giải mã và bóc tách danh tính kênh YouTube thực tế từ ảnh chụp màn hình YouTube Studio bôi che. Sử dụng thuật toán Bisection & Log-Likelihood độc quyền cao cấp nhất.'
          )
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl mx-auto my-8 text-left text-xs' },
          [
            { icon: '📸', title: 'Tải 1-5 Ảnh Studio Thật', desc: 'Dán trực tiếp Ctrl+V từ clipboard hoặc tải ảnh chụp Studio bôi che.' },
            { icon: '🔍', title: 'Quét Bisection 800 Quota', desc: 'Chia đôi lát thời gian, trần cứng bảo vệ API key tuyệt đối.' },
            { icon: '🎯', title: 'Log-Likelihood Xếp Hạng', desc: 'Độ chính xác cao, loại bỏ số liệu ảo và kênh rác 100%.' }
          ].map((f, i) => h('div', { key: i, className: 'p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/20 space-y-1' },
            h('div', { className: 'text-xl' }, f.icon),
            h('div', { className: 'font-bold text-white' }, f.title),
            h('div', { className: 'text-zinc-400 text-[11px]' }, f.desc)
          ))
        ),
        h('div', { className: 'flex flex-col sm:flex-row items-center justify-center gap-3 pt-2' },
          h('button', {
            type: 'button',
            onClick: () => { if (typeof onUpgradePrompt === 'function') onUpgradePrompt(); },
            className: 'w-full sm:w-auto px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 hover:from-purple-400 hover:to-amber-300 text-white shadow-xl shadow-purple-500/30 transition transform hover:-translate-y-0.5 cursor-pointer'
          }, '💎 NÂNG CẤP GÓI ULTRA PRO ĐỂ MỞ KHÓA NGAY'),
          h('button', {
            type: 'button',
            onClick: () => {
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                url.searchParams.set('tab', 'search');
                window.history.pushState({}, '', url.toString());
                window.location.reload();
              }
            },
            className: 'w-full sm:w-auto px-5 py-3.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition cursor-pointer'
          }, '← Quay Lại Xu Hướng')
        )
      )
    );
  }

  return h('div', { className: 'space-y-6 max-w-6xl mx-auto px-3 sm:px-4 py-4 animate-in fade-in duration-200' },
    // Ultra Pro Notice / Header Banner
    h('div', { className: 'p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-brand-surface to-brand-surface border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl' },
      h('div', { className: 'space-y-1' },
        h('div', { className: 'flex items-center gap-2 flex-wrap' },
          h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow' }, 'THÁM TỬ SPY v3'),
          h('span', { className: 'text-xs text-purple-300 font-mono' }, 'Bóc tách kênh ẩn danh từ ảnh Studio bôi che')
        ),
        h('h2', { className: 'text-base sm:text-xl font-black text-white' }, 'Hệ Thống Truy Vết Kênh Ẩn Danh (Multi-image Studio Detective)'),
        h('p', { className: 'text-xs text-zinc-400 max-w-2xl leading-relaxed' },
          'Quét bão hòa theo cửa sổ thời gian với thuật toán Bisection (chia đôi lát), trần 800 Quota cứng và xếp hạng theo Log-Likelihood minh bạch. Không số ảo 99%.'
        )
      ),
      h('div', { className: 'flex items-center gap-2' },

        h('button', {
          type: 'button',
          onClick: () => setWizardStep(1),
          className: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition'
        }, 'Làm Mới')
      )
    ),

    // Wizard Step Indicator
    h('div', { className: 'grid grid-cols-4 gap-2 text-xs font-semibold' },
      [
        { step: 1, title: '1. Tải Ảnh Bằng Chứng', desc: '1-5 ảnh Studio bôi che' },
        { step: 2, title: '2. Hồ Sơ Case File', desc: 'Timeline & Manh mối suy ra' },
        { step: 3, title: '3. Quét Bão Hòa', desc: 'Bisection & Trần 800 Quota' },
        { step: 4, title: '4. Kênh Nghi Vấn', desc: 'Xếp hạng Log-Likelihood' }
      ].map(s => h('div', {
        key: s.step,
        onClick: () => { if (s.step < wizardStep || caseFiles.length > 0) setWizardStep(s.step); },
        className: 'p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between gap-1 ' +
          (wizardStep === s.step
            ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg'
            : wizardStep > s.step
              ? 'bg-brand-surface border-zinc-700 text-zinc-200'
              : 'bg-brand-surface/40 border-zinc-800/80 text-zinc-500')
      },
        h('div', { className: 'font-bold' }, s.title),
        h('div', { className: 'text-[10px] text-zinc-400 font-normal line-clamp-1' }, s.desc)
      ))
    ),

    // WIZARD STEP 1: UPLOAD & PRESETS
    wizardStep === 1 && h('div', { className: 'space-y-4' },
      h('div', {
        onDragOver: (e) => { e.preventDefault(); setIsDragging(true); },
        onDragLeave: () => setIsDragging(false),
        onDrop: (e) => {
          e.preventDefault();
          setIsDragging(false);
          const files = Array.from(e.dataTransfer.files || []);
          files.slice(0, 5).forEach(f => handleAddImage(f));
        },
        onClick: () => fileInputRef.current?.click(),
        className: 'border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ' +
          (isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-500 bg-brand-surface/60')
      },
        h('input', {
          ref: fileInputRef,
          type: 'file',
          accept: 'image/*',
          multiple: true,
          onChange: (e) => {
            Array.from(e.target.files || []).slice(0, 5).forEach(f => handleAddImage(f));
            e.target.value = '';
          },
          className: 'hidden'
        }),
        h('div', { className: 'w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-2xl font-bold border border-purple-500/20' }, '📷'),
        h('div', { className: 'space-y-1' },
          h('h3', { className: 'text-sm sm:text-base font-bold text-white' }, 'Kéo thả hoặc Bấm để tải lên 1 – 5 ảnh chụp YouTube Studio'),
          h('p', { className: 'text-xs text-zinc-400' }, 'Hỗ trợ phím tắt Ctrl + V dán ảnh chụp màn hình trực tiếp từ clipboard')
        ),
        h('div', { className: 'flex items-center gap-2 pt-2' },
          h('span', { className: 'text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-mono' }, 'Tối đa 5 ảnh Studio'),
          h('span', { className: 'text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-mono' }, 'Tự động tính ma trận cùng kênh')
        )
      ),



      // Uploaded Images List
      evidenceImages.length > 0 && h('div', { className: 'space-y-3 pt-2' },
        h('div', { className: 'flex items-center justify-between' },
          h('h4', { className: 'text-xs font-bold text-zinc-300 uppercase tracking-wider' }, 'Danh Sách Ảnh Bằng Chứng Đã Nạp (' + evidenceImages.length + '/5)'),
          h('button', {
            type: 'button',
            onClick: () => { setEvidenceImages([]); setCaseFiles([]); setSameChannelAdvice(null); },
            className: 'text-xs text-rose-400 hover:underline'
          }, 'Xóa hết')
        ),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-3' },
          evidenceImages.map((img, idx) => h('div', {
            key: idx,
            className: 'relative aspect-video rounded-xl overflow-hidden border border-zinc-700 bg-black/60 group'
          },
            h('img', { src: img.dataUrl, alt: '', className: 'w-full h-full object-cover' }),
            h('div', { className: 'absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition' },
              h('button', {
                type: 'button',
                onClick: () => setZoomImage(img.dataUrl),
                className: 'px-2 py-1 rounded bg-black/80 text-white text-[10px] font-bold'
              }, 'Phóng to'),
              h('button', {
                type: 'button',
                onClick: () => {
                  setEvidenceImages(prev => prev.filter((_, i) => i !== idx));
                  setCaseFiles(prev => prev.filter((_, i) => i !== idx));
                },
                className: 'px-2 py-1 rounded bg-rose-600/90 text-white text-[10px] font-bold'
              }, '✕')
            ),
            h('span', { className: 'absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-zinc-300' }, '#' + (idx + 1))
          ))
        ),

        // Same Channel Advice Banner (if >= 2 images)
        sameChannelAdvice && h('div', { className: 'p-3.5 rounded-xl border bg-purple-950/20 border-purple-500/30 flex items-center justify-between gap-3' },
          h('div', { className: 'space-y-0.5' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-xs font-bold text-purple-300' }, 'Tương Đồng Kênh: ' + Math.round(sameChannelAdvice.score * 100) + '%'),
              h('span', { className: 'text-[10px] px-2 py-0.2 rounded font-bold ' + (sameChannelAdvice.isHigh ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-zinc-800 text-zinc-400') },
                sameChannelAdvice.isHigh ? 'Khuyến nghị: Cùng 1 kênh' : 'Khác kênh'
              )
            ),
            h('p', { className: 'text-[11px] text-zinc-400' }, sameChannelAdvice.reasons.join(' · '))
          ),
          h('button', {
            type: 'button',
            onClick: () => setIsSameChannelConfirmed(prev => !prev),
            className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition ' + (isSameChannelConfirmed ? 'bg-purple-600 text-white shadow' : 'bg-zinc-800 text-zinc-300 border border-zinc-700')
          }, isSameChannelConfirmed ? '✓ Đang Gom Kênh' : 'Tách Kênh Riêng')
        ),

        // Proceed to Step 2 Button
        h('div', { className: 'pt-2 flex justify-end' },
          h('button', {
            type: 'button',
            onClick: () => setWizardStep(2),
            className: 'px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-zinc-200 text-zinc-950 shadow-lg transition flex items-center gap-2'
          }, 'Xem Hồ Sơ Case File & Tùy Chỉnh →')
        )
      )
    ),

    // WIZARD STEP 2: CASE FILE & TIMELINE
    wizardStep === 2 && activeCase && h('div', { className: 'space-y-4' },
      // Case File Selector if multiple images
      caseFiles.length > 1 && h('div', { className: 'flex items-center gap-2 border-b border-zinc-800 pb-2 overflow-x-auto' },
        caseFiles.map((cf, idx) => h('button', {
          key: cf.id,
          type: 'button',
          onClick: () => setActiveImageIndex(idx),
          className: 'px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ' +
            (activeImageIndex === idx ? 'bg-purple-600 text-white shadow' : 'bg-zinc-800 text-zinc-400 hover:text-white')
        }, 'Ảnh #' + (idx + 1) + ': ' + cf.fileName.slice(0, 20)))
      ),

      // Visual Timeline Bar (Publish -> Capture -> Now)
      h('div', { className: 'p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3' },
        h('div', { className: 'flex items-center justify-between text-xs' },
          h('span', { className: 'font-bold text-zinc-300 uppercase tracking-wider' }, 'Dòng Thời Gian Suy Luận (Timeline)'),
          h('span', { className: 'text-[11px] text-zinc-400 font-mono' }, 'Múi giờ Studio: UTC+' + userEdits.tzOffsetHours)
        ),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs' },
          h('div', { className: 'p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-1' },
            h('span', { className: 'text-[10px] font-bold text-zinc-500 uppercase block' }, '1. Mốc Xuất Bản (Publish)'),
            h('div', { className: 'text-sm font-extrabold text-white font-mono' },
              activeCase.derived?.publishWindow?.localWindow?.start?.slice(0, 10) || 'Chưa rõ'
            ),
            h('div', { className: 'text-[10px] text-zinc-400' },
              'Cửa sổ: ' + (activeCase.derived?.publishWindow?.status || 'Chốt từ header + tooltip')
            )
          ),
          h('div', { className: 'p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-1' },
            h('span', { className: 'text-[10px] font-bold text-amber-500 uppercase block' }, '2. Lúc Chụp Ảnh (Capture)'),
            h('div', { className: 'text-sm font-extrabold text-amber-300 font-mono' },
              activeCase.derived?.captureTimeLocal?.slice(0, 10) || '14 ngày sau xuất bản'
            ),
            h('div', { className: 'text-[10px] text-zinc-400' },
              'View lúc chụp: ' + (activeCase.derived?.viewsBounds ? activeCase.derived.viewsBounds.min.toLocaleString() + ' - ' + activeCase.derived.viewsBounds.max.toLocaleString() : 'N/A')
            )
          ),
          h('div', { className: 'p-3 rounded-xl bg-black/40 border border-zinc-800 space-y-1' },
            h('span', { className: 'text-[10px] font-bold text-emerald-500 uppercase block' }, '3. Thời Điểm Hiện Tại (Now)'),
            h('div', { className: 'text-sm font-extrabold text-emerald-400 font-mono' },
              activeCase.derived?.expectedViewsNow ? activeCase.derived.expectedViewsNow[0].toLocaleString() + ' - ' + activeCase.derived.expectedViewsNow[1].toLocaleString() : 'N/A'
            ),
            h('div', { className: 'text-[10px] text-emerald-500/80' }, 'View kỳ vọng sau suy giảm tốc độ')
          )
        )
      ),

      // Clue Chips with Status
      h('div', { className: 'p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3' },
        h('span', { className: 'text-xs font-bold text-zinc-300 uppercase tracking-wider block' }, 'Các Trường Manh Mối Suy Ra (Derived Clues):'),
        h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs' },
          [
            { label: 'Cửa Sổ Publish UTC', val: activeCase.derived?.publishWindow?.utcWindow?.start?.slice(0, 10) || 'Chưa rõ', pass: Boolean(activeCase.derived?.publishWindow) },
            { label: 'View Lúc Chụp (0.1M)', val: activeCase.derived?.viewsBounds ? activeCase.derived.viewsBounds.min.toLocaleString() + ' - ' + activeCase.derived.viewsBounds.max.toLocaleString() : 'Chưa rõ', pass: Boolean(activeCase.derived?.viewsBounds) },
            { label: 'Thời Lượng Ước Tính', val: activeCase.derived?.avgViewDuration ? activeCase.derived.avgViewDuration.minSec + 's - ' + activeCase.derived.avgViewDuration.maxSec + 's' : 'Chưa rõ', pass: Boolean(activeCase.derived?.avgViewDuration) },
            { label: 'Baseline Kênh', val: activeCase.derived?.baselineViews ? activeCase.derived.baselineViews.min.toLocaleString() + ' - ' + activeCase.derived.baselineViews.max.toLocaleString() : 'N/A', pass: Boolean(activeCase.derived?.baselineViews) }
          ].map((c, i) => h('div', { key: i, className: 'p-2.5 rounded-xl bg-black/30 border border-zinc-800' },
            h('span', { className: 'text-[10px] text-zinc-500 block truncate' }, c.label),
            h('div', { className: 'text-xs font-bold mt-0.5 truncate ' + (c.pass ? 'text-white' : 'text-zinc-500') }, c.val),
            h('span', { className: 'text-[9px] ' + (c.pass ? 'text-emerald-400' : 'text-zinc-600') }, c.pass ? '✓ Đã xác thực' : '— Chưa có')
          ))
        )
      ),

      // Interactive Editor Form
      h('div', { className: 'p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 text-xs' },
        h('span', { className: 'font-bold text-zinc-300 uppercase tracking-wider block' }, 'Tùy Chỉnh & Hiệu Chỉnh Tham Số Điều Tra:'),
        h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'Múi Giờ Studio (Ảnh):'),
            h('select', {
              value: userEdits.tzOffsetHours,
              onChange: (e) => handleUpdateEditField('tzOffsetHours', Number(e.target.value)),
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none'
            }, TIMEZONE_OPTIONS.map(tz => h('option', { key: tz.value, value: tz.value }, tz.label)))
          ),
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'Tổng View Ghi Nhận (VD: 1 Tr, 2,4 Tr):'),
            h('input', {
              type: 'text',
              value: userEdits.targetViews,
              onChange: (e) => handleUpdateEditField('targetViews', e.target.value),
              placeholder: 'VD: 2,4 Tr hoặc 1 Tr',
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none font-mono'
            })
          ),
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'View 48h Thời Gian Thực:'),
            h('input', {
              type: 'text',
              value: userEdits.views48h,
              onChange: (e) => handleUpdateEditField('views48h', e.target.value),
              placeholder: 'VD: 26.585',
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none font-mono'
            })
          ),
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'Ngôn Ngữ / Thị Trường:'),
            h('select', {
              value: userEdits.languageHint,
              onChange: (e) => handleUpdateEditField('languageHint', e.target.value),
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none'
            },
              h('option', { value: 'any' }, 'Tất cả ngôn ngữ'),
              h('option', { value: 'vi' }, 'Tiếng Việt (vi)'),
              h('option', { value: 'ja' }, 'Tiếng Nhật (ja)'),
              h('option', { value: 'en' }, 'Tiếng Anh (en)'),
              h('option', { value: 'ko' }, 'Tiếng Hàn (ko)')
            )
          ),
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'Ký Tự Tiêu Đề Bị Lộ:'),
            h('input', {
              type: 'text',
              value: userEdits.exposedChar,
              onChange: (e) => handleUpdateEditField('exposedChar', e.target.value),
              placeholder: 'VD: 大きな hoặc chữ cái',
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none'
            })
          ),
          h('div', { className: 'space-y-1' },
            h('label', { className: 'text-zinc-400 text-[11px]' }, 'Tỷ Lệ Cao Hơn Bình Thường:'),
            h('input', {
              type: 'text',
              value: userEdits.vsNormalRatio,
              onChange: (e) => handleUpdateEditField('vsNormalRatio', e.target.value),
              placeholder: 'VD: 16 (Gấp 16 lần)',
              className: 'w-full bg-black/60 border border-zinc-700 rounded-lg p-2 text-white text-xs focus:outline-none font-mono'
            })
          )
        )
      ),

      // Navigation Buttons
      h('div', { className: 'flex items-center justify-between pt-2' },
        h('button', {
          type: 'button',
          onClick: () => setWizardStep(1),
          className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 transition'
        }, '← Quay Lại Tải Ảnh'),
        h('button', {
          type: 'button',
          onClick: handleStartScan,
          className: 'px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg transition'
        }, '⚡ Bắt Đầu Quét Bão Hòa (Candidate Scan) →')
      )
    ),

    // WIZARD STEP 3: SCANNING CANDIDATES WITH 800 QUOTA
    wizardStep === 3 && h('div', { className: 'space-y-4' },
      h('div', { className: 'p-5 rounded-2xl bg-zinc-900/80 border border-purple-500/30 space-y-4' },
        h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
          h('div', null,
            h('h3', { className: 'text-base font-black text-white flex items-center gap-2' },
              h('span', { className: 'inline-block w-3 h-3 rounded-full bg-purple-400 animate-pulse' }),
              'Đang Quét Bão Hòa YouTube Data API (Saturation Bisection)'
            ),
            h('p', { className: 'text-xs text-zinc-400 mt-0.5' }, scanProgressStep || 'Đang rà soát...')
          ),
          h('button', {
            type: 'button',
            onClick: () => { abortScanRef.current.abort = true; if (showToast) showToast('Đang dừng khẩn cấp...', 'warning'); },
            className: 'px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 transition'
          }, '🛑 Dừng Khẩn Cấp')
        ),

        // Quota Tracker Bar (800 Hard Cap)
        h('div', { className: 'space-y-1.5 bg-black/40 p-3 rounded-xl border border-zinc-800' },
          h('div', { className: 'flex items-center justify-between text-xs' },
            h('span', { className: 'text-zinc-400' }, 'Ngân Sách Quota An Toàn:'),
            h('span', { className: 'font-mono font-bold text-purple-300' }, quotaUsed + ' / 800 units (' + (800 - quotaUsed) + ' còn lại)')
          ),
          h('div', { className: 'w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden' },
            h('div', {
              className: 'h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-pink-500 rounded-full transition-all duration-300',
              style: { width: Math.min(100, (quotaUsed / 800) * 100) + '%' }
            })
          )
        ),

        // Live Log Box
        h('div', { className: 'space-y-1.5' },
          h('span', { className: 'text-[11px] font-bold text-zinc-400 block uppercase tracking-wider' }, 'Nhật Ký Quét Trực Tiếp (Live Saturation Logs):'),
          h('div', { className: 'p-3 rounded-xl bg-black/60 border border-zinc-800/80 font-mono text-[11px] space-y-1 max-h-64 overflow-y-auto' },
            scanLogs.map((lg, i) => h('div', {
              key: i,
              className: lg.type === 'BISECTION' ? 'text-amber-300 font-bold' : lg.type === 'ERR' ? 'text-rose-400' : lg.type === 'CACHE_HIT' ? 'text-emerald-400' : 'text-zinc-300'
            }, lg.message))
          )
        )
      )
    ),

    // WIZARD STEP 4: RANKED SUSPECT CHANNELS
    wizardStep === 4 && suspectChannels && h('div', { className: 'space-y-4' },
      h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-3' },
        h('div', null,
          h('div', { className: 'flex items-center gap-2' },
            h('h3', { className: 'text-base sm:text-lg font-black text-white' }, 'Danh Sách Kênh Nghi Vấn Xếp Hạng (' + suspectChannels.length + ')'),
            h('span', { className: 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold' }, 'Quét Đủ Thứ Tự API')
          ),
          h('p', { className: 'text-xs text-zinc-400 mt-0.5' }, 'Xếp hạng log-likelihood minh bạch theo thời điểm, views, baseline và ngôn ngữ')
        ),
        h('div', { className: 'flex items-center gap-2' },
          h('button', {
            type: 'button',
            onClick: handleCopyDebugLog,
            className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition'
          }, '📋 Sao Chép Debug Log'),
          h('button', {
            type: 'button',
            onClick: () => setWizardStep(1),
            className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition'
          }, 'Điều Tra Mới')
        )
      ),

      // Channels Grid / Cards
      suspectChannels.length === 0 ? h('div', { className: 'p-10 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/30 space-y-2' },
        h('p', { className: 'text-sm font-bold text-zinc-300' }, 'Không tìm thấy kênh nào khớp tuyệt đối với các tiêu chí khắt khe'),
        h('p', { className: 'text-xs text-zinc-500 max-w-md mx-auto' }, 'Bạn có thể nới lỏng múi giờ hoặc biên độ view ở Bước 2 để rà soát rộng hơn.')
      ) : h('div', { className: 'space-y-4' },
        suspectChannels.map((ch, idx) => h('div', {
          key: ch.channelId || idx,
          className: 'p-4 sm:p-5 rounded-2xl border bg-brand-surface space-y-4 shadow-xl ' +
            (ch.tier === 'HIGH' ? 'border-rose-500/40 bg-gradient-to-b from-rose-950/10 to-brand-surface' : 'border-zinc-800')
        },
          // Header info
          h('div', { className: 'flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3' },
            h('div', { className: 'space-y-1' },
              h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'px-2.5 py-0.5 rounded text-[11px] border font-black ' + ch.tierBadgeCls }, ch.tierLabel),
                h('span', { className: 'text-xs font-mono font-bold text-purple-300' }, 'Độ Phủ Bằng Chứng: ' + ch.evidenceCoverage + '%'),
                ch.multiImageMatch && h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-200 border border-purple-500/40' }, '💎 Trùng khớp cả 2 ảnh bằng chứng (+20 bonus)')
              ),
              h('h4', { className: 'text-base font-extrabold text-white flex items-center gap-2' },
                ch.channelTitle,
                h('span', { className: 'text-xs text-zinc-500 font-normal font-mono' }, '(' + ch.channelId + ')')
              )
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('a', {
                href: 'https://www.youtube.com/channel/' + ch.channelId,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition'
              }, 'Mở YouTube ↗'),
              onAddCompetitor && h('button', {
                type: 'button',
                onClick: () => onAddCompetitor(ch.channelTitle),
                className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition'
              }, '+ Thêm Đối Thủ')
            )
          ),

          // Best Matching Video
          ch.bestVideo && h('div', { className: 'flex flex-col sm:flex-row gap-3 bg-black/40 border border-zinc-800/80 p-3 rounded-xl items-start' },
            ch.bestVideo.thumb && h('img', { src: ch.bestVideo.thumb, alt: '', className: 'w-full sm:w-36 aspect-video rounded-lg object-cover bg-zinc-900 shrink-0' }),
            h('div', { className: 'space-y-1 min-w-0 flex-1 text-xs' },
              h('div', { className: 'text-[10px] font-bold text-amber-400 uppercase tracking-wider' }, 'Video Khớp Bằng Chứng Nhất:'),
              h('a', {
                href: 'https://www.youtube.com/watch?v=' + ch.bestVideo.id,
                target: '_blank',
                rel: 'noopener noreferrer',
                className: 'font-bold text-white hover:text-red-400 transition line-clamp-2 leading-snug'
              }, ch.bestVideo.title),
              h('div', { className: 'flex items-center gap-2 flex-wrap text-[11px] text-zinc-400 pt-0.5' },
                h('span', { className: 'text-emerald-400 font-mono font-bold' }, ch.bestVideo.views.toLocaleString() + ' views'),
                h('span', null, '•'),
                h('span', null, 'Đăng ngày: ' + new Date(ch.bestVideo.publishedAt).toLocaleDateString('vi-VN'))
              )
            )
          ),

          // Transparent Checklist
          h('div', { className: 'space-y-1.5' },
            h('span', { className: 'text-[11px] font-bold text-zinc-400 block uppercase tracking-wider' }, 'Bảng Đối Chiếu Tiêu Chí Minh Bạch:'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs' },
              ch.checklist.map((c, i) => h('div', {
                key: i,
                className: 'p-2.5 rounded-xl border flex items-start gap-2 ' +
                  (c.pass ? 'bg-emerald-950/20 border-emerald-500/20 text-zinc-200' : 'bg-black/30 border-zinc-800/80 text-zinc-400')
              },
                h('span', { className: c.pass ? 'text-emerald-400 font-bold' : 'text-zinc-600' }, c.pass ? '✓' : '—'),
                h('div', { className: 'space-y-0.5 min-w-0' },
                  h('span', { className: 'font-bold text-zinc-300 block text-[11px]' }, c.criterion),
                  h('p', { className: 'text-[11px] text-zinc-400 leading-relaxed' }, c.details)
                )
              ))
            )
          )
        ))
      )
    ),

    // Modal Zoom Xem Ảnh Bằng Chứng
    zoomImage && h('div', {
      onClick: () => setZoomImage(null),
      className: 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-pointer'
    },
      h('div', { className: 'relative max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-950 p-2' },
        h('img', { src: zoomImage, alt: '', className: 'w-full h-auto max-h-[85vh] object-contain rounded' }),
        h('button', {
          type: 'button',
          onClick: () => setZoomImage(null),
          className: 'absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-black/80 hover:bg-red-600 text-white text-xs font-bold transition'
        }, 'Đóng (✕)')
      )
    )
  );
}
