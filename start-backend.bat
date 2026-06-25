@echo off
cd /d C:\xampp\htdocs\crypto_analysis\backend

if not exist .venv\Scripts\python.exe (
  echo Khong tim thay backend\.venv\Scripts\python.exe
  echo Hay cai dependency backend truoc khi chay.
  pause
  exit /b 1
)

echo Dang chay Crypto Analysis backend tai:
echo http://127.0.0.1:8000/
echo.
echo Giu cua so nay dang mo. Nhan Ctrl+C de tat server.
echo.
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
pause
