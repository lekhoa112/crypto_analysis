@echo off
cd /d C:\xampp\htdocs\crypto_analysis

if not exist index.html (
  echo Khong tim thay index.html trong C:\xampp\htdocs\crypto_analysis
  pause
  exit /b 1
)

start "" "%cd%\index.html"
