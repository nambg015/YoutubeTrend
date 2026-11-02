/**
 * Niche Discovery Engine - Snowball Seed Expansion Module
 * Implements Step 3:
 * - Extracts clean tags & 2/3-gram title phrases from breakout small-channel videos
 * - Filters junk tags and stopwords (English and Vietnamese)
 * - Generates high-intent dynamic seeds
 * - Calculates efficiency score (good_channels / quota_spent)
 * - Auto-deprioritizes stale seeds with consecutive zero-yield runs
 * - Preserves original MARKET_SEEDS as permanent base seeds
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineSnowball = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const JUNK_TAG_REGEX = /\b(trailer|teaser|official|movie|film|cinema|music\s*video|official\s*video|mv|song|songs|lyrics|remix|audio|soundtrack|ost|episode|reaction|react|tiktok|reels?|shorts?|live|livestream|stream|vlog|gameplay|clip|review|hài|hai\s*huoc|phim|tap\s*\d+|full|hd|4k)\b/i;

  const STOP_WORDS = new Set([
    // English
    'the', 'and', 'in', 'of', 'to', 'for', 'with', 'a', 'an', 'is', 'on', 'this', 'that', 'by', 'how', 'what', 'why', 'who', 'from', 'at', 'into', 'part', 'episode', 'full', 'video', 'watch', 'your', 'you', 'are', 'was', 'were', 'been', 'will', 'about', 'after', 'before', 'more', 'most', 'very', 'just', 'best', 'new', 'now', 'all', 'any', 'can', 'could', 'should',
    // Vietnamese
    'và', 'là', 'của', 'cho', 'với', 'trong', 'các', 'những', 'được', 'khi', 'này', 'đó', 'tại', 'về', 'như', 'đã', 'sẽ', 'đang', 'lại', 'thì', 'mà', 'ra', 'vào', 'bởi', 'theo', 'từ', 'qua', 'lên', 'xuống', 'rất', 'quá', 'hay', 'nhiều', 'video', 'kênh', 'tập', 'phần', 'bản', 'mới'
  ]);

  /**
   * Cleans and normalizes text string, removing punctuation, emojis, and brackets.
   */
  function cleanText(str) {
    if (!str) return '';
    return str
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Emojis
      .replace(/[|#@!$%^&*()_+=\[\]{};':"\\,.<>\/?~`-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extracts clean 2-gram and 3-gram keyphrases from a video title.
   */
  function extractTitlePhrases(title) {
    const cleaned = cleanText(title).toLowerCase();
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2 && !STOP_WORDS.has(w));
    if (words.length < 2) return [];

    const TITLE_JUNK_REGEX = /\b(official\s*video|music\s*video|trailer|teaser|full\s*hd|shorts?|tiktok|reels?)\b/i;

    const phrases = [];
    // 2-grams
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (!TITLE_JUNK_REGEX.test(bigram)) {
        phrases.push(bigram);
      }
    }
    // 3-grams
    for (let i = 0; i < words.length - 2; i++) {
      const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
      if (!TITLE_JUNK_REGEX.test(trigram)) {
        phrases.push(trigram);
      }
    }

    return phrases;
  }

  /**
   * Cleans a list of tags from a video, filtering out junk and generic terms.
   */
  function cleanVideoTags(tags) {
    if (!Array.isArray(tags)) return [];
    const valid = [];

    tags.forEach(t => {
      if (!t || typeof t !== 'string') return;
      if (/https?:\/\//i.test(t) || /www\./i.test(t) || /\.com\b/i.test(t)) return;
      const clean = cleanText(t).toLowerCase();
      if (clean.length < 3 || clean.length > 40) return;
      if (/^\d+$/.test(clean)) return; // purely numbers
      if (JUNK_TAG_REGEX.test(clean)) return;
      if (STOP_WORDS.has(clean)) return;

      valid.push(clean);
    });

    return valid;
  }

  /**
   * Extracts high-yield candidate seed keywords from a set of qualified breakout videos.
   */
  function extractSnowballSeeds(qualifiedVideos = [], options = {}) {
    const {
      maxSeeds = 5,
      existingSeedQueries = new Set(),
      market = 'GLOBAL'
    } = options;

    if (!Array.isArray(qualifiedVideos) || qualifiedVideos.length === 0) {
      return [];
    }

    const termFreq = new Map(); // term -> { term, count, totalViews, sampleTitle }

    qualifiedVideos.forEach(v => {
      const views = Number(v.views) || 0;
      const title = v.title || '';
      const tags = v.tags || [];

      // 1. Tags
      const cleanTags = cleanVideoTags(tags);
      cleanTags.forEach(tag => {
        const item = termFreq.get(tag) || { term: tag, count: 0, totalViews: 0, sampleTitle: title };
        item.count += 2; // Tag gets weight 2
        item.totalViews += views;
        termFreq.set(tag, item);
      });

      // 2. Title phrases
      const phrases = extractTitlePhrases(title);
      phrases.forEach(p => {
        const item = termFreq.get(p) || { term: p, count: 0, totalViews: 0, sampleTitle: title };
        item.count += 1;
        item.totalViews += views;
        termFreq.set(p, item);
      });
    });

    // Score candidates by frequency and views
    const candidates = Array.from(termFreq.values())
      .filter(item => item.count >= 2 || item.totalViews >= 15000)
      .sort((a, b) => (b.count * 100000 + b.totalViews) - (a.count * 100000 + a.totalViews));

    // Deduplicate near duplicates and overlap with existing seeds
    const chosenSeeds = [];
    for (const cand of candidates) {
      const candTerm = cand.term.toLowerCase();
      // Check if already in existing seeds
      if (existingSeedQueries.has(candTerm)) continue;

      // Check substring overlap with already chosen
      const isOverlap = chosenSeeds.some(s => {
        const sTerm = s.q.toLowerCase();
        return sTerm.includes(candTerm) || candTerm.includes(sTerm);
      });
      if (isOverlap) continue;

      const capitalizedLabel = cand.term.charAt(0).toUpperCase() + cand.term.slice(1);
      chosenSeeds.push({
        id: 'snowball_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        label: `🌱 ${capitalizedLabel}`,
        q: cand.term,
        rpm: market === 'VN' ? '$8 - $20' : '$25 - $48',
        isSnowball: true,
        efficiencyScore: 1.0,
        consecutiveFailures: 0,
        channelsFound: 0,
        quotaSpent: 0,
        discoveredAt: Date.now()
      });

      if (chosenSeeds.length >= maxSeeds) break;
    }

    return chosenSeeds;
  }

  /**
   * Snowball Seed Repository Manager
   * Manages dynamic seed storage, scoring, and auto-deprioritizing.
   */
  class SnowballSeedManager {
    constructor(initialSeeds = []) {
      this.dynamicSeeds = new Map();
      if (Array.isArray(initialSeeds)) {
        initialSeeds.forEach(s => {
          if (s && (s.id || s.q)) {
            this.dynamicSeeds.set(s.id || s.q, { ...s });
          }
        });
      }
    }

    /**
     * Ingests newly extracted snowball seeds into repo.
     */
    addSeeds(newSeeds = []) {
      newSeeds.forEach(s => {
        const key = s.id || s.q;
        if (!this.dynamicSeeds.has(key)) {
          this.dynamicSeeds.set(key, s);
        }
      });
    }

    /**
     * Updates efficiency after a seed is scanned.
     * Deprioritizes seeds that fail consecutively.
     */
    recordExecution(seedId, { goodChannelsFound = 0, quotaSpent = 100 } = {}) {
      const seed = this.dynamicSeeds.get(seedId);
      if (!seed) return;

      seed.quotaSpent = (seed.quotaSpent || 0) + quotaSpent;
      seed.channelsFound = (seed.channelsFound || 0) + goodChannelsFound;

      if (goodChannelsFound > 0) {
        seed.consecutiveFailures = 0;
      } else {
        seed.consecutiveFailures = (seed.consecutiveFailures || 0) + 1;
      }

      // Efficiency score = (channelsFound + 1) / (quotaSpent / 100 + 1)
      const quotaCalls = Math.max(1, seed.quotaSpent / 100);
      let eff = (seed.channelsFound + 0.5) / (quotaCalls + 0.5);

      // Auto-deprioritize if 3+ consecutive failures
      if (seed.consecutiveFailures >= 3) {
        eff = eff * 0.2; // Severely penalized
      } else if (seed.consecutiveFailures >= 2) {
        eff = eff * 0.6;
      }

      seed.efficiencyScore = Number(eff.toFixed(2));
      seed.lastExecuted = Date.now();
      this.dynamicSeeds.set(seedId, seed);
    }

    /**
     * Returns active dynamic seeds sorted by efficiencyScore descending.
     * Excludes seeds with 4+ consecutive failures.
     */
    getActiveSeeds(max = 15) {
      return Array.from(this.dynamicSeeds.values())
        .filter(s => (s.consecutiveFailures || 0) < 4)
        .sort((a, b) => (b.efficiencyScore || 0) - (a.efficiencyScore || 0))
        .slice(0, max);
    }

    toJSON() {
      return Array.from(this.dynamicSeeds.values());
    }
  }

  return {
    JUNK_TAG_REGEX,
    STOP_WORDS,
    cleanText,
    extractTitlePhrases,
    cleanVideoTags,
    extractSnowballSeeds,
    SnowballSeedManager
  };
}));
