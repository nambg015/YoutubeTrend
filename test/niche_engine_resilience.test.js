const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createSearchCacheKey,
  QueryCacheManager,
  DiscoveryMetricsTracker,
  ScanCheckpointManager
} = require('../api/_lib/niche_engine/resilience_cache');

test('Niche Engine Resilience: Query Caching & TTL', async (t) => {
  await t.test('createSearchCacheKey produces deterministic key regardless of prop order', () => {
    const k1 = createSearchCacheKey({ q: 'plane crash', order: 'viewCount', maxResults: 50 });
    const k2 = createSearchCacheKey({ maxResults: 50, q: 'plane crash', order: 'viewCount' });
    assert.strictEqual(k1, k2);
  });

  await t.test('QueryCacheManager stores and returns cached data within TTL', () => {
    const cache = new QueryCacheManager(5000); // 5 sec TTL
    cache.set('key_1', { items: [1, 2, 3] });

    assert.strictEqual(cache.has('key_1'), true);
    assert.deepStrictEqual(cache.get('key_1'), { items: [1, 2, 3] });
  });

  await t.test('QueryCacheManager expires data after TTL', () => {
    const cache = new QueryCacheManager(-1); // already expired
    cache.set('key_expired', { data: 'old' });

    assert.strictEqual(cache.has('key_expired'), false);
    assert.strictEqual(cache.get('key_expired'), null);
  });
});

test('Niche Engine Resilience: Discovery Metrics & Efficiency Calculation', async (t) => {
  await t.test('calculates accurate efficiency rate per 1,000 quota units', () => {
    const tracker = new DiscoveryMetricsTracker();

    // 5 searches (500 units) + 20 enrich calls (20 units) = 520 units
    for (let i = 0; i < 5; i++) tracker.recordSearchCall({ q: 'seed' });
    for (let i = 0; i < 20; i++) tracker.recordEnrichCall(1);

    // Found 13 unique channels, 8 of which are "good"
    for (let i = 0; i < 8; i++) tracker.recordChannel(`good_ch_${i}`, true, 'snowball');
    for (let i = 0; i < 5; i++) tracker.recordChannel(`other_ch_${i}`, false, 'search');

    const summary = tracker.getSummary();
    assert.strictEqual(summary.quotaSpent, 520);
    assert.strictEqual(summary.searchCalls, 5);
    assert.strictEqual(summary.uniqueChannelsCount, 13);
    assert.strictEqual(summary.goodChannelsCount, 8);
    assert.strictEqual(summary.sources.snowball, 8);
    assert.strictEqual(summary.sources.search, 5);

    // Efficiency = (8 / 520) * 1000 = 15.38 -> 15.4 channels / 1k quota
    assert.strictEqual(summary.efficiencyPer1k, 15.4);
  });
});

test('Niche Engine Resilience: Quota Exhaustion Checkpointing', async (t) => {
  await t.test('saves and loads partial scan checkpoint seamlessly', () => {
    const mockStorage = {
      store: {},
      setItem(k, v) { this.store[k] = String(v); },
      getItem(k) { return this.store[k] || null; },
      removeItem(k) { delete this.store[k]; }
    };

    const remainingSeeds = [{ q: 'query 3' }, { q: 'query 4' }];
    const discoveredNiches = [{ id: 'niche_1', name: 'Found Niche' }];

    const saved = ScanCheckpointManager.saveCheckpoint(mockStorage, {
      remainingSeeds,
      discoveredNiches,
      market: 'US'
    });
    assert.strictEqual(saved, true);

    const loaded = ScanCheckpointManager.loadCheckpoint(mockStorage);
    assert.ok(loaded);
    assert.strictEqual(loaded.market, 'US');
    assert.strictEqual(loaded.remainingSeeds.length, 2);
    assert.strictEqual(loaded.discoveredNiches.length, 1);

    ScanCheckpointManager.clearCheckpoint(mockStorage);
    assert.strictEqual(ScanCheckpointManager.loadCheckpoint(mockStorage), null);
  });
});
