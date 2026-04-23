#!/bin/bash
# 更新Nginx配置以支持认证服务

echo "=========================================="
echo "   更新Nginx配置"
echo "=========================================="

cat > /etc/nginx/sites-available/mogongfang << 'EOF'
# HTTP重定向到HTTPS
server {
    listen 80;
    server_name 101.200.126.62;
    return 301 https://$server_name$request_uri;
}

# HTTPS主配置
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

    # 认证服务API (3002端口)
    location /api/auth/ {
        proxy_pass http://localhost:3002/api/auth/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 票务服务API (3001端口)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 健康检查端点
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

# 测试配置
echo "测试Nginx配置..."
nginx -t

# 重启Nginx
echo "重启Nginx..."
systemctl restart nginx

echo "✓ Nginx配置更新完成"
echo ""
echo "现在Nginx会代理:"
echo "  • /api/auth/* → 认证服务 (3002端口)"
echo "  • /api/* → 票务服务 (3001端口)"
