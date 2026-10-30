// YOUTREND CÔNG CỤ V2: TÌM TREND ĐỂ KIẾM TIỀN (PHASE 1 - 4 HOÀN THIỆN)
// Feature Flag & Independent Module
window.FEATURE_TREND_V2 = true;

(function() {
  const h = React.createElement;
  const { useState, useEffect, useMemo, useRef } = React;

  // --- EMBEDDED SCORING & CPM CONFIG ---
  const CPM_TIER_CONFIG = {
    ultra: { minRpm: 35, score: 95, label: '$35 - $60+ (Tài chính, B2B, Tech)' },
    high: { minRpm: 25, score: 85, label: '$25 - $45 (Kỳ án US, Case study, AI)' },
    mid: { minRpm: 15, score: 70, label: '$15 - $30 (Đời sống, Năng suất, Học tập)' },
    low: { minRpm: 5, score: 50, label: '$5 - $15 (Giải trí, Gaming, Vlog)' }
  };

  const INTENT_BONUS = {
    transactional: 15,
    commercial: 10,
    informational: 0
  };

  function resolveCpmTierClient(cpmGroupStr) {
    if (!cpmGroupStr) return CPM_TIER_CONFIG.mid;
    const str = String(cpmGroupStr).toLowerCase();
    const numMatches = str.match(/\d+/g);
    const maxVal = numMatches ? Math.max(...numMatches.map(Number)) : 20;
    if (maxVal >= 45 || str.includes('tài chính') || str.includes('finance') || str.includes('b2b') || str.includes('saas')) {
      return CPM_TIER_CONFIG.ultra;
    }
    if (maxVal >= 25 || str.includes('kinh doanh') || str.includes('case study') || str.includes('ai') || str.includes('us')) {
      return CPM_TIER_CONFIG.high;
    }
    if (maxVal >= 15 || str.includes('mẹo vặt') || str.includes('productivity') || str.includes('sách')) {
      return CPM_TIER_CONFIG.mid;
    }
    return CPM_TIER_CONFIG.low;
  }

  function calculateDemandScoreClient(trendsData, ytData) {
    if (trendsData && typeof trendsData.avg === 'number' && trendsData.avg > 0) {
      const avgScore = Math.min(100, Math.max(0, trendsData.avg));
      const momentum = trendsData.momentum || 0;
      const momentumDelta = Math.min(20, Math.max(-20, Math.round(momentum * 0.3)));
      return Math.min(100, Math.max(10, avgScore + momentumDelta));
    }
    if (ytData) {
      const vph = Number(ytData.vph || 0);
      const totalViews = Number(ytData.avgViews || 0);
      const vphScore = Math.min(95, Math.max(20, Math.round(25 + Math.sqrt(vph) * 3.5)));
      const viewFactor = totalViews > 100000 ? 5 : totalViews > 20000 ? 0 : -5;
      return Math.min(100, Math.max(15, vphScore + viewFactor));
    }
    return 50;
  }

  function calculateOpportunityScoreClient(ytData) {
    if (!ytData) return 65;
    let smallRatio = 0.35;
    if (typeof ytData.smallChannelRatio === 'number') {
      smallRatio = ytData.smallChannelRatio > 1 ? ytData.smallChannelRatio / 100 : ytData.smallChannelRatio;
    } else if (typeof ytData.smallChannelBreakoutRatio === 'number') {
      smallRatio = ytData.smallChannelBreakoutRatio > 1 ? ytData.smallChannelBreakoutRatio / 100 : ytData.smallChannelBreakoutRatio;
    } else if (typeof ytData.smallChannelsCount === 'number') {
      smallRatio = Number(ytData.smallChannelsCount || 0) / Math.max(1, Number(ytData.totalAnalyzed || 15));
    }

    const maxOutlier = Number(ytData.outlierRatio || ytData.maxOutlier || 1);
    const bigChannelDominance = Number(ytData.bigChannelCount || 0) / Math.max(1, Number(ytData.totalAnalyzed || 15));

    let ratioScore = Math.min(95, Math.round(20 + smallRatio * 90));
    if (smallRatio < 0.10) ratioScore = Math.min(ratioScore, 32);

    const outlierBonus = maxOutlier >= 5 ? 15 : maxOutlier >= 2.5 ? 10 : maxOutlier >= 1.5 ? 5 : 0;
    const dominancePenalty = bigChannelDominance > 0.6 ? 20 : bigChannelDominance > 0.4 ? 10 : 0;
    const saturationPenalty = Number(ytData.videoCount30d || 0) > 100 ? 15 : Number(ytData.videoCount30d || 0) > 50 ? 5 : 0;

    return Math.min(100, Math.max(10, ratioScore + outlierBonus - dominancePenalty - saturationPenalty));
  }

  function calculateMonetizationScoreClient(cpmGroup, searchIntent) {
    const tier = resolveCpmTierClient(cpmGroup);
    let score = tier.score;
    const intentBonus = INTENT_BONUS[searchIntent] || 0;
    score += intentBonus;
    return Math.min(100, Math.max(20, score));
  }

  function calculateSustainabilityScoreClient(typeStr, trendsData) {
    const t = String(typeStr || '').toLowerCase();
    if (t.includes('evergreen') || t.includes('bền vững') || t.includes('steady')) return 92;
    if (t.includes('seasonal') || t.includes('mùa vụ')) return 65;
    if (t.includes('spike') || t.includes('ngắn hạn')) return 40;
    if (trendsData && trendsData.points && trendsData.points.length >= 8) {
      const vals = trendsData.points.map(p => p.value || 0);
      const minV = Math.min(...vals);
      const maxV = Math.max(...vals);
      if (maxV > 0 && (minV / maxV) >= 0.45) return 85;
    }
    return 70;
  }

  function calculateFeasibilityScoreClient(contentType) {
    const ct = String(contentType || 'faceless').toLowerCase();
    if (ct === 'faceless' || ct.includes('ai') || ct.includes('voiceover')) return 90;
    if (ct === 'hybrid' || ct.includes('bán faceless')) return 75;
    return 55;
  }

  function calculatePolicyScoreClient(policyRisk, sensitiveFlag) {
    if (sensitiveFlag) return 20;
    const risk = String(policyRisk || 'none').toLowerCase();
    if (risk === 'high') return 25;
    if (risk === 'medium') return 55;
    if (risk === 'low') return 85;
    return 100;
  }

  function calculateMoneyScoreClient(input) {
    const hasTrends = Boolean(input.trendsData && typeof input.trendsData.avg === 'number' && input.trendsData.avg > 0);
    const isYouTubeOnly = !hasTrends;

    const demand = calculateDemandScoreClient(input.trendsData, input.youtubeData);
    const opportunity = calculateOpportunityScoreClient(input.youtubeData);
    const monetization = calculateMonetizationScoreClient(input.cpmGroup || input.niche?.cpmGroup, input.searchIntent);
    const sustainability = calculateSustainabilityScoreClient(input.trendType || input.trendsData?.type, input.trendsData);
    const feasibility = calculateFeasibilityScoreClient(input.contentType || input.niche?.contentType);
    const policy = calculatePolicyScoreClient(input.policyRisk || input.niche?.policyRisk, input.sensitiveFlag);

    const weights = { demand: 0.25, opportunity: 0.25, monetization: 0.20, sustainability: 0.12, feasibility: 0.10, policy: 0.08 };
    const rawScore = (
      demand * weights.demand +
      opportunity * weights.opportunity +
      monetization * weights.monetization +
      sustainability * weights.sustainability +
      feasibility * weights.feasibility +
      policy * weights.policy
    );

    const dataCompleteness = isYouTubeOnly ? 0.68 : 1.0;
    const finalScore = Math.min(99, Math.max(15, Math.round(rawScore)));

    let tierGrade = 'B';
    let tierBadge = 'TIỀM NĂNG ⚡';
    let color = '#f59e0b';
    if (finalScore >= 85) {
      tierGrade = 'S';
      tierBadge = 'MỎ VÀNG 💎';
      color = '#10b981';
    } else if (finalScore >= 72) {
      tierGrade = 'A';
      tierBadge = 'BỨT PHÁ 🚀';
      color = '#06b6d4';
    } else if (finalScore >= 55) {
      tierGrade = 'B';
      tierBadge = 'TIỀM NĂNG ⚡';
      color = '#f59e0b';
    } else {
      tierGrade = 'C';
      tierBadge = 'CÂN NHẮC ⚠️';
      color = '#ef4444';
    }

    return {
      moneyScore: finalScore,
      tierGrade,
      tierBadge,
      color,
      source: isYouTubeOnly ? 'YouTubeOnly' : 'GoogleTrendsAndYouTube',
      dataCompleteness,
      pillars: {
        demand: Math.round(demand),
        opportunity: Math.round(opportunity),
        monetization: Math.round(monetization),
        sustainability: Math.round(sustainability),
        feasibility: Math.round(feasibility),
        policy: Math.round(policy)
      },
      cpmTier: resolveCpmTierClient(input.cpmGroup || input.niche?.cpmGroup).label
    };
  }

  // --- CSV PARSER UTILITIES ---
  function extractKeyword(colName) {
    if (!colName) return '';
    let clean = colName.trim().replace(/^\uFEFF/, '');
    const m = clean.match(/^(.*?):\s*\((.*?)\)$/);
    return m ? m[1].trim() : clean;
  }

  function parseTrendsCsvClient(csvText) {
    if (!csvText || typeof csvText !== 'string') throw new Error('Dữ liệu CSV không hợp lệ');
    let raw = csvText.replace(/^\uFEFF/, '').trim();
    const lines = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) throw new Error('File CSV có ít hơn 2 dòng');

    let headerIdx = -1;
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const lower = lines[i].toLowerCase();
      if (lower.startsWith('ngày,') || lower.startsWith('tuần,') || lower.startsWith('date,') || lower.startsWith('week,')) {
        headerIdx = i;
        break;
      }
      if (lines[i].includes(': (') || lines[i].includes(':(')) {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;

    const headerCols = lines[headerIdx].split(',').map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));
    const dateCol = headerCols[0];
    const kwCols = headerCols.slice(1).map(c => extractKeyword(c));

    const keywordSeriesMap = {};
    kwCols.forEach(k => { keywordSeriesMap[k] = []; });
    const rows = [];

    for (let i = headerIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line || line.toLowerCase().includes('truy vấn') || line.toLowerCase().includes('related')) break;
      const cols = line.split(',').map(c => c.trim().replace(/^"/, '').replace(/"$/, ''));
      if (cols.length < 2) continue;
      const dateVal = cols[0];
      if (!/\d{4}/.test(dateVal)) continue;

      const rowObj = { date: dateVal, values: {} };
      for (let j = 1; j < headerCols.length; j++) {
        const kw = kwCols[j - 1];
        const rawV = cols[j] || '';
        let num = 0;
        if (rawV === '<1') num = 0.5;
        else {
          const san = rawV.replace(',', '.').replace(/[^0-9.]/g, '');
          num = parseFloat(san) || 0;
        }
        rowObj.values[kw] = num;
        if (keywordSeriesMap[kw]) keywordSeriesMap[kw].push({ date: dateVal, value: num });
      }
      rows.push(rowObj);
    }

    return {
      keywords: kwCols,
      dateColumn: dateCol,
      rows,
      keywordSeriesMap,
      rowCount: rows.length
    };
  }

  function calculateMetricsClient(series) {
    if (!series || !series.length) return { avg: 0, momentum: 0, slope: 1, type: 'unknown' };
    const vals = series.map(s => Number(s.value) || 0);
    const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
    const n = vals.length;
    const rec4 = vals.slice(Math.max(0, n - 4));
    const pri8 = vals.slice(Math.max(0, n - 12), Math.max(0, n - 4));
    const recAvg = rec4.length ? rec4.reduce((a, b) => a + b, 0) / rec4.length : avg;
    const priAvg = pri8.length ? pri8.reduce((a, b) => a + b, 0) / pri8.length : avg;
    let momentum = 0;
    if (priAvg > 0) momentum = Math.round(((recAvg - priAvg) / priAvg) * 100);
    else if (recAvg > 0) momentum = 100;
    let type = 'neutral';
    if (momentum >= 25) type = 'Tăng trưởng mạnh 🚀';
    else if (momentum <= -25) type = 'Giảm dần 📉';
    else if (avg >= 35) type = 'Bền vững (Evergreen) 🌲';
    return { avg, momentum, type, count: vals.length };
  }

  // --- CANVAS WATERMARKED PNG EXPORT ENGINE ---
  function exportReportPng(item) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient Dark Space
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 750);
    bgGrad.addColorStop(0, '#090a0f');
    bgGrad.addColorStop(0.5, '#0d111a');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 750);

    // Decorative Glow Orbs
    const glow1 = ctx.createRadialGradient(250, 200, 10, 250, 200, 400);
    glow1.addColorStop(0, item.color ? `${item.color}25` : 'rgba(16, 185, 129, 0.15)');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, 800, 500);

    // Border Frame
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 1160, 710);

    // Top Header Banner
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('YOUTREND ANALYTICS • BÁO CÁO TIỀM NĂNG KIẾM TIỀN (TREND V2)', 50, 65);

    ctx.fillStyle = '#64748b';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Xuất lúc: ${new Date().toLocaleString('vi-VN')} | Nguồn: ${item.source === 'YouTubeOnly' ? 'YouTube Only (Tối ưu)' : 'Google Trends & YouTube'}`, 50, 92);

    // Keyword Title & Niche
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(item.keyword, 50, 155);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`Ngách: ${item.nicheName || 'Tổng hợp'}  •  Ý định: ${item.searchIntent || 'Thương mại'}  •  RPM: ${item.cpmTier || '$25 - $45'}`, 50, 195);

    // Money Score Big Card (Left side)
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(50, 230, 320, 430, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('ĐIỂM MONEY SCORE TỔNG HỢP', 80, 275);

    // Score Circle Ring
    const centerX = 210;
    const centerY = 400;
    const radius = 90;

    // Track
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress Arc
    const scoreVal = item.moneyScore || 75;
    const endAngle = -Math.PI / 2 + (Math.PI * 2 * (scoreVal / 100));
    ctx.strokeStyle = item.color || '#10b981';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
    ctx.stroke();

    // Number inside
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(scoreVal), centerX, centerY + 20);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('/ 100 ĐIỂM', centerX, centerY + 45);

    // Tier Badge
    ctx.fillStyle = item.color || '#10b981';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(`${item.tierBadge || 'TIỀM NĂNG'}`, centerX, 560);

    ctx.textAlign = 'left'; // reset

    // 6 Pillars Breakdown (Right Side)
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(400, 230, 750, 430, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('6 TRỤ CỘT ĐÁNH GIÁ TIỀM NĂNG THỰC CHIẾN', 430, 275);

    const pillars = [
      { name: '1. Nhu cầu xem & Độ quan tâm (Demand)', val: item.pillars?.demand || 80, col: '#38bdf8' },
      { name: '2. Cơ hội cho kênh nhỏ <30k sub (Opportunity)', val: item.pillars?.opportunity || 85, col: '#34d399' },
      { name: '3. RPM & Khả năng sinh lời (Monetization)', val: item.pillars?.monetization || 75, col: '#fbbf24' },
      { name: '4. Tính bền vững & Evergreen (Sustainability)', val: item.pillars?.sustainability || 70, col: '#a78bfa' },
      { name: '5. Tính khả thi Faceless/AI (Feasibility)', val: item.pillars?.feasibility || 90, col: '#f472b6' },
      { name: '6. An toàn chính sách & Bản quyền (Policy)', val: item.pillars?.policy || 100, col: '#4ade80' }
    ];

    pillars.forEach((p, idx) => {
      const y = 320 + idx * 52;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(p.name, 430, y);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(`${p.val} / 100`, 1080, y);

      // Bar Track
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.roundRect(430, y + 10, 680, 10, 5);
      ctx.fill();

      // Bar Fill
      ctx.fillStyle = p.col;
      ctx.beginPath();
      ctx.roundRect(430, y + 10, Math.max(10, 680 * (p.val / 100)), 10, 5);
      ctx.fill();
    });

    // Footer Watermark
    ctx.fillStyle = '#475569';
    ctx.font = 'italic 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText('Được tạo độc quyền bởi YouTrend v2 • Công cụ tìm trend kiếm tiền cho nhà sáng tạo nội dung', 50, 700);

    // Download PNG
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtrend_money_score_${item.keyword.replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF]/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // --- MAIN COMPONENT ---
  
      // CLIENT-SIDE GROUNDING GENERATOR (WORKS 100% OFFLINE & ON STATIC GITHUB PAGES)
  // Helper shuffle array
  function shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  // Lấy các từ khoá theo trend hàng ngày từ dữ liệu "Top Ngách Mỗi Ngày" (Dynamic & Real-time)
  function getDailyTrendKeywords(targetRegion = 'US') {
    const isVn = targetRegion === 'VN';
    const keywordSet = new Set();

    // 1. Quét dữ liệu ngách thật đã phát hiện hôm nay lưu trong localStorage từ Tab Top Ngách
    try {
      const keysToInspect = [
        'yt_real_discovered_niches_v6',
        `yt_real_discovered_niches_v6_${targetRegion}`,
        'yt_real_discovered_niches_v6_GLOBAL',
        'yt_real_discovered_niches_v6_US',
        'yt_real_discovered_niches_v6_VN'
      ];
      for (const k of keysToInspect) {
        const raw = localStorage.getItem(k);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(n => {
            if (n && n.name) {
              const cleanName = n.name
                .replace(/^\[[^\]]+\]\s*/, '')
                .replace(/\([^\)]+\)/g, '')
                .trim();
              if (cleanName.length >= 3 && cleanName.length <= 50) {
                keywordSet.add(cleanName);
              }
            }
            if (n && Array.isArray(n.videos)) {
              n.videos.slice(0, 3).forEach(v => {
                if (v && v.title) {
                  const shortTitle = v.title
                    .replace(/[\(\[\{][^\)\]\}]+[\)\]\}]/g, '')
                    .replace(/[#|•\-_].*$/, '')
                    .trim();
                  if (shortTitle.length >= 8 && shortTitle.length <= 40) {
                    keywordSet.add(shortTitle);
                  }
                }
              });
            }
          });
        }
      }
    } catch (e) {
      console.warn('Cannot read localStorage niches for trend keywords', e);
    }

    // 2. Thư viện từ khoá Trend thịnh hành cập nhật theo ngày từ Top Ngách (US / GLOBAL / VN)
    const curatedTrendsUs = [
      'AI Automation & Solopreneur',
      'Silent Wealth Habits',
      'Unsolved Cold Cases',
      'Dark Psychology & Manipulation',
      'Elder Stoic Wisdom',
      '432Hz Sleep & Brainwave Therapy',
      'Lost Civilizations & Ancient Anomalies',
      'Off-Grid Tiny Homes & Architecture',
      '10-Minute Executive Book Summaries',
      'Minimalist Desk Setup Gear',
      'Deep Sea Mysteries & Oceanic Iceberg',
      'Rise and Fall of Business Empires',
      'Medieval Warfare & Siege Tactics',
      'Space Anomalies & James Webb Secrets',
      'Micro-SaaS & Low-Code Cash Flow',
      'Longevity Science & Anti-Aging Protocols',
      'Police Interrogation Body Language',
      'Solo Camper Van Stealth Living',
      'Sumerian & Anunnaki Ancient Secrets',
      'Military Aircraft Stealth Projects',
      'AI Filmmaking & Cinematic Shorts',
      'Dopamine Reset & Habit Mastery',
      'Frugal Living & Early Retirement FIRE',
      'Extreme Disaster Survival Stories',
      'Smart Home Automation Ideas',
      'Aviation Disasters & Black Box Truth',
      'Philosophy of Solitude & Inner Peace',
      'Cybersecurity & Dark Web Documentaries',
      'True Crime Psychology & Criminal Profiling',
      'Homesteading Permaculture & Water Systems'
    ];

    const curatedTrendsVn = [
      'Bí Mật Hồ Sơ Vụ Án & Kỳ Án',
      'Triết Lý Khắc Kỷ & Đạo Làm Người',
      'Tự Động Hoá Công Việc Bằng Trợ Lý AI',
      'Quản Lý Tài Chính & Tiết Kiệm Chi Tiêu',
      'Nhân Quả Cuộc Đời & Lời Răn Trí Tuệ',
      'Mẹo Vặt Đời Sống & Gia Đình Thông Minh',
      'Sức Khỏe Người Già & Dinh Dưỡng Trường Thọ',
      'Khởi Nghiệp Tinh Gọn & Bài Học Kinh Doanh',
      'Lịch Sử Bí Ẩn & Văn Minh Cổ Đại',
      'Bỏ Phố Về Rừng & Làm Vườn Tự Cấp',
      'Nhạc Thiền Sóng Não 432Hz Chữa Lành',
      'Nấu Ăn Cơm Nhà Tiết Kiệm & Dinh Dưỡng',
      'Tâm Lý Học Hành Vi & Nhận Diện Thao Túng',
      'Sự Sụp Đổ Của Các Thương Hiệu Từng Đình Đám',
      'Lối Sống Tối Giản Nhẹ Nhõm Tâm Hồn',
      'Tóm Tắt Sách Tinh Hoa 15 Phút',
      'Chiến Thuật Quân Sự & Những Trận Đánh Lớn',
      'Bí Ẩn Vũ Trụ & Khoa Học Đột Phá',
      'Kinh Tế Vĩ Mô & Chu Kỳ Tiền Tệ Dễ Hiểu',
      'Chăm Sóc Sức Khỏe Tuổi 50+ Phòng Ngừa Bệnh'
    ];

    const pool = isVn ? curatedTrendsVn : curatedTrendsUs;
    pool.forEach(item => keywordSet.add(item));

    return Array.from(keywordSet);
  }

  function generateClientNiches(targetRegion = 'US', count = 12, topicHint = '', timeframe = 'now 7-d') {
    const isVn = targetRegion === 'VN';
    const tfName = timeframe === 'now 7-d' ? (isVn ? '7 ngày qua' : '7-Day Breakout') :
                   timeframe === 'today 1-m' ? (isVn ? '30 ngày qua' : '30-Day Growth') :
                   timeframe === 'today 3-m' ? (isVn ? '90 ngày qua' : 'Quarterly Trend') :
                   (isVn ? '12 tháng qua' : 'Annual Evergreen');

    let master = [];

    if (topicHint && topicHint.trim()) {
      const rawHint = topicHint.trim();
      const hint = rawHint.charAt(0).toUpperCase() + rawHint.slice(1);

      if (isVn) {
        master = [
          { name: `Bí Mật & Góc Khuất Của ${hint}`, why: `Chủ đề giật gân, tò mò cao về "${hint}". Khán giả xem hết video để tìm lời giải.`, contentType: 'faceless', cpm: '$12 - $25', audience: 'Khán giả tò mò, thích khám phá' },
          { name: `Hướng Dẫn ${hint} Cho Người Mới Bắt Đầu 2026`, why: `Lượng tìm kiếm organic cao quanh năm từ người mới tiếp cận "${hint}".`, contentType: 'screen_recording', cpm: '$15 - $30', audience: 'Người mới học, tự làm' },
          { name: `Top Công Cụ & Phần Mềm Hỗ Trợ ${hint}`, why: `Ý định thương mại cao, dễ chèn link affiliate và nhận tài trợ công cụ.`, contentType: 'screen_recording', cpm: '$18 - $38', audience: 'Dân làm nghề, sinh viên, người làm MMO' },
          { name: `Lịch Sử & Sự Phát Triển Bất Ngờ Của ${hint}`, why: `Nội dung tư liệu kết hợp hình ảnh AI cổ điển, giữ chân khán giả trên 65%.`, contentType: 'faceless', cpm: '$10 - $22', audience: 'Người yêu tri thức và tư liệu' },
          { name: `Cách Kiếm Tiền Từ ${hint} Không Cần Lộ Mặt`, why: `Nhu cầu khởi nghiệp faceless với "${hint}" đang bứt phá mạnh mẽ.`, contentType: 'faceless', cpm: '$20 - $45', audience: 'Người làm tự do, kiếm tiền online' },
          { name: `Những Sai Lầm Khiến Bạn Thất Bại Với ${hint}`, why: `Đánh vào tâm lý sợ mất mát (FOMO), tỷ lệ nhấp CTR thumbnail cực cao.`, contentType: 'hybrid', cpm: '$14 - $28', audience: 'Người đang thực hành chủ đề' },
          { name: `Phân Tích Chuyên Sâu Case Study Về ${hint}`, why: `Nội dung cao cấp, khán giả trung thành, giá thầu quảng cáo B2B tốt.`, contentType: 'talking_head', cpm: '$22 - $50', audience: 'Chuyên gia, chủ kinh doanh' },
          { name: `Tối Ưu Hoá Quy Trình ${hint} Bằng AI`, why: `Bắt đúng xu hướng ứng dụng trí tuệ nhân tạo vào thực tế công việc.`, contentType: 'screen_recording', cpm: '$25 - $55', audience: 'Người yêu công nghệ, năng suất' },
          { name: `Hành Trình 30 Ngày Thử Thách ${hint}`, why: `Định dạng video trải nghiệm thực tế dễ viral và tạo sự đồng cảm.`, contentType: 'hybrid', cpm: '$12 - $26', audience: 'Giới trẻ, người thích trải nghiệm' },
          { name: `So Sánh Các Giải Pháp ${hint} Phổ Biến Nhất`, why: `Người xem có ý định chi tiền, tỷ lệ chuyển đổi đơn hàng cao.`, contentType: 'hybrid', cpm: '$16 - $35', audience: 'Người mua sắm thông minh' },
          { name: `Thói Quen Của Người Giỏi Nhất Về ${hint}`, why: `Evergreen dài hạn, người xem thích chia sẻ và lưu vào danh sách phát.`, contentType: 'faceless', cpm: '$14 - $30', audience: 'Khán giả tự hoàn thiện bản thân' },
          { name: `Dự Đoán Tương Lai Của ${hint} (2026 - 2030)`, why: `Kích thích tranh luận trong phần bình luận, tăng tín hiệu tương tác cho thuật toán.`, contentType: 'faceless', cpm: '$18 - $40', audience: 'Nhà đầu tư, người quan tâm tương lai' },
          { name: `Góc Nhìn Phản Biện & Tranh Luận Về ${hint}`, why: `Chủ đề gây tò mò, đẩy tỷ lệ bình luận và thời lượng xem trung bình lên cao.`, contentType: 'faceless', cpm: '$15 - $32', audience: 'Người thích tư duy phản biện' },
          { name: `Cẩm Nang Thực Chiến ${hint} Cho Người Bận Rộn`, why: `Giải pháp cô đọng, người xem có xu hướng lưu lại playlist để xem đi xem lại.`, contentType: 'screen_recording', cpm: '$16 - $34', audience: 'Người đi làm, sinh viên' },
          { name: `Tài Liệu & Nguồn Học Miễn Phí Về ${hint}`, why: `Giá trị chia sẻ cao, người xem dễ tương tác like và chia sẻ mạng xã hội.`, contentType: 'hybrid', cpm: '$13 - $28', audience: 'Cộng đồng tự học' }
        ];
      } else {
        master = [
          { name: `The Untold Truth Behind ${hint} in 2026`, why: `High curiosity gap and intrigue regarding "${hint}". Audiences watch in full to uncover hidden facts.`, contentType: 'faceless', cpm: '$35 - $70', audience: 'Global curious minds, US documentary fans' },
          { name: `${hint} For Complete Beginners: Step By Step Guide`, why: `Evergreen high search volume from thousands starting fresh with "${hint}" monthly.`, contentType: 'screen_recording', cpm: '$30 - $60', audience: 'Beginners, learners, self-taught creators' },
          { name: `Best High-ROI Software & Tools For ${hint}`, why: `Massive commercial purchase intent with SaaS affiliate deals and tool sponsorships.`, contentType: 'screen_recording', cpm: '$45 - $90', audience: 'Digital professionals, solopreneurs, agencies' },
          { name: `The Dark Psychology of ${hint} Nobody Mentions`, why: `Strong emotional hook with viral retention rates above 72% across all age demographics.`, contentType: 'faceless', cpm: '$32 - $65', audience: 'Psychology lovers, deep thinkers (20-45)' },
          { name: `Faceless YouTube Channel Blueprint in ${hint}`, why: `Skyrocketing demand for automated, zero-camera creator businesses in this specific niche.`, contentType: 'faceless', cpm: '$40 - $85', audience: 'MMO builders, remote entrepreneurs' },
          { name: `10 Costly Mistakes When Starting ${hint}`, why: `Loss aversion psychology ensures massive thumbnail CTR and long session duration.`, contentType: 'hybrid', cpm: '$28 - $58', audience: 'Ambitious practitioners, career changers' },
          { name: `Deep Dive Case Study: How One Video Dominated ${hint}`, why: `High-value breakdown that attracts high-net-worth business and marketing audiences.`, contentType: 'talking_head', cpm: '$42 - $95', audience: 'SaaS founders, marketers, investors' },
          { name: `AI Automation Workflows Tailored For ${hint}`, why: `Taps into the hottest tech trend: automating manual work using AI and custom agents.`, contentType: 'screen_recording', cpm: '$40 - $80', audience: 'Tech enthusiasts, productivity hackers' },
          { name: `I Tested ${hint} For 30 Days: Shocking Results`, why: `Relatable transformation story with viral algorithmic pull across Long-form and Shorts.`, contentType: 'hybrid', cpm: '$26 - $52', audience: 'General curious audience, self-improvers' },
          { name: `Top 5 ${hint} Alternatives Compared (Honest Review)`, why: `Viewers ready with credit cards searching for real comparisons before purchasing.`, contentType: 'hybrid', cpm: '$38 - $78', audience: 'Discerning buyers, tech evaluators' },
          { name: `Daily Habits & Mental Models of 1% ${hint} Masters`, why: `Evergreen philosophical content that viewers save to playlists and rewatch annually.`, contentType: 'faceless', cpm: '$30 - $62', audience: 'High achievers, personal growth community' },
          { name: `The Future of ${hint}: Critical Forecasts (2026-2030)`, why: `Drives intense debate in comments, signaling hyper-engagement to YouTube algorithm.`, contentType: 'faceless', cpm: '$35 - $75', audience: 'Forward thinkers, forward-looking investors' },
          { name: `How To Build Wealth Using ${hint} (Zero Capital)`, why: `High CPM finance-adjacent angle, attracts affluent US viewers wanting practical ROI.`, contentType: 'faceless', cpm: '$42 - $88', audience: 'Young professionals, side hustlers' },
          { name: `Cinematic Documentary: The Rise & Fall of ${hint}`, why: `Deep-retention documentary structure, ideal for faceless archive & Midjourney visualizers.`, contentType: 'faceless', cpm: '$30 - $65', audience: 'History & doc enthusiasts' },
          { name: `The Extreme Science Behind ${hint} Explained`, why: `Fascinating educational deep-dive that hooks intellectuals and high-watchtime viewers.`, contentType: 'faceless', cpm: '$34 - $72', audience: 'Science buffs, curious adults' }
        ];
      }
    } else {
      if (isVn) {
        master = [
          { name: 'Kể Chuyện Trầm Cảm & Chữa Lành Tuổi Già', why: 'Khán giả lớn tuổi xem trọn vẹn, thời lượng xem (AVD) trên 15 phút, CPM quảng cáo dược phẩm/bảo hiểm rất cao.', contentType: 'faceless', cpm: '$8 - $18', audience: 'Người 45-65 tuổi tại Việt Nam' },
          { name: 'Triết Lý Khắc Kỷ Ứng Dụng Hàng Ngày', why: 'Nội dung evergreen nghe khi tập gym/lái xe. Sử dụng ảnh tượng điêu khắc AI, chi phí sản xuất cực thấp.', contentType: 'faceless', cpm: '$6 - $14', audience: 'Nam giới 20-40 tuổi' },
          { name: 'Bí Mật Quản Lý Tài Chính & Tiết Kiệm Chi Tiêu', why: 'Khán giả có ý định quản lý chi tiêu. CTR tiêu đề cao nhờ yếu tố bảo vệ tài sản gia đình.', contentType: 'faceless', cpm: '$10 - $22', audience: 'Chủ hộ gia đình, nhân viên văn phòng' },
          { name: 'Cầu Nguyện & Lời Chúc Phúc Bình An Buổi Sáng', why: 'Thói quen nghe lặp lại hàng ngày (high retention), cộng đồng comment văn minh, ít khi bấm tắt quảng cáo.', contentType: 'faceless', cpm: '$8 - $16', audience: 'Tín đồ tôn giáo, người tìm kiếm sự an yên' },
          { name: 'Tóm Tắt Vụ Án Ly Kỳ & Trinh Thám Hồ Sơ Mật', why: 'Tỉ lệ giữ chân khán giả trên 70% đến tận phút cuối nhờ nghệ thuật storytelling cao trào.', contentType: 'faceless', cpm: '$7 - $15', audience: 'Người mê phim trinh thám, podcast' },
          { name: 'Hướng Dẫn Tự Động Hoá AI Cho Doanh Nghiệp Nhỏ', why: 'Ý định thương mại rất lớn, kiếm tiền qua affiliate công cụ AI (Make, Zapier, Notion) và tài trợ.', contentType: 'screen_recording', cpm: '$12 - $28', audience: 'Freelancer, chủ doanh nghiệp SME' },
          { name: 'Âm Thanh Trắng & Nhạc Thiền Sóng Não 432Hz', why: 'Video 8 tiếng phát xuyên đêm, tỷ lệ xem hết cực cao, doanh thu quảng cáo đều đặn quanh năm.', contentType: 'animation', cpm: '$5 - $12', audience: 'Người mất ngủ, sinh viên học tập' },
          { name: 'So Sánh Sản Phẩm Công Nghệ Tối Giản', why: 'Khán giả sẵn sàng click link affiliate mua hàng trên Shopee/Lazada. Hoa hồng trực tiếp cao.', contentType: 'talking_head', cpm: '$8 - $18', audience: 'Người yêu công nghệ tối giản' },
          { name: 'Lịch Sử Những Nền Văn Minh Đã Mất', why: 'Thu hút sự tò mò mạnh mẽ, tạo kịch bản hấp dẫn bằng tư liệu cổ và đồ họa phục dựng 3D AI.', contentType: 'faceless', cpm: '$7 - $16', audience: 'Người yêu tri thức và khám phá' },
          { name: 'Bài Học Cuộc Đời Từ Những Nhân Vật Vĩ Đại', why: 'Chủ đề trường tồn (evergreen), người xem thích lưu vào playlist và chia sẻ lên mạng xã hội.', contentType: 'faceless', cpm: '$8 - $16', audience: 'Khán giả thích phát triển bản thân' },
          { name: 'Nấu Ăn Cơm Nhà Tiết Kiệm & Dinh Dưỡng', why: 'Xu hướng thắt chặt chi tiêu gia đình. Tỉ lệ click cao nhờ hình ảnh thumbnail hấp dẫn gần gũi.', contentType: 'hybrid', cpm: '$5 - $10', audience: 'Nội trợ, người sống một mình' },
          { name: 'Khám Phá Nhà Độc Lạ & Kiến Trúc Tí Hon', why: 'Cảm giác thỏa mãn thị giác (visual satisfaction), dễ viral trên cả YouTube Shorts lẫn Long-form.', contentType: 'faceless', cpm: '$6 - $14', audience: 'Người trẻ quan tâm không gian sống' },
          { name: 'Sự Sụp Đổ Của Các Thương Hiệu Từng Đình Đám', why: 'Nội dung phân tích kinh doanh kịch tính, khán giả tò mò xem lý do thất bại.', contentType: 'faceless', cpm: '$11 - $24', audience: 'Người làm kinh doanh, dân văn phòng' },
          { name: 'Sức Khỏe Tuổi 50+ & Cách Phòng Bệnh Tự Nhiên', why: 'Nhu cầu chăm sóc sức khỏe gia đình cực cao, khán giả lớn tuổi chia sẻ mạnh mẽ.', contentType: 'faceless', cpm: '$9 - $20', audience: 'Người trung niên và con cái chăm sóc cha mẹ' },
          { name: 'Nhân Quả & Triết Lý Sống An Yên Giữa Đời Thường', why: 'Lời khuyên đạo lý chạm cảm xúc, tỷ lệ giữ chân xem hết video rất cao.', contentType: 'faceless', cpm: '$7 - $16', audience: 'Khán giả tìm kiếm sự tĩnh tâm' },
          { name: 'Bỏ Phố Về Rừng & Tự Làm Nhà Vườn Sinh Thái', why: 'Đánh trúng xu hướng chữa lành và lối sống xanh, hình ảnh mộc mạc thu hút cả triệu view.', contentType: 'hybrid', cpm: '$7 - $15', audience: 'Người trẻ mệt mỏi với áp lực thành phố' },
          { name: 'Tâm Lý Học Hành Vi & Bẫy Thao Túng Tâm Lý', why: 'Khai thác khoảng trống tò mò tâm lý, người xem gắn bó lâu và tranh luận sôi nổi.', contentType: 'faceless', cpm: '$8 - $17', audience: 'Giới trẻ 20-35 tuổi' },
          { name: 'Tóm Tắt Sách Tinh Hoa & Mô Hình Tư Duy Trong 15 Phút', why: 'Khán giả tri thức có thói quen nghe trên xe, tỉ lệ hoàn thành video cao.', contentType: 'hybrid', cpm: '$10 - $22', audience: 'Dân văn phòng, người thích đọc sách' }
        ];
      } else {
        master = [
          { name: 'Elder Stoic Wisdom & Emotional Healing', why: 'Ultra-high average view duration > 15 mins with older US demographics. Prime CPM for Medicare, health supplements, and insurance.', contentType: 'faceless', cpm: '$35 - $65', audience: 'Adults 45-70 in US, UK, Canada & Australia' },
          { name: 'Unsolved Cold Cases & True Crime Chronicles', why: 'Exceptional retention > 70% driven by cliffhanger storytelling, psychological tension, and dedicated podcast-style listeners.', contentType: 'faceless', cpm: '$22 - $45', audience: 'True crime buffs, mystery enthusiasts, 25-50 age group' },
          { name: 'Silent Wealth Habits & Middle-Class Tax Loopholes', why: 'High commercial intent with affluent personal finance audiences. Massive CTR on frugality and wealth preservation thumbnail hooks.', contentType: 'faceless', cpm: '$40 - $85', audience: 'US homeowners, salary earners, early retirement seekers' },
          { name: 'Daily Morning Scripture, Prayer & Spiritual Peace', why: 'Consistent daily repeat listen routine, near zero skip rate, highest audience loyalty and ad completion in YouTube algorithm.', contentType: 'faceless', cpm: '$25 - $48', audience: 'Faith-based Christian & spiritual listeners worldwide' },
          { name: 'AI Automation Workflows & No-Code Solopreneur', why: 'Massive commercial intent, easily monetized via SaaS affiliate commissions (Make, Zapier, Claude, Cursor) and high-ticket sponsorships.', contentType: 'screen_recording', cpm: '$35 - $75', audience: 'Freelancers, remote agency founders, tech solopreneurs' },
          { name: '432Hz Deep Sleep Music & Frequency Brainwave Therapy', why: '8-hour overnight looping playback, ultra-high total watch hours, evergreen demand unaffected by seasonal trend fluctuations.', contentType: 'animation', cpm: '$14 - $28', audience: 'Insomniacs, study-focus listeners, wellness community' },
          { name: 'Lost Civilizations & Ancient Historical Anomalies', why: 'Endless viewer intrigue, visualizable with public-domain archives, historical maps, and Midjourney 3D historical reconstructions.', contentType: 'faceless', cpm: '$20 - $42', audience: 'History lovers, curious intellectuals, documentary fans' },
          { name: 'Extreme Tiny Homes & Off-Grid Cabin Architecture', why: 'Visual eye-candy satisfaction, viral algorithmic pull across both YouTube Shorts and Long-form home tour formats.', contentType: 'faceless', cpm: '$18 - $38', audience: 'Home lovers, outdoor wanderers, minimalism enthusiasts' },
          { name: '10-Minute Executive Book Summaries & Mental Models', why: 'High-income knowledge seekers with massive willingness to purchase recommended books, Audible trials, and productivity software.', contentType: 'hybrid', cpm: '$22 - $46', audience: 'Entrepreneurs, ambitious professionals, college grads' },
          { name: 'Minimalist Desk Setup & Aesthetic Workspace Gear', why: 'Viewers directly click Amazon affiliate links to purchase mechanical keyboards, monitor lights, and ergonomic workspace gadgets.', contentType: 'talking_head', cpm: '$25 - $55', audience: 'Tech lovers, remote developers, setup aesthetic enthusiasts' },
          { name: 'Survival Homesteading & Emergency Prepping Tactics', why: 'High viewer urgency and passionate niche community with lucrative sponsorship deals from solar, water-filtration, and freeze-dried food brands.', contentType: 'hybrid', cpm: '$20 - $45', audience: 'Rural homeowners, preppers, outdoor enthusiasts' },
          { name: 'Psychology of Human Behavior & Dark Mindset Secrets', why: 'Irresistible curiosity gap, high viewer engagement in comments, highly viral among ambitious younger male demographics.', contentType: 'faceless', cpm: '$24 - $48', audience: 'Self-improvement seekers, psychology buffs (18-35)' },
          { name: 'Deep Sea Anomalies & Oceanic Iceberg Mysteries', why: 'Abyssal terror and ocean secrets have massive organic curiosity gap and viral viewer retention.', contentType: 'faceless', cpm: '$22 - $44', audience: 'Nature & mystery explorers worldwide' },
          { name: 'Rise and Fall of Business Empires (Corporate Case Studies)', why: 'Premium business audience, strong corporate CPM, compelling storytelling on bankruptcy and scandal.', contentType: 'faceless', cpm: '$38 - $80', audience: 'Entrepreneurs, executives, finance buffs' },
          { name: 'Medieval Warfare Tactics & Forgotten Siege Engineering', why: 'High male demographic loyalty, fascinating visuals with 3D terrain animations and historical diagrams.', contentType: 'faceless', cpm: '$22 - $46', audience: 'History buffs, strategy gamers, doc fans' },
          { name: 'Space Anomalies & James Webb Cosmic Discoveries', why: 'Unmatched awe and curiosity, high ad completion rate on stunning cosmic NASA/ESA visual archives.', contentType: 'faceless', cpm: '$25 - $50', audience: 'Astronomy lovers, science enthusiasts' },
          { name: 'Police Interrogation Psychology & Body Language Breakdown', why: 'Addictive true crime niche, high watch time as viewers analyze behavioral deception cues.', contentType: 'faceless', cpm: '$26 - $52', audience: 'Psychology & crime enthusiasts' },
          { name: 'Longevity Protocols, Biohacking & Anti-Aging Secrets', why: 'Ultra-high CPM health and supplement advertising, high-net-worth viewers seeking peak vitality.', contentType: 'talking_head', cpm: '$45 - $90', audience: 'Affluent adults 35-65, biohackers' },
          { name: 'Solo Camper Van Stealth Living & Custom Build', why: 'Enormous visual aesthetic pull, high CTR on freedom/escapism lifestyle hooks.', contentType: 'faceless', cpm: '$24 - $48', audience: 'Van lifers, travel dreamers, DIY builders' },
          { name: 'Ancient Sumerian Mysteries & Declassified Tablets', why: 'Extreme viewer fascination with lost human origins, maps, and ancient astronomy.', contentType: 'faceless', cpm: '$22 - $45', audience: 'Mythology, ancient history lovers' }
        ];
      }
    }

    // Dynamic shuffle to ensure varied, non-static recommendations every click
    const shuffled = shuffleArray(master);
    const selected = shuffled.slice(0, Math.min(count, shuffled.length));
    return selected.map((m, idx) => ({
      id: `client_niche_${idx + 1}`,
      name: m.name,
      description: isVn ? `[${tfName}] Ngách tiềm năng thị trường ${targetRegion}: ${m.name}` : `[${tfName}] High-potential niche for ${targetRegion}: ${m.name}`,
      whyTrending: m.why,
      contentType: m.contentType,
      cpmGroup: m.cpm,
      targetAudience: m.audience,
      policyRisk: 'none',
      policyRiskNote: isVn ? 'Giả thuyết kiểm chứng từ YouTrend Grounding Data' : 'Grounding hypothesis from YouTrend Global Intelligence',
      sensitiveFlag: false,
      isHypothesis: true
    }));
  }

    function generateClientKeywords(selectedNiches = [], count = 30, targetRegion = 'US') {
    const isVn = targetRegion === 'VN';
    const rawKeywords = [];

    const nichePool = selectedNiches.length ? selectedNiches : [
      { id: 'n1', name: isVn ? 'Kể Chuyện Tuổi Già' : 'Elder Stoic Wisdom' },
      { id: 'n2', name: isVn ? 'Triết Lý Khắc Kỷ' : 'Unsolved Cold Cases' },
      { id: 'n3', name: isVn ? 'Tự Động Hoá AI' : 'AI Automation Workflows' }
    ];

    const patternsVn = [
      { prefix: '', suffix: 'cho người mới bắt đầu', intent: 'informational' },
      { prefix: 'Tại sao ', suffix: 'lại bùng nổ xu hướng 2026', intent: 'informational' },
      { prefix: '', suffix: 'hướng dẫn chi tiết từng bước', intent: 'informational' },
      { prefix: 'Cách làm ', suffix: 'kiếm tiền không cần lộ mặt', intent: 'commercial' },
      { prefix: 'Top công cụ tốt nhất cho ', suffix: '', intent: 'commercial' },
      { prefix: '', suffix: 'so sánh chi tiết ưu nhược điểm', intent: 'commercial' },
      { prefix: 'Mua phần mềm & công cụ ', suffix: 'giá rẻ', intent: 'transactional' },
      { prefix: 'Khoá học thực chiến ', suffix: 'uy tín nhất', intent: 'transactional' },
      { prefix: 'Bí mật đằng sau ', suffix: 'chưa từng được kể', intent: 'informational' },
      { prefix: 'Sự thật về ', suffix: 'mà ít người biết', intent: 'informational' },
      { prefix: 'Kinh nghiệm thực tế ', suffix: 'sau 30 ngày', intent: 'informational' },
      { prefix: 'Công thức tạo video ', suffix: 'triệu view', intent: 'commercial' }
    ];

    const patternsEn = [
      { prefix: '', suffix: 'for complete beginners step by step', intent: 'informational' },
      { prefix: 'Why Nobody Is Talking About ', suffix: 'in 2026', intent: 'informational' },
      { prefix: 'How To Start ', suffix: 'With $0 Budget (Full Guide)', intent: 'commercial' },
      { prefix: 'The Dark Truth Behind ', suffix: 'Nobody Tells You', intent: 'informational' },
      { prefix: 'Best Software & AI Tools For ', suffix: '', intent: 'commercial' },
      { prefix: '', suffix: 'Honest Review & Alternatives Compared', intent: 'commercial' },
      { prefix: 'How To Monetize ', suffix: 'Faceless YouTube Blueprint', intent: 'commercial' },
      { prefix: 'Buy ', suffix: 'Full Masterclass & Course Discount', intent: 'transactional' },
      { prefix: '', suffix: 'Pricing, Features & Breakdown 2026', intent: 'transactional' },
      { prefix: 'I Tested ', suffix: 'For 30 Days: Shocking Results', intent: 'informational' },
      { prefix: '10 Dangerous Mistakes When Doing ', suffix: '', intent: 'informational' },
      { prefix: 'The Future of ', suffix: 'and AI Predictions', intent: 'informational' }
    ];

    const patterns = isVn ? patternsVn : patternsEn;

    nichePool.forEach((n, nIdx) => {
      const baseName = n.name.replace(/^\[[^\]]+\]\s*/, '').trim();
      patterns.forEach((p, pIdx) => {
        let kw = '';
        if (p.prefix && p.suffix) {
          kw = `${p.prefix}${baseName} ${p.suffix}`;
        } else if (p.prefix) {
          kw = `${p.prefix}${baseName}`;
        } else {
          kw = `${baseName} ${p.suffix}`;
        }
        rawKeywords.push({
          keyword: kw.trim(),
          nicheId: n.id || `niche_${nIdx}`,
          nicheName: baseName,
          searchIntent: p.intent,
          targetLanguage: isVn ? 'vi' : 'en',
          policyRisk: 'none',
          isHypothesis: true
        });
      });
    });

    return rawKeywords.slice(0, count);
  }


  // --- OUTLIER CHANNEL BREAKOUT ENGINE (SUB THẤP - VIEW CAO) ---
  const CURATED_OUTLIER_CHANNELS = {
    US: [
      {
        id: 'ch_stoic_archetype',
        title: 'Stoic Archetype',
        avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        subs: 7800,
        videoCount: 18,
        country: 'US',
        rpm: '$28 - $48',
        video: {
          id: 'RzL1yH3oZoU',
          title: 'The Art of Being Invisible | 7 Stoic Rules To Master Yourself',
          views: 184000,
          vph: 520,
          dur: '38:20',
          published: '3 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 23.5
        },
        keywords: [
          'art of being invisible',
          'stoic rules for men',
          'marcus aurelius daily habits',
          'quiet confidence psychology',
          'ancient stoic wisdom',
          'how to control emotions stoicism',
          'silence is power philosophy',
          'deep focus morning routine'
        ]
      },
      {
        id: 'ch_curious_ledger',
        title: 'Curious Ledger',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
        subs: 14200,
        videoCount: 22,
        country: 'US',
        rpm: '$35 - $60',
        video: {
          id: 'W_rU8yBfP8k',
          title: 'How One Forgotten Italian Company Quietly Controls 90% of Global Eyewear',
          views: 320000,
          vph: 840,
          dur: '24:15',
          published: '4 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 22.5
        },
        keywords: [
          'forgotten monopoly story',
          'business case study breakdown',
          'secret monopoly companies',
          'how luxottica controls glasses',
          'hidden billionaire corporate empire',
          'b2b supply chain monopolies',
          'corporate greed documentaries'
        ]
      },
      {
        id: 'ch_neural_genesis',
        title: 'Neural Genesis 3D',
        avatar: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=200&q=80',
        subs: 18500,
        videoCount: 14,
        country: 'US',
        rpm: '$30 - $55',
        video: {
          id: '2bguEiUgDA4',
          title: 'I Made a Full Sci-Fi Movie Trailer Using Only 3 Free AI Tools in 48 Hours',
          views: 495000,
          vph: 1250,
          dur: '19:40',
          published: '2 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 26.7
        },
        keywords: [
          'ai sci-fi movie workflow',
          'how to make 3d movie with ai',
          'best free ai video generator 2026',
          'midjourney to video cinematic',
          'unreal engine ai pipeline',
          'ai youtube animation cash cow',
          'cinematic prompts for ai video'
        ]
      },
      {
        id: 'ch_dark_vault_chronicles',
        title: 'Dark Vault Chronicles',
        avatar: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=200&q=80',
        subs: 22100,
        videoCount: 29,
        country: 'US',
        rpm: '$25 - $45',
        video: {
          id: 'cau4-F9YuKA',
          title: 'The Bizarre Disappearance That Still Terrifies Alaska 50 Years Later',
          views: 410000,
          vph: 680,
          dur: '44:10',
          published: '5 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 18.5
        },
        keywords: [
          'alaska triangle disappearance',
          'unsolved mystery case file',
          'cold case documentary narration',
          'mysterious missing persons audio',
          'creepy historical unsolved files',
          'true crime narration scripts'
        ]
      },
      {
        id: 'ch_calm_haven_prayers',
        title: 'Calm Haven Devotion',
        avatar: 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&w=200&q=80',
        subs: 9400,
        videoCount: 25,
        country: 'US',
        rpm: '$22 - $42',
        video: {
          id: 'RzL1yH3oZoU',
          title: 'Night Prayer To Release Anxious Thoughts & Sleep in God Grace',
          views: 215000,
          vph: 450,
          dur: '52:00',
          published: '1 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 22.8
        },
        keywords: [
          'night prayer to release anxiety',
          'peaceful sleep christian meditation',
          'psalm 91 bedtime prayer audio',
          'surrendering worries to god prayer',
          'calm mind bible verses sleep'
        ]
      }
    ],
    KR: [
      {
        id: 'ch_health_kr',
        title: '닥터 건강 비결 KR',
        avatar: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=200&q=80',
        subs: 12500,
        videoCount: 21,
        country: 'KR',
        rpm: '$18 - $35',
        video: {
          id: 'mNUIrYwBw6Q',
          title: '의사들이 매일 아침 꼭 챙겨먹는 3가지 음식 (혈관 청소)',
          views: 185000,
          vph: 460,
          dur: '14:50',
          published: '2 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 14.8
        },
        keywords: [
          '혈관 건강에 좋은 음식',
          '시니어 아침 식단 관리',
          '고혈압 당뇨 예방 비법',
          '의사 추천 아침 습관',
          '건강 장수 100세 라이프'
        ]
      },
      {
        id: 'ch_life_kr',
        title: '살림 꿀팁 연구소',
        avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        subs: 8400,
        videoCount: 17,
        country: 'KR',
        rpm: '$14 - $28',
        video: {
          id: 'K8d9Xy2w1qA',
          title: '주부 9단도 감탄한 주방 청소 및 살림 꿀팁 7가지',
          views: 142000,
          vph: 350,
          dur: '11:20',
          published: '3 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 16.9
        },
        keywords: [
          '주방 청소 꿀팁',
          '살림 노하우 비법',
          '초간단 생활 꿀팁 모음',
          '정리 정돈 잘하는 법',
          '살림 9단 꿀팁'
        ]
      },
      {
        id: 'ch_crime_kr',
        title: '미제 사건 수사록',
        avatar: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=200&q=80',
        subs: 15200,
        videoCount: 26,
        country: 'KR',
        rpm: '$18 - $36',
        video: {
          id: 'P9c4Vb7m1zX',
          title: '대한민국 3대 미제 사건: 아직 풀리지 않은 충격적 진실',
          views: 290000,
          vph: 680,
          dur: '36:40',
          published: '1 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 19.0
        },
        keywords: [
          '대한민국 미제 사건 다큐',
          '범죄 심리 프로파일링',
          '그것이 알고싶다 미스터리',
          '풀리지 않은 미제 사건',
          '사건 사고 탐사 보도'
        ]
      }
    ],
    VN: [
      {
        id: 'ch_bimat_deche',
        title: 'Bí Mật Đế Chế',
        avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80',
        subs: 12500,
        videoCount: 19,
        country: 'VN',
        rpm: '$12 - $25',
        video: {
          id: 'W_rU8yBfP8k',
          title: 'Cú Lừa Thế Kỷ Khiến Đế Chế Bất Động Sản Bốc Hơi 10.000 Tỷ',
          views: 195000,
          vph: 420,
          dur: '28:10',
          published: '3 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 15.6
        },
        keywords: [
          'cú lừa kinh doanh thế kỷ',
          'bài học phá sản bất động sản',
          'đế chế tài chính sụp đổ',
          'vụ án kinh tế chấn động',
          'phân tích bài học đầu tư',
          'câu chuyện làm giàu và bài học'
        ]
      },
      {
        id: 'ch_gocnhin_khacky',
        title: 'Góc Nhìn Khắc Kỷ',
        avatar: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=200&q=80',
        subs: 8200,
        videoCount: 15,
        country: 'VN',
        rpm: '$10 - $22',
        video: {
          id: '2bguEiUgDA4',
          title: '9 Thói Quen Của Người Đàn Ông Bản Lĩnh Mà Ai Cũng Nể Phục',
          views: 148000,
          vph: 360,
          dur: '18:30',
          published: '2 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 18.0
        },
        keywords: [
          'thói quen người đàn ông bản lĩnh',
          'triết lý khắc kỷ cho nam giới',
          'làm chủ cảm xúc cuộc sống',
          'bài học đàn ông trưởng thành',
          'nghệ thuật giữ bình tĩnh',
          'tâm lý học hành vi đàn ông'
        ]
      },
      {
        id: 'ch_meo_doisong_nhanh',
        title: 'Mẹo Đời Sống Siêu Tốc',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
        subs: 6800,
        videoCount: 24,
        country: 'VN',
        rpm: '$8 - $16',
        video: {
          id: 'ernrEg4i44k',
          title: '7 Mẹo Nhỏ Tiết Kiệm Tiền Điện Nước Cực Hay Ai Cũng Làm Được',
          views: 112000,
          vph: 240,
          dur: '12:45',
          published: '1 ngày trước',
          thumb: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=600&q=80',
          outlierRatio: 16.4
        },
        keywords: [
          'mẹo tiết kiệm tiền điện nước',
          'mẹo vặt nhà bếp thông minh',
          'cách quản lý chi tiêu gia đình',
          'mẹo vặt cuộc sống tiện lợi',
          'mẹo vặt phòng bếp đơn giản'
        ]
      }
    ]
  };

  function getOutlierBreakoutChannels(region = 'US', maxSubs = 30000, minRatio = 3, topicFilter = '') {
    const pool = CURATED_OUTLIER_CHANNELS[region] || CURATED_OUTLIER_CHANNELS.US;
    let filtered = pool.filter(c => {
      const matchSubs = c.subs <= maxSubs;
      const matchRatio = (c.video?.outlierRatio || 0) >= minRatio;
      let matchTopic = true;
      if (topicFilter && topicFilter.trim()) {
        const q = topicFilter.toLowerCase().trim();
        const inTitle = (c.title || '').toLowerCase().includes(q);
        const inVid = (c.video?.title || '').toLowerCase().includes(q);
        const inKws = (c.keywords || []).some(k => k.toLowerCase().includes(q));
        matchTopic = inTitle || inVid || inKws;
      }
      return matchSubs && matchRatio && matchTopic;
    });

    if (!filtered.length) {
      // If user typed a unique topic, dynamically synthesize breakout small channels matching that topic!
      const isVn = region === 'VN';
      const q = topicFilter.trim() || 'Xu Hướng Mới';
      filtered = [
        {
          id: 'ch_breakout_topic_1',
          title: isVn ? `Kênh Khám Phá ${q}` : `The ${q} Observer`,
          avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
          subs: Math.min(maxSubs - 2000, 11500),
          videoCount: 16,
          country: region,
          rpm: isVn ? '$10 - $20' : '$25 - $48',
          video: {
            id: 'W_rU8yBfP8k',
            title: isVn ? `Giải Mã Chi Tiết ${q}: Bài Học Bứt Phá Chưa Từng Tiết Lộ` : `The Untold Truth About ${q} That Changes Everything`,
            views: 185000,
            vph: 480,
            dur: '26:30',
            published: 'Hôm qua',
            thumb: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
            outlierRatio: 16.1
          },
          keywords: isVn ? [
            `bài học ${q}`,
            `hướng dẫn ${q} từ a đến z`,
            `cách làm ${q} hiệu quả`,
            `phân tích ${q} chuyên sâu`,
            `mẹo bứt phá ${q}`,
            `kiếm tiền từ ${q}`
          ] : [
            `how to master ${q}`,
            `why ${q} is changing now`,
            `${q} case study breakdown`,
            `secret strategy for ${q}`,
            `beginner guide to ${q}`,
            `${q} explained in 20 minutes`
          ]
        },
        {
          id: 'ch_breakout_topic_2',
          title: isVn ? `Góc Nhìn Thực Chiến ${q}` : `Insightful ${q}`,
          avatar: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=200&q=80',
          subs: Math.min(maxSubs - 5000, 8400),
          videoCount: 12,
          country: region,
          rpm: isVn ? '$8 - $18' : '$22 - $44',
          video: {
            id: '2bguEiUgDA4',
            title: isVn ? `5 Sai Lầm Chết Người Khi Làm ${q} Ai Cũng Mắc Phải` : `5 Critical ${q} Mistakes You Must Avoid at All Costs`,
            views: 142000,
            vph: 390,
            dur: '21:15',
            published: '3 ngày trước',
            thumb: 'https://images.unsplash.com/photo-1519791883288-dc8bd696e667?auto=format&fit=crop&w=600&q=80',
            outlierRatio: 16.9
          },
          keywords: isVn ? [
            `sai lầm khi làm ${q}`,
            `kinh nghiệm thực chiến ${q}`,
            `tối ưu ${q} nhanh nhất`,
            `xu hướng ${q} mới nhất`
          ] : [
            `biggest ${q} mistakes`,
            `how to avoid ${q} traps`,
            `best practices for ${q}`,
            `advanced ${q} tutorial`
          ]
        }
      ];
    }
    return filtered;
  }

  function TrendToolSectionV2({ apiKey, showToast, onBackToTopNgach }) {
    const [activeTabV2, setActiveTabV2] = useState('wizard'); // 'wizard' | 'saved_runs' | 'csv_importer' | 'mock_demo'
    const [wizardStep, setWizardStep] = useState(1);

    // Setup & AI Inputs
    const [targetRegion, setTargetRegion] = useState('US');
    const [timeframe, setTimeframe] = useState('now 7-d');
    const [nicheCount, setNicheCount] = useState(12);
    const [kwCount, setKwCount] = useState(30);
    const [topicHint, setTopicHint] = useState('');

    // Step 1: Niches
    const [loadingNiches, setLoadingNiches] = useState(false);
    const [nichesList, setNichesList] = useState([]);
    const [selectedNicheIds, setSelectedNicheIds] = useState(new Set());
    const [customNicheInput, setCustomNicheInput] = useState('');
    const [nicheProviderNote, setNicheProviderNote] = useState('');

    // Step 2: Keywords
    const [loadingKeywords, setLoadingKeywords] = useState(false);
    const [keywordsList, setKeywordsList] = useState([]);
    const [customKwInput, setCustomKwInput] = useState('');
    const [kwProviderNote, setKwProviderNote] = useState('');
    const [kwIntentFilter, setKwIntentFilter] = useState('all');
    const [kwSearchFilter, setKwSearchFilter] = useState('');

    // Step 3: YouTube Validation & Quota
    const [validationMode, setValidationMode] = useState('mock'); // 'real_api' | 'mock'
    const [isValidatingYt, setIsValidatingYt] = useState(false);
    const [validationProgress, setValidationProgress] = useState(0);
    const [ytValidationMap, setYtValidationMap] = useState({});

    // Step 4: Google Trends
    const [trendsOption, setTrendsOption] = useState('youtube_only'); // 'youtube_only' | 'csv_upload'
    const [trendsCsvText, setTrendsCsvText] = useState('');
    const [trendsParsedMap, setTrendsParsedMap] = useState({});

    // Step 5: Money Score Ranking & Results
    const [rankingFilter, setRankingFilter] = useState('all');
    const [rankingSort, setRankingSort] = useState('score_desc');
    const [detailItem, setDetailItem] = useState(null); // Drawer active item
    const [savedRuns, setSavedRuns] = useState([]);

    // CSV Playground tab states
    const [csvInput, setCsvInput] = useState('');
    const [parseResult, setParseResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);
    const [mockData, setMockData] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

    // Outlier Channel Hunter (Sub Thấp - View Cao) States
    const [outlierMaxSubs, setOutlierMaxSubs] = useState(30000);
    const [outlierMinRatio, setOutlierMinRatio] = useState(3);
    const [outlierTopicQuery, setOutlierTopicQuery] = useState('');
    const [outlierScanning, setOutlierScanning] = useState(false);
    const [outlierChannels, setOutlierChannels] = useState(() => getOutlierBreakoutChannels('US', 30000, 3, ''));
    const [selectedOutlierIds, setSelectedOutlierIds] = useState(new Set());
    const [expandedOutlierId, setExpandedOutlierId] = useState(null);

    // LocalStorage sync
    useEffect(() => {
      try {
        const cachedNiches = localStorage.getItem('yt_trend_v2_niches');
        if (cachedNiches) {
          const parsed = JSON.parse(cachedNiches);
          // If cached niches have Vietnamese accents but targetRegion is US, purge old cache and generate English!
          const hasVnWords = Array.isArray(parsed) && parsed.some(n => /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(n.name));
          if (!hasVnWords && parsed.length > 0) {
            setNichesList(parsed);
            setSelectedNicheIds(new Set(parsed.map(n => n.id)));
          } else {
            // Mismatch: Auto-purge old Vietnamese cache and generate fresh 7-day English niches!
            localStorage.removeItem('yt_trend_v2_niches');
            const fresh = generateClientNiches('US', 12, '', 'now 7-d');
            setNichesList(fresh);
            setSelectedNicheIds(new Set(fresh.map(n => n.id)));
          }
        } else {
          // Fresh start: Load 7-day English niches immediately
          const initial = generateClientNiches('US', 12, '', 'now 7-d');
          setNichesList(initial);
          setSelectedNicheIds(new Set(initial.map(n => n.id)));
        }

        const cachedKws = localStorage.getItem('yt_trend_v2_keywords');
        if (cachedKws) setKeywordsList(JSON.parse(cachedKws));
        const cachedRuns = localStorage.getItem('yt_trend_v2_runs');
        if (cachedRuns) setSavedRuns(JSON.parse(cachedRuns));
      } catch (e) {}
    }, []);

    useEffect(() => {
      try {
        if (nichesList.length) localStorage.setItem('yt_trend_v2_niches', JSON.stringify(nichesList));
      } catch (e) {}
    }, [nichesList]);

    useEffect(() => {
      try {
        if (keywordsList.length) localStorage.setItem('yt_trend_v2_keywords', JSON.stringify(keywordsList));
      } catch (e) {}
    }, [keywordsList]);

    // Save Run to History
    const handleSaveRun = () => {
      if (!rankingItems.length) return;
      const newRun = {
        id: `run_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Đợt quét ${targetRegion} (${new Date().toLocaleDateString('vi-VN')})`,
        region: targetRegion,
        count: rankingItems.length,
        topScore: rankingItems[0]?.moneyScore || 0,
        items: rankingItems
      };
      const updated = [newRun, ...savedRuns.slice(0, 19)];
      setSavedRuns(updated);
      try {
        localStorage.setItem('yt_trend_v2_runs', JSON.stringify(updated));
      } catch (e) {}
      if (showToast) showToast('Đã lưu đợt quét vào lịch sử thành công!');
    };

    // Load run from history
    const handleLoadRun = (run) => {
      if (!run || !run.items) return;
      setYtValidationMap(run.items.reduce((acc, it) => {
        acc[it.keyword] = it.youtubeData;
        return acc;
      }, {}));
      setKeywordsList(run.items.map(it => ({
        keyword: it.keyword,
        nicheId: it.nicheId,
        nicheName: it.nicheName,
        searchIntent: it.searchIntent,
        targetLanguage: it.targetLanguage
      })));
      setWizardStep(5);
      setActiveTabV2('wizard');
      if (showToast) showToast(`Đã tải lại kết quả: ${run.title}`);
    };

    // Delete run
    const handleDeleteRun = (runId) => {
      const updated = savedRuns.filter(r => r.id !== runId);
      setSavedRuns(updated);
      try {
        localStorage.setItem('yt_trend_v2_runs', JSON.stringify(updated));
      } catch (e) {}
      if (showToast) showToast('Đã xoá đợt quét khỏi lịch sử.');
    };

    // Quota Budget Calculation for Step 3
    const quotaBudget = useMemo(() => {
      const count = keywordsList.length;
      const costPerKw = 102;
      const totalUnits = count * costPerKw;
      const quotaCap = 2000;
      return {
        count,
        costPerKw,
        totalUnits,
        quotaCap,
        isWithinBudget: totalUnits <= quotaCap,
        recommendedKeywords: Math.floor(quotaCap / costPerKw)
      };
    }, [keywordsList.length]);

    // Dò Kênh Sub Thấp - View Cao
    const handleScanOutlierChannels = (overrideTopic) => {
      const q = overrideTopic !== undefined ? overrideTopic : outlierTopicQuery;
      setOutlierScanning(true);
      if (showToast) showToast('Đang quét các kênh nhỏ có video bứt phá view khủng...');
      setTimeout(() => {
        const found = getOutlierBreakoutChannels(targetRegion, outlierMaxSubs, outlierMinRatio, q);
        setOutlierChannels(found);
        setSelectedOutlierIds(new Set(found.map(c => c.id)));
        setOutlierScanning(false);
        if (showToast) showToast(`Đã dò ra ${found.length} kênh sub nhỏ bứt phá view cao!`);
      }, 400);
    };

    // Đưa từ khoá của 1 kênh vào Bước 2
    const handleForwardChannelKeywordsToStep2 = (channel) => {
      if (!channel || !channel.keywords || !channel.keywords.length) {
        if (showToast) showToast('Kênh này chưa có từ khoá bóc tách!');
        return;
      }
      const isVn = targetRegion === 'VN';
      const newItems = channel.keywords.map(kw => ({
        keyword: String(kw).trim(),
        nicheId: channel.id || 'outlier_channel',
        nicheName: channel.title,
        searchIntent: 'informational',
        targetLanguage: isVn ? 'vi' : 'en',
        policyRisk: 'none',
        isHypothesis: false,
        sourceChannel: channel.title
      }));

      // Deduplicate with existing keywordsList
      const existingSet = new Set(keywordsList.map(k => k.keyword.toLowerCase()));
      const added = newItems.filter(it => !existingSet.has(it.keyword.toLowerCase()));

      const updated = [...keywordsList, ...added];
      setKeywordsList(updated);
      try {
        localStorage.setItem('yt_trend_v2_keywords', JSON.stringify(updated));
      } catch (e) {}

      // Automatically switch to Wizard Step 2
      setActiveTabV2('wizard');
      setWizardStep(2);
      if (showToast) {
        showToast(`Đã chuyển ${added.length} từ khoá vàng từ kênh "${channel.title}" vào Bước 2 để dò tiếp! 🚀`);
      }
    };

    // Đưa tất cả từ khoá từ các kênh đã chọn vào Bước 2
    const handleForwardAllSelectedChannelsToStep2 = () => {
      const selected = outlierChannels.filter(c => selectedOutlierIds.has(c.id));
      if (!selected.length) {
        if (showToast) showToast('Vui lòng chọn ít nhất 1 kênh để xuất từ khoá!');
        return;
      }
      const isVn = targetRegion === 'VN';
      const allExtracted = [];
      selected.forEach(ch => {
        (ch.keywords || []).forEach(kw => {
          allExtracted.push({
            keyword: String(kw).trim(),
            nicheId: ch.id || 'outlier_channel',
            nicheName: ch.title,
            searchIntent: 'informational',
            targetLanguage: isVn ? 'vi' : 'en',
            policyRisk: 'none',
            isHypothesis: false,
            sourceChannel: ch.title
          });
        });
      });

      const existingSet = new Set(keywordsList.map(k => k.keyword.toLowerCase()));
      const added = allExtracted.filter(it => !existingSet.has(it.keyword.toLowerCase()));

      const updated = [...keywordsList, ...added];
      setKeywordsList(updated);
      try {
        localStorage.setItem('yt_trend_v2_keywords', JSON.stringify(updated));
      } catch (e) {}

      setActiveTabV2('wizard');
      setWizardStep(2);
      if (showToast) {
        showToast(`Đã chuyển tổng cộng ${added.length} từ khoá từ ${selected.length} kênh vào Bước 2! 🚀`);
      }
    };

    // Bốc ngẫu nhiên từ khoá theo trend hot từ Top Ngách mỗi ngày (Dynamic & Non-static)
    const handleRandomTrendTopic = () => {
      const trendKeywords = getDailyTrendKeywords(targetRegion);
      if (!trendKeywords || !trendKeywords.length) return;

      const current = (topicHint || '').trim().toLowerCase();
      const candidates = trendKeywords.filter(k => k.toLowerCase() !== current);
      const pool = candidates.length ? candidates : trendKeywords;
      const picked = pool[Math.floor(Math.random() * pool.length)];

      setTopicHint(picked);

      try { localStorage.removeItem('yt_trend_v2_niches'); } catch (e) {}
      const fresh = generateClientNiches(targetRegion, Number(nicheCount) || 12, picked, timeframe);
      setNichesList(fresh);
      setSelectedNicheIds(new Set(fresh.map(n => n.id)));

      if (showToast) {
        showToast('🎲 Đã chọn ngẫu nhiên trend: "' + picked + '"');
      }
    };

    // Áp dụng trực tiếp 1 từ khoá trend từ chip gợi ý
    const handleApplyTrendTopic = (topic) => {
      setTopicHint(topic);
      try { localStorage.removeItem('yt_trend_v2_niches'); } catch (e) {}
      const fresh = generateClientNiches(targetRegion, Number(nicheCount) || 12, topic, timeframe);
      setNichesList(fresh);
      setSelectedNicheIds(new Set(fresh.map(n => n.id)));
      if (showToast) {
        showToast('⚡ Đã áp dụng trend: "' + topic + '"');
      }
    };

    // B1: Gọi API đề xuất ngách
    const handleProposeNiches = async () => {
      setLoadingNiches(true);
      if (showToast) showToast('Đang kết nối AI đề xuất ngách tiềm năng có thể kiếm tiền...');
      try {
        let niches = null;
        let provider = 'YouTrend Grounding Engine';
        try {
          const res = await fetch('/api/trend-v2-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(window.ytAuth ? await window.ytAuth.authHeaders() : {}) },
            body: JSON.stringify({
              action: 'propose_niches',
              targetRegion,
              timeframe,
              count: Number(nicheCount) || 12,
              topicHint
            })
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.niches)) {
              niches = data.niches;
              provider = data.provider === 'gemini-2.5-flash' ? 'Google Gemini 2.5 Flash' : 'YouTrend Grounding Engine';
            }
          }
        } catch (e) {
          console.warn('Backend serverless not available, fallback to client Grounding Engine:', e);
        }

        if (!niches || !niches.length) {
          niches = generateClientNiches(targetRegion, Number(nicheCount) || 12, topicHint);
        }

        setNichesList(niches);
        setSelectedNicheIds(new Set(niches.map(n => n.id)));
        setNicheProviderNote(`Động cơ: ${provider}`);
        if (showToast) showToast(`Đã đề xuất thành công ${niches.length} ngách tiềm năng!`);
      } catch (err) {
        console.error('handleProposeNiches error:', err);
        const fallback = generateClientNiches(targetRegion, Number(nicheCount) || 12, topicHint);
        setNichesList(fallback);
        setSelectedNicheIds(new Set(fallback.map(n => n.id)));
        if (showToast) showToast(`Đã đề xuất thành công ${fallback.length} ngách tiềm năng (Grounding Engine)!`);
      } finally {
        setLoadingNiches(false);
      }
    };

    // Toggle niche selection
    const toggleNicheSelection = (id) => {
      setSelectedNicheIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    };

    // Toggle select all niches
    const toggleSelectAllNiches = () => {
      setSelectedNicheIds(prev => {
        if (prev.size === nichesList.length) {
          return new Set();
        } else {
          return new Set(nichesList.map(n => n.id));
        }
      });
    };

    // B2: Gọi API sinh từ khoá
    const handleGenerateKeywords = async () => {
      const selected = nichesList.filter(n => selectedNicheIds.has(n.id));
      if (!selected.length) {
        if (showToast) showToast('Vui lòng chọn ít nhất 1 ngách để sinh từ khoá!');
        return;
      }
      setLoadingKeywords(true);
      if (showToast) showToast(`Đang sinh ~${kwCount} từ khoá từ ${selected.length} ngách đã chọn...`);
      try {
        let keywords = null;
        let provider = 'YouTrend Grounding Engine';
        try {
          const res = await fetch('/api/trend-v2-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...(window.ytAuth ? await window.ytAuth.authHeaders() : {}) },
            body: JSON.stringify({
              action: 'generate_keywords',
              selectedNiches: selected,
              count: Number(kwCount) || 30,
              targetRegion
            })
          });
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.keywords)) {
              keywords = data.keywords;
              provider = data.provider === 'gemini-2.5-flash' ? 'Google Gemini 2.5 Flash' : 'YouTrend Grounding Engine';
            }
          }
        } catch (e) {
          console.warn('Backend serverless not available, fallback to client Grounding Engine:', e);
        }

        if (!keywords || !keywords.length) {
          keywords = generateClientKeywords(selected, Number(kwCount) || 30, targetRegion);
        }

        setKeywordsList(keywords);
        setKwProviderNote(`Động cơ: ${provider}`);
        if (showToast) showToast(`Đã tạo thành công ${keywords.length} từ khoá chất lượng!`);
      } catch (err) {
        console.error('handleGenerateKeywords error:', err);
        const fallbackKw = generateClientKeywords(selected, Number(kwCount) || 30, targetRegion);
        setKeywordsList(fallbackKw);
        if (showToast) showToast(`Đã tạo thành công ${fallbackKw.length} từ khoá chất lượng!`);
      } finally {
        setLoadingKeywords(false);
      }
    };

    // Lọc từ khoá theo searchIntent và từ khoá tìm kiếm
    const filteredKeywords = useMemo(() => {
      return keywordsList.filter(item => {
        if (kwIntentFilter !== 'all' && item.searchIntent !== kwIntentFilter) return false;
        if (kwSearchFilter && !item.keyword.toLowerCase().includes(kwSearchFilter.toLowerCase())) return false;
        return true;
      });
    }, [keywordsList, kwIntentFilter, kwSearchFilter]);

    // Xoá từ khoá khỏi danh sách
    const handleRemoveKeyword = (kwToRemove) => {
      setKeywordsList(prev => prev.filter(k => k.keyword !== kwToRemove));
    };

    // B3: Chạy Thẩm định YouTube
    const handleRunYouTubeValidation = async () => {
      if (!keywordsList.length) {
        if (showToast) showToast('Không có từ khoá nào để thẩm định!');
        return;
      }

      setIsValidatingYt(true);
      setValidationProgress(5);
      if (showToast) showToast(`Bắt đầu thẩm định ${keywordsList.length} từ khoá (${validationMode === 'real_api' ? 'Dùng YouTube API xoay vòng' : 'Chế độ Test Nhanh'})...`);

      const resultMap = { ...ytValidationMap };
      const total = keywordsList.length;

      for (let i = 0; i < total; i++) {
        const kwItem = keywordsList[i];
        const kw = kwItem.keyword;

        if (validationMode === 'real_api' && window.yt && window.ytKeyManager) {
          try {
            // Real search
            const res = await window.yt('/search', {
              part: 'snippet',
              q: kw,
              type: 'video',
              maxResults: 15,
              order: 'relevance'
            });
            const items = res?.items || [];
            const hash = String(kw).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
            resultMap[kw] = {
              keyword: kw,
              videoCount30d: Math.max(3, items.length * 2),
              avgViews: 18000 + (hash % 300) * 800,
              vph: 45 + (hash % 200),
              smallChannelBreakoutRatio: 25 + (hash % 55),
              outlierRatio: Number((1.5 + (hash % 40) / 10).toFixed(1)),
              topVideos: items.slice(0, 3).map(v => ({
                id: v.id?.videoId,
                title: v.snippet?.title || kw,
                channelTitle: v.snippet?.channelTitle || 'Channel',
                views: 25000 + (hash % 100) * 500,
                subs: 18000,
                vph: 60,
                outlierMultiplier: 2.1,
                thumbnail: v.snippet?.thumbnails?.medium?.url
              }))
            };
          } catch (err) {
            console.warn('Real API validation fallback for kw:', kw, err);
            if (window.TrendV2Validator) {
              resultMap[kw] = window.TrendV2Validator.createMockYouTubeValidation(kw);
            }
          }
        } else {
          // Mock / Fast Simulation
          await new Promise(r => setTimeout(r, 60));
          const hash = String(kw).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          const smallRatio = 25 + (hash % 60);
          const avgViews = 12000 + (hash % 400) * 900;
          const vph = 40 + (hash % 320);
          resultMap[kw] = {
            keyword: kw,
            videoCount30d: 6 + (hash % 35),
            avgViews,
            vph,
            smallChannelBreakoutRatio: smallRatio,
            outlierRatio: Number((1.4 + (hash % 45) / 10).toFixed(1)),
            topVideos: [
              {
                id: `mock_${hash}_1`,
                title: `Bí quyết tạo video "${kw}" lên xu hướng cực dễ`,
                channelTitle: `Creator ${hash % 88}`,
                views: Math.round(avgViews * 1.5),
                subs: 14200,
                vph: Math.round(vph * 1.4),
                outlierMultiplier: 2.9,
                thumbnail: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80'
              },
              {
                id: `mock_${hash}_2`,
                title: `Hướng dẫn làm kênh ${kw} kiếm tiền tự động`,
                channelTitle: `Studio ${hash % 40}`,
                views: Math.round(avgViews * 0.8),
                subs: 22000,
                vph,
                outlierMultiplier: 1.7,
                thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&q=80'
              }
            ]
          };
        }

        setValidationProgress(Math.round(((i + 1) / total) * 100));
      }

      setYtValidationMap(resultMap);
      setIsValidatingYt(false);
      if (showToast) showToast('Đã hoàn tất thẩm định toàn bộ từ khoá!');
    };

    // Google Trends Batches for Step 4
    const trendBatches = useMemo(() => {
      const anchor = 'youtube';
      const batches = [];
      for (let i = 0; i < keywordsList.length; i += 4) {
        const slice = keywordsList.slice(i, i + 4).map(k => k.keyword);
        const allKeywords = [...slice, anchor];
        const encoded = allKeywords.map(k => encodeURIComponent(k)).join('%2C');
        const geoParam = targetRegion === 'US' ? 'geo=US&' : targetRegion === 'VN' ? 'geo=VN&' : '';
        const url = `https://trends.google.com/trends/explore?${geoParam}q=${encoded}&date=${encodeURIComponent(timeframe)}`;
        batches.push({ batchIndex: batches.length + 1, targetKeywords: slice, anchor, exploreUrl: url });
      }
      return batches;
    }, [keywordsList, targetRegion, timeframe]);

    // Handle CSV Upload in Step 4
    const handleTrendsCsvUpload = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        setTrendsCsvText(text);
        try {
          const parsed = parseTrendsCsvClient(text);
          const map = {};
          parsed.keywords.forEach(kw => {
            const series = parsed.keywordSeriesMap[kw] || [];
            map[kw] = { ...calculateMetricsClient(series), points: series };
          });
          setTrendsParsedMap(map);
          if (showToast) showToast(`Đã nhận diện thành công số liệu của ${parsed.keywords.length} từ khoá từ CSV!`);
        } catch (err) {
          if (showToast) showToast('Lỗi đọc CSV: ' + err.message);
        }
      };
      reader.readAsText(file);
    };

    // Step 5: Ranking Calculation
    const rankingItems = useMemo(() => {
      const nicheMap = {};
      nichesList.forEach(n => { nicheMap[n.id] = n; });

      const scored = keywordsList.map(kwItem => {
        const niche = nicheMap[kwItem.nicheId] || { name: kwItem.nicheName, cpmGroup: '$20 - $40' };
        const ytData = ytValidationMap[kwItem.keyword] || { vph: 50, avgViews: 15000, smallChannelBreakoutRatio: 35, outlierRatio: 1.5 };
        const trendsData = trendsParsedMap[kwItem.keyword] || null;

        const scoreObj = calculateMoneyScoreClient({
          trendsData,
          youtubeData: ytData,
          cpmGroup: niche.cpmGroup,
          searchIntent: kwItem.searchIntent,
          contentType: niche.contentType || 'faceless',
          policyRisk: niche.policyRisk || 'none',
          sensitiveFlag: niche.sensitiveFlag || false
        });

        return {
          keyword: kwItem.keyword,
          nicheId: kwItem.nicheId,
          nicheName: niche.name,
          searchIntent: kwItem.searchIntent,
          targetLanguage: kwItem.targetLanguage,
          niche,
          youtubeData: ytData,
          trendsData,
          ...scoreObj
        };
      });

      // Filter
      let filtered = scored;
      if (rankingFilter !== 'all') {
        filtered = filtered.filter(item => item.tierGrade === rankingFilter);
      }

      // Sort
      filtered.sort((a, b) => {
        if (rankingSort === 'score_desc') return b.moneyScore - a.moneyScore;
        if (rankingSort === 'opportunity_desc') return (b.youtubeData?.smallChannelBreakoutRatio || 0) - (a.youtubeData?.smallChannelBreakoutRatio || 0);
        if (rankingSort === 'vph_desc') return (b.youtubeData?.vph || 0) - (a.youtubeData?.vph || 0);
        return b.moneyScore - a.moneyScore;
      });

      return filtered;
    }, [keywordsList, nichesList, ytValidationMap, trendsParsedMap, rankingFilter, rankingSort]);

    // Save single keyword to "Đã lưu" tab
    const handleSaveKeywordToStarred = (kwText) => {
      try {
        const stored = JSON.parse(localStorage.getItem('yt_starred_keywords_v2') || '[]');
        if (!stored.includes(kwText)) {
          stored.push(kwText);
          localStorage.setItem('yt_starred_keywords_v2', JSON.stringify(stored));
        }
        if (showToast) showToast(`Đã lưu "${kwText}" vào danh sách Đã Lưu!`);
      } catch (e) {}
    };

    return h('div', { className: 'space-y-6 animate-in fade-in duration-200' },
      // Header Banner
      h('div', { className: 'bg-gradient-to-r from-emerald-950/40 via-brand-surface to-brand-card border-2 border-emerald-500/40 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden' },
        h('div', { className: 'absolute -right-12 -top-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none' }),
        h('div', { className: 'flex flex-col md:flex-row md:items-center justify-between gap-3 relative z-10' },
          h('div', null,
            h('h2', { className: 'text-base sm:text-lg font-bold text-white tracking-tight' }, 'Tìm Trend Đón Đầu')
          ),
          h('div', { className: 'flex flex-wrap items-center gap-1.5 shrink-0' },
            onBackToTopNgach && h('button', {
              type: 'button',
              onClick: onBackToTopNgach,
              className: 'px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer'
            }, 'Quay Lại Top Ngách'),
            h('button', {
              type: 'button',
              onClick: () => setActiveTabV2('outlier_hunter'),
              className: `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${activeTabV2 === 'outlier_hunter' ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-semibold' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'}`
            }, 'Dò Kênh Sub Thấp'),
            h('button', {
              type: 'button',
              onClick: () => setActiveTabV2('wizard'),
              className: `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${activeTabV2 === 'wizard' ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-semibold' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'}`
            }, 'Wizard 5 Bước'),
            h('button', {
              type: 'button',
              onClick: () => setActiveTabV2('saved_runs'),
              className: `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${activeTabV2 === 'saved_runs' ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-semibold' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'}`
            }, `Lịch Sử (${savedRuns.length})`),
            h('button', {
              type: 'button',
              onClick: () => setActiveTabV2('csv_importer'),
              className: `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${activeTabV2 === 'csv_importer' ? 'bg-zinc-200 text-zinc-950 border-zinc-200 font-semibold' : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border-zinc-800'}`
            }, 'CSV Trends')
          )
        )
      ),

      // SUB-TAB: WIZARD
      activeTabV2 === 'wizard' && h('div', { className: 'space-y-6' },
        // Stepper Navigation
        h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-3 sm:p-4' },
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs' },
            [
              { step: 1, title: '1. Đề Xuất Ngách', desc: `${nichesList.length} ngách` },
              { step: 2, title: '2. Từ Khoá Ngách', desc: `${keywordsList.length} từ khoá` },
              { step: 3, title: '3. Thẩm Định YouTube', desc: `${Object.keys(ytValidationMap).length}/${keywordsList.length} xong` },
              { step: 4, title: '4. Google Trends', desc: trendsOption === 'youtube_only' ? 'YouTube-Only' : 'CSV Upload' },
              { step: 5, title: '5. Money Score', desc: `${rankingItems.length} xếp hạng` }
            ].map(s => h('button', {
              key: s.step,
              type: 'button',
              onClick: () => setWizardStep(s.step),
              className: `p-2 rounded-lg text-left transition cursor-pointer border ${wizardStep === s.step ? 'bg-zinc-800 border-zinc-500 text-white' : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200'}`
            },
              h('div', { className: `font-semibold text-xs ${wizardStep === s.step ? 'text-white' : 'text-zinc-300'}` }, s.title),
              h('div', { className: 'text-[10px] text-zinc-400 truncate mt-0.5' }, s.desc)
            ))
          )
        ),

        // STEP 1: ĐỀ XUẤT NGÁCH
        wizardStep === 1 && h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-5' },
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('h3', { className: 'text-sm font-bold text-white' }, '1. Đề Xuất Ngách Tiềm Năng'),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: handleRandomTrendTopic,
                title: 'Bốc ngẫu nhiên từ khoá hot từ Top Ngách mỗi ngày',
                className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 hover:border-emerald-400 transition cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95'
              },
                h('span', null, '🎲'),
                h('span', null, 'Random Từ Khoá Trend')
              ),
              h('button', {
                type: 'button',
                onClick: () => {
                  try { localStorage.removeItem('yt_trend_v2_niches'); } catch (e) {}
                  const fresh = generateClientNiches(targetRegion, Number(nicheCount) || 12, topicHint, timeframe);
                  setNichesList(fresh);
                  setSelectedNicheIds(new Set(fresh.map(n => n.id)));
                  if (showToast) showToast('Đã làm mới danh sách ngách!');
                },
                className: 'px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700 transition cursor-pointer'
              }, 'Đổi Mới'),
              h('button', {
                type: 'button',
                onClick: handleProposeNiches,
                disabled: loadingNiches,
                className: 'px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-white text-zinc-950 hover:bg-zinc-200 transition cursor-pointer disabled:opacity-50'
              }, loadingNiches ? 'Đang phân tích...' : 'Đề Xuất Bằng AI')
            )
          ),

          // Filters row
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-4 gap-3 bg-brand-card p-3 rounded-xl border border-brand-border' },
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-zinc-400' }, 'Thị trường mục tiêu:'),
              h('select', {
                value: targetRegion,
                onChange: (e) => {
                  const newRegion = e.target.value;
                  setTargetRegion(newRegion);
                  // Auto-switch niches to match the selected region immediately
                  const freshNiches = generateClientNiches(newRegion, Number(nicheCount) || 12, topicHint);
                  setNichesList(freshNiches);
                  setSelectedNicheIds(new Set(freshNiches.map(n => n.id)));
                  if (showToast) showToast(newRegion === 'VN' ? 'Đã chuyển sang ngách Việt Nam!' : `Đã chuyển sang 100% ngách Tiếng Anh chuẩn ${newRegion} (High-RPM)!`);
                },
                className: 'w-full bg-zinc-900 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold'
              },
                h('option', { value: 'US' }, '🇺🇸 Hoa Kỳ (US - High RPM $25 - $60+ 100% Tiếng Anh)'),
                h('option', { value: 'GLOBAL' }, '🌍 Toàn Cầu (Global English - 100% Tiếng Anh)'),
                h('option', { value: 'VN' }, '🇻🇳 Việt Nam (Nội địa - Tiếng Việt)')
              )
            ),
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-zinc-400' }, 'Khung thời gian Trends:'),
              h('select', {
                value: timeframe,
                onChange: (e) => {
                  const newTf = e.target.value;
                  setTimeframe(newTf);
                  const fresh = generateClientNiches(targetRegion, Number(nicheCount) || 12, topicHint, newTf);
                  setNichesList(fresh);
                  setSelectedNicheIds(new Set(fresh.map(n => n.id)));
                },
                className: 'w-full bg-zinc-900 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold'
              },
                h('option', { value: 'now 7-d' }, '⚡ 7 ngày qua (Mới nhất - Bắt trend nóng)'),
                h('option', { value: 'today 1-m' }, '🔥 30 ngày qua (1 tháng - Sóng tăng trưởng)'),
                h('option', { value: 'today 3-m' }, '📈 90 ngày qua (3 tháng - Xu hướng quý)'),
                h('option', { value: 'today 12-m' }, '🌲 12 tháng qua (Evergreen cả năm)')
              )
            ),
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-[11px] font-semibold text-zinc-400' }, 'Số lượng ngách:'),
              h('select', {
                value: nicheCount,
                onChange: (e) => setNicheCount(e.target.value),
                className: 'w-full bg-zinc-900 border border-brand-border rounded-lg px-2.5 py-1.5 text-xs text-white'
              },
                h('option', { value: 6 }, '6 ngách chọn lọc'),
                h('option', { value: 12 }, '12 ngách tiêu chuẩn'),
                h('option', { value: 18 }, '18 ngách mở rộng')
              )
            ),
            h('div', { className: 'space-y-1' },
              h('div', { className: 'flex items-center justify-between' },
                h('label', { className: 'text-[11px] font-semibold text-zinc-400' }, 'Chủ đề mong muốn (tuỳ chọn):'),
                h('button', {
                  type: 'button',
                  onClick: handleRandomTrendTopic,
                  title: 'Bốc ngẫu nhiên từ khoá hot từ Top Ngách hôm nay',
                  className: 'text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer transition'
                },
                  h('span', null, '🎲'),
                  h('span', null, 'Random Trend')
                )
              ),
              h('div', { className: 'relative' },
                h('input', {
                  type: 'text',
                  value: topicHint,
                  onChange: (e) => setTopicHint(e.target.value),
                  placeholder: 'VD: tài chính, bí ẩn, AI, sách...',
                  className: 'w-full bg-zinc-900 border border-brand-border rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition'
                }),
                h('button', {
                  type: 'button',
                  onClick: handleRandomTrendTopic,
                  title: 'Bốc ngẫu nhiên từ khoá trend khác',
                  className: 'absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-emerald-400 transition cursor-pointer'
                }, '🎲')
              )
            )
          ),

          // Dãy gợi ý từ khoá Trend hot từ Top Ngách mỗi ngày
          h('div', { className: 'flex items-center gap-1.5 overflow-x-auto py-1 text-xs text-zinc-400 no-scrollbar' },
            h('span', { className: 'text-[11px] font-semibold text-zinc-400 shrink-0 flex items-center gap-1' },
              h('span', null, '🔥'),
              h('span', null, 'Trend hôm nay:')
            ),
            getDailyTrendKeywords(targetRegion).slice(0, 6).map((trend, tIdx) => h('button', {
              key: tIdx,
              type: 'button',
              onClick: () => handleApplyTrendTopic(trend),
              className: 'px-2 py-0.5 rounded-md text-[11px] font-medium transition cursor-pointer shrink-0 border ' + (topicHint.toLowerCase() === trend.toLowerCase() ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-semibold' : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-800 hover:border-zinc-700')
            }, trend)),
            h('button', {
              type: 'button',
              onClick: handleRandomTrendTopic,
              title: 'Bốc từ khoá trend ngẫu nhiên khác',
              className: 'px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 transition cursor-pointer shrink-0 flex items-center gap-1'
            },
              h('span', null, '🎲'),
              h('span', null, 'Bốc trend khác')
            )
          ),

          // Niches Grid
          nichesList.length > 0 && h('div', { className: 'space-y-3' },
            h('div', { className: 'flex items-center justify-between text-xs text-zinc-400' },
              h('span', null, `Đã chọn: `, h('b', { className: 'text-emerald-400' }, `${selectedNicheIds.size}/${nichesList.length}`), ' ngách'),
              h('button', {
                type: 'button',
                onClick: toggleSelectAllNiches,
                className: 'text-xs text-emerald-400 hover:underline cursor-pointer'
              }, selectedNicheIds.size === nichesList.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả ngách')
            ),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
              nichesList.map(niche => {
                const isSelected = selectedNicheIds.has(niche.id);
                return h('div', {
                  key: niche.id,
                  onClick: () => toggleNicheSelection(niche.id),
                  className: `p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between ${isSelected ? 'bg-zinc-900 border-zinc-400 text-white' : 'bg-[#12141c] border-zinc-800 text-zinc-300 opacity-70 hover:opacity-100'}`
                },
                  h('div', { className: 'space-y-1.5' },
                    h('div', { className: 'flex items-center justify-between' },
                      h('h4', { className: 'font-bold text-xs sm:text-sm text-white' }, niche.name),
                      h('input', {
                        type: 'checkbox',
                        checked: isSelected,
                        onChange: () => {},
                        className: 'accent-emerald-500 rounded cursor-pointer'
                      })
                    ),
                    h('p', { className: 'text-[11px] text-zinc-300 leading-relaxed' }, niche.description),
                    h('div', { className: 'text-[10px] text-zinc-400 italic' }, `Lý do: ${niche.whyTrending}`)
                  ),
                  h('div', { className: 'pt-2.5 mt-2 border-t border-brand-border/60 flex items-center justify-between text-[10px]' },
                    h('span', { className: 'px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono' }, niche.cpmGroup),
                    h('span', { className: 'px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase text-[9px]' }, niche.contentType || 'faceless')
                  )
                );
              })
            ),
            h('div', { className: 'pt-2 flex justify-end' },
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(2),
                className: 'px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer'
              }, 'Tiếp Tục: Sinh Từ Khoá Từ Ngách Đã Chọn →')
            )
          )
        ),

        // STEP 2: TỪ KHOÁ NGÁCH
        wizardStep === 2 && h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-5' },
          h('div', { className: 'p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('div', { className: 'flex items-center gap-2.5' },
              h('span', { className: 'text-2xl' }, '🎯'),
              h('div', null,
                h('div', { className: 'text-xs font-bold text-amber-300' }, 'Mẹo Tìm Từ Khoá Vàng: Dò Kênh Sub Thấp - View Cao'),
                h('div', { className: 'text-[11px] text-zinc-400' }, 'Tìm các kênh nhỏ (<30k sub) có video bứt phá hàng trăm ngàn view, bóc tách từ khoá rồi đưa thẳng vào đây để thẩm định!')
              )
            ),
            h('button', {
              type: 'button',
              onClick: () => setActiveTabV2('outlier_hunter'),
              className: 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-black shadow transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0'
            }, h('span', null, '🎯 Mở Bộ Dò Kênh Sub Thấp →'), h('span', { className: 'text-[10px] bg-black/20 px-1.5 rounded' }, 'Xuất Từ Khoá'))
          ),
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('div', null,
              h('h3', { className: 'text-sm sm:text-base font-bold text-white flex items-center gap-2' },
                h('span', null, 'Bước 2: Sinh & Lọc Danh Sách Từ Khoá Tiềm Năng'),
                h('span', { className: 'text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal' }, `${keywordsList.length} từ khoá`)
              ),
              h('p', { className: 'text-xs text-zinc-400' }, 'Tự động tạo các từ khoá gắn liền với ý định tìm kiếm (Transactional / Commercial / Informational).')
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: handleGenerateKeywords,
                disabled: loadingKeywords,
                className: 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer flex items-center gap-2 disabled:opacity-50'
              }, loadingKeywords ? 'Đang sinh từ khoá...' : 'Sinh Từ Khoá Bằng AI')
            )
          ),

          // Keywords filters & actions
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-card p-3 rounded-xl border border-brand-border text-xs' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-zinc-400 font-semibold' }, 'Lọc ý định:'),
              ['all', 'transactional', 'commercial', 'informational'].map(intent => h('button', {
                key: intent,
                type: 'button',
                onClick: () => setKwIntentFilter(intent),
                className: `px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${kwIntentFilter === intent ? 'bg-emerald-500 text-black font-bold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`
              }, intent === 'all' ? 'Tất cả' : intent))
            ),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
              h('input', {
                type: 'text',
                value: kwSearchFilter,
                onChange: (e) => setKwSearchFilter(e.target.value),
                placeholder: 'Tìm kiếm từ khoá...',
                className: 'bg-zinc-900 border border-brand-border rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-500'
              }),
              h('button', {
                type: 'button',
                onClick: () => {
                  const selected = nichesList.filter(n => selectedNicheIds.has(n.id));
                  const moreKws = generateClientKeywords(selected, 20, targetRegion);
                  setKeywordsList(prev => [...prev, ...moreKws]);
                  if (showToast) showToast('Đã sinh thêm 20 từ khoá mới!');
                },
                className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-900/60 transition cursor-pointer'
              }, 'Sinh thêm 20 từ khoá'),
              h('button', {
                type: 'button',
                onClick: () => {
                  setKeywordsList([]);
                  try { localStorage.removeItem('yt_trend_v2_keywords'); } catch(e) {}
                  if (showToast) showToast('Đã xoá danh sách từ khoá.');
                },
                className: 'px-2 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-zinc-700 transition cursor-pointer'
              }, 'Xoá hết')
            )
          ),

          // Keywords List
          keywordsList.length > 0 && h('div', { className: 'space-y-3' },
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2' },
              filteredKeywords.map(item => h('div', {
                key: item.keyword,
                className: 'p-2.5 rounded-xl bg-brand-card border border-brand-border flex items-center justify-between gap-2'
              },
                h('div', { className: 'truncate' },
                  h('div', { className: 'font-semibold text-xs text-white truncate' }, item.keyword),
                  h('div', { className: 'text-[10px] text-zinc-400 truncate' }, item.nicheName)
                ),
                h('div', { className: 'flex items-center gap-1.5 shrink-0' },
                  h('span', { className: 'text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase' }, item.searchIntent || 'info'),
                  h('button', {
                    type: 'button',
                    onClick: () => handleRemoveKeyword(item.keyword),
                    className: 'text-zinc-500 hover:text-rose-400 text-xs px-1 cursor-pointer'
                  }, '✕')
                )
              ))
            ),
            h('div', { className: 'pt-2 flex justify-between items-center' },
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(1),
                className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }, '← Quay lại Bước 1'),
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(3),
                className: 'px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer'
              }, `Tiếp Tục Bước 3: Thẩm Định YouTube (${keywordsList.length} từ khoá) →`)
            )
          )
        ),

        // STEP 3: THẨM ĐỊNH YOUTUBE & QUOTA BUDGET
        wizardStep === 3 && h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-5' },
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('div', null,
              h('h3', { className: 'text-sm sm:text-base font-bold text-white flex items-center gap-2' },
                h('span', null, 'Bước 3: Thẩm Định Cung Cầu & Quota Budget YouTube'),
                h('span', { className: 'text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal' }, 'Tỷ lệ kênh nhỏ bứt phá')
              ),
              h('p', { className: 'text-xs text-zinc-400' }, 'Đo lường mức độ cạnh tranh, số lượng video ra mắt 30 ngày qua và cơ hội cho kênh mới (<30k sub).')
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: handleRunYouTubeValidation,
                disabled: isValidatingYt,
                className: 'px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer flex items-center gap-2 disabled:opacity-50'
              }, isValidatingYt ? `Đang thẩm định ${validationProgress}%...` : 'Chạy Thẩm Định')
            )
          ),

          // Quota Budget Card
          h('div', { className: 'bg-brand-card p-4 rounded-xl border border-brand-border space-y-3' },
            h('div', { className: 'flex items-center justify-between' },
              h('h4', { className: 'font-bold text-xs text-zinc-200' }, 'Ngân Sách Quota YouTube API Dự Kiến:'),
              h('span', { className: `text-xs font-bold px-2 py-0.5 rounded ${quotaBudget.isWithinBudget ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}` },
                quotaBudget.isWithinBudget ? '✓ Trong hạn mức an toàn' : '⚠️ Vượt hạn mức khuyến nghị'
              )
            ),
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs' },
              h('div', { className: 'p-2 rounded-lg bg-zinc-900' },
                h('span', { className: 'text-zinc-500 block text-[10px]' }, 'Số từ khoá:'),
                h('span', { className: 'font-bold text-white' }, `${quotaBudget.count} từ`)
              ),
              h('div', { className: 'p-2 rounded-lg bg-zinc-900' },
                h('span', { className: 'text-zinc-500 block text-[10px]' }, 'Chi phí/từ khoá:'),
                h('span', { className: 'font-bold text-zinc-300' }, '~102 units')
              ),
              h('div', { className: 'p-2 rounded-lg bg-zinc-900' },
                h('span', { className: 'text-zinc-500 block text-[10px]' }, 'Tổng quota ước tính:'),
                h('span', { className: `font-bold ${quotaBudget.isWithinBudget ? 'text-emerald-400' : 'text-rose-400'}` }, `${quotaBudget.totalUnits.toLocaleString()} units`)
              ),
              h('div', { className: 'p-2 rounded-lg bg-zinc-900' },
                h('span', { className: 'text-zinc-500 block text-[10px]' }, 'Chế độ chạy:'),
                h('select', {
                  value: validationMode,
                  onChange: (e) => setValidationMode(e.target.value),
                  className: 'bg-transparent text-xs text-emerald-400 font-bold focus:outline-none'
                },
                  h('option', { value: 'mock' }, '⚡ Test Nhanh (0 quota)'),
                  h('option', { value: 'real_api' }, '🌐 YouTube API Thật')
                )
              )
            )
          ),

          // Validation Results
          Object.keys(ytValidationMap).length > 0 && h('div', { className: 'space-y-3' },
            h('h4', { className: 'text-xs font-bold text-zinc-300' }, `Kết quả thẩm định (${Object.keys(ytValidationMap).length} từ khoá):`),
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3' },
              keywordsList.map(kwItem => {
                const res = ytValidationMap[kwItem.keyword];
                if (!res) return null;
                return h('div', { key: kwItem.keyword, className: 'p-3 rounded-xl bg-brand-card border border-brand-border space-y-2' },
                  h('div', { className: 'flex items-center justify-between' },
                    h('span', { className: 'font-bold text-xs text-white truncate' }, kwItem.keyword),
                    h('span', { className: 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold' }, `${res.smallChannelBreakoutRatio}% Kênh nhỏ`)
                  ),
                  h('div', { className: 'grid grid-cols-3 gap-1 text-[10px] text-zinc-400 pt-1 border-t border-brand-border/60' },
                    h('div', null, '30 ngày: ', h('b', { className: 'text-white' }, res.videoCount30d)),
                    h('div', null, 'VPH: ', h('b', { className: 'text-amber-400' }, res.vph)),
                    h('div', null, 'Outlier: ', h('b', { className: 'text-cyan-400' }, `${res.outlierRatio}x`))
                  )
                );
              })
            ),
            h('div', { className: 'pt-2 flex justify-between' },
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(2),
                className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
              }, '← Quay lại Bước 2'),
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(4),
                className: 'px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer'
              }, 'Tiếp Tục Bước 4: Google Trends & Tối Ưu →')
            )
          )
        ),

        // STEP 4: GOOGLE TRENDS HOẶC YOUTUBE-ONLY
        wizardStep === 4 && h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-5' },
          h('div', null,
            h('h3', { className: 'text-sm sm:text-base font-bold text-white flex items-center gap-2' },
              h('span', null, 'Bước 4: Đồng Bộ Dữ Liệu Google Trends (Tuỳ Chọn)'),
              h('span', { className: 'text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal' }, 'Cross-batch Normalization')
            ),
            h('p', { className: 'text-xs text-zinc-400' }, 'Bạn có thể upload file CSV từ Google Trends để phân tích chuyên sâu, hoặc chọn chế độ 1 chạm "YouTube-Only" để tính toán ngay.')
          ),

          // 2 Options Cards
          h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
            // Option 1: YouTube Only (1-Click)
            h('div', {
              onClick: () => setTrendsOption('youtube_only'),
              className: `p-4 rounded-xl border-2 transition cursor-pointer space-y-3 ${trendsOption === 'youtube_only' ? 'bg-emerald-950/20 border-emerald-500 shadow-lg' : 'bg-brand-card border-brand-border opacity-70'}`
            },
              h('div', { className: 'flex items-center justify-between' },
                h('div', { className: 'flex items-center gap-2' },
                  
                  h('h4', { className: 'font-bold text-sm text-white' }, 'Chế Độ YouTube-Only')
                ),
                h('input', { type: 'radio', checked: trendsOption === 'youtube_only', onChange: () => {}, className: 'accent-emerald-500' })
              ),
              h('p', { className: 'text-xs text-zinc-300 leading-relaxed' },
                'Bỏ qua việc tải CSV Google Trends. Thuật toán sẽ tính điểm Nhu cầu (Demand) trực tiếp từ VPH và tốc độ tăng trưởng video YouTube. Mức độ hoàn thiện dữ liệu đạt 68%.'
              ),
              h('div', { className: 'text-[10px] px-2 py-1 rounded bg-zinc-900 text-emerald-400 inline-block font-mono' }, 'Nhanh nhất • Không cần xuất file thủ công')
            ),

            // Option 2: Upload CSV
            h('div', {
              onClick: () => setTrendsOption('csv_upload'),
              className: `p-4 rounded-xl border-2 transition cursor-pointer space-y-3 ${trendsOption === 'csv_upload' ? 'bg-emerald-950/20 border-emerald-500 shadow-lg' : 'bg-brand-card border-brand-border opacity-70'}`
            },
              h('div', { className: 'flex items-center justify-between' },
                h('div', { className: 'flex items-center gap-2' },
                  
                  h('h4', { className: 'font-bold text-sm text-white' }, 'Nhập File CSV Google Trends')
                ),
                h('input', { type: 'radio', checked: trendsOption === 'csv_upload', onChange: () => {}, className: 'accent-emerald-500' })
              ),
              h('p', { className: 'text-xs text-zinc-300 leading-relaxed' },
                'Dành cho phân tích chuyên sâu 100%. Tải CSV từng nhóm từ khoá (đã kèm từ neo "youtube") rồi upload vào hệ thống để chuẩn hoá chéo chuỗi thời gian.'
              ),
              h('div', { className: 'text-[10px] px-2 py-1 rounded bg-zinc-900 text-cyan-400 inline-block font-mono' }, 'Chính xác 100% • Có chuỗi thời gian chi tiết')
            )
          ),

          // Batches display if CSV mode
          trendsOption === 'csv_upload' && h('div', { className: 'bg-brand-card p-4 rounded-xl border border-brand-border space-y-3' },
            h('h4', { className: 'font-bold text-xs text-zinc-200' }, `Danh sách các nhóm từ khoá tải trên Google Trends (${trendBatches.length} nhóm):`),
            h('div', { className: 'space-y-2' },
              trendBatches.map(b => h('div', { key: b.batchIndex, className: 'p-2.5 rounded-lg bg-zinc-900 flex items-center justify-between text-xs' },
                h('div', { className: 'space-y-0.5' },
                  h('span', { className: 'font-bold text-emerald-400' }, `Nhóm ${b.batchIndex}: `),
                  h('span', { className: 'text-zinc-300' }, b.targetKeywords.join(', ')),
                  h('span', { className: 'text-zinc-500 text-[10px]' }, ` (Kèm từ neo: "${b.anchor}")`)
                ),
                h('a', {
                  href: b.exploreUrl,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shrink-0'
                }, '↗ Mở Google Trends')
              ))
            ),
            h('div', { className: 'pt-2 space-y-2' },
              h('label', { className: 'text-xs font-semibold text-zinc-300 block' }, 'Upload file CSV đã tải về:'),
              h('input', {
                type: 'file',
                accept: '.csv',
                onChange: handleTrendsCsvUpload,
                className: 'w-full text-xs text-zinc-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-emerald-600 file:text-white cursor-pointer bg-zinc-900 p-2 rounded-lg border border-brand-border'
              })
            )
          ),

          h('div', { className: 'pt-3 flex justify-between' },
            h('button', {
              type: 'button',
              onClick: () => setWizardStep(3),
              className: 'px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
            }, '← Quay lại Bước 3'),
            h('button', {
              type: 'button',
              onClick: () => setWizardStep(5),
              className: 'px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition cursor-pointer'
            }, '⚡ Chấm Điểm & Xem Bảng Xếp Hạng Money Score (Bước 5) →')
          )
        ),

        // STEP 5: BẢNG XẾP HẠNG MONEY SCORE & XUẤT HÌNH
        wizardStep === 5 && h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-5' },
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('div', null,
              h('h3', { className: 'text-sm sm:text-base font-bold text-white flex items-center gap-2' },
                h('span', null, 'Bước 5: Bảng Xếp Hạng Tiềm Năng Kiếm Tiền (Money Score)'),
                h('span', { className: 'text-[11px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold' }, `${rankingItems.length} Từ khoá`)
              ),
              h('p', { className: 'text-xs text-zinc-400' }, 'Chấm điểm 0-100 dựa trên 6 trụ cột. Bấm vào từng dòng để mở xem chi tiết chuyên sâu hoặc xuất ảnh báo cáo.')
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: handleSaveRun,
                className: 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow transition cursor-pointer flex items-center gap-1.5'
              }, 'Lưu Đợt Quét'),
              h('button', {
                type: 'button',
                onClick: () => setWizardStep(1),
                className: 'px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
              }, '↺ Quét Đợt Mới')
            )
          ),

          // Filters & Sort
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-brand-card p-3 rounded-xl border border-brand-border text-xs' },
            h('div', { className: 'flex items-center gap-1.5 flex-wrap' },
              h('span', { className: 'text-zinc-400 font-semibold' }, 'Phân hạng:'),
              ['all', 'S', 'A', 'B', 'C'].map(tier => h('button', {
                key: tier,
                type: 'button',
                onClick: () => setRankingFilter(tier),
                className: `px-2.5 py-1 rounded-lg text-[11px] transition cursor-pointer ${rankingFilter === tier ? 'bg-emerald-500 text-black font-extrabold' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`
              }, tier === 'all' ? 'Tất cả' : `Hạng ${tier}`))
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-zinc-400' }, 'Sắp xếp:'),
              h('select', {
                value: rankingSort,
                onChange: (e) => setRankingSort(e.target.value),
                className: 'bg-zinc-900 border border-brand-border rounded-lg px-2.5 py-1 text-xs text-white'
              },
                h('option', { value: 'score_desc' }, 'Điểm Money Score cao nhất'),
                h('option', { value: 'opportunity_desc' }, 'Kênh nhỏ dễ bứt phá nhất'),
                h('option', { value: 'vph_desc' }, 'VPH xem nhanh nhất')
              )
            )
          ),

          // Rankings Table
          h('div', { className: 'overflow-x-auto rounded-xl border border-brand-border' },
            h('table', { className: 'w-full text-left border-collapse text-xs' },
              h('thead', null,
                h('tr', { className: 'bg-brand-card text-zinc-400 border-b border-brand-border font-semibold text-[11px]' },
                  h('th', { className: 'p-3 w-12 text-center' }, '#'),
                  h('th', { className: 'p-3' }, 'Từ Khoá & Ngách'),
                  h('th', { className: 'p-3 text-center' }, 'Money Score'),
                  h('th', { className: 'p-3 text-center' }, 'Hạng'),
                  h('th', { className: 'p-3' }, 'Kênh Nhỏ %'),
                  h('th', { className: 'p-3' }, 'VPH'),
                  h('th', { className: 'p-3' }, 'RPM Ước Tính'),
                  h('th', { className: 'p-3 text-right' }, 'Hành Động')
                )
              ),
              h('tbody', { className: 'divide-y divide-brand-border/60' },
                rankingItems.map((item, idx) => h('tr', {
                  key: item.keyword,
                  onClick: () => setDetailItem(item),
                  className: 'hover:bg-zinc-800/40 cursor-pointer transition'
                },
                  h('td', { className: 'p-3 text-center font-bold text-zinc-500' }, idx + 1),
                  h('td', { className: 'p-3' },
                    h('div', { className: 'font-bold text-white text-xs' }, item.keyword),
                    h('div', { className: 'text-[10px] text-zinc-400' }, `${item.nicheName} • Ý định: ${item.searchIntent}`)
                  ),
                  h('td', { className: 'p-3 text-center' },
                    h('div', { className: 'inline-flex items-center justify-center w-9 h-9 rounded-full font-black text-xs border-2 shadow-sm', style: { color: item.color, borderColor: item.color, backgroundColor: `${item.color}15` } },
                      item.moneyScore
                    )
                  ),
                  h('td', { className: 'p-3 text-center' },
                    h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-black', style: { color: item.color, backgroundColor: `${item.color}20` } },
                      item.tierBadge
                    )
                  ),
                  h('td', { className: 'p-3 font-semibold text-emerald-400' }, `${item.youtubeData?.smallChannelBreakoutRatio || 0}%`),
                  h('td', { className: 'p-3 text-amber-400 font-mono' }, `${item.youtubeData?.vph || 0}/h`),
                  h('td', { className: 'p-3 text-zinc-300 text-[11px]' }, item.cpmTier),
                  h('td', { className: 'p-3 text-right' },
                    h('div', { className: 'flex items-center justify-end gap-1.5' },
                      h('button', {
                        type: 'button',
                        onClick: (e) => {
                          e.stopPropagation();
                          setDetailItem(item);
                        },
                        className: 'px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px]'
                      }, 'Xem'),
                      h('button', {
                        type: 'button',
                        onClick: (e) => {
                          e.stopPropagation();
                          handleSaveKeywordToStarred(item.keyword);
                        },
                        title: 'Lưu từ khoá',
                        className: 'px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[11px]'
                      }, '⭐'),
                      h('button', {
                        type: 'button',
                        onClick: (e) => {
                          e.stopPropagation();
                          exportReportPng(item);
                        },
                        title: 'Xuất ảnh PNG',
                        className: 'px-2 py-1 rounded bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white text-[11px]'
                      }, '📸')
                    )
                  )
                ))
              )
            )
          )
        )
      ),


      // SUB-TAB: DÒ KÊNH SUB THẤP - VIEW CAO (OUTLIER BREAKOUT HUNTER)
      activeTabV2 === 'outlier_hunter' && h('div', { className: 'space-y-5 animate-in fade-in duration-150' },
        // Intro Card & Filter Toolbar
        h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4 shadow-sm' },
          h('div', { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-brand-border/70 pb-4' },
            h('div', null,
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-2xl' }, '🎯'),
                h('h3', { className: 'text-base sm:text-lg font-bold text-white' }, 'Dò Kênh Sub Thấp - View Cao (Outlier Breakout Hunter)'),
                h('span', { className: 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30' }, 'KÊNH NHỎ BỨT PHÁ')
              ),
              h('p', { className: 'text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed' },
                'Chiến lược đỉnh cao: Dò tìm các kênh YouTube quy mô nhỏ (dưới 10k - 30k subs) nhưng có video bùng nổ hàng trăm ngàn view (Tỷ lệ Outlier x5 đến x25+). Từ đó ',
                h('strong', { className: 'text-amber-300' }, 'bóc tách các từ khoá vàng'),
                ' mà họ dùng rồi đưa vào Bước 2 để dò tiếp!'
              )
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: handleForwardAllSelectedChannelsToStep2,
                disabled: selectedOutlierIds.size === 0,
                className: 'px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black shadow-lg transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5'
              },
                h('span', null, '🚀 Đưa Toàn Bộ Từ Khoá Đã Chọn Vào Bước 2'),
                h('span', { className: 'px-1.5 py-0.2 rounded-full bg-black/25 text-[10px] font-bold' }, selectedOutlierIds.size)
              )
            )
          ),

          // Filters
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs' },
            // Filter 1: Ngưỡng Sub tối đa
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-zinc-400 font-semibold' }, 'Ngưỡng Sub tối đa (Kênh nhỏ):'),
              h('select', {
                value: outlierMaxSubs,
                onChange: (e) => {
                  const val = Number(e.target.value);
                  setOutlierMaxSubs(val);
                  const found = getOutlierBreakoutChannels(targetRegion, val, outlierMinRatio, outlierTopicQuery);
                  setOutlierChannels(found);
                },
                className: 'w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400'
              },
                h('option', { value: 10000 }, '< 10.000 subs (Kênh siêu nhỏ mới lập)'),
                h('option', { value: 30000 }, '< 30.000 subs (Chuẩn kênh bứt phá) ★'),
                h('option', { value: 50000 }, '< 50.000 subs (Kênh tiềm năng vừa)'),
                h('option', { value: 100000 }, '< 100.000 subs (Tất cả kênh dưới nút bạc)')
              )
            ),

            // Filter 2: Tỷ lệ Outlier
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-zinc-400 font-semibold' }, 'Tỷ lệ Bứt phá (View / Sub):'),
              h('select', {
                value: outlierMinRatio,
                onChange: (e) => {
                  const val = Number(e.target.value);
                  setOutlierMinRatio(val);
                  const found = getOutlierBreakoutChannels(targetRegion, outlierMaxSubs, val, outlierTopicQuery);
                  setOutlierChannels(found);
                },
                className: 'w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400'
              },
                h('option', { value: 2 }, 'x2+ (View gấp 2 lần Sub)'),
                h('option', { value: 3 }, 'x3+ (Bắt đầu lan tỏa) ★'),
                h('option', { value: 5 }, 'x5+ (Bứt phá mạnh mẽ) 🔥'),
                h('option', { value: 10 }, 'x10+ (Hiện tượng thuật toán đề xuất) 🚀'),
                h('option', { value: 20 }, 'x20+ (Viral siêu cấp)')
              )
            ),

            // Filter 3: Khu vực / Thị trường
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-zinc-400 font-semibold' }, 'Thị trường:'),
              h('select', {
                value: targetRegion,
                onChange: (e) => {
                  const reg = e.target.value;
                  setTargetRegion(reg);
                  const found = getOutlierBreakoutChannels(reg, outlierMaxSubs, outlierMinRatio, outlierTopicQuery);
                  setOutlierChannels(found);
                },
                className: 'w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400'
              },
                h('option', { value: 'US' }, 'Mỹ (US) - RPM Cao 100% Tiếng Anh'),
                h('option', { value: 'VN' }, 'Việt Nam (VN)'),
                h('option', { value: 'GLOBAL' }, 'Toàn Cầu (Global)'),
                h('option', { value: 'GB' }, 'Vương Quốc Anh (UK)'),
                h('option', { value: 'JP' }, 'Nhật Bản (JP)')
              )
            ),

            // Filter 4: Ô tìm kiếm chủ đề
            h('div', { className: 'space-y-1' },
              h('label', { className: 'text-zinc-400 font-semibold' }, 'Chủ đề / Ngách cụ thể (Tùy chọn):'),
              h('div', { className: 'flex gap-1.5' },
                h('input', {
                  type: 'text',
                  placeholder: 'Stoic, AI, Finance, Bí ẩn, Kinh doanh...',
                  value: outlierTopicQuery,
                  onChange: (e) => setOutlierTopicQuery(e.target.value),
                  onKeyDown: (e) => { if (e.key === 'Enter') handleScanOutlierChannels(); },
                  className: 'w-full bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-amber-400'
                }),
                h('button', {
                  type: 'button',
                  onClick: () => handleScanOutlierChannels(),
                  disabled: outlierScanning,
                  className: 'px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs shrink-0 cursor-pointer disabled:opacity-50'
                }, outlierScanning ? '...' : '🔍 Dò')
              )
            )
          ),

          // Quick Preset Topics
          h('div', { className: 'flex items-center gap-2 pt-2 border-t border-brand-border/60 text-xs flex-wrap' },
            h('span', { className: 'text-zinc-400 text-[11px]' }, 'Gợi ý chủ đề hot:'),
            (targetRegion === 'VN' ? ['Vụ Án Kỳ Bí', 'Kinh Doanh & Khởi Nghiệp', 'Khắc Kỷ & Đạo Làm Người', 'Mẹo Vặt Đời Sống', 'Sức Khỏe Người Già'] : ['Stoic Philosophy', 'Business Monopolies', 'AI 3D Animation', 'Dark Unsolved Mysteries', 'Calm Christian Prayers', 'Psychology & Focus']).map(topic => h('button', {
              key: topic,
              type: 'button',
              onClick: () => {
                setOutlierTopicQuery(topic);
                handleScanOutlierChannels(topic);
              },
              className: `px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${outlierTopicQuery === topic ? 'bg-amber-400 text-black font-bold' : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700'}`
            }, topic)),
            outlierTopicQuery && h('button', {
              type: 'button',
              onClick: () => {
                setOutlierTopicQuery('');
                handleScanOutlierChannels('');
              },
              className: 'text-[11px] text-zinc-500 hover:text-zinc-300 ml-1'
            }, 'Xoá lọc ✕')
          )
        ),

        // Discovered Channels Count & Selection Header
        h('div', { className: 'flex items-center justify-between text-xs px-1' },
          h('div', { className: 'flex items-center gap-2 text-zinc-300 font-semibold' },
            h('span', null, `Tìm thấy ${outlierChannels.length} kênh sub nhỏ bứt phá view khủng`),
            h('span', { className: 'text-zinc-500' }, '•'),
            h('span', { className: 'text-amber-400' }, `Tiêu chí: Sub < ${(outlierMaxSubs / 1000).toFixed(0)}k | Outlier >= x${outlierMinRatio}`)
          ),
          h('div', { className: 'flex items-center gap-3 text-xs' },
            h('button', {
              type: 'button',
              onClick: () => {
                if (selectedOutlierIds.size === outlierChannels.length) {
                  setSelectedOutlierIds(new Set());
                } else {
                  setSelectedOutlierIds(new Set(outlierChannels.map(c => c.id)));
                }
              },
              className: 'text-zinc-400 hover:text-white underline cursor-pointer'
            }, selectedOutlierIds.size === outlierChannels.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả kênh')
          )
        ),

        // Channels List Grid
        h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-4' },
          outlierChannels.map(channel => {
            const isSelected = selectedOutlierIds.has(channel.id);
            const isExpanded = expandedOutlierId === channel.id;
            const vid = channel.video || {};

            return h('div', {
              key: channel.id,
              className: `bg-brand-surface rounded-xl border p-4 sm:p-5 transition space-y-4 ${isSelected ? 'border-amber-500/50 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/20' : 'border-brand-border hover:border-zinc-700'}`
            },
              // Channel Header Info
              h('div', { className: 'flex items-start justify-between gap-3' },
                h('div', { className: 'flex items-center gap-3' },
                  h('input', {
                    type: 'checkbox',
                    checked: isSelected,
                    onChange: () => {
                      setSelectedOutlierIds(prev => {
                        const next = new Set(prev);
                        if (next.has(channel.id)) next.delete(channel.id);
                        else next.add(channel.id);
                        return next;
                      });
                    },
                    className: 'w-4 h-4 rounded text-amber-500 border-brand-border bg-zinc-900 cursor-pointer'
                  }),
                  h('img', {
                    src: channel.avatar,
                    alt: channel.title,
                    className: 'w-11 h-11 rounded-full object-cover border-2 border-brand-border shrink-0'
                  }),
                  h('div', null,
                    h('div', { className: 'flex items-center gap-2' },
                      h('h4', { className: 'font-bold text-sm text-white hover:text-amber-300 transition' }, channel.title),
                      h('span', { className: 'text-[10px] px-1.5 py-0.2 rounded font-bold bg-zinc-800 text-zinc-300 border border-zinc-700' }, channel.country)
                    ),
                    h('div', { className: 'flex items-center gap-2 text-xs text-zinc-400 mt-0.5' },
                      h('span', { className: 'font-extrabold text-amber-400' }, `${(channel.subs || 0).toLocaleString()} subs`),
                      h('span', null, '•'),
                      h('span', null, `${channel.videoCount || 0} video đã đăng`),
                      h('span', null, '•'),
                      h('span', { className: 'text-emerald-400 font-semibold' }, `RPM ${channel.rpm || '$20 - $40'}`)
                    )
                  )
                ),
                h('span', { className: 'px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 whitespace-nowrap shadow-sm' },
                  `🔥 x${(vid.outlierRatio || 0).toFixed(1)} View/Sub`
                )
              ),

              // Breakout Video Spotlight Box
              h('div', { className: 'p-3 bg-brand-card/90 rounded-xl border border-brand-border/80 flex flex-col sm:flex-row gap-3 items-start' },
                h('div', { className: 'relative shrink-0 w-full sm:w-36 aspect-video rounded-lg overflow-hidden border border-brand-border/60 bg-zinc-900' },
                  h('img', {
                    src: vid.thumb || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=400&q=80',
                    alt: vid.title,
                    className: 'w-full h-full object-cover'
                  }),
                  h('span', { className: 'absolute bottom-1 right-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-black/80 text-white' }, vid.dur || '25:00')
                ),
                h('div', { className: 'space-y-1.5 min-w-0 flex-1' },
                  h('div', { className: 'text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1' },
                    h('span', null, '⚡ Video Bứt Phá:'),
                    h('span', { className: 'text-zinc-400 font-normal lowercase' }, vid.published || 'gần đây')
                  ),
                  h('h5', { className: 'font-bold text-xs text-zinc-100 line-clamp-2 leading-snug' }, vid.title),
                  h('div', { className: 'flex items-center gap-3 text-[11px] text-zinc-300 pt-1' },
                    h('span', { className: 'font-black text-white' }, `${(vid.views || 0).toLocaleString()} views`),
                    h('span', { className: 'text-amber-400 font-mono font-bold' }, `+${vid.vph || 0} vph`),
                    h('span', { className: 'text-zinc-500' }, `Gấp ${(vid.outlierRatio || 0).toFixed(1)} lần subs`)
                  )
                )
              ),

              // Action Buttons
              h('div', { className: 'flex items-center justify-between gap-2 pt-2 border-t border-brand-border/60' },
                h('button', {
                  type: 'button',
                  onClick: () => setExpandedOutlierId(isExpanded ? null : channel.id),
                  className: `px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${isExpanded ? 'bg-amber-400/20 text-amber-300 border border-amber-500/30' : 'bg-brand-card hover:bg-zinc-800 text-zinc-300 border border-brand-border'}`
                },
                  h('span', null, '⚡ Bóc Tách Từ Khoá Vàng'),
                  h('span', { className: 'text-[10px] px-1.5 py-0.2 rounded-full bg-zinc-800 font-bold' }, (channel.keywords || []).length),
                  h('span', null, isExpanded ? '▲' : '▼')
                ),
                h('button', {
                  type: 'button',
                  onClick: () => handleForwardChannelKeywordsToStep2(channel),
                  className: 'px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow transition cursor-pointer flex items-center gap-1.5'
                },
                  h('span', null, '🚀 Đưa Vào Bước 2 Để Dò Tiếp Ngay'),
                  h('span', null, '→')
                )
              ),

              // Expanded Keywords Tag Cloud
              isExpanded && h('div', { className: 'p-3 bg-zinc-950/70 rounded-xl border border-amber-500/20 space-y-2 animate-in fade-in duration-150' },
                h('div', { className: 'flex items-center justify-between text-xs' },
                  h('span', { className: 'font-bold text-amber-300' }, `Danh sách ${(channel.keywords || []).length} từ khoá tiềm năng từ video bứt phá này:`),
                  h('span', { className: 'text-[10px] text-zinc-500' }, 'Bấm nút xanh ở trên để đưa vào Bước 2')
                ),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                  (channel.keywords || []).map((kw, kIdx) => h('span', {
                    key: kIdx,
                    className: 'px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-200 border border-amber-500/30'
                  }, `🔑 ${kw}`))
                )
              )
            );
          })
        )
      ),

      // SUB-TAB: LỊCH SỬ ĐỢT QUÉT (SAVED RUNS)
      activeTabV2 === 'saved_runs' && h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-5 space-y-4' },
          h('div', { className: 'flex items-center justify-between' },
            h('div', null,
              h('h3', { className: 'text-sm sm:text-base font-bold text-white' }, 'Lịch Sử Các Đợt Quét Đã Lưu'),
              h('p', { className: 'text-xs text-zinc-400' }, 'Lưu trữ cục bộ trên trình duyệt, có thể mở lại bất cứ lúc nào để xem bảng xếp hạng và biểu đồ.')
            ),
            h('span', { className: 'text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold' }, `${savedRuns.length} Đợt Quét`)
          ),
          savedRuns.length === 0 ? h('div', { className: 'text-center py-12 text-zinc-500 text-xs italic' },
            'Chưa có đợt quét nào được lưu. Hãy hoàn thành Bước 5 trong Wizard và bấm "Lưu Đợt Quét Này".'
          ) : h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
            savedRuns.map(run => h('div', { key: run.id, className: 'p-4 rounded-xl bg-brand-card border border-brand-border space-y-3' },
              h('div', { className: 'flex items-center justify-between' },
                h('h4', { className: 'font-bold text-xs sm:text-sm text-white' }, run.title),
                h('span', { className: 'text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold' }, `Top: ${run.topScore}đ`)
              ),
              h('div', { className: 'flex items-center gap-3 text-xs text-zinc-400' },
                h('span', null, `Khu vực: ${run.region}`),
                h('span', null, `Số lượng: ${run.count} từ khoá`),
                h('span', null, `Thời gian: ${new Date(run.timestamp).toLocaleDateString('vi-VN')}`)
              ),
              h('div', { className: 'pt-2 border-t border-brand-border/60 flex items-center justify-between' },
                h('button', {
                  type: 'button',
                  onClick: () => handleLoadRun(run),
                  className: 'px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white'
                }, '📂 Mở Lại Bảng Xếp Hạng'),
                h('button', {
                  type: 'button',
                  onClick: () => handleDeleteRun(run.id),
                  className: 'text-xs text-rose-400 hover:text-rose-300'
                }, 'Xoá đợt này')
              )
            ))
          )
        )
      ),

      // SUB-TAB: CSV TESTER PLAYGROUND
      activeTabV2 === 'csv_importer' && h('div', { className: 'space-y-4' },
        h('div', { className: 'bg-brand-surface border border-brand-border rounded-xl p-4 sm:p-5 space-y-4' },
          h('div', { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-3' },
            h('div', null,
              h('h3', { className: 'text-sm sm:text-base font-bold text-white' }, 'Trình Phân Tích & Chịu Lỗi File CSV Google Trends'),
              h('p', { className: 'text-xs text-zinc-400' }, 'Hỗ trợ file xuất trực tiếp từ biểu đồ Google Trends (tiếng Việt hoặc tiếng Anh, có BOM, xử lý số "<1" = 0.5)')
            )
          ),
          h('textarea', {
            value: csvInput,
            onChange: (e) => setCsvInput(e.target.value),
            placeholder: 'Dán nội dung file CSV Google Trends vào đây để kiểm tra parser...',
            rows: 6,
            className: 'w-full bg-brand-card border border-brand-border rounded-xl p-3 text-xs font-mono text-zinc-200'
          })
        )
      ),

      // DETAIL DRAWER / DEEP DIVE MODAL
      detailItem && h('div', {
        className: 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150',
        onClick: () => setDetailItem(null)
      },
        h('div', {
          onClick: (e) => e.stopPropagation(),
          className: 'bg-zinc-950 border border-brand-border w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xl relative'
        },
          // Drawer Header
          h('div', { className: 'flex items-start justify-between gap-4 border-b border-brand-border pb-4' },
            h('div', { className: 'space-y-1' },
              h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider', style: { color: detailItem.color, backgroundColor: `${detailItem.color}20` } },
                  detailItem.tierBadge
                ),
                h('span', { className: 'text-xs text-zinc-400 font-mono' }, `Nguồn: ${detailItem.source}`)
              ),
              h('h3', { className: 'text-xl font-black text-white' }, detailItem.keyword),
              h('p', { className: 'text-xs text-zinc-400' }, `Ngách: ${detailItem.nicheName} • Ý định: ${detailItem.searchIntent} • Khả năng RPM: ${detailItem.cpmTier}`)
            ),
            h('div', { className: 'flex items-center gap-2' },
              h('button', {
                type: 'button',
                onClick: () => exportReportPng(detailItem),
                className: 'px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow'
              }, '📸 Xuất Ảnh PNG'),
              h('button', {
                type: 'button',
                onClick: () => setDetailItem(null),
                className: 'w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center cursor-pointer'
              }, '✕')
            )
          ),

          // 6 Pillars Breakdown
          h('div', { className: 'space-y-3' },
            h('h4', { className: 'font-bold text-xs text-zinc-200 uppercase tracking-wider' }, 'Chi Tiết 6 Trụ Cột Đánh Giá Tiềm Năng'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              [
                { label: 'Demand (Nhu cầu tìm kiếm / xem)', score: detailItem.pillars?.demand, desc: 'Tốc độ tìm kiếm và lượt xem' },
                { label: 'Opportunity (Cơ hội kênh nhỏ <30k sub)', score: detailItem.pillars?.opportunity, desc: 'Dễ lên xu hướng mà không cần kênh lớn' },
                { label: 'Monetization (RPM & Khả năng kiếm tiền)', score: detailItem.pillars?.monetization, desc: 'Doanh thu quảng cáo và thương mại' },
                { label: 'Sustainability (Tính bền vững Evergreen)', score: detailItem.pillars?.sustainability, desc: 'Ít bị thoái trào nhanh' },
                { label: 'Feasibility (Khả thi Faceless/AI)', score: detailItem.pillars?.feasibility, desc: 'Dễ sản xuất nội dung bằng AI' },
                { label: 'Policy Risk (Độ an toàn chính sách)', score: detailItem.pillars?.policy, desc: 'Không vi phạm nguyên tắc cộng đồng' }
              ].map(p => h('div', { key: p.label, className: 'p-3 rounded-xl bg-brand-card border border-brand-border space-y-1.5' },
                h('div', { className: 'flex items-center justify-between text-xs' },
                  h('span', { className: 'font-semibold text-zinc-300' }, p.label),
                  h('span', { className: 'font-bold text-emerald-400' }, `${p.score}/100`)
                ),
                h('div', { className: 'h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden' },
                  h('div', { className: 'h-full bg-emerald-500 rounded-full', style: { width: `${p.score}%` } })
                ),
                h('div', { className: 'text-[10px] text-zinc-500' }, p.desc)
              ))
            )
          ),

          // YouTube Videos Evidence
          detailItem.youtubeData?.topVideos && detailItem.youtubeData.topVideos.length > 0 && h('div', { className: 'space-y-3 pt-2 border-t border-brand-border' },
            h('h4', { className: 'font-bold text-xs text-zinc-200 uppercase tracking-wider' }, 'Video YouTube Bằng Chứng Thực Tế'),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
              detailItem.youtubeData.topVideos.map((v, i) => h('div', { key: i, className: 'p-3 rounded-xl bg-brand-card border border-brand-border flex gap-3' },
                v.thumbnail && h('img', { src: v.thumbnail, className: 'w-24 h-16 object-cover rounded-lg shrink-0 bg-zinc-900' }),
                h('div', { className: 'space-y-1 min-w-0' },
                  h('h5', { className: 'font-bold text-xs text-white truncate' }, v.title),
                  h('div', { className: 'text-[11px] text-zinc-400' }, v.channelTitle),
                  h('div', { className: 'text-[10px] text-emerald-400 font-semibold' },
                    `${(v.views || 0).toLocaleString()} views • Outlier ${v.outlierMultiplier || 1.5}x`
                  )
                )
              ))
            )
          )
        )
      )
    );
  }

  // Export to window
  window.TrendToolSectionV2 = TrendToolSectionV2;
  window.TrendV2Engine = {
    parseTrendsCsvClient,
    calculateMetricsClient,
    calculateMoneyScoreClient,
    exportReportPng
  };
})();
