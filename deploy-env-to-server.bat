@echo off
chcp 65001 >nul
echo ========================================
echo   上传环境配置到阿里云ECS
echo ========================================
echo.

echo 正在上传 .env 文件到服务器...
echo.

REM 使用pscp上传文件
pscp -P 22 -pw zh12345678Q .env root@101.200.126.62:/opt/mogongfang/.env

if %errorlevel% equ 0 (
    echo.
    echo ✓ .env 文件上传成功
    echo.
    echo 正在重启 ticket-service...
    echo.
    ssh -p 22 -pw zh12345678Q root@101.200.126.62 "cd /opt/mogongfang && pm2 restart ticket-service && pm2 logs ticket-service --lines 20 --nostream"
) else (
    echo.
    echo ✗ 上传失败
    echo.
    echo 请确保已安装 PuTTY 并配置好 SSH 密钥
    echo 或者手动执行以下步骤：
    echo.
    echo 1. 下载 PuTTY (包含pscp): https://www.putty.org/
    echo 2. 手动上传: pscp -pw zh12345678Q .env root@101.200.126.62:/opt/mogongfang/.env
    echo 3. 重启服务: ssh root@101.200.126.62 "pm2 restart ticket-service"
    echo.
)

echo.
pause
