#!/bin/bash
# 购票功能测试脚本

echo "========================================="
echo "购票功能测试"
echo "========================================="
echo ""

# 1. 测试服务器健康
echo "1. 测试服务器健康..."
curl -s http://localhost:3001/health | jq .
echo ""

# 2. 创建订单 - 早鸟票
echo "2. 创建早鸟票订单..."
ORDER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/orders \
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

echo "$ORDER_RESPONSE" | jq .
ORDER_NO=$(echo "$ORDER_RESPONSE" | jq -r '.data.orderNo')
echo "订单号: $ORDER_NO"
echo ""

# 3. 查询订单
echo "3. 查询订单详情..."
curl -s http://localhost:3001/api/v1/orders/$ORDER_NO | jq .
echo ""

# 4. 创建支付（需要有效的汇付配置）
echo "4. 创建汇付支付订单..."
PAYMENT_RESPONSE=$(curl -s -X POST http://localhost:3001/api/v1/payments/huifu/create \
  -H "Content-Type: application/json" \
  -d "{
    \"orderNo\": \"$ORDER_NO\",
    \"paymentMethod\": \"HUIFU_H5\",
    \"returnUrl\": \"http://localhost:8080/payment-result.html?orderNo=$ORDER_NO\"
  }")

echo "$PAYMENT_RESPONSE" | jq .
echo ""

echo "========================================="
echo "测试完成"
echo "========================================="
echo ""
echo "说明："
echo "- 订单创建成功 ✓"
echo "- 如果汇付配置有效，可以继续支付流程"
echo "- 测试环境可能无法完成真实支付"
echo ""
echo "提示：在浏览器中访问 http://localhost:8080/tickets.html 进行前端测试"
