@echo off
REM ==========================================
REM   东北亚数字文创博览会 - Vercel 部署
REM ==========================================

echo.
echo ==========================================
echo   东北亚数字文创博览会 - Vercel 部署
echo ==========================================
echo.

REM 检查 Vercel CLI
where vercel >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Vercel CLI 未安装
    echo 请运行: npm install -g vercel
    pause
    exit /b 1
)

REM 设置后端 API 地址
REM 注意：需要配置服务器nginx反向代理支持HTTPS，或接受混合内容警告
set API_BASE_URL=http://101.200.126.62:3001/api/v1

echo 📝 部署配置:
echo   - 后端 API: %API_BASE_URL%
echo.

REM 临时备份文件
echo 📦 备份原始文件...
if not exist ".vercel_backup" mkdir ".vercel_backup"
if exist "index.html" copy /Y "index.html" ".vercel_backup\" >nul
if exist "tickets.html" copy /Y "tickets.html" ".vercel_backup\" >nul
if exist "my-tickets.html" copy /Y "my-tickets.html" ".vercel_backup\" >nul
if exist "admin.html" copy /Y "admin.html" ".vercel_backup\" >nul
if exist "verify.html" copy /Y "verify.html" ".vercel_backup\" >nul
if exist "login.html" copy /Y "login.html" ".vercel_backup\" >nul
if exist "register.html" copy /Y "register.html" ".vercel_backup\" >nul
if exist "dashboard.html" copy /Y "dashboard.html" ".vercel_backup\" >nul
if exist "payment-result.html" copy /Y "payment-result.html" ".vercel_backup\" >nul

REM 替换 API 地址
echo 🔧 更新 API 配置...

REM PowerShell 脚本用于替换文件内容
powershell -Command ^
  "$files = @('index.html', 'tickets.html', 'my-tickets.html', 'admin.html', 'verify.html', 'login.html', 'register.html', 'dashboard.html', 'payment-result.html'); " + ^
  "foreach ($file in $files) { " + ^
  "  if (Test-Path $file) { " + ^
  "    $content = Get-Content $file -Raw -Encoding UTF8; " + ^
  "    $content = $content -replace \"window\.location\.hostname === 'localhost' \|\| window\.location\.hostname === '127\.0\.0\.1'\", 'true'; " + ^
  "    $content = $content -replace \"'http://localhost:3001/api/v1'\", '%API_BASE_URL%'; " + ^
  "    Set-Content $file -Value $content -NoNewline -Encoding UTF8; " + ^
  "  } " + ^
  "}"

echo.
echo 🚀 开始部署到 Vercel...
vercel --prod

REM 恢复原始文件
echo.
echo 📦 恢复本地开发配置...
if exist ".vercel_backup\index.html" copy /Y ".vercel_backup\index.html" "index.html" >nul
if exist ".vercel_backup\tickets.html" copy /Y ".vercel_backup\tickets.html" "tickets.html" >nul
if exist ".vercel_backup\my-tickets.html" copy /Y ".vercel_backup\my-tickets.html" "my-tickets.html" >nul
if exist ".vercel_backup\admin.html" copy /Y ".vercel_backup\admin.html" "admin.html" >nul
if exist ".vercel_backup\verify.html" copy /Y ".vercel_backup\verify.html" "verify.html" >nul
if exist ".vercel_backup\login.html" copy /Y ".vercel_backup\login.html" "login.html" >nul
if exist ".vercel_backup\register.html" copy /Y ".vercel_backup\register.html" "register.html" >nul
if exist ".vercel_backup\dashboard.html" copy /Y ".vercel_backup\dashboard.html" "dashboard.html" >nul
if exist ".vercel_backup\payment-result.html" copy /Y ".vercel_backup\payment-result.html" "payment-result.html" >nul

REM 清理备份
rmdir /S /Q ".vercel_backup" 2>nul
del /Q "*.html.bak" 2>nul

echo.
echo ✅ 部署完成！
echo.
echo 请访问 Vercel 查看部署状态
pause
