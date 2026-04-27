#!/bin/bash
# ========================================
# 一键修复并部署完整系统
# ========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo "=========================================="
echo "   系统修复和部署"
echo "=========================================="

cd /opt/mogongfang

# 1. 拉取最新代码
echo ""
echo "步骤1: 更新代码"
echo "=========================================="
git pull origin main

# 2. 检查并安装依赖
echo ""
echo "步骤2: 检查依赖"
echo "=========================================="
if [ ! -d "node_modules" ]; then
    echo "安装依赖..."
    npm install
fi
print_success "依赖检查完成"

# 3. 初始化认证数据库
echo ""
echo "步骤3: 初始化认证数据库"
echo "=========================================="
if [ -f "init-auth-db.js" ]; then
    node init-auth-db.js
    print_success "认证数据库初始化完成"
else
    print_error "init-auth-db.js 文件不存在"
fi

# 4. 重启所有服务
echo ""
echo "步骤4: 重启服务"
echo "=========================================="

# 停止旧服务
pm2 stop ticket-service auth-service 2>/dev/null || true
pm2 delete ticket-service auth-service 2>/dev/null || true

# 启动票务服务
pm2 start ticket-server.js --name "ticket-service"
print_success "票务服务已启动"

# 启动认证服务
pm2 start auth-server.js --name "auth-service"
print_success "认证服务已启动"

# 保存配置
pm2 save
pm2 list

# 5. 更新Nginx配置
echo ""
echo "步骤5: 更新Nginx配置"
echo "=========================================="

cat > /etc/nginx/sites-available/mogongfang << 'EOF'
server {
    listen 80;
    server_name 101.200.126.62;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 101.200.126.62;

    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 认证服务 (3002端口)
    location /api/auth {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 票务服务 (3001端口)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3001/health;
    }
}
EOF

# 测试并重启Nginx
nginx -t
systemctl restart nginx
print_success "Nginx配置已更新"

# 6. 等待服务启动
echo ""
echo "步骤6: 等待服务启动"
echo "=========================================="
sleep 3

# 7. 测试服务
echo ""
echo "步骤7: 测试服务"
echo "=========================================="

echo "测试票务服务:"
if curl -s http://localhost:3001/health > /dev/null; then
    print_success "票务服务正常"
    curl -s http://localhost:3001/health | head -20
else
    print_error "票务服务异常"
    pm2 logs ticket-service --lines 10
fi

echo ""
echo "测试认证服务:"
if curl -s http://localhost:3002/health > /dev/null; then
    print_success "认证服务正常"
    curl -s http://localhost:3002/health | head -20
else
    print_error "认证服务异常"
    pm2 logs auth-service --lines 10
fi

# 8. 测试HTTPS访问
echo ""
echo "步骤8: 测试HTTPS访问"
echo "=========================================="

echo "测试票务API:"
curl -sk https://localhost/health | head -20

echo ""
echo "测试认证API:"
curl -sk https://localhost/api/auth/health | head -20

# 9. 开放防火墙端口
echo ""
echo "步骤9: 检查防火墙"
echo "=========================================="

if command -v ufw &> /dev/null; then
    ufw status | grep -E "80|443"
    print_success "防火墙状态已检查"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --list-ports
    print_success "防火墙状态已检查"
fi

echo ""
echo "=========================================="
echo "   部署完成!"
echo "=========================================="
echo ""
echo "服务访问地址:"
echo "  • HTTPS: https://101.200.126.62"
echo "  • 票务API: https://101.200.126.62/api/*"
echo "  • 认证API: https://101.200.126.62/api/auth/*"
echo ""
echo "常用命令:"
echo "  • 查看状态: pm2 status"
echo "  • 查看日志: pm2 logs"
echo "  • 重启服务: pm2 restart all"
echo ""
