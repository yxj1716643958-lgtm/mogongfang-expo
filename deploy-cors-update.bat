@echo off
REM ==========================================
REM   部署服务器CORS配置更新 (Windows版)
REM ==========================================

set SERVER=root@101.200.126.62
set APP_DIR=/root

echo.
echo ==========================================
echo   部署服务器CORS配置更新
echo ==========================================
echo.

REM 检查必要工具
where scp >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 需要安装SSH客户端
    echo 请安装OpenSSH或Git Bash
    pause
    exit /b 1
)

REM 测试连接
echo 测试服务器连接...
ping -n 1 101.200.126.62 >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ 无法连接到服务器
    pause
    exit /b 1
)

echo ✅ 服务器连接正常
echo.

REM 上传文件
echo 📤 上传 ticket-server.js...
scp ticket-server.js %SERVER%:%APP_DIR%/

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 上传失败
    pause
    exit /b 1
)

echo ✅ 上传成功
echo.

REM 重启服务
echo 🔄 重启 ticket-server...
ssh %SERVER% "cd %APP_DIR% && pm2 restart ticket-server"

if %ERRORLEVEL% NEQ 0 (
    echo ❌ 重启失败
    pause
    exit /b 1
)

echo ✅ 重启成功
echo.

echo ==========================================
echo   ✅ 服务器CORS配置更新完成！
echo ==========================================
echo.
echo 已添加域名到CORS白名单:
echo   - https://www.uka-hc.com
echo   - https://uka-hc.com
echo.
pause
