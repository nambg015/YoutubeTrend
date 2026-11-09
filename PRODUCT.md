# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Một người dùng duy nhất: chủ kênh YouTube người Việt (admin `tranminh1135@gmail.com` / tài khoản `adminh`). Họ làm video "ăn theo view": săn chủ đề đang nổ, tìm kênh nhỏ đang farm view, gom tài nguyên (tin, họp báo, ảnh, khung hình) rồi đưa cho Claude viết kịch bản. Dùng hằng ngày trên PC, thường là phiên làm việc dài, quét nhiều lần và tự lọc bằng mắt.

## Product Purpose

YouTrend là bàn làm việc riêng để quyết định "làm video gì tiếp theo" và chuẩn bị đủ nguyên liệu để sản xuất. Thành công = tìm ra kênh/ngách đáng clone nhanh hơn, ít bỏ sót, và đi từ chủ đề tới prompt kịch bản trong một phiên.

## Positioning

Không phải công cụ SEO đại trà: ưu tiên kênh nhỏ (dưới 5K/20K sub) có view vượt sub, so sánh logic để nhận ra kênh đang farm tiền thật bằng content, và nối thẳng nghiên cứu sang sản xuất với Claude.

## Operating Context

- Sáu mục: Khám phá (phân tích từ khoá, AI đề xuất ngách), Top Ngách (ưu tiên số một), Kênh (theo dõi, phân tích, truy vết kênh ẩn, soi video), Tạo tài nguyên (hồ sơ chủ đề, video YouTube, ảnh, chụp khung hình, dự án & Claude), Thư viện (video đã lưu, kế hoạch), Cài đặt (API key YouTube, Claude, tài khoản, sao lưu).
- Dữ liệu từ YouTube Data API v3 (quota theo ngày, xoay nhiều key), Gemini có Google Search, Google News RSS, Claude API.
- Kết quả thường dài: hàng trăm kênh/video, người dùng tự lọc.

## Capabilities and Constraints

- Static site: React 18 UMD không JSX (`React.createElement`), Tailwind CDN, Firebase Auth compat; Vercel serverless trong `api/`.
- Chỉ admin; không đăng ký, không gói trả phí.
- Một số module nhúng cũ (spy_v3_bundle, trend_v2_bundle, studio_chart_bundle) có class Tailwind riêng, được làm dịu qua lớp `.mono` trong `core.js`.
- Toàn bộ giao diện tiếng Việt; dữ liệu nội dung có thể là mọi ngôn ngữ (Nhật, Trung, Hindi, Tây Ban Nha...).

## Brand Commitments

- Tên: YouTrend.
- Bắt buộc giữ (xác nhận khi thiết kế lại, 2026-11-10): danh sách kênh/video dạng thẻ; nền ảnh radar 4K (`bg_4k.jpg`) phía sau.
- Người dùng từng yêu cầu: tối giản, không màu mè, vẫn có màu (không trắng đen), chữ không nhạt, thẻ đậm tách khỏi nền, không gây mỏi mắt. "Không icon" và "nền tối" không còn là ràng buộc bắt buộc.
- Màn hình chính: PC/laptop màn rộng.

## Evidence on Hand

Dữ liệu thật đến từ API lúc chạy; không có ảnh thương hiệu, logo hay nội dung marketing. Không bịa số liệu hay kênh mẫu trong giao diện thật.

## Product Principles

1. Quét nhiều, lọc bằng mắt: hiện đủ dữ liệu, xếp kênh nhỏ đáng chú ý lên đầu.
2. Mỗi con số phải tự giải thích (view ÷ sub, so với trung vị, quota) ngay tại chỗ.
3. Từ phát hiện tới hành động trong một bước: mở kênh, theo dõi, lưu, đưa vào dự án.
4. Không đánh đổi độ dễ đọc trong phiên dài lấy hiệu ứng.
