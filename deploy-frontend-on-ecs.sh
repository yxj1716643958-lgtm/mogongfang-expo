#!/bin/bash
# 在阿里云ECS上部署前端服务
# 这样前后端都在同一个服务器上，不依赖Vercel

echo "=========================================="
echo "   在阿里云ECS上部署前端服务"
echo "=========================================="

cd /opt/mogongfang

# 检查server.js是否存在
if [ ! -f "server.js" ]; then
    echo "错误: server.js不存在，请确认项目已正确部署"
    exit 1
fi

# 停止旧的前端服务
echo "停止旧的前端服务进程..."
pm2 delete frontend 2>/dev/null || echo "没有旧的frontend进程"
pkill -f "node server.js" 2>/dev/null || true

# 启动前端服务（8080端口）
echo "启动前端服务..."
pm2 start server.js --name "frontend" -- --port 8080

# 或者直接使用nohup启动
# nohup node server.js &

# 保存PM2配置
pm2 save

# 等待服务启动
sleep 3

# 测试前端服务
echo ""
echo "=========================================="
echo "   测试前端服务"
echo "=========================================="

if curl -s http://localhost:8080/ > /dev/null; then
    echo "✓ 前端服务启动成功"
    echo ""
    echo "前端服务: http://101.200.126.62:8080"
else
    echo "✗ 前端服务启动失败"
    echo ""
    echo "查看日志:"
    pm2 logs frontend --lines 20
fi

echo ""
echo "=========================================="
echo "   所有服务状态"
echo "=========================================="
pm2 status

echo ""
echo "服务访问地址:"
echo "  • 前端网站: http://101.200.126.62:8080"
echo "  • 后端API: https://101.200.126.62/api/*"
echo ""
echo "常用命令:"
echo "  • 查看状态: pm2 status"
echo "  • 查看日志: pm2 logs frontend"
echo "  • 重启前端: pm2 restart frontend"
echo ""
