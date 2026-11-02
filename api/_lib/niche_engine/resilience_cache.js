/**
 * Niche Discovery Engine - Resilience, Query Cache & Quota Checkpointing
 * Implements Step 6:
 * - Search query caching with short TTL by (q, timeframe, params)
 * - Key rotation and graceful checkpointing on quota exhaustion
 * - Discovery metrics tracker (quota spent, new channels, good channels, efficiency rate)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineResilience = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DEFAULT_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

  /**
   * Generates a deterministic hash key for search parameters.
   */
  function createSearchCacheKey(params = {}) {
    const keys = Object.keys(params).sort();
    return keys.map(k => `${k}=${String(params[k] || '').trim()}`).join('&');
  }

  /**
   * In-Memory / Session Storage Cache for Search & Enrich calls
   */
  class QueryCacheManager {
    constructor(ttlMs = DEFAULT_CACHE_TTL_MS) {
      this.ttlMs = ttlMs;
      this.cache = new Map();
    }

    get(key) {
      if (!this.cache.has(key)) return null;
      const entry = this.cache.get(key);
      if (Date.now() - entry.timestamp > this.ttlMs) {
        this.cache.delete(key);
        return null;
      }
      return entry.data;
    }

    set(key, data) {
      this.cache.set(key, {
        timestamp: Date.now(),
        data: data
      });
    }

    has(key) {
      return this.get(key) !== null;
    }

    clear() {
      this.cache.clear();
    }
  }

  /**
   * Quota & Discovery Session Tracker
   * Computes real-time discovery metrics and efficiency:
   * efficiencyRate = (goodChannelsFound / Math.max(1, quotaSpent)) * 1000
   */
  class DiscoveryMetricsTracker {
    constructor() {
      this.reset();
    }

    reset() {
      this.quotaSpent = 0;
      this.searchCalls = 0;
      this.enrichCalls = 0;
      this.cacheHits = 0;
      this.uniqueChannels = new Set();
      this.goodChannels = new Set();
      this.sources = {
        search: 0,
        snowball: 0,
        uploads_playlist: 0,
        popular_chart: 0
      };
      this.startTime = Date.now();
    }

    recordSearchCall(params, fromCache = false) {
      if (fromCache) {
        this.cacheHits++;
      } else {
        this.searchCalls++;
        this.quotaSpent += 100;
      }
    }

    recordEnrichCall(unitCost = 1) {
      this.enrichCalls++;
      this.quotaSpent += unitCost;
    }

    recordChannel(channelId, isGood = false, source = 'search') {
      if (!channelId) return;
      this.uniqueChannels.add(channelId);
      if (isGood) {
        this.goodChannels.add(channelId);
      }
      if (this.sources[source] !== undefined) {
        this.sources[source]++;
      } else {
        this.sources.search++;
      }
    }

    getSummary() {
      const goodCount = this.goodChannels.size;
      const uniqueCount = this.uniqueChannels.size;
      const efficiencyPer1k = this.quotaSpent > 0
        ? Number(((goodCount / this.quotaSpent) * 1000).toFixed(1))
        : 0;

      return {
        quotaSpent: this.quotaSpent,
        searchCalls: this.searchCalls,
        enrichCalls: this.enrichCalls,
        cacheHits: this.cacheHits,
        uniqueChannelsCount: uniqueCount,
        goodChannelsCount: goodCount,
        efficiencyPer1k: efficiencyPer1k,
        sources: { ...this.sources },
        elapsedSeconds: Math.round((Date.now() - this.startTime) / 1000)
      };
    }
  }

  /**
   * Scan Checkpoint Manager: Saves partial scan state if quota runs out
   */
  class ScanCheckpointManager {
    static CHECKPOINT_KEY = 'yt_niche_scan_checkpoint';

    static saveCheckpoint(storage, { remainingSeeds = [], discoveredNiches = [], metrics = null, market = 'GLOBAL' }) {
      if (!storage) return false;
      const data = {
        timestamp: Date.now(),
        market,
        remainingSeeds,
        discoveredNiches,
        metrics
      };
      try {
        storage.setItem(this.CHECKPOINT_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    }

    static loadCheckpoint(storage, maxAgeMs = 12 * 3600 * 1000) {
      if (!storage) return null;
      try {
        const raw = storage.getItem(this.CHECKPOINT_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        if (Date.now() - data.timestamp > maxAgeMs) {
          storage.removeItem(this.CHECKPOINT_KEY);
          return null;
        }
        return data;
      } catch (e) {
        return null;
      }
    }

    static clearCheckpoint(storage) {
      if (!storage) return;
      try {
        storage.removeItem(this.CHECKPOINT_KEY);
      } catch (e) {}
    }
  }

  return {
    DEFAULT_CACHE_TTL_MS,
    createSearchCacheKey,
    QueryCacheManager,
    DiscoveryMetricsTracker,
    ScanCheckpointManager
  };
}));
