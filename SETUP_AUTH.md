# Cài đặt đăng nhập + xác minh SĐT (bản auth v3 – SMS qua nhà mạng Việt Nam)

## Tổng quan cách hoạt động
- **Firebase** chỉ lo danh tính: đăng nhập **Google** và **tên đăng nhập + mật khẩu**.
- **SĐT** do **server của bạn** xác minh: `/api/phone-otp` tự sinh mã 6 số → gửi SMS qua **SpeedSMS** hoặc **eSMS** → người dùng nhập mã → server lưu "SĐT này thuộc tài khoản này" vào Redis (Upstash). **Không còn dùng Firebase Phone Auth / reCAPTCHA / gói Blaze.**
- Các API tốn tiền (`trend-v2-ai`, `extract-clues`, `verify-payment`) vẫn chặn nếu tài khoản chưa xác minh SĐT.
- Mỗi SĐT chỉ gắn được 1 tài khoản. Chống spam: 60 giây giữa 2 lần gửi, tối đa 5 mã/giờ/tài khoản, 5 mã/ngày/SĐT, 20 mã/giờ/IP, nhập sai 5 lần thì phải xin mã mới.

## 1. Firebase Console (project `sdt2804-84801`) — sửa lỗi đăng nhập Google / mật khẩu
1. **Authentication → Sign-in method**: bật **Google** và **Email/Password** (không cần bật Phone nữa).
2. **Authentication → Settings → Authorized domains**: thêm `youtubetrend-rho.vercel.app` (và domain riêng nếu có). *Thiếu bước này = lỗi `auth/unauthorized-domain` khi bấm Google.*
3. Google Cloud Console → APIs & Services → Credentials → **Browser key** của Firebase: nếu đang giới hạn *HTTP referrers* thì thêm `youtubetrend-rho.vercel.app/*` **và** `sdt2804-84801.firebaseapp.com/*`; *API restrictions* phải gồm **Identity Toolkit API** và **Token Service API**. Sai chỗ này gây `api-key-not-valid`.
4. Khi lỗi, giao diện giờ hiện kèm mã lỗi dạng `[auth/xxx]` — gửi mã đó cho mình nếu vẫn không vào được.

## 2. Chọn nhà SMS (chọn 1 trong 2)

### A0. SpeedSMS 2FA — KHUYÊN DÙNG, không cần brandname
1. connect.speedsms.vn → menu **Verification** (2-Factor Authentication) → **Add new** → tạo 1 ứng dụng, lấy **App ID**.
2. Biến môi trường: `SMS_PROVIDER=speedsms2fa`, `SPEEDSMS_TOKEN=<token>`, `SPEEDSMS_APP_ID=<App ID>`.
3. SpeedSMS tự sinh mã (độ dài theo cấu hình app, thường 4–6 số) và gửi đi.

### A. SpeedSMS.vn sms/send — cần sender/brandname hợp lệ (lỗi `sender not found` nếu thiếu)
1. Đăng ký speedsms.vn, nạp tiền, vào **Cài đặt → Profile** lấy **Access Token**.
2. Biến môi trường: `SMS_PROVIDER=speedsms`, `SPEEDSMS_TOKEN=<token>`.
3. Mặc định dùng `sms_type=2` (tin chăm sóc khách hàng, đầu số ngẫu nhiên). Có brandname thì đặt thêm `SPEEDSMS_SMS_TYPE=3` và `SPEEDSMS_SENDER=<brandname>`.
4. **Không bật whitelist IP** trong SpeedSMS (Vercel không có IP cố định → lỗi 007).

### B. eSMS.vn — ổn định hơn nhưng phải đăng ký trước (3–5 ngày làm việc)
1. Đăng ký esms.vn, đăng ký **Brandname** loại CSKH + **mẫu tin OTP** và chờ duyệt.
2. Lấy **ApiKey / SecretKey** ở mục *Quản lý API*.
3. Biến môi trường: `SMS_PROVIDER=esms`, `ESMS_API_KEY`, `ESMS_SECRET_KEY`, `ESMS_BRANDNAME`, và `SMS_TEMPLATE` = **đúng nội dung mẫu đã duyệt**, chỗ mã OTP viết `{code}` (sai mẫu → lỗi 146).
4. Thử không tốn tiền: đặt `ESMS_SANDBOX=1`. **Không bật whitelist IP.**

## 3. Biến môi trường Vercel (Settings → Environment Variables, xong phải Redeploy)
| Biến | Bắt buộc | Ghi chú |
|---|---|---|
| `SMS_PROVIDER` | có | `speedsms` hoặc `esms` |
| `SPEEDSMS_TOKEN` / `ESMS_*` | có | theo nhà SMS ở trên |
| `OTP_SECRET` | **có** | chuỗi ngẫu nhiên dài ≥ 32 ký tự (khoá băm mã OTP). Tạo bằng: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | **có** | Upstash Redis (Vercel → Storage / Marketplace → Upstash Redis). Thiếu thì server từ chối gửi OTP |
| `SMS_TEMPLATE` | tuỳ | nội dung SMS, có `{code}`. Mặc định: `Ma xac thuc YouTrend cua ban la {code}. Ma het han sau 5 phut. Tuyet doi khong chia se ma nay.` |
| `REQUIRE_PHONE` | tuỳ | đặt `false` để **tạm tắt** bắt buộc SĐT (vẫn phải đăng nhập). Dùng lúc chờ eSMS duyệt; nhớ bật lại, vì tắt thì ai cũng tạo được nhiều tài khoản |
| `GEMINI_API_KEY`, `GEMINI_MODEL`, `SEPAY_API_KEY` | có | như bản trước |
| `ALLOWED_ORIGINS`, `FIREBASE_PROJECT_ID`, `AI_DAILY_LIMIT`, `CLUES_DAILY_LIMIT` | tuỳ | như bản trước |

## 4. Kiểm tra sau khi deploy
1. Mở site bằng Chrome → Đăng nhập Google → màn hình xác minh SĐT → nhập số → **nhận SMS** → nhập mã.
2. Nếu báo *"Hệ thống chưa cấu hình dịch vụ gửi SMS"* → thiếu `SMS_PROVIDER`/token. *"Máy chủ thiếu OTP_SECRET"* hoặc *"chưa gắn Redis/KV"* → thiếu biến tương ứng. *"Không gửi được tin nhắn OTP"* → xem **Vercel → Logs**, dòng `[sms] gửi thất bại: ...` ghi nguyên nhân từ nhà SMS (hết tiền, sai token, sai mẫu tin...).
3. Tài khoản đã xác minh ở bản cũ (Firebase Phone) vẫn được chấp nhận. Tài khoản chưa xác minh sẽ phải làm lại bằng SMS mới.

## 5. Chưa làm (cần quyết định)
- Gói PRO/ULTRA và đếm lượt "5 từ khoá/ngày" ở phía trình duyệt vẫn tự sửa được; muốn thu tiền thật phải chuyển hết sang server theo uid.
- Đường đăng nhập `adminh` (hash mật khẩu nằm trong code) vẫn giữ; nên thay bằng danh sách uid admin kiểm tra ở server (`ADMIN_UIDS`).
- Tab "Đăng nhập chỉ bằng SĐT" đã bỏ (nó dựa vào Firebase Phone Auth). Muốn có lại cần thêm service account Firebase để server cấp token.
- Key YouTube Data API vẫn gọi thẳng từ trình duyệt.

## 6. Chạy test
`npm test` (không cần mạng).
