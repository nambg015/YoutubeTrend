@echo off
echo ================================================
echo Đang đẩy toàn bộ mã nguồn SPY v3 lên GitHub...
echo ================================================
git add api/ test/ spy_v3_bundle.js app.bundle.js index.html
git commit -m "feat(spy-v3): redesign studio detective with saturation bisection and log-likelihood ranking"
git push origin main
echo ================================================
echo Hoan tat! Kiem tra tren repo GitHub.
echo ================================================
pause
