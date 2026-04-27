@echo off
chcp 65001 >nul
echo ========================================
echo   一键部署到阿里云ECS
echo ========================================
echo.
echo 正在连接服务器...
echo.

echo 请确保已安装SSH客户端，按任意键继续...
pause >nul

echo.
echo 正在执行部署命令...
echo.

ssh root@101.200.126.62 "cd /opt/mogongfang && git pull origin main && node init-auth-db.js && pm2 restart ticket-service auth-service && pm2 save && cat > /etc/nginx/sites-available/mogongfang << 'EOF' && server { listen 80; return 301 https://$host$request_uri; } server { listen 443 ssl http2; ssl_certificate /etc/nginx/ssl/nginx.crt; ssl_certificate_key /etc/nginx/ssl/nginx.key; ssl_protocols TLSv1.2 TLSv1.3; location /api/auth { proxy_pass http://localhost:3002; proxy_set_header Host $host; } location /api { proxy_pass http://localhost:3001; proxy_set_header Host $host; } location /health { proxy_pass http://localhost:3001/health; } } EOF && nginx -t && systemctl restart nginx && pm2 status"

echo.
echo ========================================
echo   部署完成！
echo ========================================
echo.
echo 按任意键退出...
pause >nul
