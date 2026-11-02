const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MemoryStorageDriver,
  mergeChannelRecord,
  mergeNicheRecord,
  createStore
} = require('../api/_lib/niche_engine/indexed_db_store');

test('Niche Engine Store: Channel Record Merging & Growth Tracking', async (t) => {
  await t.test('first channel encounter sets firstSeen and initializes subHistory', () => {
    const raw = {
      channelId: 'UC_avi_1',
      name: 'Aviation Archives',
      subs: 68,
      highestOutlier: 25.5,
      discoverySource: 'search',
      eligibleVideos: [{ id: 'vid_1', views: 93400 }]
    };

    const record = mergeChannelRecord(null, raw);
    assert.strictEqual(record.channelId, 'UC_avi_1');
    assert.strictEqual(record.subs, 68);
    assert.strictEqual(record.highestOutlier, 25.5);
    assert.ok(record.firstSeen);
    assert.strictEqual(record.subHistory.length, 1);
    assert.strictEqual(record.subHistory[0].subs, 68);
    assert.strictEqual(record.eligibleVideos.length, 1);
  });

  await t.test('re-encountering channel updates sub history, highest outlier, and keeps firstSeen', () => {
    const initial = {
      channelId: 'UC_avi_1',
      name: 'Aviation Archives',
      subs: 68,
      highestOutlier: 25.5,
      firstSeen: '2026-11-01T00:00:00.000Z',
      lastSeen: '2026-11-01T00:00:00.000Z',
      subHistory: [{ date: '01/11/2026', subs: 68, timestamp: 1700000000000 }],
      eligibleVideos: [{ id: 'vid_1', views: 93400 }]
    };

    const update = {
      channelId: 'UC_avi_1',
      name: 'Aviation Archives HD',
      subs: 92, // Subs grew from 68 to 92
      highestOutlier: 40.2, // Higher outlier achieved
      eligibleVideos: [{ id: 'vid_2', views: 54000 }] // New video discovered
    };

    const merged = mergeChannelRecord(initial, update);
    assert.strictEqual(merged.firstSeen, '2026-11-01T00:00:00.000Z'); // preserved!
    assert.strictEqual(merged.subs, 92);
    assert.strictEqual(merged.highestOutlier, 40.2);
    assert.strictEqual(merged.subHistory.length, 2);
    assert.strictEqual(merged.subHistory[1].subs, 92);
    assert.strictEqual(merged.eligibleVideos.length, 2);
  });
});

test('Niche Engine Store: Niche Record Merging Without Wiping', async (t) => {
  await t.test('mergeNicheRecord unions videos and channels without data loss', () => {
    const existing = {
      id: 'niche_aviation',
      name: 'Aviation ATC Disasters',
      videos: [{ id: 'v1', views: 50000 }],
      channels: [{ id: 'ch1', name: 'Ch 1' }],
      maxViews: 50000,
      maxOutlier: '20.0'
    };

    const incoming = {
      id: 'niche_aviation',
      name: 'Aviation ATC Disasters (Updated)',
      videos: [{ id: 'v2', views: 80000 }],
      channels: [{ id: 'ch2', name: 'Ch 2' }],
      maxViews: 80000,
      maxOutlier: '35.0'
    };

    const merged = mergeNicheRecord(existing, incoming);
    assert.strictEqual(merged.videos.length, 2);
    assert.strictEqual(merged.channels.length, 2);
    assert.strictEqual(merged.maxViews, 80000);
    assert.strictEqual(merged.maxOutlier, '35.0');
    assert.strictEqual(merged.topVideo.id, 'v2'); // sorted by view
  });
});

test('Niche Engine Store: Memory Driver Cumulative Persistence', async (t) => {
  await t.test('store retains channels across multiple daily scan simulations', async () => {
    const driver = new MemoryStorageDriver();

    // Day 1 Scan: finds 2 channels
    await driver.upsertChannel({
      channelId: 'ch_1',
      name: 'Channel 1',
      subs: 200,
      market: 'US'
    });
    await driver.upsertChannel({
      channelId: 'ch_2',
      name: 'Channel 2',
      subs: 500,
      market: 'US'
    });

    let channelsDay1 = await driver.getAllChannels('US');
    assert.strictEqual(channelsDay1.length, 2);

    // Day 2 Scan (Daily Reset): finds 1 existing + 2 new channels
    await driver.upsertChannel({
      channelId: 'ch_1',
      name: 'Channel 1',
      subs: 240, // Sub growth
      market: 'US'
    });
    await driver.upsertChannel({
      channelId: 'ch_3',
      name: 'Channel 3',
      subs: 800,
      market: 'US'
    });
    await driver.upsertChannel({
      channelId: 'ch_4',
      name: 'Channel 4',
      subs: 1100,
      market: 'US'
    });

    let channelsDay2 = await driver.getAllChannels('US');
    assert.strictEqual(channelsDay2.length, 4); // All 4 retained, not wiped!

    const ch1 = await driver.getChannel('ch_1');
    assert.strictEqual(ch1.subs, 240);
  });
});
