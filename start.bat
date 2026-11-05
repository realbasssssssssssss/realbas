@echo off
chcp 65001 >nul
title UNO FLIP Server
where node >nul 2>nul
if errorlevel 1 (
  echo ยังไม่ได้ติดตั้ง Node.js  ดาวน์โหลดที่ https://nodejs.org แล้วลองใหม่
  pause
  exit /b
)
if not exist node_modules ( call npm install )
node server.js
pause
