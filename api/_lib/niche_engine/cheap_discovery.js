/**
 * Niche Discovery Engine - Cheap Endpoint Discovery (1 Quota per 50 items)
 * Implements Step 4:
 * - Batched calls of up to 50 IDs per request (channels.list, videos.list, playlistItems.list)
 * - Channel uploads discovery via UU... related playlist (1 quota unit)
 * - Channel deduplication via seenChannelIds Set
 * - Discovers other high-performing videos of breakout small channels with 98% lower quota cost
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.NicheEngineCheapDiscovery = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {

  const BATCH_SIZE = 50;

  /**
   * Derives default Uploads Playlist ID from a Channel ID.
   * Standard YouTube convention: Replace prefix 'UC' with 'UU'.
   */
  function getUploadsPlaylistId(channelId) {
    if (!channelId || typeof channelId !== 'string') return '';
    if (channelId.startsWith('UC')) {
      return 'UU' + channelId.slice(2);
    }
    return channelId;
  }

  /**
   * Chunks an array into batches of up to maxChunkSize (default 50).
   */
  function chunkArray(array, maxChunkSize = BATCH_SIZE) {
    if (!Array.isArray(array)) return [];
    const chunks = [];
    for (let i = 0; i < array.length; i += maxChunkSize) {
      chunks.push(array.slice(i, i + maxChunkSize));
    }
    return chunks;
  }

  /**
   * Fetches recent videos from a channel's uploads playlist (1 quota unit).
   */
  async function fetchChannelRecentUploads(channelId, apiCaller, options = {}) {
    if (!channelId || typeof apiCaller !== 'function') return [];
    const playlistId = options.uploadsId || getUploadsPlaylistId(channelId);
    const maxResults = Math.min(50, options.maxResults || 50);

    try {
      const res = await apiCaller('playlistItems', {
        part: 'snippet,contentDetails',
        playlistId: playlistId,
        maxResults: maxResults
      });
      const items = res?.items || [];
      return items.map(it => it.contentDetails?.videoId || it.snippet?.resourceId?.videoId).filter(Boolean);
    } catch (e) {
      // If playlist is unavailable or private, return empty gracefully
      return [];
    }
  }

  /**
   * Enriches video details with stats in batches of up to 50 IDs (1 quota unit per 50).
   */
  async function batchEnrichVideos(videoIds, apiCaller) {
    if (!Array.isArray(videoIds) || videoIds.length === 0 || typeof apiCaller !== 'function') {
      return [];
    }

    const uniqueIds = [...new Set(videoIds.filter(Boolean))];
    const chunks = chunkArray(uniqueIds, BATCH_SIZE);
    let allEnriched = [];

    for (const chunk of chunks) {
      try {
        const res = await apiCaller('videos', {
          part: 'snippet,statistics,contentDetails',
          id: chunk.join(',')
        });
        if (Array.isArray(res?.items)) {
          allEnriched = allEnriched.concat(res.items);
        }
      } catch (e) {
        console.warn('Batch enrich videos error:', e.message);
      }
    }

    return allEnriched;
  }

  /**
   * Enriches channel details with stats in batches of up to 50 IDs (1 quota unit per 50).
   */
  async function batchEnrichChannels(channelIds, apiCaller) {
    if (!Array.isArray(channelIds) || channelIds.length === 0 || typeof apiCaller !== 'function') {
      return new Map();
    }

    const uniqueIds = [...new Set(channelIds.filter(Boolean))];
    const chunks = chunkArray(uniqueIds, BATCH_SIZE);
    const channelMap = new Map();

    for (const chunk of chunks) {
      try {
        const res = await apiCaller('channels', {
          part: 'statistics,snippet,contentDetails',
          id: chunk.join(',')
        });
        (res?.items || []).forEach(ch => {
          const subCount = ch.statistics?.hiddenSubscriberCount ? null : Number(ch.statistics?.subscriberCount);
          channelMap.set(ch.id, {
            id: ch.id,
            name: ch.snippet?.title || '',
            subCount: subCount,
            videoCount: Number(ch.statistics?.videoCount || 0),
            country: ch.snippet?.country || 'US',
            publishedAt: ch.snippet?.publishedAt || '',
            ageDays: Math.max(1, Math.round((Date.now() - new Date(ch.snippet?.publishedAt || 0).getTime()) / 864e5)),
            uploadsId: ch.contentDetails?.relatedPlaylists?.uploads || getUploadsPlaylistId(ch.id),
            thumb: ch.snippet?.thumbnails?.default?.url || ''
          });
        });
      } catch (e) {
        console.warn('Batch enrich channels error:', e.message);
      }
    }

    return channelMap;
  }

  /**
   * Expands discovery for a qualified small channel by pulling its recent uploads
   * via the 1-quota Uploads Playlist and returning any additional qualified videos.
   */
  async function expandChannelUploads(channel, apiCaller, qualificationCheck) {
    if (!channel || !channel.id || typeof apiCaller !== 'function') return [];
    const videoIds = await fetchChannelRecentUploads(channel.id, apiCaller, {
      uploadsId: channel.uploadsId,
      maxResults: 30
    });

    if (videoIds.length === 0) return [];

    const enrichedVideos = await batchEnrichVideos(videoIds, apiCaller);
    if (typeof qualificationCheck === 'function') {
      return enrichedVideos.filter(qualificationCheck);
    }
    return enrichedVideos;
  }

  return {
    BATCH_SIZE,
    getUploadsPlaylistId,
    chunkArray,
    fetchChannelRecentUploads,
    batchEnrichVideos,
    batchEnrichChannels,
    expandChannelUploads
  };
}));
