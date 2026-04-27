@echo off
REM ==========================================
REM   通过Git部署到Vercel
REM ==========================================

echo.
echo ==========================================
echo   通过Git部署到Vercel
echo ==========================================
echo.

REM 检查Git状态
echo 检查Git状态...
git status --short
echo.

REM 添加所有更改
echo 📝 添加文件到Git...
git add .

echo.
echo 📝 提交更改...
git commit -m "添加API代理解决混合内容问题

- 新增 api/proxy.js Vercel serverless function
- 更新前端API配置使用 /api/proxy
- 修复 mixed content 错误
- 更新 vercel.json 配置
"

echo.
echo 📤 推送到GitHub...
git push

echo.
echo ==========================================
echo   ✅ 代码已推送到Git仓库！
echo ==========================================
echo.
echo Vercel会自动部署，请稍等几分钟...
echo.
echo 访问以下链接查看部署状态:
echo   - Vercel Dashboard: https://vercel.com/uka111/mogongfang-expo
echo   - 网站: https://www.uka-hc.com
echo.
pause
