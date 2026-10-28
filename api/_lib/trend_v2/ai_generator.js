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
function generateFallbackNiches({ targetRegion = 'US', count = 12, topicHint = '' }) {
  const isVn = targetRegion === 'VN';

  const masterVn = [
    { name: 'Kể Chuyện Trầm Cảm & Chữa Lành Tuổi Già', why: 'Khán giả lớn tuổi xem trọn vẹn, thời lượng xem (AVD) trên 15 phút, CPM quảng cáo dược phẩm/bảo hiểm rất cao.', contentType: 'faceless', cpm: '$8 - $18', audience: 'Người 45-65 tuổi tại Việt Nam', risk: 'low' },
    { name: 'Triết Lý Khắc Kỷ Ứng Dụng Hàng Ngày', why: 'Nội dung evergreen nghe khi tập gym/lái xe. Sử dụng ảnh tượng điêu khắc AI, chi phí sản xuất cực thấp.', contentType: 'faceless', cpm: '$6 - $14', audience: 'Nam giới 20-40 tuổi', risk: 'none' },
    { name: 'Bí Mật Quản Lý Tài Chính & Tiết Kiệm Chi Tiêu', why: 'Khán giả có ý định quản lý chi tiêu. CTR tiêu đề cao nhờ yếu tố bảo vệ tài sản gia đình.', contentType: 'faceless', cpm: '$10 - $22', audience: 'Chủ hộ gia đình, nhân viên văn phòng', risk: 'low' },
    { name: 'Cầu Nguyện & Lời Chúc Phúc Bình An Buổi Sáng', why: 'Thói quen nghe lặp lại hàng ngày (high retention), cộng đồng comment văn minh, ít khi bấm tắt quảng cáo.', contentType: 'faceless', cpm: '$8 - $16', audience: 'Tín đồ tôn giáo, người tìm kiếm sự an yên', risk: 'low' },
    { name: 'Tóm Tắt Vụ Án Ly Kỳ & Trinh Thám Hồ Sơ Mật', why: 'Tỉ lệ giữ chân khán giả trên 70% đến tận phút cuối nhờ nghệ thuật storytelling cao trào.', contentType: 'faceless', cpm: '$7 - $15', audience: 'Người mê phim trinh thám, podcast', risk: 'low' },
    { name: 'Hướng Dẫn Tự Động Hoá AI Cho Doanh Nghiệp Nhỏ', why: 'Ý định thương mại rất lớn, kiếm tiền qua affiliate công cụ AI (Make, Zapier, Notion) và tài trợ.', contentType: 'screen_recording', cpm: '$12 - $28', audience: 'Freelancer, chủ doanh nghiệp SME', risk: 'none' },
    { name: 'Âm Thanh Trắng & Nhạc Thiền Sóng Não 432Hz', why: 'Video 8 tiếng phát xuyên đêm, tỷ lệ xem hết cực cao, doanh thu quảng cáo đều đặn quanh năm.', contentType: 'animation', cpm: '$5 - $12', audience: 'Người mất ngủ, sinh viên học tập', risk: 'none' },
    { name: 'So Sánh Sản Phẩm Công Nghệ Tối Giản', why: 'Khán giả sẵn sàng click link affiliate mua hàng trên Shopee/Lazada. Hoa hồng trực tiếp cao.', contentType: 'talking_head', cpm: '$8 - $18', audience: 'Người yêu công nghệ tối giản', risk: 'none' },
    { name: 'Lịch Sử Những Nền Văn Minh Đã Mất', why: 'Thu hút sự tò mò mạnh mẽ, tạo kịch bản hấp dẫn bằng tư liệu cổ và đồ họa phục dựng 3D AI.', contentType: 'faceless', cpm: '$7 - $16', audience: 'Người yêu tri thức và khám phá', risk: 'none' },
    { name: 'Bài Học Cuộc Đời Từ Những Nhân Vật Vĩ Đại', why: 'Chủ đề trường tồn (evergreen), người xem thích lưu vào playlist và chia sẻ lên mạng xã hội.', contentType: 'faceless', cpm: '$8 - $16', audience: 'Khán giả thích phát triển bản thân', risk: 'none' },
    { name: 'Nấu Ăn Cơm Nhà Tiết Kiệm & Dinh Dưỡng', why: 'Xu hướng thắt chặt chi tiêu gia đình. Tỉ lệ click cao nhờ hình ảnh thumbnail hấp dẫn gần gũi.', contentType: 'hybrid', cpm: '$5 - $10', audience: 'Nội trợ, người sống một mình', risk: 'none' },
    { name: 'Khám Phá Nhà Độc Lạ & Kiến Trúc Tí Hon', why: 'Cảm giác thỏa mãn thị giác (visual satisfaction), dễ viral trên cả YouTube Shorts lẫn Long-form.', contentType: 'faceless', cpm: '$6 - $14', audience: 'Người trẻ quan tâm không gian sống', risk: 'none' }
  ];

  const masterEn = [
    { name: 'Elder Stoic Wisdom & Emotional Healing', why: 'Ultra-high average view duration > 15 mins with older US demographics. Prime CPM for Medicare, health supplements, and insurance.', contentType: 'faceless', cpm: '$35 - $65', audience: 'Adults 45-70 in US, UK, Canada & Australia', risk: 'low' },
    { name: 'Unsolved Cold Cases & True Crime Chronicles', why: 'Exceptional retention > 70% driven by cliffhanger storytelling, psychological tension, and dedicated podcast-style listeners.', contentType: 'faceless', cpm: '$22 - $45', audience: 'True crime buffs, mystery enthusiasts, 25-50 age group', risk: 'low' },
    { name: 'Silent Wealth Habits & Middle-Class Tax Loopholes', why: 'High commercial intent with affluent personal finance audiences. Massive CTR on frugality and wealth preservation thumbnail hooks.', contentType: 'faceless', cpm: '$40 - $85', audience: 'US homeowners, salary earners, early retirement seekers', risk: 'low' },
    { name: 'Daily Morning Scripture, Prayer & Spiritual Peace', why: 'Consistent daily repeat listen routine, near zero skip rate, highest audience loyalty and ad completion in YouTube algorithm.', contentType: 'faceless', cpm: '$25 - $48', audience: 'Faith-based Christian & spiritual listeners worldwide', risk: 'low' },
    { name: 'AI Automation Workflows & No-Code Solopreneur', why: 'Massive commercial intent, easily monetized via SaaS affiliate commissions (Make, Zapier, Claude, Cursor) and high-ticket sponsorships.', contentType: 'screen_recording', cpm: '$35 - $75', audience: 'Freelancers, remote agency founders, tech solopreneurs', risk: 'none' },
    { name: '432Hz Deep Sleep Music & Frequency Brainwave Therapy', why: '8-hour overnight looping playback, ultra-high total watch hours, evergreen demand unaffected by seasonal trend fluctuations.', contentType: 'animation', cpm: '$14 - $28', audience: 'Insomniacs, study-focus listeners, wellness community', risk: 'none' },
    { name: 'Lost Civilizations & Ancient Historical Anomalies', why: 'Endless viewer intrigue, visualizable with public-domain archives, historical maps, and Midjourney 3D historical reconstructions.', contentType: 'faceless', cpm: '$20 - $42', audience: 'History lovers, curious intellectuals, documentary fans', risk: 'none' },
    { name: 'Extreme Tiny Homes & Off-Grid Cabin Architecture', why: 'Visual eye-candy satisfaction, viral algorithmic pull across both YouTube Shorts and Long-form home tour formats.', contentType: 'faceless', cpm: '$18 - $38', audience: 'Home lovers, outdoor wanderers, minimalism enthusiasts', risk: 'none' },
    { name: '10-Minute Executive Book Summaries & Mental Models', why: 'High-income knowledge seekers with massive willingness to purchase recommended books, Audible trials, and productivity software.', contentType: 'hybrid', cpm: '$22 - $46', audience: 'Entrepreneurs, ambitious professionals, college grads', risk: 'none' },
    { name: 'Minimalist Desk Setup & Aesthetic Workspace Gear', why: 'Viewers directly click Amazon affiliate links to purchase mechanical keyboards, monitor lights, and ergonomic workspace gadgets.', contentType: 'talking_head', cpm: '$25 - $55', audience: 'Tech lovers, remote developers, setup aesthetic enthusiasts', risk: 'none' },
    { name: 'Survival Homesteading & Emergency Prepping Tactics', why: 'High viewer urgency and passionate niche community with lucrative sponsorship deals from solar, water-filtration, and freeze-dried food brands.', contentType: 'hybrid', cpm: '$20 - $45', audience: 'Rural homeowners, preppers, outdoor enthusiasts', risk: 'low' },
    { name: 'Psychology of Human Behavior & Dark Mindset Secrets', why: 'Irresistible curiosity gap, high viewer engagement in comments, highly viral among ambitious younger male demographics.', contentType: 'faceless', cpm: '$24 - $48', audience: 'Self-improvement seekers, psychology buffs (18-35)', risk: 'none' }
  ];

  const masterList = isVn ? masterVn : masterEn;

  if (topicHint && topicHint.trim()) {
    const hint = topicHint.trim();
    masterList.unshift({
      name: `${hint} (${isVn ? 'Xu Hướng Mới' : 'Trending Breakout'})`,
      why: isVn ? `Ngách bứt phá theo chủ đề "${hint}" với tiềm năng tăng trưởng view nhanh.` : `High-growth breakout niche centered on "${hint}" with rapid audience interest.`,
      contentType: 'faceless',
      cpm: isVn ? '$10 - $25' : '$25 - $55',
      audience: isVn ? 'Khán giả quan tâm chủ đề' : `Global English audience interested in ${hint}`,
      risk: 'none'
    });
  }

  const selected = masterList.slice(0, Math.min(count, masterList.length));
  return {
    niches: selected.map((m, idx) => ({
      id: `fallback_niche_${idx + 1}`,
      name: m.name,
      description: isVn ? `Ngách tiềm năng định hướng thị trường ${targetRegion}: ${m.name}` : `High-potential niche optimized for ${targetRegion} market: ${m.name}`,
      whyTrending: m.why,
      contentType: m.contentType,
      cpmGroup: m.cpm,
      targetAudience: m.audience,
      policyRisk: m.risk,
      policyRiskNote: isVn ? 'Giả thuyết gợi ý từ kho dữ liệu YouTrend Grounding Data' : 'Grounding hypothesis from YouTrend Global Knowledge Base',
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
