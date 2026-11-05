@echo off
chcp 65001 >nul
title เกมออฟฟิศ - เปิดห้องให้เล่นผ่านลิงก์
where node >nul 2>nul
if errorlevel 1 (
  echo ยังไม่ได้ติดตั้ง Node.js  ดาวน์โหลดที่ https://nodejs.org แล้วลองใหม่
  pause
  exit /b
)
if not exist node_modules ( call npm install )
if not exist cloudflared.exe (
  echo กำลังโหลดตัวสร้างลิงก์ (ครั้งแรกครั้งเดียว) ...
  powershell -NoProfile -Command "Invoke-WebRequest -Uri https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe -OutFile cloudflared.exe"
)
if not exist cloudflared.exe (
  echo โหลดไม่สำเร็จ ลองเช็กอินเทอร์เน็ตแล้วเปิดใหม่
  pause
  exit /b
)
start "Office Games Server" /min cmd /c "node server.js"
timeout /t 2 >nul
echo.
echo ================================================================
echo  รอสักครู่ จะมีลิงก์ขึ้นแบบ  https://xxxx.trycloudflare.com
echo  ก๊อปลิงก์นั้นส่งให้เพื่อน/ครอบครัวได้เลย (ไม่ต้องลงอะไร)
echo  ตัวเองก็เปิดเล่นผ่านลิงก์เดียวกันนั้น
echo  ห้ามปิดหน้าต่างนี้ตอนเล่น  ปิด = ลิงก์หยุดใช้ได้
echo ================================================================
echo.
cloudflared.exe tunnel --url http://localhost:3000
pause
