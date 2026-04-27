@echo off
chcp 65001 >nul
echo ========================================
echo   上传环境配置到服务器
echo ========================================
echo.
echo 正在上传 .env 文件到服务器...
echo.

REM 使用pscp上传文件（需要PuTTY安装）
pscp .env root@101.200.126.62:/opt/mogongfang/.env

if %errorlevel% equ 0 (
    echo.
    echo ✓ .env 文件上传成功
    echo.
    echo 正在重启服务...
    echo.
    ssh root@101.200.126.62 "cd /opt/mogongfang && pm2 restart ticket-service && pm2 logs ticket-service --lines 20 --nostream"
) else (
    echo.
    echo ✗ 上传失败
    echo.
    echo 请确保已安装 PuTTY 并配置好 SSH 密钥
    echo 或者使用以下命令手动上传：
    echo   pscp .env root@101.200.126.62:/opt/mogongfang/.env
    echo.
)

echo.
pause
