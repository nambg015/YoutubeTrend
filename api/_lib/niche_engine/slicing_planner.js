/**
 * Niche Discovery Engine - Slicing & Bandit Quota Planner
 * Implements Step 2:
 * - Time window slicing (6h - 24h slices) using publishedAfter + publishedBefore
 * - Saturation bisection (splits slice in half when 50 results return, down to 1h floor)
 * - Multi-axis slicing: videoDuration (medium/long), order (viewCount / date)
 * - Epsilon-greedy bandit query planner prioritizing highest yield seeds
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineSlicing = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const MIN_SLICE_DURATION_MS = 3600 * 1000; // 1 hour floor
  const MAX_PAGES_AT_FLOOR = 2; // Maximum pages when saturated at 1h floor

  /**
   * Generates time slices for a given time window.
   * By default, slices are 12 to 24 hours wide.
   * For the most recent slice (e.g. last 12-24 hours), marks order='date'
   * to catch fresh breakout videos before they climb to the top of viewCount.
   */
  function createTimeSlices(startMs, endMs, options = {}) {
    const totalDurationMs = Math.max(MIN_SLICE_DURATION_MS, endMs - startMs);
    const {
      maxSliceHours = 24,
      minSliceHours = 6,
      includeDateOrderForRecent = true
    } = options;

    let sliceDurationMs = 12 * 3600 * 1000;
    if (totalDurationMs <= 24 * 3600 * 1000) {
      sliceDurationMs = 6 * 3600 * 1000;
    } else if (totalDurationMs <= 72 * 3600 * 1000) {
      sliceDurationMs = 12 * 3600 * 1000;
    } else {
      sliceDurationMs = 24 * 3600 * 1000;
    }

    // Clamp between min and max
    sliceDurationMs = Math.max(minSliceHours * 3600 * 1000, Math.min(maxSliceHours * 3600 * 1000, sliceDurationMs));

    const slices = [];
    let cur = startMs;
    while (cur < endMs) {
      const next = Math.min(endMs, cur + sliceDurationMs);
      const isMostRecentSlice = (next === endMs);
      slices.push({
        startMs: cur,
        endMs: next,
        publishedAfter: new Date(cur).toISOString(),
        publishedBefore: new Date(next).toISOString(),
        order: (includeDateOrderForRecent && isMostRecentSlice) ? 'date' : 'viewCount',
        page: 1
      });
      cur = next;
    }

    return slices;
  }

  /**
   * Bisects a saturated slice into two halves.
   * Returns null if slice is already at or below the 1-hour floor.
   */
  function bisectSlice(slice, minSliceMs = MIN_SLICE_DURATION_MS) {
    if (!slice) return null;
    const duration = slice.endMs - slice.startMs;
    if (duration <= minSliceMs) return null;

    const midMs = Math.round((slice.startMs + slice.endMs) / 2);
    return [
      {
        startMs: slice.startMs,
        endMs: midMs,
        publishedAfter: new Date(slice.startMs).toISOString(),
        publishedBefore: new Date(midMs).toISOString(),
        order: slice.order || 'viewCount',
        page: 1,
        isBisected: true
      },
      {
        startMs: midMs,
        endMs: slice.endMs,
        publishedAfter: new Date(midMs).toISOString(),
        publishedBefore: new Date(slice.endMs).toISOString(),
        order: slice.order || 'viewCount',
        page: 1,
        isBisected: true
      }
    ];
  }

  /**
   * Epsilon-Greedy Bandit Seed Planner
   * Tracks historical yield of each seed:
   * reward = (goodChannelsFound + 0.5) / (pulls + 1)
   */
  class SeedBanditPlanner {
    constructor(initialStats = {}) {
      this.stats = new Map();
      if (initialStats && typeof initialStats === 'object') {
        Object.entries(initialStats).forEach(([id, st]) => {
          this.stats.set(id, {
            pulls: Number(st.pulls) || 0,
            quotaSpent: Number(st.quotaSpent) || 0,
            goodChannelsFound: Number(st.goodChannelsFound) || 0,
            lastSeen: st.lastSeen || Date.now()
          });
        });
      }
    }

    getSeedStats(seedId) {
      return this.stats.get(seedId) || {
        pulls: 0,
        quotaSpent: 0,
        goodChannelsFound: 0,
        lastSeen: Date.now()
      };
    }

    /**
     * Calculates empirical mean reward with Laplace smoothing.
     */
    getScore(seedId) {
      const st = this.getSeedStats(seedId);
      return (st.goodChannelsFound + 0.5) / (st.pulls + 1);
    }

    /**
     * Selects `count` seeds from `seedPool` using Epsilon-Greedy.
     * epsilon: probability of random exploration (e.g. 0.2 = 20% explore, 80% exploit).
     */
    selectSeeds(seedPool, count, epsilon = 0.2) {
      if (!Array.isArray(seedPool) || seedPool.length === 0) return [];
      const k = Math.min(count, seedPool.length);

      // Score all seeds
      const scored = seedPool.map(seed => {
        const id = seed.id || seed.q;
        return {
          seed,
          id,
          score: this.getScore(id),
          pulls: this.getSeedStats(id).pulls
        };
      });

      // Split into exploitation (highest scoring) and exploration (random)
      const selected = [];
      const poolCopy = [...scored];

      while (selected.length < k && poolCopy.length > 0) {
        const shouldExplore = Math.random() < epsilon;
        let chosenIndex;
        if (shouldExplore) {
          // Explore: pick uniformly at random
          chosenIndex = Math.floor(Math.random() * poolCopy.length);
        } else {
          // Exploit: sort by score descending, pick highest
          poolCopy.sort((a, b) => b.score - a.score);
          chosenIndex = 0;
        }
        selected.push(poolCopy[chosenIndex].seed);
        poolCopy.splice(chosenIndex, 1);
      }

      return selected;
    }

    /**
     * Updates bandit stats after a seed query execution.
     */
    recordFeedback(seedId, { quotaSpent = 100, goodChannelsFound = 0 } = {}) {
      const st = this.getSeedStats(seedId);
      this.stats.set(seedId, {
        pulls: st.pulls + 1,
        quotaSpent: st.quotaSpent + quotaSpent,
        goodChannelsFound: st.goodChannelsFound + goodChannelsFound,
        lastSeen: Date.now()
      });
    }

    toJSON() {
      const obj = {};
      this.stats.forEach((val, key) => {
        obj[key] = val;
      });
      return obj;
    }
  }

  /**
   * Plans multi-axis discovery queries given an overall quota budget.
   * Calculates how many seeds and how many time slices per seed to run
   * without exceeding quota cap.
   */
  function planDiscoveryQueries(options = {}) {
    const {
      seeds = [],
      timeframe = '7d',
      timeframeHours = 168,
      maxQuota = 3000,
      banditPlanner = null,
      market = 'GLOBAL',
      epsilon = 0.2,
      now = Date.now()
    } = options;

    const planner = banditPlanner || new SeedBanditPlanner();
    const searchUnitCost = 100;
    const enrichUnitCost = 1; // 1 unit per 50 videos
    const costPerCall = searchUnitCost + enrichUnitCost;

    // Maximum search calls allowed under maxQuota
    const maxSearchCalls = Math.max(1, Math.floor(maxQuota / costPerCall));

    // Determine time slices for the timeframe
    const cutoffMs = now - timeframeHours * 36e5;
    const slices = createTimeSlices(cutoffMs, now, {
      maxSliceHours: timeframeHours > 72 ? 48 : 24,
      minSliceHours: 12
    });

    // How many seeds can we cover?
    // If we have 2 slices per seed: numSeeds = maxSearchCalls / 2
    const slicesPerSeed = Math.max(1, Math.min(slices.length, 3));
    const targetSeedCount = Math.max(1, Math.min(seeds.length, Math.floor(maxSearchCalls / slicesPerSeed)));

    // Select highest yield seeds via bandit
    const selectedSeeds = planner.selectSeeds(seeds, targetSeedCount, epsilon);

    // Build the query tasks
    const queryTasks = [];
    selectedSeeds.forEach(seed => {
      // Pick representative slices (e.g. the most recent slice + the most historical slice)
      const seedSlices = slices.length <= slicesPerSeed
        ? slices
        : [slices[slices.length - 1], slices[0], slices[Math.floor(slices.length / 2)]].slice(0, slicesPerSeed);

      seedSlices.forEach(sl => {
        queryTasks.push({
          seedId: seed.id || seed.q,
          seedLabel: seed.label || seed.q,
          q: seed.q,
          rpm: seed.rpm || '$20 - $45',
          startMs: sl.startMs,
          endMs: sl.endMs,
          publishedAfter: sl.publishedAfter,
          publishedBefore: sl.publishedBefore,
          order: sl.order,
          // Video duration long-form focus (medium: 4-20 min, long: >20 min)
          videoDuration: 'medium',
          regionCode: market === 'GLOBAL' ? 'US' : market,
          relevanceLanguage: market === 'VN' ? 'vi' : market === 'JP' ? 'ja' : market === 'KR' ? 'ko' : 'en'
        });
      });
    });

    return {
      totalEstimatedQuota: queryTasks.length * costPerCall,
      maxQuota,
      maxSearchCalls,
      selectedSeedCount: selectedSeeds.length,
      slicesPerSeed,
      queryTasks
    };
  }

  return {
    MIN_SLICE_DURATION_MS,
    MAX_PAGES_AT_FLOOR,
    createTimeSlices,
    bisectSlice,
    SeedBanditPlanner,
    planDiscoveryQueries
  };
}));
