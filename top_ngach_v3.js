// =========================================================================
// TOP NGÁCH v3 — Radar kênh nhỏ farm view (YouTube Data API v3)
// Một engine duy nhất dùng chung cho: web (window.TopNgachV3) + script quét hằng ngày (require).
// Một kho dữ liệu duy nhất: { v:3, videos, channels, log, snow } — không trộn nguồn cũ.
// =========================================================================
(function (root, factory) {
  var E = factory();
  if (typeof module === 'object' && module.exports) module.exports = E;
  else root.TopNgachEngine = E;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  var DAY = 864e5, HOUR = 36e5;
  var CAP_SUB = 20000;          // chỉ lưu kênh ≤ 20k sub
  var SHORT_MAX = 180;          // ≤ 3 phút = Shorts
  var LOW_RPM_LABELS = ['Gaming', 'Hài hước & Prank', 'Thiếu nhi', 'Thể thao', 'Âm nhạc', 'Reaction', 'Roblox / Minecraft'];

  // ---------- Danh mục YouTube (videoCategoryId) — để quét đa dạng content không phụ thuộc ngôn ngữ ----------
  var CATS = {
    '1': ['🎬', 'Phim & Hoạt hình', 0.8], '2': ['🚗', 'Xe cộ', 1.3], '10': ['🎵', 'Âm nhạc', 0.4], '15': ['🐾', 'Thú cưng & Động vật', 0.8],
    '17': ['⚽', 'Thể thao', 0.7], '19': ['✈️', 'Du lịch', 1.0], '20': ['🎮', 'Gaming', 0.5], '22': ['🙋', 'Đời sống & Vlog', 0.9],
    '23': ['😂', 'Hài hước', 0.6], '24': ['🎭', 'Giải trí', 0.8], '25': ['📰', 'Tin tức & Chính trị', 1.0], '26': ['🛠️', 'Mẹo & Phong cách', 1.2],
    '27': ['🎓', 'Giáo dục', 1.3], '28': ['🔬', 'Khoa học & Công nghệ', 1.4]
  };
  var CATS_RPM = ['27', '28', '25', '26', '2', '22', '24', '1', '19'];
  var CATS_ALL = Object.keys(CATS);

  // ---------- Thị trường ----------
  var L_RPM = ['Thảm họa & Tai nạn', 'Vụ án có thật', 'Tâm lý học', 'Lịch sử bí ẩn', 'Kiếm tiền online', 'Sức khỏe', 'AI & Công nghệ', 'Bí ẩn chưa lời giải'];
  var L_GEN = ['Gaming', 'Hài hước & Prank', 'Nấu ăn', 'Thú cưng', 'Thiếu nhi', 'DIY & Mẹo', 'Vlog & Du lịch', 'Thể thao'];
  var EN_RPM = [['Thảm họa hàng không', 'plane crash cockpit recording'], ['Thẩm vấn cảnh sát', 'police interrogation footage'], ['Tâm lý học đen', 'dark psychology manipulation'], ['Nền văn minh cổ', 'ancient civilization lost history'], ['Đại dương sâu', 'deep sea creatures discovery'], ['Sập thị trường', 'stock market crash explained'], ['Vụ án có thật', 'true crime case documentary'], ['Công nghệ quân sự', 'military weapon technology explained'], ['Bí ẩn vũ trụ', 'space mystery nasa discovery'], ['Chuyện nhà tù', 'prison inmate story'], ['Chuyện tỷ phú', 'billionaire story rags to riches'], ['Giáo phái & Âm mưu', 'cult documentary secrets'], ['Sinh tồn', 'survival story wilderness rescue'], ['Chiến tranh lịch sử', 'world war 2 untold story'], ['Thiên tai', 'natural disaster caught on camera'], ['Siêu dự án', 'megaproject engineering documentary'], ['Án lạnh', 'cold case solved'], ['Tin AI', 'ai tool new revolution'], ['Thu nhập thụ động', 'passive income side hustle'], ['Sức khỏe', 'health doctor warning sleep'], ['Giải cứu động vật', 'animal rescue incredible'], ['Lừa đảo bị vạch trần', 'scam exposed investigation'], ['Biệt thự xa xỉ', 'luxury mansion tour'], ['Hỏng hóc ô tô', 'car engine failure explained'], ['Đắm tàu', 'shipwreck titanic mystery'], ['Lịch sử trung cổ', 'medieval history dark facts'], ['Thần thoại', 'mythology gods explained'], ['Nấu ăn tiết kiệm', 'easy recipe cheap dinner'], ['Phát triển bản thân', 'stoicism discipline motivation'], ['Truyện thiếu nhi', 'bedtime story for kids animated'], ['Tài chính cá nhân', 'personal finance budgeting tips'], ['Bất động sản', 'real estate investing explained'], ['Kinh tế học', 'economy explained recession'], ['Bảo hiểm & Thuế', 'tax tips explained'], ['Lập trình', 'coding tutorial beginners'], ['Phần mềm & SaaS', 'best software tools review']];
  var EN_GEN = [['Gaming', 'gameplay funny moments'], ['Roblox / Minecraft', 'roblox story'], ['Hài hước & Prank', 'funny prank'], ['Nấu ăn', 'easy recipe'], ['Thú cưng', 'funny cats and dogs'], ['Thiếu nhi', 'kids cartoon story'], ['DIY & Mẹo', 'diy life hacks'], ['Vlog & Du lịch', 'travel vlog'], ['Thể thao', 'sports highlights'], ['ASMR & Satisfying', 'satisfying asmr'], ['Âm nhạc', 'song cover'], ['Làm đẹp', 'makeup tutorial'], ['Câu cá & Outdoor', 'fishing catch'], ['Xe cộ', 'car restoration'], ['Reaction', 'reaction video'], ['Hoạt hình AI', 'ai animation story'], ['Kể chuyện Reddit', 'reddit stories'], ['Phim tóm tắt', 'movie recap'], ['Nhà cửa & Cải tạo', 'house renovation before after'], ['Làm vườn', 'gardening tips']];
  var VN_RPM = [['Kể chuyện ma', 'truyện ma kinh dị'], ['Tâm lý học', 'tâm lý học hành vi'], ['Lịch sử Việt Nam', 'lịch sử việt nam bí ẩn'], ['Vụ án', 'vụ án có thật'], ['Kiếm tiền online', 'kiếm tiền online'], ['Đầu tư', 'đầu tư chứng khoán cho người mới'], ['Sức khỏe', 'mẹo sức khỏe bác sĩ'], ['Tin tức nóng', 'tin tức nóng hôm nay'], ['Công nghệ AI', 'công cụ AI mới'], ['Truyện cổ tích', 'truyện cổ tích đêm khuya'], ['Bí ẩn thế giới', 'bí ẩn thế giới chưa có lời giải'], ['Phim tóm tắt', 'tóm tắt phim hay']];
  var M = {
    EN: ['🇺🇸', 'Mỹ', 'US', 'en', [6, 12], null, null],
    GB: ['🇬🇧', 'Anh', 'GB', 'en', [5, 10], null, null],
    CA: ['🇨🇦', 'Canada', 'CA', 'en', [5, 10], null, null],
    AU: ['🇦🇺', 'Úc', 'AU', 'en', [5, 10], null, null],
    CH: ['🇨🇭', 'Thụy Sĩ', 'CH', 'de', [6, 12], ['Flugzeugabsturz Doku', 'Kriminalfall ungelöst', 'Psychologie Manipulation', 'Geschichte Geheimnisse', 'online Geld verdienen', 'Gesundheit Arzt', 'KI neue Tools', 'Mysteriöse Fälle'], ['Gaming lustige Momente', 'Prank Deutsch', 'einfaches Rezept', 'lustige Katzen Hunde', 'Kinder Zeichentrick', 'DIY Lifehacks', 'Reise Vlog', 'Fußball Highlights']],
    NO: ['🇳🇴', 'Na Uy', 'NO', 'no', [6, 12], ['flyulykke dokumentar', 'ekte krimsak', 'psykologi manipulasjon', 'historie mysterier', 'tjene penger på nett', 'helse lege', 'AI nye verktøy', 'uløste mysterier'], ['gaming morsomme øyeblikk', 'prank norsk', 'enkel oppskrift', 'morsomme katter hunder', 'barne tegnefilm', 'DIY tips', 'reise vlogg', 'fotball høydepunkter']],
    DE: ['🇩🇪', 'Đức', 'DE', 'de', [4, 8], ['Flugzeugabsturz Doku', 'Kriminalfall ungelöst', 'Psychologie Manipulation', 'Geschichte Geheimnisse', 'online Geld verdienen', 'Gesundheit Arzt', 'KI neue Tools', 'Mysteriöse Fälle'], ['Gaming lustige Momente', 'Prank Deutsch', 'einfaches Rezept', 'lustige Katzen Hunde', 'Kinder Zeichentrick', 'DIY Lifehacks', 'Reise Vlog', 'Fußball Highlights']],
    NL: ['🇳🇱', 'Hà Lan', 'NL', 'nl', [4, 8], ['vliegtuigcrash documentaire', 'misdaad waargebeurd', 'psychologie manipulatie', 'geschiedenis mysterie', 'online geld verdienen', 'gezondheid arts', 'AI nieuwe tools', 'onopgeloste mysteries'], ['gaming grappige momenten', 'prank nederlands', 'makkelijk recept', 'grappige katten honden', 'tekenfilm kinderen', 'DIY tips', 'reis vlog', 'voetbal samenvatting']],
    SE: ['🇸🇪', 'Thụy Điển', 'SE', 'sv', [4, 8], ['flygolycka dokumentär', 'verkligt brottsfall', 'psykologi manipulation', 'historia mysterier', 'tjäna pengar online', 'hälsa läkare', 'AI nya verktyg', 'olösta mysterier'], ['gaming roliga stunder', 'prank svenska', 'enkelt recept', 'roliga katter hundar', 'tecknat för barn', 'DIY tips', 'resevlogg', 'fotboll höjdpunkter']],
    JP: ['🇯🇵', 'Nhật Bản', 'JP', 'ja', [3, 6], ['飛行機事故', '未解決事件', '心理学 人間関係', '歴史 ミステリー', '副業 稼ぐ', '健康 医師', 'AI 最新', '都市伝説'], ['ゲーム実況 面白い', 'ドッキリ', '簡単レシピ', '猫 犬 かわいい', '子供向け アニメ', '100均 DIY', '旅行 vlog', 'スポーツ ハイライト']],
    KR: ['🇰🇷', 'Hàn Quốc', 'KR', 'ko', [2, 4], ['비행기 사고', '미제 사건', '심리학', '역사 미스터리', '부업 수익', '건강 의사', 'AI 신기술', '미스터리 실화'], ['게임 웃긴 장면', '몰래카메라', '간단 레시피', '고양이 강아지', '어린이 만화', '다이소 꿀팁', '여행 브이로그', '스포츠 하이라이트']],
    FR: ['🇫🇷', 'Pháp', 'FR', 'fr', [3, 6], ['crash avion', 'affaire criminelle', 'psychologie manipulation', 'histoire mystères', 'gagner argent internet', 'santé médecin', 'intelligence artificielle', 'mystères non résolus'], ['gaming moments drôles', 'prank caméra cachée', 'recette facile', 'chats chiens drôles', 'dessin animé enfants', 'astuces DIY', 'vlog voyage', 'résumé match foot']],
    ES: ['🇪🇸', 'Tây Ban Nha / Latin', 'MX', 'es', [1, 3], ['accidente aéreo', 'caso criminal real', 'psicología oscura', 'historia misterios', 'ganar dinero online', 'salud médico', 'inteligencia artificial nueva', 'misterios sin resolver'], ['gameplay momentos graciosos', 'bromas pesadas', 'receta fácil', 'gatos perros graciosos', 'caricaturas para niños', 'manualidades fáciles', 'vlog de viaje', 'resumen partido fútbol']],
    BR: ['🇧🇷', 'Brazil', 'BR', 'pt', [1, 2.5], ['acidente aéreo', 'caso criminal real', 'psicologia sombria', 'história mistérios', 'ganhar dinheiro online', 'saúde médico', 'inteligência artificial nova', 'mistérios sem solução'], ['gameplay momentos engraçados', 'pegadinha', 'receita fácil', 'gatos cachorros engraçados', 'desenho infantil', 'dicas faça você mesmo', 'vlog de viagem', 'melhores momentos futebol']],
    IN: ['🇮🇳', 'Ấn Độ', 'IN', 'hi', [0.3, 1], ['plane crash hindi', 'real crime story hindi', 'psychology facts hindi', 'history mystery hindi', 'paise kaise kamaye', 'health tips doctor hindi', 'AI tools hindi', 'mystery story hindi'], ['gaming funny moments hindi', 'prank video hindi', 'recipe in hindi', 'funny animals hindi', 'cartoon for kids hindi', 'diy hacks hindi', 'travel vlog hindi', 'cricket highlights']],
    ID: ['🇮🇩', 'Indonesia', 'ID', 'id', [0.4, 1], ['kecelakaan pesawat', 'kasus kriminal nyata', 'psikologi gelap', 'sejarah misteri', 'cara cari uang online', 'kesehatan dokter', 'AI terbaru', 'misteri belum terpecahkan'], ['game lucu momen', 'prank lucu', 'resep mudah', 'kucing lucu', 'kartun anak', 'tips diy', 'vlog jalan jalan', 'highlight sepak bola']],
    TH: ['🇹🇭', 'Thái Lan', 'TH', 'th', [0.5, 1.5], ['เครื่องบินตก', 'คดีฆาตกรรม', 'จิตวิทยา', 'ประวัติศาสตร์ ปริศนา', 'หาเงินออนไลน์', 'สุขภาพ หมอ', 'AI ใหม่', 'เรื่องลึกลับ'], ['เกม ฮาๆ', 'แกล้ง ฮา', 'สูตรอาหาร ง่ายๆ', 'แมว ตลก', 'การ์ตูน เด็ก', 'DIY ทำเอง', 'เที่ยว vlog', 'ไฮไลท์ ฟุตบอล']],
    RU: ['🇷🇺', 'Nga', 'RU', 'ru', [0.5, 1.2], ['авиакатастрофа', 'криминал реальный случай', 'психология манипуляции', 'история тайны', 'заработок онлайн', 'здоровье врач', 'нейросети новые', 'загадки без ответа'], ['смешные моменты игры', 'пранк', 'простой рецепт', 'смешные коты', 'мультики для детей', 'лайфхаки своими руками', 'влог путешествие', 'лучшие моменты футбол']],
    VN: ['🇻🇳', 'Việt Nam', 'VN', 'vi', [0.3, 0.8], null, ['game hài hước', 'troll vui nhộn', 'món ngon mỗi ngày', 'chó mèo hài hước', 'phim hoạt hình thiếu nhi', 'mẹo vặt cuộc sống', 'vlog du lịch', 'highlight bóng đá']]
  };
  var RPM_MK = ['EN', 'GB', 'CA', 'AU', 'CH', 'NO', 'DE', 'NL', 'SE', 'JP', 'KR', 'FR'];
  var ALL_MK = Object.keys(M);
  var CC = { US: 'EN', GB: 'GB', IE: 'GB', CA: 'CA', AU: 'AU', NZ: 'AU', CH: 'CH', NO: 'NO', DE: 'DE', AT: 'DE', NL: 'NL', BE: 'NL', SE: 'SE', DK: 'SE', FI: 'SE', JP: 'JP', KR: 'KR', FR: 'FR', ES: 'ES', MX: 'ES', AR: 'ES', CO: 'ES', CL: 'ES', PE: 'ES', BR: 'BR', PT: 'BR', IN: 'IN', ID: 'ID', TH: 'TH', RU: 'RU', VN: 'VN' };
  var ENLIKE = { EN: 1, GB: 1, CA: 1, AU: 1 };

  function seedsFor(mk, mode) {
    var m = M[mk], out = [];
    var rpm = m[5] ? m[5].map(function (q, i) { return [L_RPM[i], q]; }) : (mk === 'VN' ? VN_RPM : EN_RPM);
    var gen = m[6] ? m[6].map(function (q, i) { return [L_GEN[i], q]; }) : EN_GEN;
    rpm.forEach(function (s) { out.push({ kind: 'kw', label: s[0], q: s[1], mk: mk }); });
    if (mode !== 'rpm') gen.forEach(function (s) { out.push({ kind: 'kw', label: s[0], q: s[1], mk: mk }); });
    return out;
  }
  function marketsOf(f) { return f.country ? [f.country] : f.mode === 'rpm' ? RPM_MK : ALL_MK; }
  function inMarket(mk, f) { return f.country ? mk === f.country : f.mode === 'rpm' ? RPM_MK.indexOf(mk) >= 0 : true; }

  // ---------- tiện ích ----------
  function iso(s) { var m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(s || '') || []; return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0); }
  function chunk(a, n) { var r = []; for (var i = 0; i < a.length; i += n) r.push(a.slice(i, i + n)); return r; }
  function shuffle(a, rnd) { a = a.slice(); rnd = rnd || Math.random; for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor((s.length - 1) / 2)]; }
  function fmtN(n) { n = +n || 0; return n >= 1e9 ? (n / 1e9).toFixed(1) + 'B' : n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + 'K' : String(Math.round(n)); }
  var STOP = new Set('the and with this that from what how you your for are was were have has had not but all can will just they them their his her its our out who why when where which about into over than then more most new video videos official full live part episode shorts short trailer song music lyrics hd 4k ep vs de la le les el los las en un una que por para con del und der die das ein mit von como não uma dos das em do da no na es et du des il pour sur est ist sie wir und och att det som är på för med av en og er til på den ini itu dan yang di ke dari untuk dengan và của cho là có không những một các được trong khi này đã'.split(' '));
  function words(t, lang) {
    try { return Array.from(new Intl.Segmenter(lang, { granularity: 'word' }).segment(t)).filter(function (x) { return x.isWordLike; }).map(function (x) { return x.segment; }); }
    catch (e) { return t.match(/[\p{L}\p{N}]+/gu) || []; }
  }
  // cụm 2–3 từ lặp lại trong tiêu đề video nổ = chủ đề đang chạy (tự đúng ngôn ngữ bản địa)
  function phrases(titles, lang, top) {
    var df = new Map();
    titles.forEach(function (t0) {
      var t = String(t0 || '').toLowerCase().replace(/#\S+/g, ' ').replace(/\|/g, ' ');
      var cjk = /[぀-ヿ一-鿿가-힯฀-๿]/.test(t), w = words(t, lang).filter(function (x) { return !/^\d+$/.test(x); }), seen = new Set();
      for (var n = 2; n <= 3; n++) for (var i = 0; i + n <= w.length; i++) {
        var g = w.slice(i, i + n);
        if (STOP.has(g[0]) || STOP.has(g[n - 1]) || (!cjk && g.some(function (x) { return x.length < 2; }))) continue;
        var k = g.join(cjk ? '' : ' '); if (!seen.has(k)) { seen.add(k); df.set(k, (df.get(k) || 0) + 1); }
      }
    });
    var out = [];
    Array.from(df).filter(function (e) { return e[1] >= 2; }).sort(function (a, b) { return b[1] * b[0].length - a[1] * a[0].length; }).forEach(function (e) {
      if (out.length >= (top || 20)) return;
      if (out.some(function (o) { return o.k.indexOf(e[0]) >= 0 || e[0].indexOf(o.k) >= 0; })) return;
      out.push({ k: e[0], c: e[1] });
    });
    return out.map(function (o) { return o.k; });
  }

  // ---------- Kho dữ liệu ----------
  // video: {id,t,ti,ch,vw,du,cat,mk,nc}   channel: {id,n,s,c,cr,vc,mk,nc,cat,u:[[views,dur,t]],at,seen}
  function emptyStore() { return { v: 3, videos: {}, channels: {}, log: {}, snow: {}, at: 0, q: 0 }; }
  function mergeStore(a, b) {
    var o = emptyStore(); a = a || emptyStore(); b = b || emptyStore();
    [a, b].forEach(function (s) {
      Object.keys(s.videos || {}).forEach(function (id) { var x = s.videos[id], y = o.videos[id]; if (!y) { o.videos[id] = x; return; } var w = (x.vw || 0) >= (y.vw || 0) ? x : y, fs = x.fs && y.fs ? Math.min(x.fs, y.fs) : undefined; if (w.fs !== fs) { w = Object.assign({}, w); if (fs) w.fs = fs; else delete w.fs; } o.videos[id] = w; });
      Object.keys(s.channels || {}).forEach(function (id) {
        var x = s.channels[id], y = o.channels[id];
        if (!y) o.channels[id] = x;
        else { var n = Object.assign({}, y, x); if ((y.at || 0) > (x.at || 0)) { n.u = y.u; n.at = y.at; } n.seen = Math.max(x.seen || 0, y.seen || 0); if (x.fs && y.fs) n.fs = Math.min(x.fs, y.fs); else delete n.fs; o.channels[id] = n; }
      });
      Object.assign(o.log, s.log || {}); Object.keys(s.snow || {}).forEach(function (k) { o.snow[k] = s.snow[k]; });
      o.at = Math.max(o.at, s.at || 0); o.q = Math.max(o.q, s.q || 0);
    });
    return o;
  }
  function prune(s, opt) {
    opt = opt || {}; var now = opt.now || Date.now(), maxV = opt.maxVideos || 9000, maxC = opt.maxChannels || 4000, maxU = opt.maxUploads || 30;
    var vids = Object.values(s.videos).filter(function (v) { return now - v.t <= (opt.videoDays || 45) * DAY && s.channels[v.ch]; });
    vids.sort(function (a, b) { var sa = s.channels[a.ch].s || 1, sb = s.channels[b.ch].s || 1; return b.vw / Math.max(sb, 1) - a.vw / Math.max(sa, 1); });
    var V = {}; vids.slice(0, maxV).forEach(function (v) { V[v.id] = v; });
    var keepCh = new Set(Object.values(V).map(function (v) { return v.ch; }));
    var chs = Object.values(s.channels).filter(function (c) { return keepCh.has(c.id) || (c.at && now - c.at < 20 * DAY); });
    chs.sort(function (a, b) { return (b.at || b.seen || 0) - (a.at || a.seen || 0); });
    var C = {}; chs.slice(0, maxC).forEach(function (c) { if (c.u && c.u.length > maxU) c.u = c.u.slice(0, maxU); C[c.id] = c; });
    Object.keys(V).forEach(function (id) { if (!C[V[id].ch]) delete V[id]; });
    var L = {}; Object.keys(s.log || {}).forEach(function (k) { if (now - s.log[k] < 10 * DAY) L[k] = s.log[k]; });
    return { v: 3, videos: V, channels: C, log: L, snow: s.snow || {}, at: s.at || 0, q: s.q || 0 };
  }

  // ---------- Phân tích kênh: so toàn bộ video gần đây (cả video flop) ----------
  function rpmOf(c) { var r = (M[c.mk] && M[c.mk][4]) || [1, 3], k = (CATS[c.cat] && CATS[c.cat][2]) || 1; if (LOW_RPM_LABELS.indexOf(c.nc) >= 0) k = Math.min(k, 0.6); return [r[0] * k, r[1] * k]; }
  function analyze(c, now, short) {
    now = now || Date.now();
    if (!c || !c.u || !c.u.length) return { v: 'unk', score: 0, n: 0 };
    var s = Math.max(c.s || 0, 1);
    var u = c.u.filter(function (x) { var isS = x[1] <= SHORT_MAX; return (short ? isS : !isS) && now - x[2] <= 60 * DAY && now - x[2] >= 12 * HOUR; });
    var n = u.length; if (!n) return { v: 'none', score: 0, n: 0 };
    var vs = u.map(function (x) { return x[0]; }), med = median(vs), sum = vs.reduce(function (a, b) { return a + b; }, 0), max = Math.max.apply(null, vs);
    var floor = Math.max(s, short ? 3000 : 1000), hits = vs.filter(function (x) { return x >= floor; }).length, hr = hits / n, medOut = med / s;
    var avgDur = u.reduce(function (a, x) { return a + x[1]; }, 0) / n, oldest = Math.min.apply(null, u.map(function (x) { return x[2]; }));
    var cad = n / Math.max(1, (now - oldest) / (7 * DAY)), v30 = u.filter(function (x) { return now - x[2] <= 30 * DAY; }).reduce(function (a, x) { return a + x[0]; }, 0);
    var topShare = max / Math.max(1, sum), age = c.cr ? (now - c.cr) / DAY : null, mid = !short && avgDur >= 480;
    var r = rpmOf(c), mf = short ? 0 : (mid ? 1 : 0.6);
    var rev = short ? [v30 * 0.03 / 1000, v30 * 0.1 / 1000] : [v30 * r[0] * mf / 1000, v30 * r[1] * mf / 1000];
    var score = 30 * Math.min(1, hr) + 25 * Math.min(1, Math.log10(1 + medOut) / Math.log10(21)) + (short ? 10 : 15) * Math.min(1, avgDur / 900) + 15 * Math.min(1, cad / 3) + 15 * Math.min(1, Math.log10(1 + v30) / 6);
    if (n >= 3 && topShare > 0.8) score -= 15;
    if (age != null && age < 120 && hits >= 2) score += 5;
    var v = n >= 3 && hits >= 3 && hr >= 0.5 && med >= floor ? 'farm' : (hits >= 2 || (n >= 2 && hits >= 1 && medOut >= 1)) ? 'rise' : hits === 1 ? 'fluke' : 'cold';
    return { v: v, n: n, hits: hits, hr: hr, med: med, max: max, medOut: medOut, avgDur: avgDur, cad: cad, v30: v30, rev: rev, mid: mid, age: age, topShare: topShare, score: Math.max(0, Math.min(100, Math.round(score))), eligible: (c.s || 0) >= 1000 };
  }
  var VERDICT = { farm: ['💰 Farm tiền', 'emerald'], rise: ['🌱 Đang lên', 'sky'], fluke: ['⚠️ Ăn may', 'zinc'], cold: ['❄️ View thấp', 'zinc'], none: ['— Không có video đúng định dạng', 'zinc'], unk: ['⏳ Chưa phân tích', 'amber'] };

  // 80% kênh nhỏ xếp trên: cứ 5 vị trí thì 4 lấy từ hàng "sub nhỏ nhất" (chia nấc), 1 lấy từ hàng "điểm cao nhất"
  function smallFirst(arr, cap, subOf, scoreOf) {
    var step = Math.max(100, cap / 10);
    var small = arr.slice().sort(function (a, b) { return Math.floor(subOf(a) / step) - Math.floor(subOf(b) / step) || scoreOf(b) - scoreOf(a); });
    var big = arr.slice().sort(function (a, b) { return scoreOf(b) - scoreOf(a); });
    var used = new Set(), out = [], i = 0, j = 0;
    while (out.length < arr.length && (i < small.length || j < big.length)) {
      for (var k = 0; k < 4 && i < small.length; i++) if (!used.has(small[i])) { used.add(small[i]); out.push(small[i]); k++; }
      for (; j < big.length; j++) if (!used.has(big[j])) { used.add(big[j]); out.push(big[j]); j++; break; }
    }
    return out;
  }

  // ---------- Dựng toàn bộ dữ liệu hiển thị từ kho + bộ lọc ----------
  // f: {mode:'rpm'|'all', country, maxSub, fmt:'long'|'short', hours, minView, minOut, text, vSort, cSort, verdict, perCh, niche,
  //     maxAge (ngày tuổi kênh tối đa), cat (videoCategoryId), minDur (giây), newHours (cửa sổ nhãn Mới), chanFilter(c)→bool}
  function build(store, f, now) {
    now = now || Date.now(); var short = f.fmt === 'short', text = String(f.text || '').toLowerCase().trim();
    var CH = store.channels, A = {};
    var newMs = (f.newHours || 24) * HOUR;
    Object.keys(CH).forEach(function (id) {
      var c = CH[id]; if (c.s == null || c.s > f.maxSub || !inMarket(c.mk, f)) return;
      if (f.maxAge && (!c.cr || now - c.cr > f.maxAge * DAY)) return;
      if (f.cat && c.cat !== f.cat) return;
      A[id] = analyze(c, now, short);
    });
    // so với ngách: outlier trung vị của kênh ÷ outlier trung vị của các kênh cùng ngách
    var byN = {}; Object.keys(A).forEach(function (id) { var a = A[id]; if (a.n) (byN[CH[id].nc] = byN[CH[id].nc] || []).push(a.medOut); });
    var nMed = {}; Object.keys(byN).forEach(function (k) { nMed[k] = median(byN[k]); });
    // video
    var vids = [];
    Object.keys(store.videos).forEach(function (id) {
      var v = store.videos[id], c = CH[v.ch]; if (!c || !A[v.ch]) return;
      var isS = v.du <= SHORT_MAX; if (short !== isS) return;
      var hrs = Math.max(1, (now - v.t) / HOUR); if (hrs > f.hours) return;
      var out = v.vw / Math.max(c.s, 1); if (v.vw < f.minView || out < f.minOut) return;
      if (f.minDur && v.du < f.minDur) return;
      if (f.niche && c.nc !== f.niche) return;
      if (text && (v.ti + ' ' + c.n + ' ' + c.nc).toLowerCase().indexOf(text) < 0) return;
      vids.push({ id: id, title: v.ti, t: v.t, views: v.vw, dur: v.du, cat: v.cat || c.cat, ch: v.ch, chName: c.n, subs: c.s, mk: c.mk, niche: c.nc, hrs: hrs, vph: Math.round(v.vw / hrs), out: out, a: A[v.ch], isNew: !!(v.fs && now - v.fs <= newMs) });
    });
    var vByCh = {}; vids.forEach(function (v) { (vByCh[v.ch] = vByCh[v.ch] || []).push(v); });
    Object.keys(vByCh).forEach(function (k) { vByCh[k].sort(function (a, b) { return b.views - a.views; }); });
    // kênh: có video qua lọc, hoặc đã phân tích và ra kết quả tốt
    var chans = [];
    Object.keys(A).forEach(function (id) {
      var c = CH[id], a = A[id], vv = vByCh[id] || [];
      if (!vv.length && !(a.v === 'farm' || a.v === 'rise')) return;
      if (f.niche && c.nc !== f.niche) return;
      if (text && !vv.length && (c.n + ' ' + c.nc).toLowerCase().indexOf(text) < 0) return;
      var best = vv[0] || null, bestOut = best ? best.out : (a.max || 0) / Math.max(c.s, 1);
      chans.push({ id: id, name: c.n, subs: c.s, mk: c.mk, niche: c.nc, cat: c.cat, cr: c.cr, country: c.c || '', vc: c.vc || 0, fs: c.fs || 0, isNew: !!(c.fs && now - c.fs <= newMs), a: a, vids: vv, best: best, bestOut: bestOut, peer: a.n && nMed[c.nc] ? a.medOut / Math.max(nMed[c.nc], 0.01) : null });
    });
    var stats = { channels: chans.length, farm: 0, rise: 0, unk: 0, fluke: 0, fresh: chans.filter(function (c) { return c.isNew; }).length, videos: vids.length, markets: new Set(chans.map(function (c) { return c.mk; })).size };
    chans.forEach(function (c) { if (stats[c.a.v] != null) stats[c.a.v]++; });
    // ngách đề xuất
    var NG = {};
    chans.forEach(function (c) {
      var g = NG[c.niche] = NG[c.niche] || { name: c.niche, chans: [], farm: 0, rise: 0, fresh: 0, outs: [], v30: 0, mks: {}, cats: {}, rpm: [] };
      g.chans.push(c); if (c.isNew) g.fresh++; if (c.a.v === 'farm') g.farm++; if (c.a.v === 'rise') g.rise++;
      if (c.a.n) g.outs.push(c.a.medOut); else g.outs.push(c.bestOut / 3);
      g.v30 += c.a.v30 || 0; g.mks[c.mk] = (g.mks[c.mk] || 0) + 1; if (c.cat) g.cats[c.cat] = (g.cats[c.cat] || 0) + 1; g.rpm.push(rpmOf(c)[1]);
    });
    var niches = Object.values(NG).map(function (g) {
      var mo = median(g.outs), rpm = median(g.rpm), proof = Math.min(1, (g.farm * 2 + g.rise + g.chans.length * 0.25) / 8);
      var money = f.mode === 'rpm' ? Math.min(1, rpm / 10) : Math.min(1, Math.log10(1 + g.v30) / 7);
      g.medOut = mo; g.rpmHi = rpm; g.score = Math.round(40 * proof + 30 * Math.min(1, Math.log10(1 + mo) / Math.log10(21)) + 30 * money);
      g.chans.sort(function (a, b) { return b.a.score - a.a.score || b.bestOut - a.bestOut; });
      g.topMk = Object.keys(g.mks).sort(function (a, b) { return g.mks[b] - g.mks[a]; });
      g.topCat = Object.keys(g.cats).sort(function (a, b) { return g.cats[b] - g.cats[a]; })[0] || '';
      return g;
    }).sort(function (a, b) { return b.score - a.score; });
    // lọc + sắp xếp kênh
    var vf = f.verdict || 'good';
    var cl = chans.filter(function (c) { return vf === 'all' ? true : vf === 'new' ? c.isNew : vf === 'good' ? (c.a.v === 'farm' || c.a.v === 'rise' || c.a.v === 'unk') : c.a.v === vf; });
    if (typeof f.chanFilter === 'function') cl = cl.filter(f.chanFilter);
    var cs = f.cSort || 'smart';
    if (cs === 'score') cl.sort(function (a, b) { return b.a.score - a.a.score || b.bestOut - a.bestOut; });
    else if (cs === 'v30') cl.sort(function (a, b) { return (b.a.v30 || 0) - (a.a.v30 || 0); });
    else if (cs === 'new') cl.sort(function (a, b) { return (b.cr || 0) - (a.cr || 0); });
    else if (cs === 'out') cl.sort(function (a, b) { return b.bestOut - a.bestOut; });
    else if (cs === 'rev') cl.sort(function (a, b) { return ((b.a.eligible && b.a.rev ? b.a.rev[1] : 0) - (a.a.eligible && a.a.rev ? a.a.rev[1] : 0)) || b.a.score - a.a.score; });
    else if (cs === 'fresh') cl.sort(function (a, b) { return (b.fs || 0) - (a.fs || 0) || b.a.score - a.a.score; });
    else if (cs === 'young') cl.sort(function (a, b) { return (b.cr || 0) - (a.cr || 0); });
    else cl = smallFirst(cl, f.maxSub, function (c) { return c.subs; }, function (c) { return c.a.score * 10 + Math.log10(1 + c.bestOut); });
    // sắp xếp video + giới hạn số video mỗi kênh để đa dạng
    var vs = f.vSort || 'smart';
    if (vs === 'views') vids.sort(function (a, b) { return b.views - a.views; });
    else if (vs === 'out') vids.sort(function (a, b) { return b.out - a.out; });
    else if (vs === 'vph') vids.sort(function (a, b) { return b.vph - a.vph; });
    else if (vs === 'new') vids.sort(function (a, b) { return b.t - a.t; });
    else if (vs === 'farm') vids.sort(function (a, b) { return b.a.score - a.a.score || b.out - a.out; });
    else vids = smallFirst(vids, f.maxSub, function (v) { return v.subs; }, function (v) { return v.views; });
    if (f.perCh > 0) { var cnt = {}; vids = vids.filter(function (v) { cnt[v.ch] = (cnt[v.ch] || 0) + 1; return cnt[v.ch] <= f.perCh; }); }
    stats.videosShown = vids.length;
    return { videos: vids, channels: cl, allChannels: chans, niches: niches, stats: stats, needProfile: chans.filter(function (c) { return c.a.v === 'unk'; }).length };
  }

  // ---------- QUÉT ----------
  // o: {yt(path,params)→json (ném {code:'quotaExceeded'} khi hết quota), store, f, budget, extraSeeds:[{label,q,mk}], onProgress(msg), now, rnd}
  async function scan(o) {
    var yt = o.yt, S = o.store, f = o.f, budget = o.budget || 1500, now = o.now || Date.now(), rnd = o.rnd || Math.random, say = o.onProgress || function () { };
    var units = 0, short = f.fmt === 'short', mks = marketsOf(f), newV = 0, newC = 0, profiled = 0, stop = '';
    function cost(p) { return p === 'search' ? 100 : 1; }
    async function call(path, p) {
      if (units + cost(path) > budget) { var e = new Error('BUDGET'); e.code = 'BUDGET'; throw e; }
      units += cost(path); return yt(path, p);
    }
    var after = new Date(now - Math.max(2, f.hours) * HOUR).toISOString();
    // 1) Lên danh sách nguồn (seed) — trộn 5 kiểu để ra đa dạng content + kênh
    var seenK = new Set(), totalPlan = 0;
    for (var round = 0; round < (o.profileOnly ? 1 : 4) && !stop; round++) {
    var nSearch = o.profileOnly ? 0 : round === 0 ? Math.max(2, Math.floor(budget * (o.searchShare || 0.6) / 100)) : Math.floor((budget - units) * 0.6 / 100);
    if (round > 0 && nSearch < 1) break;
    var trend = [];
    if (!o.skipTrend && !o.profileOnly && round === 0) {
      var tm = shuffle(mks, rnd).slice(0, Math.min(4, mks.length)), cats = f.mode === 'rpm' ? ['', '25', '28', '27'] : ['', '20', '24', '23', '22', '26'];
      for (var a = 0; a < tm.length; a++) {
        var titles = [];
        for (var b = 0; b < cats.length; b++) { try { var r = await call('videos', { part: 'snippet', chart: 'mostPopular', regionCode: M[tm[a]][2], maxResults: 50, videoCategoryId: cats[b] }); (r.items || []).forEach(function (v) { titles.push(v.snippet.title); }); } catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') break; } }
        phrases(titles, M[tm[a]][3], 8).forEach(function (p) { trend.push({ kind: 'trend', label: p, q: p, mk: tm[a] }); });
      }
    }
    var snow = []; mks.forEach(function (mk) { (S.snow[mk] || []).forEach(function (p) { snow.push({ kind: 'snow', label: p, q: p, mk: mk }); }); });
    var kw = []; mks.forEach(function (mk) { kw = kw.concat(seedsFor(mk, f.mode)); });
    var catSeeds = []; mks.forEach(function (mk) { (f.mode === 'rpm' ? CATS_RPM : CATS_ALL).forEach(function (c) { catSeeds.push({ kind: 'cat', label: CATS[c][1], cat: c, mk: mk }); }); });
    var extra = (o.extraSeeds || []).map(function (x) { return { kind: 'kw', label: x.label || x.q, q: x.q, mk: x.mk }; }).filter(function (x) { return M[x.mk]; });
    var custom = (o.custom || []).map(function (q) { return { kind: 'kw', label: q, q: q, mk: f.country || 'EN' }; });
    function key(s) { return s.mk + '|' + (s.q || ('cat' + s.cat)) + '|' + (short ? 's' : 'l'); }
    function fresh(list) { // ưu tiên nguồn chưa quét trong 3 ngày → mỗi lần quét ra kênh mới
      var a = shuffle(list, rnd); return a.filter(function (s) { return !(now - (S.log[key(s)] || 0) < 3 * DAY); }).concat(a.filter(function (s) { return now - (S.log[key(s)] || 0) < 3 * DAY; }));
    }
    var plan = [];
    function take(list, n) { var c = 0; for (var i = 0; i < list.length && c < n; i++) { var k = key(list[i]); if (seenK.has(k)) continue; seenK.add(k); plan.push(list[i]); c++; } }
    take(custom, o.profileOnly || round > 0 ? 0 : custom.length);
    var left = Math.max(0, nSearch - plan.length);
    take(fresh(extra), Math.round(left * (extra.length ? 0.3 : 0)));
    take(fresh(trend.concat(snow)), Math.round(left * 0.3));
    take(fresh(catSeeds), Math.round(left * 0.25));
    take(fresh(kw), nSearch - plan.length);
    if (plan.length < nSearch && !o.profileOnly) take(fresh(trend.concat(snow, catSeeds, extra)), nSearch - plan.length);
    // 2) Tìm video (search = 100 quota) — xoay vòng thời lượng + kiểu xếp để không ra mãi một nhóm kênh
    var pending = {}, order = ['viewCount', 'viewCount', 'relevance', 'viewCount', 'rating'], si = 0;
    for (var gi = 0, groups = chunk(plan, 4); gi < groups.length && !stop; gi++) {
      await Promise.all(groups[gi].map(async function (s) {
        var m = M[s.mk], i = si++;
        var p = { part: 'snippet', type: 'video', maxResults: 50, order: order[i % order.length], publishedAfter: after, regionCode: m[2], relevanceLanguage: m[3], videoDuration: short ? 'short' : (i % 2 ? 'medium' : 'long') };
        if (s.kind === 'cat') { p.videoCategoryId = s.cat; p.order = 'viewCount'; } else p.q = s.q;
        try { var r = await call('search', p); S.log[key(s)] = now; (r.items || []).forEach(function (it) { var id = it.id && it.id.videoId; if (id && !S.videos[id] && !pending[id]) pending[id] = s; }); }
        catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') stop = e.code; }
      }));
      say('🔎 Dò nguồn ' + Math.min(plan.length, (gi + 1) * 4) + '/' + plan.length + ' • ' + Object.keys(pending).length + ' video mới • ' + units + ' quota');
    }
    // 3) Lấy số liệu video + kênh, chỉ giữ kênh nhỏ
    async function enrich(ids, srcOf, raw) {
      for (var ci = 0, cs = chunk(ids, 50); ci < cs.length; ci++) {
        var vr; try { vr = await call('videos', { part: 'snippet,statistics,contentDetails', id: cs[ci].join(',') }); } catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') { stop = e.code; return; } continue; }
        var vs = (vr.items || []).filter(function (v) { return v.snippet && v.snippet.liveBroadcastContent !== 'live'; });
        var chSrc = {}; vs.forEach(function (v) { var k = v.snippet.channelId; if (!chSrc[k]) chSrc[k] = srcOf(v.id, k); });
        var need = Object.keys(chSrc).filter(function (id) { var c = S.channels[id]; if (!c && now - (S.log['big|' + id] || 0) < 7 * DAY) return false; return !c || now - (c.seen || 0) > DAY; });
        for (var ni = 0, nc = chunk(need, 50); ni < nc.length; ni++) {
          try {
            var cr = await call('channels', { part: 'snippet,statistics', id: nc[ni].join(',') });
            (cr.items || []).forEach(function (x) {
              var sub = x.statistics.hiddenSubscriberCount ? null : +x.statistics.subscriberCount, old = S.channels[x.id];
              if (sub == null || sub > CAP_SUB) { if (old) delete S.channels[x.id]; S.log['big|' + x.id] = now; return; }
              var sv = chSrc[x.id] || {}, mk = CC[x.snippet.country] || (old && old.mk) || sv.mk || 'EN';
              if (!old) newC++;
              S.channels[x.id] = Object.assign({}, old || {}, old ? {} : { fs: now }, { id: x.id, n: x.snippet.title, s: sub, c: x.snippet.country || '', cr: Date.parse(x.snippet.publishedAt) || 0, vc: +x.statistics.videoCount || 0, mk: mk, nc: (old && old.nc) || sv.label || 'Khác', seen: now });
            });
          } catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') { stop = e.code; return; } }
        }
        vs.forEach(function (v) {
          var c = S.channels[v.snippet.channelId]; if (!c) return;
          var views = +v.statistics.viewCount || 0, du = iso(v.contentDetails.duration), t = Date.parse(v.snippet.publishedAt);
          if (raw) raw.push({ ch: c.id, x: [views, du, t] });
          if (!c.cat && v.snippet.categoryId) c.cat = v.snippet.categoryId;
          if (views < 500 || views < c.s * 0.5) return;
          var ov = S.videos[v.id]; if (!ov) newV++;
          S.videos[v.id] = { id: v.id, t: t, ti: v.snippet.title, ch: c.id, vw: views, du: du, cat: v.snippet.categoryId || '', mk: c.mk, nc: c.nc };
          if (!ov) S.videos[v.id].fs = now; else if (ov.fs) S.videos[v.id].fs = ov.fs;
        });
      }
    }
    var pIds = Object.keys(pending);
    if (!stop) { say('📊 Lấy số liệu ' + pIds.length + ' video...'); await enrich(pIds, function (vid) { return pending[vid]; }, null); }
    // gán nguồn cho kênh mới theo video đã tìm thấy (nhãn ngách)
    Object.keys(pending).forEach(function (id) { var v = S.videos[id], s = pending[id]; if (v && S.channels[v.ch]) { var c = S.channels[v.ch]; if (!c.nc || c.nc === 'Khác') { c.nc = s.label; v.nc = s.label; } if (!CC[c.c] && s.mk) { c.mk = s.mk; v.mk = s.mk; } } });
    // 4) So sánh kênh: lấy 30 video gần nhất (cả video flop) của kênh nhỏ có hit
    var hitCh = {};
    Object.values(S.videos).forEach(function (v) { var c = S.channels[v.ch]; if (c && v.vw >= Math.max(c.s, 1000) && (v.du <= SHORT_MAX) === short) hitCh[c.id] = Math.max(hitCh[c.id] || 0, v.vw / Math.max(c.s, 1)); });
    var cand = Object.values(S.channels).filter(function (c) { return hitCh[c.id] && inMarket(c.mk, f) && c.s <= f.maxSub && !(c.at && now - c.at < 20 * HOUR); })
      .sort(function (a, b) { return (b.seen || 0) - (a.seen || 0) || hitCh[b.id] - hitCh[a.id]; });
    var maxProf = o.maxProfiles || 400;
    for (var pi = 0, pg = chunk(cand.slice(0, maxProf), 10); pi < pg.length && !stop; pi++) {
      var ids = [], raw = [];
      await Promise.all(pg[pi].map(async function (c) {
        try { var pl = await call('playlistItems', { part: 'contentDetails', playlistId: 'UU' + c.id.slice(2), maxResults: 30 }); (pl.items || []).forEach(function (it) { ids.push(it.contentDetails.videoId); }); }
        catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') stop = e.code; }
      }));
      if (!ids.length) continue;
      await enrich(ids, function (vid, chId) { var c = S.channels[chId]; return c ? { mk: c.mk, label: c.nc } : null; }, raw);
      pg[pi].forEach(function (c0) { var c = S.channels[c0.id]; if (!c) return; var u = raw.filter(function (r) { return r.ch === c.id; }).map(function (r) { return r.x; }); if (u.length) { c.u = u.sort(function (a, b) { return b[2] - a[2]; }).slice(0, 30); c.at = now; profiled++; } });
      say('🔬 So sánh kênh ' + profiled + '/' + Math.min(cand.length, maxProf) + ' • ' + units + ' quota');
    }
    // 5) Snowball: cụm từ trong tiêu đề video nổ của kênh nhỏ → nguồn quét lần sau (đúng ngôn ngữ bản địa)
    var tByMk = {};
    Object.values(S.videos).forEach(function (v) { var c = S.channels[v.ch]; if (c && v.vw >= Math.max(3 * c.s, 3000)) (tByMk[c.mk] = tByMk[c.mk] || []).push(v.ti); });
    Object.keys(tByMk).forEach(function (mk) { S.snow[mk] = phrases(tByMk[mk].slice(-600), M[mk] ? M[mk][3] : 'en', 25); });
      totalPlan += plan.length;
      if (o.profileOnly || budget - units < 250) break;
    }
    S.at = now; S.q = (S.q || 0) + units;
    return { units: units, searches: totalPlan, newVideos: newV, newChannels: newC, profiled: profiled, stop: stop };
  }

  // ---------- Thống kê quota dự kiến ----------
  var LEVELS = [['quick', 'Quét nhanh', 1500], ['deep', 'Quét sâu', 4500], ['max', 'Quét tối đa', 9000]];

  return {
    version: '3.1.0', M: M, CATS: CATS, RPM_MK: RPM_MK, ALL_MK: ALL_MK, CC: CC, VERDICT: VERDICT, LEVELS: LEVELS, SHORT_MAX: SHORT_MAX, CAP_SUB: CAP_SUB,
    seedsFor: seedsFor, marketsOf: marketsOf, inMarket: inMarket, phrases: phrases, iso: iso, median: median, fmtN: fmtN, chunk: chunk, shuffle: shuffle,
    emptyStore: emptyStore, mergeStore: mergeStore, prune: prune, analyze: analyze, rpmOf: rpmOf, smallFirst: smallFirst, build: build, scan: scan
  };
});
// =========================================================================
// TOP NGÁCH v3 — Giao diện (window.TopNgachV3). Chỉ dùng TopNgachEngine, kho riêng trong IndexedDB.
// =========================================================================
(function () {
  if (typeof window === 'undefined') return;
  var E = window.TopNgachEngine;
  var DB = 'youtrend_topngach_v3', OS = 'kv';
  function idb() { return new Promise(function (res, rej) { try { var r = indexedDB.open(DB, 1); r.onupgradeneeded = function () { r.result.createObjectStore(OS); }; r.onsuccess = function () { res(r.result); }; r.onerror = function () { rej(r.error); }; } catch (e) { rej(e); } }); }
  function idbGet(k) { return idb().then(function (d) { return new Promise(function (res) { var q = d.transaction(OS).objectStore(OS).get(k); q.onsuccess = function () { res(q.result || null); }; q.onerror = function () { res(null); }; }); }).catch(function () { try { return JSON.parse(localStorage.getItem('tn3_' + k) || 'null'); } catch (e) { return null; } }); }
  function idbSet(k, v) { return idb().then(function (d) { return new Promise(function (res) { var t = d.transaction(OS, 'readwrite'); t.objectStore(OS).put(v, k); t.oncomplete = function () { res(true); }; t.onerror = function () { res(false); }; }); }).catch(function () { try { localStorage.setItem('tn3_' + k, JSON.stringify(v)); } catch (e) { } return false; }); }
  // dọn dữ liệu Top Ngách các bản cũ để không còn đè lên nhau
  try { ['yt_tn7_pool', 'yt_tn8_filters', 'yt_tn9_filters', 'yt_tn10_filters', 'yt_tn_ch_v1', 'yt_tn_meta_v1', 'yt_real_discovered_niches_v6'].forEach(function (k) { localStorage.removeItem(k); }); } catch (e) { }

  var N = E.fmtN, M = E.M, CATS = E.CATS, V = E.VERDICT;
  var flag = function (mk) { return M[mk] ? M[mk][0] : ''; };
  var thumb = function (id) { return 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'; };
  var dur = function (s) { s = Math.round(s || 0); var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };
  var age = function (hrs) { return hrs < 24 ? Math.round(hrs) + ' giờ' : Math.round(hrs / 24) + ' ngày'; };
  var cx = function () { return Array.prototype.filter.call(arguments, Boolean).join(' '); };
  var DEF = { mode: 'rpm', country: '', maxSub: 5000, fmt: 'long', hours: 168, minView: 1000, minOut: 2, text: '', vSort: 'smart', cSort: 'smart', nSort: 'out', verdict: 'good', perCh: 2, niche: '', maxAge: 0, cat: '', minDur: 0, hideSeen: false };
  var DAYMS = 864e5;
  // Bộ lọc nhanh có sẵn (bấm để áp dụng; bộ lọc tự lưu nằm sau)
  var BUILTIN = [
    ['Mỹ dưới 5K · 7 ngày', { mode: 'rpm', country: 'EN', maxSub: 5000, fmt: 'long', hours: 168, minView: 1000, minOut: 2, maxAge: 0, minDur: 0, cat: '' }],
    ['Kênh mới dưới 90 ngày', { maxSub: 20000, fmt: 'long', hours: 720, minView: 1000, minOut: 2, maxAge: 90, minDur: 0, cat: '' }],
    ['Video dài có mid-roll', { fmt: 'long', hours: 168, minView: 5000, minOut: 2, minDur: 480, maxAge: 0 }],
    ['Shorts nổ 24 giờ', { fmt: 'short', hours: 24, minView: 20000, minOut: 5, maxAge: 0, minDur: 0 }]
  ];
  function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { } }
  function toApp(v) { return { id: v.id, title: v.title, channel: v.chName, channelId: v.ch, subs: v.subs, views: v.views, dur: v.dur, thumb: thumb(v.id), published: new Date(v.t).toISOString(), vph: v.vph }; }
  function csvDownload(name, rows) {
    var b = new Blob(['﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }
  function fetchDaily() { return fetch('/data/top_ngach.json?h=' + new Date().toISOString().slice(0, 13)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j && j.v === 3 ? j : null; }).catch(function () { return null; }); }
  // Cho các trang khác (Hôm nay, Xưởng tiêu đề) dùng chung kho Top Ngách
  window.TopNgachData = {
    DEF: DEF,
    load: function () { return Promise.all([idbGet('store'), fetchDaily()]).then(function (x) { var l = x[0] && x[0].v === 3 ? x[0] : null; return { store: E.mergeStore(x[1], l), daily: x[1], local: l }; }); },
    marks: function () { return lsGet('tn3_marks', {}) || {}; },
    filters: function () { return Object.assign({}, DEF, lsGet('tn3_filters', {}), { text: '', niche: '' }); }
  };

  // ---------- Prompt gửi Claude cho một ngách ----------
  function nichePrompt(g, f) {
    var L = [], fmt = f.fmt === 'short' ? 'Shorts' : 'video dài', now = Date.now();
    var vids = []; g.chans.forEach(function (c) { (c.vids || []).forEach(function (v) { vids.push(v); }); });
    vids.sort(function (a, b) { return b.out - a.out; });
    L.push('# NHIỆM VỤ: PHÂN TÍCH NGÁCH YOUTUBE "' + g.name + '" VÀ LẬP KẾ HOẠCH LÀM KÊNH ĂN THEO');
    L.push('');
    L.push('Tôi săn kênh nhỏ (dưới ' + N(f.maxSub) + ' sub) đang ra view vượt số người đăng ký để làm kênh tương tự. Số liệu dưới đây lấy từ YouTube Data API ngày ' + new Date().toLocaleDateString('vi-VN') + ', định dạng ' + fmt + ', video đăng trong ' + (f.hours >= 48 ? Math.round(f.hours / 24) + ' ngày' : f.hours + ' giờ') + ' qua.');
    L.push('');
    L.push('## SỐ LIỆU NGÁCH');
    L.push('- Kênh nhỏ qua lọc: ' + g.chans.length + ' (farm đều: ' + g.farm + ', đang lên: ' + g.rise + ')');
    L.push('- View ÷ sub trung vị của các kênh: ×' + g.medOut.toFixed(1));
    L.push('- Tổng view 30 ngày của các kênh này: ' + N(g.v30));
    L.push('- RPM ước tính (theo nước + danh mục): tới ~$' + g.rpmHi.toFixed(1));
    L.push('- Thị trường: ' + g.topMk.map(function (k) { return M[k] ? M[k][1] : k; }).join(', ') + (CATS[g.topCat] ? ' · Danh mục YouTube: ' + CATS[g.topCat][1] : ''));
    L.push('');
    L.push('## KÊNH NHỎ TRONG NGÁCH (xếp theo điểm farm)');
    L.push('| Kênh | Sub | Nước | Tuổi kênh | Đánh giá | Điểm | Video đạt | View trung vị | Dài TB | Video/tuần | View 30 ngày | Link |');
    L.push('|---|---|---|---|---|---|---|---|---|---|---|---|');
    g.chans.slice(0, 15).forEach(function (c) {
      var a = c.a, ageD = c.cr ? Math.round((now - c.cr) / DAYMS) + ' ngày' : '?';
      L.push('| ' + [c.name.replace(/\|/g, '/'), N(c.subs), M[c.mk] ? M[c.mk][2] : c.mk, ageD, (V[a.v] || V.unk)[0].replace(/^\S+\s/, ''), a.n ? a.score : '–', a.n ? a.hits + '/' + a.n : '–', a.n ? N(a.med) : '–', a.n ? (f.fmt === 'short' ? Math.round(a.avgDur) + 's' : Math.round(a.avgDur / 60) + ' phút') : '–', a.n ? a.cad.toFixed(1) : '–', a.n ? N(a.v30) : '–', 'https://www.youtube.com/channel/' + c.id].join(' | ') + ' |');
    });
    L.push('');
    L.push('## VIDEO MẪU VIEW CAO (xếp theo view ÷ sub)');
    L.push('| Tiêu đề | Kênh | Sub | View | × sub | Dài | Đăng | Link |');
    L.push('|---|---|---|---|---|---|---|---|');
    vids.slice(0, 30).forEach(function (v) { L.push('| ' + [v.title.replace(/\|/g, '/'), v.chName.replace(/\|/g, '/'), N(v.subs), N(v.views), '×' + Math.round(v.out), dur(v.dur), age(v.hrs) + ' trước', 'https://youtu.be/' + v.id].join(' | ') + ' |'); });
    var ph = E.phrases(vids.slice(0, 80).map(function (v) { return v.title; }), M[g.topMk[0]] ? M[g.topMk[0]][3] : 'en', 15);
    if (ph.length) { L.push(''); L.push('## CỤM TỪ LẶP LẠI TRONG TIÊU ĐỀ VIDEO NỔ'); L.push(ph.join(' · ')); }
    L.push('');
    L.push('## YÊU CẦU ĐẦU RA (tiếng Việt, Markdown)');
    L.push('1. Ngách này thực chất là nội dung gì, người xem là ai, vì sao kênh nhỏ vẫn lên view. Bám vào số liệu trên.');
    L.push('2. Công thức chung của video thắng: dạng tiêu đề, độ dài, nhịp đăng, kiểu thumbnail và cấu trúc nội dung có thể suy ra. Ghi rõ điều nào là suy đoán cần tôi mở video kiểm tra.');
    L.push('3. Ba kênh đáng clone nhất, lý do, và những gì cần xem trực tiếp trên kênh để xác nhận.');
    L.push('4. Mức cạnh tranh và rủi ro: bản quyền, nội dung tái sử dụng, chính sách kiếm tiền, phụ thuộc trend.');
    L.push('5. Kế hoạch làm kênh: định vị, 15 ý tưởng video đầu tiên (tiêu đề viết đúng ngôn ngữ của thị trường, kèm góc khai thác), lịch đăng 4 tuần.');
    L.push('6. Cách sản xuất nhanh: nguồn hình, giọng đọc, công cụ, thời gian ước tính mỗi video.');
    L.push('');
    L.push('Không bịa số liệu ngoài các bảng trên. Nếu thiếu dữ liệu để kết luận, nói rõ là thiếu.');
    return L.join('\n');
  }

  // ---------- Cửa sổ chi tiết một kênh ----------
  function ChannelDetail(p) {
    var React = window.React, h = React.createElement, K = window.YT4UI;
    var c = p.c, a = c.a, m = p.mark || {}, short = p.short, now = Date.now();
    var s = React.useState(m.note || ''), note = s[0], setNote = s[1];
    var u = (p.raw || []).filter(function (x) { return (x[1] <= E.SHORT_MAX) === short && now - x[2] <= 60 * DAYMS; }).sort(function (x, y) { return x[2] - y[2]; });
    var floor = Math.max(c.subs, short ? 3000 : 1000), max = Math.max.apply(null, u.map(function (x) { return x[0]; }).concat([floor * 1.2]));
    var ageD = c.cr ? Math.round((now - c.cr) / DAYMS) : null, fmtName = short ? 'Shorts' : 'video dài';
    var why = [];
    if (!a.n) why.push(a.v === 'unk' ? 'Kênh chưa được so toàn bộ video. Bấm Phân tích ở dải vàng trong Top Ngách để biết kênh farm thật hay ăn may.' : 'Không có ' + fmtName + ' nào trong 60 ngày qua.');
    else {
      why.push(a.hits + '/' + a.n + ' ' + fmtName + ' trong 60 ngày có view từ ' + N(floor) + ' trở lên (mức sub của kênh), tức ' + Math.round(a.hr * 100) + '% video đạt.');
      why.push('View trung vị ' + N(a.med) + ', bằng ×' + (a.medOut >= 10 ? Math.round(a.medOut) : a.medOut.toFixed(1)) + ' số sub.' + (a.med >= floor ? ' Video bình thường của kênh cũng vượt sub.' : ' Video bình thường chưa vượt sub.'));
      why.push('Đăng ' + a.cad.toFixed(1) + ' video/tuần, dài trung bình ' + (short ? Math.round(a.avgDur) + ' giây' : Math.round(a.avgDur / 60) + ' phút') + (a.mid ? ' (đủ dài để chèn quảng cáo giữa video).' : '.'));
      if (a.topShare > 0.8 && a.n >= 3) why.push('Một video chiếm ' + Math.round(a.topShare * 100) + '% tổng view: kênh đang phụ thuộc một video nổ.');
      if (ageD != null && ageD < 120 && a.hits >= 2) why.push('Kênh mới ' + ageD + ' ngày tuổi đã có ' + a.hits + ' video đạt: tín hiệu được đề xuất mạnh.');
      if (c.peer) why.push('So với các kênh cùng ngách: ×' + c.peer.toFixed(1) + (c.peer >= 1.5 ? ' (nổi bật hơn mặt bằng ngách).' : c.peer < 0.7 ? ' (kém hơn mặt bằng ngách).' : ' (ngang mặt bằng ngách).'));
    }
    var RULE = { farm: 'Farm tiền = ít nhất 3 video đạt, tối thiểu 50% video đạt và view trung vị cũng vượt sub.', rise: 'Đang lên = có 2 video đạt, hoặc 1 video đạt và view trung vị đã vượt sub.', fluke: 'Ăn may = chỉ 1 video nổ, các video khác thấp.', cold: 'View thấp = không video nào đạt mức sub trong 60 ngày.' };
    var bw = u.length ? Math.min(28, 600 / u.length - 2) : 0;
    var chart = u.length > 0 && h('div', null,
      h('div', { className: 'flex justify-between text-[11px] text-cham-400 mb-1' }, h('span', null, u.length + ' ' + fmtName + ' gần nhất (cũ → mới), kể cả video flop'), h('span', null, 'Vạch đứt: mức sub ' + N(floor))),
      h('svg', { viewBox: '0 0 600 120', className: 'w-full h-28 rounded-lg bg-[#181818]', role: 'img', 'aria-label': 'View từng video so với mức sub' },
        u.map(function (x, i) { var hh = Math.max(2, x[0] / max * 104), ok = x[0] >= floor; return h('rect', { key: i, x: i * (600 / u.length) + (600 / u.length - bw) / 2, y: 112 - hh, width: bw, height: hh, rx: 2, fill: ok ? '#4bc167' : '#5a5a5a' }, h('title', null, N(x[0]) + ' view · ' + dur(x[1]) + ' · ' + new Date(x[2]).toLocaleDateString('vi-VN'))); }),
        h('line', { x1: 0, x2: 600, y1: 112 - floor / max * 104, y2: 112 - floor / max * 104, stroke: '#f5c451', strokeWidth: 1.5, strokeDasharray: '6 5' })));
    var cell = function (l, v, tone) { return h('div', { className: 'yt-cell px-2.5 py-2 min-w-0' }, h('dt', { className: 'text-[11px] text-cham-400 truncate' }, l), h('dd', { className: 'text-[12px] font-semibold truncate tabular-nums ' + (tone || 'text-cham-50') }, v)); };
    var btn = K.C.btn, vl = V[a.v] || V.unk;
    return h(K.Modal, { title: c.name, wide: true, onClose: function () { if (note !== (m.note || '')) p.onMark({ note: note.trim() }); p.onClose(); } },
      h('div', { className: 'space-y-4' },
        h('div', { className: 'text-[12px] text-cham-300 tabular-nums' }, [N(c.subs) + ' sub', M[c.mk] ? M[c.mk][1] : c.mk, c.niche, ageD != null ? 'kênh ' + (ageD < 365 ? ageD + ' ngày tuổi' : (ageD / 365).toFixed(1) + ' năm tuổi') : '', c.vc ? N(c.vc) + ' video' : '', vl[0].replace(/^\S+\s/, '') + (a.n ? ' · điểm ' + a.score + '/100' : '')].filter(Boolean).join(' · ')),
        chart,
        h('div', null, h('h3', { className: 'text-[12px] font-semibold text-cham-50 mb-1.5' }, 'Vì sao được xếp loại này'),
          h('ul', { className: 'space-y-1' }, why.map(function (t, i) { return h('li', { key: i, className: 'text-[12px] text-cham-200 leading-relaxed pl-3 relative' }, h('span', { className: 'absolute left-0 text-cham-500' }, '–'), t); })),
          RULE[a.v] && h('p', { className: 'text-[11px] text-cham-400 mt-1.5' }, RULE[a.v])),
        a.n > 0 && h('dl', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-1.5' },
          cell('Video đạt', a.hits + '/' + a.n, a.hr >= 0.5 ? 'text-[#6fcf85]' : ''), cell('View trung vị', N(a.med)), cell('View cao nhất', N(a.max)), cell('View 30 ngày', N(a.v30)),
          cell('Nhịp đăng', a.cad.toFixed(1) + '/tuần'), cell('Ước tính/tháng', a.eligible ? '$' + N(Math.round(a.rev[0])) + '–' + N(Math.round(a.rev[1])) : 'Chưa đủ 1K', a.eligible ? 'text-[#6fcf85]' : 'text-cham-400')),
        c.vids.length > 0 && h('div', null, h('h3', { className: 'text-[12px] font-semibold text-cham-50 mb-1.5' }, 'Video nổ đã quét được (' + c.vids.length + ')'),
          h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' }, c.vids.slice(0, 12).map(function (v) {
            return h('a', { key: v.id, href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', className: 'block group' },
              h('div', { className: 'relative rounded-lg overflow-hidden bg-black' }, h('img', { src: thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
                h('span', { className: 'absolute top-1 right-1 text-[10px] font-bold px-1 rounded tabular-nums ' + (v.out >= 20 ? 'bg-[#ff4e45] text-white' : v.out >= 5 ? 'bg-[#f5c451] text-[#2a1d00]' : 'bg-black/80 text-[#f1f1f1]') }, '×' + Math.round(v.out)),
                h('span', { className: 'absolute bottom-1 right-1 text-[10px] px-1 rounded bg-black/80 text-[#f1f1f1] tabular-nums' }, dur(v.dur))),
              h('div', { className: 'mt-1 text-[11px] text-cham-100 leading-snug line-clamp-2 group-hover:text-white' }, v.title),
              h('div', { className: 'text-[10.5px] text-cham-400 tabular-nums' }, N(v.views) + ' view · ' + age(v.hrs) + ' trước'));
          }))),
        h('label', { className: 'block' }, h('span', { className: 'block text-[11.5px] font-medium text-cham-300 mb-1.5' }, 'Ghi chú của bạn về kênh này'),
          h('textarea', { value: note, onChange: function (e) { setNote(e.target.value); }, onBlur: function () { if (note !== (m.note || '')) p.onMark({ note: note.trim() }); }, rows: 2, placeholder: 'Ví dụ: giọng AI + ảnh tĩnh, dễ clone; cần xem cách dựng thumbnail…', className: 'w-full rounded-lg bg-[#121212] border border-[#303030] px-3 py-2 text-[12px] text-cham-50 placeholder:text-cham-500 focus:border-[#3ea6ff] outline-none' })),
        h('div', { className: 'flex flex-wrap gap-2 pt-1' },
          h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', onClick: function () { p.onMark({ seen: Date.now() }); }, className: K.C.pri }, 'Mở kênh'),
          p.onOpen && h('button', { onClick: function () { p.onOpen(c.id, 'clone'); }, className: btn }, 'Hồ sơ clone'),
          p.onOpen && h('button', { onClick: function () { p.onOpen(c.id, 'vid'); }, className: btn }, 'Phân tích sâu'),
          p.onFollow && h('button', { onClick: p.onFollow, className: btn }, 'Theo dõi'),
          p.onCompare && h('button', { onClick: p.onCompare, className: btn, title: 'Thêm kênh này vào bảng so sánh' }, 'So sánh'),
          h('button', { onClick: function () { p.onMark({ s: m.s ? 0 : 1 }); }, className: btn }, m.s ? 'Bỏ sao' : 'Gắn sao'),
          h('button', { onClick: function () { p.onMark({ h: 1, n: c.name }); p.onClose(); }, className: btn }, 'Ẩn kênh'))));
  }

  function TopNgachV3(props) {
    var React = window.React, h = React.createElement, useState = React.useState, useMemo = React.useMemo, useEffect = React.useEffect;
    var p = props || {}, isPro = !!p.isPro, FREE = 6, UI = window.YT4UI || {};
    var s0 = useState(function () { return Object.assign({}, DEF, lsGet('tn3_filters', {}), { text: '', niche: '' }); }), f = s0[0], setF = s0[1];
    var s1 = useState(null), local = s1[0], setLocal = s1[1];
    var s2 = useState(null), daily = s2[0], setDaily = s2[1];
    var s3 = useState('niche'), tab = s3[0], setTab = s3[1];
    var s4 = useState(''), busy = s4[0], setBusy = s4[1];
    var s5 = useState(''), err = s5[0], setErr = s5[1];
    var s6 = useState(60), lim = s6[0], setLim = s6[1];
    var s7 = useState(''), kw = s7[0], setKw = s7[1];
    var s8 = useState(null), last = s8[0], setLast = s8[1];
    var s9 = useState(false), side = s9[0], setSide = s9[1];
    var sa = useState(function () { return lsGet('tn3_marks', {}) || {}; }), marks = sa[0], setMarks = sa[1];
    var sb = useState(function () { return lsGet('tn3_presets', []) || []; }), presets = sb[0], setPresets = sb[1];
    var sc = useState(null), detail = sc[0], setDetail = sc[1];
    var sd = useState(null), send = sd[0], setSend = sd[1];
    var se = useState(function () { try { return localStorage.getItem('tn3_view') || 'card'; } catch (e) { return 'card'; } }), view = se[0], setView = se[1];
    var sf = useState(null), naming = sf[0], setNaming = sf[1];
    var sg = useState(false), showHidden = sg[0], setShowHidden = sg[1];
    var sh = useState(function () { return lsGet('tn3_hist', []) || []; }), hist = sh[0], setHist = sh[1];
    var deferredText = React.useDeferredValue ? React.useDeferredValue(f.text) : f.text;

    useEffect(function () {
      idbGet('store').then(function (s) { setLocal(s && s.v === 3 ? s : E.emptyStore()); });
      fetchDaily().then(function (j) { if (j) setDaily(j); });
    }, []);
    useEffect(function () { setLim(60); }, [f, tab]);
    function persist(n) { lsSet('tn3_filters', Object.assign({}, n, { text: '', niche: '' })); }
    function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; if (k === 'mode') { n.country = ''; n.niche = ''; } if (k === 'fmt' && v === 'short') n.minDur = 0; persist(n); return n; }); }
    function apply(patch) { setF(function (o) { var n = Object.assign({}, o, patch, { text: '', niche: '' }); persist(n); return n; }); }
    function mark(id, patch) {
      setMarks(function (m) { var n = Object.assign({}, m), cur = Object.assign({}, n[id] || {}, patch); Object.keys(cur).forEach(function (k) { if (!cur[k]) delete cur[k]; }); if (!cur.h) delete cur.n; if (Object.keys(cur).length) n[id] = cur; else delete n[id]; lsSet('tn3_marks', n); return n; });
    }
    var hiddenIds = Object.keys(marks).filter(function (id) { return marks[id].h; }), hiddenKey = hiddenIds.join(',');

    var store = useMemo(function () { var m = E.mergeStore(daily, local); hiddenIds.forEach(function (id) { delete m.channels[id]; }); return m; }, [daily, local, hiddenKey]);
    var pick = f.verdict === 'star' || f.verdict === 'noted' ? f.verdict : '';
    var fb = useMemo(function () {
      var o = Object.assign({}, f, { text: deferredText });
      if (pick) o.verdict = 'all';
      if (pick || f.hideSeen) o.chanFilter = function (c) { var m = marks[c.id] || {}; if (pick === 'star' && !m.s) return false; if (pick === 'noted' && !m.note) return false; if (f.hideSeen && m.seen) return false; return true; };
      return o;
    }, [f, deferredText, pick || f.hideSeen ? marks : null]);
    var D = useMemo(function () { return E.build(store, fb, Date.now()); }, [store, fb]);
    var nStore = Object.keys(store.channels).length;

    function needKey() { if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return true; } return false; }
    async function run(opt) {
      if (busy || needKey()) return; setErr('');
      var S = E.mergeStore(daily, local);
      try {
        var res = await E.scan(Object.assign({ yt: function (path, prm) { return p.yt(path, prm, p.apiKey); }, store: S, f: f, onProgress: setBusy }, opt));
        var P = E.prune(S); await idbSet('store', P); setLocal(P); setLast(res);
        var hh = [{ at: Date.now(), units: res.units, ch: res.newChannels, v: res.newVideos, prof: res.profiled, kind: opt.profileOnly ? 'Phân tích kênh' : opt.custom ? 'Từ khoá riêng' : 'Quét' }].concat(hist).slice(0, 12); setHist(hh); lsSet('tn3_hist', hh);
        if (res.stop === 'quotaExceeded') setErr('API key đã hết quota hôm nay. Phần quét được đã lưu. Thêm key khác trong Cài đặt để quét tiếp.');
        p.showToast && p.showToast('Xong: +' + res.newChannels + ' kênh nhỏ, +' + res.newVideos + ' video, so sánh ' + res.profiled + ' kênh, ' + res.units + ' quota');
      } catch (e) { setErr((e && (e.msg || e.message)) || 'Lỗi quét'); }
      setBusy('');
    }
    function clearAll() { if (!window.confirm('Xoá toàn bộ dữ liệu Top Ngách bạn đã quét trên máy này?')) return; var s = E.emptyStore(); idbSet('store', s); setLocal(s); }
    function savePreset() { var nm = (naming || '').trim(); if (!nm) return; var keep = {}; ['mode', 'country', 'maxSub', 'fmt', 'hours', 'minView', 'minOut', 'maxAge', 'cat', 'minDur', 'verdict', 'cSort', 'vSort', 'nSort', 'perCh'].forEach(function (k) { keep[k] = f[k]; }); var n = presets.filter(function (x) { return x[0] !== nm; }).concat([[nm, keep]]).slice(-12); setPresets(n); lsSet('tn3_presets', n); setNaming(null); p.showToast && p.showToast('Đã lưu bộ lọc "' + nm + '"'); }
    function dropPreset(nm) { var n = presets.filter(function (x) { return x[0] !== nm; }); setPresets(n); lsSet('tn3_presets', n); }
    function openCh(id) { var c = D.allChannels.find(function (x) { return x.id === id; }); if (c) setDetail(id); else window.open('https://www.youtube.com/channel/' + id, '_blank', 'noopener'); }
    function compare(c) { var Y = window.YT4; if (!Y) return; var ok = Y.store.addCompare({ id: c.id, title: c.name }); p.showToast && p.showToast(ok ? 'Đã thêm "' + c.name + '" vào so sánh (' + Y.store.compare().length + '/4). Mở mục Kênh → So sánh.' : 'Kênh đã có trong danh sách so sánh'); }

    // ---------- mảnh giao diện ----------
    var VL = { farm: ['Farm tiền', 'ngoc'], rise: ['Đang lên', 'hoe'], fluke: ['Ăn may', 'do'], cold: ['View thấp', 'cham'], none: ['Không có video đúng định dạng', 'cham'], unk: ['Chưa phân tích', 'nhat'] };
    var CHIP = { ngoc: 'bg-[#2ba640]/20 text-[#6fcf85] border-transparent', hoe: 'bg-[#f2b52c]/15 text-[#f5c451] border-transparent', nhat: 'bg-[#3ea6ff]/15 text-[#7cc3ff] border-transparent', tim: 'bg-[#a970ff]/18 text-[#c9a7ff] border-transparent', do: 'bg-[#ff4e45]/15 text-[#ff8a83] border-transparent', teal: 'bg-[#22c3b5]/15 text-[#5fdccf] border-transparent', cham: 'bg-[#272727] text-[#aaaaaa] border-transparent', moi: 'bg-[#ff4e45] text-white border-transparent' };
    var B = { btn: 'inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full border border-transparent bg-[#323232] text-[12.5px] font-medium text-cham-100 hover:bg-[#424242] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap', sm: 'inline-flex items-center justify-center h-7 px-3 rounded-full border border-transparent bg-[#323232] text-[12px] font-medium text-cham-200 hover:bg-[#424242] transition disabled:opacity-40 cursor-pointer whitespace-nowrap', act: 'inline-flex items-center justify-center gap-1 h-8 px-2.5 rounded-full bg-[#323232] text-[12px] font-medium text-cham-100 hover:bg-[#424242] transition cursor-pointer whitespace-nowrap min-w-0', pri: 'inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-full bg-[#3ea6ff] text-[#0f0f0f] text-[12.5px] font-medium hover:bg-[#65b8ff] active:bg-[#2b8fe0] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap', field: 'h-9 rounded-lg bg-[#121212] border border-[#303030] px-3 text-[12px] text-cham-50 placeholder:text-cham-500 hover:border-[#3f3f3f] focus:border-[#3ea6ff] outline-none transition' };
    var ic = function (n, size) { var I = UI.Icon; return I ? h(I, { name: n, size: size || 13 }) : null; };
    var iconBtn = function (name, on, title, fn, tone) { return h('button', { type: 'button', title: title, 'aria-label': title, 'aria-pressed': !!on, onClick: fn, className: cx('h-6 w-6 rounded-md inline-flex items-center justify-center transition cursor-pointer', on ? (tone || 'bg-[#f5c451] text-[#2a1d00]') : 'bg-[#272727] text-[#aaaaaa] hover:bg-[#3a3a3a] hover:text-[#f1f1f1]') }, ic(name, 13)); };
    var SCAN = ['bg-[#f5c451] text-[#2a1d00] hover:bg-[#f8d27a]', 'bg-[#2ba640] text-white hover:bg-[#33b84a]', 'bg-gradient-to-r from-[#8b5cf6] to-[#22c3b5] text-white hover:brightness-110'];
    var fx = function (x) { return '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); };
    var code = function (mk) { return M[mk] ? M[mk][2] : mk || ''; };
    var pill = function (on, tight) { return cx('h-9 rounded-lg font-medium border whitespace-nowrap transition cursor-pointer', tight ? 'px-1 text-[11.5px]' : 'px-2 text-[12px]', on ? 'bg-[#f1f1f1] text-[#0f0f0f] border-[#f1f1f1]' : 'bg-[#323232] text-[#f1f1f1] border-transparent hover:bg-[#424242]'); };
    var label = function (t, id) { return h('div', { id: id, className: 'h-4 flex items-center text-[11.5px] font-medium text-cham-300 mb-1.5' }, t); };
    var select = function (k, opts, aria) { return h('select', { value: f[k], 'aria-label': aria, onChange: function (e) { var v = e.target.value; set(k, isNaN(+v) || v === '' ? v : +v); }, className: cx(B.field, 'w-full cursor-pointer') }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var badge = function (a) { var v = VL[a.v] || VL.unk; return h('span', { className: 'inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-semibold whitespace-nowrap ' + CHIP[v[1]] }, v[0]); };
    var tag = function (t, tone) { return h('span', { className: 'inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-medium whitespace-nowrap ' + CHIP[tone || 'cham'] }, t); };
    var bar = function (val, color) { return h('div', { className: 'h-1.5 rounded-md bg-[#3f3f3f] overflow-hidden' }, h('div', { className: 'h-full rounded-md ' + (color || 'bg-[#3ea6ff]'), style: { width: Math.max(3, Math.min(100, val)) + '%' } })); };
    var group = function (kids) { return h('div', { className: 'pt-4 first:pt-0 border-t first:border-t-0 border-cham-800 space-y-3' }, kids); };
    var mkOpts = [['', f.mode === 'rpm' ? 'Cả 12 nước RPM cao' : 'Tất cả quốc gia']].concat((f.mode === 'rpm' ? E.RPM_MK : E.RPM_MK.concat(E.ALL_MK.filter(function (k) { return E.RPM_MK.indexOf(k) < 0; }))).map(function (k) { return [k, M[k][1] + ' (' + M[k][2] + ')' + (E.RPM_MK.indexOf(k) >= 0 ? '  ·  RPM ~$' + M[k][4][0] + '–' + M[k][4][1] : '')]; }));
    var runKw = function () { return run({ budget: 1500, custom: kw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }); };
    var pchip = 'h-7 px-2.5 rounded-lg bg-[#272727] text-[11.5px] text-[#f1f1f1] hover:bg-[#3a3a3a] transition cursor-pointer whitespace-nowrap max-w-full truncate';

    var sidebar = h('aside', { 'aria-label': 'Bộ lọc và quét', className: cx('lg:block lg:sticky lg:top-[80px] self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto no-scrollbar rounded-xl', side ? 'block' : 'hidden') },
      h('div', { className: 'yt-card p-4 space-y-4' },
        group([
          h('div', { key: 'p' }, label('Bộ lọc nhanh'),
            h('div', { className: 'flex flex-wrap gap-1.5' },
              BUILTIN.map(function (x) { return h('button', { key: x[0], onClick: function () { apply(x[1]); }, title: 'Áp dụng bộ lọc này', className: pchip }, x[0]); }),
              presets.map(function (x) { return h('span', { key: 'u' + x[0], className: 'inline-flex items-center max-w-full rounded-lg bg-[#1d3a2a] text-[11.5px] text-[#9fe0ad]' }, h('button', { onClick: function () { apply(x[1]); }, className: 'h-7 pl-2.5 pr-1 truncate cursor-pointer hover:text-white' }, x[0]), h('button', { onClick: function () { dropPreset(x[0]); }, title: 'Xoá bộ lọc đã lưu', 'aria-label': 'Xoá bộ lọc ' + x[0], className: 'h-7 w-6 inline-flex items-center justify-center cursor-pointer hover:text-white' }, ic('x', 11))); })),
            naming == null ? h('button', { onClick: function () { setNaming(''); }, className: 'mt-2 text-[11.5px] text-[#7cc3ff] hover:text-[#b0daff] cursor-pointer' }, '+ Lưu bộ lọc đang chọn')
              : h('div', { className: 'mt-2 grid grid-cols-[minmax(0,1fr)_52px] gap-2' }, h('input', { autoFocus: true, value: naming, 'aria-label': 'Tên bộ lọc', onChange: function (e) { setNaming(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') savePreset(); if (e.key === 'Escape') setNaming(null); }, placeholder: 'Tên bộ lọc', className: cx(B.field, 'w-full min-w-0') }), h('button', { onClick: savePreset, disabled: !naming.trim(), className: 'h-9 rounded-lg bg-[#323232] text-[12px] font-medium text-[#f1f1f1] hover:bg-[#424242] disabled:opacity-40 cursor-pointer' }, 'Lưu')))
        ]),
        group([
          h('div', { key: 'm' }, label('Chế độ'),
            h('div', { role: 'radiogroup', className: 'grid grid-cols-2 lg:grid-cols-1 gap-2' },
              [['rpm', 'Ngách RPM cao', '12 nước trả tiền cao: US, UK, CA, AU, CH, NO, DE, NL, SE, JP, KR, FR'], ['all', 'Toàn cầu, mọi content', 'Mọi nước, mọi loại content, không xét RPM']].map(function (m) {
                var on = f.mode === m[0];
                return h('button', { key: m[0], role: 'radio', 'aria-checked': on, onClick: function () { set('mode', m[0]); }, className: cx('text-left rounded-lg border px-3 py-2.5 min-h-[76px] transition cursor-pointer', on ? 'bg-[#272727] border-[#f1f1f1]' : 'bg-[#181818] border-transparent hover:bg-[#272727]') },
                  h('div', { className: cx('text-[12px] font-semibold', on ? 'text-[#f1f1f1]' : 'text-cham-200') }, m[1]), h('div', { className: 'text-[10.5px] mt-0.5 leading-snug text-cham-300' }, m[2]));
              }))),
          h('div', { key: 'c' }, label('Quốc gia'), select('country', mkOpts, 'Quốc gia'))
        ]),
        group([
          h('div', { key: 's' }, label('Quy mô kênh'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [[5000, 'Dưới 5K sub'], [20000, 'Dưới 20K sub']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.maxSub === o[0], onClick: function () { set('maxSub', o[0]); }, className: pill(f.maxSub === o[0]) }, o[1]); }))),
          h('div', { key: 'a' }, label('Tuổi kênh'), h('div', { className: 'grid grid-cols-4 gap-1.5' }, [[0, 'Bất kỳ'], [30, '≤30 ng'], [90, '≤90 ng'], [365, '≤1 năm']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.maxAge === o[0], title: o[0] ? 'Chỉ kênh tạo trong ' + o[0] + ' ngày qua' : 'Không lọc tuổi kênh', onClick: function () { set('maxAge', o[0]); }, className: pill(f.maxAge === o[0], true) }, o[1]); }))),
          h('div', { key: 'f' }, label('Định dạng'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [['long', 'Video dài'], ['short', 'Shorts']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.fmt === o[0], onClick: function () { set('fmt', o[0]); }, className: pill(f.fmt === o[0]) }, o[1]); }))),
          h('div', { key: 't' }, label('Thời gian đăng'), h('div', { className: 'grid grid-cols-3 gap-1.5' }, [[2, '2 giờ'], [12, '12 giờ'], [24, '24 giờ'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.hours === o[0], onClick: function () { set('hours', o[0]); }, className: pill(f.hours === o[0]) }, o[1]); }))),
          h('div', { key: 'v', className: 'grid grid-cols-2 gap-2' },
            h('div', null, label('View tối thiểu'), select('minView', [[0, 'Bất kỳ'], [1000, '1K+'], [5000, '5K+'], [20000, '20K+'], [100000, '100K+'], [1000000, '1M+']], 'View tối thiểu')),
            h('div', null, label('View ÷ sub'), select('minOut', [[1, '≥ 1×'], [2, '≥ 2×'], [5, '≥ 5×'], [10, '≥ 10×'], [50, '≥ 50×']], 'View chia sub tối thiểu')))
        ]),
        group([
          h('div', { key: 'q', className: 'space-y-2' }, label('Quét dữ liệu mới'),
            E.LEVELS.map(function (l, i) {
              return h('button', { key: l[0], disabled: !!busy, onClick: function () { return run({ budget: l[2] }); }, className: cx('w-full h-9 px-3 rounded-lg inline-flex items-center justify-between text-[12.5px] font-medium transition cursor-pointer disabled:opacity-40', SCAN[i]) },
                h('span', null, l[1]), h('span', { className: 'text-[11px] font-normal tabular-nums opacity-75' }, '≈' + N(l[2]) + ' quota'));
            }),
            h('div', { className: 'grid grid-cols-[minmax(0,1fr)_64px] gap-2' },
              h('input', { value: kw, 'aria-label': 'Từ khoá riêng', onChange: function (e) { setKw(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && kw.trim()) return runKw(); }, placeholder: 'Từ khoá riêng, cách nhau dấu phẩy', className: cx(B.field, 'w-full min-w-0') }),
              h('button', { disabled: !!busy || !kw.trim(), onClick: runKw, className: 'h-9 rounded-lg bg-[#323232] text-[12px] font-medium text-[#f1f1f1] hover:bg-[#424242] transition disabled:opacity-40 cursor-pointer' }, 'Quét')))
        ]),
        group([
          h('dl', { key: 'd', className: 'text-[11px] space-y-1.5' },
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Quét tự động'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, daily ? new Date(daily.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + ' · ' + N(Object.keys(daily.channels).length) + ' kênh' : 'chưa có')),
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Bạn đã quét'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, local && local.at ? new Date(local.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + ' · ' + N(Object.keys(local.channels).length) + ' kênh' : 'chưa')),
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Tổng kho'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, N(nStore) + ' kênh · ' + N(Object.keys(store.videos).length) + ' video'))),
          hist.length > 0 && h('details', { key: 'h', className: 'text-[11px]' }, h('summary', { className: 'cursor-pointer text-cham-300 hover:text-cham-50' }, 'Lịch sử quét (' + hist.length + ')'),
            h('ul', { className: 'mt-1.5 space-y-1' }, hist.map(function (x) { return h('li', { key: x.at, className: 'flex justify-between gap-2 text-cham-400 tabular-nums' }, h('span', null, new Date(x.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })), h('span', { className: 'text-cham-200' }, '+' + x.ch + ' kênh · ' + N(x.units) + ' quota')); }))),
          hiddenIds.length > 0 && h('button', { key: 'hid', onClick: function () { setShowHidden(true); }, className: 'block text-[11px] text-cham-300 hover:text-cham-50 underline decoration-cham-600 underline-offset-2 cursor-pointer' }, 'Kênh đã ẩn (' + hiddenIds.length + ')'),
          local && local.at ? h('button', { key: 'x', onClick: clearAll, className: 'block text-[11px] text-dieu-300 hover:text-dieu-200 underline decoration-dieu-700 underline-offset-2 cursor-pointer' }, 'Xoá dữ liệu đã quét trên máy này') : null
        ])));

    var st = D.stats;
    var kpi = function (val, lbl, tone, fn) { return h(fn ? 'button' : 'div', { onClick: fn || null, title: fn ? 'Bấm để xem danh sách' : null, className: cx('bg-[#212121] px-3.5 py-2.5 min-w-0 text-left', fn && 'hover:bg-[#2a2a2a] cursor-pointer transition') }, h('div', { className: cx('font-display text-[16.5px] leading-7 font-bold tabular-nums tracking-tight', tone || 'text-cham-50') }, N(val)), h('div', { className: 'text-[10.5px] text-cham-400 leading-tight' }, lbl)); };
    var goCh = function (v) { return function () { set('verdict', v); setTab('ch'); }; };
    var head = h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-end justify-between gap-3 pr-24' },
        h('div', null,
          h('h1', { className: 'font-display text-[19px] leading-8 font-bold text-cham-50 tracking-tight' }, 'Top Ngách'),
          h('p', { className: 'text-[11px] text-cham-400 mt-1.5' }, f.mode === 'rpm' ? 'Ngách của 12 nước RPM cao, ưu tiên kênh nhỏ có view vượt sub.' : 'Toàn cầu, mọi loại content: cứ view cao mà sub thấp là vào.')),
        h('button', { onClick: function () { setSide(!side); }, 'aria-expanded': side, className: B.btn + ' lg:hidden' }, side ? 'Ẩn bộ lọc' : 'Bộ lọc & quét')),
      busy && h('div', { role: 'status', className: 'rounded-lg border border-hoe-600/50 bg-hoe-950 px-3.5 py-2.5 text-[11.5px] text-hoe-100 flex items-center gap-2.5' }, h('span', { className: 'inline-block w-3.5 h-3.5 rounded-full border-2 border-hoe-800 border-t-hoe-300 animate-spin shrink-0' }), busy),
      err && h('div', { role: 'alert', className: 'rounded-lg border border-dieu-500/50 bg-dieu-950 px-3.5 py-2.5 text-[11.5px] text-dieu-100' }, err),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px bg-[#303030] rounded-xl overflow-hidden' },
        kpi(st.channels, 'kênh nhỏ qua lọc', null, goCh('all')), kpi(st.farm, 'kênh farm tiền', 'text-[#4bc167]', goCh('farm')), kpi(st.rise, 'kênh đang lên', 'text-[#f5c451]', goCh('rise')),
        kpi(st.videosShown, 'video nổ', 'text-[#ff6b63]', function () { setTab('vid'); }), kpi(D.niches.length, 'ngách', 'text-[#c9a7ff]', function () { setTab('niche'); }), kpi(st.fresh, 'kênh mới phát hiện (24 giờ)', 'text-[#5fdccf]', goCh('new'))),
      D.needProfile > 0 && h('div', { className: 'rounded-lg border border-hoe-600/50 bg-hoe-950 px-3.5 py-2.5 text-[11.5px] text-hoe-100 flex flex-wrap items-center justify-between gap-3' },
        h('span', null, N(D.needProfile) + ' kênh có video nổ nhưng chưa được so toàn bộ video, nên chưa biết farm thật hay ăn may.'),
        h('button', { disabled: !!busy, onClick: function () { return run({ profileOnly: true, budget: Math.min(2500, Math.ceil(D.needProfile * 1.7) + 20), maxProfiles: 400 }); }, className: 'inline-flex items-center h-7 px-3 rounded-lg bg-hoe-400 text-hoe-950 text-[11.5px] font-semibold hover:bg-hoe-300 transition disabled:opacity-40 cursor-pointer whitespace-nowrap' }, 'Phân tích ' + Math.min(D.needProfile, 400) + ' kênh (≈' + N(Math.ceil(Math.min(D.needProfile, 400) * 1.7)) + ' quota)')),
      last && h('p', { className: 'text-[11px] text-cham-400 tabular-nums' }, 'Lần quét vừa rồi: ' + last.searches + ' nguồn · +' + last.newChannels + ' kênh mới · +' + last.newVideos + ' video · so sánh ' + last.profiled + ' kênh · ' + N(last.units) + ' quota'));

    var tabs = [['niche', 'Ngách đề xuất', D.niches.length], ['ch', 'Kênh farm tiền', D.channels.length], ['vid', 'Video nổ', D.videos.length]];
    var sel = function (val, on, opts, aria) { return h('select', { value: val, 'aria-label': aria, onChange: on, className: cx(B.field, 'h-8 text-[11.5px] cursor-pointer max-w-full') }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var catOpts = [['', 'Mọi danh mục']].concat(Object.keys(CATS).map(function (k) { return [k, CATS[k][1]]; }));
    var toggle = function (on, text, fn) { return h('button', { type: 'button', 'aria-pressed': !!on, onClick: fn, className: cx('h-8 px-3 rounded-lg text-[11.5px] font-medium whitespace-nowrap transition cursor-pointer', on ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'bg-[#272727] text-[#f1f1f1] hover:bg-[#3a3a3a]') }, text); };
    var toolbar = h('div', { className: 'space-y-3' },
      h('div', { role: 'tablist', className: 'flex max-w-full gap-2 overflow-x-auto no-scrollbar' },
        tabs.map(function (t) { var on = tab === t[0]; return h('button', { key: t[0], role: 'tab', 'aria-selected': on, onClick: function () { setTab(t[0]); }, className: cx('h-8 px-3.5 rounded-lg text-[12px] whitespace-nowrap transition cursor-pointer font-medium', on ? 'bg-[#f1f1f1] text-[#0f0f0f]' : 'text-[#f1f1f1] bg-[#272727] hover:bg-[#424242]') }, t[1], h('span', { className: cx('ml-1.5 text-[11px] tabular-nums', on ? 'text-cham-600' : 'text-cham-500') }, N(t[2]))); })),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('input', { value: f.text, 'aria-label': 'Lọc theo tiêu đề, kênh hoặc ngách', onChange: function (e) { set('text', e.target.value); }, placeholder: 'Lọc theo tiêu đề, kênh, ngách', className: cx(B.field, 'h-8 text-[11.5px] w-full sm:w-48') }),
        tab === 'ch' && sel(f.verdict, function (e) { set('verdict', e.target.value); }, [['good', 'Farm + đang lên + chờ phân tích'], ['farm', 'Chỉ farm tiền'], ['rise', 'Chỉ đang lên'], ['new', 'Chỉ kênh mới phát hiện (24 giờ)'], ['star', 'Chỉ kênh gắn sao'], ['noted', 'Chỉ kênh có ghi chú'], ['unk', 'Chỉ chưa phân tích'], ['fluke', 'Chỉ ăn may'], ['all', 'Tất cả']], 'Lọc theo đánh giá'),
        tab === 'ch' && sel(f.cSort, function (e) { set('cSort', e.target.value); }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['score', 'Xếp: điểm farm'], ['v30', 'Xếp: view 30 ngày'], ['rev', 'Xếp: ước tính doanh thu'], ['out', 'Xếp: view ÷ sub'], ['fresh', 'Xếp: mới phát hiện trước'], ['new', 'Xếp: kênh trẻ nhất']], 'Sắp xếp kênh'),
        tab === 'niche' && sel(f.nSort, function (e) { set('nSort', e.target.value); }, [['out', 'Xếp: view cao sub thấp trước'], ['score', 'Xếp: điểm cơ hội'], ['v30', 'Xếp: view 30 ngày'], ['farm', 'Xếp: nhiều kênh farm'], ['fresh', 'Xếp: nhiều kênh mới']], 'Sắp xếp ngách'),
        tab === 'vid' && sel(f.vSort, function (e) { set('vSort', e.target.value); }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['farm', 'Xếp: kênh farm trước'], ['views', 'Xếp: view cao'], ['out', 'Xếp: view ÷ sub'], ['vph', 'Xếp: view/giờ'], ['new', 'Xếp: mới nhất']], 'Sắp xếp video'),
        tab === 'vid' && sel(f.perCh, function (e) { set('perCh', +e.target.value); }, [[1, 'Tối đa 1 video/kênh'], [2, 'Tối đa 2 video/kênh'], [5, 'Tối đa 5 video/kênh'], [0, 'Không giới hạn']], 'Số video mỗi kênh'),
        tab === 'vid' && f.fmt === 'long' && sel(f.minDur, function (e) { set('minDur', +e.target.value); }, [[0, 'Mọi độ dài'], [480, 'Từ 8 phút (có mid-roll)'], [1200, 'Từ 20 phút']], 'Độ dài tối thiểu'),
        tab !== 'niche' && sel(f.cat, function (e) { set('cat', e.target.value); }, catOpts, 'Danh mục'),
        tab === 'ch' && toggle(f.hideSeen, 'Ẩn kênh đã xem', function () { set('hideSeen', !f.hideSeen); }),
        f.niche && h('button', { onClick: function () { set('niche', ''); }, title: 'Bỏ lọc ngách', className: 'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border border-transparent bg-[#f1f1f1] text-[#0f0f0f] text-[12px] font-medium cursor-pointer hover:bg-white max-w-full' }, h('span', { className: 'truncate' }, 'Ngách: ' + f.niche), ic('x')),
        h('div', { className: 'ml-auto inline-flex items-center gap-2' },
          tab === 'ch' && h('div', { className: 'inline-flex gap-1' }, toggle(view === 'card', 'Thẻ', function () { setView('card'); try { localStorage.setItem('tn3_view', 'card'); } catch (e) { } }), toggle(view === 'table', 'Bảng', function () { setView('table'); try { localStorage.setItem('tn3_view', 'table'); } catch (e) { } })),
          h('button', { onClick: exportCsv, className: B.sm + ' h-8' }, 'Tải CSV'))));

    function exportCsv() {
      if (tab === 'niche') return csvDownload('top-ngach', [['Hạng', 'Ngách', 'Điểm cơ hội', 'Số kênh nhỏ', 'Kênh farm', 'Kênh đang lên', 'Kênh mới 24h', 'Outlier trung vị', 'RPM ước tính tối đa ($)', 'View 30 ngày', 'Quốc gia', 'Danh mục']].concat(NS.map(function (g, i) { return [i + 1, g.name, g.score, g.chans.length, g.farm, g.rise, g.fresh, g.medOut.toFixed(1), g.rpmHi.toFixed(1), g.v30, g.topMk.map(function (k) { return M[k] ? M[k][1] : k; }).join(' / '), CATS[g.topCat] ? CATS[g.topCat][1] : '']; })));
      if (tab === 'ch') return csvDownload('kenh-farm', [['Kênh', 'Link', 'Sub', 'Quốc gia', 'Ngách', 'Đánh giá', 'Điểm farm', 'Video đạt / phân tích', 'View trung vị', 'Outlier trung vị', 'So với ngách (×)', 'View 30 ngày', 'Ước tính 30 ngày ($)', 'Thời lượng TB (phút)', 'Video/tuần', 'Tuổi kênh (ngày)', 'Gắn sao', 'Ghi chú']].concat(D.channels.map(function (c) { var a = c.a, m = marks[c.id] || {}; return [c.name, 'https://www.youtube.com/channel/' + c.id, c.subs, M[c.mk] ? M[c.mk][1] : c.mk, c.niche, (VL[a.v] || VL.unk)[0], a.score, a.n ? a.hits + '/' + a.n : '', a.med || '', a.medOut ? a.medOut.toFixed(1) : '', c.peer ? c.peer.toFixed(1) : '', a.v30 || '', a.rev ? Math.round(a.rev[0]) + '-' + Math.round(a.rev[1]) : '', a.avgDur ? (a.avgDur / 60).toFixed(1) : '', a.cad ? a.cad.toFixed(1) : '', c.cr ? Math.round((Date.now() - c.cr) / 864e5) : '', m.s ? 'x' : '', m.note || '']; })));
      return csvDownload('video-no', [['Tiêu đề', 'Link', 'Kênh', 'Link kênh', 'Sub', 'View', 'Outlier', 'View/giờ', 'Thời lượng', 'Đăng cách đây', 'Quốc gia', 'Ngách', 'Đánh giá kênh']].concat(D.videos.map(function (v) { return [v.title, 'https://youtu.be/' + v.id, v.chName, 'https://www.youtube.com/channel/' + v.ch, v.subs, v.views, v.out.toFixed(1), v.vph, dur(v.dur), age(v.hrs), M[v.mk] ? M[v.mk][1] : v.mk, v.niche, (VL[v.a.v] || VL.unk)[0]]; })));
    }

    var empty = function (msg) { return h('div', { className: 'py-16 px-6 text-center rounded-xl border border-dashed border-cham-700 bg-cham-950/70' }, h('div', { className: 'text-[13px] font-semibold text-cham-50' }, msg), h('p', { className: 'mt-1.5 text-[11.5px] text-cham-300 max-w-md mx-auto leading-relaxed' }, nStore ? 'Thử nới bộ lọc: chọn Dưới 20K sub, bỏ lọc tuổi kênh và danh mục, chuyển sang Toàn cầu, tăng thời gian đăng hoặc hạ mức view ÷ sub.' : 'Kho đang trống. Bấm Quét nhanh ở cột trái để bắt đầu, mỗi lần tốn khoảng 1.500 quota.'), !nStore && h('button', { disabled: !!busy, onClick: function () { return run({ budget: E.LEVELS[0][2] }); }, className: B.pri + ' mt-5' }, 'Quét nhanh ngay')); };
    var lock = function (total) { return !isPro && total > FREE && h('button', { onClick: p.onUpgradePrompt, className: B.btn + ' w-full' }, 'Còn ' + N(total - FREE) + ' mục nữa'); };
    var more = function (total) { return isPro && total > lim && h('div', { className: 'flex gap-2 justify-center pt-1' }, h('button', { onClick: function () { setLim(lim + 120); }, className: B.btn }, 'Hiện thêm 120 (còn ' + N(total - lim) + ')'), h('button', { onClick: function () { setLim(total); }, className: B.btn }, 'Hiện hết ' + N(total))); };
    var cut = function (arr) { return arr.slice(0, isPro ? lim : FREE); };
    var hotCls = function (o) { return o >= 20 ? 'bg-[#ff4e45] text-white' : o >= 5 ? 'bg-[#f5c451] text-[#2a1d00]' : 'bg-black/80 text-[#f1f1f1]'; };
    var thumbs = function (list, top, corner) { return h('div', { className: 'grid grid-cols-3 gap-1.5' }, list.map(function (x) {
      return h('a', { key: x.id, href: 'https://www.youtube.com/watch?v=' + x.id, target: '_blank', rel: 'noopener noreferrer', title: x.title, className: 'relative block rounded-md overflow-hidden bg-cham-950' },
        h('img', { src: thumb(x.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
        h('span', { className: 'absolute bottom-1 left-1 text-[10.5px] font-semibold px-1 rounded bg-black/80 text-cham-50 tabular-nums' }, top(x)),
        h('span', { className: 'absolute top-1 right-1 text-[10.5px] font-bold px-1 rounded tabular-nums ' + hotCls(x.out) }, corner(x)));
    })); };
    var cell = function (l, v, tone) { return h('div', { className: 'yt-cell px-2 py-1.5 min-w-0' }, h('dt', { className: 'text-[11px] text-cham-400 truncate' }, l), h('dd', { className: 'text-[11.5px] font-semibold truncate tabular-nums ' + (tone || 'text-cham-50') }, v)); };

    var NS = D.niches.slice().sort(function (a, b) { return f.nSort === 'score' ? b.score - a.score : f.nSort === 'v30' ? b.v30 - a.v30 : f.nSort === 'farm' ? (b.farm - a.farm) || (b.score - a.score) : f.nSort === 'fresh' ? (b.fresh - a.fresh) || (b.score - a.score) : (b.medOut - a.medOut) || (b.score - a.score); });
    var samples = function (list) { return h('div', { className: 'grid grid-cols-3 gap-1.5' }, list.map(function (x) {
      return h('a', { key: x.id, href: 'https://www.youtube.com/watch?v=' + x.id, target: '_blank', rel: 'noopener noreferrer', title: x.title + ' · ' + N(x.views) + ' view · ' + N(x._subs) + ' sub', className: 'relative block rounded-md overflow-hidden bg-black' },
        h('img', { src: thumb(x.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
        h('span', { className: 'absolute top-1 left-1 text-[10px] font-semibold px-1 rounded bg-black/80 text-[#f1f1f1] tabular-nums' }, N(x._subs) + ' sub'),
        h('span', { className: 'absolute top-1 right-1 text-[10px] font-bold px-1 rounded tabular-nums ' + hotCls(x.out) }, '×' + Math.round(x.out)),
        h('span', { className: 'absolute bottom-1 left-1 text-[10px] font-semibold px-1 rounded bg-black/80 text-[#f1f1f1] tabular-nums' }, N(x.views) + ' view'));
    })); };

    // ---------- Tab Ngách ----------
    var nicheView = !D.niches.length ? empty('Chưa có ngách nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(310px,1fr))]' }, cut(NS).map(function (g, i) {
        var cat = CATS[g.topCat], th = [];
        g.chans.forEach(function (c) { (c.vids || []).forEach(function (v) { th.push(Object.assign({}, v, { _subs: c.subs, title: v.title + ' · ' + c.name })); }); });
        th.sort(function (a, b) { return b.out - a.out; }); th = th.slice(0, 6);
        return h('article', { key: g.name, className: 'yt-card p-3 flex flex-col gap-2' },
          h('div', { className: 'flex items-start gap-3' },
            h('span', { className: cx('shrink-0 h-7 min-w-7 px-1.5 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums', ['bg-[#f5c451] text-[#2a1d00]', 'bg-[#d6dbe2] text-[#1b1f24]', 'bg-[#e0915a] text-[#2a1405]'][i] || 'bg-[#272727] text-[#aaaaaa]') }, i + 1),
            h('div', { className: 'min-w-0 flex-1' },
              h('h3', { className: 'text-[12.5px] font-semibold text-cham-50 truncate', title: g.name }, g.name),
              h('div', { className: 'text-[11px] text-cham-300 truncate' }, (cat ? cat[1] + ' · ' : '') + g.topMk.slice(0, 5).map(code).join(' '))),
            h('div', { className: 'text-right shrink-0', title: f.mode === 'rpm' ? 'Điểm cơ hội = số kênh nhỏ đang farm được (40) + mức view vượt sub (30) + RPM của nước và danh mục (30)' : 'Điểm cơ hội = số kênh nhỏ đang farm được (40) + mức view vượt sub (30) + tổng view 30 ngày (30)' }, h('div', { className: 'font-display text-[16.5px] leading-6 font-bold text-cham-50 tabular-nums' }, g.score), h('div', { className: 'text-[11px] text-cham-400' }, 'điểm cơ hội'))),
          bar(g.score, g.score >= 70 ? 'bg-[#4bc167]' : g.score >= 50 ? 'bg-[#f5c451]' : 'bg-[#3ea6ff]'),
          h('dl', { className: 'grid grid-cols-4 gap-1.5' },
            cell('Kênh nhỏ', N(g.chans.length)), cell('Farm', g.farm, g.farm ? 'text-[#6fcf85]' : ''), cell('Đang lên', g.rise, g.rise ? 'text-[#f5c451]' : ''), cell('View÷sub', fx(g.medOut))),
          h('div', { className: 'flex justify-between items-center gap-2 text-[11px] text-cham-300 tabular-nums' }, h('span', null, 'RPM tới ~$' + g.rpmHi.toFixed(1)), g.fresh > 0 && tag('+' + g.fresh + ' kênh mới', 'moi'), h('span', null, 'View 30 ngày ' + N(g.v30))),
          th.length > 0 && h('div', { className: 'space-y-1.5' }, h('div', { className: 'text-[11px] text-cham-400' }, 'Video mẫu view cao (' + th.length + ')'), samples(th)),
          h('div', { className: 'flex gap-1.5 mt-auto pt-1' },
            h('button', { onClick: function () { set('niche', g.name); setTab('ch'); }, className: B.act + ' flex-1' }, 'Xem ' + g.chans.length + ' kênh'),
            h('button', { onClick: function () { set('niche', g.name); setTab('vid'); }, className: B.act }, 'Video'),
            p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(g.name); }, title: 'Phân tích từ khoá này ở mục Khám phá', className: B.act }, 'Từ khoá'),
            UI.ClaudeBox && h('button', { onClick: function () { setSend(g); }, title: 'Gom kênh farm và video mẫu của ngách thành prompt cho Claude', className: B.act + ' !bg-[#3a2a5c] !text-[#d4bbff] hover:!bg-[#4a3673]' }, 'Gửi Claude')));
      })),
      more(D.niches.length), lock(D.niches.length));

    // ---------- Tab Kênh ----------
    var chCard = function (c, i) {
      var a = c.a, ok = a.n > 0, farm = a.v === 'farm', ageD = c.cr ? Math.round((Date.now() - c.cr) / 864e5) : null, m = marks[c.id] || {};
      return h('article', { key: c.id, className: cx('yt-card p-3 flex flex-col gap-2 transition', m.seen && !m.s && 'opacity-70 hover:opacity-100', m.s && '!border-[#f5c451]/60') },
        h('div', { className: 'flex items-start gap-3' },
          h('span', { className: 'shrink-0 h-7 min-w-7 px-1.5 rounded-md flex items-center justify-center text-[11px] font-bold tabular-nums bg-cham-800 text-cham-200' }, i + 1),
          h('div', { className: 'min-w-0 flex-1' },
            h('button', { onClick: function () { setDetail(c.id); }, title: 'Xem chi tiết kênh: ' + c.name, className: 'block max-w-full text-left text-[12.5px] font-semibold text-cham-50 hover:text-[#7cc3ff] truncate cursor-pointer' }, c.name),
            h('div', { className: 'text-[11px] text-cham-300 truncate tabular-nums', title: c.niche }, N(c.subs) + ' sub · ' + code(c.mk) + ' · ' + c.niche)),
          ok && farm ? h('span', { className: 'seal stamp', title: 'Điểm farm ' + a.score + '/100' }, h('b', null, a.score), h('span', null, 'Farm'))
            : ok ? h('div', { className: 'text-right shrink-0' }, h('div', { className: 'font-display text-[16.5px] leading-6 font-bold tabular-nums text-cham-50' }, a.score), h('div', { className: 'text-[11px] text-cham-400' }, 'điểm farm')) : null),
        h('div', { className: 'flex items-start gap-2' }, h('div', { className: 'flex-1 min-w-0 flex flex-wrap items-center gap-1.5 min-h-7' }, c.isNew && tag('Mới', 'moi'), badge(a), ageD != null && ageD < 180 ? tag(ageD + ' ngày tuổi', 'tim') : null, a.mid ? tag('Có mid-roll', 'teal') : null, m.seen && tag('Đã xem')),
          h('span', { className: 'shrink-0 inline-flex gap-1' },
            iconBtn('star', m.s, m.s ? 'Bỏ sao' : 'Gắn sao kênh ngon', function () { mark(c.id, { s: m.s ? 0 : 1 }); }),
            iconBtn('note', m.note, m.note ? 'Sửa ghi chú' : 'Thêm ghi chú', function () { setDetail(c.id); }, 'bg-[#3ea6ff] text-[#0f0f0f]'),
            iconBtn('hide', false, 'Ẩn kênh này khỏi kết quả', function () { mark(c.id, { h: 1, n: c.name }); p.showToast && p.showToast('Đã ẩn "' + c.name + '". Xem lại ở cuối cột trái: Kênh đã ẩn.'); }))),
        m.note && h('p', { className: 'text-[11px] text-[#b0daff] leading-snug line-clamp-2', title: m.note }, 'Ghi chú: ' + m.note),
        ok ? h('dl', { className: 'grid grid-cols-3 gap-1.5' },
          cell('Video đạt', a.hits + '/' + a.n + ' · ' + Math.round(a.hr * 100) + '%', a.hr >= 0.5 ? 'text-[#6fcf85]' : ''),
          cell('View trung vị', N(a.med) + ' · ' + fx(a.medOut), a.medOut >= 1 ? 'text-[#6fcf85]' : ''),
          cell('So với ngách', c.peer ? '×' + c.peer.toFixed(1) : '–', c.peer >= 1.5 ? 'text-[#f5c451]' : ''),
          cell('View 30 ngày', N(a.v30)),
          cell('Độ dài · nhịp', (f.fmt === 'short' ? Math.round(a.avgDur) + 's' : Math.round(a.avgDur / 60) + 'p') + ' · ' + a.cad.toFixed(1) + '/tuần'),
          cell('Ước tính/tháng', a.eligible ? '$' + N(Math.round(a.rev[0])) + '–' + N(Math.round(a.rev[1])) : 'Chưa đủ 1K', a.eligible ? 'text-[#6fcf85]' : 'text-cham-400'))
          : h('p', { className: 'yt-cell text-[11px] text-cham-200 px-3 py-2.5 leading-relaxed' }, a.v === 'unk' ? 'Mới thấy ' + c.vids.length + ' video nổ (tốt nhất ×' + Math.round(c.bestOut) + '). Bấm Phân tích ở dải vàng phía trên để so toàn bộ video của kênh.' : 'Không có video ' + (f.fmt === 'short' ? 'Shorts' : 'dài') + ' trong 60 ngày.'),
        c.vids.length > 0 && thumbs(c.vids.slice(0, 3), function (v) { return N(v.views); }, function (v) { return '×' + Math.round(v.out); }),
        h('div', { className: 'flex gap-1.5 mt-auto pt-1' },
          h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', onClick: function () { mark(c.id, { seen: Date.now() }); }, className: B.act + ' flex-1' }, 'Mở kênh', ic('ext')),
          h('button', { onClick: function () { setDetail(c.id); }, className: B.act }, 'Chi tiết'),
          p.onOpenChannel && h('button', { onClick: function () { mark(c.id, { seen: Date.now() }); p.onOpenChannel(c.id, 'clone'); }, title: 'Bóc công thức kênh này thành hồ sơ clone', className: B.act }, 'Clone'),
          p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(c.best ? toApp(c.best) : { channel: c.name, channelId: c.id, subs: c.subs }); }, className: B.act }, 'Theo dõi')));
    };
    var chTable = function () {
      var T = UI.Table; if (!T) return null;
      var cols = [
        { k: 'name', t: 'Kênh', v: function (c) { return c.name.toLowerCase(); }, cls: 'min-w-[200px]', r: function (c) { var m = marks[c.id] || {}; return h('div', { className: 'min-w-0' }, h('button', { onClick: function () { setDetail(c.id); }, className: 'text-left text-[12px] font-medium text-cham-50 hover:text-[#7cc3ff] cursor-pointer' }, (m.s ? '★ ' : '') + c.name), h('div', { className: 'text-[11px] text-cham-400 truncate max-w-[260px]' }, c.niche + (m.note ? ' · ' + m.note : ''))); } },
        { k: 'subs', t: 'Sub', right: true, v: function (c) { return c.subs; }, r: function (c) { return N(c.subs); } },
        { k: 'mk', t: 'Nước', v: function (c) { return code(c.mk); } },
        { k: 'age', t: 'Tuổi kênh', right: true, v: function (c) { return c.cr ? Date.now() - c.cr : 9e15; }, r: function (c) { if (!c.cr) return '–'; var d = Math.round((Date.now() - c.cr) / 864e5); return d < 365 ? d + ' ngày' : (d / 365).toFixed(1) + ' năm'; } },
        { k: 'v', t: 'Đánh giá', v: function (c) { return ['farm', 'rise', 'unk', 'fluke', 'cold', 'none'].indexOf(c.a.v); }, r: function (c) { return h('span', { className: 'inline-flex gap-1' }, c.isNew && tag('Mới', 'moi'), badge(c.a)); } },
        { k: 'score', t: 'Điểm', right: true, v: function (c) { return c.a.score; }, r: function (c) { return c.a.n ? c.a.score : '–'; } },
        { k: 'hr', t: 'Video đạt', right: true, v: function (c) { return c.a.hr || 0; }, r: function (c) { return c.a.n ? c.a.hits + '/' + c.a.n : '–'; } },
        { k: 'med', t: 'View trung vị', right: true, v: function (c) { return c.a.med || 0; }, r: function (c) { return c.a.n ? N(c.a.med) : '–'; } },
        { k: 'out', t: '× sub', right: true, v: function (c) { return c.a.n ? c.a.medOut : c.bestOut / 100; }, r: function (c) { return c.a.n ? fx(c.a.medOut) : '–'; } },
        { k: 'v30', t: 'View 30 ngày', right: true, v: function (c) { return c.a.v30 || 0; }, r: function (c) { return c.a.n ? N(c.a.v30) : '–'; } },
        { k: 'rev', t: 'Ước tính/tháng', right: true, v: function (c) { return c.a.eligible && c.a.rev ? c.a.rev[1] : 0; }, r: function (c) { return c.a.n && c.a.eligible ? '$' + N(Math.round(c.a.rev[0])) + '–' + N(Math.round(c.a.rev[1])) : '–'; } },
        { k: 'cad', t: 'Video/tuần', right: true, v: function (c) { return c.a.cad || 0; }, r: function (c) { return c.a.n ? c.a.cad.toFixed(1) : '–'; } },
        { k: 'act', t: '', r: function (c) { var m = marks[c.id] || {}; return h('span', { className: 'inline-flex gap-1 justify-end' }, iconBtn('star', m.s, 'Gắn sao', function () { mark(c.id, { s: m.s ? 0 : 1 }); }), iconBtn('hide', false, 'Ẩn kênh', function () { mark(c.id, { h: 1, n: c.name }); }), h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', onClick: function () { mark(c.id, { seen: Date.now() }); }, title: 'Mở kênh', className: 'h-6 w-6 rounded-md inline-flex items-center justify-center bg-[#272727] text-[#aaaaaa] hover:bg-[#3a3a3a] hover:text-[#f1f1f1]' }, ic('ext'))); } }
      ];
      return h('div', { className: 'yt-card p-2' }, h(T, { cols: cols, rows: D.channels, rowKey: function (c) { return c.id; }, limit: isPro ? lim : FREE }));
    };
    var chView = !D.channels.length ? empty('Chưa có kênh nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      view === 'table' ? chTable() : h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(310px,1fr))]' }, cut(D.channels).map(chCard)),
      more(D.channels.length), lock(D.channels.length));

    // ---------- Tab Video ----------
    var vidView = !D.videos.length ? empty('Chưa có video nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' }, cut(D.videos).map(function (v) {
        var saved = p.isSaved && p.isSaved(v.id), farm = v.a.v === 'farm', chip = 'absolute text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums';
        return h('article', { key: v.id, className: 'group flex flex-col gap-2.5 rounded-xl bg-[#181818]/95 p-2 hover:bg-[#212121] transition' },
          h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', className: 'relative block rounded-xl overflow-hidden bg-[#272727]' },
            h('img', { src: thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
            h('span', { className: cx(chip, 'top-2 left-2 bg-black/80 text-cham-50') }, code(v.mk) + ' · ' + N(v.subs) + ' sub'),
            h('span', { className: cx(chip, 'top-2 right-2 font-bold', hotCls(v.out)), title: 'View chia sub' }, fx(v.out)),
            (farm || v.isNew) && h('span', { className: 'absolute bottom-2 left-2 inline-flex gap-1' }, v.isNew && h('span', { className: 'text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#ff4e45] text-white' }, 'Mới'), farm && h('span', { className: 'text-[11px] font-semibold px-1.5 py-0.5 rounded-md bg-[#1d3a2a] text-[#9fe0ad]' }, 'Kênh farm')),
            h('span', { className: cx(chip, 'bottom-2 right-2 bg-black/80 text-cham-50 font-medium') }, dur(v.dur))),
          h('div', { className: 'flex-1 flex flex-col gap-1 px-0.5' },
            h('div', { className: 'text-[11.5px] font-medium leading-snug text-cham-50 line-clamp-2', title: v.title }, v.title),
            h('button', { onClick: function () { openCh(v.ch); }, title: 'Xem chi tiết kênh', className: 'text-left text-[11px] text-cham-300 truncate hover:text-[#7cc3ff] cursor-pointer' }, v.chName + ' · ' + v.niche),
            h('dl', { className: 'grid grid-cols-3 gap-1 text-[11px] mt-auto pt-1.5' },
              h('div', null, h('dt', { className: 'text-cham-400' }, 'View'), h('dd', { className: 'text-cham-50 font-semibold tabular-nums' }, N(v.views))),
              h('div', null, h('dt', { className: 'text-cham-400' }, 'View/giờ'), h('dd', { className: 'text-[#f5c451] font-semibold tabular-nums' }, N(v.vph))),
              h('div', { className: 'text-right' }, h('dt', { className: 'text-cham-400' }, 'Đăng'), h('dd', { className: 'text-cham-200 tabular-nums' }, age(v.hrs) + ' trước'))),
            h('div', { className: 'flex gap-1.5 pt-1.5' },
              p.onToggleSave && h('button', { onClick: function () { p.onToggleSave(toApp(v)); }, 'aria-pressed': !!saved, className: cx(B.sm, saved && '!bg-[#f1f1f1] !text-[#0f0f0f]') }, saved ? 'Đã lưu' : 'Lưu'),
              p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(toApp(v)); }, className: B.sm }, 'Theo dõi kênh'),
              p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(v.title); }, className: B.sm + ' ml-auto' }, 'Tương tự'))));
      })),
      more(D.videos.length), lock(D.videos.length));

    // ---------- Cửa sổ nổi ----------
    var dc = detail && D.allChannels.find(function (x) { return x.id === detail; });
    var detailModal = dc && h(ChannelDetail, { key: dc.id, c: dc, raw: (store.channels[dc.id] || {}).u, short: f.fmt === 'short', mark: marks[dc.id], onMark: function (patch) { mark(dc.id, patch); }, onClose: function () { setDetail(null); },
      onOpen: p.onOpenChannel ? function (id, t) { mark(id, { seen: Date.now() }); setDetail(null); p.onOpenChannel(id, t); } : null,
      onFollow: p.onAddCompetitor ? function () { p.onAddCompetitor(dc.best ? toApp(dc.best) : { channel: dc.name, channelId: dc.id, subs: dc.subs }); } : null,
      onCompare: function () { compare(dc); } });
    var sendModal = send && UI.Modal && h(UI.Modal, { title: 'Gửi ngách "' + send.name + '" sang Claude', wide: true, onClose: function () { setSend(null); } },
      h('p', { className: 'text-[11.5px] text-cham-300 mb-3 leading-relaxed' }, 'Prompt gồm số liệu ngách, ' + Math.min(15, send.chans.length) + ' kênh nhỏ và video mẫu view cao. Claude sẽ phân tích vì sao ngách chạy và lập kế hoạch 15 video đầu tiên.'),
      h(UI.ClaudeBox, { key: send.name, kind: 'niche', title: 'Phân tích ngách: ' + send.name, file: 'ngach-' + send.name.replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40), prompt: nichePrompt(send, f) }));
    var hiddenModal = showHidden && UI.Modal && h(UI.Modal, { title: 'Kênh đã ẩn (' + hiddenIds.length + ')', onClose: function () { setShowHidden(false); } },
      !hiddenIds.length ? h('p', { className: 'text-[12px] text-cham-300' }, 'Không còn kênh nào bị ẩn.') : h('ul', { className: 'space-y-1.5 max-h-[60vh] overflow-y-auto' }, hiddenIds.map(function (id) {
        return h('li', { key: id, className: 'flex items-center justify-between gap-3 text-[12px]' }, h('a', { href: 'https://www.youtube.com/channel/' + id, target: '_blank', rel: 'noopener noreferrer', className: 'text-cham-100 hover:text-white truncate' }, marks[id].n || id), h('button', { onClick: function () { mark(id, { h: 0 }); }, className: B.sm }, 'Hiện lại'));
      })));

    if (!local) return h('div', { role: 'status', className: 'py-16 text-center text-[11.5px] text-cham-300' }, 'Đang mở kho Top Ngách…');
    return h('section', { className: 'grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]' },
      sidebar,
      h('div', { className: 'space-y-4 min-w-0' }, head, toolbar, tab === 'niche' ? nicheView : tab === 'ch' ? chView : vidView),
      detailModal, sendModal, hiddenModal);
  }
  window.TopNgachV3 = TopNgachV3;
})();
