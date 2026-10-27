// ==========================================
// YOUTUBETREND WIKI & KNOWLEDGE BASE DATASET
// 24 Simplified In-Depth Articles & 4 Categories
// Super friendly, plain-Vietnamese, actionable!
// ==========================================

const WIKI_CATEGORIES = [
  {
    "id": "basic",
    "name": "Kiến thức cơ bản",
    "icon": "🌱",
    "desc": "Khái niệm nền tảng: Trend, Ngách, Micro-niche, Evergreen."
  },
  {
    "id": "metrics",
    "name": "Đọc số liệu dễ hiểu",
    "icon": "📊",
    "desc": "Bội số hiệu suất, Lượt xem trung vị, Vận tốc VPH."
  },
  {
    "id": "tools",
    "name": "Công cụ & Kiểm chứng",
    "icon": "🧪",
    "desc": "Kiểm chứng nhu cầu, Khuôn tiêu đề, Đánh giá bão hòa."
  },
  {
    "id": "strategy",
    "name": "Bắt đầu làm kênh",
    "icon": "🚀",
    "desc": "Chọn ngách, Lên 10 video đầu tiên, Quản lý kế hoạch."
  }
];

const WIKI_ARTICLES = [
  {
    "id": "trend_def",
    "title": "Trend là gì? (Xu hướng là gì?)",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Trend là chủ đề đang được rất nhiều người đổ xô vào tìm kiếm và xem trên YouTube trong thời gian gần đây.",
    "simple": "Giống như một cơn sóng ngoài biển. Bạn không tự tạo ra sóng mà chỉ cần nhảy đúng con sóng đang cuộn lên để được đẩy đi xa mà ít tốn sức nhất.",
    "example": "Chủ đề \"Tỷ phú và người giúp việc\" tại Mỹ tăng từ 200 view/giờ lên 2.000 view/giờ. Các kênh mới đăng video cùng chủ đề đều đạt 40k - 100k view dù kênh chỉ có vài trăm người đăng ký.",
    "howTo": "1. Vào tab \"Xu hướng\" trên YouTrend.\n2. Chọn khoảng thời gian 24h hoặc 48h.\n3. Nhìn video có tốc độ tăng view (+.../h) cao nhất để bắt trend ngay.",
    "mistake": "Nhảy vào làm khi trend đã qua đi (sau 2-3 tuần), lúc này các kênh lớn đã làm hết và người xem đã chán.",
    "exercise": "Hỏi: Video 5 triệu view từ 3 năm trước so với video 20k view mới đăng 1 ngày trước đang tăng 1.500 view/h, cái nào phản ánh Trend hiện tại?\n\nĐáp án: Video 20k view mới đăng, vì nó đang có tốc độ người xem tăng vọt ở thời điểm hiện tại."
  },
  {
    "id": "niche_def",
    "title": "Ngách YouTube là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Ngách là một chủ đề cụ thể dành riêng cho một nhóm khán giả nhất định, thay vì làm linh tinh đủ thứ trên đời.",
    "simple": "Giống như mở một phòng khám chuyên khoa Mắt thay vì tiệm tạp hóa chữa bách bệnh. Người đau mắt sẽ tin tưởng phòng khám chuyên khoa hơn.",
    "example": "Thay vì làm \"Nấu ăn\" chung chung, kênh chỉ chuyên \"Nấu món chay eat-clean cho dân văn phòng\". Kênh nhanh chóng đạt 50k sub và khán giả xem đi xem lại tất cả các video.",
    "howTo": "1. Vào tab \"Top Ngách\" trên YouTrend.\n2. Xem 20 ngách được hệ thống gợi ý với doanh thu (RPM) cao và độ cạnh tranh thấp.",
    "mistake": "Hôm nay đăng video nấu ăn, ngày mai chơi game, ngày mốt bình luận đá bóng. YouTube sẽ không biết bạn phục vụ ai để đề xuất.",
    "exercise": "Hỏi: Kênh đăng đủ thứ và Kênh chỉ chuyên sửa đồng hồ cơ Thụy Sĩ, kênh nào dễ được YouTube đề xuất hơn?\n\nĐáp án: Kênh chuyên sửa đồng hồ, vì tệp khán giả đồng nhất giúp thuật toán dễ nhận diện và đề xuất."
  },
  {
    "id": "micro_niche",
    "title": "Micro-niche là gì? (Ngách siêu nhỏ)",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Là một ngách con được đào sâu hơn nữa từ ngách lớn, nơi gần như không có đối thủ cạnh tranh nhưng khán giả cực kỳ mê mẩn.",
    "simple": "Ngách lớn là \"Xe hơi\", ngách nhỏ là \"Xe cổ\", micro-niche là \"Chuyên phục chế dòng xe bọ Volkswagen Beetle đời 1970\".",
    "example": "Kênh \"Dark Aero Tech\" chỉ làm đúng một chuyện: \"Giải thích công nghệ tàng hình máy bay ném bom B-2\". Mỗi video đều đạt 80k - 200k view và tiền quảng cáo cực cao.",
    "howTo": "Lấy 1 chủ đề bạn thích + Thêm 1 đối tượng cụ thể + 1 công cụ cụ thể.",
    "mistake": "Chọn ngách nhỏ đến mức cả thế giới không có ai quan tâm tìm kiếm.",
    "exercise": "Hỏi: \"Làm vườn\" và \"Trồng sen đá mini trong chậu gốm ban công chung cư\", cái nào là micro-niche?\n\nĐáp án: Trồng sen đá mini trong chậu gốm ban công chung cư."
  },
  {
    "id": "evergreen_content",
    "title": "Evergreen content là gì? (Nội dung xanh mãi)",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Là nội dung không bao giờ lỗi thời, người ta tìm kiếm và xem đều đặn suốt 5 - 10 năm sau.",
    "simple": "Giống như cây xanh bốn mùa. Trend như pháo hoa nổ to rồi tắt, còn Evergreen như mạch nước ngầm chảy mãi đem lại tiền thụ động.",
    "example": "Video \"Cách thắt cà vạt chuẩn công sở\" hay \"Toàn bộ lịch sử Đế chế La Mã\" làm từ 4 năm trước nhưng mỗi ngày vẫn đều đặn kiếm về 5.000 view.",
    "howTo": "Kết hợp làm 70% nội dung Evergreen bền vững và 30% video bắt Trend ngắn hạn để kéo view nhanh.",
    "mistake": "Chỉ làm tin tức giật gân, sau 3 ngày không còn ai xem nữa và kênh bị tụt view thê thảm.",
    "exercise": "Hỏi: \"Kết quả chung kết World Cup hôm qua\" và \"Cách sửa bồn cầu bị rò rỉ nước\", cái nào là Evergreen?\n\nĐáp án: Cách sửa bồn cầu bị rò rỉ nước."
  },
  {
    "id": "short_vs_long_trend",
    "title": "Trend ngắn hạn và Nhu cầu dài hạn khác nhau thế nào?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Trend ngắn hạn là cơn sốt nhất thời (1-2 tuần). Nhu cầu dài hạn là sở thích hoặc nỗi đau cố hữu của con người (nhiều năm).",
    "simple": "Trend ngắn hạn như trend trà sữa đất nung (hot vài tháng rồi vắng bóng). Nhu cầu dài hạn như nhu cầu uống nước ngọt và cà phê mỗi sáng.",
    "example": "Làm video về trào lưu meme mới nổi sẽ hút view ngay trong 3 ngày nhưng sau đó view về 0. Làm về \"Tâm lý học thao túng cảm xúc\" thì năm nào cũng có người xem.",
    "howTo": "Dùng tab \"Kiểm Chứng Nhu Cầu\" trên YouTrend để kiểm tra xem chủ đề có được duy trì ổn định không.",
    "mistake": "Đầu tư toàn bộ vốn liếng xây dựng kênh dựa trên một trend sắp lụi tàn.",
    "exercise": "Hỏi: Nên xây dựng kênh dựa trên nền tảng nào?\n\nĐáp án: Xây dựng kênh dựa trên nhu cầu dài hạn, dùng trend ngắn hạn làm đòn bẩy kéo khán giả mới."
  },
  {
    "id": "viral_video",
    "title": "Video viral là gì?",
    "category": "basic",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Là video có tốc độ lan truyền chóng mặt, được khán giả tự động chia sẻ cho nhau và được thuật toán đề xuất khắp trang chủ.",
    "simple": "Giống như một đám cháy lan nhanh trong rừng nhờ có gió mạnh (nội dung đánh trúng cảm xúc tò mò, bất ngờ hoặc phẫn nộ).",
    "example": "Một video đặt câu hỏi: \"Điều gì xảy ra nếu Trái Đất ngừng quay trong 5 giây?\" đạt 2 triệu view chỉ sau 4 ngày nhờ hàng trăm nghìn người tranh luận ở phần bình luận.",
    "howTo": "Xem phần \"Khuôn Tiêu Đề\" trên YouTrend để học cách đặt tiêu đề gợi cảm xúc mạnh.",
    "mistake": "Nghĩ rằng video dài lê thê buồn ngủ có thể tự viral nếu không có đoạn mở đầu (hook) giữ chân trong 30 giây đầu.",
    "exercise": "Hỏi: Yếu tố nào giúp video viral mạnh nhất?\n\nĐáp án: Tỷ lệ nhấp (CTR cao) kết hợp giữ chân người xem ở lại lâu (Retention tốt)."
  },
  {
    "id": "outlier_video",
    "title": "Outlier video là gì? (Video đột biến view)",
    "category": "metrics",
    "level": "Cốt lõi",
    "readTime": "1 phút",
    "summary": "Là video có lượt xem cao gấp nhiều lần so với mức bình thường của chính kênh đó.",
    "simple": "Kênh bình thường mỗi video chỉ được 500 view, nhưng tự nhiên có 1 video vọt lên 50.000 view (gấp 100 lần). Video đó chính là Outlier!",
    "example": "Kênh \"Stoic Mind\" có 1.500 sub, các video cũ chỉ 300 view. Tự nhiên video \"Tại sao người thông minh hay im lặng\" đạt 120.000 view. Đó là một Outlier mỏ vàng.",
    "howTo": "Tìm các video có huy hiệu \"⚡ View gấp ...x bình thường\" trên YouTrend để tìm ra ý tưởng video tiếp theo của bạn.",
    "mistake": "Bắt chước kênh 10 triệu view (họ có view nhờ danh tiếng). Hãy bắt chước video Outlier của các kênh NHỎ!",
    "exercise": "Hỏi: Kênh A 1 triệu sub được 100k view và Kênh B 2k sub được 80k view, video nào là Outlier đáng học theo?\n\nĐáp án: Kênh B (2k sub được 80k view), vì nội dung của nó quá hay mới kéo được lượng view gấp 40 lần số sub!"
  },
  {
    "id": "performance_multiple",
    "title": "Performance Multiple là gì? (Bội số hiệu suất)",
    "category": "metrics",
    "level": "Cốt lõi",
    "readTime": "1 phút",
    "summary": "Con số đo xem video này có view gấp mấy lần mức xem bình thường của kênh.",
    "simple": "Lấy view của video chia cho view bình thường của kênh. Ví dụ: Kênh thường được 1.000 view. Video này được 10.000 view -> Gấp 10 lần (10x)!",
    "example": "Trên YouTrend, khi bạn thấy huy hiệu \"⚡ 8x Median\", nghĩa là video này có view cao gấp 8 lần mức thông thường của kênh đó.",
    "howTo": "Chỉ cần nhìn huy hiệu \"⚡ ...x bình thường\" gắn trên mỗi video card trên YouTrend.",
    "mistake": "Bỏ qua các video có bội số cao chỉ vì thấy kênh đó ít người đăng ký.",
    "exercise": "Hỏi: Kênh thường được 5.000 view, video mới được 40.000 view. Bội số hiệu suất là bao nhiêu?\n\nĐáp án: 8x (gấp 8 lần)."
  },
  {
    "id": "median_views",
    "title": "Median views là gì? (Lượt xem trung vị)",
    "category": "metrics",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Là mức lượt xem thật sự phản ánh sức mạnh thông thường của một kênh, không bị đánh lừa bởi 1 video ăn may.",
    "simple": "Sắp xếp lượt xem các video từ thấp đến cao, số nằm ở chính giữa chính là trung vị.",
    "example": "Kênh có 5 video: 500, 600, 700, 800 và 1 video may mắn được 100.000 view. Lượt xem trung vị là 700 view (phản ánh đúng kênh chỉ ở mức 700 view, không phải kênh khủng).",
    "howTo": "YouTrend tự động tính lượt xem trung vị này để so sánh và tìm ra video bứt phá.",
    "mistake": "Nhìn vào số view trung bình bị kéo ảo bởi 1 video ăn may.",
    "exercise": "Hỏi: Tại sao nên dùng lượt xem trung vị thay vì trung bình?\n\nĐáp án: Để không bị đánh lừa bởi một vài video viral ăn may ngẫu nhiên."
  },
  {
    "id": "why_not_average_views",
    "title": "Vì sao không nên chỉ sử dụng lượt xem trung bình?",
    "category": "metrics",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Vì số trung bình rất dễ bị bóp méo bởi một số cực lớn hoặc cực nhỏ.",
    "simple": "Trong phòng có 4 người thu nhập 10 triệu/tháng và 1 tỷ phú thu nhập 10 tỷ/tháng. Thu nhập trung bình là 2 tỷ/tháng -> Con số này hoàn toàn vô nghĩa với 4 người kia!",
    "example": "Kênh có 9 video 1k view và 1 video 1 triệu view. Số trung bình là 100k view, nhưng thực tế nếu đăng video mới bạn chỉ được khoảng 1k view.",
    "howTo": "Luôn kiểm tra xem kênh có nhiều video đều view hay chỉ có đúng 1 video ăn may.",
    "mistake": "Tin tưởng một kênh bán khóa học khoe \"Lượt xem trung bình kênh tôi là 50k view\" trong khi cả kênh chỉ có 1 video viral duy nhất.",
    "exercise": "Hỏi: Nên dùng chỉ số nào để đánh giá đúng phong độ của kênh?\n\nĐáp án: Lượt xem trung vị (Median views)."
  },
  {
    "id": "subscribers_vs_views",
    "title": "Subscriber và Lượt xem khác nhau thế nào?",
    "category": "metrics",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Subscriber là người bấm theo dõi trong quá khứ. Lượt xem là số người thực sự mở video ra xem ở hiện tại.",
    "simple": "Sub giống như số người có danh thiếp của bạn. View là số người thực sự bước vào cửa hàng mua đồ hôm nay.",
    "example": "Nhiều kênh 1 triệu sub nhưng mỗi video đăng lên chỉ được 5k view (kênh chết). Ngược lại kênh 3k sub làm đúng trend có thể đạt 500k view.",
    "howTo": "Đừng sợ cạnh tranh với kênh lớn. Khi tìm ngách trên YouTrend, hãy tìm những chủ đề mà kênh nhỏ vẫn hút hàng trăm nghìn view.",
    "mistake": "Nghĩ rằng phải có nhiều sub thì video đăng lên mới có người xem.",
    "exercise": "Hỏi: Thuật toán YouTube ngày nay ưu tiên điều gì hơn?\n\nĐáp án: Thuật toán ưu tiên nội dung giữ chân người xem tốt, kênh 0 sub vẫn có thể nổ view nếu nội dung hay."
  },
  {
    "id": "view_velocity",
    "title": "View velocity là gì? (Tốc độ tăng lượt xem - VPH)",
    "category": "metrics",
    "level": "Cốt lõi",
    "readTime": "1 phút",
    "summary": "Là số lượt xem video tăng thêm trong mỗi giờ (Views Per Hour - VPH).",
    "simple": "Như đồng hồ đo tốc độ xe máy (km/h). Xe chạy càng nhanh thì kim tốc độ càng vọt lên cao.",
    "example": "Một video đăng được 6 tiếng và đang tăng +1.500 view/h. Đó là dấu hiệu video đang được YouTube đẩy đề xuất cực mạnh.",
    "howTo": "Nhìn vào mục \"Tốc độ: +.../h\" màu xanh lá cây trên mỗi video card của YouTrend.",
    "mistake": "Chỉ nhìn tổng view mà quên kiểm tra tốc độ. Video 100k view nhưng tăng 0 view/h là video đã dừng đề xuất.",
    "exercise": "Hỏi: Ký hiệu +850/h trên YouTrend có nghĩa là gì?\n\nĐáp án: Video đó đang tăng trung bình 850 lượt xem mỗi giờ."
  },
  {
    "id": "title_pattern",
    "title": "Title Pattern là gì? (Khuôn tiêu đề)",
    "category": "tools",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Là các cấu trúc đặt tên video đã được chứng minh kích thích người xem bấm vào nhiều nhất.",
    "simple": "Giống như công thức làm bánh. Bạn chỉ cần thay nhân bánh (chủ đề của bạn) vào khuôn có sẵn là ra chiếc bánh ngon.",
    "example": "Mẫu \"Tại sao [X] lại sụp đổ?\" -> Áp dụng: \"Tại sao hãng Nokia lại phá sản?\", \"Tại sao không ai làm nhái được động cơ Ferrari?\".",
    "howTo": "Vào mục \"Khuôn Tiêu Đề\" trên YouTrend để xem các mẫu và nhận gợi ý tiêu đề tự động.",
    "mistake": "Đặt tiêu đề theo kiểu đặt tên bài học khô khan: \"Bài 1: Giới thiệu về máy bay\". Hãy đổi thành: \"Bí mật đằng sau máy bay ném bom tàng hình B-2\".",
    "exercise": "Hỏi: Mẫu tiêu đề nào sau đây dễ thu hút click hơn?\n\nA. Lịch sử chiến tranh La Mã.\nB. Toàn bộ lịch sử Đế chế La Mã trong 18 phút.\n\nĐáp án: Câu B."
  },
  {
    "id": "content_angle",
    "title": "Content Angle là gì? (Góc tiếp cận nội dung)",
    "category": "tools",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Là góc nhìn hoặc khía cạnh độc đáo mà bạn chọn để kể câu chuyện, giúp video khác biệt với hàng trăm video cùng chủ đề.",
    "simple": "Cùng một quả núi: người thì chụp từ dưới chân núi, người chụp từ đỉnh núi, người lại bay trực thăng chụp xuống.",
    "example": "Cùng làm về iPhone: Kênh A \"Mở hộp iPhone mới\", Kênh B chọn góc \"Tôi đã thả rơi iPhone từ tầng 10 xuống xem có vỡ không?\". Kênh B hút view gấp 10 lần.",
    "howTo": "Khi tìm được chủ đề hot trên YouTrend, tự hỏi: \"Mình có thể kể câu chuyện này theo góc nhìn nào bất ngờ hơn không?\".",
    "mistake": "Sao chép y nguyên 100% kịch bản của đối thủ mà không có nét riêng.",
    "exercise": "Hỏi: Góc tiếp cận nào độc đáo hơn khi làm về giảm cân?\n\nA. 5 bài tập giảm cân tại nhà.\nB. Tôi đã ăn thử thực đơn của lính đặc nhiệm trong 7 ngày và đây là kết quả.\n\nĐáp án: Câu B."
  },
  {
    "id": "topic_cluster",
    "title": "Topic Cluster là gì? (Nhóm chủ đề liên kết)",
    "category": "tools",
    "level": "Chiến lược",
    "readTime": "1 phút",
    "summary": "Là việc làm một chuỗi 5 - 10 video xoay quanh cùng một chủ đề chính để giữ chân người xem xem hết video này đến video khác.",
    "simple": "Giống như xem một bộ phim truyền hình nhiều tập. Hết tập 1 người xem sẽ tự động bấm xem tiếp tập 2.",
    "example": "Làm chuỗi 5 video về: \"5 vũ khí bí mật thời Thế chiến thứ 2\". Khán giả xem video về xe tăng Tiger sẽ được YouTube đề xuất tiếp video về máy bay tiêm kích Spitfire của chính bạn.",
    "howTo": "Vào tab \"Trend SRT\" trên YouTrend để gom các video có từ khóa liên quan thành 1 nhóm.",
    "mistake": "Mỗi video làm một chủ đề rời rạc không liên quan, người xem xem xong 1 video là rời khỏi kênh.",
    "exercise": "Hỏi: Lợi ích lớn nhất của Topic Cluster là gì?\n\nĐáp án: Tăng thời lượng xem cả kênh (Session Time), khiến YouTube đẩy kênh lên cực mạnh."
  },
  {
    "id": "demand_validation",
    "title": "Demand Validation là gì? (Kiểm chứng nhu cầu)",
    "category": "tools",
    "level": "Cốt lõi",
    "readTime": "1 phút",
    "summary": "Là bước kiểm tra xem có thật sự nhiều người muốn xem chủ đề này hay không, trước khi bạn bỏ hàng chục giờ ra làm video.",
    "simple": "Một quán trà sữa đông khách có thể do người bán duyên dáng (ăn may). Nhưng 4 quán trà sữa trên cùng phố đều đông -> Nhu cầu uống trà sữa là có thật!",
    "example": "Bạn thấy 1 video về \"Lịch sử cà phê\" được 100k view. Kiểm tra thấy chỉ có ĐÚNG 1 video đó được view cao, các kênh khác làm đều lẹt đẹt 200 view -> Đừng làm, đó là ăn may!",
    "howTo": "Bấm nút \"Kiểm Chứng Nhu Cầu\" trên YouTrend. Nếu có ít nhất 3 kênh cùng làm được >30k view thì hãy bắt tay làm.",
    "mistake": "Vội vã làm kênh chỉ vì thấy đúng 1 video viral trên mạng.",
    "exercise": "Hỏi: Cần ít nhất bao nhiêu kênh độc lập cùng đạt view cao để kiểm chứng một ngách?\n\nĐáp án: Ít nhất 3 đến 5 kênh độc lập."
  },
  {
    "id": "saturation_level",
    "title": "Độ bão hòa của một ngách là gì?",
    "category": "tools",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Là mức độ đông đúc của ngách: Có quá nhiều kênh lớn đang làm hay vẫn còn chỗ cho kênh mới chen chân vào.",
    "simple": "Giống như một cái hồ nước. Nếu có 100 người câu cá mà chỉ có 10 con cá thì hồ đã bão hòa. Nếu hồ đầy cá mà chỉ có 2 người câu thì đó là mỏ vàng.",
    "example": "Ngách \"Tin tức bóng đá\" có hàng nghìn kênh lớn cạnh tranh khốc liệt (bão hòa). Ngách \"Kể chuyện lịch sử máy bay quân sự\" chỉ có 5 kênh làm (còn rất nhiều đất diễn).",
    "howTo": "Bấm nút \"Đo ngách & Đối thủ\" trên thẻ video ở tab Top Ngách để xem phân tích cạnh tranh.",
    "mistake": "Cắm đầu vào làm ngách có quá nhiều ông lớn làm lâu năm với đội ngũ chuyên nghiệp.",
    "exercise": "Hỏi: Kênh mới nên chọn ngách nào?\n\nĐáp án: Ngách có nhu cầu người xem cao nhưng độ bão hòa (cạnh tranh) thấp đến trung bình."
  },
  {
    "id": "competitor_analysis",
    "title": "Cách phân tích một kênh YouTube đối thủ",
    "category": "strategy",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Học hỏi từ những gì đối thủ đang làm tốt và phát hiện những điểm họ làm dở để mình làm tốt hơn.",
    "simple": "Vào quán ăn đối thủ ăn thử xem món nào ngon nhất khách gọi nhiều nhất, và xem món nào dở để quán mình cải thiện.",
    "example": "Vào kênh đối thủ nhỏ, sắp xếp video theo \"Phổ biến nhất\" -> Nhặt ra 3 video nhiều view nhất của họ -> Xem cách họ làm thumbnail và đặt tiêu đề.",
    "howTo": "Vào tab \"Đối thủ\" trên YouTrend, dán link kênh đối thủ vào để hệ thống theo dõi và phân tích tự động.",
    "mistake": "Copy nguyên xi video đối thủ (dễ dính bản quyền và bị người xem đánh giá thấp). Hãy học công thức và làm hay hơn!",
    "exercise": "Hỏi: Khi soi kênh đối thủ, video nào đáng giá nhất để học hỏi?\n\nĐáp án: Video có lượt xem đột biến cao nhất của họ."
  },
  {
    "id": "evaluating_outliers",
    "title": "Cách đánh giá một video có hiệu suất nổi bật",
    "category": "strategy",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Dựa trên 3 yếu tố: Kênh nhỏ mà view cao + Video đăng gần đây + Tốc độ xem mỗi giờ vẫn đang tăng.",
    "simple": "Một võ sĩ hạng nhẹ nhưng hạ gục được đối thủ to lớn ngay trên sàn đấu hôm nay.",
    "example": "Kênh chỉ 2.000 sub nhưng video đăng 3 ngày trước đạt 80.000 view và đang tăng +1.200 view/h -> Đây là video hiệu suất cực đại.",
    "howTo": "YouTrend tự động gán huy hiệu \"Score .../100\" và \"View gấp ...x bình thường\" để bạn nhận biết ngay lập tức.",
    "mistake": "Đánh giá cao một video có 500k view nhưng đã đăng từ 3 năm trước và hiện không còn ai xem.",
    "exercise": "Hỏi: Video nào có hiệu suất nổi bật hơn?\n\nA. Kênh 500k sub được 20k view.\nB. Kênh 2k sub được 60k view.\n\nĐáp án: Câu B."
  },
  {
    "id": "choosing_first_niche",
    "title": "Cách lựa chọn ngách để bắt đầu",
    "category": "strategy",
    "level": "Cốt lõi",
    "readTime": "1 phút",
    "summary": "Giao điểm của 3 vòng tròn: Có người xem (Nhu cầu) + Ít người làm tốt (Ít cạnh tranh) + Bạn làm được lâu dài mà không nản.",
    "simple": "Chọn xe để đi xa: Đừng chọn xe quá nặng không dắt nổi, cũng đừng chọn đường kẹt xe nghẹt thở.",
    "example": "Nếu thích lịch sử, đừng làm \"Lịch sử chung chung\", hãy làm \"Lịch sử các bí mật gián điệp thời Chiến tranh Lạnh\".",
    "howTo": "Xem 20 ngách gợi ý trong tab \"Top Ngách\" của YouTrend, chọn 1 ngách có RPM > $20 và độ cạnh tranh Thấp.",
    "mistake": "Chọn ngách chỉ vì nghe đồn nhiều tiền nhưng bản thân không hề có hứng thú hay hiểu biết gì về nó.",
    "exercise": "Hỏi: Tiêu chí nào quan trọng nhất khi chọn ngách?\n\nĐáp án: Thị trường có nhu cầu thật và bạn có thể sản xuất được ít nhất 20 video liên tục."
  },
  {
    "id": "first_10_videos",
    "title": "Cách tìm ý tưởng cho 10 video đầu tiên",
    "category": "strategy",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Không cần tự nghĩ ra từ đầu. Hãy chọn 10 video Outlier tốt nhất trong ngách và áp dụng 10 khuôn tiêu đề khác nhau.",
    "simple": "Giống như học vẽ, trước khi sáng tác tranh riêng, người họa sĩ tập chép lại các bức tranh mẫu đẹp nhất.",
    "example": "Tìm 10 video view cao của 5 kênh nhỏ đối thủ -> Dùng mục \"Khuôn Tiêu Đề\" để tạo 10 tiêu đề mới -> Lưu vào \"Kế Hoạch Video\".",
    "howTo": "Bấm nút \"Kế Hoạch Video\" trên YouTrend để lưu và quản lý danh sách 10 video đầu tiên.",
    "mistake": "Ngồi vắt óc nghĩ linh tinh những thứ không ai muốn xem.",
    "exercise": "Hỏi: 10 video đầu tiên có nên làm thử 10 chủ đề khác nhau không?\n\nĐáp án: Không! Phải cùng nằm trong 1 ngách để YouTube nhận diện đúng tệp khán giả."
  },
  {
    "id": "using_youtubetrend",
    "title": "Cách sử dụng YouTrend hiệu quả nhất",
    "category": "strategy",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "Quy trình 3 bước: Bắt sóng trend -> Kiểm chứng nhu cầu -> Lên kế hoạch sản xuất.",
    "simple": "Bước 1: Soi radar tìm mỏ vàng -> Bước 2: Thử xem mỏ vàng có thật không -> Bước 3: Đào vàng.",
    "example": "Vào Xu Hướng lọc VPH cao -> Mở Kiểm Chứng Nhu Cầu xem có ≥3 kênh làm không -> Chọn khuôn tiêu đề và bấm Lưu ý tưởng.",
    "howTo": "Mọi công cụ đều có sẵn trên thanh công cụ và trang Wiki của YouTrend.",
    "mistake": "Chỉ lướt xem số liệu cho vui mắt mà không bấm lưu ý tưởng vào kế hoạch sản xuất.",
    "exercise": "Hỏi: Sau khi tìm thấy 1 video đột biến view, bước tiếp theo nên làm gì?\n\nĐáp án: Dùng công cụ Kiểm Chứng Nhu Cầu để xem có ít nhất 3 kênh cùng làm thành công không."
  },
  {
    "id": "public_vs_private_metrics",
    "title": "Chỉ số công khai và Chỉ số riêng tư khác nhau thế nào?",
    "category": "strategy",
    "level": "Cơ bản",
    "readTime": "1 phút",
    "summary": "Chỉ số công khai là số liệu ai cũng xem được (view, sub, ngày đăng, vph). Chỉ số riêng tư chỉ chủ kênh mới thấy (doanh thu thật, giữ chân retention, tỷ lệ click ctr).",
    "simple": "Như nhìn vào một cửa hàng: bạn thấy bao nhiêu khách đi ra đi vào (công khai), nhưng không biết két sắt của họ có bao nhiêu tiền (riêng tư).",
    "example": "YouTrend tính doanh thu dựa trên số lượt xem và RPM ước tính của ngách, chứ không thể đọc lén tài khoản ngân hàng của đối thủ.",
    "howTo": "Dùng các chỉ số công khai có độ tin cậy cao trên YouTrend: Lượt xem, VPH, Ngày đăng, Performance Multiple.",
    "mistake": "Tin vào các phần mềm lừa đảo cam kết \"hack xem được doanh thu chính xác 100% của đối thủ\".",
    "exercise": "Hỏi: YouTrend lấy dữ liệu từ đâu?\n\nĐáp án: Từ YouTube Data API v3 chính thống của Google."
  },
  {
    "id": "ai_niche_mistakes",
    "title": "Những sai lầm thường gặp khi tìm ngách bằng AI",
    "category": "strategy",
    "level": "Thực hành",
    "readTime": "1 phút",
    "summary": "AI chỉ là trợ lý viết kịch bản, nó không biết thị trường thực tế hôm nay người ta đang xem gì nếu không có số liệu thật.",
    "simple": "Hỏi ChatGPT ngách nào hot cũng giống như hỏi người không ra đường xem hôm nay chợ bán gì ngon nhất. Bạn cần phải nhìn số liệu thực tế!",
    "example": "ChatGPT gợi ý bạn làm ngách \"Thiền định\", nhưng số liệu YouTrend cho thấy ngách này đang cực kỳ bão hòa và các kênh mới không có view.",
    "howTo": "Dùng YouTrend tìm video thật đang nổ view -> Đưa tiêu đề đó cho AI để nhờ viết kịch bản biến thể.",
    "mistake": "Phó mặc 100% việc chọn ngách cho AI mà không kiểm chứng số liệu view thực tế.",
    "exercise": "Hỏi: Quy trình chuẩn khi kết hợp YouTrend và AI là gì?\n\nĐáp án: Dùng YouTrend lấy dữ liệu số view thật -> Dùng AI viết kịch bản và tối ưu tiêu đề."
  }
];

if (typeof window !== 'undefined') {
  window.WIKI_CATEGORIES = WIKI_CATEGORIES;
  window.WIKI_ARTICLES = WIKI_ARTICLES;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WIKI_CATEGORIES, WIKI_ARTICLES };
}
