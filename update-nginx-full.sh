#!/bin/bash
# 完整的Nginx配置：支持前端(8080) + 后端API(3001/3002)

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
    ssl_protocols TLSv1.2 TLSv1.3;

    # 前端静态文件 (8080端口)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 认证服务API (3002端口)
    location /api/auth/ {
        proxy_pass http://localhost:3002/api/auth/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 票务服务API (3001端口)
    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
EOF

# 测试并重启Nginx
nginx -t && systemctl restart nginx

echo "✓ Nginx配置更新完成"
echo ""
echo "现在访问 https://101.200.126.62 即可使用完整系统"
