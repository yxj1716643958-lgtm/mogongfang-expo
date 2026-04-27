#!/bin/bash
# 部署服务器CORS配置更新

SERVER="root@101.200.126.62"
APP_DIR="/root"

echo "=========================================="
echo "  部署服务器CORS配置更新"
echo "=========================================="
echo ""

# 测试连接
echo "测试服务器连接..."
ping -c 1 101.200.126.62 > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ 无法连接到服务器"
    exit 1
fi

echo "✅ 服务器连接正常"
echo ""

# 上传文件
echo "📤 上传 ticket-server.js..."
scp ticket-server.js ${SERVER}:${APP_DIR}/

if [ $? -ne 0 ]; then
    echo "❌ 上传失败"
    exit 1
fi

echo "✅ 上传成功"
echo ""

# 重启服务
echo "🔄 重启 ticket-server..."
ssh ${SERVER} "cd ${APP_DIR} && pm2 restart ticket-server"

if [ $? -ne 0 ]; then
    echo "❌ 重启失败"
    exit 1
fi

echo "✅ 重启成功"
echo ""

echo "=========================================="
echo "  ✅ 服务器CORS配置更新完成！"
echo "=========================================="
echo ""
echo "已添加域名到CORS白名单:"
echo "  - https://www.uka-hc.com"
echo "  - https://uka-hc.com"
echo ""
