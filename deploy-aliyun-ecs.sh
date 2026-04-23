#!/bin/bash
# ========================================
# 阿里云ECS一键部署脚本
# 项目：东北亚数字文创博览会票务系统
# ========================================

set -e  # 遇到错误立即退出

echo "=========================================="
echo "   阿里云ECS部署脚本开始执行"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 打印成功消息
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# 打印警告消息
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# 打印错误消息
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# ========================================
# 第一步：检查并安装PM2
# ========================================
echo ""
echo "=========================================="
echo "第一步：检查并安装PM2"
echo "=========================================="

if ! command -v pm2 &> /dev/null; then
    echo "PM2未安装，正在安装..."
    npm install -g pm2
    print_success "PM2安装完成"
else
    print_success "PM2已安装"
fi

pm2 --version

# ========================================
# 第二步：进入项目目录
# ========================================
echo ""
echo "=========================================="
echo "第二步：进入项目目录"
echo "=========================================="

cd /opt/mogongfang
print_success "当前目录: $(pwd)"
echo "项目文件列表:"
ls -la

# ========================================
# 第三步：检查.env文件
# ========================================
echo ""
echo "=========================================="
echo "第三步：检查环境配置文件"
echo "=========================================="

if [ -f .env ]; then
    print_success ".env文件已存在"
    echo ".env文件内容（敏感信息已隐藏）:"
    grep -v "KEY\|SECRET\|PASSWORD" .env | head -20
else
    print_warning ".env文件不存在，正在创建..."
    cat > .env << 'EOF'
# ==================== 服务器配置 ====================
SERVER_PORT=3001
NODE_ENV=production

# ==================== 数据库配置 ====================
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ne_expo_ticket

# ==================== 二维码加密密钥 ====================
QR_SECRET_KEY=ne_expo_ticket_secret_key_2024_change_in_production

# ==================== 阿里云短信配置 ====================
ALIYUN_ACCESS_KEY_ID=你的阿里云AccessKeyId
ALIYUN_ACCESS_KEY_SECRET=你的阿里云AccessKeySecret
ALIYUN_SMS_SIGN_NAME=长春知行智研科技
ALIYUN_SMS_TEMPLATE_CODE=SMS_505920098

# ==================== 短信调试模式 ====================
SMS_DEBUG_MODE=false

# ==================== 汇付天下配置 ====================
# 商户号和系统ID
HUIFU_MERCHANT_ID=6666000195047270
HUIFU_SYS_ID=6666000195047270

# 产品ID（应用ID）
HUIFU_APP_ID=KAZX

# RSA密钥（请替换为你的真实密钥）
HUIFU_PRIVATE_KEY=你的商户私钥
HUIFU_MERCHANT_PUBLIC_KEY=你的商户公钥
HUIFU_PUBLIC_KEY=汇付公钥

# 汇付网关地址
HUIFU_GATEWAY_URL=https://spin.cloudpnr.com
HUIFU_ENVIRONMENT=PRODUCTION

# ==================== 汇付回调地址 ====================
# 支付回调地址
HUIFU_NOTIFY_URL=http://101.200.126.62:3001/api/v1/payments/huifu/notify
HUIFU_RETURN_URL=http://101.200.126.62:3001/payment-result.html

# ==================== 支付调试模式 ====================
PAYMENT_DEBUG_MODE=true
EOF
    print_success ".env文件已创建"
    print_warning "请编辑.env文件，填入真实的密钥信息"
fi

# ========================================
# 第四步：停止旧的PM2进程
# ========================================
echo ""
echo "=========================================="
echo "第四步：停止旧的服务进程"
echo "=========================================="

pm2 delete ticket-service 2>/dev/null || echo "没有旧的ticket-service进程"
pm2 delete auth-service 2>/dev/null || echo "没有旧的auth-service进程"
print_success "旧进程已清理"

# ========================================
# 第五步：使用PM2启动服务
# ========================================
echo ""
echo "=========================================="
echo "第五步：启动服务"
echo "=========================================="

pm2 start ticket-server.js --name "ticket-service"
print_success "票务服务已启动"

if [ -f auth-server.js ]; then
    pm2 start auth-server.js --name "auth-service"
    print_success "认证服务已启动"
fi

# ========================================
# 第六步：设置PM2开机自启
# ========================================
echo ""
echo "=========================================="
echo "第六步：设置开机自启"
echo "=========================================="

pm2 save
print_success "PM2进程列表已保存"

# 生成开机启动命令
echo ""
echo "请执行以下命令完成开机自启设置："
pm2 startup

# ========================================
# 第七步：查看服务状态
# ========================================
echo ""
echo "=========================================="
echo "第七步：服务运行状态"
echo "=========================================="

pm2 status

# ========================================
# 第八步：查看服务日志
# ========================================
echo ""
echo "=========================================="
echo "第八步：最近的服务日志"
echo "=========================================="

pm2 logs --lines 20 --nostream

# ========================================
# 第九步：测试健康检查接口
# ========================================
echo ""
echo "=========================================="
echo "第九步：测试健康检查接口"
echo "=========================================="

sleep 2
echo "正在请求 http://localhost:3001/health ..."
curl -s http://localhost:3001/health | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3001/health

# ========================================
# 第十步：显示服务信息
# ========================================
echo ""
echo "=========================================="
echo "部署完成！"
echo "=========================================="
echo ""
print_success "服务已成功部署并启动"
echo ""
echo "服务信息:"
echo "  • 项目路径: /opt/mogongfang"
echo "  • 服务端口: 3001"
echo "  • 本地访问: http://localhost:3001/health"
echo "  • 公网访问: http://101.200.126.62:3001/health"
echo ""
echo "常用命令:"
echo "  • 查看状态: pm2 status"
echo "  • 查看日志: pm2 logs ticket-service"
echo "  • 重启服务: pm2 restart ticket-service"
echo "  • 停止服务: pm2 stop ticket-service"
echo "  • 删除服务: pm2 delete ticket-service"
echo ""
echo "配置文件:"
echo "  • 环境变量: /opt/mogongfang/.env"
echo "  • 编辑命令: nano /opt/mogongfang/.env"
echo ""
echo "=========================================="
