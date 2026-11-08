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
  var flag = function (mk) { return M[mk] ? M[mk][0] : '🌐'; };
  var thumb = function (id) { return 'https://i.ytimg.com/vi/' + id + '/mqdefault.jpg'; };
  var dur = function (s) { s = Math.round(s || 0); var hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (hh ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };
  var age = function (hrs) { return hrs < 24 ? Math.round(hrs) + ' giờ' : Math.round(hrs / 24) + ' ngày'; };
  var cx = function () { return Array.prototype.filter.call(arguments, Boolean).join(' '); };
  var TONE = { emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40', sky: 'bg-sky-500/15 text-sky-300 border-sky-500/40', amber: 'bg-amber-500/15 text-amber-300 border-amber-500/40', zinc: 'bg-zinc-800 text-zinc-400 border-zinc-700' };
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

    // ---------- mảnh giao diện ----------
    var pill = function (on, tone) { return cx('px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition cursor-pointer', on ? (tone || 'bg-white text-zinc-950 border-white') : 'bg-zinc-900/80 text-zinc-300 border-zinc-800 hover:border-zinc-600'); };
    var label = function (t) { return h('div', { className: 'text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5' }, t); };
    var select = function (k, opts) { return h('select', { value: f[k], onChange: function (e) { var v = e.target.value; set(k, isNaN(+v) || v === '' ? v : +v); }, className: 'w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200 cursor-pointer' }, opts.map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })); };
    var badge = function (a) { var v = V[a.v] || V.unk; return h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ' + TONE[v[1]] }, v[0]); };
    var bar = function (val, color) { return h('div', { className: 'h-1.5 rounded-full bg-zinc-800 overflow-hidden' }, h('div', { className: 'h-full rounded-full ' + (color || 'bg-emerald-500'), style: { width: Math.max(3, Math.min(100, val)) + '%' } })); };
    var mkOpts = [['', f.mode === 'rpm' ? '💰 Cả 12 nước RPM cao' : '🌍 Tất cả quốc gia']].concat((f.mode === 'rpm' ? E.RPM_MK : E.RPM_MK.concat(E.ALL_MK.filter(function (k) { return E.RPM_MK.indexOf(k) < 0; }))).map(function (k) { return [k, M[k][0] + ' ' + M[k][1] + (E.RPM_MK.indexOf(k) >= 0 ? '  •  RPM ~$' + M[k][4][0] + '–' + M[k][4][1] : '')]; }));

    var sidebar = h('aside', { className: cx('space-y-4 lg:block', side ? 'block' : 'hidden') },
      h('div', null, label('Chế độ'),
        h('div', { className: 'grid grid-cols-2 lg:grid-cols-1 gap-2' },
          [['rpm', '💰 Ngách RPM cao', 'Chỉ đề xuất ngách của 12 nước RPM cao (US, UK, CA, AU, CH, NO, DE, NL, SE, JP, KR, FR)'], ['all', '🌍 Toàn cầu — mọi content', 'Mọi quốc gia, mọi loại content, không xét RPM: cứ view cao sub thấp là vào']].map(function (m) {
            return h('button', { key: m[0], onClick: function () { set('mode', m[0]); }, className: cx('text-left rounded-xl border p-2.5 transition cursor-pointer', f.mode === m[0] ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border-emerald-500/60' : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-600') },
              h('div', { className: 'text-xs font-extrabold text-white' }, m[1]), h('div', { className: 'text-[10px] text-zinc-400 mt-0.5 leading-snug' }, m[2]));
          }))),
      h('div', null, label('Quốc gia'), select('country', mkOpts)),
      h('div', null, label('Quy mô kênh'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [[5000, 'Dưới 5K sub'], [20000, 'Dưới 20K sub']].map(function (o) { return h('button', { key: o[0], onClick: function () { set('maxSub', o[0]); }, className: pill(f.maxSub === o[0]) }, o[1]); })),
        h('div', { className: 'text-[10px] text-zinc-500 mt-1' }, 'Ưu tiên 80% kênh nhỏ nhất xếp trên cùng')),
      h('div', null, label('Định dạng'), h('div', { className: 'grid grid-cols-2 gap-1.5' }, [['long', '🎬 Video dài'], ['short', '📱 Shorts']].map(function (o) { return h('button', { key: o[0], onClick: function () { set('fmt', o[0]); }, className: pill(f.fmt === o[0]) }, o[1]); }))),
      h('div', null, label('Thời gian đăng'), h('div', { className: 'grid grid-cols-3 gap-1' }, [[2, '2 giờ'], [12, '12 giờ'], [24, '24 giờ'], [72, '3 ngày'], [168, '7 ngày'], [720, '30 ngày']].map(function (o) { return h('button', { key: o[0], onClick: function () { set('hours', o[0]); }, className: pill(f.hours === o[0]) + ' px-1' }, o[1]); }))),
      h('div', { className: 'grid grid-cols-2 gap-2' },
        h('div', null, label('View tối thiểu'), select('minView', [[0, 'Bất kỳ'], [1000, '1K+'], [5000, '5K+'], [20000, '20K+'], [100000, '100K+'], [1000000, '1M+']])),
        h('div', null, label('Outlier (view÷sub)'), select('minOut', [[1, '≥ 1×'], [2, '≥ 2×'], [5, '≥ 5×'], [10, '≥ 10×'], [50, '≥ 50×']]))),
      h('div', { className: 'rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 space-y-2' }, label('Quét dữ liệu mới'),
        E.LEVELS.map(function (l, i) {
          return h('button', { key: l[0], disabled: !!busy, onClick: function () { return run({ budget: l[2] }); }, className: cx('w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs font-bold transition cursor-pointer disabled:opacity-40', i === 0 ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100') },
            h('span', null, (i === 0 ? '🚀 ' : i === 1 ? '🛰️ ' : '🌋 ') + l[1]), h('span', { className: 'text-[10px] font-semibold opacity-80' }, '≈' + N(l[2]) + ' quota'));
        }),
        h('div', { className: 'flex gap-1.5 pt-1' },
          h('input', { value: kw, onChange: function (e) { setKw(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter' && kw.trim()) return run({ budget: 1500, custom: kw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }); }, placeholder: 'Từ khoá riêng, cách nhau dấu phẩy', className: 'flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-100' }),
          h('button', { disabled: !!busy || !kw.trim(), onClick: function () { return run({ budget: 1500, custom: kw.split(',').map(function (x) { return x.trim(); }).filter(Boolean) }); }, className: 'px-2.5 rounded-lg text-[11px] font-bold bg-zinc-100 text-zinc-950 disabled:opacity-40 cursor-pointer' }, 'Quét')),
        h('div', { className: 'text-[10px] text-zinc-500 leading-relaxed' }, 'Mỗi lần quét tự đổi nguồn: trend hôm nay + danh mục YouTube + từ khoá bản địa + cụm từ của video đã nổ (snowball). Nguồn đã quét trong 3 ngày sẽ được nhường cho nguồn mới → càng quét càng ra kênh lạ.')),
      h('div', { className: 'text-[10px] text-zinc-500 space-y-1' },
        h('div', null, '🤖 Quét tự động: ', daily ? h('b', { className: 'text-zinc-300' }, new Date(daily.at).toLocaleString('vi-VN') + ' • ' + N(Object.keys(daily.channels).length) + ' kênh') : 'chưa có dữ liệu'),
        h('div', null, '💾 Bạn đã quét: ', local && local.at ? h('b', { className: 'text-zinc-300' }, new Date(local.at).toLocaleString('vi-VN') + ' • ' + N(Object.keys(local.channels).length) + ' kênh') : 'chưa'),
        h('div', null, '📦 Tổng kho: ' + N(nStore) + ' kênh nhỏ • ' + N(Object.keys(store.videos).length) + ' video'),
        local && local.at ? h('button', { onClick: clearAll, className: 'text-rose-400 hover:text-rose-300 underline cursor-pointer' }, 'Xoá dữ liệu đã quét') : null));

    var st = D.stats;
    var kpi = function (icon, val, lbl, tone) { return h('div', { className: 'rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-2 min-w-0' }, h('div', { className: 'text-lg font-black ' + (tone || 'text-white') }, icon + ' ' + N(val)), h('div', { className: 'text-[10px] text-zinc-500 truncate' }, lbl)); };
    var head = h('div', { className: 'space-y-3' },
      h('div', { className: 'flex flex-wrap items-end justify-between gap-2' },
        h('div', null,
          h('div', { className: 'text-[10px] font-bold tracking-[0.2em] text-emerald-400' }, 'RADAR KÊNH NHỎ • V3'),
          h('h2', { className: 'text-xl sm:text-2xl font-black text-white' }, 'Top Ngách ', h('span', { className: 'text-zinc-500 font-semibold text-sm' }, f.mode === 'rpm' ? '— ngách RPM cao' : '— toàn cầu, mọi content'))),
        h('button', { onClick: function () { setSide(!side); }, className: 'lg:hidden px-3 py-1.5 rounded-lg text-xs font-bold bg-zinc-800 text-white' }, side ? 'Ẩn bộ lọc' : '⚙️ Bộ lọc & Quét')),
      busy && h('div', { className: 'rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 flex items-center gap-2' }, h('span', { className: 'animate-spin inline-block' }, '⏳'), busy),
      err && h('div', { className: 'rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs text-rose-200' }, err),
      h('div', { className: 'grid grid-cols-3 sm:grid-cols-6 gap-2' },
        kpi('📺', st.channels, 'kênh nhỏ qua lọc'), kpi('💰', st.farm, 'kênh farm tiền', 'text-emerald-400'), kpi('🌱', st.rise, 'kênh đang lên', 'text-sky-400'),
        kpi('🎬', st.videosShown, 'video'), kpi('🧭', D.niches.length, 'ngách'), kpi('🌍', st.markets, 'quốc gia')),
      D.needProfile > 0 && h('div', { className: 'rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-200 flex flex-wrap items-center justify-between gap-2' },
        h('span', null, '⏳ ' + D.needProfile + ' kênh có video nổ nhưng chưa được so sánh toàn bộ video (chưa biết farm thật hay ăn may).'),
        h('button', { disabled: !!busy, onClick: function () { return run({ profileOnly: true, budget: Math.min(2500, Math.ceil(D.needProfile * 1.7) + 20), maxProfiles: 400 }); }, className: 'px-3 py-1 rounded-lg font-bold bg-amber-500 text-black disabled:opacity-40 cursor-pointer' }, '🔬 Phân tích ' + Math.min(D.needProfile, 400) + ' kênh (≈' + Math.ceil(Math.min(D.needProfile, 400) * 1.7) + ' quota)')),
      last && h('div', { className: 'text-[10px] text-zinc-500' }, 'Lần quét vừa rồi: ' + last.searches + ' nguồn • +' + last.newChannels + ' kênh mới • +' + last.newVideos + ' video • so sánh ' + last.profiled + ' kênh • ' + last.units + ' quota'));

    var tabs = [['niche', '🧭 Ngách đề xuất', D.niches.length], ['ch', '💰 Kênh farm tiền', D.channels.length], ['vid', '🎬 Video nổ', D.videos.length]];
    var toolbar = h('div', { className: 'flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-2' },
      tabs.map(function (t) { return h('button', { key: t[0], onClick: function () { setTab(t[0]); }, className: cx('px-3 py-2 text-xs font-bold rounded-t-lg border-b-2 transition cursor-pointer', tab === t[0] ? 'border-emerald-400 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-200') }, t[1] + ' ', h('span', { className: 'text-[10px] text-zinc-500' }, N(t[2]))); }),
      h('div', { className: 'flex-1' }),
      h('input', { value: f.text, onChange: function (e) { set('text', e.target.value); }, placeholder: '🔍 Lọc theo tiêu đề / kênh / ngách', className: 'w-full sm:w-56 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-100' }),
      tab === 'ch' && h('select', { value: f.verdict, onChange: function (e) { set('verdict', e.target.value); }, className: 'bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200' }, [['good', 'Farm + đang lên + chờ phân tích'], ['farm', 'Chỉ 💰 farm tiền'], ['rise', 'Chỉ 🌱 đang lên'], ['unk', 'Chỉ ⏳ chưa phân tích'], ['fluke', 'Chỉ ⚠️ ăn may'], ['all', 'Tất cả']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })),
      tab === 'ch' && h('select', { value: f.cSort, onChange: function (e) { set('cSort', e.target.value); }, className: 'bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200' }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['score', 'Xếp: điểm farm'], ['v30', 'Xếp: view 30 ngày'], ['out', 'Xếp: outlier'], ['new', 'Xếp: kênh mới nhất']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })),
      tab === 'vid' && h('select', { value: f.vSort, onChange: function (e) { set('vSort', e.target.value); }, className: 'bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200' }, [['smart', 'Xếp: 80% kênh nhỏ trên cùng'], ['farm', 'Xếp: kênh farm trước'], ['views', 'Xếp: view cao'], ['out', 'Xếp: outlier'], ['vph', 'Xếp: view/giờ'], ['new', 'Xếp: mới nhất']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })),
      tab === 'vid' && h('select', { value: f.perCh, onChange: function (e) { set('perCh', +e.target.value); }, className: 'bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 text-[11px] text-zinc-200' }, [[1, 'Tối đa 1 video/kênh'], [2, 'Tối đa 2 video/kênh'], [5, 'Tối đa 5 video/kênh'], [0, 'Không giới hạn']].map(function (o) { return h('option', { key: o[0], value: o[0] }, o[1]); })),
      h('button', { onClick: exportCsv, className: 'px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/40 cursor-pointer' }, '📥 CSV'));
    var nicheChip = f.niche && h('div', { className: 'flex items-center gap-2 text-[11px]' }, h('span', { className: 'text-zinc-500' }, 'Đang lọc ngách:'), h('button', { onClick: function () { set('niche', ''); }, className: 'px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 font-bold cursor-pointer' }, f.niche + '  ✕'));

    function exportCsv() {
      if (tab === 'niche') return csvDownload('top-ngach', [['Hạng', 'Ngách', 'Điểm cơ hội', 'Số kênh nhỏ', 'Kênh farm', 'Kênh đang lên', 'Outlier trung vị', 'RPM ước tính tối đa ($)', 'View 30 ngày', 'Quốc gia', 'Danh mục']].concat(D.niches.map(function (g, i) { return [i + 1, g.name, g.score, g.chans.length, g.farm, g.rise, g.medOut.toFixed(1), g.rpmHi.toFixed(1), g.v30, g.topMk.map(function (k) { return M[k] ? M[k][1] : k; }).join(' / '), CATS[g.topCat] ? CATS[g.topCat][1] : '']; })));
      if (tab === 'ch') return csvDownload('kenh-farm', [['Kênh', 'Link', 'Sub', 'Quốc gia', 'Ngách', 'Đánh giá', 'Điểm farm', 'Video đạt / phân tích', 'View trung vị', 'Outlier trung vị', 'So với ngách (×)', 'View 30 ngày', 'Ước tính 30 ngày ($)', 'Thời lượng TB (phút)', 'Video/tuần', 'Tuổi kênh (ngày)']].concat(D.channels.map(function (c) { var a = c.a; return [c.name, 'https://www.youtube.com/channel/' + c.id, c.subs, M[c.mk] ? M[c.mk][1] : c.mk, c.niche, (V[a.v] || V.unk)[0], a.score, a.n ? a.hits + '/' + a.n : '', a.med || '', a.medOut ? a.medOut.toFixed(1) : '', c.peer ? c.peer.toFixed(1) : '', a.v30 || '', a.rev ? Math.round(a.rev[0]) + '-' + Math.round(a.rev[1]) : '', a.avgDur ? (a.avgDur / 60).toFixed(1) : '', a.cad ? a.cad.toFixed(1) : '', c.cr ? Math.round((Date.now() - c.cr) / 864e5) : '']; })));
      return csvDownload('video-no', [['Tiêu đề', 'Link', 'Kênh', 'Link kênh', 'Sub', 'View', 'Outlier', 'View/giờ', 'Thời lượng', 'Đăng cách đây', 'Quốc gia', 'Ngách', 'Đánh giá kênh']].concat(D.videos.map(function (v) { return [v.title, 'https://youtu.be/' + v.id, v.chName, 'https://www.youtube.com/channel/' + v.ch, v.subs, v.views, v.out.toFixed(1), v.vph, dur(v.dur), age(v.hrs), M[v.mk] ? M[v.mk][1] : v.mk, v.niche, (V[v.a.v] || V.unk)[0]]; })));
    }

    var empty = function (msg) { return h('div', { className: 'rounded-2xl border border-dashed border-zinc-800 py-14 text-center space-y-2' }, h('div', { className: 'text-3xl' }, '🛰️'), h('div', { className: 'text-sm text-zinc-300 font-bold' }, msg), h('div', { className: 'text-[11px] text-zinc-500' }, nStore ? 'Thử nới bộ lọc: chọn "Dưới 20K sub", "🌍 Toàn cầu", tăng thời gian hoặc hạ outlier.' : 'Bấm "🚀 Quét nhanh" ở cột bên trái để bắt đầu.')); };
    var lock = function (total) { return !isPro && total > FREE && h('button', { onClick: p.onUpgradePrompt, className: 'w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-amber-500 to-red-500 text-white cursor-pointer' }, '🔒 Còn ' + N(total - FREE) + ' mục nữa — Nâng cấp PRO để xem tất cả'); };
    var more = function (total) { return isPro && total > lim && h('div', { className: 'flex gap-2' }, h('button', { onClick: function () { setLim(lim + 120); }, className: 'flex-1 py-2.5 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white cursor-pointer' }, 'Hiện thêm 120 (còn ' + N(total - lim) + ')'), h('button', { onClick: function () { setLim(total); }, className: 'px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-100 text-zinc-950 cursor-pointer' }, 'Hiện hết ' + N(total))); };
    var cut = function (arr) { return arr.slice(0, isPro ? lim : FREE); };

    // ---------- Tab Ngách ----------
    var nicheView = !D.niches.length ? empty('Chưa có ngách nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'text-[11px] text-zinc-500' }, f.mode === 'rpm' ? 'Điểm cơ hội = số kênh nhỏ đang farm được (40) + mức nổ view so với sub (30) + RPM của nước/danh mục (30).' : 'Điểm cơ hội = số kênh nhỏ đang farm được (40) + mức nổ view so với sub (30) + tổng view 30 ngày của ngách (30). Không xét RPM.'),
      h('div', { className: 'grid gap-3 md:grid-cols-2 2xl:grid-cols-3' }, cut(D.niches).map(function (g, i) {
        var cat = CATS[g.topCat], th = g.chans.filter(function (c) { return c.best; }).slice(0, 3);
        return h('div', { key: g.name, className: 'rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-3.5 flex flex-col gap-2.5 hover:border-emerald-600/50 transition' },
          h('div', { className: 'flex items-start gap-3' },
            h('div', { className: cx('w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black', i < 3 ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300') }, '#' + (i + 1)),
            h('div', { className: 'min-w-0 flex-1' },
              h('div', { className: 'text-sm font-extrabold text-white truncate', title: g.name }, g.name),
              h('div', { className: 'text-[10px] text-zinc-400 truncate' }, (cat ? cat[0] + ' ' + cat[1] + ' • ' : '') + g.topMk.slice(0, 5).map(flag).join(' '))),
            h('div', { className: 'text-right' }, h('div', { className: 'text-lg font-black text-emerald-400 leading-none' }, g.score), h('div', { className: 'text-[9px] text-zinc-500' }, 'điểm'))),
          bar(g.score),
          h('div', { className: 'grid grid-cols-4 gap-1.5 text-center' },
            [['Kênh nhỏ', N(g.chans.length)], ['💰 Farm', g.farm], ['🌱 Lên', g.rise], ['Outlier', '×' + (g.medOut >= 10 ? Math.round(g.medOut) : g.medOut.toFixed(1))]].map(function (x) { return h('div', { key: x[0], className: 'rounded-lg bg-zinc-900 py-1' }, h('div', { className: 'text-xs font-black text-white' }, x[1]), h('div', { className: 'text-[9px] text-zinc-500' }, x[0])); })),
          h('div', { className: 'flex justify-between text-[10px] text-zinc-400' }, h('span', null, 'RPM ước tính tới ~$' + g.rpmHi.toFixed(1)), h('span', null, 'View 30 ngày: ' + N(g.v30))),
          th.length > 0 && h('div', { className: 'grid grid-cols-3 gap-1.5' }, th.map(function (c) {
            return h('a', { key: c.id, href: 'https://www.youtube.com/watch?v=' + c.best.id, target: '_blank', rel: 'noopener noreferrer', title: c.best.title + ' — ' + c.name, className: 'relative block' },
              h('img', { src: thumb(c.best.id), loading: 'lazy', className: 'w-full aspect-video object-cover rounded-md bg-zinc-900' }),
              h('span', { className: 'absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 rounded bg-black/80 text-white' }, N(c.subs) + ' sub'),
              h('span', { className: 'absolute top-0.5 right-0.5 text-[9px] font-bold px-1 rounded bg-emerald-600 text-white' }, '×' + Math.round(c.best.out)));
          })),
          h('div', { className: 'flex gap-1.5 mt-auto' },
            h('button', { onClick: function () { set('niche', g.name); setTab('ch'); }, className: 'flex-1 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' }, 'Xem ' + g.chans.length + ' kênh →'),
            h('button', { onClick: function () { set('niche', g.name); setTab('vid'); }, className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 cursor-pointer' }, 'Video'),
            p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(g.name); }, className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Phân tích')));
      })),
      more(D.niches.length), lock(D.niches.length));

    // ---------- Tab Kênh ----------
    var stat = function (l, v, tone) { return h('div', { className: 'min-w-0' }, h('div', { className: 'text-[9px] uppercase text-zinc-500 truncate' }, l), h('div', { className: 'text-[11px] font-bold truncate ' + (tone || 'text-zinc-100') }, v)); };
    var chView = !D.channels.length ? empty('Chưa có kênh nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'text-[11px] text-zinc-500 leading-relaxed' }, 'Cách so sánh: lấy 30 video ' + (f.fmt === 'short' ? 'Shorts' : 'dài') + ' gần nhất (60 ngày) của từng kênh, kể cả video flop. 💰 Farm tiền = ít nhất 3 video có view ≥ sub, tối thiểu 50% video đạt và view trung vị cũng ≥ sub → ra view đều tay. 🌱 Đang lên = 2 video đạt. ⚠️ Ăn may = chỉ 1 video nổ. Doanh thu chỉ là ước tính theo RPM nước + danh mục.'),
      h('div', { className: 'grid gap-3 md:grid-cols-2 2xl:grid-cols-3' }, cut(D.channels).map(function (c, i) {
        var a = c.a, ok = a.n > 0, farm = a.v === 'farm', ageD = c.cr ? Math.round((Date.now() - c.cr) / 864e5) : null;
        var cell = function (l, v, tone) { return h('div', { className: 'rounded-lg bg-zinc-900/80 px-2 py-1.5 min-w-0' }, h('div', { className: 'text-[9px] uppercase tracking-wide text-zinc-500 truncate' }, l), h('div', { className: 'text-xs font-black truncate ' + (tone || 'text-zinc-100') }, v)); };
        return h('div', { key: c.id, className: cx('rounded-2xl border p-3.5 flex flex-col gap-2.5 transition', farm ? 'border-emerald-600/50 bg-gradient-to-b from-emerald-500/[0.07] to-zinc-950' : 'border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-zinc-950 hover:border-zinc-600') },
          h('div', { className: 'flex items-start gap-3' },
            h('div', { className: cx('w-9 h-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-black', i < 3 ? 'bg-emerald-500 text-black' : 'bg-zinc-800 text-zinc-300') }, '#' + (i + 1)),
            h('div', { className: 'min-w-0 flex-1' },
              h('a', { href: 'https://www.youtube.com/channel/' + c.id, target: '_blank', rel: 'noopener noreferrer', title: c.name, className: 'block text-sm font-extrabold text-white hover:text-emerald-300 truncate' }, flag(c.mk) + ' ' + c.name),
              h('div', { className: 'text-[10px] text-zinc-400 truncate', title: c.niche }, N(c.subs) + ' sub • ' + c.niche)),
            ok ? h('div', { className: 'text-right shrink-0' }, h('div', { className: 'text-lg font-black leading-none ' + (farm ? 'text-emerald-400' : 'text-sky-400') }, a.score), h('div', { className: 'text-[9px] text-zinc-500' }, 'điểm')) : null),
          h('div', { className: 'flex flex-wrap items-center gap-1.5' }, badge(a), ageD != null && ageD < 180 ? h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300' }, '🆕 ' + ageD + ' ngày tuổi') : null, a.mid ? h('span', { className: 'text-[10px] font-bold px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300' }, 'mid-roll') : null),
          ok ? bar(a.score, farm ? 'bg-emerald-500' : 'bg-sky-500') : null,
          ok ? h('div', { className: 'grid grid-cols-3 gap-1.5' },
            cell('Video đạt', a.hits + '/' + a.n + ' (' + Math.round(a.hr * 100) + '%)', a.hr >= 0.5 ? 'text-emerald-400' : ''),
            cell('View trung vị', N(a.med) + ' • ×' + (a.medOut >= 10 ? Math.round(a.medOut) : a.medOut.toFixed(1)), a.medOut >= 1 ? 'text-emerald-400' : ''),
            cell('So với ngách', c.peer ? '×' + c.peer.toFixed(1) : '—', c.peer >= 1.5 ? 'text-amber-300' : ''),
            cell('View 30 ngày', N(a.v30)),
            cell('Độ dài • tần suất', (f.fmt === 'short' ? Math.round(a.avgDur) + 's' : Math.round(a.avgDur / 60) + 'p') + ' • ' + a.cad.toFixed(1) + '/tuần'),
            cell('Ước tính 30 ngày', a.eligible ? '$' + N(Math.round(a.rev[0])) + '–' + N(Math.round(a.rev[1])) : 'Chưa đủ 1K sub', a.eligible ? 'text-emerald-300' : 'text-zinc-500'))
            : h('div', { className: 'text-[11px] text-zinc-400 bg-zinc-900/70 rounded-lg px-2.5 py-2' }, a.v === 'unk' ? 'Mới thấy ' + c.vids.length + ' video nổ (tốt nhất ×' + Math.round(c.bestOut) + '). Bấm "🔬 Phân tích" ở trên để so sánh toàn bộ video của kênh.' : 'Không có video ' + (f.fmt === 'short' ? 'Shorts' : 'dài') + ' trong 60 ngày.'),
          c.vids.length > 0 && h('div', { className: 'grid grid-cols-3 gap-1.5' }, c.vids.slice(0, 3).map(function (v) {
            return h('a', { key: v.id, href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', title: v.title + ' — ' + N(v.views) + ' view', className: 'relative block' },
              h('img', { src: thumb(v.id), loading: 'lazy', className: 'w-full aspect-video object-cover rounded-md bg-zinc-900' }),
              h('span', { className: 'absolute bottom-0.5 left-0.5 text-[9px] font-bold px-1 rounded bg-black/80 text-white' }, N(v.views)),
              h('span', { className: 'absolute top-0.5 right-0.5 text-[9px] font-bold px-1 rounded bg-emerald-600 text-white' }, '×' + Math.round(v.out)));
          })),
          h('div', { className: 'flex gap-1.5 mt-auto' },
            h('a', { href: 'https://www.youtube.com/channel/' + c.id + '/videos', target: '_blank', rel: 'noopener noreferrer', className: 'flex-1 text-center py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white' }, 'Mở kênh ↗'),
            p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(c.best ? toApp(c.best) : { channel: c.name, channelId: c.id, subs: c.subs }); }, className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 cursor-pointer' }, '+ Theo dõi'),
            p.onSelectKeywordForSearch && c.best && h('button', { onClick: function () { p.onSelectKeywordForSearch(c.best.title); }, className: 'px-3 py-1.5 rounded-lg text-[11px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Tương tự')));
      })),
      more(D.channels.length), lock(D.channels.length));

    // ---------- Tab Video ----------
    var vidView = !D.videos.length ? empty('Chưa có video nào qua bộ lọc') : h('div', { className: 'space-y-3' },
      h('div', { className: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4' }, cut(D.videos).map(function (v) {
        var saved = p.isSaved && p.isSaved(v.id);
        return h('div', { key: v.id, className: 'rounded-xl border border-zinc-800 bg-zinc-950/70 overflow-hidden flex flex-col' },
          h('a', { href: 'https://www.youtube.com/watch?v=' + v.id, target: '_blank', rel: 'noopener noreferrer', className: 'relative block' },
            h('img', { src: thumb(v.id), loading: 'lazy', className: 'w-full aspect-video object-cover bg-zinc-900' }),
            h('span', { className: 'absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/80 text-white' }, flag(v.mk) + ' ' + N(v.subs) + ' sub'),
            h('span', { className: 'absolute top-1.5 right-1.5 text-[11px] font-black px-1.5 py-0.5 rounded bg-emerald-500 text-black' }, '×' + (v.out >= 10 ? Math.round(v.out) : v.out.toFixed(1))),
            v.a.v === 'farm' && h('span', { className: 'absolute bottom-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white' }, '💰 Kênh farm'),
            h('span', { className: 'absolute bottom-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/80 text-white' }, dur(v.dur))),
          h('div', { className: 'p-2.5 flex-1 flex flex-col gap-1.5' },
            h('div', { className: 'text-xs font-semibold text-zinc-100 line-clamp-2', title: v.title }, v.title),
            h('a', { href: 'https://www.youtube.com/channel/' + v.ch, target: '_blank', rel: 'noopener noreferrer', className: 'text-[11px] text-zinc-400 truncate hover:text-white' }, v.chName + ' • ' + v.niche),
            h('div', { className: 'flex justify-between text-[11px]' }, h('span', { className: 'text-zinc-200 font-bold' }, '👁 ' + N(v.views)), h('span', { className: 'text-amber-300' }, '⚡' + N(v.vph) + '/giờ'), h('span', { className: 'text-zinc-500' }, age(v.hrs))),
            h('div', { className: 'flex gap-1.5 mt-auto pt-1' },
              p.onToggleSave && h('button', { onClick: function () { p.onToggleSave(toApp(v)); }, className: 'px-2 py-1 rounded-md text-[10px] font-bold border cursor-pointer ' + (saved ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-zinc-800 text-zinc-300 border-zinc-700') }, saved ? '✓ Đã lưu' : 'Lưu'),
              p.onAddCompetitor && h('button', { onClick: function () { p.onAddCompetitor(toApp(v)); }, className: 'px-2 py-1 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 cursor-pointer' }, '+ Kênh'),
              p.onSelectKeywordForSearch && h('button', { onClick: function () { p.onSelectKeywordForSearch(v.title); }, className: 'ml-auto px-2 py-1 rounded-md text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30 cursor-pointer' }, 'Tương tự'))));
      })),
      more(D.videos.length), lock(D.videos.length));

    if (!local) return h('div', { className: 'p-10 text-center text-sm text-zinc-400' }, 'Đang mở kho Top Ngách...');
    return h('section', { className: 'grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] animate-in fade-in duration-200' },
      sidebar,
      h('div', { className: 'space-y-3 min-w-0' }, head, toolbar, nicheChip, tab === 'niche' ? nicheView : tab === 'ch' ? chView : vidView));
  }
  window.TopNgachV3 = TopNgachV3;
})();
