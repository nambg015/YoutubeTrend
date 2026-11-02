const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getUploadsPlaylistId,
  chunkArray,
  fetchChannelRecentUploads,
  batchEnrichVideos,
  batchEnrichChannels,
  expandChannelUploads
} = require('../api/_lib/niche_engine/cheap_discovery');

test('Niche Engine Cheap Discovery: Helper Functions & Batching', async (t) => {
  await t.test('getUploadsPlaylistId converts UC prefix to UU prefix correctly', () => {
    assert.strictEqual(getUploadsPlaylistId('UC1l8b5FbTJxZiKvJ0y0Glkg'), 'UU1l8b5FbTJxZiKvJ0y0Glkg');
    assert.strictEqual(getUploadsPlaylistId('UC_x5XG1OV2P6uZZ5FSM9Ttw'), 'UU_x5XG1OV2P6uZZ5FSM9Ttw');
    assert.strictEqual(getUploadsPlaylistId('invalidId'), 'invalidId');
  });

  await t.test('chunkArray partitions items into chunks of exactly 50', () => {
    const items = Array.from({ length: 125 }, (_, i) => `item_${i}`);
    const chunks = chunkArray(items, 50);

    assert.strictEqual(chunks.length, 3);
    assert.strictEqual(chunks[0].length, 50);
    assert.strictEqual(chunks[1].length, 50);
    assert.strictEqual(chunks[2].length, 25);
  });
});

test('Niche Engine Cheap Discovery: Uploads Playlist & Batch Enrichment', async (t) => {
  let callCount = 0;
  const mockApiCaller = async (endpoint, params) => {
    callCount++;
    if (endpoint === 'playlistItems') {
      return {
        items: [
          { contentDetails: { videoId: 'vid_1' } },
          { contentDetails: { videoId: 'vid_2' } },
          { contentDetails: { videoId: 'vid_3' } }
        ]
      };
    }
    if (endpoint === 'videos') {
      const ids = params.id.split(',');
      return {
        items: ids.map(id => ({
          id,
          snippet: { title: `Title of ${id}`, channelId: 'ch_test_1' },
          statistics: { viewCount: '15000' }
        }))
      };
    }
    if (endpoint === 'channels') {
      const ids = params.id.split(',');
      return {
        items: ids.map(id => ({
          id,
          snippet: { title: `Channel ${id}`, publishedAt: '2024-01-01T00:00:00Z' },
          statistics: { subscriberCount: '1200', videoCount: '14' },
          contentDetails: { relatedPlaylists: { uploads: `UU${id.slice(2)}` } }
        }))
      };
    }
    throw new Error(`Unknown endpoint: ${endpoint}`);
  };

  await t.test('fetchChannelRecentUploads retrieves video IDs via UU playlist in 1 call', async () => {
    callCount = 0;
    const vids = await fetchChannelRecentUploads('UC1234567890', mockApiCaller);
    assert.strictEqual(callCount, 1);
    assert.deepStrictEqual(vids, ['vid_1', 'vid_2', 'vid_3']);
  });

  await t.test('batchEnrichVideos batches 80 video IDs into exactly 2 calls', async () => {
    callCount = 0;
    const ids = Array.from({ length: 80 }, (_, i) => `v_${i}`);
    const res = await batchEnrichVideos(ids, mockApiCaller);
    assert.strictEqual(callCount, 2); // 50 in first call, 30 in second call
    assert.strictEqual(res.length, 80);
  });

  await t.test('batchEnrichChannels batches 60 channels into exactly 2 calls and parses stats', async () => {
    callCount = 0;
    const chIds = Array.from({ length: 60 }, (_, i) => `UC_ch_${i}`);
    const map = await batchEnrichChannels(chIds, mockApiCaller);
    assert.strictEqual(callCount, 2);
    assert.strictEqual(map.size, 60);

    const first = map.get('UC_ch_0');
    assert.ok(first);
    assert.strictEqual(first.subCount, 1200);
    assert.strictEqual(first.videoCount, 14);
  });

  await t.test('expandChannelUploads discovers additional breakout videos from channel in 2 calls', async () => {
    callCount = 0;
    const channel = { id: 'UC1234567890', uploadsId: 'UU1234567890' };
    const qualified = await expandChannelUploads(channel, mockApiCaller, v => Number(v.statistics.viewCount) >= 10000);

    assert.strictEqual(callCount, 2); // 1 playlistItems + 1 videos.list
    assert.strictEqual(qualified.length, 3);
  });
});
