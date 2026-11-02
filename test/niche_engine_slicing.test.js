const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createTimeSlices,
  bisectSlice,
  SeedBanditPlanner,
  planDiscoveryQueries,
  MIN_SLICE_DURATION_MS
} = require('../api/_lib/niche_engine/slicing_planner');

test('Niche Engine Slicing: Time Window Partitioning', async (t) => {
  const now = 1700000000000;
  const h = 3600000;

  await t.test('splits 7-day window into multiple sequential slices without gaps', () => {
    const startMs = now - 7 * 24 * h;
    const slices = createTimeSlices(startMs, now, { maxSliceHours: 24, minSliceHours: 12 });

    assert.ok(slices.length >= 7, `Expected at least 7 slices for 7 days, got ${slices.length}`);
    assert.strictEqual(slices[0].startMs, startMs);
    assert.strictEqual(slices[slices.length - 1].endMs, now);

    for (let i = 0; i < slices.length - 1; i++) {
      assert.strictEqual(slices[i].endMs, slices[i + 1].startMs);
    }
  });

  await t.test('designates order=date for most recent slice and viewCount for historical slices', () => {
    const startMs = now - 3 * 24 * h;
    const slices = createTimeSlices(startMs, now);

    const mostRecent = slices[slices.length - 1];
    assert.strictEqual(mostRecent.order, 'date');

    const first = slices[0];
    assert.strictEqual(first.order, 'viewCount');
  });

  await t.test('bisectSlice divides saturated slice into two equal halves', () => {
    const slice = {
      startMs: now - 24 * h,
      endMs: now,
      order: 'viewCount'
    };

    const bisected = bisectSlice(slice);
    assert.ok(Array.isArray(bisected));
    assert.strictEqual(bisected.length, 2);
    assert.strictEqual(bisected[0].startMs, slice.startMs);
    assert.strictEqual(bisected[0].endMs, bisected[1].startMs);
    assert.strictEqual(bisected[1].endMs, slice.endMs);
    assert.strictEqual(bisected[0].endMs - bisected[0].startMs, 12 * h);
  });

  await t.test('bisectSlice stops at 1-hour floor', () => {
    const oneHourSlice = {
      startMs: now - 1 * h,
      endMs: now
    };
    const result = bisectSlice(oneHourSlice);
    assert.strictEqual(result, null);
  });
});

test('Niche Engine Slicing: Epsilon-Greedy Bandit Seed Planner', async (t) => {
  await t.test('prioritizes seeds with high good channel yields during exploitation', () => {
    const planner = new SeedBanditPlanner();

    // Seed A: 5 pulls, 10 good channels (ratio 2.0)
    planner.recordFeedback('seed_aviation', { quotaSpent: 500, goodChannelsFound: 10 });
    // Seed B: 5 pulls, 1 good channel (ratio 0.2)
    planner.recordFeedback('seed_gaming', { quotaSpent: 500, goodChannelsFound: 1 });
    // Seed C: 5 pulls, 0 good channels
    planner.recordFeedback('seed_vlog', { quotaSpent: 500, goodChannelsFound: 0 });

    const pool = [
      { id: 'seed_gaming', q: 'gaming highlights' },
      { id: 'seed_aviation', q: 'plane crash atc' },
      { id: 'seed_vlog', q: 'daily vlog' }
    ];

    // With epsilon = 0 (pure exploitation), aviation must be picked first
    const selected = planner.selectSeeds(pool, 1, 0.0);
    assert.strictEqual(selected.length, 1);
    assert.strictEqual(selected[0].id, 'seed_aviation');
  });

  await t.test('planDiscoveryQueries caps queries strictly to quota budget', () => {
    const planner = new SeedBanditPlanner();
    const pool = [
      { id: 's1', q: 'query 1' },
      { id: 's2', q: 'query 2' },
      { id: 's3', q: 'query 3' },
      { id: 's4', q: 'query 4' },
      { id: 's5', q: 'query 5' }
    ];

    // Budget of 1000 units allows at most ~9 search calls (101 units each)
    const plan = planDiscoveryQueries({
      seeds: pool,
      timeframeHours: 72,
      maxQuota: 1000,
      banditPlanner: planner
    });

    assert.ok(plan.totalEstimatedQuota <= 1000, `Quota exceeded: ${plan.totalEstimatedQuota} > 1000`);
    assert.ok(plan.queryTasks.length <= 9);
    assert.ok(plan.queryTasks.length > 0);

    // Each query task has publishedAfter and publishedBefore
    plan.queryTasks.forEach(task => {
      assert.ok(task.publishedAfter);
      assert.ok(task.publishedBefore);
      assert.ok(task.videoDuration === 'medium' || task.videoDuration === 'long');
    });
  });
});
