@echo off
REM ==========================================
REM   部署服务器CORS配置更新
REM ==========================================

echo.
echo ==========================================
echo   部署服务器CORS配置更新
echo ==========================================
echo.

REM 检查服务器连接
ping -n 1 101.200.126.62 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 无法连接到服务器
    pause
    exit /b 1
)

REM 上传文件到服务器
echo 📤 上传 ticket-server.js 到服务器...
scp -P 22 ticket-server.js root@101.200.126.62:/root/

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 上传失败
    pause
    exit /b 1
)

echo.
echo 🔄 重启服务器...
ssh -p 22 root@101.200.126.62 "cd /root && pm2 restart ticket-server"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 重启失败
    pause
    exit /b 1
)

echo.
echo ✅ 服务器CORS配置更新完成！
echo.
echo 已添加域名: www.uka-hc.com, uka-hc.com
pause
