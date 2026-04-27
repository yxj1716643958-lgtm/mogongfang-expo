#!/bin/bash
# 部署环境变量到阿里云ECS

echo "========================================"
echo "  部署环境变量到服务器"
echo "========================================"
echo ""

SERVER="root@101.200.126.62"
REMOTE_DIR="/opt/mogongfang"

echo "正在上传 .env 文件到服务器..."
scp .env ${SERVER}:${REMOTE_DIR}/.env

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ .env 文件上传成功"
    echo ""
    echo "正在重启 ticket-service..."
    ssh ${SERVER} "cd ${REMOTE_DIR} && pm2 restart ticket-service && pm2 logs ticket-service --lines 20"
else
    echo ""
    echo "✗ 上传失败，请检查网络连接和SSH密钥配置"
    exit 1
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
