#!/bin/bash
# ========================================
# 阿里云ECS HTTPS配置脚本
# 使用Let's Encrypt免费SSL证书
# ========================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

echo "=========================================="
echo "   阿里云ECS HTTPS配置"
echo "=========================================="
echo ""

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    print_error "请使用root权限运行此脚本"
    echo "使用命令: sudo bash setup-https.sh"
    exit 1
fi

# 步骤1: 安装Nginx
echo ""
echo "=========================================="
echo "步骤1: 安装Nginx"
echo "=========================================="

if command -v nginx &> /dev/null; then
    print_success "Nginx已安装"
    nginx -v
else
    echo "正在安装Nginx..."
    apt update
    apt install -y nginx
    print_success "Nginx安装完成"
fi

# 步骤2: 配置域名（如果没有域名，使用IP）
echo ""
echo "=========================================="
echo "步骤2: 配置域名"
echo "=========================================="

echo "请选择配置方式:"
echo "1) 使用域名 (需要域名已解析到服务器IP)"
echo "2) 使用IP地址 (自签名证书，浏览器会警告)"
read -p "请选择 [1/2]: " domain_choice

if [ "$domain_choice" = "1" ]; then
    read -p "请输入您的域名 (例如: example.com): " DOMAIN
    SERVER_NAME="$DOMAIN"
    SSL_TYPE="letsencrypt"
else
    SERVER_NAME="101.200.126.62"
    SSL_TYPE="selfsigned"
    print_warning "使用自签名证书，浏览器会显示安全警告"
fi

# 步骤3: 安装SSL证书
echo ""
echo "=========================================="
echo "步骤3: 配置SSL证书"
echo "=========================================="

if [ "$SSL_TYPE" = "letsencrypt" ]; then
    # 安装Certbot
    if ! command -v certbot &> /dev/null; then
        echo "正在安装Certbot..."
        apt install -y certbot python3-certbot-nginx
        print_success "Certbot安装完成"
    fi

    # 获取证书
    echo "正在获取Let's Encrypt证书..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
        print_error "证书获取失败"
        echo "可能原因:"
        echo "1. 域名未正确解析到服务器IP"
        echo "2. 80端口被其他程序占用"
        echo "3. 防火墙未开放80/443端口"
        exit 1
    }
    print_success "SSL证书配置完成"

    # 配置自动续期
    (crontab -l 2>/dev/null; echo "0 12 * * * certbot renew --quiet") | crontab -
    print_success "证书自动续期已配置"

else
    # 生成自签名证书
    print_warning "生成自签名SSL证书..."
    mkdir -p /etc/nginx/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -subj "/C=CN/ST=Beijing/L=Beijing/O=Expo/CN=$SERVER_NAME"
    print_success "自签名证书生成完成"
fi

# 步骤4: 配置Nginx反向代理
echo ""
echo "=========================================="
echo "步骤4: 配置Nginx反向代理"
echo "=========================================="

cat > /etc/nginx/sites-available/mogongfang << 'EOF'
# 后端API服务器配置
server {
    listen 80;
    server_name 101.200.126.62;

    # 重定向HTTP到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name 101.200.126.62;

    # SSL证书配置
    ssl_certificate /etc/nginx/ssl/nginx.crt;
    ssl_certificate_key /etc/nginx/ssl/nginx.key;

    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/mogongfang_access.log;
    error_log /var/log/nginx/mogongfang_error.log;

    # 反向代理到Node.js服务
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;

        # 代理头部
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # 缓存控制
        proxy_cache_bypass $http_upgrade;
    }

    # 健康检查端点（无需认证）
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

if [ "$SSL_TYPE" = "letsencrypt" ]; then
    # 更新配置使用Let's Encrypt证书
    sed -i "s|101.200.126.62|$DOMAIN|g" /etc/nginx/sites-available/mogongfang
    sed -i "s|/etc/nginx/ssl/nginx.crt|/etc/letsencrypt/live/$DOMAIN/fullchain.pem|g" /etc/nginx/sites-available/mogongfang
    sed -i "s|/etc/nginx/ssl/nginx.key|/etc/letsencrypt/live/$DOMAIN/privkey.pem|g" /etc/nginx/sites-available/mogongfang
fi

# 启用站点配置
ln -sf /etc/nginx/sites-available/mogongfang /etc/nginx/sites-enabled/

# 删除默认配置
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx
systemctl enable nginx

print_success "Nginx配置完成"

# 步骤5: 配置防火墙
echo ""
echo "=========================================="
echo "步骤5: 配置防火墙"
echo "=========================================="

if command -v ufw &> /dev/null; then
    echo "配置UFW防火墙..."
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    print_success "防火墙配置完成"
elif command -v firewall-cmd &> /dev/null; then
    echo "配置firewalld防火墙..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    print_success "防火墙配置完成"
else
    print_warning "未检测到防火墙，请手动开放80和443端口"
fi

# 步骤6: 更新前端配置
echo ""
echo "=========================================="
echo "步骤6: 更新前端API地址"
echo "=========================================="

if [ "$SSL_TYPE" = "letsencrypt" ]; then
    NEW_API_URL="https://$DOMAIN/api/v1"
    print_success "前端API地址应更新为: $NEW_API_URL"
else
    NEW_API_URL="https://101.200.126.62/api/v1"
    print_success "前端API地址应更新为: $NEW_API_URL"
fi

# 步骤7: 测试HTTPS
echo ""
echo "=========================================="
echo "步骤7: 测试HTTPS"
echo "=========================================="

sleep 2

echo "正在测试HTTPS连接..."
if curl -skf https://$SERVER_NAME/health > /dev/null; then
    print_success "HTTPS连接测试成功!"
else
    print_error "HTTPS连接测试失败"
fi

echo ""
echo "=========================================="
echo "   HTTPS配置完成!"
echo "=========================================="
echo ""
echo "服务信息:"
echo "  • HTTPS地址: https://$SERVER_NAME"
echo "  • API地址: $NEW_API_URL"
echo "  • 健康检查: https://$SERVER_NAME/health"
echo ""
echo "下一步:"
echo "  1. 更新前端HTML文件中的API地址"
echo "  2. 提交代码到GitHub"
echo "  3. 等待Vercel自动部署"
echo ""
echo "常用命令:"
echo "  • 查看Nginx日志: tail -f /var/log/nginx/mogongfang_error.log"
echo "  • 重启Nginx: systemctl restart nginx"
echo "  • 查看证书: certbot certificates"
echo ""
