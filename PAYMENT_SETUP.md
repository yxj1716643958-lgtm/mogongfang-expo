# 微信支付 H5 支付集成说明

## 📋 目录

1. [功能概述](#功能概述)
2. [所需参数](#所需参数)
3. [配置步骤](#配置步骤)
4. [运行服务](#运行服务)
5. [测试支付](#测试支付)
6. [常见问题](#常见问题)

---

## 功能概述

本系统实现了完整的微信支付 H5 支付功能：

- ✅ 点击"立即购票"调用后端接口
- ✅ 后端调用微信支付统一下单接口（H5支付）
- ✅ 返回 mweb_url 支付链接
- ✅ 前端跳转到微信支付页面
- ✅ 支付成功后回调更新订单状态

---

## 所需参数

### 1. 商户号 (WECHAT_MCHID)
- 获取方式：登录 [微信支付商户平台](https://pay.weixin.qq.com/) > 账户中心
- 格式：10位数字，如 `1234567890`

### 2. 应用ID (WECHAT_APPID)
- 获取方式：微信公众平台或开放平台
- 格式：以 `wx` 开头的字符串，如 `wx1234567890abcdef`

### 3. API证书序列号 (WECHAT_SERIAL_NO)
- 获取方式：商户平台 > 账户中心 > API安全 > 查看证书序列号
- 格式：40位十六进制字符串

### 4. APIv3密钥 (WECHAT_API_V3_KEY)
- 获取方式：商户平台 > 账户中心 > API安全 > 设置APIv3密钥
- 格式：32位字符串，由数字和大写字母组成

### 5. 商户API私钥 (apiclient_key.pem)
- 获取方式：商户平台 > 账户中心 > API安全 > 申请API证书
- 下载后解压得到 `apiclient_key.pem`

### 6. 商户API证书 (apiclient_cert.pem)
- 获取方式：同上，解压得到 `apiclient_cert.pem`

### 7. 支付回调地址 (WECHAT_NOTIFY_URL)
- 要求：必须是 HTTPS 协议，公网可访问
- 本地测试可使用内网穿透工具

---

## 配置步骤

### 步骤 1：安装依赖

```bash
npm install express dotenv
```

### 步骤 2：创建证书目录

```bash
mkdir certs
```

### 步骤 3：放置证书文件

将从微信商户平台下载的证书文件放入 `certs/` 目录：
- `apiclient_cert.pem` - API证书
- `apiclient_key.pem` - API私钥

### 步骤 4：配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入真实配置：

```env
SERVER_PORT=3000

WECHAT_MCHID=你的商户号
WECHAT_APPID=你的应用ID
WECHAT_SERIAL_NO=你的证书序列号
WECHAT_API_V3_KEY=你的APIv3密钥
WECHAT_PRIVATE_KEY_PATH=./certs/apiclient_key.pem
WECHAT_APICLIENT_CERT_PATH=./certs/apiclient_cert.pem

# 回调地址需要是HTTPS且公网可访问
WECHAT_NOTIFY_URL=https://your-domain.com/api/payment/notify
```

---

## 运行服务

### 启动支付服务器

```bash
node payment-server.js
```

### 启动前端服务器

```bash
node server.js
```

---

## 测试支付

### 1. 本地测试（使用内网穿透）

由于微信支付要求回调地址必须是 HTTPS 公网地址，本地测试可使用：

#### 方案 A：使用 ngrok

```bash
# 安装 ngrok
# 下载: https://ngrok.com/download

# 启动 ngrok
ngrok http 3000
```

将生成的 HTTPS 地址填入 `WECHAT_NOTIFY_URL`

#### 方案 B：使用 frp

```bash
# 配置 frp 客户端连接到你的服务器
```

### 2. 票种价格配置

| 票种ID | 票种名称 | 价格(元) | 价格(分) |
|--------|----------|----------|----------|
| STD-001 | 标准单日票 | ¥98.00 | 9800 |
| PRO-002 | 专业/创作者票 | ¥198.00 | 19800 |
| VIP-003 | 至尊VIP通行证 | ¥488.00 | 48800 |

### 3. 支付流程

1. 用户点击"立即购票"按钮
2. 前端调用 `/api/payment/create` 创建订单
3. 后端调用微信支付统一下单接口
4. 返回 `mweb_url` 支付链接
5. 前端跳转到微信支付页面
6. 用户完成支付
7. 微信支付回调 `/api/payment/notify`
8. 更新订单状态

---

## 常见问题

### Q1: 签名验证失败

**原因：**
- APIv3密钥配置错误
- 证书文件路径错误
- 证书序列号不匹配

**解决：**
- 检查 `.env` 文件配置
- 确认证书文件存在且路径正确
- 重新获取证书序列号

### Q2: 回调通知未收到

**原因：**
- 回调地址不是 HTTPS
- 回调地址不是公网可访问
- 服务器防火墙拦截

**解决：**
- 使用 HTTPS 协议
- 确保服务器可以公网访问
- 检查服务器防火墙配置

### Q3: 跳转支付页面后报错

**原因：**
- 应用ID与商户号不匹配
- H5支付场景信息配置错误
- 支付域名未在商户平台配置

**解决：**
- 检查商户号和应用ID的对应关系
- 在商户平台配置支付域名
- 确认场景信息中的 `h5_info` 配置正确

### Q4: 本地开发如何测试

**方案：**
1. 使用微信支付沙箱环境
2. 使用内网穿透工具（ngrok、frp等）
3. 部署到测试服务器进行测试

---

## API 接口说明

### 1. 创建支付订单

**请求：**
```http
POST /api/payment/create
Content-Type: application/json

{
  "ticketId": "STD-001",
  "ticketName": "标准单日票",
  "ticketPrice": 9800,
  "userInfo": {}
}
```

**响应：**
```json
{
  "code": "SUCCESS",
  "message": "订单创建成功",
  "data": {
    "orderNo": "NE20240328123456789",
    "ticketName": "标准单日票",
    "price": 9800,
    "mwebUrl": "https://wx.tenorpay.com/..."
  }
}
```

### 2. 查询订单状态

**请求：**
```http
GET /api/payment/query/:orderNo
```

**响应：**
```json
{
  "code": "SUCCESS",
  "data": {
    "orderNo": "NE20240328123456789",
    "ticketName": "标准单日票",
    "price": 9800,
    "status": "PAID",
    "paidAt": "2024-03-28T12:34:56.789Z"
  }
}
```

### 3. 支付结果通知

**请求：** 由微信支付服务器发起

```http
POST /api/payment/notify
```

---

## 联系支持

如有问题，请联系技术支持或查阅 [微信支付开发文档](https://pay.weixin.qq.com/wiki/doc/apiv3/index.shtml)
