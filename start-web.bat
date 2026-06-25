@echo off
cd /d C:\xampp\htdocs\crypto_analysis

if not exist C:\xampp\php\php.exe (
  echo Khong tim thay C:\xampp\php\php.exe
  echo Hay mo truc tiep file index.html hoac cai XAMPP dung duong dan C:\xampp
  pause
  exit /b 1
)

echo Dang chay Crypto AI Radar tai:
echo http://127.0.0.1:8010/
echo.
echo Giu cua so nay dang mo. Nhan Ctrl+C de tat server.
echo.
C:\xampp\php\php.exe -S 127.0.0.1:8010 -t C:\xampp\htdocs\crypto_analysis
pause
