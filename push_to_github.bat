@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==== Xoa file cu khong con dung ====
for %%F in (app.bundle.js bg_blue_4k.jpg bg_trend.jpg bg_trend.png SETUP_AUTH.md .github\workflows\daily_scan.js) do if exist "%%F" git rm -q --ignore-unmatch "%%F"
echo ==== Day len GitHub ====
git add -A
git commit -m "YouTrend v4: web rieng admin, gop 6 muc, giao dien toi gian mau nhe"
git push origin main
echo.
echo Xong! Vercel se tu deploy trong khoang 1 phut.
pause
