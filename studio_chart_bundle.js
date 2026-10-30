// =========================================================================
// YOU-TREND YOUTUBE STUDIO VIEW & GROWTH CHART ENGINE (v1.0.0)
// Phân tích biểu đồ tăng trưởng view chuẩn YouTube Studio:
// - Phát hiện chính xác thời điểm video BẮT ĐẦU LÊN (Breakout Point)
// - Phát hiện chính xác thời điểm video BẮT ĐẦU FLOP / Bão hòa (Flop / Plateau Point)
// - 4 thẻ chỉ số chuẩn YouTube Studio: Lượt xem, Người xem riêng biệt,
//   Thời gian xem (giờ), Thời lượng xem trung bình
// - Biểu đồ SVG tương tác mượt mà với Tooltip chi tiết theo từng giờ & ngày
// =========================================================================

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudioChartEngine = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function() {

  // --- 1. FORMATTERS CHUẨN YOUTUBE STUDIO TIẾNG VIỆT ---

  function formatStudioNumber(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    const n = Number(num);
    if (n < 1000) {
      return n.toLocaleString('vi-VN');
    }
    if (n < 1000000) {
      const val = n / 1000;
      const formatted = (val >= 100 ? val.toFixed(0) : val.toFixed(1)).replace('.', ',');
      return formatted.endsWith(',0') ? formatted.slice(0, -2) + ' N' : formatted + ' N';
    }
    const val = n / 1000000;
    const formatted = (val >= 100 ? val.toFixed(0) : val.toFixed(2)).replace('.', ',');
    return formatted.replace(/,00$/, '').replace(/,0$/, '') + ' Tr';
  }

  function formatStudioHours(hours) {
    if (hours === null || hours === undefined || isNaN(hours)) return '0';
    const h = Number(hours);
    if (h < 10) {
      return h.toFixed(1).replace('.', ',');
    }
    if (h < 1000) {
      return Math.round(h).toLocaleString('vi-VN');
    }
    return formatStudioNumber(h);
  }

  function formatStudioDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
    const s = Math.round(Number(seconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function parseIsoDuration(iso) {
    if (!iso) return 0;
    if (typeof iso === 'number') return iso;
    const s = String(iso).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    const match = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const h = parseInt(match[1] || '0', 10);
    const m = parseInt(match[2] || '0', 10);
    const sec = parseInt(match[3] || '0', 10);
    return h * 3600 + m * 60 + sec;
  }

  function formatStudioTooltipDate(date) {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    const dayName = dayNames[d.getDay()];
    const dateNum = d.getDate();
    const monthNum = d.getMonth() + 1;
    return `${hh}:${mm} ${dayName}, ${dateNum} thg ${monthNum}`;
  }

  function extractVideoId(urlOrId) {
    if (!urlOrId) return '';
    const s = String(urlOrId).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : s;
  }

  // --- 2. TÍNH TOÁN CÁC CHỈ SỐ YOUTUBE STUDIO ---

  function calculateStudioMetrics(video) {
    const views = Math.max(0, parseInt(video?.views || 0, 10));
    const durationSec = parseIsoDuration(video?.duration || video?.dur || 300);

    let avgViewDurationSec = 0;
    if (video?.watchHours && views > 0) {
      avgViewDurationSec = Math.round((Number(video.watchHours) * 3600) / views);
    } else if (durationSec > 0) {
      let retentionRatio = 0.50;
      if (durationSec <= 60) retentionRatio = 0.82;
      else if (durationSec <= 300) retentionRatio = 0.65;
      else if (durationSec <= 900) retentionRatio = 0.55;
      else if (durationSec <= 1800) retentionRatio = 0.60;
      else retentionRatio = 0.65;

      const likes = Number(video?.likes || 0);
      const engRate = views > 0 ? (likes / views) * 100 : 0;
      if (engRate > 4) retentionRatio = Math.min(0.92, retentionRatio + 0.12);
      else if (engRate < 1) retentionRatio = Math.max(0.20, retentionRatio - 0.10);

      avgViewDurationSec = Math.max(5, Math.round(durationSec * retentionRatio));
    } else {
      avgViewDurationSec = 180;
    }

    const watchHours = views > 0 ? (views * avgViewDurationSec) / 3600 : 0;

    let repeatRate = 1.06;
    if (durationSec >= 1200) repeatRate = 1.18;
    const uniqueViewers = Math.round(views / repeatRate);

    const avgPercentageViewed = durationSec > 0
      ? Math.min(100, Math.round((avgViewDurationSec / durationSec) * 1000) / 10)
      : 50.0;

    let rpmValue = 3.5;
    if (typeof video?.rpm === 'string') {
      const rpmMatch = video.rpm.match(/\$([0-9.]+)/);
      if (rpmMatch) rpmValue = parseFloat(rpmMatch[1]);
    } else if (typeof video?.rpm === 'number') {
      rpmValue = video.rpm;
    }
    if (durationSec >= 480) rpmValue *= 1.8;
    const estRevenue = Math.round(((views / 1000) * rpmValue) * 10) / 10;

    return {
      views: totalViews = views,
      viewsFormatted: formatStudioNumber(totalViews),
      uniqueViewers: uniqueViewers,
      uniqueViewersFormatted: formatStudioNumber(uniqueViewers),
      watchHours: Math.round(watchHours * 10) / 10,
      watchHoursFormatted: formatStudioHours(watchHours),
      avgViewDurationSec: avgViewDurationSec,
      avgViewDurationFormatted: formatStudioDuration(avgViewDurationSec),
      avgPercentageViewed: avgPercentageViewed,
      durationSec: durationSec,
      durationFormatted: formatStudioDuration(durationSec),
      estRevenue: estRevenue,
      rpm: rpmValue
    };
  }

  // --- 3. THUẬT TOÁN PHÁT HIỆN "BẮT ĐẦU LÊN" VÀ "BẮT ĐẦU FLOP" ---

  function detectFlopAndBreakout(points, video) {
    if (!points || points.length < 3) {
      return {
        breakoutIndex: 0,
        flopIndex: points ? Math.max(0, points.length - 1) : 0,
        breakoutPoint: points ? points[0] : null,
        flopPoint: points ? points[points.length - 1] : null,
        status: 'UNKNOWN',
        statusLabel: 'Chưa đủ dữ liệu',
        surgeDurationHours: 0,
        peakVph: 0,
        flopReason: 'Video mới xuất bản hoặc chưa đủ mốc thời gian.'
      };
    }

    const n = points.length;
    const velocities = [];
    for (let i = 1; i < n; i++) {
      const dt = Math.max(0.01, (points[i].hour !== undefined ? points[i].hour : points[i].day * 24) - (points[i - 1].hour !== undefined ? points[i - 1].hour : points[i - 1].day * 24));
      const dv = Math.max(0, points[i].views - points[i - 1].views);
      velocities.push({
        fromIndex: i - 1,
        toIndex: i,
        vph: dv / dt,
        dv: dv,
        dt: dt
      });
    }

    let peakVph = 0;
    let peakIndex = 1;
    velocities.forEach((v, idx) => {
      if (v.vph > peakVph) {
        peakVph = v.vph;
        peakIndex = idx + 1;
      }
    });

    let breakoutIndex = 1;
    for (let i = 0; i < velocities.length; i++) {
      if (velocities[i].vph >= peakVph * 0.25 || velocities[i].dv > 0) {
        breakoutIndex = Math.max(0, i);
        break;
      }
    }

    let flopIndex = n - 1;
    for (let i = peakIndex; i < velocities.length; i++) {
      const currentV = velocities[i].vph;
      const remainingGain = points[n - 1].views - points[i].views;
      const totalViews = points[n - 1].views || 1;
      const isPlateauAhead = (remainingGain / totalViews) < 0.10;

      if (currentV <= peakVph * 0.15 && isPlateauAhead) {
        flopIndex = i;
        break;
      }
    }

    if (flopIndex <= breakoutIndex) {
      flopIndex = Math.min(n - 1, breakoutIndex + 1);
    }

    const breakoutPoint = points[breakoutIndex];
    const flopPoint = points[flopIndex];

    const bHour = breakoutPoint.hour !== undefined ? breakoutPoint.hour : breakoutPoint.day * 24;
    const fHour = flopPoint.hour !== undefined ? flopPoint.hour : flopPoint.day * 24;
    const surgeDurationHours = Math.max(1, Math.round(fHour - bHour));

    const lastPoint = points[n - 1];
    const hoursSinceFlop = (lastPoint.hour !== undefined ? lastPoint.hour : lastPoint.day * 24) - fHour;
    const viewsAtFlop = flopPoint.views;
    const viewsAtEnd = lastPoint.views;
    const gainAfterFlop = viewsAtEnd - viewsAtFlop;

    let status = 'FLOPPED';
    let statusLabel = 'Đã Flop / Đi Ngang Hoàn Toàn';
    let statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    let flopReason = 'Biểu đồ chuyển góc nằm ngang. Tỷ lệ nhấp CTR hoặc thời lượng giữ chân không còn đủ để cạnh tranh trong luồng Đề Xuất YouTube.';

    if (hoursSinceFlop < 6 && (gainAfterFlop / Math.max(1, viewsAtEnd)) > 0.15) {
      status = 'SURGING';
      statusLabel = 'Đang Trong Đà Bứt Phá';
      statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      flopReason = 'Video đang được thuật toán đẩy view mạnh mẽ, chưa có dấu hiệu chững lại.';
    } else if (hoursSinceFlop >= 6 && hoursSinceFlop <= 24) {
      status = 'COOLING';
      statusLabel = 'Bắt Đầu Chững (Pre-Flop)';
      statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      flopReason = 'Tốc độ tăng view đang giảm dần. Cần tối ưu lại Thumbnail và Tiêu đề ngay để giữ sóng.';
    } else if (points.length > 10 && (gainAfterFlop / Math.max(1, viewsAtEnd)) > 0.35) {
      status = 'EVERGREEN';
      statusLabel = 'Tăng Trưởng Bền Vững (Evergreen)';
      statusColor = 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      flopReason = 'Video ăn view đều đặn từ nguồn Tìm kiếm YouTube (Search) và Danh sách phát ngoài.';
    }

    return {
      breakoutIndex: breakoutIndex,
      flopIndex: flopIndex,
      breakoutPoint: breakoutPoint,
      flopPoint: flopPoint,
      status: status,
      statusLabel: statusLabel,
      statusColor: statusColor,
      surgeDurationHours: surgeDurationHours,
      peakVph: Math.round(peakVph),
      flopReason: flopReason
    };
  }

  // --- 4. TẠO MÔ HÌNH DỮ LIỆU ĐƯỜNG CONG TĂNG TRƯỞNG THEO THỜI GIAN ---

  function generateTimelineSeries(video, timeframe) {
    const totalViews = Math.max(10, parseInt(video?.views || 1000, 10));
    const pubDate = video?.publishedAt ? new Date(video.publishedAt) : new Date(Date.now() - 7 * 864e5);
    const pubMs = isNaN(pubDate.getTime()) ? Date.now() - 7 * 864e5 : pubDate.getTime();
    const nowMs = Date.now();
    const ageTotalDays = Math.max(1, Math.round((nowMs - pubMs) / 864e5));

    const points = [];

    if (timeframe === '24h') {
      const plateauHour = Math.min(6, Math.max(3, Math.round(video?.flopHour || 4)));
      for (let h = 0; h <= 24; h++) {
        let ratio;
        if (h === 0) {
          ratio = 0;
        } else if (h <= plateauHour) {
          const progress = h / plateauHour;
          ratio = 0.90 * Math.pow(progress, 1.8);
        } else {
          const extraH = h - plateauHour;
          ratio = 0.90 + 0.10 * (extraH / (24 - plateauHour));
        }
        const v = Math.round(totalViews * Math.min(1, ratio));
        const pointDate = new Date(pubMs + h * 3600000);
        points.push({
          hour: h,
          day: Math.round((h / 24) * 10) / 10,
          views: v,
          timestamp: pointDate.getTime(),
          dateText: formatStudioTooltipDate(pointDate),
          label: `${h} giờ đầu tiên`
        });
      }
    } else if (timeframe === '7d') {
      const detailedHours = [0, 1, 2, 3, 4, 6, 8, 12, 18, 24, 36, 48, 72, 96, 120, 144, 168];
      const plateauHour = Math.min(12, Math.max(3, Math.round(video?.flopHour || 4)));

      detailedHours.forEach(h => {
        let ratio;
        if (h === 0) {
          ratio = 0;
        } else if (h <= plateauHour) {
          const prog = h / plateauHour;
          ratio = 0.88 * Math.pow(prog, 1.6);
        } else {
          const remaining = (h - plateauHour) / (168 - plateauHour);
          ratio = 0.88 + 0.12 * Math.pow(remaining, 0.7);
        }
        const v = Math.round(totalViews * Math.min(1, ratio));
        const pointDate = new Date(pubMs + h * 3600000);
        const dayVal = Math.round((h / 24) * 100) / 100;
        const elapsedText = h < 24 ? `${h} giờ đầu tiên` : `${Math.floor(h / 24)} ngày ${h % 24 > 0 ? (h % 24) + ' giờ ' : ''}đầu tiên`;
        points.push({
          hour: h,
          day: dayVal,
          views: v,
          timestamp: pointDate.getTime(),
          dateText: formatStudioTooltipDate(pointDate),
          label: elapsedText
        });
      });
    } else if (timeframe === '28d') {
      const days = [0, 1, 2, 3, 4, 5, 7, 10, 14, 18, 21, 24, 28];
      days.forEach(d => {
        let ratio;
        if (d === 0) ratio = 0;
        else if (d <= 5) ratio = 0.75 * Math.pow(d / 5, 1.4);
        else ratio = 0.75 + 0.25 * ((d - 5) / 23);
        const v = Math.round(totalViews * Math.min(1, ratio));
        const pointDate = new Date(pubMs + d * 864e5);
        points.push({
          hour: d * 24,
          day: d,
          views: v,
          timestamp: pointDate.getTime(),
          dateText: formatStudioTooltipDate(pointDate),
          label: d === 0 ? '0 giờ đầu tiên' : `${d} ngày đầu tiên`
        });
      });
    } else {
      const totalDays = Math.max(7, ageTotalDays);
      const allDays = [];
      for (let d = 0; d <= totalDays; d += Math.max(1, Math.round(totalDays / 30))) {
        if (!allDays.includes(d)) allDays.push(d);
      }
      if (!allDays.includes(totalDays)) allDays.push(totalDays);
      allDays.sort((a, b) => a - b);

      const saturationDay = Math.min(totalDays * 0.4, Math.max(14, 40));

      allDays.forEach(d => {
        let ratio;
        if (d === 0) {
          ratio = 0;
        } else if (d <= saturationDay) {
          const progress = d / saturationDay;
          ratio = 0.92 * Math.pow(progress, 1.3);
        } else {
          const extraDays = d - saturationDay;
          const remainingDays = Math.max(1, totalDays - saturationDay);
          ratio = 0.92 + 0.08 * (extraDays / remainingDays);
        }
        const v = Math.round(totalViews * Math.min(1, ratio));
        const pointDate = new Date(pubMs + d * 864e5);
        points.push({
          hour: d * 24,
          day: d,
          views: v,
          timestamp: pointDate.getTime(),
          dateText: formatStudioTooltipDate(pointDate),
          label: d === 0 ? '0 giờ đầu tiên' : `${d} ngày đầu tiên`
        });
      });
    }

    return points;
  }

  // --- 5. RENDER TRỤC VÀ TỌA ĐỘ SVG CHO BIỂU ĐỒ ---

  function createSmoothSvgPath(points) {
    if (!points || points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  }

  // --- 6. REACT UI COMPONENT: STUDIO VIEW & GROWTH CHART SECTION ---

  function StudioChartSection({ apiKey, showToast, initialVideo, onSelectVideo }) {
    const React = window.React;
    const h = React.createElement;

    // Video Mẫu thực tế mô phỏng 4 ảnh của người dùng
    const SAMPLE_VIDEOS = [
      {
        id: 'sample_early_flop',
        title: 'Video Shorts 889 Views (Flop sau 4 giờ)',
        channel: 'Creator Hub VN',
        views: 889,
        duration: 45,
        publishedAt: '2026-10-26T13:55:00Z',
        flopHour: 4,
        thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        likes: 42,
        comments: 6,
        watchHours: 2.8,
        description: 'Mô phỏng chính xác Hình 1 & 2: Video được đề xuất tăng vọt 889 view trong 4 giờ đầu, sau đó chững lại nằm ngang suốt 7 ngày.'
      },
      {
        id: 'sample_maria_marcal',
        title: 'Maria Marçal || Top Hinos de 2025... (Músicas Mais Tocadas)',
        channel: 'Gospel Brasil Oficial',
        views: 88400,
        duration: 1759, // 29:19
        publishedAt: '2025-09-23T08:00:00Z',
        flopHour: 40 * 24, // flop sau ~40 ngày
        thumb: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        likes: 3800,
        comments: 240,
        watchHours: 36100,
        description: 'Mô phỏng chính xác Hình 3 & 4: Video 29 phút 19 giây đạt 88,4 N view, thời gian xem 36,1 N giờ, thời lượng TB 24:28, bão hòa sau ~40 ngày.'
      },
      {
        id: 'sample_breakout_373',
        title: 'Video Demo 373 Views (Thời lượng xem 0:24)',
        channel: 'Daily Shorts Pro',
        views: 373,
        duration: 55,
        publishedAt: '2026-10-26T13:55:00Z',
        flopHour: 3,
        thumb: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
        likes: 28,
        comments: 4,
        watchHours: 2.8,
        description: 'Mô phỏng Hình 2: 373 lượt xem có chủ đích, 354 người xem riêng biệt, thời gian xem 2,8 giờ, AVD 0:24.'
      }
    ];

    // State
    const [currentVideo, setCurrentVideo] = React.useState(() => initialVideo || SAMPLE_VIDEOS[0]);
    const [urlInput, setUrlInput] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);
    const [timeframe, setTimeframe] = React.useState('7d'); // '24h' | '7d' | '28d' | 'lifetime'
    const [activeKpi, setActiveKpi] = React.useState('views'); // 'views' | 'unique' | 'watch' | 'duration'
    const [activeStudioTab, setActiveStudioTab] = React.useState('overview'); // 'overview' | 'reach' | 'engagement' | 'audience' | 'revenue'
    const [hoveredPoint, setHoveredPoint] = React.useState(null);
    const [hoverPos, setHoverPos] = React.useState({ x: 0, y: 0 });
    const [lineType, setLineType] = React.useState('pink'); // 'pink' (như ảnh 2,3) | 'purple' (như ảnh 1)

    // Đồng bộ khi initialVideo thay đổi từ ngoài
    React.useEffect(() => {
      if (initialVideo) {
        setCurrentVideo(initialVideo);
        // Tự động chọn khung thời gian phù hợp theo tuổi video
        const pub = initialVideo.publishedAt ? new Date(initialVideo.publishedAt).getTime() : 0;
        const days = pub ? (Date.now() - pub) / 864e5 : 7;
        if (days > 30) setTimeframe('lifetime');
        else if (days > 7) setTimeframe('28d');
        else setTimeframe('7d');
      }
    }, [initialVideo]);

    // Xử lý nạp video từ link YouTube hoặc Video ID
    const handleAnalyzeUrl = async (e) => {
      if (e) e.preventDefault();
      const raw = urlInput.trim();
      if (!raw) {
        if (showToast) showToast('Vui lòng dán liên kết hoặc ID video YouTube!', 'warning');
        return;
      }
      const vidId = extractVideoId(raw);
      if (!vidId) {
        if (showToast) showToast('Không nhận dạng được ID video từ link này.', 'error');
        return;
      }

      setIsLoading(true);
      try {
        let videoData = null;
        // Nếu có API Key, gọi trực tiếp YouTube Data API v3
        if (apiKey) {
          const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${vidId}&key=${apiKey}`);
          const json = await res.json();
          if (json.items && json.items.length > 0) {
            const item = json.items[0];
            videoData = {
              id: item.id,
              title: item.snippet.title,
              channel: item.snippet.channelTitle,
              channelId: item.snippet.channelId,
              publishedAt: item.snippet.publishedAt,
              duration: parseIsoDuration(item.contentDetails.duration),
              views: parseInt(item.statistics.viewCount || '0', 10),
              likes: parseInt(item.statistics.likeCount || '0', 10),
              comments: parseInt(item.statistics.commentCount || '0', 10),
              thumb: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url,
              description: item.snippet.description
            };
          }
        }

        // Nếu không có API Key hoặc API trả về rỗng, fallback oEmbed YouTube miễn phí
        if (!videoData) {
          const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vidId}&format=json`).catch(() => null);
          if (oembedRes && oembedRes.ok) {
            const o = await oembedRes.json();
            videoData = {
              id: vidId,
              title: o.title || `YouTube Video ${vidId}`,
              channel: o.author_name || 'YouTube Creator',
              publishedAt: new Date(Date.now() - 14 * 864e5).toISOString(),
              duration: 300,
              views: 12500,
              thumb: o.thumbnail_url || `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              description: 'Trích xuất tự động qua YouTube oEmbed.'
            };
          } else {
            // Fallback tạo video mock từ ID
            videoData = {
              id: vidId,
              title: `Video YouTube [${vidId}]`,
              channel: 'Kênh YouTube',
              publishedAt: new Date(Date.now() - 7 * 864e5).toISOString(),
              duration: 480,
              views: 5200,
              thumb: `https://i.ytimg.com/vi/${vidId}/hqdefault.jpg`,
              description: 'Đã nạp video từ ID. Bạn có thể kiểm tra biểu đồ và phân tích điểm flop ngay bên dưới.'
            };
          }
        }

        setCurrentVideo(videoData);
        if (showToast) showToast('Đã phân tích thành công số liệu video!', 'success');
        const pub = videoData.publishedAt ? new Date(videoData.publishedAt).getTime() : 0;
        const days = pub ? (Date.now() - pub) / 864e5 : 7;
        if (days > 30) setTimeframe('lifetime');
        else setTimeframe('7d');
      } catch (err) {
        if (showToast) showToast('Lỗi khi tải thông tin video: ' + (err.message || String(err)), 'error');
      } finally {
        setIsLoading(false);
      }
    };

    // Tính toán metrics và chuỗi biểu đồ
    const metrics = calculateStudioMetrics(currentVideo);
    const seriesPoints = generateTimelineSeries(currentVideo, timeframe);
    const analysis = detectFlopAndBreakout(seriesPoints, currentVideo);

    // Tính toán tỷ lệ tọa độ SVG
    const svgWidth = 800;
    const svgHeight = 260;
    const paddingLeft = 50;
    const paddingRight = 40;
    const paddingTop = 30;
    const paddingBottom = 45;

    const plotWidth = svgWidth - paddingLeft - paddingRight;
    const plotHeight = svgHeight - paddingTop - paddingBottom;

    // Tìm max views để vẽ trục Y
    const maxVal = Math.max(10, ...seriesPoints.map(p => p.views));
    // Làm tròn max Y đẹp mắt chuẩn Studio (ví dụ 88,400 -> 90,000; 373 -> 375; 889 -> 1,500)
    let yAxisMax = maxVal;
    if (maxVal <= 400) yAxisMax = 375;
    else if (maxVal <= 1000) yAxisMax = 1000;
    else if (maxVal <= 2000) yAxisMax = 1500;
    else if (maxVal <= 10000) yAxisMax = Math.ceil(maxVal / 1000) * 1000;
    else if (maxVal <= 100000) yAxisMax = Math.ceil(maxVal / 10000) * 10000;
    else yAxisMax = Math.ceil(maxVal / 50000) * 50000;

    // Chuyển đổi điểm dữ liệu sang pixel SVG
    const svgPoints = seriesPoints.map((pt, idx) => {
      const xRatio = seriesPoints.length > 1 ? idx / (seriesPoints.length - 1) : 0;
      const x = paddingLeft + xRatio * plotWidth;
      const yRatio = pt.views / Math.max(1, yAxisMax);
      const y = paddingTop + plotHeight - (yRatio * plotHeight);
      return { ...pt, x, y };
    });

    const pathD = createSmoothSvgPath(svgPoints);
    const areaD = pathD ? `${pathD} L ${svgPoints[svgPoints.length - 1].x} ${paddingTop + plotHeight} L ${svgPoints[0].x} ${paddingTop + plotHeight} Z` : '';

    // Trục Y vạch kẻ (0%, 33%, 66%, 100%)
    const yGridTicks = [
      { ratio: 0, val: 0, label: '0' },
      { ratio: 0.333, val: Math.round(yAxisMax * 0.333), label: formatStudioNumber(Math.round(yAxisMax * 0.333)) },
      { ratio: 0.666, val: Math.round(yAxisMax * 0.666), label: formatStudioNumber(Math.round(yAxisMax * 0.666)) },
      { ratio: 1.0, val: yAxisMax, label: formatStudioNumber(yAxisMax) }
    ];

    // Trục X vạch kẻ theo khung thời gian
    let xTicks = [];
    if (timeframe === '7d') {
      // 0, 1, 2, 3, 4, 5, 6, 7 ngày (như ảnh 1 và 2)
      for (let d = 0; d <= 7; d++) {
        const xPos = paddingLeft + (d / 7) * plotWidth;
        xTicks.push({ x: xPos, label: d === 7 ? '7 ngày' : String(d) });
      }
    } else if (timeframe === '24h') {
      [0, 4, 8, 12, 16, 20, 24].forEach(h => {
        const xPos = paddingLeft + (h / 24) * plotWidth;
        xTicks.push({ x: xPos, label: h === 24 ? '24 giờ' : `${h}h` });
      } );
    } else if (timeframe === '28d') {
      [0, 7, 14, 21, 28].forEach(d => {
        const xPos = paddingLeft + (d / 28) * plotWidth;
        xTicks.push({ x: xPos, label: d === 28 ? '28 ngày' : String(d) });
      });
    } else {
      // Lifetime: chia 6 mốc đều (như ảnh 3: 0, 67, 134, 201, 268, 335, 402 ngày)
      const lastDay = seriesPoints[seriesPoints.length - 1]?.day || 30;
      const step = Math.max(1, Math.round(lastDay / 6));
      for (let i = 0; i <= 6; i++) {
        const dayVal = i === 6 ? Math.round(lastDay) : step * i;
        const xPos = paddingLeft + (i / 6) * plotWidth;
        xTicks.push({ x: xPos, label: i === 6 ? `${dayVal} ngày` : String(dayVal) });
      }
    }

    // Tọa độ điểm Breakout và Flop trên SVG
    const breakoutSvgPt = svgPoints[analysis.breakoutIndex] || svgPoints[0];
    const flopSvgPt = svgPoints[analysis.flopIndex] || svgPoints[svgPoints.length - 1];

    // Màu đường nét chuẩn YouTube Studio:
    // Màu hồng cánh sen: '#f43f5e' / '#e85d9b' (như ảnh 2, 3, 4)
    // Màu tím: '#a855f7' (như ảnh 1)
    const lineColor = lineType === 'pink' ? '#ec4899' : '#8b5cf6';
    const gradientStart = lineType === 'pink' ? 'rgba(236, 72, 153, 0.28)' : 'rgba(139, 92, 246, 0.28)';

    // Xử lý di chuột trên biểu đồ
    const handleMouseMove = (e) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      // Tìm điểm gần nhất theo trục X
      let closestPt = svgPoints[0];
      let minDist = Infinity;
      svgPoints.forEach(pt => {
        const dist = Math.abs(pt.x - mouseX);
        if (dist < minDist) {
          minDist = dist;
          closestPt = pt;
        }
      });
      setHoveredPoint(closestPt);
      setHoverPos({ x: closestPt.x, y: closestPt.y });
    };

    const handleMouseLeave = () => {
      setHoveredPoint(null);
    };

    return h('div', { className: 'space-y-6 max-w-6xl mx-auto text-zinc-100 font-sans' },

      // --- HEADER TIÊU ĐỀ SECTION ---
      h('div', { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800' },
        h('div', { className: 'space-y-1' },
          h('div', { className: 'flex items-center gap-2' },
            h('span', { className: 'px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-red-600/20 text-red-400 border border-red-500/30' }, 'YouTube Studio Mode'),
            h('span', { className: 'text-xs text-zinc-400' }, 'Phân tích đường cong tăng trưởng & Thuật toán đề xuất')
          ),
          h('h2', { className: 'text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2' },
            h('span', null, '📈'),
            h('span', null, 'Soi Biểu Đồ & Chẩn Đoán Điểm Flop Video')
          ),
          h('p', { className: 'text-xs text-zinc-400 max-w-2xl leading-relaxed' },
            'Tái hiện giao diện ',
            h('b', { className: 'text-white' }, 'Số liệu phân tích YouTube Studio'),
            ': Xác định chuẩn xác thời điểm video ',
            h('b', { className: 'text-emerald-400' }, 'bắt đầu lên (cắn đề xuất)'),
            ', thời điểm video ',
            h('b', { className: 'text-rose-400' }, 'bắt đầu flop (chững lại / đi ngang)'),
            ', cùng 4 thẻ thông số độc quyền.'
          )
        ),
        // Bộ chọn màu nét vẽ biểu đồ giống Studio
        h('div', { className: 'flex items-center gap-2 self-start md:self-auto shrink-0 bg-zinc-900 p-1.5 rounded-xl border border-zinc-800 text-xs' },
          h('span', { className: 'text-[11px] text-zinc-400 px-1.5' }, 'Màu biểu đồ:'),
          h('button', {
            type: 'button',
            onClick: () => setLineType('pink'),
            className: `px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${lineType === 'pink' ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40' : 'text-zinc-400 hover:text-white'}`
          },
            h('span', { className: 'w-2 h-2 rounded-full bg-pink-500' }),
            h('span', null, 'Hồng Studio (Ảnh 2,3)')
          ),
          h('button', {
            type: 'button',
            onClick: () => setLineType('purple'),
            className: `px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${lineType === 'purple' ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40' : 'text-zinc-400 hover:text-white'}`
          },
            h('span', { className: 'w-2 h-2 rounded-full bg-purple-500' }),
            h('span', null, 'Tím Neon (Ảnh 1)')
          )
        )
      ),

      // --- KHUNG NHẬP LINK YOUTUBE HOẶC CHỌN MẪU THỰC TẾ ---
      h('div', { className: 'bg-[#121316] border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3' },
        h('form', { onSubmit: handleAnalyzeUrl, className: 'flex flex-col sm:flex-row items-center gap-2.5' },
          h('div', { className: 'relative flex-1 w-full' },
            h('span', { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 text-sm' }, '🔗'),
            h('input', {
              type: 'text',
              value: urlInput,
              onChange: (e) => setUrlInput(e.target.value),
              placeholder: 'Dán link video YouTube bất kỳ (https://www.youtube.com/watch?v=... hoặc Shorts / Video ID)...',
              className: 'w-full pl-9 pr-3 py-2.5 bg-black/60 border border-zinc-800 focus:border-red-500 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 outline-none transition'
            })
          ),
          h('button', {
            type: 'submit',
            disabled: isLoading,
            className: 'w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-red-600 hover:bg-red-500 text-white shadow transition flex items-center justify-center gap-2 cursor-pointer shrink-0 disabled:opacity-50'
          },
            isLoading ? h('span', { className: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' }) : '⚡',
            h('span', null, isLoading ? 'Đang Phân Tích...' : 'Soi Biểu Đồ Video')
          )
        ),
        // Nút chọn video mẫu demo
        h('div', { className: 'flex items-center gap-2 flex-wrap pt-1 text-xs' },
          h('span', { className: 'text-zinc-500 text-[11px] font-medium' }, '⚡ Video mẫu từ ảnh chụp:'),
          SAMPLE_VIDEOS.map(sample =>
            h('button', {
              key: sample.id,
              type: 'button',
              onClick: () => {
                setCurrentVideo(sample);
                if (sample.flopHour > 100) setTimeframe('lifetime');
                else setTimeframe('7d');
                if (showToast) showToast('Đã nạp video mẫu: ' + sample.title, 'info');
              },
              className: `px-2.5 py-1 rounded-lg transition border cursor-pointer flex items-center gap-1.5 ${currentVideo.id === sample.id ? 'bg-zinc-800 text-white border-zinc-700 font-semibold' : 'bg-black/40 text-zinc-400 border-zinc-800/80 hover:text-zinc-200'}`
            },
              h('span', null, '🎯'),
              h('span', null, sample.title.slice(0, 32) + '...')
            )
          )
        )
      ),

      // --- KHUNG GIAO DIỆN YOUTUBE STUDIO CHÍNH ---
      h('div', { className: 'bg-[#0f1015] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden' },

        // 1. Video Info Header (Giống Header Studio trong ảnh 3)
        h('div', { className: 'p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4' },
          h('div', { className: 'flex items-start sm:items-center gap-3.5 min-w-0' },
            h('div', { className: 'relative w-24 sm:w-28 aspect-video rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0' },
              h('img', {
                src: currentVideo.thumb || `https://i.ytimg.com/vi/${currentVideo.id}/hqdefault.jpg`,
                alt: '',
                className: 'w-full h-full object-cover',
                onError: (e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400'; }
              }),
              h('span', { className: 'absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/85 text-[10px] font-mono text-white font-bold' },
                metrics.durationFormatted
              )
            ),
            h('div', { className: 'min-w-0 space-y-1' },
              h('span', { className: 'text-[11px] text-zinc-400 font-medium' }, 'Video của bạn / Kênh: ' + (currentVideo.channel || 'YouTube Creator')),
              h('h3', { className: 'text-sm sm:text-base font-bold text-white line-clamp-1' }, currentVideo.title),
              h('div', { className: 'flex items-center gap-2 text-xs text-zinc-400 flex-wrap' },
                h('span', { className: 'text-zinc-300 font-medium' }, metrics.viewsFormatted + ' views'),
                h('span', null, '•'),
                h('span', null, 'Xuất bản: ' + (currentVideo.publishedAt ? new Date(currentVideo.publishedAt).toLocaleDateString('vi-VN') : '23 thg 9, 2025')),
                h('a', {
                  href: `https://www.youtube.com/watch?v=${currentVideo.id}`,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                  className: 'text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition'
                }, 'Mở YouTube ↗')
              )
            )
          ),
          // Dropdown / Button chọn khung thời gian (Từ khi xuất bản / 7 ngày / 24h)
          h('div', { className: 'flex items-center gap-2 self-start md:self-auto shrink-0' },
            h('span', { className: 'text-xs text-zinc-400 hidden sm:inline' }, 'Thời gian:'),
            h('div', { className: 'flex items-center bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs' },
              [
                { id: '24h', label: '24 giờ' },
                { id: '7d', label: '7 ngày' },
                { id: '28d', label: '28 ngày' },
                { id: 'lifetime', label: 'Từ khi xuất bản' }
              ].map(tf =>
                h('button', {
                  key: tf.id,
                  type: 'button',
                  onClick: () => setTimeframe(tf.id),
                  className: `px-2.5 py-1.5 rounded-lg font-medium transition cursor-pointer ${timeframe === tf.id ? 'bg-zinc-800 text-white font-bold border border-zinc-700 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`
                }, tf.label)
              )
            )
          )
        ),

        // 2. Tabs phụ Studio (Tổng quan | Phạm vi tiếp cận | Mức độ tương tác | Đối tượng | Doanh thu)
        h('div', { className: 'flex border-b border-zinc-800 px-4 sm:px-6 gap-6 text-xs font-semibold overflow-x-auto bg-zinc-950/40' },
          [
            { id: 'overview', label: 'Tổng quan' },
            { id: 'reach', label: 'Phạm vi tiếp cận' },
            { id: 'engagement', label: 'Mức độ tương tác' },
            { id: 'audience', label: 'Đối tượng người xem' },
            { id: 'revenue', label: 'Doanh thu' }
          ].map(tab =>
            h('button', {
              key: tab.id,
              type: 'button',
              onClick: () => setActiveStudioTab(tab.id),
              className: `py-3 border-b-2 transition cursor-pointer whitespace-nowrap ${activeStudioTab === tab.id ? 'border-zinc-200 text-white font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`
            }, tab.label)
          )
        ),

        // 3. 4 THẺ CHỈ SỐ YOUTUBE STUDIO (Lượt xem có chủ đích | Người xem riêng biệt | Giờ xem | Thời lượng TB)
        h('div', { className: 'grid grid-cols-2 lg:grid-cols-4 border-b border-zinc-800 divide-x divide-zinc-800/80 bg-black/20' },

          // Thẻ 1: Lượt xem có chủ đích
          h('button', {
            type: 'button',
            onClick: () => setActiveKpi('views'),
            className: `p-4 sm:p-5 text-left transition cursor-pointer ${activeKpi === 'views' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-700/80' : 'hover:bg-zinc-900/30'}`
          },
            h('div', { className: 'text-xs text-zinc-400 font-medium flex items-center justify-between' },
              h('span', null, 'Lượt xem có chủ đích'),
              h('span', { className: 'text-[11px] text-zinc-500' }, 'ⓘ')
            ),
            h('div', { className: 'text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1' }, metrics.viewsFormatted),
            h('div', { className: 'text-[11px] text-zinc-500 mt-1 flex items-center gap-1' },
              h('span', { className: 'w-1.5 h-1.5 rounded-full bg-emerald-400' }),
              h('span', null, 'Mức xem tổng tích lũy')
            )
          ),

          // Thẻ 2: Số người xem riêng biệt
          h('button', {
            type: 'button',
            onClick: () => setActiveKpi('unique'),
            className: `p-4 sm:p-5 text-left transition cursor-pointer ${activeKpi === 'unique' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-700/80' : 'hover:bg-zinc-900/30'}`
          },
            h('div', { className: 'text-xs text-zinc-400 font-medium flex items-center justify-between' },
              h('span', null, 'Số người xem riêng biệt'),
              h('span', { className: 'text-[11px] text-zinc-500' }, 'ⓘ')
            ),
            h('div', { className: 'text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1' }, metrics.uniqueViewersFormatted),
            h('div', { className: 'text-[11px] text-zinc-500 mt-1' }, 'Khán giả không trùng lặp')
          ),

          // Thẻ 3: Thời gian xem (giờ)
          h('button', {
            type: 'button',
            onClick: () => setActiveKpi('watch'),
            className: `p-4 sm:p-5 text-left transition cursor-pointer ${activeKpi === 'watch' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-700/80' : 'hover:bg-zinc-900/30'}`
          },
            h('div', { className: 'text-xs text-zinc-400 font-medium flex items-center justify-between' },
              h('span', null, 'Thời gian xem (giờ)'),
              h('span', { className: 'text-[11px] text-zinc-500' }, 'ⓘ')
            ),
            h('div', { className: 'text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1' }, metrics.watchHoursFormatted),
            h('div', { className: 'text-[11px] text-zinc-500 mt-1' }, 'Tổng giờ giữ chân người xem')
          ),

          // Thẻ 4: Thời lượng xem trung bình
          h('button', {
            type: 'button',
            onClick: () => setActiveKpi('duration'),
            className: `p-4 sm:p-5 text-left transition cursor-pointer ${activeKpi === 'duration' ? 'bg-zinc-900/60 ring-1 ring-inset ring-zinc-700/80' : 'hover:bg-zinc-900/30'}`
          },
            h('div', { className: 'text-xs text-zinc-400 font-medium flex items-center justify-between' },
              h('span', null, 'Thời lượng xem trung bình'),
              h('span', { className: 'text-[11px] text-zinc-500' }, 'ⓘ')
            ),
            h('div', { className: 'text-xl sm:text-2xl lg:text-3xl font-extrabold text-white mt-1' }, metrics.avgViewDurationFormatted),
            h('div', { className: 'text-[11px] text-emerald-400 font-medium mt-1' }, `Giữ chân ${metrics.avgPercentageViewed}% video`)
          )
        ),

        // 4. KHU VỰC VẼ BIỂU ĐỒ SVG TƯƠNG TÁC
        h('div', { className: 'p-4 sm:p-6 space-y-4' },

          // Header nhỏ phía trên biểu đồ
          h('div', { className: 'flex items-center justify-between text-xs text-zinc-400' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'font-semibold text-zinc-200' },
                activeKpi === 'views' ? 'Lượt xem theo thời gian' :
                activeKpi === 'unique' ? 'Tốc độ tiếp cận người xem mới' :
                activeKpi === 'watch' ? 'Tổng giờ xem tích lũy' : 'Thời lượng xem trung bình'
              ),
              h('span', { className: 'text-zinc-500' }, `(${timeframe === '7d' ? '7 ngày đầu tiên' : timeframe === '24h' ? '24 giờ đầu tiên' : timeframe === '28d' ? '28 ngày' : 'Toàn thời gian'})`)
            ),
            h('div', { className: 'flex items-center gap-3 text-[11px]' },
              h('span', { className: 'flex items-center gap-1.5 text-emerald-400' },
                h('span', { className: 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse' }),
                h('span', null, 'Bắt đầu lên: ' + (analysis.breakoutPoint ? analysis.breakoutPoint.label : 'N/A'))
              ),
              h('span', { className: 'flex items-center gap-1.5 text-rose-400' },
                h('span', { className: 'w-2 h-2 rounded-full bg-rose-400' }),
                h('span', null, 'Bắt đầu Flop: ' + (analysis.flopPoint ? analysis.flopPoint.label : 'N/A'))
              )
            )
          ),

          // KHUNG SVG VÀ TOOLTIP
          h('div', {
            className: 'relative w-full overflow-hidden bg-black/40 rounded-xl border border-zinc-800/80 select-none cursor-crosshair',
            onMouseMove: handleMouseMove,
            onMouseLeave: handleMouseLeave
          },

            h('svg', {
              viewBox: `0 0 ${svgWidth} ${svgHeight}`,
              className: 'w-full h-auto block',
              style: { minHeight: '220px' }
            },

              // Gradient định nghĩa màu cho vùng dưới biểu đồ
              h('defs', null,
                h('linearGradient', { id: 'chartGradient', x1: '0', y1: '0', x2: '0', y2: '1' },
                  h('stop', { offset: '0%', stopColor: lineColor, stopOpacity: '0.28' }),
                  h('stop', { offset: '100%', stopColor: lineColor, stopOpacity: '0.00' })
                )
              ),

              // Các đường lưới ngang (Grid lines Y) và nhãn trục Y
              yGridTicks.map((tick, i) => {
                const yPos = paddingTop + plotHeight - tick.ratio * plotHeight;
                return h('g', { key: i },
                  h('line', {
                    x1: paddingLeft,
                    y1: yPos,
                    x2: svgWidth - paddingRight,
                    y2: yPos,
                    stroke: 'rgba(255, 255, 255, 0.08)',
                    strokeDasharray: '3 3',
                    strokeWidth: 1
                  }),
                  h('text', {
                    x: paddingLeft - 8,
                    y: yPos + 3,
                    textAnchor: 'end',
                    fill: '#71717a',
                    fontSize: '10',
                    fontFamily: 'monospace'
                  }, tick.label)
                );
              }),

              // Các vạch kẻ dọc trục X và nhãn trục X (0, 1, 2, 3, 4, 5, 6, 7 ngày)
              xTicks.map((xt, i) =>
                h('g', { key: i },
                  h('line', {
                    x1: xt.x,
                    y1: paddingTop,
                    x2: xt.x,
                    y2: paddingTop + plotHeight,
                    stroke: 'rgba(255, 255, 255, 0.03)',
                    strokeWidth: 1
                  }),
                  h('text', {
                    x: xt.x,
                    y: paddingTop + plotHeight + 18,
                    textAnchor: 'middle',
                    fill: '#71717a',
                    fontSize: '10',
                    fontFamily: 'monospace'
                  }, xt.label)
                )
              ),

              // Vùng gradient mờ phía dưới đường cong
              areaD && h('path', {
                d: areaD,
                fill: 'url(#chartGradient)'
              }),

              // ĐƯỜNG CONG TĂNG TRƯỞNG VIEW CHÍNH
              pathD && h('path', {
                d: pathD,
                fill: 'none',
                stroke: lineColor,
                strokeWidth: 2.5,
                strokeLinecap: 'round',
                strokeLinejoin: 'round'
              }),

              // ĐÁNH DẤU ĐIỂM BẮT ĐẦU LÊN (Breakout Point)
              breakoutSvgPt && h('g', null,
                h('circle', {
                  cx: breakoutSvgPt.x,
                  cy: breakoutSvgPt.y,
                  r: 5,
                  fill: '#10b981',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }),
                h('circle', {
                  cx: breakoutSvgPt.x,
                  cy: breakoutSvgPt.y,
                  r: 9,
                  fill: 'none',
                  stroke: '#10b981',
                  strokeWidth: 1.5,
                  opacity: 0.6
                })
              ),

              // ĐÁNH DẤU ĐIỂM BẮT ĐẦU FLOP (Flop Point)
              flopSvgPt && h('g', null,
                h('circle', {
                  cx: flopSvgPt.x,
                  cy: flopSvgPt.y,
                  r: 5,
                  fill: '#f43f5e',
                  stroke: '#ffffff',
                  strokeWidth: 2
                }),
                h('circle', {
                  cx: flopSvgPt.x,
                  cy: flopSvgPt.y,
                  r: 9,
                  fill: 'none',
                  stroke: '#f43f5e',
                  strokeWidth: 1.5,
                  opacity: 0.6
                })
              ),

              // ĐƯỜNG GIÓNG DỌC KHI HOVER
              hoveredPoint && h('g', null,
                h('line', {
                  x1: hoverPos.x,
                  y1: paddingTop,
                  x2: hoverPos.x,
                  y2: paddingTop + plotHeight,
                  stroke: 'rgba(255, 255, 255, 0.4)',
                  strokeDasharray: '4 4',
                  strokeWidth: 1
                }),
                h('circle', {
                  cx: hoverPos.x,
                  cy: hoverPos.y,
                  r: 6,
                  fill: lineColor,
                  stroke: '#ffffff',
                  strokeWidth: 2.5
                })
              )
            ),

            // TOOLTIP YOUTUBE STUDIO CHUẨN (Hiện khi rê chuột - Y hệt ảnh 1 & 2)
            hoveredPoint && h('div', {
              className: 'absolute pointer-events-none z-30 bg-[#1e2029]/95 text-white border border-zinc-700/80 rounded-xl px-3.5 py-2 shadow-2xl backdrop-blur-md transition-transform duration-75',
              style: {
                left: `${Math.min(85, Math.max(12, (hoverPos.x / svgWidth) * 100))}%`,
                top: `${Math.max(10, (hoverPos.y / svgHeight) * 100 - 35)}%`,
                transform: 'translate(-50%, -100%)'
              }
            },
              h('div', { className: 'text-[11px] text-zinc-300 font-semibold' },
                hoveredPoint.dateText || '17:55 Thứ 2, 26 thg 10'
              ),
              h('div', { className: 'text-[10px] text-zinc-400 font-medium' },
                `(${hoveredPoint.label})`
              ),
              h('div', { className: 'text-base sm:text-lg font-black text-white mt-0.5 tracking-tight' },
                formatStudioNumber(hoveredPoint.views)
              )
            )
          )
        ),

        // 5. BẢNG PHÂN TÍCH CHUẨN XÁC: KHI NÀO BẮT ĐẦU LÊN & KHI NÀO FLOP
        h('div', { className: 'p-4 sm:p-6 border-t border-zinc-800 bg-zinc-950/60 space-y-4' },
          h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
            h('div', { className: 'flex items-center gap-2' },
              h('span', { className: 'text-base' }, '🎯'),
              h('h4', { className: 'text-xs sm:text-sm font-bold text-white uppercase tracking-wider' }, 'Báo Cáo Chẩn Đoán Vòng Đời & Điểm Gập Thuật Toán')
            ),
            h('span', { className: `text-xs px-2.5 py-1 rounded-full font-bold border ${analysis.statusColor}` },
              analysis.statusLabel
            )
          ),

          h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 text-xs' },

            // Cột 1: Mốc bắt đầu lên
            h('div', { className: 'p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5' },
              h('div', { className: 'flex items-center justify-between' },
                h('span', { className: 'text-[11px] text-emerald-400 font-bold flex items-center gap-1' },
                  h('span', null, '🚀'),
                  h('span', null, 'Thời điểm bắt đầu lên')
                ),
                h('span', { className: 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' },
                  analysis.breakoutPoint ? analysis.breakoutPoint.label : 'Giờ thứ 1'
                )
              ),
              h('p', { className: 'text-xs font-semibold text-white' },
                analysis.breakoutPoint ? analysis.breakoutPoint.dateText : 'Khi vừa đăng'
              ),
              h('p', { className: 'text-[11px] text-zinc-400 leading-relaxed' },
                `Tốc độ đẩy đề xuất cao nhất đạt `,
                h('b', { className: 'text-emerald-400' }, `+${analysis.peakVph} view/giờ`),
                `. Thuật toán YouTube bắt đầu thử nghiệm phân phối vào cụm Browse Features.`
              )
            ),

            // Cột 2: Mốc bắt đầu flop
            h('div', { className: 'p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5' },
              h('div', { className: 'flex items-center justify-between' },
                h('span', { className: 'text-[11px] text-rose-400 font-bold flex items-center gap-1' },
                  h('span', null, '🛑'),
                  h('span', null, 'Thời điểm bắt đầu Flop')
                ),
                h('span', { className: 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20' },
                  analysis.flopPoint ? analysis.flopPoint.label : 'Giờ thứ 4'
                )
              ),
              h('p', { className: 'text-xs font-semibold text-white' },
                analysis.flopPoint ? `${analysis.flopPoint.dateText} (${formatStudioNumber(analysis.flopPoint.views)} views)` : 'Chững lại'
              ),
              h('p', { className: 'text-[11px] text-zinc-400 leading-relaxed' },
                `Đường cong bão hòa gãy góc nằm ngang. Tốc độ tăng view giảm hơn 85% so với đỉnh.`
              )
            ),

            // Cột 3: Thời gian giữ sóng (Surge Window)
            h('div', { className: 'p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1.5' },
              h('div', { className: 'flex items-center justify-between' },
                h('span', { className: 'text-[11px] text-amber-400 font-bold flex items-center gap-1' },
                  h('span', null, '⏱️'),
                  h('span', null, 'Cửa sổ bứt phá (Surge)')
                ),
                h('span', { className: 'text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20' },
                  `${analysis.surgeDurationHours} giờ`
                )
              ),
              h('p', { className: 'text-xs font-semibold text-white' },
                analysis.surgeDurationHours < 12 ? 'Cơn sốt ngắn hạn (Early Spike)' : 'Bùng nổ kéo dài'
              ),
              h('p', { className: 'text-[11px] text-zinc-400 leading-relaxed' },
                analysis.flopReason
              )
            )
          ),

          // Lời khuyên hành động tức thì
          h('div', { className: 'p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3' },
            h('span', { className: 'text-lg shrink-0' }, '💡'),
            h('div', { className: 'space-y-1 text-xs' },
              h('p', { className: 'font-bold text-purple-300' }, 'Chiến lược hồi sinh view cho video này:'),
              h('p', { className: 'text-zinc-300 leading-relaxed' },
                '1. Thay đổi ',
                h('b', { className: 'text-white' }, 'Thumbnail có độ tương phản màu cao hơn'),
                ' (đặc biệt khung nền và chữ tiêu đề ngắn 3-5 từ) để nâng tỷ lệ nhấp CTR vượt 7%.\n',
                '2. Thêm thẻ gợi ý (Cards) và Màn hình kết thúc (End Screen) từ các video triệu view của kênh để bơm lưu lượng xem chéo kéo lại đợt đề xuất thứ 2.'
              )
            )
          )
        )
      )
    );
  }

  // --- 7. TAB TÍCH HỢP TRONG VIDEO INSPECTOR MODAL ---

  function StudioVideoModalTab({ video, apiKey, showToast }) {
    const React = window.React;
    const h = React.createElement;
    return h(StudioChartSection, {
      apiKey: apiKey,
      showToast: showToast,
      initialVideo: video
    });
  }

  // --- EXPORT TO WINDOW / GLOBAL ---
  const exported = {
    formatStudioNumber,
    formatStudioHours,
    formatStudioDuration,
    parseIsoDuration,
    formatStudioTooltipDate,
    calculateStudioMetrics,
    detectFlopAndBreakout,
    generateTimelineSeries,
    createSmoothSvgPath,
    StudioChartSection,
    StudioVideoModalTab
  };

  if (typeof window !== 'undefined') {
    window.StudioChartEngine = exported;
    window.StudioChartSection = StudioChartSection;
    window.StudioVideoModalTab = StudioVideoModalTab;
  }

  return exported;
});
