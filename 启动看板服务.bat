@echo off
chcp 65001 >nul
title 短视频数据看板 - 服务启动器
echo.
echo ==========================================
echo    短视频数据看板  正在启动...
echo ==========================================
echo.
cd /d "%~dp0"
echo 正在启动 Node.js 服务...
node server.js
if %errorlevel% neq 0 (
    echo.
    echo [错误] 服务启动失败，请检查是否安装了 Node.js 以及依赖库。
    pause
)
pause
