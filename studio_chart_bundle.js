// =========================================================================
// YOU-TREND STUDIO SOI VIDEO ENGINE (v3.0.0 - 100% DU LIEU THAT)
// Dung YouTube Data API v3 (khong can OAuth):
// - Lay so lieu THAT: views, likes, comments, duration, publishedAt
// - Lay 15 video gan nhat cua kenh de tinh Benchmark THAT
// - KHONG co duong cong gia, KHONG co so mo phong
// =========================================================================

(function(root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.StudioChartEngine = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function() {

  function fmt(num) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    var n = Number(num);
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace('.0', '') + ' Ty';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.0', '') + ' Tr';
    if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + ' N';
    return n.toLocaleString('vi-VN');
  }

  function fmtDuration(sec) {
    if (!sec || isNaN(sec) || sec <= 0) return '0:00';
    var s = Math.round(Number(sec));
    var hh = Math.floor(s / 3600);
    var mm = Math.floor((s % 3600) / 60);
    var ss = s % 60;
    if (hh > 0) return hh + ':' + String(mm).padStart(2,'0') + ':' + String(ss).padStart(2,'0');
    return mm + ':' + String(ss).padStart(2,'0');
  }

  function parseIso(iso) {
    if (!iso) return 0;
    if (typeof iso === 'number') return Math.round(iso);
    var s = String(iso).trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10);
    var m = s.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!m) return 0;
    return (parseInt(m[1]||'0',10))*3600 + (parseInt(m[2]||'0',10))*60 + (parseInt(m[3]||'0',10));
  }

  function extractVideoId(urlOrId) {
    if (!urlOrId) return '';
    var s = String(urlOrId).trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    var patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = s.match(patterns[i]);
      if (m) return m[1];
    }
    return s;
  }

  function timeAgo(isoDate) {
    if (!isoDate) return '';
    var diffMs = Date.now() - new Date(isoDate).getTime();
    var diffHrs = diffMs / 3600000;
    if (diffHrs < 1) return Math.round(diffHrs * 60) + ' phut truoc';
    if (diffHrs < 24) return Math.round(diffHrs) + ' gio truoc';
    var diffDays = Math.round(diffHrs / 24);
    if (diffDays < 30) return diffDays + ' ngay truoc';
    if (diffDays < 365) return Math.round(diffDays / 30) + ' thang truoc';
    return Math.round(diffDays / 365) + ' nam truoc';
  }

  async function fetchVideoReal(videoId, apiKey) {
    if (!apiKey) return null;
    var url = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=' + videoId + '&key=' + apiKey;
    var res = await fetch(url);
    if (!res.ok) throw new Error('API error ' + res.status);
    var data = await res.json();
    if (!data.items || data.items.length === 0) return null;
    var item = data.items[0];
    var thumbs = item.snippet.thumbnails || {};
    var thumb = (thumbs.maxres || thumbs.high || thumbs.medium || thumbs.default || {}).url
      || ('https://i.ytimg.com/vi/' + item.id + '/hqdefault.jpg');
    return {
      id: item.id,
      title: item.snippet.title,
      channel: item.snippet.channelTitle,
      channelId: item.snippet.channelId,
      publishedAt: item.snippet.publishedAt,
      duration: parseIso(item.contentDetails.duration),
      views: parseInt(item.statistics.viewCount || '0', 10),
      likes: parseInt(item.statistics.likeCount || '0', 10),
      comments: parseInt(item.statistics.commentCount || '0', 10),
      thumb: thumb
    };
  }

  async function fetchChannelRecentVideos(channelId, apiKey, exclude) {
    if (!apiKey || !channelId) return [];
    var uploadsId = channelId.replace(/^UC/, 'UU');
    var pUrl = 'https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=' + uploadsId + '&maxResults=20&key=' + apiKey;
    var pRes = await fetch(pUrl).catch(function() { return null; });
    if (!pRes || !pRes.ok) return [];
    var pData = await pRes.json();
    var ids = (pData.items || [])
      .map(function(x) { return x.contentDetails && x.contentDetails.videoId; })
      .filter(function(id) { return id && id !== exclude; });
    if (ids.length === 0) return [];
    var vUrl = 'https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=' + ids.join(',') + '&key=' + apiKey;
    var vRes = await fetch(vUrl).catch(function() { return null; });
    if (!vRes || !vRes.ok) return [];
    var vData = await vRes.json();
    return (vData.items || []).map(function(x) {
      var xThumbs = (x.snippet && x.snippet.thumbnails) || {};
      return {
        id: x.id,
        title: (x.snippet && x.snippet.title) || '',
        publishedAt: (x.snippet && x.snippet.publishedAt) || '',
        views: parseInt((x.statistics && x.statistics.viewCount) || '0', 10),
        likes: parseInt((x.statistics && x.statistics.likeCount) || '0', 10),
        comments: parseInt((x.statistics && x.statistics.commentCount) || '0', 10),
        duration: parseIso(x.contentDetails && x.contentDetails.duration),
        thumb: (xThumbs.medium || xThumbs.default || {}).url || ('https://i.ytimg.com/vi/' + x.id + '/mqdefault.jpg')
      };
    });
  }

  function analyzeVideo(video, channelVideos) {
    var views = video.views || 0;
    var likes = video.likes || 0;
    var comments = video.comments || 0;
    var pubMs = video.publishedAt ? new Date(video.publishedAt).getTime() : Date.now();
    var ageHours = Math.max(0.1, (Date.now() - pubMs) / 3600000);
    var ageDays = ageHours / 24;
    var vph = Math.round(views / ageHours);
    var engRate = views > 0 ? Math.round(((likes + comments) / views) * 1000) / 10 : 0;
    var likeRate = views > 0 ? Math.round((likes / views) * 1000) / 10 : 0;

    var channelMedian = 0, channelMin = 0, channelMax = 0, channelVphMedian = 0, channelMedianEng = 0;
    var benchSample = channelVideos ? channelVideos.length : 0;

    if (benchSample > 0) {
      var viewsList = channelVideos.map(function(v) { return v.views; }).filter(function(v) { return v > 0; }).sort(function(a, b) { return a - b; });
      if (viewsList.length > 0) {
        var n = viewsList.length;
        channelMedian = viewsList[Math.floor(n / 2)];
        channelMin = viewsList[Math.floor(n * 0.25)] || viewsList[0];
        channelMax = viewsList[Math.floor(n * 0.75)] || viewsList[n - 1];
        var vphList = channelVideos.map(function(v) {
          var h = Math.max(1, (Date.now() - new Date(v.publishedAt || 0).getTime()) / 3600000);
          return v.views / h;
        }).sort(function(a, b) { return a - b; });
        channelVphMedian = Math.round(vphList[Math.floor(vphList.length / 2)] || 0);
        var engList = channelVideos.map(function(v) {
          return ((v.likes || 0) + (v.comments || 0)) / Math.max(1, v.views) * 100;
        }).sort(function(a, b) { return a - b; });
        channelMedianEng = Math.round((engList[Math.floor(engList.length / 2)] || 0) * 10) / 10;
      }
    }

    var ratioVsChannel = channelMedian > 0 ? Math.round((views / channelMedian) * 10) / 10 : null;
    var vphRatio = channelVphMedian > 0 ? Math.round((vph / channelVphMedian) * 10) / 10 : null;

    var status, statusLabel, statusColor, statusEmoji, statusDesc;

    if (ageDays < 1) {
      if (vphRatio !== null) {
        if (vphRatio >= 3) {
          status = 'SURGING'; statusLabel = 'But Pha Manh'; statusColor = 'emerald'; statusEmoji = '\uD83D\uDE80';
          statusDesc = 'VPH cua video cao gap ' + vphRatio + 'x thuong le kenh. Thuat toan dang day manh vao luong de xuat!';
        } else if (vphRatio >= 1.5) {
          status = 'GROWING'; statusLabel = 'Dang Tang Tot'; statusColor = 'green'; statusEmoji = '\uD83D\uDCC8';
          statusDesc = 'VPH cao hon ' + vphRatio + 'x muc thuong le kenh. Video dang duoc phan phoi tot.';
        } else if (vphRatio >= 0.7) {
          status = 'NORMAL'; statusLabel = 'Binh Thuong'; statusColor = 'zinc'; statusEmoji = '\uD83D\uDCCA';
          statusDesc = 'VPH tuong duong muc thuong le cua kenh (' + vphRatio + 'x). Can theo doi them.';
        } else {
          status = 'SLOW'; statusLabel = 'Khoi Dau Cham'; statusColor = 'amber'; statusEmoji = '\u26A0\uFE0F';
          statusDesc = 'VPH thap hon thuong le kenh (' + vphRatio + 'x). Can toi uu thumbnail va tieu de.';
        }
      } else {
        status = 'NEW'; statusLabel = 'Video Moi'; statusColor = 'blue'; statusEmoji = '\uD83C\uDD95';
        statusDesc = 'Video moi xuat ban ' + Math.round(ageHours) + ' gio truoc. Chua du du lieu kenh de so sanh.';
      }
    } else {
      if (ratioVsChannel !== null) {
        if (ratioVsChannel >= 2.5) {
          status = 'BREAKOUT'; statusLabel = 'Viral / But Pha (x' + ratioVsChannel + ')'; statusColor = 'emerald'; statusEmoji = '\uD83D\uDD25';
          statusDesc = 'Video dat gap ' + ratioVsChannel + 'x median kenh. Day la video outlier thuc su!';
        } else if (ratioVsChannel >= 1.2) {
          status = 'ABOVE'; statusLabel = 'Tren Muc Thuong (x' + ratioVsChannel + ')'; statusColor = 'green'; statusEmoji = '\u2705';
          statusDesc = 'Views cao hon median kenh ' + ratioVsChannel + 'x. Video hoat dong tot hon trung binh.';
        } else if (ratioVsChannel >= 0.6) {
          status = 'NORMAL'; statusLabel = 'Dat Thuong Le'; statusColor = 'zinc'; statusEmoji = '\uD83D\uDCCA';
          statusDesc = 'Views o muc thuong le cua kenh (' + ratioVsChannel + 'x median). Phan phoi binh thuong.';
        } else {
          status = 'UNDERPERFORMING'; statusLabel = 'Duoi Thuong Le (x' + ratioVsChannel + ')'; statusColor = 'rose'; statusEmoji = '\uD83D\uDCC9';
          statusDesc = 'Views chi bang ' + ratioVsChannel + 'x median kenh. Thuat toan khong phan phoi rong video nay.';
        }
      } else {
        if (vph >= 100) { status = 'GOOD'; statusLabel = 'VPH Tot'; statusColor = 'green'; statusEmoji = '\u2705'; statusDesc = 'VPH ' + fmt(vph) + '/h - hieu suat kha tot.'; }
        else if (vph >= 10) { status = 'NORMAL'; statusLabel = 'Binh Thuong'; statusColor = 'zinc'; statusEmoji = '\uD83D\uDCCA'; statusDesc = 'VPH ' + fmt(vph) + '/h - o muc trung binh.'; }
        else { status = 'LOW'; statusLabel = 'VPH Thap'; statusColor = 'amber'; statusEmoji = '\u26A0\uFE0F'; statusDesc = 'VPH ' + fmt(vph) + '/h - thap, can cai thien reach.'; }
      }
    }

    var colorMap = {
      emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      green: 'text-green-400 bg-green-500/10 border-green-500/30',
      blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      rose: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      zinc: 'text-zinc-400 bg-zinc-800 border-zinc-700'
    };

    return {
      vph: vph, engRate: engRate, likeRate: likeRate,
      ageHours: Math.round(ageHours), ageDays: Math.round(ageDays * 10) / 10,
      channelMedian: channelMedian, channelMin: channelMin, channelMax: channelMax,
      channelVphMedian: channelVphMedian, channelMedianEng: channelMedianEng,
      ratioVsChannel: ratioVsChannel, vphRatio: vphRatio, benchSample: benchSample,
      status: status, statusLabel: statusLabel, statusEmoji: statusEmoji,
      statusColor: colorMap[statusColor] || colorMap.zinc, statusDesc: statusDesc
    };
  }

  function StudioChartSection(props) {
    var apiKey = props.apiKey, showToast = props.showToast, initialVideo = props.initialVideo;
    var React = window.React;
    var h = React.createElement;

    var _v = React.useState(null); var currentVideo = _v[0], setCurrentVideo = _v[1];
    var _ch = React.useState([]); var channelVideos = _ch[0], setChannelVideos = _ch[1];
    var _u = React.useState(''); var urlInput = _u[0], setUrlInput = _u[1];
    var _l = React.useState(false); var isLoading = _l[0], setIsLoading = _l[1];
    var _e = React.useState(null); var error = _e[0], setError = _e[1];
    var _ld = React.useState(false); var loaded = _ld[0], setLoaded = _ld[1];

    var loadData = React.useCallback(function(videoId, key) {
      var activeKey = key || apiKey || (typeof ytKeyManager !== 'undefined' ? ytKeyManager.getActiveKey() : null);
      setIsLoading(true); setError(null);
      var p = activeKey
        ? fetchVideoReal(videoId, activeKey).catch(function() { return null; })
        : Promise.resolve(null);

      return p.then(function(video) {
        if (!video) {
          return fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=' + videoId + '&format=json')
            .then(function(r) { return r.ok ? r.json() : null; })
            .catch(function() { return null; })
            .then(function(oe) {
              if (!oe) return null;
              return { id: videoId, title: oe.title, channel: oe.author_name, channelId: null, publishedAt: null, duration: null, views: null, likes: null, comments: null, thumb: oe.thumbnail_url };
            });
        }
        return video;
      }).then(function(video) {
        if (!video) { setError('Khong tim thay video. Kiem tra lai link hoac Video ID.'); return; }
        setCurrentVideo(video); setLoaded(true);
        if (showToast) showToast(
          activeKey ? '\u2705 Da tai du lieu that tu YouTube API v3!' : '\u26A0 Khong co API Key - chi lay duoc tieu de/thumbnail.',
          activeKey ? 'success' : 'warning'
        );
        if (activeKey && video.channelId) {
          return fetchChannelRecentVideos(video.channelId, activeKey, video.id)
            .catch(function() { return []; })
            .then(function(ch) { setChannelVideos(ch); });
        }
      }).catch(function(err) {
        setError(err.message || String(err));
        if (showToast) showToast('Loi: ' + (err.message || String(err)), 'error');
      }).then(function() { setIsLoading(false); });
    }, [apiKey, showToast]);

    React.useEffect(function() {
      if (initialVideo && initialVideo.id) {
        if (initialVideo.views != null) { setCurrentVideo(initialVideo); setLoaded(true); }
        loadData(initialVideo.id, apiKey);
      }
    }, [initialVideo, loadData, apiKey]);

    function handleAnalyze(e) {
      if (e) e.preventDefault();
      var vid = extractVideoId(urlInput);
      if (!vid || vid.length < 5) { if (showToast) showToast('Vui long dan link hoac Video ID hop le!', 'warning'); return; }
      loadData(vid, apiKey);
    }

    if (!loaded && !isLoading) {
      return h('div', { className: 'p-8 bg-[#0e0f14] border border-zinc-800 rounded-2xl text-center space-y-5' },
        h('div', { className: 'text-4xl' }, '\uD83D\uDD0D'),
        h('div', { className: 'space-y-1.5' },
          h('h3', { className: 'text-sm font-bold text-white' }, 'Soi Video That \u2014 Du Lieu YouTube API v3'),
          h('p', { className: 'text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed' }, 'Dan bat ky link YouTube nao de xem so lieu that: views, likes, VPH, tuong tac va so sanh voi kenh.')
        ),
        h('form', { onSubmit: handleAnalyze, className: 'flex items-center gap-2 max-w-md mx-auto' },
          h('input', { type: 'text', value: urlInput, onChange: function(ev) { setUrlInput(ev.target.value); }, placeholder: 'https://www.youtube.com/watch?v=... hoac Video ID', className: 'flex-1 px-3 py-2.5 bg-zinc-900 border border-zinc-700 focus:border-pink-500 rounded-xl text-xs text-white outline-none placeholder-zinc-500 transition' }),
          h('button', { type: 'submit', className: 'px-4 py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap' }, '\u26A1 Soi Ngay')
        )
      );
    }

    if (isLoading && !loaded) {
      return h('div', { className: 'p-10 text-center space-y-3 text-zinc-400' },
        h('div', { className: 'text-3xl' }, '\u23F3'),
        h('p', { className: 'text-sm' }, 'Dang goi YouTube Data API v3...')
      );
    }

    if (error && !loaded) {
      return h('div', { className: 'p-8 text-center space-y-3' },
        h('div', { className: 'text-3xl' }, '\u274C'),
        h('p', { className: 'text-sm text-rose-400 font-medium' }, error),
        h('form', { onSubmit: handleAnalyze, className: 'flex items-center gap-2 max-w-md mx-auto mt-2' },
          h('input', { type: 'text', value: urlInput, onChange: function(ev) { setUrlInput(ev.target.value); }, placeholder: 'Thu lai voi link khac...', className: 'flex-1 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs text-white outline-none' }),
          h('button', { type: 'submit', className: 'px-3 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-xl text-xs font-bold transition cursor-pointer' }, 'Thu lai')
        )
      );
    }

    var video = currentVideo;
    var hasApiData = video && video.views != null;
    var analysis = hasApiData ? analyzeVideo(video, channelVideos) : null;

    var allForBars = channelVideos.length > 0
      ? [video].concat(channelVideos).sort(function(a, b) { return new Date(a.publishedAt || 0) - new Date(b.publishedAt || 0); }).slice(-15)
      : [];
    var maxBarViews = allForBars.length > 0 ? Math.max.apply(null, allForBars.map(function(v) { return v.views || 0; })) : 1;

    return h('div', { className: 'space-y-4 text-zinc-100' },

      h('form', { onSubmit: handleAnalyze, className: 'flex items-center gap-2 bg-zinc-900/60 px-3 py-2 rounded-xl border border-zinc-800' },
        h('span', { className: 'text-zinc-500 text-sm shrink-0' }, '\uD83D\uDD17'),
        h('input', { type: 'text', value: urlInput, onChange: function(ev) { setUrlInput(ev.target.value); }, placeholder: 'Dan link YouTube khac de soi (URL hoac Video ID)...', className: 'flex-1 bg-transparent border-0 text-xs text-white placeholder-zinc-500 outline-none' }),
        h('button', { type: 'submit', disabled: isLoading, className: 'px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition cursor-pointer disabled:opacity-50 shrink-0' }, isLoading ? '\u23F3 Dang tai...' : '\u26A1 Soi Link')
      ),

      video && h('div', { className: 'flex items-start gap-3 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800' },
        h('img', { src: video.thumb || ('https://i.ytimg.com/vi/' + video.id + '/hqdefault.jpg'), alt: '', className: 'w-24 sm:w-28 aspect-video object-cover rounded-lg bg-zinc-900 shrink-0 border border-zinc-800' }),
        h('div', { className: 'flex-1 min-w-0 space-y-1.5' },
          h('h4', { className: 'text-xs sm:text-sm font-bold text-white line-clamp-2 leading-snug' }, video.title),
          h('div', { className: 'flex flex-wrap items-center gap-2 text-[11px] text-zinc-400' },
            h('span', { className: 'text-zinc-300 font-medium' }, video.channel || 'Khong ro kenh'),
            video.publishedAt && h('span', null, '\u2022'),
            video.publishedAt && h('span', null, timeAgo(video.publishedAt)),
            video.duration && h('span', null, '\u2022'),
            video.duration && h('span', { className: 'font-mono text-zinc-300' }, fmtDuration(video.duration))
          ),
          analysis && h('span', { className: 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ' + analysis.statusColor },
            h('span', null, analysis.statusEmoji), h('span', null, analysis.statusLabel)
          )
        )
      ),

      !hasApiData && h('div', { className: 'p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300 text-center space-y-1' },
        h('p', { className: 'font-bold' }, '\u26A0\uFE0F Khong co YouTube Data API Key'),
        h('p', { className: 'text-amber-400/70' }, 'Chi lay duoc tieu de va thumbnail. Can API Key de xem views, likes, comments va phan tich day du.')
      ),

      hasApiData && h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
        h('div', { className: 'col-span-2 sm:col-span-1 bg-[#0e0f14] border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-1' },
          h('span', { className: 'text-[11px] text-zinc-500 font-medium uppercase tracking-wide block' }, 'Tong Luot Xem'),
          h('div', { className: 'text-2xl sm:text-3xl font-black text-white tracking-tight leading-none' }, fmt(video.views)),
          h('div', { className: 'flex items-center gap-1.5 text-[11px] mt-1' },
            h('span', { className: 'text-emerald-400 font-bold' }, '+' + fmt(analysis.vph) + '/h'),
            h('span', { className: 'text-zinc-600' }, '(VPH that)')
          )
        ),
        h('div', { className: 'bg-[#0e0f14] border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-1' },
          h('span', { className: 'text-[11px] text-zinc-500 font-medium uppercase tracking-wide block' }, 'Luot Thich'),
          h('div', { className: 'text-xl sm:text-2xl font-black text-white tracking-tight leading-none' }, fmt(video.likes)),
          h('div', { className: 'text-[11px] text-blue-400 font-medium mt-1' }, 'Like Rate: ' + analysis.likeRate + '%')
        ),
        h('div', { className: 'bg-[#0e0f14] border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-1' },
          h('span', { className: 'text-[11px] text-zinc-500 font-medium uppercase tracking-wide block' }, 'Binh Luan'),
          h('div', { className: 'text-xl sm:text-2xl font-black text-white tracking-tight leading-none' }, fmt(video.comments)),
          h('div', { className: 'text-[11px] text-zinc-500 font-medium mt-1' }, 'Tong tuong tac: ' + fmt((video.likes || 0) + (video.comments || 0)))
        ),
        h('div', { className: 'bg-[#0e0f14] border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-1' },
          h('span', { className: 'text-[11px] text-zinc-500 font-medium uppercase tracking-wide block' }, 'Ty Le Tuong Tac'),
          h('div', { className: 'text-xl sm:text-2xl font-black tracking-tight leading-none ' + (analysis.engRate >= 3 ? 'text-emerald-400' : analysis.engRate >= 1 ? 'text-zinc-200' : 'text-amber-400') }, analysis.engRate + '%'),
          h('div', { className: 'text-[11px] text-zinc-500 mt-1' }, '(likes+comments) / views')
        )
      ),

      hasApiData && analysis.benchSample > 0 && h('div', { className: 'bg-[#0e0f14] border border-zinc-800 rounded-xl p-3 sm:p-4 space-y-3' },
        h('div', { className: 'flex items-center justify-between gap-2 flex-wrap' },
          h('h5', { className: 'text-xs font-bold text-zinc-300 flex items-center gap-1.5' },
            h('span', null, '\uD83D\uDCCA'), h('span', null, 'So Sanh Voi Kenh (' + analysis.benchSample + ' video gan nhat)')
          ),
          analysis.ratioVsChannel != null && h('span', { className: 'px-2.5 py-0.5 rounded-full text-xs font-black border ' + analysis.statusColor }, 'x' + analysis.ratioVsChannel + ' vs kenh')
        ),

        allForBars.length > 1 && h('div', { className: 'space-y-1' },
          h('div', { className: 'text-[10px] text-zinc-600 flex justify-between px-0.5' },
            h('span', null, '\u2190 Cu nhat'),
            h('span', { className: 'text-pink-400 font-bold' }, '\u25A0 Video nay'),
            h('span', null, 'Moi nhat \u2192')
          ),
          h('div', { className: 'flex items-end gap-0.5 w-full h-12' },
            allForBars.map(function(v, i) {
              var barH = Math.max(4, Math.round(((v.views || 0) / Math.max(1, maxBarViews)) * 44));
              var isHL = v.id === video.id;
              return h('div', {
                key: v.id || i,
                className: 'flex-1 rounded-sm transition-all ' + (isHL ? 'bg-pink-500' : 'bg-zinc-700 hover:bg-zinc-500'),
                style: { height: barH + 'px' },
                title: ((v.title || '').slice(0,40)) + ': ' + fmt(v.views || 0) + ' views'
              });
            })
          )
        ),

        h('div', { className: 'grid grid-cols-3 gap-2 text-xs' },
          h('div', { className: 'bg-zinc-900/60 rounded-lg p-2.5 space-y-0.5' },
            h('span', { className: 'text-[10px] text-zinc-500 block' }, 'Median Views Kenh'),
            h('b', { className: 'text-sm text-white' }, fmt(analysis.channelMedian)),
            h('span', { className: 'text-[10px] text-zinc-600 block' }, 'P25: ' + fmt(analysis.channelMin) + ' \u2014 P75: ' + fmt(analysis.channelMax))
          ),
          h('div', { className: 'bg-zinc-900/60 rounded-lg p-2.5 space-y-0.5' },
            h('span', { className: 'text-[10px] text-zinc-500 block' }, 'VPH Median Kenh'),
            h('b', { className: 'text-sm text-white' }, fmt(analysis.channelVphMedian) + '/h'),
            h('span', { className: 'text-[10px] block font-bold ' + (analysis.vphRatio != null && analysis.vphRatio >= 1.5 ? 'text-emerald-400' : 'text-zinc-500') },
              analysis.vphRatio != null ? 'Video: x' + analysis.vphRatio + ' kenh' : 'N/A'
            )
          ),
          h('div', { className: 'bg-zinc-900/60 rounded-lg p-2.5 space-y-0.5' },
            h('span', { className: 'text-[10px] text-zinc-500 block' }, 'Tuong Tac Median'),
            h('b', { className: 'text-sm text-white' }, analysis.channelMedianEng + '%'),
            h('span', { className: 'text-[10px] block font-bold ' + (analysis.engRate > analysis.channelMedianEng ? 'text-emerald-400' : 'text-zinc-500') },
              analysis.engRate > analysis.channelMedianEng ? '\u2705 Cao hon kenh' : '\u26A0\uFE0F Thap hon kenh'
            )
          )
        )
      ),

      hasApiData && analysis && h('div', { className: 'p-3 sm:p-4 rounded-xl border ' + analysis.statusColor + ' space-y-2' },
        h('div', { className: 'flex items-center gap-2' },
          h('span', { className: 'text-lg' }, analysis.statusEmoji),
          h('h5', { className: 'text-xs font-black' }, analysis.statusLabel)
        ),
        h('p', { className: 'text-xs leading-relaxed opacity-90' }, analysis.statusDesc),
        h('div', { className: 'flex flex-wrap gap-3 text-[11px] opacity-80 pt-1 border-t border-white/10' },
          h('span', null, '\u23F1 Tuoi video: ' + (analysis.ageHours >= 24 ? analysis.ageDays + ' ngay' : analysis.ageHours + ' gio')),
          h('span', null, '\u26A1 VPH: ' + fmt(analysis.vph) + '/h'),
          h('span', null, '\uD83D\uDCAC Tuong tac: ' + analysis.engRate + '%'),
          video.duration && h('span', null, '\uD83C\uDFAC Thoi luong: ' + fmtDuration(video.duration))
        )
      ),

      hasApiData && channelVideos.length > 0 && h('details', { className: 'bg-[#0e0f14] border border-zinc-800 rounded-xl overflow-hidden' },
        h('summary', { className: 'px-3 py-2.5 text-xs font-semibold text-zinc-300 cursor-pointer hover:text-white flex items-center gap-2 select-none' },
          h('span', null, '\uD83D\uDCCB'),
          h('span', null, channelVideos.length + ' video gan nhat cua kenh (du lieu that tu API v3)')
        ),
        h('div', { className: 'divide-y divide-zinc-800/60 max-h-72 overflow-y-auto' },
          channelVideos.slice().sort(function(a, b) { return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0); })
          .map(function(v, i) {
            return h('div', { key: v.id || i, className: 'flex items-center gap-2.5 px-3 py-2 hover:bg-zinc-900/40 transition' },
              h('img', { src: v.thumb || ('https://i.ytimg.com/vi/' + v.id + '/mqdefault.jpg'), alt: '', className: 'w-14 aspect-video object-cover rounded bg-zinc-900 shrink-0' }),
              h('div', { className: 'flex-1 min-w-0' },
                h('p', { className: 'text-[11px] text-zinc-300 font-medium truncate' }, v.title),
                h('div', { className: 'flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5' },
                  h('span', { className: 'text-white font-bold' }, fmt(v.views)),
                  h('span', null, 'views \xB7 ' + timeAgo(v.publishedAt))
                )
              )
            );
          })
        )
      )
    );
  }

  function StudioVideoModalTab(props) {
    return window.React.createElement(StudioChartSection, { apiKey: props.apiKey, showToast: props.showToast, initialVideo: props.video });
  }

  var exported = {
    fmt: fmt, fmtDuration: fmtDuration, parseIso: parseIso, extractVideoId: extractVideoId,
    fetchVideoReal: fetchVideoReal, fetchChannelRecentVideos: fetchChannelRecentVideos, analyzeVideo: analyzeVideo,
    StudioChartSection: StudioChartSection, StudioVideoModalTab: StudioVideoModalTab,
    // Legacy aliases (backward compat)
    formatStudioNumber: fmt, formatStudioHours: fmt, formatStudioDuration: fmtDuration, parseIsoDuration: parseIso,
    formatStudioTooltipDate: function(d) { return new Date(d).toLocaleString('vi-VN'); },
    calculateStudioMetrics: function(v) { return { viewsFormatted: fmt(v.views), views: v.views }; },
    analyzeChannelBenchmark: function() { return {}; },
    detectFlopAndBreakout: function() { return {}; },
    generateTimelineSeries: function() { return []; },
    createSmoothSvgPath: function() { return ''; }
  };

  if (typeof window !== 'undefined') {
    window.StudioChartEngine = exported;
    window.StudioChartSection = StudioChartSection;
    window.StudioVideoModalTab = StudioVideoModalTab;
  }

  return exported;
});
