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
      Object.keys(s.videos || {}).forEach(function (id) { var x = s.videos[id], y = o.videos[id]; if (!y || (x.vw || 0) >= (y.vw || 0)) o.videos[id] = x; });
      Object.keys(s.channels || {}).forEach(function (id) {
        var x = s.channels[id], y = o.channels[id];
        if (!y) o.channels[id] = x;
        else { var n = Object.assign({}, y, x); if ((y.at || 0) > (x.at || 0)) { n.u = y.u; n.at = y.at; } n.seen = Math.max(x.seen || 0, y.seen || 0); o.channels[id] = n; }
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
  // f: {mode:'rpm'|'all', country, maxSub, fmt:'long'|'short', hours, minView, minOut, text, vSort, cSort, verdict, perCh, niche}
  function build(store, f, now) {
    now = now || Date.now(); var short = f.fmt === 'short', text = String(f.text || '').toLowerCase().trim();
    var CH = store.channels, A = {};
    Object.keys(CH).forEach(function (id) { var c = CH[id]; if (c.s == null || c.s > f.maxSub || !inMarket(c.mk, f)) return; A[id] = analyze(c, now, short); });
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
      if (f.niche && c.nc !== f.niche) return;
      if (text && (v.ti + ' ' + c.n + ' ' + c.nc).toLowerCase().indexOf(text) < 0) return;
      vids.push({ id: id, title: v.ti, t: v.t, views: v.vw, dur: v.du, cat: v.cat || c.cat, ch: v.ch, chName: c.n, subs: c.s, mk: c.mk, niche: c.nc, hrs: hrs, vph: Math.round(v.vw / hrs), out: out, a: A[v.ch] });
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
      chans.push({ id: id, name: c.n, subs: c.s, mk: c.mk, niche: c.nc, cat: c.cat, cr: c.cr, a: a, vids: vv, best: best, bestOut: bestOut, peer: a.n && nMed[c.nc] ? a.medOut / Math.max(nMed[c.nc], 0.01) : null });
    });
    var stats = { channels: chans.length, farm: 0, rise: 0, unk: 0, fluke: 0, videos: vids.length, markets: new Set(chans.map(function (c) { return c.mk; })).size };
    chans.forEach(function (c) { if (stats[c.a.v] != null) stats[c.a.v]++; });
    // ngách đề xuất
    var NG = {};
    chans.forEach(function (c) {
      var g = NG[c.niche] = NG[c.niche] || { name: c.niche, chans: [], farm: 0, rise: 0, outs: [], v30: 0, mks: {}, cats: {}, rpm: [] };
      g.chans.push(c); if (c.a.v === 'farm') g.farm++; if (c.a.v === 'rise') g.rise++;
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
    var cl = chans.filter(function (c) { return vf === 'all' ? true : vf === 'good' ? (c.a.v === 'farm' || c.a.v === 'rise' || c.a.v === 'unk') : c.a.v === vf; });
    var cs = f.cSort || 'smart';
    if (cs === 'score') cl.sort(function (a, b) { return b.a.score - a.a.score || b.bestOut - a.bestOut; });
    else if (cs === 'v30') cl.sort(function (a, b) { return (b.a.v30 || 0) - (a.a.v30 || 0); });
    else if (cs === 'new') cl.sort(function (a, b) { return (b.cr || 0) - (a.cr || 0); });
    else if (cs === 'out') cl.sort(function (a, b) { return b.bestOut - a.bestOut; });
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
              S.channels[x.id] = Object.assign({}, old || {}, { id: x.id, n: x.snippet.title, s: sub, c: x.snippet.country || '', cr: Date.parse(x.snippet.publishedAt) || 0, vc: +x.statistics.videoCount || 0, mk: mk, nc: (old && old.nc) || sv.label || 'Khác', seen: now });
            });
          } catch (e) { if (e.code === 'BUDGET' || e.code === 'quotaExceeded') { stop = e.code; return; } }
        }
        vs.forEach(function (v) {
          var c = S.channels[v.snippet.channelId]; if (!c) return;
          var views = +v.statistics.viewCount || 0, du = iso(v.contentDetails.duration), t = Date.parse(v.snippet.publishedAt);
          if (raw) raw.push({ ch: c.id, x: [views, du, t] });
          if (!c.cat && v.snippet.categoryId) c.cat = v.snippet.categoryId;
          if (views < 500 || views < c.s * 0.5) return;
          if (!S.videos[v.id]) newV++;
          S.videos[v.id] = { id: v.id, t: t, ti: v.snippet.title, ch: c.id, vw: views, du: du, cat: v.snippet.categoryId || '', mk: c.mk, nc: c.nc };
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
    version: '3.0.0', M: M, CATS: CATS, RPM_MK: RPM_MK, ALL_MK: ALL_MK, CC: CC, VERDICT: VERDICT, LEVELS: LEVELS, SHORT_MAX: SHORT_MAX, CAP_SUB: CAP_SUB,
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
  var DEF = { mode: 'rpm', country: '', maxSub: 5000, fmt: 'long', hours: 168, minView: 1000, minOut: 2, text: '', vSort: 'smart', cSort: 'smart', verdict: 'good', perCh: 2, niche: '' };
  function toApp(v) { return { id: v.id, title: v.title, channel: v.chName, channelId: v.ch, subs: v.subs, views: v.views, dur: v.dur, thumb: thumb(v.id), published: new Date(v.t).toISOString(), vph: v.vph }; }
  function csvDownload(name, rows) {
    var b = new Blob(['﻿' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n')], { type: 'text/csv' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
  }

  function TopNgachV3(props) {
    var React = window.React, h = React.createElement, useState = React.useState, useMemo = React.useMemo, useEffect = React.useEffect;
    var p = props || {}, isPro = !!p.isPro, FREE = 6;
    var s0 = useState(function () { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem('tn3_filters') || '{}'), { text: '', niche: '' }); } catch (e) { return Object.assign({}, DEF); } }), f = s0[0], setF = s0[1];
    var s1 = useState(null), local = s1[0], setLocal = s1[1];
    var s2 = useState(null), daily = s2[0], setDaily = s2[1];
    var s3 = useState('niche'), tab = s3[0], setTab = s3[1];
    var s4 = useState(''), busy = s4[0], setBusy = s4[1];
    var s5 = useState(''), err = s5[0], setErr = s5[1];
    var s6 = useState(60), lim = s6[0], setLim = s6[1];
    var s7 = useState(''), kw = s7[0], setKw = s7[1];
    var s8 = useState(null), last = s8[0], setLast = s8[1];
    var s9 = useState(false), side = s9[0], setSide = s9[1];
    var deferredText = React.useDeferredValue ? React.useDeferredValue(f.text) : f.text;

    useEffect(function () {
      idbGet('store').then(function (s) { setLocal(s && s.v === 3 ? s : E.emptyStore()); });
      fetch('/data/top_ngach.json?h=' + new Date().toISOString().slice(0, 13)).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { if (j && j.v === 3) setDaily(j); }).catch(function () { });
    }, []);
    useEffect(function () { setLim(60); }, [f, tab]);
    function set(k, v) { setF(function (o) { var n = Object.assign({}, o); n[k] = v; if (k === 'mode') { n.country = ''; n.niche = ''; } try { var keep = Object.assign({}, n, { text: '', niche: '' }); localStorage.setItem('tn3_filters', JSON.stringify(keep)); } catch (e) { } return n; }); }

    var store = useMemo(function () { return E.mergeStore(daily, local); }, [daily, local]);
    var fb = useMemo(function () { return Object.assign({}, f, { text: deferredText }); }, [f, deferredText]);
    var D = useMemo(function () { return E.build(store, fb, Date.now()); }, [store, fb]);
    var nStore = Object.keys(store.channels).length;

    function needKey() { if (!p.apiKey && !(p.ytKeyManager && p.ytKeyManager.getActiveKey())) { p.onOpenApiModal && p.onOpenApiModal(); return true; } return false; }
    async function run(opt) {
      if (busy || needKey()) return; setErr('');
      var S = E.mergeStore(daily, local);
      try {
        var res = await E.scan(Object.assign({ yt: function (path, prm) { return p.yt(path, prm, p.apiKey); }, store: S, f: f, onProgress: setBusy }, opt));
        var P = E.prune(S); await idbSet('store', P); setLocal(P); setLast(res);
        if (res.stop === 'quotaExceeded') setErr('API key đã hết quota hôm nay — đã lưu phần quét được. Thêm key khác trong phần cài đặt API để quét tiếp.');
        p.showToast && p.showToast('Xong: +' + res.newChannels + ' kênh nhỏ • +' + res.newVideos + ' video • so sánh ' + res.profiled + ' kênh • ' + res.units + ' quota');
      } catch (e) { setErr((e && (e.msg || e.message)) || 'Lỗi quét'); }
      setBusy('');
    }
    function clearAll() { if (!window.confirm('Xoá toàn bộ dữ liệu Top Ngách bạn đã quét trên máy này?')) return; var s = E.emptyStore(); idbSet('store', s); setLocal(s); }

    // ---------- mảnh giao diện (Đông Hồ: chàm · điệp · son · hoè) ----------
    var VL = { farm: ['Farm tiền', 'ngoc'], rise: ['Đang lên', 'hoe'], fluke: ['Ăn may', 'cham'], cold: ['View thấp', 'cham'], none: ['Không có video đúng định dạng', 'cham'], unk: ['Chưa phân tích', 'nhat'] };
    var CHIP = { ngoc: 'bg-ngoc-400/15 text-ngoc-200 border-ngoc-400/35', hoe: 'bg-hoe-400/12 text-hoe-300 border-hoe-400/30', nhat: 'bg-nhat-400/12 text-nhat-200 border-nhat-400/30', tim: 'bg-hoaca-500/15 text-hoaca-200 border-hoaca-400/30', cham: 'bg-white/[0.05] text-cham-300 border-white/10' };
    var B = { btn: 'inline-flex items-center justify-center gap-1.5 h-7 px-3 rounded-lg border border-white/10 bg-white/[0.04] text-[10.5px] font-medium text-cham-100 hover:border-white/20 hover:bg-white/[0.08] hover:text-cham-50 transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap', sm: 'inline-flex items-center justify-center h-7 px-3 rounded-md border border-white/10 bg-white/[0.04] text-[10.5px] font-medium text-cham-200 hover:border-white/20 hover:text-cham-50 transition disabled:opacity-40 cursor-pointer whitespace-nowrap', pri: 'inline-flex items-center justify-center gap-1.5 h-8 px-4 rounded-lg bg-[#e3b55a] text-[#231a08] text-[10.5px] font-semibold shadow-[0_4px_12px_-6px_rgba(0,0,0,.6)] hover:bg-[#ecc271] active:bg-[#d4a548] transition disabled:opacity-40 disabled:pointer-events-none cursor-pointer whitespace-nowrap', field: 'h-8 rounded-lg bg-[#18191c] border border-white/10 px-3 text-[10.5px] text-cham-50 placeholder:text-cham-500 hover:border-white/20 focus:border-hoe-400 outline-none transition' };
    var ic = function (n) { var I = window.YT4UI && window.YT4UI.Icon; return I ? h(I, { name: n, size: 13 }) : null; };
    var fx = function (x) { return '×' + (x >= 10 ? Math.round(x) : x.toFixed(1)); };
    var code = function (mk) { return M[mk] ? M[mk][2] : mk || ''; };
    var pill = function (on) { return cx('h-7 px-2 rounded-md text-[10.5px] font-medium border whitespace-nowrap transition cursor-pointer', on ? 'bg-la-600 text-[#eef8f0] border-la-500 font-semibold' : 'bg-white/[0.03] text-cham-200 border-white/10 hover:border-white/25 hover:text-cham-50'); };
    var label = function (t, id) { return h('div', { id: id, className: 'text-[10.5px] font-medium text-cham-300 mb-1.5' }, t); };
    var select = function (k, opts, aria) { return h('select', { value: f[k], 'aria-label': aria, onChange: function (e) { var v = e.target.value; set(k, isNaN(+v) || v === '' ? v : +v); }, className: cx(B.field, 'w-full cursor-pointer') }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var badge = function (a) { var v = VL[a.v] || VL.unk; return h('span', { className: 'inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-semibold whitespace-nowrap ' + CHIP[v[1]] }, v[0]); };
    var tag = function (t, tone) { return h('span', { className: 'inline-flex items-center h-6 px-2 rounded-md border text-[11px] font-medium whitespace-nowrap ' + CHIP[tone || 'cham'] }, t); };
    var bar = function (val, color) { return h('div', { className: 'h-1.5 rounded-md bg-cham-950 overflow-hidden' }, h('div', { className: 'h-full rounded-md ' + (color || 'bg-ngoc-400'), style: { width: Math.max(3, Math.min(100, val)) + '%' } })); };
    var group = function (kids) { return h('div', { className: 'pt-4 first:pt-0 border-t first:border-t-0 border-cham-800 space-y-3' }, kids); };
    var mkOpts = [['', f.mode === 'rpm' ? 'Cả 12 nước RPM cao' : 'Tất cả quốc gia']].concat((f.mode === 'rpm' ? E.RPM_MK : E.RPM_MK.concat(E.ALL_MK.filter(function (k) { return E.RPM_MK.indexOf(k) < 0; }))).map(function (k) { return [k, M[k][1] + ' (' + M[k][2] + ')' + (E.RPM_MK.indexOf(k) >= 0 ? '  ·  RPM ~$' + M[k][4][0] + '–' + M[k][4][1] : '')]; }));
    var runKw = function () { return run({ budget: 1500, custom: kw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }); };

    var sidebar = h('aside', { 'aria-label': 'Bộ lọc và quét', className: cx('lg:block lg:sticky lg:top-[80px] self-start lg:max-h-[calc(100vh-96px)] lg:overflow-y-auto no-scrollbar rounded-xl', side ? 'block' : 'hidden') },
      h('div', { className: 'yt-card p-4 space-y-4' },
        group([
          h('div', { key: 'm' }, label('Chế độ'),
            h('div', { role: 'radiogroup', className: 'grid grid-cols-2 lg:grid-cols-1 gap-2' },
              [['rpm', 'Ngách RPM cao', '12 nước trả tiền cao: US, UK, CA, AU, CH, NO, DE, NL, SE, JP, KR, FR'], ['all', 'Toàn cầu, mọi content', 'Mọi nước, mọi loại content, không xét RPM']].map(function (m) {
                var on = f.mode === m[0];
                return h('button', { key: m[0], role: 'radio', 'aria-checked': on, onClick: function () { set('mode', m[0]); }, className: cx('text-left rounded-lg border px-3 py-2.5 transition cursor-pointer', on ? 'bg-white/[0.03] border-la-500 shadow-[inset_0_0_0_1px_rgba(81,147,95,.6)]' : 'bg-white/[0.03] border-white/10 hover:border-white/25') },
                  h('div', { className: cx('text-[10.5px] font-semibold', on ? 'text-la-300' : 'text-cham-100') }, m[1]), h('div', { className: cx('text-[10.5px] mt-0.5 leading-snug', 'text-cham-300') }, m[2]));
              }))),
          h('div', { key: 'c' }, label('Quốc gia'), select('country', mkOpts, 'Quốc gia'))
        ]),
        group([
          h('div', { key: 's' }, label('Quy mô kênh'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [[5000, 'Dưới 5K sub'], [20000, 'Dưới 20K sub']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.maxSub === o[0], onClick: function () { set('maxSub', o[0]); }, className: pill(f.maxSub === o[0]) }, o[1]); }))),
          h('div', { key: 'f' }, label('Định dạng'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [['long', 'Video dài'], ['short', 'Shorts']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.fmt === o[0], onClick: function () { set('fmt', o[0]); }, className: pill(f.fmt === o[0]) }, o[1]); }))),
          h('div', { key: 't' }, label('Thời gian đăng'), h('div', { className: 'grid grid-cols-3 gap-1.5' }, [[2, '2 giờ'], [12, '12 giờ'], [24, '24 giờ'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày']].map(function (o) { return h('button', { key: o[0], 'aria-pressed': f.hours === o[0], onClick: function () { set('hours', o[0]); }, className: pill(f.hours === o[0]) }, o[1]); }))),
          h('div', { key: 'v', className: 'grid grid-cols-2 gap-2' },
            h('div', null, label('View tối thiểu'), select('minView', [[0, 'Bất kỳ'], [1000, '1K+'], [5000, '5K+'], [20000, '20K+'], [100000, '100K+'], [1000000, '1M+']], 'View tối thiểu')),
            h('div', null, label('View ÷ sub'), select('minOut', [[1, '≥ 1×'], [2, '≥ 2×'], [5, '≥ 5×'], [10, '≥ 10×'], [50, '≥ 50×']], 'View chia sub tối thiểu')))
        ]),
        group([
          h('div', { key: 'q', className: 'space-y-2' }, label('Quét dữ liệu mới'),
            E.LEVELS.map(function (l, i) {
              return h('button', { key: l[0], disabled: !!busy, onClick: function () { return run({ budget: l[2] }); }, className: cx(i === 0 ? B.pri : B.btn, 'w-full justify-between', i === 0 ? '' : 'h-8') },
                h('span', null, l[1]), h('span', { className: cx('text-[10.5px] font-medium tabular-nums', i === 0 ? 'text-[#231a08]/70' : 'text-cham-400') }, '≈' + N(l[2]) + ' quota'));
            }),
            h('div', { className: 'flex gap-1.5 pt-1' },
              h('input', { value: kw, 'aria-label': 'Từ khoá riêng', onChange: function (e) { setKw(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && kw.trim()) return runKw(); }, placeholder: 'Từ khoá riêng, cách nhau dấu phẩy', className: cx(B.field, 'flex-1 min-w-0') }),
              h('button', { disabled: !!busy || !kw.trim(), onClick: runKw, className: B.sm + ' h-8' }, 'Quét')))
        ]),
        group([
          h('dl', { key: 'd', className: 'text-[10.5px] space-y-1.5' },
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Quét tự động'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, daily ? new Date(daily.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + ' · ' + N(Object.keys(daily.channels).length) + ' kênh' : 'chưa có')),
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Bạn đã quét'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, local && local.at ? new Date(local.at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) + ' · ' + N(Object.keys(local.channels).length) + ' kênh' : 'chưa')),
            h('div', { className: 'flex justify-between gap-2' }, h('dt', { className: 'text-cham-400' }, 'Tổng kho'), h('dd', { className: 'text-cham-100 text-right tabular-nums' }, N(nStore) + ' kênh · ' + N(Object.keys(store.videos).length) + ' video'))),
          local && local.at ? h('button', { key: 'x', onClick: clearAll, className: 'text-[10.5px] text-dieu-300 hover:text-dieu-200 underline decoration-dieu-700 underline-offset-2 cursor-pointer' }, 'Xoá dữ liệu đã quét trên máy này') : null
        ])));

    var st = D.stats;
    var kpi = function (val, lbl, tone) { return h('div', { className: 'bg-[#1e1f24]/[0.94] px-3.5 py-2.5 min-w-0' }, h('div', { className: cx('font-display text-[16.5px] leading-7 font-bold tabular-nums tracking-tight', tone || 'text-cham-50') }, N(val)), h('div', { className: 'text-[10.5px] text-cham-400 leading-tight' }, lbl)); };
    var head = h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-end justify-between gap-3' },
        h('div', null,
          h('h1', { className: 'font-display text-[19px] leading-8 font-bold text-cham-50 tracking-tight' }, 'Top Ngách'),
          h('p', { className: 'text-[11px] text-cham-400 mt-1.5' }, f.mode === 'rpm' ? 'Ngách của 12 nước RPM cao, ưu tiên kênh nhỏ có view vượt sub.' : 'Toàn cầu, mọi loại content: cứ view cao mà sub thấp là vào.')),
        h('button', { onClick: function () { setSide(!side); }, 'aria-expanded': side, className: B.btn + ' lg:hidden' }, side ? 'Ẩn bộ lọc' : 'Bộ lọc & quét')),
      busy && h('div', { role: 'status', className: 'rounded-lg border border-hoe-600/50 bg-hoe-950 px-3.5 py-2.5 text-[10.5px] text-hoe-100 flex items-center gap-2.5' }, h('span', { className: 'inline-block w-3.5 h-3.5 rounded-md border-2 border-hoe-800 border-t-hoe-300 animate-spin shrink-0' }), busy),
      err && h('div', { role: 'alert', className: 'rounded-lg border border-dieu-500/50 bg-dieu-950 px-3.5 py-2.5 text-[10.5px] text-dieu-100' }, err),
      h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-px bg-white/[0.07] rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_12px_36px_rgba(0,0,0,.45)]' },
        kpi(st.channels, 'kênh nhỏ qua lọc'), kpi(st.farm, 'kênh farm tiền', 'text-ngoc-300'), kpi(st.rise, 'kênh đang lên', 'text-hoe-300'),
        kpi(st.videosShown, 'video nổ', 'text-nhat-300'), kpi(D.niches.length, 'ngách', 'text-hoaca-300'), kpi(st.markets, 'quốc gia', 'text-cham-200')),
      D.needProfile > 0 && h('div', { className: 'rounded-lg border border-hoe-600/50 bg-hoe-950 px-3.5 py-2.5 text-[10.5px] text-hoe-100 flex flex-wrap items-center justify-between gap-3' },
        h('span', null, N(D.needProfile) + ' kênh có video nổ nhưng chưa được so toàn bộ video, nên chưa biết farm thật hay ăn may.'),
        h('button', { disabled: !!busy, onClick: function () { return run({ profileOnly: true, budget: Math.min(2500, Math.ceil(D.needProfile * 1.7) + 20), maxProfiles: 400 }); }, className: 'inline-flex items-center h-7 px-3 rounded-lg bg-hoe-400 text-hoe-950 text-[10.5px] font-semibold hover:bg-hoe-300 transition disabled:opacity-40 cursor-pointer whitespace-nowrap' }, 'Phân tích ' + Math.min(D.needProfile, 400) + ' kênh (≈' + N(Math.ceil(Math.min(D.needProfile, 400) * 1.7)) + ' quota)')),
      last && h('p', { className: 'text-[10.5px] text-cham-400 tabular-nums' }, 'Lần quét vừa rồi: ' + last.searches + ' nguồn · +' + last.newChannels + ' kênh mới · +' + last.newVideos + ' video · so sánh ' + last.profiled + ' kênh · ' + N(last.units) + ' quota'));

    var tabs = [['niche', 'Ngách đề xuất', D.niches.length], ['ch', 'Kênh farm tiền', D.channels.length], ['vid', 'Video nổ', D.videos.length]];
    var sel = function (val, on, opts, aria) { return h('select', { value: val, 'aria-label': aria, onChange: on, className: cx(B.field, 'h-7 text-[10.5px] cursor-pointer') }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var toolbar = h('div', { className: 'space-y-3' },
      h('div', { role: 'tablist', className: 'inline-flex max-w-full gap-1 p-1 rounded-md bg-[#101219]/90 border border-white/10 overflow-x-auto no-scrollbar' },
        tabs.map(function (t) { var on = tab === t[0]; return h('button', { key: t[0], role: 'tab', 'aria-selected': on, onClick: function () { setTab(t[0]); }, className: cx('h-7 px-3.5 rounded-md text-[11px] whitespace-nowrap transition cursor-pointer', on ? 'bg-cham-50 text-[#111215] font-semibold' : 'text-cham-300 font-medium hover:text-cham-50 hover:bg-white/[0.06]') }, t[1], h('span', { className: cx('ml-1.5 text-[10.5px] tabular-nums', on ? 'text-cham-600' : 'text-cham-500') }, N(t[2]))); })),
      h('div', { className: 'flex flex-wrap items-center gap-2' },
        h('input', { value: f.text, 'aria-label': 'Lọc theo tiêu đề, kênh hoặc ngách', onChange: function (e) { set('text', e.target.value); }, placeholder: 'Lọc theo tiêu đề, kênh, ngách', className: cx(B.field, 'h-7 text-[10.5px] w-full sm:w-64') }),
        tab === 'ch' && sel(f.verdict, function (e) { set('verdict', e.target.value); }, [['good', 'Farm + đang lên + chờ phân tích'], ['farm', 'Chỉ farm tiền'], ['rise', 'Chỉ đang lên'], ['unk', 'Chỉ chưa phân tích'], ['fluke', 'Chỉ ăn may'], ['all', 'Tất cả']], 'Lọc theo đánh giá'),
        tab === 'ch' && sel(f.cSort, function (e) { set('cSort', e.target.value); }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['score', 'Xếp: điểm farm'], ['v30', 'Xếp: view 30 ngày'], ['out', 'Xếp: view ÷ sub'], ['new', 'Xếp: kênh mới nhất']], 'Sắp xếp kênh'),
        tab === 'vid' && sel(f.vSort, function (e) { set('vSort', e.target.value); }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['farm', 'Xếp: kênh farm trước'], ['views', 'Xếp: view cao'], ['out', 'Xếp: view ÷ sub'], ['vph', 'Xếp: view/giờ'], ['new', 'Xếp: mới nhất']], 'Sắp xếp video'),
        tab === 'vid' && sel(f.perCh, function (e) { set('perCh', +e.target.value); }, [[1, 'Tối đa 1 video/kênh'], [2, 'Tối đa 2 video/kênh'], [5, 'Tối đa 5 video/kênh'], [0, 'Không giới hạn']], 'Số video mỗi kênh'),
        f.niche && h('button', { onClick: function () { set('niche', ''); }, title: 'Bỏ lọc ngách', className: 'inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-hoe-400/50 bg-hoe-400/15 text-[10.5px] font-medium text-cham-50 cursor-pointer hover:border-hoe-300' }, 'Ngách: ' + f.niche, ic('x')),
        h('span', { className: 'flex-1' }),
        h('button', { onClick: exportCsv, className: B.sm }, 'Tải CSV')));

    function exportCsv() {
      if (tab === 'niche') return csvDownload('top-ngach', [['Hạng', 'Ngách', 'Điểm cơ hội', 'Số kênh nhỏ', 'Kênh farm', 'Kênh đang lên', 'Outlier trung vị', 'RPM ước tính tối đa ($)', 'View 30 ngày', 'Quốc gia', 'Danh mục']].concat(D.niches.map(function (g, i) { return [i + 1, g.name, g.score, g.chans.length, g.farm, g.rise, g.medOut.toFixed(1), g.rpmHi.toFixed(1), g.v30, g.topMk.map(function (k) { return M[k] ? M[k][1] : k; }).join(' / '), CATS[g.topCat] ? CATS[g.topCat][1] : '']; })));
      if (tab === 'ch') return csvDownload('kenh-farm', [['Kênh', 'Link', 'Sub', 'Quốc gia', 'Ngách', 'Đánh giá', 'Điểm farm', 'Video đạt / phân tích', 'View trung vị', 'Outlier trung vị', 'So với ngách (×)', 'View 30 ngày', 'Ước tính 30 ngày ($)', 'Thời lượng TB (phút)', 'Video/tuần', 'Tuổi kênh (ngày)']].concat(D.channels.map(function (c) { var a = c.a; return [c.name, 'https://www.youtube.com/channel/' + c.id, c.subs, M[c.mk] ? M[c.mk][1] : c.mk, c.niche, (VL[a.v] || VL.unk)[0], a.score, a.n ? a.hits + '/' + a.n : '', a.med || '', a.medOut ? a.medOut.toFixed(1) : '', c.peer ? c.peer.toFixed(1) : '', a.v30 || '', a.rev ? Math.round(a.rev[0]) + '-' + Math.round(a.rev[1]) : '', a.avgDur ? (a.avgDur / 60).toFixed(1) : '', a.cad ? a.cad.toFixed(1) : '', c.cr ? Math.round((Date.now() - c.cr) / 864e5) : '']; })));
      return csvDownload('video-no', [['Tiêu đề', 'Link', 'Kênh', 'Link kênh', 'Sub', 'View', 'Outlier', 'View/giờ', 'Thời lượng', 'Đăng cách đây', 'Quốc gia', 'Ngách', 'Đánh giá kênh']].concat(D.videos.map(function (v) { return [v.title, 'https://youtu.be/' + v.id, v.chName, 'https://www.youtube.com/channel/' + v.ch, v.subs, v.views, v.out.toFixed(1), v.vph, dur(v.dur), age(v.hrs), M[v.mk] ? M[v.mk][1] : v.mk, v.niche, (VL[v.a.v] || VL.unk)[0]]; })));
    }

    var empty = function (msg) { return h('div', { className: 'py-16 px-6 text-center rounded-xl border border-dashed border-cham-700 bg-cham-950/70' }, h('div', { className: 'text-[12px] font-semibold text-cham-50' }, msg), h('p', { className: 'mt-1.5 text-[10.5px] text-cham-300 max-w-md mx-auto leading-relaxed' }, nStore ? 'Thử nới bộ lọc: chọn Dưới 20K sub, chuyển sang Toàn cầu, tăng thời gian đăng hoặc hạ mức view ÷ sub.' : 'Kho đang trống. Bấm Quét nhanh ở cột trái để bắt đầu, mỗi lần tốn khoảng 1.500 quota.'), !nStore && h('button', { disabled: !!busy, onClick: function () { return run({ budget: E.LEVELS[0][2] }); }, className: B.pri + ' mt-5' }, 'Quét nhanh ngay')); };
    var lock = function (total) { return !isPro && total > FREE && h('button', { onClick: p.onUpgradePrompt, className: B.btn + ' w-full' }, 'Còn ' + N(total - FREE) + ' mục nữa'); };
    var more = function (total) { return isPro && total > lim && h('div', { className: 'flex gap-2 justify-center pt-1' }, h('button', { onClick: function () { setLim(lim + 120); }, className: B.btn }, 'Hiện thêm 120 (còn ' + N(total - lim) + ')'), h('button', { onClick: function () { setLim(total); }, className: B.btn }, 'Hiện hết ' + N(total))); };
    var cut = function (arr) { return arr.slice(0, isPro ? lim : FREE); };
    var note = function (t) { return h('p', { className: 'text-[10.5px] text-cham-300 leading-relaxed max-w-[110ch]' }, t); };
    var thumbs = function (list, top, corner) { return h('div', { className: 'grid grid-cols-3 gap-1.5' }, list.map(function (x) {
      return h('a', { key: x.id, href: 'https://www.youtube.com/watch?v=' + x.id, target: '_blank', rel: 'noopener noreferrer', title: x.title, className: 'relative block rounded-md overflow-hidden bg-cham-950' },
        h('img', { src: thumb(x.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
        h('span', { className: 'absolute bottom-1 left-1 text-[10.5px] font-semibold px-1 rounded bg-[#111215]/85 text-cham-50 tabular-nums' }, top(x)),
        h('span', { className: 'absolute top-1 right-1 text-[10.5px] font-bold px-1 rounded bg-ngoc-300 text-ngoc-950 tabular-nums' }, corner(x)));
    })); };
    var cell = function (l, v, tone) { return h('div', { className: 'yt-cell px-2 py-1.5 min-w-0' }, h('dt', { className: 'text-[11px] text-cham-400 truncate' }, l), h('dd', { className: 'text-[10.5px] font-semibold truncate tabular-nums ' + (tone || 'text-cham-50') }, v)); };

    // ---------- Tab Ngách ----------
    var nicheView = !D.niches.length ? empty('Chưa có ngách nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(310px,1fr))]' }, cut(D.niches).map(function (g, i) {
        var cat = CATS[g.topCat], th = g.chans.filter(function (c) { return c.best; }).slice(0, 3);
        return h('article', { key: g.name, className: 'yt-card p-3 flex flex-col gap-2 transition hover:border-cham-600' },
          h('div', { className: 'flex items-start gap-3' },
            h('span', { className: cx('shrink-0 h-7 min-w-7 px-1.5 rounded-md flex items-center justify-center text-[10.5px] font-bold tabular-nums', i < 3 ? 'bg-hoe-400 text-hoe-950' : 'bg-cham-800 text-cham-200') }, i + 1),
            h('div', { className: 'min-w-0 flex-1' },
              h('h3', { className: 'text-[12px] font-semibold text-cham-50 truncate', title: g.name }, g.name),
              h('div', { className: 'text-[10.5px] text-cham-300 truncate' }, (cat ? cat[1] + ' · ' : '') + g.topMk.slice(0, 5).map(code).join(' '))),
            h('div', { className: 'text-right shrink-0' }, h('div', { className: 'font-display text-[16.5px] leading-6 font-bold text-cham-50 tabular-nums' }, g.score), h('div', { className: 'text-[11px] text-cham-400' }, 'điểm cơ hội'))),
          bar(g.score),
          h('dl', { className: 'grid grid-cols-4 gap-1.5' },
            cell('Kênh nhỏ', N(g.chans.length)), cell('Farm', g.farm, g.farm ? 'text-ngoc-300' : ''), cell('Đang lên', g.rise, g.rise ? 'text-hoe-300' : ''), cell('View÷sub', fx(g.medOut))),
          h('div', { className: 'flex justify-between gap-2 text-[10.5px] text-cham-300 tabular-nums' }, h('span', null, 'RPM tới ~$' + g.rpmHi.toFixed(1)), h('span', null, 'View 30 ngày ' + N(g.v30))),
          th.length > 0 && thumbs(th.map(function (c) { return Object.assign({}, c.best, { _subs: c.subs, title: c.best.title + ' · ' + c.name }); }), function (x) { return N(x._subs) + ' sub'; }, function (x) { return '×' + Math.round(x.out); }),
          h('div', { className: 'flex gap-1.5 mt-auto pt-1' },
            h('button', { onClick: function () { set('niche', g.name); setTab('ch'); }, className: B.btn + ' flex-1' }, 'Xem ' + g.chans.length + ' kênh'),
            h('button', { onClick: function () { set('niche', g.name); setTab('vid'); }, className: B.btn }, 'Video'),
            p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(g.name); }, className: B.btn }, 'Phân tích')));
      })),
      more(D.niches.length), lock(D.niches.length));

    // ---------- Tab Kênh ----------
    var chView = !D.channels.length ? empty('Chưa có kênh nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(310px,1fr))]' }, cut(D.channels).map(function (c, i) {
        var a = c.a, ok = a.n > 0, farm = a.v === 'farm', ageD = c.cr ? Math.round((Date.now() - c.cr) / 864e5) : null;
        return h('article', { key: c.id, className: cx('yt-card p-3 flex flex-col gap-2 transition', farm ? 'border-ngoc-600/60 hover:border-ngoc-500' : 'hover:border-cham-600') },
          h('div', { className: 'flex items-start gap-3' },
            h('span', { className: 'shrink-0 h-7 min-w-7 px-1.5 rounded-md flex items-center justify-center text-[10.5px] font-bold tabular-nums bg-cham-800 text-cham-200' }, i + 1),
            h('div', { className: 'min-w-0 flex-1' },
              h('a', { href: 'https://www.youtube.com/channel/' + c.id, target: '_blank', rel: 'noopener noreferrer', title: c.name, className: 'block text-[12px] font-semibold text-cham-50 hover:text-ngoc-200 truncate' }, c.name),
              h('div', { className: 'text-[10.5px] text-cham-300 truncate tabular-nums', title: c.niche }, N(c.subs) + ' sub · ' + code(c.mk) + ' · ' + c.niche)),
            ok && farm ? h('span', { className: 'seal stamp', title: 'Điểm farm ' + a.score + '/100' }, h('b', null, a.score), h('span', null, 'Farm'))
              : ok ? h('div', { className: 'text-right shrink-0' }, h('div', { className: 'font-display text-[16.5px] leading-6 font-bold tabular-nums text-cham-50' }, a.score), h('div', { className: 'text-[11px] text-cham-400' }, 'điểm farm')) : null),
          h('div', { className: 'flex flex-wrap items-center gap-1.5' }, badge(a), ageD != null && ageD < 180 ? tag(ageD + ' ngày tuổi', 'tim') : null, a.mid ? tag('Có mid-roll') : null),
          ok ? h('dl', { className: 'grid grid-cols-3 gap-1.5' },
            cell('Video đạt', a.hits + '/' + a.n + ' · ' + Math.round(a.hr * 100) + '%', a.hr >= 0.5 ? 'text-la-300' : ''),
            cell('View trung vị', N(a.med) + ' · ' + fx(a.medOut), a.medOut >= 1 ? 'text-la-300' : ''),
            cell('So với ngách', c.peer ? '×' + c.peer.toFixed(1) : '–', c.peer >= 1.5 ? 'text-hoe-300' : ''),
            cell('View 30 ngày', N(a.v30)),
            cell('Độ dài · nhịp', (f.fmt === 'short' ? Math.round(a.avgDur) + 's' : Math.round(a.avgDur / 60) + 'p') + ' · ' + a.cad.toFixed(1) + '/tuần'),
            cell('Ước tính/tháng', a.eligible ? '$' + N(Math.round(a.rev[0])) + '–' + N(Math.round(a.rev[1])) : 'Chưa đủ 1K', a.eligible ? 'text-la-300' : 'text-cham-400'))
            : h('p', { className: 'yt-cell text-[10.5px] text-cham-200 px-3 py-2.5 leading-relaxed' }, a.v === 'unk' ? 'Mới thấy ' + c.vids.length + ' video nổ (tốt nhất ×' + Math.round(c.bestOut) + '). Bấm Phân tích ở dải vàng phía trên để so toàn bộ video của kênh.' : 'Không có video ' + (f.fmt === 'short' ? 'Shorts' : 'dài') + ' trong 60 ngày.'),
          c.vids.length > 0 && thumbs(c.vids.slice(0, 3), function (v) { return N(v.views); }, function (v) { return '×' + Math.round(v.out); }),
          h('div', { className: 'flex gap-1.5 mt-auto pt-1' },
            h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', className: B.btn + ' flex-1' }, 'Mở kênh', ic('ext')),
            p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(c.best ? toApp(c.best) : { channel: c.name, channelId: c.id, subs: c.subs }); }, className: B.btn }, 'Theo dõi'),
            p.onSelectKeywordForSearch && c.best && h('button', { onClick: function () { p.onSelectKeywordForSearch(c.best.title); }, className: B.btn }, 'Tương tự')));
      })),
      more(D.channels.length), lock(D.channels.length));

    // ---------- Tab Video ----------
    var vidView = !D.videos.length ? empty('Chưa có video nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]' }, cut(D.videos).map(function (v) {
        var saved = p.isSaved && p.isSaved(v.id), farm = v.a.v === 'farm', chip = 'absolute text-[11px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums';
        return h('article', { key: v.id, className: cx('yt-card overflow-hidden flex flex-col transition', farm ? 'border-ngoc-600/60 hover:border-ngoc-500' : 'hover:border-cham-600') },
          h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', className: 'relative block bg-cham-950' },
            h('img', { src: thumb(v.id), loading: 'lazy', alt: '', className: 'w-full aspect-video object-cover' }),
            h('span', { className: cx(chip, 'top-2 left-2 bg-[#111215]/85 text-cham-50') }, code(v.mk) + ' · ' + N(v.subs) + ' sub'),
            h('span', { className: cx(chip, 'top-2 right-2 font-bold', v.out >= 5 ? 'bg-ngoc-300 text-ngoc-950' : 'bg-hoe-400 text-hoe-950'), title: 'View chia sub' }, fx(v.out)),
            farm && h('span', { className: cx(chip, 'bottom-2 left-2 bg-ngoc-900 text-ngoc-100 border border-ngoc-600/70') }, 'Kênh farm'),
            h('span', { className: cx(chip, 'bottom-2 right-2 bg-[#111215]/85 text-cham-50 font-medium') }, dur(v.dur))),
          h('div', { className: 'p-3 flex-1 flex flex-col gap-1.5' },
            h('div', { className: 'text-[10.5px] font-medium leading-snug text-cham-50 line-clamp-2', title: v.title }, v.title),
            h('a', { href: 'https://www.youtube.com/channel/' + v.ch, target: '_blank', rel: 'noopener noreferrer', className: 'text-[10.5px] text-cham-300 truncate hover:text-nhat-200' }, v.chName + ' · ' + v.niche),
            h('dl', { className: 'grid grid-cols-3 gap-1 text-[10.5px] mt-auto pt-1.5' },
              h('div', null, h('dt', { className: 'text-cham-400' }, 'View'), h('dd', { className: 'text-cham-50 font-semibold tabular-nums' }, N(v.views))),
              h('div', null, h('dt', { className: 'text-cham-400' }, 'View/giờ'), h('dd', { className: 'text-hoe-300 font-semibold tabular-nums' }, N(v.vph))),
              h('div', { className: 'text-right' }, h('dt', { className: 'text-cham-400' }, 'Đăng'), h('dd', { className: 'text-cham-200 tabular-nums' }, age(v.hrs) + ' trước'))),
            h('div', { className: 'flex gap-1.5 pt-1.5' },
              p.onToggleSave && h('button', { onClick: function () { p.onToggleSave(toApp(v)); }, 'aria-pressed': !!saved, className: cx(B.sm, saved && '!border-la-500/60 !bg-la-900 !text-la-200') }, saved ? 'Đã lưu' : 'Lưu'),
              p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(toApp(v)); }, className: B.sm }, 'Theo dõi kênh'),
              p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(v.title); }, className: B.sm + ' ml-auto' }, 'Tương tự'))));
      })),
      more(D.videos.length), lock(D.videos.length));

    if (!local) return h('div', { role: 'status', className: 'py-16 text-center text-[10.5px] text-cham-300' }, 'Đang mở kho Top Ngách…');
    return h('section', { className: 'grid gap-5 lg:grid-cols-[232px_minmax(0,1fr)]' },
      sidebar,
      h('div', { className: 'space-y-4 min-w-0' }, head, toolbar, tab === 'niche' ? nicheView : tab === 'ch' ? chView : vidView));
  }
  window.TopNgachV3 = TopNgachV3;
})();
