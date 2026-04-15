@echo off
chcp 65001 >nul
title 短视频数据看板 - 服务启动器
echo.
echo ╔══════════════════════════════════════════╗
echo ║   短视频数据看板  正在启动...            ║
echo ╚══════════════════════════════════════════╝
echo.
cd /d "%~dp0"
node server.js
pause
