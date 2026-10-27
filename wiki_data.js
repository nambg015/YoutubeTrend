// ==========================================
// YOUTUBETREND WIKI & KNOWLEDGE BASE DATASET
// 24 Full In-Depth Articles & 8 Topic Categories
// ==========================================

const WIKI_CATEGORIES = [
  {
    "id": "basic",
    "name": "Kiến thức cơ bản",
    "icon": "🌱",
    "desc": "Nền tảng thuật toán YouTube, định nghĩa ngách và mô hình nội dung."
  },
  {
    "id": "trend_niche",
    "name": "Tìm trend & Tìm ngách",
    "icon": "🔥",
    "desc": "Phương pháp phân biệt trend, bắt sóng sớm và phát hiện video bứt phá."
  },
  {
    "id": "metrics",
    "name": "Đọc hiểu số liệu",
    "icon": "📊",
    "desc": "Giải mã Performance Multiple, Median Views, VPH và các chỉ số cốt lõi."
  },
  {
    "id": "competitors",
    "name": "Phân tích đối thủ",
    "icon": "🕵️",
    "desc": "Kỹ thuật soi kênh đối thủ, bóc tách công thức thành công của kênh nhỏ."
  },
  {
    "id": "title_thumbnail",
    "name": "Tiêu đề & Thumbnail",
    "icon": "🎯",
    "desc": "Khuôn tiêu đề (Title Patterns) và góc tiếp cận (Content Angles) hút click."
  },
  {
    "id": "validation",
    "name": "Kiểm chứng nhu cầu",
    "icon": "🧪",
    "desc": "Xác minh nhu cầu thật của thị trường, tránh bẫy video ăn may đơn lẻ."
  },
  {
    "id": "platform",
    "name": "Sử dụng YouTubeTrend",
    "icon": "🛠️",
    "desc": "Khai thác tối đa công cụ radar, bộ lọc và lưu ý khi dùng AI tìm ngách."
  },
  {
    "id": "planning",
    "name": "Kế hoạch sản xuất",
    "icon": "🚀",
    "desc": "Chọn ngách khởi đầu, lên 10 ý tưởng video đầu tiên và tối ưu quy trình."
  }
];

const WIKI_ARTICLES = [
  {
    "id": "trend_def",
    "title": "Trend là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "3 phút",
    "summary": "Trend (Xu hướng) là sự gia tăng đột biến về lượng người xem và mức độ tương tác đối với một chủ đề cụ thể trong một khoảng thời gian xác định.",
    "formula": "Trend = Nhu cầu tìm kiếm tăng vọt + Tỷ lệ nhấp (CTR) cao + Thời gian xem (Retention) tốt.",
    "whatIs": "Trend trên YouTube là hiện tượng một chủ đề, từ khóa, hoặc định dạng video nhận được sự quan tâm tăng vọt từ khán giả. Khi tín hiệu tương tác tăng mạnh, thuật toán YouTube sẽ chủ động phân phối các video thuộc chủ đề này lên trang chủ (Browse Features) và cột Đề xuất (Suggested Videos).",
    "whyCare": "Đối với kênh mới hoặc kênh nhỏ chưa có lượng người đăng ký lớn, làm video ăn theo trend đang lên là con đường nhanh nhất để thuật toán mang video của bạn đến với hàng chục nghìn khán giả mới.",
    "simpleExplanation": "Hãy tưởng tượng trend như một cơn sóng lớn ngoài biển. Người lướt sóng không tự tạo ra sóng mà quan sát và bơi đón đúng con sóng đang cuộn lên để được đẩy đi xa mà tốn ít sức nhất.",
    "practicalUsage": "Khi phát hiện một trend mới chớm nở trong ngách của mình, hãy nhanh chóng sản xuất một video với góc nhìn riêng hoặc chất lượng cao hơn để hứng trọn luồng khán giả đang khao khát nội dung đó.",
    "realWorldExample": "Chủ đề \"Billionaire maid story\" tại thị trường Mỹ đột ngột tăng tốc từ 200 lượt xem/giờ lên 1.800 lượt xem/giờ. Các kênh mới đăng video cùng chủ đề trong vòng 48h đều đạt từ 40k đến 150k view dù kênh chỉ có dưới 5k sub.",
    "stepByStep": "1. Truy cập tab \"Xu hướng\" hoặc \"Trend SRT\" trên YouTrend.\n2. Chọn khung thời gian 24h hoặc 48h để phát hiện sóng sớm.\n3. Lọc theo tốc độ VPH (View Per Hour) cao nhất.\n4. Bấm \"Bắt Trend Cụm Từ Khóa\" để xem các cụm từ đang được nhiều kênh cùng khai thác.",
    "commonMistakes": "Nhảy vào làm trend khi nó đã đạt đỉnh hoặc bắt đầu hạ nhiệt (sau 2-3 tuần), lúc này hàng nghìn kênh lớn đã nhảy vào khiến video của bạn bị chìm nghỉm.",
    "misconceptions": "Nhiều người lầm tưởng video nào có nhiều view cũng là trend. Thực tế một video 10 triệu view đăng từ 5 năm trước không phải là trend, chỉ những chủ đề có vận tốc tăng trưởng hiện tại (VPH cao) mới là trend thực sự.",
    "relatedConcepts": [
      "view_velocity",
      "outlier_video",
      "short_vs_long_trend"
    ],
    "exercise": "Câu hỏi: Một video có 5 triệu view đăng từ 3 năm trước và hiện tăng 20 view/ngày, so với một video 30k view đăng 2 ngày trước và đang tăng 1.500 view/giờ. Đâu là video phản ánh trend hiện tại?\n\nĐáp án: Video thứ hai (30k view, 1.500 view/h) là trend thật vì có vận tốc tăng trưởng (velocity) rất cao ở thời điểm hiện tại."
  },
  {
    "id": "niche_def",
    "title": "Ngách YouTube là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "4 phút",
    "summary": "Ngách (Niche) là phân khúc chuyên biệt của thị trường YouTube, tập trung vào một chủ đề, phong cách hoặc nhóm khán giả mục tiêu cụ thể.",
    "formula": "Ngách = Chủ đề chuyên sâu + Chân dung khán giả rõ ràng + Nhu cầu xem ổn định.",
    "whatIs": "Ngách là ranh giới định vị nội dung cho một kênh YouTube. Thay vì làm tất cả mọi thứ linh tinh, một kênh chuyên ngách sẽ chỉ tập trung giải quyết một nhu cầu thông tin hoặc giải trí cụ thể cho một nhóm khán giả nhất định.",
    "whyCare": "Thuật toán YouTube phân phối video dựa trên sự phù hợp với từng người xem. Kênh có ngách rõ ràng giúp AI hiểu ngay tệp khán giả mục tiêu là ai, từ đó đề xuất video chính xác hơn và giữ chân người xem ở lại xem tiếp các video khác trong kênh.",
    "simpleExplanation": "Giống như việc mở một phòng khám chuyên khoa Mắt thay vì một tiệm tạp hóa chữa bách bệnh. Người bị đau mắt sẽ tin tưởng và tìm đến phòng khám chuyên khoa hơn.",
    "practicalUsage": "Xác định rõ ngách ngay từ video đầu tiên. Khi chọn ngách, cần đối chiếu với 3 tiêu chí: Có khán giả xem không? Mức độ cạnh tranh thế nào? RPM (doanh thu trên 1.000 view) có đủ hấp dẫn không?",
    "realWorldExample": "Thay vì làm ngách chung chung là \"Lịch sử thế giới\", kênh \"Dark Aero Tech\" thu hẹp ngách thành \"Vũ khí bí mật & Máy bay tàng hình quân sự\". Kết quả: 31k sub nhưng mỗi video đều đạt 40k - 80k view và RPM đạt tới $36/1k view.",
    "stepByStep": "1. Vào tab \"Top Ngách\" trên YouTrend.\n2. Quan sát 20 ngách bứt phá được xếp hạng theo thời gian thực.\n3. Kiểm tra RPM thực tế và độ cạnh tranh (Thấp/Trung bình/Cao).\n4. Bấm vào từng ngách để xem các kênh nhỏ đang khai thác thành công.",
    "commonMistakes": "Chọn ngách quá rộng (như \"Công nghệ\", \"Game\") khiến kênh không có bản sắc; hoặc chọn ngách mình thích nhưng thị trường không ai tìm kiếm.",
    "misconceptions": "Cho rằng ngách hẹp thì ít view. Thực tế nhiều ngách siêu hẹp tại thị trường Mỹ (như âm thanh mưa rơi ru ngủ) lại có hàng triệu lượt nghe thụ động mỗi tuần.",
    "relatedConcepts": [
      "micro_niche",
      "topic_cluster",
      "saturation_level"
    ],
    "exercise": "Câu hỏi: Kênh A đăng video về: Nấu phở, Review phim kinh dị, Hướng dẫn code Python. Kênh B chỉ đăng: Hướng dẫn sửa đồng hồ cơ Thụy Sĩ cổ. Kênh nào có cơ hội được thuật toán YouTube nhận diện và đề xuất tốt hơn?\n\nĐáp án: Kênh B, vì có ngách nhất quán, tín hiệu người xem đồng nhất giúp thuật toán dễ dàng tìm đúng khán giả."
  },
  {
    "id": "micro_niche",
    "title": "Micro-niche (Siêu ngách) là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "3 phút",
    "summary": "Micro-niche là một nhánh con cực kỳ chi tiết nằm sâu bên trong một ngách lớn, nơi có ít đối thủ lớn nhưng khán giả cực kỳ trung thành.",
    "formula": "Thị trường lớn → Ngách chuyên sâu → Siêu ngách (Micro-niche).",
    "whatIs": "Micro-niche là cấp độ phân tách thứ 3 hoặc thứ 4 của một chủ đề. Khi một ngách lớn đã có nhiều ông lớn chiếm lĩnh, việc đào sâu xuống micro-niche là chìa khóa vàng để kênh mới giành giật thị phần.",
    "whyCare": "Kênh mới rất khó cạnh tranh từ khóa chung với các kênh triệu sub. Nhưng trong một micro-niche, các ông lớn thường bỏ qua vì dung lượng thị trường nhỏ hơn, tạo khoảng trống hoàn hảo cho kênh mới thống trị.",
    "simpleExplanation": "Nếu ngách là \"Thời trang\", micro-niche là \"Thời trang công sở nam cổ điển phong cách Ý thập niên 80\". Khán giả tìm đến đây chính xác là những người đam mê phong cách đó.",
    "practicalUsage": "Bắt đầu kênh bằng một micro-niche để xây dựng 1.000 - 10.000 khán giả trung thành đầu tiên, sau đó từ từ mở rộng ra ngách lớn hơn khi kênh đã có thẩm quyền (authority).",
    "realWorldExample": "Thị trường: Tôn giáo → Ngách: Cầu nguyện Kitô giáo → Micro-niche: \"Lời cầu nguyện ban đêm dành riêng cho người cao tuổi mất ngủ\". Kênh Sacred Grace chỉ làm đúng chủ đề này và đạt tỷ lệ giữ chân 90%.",
    "stepByStep": "1. Chọn một ngách từ tab \"Top Ngách\".\n2. Xem các video bứt phá của kênh nhỏ trong ngách đó.\n3. Nhìn vào tiêu đề để tìm ra góc nhỏ nhất đang lặp lại (ví dụ: người hầu & tỷ phú, không phải chỉ là chuyện gia đình nói chung).",
    "commonMistakes": "Thu hẹp ngách đến mức không còn ai quan tâm (ví dụ: \"Review kính lúp sản xuất năm 1902 tại làng X\"). Cần đảm bảo micro-niche vẫn có ít nhất vài chục nghìn lượt tìm kiếm mỗi tháng.",
    "misconceptions": "Nghĩ rằng làm micro-niche thì không bao giờ kiếm được nhiều tiền. Thực tế micro-niche thường có tệp khán giả chất lượng cao, RPM cao và tỷ lệ chuyển đổi tài trợ/affiliate vượt trội.",
    "relatedConcepts": [
      "niche_def",
      "demand_validation",
      "first_10_videos"
    ],
    "exercise": "Hãy phân tách chủ đề \"Tài chính cá nhân\" thành 1 ngách và 1 micro-niche phù hợp cho kênh Faceless AI.\n\nĐáp án mẫu: Ngách: \"Tự động hóa kinh doanh online bằng AI\" → Micro-niche: \"Xây dựng AI Agent chăm sóc khách hàng không cần code cho chủ shop nhỏ\"."
  },
  {
    "id": "evergreen_content",
    "title": "Evergreen content là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "3 phút",
    "summary": "Nội dung trường tồn (Evergreen) là dạng video duy trì được sự quan tâm và lượt xem ổn định qua nhiều năm mà không bị lỗi thời theo sự kiện thời sự.",
    "formula": "Nội dung giải quyết nhu cầu bất biến = Lượt xem và doanh thu thụ động liên tục 365 ngày/năm.",
    "whatIs": "Evergreen content là những video giải quyết các câu hỏi, nỗi đau hoặc nhu cầu căn bản của con người: kỹ năng sống, thiền định ngủ ngon, triết lý nhân sinh, lịch sử cổ đại, câu chuyện đạo đức.",
    "whyCare": "Video tin tức nóng có thể mang về 100k view trong 3 ngày nhưng sau đó view về số 0. Video Evergreen có thể chỉ đạt 1k view/ngày nhưng đều đặn trong 5 năm, mang về 1.8 triệu view thụ động mà không tốn công cập nhật.",
    "simpleExplanation": "Giống như trồng một cây ăn quả lâu năm so với trồng luống rau muống. Rau muống thu hoạch nhanh rồi tàn, cây ăn quả lớn chậm nhưng cho quả đều đặn mùa này qua mùa khác.",
    "practicalUsage": "Một chiến lược kênh bền vững thường kết hợp 70% nội dung Evergreen (làm nền tảng doanh thu) và 30% nội dung Trend (để kéo lượng khán giả mới đột biến).",
    "realWorldExample": "Video \"Tiếng mưa rơi trên mái tôn ấm cúng 10 tiếng ru ngủ\" sản xuất năm 2022 vẫn mang về đều đặn $800 - $1.200 USD mỗi tháng cho chủ kênh đến tận ngày nay.",
    "stepByStep": "1. Vào tab \"Xu hướng\", chọn bộ lọc thời gian \"30 ngày qua\" hoặc \"Toàn bộ thời gian\".\n2. Lọc độ dài video \"Dài > 20 phút\".\n3. Tìm các chủ đề như: Kinh thánh ru ngủ, Triết lý khắc kỷ, Phục chế máy móc cổ.",
    "commonMistakes": "Đưa quá nhiều yếu tố thời vụ (như \"năm 2025\", tên chính trị gia đương nhiệm) vào tiêu đề khiến video bị xem là lỗi thời sau vài tháng.",
    "misconceptions": "Nhiều người nghĩ Evergreen content không bao giờ nổ view lớn được. Thực tế khi video tích lũy đủ watch time và tín hiệu tương tác tích cực, thuật toán vẫn có thể đề xuất bùng nổ như video trend.",
    "relatedConcepts": [
      "trend_def",
      "short_vs_long_trend",
      "median_views"
    ],
    "exercise": "Trong 2 video sau, video nào là Evergreen: 1) \"Phân tích diễn biến bầu cử tổng thống Mỹ tháng 11/2024\", 2) \"7 Bài học làm chủ cảm xúc của Hoàng đế La Mã Marcus Aurelius\"?\n\nĐáp án: Video 2 là Evergreen vì bài học triết học khắc kỷ 2.000 năm trước đến nay và 10 năm sau vẫn giữ nguyên giá trị."
  },
  {
    "id": "short_vs_long_trend",
    "title": "Trend ngắn hạn vs Nhu cầu dài hạn khác nhau thế nào?",
    "category": "trend_niche",
    "level": "Trung cấp",
    "readTime": "4 phút",
    "summary": "Trend ngắn hạn bùng nổ theo tin tức thời sự rồi tắt nhanh; Nhu cầu dài hạn phát triển theo chu kỳ bền vững hoặc nhu cầu tìm kiếm vĩnh viễn.",
    "formula": "Ngắn hạn: Đỉnh nhọn, sụt dốc thẳng đứng | Dài hạn: Tăng trưởng đều, duy trì đáy cao.",
    "whatIs": "Sự khác biệt cốt lõi giữa hai loại nằm ở vòng đời của sự tò mò. Trend ngắn hạn gắn liền với drama, sự kiện scandal hoặc meme internet. Nhu cầu dài hạn gắn với sở thích cốt lõi, thói quen sinh hoạt và vấn đề cần giải quyết hàng ngày.",
    "whyCare": "Nếu xây toàn bộ kênh trên các trend ngắn hạn, bạn sẽ phải làm video kiệt sức liên tục mỗi ngày; nếu ngưng đăng 1 tuần là kênh tụt dốc thê thảm vì các video cũ không còn ai xem.",
    "simpleExplanation": "Trend ngắn hạn như bát mì ăn liền - ăn xong hết đói ngay nhưng không no lâu. Nhu cầu dài hạn như hạt gạo nấu cơm - ăn mỗi ngày cả năm không ngán.",
    "practicalUsage": "Dùng trend ngắn hạn để \"kích hoạt\" kênh mới cắn đề xuất lúc đầu, sau đó chuyển hướng luồng người xem đó sang danh sách phát các video nhu cầu dài hạn để giữ chân họ lâu dài.",
    "realWorldExample": "Khi siêu bão đổ bộ vào Mỹ, các video mô phỏng bão đạt đỉnh 500k view trong 48h rồi tụt về 50 view/ngày (ngắn hạn). Trong khi đó, video kể chuyện người giúp việc tỷ phú giữ đều 5.000 - 10.000 view/ngày quanh năm (dài hạn).",
    "stepByStep": "1. Sử dụng tính năng \"Chọn mốc thời gian\" trong tab Top Ngách (24h, 1 ngày, 7 ngày, 30 ngày, 90 ngày).\n2. Nếu một ngách đứng top ở mốc 24h nhưng tụt hạng sâu ở mốc 30 ngày -> Đó là trend ngắn hạn.\n3. Nếu ngách giữ vững phong độ ổn định ở mốc 30 ngày và 90 ngày -> Nhu cầu dài hạn bền vững.",
    "commonMistakes": "Dành 2 tuần để dựng một video cực kỳ công phu cho một trend ngắn hạn chỉ tồn tại trong 3 ngày; khi video ra đời thì khán giả đã chuyển sang quan tâm chuyện khác.",
    "misconceptions": "Nhiều người nghĩ chỉ có video ngắn mới là trend ngắn hạn. Thực tế video dài 60 phút vẫn có thể là trend ngắn hạn nếu bám theo một sự kiện thời sự vừa diễn ra.",
    "relatedConcepts": [
      "trend_def",
      "evergreen_content",
      "demand_validation"
    ],
    "exercise": "Nếu bạn có 1 tuần để làm 2 video cho kênh mới, bạn nên phân bổ tỷ lệ như thế nào giữa trend ngắn hạn và nhu cầu dài hạn?\n\nĐáp án: Nên làm 1 video bắt trend nóng đang lên để kéo lượng tiếp cận ban đầu, và 1 video giải quyết nhu cầu dài hạn để tích lũy tài sản view thụ động."
  },
  {
    "id": "viral_video",
    "title": "Video viral là gì?",
    "category": "trend_niche",
    "level": "Cơ bản",
    "readTime": "3 phút",
    "summary": "Video viral là video có tốc độ lan truyền vượt bậc, vượt ra khỏi tệp khán giả ban đầu của kênh để tiếp cận hàng trăm nghìn hoặc hàng triệu khán giả đại chúng.",
    "formula": "Viral = CTR mở màn cao (> 12%) + Watch Time trung bình vượt chuẩn (> 60%) + Tỷ lệ chia sẻ & bình luận mạnh.",
    "whatIs": "Một video được coi là viral khi hệ thống đề xuất của YouTube nhận thấy các chỉ số giữ chân và tương tác tốt đến mức nó tự tin đẩy video đó ra ngoài luồng đối tượng hẹp thông thường, đưa vào trang chủ của hàng triệu tài khoản người dùng khác nhau.",
    "whyCare": "Một video viral có thể thay đổi hoàn toàn vận mệnh của một kênh YouTube: mang về từ 10.000 đến 50.000 subscriber chỉ trong 1 tuần và nâng uy tín của toàn bộ kênh lên nấc thang mới.",
    "simpleExplanation": "Như một câu chuyện phiếm quá hấp dẫn ở quán nước, ai nghe xong cũng muốn quay sang kể lại ngay cho người ngồi cạnh nghe.",
    "practicalUsage": "Nghiên cứu kỹ các yếu tố trong 30 giây đầu (Hook) và hình ảnh thumbnail của các video viral cùng ngách trên YouTrend để học hỏi cách họ kích hoạt sự tò mò của người xem.",
    "realWorldExample": "Video \"Tỷ phú về nhà bất ngờ... những gì cô hầu gái đang làm với mẹ già khiến cả nhà chết lặng\" đạt 1.2 triệu view trong 5 ngày cho một kênh chỉ có 12k sub nhờ thumbnail gây sốc và cốt truyện giữ chân 78%.",
    "stepByStep": "1. Vào tab \"Xu hướng\", sắp xếp theo \"Lượt xem\" hoặc \"VPH\".\n2. Bấm nút \"Copy Prompt Kịch Bản\" hoặc \"Prompt Thumbnail\" tại các video có badge viral để phân tích cấu trúc.",
    "commonMistakes": "Nghĩ rằng video viral là do may mắn ngẫu nhiên. Thực tế mọi video viral đều tuân thủ chặt chẽ công thức tâm lý: Khơi gợi tò mò tột đỉnh + Giải tỏa cảm xúc bất ngờ ở phút cuối.",
    "misconceptions": "Nhiều người tưởng video viral phải tốn rất nhiều tiền quay phim. Trong thực tế các video Faceless AI kể chuyện chỉ dùng ảnh ghép và giọng đọc AI vẫn viral hàng triệu view đều đặn.",
    "relatedConcepts": [
      "outlier_video",
      "performance_multiple",
      "title_pattern"
    ],
    "exercise": "Yếu tố nào quyết định nhiều nhất đến việc thuật toán quyết định mở rộng luồng đề xuất cho một video thành viral: Số lượng sub của kênh hay Tỷ lệ xem hết video (Retention)?\n\nĐáp án: Tỷ lệ xem hết video (Retention) và thời lượng xem trung bình (Watch Time), số lượng sub của kênh hầu như không ảnh hưởng đến quyết định này."
  },
  {
    "id": "outlier_video",
    "title": "Outlier video là gì?",
    "category": "trend_niche",
    "level": "Trung cấp",
    "readTime": "4 phút",
    "summary": "Outlier video (Video ngoại lai đột biến) là video có hiệu suất vượt trội gấp 3x - 20x lần so với mức xem trung vị thông thường của chính kênh đó.",
    "formula": "Outlier = Lượt xem video / Lượt xem trung vị của kênh >= 3.0x.",
    "whatIs": "Trong thống kê, Outlier là điểm dữ liệu nằm cách xa phần còn lại. Trên YouTube, Outlier video là minh chứng rõ nhất cho thấy: Không phải do kênh có tiếng, mà chính TIÊU ĐỀ và CHỦ ĐỀ của video đó đã đánh trúng cơn khát của thuật toán và khán giả.",
    "whyCare": "Đây là mỏ vàng quý giá nhất để tìm ý tưởng. Xem một kênh 1 triệu sub đạt 500k view là chuyện bình thường. Nhưng một kênh chỉ có 5.000 sub mà có 1 video đạt 300k view thì đó là dấu hiệu chắc chắn của một chủ đề Outlier cực nóng!",
    "simpleExplanation": "Trong một đàn gà con đều nặng 1kg, bỗng xuất hiện một chú gà nặng 8kg. Rõ ràng con gà này đã ăn được một loại thức ăn đặc biệt béo bổ mà những con khác không có.",
    "practicalUsage": "Khi nghiên cứu đối thủ, hãy bỏ qua các video có lượt xem lẹt đẹt và chỉ tập trung soi các video Outlier (có tỷ lệ Performance Multiple cao) để mô phỏng lại góc tiếp cận đó cho kênh của mình.",
    "realWorldExample": "Kênh \"Mind Vault Mystery\" có trung vị các video đạt 12k view. Bỗng có video \"7 Thủ Thuật Tâm Lý Khiến Kẻ Thao Túng Phải Tự Bộc Lộ\" đạt tới 210k view (gấp 17.5x lần trung vị). Đây là một Outlier điển hình.",
    "stepByStep": "1. Vào tab \"Top Ngách\" trên YouTrend.\n2. Quan sát badge \"🔥 x... View/Sub\" trên từng thẻ kênh để phát hiện ngay các kênh có Outlier đột biến.\n3. Bấm vào kênh đó để xem danh sách video bứt phá thực tế.",
    "commonMistakes": "Nhầm lẫn giữa Outlier của kênh lớn và Outlier của kênh nhỏ. Outlier của kênh nhỏ (<50k sub) có giá trị tham khảo cao hơn gấp 10 lần so với kênh lớn.",
    "misconceptions": "Nhiều người nghĩ Outlier video chỉ là ăn may một lần. Nếu một chủ đề xuất hiện Outlier ở 3-4 kênh nhỏ độc lập khác nhau, đó là TREND THẬT chứ không phải ăn may.",
    "relatedConcepts": [
      "performance_multiple",
      "median_views",
      "demand_validation"
    ],
    "exercise": "Kênh A có 100k sub, video đạt 110k view. Kênh B có 10k sub, video đạt 150k view. Video của kênh nào có giá trị nghiên cứu Outlier cao hơn?\n\nĐáp án: Kênh B, vì tỷ lệ bứt phá so với quy mô kênh (15x sub) vượt trội hơn hẳn, chứng tỏ chủ đề và tiêu đề có sức hút tự thân cực mạnh."
  },
  {
    "id": "performance_multiple",
    "title": "Performance Multiple — Bội số hiệu suất là gì?",
    "category": "metrics",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Performance Multiple (Bội số hiệu suất) đo lường một video có lượt xem gấp bao nhiêu lần so với mức xem trung vị bình thường của kênh đó.",
    "formula": "Performance Multiple = Lượt xem video / Lượt xem trung vị (Median Views) của kênh.",
    "whatIs": "Performance Multiple là chỉ số khoa học giúp chuẩn hóa hiệu suất của video, loại bỏ yếu tố thiên lệch về quy mô người đăng ký. Nó cho bạn biết video đó hoạt động tốt hơn mức kỳ vọng thông thường của kênh bao nhiêu lần.",
    "whyCare": "Nếu chỉ nhìn vào lượt xem tuyệt đối (ví dụ: 100.000 view), bạn không thể biết đó là thành công hay thất bại. Với kênh MrBeast thì 100k view là thảm họa (0.01x), nhưng với một kênh nhỏ 2k sub thì 100k view là một kỳ tích (50x)!",
    "simpleExplanation": "Giống như đánh giá điểm thi của học sinh: Một học sinh bình thường chỉ được 4 điểm nay bỗng được 9 điểm (bứt phá 2.25x) sẽ đáng chú ý hơn một học sinh chuyên luôn đạt điểm 9.",
    "practicalUsage": "Thang đo chuẩn để đánh giá ý tưởng:\n- Dưới 1.0x: Dưới mức trung bình của kênh (Bỏ qua).\n- 1.0x - 2.5x: Bình thường, duy trì ổn định.\n- 3.0x - 5.0x: Video hiệu suất tốt (Đáng tham khảo).\n- Trên 5.0x - 20x: OUTLIER ĐỈNH CAO (Bắt buộc phải phân tích và làm ngay!).",
    "realWorldExample": "Một kênh lịch sử có trung vị 8.000 view/video. Video mới về \"Bí mật hầm ngầm Lầu Năm Góc\" đạt 72.000 view -> Performance Multiple = 72.000 / 8.000 = 9.0x (Gấp 9 lần trung vị kênh).",
    "stepByStep": "1. Trên YouTrend, biểu tượng \"⚡ x... Median\" hiển thị trực tiếp trên thẻ video.\n2. Bấm vào chỉ số này để xem biểu đồ so sánh với mức trung vị của kênh.\n3. Lọc danh sách video theo Performance Multiple giảm dần để tìm các ý tưởng tiềm năng nhất.",
    "commonMistakes": "Dùng lượt xem trung bình thay vì trung vị để tính mẫu số, khiến mẫu số bị phình to do 1 video cũ và làm giảm giá trị của các video mới.",
    "misconceptions": "Cho rằng Performance Multiple cao chỉ áp dụng cho video ngắn. Video dài 45 phút có Performance Multiple 10x mang lại giá trị doanh thu gấp hàng chục lần video ngắn cùng bội số.",
    "relatedConcepts": [
      "median_views",
      "mean_vs_median",
      "outlier_video"
    ],
    "exercise": "Video A đạt 60.000 view trên kênh có trung vị 6.000 view. Video B đạt 200.000 view trên kênh có trung vị 100.000 view. Video nào có Performance Multiple cao hơn?\n\nĐáp án: Video A có Performance Multiple = 10x (60k/6k), cao hơn nhiều so với Video B chỉ đạt 2.0x (200k/100k)."
  },
  {
    "id": "median_views",
    "title": "Median views — Lượt xem trung vị là gì?",
    "category": "metrics",
    "level": "Trung cấp",
    "readTime": "3 phút",
    "summary": "Lượt xem trung vị (Median Views) là con số nằm chính giữa khi sắp xếp toàn bộ danh sách lượt xem các video của kênh từ thấp đến cao.",
    "formula": "Sắp xếp danh sách lượt xem [V1, V2, ... Vn] tăng dần → Lấy giá trị ở vị trí giữa danh sách.",
    "whatIs": "Khác với số trung bình cộng (cộng tất cả lại rồi chia đều), trung vị là giá trị đại diện cho 50% số video của kênh đạt được. Nó phản ánh chân thực năng lực phát hành nội dung thông thường của kênh mà không bị đánh lừa bởi các ngoại lệ.",
    "whyCare": "Đây là mỏ neo chuẩn xác nhất để tính toán Performance Multiple. Biết được trung vị của kênh đối thủ giúp bạn đánh giá ngay kênh đó đang sống bằng phong độ đều đặn hay chỉ sống mòn nhờ 1 video ăn may trong quá khứ.",
    "simpleExplanation": "Trong một căn phòng có 5 người thu nhập 10 triệu/tháng, tỷ phú Bill Gates bước vào. Thu nhập trung bình của căn phòng vọt lên hàng tỷ đồng, nhưng thu nhập TRUNG VỊ vẫn là 10 triệu đồng - phản ánh đúng đời sống của đa số người trong phòng.",
    "practicalUsage": "Khi khảo sát đối thủ, hãy lấy 10-20 video dài gần nhất (bỏ qua Shorts), tính trung vị lượt xem để biết một video bình thường của họ kiếm được bao nhiêu view.",
    "realWorldExample": "Một kênh có 7 video với view lần lượt: 3.2k, 4.1k, 4.8k, 5.5k, 6.2k, 7.0k, 250k. Giá trị nằm ở giữa là 5.5k view. Đây chính là Median Views thực tế của kênh, thay vì con số trung bình ảo là 40k view!",
    "stepByStep": "1. YouTrend tự động tính toán Median Views cho các kênh đối thủ trong tab \"Đối thủ\".\n2. Dữ liệu này được làm mẫu số để hiển thị tỷ lệ bứt phá trên từng video.",
    "commonMistakes": "Gộp cả video Shorts (thường view cao nhưng watch time thấp) vào tính chung với video dài, làm sai lệch mức trung vị.",
    "misconceptions": "Nhiều người nghĩ tính trung vị phức tạp. Thực tế chỉ cần sắp xếp lại dãy số và bốc con số ở giữa.",
    "relatedConcepts": [
      "mean_vs_median",
      "performance_multiple",
      "competitor_analysis"
    ],
    "exercise": "Tính Median Views của kênh có 5 video: 2.000, 3.500, 4.000, 8.000, 95.000 view.\n\nĐáp án: Sắp xếp theo thứ tự: 2.000, 3.500, [4.000], 8.000, 95.000 → Con số ở chính giữa là 4.000 view."
  },
  {
    "id": "mean_vs_median",
    "title": "Vì sao không nên chỉ sử dụng lượt xem trung bình?",
    "category": "metrics",
    "level": "Trung cấp",
    "readTime": "3 phút",
    "summary": "Lượt xem trung bình (Mean) rất dễ bị bóp méo nghiêm trọng bởi chỉ một video ăn may vài triệu view, tạo ra ảo tưởng về năng lực thực tế của kênh.",
    "formula": "Trung bình = Bị chi phối bởi số cực trị | Trung vị = Phản ánh đúng 50% số lượng video thông thường.",
    "whatIs": "Trong phân tích dữ liệu YouTube, lượt xem không phân bổ theo đồ thị hình chuông chuẩn mà phân bổ theo luật lũy thừa (Power Law). Một kênh có thể có 99 video chỉ 1.000 view nhưng có đúng 1 video 2 triệu view.",
    "whyCare": "Nếu bạn dùng số trung bình, bạn sẽ tưởng kênh này mỗi video ra đều đạt 21.000 view và vội vàng lao vào làm ngách đó. Khi kênh của bạn lập ra và chỉ đạt 1.000 view, bạn sẽ vỡ mộng và bỏ cuộc.",
    "simpleExplanation": "Giống như việc bạn đi câu cá: Cả tháng câu được toàn cá rô 1 lạng, bỗng ngày cuối vớt được con cá tra 20kg. Bạn không thể nói trung bình mỗi ngày mình câu được 7 lạng cá!",
    "practicalUsage": "Luôn so sánh cả 2 con số:\n- Nếu Trung bình xấp xỉ Trung vị: Kênh có phong độ cực kỳ ổn định, thuật toán tin tưởng cao.\n- Nếu Trung bình cao gấp 5x - 10x Trung vị: Kênh sống nhờ ăn may 1-2 video, các video còn lại không có khán giả trung thành.",
    "realWorldExample": "Kênh \"Mystery Archive\" có 10 video: 9 video chỉ đạt từ 1.000 đến 2.000 view, 1 video đạt 500.000 view. Trung bình = 51.300 view/video (Ảo tưởng). Trung vị = 1.500 view/video (Sự thật trần trụi).",
    "stepByStep": "1. Khi bấm vào xem chi tiết kênh trong YouTrend, hệ thống hiển thị song song cả Average Views và Median Views.\n2. Cảnh báo màu vàng sẽ hiện lên nếu có sự chênh lệch quá 3 lần giữa 2 chỉ số này.",
    "commonMistakes": "Báo cáo số liệu với đối tác hoặc tự đánh giá ngách dựa trên con số Average Views lấy từ các trang thống kê công cộng thiếu bộ lọc trung vị.",
    "misconceptions": "Cho rằng số trung bình luôn chính xác hơn vì nó cộng gộp toàn bộ dữ liệu. Trong thống kê hành vi người dùng, số trung vị luôn là thước đo chuẩn xác hơn khi có phân bổ lệch.",
    "relatedConcepts": [
      "median_views",
      "performance_multiple",
      "outlier_video"
    ],
    "exercise": "Một kênh có 3 video: 10k view, 12k view và 1 triệu view. Con số nào phản ánh đúng kỳ vọng lượt xem của video thứ tư: 340k view (Trung bình) hay 12k view (Trung vị)?\n\nĐáp án: 12k view (Trung vị) là kỳ vọng thực tế nhất cho video tiếp theo."
  },
  {
    "id": "sub_vs_views",
    "title": "Subscriber và lượt xem khác nhau thế nào?",
    "category": "metrics",
    "level": "Cơ bản",
    "readTime": "3 phút",
    "summary": "Subscriber là con số tích lũy trong quá khứ; Lượt xem là thước đo phản ánh chất lượng nội dung và sự hài lòng của khán giả ở thời điểm hiện tại.",
    "formula": "Doanh thu & Đề xuất = Dựa trên Lượt xem và Thời gian xem, KHÔNG dựa trên số Subscriber.",
    "whatIs": "Subscriber (người đăng ký) trước đây từng là thước đo quan trọng. Nhưng với thuật toán phân phối hiện đại của YouTube (tập trung vào trang chủ Browse và cột Đề xuất), YouTube đưa video đến người xem dựa trên sở thích xem gần đây của họ chứ không tự động hiển thị video cho toàn bộ người đăng ký.",
    "whyCare": "Hiểu được điều này giúp người làm kênh mới giải tỏa tâm lý tự ti: Bạn hoàn toàn có thể đạt 500k view cho một video ngay cả khi kênh của bạn chỉ mới có 50 subscriber!",
    "simpleExplanation": "Subscriber giống như tấm danh thiếp cũ trong ngăn kéo. Lượt xem giống như số người thực sự ghé thăm cửa hàng của bạn hôm nay.",
    "practicalUsage": "Khi săn kênh mỏ vàng, hãy tìm kiếm các kênh có tỷ lệ View/Sub > 5x (Ví dụ: 10k sub nhưng video đạt 100k view). Đó là minh chứng cho thấy thuật toán đang mang người xem mới đến kênh liên tục.",
    "realWorldExample": "Nhiều kênh có 1 triệu subscriber nhưng mỗi video mới đăng chỉ lẹt đẹt 5k - 10k view (Kênh chết). Ngược lại, kênh Faceless AI \"Stoic Life\" chỉ có 18k sub nhưng video nào cũng đạt 40k - 90k view.",
    "stepByStep": "1. Sử dụng bộ lọc \"Quy mô Sub\" trong tab Top Ngách: Chọn \"Dưới 30.000 Subs\" hoặc \"Dưới 50.000 Subs\".\n2. Hệ thống sẽ lọc ra các kênh ít sub nhưng lượt xem thực tế vượt trội.",
    "commonMistakes": "Bỏ tiền mua sub ảo hoặc sub chéo. Sub ảo không xem video sẽ kéo tụt tỷ lệ nhấp (CTR) ban đầu và khiến thuật toán đánh giá video của bạn là rác, bóp nghẹt đề xuất vĩnh viễn.",
    "misconceptions": "Nghĩ rằng phải đạt 100k sub thì mới bắt đầu kiếm được tiền nhiều. Trong các ngách High-RPM US, một kênh 15k sub với view đều đặn có thể kiếm $3.000 - $6.000 USD/tháng.",
    "relatedConcepts": [
      "performance_multiple",
      "outlier_video",
      "view_velocity"
    ],
    "exercise": "Tại sao việc mua 10.000 subscriber ảo lại hủy hoại khả năng cắn đề xuất của một kênh mới?\n\nĐáp án: Khi bạn đăng video mới, YouTube sẽ thử nghiệm phân phối cho một nhóm sub đầu tiên. Sub ảo không bấm vào xem (CTR = 0%), thuật toán kết luận video tồi và ngừng phân phối ra công chúng ngay lập tức."
  },
  {
    "id": "view_velocity",
    "title": "View velocity — Tốc độ tăng lượt xem (VPH) là gì?",
    "category": "metrics",
    "level": "Trung cấp",
    "readTime": "3 phút",
    "summary": "View velocity đo lường số lượt xem video tăng thêm trong mỗi giờ (Views Per Hour - VPH), phản ánh độ dốc tăng trưởng thời gian thực.",
    "formula": "VPH = (Lượt xem hiện tại - Lượt xem cách đây N giờ) / N.",
    "whatIs": "View velocity là gia tốc của video. Một video đạt 100k view sau 1 năm chỉ có VPH khoảng 11 view/h. Nhưng một video đạt 100k view sau 24 giờ có VPH lên đến hơn 4.100 view/h!",
    "whyCare": "VPH là tín hiệu quan trọng nhất mà thuật toán YouTube dùng để quyết định có nên tiếp tục \"bơm\" video đó lên trang chủ của nhiều người hơn hay không. VPH càng cao, video càng ở trạng thái lan truyền mạnh.",
    "simpleExplanation": "Giống như đồng hồ đo tốc độ trên xe máy: Bạn không chỉ quan tâm xe đã đi được bao nhiêu km (tổng view), mà quan tâm xe đang chạy với tốc độ bao nhiêu km/h (VPH).",
    "practicalUsage": "Khi sắp xếp các video trên YouTrend theo VPH, bạn sẽ thấy ngay video nào đang \"cắn thuật toán\" ngay trong ngày hôm nay, từ đó nắm bắt được nội dung nóng nhất để làm theo.",
    "realWorldExample": "Video về máy bay ném bom tàng hình B-21 đạt VPH +1.250 view/h, nghĩa là cứ mỗi phút trôi qua lại có thêm 20 người xem mới. Đây là tín hiệu thuật toán đang mở rộng phễu phân phối.",
    "stepByStep": "1. Tại tab \"Xu hướng\", chọn sắp xếp theo \"⚡ VPH (View/Giờ)\".\n2. Các video có VPH cao nhất sẽ hiển thị trên đầu cùng badge gia tốc màu hổ phách.",
    "commonMistakes": "Đánh giá độ hot của video dựa vào tổng lượt xem mà không nhìn ngày đăng và VPH.",
    "misconceptions": "Nhiều người nghĩ chỉ có video vừa đăng mới có VPH cao. Đôi khi một video đăng cách đây 2 tuần bỗng nhiên được thuật toán \"hồi sinh\" và VPH vọt lên hàng nghìn view/h.",
    "relatedConcepts": [
      "trend_def",
      "outlier_video",
      "performance_multiple"
    ],
    "exercise": "Video X đăng 10 ngày trước, tổng 50k view, 24h qua tăng 200 view. Video Y đăng 1 ngày trước, tổng 20k view, 24h qua tăng 18k view. Video nào có View velocity cao hơn?\n\nĐáp án: Video Y có VPH = 18.000 / 24 = 750 view/h, cao gấp 90 lần Video X (VPH chỉ ~8.3 view/h)."
  },
  {
    "id": "title_pattern",
    "title": "Title Pattern — Khuôn tiêu đề là gì?",
    "category": "title_thumbnail",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Khuôn tiêu đề (Title Pattern) là công thức cú pháp lặp lại đã được chứng minh hiệu quả tâm lý, kích thích người xem nhấp chuột mà không gây cảm giác clickbait rẻ tiền.",
    "formula": "Khuôn tiêu đề = [Kích thích tò mò] + [Chủ thể / Đối tượng] + [Kết quả bất ngờ / Thời lượng].",
    "whatIs": "Các nhà sáng tạo nội dung hàng đầu thế giới không nghĩ tiêu đề một cách ngẫu hứng. Họ áp dụng các khuôn tiêu đề mẫu đã được kiểm chứng hàng triệu lần trên YouTube, sau đó chỉ việc thay thế chủ thể (X, Y) vào khuôn.",
    "whyCare": "Tiêu đề quyết định 50% tỷ lệ nhấp (CTR). Một video dù nội dung hay đến đâu nhưng tiêu đề nhàm chán thì sẽ không ai bấm vào xem. Áp dụng đúng khuôn tiêu đề giúp tăng CTR từ 3% lên 8% - 12%.",
    "simpleExplanation": "Như một chiếc khuôn làm bánh quy: Bạn chỉ cần đổi nhân bánh (socola, dâu, matcha) nhưng hình dáng chiếc bánh luôn tròn trịa và bắt mắt.",
    "practicalUsage": "Các khuôn tiêu đề kinh điển nhất:\n1. Toàn bộ lịch sử: \"Toàn bộ lịch sử của [X] trong [Thời lượng]\"\n2. Tại sao lại xảy ra: \"Tại sao [Đế chế / Sự kiện] lại sụp đổ sau [N năm]?\"\n3. Giả thuyết What-if: \"Điều gì sẽ xảy ra nếu [Giả thuyết không tưởng]?\"\n4. Từ X đến Y: \"Từ [Kẻ trắng tay] trở thành [Đế chế tỷ đô]: Sự thật về [X]\"\n5. Bí mật giấu kín: \"Sự thật đằng sau [X] mà [Tổ chức] không muốn bạn biết\".",
    "realWorldExample": "Khuôn \"What Actually Happens When...\" mang lại cho kênh Oddity Lab trung bình 180k view/video: \"What Actually Happens To Your Brain When You Don't Sleep For 7 Days\".",
    "stepByStep": "1. Mở công cụ \"Phân tích Title Pattern\" trên YouTrend.\n2. Chọn một ngách hoặc nhập từ khóa để hệ thống quét các khuôn tiêu đề lặp lại nhiều nhất.\n3. Xem các gợi ý tiêu đề tự động tạo ra từ khuôn đó cho kênh của bạn.",
    "commonMistakes": "Dùng từ ngữ giật gân lừa dối (Clickbait sai sự thật). Khi khán giả bấm vào xem mà nội dung không đúng như tiêu đề, họ sẽ thoát ra sau 10 giây và thuật toán sẽ bóp chết video.",
    "misconceptions": "Nhiều người nghĩ dùng khuôn tiêu đề là sao chép. Thực tế đây là việc áp dụng cấu trúc tâm lý ngôn ngữ học, nội dung câu chuyện bên trong hoàn toàn là của bạn.",
    "relatedConcepts": [
      "content_angle",
      "viral_video",
      "first_10_videos"
    ],
    "exercise": "Hãy áp dụng khuôn \"Tại sao [X] lại sụp đổ?\" vào chủ đề công ty điện thoại Nokia.\n\nĐáp án mẫu: \"Tại sao Đế chế Nokia hùng mạnh lại sụp đổ chỉ sau 4 năm? (Bài học kinh doanh đắt giá)\"."
  },
  {
    "id": "content_angle",
    "title": "Content Angle — Góc tiếp cận nội dung là gì?",
    "category": "title_thumbnail",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Góc tiếp cận (Content Angle) là lăng kính độc đáo, lời hứa mới lạ hoặc hướng kể chuyện khác biệt khi khai thác cùng một chủ đề quen thuộc.",
    "formula": "Chủ đề quen thuộc + Góc tiếp cận mới lạ = Video triệu view.",
    "whatIs": "Content Angle là câu trả lời cho câu hỏi của người xem: \"Tôi đã nghe về chủ đề này rồi, tại sao tôi phải xem video của bạn?\". Đó có thể là góc nhìn của kẻ phản diện, góc nhìn khoa học giải phẫu, hoặc góc nhìn bài học nhân quả đời thật.",
    "whyCare": "Trên YouTube hầu như không còn chủ đề nào là chưa có người làm. Sự khác biệt giữa một video 1k view và một video 1 triệu view nằm ở Angle: Người làm video giỏi biết biến một chủ đề cũ kỹ thành một câu chuyện nghẹt thở bằng góc nhìn mới.",
    "simpleExplanation": "Chụp ảnh một bức tượng: Hàng nghìn người đứng chụp chính diện (góc bình thường). Bạn leo lên mái nhà chụp từ trên cao xuống với ánh hoàng hôn phản chiếu (góc tiếp cận độc đáo).",
    "practicalUsage": "Các góc tiếp cận ăn khách nhất:\n- Góc tài liệu điều tra (Investigative Angle): Đóng vai thám tử giải mã bí ẩn.\n- Góc tâm lý học tối (Dark Psychology): Khám phá động cơ xấu xa ẩn giấu.\n- Góc số phận & Nhân quả (Karma & Fate): Kẻ ác bị trừng phạt, người tốt được đền đáp.\n- Góc mô phỏng thực tế (Simulation Angle): Tái hiện từng giờ nếu sự kiện xảy ra.",
    "realWorldExample": "Cùng chủ đề \"Tàu Titanic chìm\", góc tiếp cận thông thường là \"Lịch sử vụ đắm tàu Titanic\". Góc tiếp cận mới của video triệu view: \"Mô phỏng 2 giờ 40 phút sinh tử của các thủy thủ trong khoang máy tàu Titanic khi nước tràn vào\".",
    "stepByStep": "1. Xem mục \"Góc tiếp cận\" trong phần phân tích Title Pattern trên YouTrend.\n2. Chọn một Angle phù hợp với phong cách kênh của bạn (ví dụ: Kịch tính, Bí ẩn, Chữa lành).",
    "commonMistakes": "Chọn Angle quá trừu tượng, học thuật khiến khán giả đại chúng không hiểu được lời hứa nội dung trong 3 giây đầu.",
    "misconceptions": "Tưởng rằng đổi Angle là phải làm nội dung hoàn toàn mới. Thật ra tư liệu lịch sử vẫn vậy, chỉ có cách dẫn dắt câu chuyện và đặt câu hỏi mở đầu là thay đổi.",
    "relatedConcepts": [
      "title_pattern",
      "topic_cluster",
      "first_10_videos"
    ],
    "exercise": "Với chủ đề \"Đại dịch Cái Chết Đen năm 1347\", hãy đề xuất 1 góc tiếp cận theo phong cách tài liệu bí ẩn.\n\nĐáp án mẫu: \"Hồ sơ mật về vị bác sĩ mỏ chim đầu tiên dám bước vào thành phố bị nguyền rủa năm 1347\"."
  },
  {
    "id": "topic_cluster",
    "title": "Topic Cluster — Nhóm chủ đề là gì?",
    "category": "validation",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Nhóm chủ đề (Topic Cluster) là chuỗi các video liên kết chặt chẽ xoay quanh một chủ đề lõi, giúp kênh xây dựng Thẩm quyền chủ đề (Topical Authority).",
    "formula": "1 Video Trụ Cột (Pillar Video) + 5 - 10 Video Vệ Tinh (Cluster Videos) liên kết chéo.",
    "whatIs": "Topic Cluster là phương pháp tổ chức nội dung có hệ thống. Thay vì làm mỗi video một kiểu rời rạc, bạn sản xuất một chùm từ 5 đến 10 video cùng khai thác các khía cạnh khác nhau của một chủ đề lớn và dẫn link người xem qua lại giữa các video.",
    "whyCare": "Khi một khán giả xem xong video A và tiếp tục bấm xem video B, rồi video C trên cùng kênh của bạn, thuật toán YouTube sẽ nhận diện phiên xem (Session Time) cực dài và thưởng điểm đề xuất tối đa cho toàn bộ kênh.",
    "simpleExplanation": "Như một series phim truyền hình nhiều tập: Người xem không chỉ xem 1 tập rồi đi mà sẽ \"cày\" liền tù tì 5 tập trong một đêm.",
    "practicalUsage": "Khi phát hiện một video Outlier nổ view, đừng vội nhảy sang chủ đề khác! Hãy lập tức làm thêm 3-5 video vệ tinh đào sâu các khía cạnh liên quan của chủ đề đó để hứng trọn luồng đề xuất ăn theo.",
    "realWorldExample": "Khi video \"Lời khuyên của Marcus Aurelius trước tuổi 70\" bùng nổ, kênh Stoic Wisdom lập tức xuất bản cụm video: \"Sổ tay khắc kỷ của Seneca\", \"Nghệ thuật làm chủ tâm trí của Epictetus\", biến kênh thành số 1 về triết học khắc kỷ.",
    "stepByStep": "1. Vào tab \"Trend SRT\" trên YouTrend.\n2. Sử dụng tính năng \"Gom Cụm Từ Khóa\" để xem các cụm từ khóa có liên quan chặt chẽ với nhau.\n3. Lưu các cụm từ này vào Kế hoạch sản xuất để làm theo chuỗi.",
    "commonMistakes": "Làm 1 video về chủ đề X nổ view, nhưng video tiếp theo lại làm về chủ đề Y hoàn toàn không liên quan, khiến 90% khán giả mới đăng ký không bấm vào xem.",
    "misconceptions": "Nghĩ rằng làm nhiều video cùng một chủ đề sẽ khiến khán giả nhàm chán. Thực tế khán giả đã thích một chủ đề thì họ muốn xem đi xem lại nhiều góc nhìn khác nhau.",
    "relatedConcepts": [
      "niche_def",
      "demand_validation",
      "first_10_videos"
    ],
    "exercise": "Nếu video của bạn về \"Máy bay ném bom tàng hình B-21\" đạt 100k view, 2 video tiếp theo nên làm về chủ đề gì để tạo Topic Cluster?\n\nĐáp án: Video 1: \"Hệ thống radar nào trên thế giới có thể phát hiện được B-21?\"; Video 2: \"Tiêm kích thế hệ 6 NGAD: Người bạn đồng hành tuyệt mật của B-21\"."
  },
  {
    "id": "demand_validation",
    "title": "Demand Validation — Kiểm chứng nhu cầu là gì?",
    "category": "validation",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Kiểm chứng nhu cầu (Demand Validation) là quy trình đối chiếu dữ liệu thực tế để xác nhận xem một ngách có nhiều kênh độc lập cùng đạt view cao hay không.",
    "formula": "Nhu cầu thật = Có ít nhất 3 - 4 kênh độc lập (nhất là kênh nhỏ) cùng đạt view cao vượt ngưỡng.",
    "whatIs": "Đây là bộ lọc quan trọng nhất để bảo vệ bạn khỏi việc lãng phí hàng tháng trời làm video vô ích. Nó phân biệt rõ ràng giữa một ngách có nhu cầu thị trường thật sự với một trường hợp ăn may đơn lẻ của một kênh lớn.",
    "whyCare": "Rất nhiều người mới thấy một kênh lớn đăng video về chủ đề X được 500k view liền nhào vào làm theo, nhưng khi đăng lên chỉ được 50 view. Lý do: Kênh lớn đó có thương hiệu kéo view, còn bản thân chủ đề đó thị trường không hề có nhu cầu tự nhiên!",
    "simpleExplanation": "Trước khi mở một quán trà sữa ở một con phố, bạn đứng đếm xem có nhiều quán trà sữa khác trên phố đó đang đông khách không, hay chỉ có duy nhất 1 quán trà sữa thương hiệu quốc tế mở khuyến mãi 1 ngày.",
    "practicalUsage": "Quy tắc vàng kiểm chứng nhu cầu trên YouTrend:\n- Bước 1: Nhập chủ đề cần kiểm tra.\n- Bước 2: Đặt ngưỡng lượt xem (ví dụ: 30.000 view trong 30 ngày qua).\n- Bước 3: Đếm số kênh độc lập đạt tiêu chí.\n- Kết luận: Nếu >= 4 kênh đạt -> Trend thật, an toàn làm theo! Nếu chỉ có 1 kênh -> Ăn may đơn lẻ, rủi ro cao!",
    "realWorldExample": "Chủ đề \"Billionaire disguised story\": Có tới 5 kênh khác nhau (Echoes of Hope, Heartfelt Echoes, Golden Wisdom, Grace Stories, Life Lessons) đều có video vượt 40k view trong 14 ngày qua. Đây là bằng chứng không thể chối cãi về nhu cầu thị trường cực cao.",
    "stepByStep": "1. Mở công cụ \"Kiểm Chứng Nhu Cầu Thị Trường\" trên YouTrend.\n2. Nhập từ khóa chủ đề và chọn ngưỡng view tối thiểu.\n3. Xem bảng kết quả đếm số kênh độc lập và tỷ lệ kênh nhỏ thành công.",
    "commonMistakes": "Quyết định làm cả một kênh mới chỉ vì nhìn thấy DUY NHẤT MỘT video triệu view trên mạng.",
    "misconceptions": "Nhiều người nghĩ ngách có nhiều kênh làm được view cao là bị cạnh tranh gay gắt không nên vào. Ngược lại, có nhiều kênh cùng làm được view chứng tỏ thuật toán đang rất khát nội dung để đề xuất chéo giữa các kênh đó!",
    "relatedConcepts": [
      "outlier_video",
      "saturation_level",
      "competitor_analysis"
    ],
    "exercise": "Chủ đề A có 1 video 1 triệu view của kênh 2 triệu sub, các kênh khác làm chỉ được dưới 2k view. Chủ đề B có 5 kênh nhỏ (dưới 20k sub) đều có video đạt 40k - 80k view. Bạn nên chọn chủ đề nào?\n\nĐáp án: Chủ đề B! Vì chủ đề B đã được kiểm chứng nhu cầu thị trường thật sự ở cấp độ kênh nhỏ."
  },
  {
    "id": "saturation_level",
    "title": "Độ bão hòa của một ngách là gì?",
    "category": "validation",
    "level": "Trung cấp",
    "readTime": "3 phút",
    "summary": "Độ bão hòa là trạng thái khi số lượng video sản xuất ra vượt quá dung lượng người xem của ngách, khiến các kênh mới cực kỳ khó cắn đề xuất.",
    "formula": "Bão hòa cao = Quá nhiều kênh lớn thống trị + Video mới của kênh nhỏ view lẹt đẹt.",
    "whatIs": "Một ngách bão hòa khi thị trường đã đạt điểm cân bằng: khán giả đã có sẵn các kênh \"ruột\" để xem mỗi ngày và thuật toán không còn lý do gì để thử nghiệm phân phối các kênh mới nữa.",
    "whyCare": "Nhảy vào một ngách đã bão hòa cao (như game Liên Quân, Minecraft cơ bản, nhạc chế) giống như bơi ngược dòng thác. Bạn phải bỏ ra công sức gấp 10 lần nhưng tỷ lệ thành công chỉ bằng một phần nhỏ so với ngách mới nổi.",
    "simpleExplanation": "Như một khu chợ có 50 người bán rau nhưng chỉ có 20 người đi chợ mua rau. Hàng rau mới mở ra sẽ ế ẩm vì khách quen đã mua hết ở các sạp cũ.",
    "practicalUsage": "Kiểm tra độ cạnh tranh trong tab Top Ngách trên YouTrend:\n- Xanh lục (Thấp): Đang thiếu nội dung, kênh nhỏ dễ bứt phá.\n- Vàng (Trung bình): Cần có góc tiếp cận (Angle) độc đáo mới bật lên được.\n- Đỏ (Cao/Bão hòa): Tránh xa nếu bạn là người mới bắt đầu.",
    "realWorldExample": "Ngách \"Sinh tồn rừng sâu Alaska\" hiện bão hòa rất cao vì các kênh lớn từ 5 năm trước đã chiếm hết đề xuất. Video của kênh mới mở hầu như không vượt qua được mốc 2.000 view.",
    "stepByStep": "1. Vào tab \"Top Ngách\", quan sát chỉ số \"Độ cạnh tranh\" trên từng thẻ ngách.\n2. Ưu tiên các ngách có nhãn \"Độ cạnh tranh: Thấp\" và \"Bứt phá 24h 🔥\".",
    "commonMistakes": "Thấy một ngách có nhiều view tổng thể liền nghĩ là ngon ăn mà không để ý rằng toàn bộ lượng view đó chỉ chảy vào túi 2-3 ông lớn thống trị từ nhiều năm trước.",
    "misconceptions": "Nhiều người nghĩ không có ngách nào bão hòa vĩnh viễn. Đúng là có thể làm mới một ngách bão hòa, nhưng việc đó đòi hỏi kỹ năng làm video và nguồn lực cực lớn, không phù hợp cho người mới làm kênh Faceless.",
    "relatedConcepts": [
      "niche_def",
      "demand_validation",
      "niche_selection"
    ],
    "exercise": "Làm thế nào để biết một ngách đang có độ cạnh tranh thấp trên YouTrend?\n\nĐáp án: Khi trong ngách đó có nhiều kênh mới tạo dưới 6 tháng hoặc dưới 30k sub nhưng video mới đăng trong 7 ngày qua vẫn đạt từ 30k - 100k view."
  },
  {
    "id": "competitor_analysis",
    "title": "Cách phân tích một kênh YouTube đối thủ",
    "category": "competitors",
    "level": "Thực chiến",
    "readTime": "5 phút",
    "summary": "Quy trình 5 bước bóc tách đối thủ: Tần suất đăng, Thời lượng tối ưu, Video Outlier đột biến, Khuôn tiêu đề và Phong cách thiết kế thumbnail.",
    "formula": "Phân tích đối thủ = Tìm ra công thức họ làm tốt nhất + Tối ưu hóa và làm tốt hơn 20%.",
    "whatIs": "Phân tích đối thủ không phải là để sao chép mù quáng, mà là để đọc vị chiến lược của những người đã đi trước và tìm ra \"lỗ hổng nội dung\" mà đối thủ chưa khai thác triệt để.",
    "whyCare": "Đối thủ đã mất hàng năm trời và hàng nghìn giờ thử nghiệm sai sót để tìm ra định dạng video hiệu quả. Bằng cách phân tích họ, bạn tiết kiệm được 80% thời gian thử - sai vô ích.",
    "simpleExplanation": "Giống như xem lại băng ghi hình các trận đấu của đội bạn trước trận chung kết để biết họ hay tấn công cánh nào và phòng ngự sơ hở ở đâu.",
    "practicalUsage": "Quy trình 5 bước thực hiện:\n1. Thêm kênh vào tab \"Đối thủ\" trên YouTrend.\n2. Tìm video Outlier có Performance Multiple cao nhất.\n3. Bóc tách tiêu đề: Họ dùng khuôn câu hỏi, giả thuyết hay khẳng định bí mật?\n4. Bóc tách thumbnail: Màu sắc chủ đạo, số lượng vật thể, biểu cảm khuôn mặt.\n5. Xem cấu trúc 60 giây đầu: Họ hook người xem bằng câu nói nào?",
    "realWorldExample": "Khi phân tích kênh đối thủ @EchoesofHope-16, ta phát hiện:\n- Thời lượng video luôn từ 45 - 65 phút (để chèn 8 mid-roll ads).\n- Giọng đọc AI dùng ElevenLabs giọng nam trầm truyền cảm (Adam).\n- Thumbnail luôn có ảnh người hầu gái nghèo và người giàu ngạc nhiên ở hậu cảnh.",
    "stepByStep": "1. Vào tab \"Đối thủ\" trên YouTrend.\n2. Bấm \"+ Thêm Kênh Đối Thủ\" và dán link hoặc handle kênh (@handle).\n3. Bấm \"Cập nhật video mới\" để hệ thống tải toàn bộ video gần nhất và tính toán các chỉ số.",
    "commonMistakes": "Chọn đối thủ là các kênh truyền hình lớn (như BBC, CNN, MrBeast). Cần chọn đối thủ là các kênh Faceless cùng phân khúc và cùng công nghệ với bạn.",
    "misconceptions": "Tưởng rằng copy nguyên si video đối thủ sẽ thành công. Thuật toán có khả năng nhận diện nội dung trùng lặp và sẽ ưu tiên video gốc của kênh lớn hơn.",
    "relatedConcepts": [
      "outlier_evaluation",
      "title_pattern",
      "first_10_videos"
    ],
    "exercise": "Khi phân tích kênh đối thủ, video nào bạn nên xem kỹ nhất: Video đăng gần đây nhất hay Video có Performance Multiple cao nhất trong 30 ngày qua?\n\nĐáp án: Video có Performance Multiple cao nhất trong 30 ngày qua, vì đó là video chứng minh nội dung và tiêu đề bứt phá mạnh nhất."
  },
  {
    "id": "outlier_evaluation",
    "title": "Cách đánh giá một video có hiệu suất nổi bật",
    "category": "competitors",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Đánh giá một video dựa trên ma trận 4 yếu tố: Bội số hiệu suất (Performance Multiple), Tỷ lệ View/Sub, Gia tốc VPH và Thời gian xuất bản.",
    "formula": "Điểm nổi bật = (Performance Multiple >= 4x) + (View/Sub >= 3x) + (Tuổi video <= 30 ngày).",
    "whatIs": "Một phương pháp định lượng giúp bạn không bị cảm tính chi phối khi lướt YouTube, biến việc đánh giá video thành các con số có thể kiểm chứng được.",
    "whyCare": "Thời gian sản xuất video có hạn. Bạn cần dồn toàn lực vào những ý tưởng có xác suất thắng cao nhất đã được kiểm chứng bởi các video nổi bật thực tế.",
    "simpleExplanation": "Như việc tuyển chọn cầu thủ vào đội tuyển: Không chỉ xem anh ta cao to đẹp trai (cảm tính), mà phải đo tốc độ chạy 100m, số bàn thắng ghi được và số đường chuyền chính xác (chỉ số thực tế).",
    "practicalUsage": "Khi duyệt danh sách video trên YouTrend, áp dụng bộ lọc:\n- Performance Multiple: >= 3.0x\n- Ngày đăng: Trong vòng 7 - 30 ngày qua\n- Thời lượng: Phù hợp với định dạng kênh của bạn.",
    "realWorldExample": "Video \"Why The B-21 Raider Just Made Every Radar Obsolete\": Đăng 26 ngày trước, kênh 28.9k sub nhưng video đạt 39.4k view, VPH vẫn giữ +890 view/h -> Đạt chuẩn video nổi bật xuất sắc.",
    "stepByStep": "1. Bấm vào bất kỳ thẻ video nào trong YouTrend để mở bảng chẩn đoán chi tiết.\n2. Đối chiếu các chỉ số với thang chuẩn màu xanh lá.",
    "commonMistakes": "Đánh giá video dựa trên độ đẹp của đồ họa mà quên rằng tiêu đề và thumbnail mới là thứ quyết định người xem có bấm vào hay không.",
    "misconceptions": "Nghĩ rằng video nổi bật thì không thể làm lại được. Ngược lại, khán giả xem xong video đó của đối thủ sẽ có xu hướng tìm xem tiếp các video tương tự ở cột Đề xuất!",
    "relatedConcepts": [
      "performance_multiple",
      "outlier_video",
      "view_velocity"
    ],
    "exercise": "Một video 500k view đăng 2 năm trước và một video 80k view đăng 5 ngày trước (kênh 15k sub). Video nào nổi bật hơn để bạn làm theo ngay hôm nay?\n\nĐáp án: Video 80k view đăng 5 ngày trước, vì phản ánh độ nóng của thuật toán ở thời điểm hiện tại."
  },
  {
    "id": "niche_selection",
    "title": "Cách lựa chọn ngách để bắt đầu",
    "category": "planning",
    "level": "Cơ bản",
    "readTime": "5 phút",
    "summary": "Ma trận 4 yếu tố lựa chọn ngách cho người mới: Nhu cầu thị trường + Kháng cạnh tranh + Doanh thu RPM Tier 1 + Khả năng sản xuất đều đặn.",
    "formula": "Ngách thắng lợi = Nhu cầu cao + Kênh nhỏ vẫn có view + RPM > $20 + Sản xuất được 2 video/tuần.",
    "whatIs": "Lựa chọn ngách là quyết định quan trọng nhất, chiếm 70% khả năng thành bại của một kênh YouTube. Chọn sai ngách thì dù bạn chăm chỉ đến đâu cũng chỉ nhận về vài chục view và vài đồng tiền cắc.",
    "whyCare": "Nhiều người bỏ cuộc sau 3 tháng không phải vì họ lười, mà vì họ chọn ngách RPM quá thấp ($1 - $2) hoặc ngách bão hòa khiến video không bao giờ cắn được đề xuất.",
    "simpleExplanation": "Chọn mảnh đất để đào vàng: Đào ở mảnh đất có quặng vàng (Tier 1 US, RPM cao) sẽ giàu nhanh hơn đào ở bãi cát trắng dù bạn có cuốc đất chăm chỉ gấp 10 lần.",
    "practicalUsage": "Thứ tự ưu tiên khi chọn ngách trên YouTrend:\n1. Chọn thị trường: Ưu tiên US (Mỹ) & Tier 1 để hưởng RPM $20 - $50.\n2. Chọn thời lượng: Ưu tiên video dài 20 - 60 phút để chèn nhiều mid-roll ads.\n3. Kiểm tra kênh nhỏ: Đảm bảo có kênh dưới 30k sub đang làm được view.\n4. Đánh giá công nghệ: Kịch bản viết được bằng AI (ChatGPT/Claude), giọng đọc tạo được bằng ElevenLabs, hình ảnh tạo được bằng Midjourney/Flux.",
    "realWorldExample": "Top 3 ngách lý tưởng nhất cho người mới bắt đầu Faceless AI:\n- Tỷ phú & Người giúp việc cảm động (Kể chuyện gia đình US 55+).\n- Cầu nguyện Công giáo & Kinh thánh ru ngủ.\n- Phân tích vũ khí quân sự & Máy bay tàng hình.",
    "stepByStep": "1. Vào tab \"Top Ngách\" trên YouTrend.\n2. Chọn khung thời gian 7 ngày hoặc 30 ngày.\n3. Xem chi tiết từng ngách để đọc phân tích \"Lý do vì sao ngách này hái ra tiền\".\n4. Chọn ra 1 ngách duy nhất để tập trung trong 3 tháng đầu.",
    "commonMistakes": "Thấy ngách nào cũng muốn làm, mở 3 kênh cùng lúc khiến không kênh nào ra video đều đặn được và bỏ cuộc sớm.",
    "misconceptions": "Nghĩ rằng phải giỏi tiếng Anh mới làm được kênh YouTube Mỹ. Thực tế với sự hỗ trợ của AI viết kịch bản và ElevenLabs lồng tiếng bản xứ, người Việt hoàn toàn có thể vận hành kênh US trơn tru.",
    "relatedConcepts": [
      "niche_def",
      "demand_validation",
      "first_10_videos"
    ],
    "exercise": "Tại sao ngách \"Kể chuyện tỷ phú cho người già US\" lại được coi là mỏ vàng số 1 cho kênh Faceless AI?\n\nĐáp án: Vì tệp khán giả Mỹ 55+ tuổi rất kiên nhẫn nghe video dài 60 phút (watch time cực cao), không tắt quảng cáo mid-roll, và các nhãn hàng tại Mỹ chi trả CPM rất cao ($25 - $48/1k view)."
  },
  {
    "id": "first_10_videos",
    "title": "Cách tìm ý tưởng cho 10 video đầu tiên",
    "category": "planning",
    "level": "Thực chiến",
    "readTime": "5 phút",
    "summary": "Chiến lược mô phỏng các video Outlier đã được kiểm chứng, áp dụng khuôn tiêu đề chuẩn và thay đổi góc tiếp cận để tạo 10 video đầu tay với xác suất thắng cao nhất.",
    "formula": "10 Video đầu tiên = 10 Biến thể của các Outlier đã được kiểm chứng trong ngách.",
    "whatIs": "Giai đoạn đầu đời của kênh là giai đoạn thuật toán \"thử việc\" bạn. Đừng cố gắng sáng tạo những thứ kỳ dị chưa ai từng làm; hãy làm những chủ đề mà khán giả trong ngách ĐÃ CHỨNG MINH là họ thích xem.",
    "whyCare": "Khi kênh mới có 10 video cùng đào sâu một Topic Cluster vững chắc, thuật toán sẽ nhận diện kênh cực nhanh và bắt đầu đề xuất chéo giữa 10 video đó với nhau.",
    "simpleExplanation": "Như một ban nhạc mới ra mắt: Thay vì hát toàn bài tự sáng tác không ai biết, họ cover lại những ca khúc đình đám theo phong cách độc đáo của riêng mình để thu hút lượng fan ban đầu.",
    "practicalUsage": "Quy trình tạo 10 ý tưởng thần tốc trên YouTrend:\n1. Chọn ngách mục tiêu trong tab Top Ngách.\n2. Lọc ra 10 video Outlier có Performance Multiple cao nhất từ các kênh nhỏ.\n3. Giữ nguyên cốt lõi câu chuyện hoặc vấn đề.\n4. Đổi góc tiếp cận (Angle) và áp dụng khuôn tiêu đề mới.\n5. Dùng công cụ \"Đề Xuất Ý Tưởng Video\" để lưu vào Kế Hoạch Sản Xuất.",
    "realWorldExample": "Video gốc của đối thủ: \"Billionaire Came Home By Surprise... What The Maid Was Doing Shocked The House\".\nBiến thể của bạn cho 3 video đầu:\n- Video 1: \"Rich CEO Disguised As Janitor To Test His Fiancee, But The Poor Maid Was The Only One Who Fed Him\".\n- Video 2: \"Billionaire Fired His Loyal Maid Of 15 Years, 3 Days Later A Lawyer Knocked On His Door\".\n- Video 3: \"Dying Millionaire Left His Entire Mansion To A Homeless Maid, Leaving His Greedy Sons In Tears\".",
    "stepByStep": "1. Mở công cụ \"Đề Xuất Ý Tưởng Video\" trên YouTrend.\n2. Bấm \"Tạo 10 Ý Tưởng Tự Động\".\n3. Chỉnh sửa tiêu đề nháp và đổi trạng thái sang \"Đang viết kịch bản\".",
    "commonMistakes": "Đăng 1-2 video thấy ít view liền nản lòng đổi sang ngách khác. Cần kiên nhẫn đăng đều đặn đủ 10 video theo đúng lịch trình để thuật toán tích lũy đủ dữ liệu.",
    "misconceptions": "Tưởng rằng phải giấu nghề không ai xem kênh mới. Thuật toán luôn dành một tỷ lệ thử nghiệm nhất định (impressions test) cho mọi video mới xuất bản.",
    "relatedConcepts": [
      "outlier_video",
      "title_pattern",
      "topic_cluster"
    ],
    "exercise": "Tại sao không nên làm 10 video đầu tiên về 10 chủ đề hoàn toàn khác nhau?\n\nĐáp án: Vì làm vậy sẽ khiến thuật toán bị rối loạn, không biết gom nhóm kênh của bạn vào tệp khán giả nào, dẫn đến việc không video nào được đề xuất hiệu quả."
  },
  {
    "id": "using_youtubetrend",
    "title": "Cách sử dụng dữ liệu của YouTubeTrend",
    "category": "platform",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Quy trình làm việc chuẩn 4 bước trên YouTrend: Săn ngách mỏ vàng → Bắt trend cụm từ khóa → Soi đối thủ bứt phá → Kiểm chứng và lên kịch bản.",
    "formula": "Quy trình chuẩn: Top Ngách → Trend SRT → Soi Đối Thủ → Kiểm Chứng → Sản Xuất.",
    "whatIs": "YouTrend Pro là hệ thống tình báo dữ liệu YouTube hỗ trợ toàn diện từ khâu nghiên cứu thị trường, phát hiện trend ẩn, bóc tách công thức đối thủ cho đến khâu lấy prompt kịch bản và ảnh thumbnail.",
    "whyCare": "Sử dụng đúng quy trình giúp bạn chuyển từ việc làm YouTube bằng cảm tính hên xui sang làm YouTube bằng DỮ LIỆU ĐỊNH LƯỢNG có xác suất thành công cao.",
    "simpleExplanation": "Như việc sử dụng thiết bị định vị GPS khi lái xe qua vùng đất mới: Bạn biết chính xác đoạn nào thông thoáng (ngách ít cạnh tranh) và đoạn nào kẹt xe (ngách bão hòa).",
    "practicalUsage": "Luồng làm việc hàng ngày của một Creator chuyên nghiệp:\n- Buổi sáng: Vào tab \"Top Ngách\" xem ngách nào đang bứt phá 24h.\n- Vào tab \"Trend SRT\": Dán kênh đối thủ hoặc gõ từ khóa ngách để xem các cụm từ lặp lại trên 2+ kênh độc lập.\n- Vào tab \"Đối thủ\": Bấm cập nhật xem đối thủ vừa đăng video gì mới.\n- Bấm \"Lưu video\" vào Kho Lưu để dành thời gian rảnh mở lấy Prompt AI.",
    "realWorldExample": "Một nhà sáng tạo áp dụng quy trình này: Phát hiện cụm từ khóa \"billionaire disguised maid\" đang nổ trên 4 kênh độc lập → Dùng Prompt Kịch Bản của YouTrend đưa vào Claude/ChatGPT → Sản xuất video trong 24h → Đạt 65k view sau 3 ngày.",
    "stepByStep": "1. Kết nối YouTube Data API Key ở góc phải trên cùng (hoàn toàn miễn phí từ Google Cloud).\n2. Đi theo thứ tự các tab từ trái sang phải: Xu hướng → Từ khoá → Trend SRT → Top Ngách → Đối thủ.\n3. Tận dụng mục Wiki để tra cứu ngay bất kỳ thuật ngữ nào chưa hiểu.",
    "commonMistakes": "Chỉ lướt xem dữ liệu cho vui mà không hành động. Dữ liệu trend chỉ có giá trị khi bạn biến nó thành video thực tế trong vòng 48h - 72h.",
    "misconceptions": "Nhiều người nghĩ phải có tài khoản trả phí đắt đỏ mới nghiên cứu được trend. YouTrend cung cấp đầy đủ công cụ phân tích sâu dựa trên API công khai mà không thu phí hàng tháng.",
    "relatedConcepts": [
      "demand_validation",
      "competitor_analysis",
      "title_pattern"
    ],
    "exercise": "Khi thấy thông báo banner \"Cập nhật tự động: Phát hiện xu hướng mới hôm nay\", bạn nên làm gì?\n\nĐáp án: Bấm vào \"Xem & Duyệt Trend Ngay\" để kiểm tra các video dài bứt phá mới xuất hiện và đánh giá xem có phù hợp để bổ sung vào kế hoạch kênh của mình hay không."
  },
  {
    "id": "public_vs_private_metrics",
    "title": "Chỉ số công khai vs Chỉ số riêng tư YouTube Analytics",
    "category": "platform",
    "level": "Trung cấp",
    "readTime": "4 phút",
    "summary": "Hiểu rõ ranh giới giữa dữ liệu công khai từ YouTube Data API (View, Like, Sub, Ngày đăng) và dữ liệu bảo mật nội bộ trong YouTube Studio (CTR, Retention %, Traffic Source %).",
    "formula": "Công khai = Dữ liệu kết quả bên ngoài | Riêng tư = Dữ liệu hành vi chi tiết bên trong.",
    "whatIs": "YouTube chia dữ liệu thành 2 tầng:\n1. Tầng công khai (Public Data via API): Ai cũng xem được, gồm lượt xem, lượt thích, số bình luận, thời gian đăng, thời lượng, số subscriber công khai.\n2. Tầng riêng tư (Private Analytics in Studio): Chỉ chủ sở hữu kênh mới xem được khi đăng nhập, gồm tỷ lệ nhấp CTR, biểu đồ giữ chân từng giây, nguồn lưu lượng truy cập (Browse vs Suggested), doanh thu Ads thực tế.",
    "whyCare": "Biết rõ điều này giúp bạn không bị các công cụ lừa đảo trên mạng quảng cáo rằng \"đọc được CTR hoặc biểu đồ giữ chân của kênh đối thủ\". Không có bất kỳ công cụ bên thứ ba nào đọc được dữ liệu riêng tư của người khác một cách hợp pháp!",
    "simpleExplanation": "Như một ngôi nhà: Người đi ngoài đường chỉ nhìn thấy nhà sơn màu gì, có bao nhiêu tầng, bật đèn hay tắt đèn (công khai). Chỉ người cầm chìa khóa vào nhà mới biết trong tủ lạnh có gì và tài khoản ngân hàng của gia chủ có bao nhiêu tiền (riêng tư).",
    "practicalUsage": "Sử dụng dữ liệu công khai trên YouTrend để suy luận logic:\n- Video view cao + VPH dốc = Chắc chắn CTR và Retention của video đó đang rất tốt.\n- Video dài trên 45 phút + Thị trường US = Chắc chắn RPM dao động từ $25 - $48.",
    "realWorldExample": "YouTrend tính toán \"Ước tính doanh thu\" và \"Bội số hiệu suất\" dựa trên các công thức ngoại suy chuẩn hóa từ hàng triệu video đã được kiểm chứng tại thị trường US, mang lại độ chính xác trên 85% so với thực tế.",
    "stepByStep": "1. Xem các chỉ số công khai trực tiếp trên từng thẻ video.\n2. Xem các chỉ số ước tính doanh thu và RPM trong tab Top Ngách và Kho Lưu.",
    "commonMistakes": "Tin vào các website yêu cầu cấp quyền đăng nhập tài khoản YouTube của bạn để \"soi đối thủ\", nguy cơ bị mất kênh hoặc lộ thông tin bảo mật.",
    "misconceptions": "Tưởng rằng không có dữ liệu riêng tư thì không phân tích được đối thủ. Thực tế với VPH, Performance Multiple, ngày đăng và tỷ lệ View/Sub trên YouTrend là đã quá đủ để bạn ra quyết định chính xác 90%.",
    "relatedConcepts": [
      "performance_multiple",
      "view_velocity",
      "using_youtubetrend"
    ],
    "exercise": "Một trang web quảng cáo có thể cho bạn xem chính xác tỷ lệ nhấp chuột (CTR) của một video đối thủ bất kỳ. Điều đó có thật không?\n\nĐáp án: Không thật! YouTube bảo mật tuyệt đối chỉ số CTR và chỉ cung cấp cho chủ sở hữu kênh trong YouTube Studio qua giao thức xác thực OAuth."
  },
  {
    "id": "ai_niche_mistakes",
    "title": "Những sai lầm thường gặp khi tìm ngách bằng AI",
    "category": "platform",
    "level": "Thực chiến",
    "readTime": "4 phút",
    "summary": "Cảnh báo việc tin vào các con số ảo hoặc lời khuyên chung chung của AI mà không đối chiếu với số liệu video thực tế trên YouTube.",
    "formula": "AI = Công cụ hỗ trợ phân tích và gợi ý ý tưởng | Quyết định = Phải dựa trên Dữ liệu Kiểm chứng thực tế.",
    "whatIs": "Các mô hình ngôn ngữ lớn (ChatGPT, Claude, Gemini) rất giỏi sáng tạo nội dung nhưng lại hay mắc tật \"ảo giác\" (hallucination) - tự bịa ra các số liệu thống kê hoặc đưa ra các lời khuyên chung chung vô thưởng vô phạt.",
    "whyCare": "Nếu hỏi ChatGPT \"Gợi ý cho tôi 5 ngách YouTube kiếm nhiều tiền nhất\", nó sẽ trả lời: Tài chính, Sức khỏe, Công nghệ, Du lịch, Nấu ăn. Đây là những câu trả lời vô dụng vì các ngách này quá rộng và bão hòa, người mới làm theo chắc chắn thất bại.",
    "simpleExplanation": "Hỏi AI mà không có dữ liệu thực tế giống như hỏi một người mù đường xem đi đường nào không kẹt xe. Họ sẽ trả lời rất tự tin nhưng bạn đi theo là lao vào ổ gà.",
    "practicalUsage": "Cách dùng AI đúng đắn:\n1. Dùng YouTrend để lấy SỐ LIỆU THẬT (tiêu đề thật, kênh thật, view thật).\n2. Đưa dữ liệu thật đó vào AI và yêu cầu: \"Dựa trên danh sách 5 video Outlier này, hãy phân tích điểm chung về tâm lý người xem và viết kịch bản biến thể mới\".\n3. Tuyệt đối không để AI tự bịa ý tưởng ngách trên không khí.",
    "realWorldExample": "Một bạn hỏi AI gợi ý ngách và làm theo ngách \"Top 10 địa điểm du lịch đẹp nhất thế giới\". Sau 20 video, mỗi video chỉ đạt dưới 100 view vì đối thủ cạnh tranh là National Geographic và các kênh du lịch khổng lồ. Sau khi chuyển sang dùng YouTrend soi ngách \"Bí ẩn địa điểm bị bỏ hoang tại Mỹ\", video thứ 3 đã đạt 45k view.",
    "stepByStep": "1. Luôn sử dụng tính năng \"Kiểm Chứng Nhu Cầu\" trên YouTrend trước khi tin vào bất kỳ ý tưởng ngách nào do AI gợi ý.\n2. Bấm nút \"Copy Prompt Kịch Bản\" trên các video đã kiểm chứng để đảm bảo AI viết kịch bản bám sát cấu trúc của video triệu view thật.",
    "commonMistakes": "Tin vào các video quảng cáo \"Làm giàu với YouTube Faceless AI trong 7 ngày kiếm $10.000 USD thụ động\" mà không hiểu quy luật phân phối của thuật toán.",
    "misconceptions": "Nhiều người nghĩ AI có thể làm thay con người 100%. Thực tế AI chỉ là trợ lý đắc lực giúp bạn viết kịch bản nhanh gấp 10 lần và tạo ảnh đẹp hơn, còn tư duy chiến lược và chọn ngách phải do bạn quyết định dựa trên dữ liệu.",
    "relatedConcepts": [
      "demand_validation",
      "using_youtubetrend",
      "first_10_videos"
    ],
    "exercise": "Quy trình kết hợp giữa YouTrend và AI nào sau đây là chuẩn xác nhất?\n\nA. Hỏi ChatGPT ngách nào hot -> Làm video luôn.\nB. Dùng YouTrend tìm video Outlier đang nổ view thực tế -> Đưa tiêu đề và góc tiếp cận đó cho AI phân tích và viết kịch bản biến thể -> Kiểm chứng nhu cầu thị trường trước khi sản xuất.\n\nĐáp án: Quy trình B!"
  }
];

if (typeof window !== 'undefined') {
  window.WIKI_CATEGORIES = WIKI_CATEGORIES;
  window.WIKI_ARTICLES = WIKI_ARTICLES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WIKI_CATEGORIES, WIKI_ARTICLES };
}
