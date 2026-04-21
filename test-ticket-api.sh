#!/bin/bash

# 票务系统API测试脚本

echo "==================================="
echo "票务系统API测试"
echo "==================================="

API_BASE="http://localhost:3001/api/v1"

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_api() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4

    echo -e "\n${YELLOW}测试: ${name}${NC}"
    echo "请求: ${method} ${API_BASE}${endpoint}"

    if [ -z "$data" ]; then
        response=$(curl -s -X ${method} "${API_BASE}${endpoint}")
    else
        response=$(curl -s -X ${method} "${API_BASE}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi

    echo "响应: ${response}"

    # 检查是否成功
    if echo "$response" | grep -q '"code":"SUCCESS"'; then
        echo -e "${GREEN}✓ 测试通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 测试失败${NC}"
        return 1
    fi
}

# 1. 健康检查
test_api "健康检查" "GET" "/health"

# 2. 创建早鸟票订单
echo -e "\n${YELLOW}===================================${NC}"
echo -e "${YELLOW}创建早鸟票订单${NC}"
echo -e "${YELLOW}===================================${NC}"

order_response=$(curl -s -X POST "${API_BASE}/orders" \
    -H "Content-Type: application/json" \
    -d '{
        "ticketTypeCode": "EARLY_BIRD",
        "quantity": 1,
        "userInfo": {
            "name": "测试用户",
            "phone": "13800138000",
            "email": "test@example.com"
        }
    }')

echo "$order_response"

# 提取订单号
if echo "$order_response" | grep -q '"code":"SUCCESS"'; then
    order_no=$(echo "$order_response" | grep -o '"orderNo":"[^"]*"' | cut -d'"' -f4)
    echo -e "\n${GREEN}订单创建成功，订单号: ${order_no}${NC}"

    # 3. 查询订单
    test_api "查询订单" "GET" "/orders/${order_no}"

    # 4. 创建支付
    payment_response=$(curl -s -X POST "${API_BASE}/payments/create" \
        -H "Content-Type: application/json" \
        -d "{
            \"orderNo\": \"${order_no}\",
            \"paymentMethod\": \"HUIFU\"
        }")

    echo -e "\n${YELLOW}创建支付响应: ${NC}${payment_response}"

    # 5. 模拟支付回调
    test_api "支付回调" "POST" "/payments/notify" "{
        \"orderNo\": \"${order_no}\",
        \"status\": \"success\",
        \"amount\": 39.90
    }"

    # 6. 查询支付状态
    sleep 1  # 等待回调处理
    test_api "查询支付状态" "GET" "/payments/${order_no}/status"

    # 7. 查询我的票券
    test_api "我的票券" "GET" "/tickets/my-tickets?phone=13800138000"

else
    echo -e "${RED}订单创建失败${NC}"
    exit 1
fi

# 8. 提交邀请函申请
echo -e "\n${YELLOW}===================================${NC}"
echo -e "${YELLOW}提交邀请函申请${NC}"
echo -e "${YELLOW}===================================${NC}"

invitation_response=$(curl -s -X POST "${API_BASE}/invitations/apply" \
    -H "Content-Type: application/json" \
    -d '{
        "ticketTypeId": 3,
        "applicantInfo": {
            "name": "专业观众",
            "phone": "13900139000",
            "email": "professional@example.com",
            "company": "测试公司",
            "position": "产品经理",
            "reason": "行业专业交流"
        }
    }')

echo "$invitation_response"

# 9. 查询我的申请
test_api "我的申请" "GET" "/invitations/my-applications?phone=13900139000"

# 10. 查询核销记录
test_api "核销记录" "GET" "/verify/records"

echo -e "\n${GREEN}===================================${NC}"
echo -e "${GREEN}测试完成！${NC}"
echo -e "${GREEN}===================================${NC}"
echo -e "\n提示："
echo "1. 请确保 MySQL 数据库已启动"
echo "2. 请确保已执行 SQL/ticket-schema.sql 初始化数据库"
echo "3. 请确保 ticket-server.js 正在运行 (npm run ticket-server)"
echo "4. 访问 http://localhost:8080/tickets.html 测试前端功能"
echo "5. 访问 http://localhost:8080/my-tickets.html 查看电子票"
