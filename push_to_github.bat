@echo off
echo ================================================
echo Đang đẩy toàn bộ mã nguồn SPY v3 lên GitHub...
echo ================================================
git add api/ test/ spy_v3_bundle.js trend_v2_bundle.js app.bundle.js index.html vercel.json .vercelignore package.json SETUP_AUTH.md
git commit -m "feat(auth): Firebase auth + phone linking, server-side token check, quota, payment hardening"
git push origin main
echo ================================================
echo Hoan tat! Kiem tra tren repo GitHub.
echo ================================================
pause
