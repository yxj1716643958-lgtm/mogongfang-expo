#!/bin/bash
# 在阿里云ECS上启动认证服务

echo "=========================================="
echo "   启动认证服务"
echo "=========================================="

cd /opt/mogongfang

# 检查auth-server.js是否存在
if [ ! -f "auth-server.js" ]; then
    echo "错误: auth-server.js 文件不存在"
    echo "请确认项目已正确部署"
    exit 1
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi

# 检查controllers目录
if [ ! -d "controllers" ]; then
    echo "警告: controllers目录不存在"
fi

# 检查routes目录
if [ ! -d "routes" ]; then
    echo "警告: routes目录不存在"
fi

# 停止旧的认证服务进程
echo "停止旧的认证服务进程..."
pm2 delete auth-service 2>/dev/null || echo "没有旧的auth-service进程"

# 启动认证服务
echo "启动认证服务..."
pm2 start auth-server.js --name "auth-service"

# 保存PM2进程列表
pm2 save

# 检查服务状态
echo ""
echo "=========================================="
echo "   服务状态检查"
echo "=========================================="

sleep 2

# 检查认证服务
echo "检查认证服务 (端口3002):"
if curl -s http://localhost:3002/health > /dev/null; then
    echo "✓ 认证服务运行正常"
    curl -s http://localhost:3002/health | head -20
else
    echo "✗ 认证服务启动失败"
    echo ""
    echo "查看日志:"
    pm2 logs auth-service --lines 20
fi

echo ""
echo "=========================================="
echo "   所有服务状态"
echo "=========================================="
pm2 status

echo ""
echo "服务信息:"
echo "  • 票务服务: http://101.200.126.62:3001"
echo "  • 认证服务: http://101.200.126.62:3002"
echo "  • HTTPS入口: https://101.200.126.62"
echo ""
echo "常用命令:"
echo "  • 查看状态: pm2 status"
echo "  • 查看日志: pm2 logs auth-service"
echo "  • 重启服务: pm2 restart auth-service"
echo "  • 停止服务: pm2 stop auth-service"
echo ""
