const https = require('https');
const { parseVNNumber, getVNNumberBounds } = require('./lib/vn_parser');
const { validateVisibleTitleChars, createClue } = require('./lib/types_and_clues');

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
Analyze the provided YouTube Studio screenshot (Desktop or Mobile) and extract all metrics into JSON.

IMPORTANT FORENSIC RULES:
1. screenType: Identify the exact screen:
   - "studio_video_analytics": Single video analytics overview (shows "Số liệu phân tích về video", views, watch time, subs, timeline chart).
   - "studio_channel_realtime": Channel realtime 48h card (shows "Thời gian thực / 48 GIỜ", 48h views, top video list).
   - "studio_content_list": Content/video list table.
   - "channel_overview": Channel overview tab.
   - "unknown": None of the above.

2. Metric parsing guidelines:
   - views48h: View count in 48 hours. DO NOT pick single digits or chart axis numbers like 870, 580, 290. E.g., "20.869", "29.238".
   - totalViews: Total views metric (e.g., "2,4 Tr", "1 Tr", "100k").
   - watchHours: Watch time in hours (e.g., "126,5 N", "12,5 N", "500").
   - subsGained: Net subscriber gain (e.g., "+717", "+874", "717").
   - topVideos48h: List of view counts of top videos shown in 48h list (e.g. ["4,5 N", "3,8 N", "2,9 N", "2,1 N", "1,8 N"]).
   - vsNormalRatio: Multiplier vs normal (e.g., 30 from "gấp 30 lần so với thường lệ" or "30x").
   - vsNormalDelta: Text describing comparison to typical.
   - publishDateText: Visible publish date text (e.g., "30 thg 9, 2026", "26 thg 9, 2026", or from tooltip "X ngày Y giờ đầu tiên").
   - publishDateIso: Best estimated date in YYYY-MM-DD.
   - trafficMix: Traffic sources object with percentages, e.g. { "browse": 76.5, "suggested": 14.4, "search": 5.4, "channelPages": 3.0, "other": 0.3 }.
   - captureAgeDays: Number of days elapsed on the x-axis from publish to capture (e.g. 12 to 14 days).
   - visibleTitleChars: Any unmasked characters visible in the VIDEO TITLE area.
     * MUST NOT be bare numbers (e.g., NOT "870").
     * MUST NOT be chart axis labels or studio UI words ("tổng quan", "phân tích", etc.).
     * If there are no unmasked characters or only dots/lines, output "".
     * If single particle like "々の" or "の", output it.

Output MUST be strictly valid JSON matching this schema:
{
  "screenType": "studio_video_analytics" | "studio_channel_realtime" | "studio_content_list" | "channel_overview" | "unknown",
  "views48h": string or null,
  "totalViews": string or null,
  "watchHours": string or null,
  "subsGained": string or null,
  "topVideos48h": string[],
  "vsNormalRatio": number or null,
  "vsNormalDelta": string or null,
  "publishDateText": string or null,
  "publishDateIso": string or null,
  "trafficMix": object or null,
  "captureAgeDays": number or null,
  "visibleTitleChars": string or null
}`;

  try {
    const geminiPayload = JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: imageBase64
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const geminiRes = await new Promise((resolve, reject) => {
      // Use gemini-2.5-flash or gemini-1.5-flash
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

    // Build structured Clues
    const clues = [];
    let anchorCount = 0;

    // 1. Total views
    if (parsedJson.totalViews) {
      const b = getVNNumberBounds(parsedJson.totalViews);
      if (b && b.value >= 1000) {
        clues.push(createClue({
          type: 'totalViews',
          value: b.value,
          min: b.min,
          max: b.max,
          confidence: 0.95,
          strength: 'hard',
          note: `Trích xuất từ ảnh Studio: ${parsedJson.totalViews} [${b.min.toLocaleString('vi-VN')} - ${b.max.toLocaleString('vi-VN')}]`
        }));
        anchorCount++;
      }
    }

    // 2. Publish date
    if (parsedJson.publishDateIso) {
      // Create padded window (±1 day)
      const d = new Date(parsedJson.publishDateIso + 'T00:00:00Z');
      const startD = new Date(d);
      startD.setDate(startD.getDate() - 1);
      const endD = new Date(d);
      endD.setDate(endD.getDate() + 1);

      clues.push(createClue({
        type: 'publishDate',
        value: parsedJson.publishDateIso,
        min: null,
        max: null,
        confidence: 0.95,
        strength: 'hard',
        note: `Ngày xuất bản ghi nhận: ${parsedJson.publishDateText || parsedJson.publishDateIso} (Đệm ±1 ngày: ${startD.toISOString().slice(0, 10)} đến ${endD.toISOString().slice(0, 10)})`
      }));
      anchorCount++;
    }

    // 3. Watch hours
    if (parsedJson.watchHours) {
      const b = getVNNumberBounds(parsedJson.watchHours);
      if (b && b.value > 0) {
        clues.push(createClue({
          type: 'watchHours',
          value: b.value,
          min: b.min,
          max: b.max,
          confidence: 0.90,
          strength: 'soft',
          note: `Thời gian xem: ${parsedJson.watchHours} giờ [${b.min.toLocaleString('vi-VN')} - ${b.max.toLocaleString('vi-VN')}]`
        }));
      }
    }

    // 4. Sub gain
    if (parsedJson.subsGained) {
      const subVal = parseVNNumber(parsedJson.subsGained);
      if (subVal !== null) {
        clues.push(createClue({
          type: 'subsGained',
          value: subVal,
          confidence: 0.90,
          strength: 'soft',
          note: `Số người đăng ký tăng: +${subVal.toLocaleString('vi-VN')}`
        }));
      }
    }

    // 5. Views 48h
    if (parsedJson.views48h) {
      const v48 = parseVNNumber(parsedJson.views48h);
      if (v48 && v48 >= 100) {
        clues.push(createClue({
          type: 'views48h',
          value: v48,
          confidence: 0.92,
          strength: 'soft',
          note: `Lượt xem 48 giờ qua: ${v48.toLocaleString('vi-VN')}`
        }));
      }
    }

    // 6. Top videos 48h list
    if (Array.isArray(parsedJson.topVideos48h) && parsedJson.topVideos48h.length > 0) {
      const parsedTop = parsedJson.topVideos48h
        .map(v => parseVNNumber(v))
        .filter(v => v !== null && v > 0);
      if (parsedTop.length > 0) {
        clues.push(createClue({
          type: 'topVideos48h',
          value: parsedTop,
          confidence: 0.90,
          strength: 'soft',
          note: `Top video 48h: ${parsedTop.map(v => v.toLocaleString('vi-VN')).join(', ')}`
        }));
      }
    }

    // 7. vsNormalRatio
    if (parsedJson.vsNormalRatio && parsedJson.vsNormalRatio > 0) {
      clues.push(createClue({
        type: 'vsNormalRatio',
        value: Number(parsedJson.vsNormalRatio),
        confidence: 0.90,
        strength: 'soft',
        note: `Đột biến so với thường lệ: ${parsedJson.vsNormalRatio}x`
      }));
    }

    // 8. Traffic mix
    if (parsedJson.trafficMix && typeof parsedJson.trafficMix === 'object') {
      clues.push(createClue({
        type: 'trafficMix',
        value: parsedJson.trafficMix,
        confidence: 0.95,
        strength: 'weak', // reference only, public API cannot match traffic sources
        note: `Cơ cấu nguồn lưu lượng (Chỉ tham khảo): ${JSON.stringify(parsedJson.trafficMix)}`
      }));
    }

    // 9. Capture age days
    if (parsedJson.captureAgeDays && parsedJson.captureAgeDays > 0) {
      clues.push(createClue({
        type: 'captureAgeDays',
        value: Number(parsedJson.captureAgeDays),
        confidence: 0.85,
        strength: 'soft',
        note: `Ảnh chụp vào khoảng ngày thứ ${parsedJson.captureAgeDays} sau xuất bản`
      }));
    }

    // 10. Visible title characters
    if (parsedJson.visibleTitleChars) {
      const validated = validateVisibleTitleChars(parsedJson.visibleTitleChars);
      if (validated) {
        clues.push(createClue({
          type: 'visibleTitleChars',
          value: validated.text,
          confidence: validated.confidence,
          strength: validated.strength,
          note: validated.strength === 'weak' ? `Ký tự trợ từ / lặp '${validated.text}' (Dùng hậu kiểm, không làm query tìm kiếm)` : `Ký tự tiêu đề lộ ra: '${validated.text}'`
        }));
        if (validated.strength !== 'weak') {
          anchorCount++;
        }
      }
    }

    // Calculate estimated average view duration if watch hours and total views exist
    const totalViewsClue = clues.find(c => c.type === 'totalViews');
    const watchHoursClue = clues.find(c => c.type === 'watchHours');
    let avgViewDuration = null;
    if (totalViewsClue && watchHoursClue && totalViewsClue.value > 0) {
      avgViewDuration = Math.round((watchHoursClue.value * 3600) / totalViewsClue.value);
      clues.push(createClue({
        type: 'avgViewDuration',
        value: avgViewDuration,
        confidence: 0.90,
        strength: 'soft',
        note: `Thời lượng xem trung bình ước tính: ~${avgViewDuration}s (${Math.floor(avgViewDuration / 60)}:${String(avgViewDuration % 60).padStart(2, '0')}). Độ dài video tối thiểu ≥ ${Math.round(avgViewDuration * 0.9)}s`
      }));
    }

    return res.status(200).json({
      success: true,
      screenType: screenType,
      clues: clues,
      rawMetrics: parsedJson,
      hasAnchor: anchorCount > 0,
      anchorCount: anchorCount,
      avgViewDuration: avgViewDuration
    });
  } catch(err) {
    console.error('Extraction error:', err);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
