@echo off
chcp 65001 >nul
title Chess TFT Online - Server & Database
cd /d "%~dp0"
echo ================================================================
echo   KHOI DONG SERVER: DAU TRUONG CO CHOP (CHESS TFT ONLINE)
echo ================================================================
echo.
if not exist "node_modules" (
    echo Dang cai dat thu vien Express va Socket.IO...
    call npm install
)
echo Dang mo trinh duyet tai http://localhost:3000 ...
start "" "http://localhost:3000"
echo.
echo Server dang chay! Hay giu cua so nay mo khi dang choi.
echo Tai khoan Admin mac dinh: admin / Mat khau: 123
echo ================================================================
node server.js
pause
