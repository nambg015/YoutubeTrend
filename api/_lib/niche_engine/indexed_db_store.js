/**
 * Niche Discovery Engine - Cumulative IndexedDB Channel & Niche Store
 * Implements Step 5:
 * - Persistent storage in IndexedDB (YouTrendNicheDB) with fallback to localStorage/in-memory
 * - Channels Store schema: channelId, name, subs, videoCount, createdAt, eligibleVideos,
 *   highestOutlier, firstSeen, lastSeen, discoverySource, subHistory: [{ date, subs }]
 * - Incremental upsert: daily reset does NOT wipe channels; refreshes metrics & tracks sub growth
 * - No hard limit (replaces old 40-50 slice cap)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineStore = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const DB_NAME = 'YouTrendNicheDB';
  const DB_VERSION = 1;
  const STORE_CHANNELS = 'channels';
  const STORE_NICHES = 'niches';

  /**
   * In-Memory Fallback Driver (used in Node.js test environment or if IndexedDB is blocked)
   */
  class MemoryStorageDriver {
    constructor() {
      this.channels = new Map();
      this.niches = new Map();
    }

    async upsertChannel(channelData) {
      if (!channelData || !channelData.channelId) return null;
      const chId = channelData.channelId;
      const existing = this.channels.get(chId);
      const merged = mergeChannelRecord(existing, channelData);
      this.channels.set(chId, merged);
      return merged;
    }

    async getChannel(channelId) {
      return this.channels.get(channelId) || null;
    }

    async getAllChannels(market = null) {
      const list = Array.from(this.channels.values());
      if (!market || market === 'ALL' || market === 'GLOBAL') return list;
      return list.filter(ch => ch.market === market || ch.country === market);
    }

    async upsertNiche(nicheData) {
      if (!nicheData || !nicheData.id) return null;
      const existing = this.niches.get(nicheData.id);
      const merged = mergeNicheRecord(existing, nicheData);
      this.niches.set(nicheData.id, merged);
      return merged;
    }

    async getAllNiches(market = null) {
      const list = Array.from(this.niches.values());
      if (!market || market === 'ALL' || market === 'GLOBAL') return list;
      return list.filter(n => n.market === market);
    }

    async clearAll() {
      this.channels.clear();
      this.niches.clear();
    }
  }

  /**
   * IndexedDB Driver (Client-Side Browser)
   */
  class IndexedDBStorageDriver {
    constructor() {
      this.dbPromise = null;
    }

    async getDb() {
      if (this.dbPromise) return this.dbPromise;
      if (typeof indexedDB === 'undefined') {
        throw new Error('IndexedDB not supported in current environment');
      }

      this.dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE_CHANNELS)) {
            const chStore = db.createObjectStore(STORE_CHANNELS, { keyPath: 'channelId' });
            chStore.createIndex('market', 'market', { unique: false });
            chStore.createIndex('lastSeen', 'lastSeen', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_NICHES)) {
            const nStore = db.createObjectStore(STORE_NICHES, { keyPath: 'id' });
            nStore.createIndex('market', 'market', { unique: false });
            nStore.createIndex('scannedDate', 'scannedDate', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });

      return this.dbPromise;
    }

    async upsertChannel(channelData) {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CHANNELS], 'readwrite');
        const store = tx.objectStore(STORE_CHANNELS);
        const getReq = store.get(channelData.channelId);

        getReq.onsuccess = () => {
          const existing = getReq.result;
          const merged = mergeChannelRecord(existing, channelData);
          const putReq = store.put(merged);
          putReq.onsuccess = () => resolve(merged);
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    }

    async getChannel(channelId) {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CHANNELS], 'readonly');
        const store = tx.objectStore(STORE_CHANNELS);
        const req = store.get(channelId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    }

    async getAllChannels(market = null) {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CHANNELS], 'readonly');
        const store = tx.objectStore(STORE_CHANNELS);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = req.result || [];
          if (market && market !== 'ALL' && market !== 'GLOBAL') {
            list = list.filter(ch => ch.market === market || ch.country === market);
          }
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async upsertNiche(nicheData) {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NICHES], 'readwrite');
        const store = tx.objectStore(STORE_NICHES);
        const getReq = store.get(nicheData.id);

        getReq.onsuccess = () => {
          const existing = getReq.result;
          const merged = mergeNicheRecord(existing, nicheData);
          const putReq = store.put(merged);
          putReq.onsuccess = () => resolve(merged);
          putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
      });
    }

    async getAllNiches(market = null) {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NICHES], 'readonly');
        const store = tx.objectStore(STORE_NICHES);
        const req = store.getAll();
        req.onsuccess = () => {
          let list = req.result || [];
          if (market && market !== 'ALL' && market !== 'GLOBAL') {
            list = list.filter(n => n.market === market);
          }
          resolve(list);
        };
        req.onerror = () => reject(req.error);
      });
    }

    async clearAll() {
      const db = await this.getDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_CHANNELS, STORE_NICHES], 'readwrite');
        tx.objectStore(STORE_CHANNELS).clear();
        tx.objectStore(STORE_NICHES).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  /**
   * Helper: Merges channel data without overwriting firstSeen and preserves sub history
   */
  function mergeChannelRecord(existing, incoming) {
    const nowIso = new Date().toISOString();
    const todayStr = new Date().toLocaleDateString('vi-VN');

    if (!existing) {
      return {
        channelId: incoming.channelId,
        name: incoming.name || '',
        subs: incoming.subs !== undefined ? incoming.subs : null,
        videoCount: incoming.videoCount || 0,
        createdAt: incoming.createdAt || incoming.publishedAt || null,
        market: incoming.market || 'GLOBAL',
        country: incoming.country || 'US',
        highestOutlier: Number(incoming.highestOutlier || incoming.outlierRatio || 0),
        firstSeen: incoming.firstSeen || nowIso,
        lastSeen: nowIso,
        discoverySource: incoming.discoverySource || 'search',
        subHistory: [
          { date: todayStr, subs: incoming.subs !== undefined ? incoming.subs : null, timestamp: Date.now() }
        ],
        eligibleVideos: Array.isArray(incoming.eligibleVideos) ? incoming.eligibleVideos : []
      };
    }

    // Merge subHistory
    const history = Array.isArray(existing.subHistory) ? [...existing.subHistory] : [];
    if (incoming.subs !== null && incoming.subs !== undefined) {
      const lastEntry = history[history.length - 1];
      if (!lastEntry || lastEntry.date !== todayStr || lastEntry.subs !== incoming.subs) {
        history.push({ date: todayStr, subs: incoming.subs, timestamp: Date.now() });
      }
    }

    // Merge eligibleVideos
    const vidMap = new Map();
    (existing.eligibleVideos || []).forEach(v => vidMap.set(v.id, v));
    (incoming.eligibleVideos || []).forEach(v => vidMap.set(v.id, v));

    const highestOutlier = Math.max(
      Number(existing.highestOutlier || 0),
      Number(incoming.highestOutlier || incoming.outlierRatio || 0)
    );

    return {
      ...existing,
      name: incoming.name || existing.name,
      subs: incoming.subs !== undefined ? incoming.subs : existing.subs,
      videoCount: incoming.videoCount || existing.videoCount,
      highestOutlier: highestOutlier,
      lastSeen: nowIso,
      subHistory: history,
      eligibleVideos: Array.from(vidMap.values())
    };
  }

  /**
   * Helper: Merges niche data without wiping existing accumulated videos
   */
  function mergeNicheRecord(existing, incoming) {
    if (!existing) {
      return {
        ...incoming,
        accumulatedAt: Date.now()
      };
    }

    // Merge videos by id
    const vMap = new Map();
    (existing.videos || []).forEach(v => vMap.set(v.id, v));
    (incoming.videos || []).forEach(v => vMap.set(v.id, v));
    const mergedVideos = Array.from(vMap.values());
    mergedVideos.sort((a, b) => (b.views || 0) - (a.views || 0));

    // Merge channels by id
    const cMap = new Map();
    (existing.channels || []).forEach(c => cMap.set(c.id, c));
    (incoming.channels || []).forEach(c => cMap.set(c.id, c));
    const mergedChannels = Array.from(cMap.values());

    return {
      ...existing,
      name: incoming.name || existing.name,
      videos: mergedVideos,
      channels: mergedChannels,
      channelsCount: mergedChannels.length,
      topVideo: mergedVideos[0] || incoming.topVideo,
      maxViews: Math.max(existing.maxViews || 0, incoming.maxViews || 0),
      maxOutlier: Math.max(Number(existing.maxOutlier || 0), Number(incoming.maxOutlier || 0)).toFixed(1),
      scannedAt: Date.now(),
      scannedDate: incoming.scannedDate || existing.scannedDate
    };
  }

  /**
   * Factory function to get appropriate store driver
   */
  function createStore() {
    if (typeof indexedDB !== 'undefined') {
      return new IndexedDBStorageDriver();
    }
    return new MemoryStorageDriver();
  }

  return {
    DB_NAME,
    DB_VERSION,
    STORE_CHANNELS,
    STORE_NICHES,
    MemoryStorageDriver,
    IndexedDBStorageDriver,
    mergeChannelRecord,
    mergeNicheRecord,
    createStore
  };
}));
