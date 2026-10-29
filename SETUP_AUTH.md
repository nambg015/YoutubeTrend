# Cài đặt đăng nhập + xác minh SĐT (bản auth v2)

## 0. LÀM NGAY (bảo mật)
1. **Thu hồi / tạo lại SePay API key.** Key cũ nằm trong `api/verify-payment.js` của các bản trước và có thể còn trong lịch sử Git → coi như đã lộ. Key mới chỉ đặt trong biến môi trường Vercel `SEPAY_API_KEY`.
2. Nếu repo GitHub đang để public, kiểm tra lại các key khác (Gemini, YouTube) đã từng commit.

## 1. Firebase Console (project `sdt2804-84801`)
- **Authentication → Sign-in method**: bật **Google**, **Email/Password**, **Phone**.
- **Authentication → Settings → Authorized domains**: thêm `youtubetrend-rho.vercel.app` (và domain riêng nếu có). *Thiếu bước này = lỗi `auth/unauthorized-domain` khi bấm Google.*
- **Authentication → Settings → SMS region policy**: chỉ cho phép **Vietnam (VN)** (chặn SMS pumping ra nước ngoài).
- **Phone → Phone numbers for testing**: thêm 1–2 số test (mã cố định) để dev không tốn SMS thật.
- Nên bật **App Check** (reCAPTCHA) cho Authentication và đặt **Budget alert** trong Google Cloud Billing (gói Blaze tính tiền SMS).
- Google Cloud Console → Credentials → Browser key của Firebase: *Application restrictions = HTTP referrers* (`youtubetrend-rho.vercel.app/*`), *API restrictions* gồm **Identity Toolkit API** và **Token Service API**. Sai chỗ này gây `api-key-not-valid`.

## 2. Biến môi trường Vercel
| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `GEMINI_API_KEY` | có | key Gemini dùng ở server |
| `GEMINI_MODEL` | nên | `gemini-2.5-flash` đang nằm trong lịch ngừng hỗ trợ của Google; đặt tên model mới (xem ai.google.dev/gemini-api/docs/models) |
| `SEPAY_API_KEY` | có | key SePay **mới** |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **có (production)** | tạo Upstash Redis qua Vercel Marketplace. Không có thì hạn mức chỉ đếm trong RAM từng instance → không chặn spam thật |
| `ALLOWED_ORIGINS` | tuỳ | mặc định `https://youtubetrend-rho.vercel.app`, nhiều domain cách nhau dấu phẩy |
| `FIREBASE_PROJECT_ID` | tuỳ | mặc định `sdt2804-84801` |
| `AI_DAILY_LIMIT` / `CLUES_DAILY_LIMIT` | tuỳ | lượt/ngày/tài khoản, mặc định 30 / 15 |

## 3. Cách hoạt động
- Đăng ký / đăng nhập (Google hoặc tên đăng nhập + mật khẩu) → Firebase tạo tài khoản → **bắt buộc** nhập SĐT + OTP, SĐT được *gắn vào đúng tài khoản đó*. Firebase từ chối nếu SĐT đã thuộc tài khoản khác.
- Trình duyệt gửi `Authorization: Bearer <ID token>` lên `/api/trend-v2-ai`, `/api/extract-clues`, `/api/verify-payment`. Server kiểm tra chữ ký token, và token phải có `phone_number`; sau đó trừ hạn mức theo uid.
- Tài khoản cũ (lưu trong localStorage) không còn hiệu lực → người dùng đăng ký lại bằng hệ thống mới.

## 4. Chưa làm (cần quyết định)
- Gói PRO/ULTRA và đếm lượt "5 từ khoá/ngày" **vẫn lưu ở trình duyệt** nên tự sửa được. Muốn thu tiền thật phải chuyển sang lưu ở server (KV/Firestore) theo uid.
- Đường đăng nhập `adminh` (hash mật khẩu nằm trong code) vẫn giữ để bạn không mất quyền; nên thay bằng danh sách uid admin kiểm tra ở server.
- Gọi YouTube Data API đang chạy thẳng từ trình duyệt bằng key của người dùng nên không throttle được ở server nếu không đưa qua proxy.

## 5. Chạy test
`npm test` (48 test, không cần mạng).
