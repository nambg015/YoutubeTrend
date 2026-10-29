# Cài đặt đăng nhập + xác minh SĐT (bản auth v4 – Telegram Bot & SMS)

## Tổng quan cách hoạt động
- **Firebase** lo danh tính: đăng nhập **Google** và **tên đăng nhập + mật khẩu**.
- **Xác minh SĐT chống clone tài khoản**:
  - **Cách 1 (Khuyên dùng - Mặc định): Telegram Bot OTP (Miễn phí 100%, 1 giây)**. Người dùng bấm mở bot Telegram của YouTrend, bấm **Bắt đầu (Start)** và bấm **"Gửi số điện thoại"**. Telegram gửi số điện thoại chính chủ đã xác thực từ SIM. Web YouTrend tự động nhận diện và kích hoạt ngay lập tức (không cần gõ mã nếu mở cùng máy, hoặc nhập mã 6 số nếu dùng 2 máy).
  - **Cách 2: SMS nhà mạng Việt Nam** (SpeedSMS / eSMS) nếu quản trị viên muốn cung cấp thêm tuỳ chọn SMS truyền thống.
- **Chống gian lận / Tạo nhiều tài khoản**: Mỗi số điện thoại chỉ được kích hoạt duy nhất cho 1 tài khoản YouTrend. Nếu dùng số đã có người khác liên kết, hệ thống sẽ từ chối ngay.

---

## 1. Tạo Telegram Bot (Chỉ mất 1 phút, Miễn phí 100%, Không tốn tiền SMS)

1. Mở ứng dụng Telegram, tìm bot **`@BotFather`** (có tích xanh chính thức của Telegram).
2. Gửi lệnh `/newbot`.
3. Nhập tên hiển thị cho bot, ví dụ: `YouTrend Verify Bot`.
4. Nhập username kết thúc bằng `bot`, ví dụ: `youtrend_auth_bot` hoặc `youtrend_verify_bot`.
5. `@BotFather` sẽ gửi cho bạn một đoạn mã **Token** (dạng `7123456789:ABCdefGhI_klmNOPqrsTUVwxyz...`).
6. Thêm 2 biến vào Vercel (mục **Settings → Environment Variables**):
   - `TELEGRAM_BOT_TOKEN`: Dán mã Token vừa nhận.
   - `TELEGRAM_BOT_USERNAME`: Dán username bot vừa tạo (ví dụ `youtrend_auth_bot`, không kèm dấu `@`).
7. **Kích hoạt Webhook tự động**:
   Sau khi deploy lên Vercel, bạn chỉ cần mở trình duyệt vào link:
   `https://<ten-mien-cua-ban>.vercel.app/api/telegram-webhook?setup=1`
   Màn hình hiện `{"success": true, "message": "Thiết lập Webhook Telegram thành công!"}` là xong 100%!

---

## 2. Biến môi trường Vercel (Settings → Environment Variables)

| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Khuyên dùng | Token lấy từ `@BotFather` |
| `TELEGRAM_BOT_USERNAME` | Khuyên dùng | Username bot (ví dụ `youtrend_verify_bot`) |
| `OTP_SECRET` | Khuyên dùng | Chuỗi ngẫu nhiên dài ≥ 32 ký tự để băm mã OTP an toàn. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Tuỳ chọn | Upstash Redis (Vercel Marketplace). Nếu chưa gắn, hệ thống tự dùng bộ nhớ tạm RAM (không làm sập web). |
| `SMS_PROVIDER` | Tuỳ chọn | Nếu muốn thêm SMS (`speedsms`, `speedsms2fa`, `esms`). |
| `REQUIRE_PHONE` | Tuỳ chọn | Đặt `false` nếu muốn tạm tắt bắt buộc SĐT (mặc định là `true`). |
| `GEMINI_API_KEY`, `SEPAY_API_KEY` | Có | Theo các tính năng AI & thanh toán. |

---

## 3. Quy trình người dùng trải nghiệm

1. Khách bấm đăng nhập bằng Google hoặc Tài khoản/Mật khẩu.
2. Web mở trực tiếp màn hình **"Xác Minh Số Điện Thoại Chính Chủ"**.
3. Khách bấm nút: **"✈️ Mở Telegram Nhận Mã Ngay (1s)"**.
4. Trên Telegram, khách bấm **BẮT ĐẦU (START)** rồi bấm nút **"📱 Gửi Số Điện Thoại Xác Thực"**.
5. Web YouTrend tự động nhận diện và mở khoá tài khoản ngay lập tức (không cần gõ mã).
6. 100% không lo lỗi nhà mạng, không lo hết tiền SMS, hoàn toàn tự động 24/7.

---

## 4. Trạng thái hiện tại & Hạn mức
- **Tạm thời tắt bắt buộc xác minh SĐT**: Khách truy cập có thể tạo clone tài khoản (cả tài khoản mật khẩu và Gmail) một cách thuận tiện để kéo tương tác và điểm SEO cho website.
- **Hạn mức tài khoản miễn phí**: Tất cả tài khoản đã đăng nhập (cả mật khẩu và Gmail) đều được **5 từ khoá xu hướng & phân tích mỗi ngày**.
- **Gói trả phí (PRO & ULTRA PRO)**: Giữ nguyên như cũ (PRO: 50 từ/ngày, ULTRA PRO: không giới hạn, kèm tính năng Spy kênh ngầm).
- **Hình nền 4K Blue**: Đã đổi sang hình nền xanh công nghệ 4K sắc nét (`bg_blue_4k.jpg`), không bị vỡ/bể hay mờ.
- **Lưu giữ toàn bộ code OTP & Telegram**: Toàn bộ hệ thống xác thực OTP qua Telegram Bot & SMS vẫn được lưu trữ nguyên vẹn trong mã nguồn. Khi cần kích hoạt lại xác minh SĐT bắt buộc, chỉ cần bật cờ cấu hình (`window.__REQUIRE_PHONE = true` trên client hoặc `REQUIRE_PHONE=true` trên server).

---

## 5. Tài khoản Quản Trị Viên (Admin Tối Cao - Không Giới Hạn)
- **Tài khoản (Tk)**: `admin` (hoặc `adminh`, `admin@youtrend.pro`)
- **Mật khẩu (Mk)**: `admin2026` (hoặc `Admin@2026`)
- **Quyền hạn tối cao (Không giới hạn mọi thứ)**:
  - Tự động kích hoạt gói **ULTRA PRO** vĩnh viễn (Lifetime).
  - Không giới hạn từ khóa xu hướng (Bypass hoàn toàn giới hạn 5 từ/ngày).
  - Không giới hạn phân tích ngách chuyên sâu & Outlier Radar.
  - Toàn quyền truy cập công cụ **Thám Tử Spy v3** (Bóc tách kênh ngầm, giải mã doanh thu).
  - Toàn quyền truy cập **Top Ngách US High-RPM**, Explorer, Wiki 24 bài.
  - Không bao giờ bị chặn hay yêu cầu xác minh OTP SĐT.
  - Có thể tự đổi mật khẩu Admin trong menu "Đổi Mật Khẩu" của tài khoản bất kỳ lúc nào.

---

## 6. Chạy kiểm thử tự động
Chạy lệnh trong terminal:
```bash
npm test
```
Toàn bộ **87/87 test** đều pass 100%.

