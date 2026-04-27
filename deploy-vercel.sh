#!/bin/bash

# 东北亚数字文创博览会 - Vercel 部署脚本

echo "=========================================="
echo "  东北亚数字文创博览会 - Vercel 部署"
echo "=========================================="
echo ""

# 检查是否安装了 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "请运行: npm install -g vercel"
    exit 1
fi

# 设置后端 API 地址（请修改为你的实际地址）
export API_BASE_URL="http://101.200.126.62:3001/api/v1"

echo "📝 部署配置:"
echo "  - 后端 API: $API_BASE_URL"
echo ""

# 临时备份文件
echo "📦 备份原始文件..."
mkdir -p .vercel_backup
cp index.html .vercel_backup/ 2>/dev/null || true
cp tickets.html .vercel_backup/ 2>/dev/null || true
cp my-tickets.html .vercel_backup/ 2>/dev/null || true
cp admin.html .vercel_backup/ 2>/dev/null || true
cp verify.html .vercel_backup/ 2>/dev/null || true
cp login.html .vercel_backup/ 2>/dev/null || true
cp register.html .vercel_backup/ 2>/dev/null || true
cp dashboard.html .vercel_backup/ 2>/dev/null || true
cp payment-result.html .vercel_backup/ 2>/dev/null || true

# 替换 API 地址为生产地址
echo "🔧 更新 API 配置..."

# 使用 sed 替换本地开发地址为生产地址
find . -maxdepth 1 -name "*.html" -type f -exec sed -i.bak \
  "s|window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'|true|g" {} \;

find . -maxdepth 1 -name "*.html" -type f -exec sed -i.bak \
  "s|'http://localhost:3001/api/v1'|'$API_BASE_URL'|g" {} \;

echo "🚀 开始部署到 Vercel..."
vercel --prod

# 部署完成后恢复原始文件（本地开发用）
echo ""
echo "📦 恢复本地开发配置..."
mv .vercel_backup/index.html index.html 2>/dev/null || true
mv .vercel_backup/tickets.html tickets.html 2>/dev/null || true
mv .vercel_backup/my-tickets.html my-tickets.html 2>/dev/null || true
mv .vercel_backup/admin.html admin.html 2>/dev/null || true
mv .vercel_backup/verify.html verify.html 2>/dev/null || true
mv .vercel_backup/login.html login.html 2>/dev/null || true
mv .vercel_backup/register.html register.html 2>/dev/null || true
mv .vercel_backup/dashboard.html dashboard.html 2>/dev/null || true
mv .vercel_backup/payment-result.html payment-result.html 2>/dev/null || true

# 清理备份文件
rm -rf .vercel_backup
find . -maxdepth 1 -name "*.html.bak" -delete

echo ""
echo "✅ 部署完成！"
echo ""
echo "📱 部署信息:"
vercel ls --scope "$VERCEL_ORG_ID" 2>/dev/null || echo "  请登录 Vercel 查看部署状态"
