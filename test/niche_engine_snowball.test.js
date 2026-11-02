const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanVideoTags,
  extractTitlePhrases,
  extractSnowballSeeds,
  SnowballSeedManager,
  cleanText
} = require('../api/_lib/niche_engine/snowball');

test('Niche Engine Snowball: Tag & Title Cleaning', async (t) => {
  await t.test('cleanVideoTags filters out junk and entertainment noise', () => {
    const rawTags = [
      'Official Music Video',
      'trailer 2026',
      'SHORTS',
      'TikTok compilation',
      'aviation safety',
      'Learjet 60 crash',
      'atc recordings',
      '12345',
      'https://example.com'
    ];

    const cleaned = cleanVideoTags(rawTags);
    assert.deepStrictEqual(cleaned, [
      'aviation safety',
      'learjet 60 crash',
      'atc recordings'
    ]);
  });

  await t.test('extractTitlePhrases extracts meaningful n-grams without stopwords', () => {
    const title = 'Learjet 60 Crash in Palm Beach County: Real ATC Audio of the Final Minute';
    const phrases = extractTitlePhrases(title);

    assert.ok(phrases.length > 0);
    // Should contain key informative phrases
    assert.ok(phrases.includes('learjet 60'));
    assert.ok(phrases.includes('atc audio'));
    assert.ok(phrases.includes('palm beach'));
    // Should not contain stopwords as standalone
    assert.ok(!phrases.includes('in the'));
  });
});

test('Niche Engine Snowball: Dynamic Seed Extraction', async (t) => {
  await t.test('extractSnowballSeeds creates high-relevance seeds from breakout videos', () => {
    const breakoutVideos = [
      {
        id: 'v1',
        title: 'Learjet 60 Crash in Palm Beach County ATC Audio',
        tags: ['learjet 60 crash', 'atc audio', 'plane accident'],
        views: 95000,
        subs: 68
      },
      {
        id: 'v2',
        title: 'Emergency Landing in Fog: Cockpit Voice Recorder Transcript',
        tags: ['emergency landing', 'cockpit voice recorder', 'plane accident'],
        views: 82000,
        subs: 210
      }
    ];

    const seeds = extractSnowballSeeds(breakoutVideos, {
      maxSeeds: 3,
      existingSeedQueries: new Set(['plane crash atc audio']),
      market: 'US'
    });

    assert.ok(seeds.length > 0 && seeds.length <= 3);
    const queries = seeds.map(s => s.q);
    // 'plane accident' appeared in both videos with high view weight
    assert.ok(queries.some(q => q.includes('plane accident') || q.includes('learjet 60') || q.includes('cockpit')));

    // Each seed has proper metadata
    seeds.forEach(s => {
      assert.strictEqual(s.isSnowball, true);
      assert.strictEqual(s.efficiencyScore, 1.0);
      assert.ok(s.label.startsWith('🌱 '));
    });
  });
});

test('Niche Engine Snowball: Dynamic Seed Efficiency & Deprioritization', async (t) => {
  await t.test('SnowballSeedManager penalizes seeds with repeated zero-yield runs', () => {
    const manager = new SnowballSeedManager();
    const testSeed = {
      id: 'snow_test_1',
      label: '🌱 Emergency Landing',
      q: 'emergency landing',
      efficiencyScore: 1.0,
      consecutiveFailures: 0
    };
    manager.addSeeds([testSeed]);

    // Run 1: success (found 2 channels)
    manager.recordExecution('snow_test_1', { goodChannelsFound: 2, quotaSpent: 100 });
    let active = manager.getActiveSeeds();
    assert.strictEqual(active.length, 1);
    assert.ok(active[0].efficiencyScore >= 1.0);
    assert.strictEqual(active[0].consecutiveFailures, 0);

    // Run 2: failure 1
    manager.recordExecution('snow_test_1', { goodChannelsFound: 0, quotaSpent: 100 });
    assert.strictEqual(manager.dynamicSeeds.get('snow_test_1').consecutiveFailures, 1);

    // Run 3: failure 2
    manager.recordExecution('snow_test_1', { goodChannelsFound: 0, quotaSpent: 100 });
    assert.strictEqual(manager.dynamicSeeds.get('snow_test_1').consecutiveFailures, 2);

    // Run 4: failure 3 (deprioritized)
    manager.recordExecution('snow_test_1', { goodChannelsFound: 0, quotaSpent: 100 });
    const penalized = manager.dynamicSeeds.get('snow_test_1');
    assert.strictEqual(penalized.consecutiveFailures, 3);
    assert.ok(penalized.efficiencyScore < 0.5, `Expected penalized score < 0.5, got ${penalized.efficiencyScore}`);

    // Run 5: failure 4 (dropped from active seeds)
    manager.recordExecution('snow_test_1', { goodChannelsFound: 0, quotaSpent: 100 });
    const droppedList = manager.getActiveSeeds();
    assert.strictEqual(droppedList.length, 0); // Excluded because consecutiveFailures >= 4
  });
});
