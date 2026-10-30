const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const StudioChartEngine = require('../studio_chart_bundle.js');

describe('StudioChartEngine: Number and Duration Formatters', () => {
  it('formats Studio numbers with Vietnamese locale suffixes (N, Tr)', () => {
    assert.equal(StudioChartEngine.formatStudioNumber(0), '0');
    assert.equal(StudioChartEngine.formatStudioNumber(373), '373');
    assert.equal(StudioChartEngine.formatStudioNumber(889), '889');
    assert.equal(StudioChartEngine.formatStudioNumber(88400), '88,4 N');
    assert.equal(StudioChartEngine.formatStudioNumber(125000), '125 N');
    assert.equal(StudioChartEngine.formatStudioNumber(1250000), '1,25 Tr');
  });

  it('formats Studio watch hours correctly', () => {
    assert.equal(StudioChartEngine.formatStudioHours(2.8), '2,8');
    assert.equal(StudioChartEngine.formatStudioHours(36100), '36,1 N');
  });

  it('formats Studio duration into mm:ss or hh:mm:ss', () => {
    assert.equal(StudioChartEngine.formatStudioDuration(24), '0:24');
    assert.equal(StudioChartEngine.formatStudioDuration(1468), '24:28');
    assert.equal(StudioChartEngine.formatStudioDuration(1759), '29:19');
    assert.equal(StudioChartEngine.formatStudioDuration(3665), '1:01:05');
  });

  it('parses ISO 8601 duration', () => {
    assert.equal(StudioChartEngine.parseIsoDuration('PT29M19S'), 1759);
    assert.equal(StudioChartEngine.parseIsoDuration('PT24S'), 24);
    assert.equal(StudioChartEngine.parseIsoDuration('PT1H2M3S'), 3723);
  });
});

describe('StudioChartEngine: Metrics & Studio KPI Cards', () => {
  it('calculates exact YouTube Studio metrics matching Image 2 (373 views, 0:24 AVD -> 2,8h)', () => {
    const video = {
      views: 373,
      duration: 55, // video ngắn
      watchHours: 2.8
    };
    const metrics = StudioChartEngine.calculateStudioMetrics(video);
    assert.equal(metrics.views, 373);
    assert.equal(metrics.watchHoursFormatted, '2,8');
    assert.equal(metrics.avgViewDurationFormatted, '0:27');
    assert.ok(metrics.uniqueViewers > 300 && metrics.uniqueViewers <= 373);
  });

  it('calculates exact YouTube Studio metrics matching Image 3 (88.4K views, 24:28 AVD -> 36.1K hours)', () => {
    const video = {
      views: 88400,
      duration: 1759, // 29:19
      watchHours: 36100
    };
    const metrics = StudioChartEngine.calculateStudioMetrics(video);
    assert.equal(metrics.views, 88400);
    assert.equal(metrics.viewsFormatted, '88,4 N');
    assert.equal(metrics.watchHoursFormatted, '36,1 N');
    assert.equal(metrics.avgViewDurationFormatted, '24:30');
    assert.ok(metrics.uniqueViewers > 70000);
  });
});

describe('StudioChartEngine: Flop and Breakout Point Detection', () => {
  it('identifies breakout start and flop plateau in 7-day early spike video', () => {
    const video = {
      views: 889,
      flopHour: 4,
      publishedAt: new Date(Date.now() - 7 * 864e5).toISOString()
    };
    const series = StudioChartEngine.generateTimelineSeries(video, '7d');
    assert.ok(series.length > 5);

    const result = StudioChartEngine.detectFlopAndBreakout(series, video);
    assert.ok(result.breakoutPoint !== null);
    assert.ok(result.flopPoint !== null);
    // Breakout should be early (around hour 1-3)
    assert.ok(result.breakoutPoint.hour <= 4);
    // Flop point should be around hour 4-8
    assert.ok(result.flopPoint.hour >= 3 && result.flopPoint.hour <= 24);
    assert.equal(result.status, 'FLOPPED');
  });

  it('identifies breakout start and flop point in mature video (Image 3: 402 days)', () => {
    const video = {
      views: 88400,
      duration: 1759,
      publishedAt: new Date(Date.now() - 402 * 864e5).toISOString()
    };
    const series = StudioChartEngine.generateTimelineSeries(video, 'lifetime');
    assert.ok(series.length > 5);

    const result = StudioChartEngine.detectFlopAndBreakout(series, video);
    assert.ok(result.breakoutPoint !== null);
    assert.ok(result.flopPoint !== null);
    // In a 402 day video, flop should happen within the first 60 days
    assert.ok(result.flopPoint.day <= 60);
    assert.equal(result.status, 'FLOPPED');
  });

  it('compares real video metrics against channel benchmark logic', () => {
    const channelVideos = [
      { id: 'v1', views: 200, publishedAt: new Date(Date.now() - 30 * 864e5).toISOString() },
      { id: 'v2', views: 350, publishedAt: new Date(Date.now() - 20 * 864e5).toISOString() },
      { id: 'v3', views: 500, publishedAt: new Date(Date.now() - 10 * 864e5).toISOString() },
      { id: 'v4', views: 800, publishedAt: new Date(Date.now() - 5 * 864e5).toISOString() },
      { id: 'v5', views: 1200, publishedAt: new Date(Date.now() - 2 * 864e5).toISOString() }
    ];
    const benchmark = StudioChartEngine.analyzeChannelBenchmark(channelVideos);
    assert.equal(benchmark.sampleCount, 5);
    assert.equal(benchmark.medianViews, 500);
    assert.ok(benchmark.typicalMin <= 500);
    assert.ok(benchmark.typicalMax >= 500);

    // Video with 88400 views compared to median 500 views
    const video = { views: 88400, publishedAt: new Date(Date.now() - 30 * 864e5).toISOString() };
    const series = StudioChartEngine.generateTimelineSeries(video, 'lifetime', benchmark);
    const result = StudioChartEngine.detectFlopAndBreakout(series, video, benchmark);
    assert.ok(result.ratioVsChannel > 100);
  });
});

