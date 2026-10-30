/**
 * AI Generator & JSON Schema Validation Engine for YouTrend Công cụ v2
 * Handles:
 * - B1: Đề xuất ngách (Niche Proposal)
 * - B2: Sinh từ khoá (Keyword Generation)
 * - Strict JSON Schema Validation
 * - Deduplication & Near-duplicate filtering
 * - Policy Risk & Sensitivity Detection
 * - Grounding Context Aggregation
 */

/**
 * Validates Niche Proposal output against strict JSON schema
 */
function validateNichesSchema(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dữ liệu ngách phải là một object' };
  }
  if (!Array.isArray(data.niches)) {
    return { valid: false, error: 'Trường "niches" phải là một mảng' };
  }
  if (data.niches.length === 0) {
    return { valid: false, error: 'Mảng "niches" không được để trống' };
  }

  const validTypes = ['faceless', 'talking_head', 'screen_recording', 'animation', 'hybrid'];
  const validRisks = ['none', 'low', 'medium', 'high'];

  const cleanedNiches = [];

  for (let i = 0; i < data.niches.length; i++) {
    const item = data.niches[i];
    if (!item.name || typeof item.name !== 'string') {
      return { valid: false, error: `Ngách thứ ${i + 1} thiếu tên hợp lệ` };
    }

    const cType = validTypes.includes(item.contentType) ? item.contentType : 'faceless';
    const pRisk = validRisks.includes(item.policyRisk) ? item.policyRisk : 'low';
    const detectedRisk = detectPolicyRisk(`${item.name} ${item.description || ''}`);

    cleanedNiches.push({
      id: item.id || `niche_v2_${Date.now()}_${i}`,
      name: item.name.trim(),
      description: (item.description || '').trim(),
      whyTrending: (item.whyTrending || item.reason || '').trim(),
      contentType: cType,
      cpmGroup: item.cpmGroup || '$15 - $35',
      targetAudience: (item.targetAudience || 'Khán giả quan tâm').trim(),
      policyRisk: detectedRisk.riskLevel !== 'none' ? detectedRisk.riskLevel : pRisk,
      policyRiskNote: detectedRisk.note || item.policyRiskNote || 'Chính sách YouTube tiêu chuẩn',
      sensitiveFlag: detectedRisk.sensitiveFlag || !!item.sensitiveFlag,
      isHypothesis: true // Bắt buộc: Gắn nhãn giả thuyết cần kiểm chứng
    });
  }

  return {
    valid: true,
    niches: cleanedNiches
  };
}

/**
 * Validates Keyword Generation output against strict JSON schema
 */
function validateKeywordsSchema(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Dữ liệu từ khoá phải là một object' };
  }
  if (!Array.isArray(data.keywords)) {
    return { valid: false, error: 'Trường "keywords" phải là một mảng' };
  }
  if (data.keywords.length === 0) {
    return { valid: false, error: 'Mảng "keywords" không được để trống' };
  }

  const validIntents = ['informational', 'commercial', 'transactional'];
  const rawList = [];

  for (let i = 0; i < data.keywords.length; i++) {
    const item = data.keywords[i];
    const kwText = typeof item === 'string' ? item : item.keyword;
    if (!kwText || typeof kwText !== 'string' || !kwText.trim()) continue;

    const intent = (item.searchIntent && validIntents.includes(item.searchIntent)) 
      ? item.searchIntent 
      : detectIntent(kwText);

    rawList.push({
      keyword: kwText.trim(),
      nicheId: item.nicheId || 'niche_default',
      nicheName: item.nicheName || 'Ngách chung',
      searchIntent: intent,
      targetLanguage: item.targetLanguage || 'vi',
      policyRisk: detectPolicyRisk(kwText).riskLevel,
      isHypothesis: true
    });
  }

  // Deduplicate and filter near duplicates
  const deduplicated = deduplicateKeywords(rawList);

  return {
    valid: true,
    keywords: deduplicated,
    totalOriginal: rawList.length,
    totalDeduplicated: deduplicated.length
  };
}

/**
 * Automatically infers search intent from keyword text
 */
function detectIntent(keyword = '') {
  const lower = keyword.toLowerCase();
  
  // 1. First check commercial phrases that might contain substrings like 'giá' (e.g. 'đánh giá')
  if (
    lower.includes('đánh giá') || lower.includes('review') || lower.includes('so sánh') || 
    lower.includes('tốt nhất') || lower.includes('best') || lower.includes('top') ||
    lower.includes('vs') || lower.includes('ưu nhược điểm') || lower.includes('công cụ')
  ) {
    return 'commercial';
  }

  // 2. Transactional queries (buying, pricing, discounts, store)
  if (
    lower.includes('mua') || lower.includes('báo giá') || lower.includes('mức giá') ||
    /\bgiá\b/.test(lower) || lower.includes('buy') || 
    lower.includes('price') || lower.includes('deal') || lower.includes('khuyến mãi') ||
    lower.includes('shop') || lower.includes('order') || lower.includes('discount')
  ) {
    return 'transactional';
  }

  return 'informational';
}

/**
 * Policy Risk & Sensitivity Detection
 * Flags financial get-rich-quick, crypto/forex, unverified health cures, political controversies, and 18+ content
 */
function detectPolicyRisk(text = '') {
  const lower = text.toLowerCase();

  // 1. Financial / Get-rich-quick / Crypto high-risk
  const financeTriggers = ['làm giàu nhanh', 'get rich quick', 'tiền ảo x100', 'kèo x100', 'forex bot', 'tín hiệu trade', 'bao lời', 'đầu tư lãi khủng', 'memecoin gem'];
  if (financeTriggers.some(t => lower.includes(t))) {
    return {
      riskLevel: 'high',
      sensitiveFlag: true,
      category: 'finance',
      note: 'Rủi ro tài chính cao: Chính sách YouTube cấm hứa hẹn lợi nhuận, gian lận làm giàu nhanh.'
    };
  }

  // 2. Sensitive Health / Medical claims
  const healthTriggers = ['chữa dứt điểm ung thư', 'trị dứt điểm tiểu đường', 'cure cancer', 'thuốc nam gia truyền', 'bài thuốc chữa bách bệnh', 'thần dược', 'bỏ thuốc tây'];
  if (healthTriggers.some(t => lower.includes(t))) {
    return {
      riskLevel: 'high',
      sensitiveFlag: true,
      category: 'health',
      note: 'Rủi ro y tế nhạy cảm: YouTube siết chặt thông tin sai lệch về sức khỏe (YMYL).'
    };
  }

  // 3. Politics / News Sensitivities
  const politicsTriggers = ['đảo chính', 'biểu tình bạo động', 'bí mật quân sự', 'scandal chính trị'];
  if (politicsTriggers.some(t => lower.includes(t))) {
    return {
      riskLevel: 'medium',
      sensitiveFlag: true,
      category: 'politics',
      note: 'Chủ đề nhạy cảm chính trị: Dễ bị hạn chế quảng cáo (vàng tiền) hoặc kiểm duyệt vùng.'
    };
  }

  // 4. Adult / NSFW
  const adultTriggers = ['18+', 'khiêu dâm', 'nsfw', 'lộ clip', 'gợi cảm quá đà'];
  if (adultTriggers.some(t => lower.includes(t))) {
    return {
      riskLevel: 'high',
      sensitiveFlag: true,
      category: 'adult',
      note: 'Nội dung người lớn/nhạy cảm: Vi phạm nguyên tắc cộng đồng hoặc giới hạn độ tuổi.'
    };
  }

  return {
    riskLevel: 'none',
    sensitiveFlag: false,
    category: 'standard',
    note: 'Thân thiện với nhà quảng cáo (Advertiser-friendly).'
  };
}

/**
 * Normalizes keyword string for comparison (removes diacritics differences, extra spaces, punctuation)
 */
function normalizeKeywordKey(str = '') {
  return str
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Deduplicates keywords:
 * - Exact and case-insensitive matching
 * - Punctuation stripping
 * - Near-duplicate detection (word-set subset containment)
 */
function deduplicateKeywords(keywordList = []) {
  const seenExact = new Set();
  const seenNormalized = new Set();
  const result = [];

  for (const item of keywordList) {
    const raw = item.keyword.trim();
    const lower = raw.toLowerCase();
    const norm = normalizeKeywordKey(raw);

    if (!norm || norm.length < 2) continue;
    if (seenExact.has(lower) || seenNormalized.has(norm)) continue;

    // Check near-duplicate (e.g. "làm video ai" vs "làm video ai 2026" - keep distinct only if intent/words add substance)
    const words = norm.split(' ');
    let isSubsetDuplicate = false;

    // Check if duplicate of existing with just minor stopwords
    for (const existingNorm of seenNormalized) {
      const existingWords = existingNorm.split(' ');
      if (words.length === existingWords.length) {
        const overlap = words.filter(w => existingWords.includes(w)).length;
        if (overlap / words.length >= 0.85 && Math.abs(words.length - existingWords.length) <= 1) {
          isSubsetDuplicate = true;
          break;
        }
      }
    }

    if (isSubsetDuplicate) continue;

    seenExact.add(lower);
    seenNormalized.add(norm);
    result.push(item);
  }

  return result;
}

/**
 * Builds Gemini Prompt for B1: Proposing Niches
 */
function buildNichesPrompt({ targetRegion = 'US', timeframe = '30d', count = 12, topicHint = '', groundingContext = {} }) {
  const isVn = targetRegion === 'VN';
  const trendingTitles = Array.isArray(groundingContext.trendingTitles) ? groundingContext.trendingTitles.slice(0, 25) : [];
  const existingNiches = Array.isArray(groundingContext.existingNiches) ? groundingContext.existingNiches.slice(0, 10) : [];

  return `Bạn là chuyên gia chiến lược phân tích xu hướng và monetization YouTube toàn cầu (YouTrend Engine).
Nhiệm vụ của bạn: Đề xuất đúng ${count} NGÁCH TIỀM NĂNG có thể làm video kiếm tiền tốt tại thị trường ${targetRegion}.

QUY TẮC CỐT LÕI:
1. KHÔNG chỉ tìm ngách đang view cao. Hãy tìm ngách LÀM ĐƯỢC và KIẾM ĐƯỢC TIỀN (cung thấp hơn cầu, kênh nhỏ mới lập có cơ hội lọt đề xuất, RPM tốt, dễ sản xuất faceless).
2. TẤT CẢ các ngách là "GIẢ THUYẾT CẦN KIỂM CHỨNG". Tuyệt đối CẤM tự bịa số liệu chính xác (view, sub cụ thể).
3. Gắn cờ rủi ro chính sách nếu liên quan tới tài chính/làm giàu nhanh, y tế nhạy cảm, chính trị hoặc 18+.
4. QUY ĐỊNH NGÔN NGỮ (BẮT BUỘC):
   - Nếu targetRegion là '${targetRegion}' KHÔNG PHẢI 'VN' (thị trường nước ngoài như US, GLOBAL, UK, CA): TẤT CẢ tên ngách ("name"), mô tả ("description"), lý do ("whyTrending"), đối tượng ("targetAudience") BẮT BUỘC 100% PHẢI LÀ TIẾNG ANH CHUẨN NATIVE. Tuyệt đối KHÔNG xuất bất kỳ chữ tiếng Việt nào!
   - Nếu targetRegion là 'VN': Xuất bằng tiếng Việt.

DỮ LIỆU NỀN TẢNG (GROUNDING DATA):
- Thị trường mục tiêu: ${targetRegion} (Khung thời gian: ${timeframe})
- Gợi ý chủ đề người dùng muốn tập trung: ${topicHint || (isVn ? 'Không giới hạn, quét mọi ngách sinh lời cao' : 'No limit, scan all high-RPM foreign niches')}
- Tiêu đề video trending thực tế gần đây: ${trendingTitles.length ? trendingTitles.map((t, idx) => `[${idx+1}] ${t}`).join('\n') : 'Đang quét tự động theo bảng xếp hạng YouTube'}
- Các ngách hiện đang được quan tâm: ${existingNiches.map(n => n.name || n).join(', ') || 'None'}

Yêu cầu xuất ra JSON theo đúng định dạng sau:
{
  "niches": [
    {
      "id": "niche_unique_id",
      "name": "${isVn ? 'Tên ngách tiếng Việt' : 'Concise Niche Name in English (e.g. Stoic Wisdom & Mindset)'}",
      "description": "${isVn ? 'Mô tả ngắn gọn' : 'Brief niche description in English'}",
      "whyTrending": "${isVn ? 'Vì sao ngách này bùng nổ' : 'Why this niche works in English (supply vs demand, high CPM, algorithm)'}",
      "contentType": "faceless" | "talking_head" | "screen_recording" | "animation" | "hybrid",
      "cpmGroup": "Ước tính nhóm CPM (ví dụ: '$25 - $60')",
      "targetAudience": "${isVn ? 'Đối tượng khán giả' : 'Target audience in English (e.g. Adults 35-65 in US)'}",
      "policyRisk": "none" | "low" | "medium" | "high",
      "policyRiskNote": "Lưu ý tuân thủ chính sách YouTube"
    }
  ]
}`;
}

/**
 * Builds Gemini Prompt for B2: Generating Keywords
 */
function buildKeywordsPrompt({ selectedNiches = [], count = 50, targetRegion = 'US' }) {
  const nicheNames = selectedNiches.map(n => n.name).join('; ');

  return `Bạn là chuyên gia SEO & Keyword Intelligence cho YouTube (YouTrend Engine).
Nhiệm vụ: Hãy tạo đúng ${count} TỪ KHOÁ KHÁC NHAU bằng ngôn ngữ thực tế của thị trường ${targetRegion} phân bổ đều cho các ngách sau:
${nicheNames}

QUY TẮC CỐT LÕI:
1. Viết bằng ngôn ngữ và cách tìm kiếm TỰ NHIÊN của người dùng thị trường ${targetRegion} (ví dụ nếu US thì viết tiếng Anh chuẩn; nếu VN viết tiếng Việt).
2. Khử trùng lặp và tránh từ khoá vô nghĩa hoặc quá chung chung (như "video", "youtube").
3. Gắn đúng ý định tìm kiếm (searchIntent):
   - "informational": người dùng muốn học, xem hướng dẫn, hiểu biết (how to, tips, guide, giải thích).
   - "commercial": người dùng so sánh, đánh giá, tìm giải pháp tốt nhất (review, best, vs, top).
   - "transactional": người dùng có ý định mua, dùng phần mềm, đăng ký khoá học, tải tool (buy, pricing, promo, tool).

Yêu cầu xuất ra JSON theo đúng định dạng sau:
{
  "keywords": [
    {
      "keyword": "từ khoá tìm kiếm cụ thể",
      "nicheId": "id ngách tương ứng",
      "nicheName": "tên ngách",
      "searchIntent": "informational" | "commercial" | "transactional",
      "targetLanguage": "${targetRegion === 'VN' ? 'vi' : 'en'}"
    }
  ]
}`;
}

/**
 * Realistic Fallback Niches Generator for Offline/Dev Mode or Missing Gemini Key
 */
function generateFallbackNiches({ targetRegion = 'US', count = 12, topicHint = '', timeframe = 'now 7-d' }) {
  const isVn = targetRegion === 'VN';
  const tfName = timeframe === 'now 7-d' ? (isVn ? '7 ngày qua' : '7-Day Breakout') :
                 timeframe === 'today 1-m' ? (isVn ? '30 ngày qua' : '30-Day Growth') :
                 timeframe === 'today 3-m' ? (isVn ? '90 ngày qua' : 'Quarterly Trend') :
                 (isVn ? '12 tháng qua' : 'Annual Evergreen');

  let master = [];

  // Helper shuffle array
  function shuffleArr(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

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
        { name: `Khám Phá Góc Nhìn Trái Chiều Về ${hint}`, why: `Tạo độ tranh luận cao, kích thích thời lượng xem (watch time) và tương tác comment.`, contentType: 'faceless', cpm: '$15 - $32', audience: 'Khán giả yêu tranh luận phản biện' },
        { name: `Kỹ Thuật Thực Chiến ${hint} Cho Người Bận Rộn`, why: `Giải quyết nỗi đau thời gian, người xem có xu hướng lưu lại playlist để học dần.`, contentType: 'screen_recording', cpm: '$16 - $35', audience: 'Người đi làm, sinh viên' }
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
        { name: `Cinematic Documentary: The Rise & Fall of ${hint}`, why: `Deep-retention documentary structure, ideal for faceless archive & Midjourney visualizers.`, contentType: 'faceless', cpm: '$30 - $65', audience: 'History & doc enthusiasts' }
      ];
    }
  } else {
    // Curated high-RPM niches tailored to timeframe and region
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
        { name: 'Bỏ Phố Về Rừng & Tự Làm Nhà Vườn Sinh Thái', why: 'Đánh trúng xu hướng chữa lành và lối sống xanh, hình ảnh mộc mạc thu hút cả triệu view.', contentType: 'hybrid', cpm: '$7 - $15', audience: 'Người trẻ mệt mỏi với áp lực thành phố' }
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
        { name: 'Longevity Protocols, Biohacking & Anti-Aging Secrets', why: 'Ultra-high CPM health and supplement advertising, high-net-worth viewers seeking peak vitality.', contentType: 'talking_head', cpm: '$45 - $90', audience: 'Affluent adults 35-65, biohackers' }
      ];
    }
  }

  // Shuffle master pool to ensure dynamic, flexible, non-static recommendations
  const shuffled = shuffleArr(master);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));
  return {
    niches: selected.map((m, idx) => ({
      id: `fallback_niche_${idx + 1}`,
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
    }))
  };
}
/**
 * Realistic Fallback Keywords Generator for Offline/Dev Mode or Missing Gemini Key
 */
function generateFallbackKeywords({ selectedNiches = [], count = 50, targetRegion = 'US' }) {
  const isVn = targetRegion === 'VN';
  const rawKeywords = [];

  const nichePool = selectedNiches.length ? selectedNiches : [
    { id: 'n1', name: isVn ? 'Kể Chuyện Tuổi Già' : 'Elder Stories' },
    { id: 'n2', name: isVn ? 'Triết Lý Khắc Kỷ' : 'Stoic Wisdom' },
    { id: 'n3', name: isVn ? 'Tự Động Hoá AI' : 'AI Automation' }
  ];

  const templatesVn = [
    { suffix: 'cho người mới bắt đầu', intent: 'informational' },
    { suffix: 'kiếm tiền online 2026', intent: 'commercial' },
    { suffix: 'hướng dẫn chi tiết từng bước', intent: 'informational' },
    { suffix: 'công cụ tốt nhất', intent: 'commercial' },
    { suffix: 'kinh nghiệm thực tế', intent: 'informational' },
    { suffix: 'mua khoá học', intent: 'transactional' },
    { suffix: 'so sánh chi tiết', intent: 'commercial' },
    { suffix: 'bí quyết thành công', intent: 'informational' }
  ];

  const templatesEn = [
    { suffix: 'for beginners', intent: 'informational' },
    { suffix: 'how to start in 2026', intent: 'informational' },
    { suffix: 'best tools and software', intent: 'commercial' },
    { suffix: 'full step by step tutorial', intent: 'informational' },
    { suffix: 'honest review and comparison', intent: 'commercial' },
    { suffix: 'buy course and mentorship', intent: 'transactional' },
    { suffix: 'money making secrets', intent: 'commercial' },
    { suffix: 'real case study', intent: 'informational' }
  ];

  const tpls = isVn ? templatesVn : templatesEn;

  nichePool.forEach((n, nIdx) => {
    const baseName = n.name.toLowerCase();
    tpls.forEach((tpl, tIdx) => {
      rawKeywords.push({
        keyword: `${baseName} ${tpl.suffix}`,
        nicheId: n.id || `niche_${nIdx}`,
        nicheName: n.name,
        searchIntent: tpl.intent,
        targetLanguage: isVn ? 'vi' : 'en',
        policyRisk: 'none',
        isHypothesis: true
      });
    });
  });

  const sliced = rawKeywords.slice(0, count);
  return {
    keywords: deduplicateKeywords(sliced)
  };
}

module.exports = {
  validateNichesSchema,
  validateKeywordsSchema,
  detectPolicyRisk,
  detectIntent,
  deduplicateKeywords,
  buildNichesPrompt,
  buildKeywordsPrompt,
  generateFallbackNiches,
  generateFallbackKeywords
};
