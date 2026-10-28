const https = require('https');
const {
  validateNichesSchema,
  validateKeywordsSchema,
  buildNichesPrompt,
  buildKeywordsPrompt,
  generateFallbackNiches,
  generateFallbackKeywords
} = require('./_lib/trend_v2/ai_generator');

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

  const action = body.action || 'propose_niches'; // 'propose_niches' | 'generate_keywords'
  const customApiKey = req.headers['x-gemini-key'] || body?.geminiKey || GEMINI_API_KEY;
  const targetRegion = body.targetRegion || 'US';
  const timeframe = body.timeframe || '30d';
  const count = Math.max(2, Math.min(100, Number(body.count) || (action === 'propose_niches' ? 12 : 50)));
  const topicHint = (body.topicHint || '').trim();
  const groundingContext = body.groundingContext || {};
  const selectedNiches = Array.isArray(body.selectedNiches) ? body.selectedNiches : [];

  // Helper function to call Gemini API
  async function callGemini(promptText) {
    if (!customApiKey) {
      throw new Error('NO_API_KEY');
    }

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3
      }
    });

    return new Promise((resolve, reject) => {
      const model = 'gemini-2.5-flash';
      const reqPath = `/v1beta/models/${model}:generateContent?key=${customApiKey}`;
      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: reqPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      };

      const request = https.request(options, (response) => {
        let respBody = '';
        response.on('data', chunk => { respBody += chunk; });
        response.on('end', () => {
          if (response.statusCode >= 200 && response.statusCode < 300) {
            try {
              const parsed = JSON.parse(respBody);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (!text) {
                reject(new Error('Empty content from Gemini'));
                return;
              }
              resolve(JSON.parse(text));
            } catch(e) {
              reject(new Error('Invalid JSON from Gemini: ' + respBody.slice(0, 150)));
            }
          } else {
            reject(new Error(`Gemini API error [${response.statusCode}]: ${respBody}`));
          }
        });
      });

      request.on('error', err => reject(err));
      request.write(payload);
      request.end();
    });
  }

  try {
    if (action === 'propose_niches') {
      let rawResult = null;
      let usedProvider = 'gemini-2.5-flash';

      try {
        const prompt = buildNichesPrompt({ targetRegion, timeframe, count, topicHint, groundingContext });
        rawResult = await callGemini(prompt);
      } catch (geminiErr) {
        // Fallback to grounded hypothesis generator
        console.warn('[Trend v2 AI] Fallback to Grounding Hypothesis Engine:', geminiErr.message);
        rawResult = generateFallbackNiches({ targetRegion, count, topicHint });
        usedProvider = 'grounded_hypothesis_engine';
      }

      const validation = validateNichesSchema(rawResult);
      if (!validation.valid) {
        return res.status(422).json({
          success: false,
          error: 'Kết quả AI không khớp schema: ' + validation.error,
          provider: usedProvider
        });
      }

      return res.status(200).json({
        success: true,
        action: 'propose_niches',
        provider: usedProvider,
        targetRegion,
        timeframe,
        niches: validation.niches,
        isHypothesis: true,
        notes: 'Toàn bộ ngách là giả thuyết cần kiểm chứng với dữ liệu YouTube và Google Trends thực tế.'
      });
    }

    if (action === 'generate_keywords') {
      let rawResult = null;
      let usedProvider = 'gemini-2.5-flash';

      try {
        const prompt = buildKeywordsPrompt({ selectedNiches, count, targetRegion });
        rawResult = await callGemini(prompt);
      } catch (geminiErr) {
        console.warn('[Trend v2 AI] Fallback to Grounding Keywords Engine:', geminiErr.message);
        rawResult = generateFallbackKeywords({ selectedNiches, count, targetRegion });
        usedProvider = 'grounded_hypothesis_engine';
      }

      const validation = validateKeywordsSchema(rawResult);
      if (!validation.valid) {
        return res.status(422).json({
          success: false,
          error: 'Kết quả từ khoá AI không khớp schema: ' + validation.error,
          provider: usedProvider
        });
      }

      return res.status(200).json({
        success: true,
        action: 'generate_keywords',
        provider: usedProvider,
        targetRegion,
        keywords: validation.keywords,
        totalKeywords: validation.keywords.length,
        isHypothesis: true
      });
    }

    return res.status(400).json({ success: false, message: `Hành động không hợp lệ: "${action}"` });

  } catch (error) {
    console.error('[Trend v2 AI] Server error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi xử lý AI'
    });
  }
};
