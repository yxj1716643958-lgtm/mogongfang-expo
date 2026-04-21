# 汇付天下H5支付配置指南

## 已配置信息

✅ 商户号 (merchant_id): `6666000195047270`
✅ 系统ID (sys_id): `6666000195047270`
✅ 产品ID (product_id): `KAZX`

## 待配置项

需要从汇付商户平台获取以下信息：

### 1. RSA密钥对

汇付支付使用RSA签名验证机制，需要配置：

- **HUIFU_PRIVATE_KEY**: 商户RSA私钥
- **HUIFU_PUBLIC_KEY**: 汇付天下公钥

#### 获取方式：

1. 登录汇付商户平台
2. 进入「账户中心」→「API管理」
3. 下载或生成RSA密钥对
4. 将商户私钥粘贴到 `.env` 文件的 `HUIFU_PRIVATE_KEY`
5. 将汇付公钥粘贴到 `.env` 文件的 `HUIFU_PUBLIC_KEY`

#### 密钥格式：

支持两种格式：

**格式1：PEM格式（推荐）**
```bash
HUIFU_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----"

HUIFU_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...
-----END PUBLIC KEY-----"
```

**格式2：Base64编码**
```bash
HUIFU_PRIVATE_KEY="MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC..."
HUIFU_PUBLIC_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
```

### 2. 回调地址配置

#### 开发测试环境：
```bash
HUIFU_NOTIFY_URL=http://localhost:3001/api/v1/payments/huifu/notify
HUIFU_RETURN_URL=http://localhost:8080/payment-result.html
```

#### 生产环境：
```bash
# 需要配置HTTPS域名
HUIFU_NOTIFY_URL=https://your-domain.com/api/v1/payments/huifu/notify
HUIFU_RETURN_URL=https://your-domain.com/payment-result.html
```

**重要提示**：
- 生产环境的回调地址必须是HTTPS
- 需要在汇付商户平台配置回调地址白名单
- 端口号需要在8000-9005范围内

## 配置步骤

### 步骤1：获取RSA密钥

1. 登录汇付商户平台：https://mer.chinapay.com
2. 导航至：账户中心 → API管理 → 密钥管理
3. 下载密钥或生成新密钥对
4. 保存商户私钥和汇付公钥

### 步骤2：更新.env文件

```bash
# 复制示例配置
cp .env.ticket.example .env

# 编辑.env文件，填入以下内容：
HUIFU_MERCHANT_ID=6666000195047270
HUIFU_SYS_ID=6666000195047270
HUIFU_APP_ID=KAZX
HUIFU_PRIVATE_KEY=您的商户私钥
HUIFU_PUBLIC_KEY=汇付的公钥
```

### 步骤3：配置回调地址

在汇付商户平台配置异步通知地址：

1. 进入「商户管理」→「产品管理」
2. 找到「H5支付」产品
3. 配置异步通知地址：`https://your-domain.com/api/v1/payments/huifu/notify`
4. 配置同步跳转地址：`https://your-domain.com/payment-result.html`

### 步骤4：验证配置

启动服务后，检查配置是否正确：

```bash
npm run ticket-server
```

查看启动日志，确认：
```
✓ 汇付天下配置完整
```

如果看到以下警告，说明配置不完整：
```
✗ 汇付天下配置缺失: privateKey, publicKey
```

## 环境切换

### 生产环境
```bash
HUIFU_GATEWAY_URL=https://spin.cloudpnr.com
HUIFU_ENVIRONMENT=PRODUCTION
```

### 沙箱测试环境
```bash
HUIFU_GATEWAY_URL=https://hfgj.testpnr.com
HUIFU_ENVIRONMENT=SANDBOX
```

## 常见问题

### Q1: 签名验证失败
**A**: 检查以下几点：
- 私钥格式是否正确
- 公钥是否是从汇付平台下载的最新版本
- 密钥是否完整复制（没有遗漏字符）

### Q2: 回调地址无法接收通知
**A**: 确认：
- 生产环境使用HTTPS
- 端口号在8000-9005范围内
- 汇付商户平台已配置回调地址白名单
- 服务器防火墙允许外部访问

### Q3: 支付成功但未出票
**A**: 检查：
- 查看服务器日志，确认是否收到回调
- 检查数据库orders表，确认payment_status是否更新
- 验证金额是否匹配（订单金额 vs 回调金额）

## 技术支持

如遇到问题，请检查：
1. 服务器日志：`ticket-server.js` 运行输出
2. 数据库表：`orders`、`payment_records`、`tickets`
3. 汇付商户平台：交易查询和日志记录

## 汇付相关链接

- 汇付官网：https://www.huifu.com
- 商户平台：https://mer.chinapay.com
- 开发文档：https://spin.cloudpnr.com
- 技术支持：需通过商户平台提交工单
