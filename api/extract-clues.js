const https = require('https');
const { parseVNNumber, getVNNumberBounds } = require('./lib/vn_parser');
const { validateVisibleTitleChars, createClue } = require('./lib/types_and_clues');
const { parseStudioDate } = require('./lib/date_parser');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Gemini-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch(e) {
      body = {};
    }
  }

  const imageBase64 = body?.imageBase64 || (body?.dataUrl ? body.dataUrl.replace(/^data:image\/[a-z]+;base64,/, '') : null);
  const crops = body?.crops || {}; // { header, kpiCards, rightSidebar, chart }
  const mimeType = body?.mimeType || 'image/jpeg';
  const customApiKey = req.headers['x-gemini-key'] || body?.geminiKey || GEMINI_API_KEY;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Thiếu dữ liệu ảnh (imageBase64 hoặc dataUrl)' });
  }

  if (!customApiKey) {
    return res.status(400).json({
      success: false,
      code: 'NO_GEMINI_KEY',
      message: 'Chưa cấu hình GEMINI_API_KEY trên server backend. Vui lòng cung cấp key hoặc dùng chế độ quét dự phòng.'
    });
  }

  const promptText = `You are an expert YouTube Studio analytics forensic reverse-engineering system.
Analyze the provided YouTube Studio screenshot (full image plus optional high-res region crops).
Perform REGION-BASED extraction across distinct areas of the interface:

1. HEADER / DATE REGION:
   - Look for date text like "30 thg 9, 2026 tới nay", "Từ khi xuất bản", "Since published", "26 thg 9, 2026 – 24 thg 10, 2026", "30/09/2026".
   - Extract raw text in dateRangeText.
   - If "Từ khi xuất bản" / "tới nay" is present, note isPublishedSince = true.

2. KPI METRIC CARDS REGION:
   - "Số lượt xem" / Views: e.g. "2,4 Tr", "1,2 M", "450 K", "125.000". Extract totalViewsText.
   - "Thời gian xem (giờ)" / Watch time: e.g. "126,5 N", "12,5 N", "500 h". Extract watchHoursText.
   - "Người đăng ký" / Subscribers gained: e.g. "+717", "717", "+1,2 N". Extract subsGainedText.

3. REALTIME SIDEBAR / PANEL (Often on the right):
   - "Thời gian thực" / Realtime 48 hours: e.g. "29.238", "20.869". Extract views48hText.
   - Top videos listed under 48h: list of view strings e.g. ["4,5 N", "3,8 N", "2,9 N"]. DO NOT take axis labels (870, 580, 290, 0).

4. CHART & TIMELINE REGION:
   - Tooltip text (if visible on hover): e.g. "Thứ 7, 10 thg 10, 2026 (10 ngày 18 giờ đầu tiên)". Extract tooltipText.
   - Comparison banner vs normal: e.g. "gấp 30 lần so với thường lệ", extract vsNormalRatio = 30.
   - Elapsed days on x-axis: captureAgeDays.

5. CHANNEL OVERVIEW REGION (For channel-level screenshots):
   - Total channel subscribers: e.g. "45,2 N người đăng ký", extract subscriberTotalText.
   - Channel views in date range: extract channelViewsText.

6. VISIBLE TITLE CHARACTERS:
   - Any unmasked Japanese/CJK or Latin letters visible in the video title or breadcrumb.
   - Must NOT be axis labels (870, 580) or UI words ("Tổng quan", "Phân tích"). E.g. "々の".

IMPORTANT CLASSIFICATION RULE:
- screenType is an informative tag ("studio_video_analytics" | "studio_channel_realtime" | "channel_overview" | "unknown").
- A screenshot is NOT realtime-only if ANY region contains a date or total views!

Output strictly valid JSON:
{
  "screenType": "studio_video_analytics" | "studio_channel_realtime" | "channel_overview" | "unknown",
  "headerRegion": {
    "dateRangeText": string or null,
    "isPublishedSince": boolean
  },
  "kpiCardsRegion": {
    "totalViewsText": string or null,
    "watchHoursText": string or null,
    "subsGainedText": string or null
  },
  "realtimeSidebarRegion": {
    "views48hText": string or null,
    "topVideos48h": string[]
  },
  "chartRegion": {
    "tooltipText": string or null,
    "vsNormalRatio": number or null,
    "captureAgeDays": number or null
  },
  "channelOverviewRegion": {
    "subscriberTotalText": string or null,
    "channelViewsText": string or null
  },
  "visibleTitleChars": string or null
}`;

  try {
    const parts = [{ text: promptText }];

    // Full image part
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: imageBase64
      }
    });

    // Add region crops if provided to give high-res zoom
    if (crops.header) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: crops.header.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      });
    }
    if (crops.kpiCards) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: crops.kpiCards.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      });
    }
    if (crops.rightSidebar) {
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: crops.rightSidebar.replace(/^data:image\/[a-z]+;base64,/, '')
        }
      });
    }

    const geminiPayload = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const geminiRes = await new Promise((resolve, reject) => {
      const model = 'gemini-2.5-flash';
      const reqPath = `/v1beta/models/${model}:generateContent?key=${customApiKey}`;
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: reqPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(geminiPayload)
        }
      };

      const request = https.request(options, (response) => {
        let respBody = '';
        response.on('data', chunk => { respBody += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(respBody));
            } catch(e) {
              reject(new Error('Invalid JSON from Gemini: ' + respBody.slice(0, 200)));
            }
          } else {
            reject(new Error(`Gemini API error [${response.statusCode}]: ${respBody}`));
          }
        });
      });

      request.on('error', err => reject(err));
      request.write(geminiPayload);
      request.end();
    });

    const candidate = geminiRes.candidates?.[0];
    const rawText = candidate?.content?.parts?.[0]?.text;
    if (!rawText) {
      throw new Error('No content returned from Gemini model');
    }

    const parsedJson = JSON.parse(rawText);
    const screenType = parsedJson.screenType || 'unknown';

    // Extract sub-regions
    const header = parsedJson.headerRegion || {};
    const kpi = parsedJson.kpiCardsRegion || {};
    const realtime = parsedJson.realtimeSidebarRegion || {};
    const chart = parsedJson.chartRegion || {};
    const channelOverview = parsedJson.channelOverviewRegion || {};

    const clues = [];
    let anchorCount = 0;

    // 1. Publish Date (from header dateRangeText or chart tooltip)
    const dateCandidate = header.dateRangeText || chart.tooltipText;
    if (dateCandidate) {
      const dateParsed = parseStudioDate(dateCandidate);
      if (dateParsed && dateParsed.publishDate) {
        clues.push(createClue({
          type: 'publishDate',
          value: dateParsed.publishDate,
          confidence: 0.95,
          strength: 'hard',
          source: { raw: dateCandidate, parsed: dateParsed },
          note: `Ngày xuất bản: ${dateParsed.publishDate} (Đệm ±1 ngày: ${dateParsed.paddedStart} - ${dateParsed.paddedEnd})`
        }));
        anchorCount++;
      } else if (dateParsed && dateParsed.startDate) {
        clues.push(createClue({
          type: 'dateRange',
          value: { start: dateParsed.startDate, end: dateParsed.endDate },
          confidence: 0.85,
          strength: 'soft',
          note: `Khoảng ngày: ${dateParsed.startDate} - ${dateParsed.endDate}`
        }));
      }
    }

    // 2. Total views (from KPI card or top level)
    const rawTotalViews = kpi.totalViewsText || parsedJson.totalViews;
    if (rawTotalViews) {
      const b = getVNNumberBounds(rawTotalViews);
      if (b && b.value >= 1000) {
        clues.push(createClue({
          type: 'totalViews',
          value: b.value,
          min: b.min,
          max: b.max,
          confidence: 0.95,
          strength: 'hard',
          note: `Tổng lượt xem: ${rawTotalViews} [${b.min.toLocaleString('vi-VN')} - ${b.max.toLocaleString('vi-VN')}]`
        }));
        anchorCount++;
      }
    }

    // 3. Watch hours
    const rawWatchHours = kpi.watchHoursText || parsedJson.watchHours;
    if (rawWatchHours) {
      const b = getVNNumberBounds(rawWatchHours);
      if (b && b.value > 0) {
        clues.push(createClue({
          type: 'watchHours',
          value: b.value,
          min: b.min,
          max: b.max,
          confidence: 0.90,
          strength: 'soft',
          note: `Thời gian xem: ${rawWatchHours} (${b.value.toLocaleString('vi-VN')} giờ)`
        }));
      }
    }

    // 4. Subscribers gained
    const rawSubsGained = kpi.subsGainedText || parsedJson.subsGained;
    if (rawSubsGained) {
      const subs = parseVNNumber(rawSubsGained);
      if (subs !== null) {
        clues.push(createClue({
          type: 'subsGained',
          value: subs,
          confidence: 0.90,
          strength: 'soft',
          note: `Số người đăng ký tăng: +${subs.toLocaleString('vi-VN')}`
        }));
      }
    }

    // 5. Views 48h (from realtime panel)
    const rawViews48h = realtime.views48hText || parsedJson.views48h;
    if (rawViews48h) {
      const v48 = parseVNNumber(rawViews48h);
      if (v48 && v48 >= 100) {
        clues.push(createClue({
          type: 'views48h',
          value: v48,
          confidence: 0.95,
          strength: 'soft',
          note: `Lượt xem 48 giờ qua: ${v48.toLocaleString('vi-VN')}`
        }));
      }
    }

    // 6. Top videos 48h
    const rawTopVideos = realtime.topVideos48h || parsedJson.topVideos48h || [];
    if (Array.isArray(rawTopVideos) && rawTopVideos.length > 0) {
      const parsedTop = rawTopVideos
        .map(s => parseVNNumber(s))
        .filter(v => v !== null && v >= 1000);
      if (parsedTop.length > 0) {
        clues.push(createClue({
          type: 'top_videos_48h',
          value: parsedTop,
          confidence: 0.90,
          strength: 'soft',
          note: `Top video 48h: ${parsedTop.map(v => v.toLocaleString('vi-VN')).join(', ')}`
        }));
      }
    }

    // 7. Multiplier vs Normal Ratio
    const vsNorm = chart.vsNormalRatio || parsedJson.vsNormalRatio;
    if (vsNorm && vsNorm > 1) {
      clues.push(createClue({
        type: 'vsNormalRatio',
        value: vsNorm,
        confidence: 0.85,
        strength: 'soft',
        note: `Vận tốc đột biến: gấp ${vsNorm}x so với thường lệ`
      }));
    }

    // 8. Capture Age Days
    const captureAge = chart.captureAgeDays || parsedJson.captureAgeDays;
    if (captureAge && captureAge > 0) {
      clues.push(createClue({
        type: 'captureAgeDays',
        value: captureAge,
        confidence: 0.85,
        strength: 'soft',
        note: `Tuổi video tại thời điểm chụp: ~${captureAge} ngày`
      }));
    }

    // 9. Channel Overview: Subscriber Total (for channel screenshots)
    if (channelOverview.subscriberTotalText) {
      const b = getVNNumberBounds(channelOverview.subscriberTotalText);
      if (b && b.value > 0) {
        clues.push(createClue({
          type: 'subscriberTotal',
          value: b.value,
          min: b.min,
          max: b.max,
          confidence: 0.85,
          strength: 'soft',
          note: `Tổng sub kênh trong ảnh: ~${channelOverview.subscriberTotalText} (Dùng làm soft filter)`
        }));
      }
    }

    // 10. Visible Title Chars
    const rawTitleChars = parsedJson.visibleTitleChars;
    if (rawTitleChars) {
      const validChars = validateVisibleTitleChars(rawTitleChars);
      if (validChars) {
        clues.push(createClue({
          type: 'visibleTitleChars',
          value: validChars.text,
          confidence: validChars.confidence,
          strength: validChars.strength,
          note: `Ký tự tiêu đề lộ diện: "${validChars.text}" (${validChars.strength === 'weak' ? 'Dấu hiệu yếu, chỉ dùng lọc phụ' : 'Dấu hiệu lọc tốt'})`
        }));
      }
    }

    // Determine hasAnchor: MUST have publishDate OR totalViews
    const hasAnchor = (anchorCount > 0);

    return res.status(200).json({
      success: true,
      screenType: screenType,
      hasAnchor: hasAnchor,
      anchorCount: anchorCount,
      clues: clues,
      debugRawJson: parsedJson
    });

  } catch(err) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi trích xuất Gemini Vision: ' + err.message
    });
  }
};
