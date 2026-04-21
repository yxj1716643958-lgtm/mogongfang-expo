# 手机号验证码登录系统 - 部署指南

## 系统概述

本系统提供完整的手机号验证码登录功能，支持：
- 发送短信验证码
- 验证码登录/自动注册
- 登录安全限制（频率、每日上限）
- 登录日志审计

## 一、数据库配置

### 1. 执行SQL建表语句

```bash
mysql -u root -p < SQL/auth-schema.sql
```

这将创建以下表：
- `users` - 用户表
- `sms_codes` - 短信验证码表
- `login_logs` - 登录日志表

### 2. 表结构说明

#### users 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 用户ID（主键） |
| mobile | VARCHAR(20) | 手机号（唯一） |
| nickname | VARCHAR(100) | 昵称 |
| avatar_url | VARCHAR(500) | 头像URL |
| status | ENUM | 用户状态：ACTIVE/DISABLED/DELETED |
| last_login_at | TIMESTAMP | 最后登录时间 |
| last_login_ip | VARCHAR(50) | 最后登录IP |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### sms_codes 表
| 字段 | 类型 | 说明 |
|------|------|------|
| id | BIGINT | 验证码ID（主键） |
| mobile | VARCHAR(20) | 手机号 |
| code | VARCHAR(10) | 验证码 |
| scene | VARCHAR(20) | 场景：login/register/reset_password |
| expired_at | TIMESTAMP | 过期时间（5分钟） |
| used_at | TIMESTAMP | 使用时间 |
| is_used | BOOLEAN | 是否已使用 |
| request_ip | VARCHAR(50) | 请求IP |
| request_ua | TEXT | 用户代理 |
| created_at | TIMESTAMP | 创建时间 |

## 二、阿里云短信配置

### 1. 开通阿里云短信服务

1. 登录 [阿里云控制台](https://console.aliyun.com/)
2. 开通短信服务：https://dysms.console.aliyun.com/
3. 申请短信签名（需要审核）
4. 申请短信模板（需要审核）

验证码模板示例：
```
您的验证码是${code}，5分钟内有效，请勿泄露。
```

### 2. 获取AccessKey

1. 访问：https://ram.console.aliyun.com/manage/ak
2. 创建AccessKey（建议使用RAM子账号）
3. 记录 `AccessKey ID` 和 `AccessKey Secret`

### 3. 配置环境变量

复制 `.env.auth.example` 为 `.env`：

```bash
cp .env.auth.example .env
```

编辑 `.env` 文件，填入阿里云配置：

```env
ALIYUN_ACCESS_KEY_ID=你的AccessKeyID
ALIYUN_ACCESS_KEY_SECRET=你的AccessKeySecret
ALIYUN_SMS_SIGN_NAME=你的签名
ALIYUN_SMS_TEMPLATE_CODE=SMS_123456789
```

## 三、安装依赖

```bash
npm install @alicloud/dysmsapi20170525 @alicloud/openapi-client
```

或完整安装：

```bash
npm install
```

## 四、启动服务

```bash
node auth-server.js
```

服务将在 `http://localhost:3002` 启动。

## 五、API接口

### 1. 发送验证码

**请求：**
```http
POST /api/auth/send-code
Content-Type: application/json

{
  "mobile": "13800008888"
}
```

**响应：**
```json
{
  "success": true,
  "message": "验证码已发送",
  "data": {
    "expiredAt": "2026-04-21T12:05:00.000Z",
    "todayCount": 1,
    "todayLimit": 10
  }
}
```

### 2. 登录

**请求：**
```http
POST /api/auth/login
Content-Type: application/json

{
  "mobile": "13800008888",
  "code": "123456"
}
```

**响应：**
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "user": {
      "id": 1,
      "mobile": "13800008888",
      "nickname": "用户8888",
      "status": "ACTIVE",
      "created_at": "2026-04-21T12:00:00.000Z"
    },
    "token": "eyJ1c2VySWQiOjEsIm1vYmlsZSI6IjEzODAwMDA4ODg4IiwidGltZXN0YW1wIjoxNjE5MDAwMDAwMDAwfQ=="
  }
}
```

### 3. 获取用户信息

**请求：**
```http
GET /api/auth/me
Authorization: Bearer {token}
```

**响应：**
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "user": {
      "id": 1,
      "mobile": "13800008888",
      "nickname": "用户8888",
      "status": "ACTIVE",
      "last_login_at": "2026-04-21T12:05:00.000Z",
      "created_at": "2026-04-21T12:00:00.000Z"
    }
  }
}
```

## 六、安全限制

1. **发送频率限制**：同一手机号1分钟内只能发送1次
2. **每日发送限制**：同一手机号每天最多发送10次
3. **验证码有效期**：5分钟
4. **验证码一次性**：使用后立即失效

## 七、测试接口

使用 curl 测试：

```bash
# 发送验证码
curl -X POST http://localhost:3002/api/auth/send-code \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13800008888"}'

# 登录
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"mobile":"13800008888","code":"123456"}'
```

## 八、前端集成示例

```javascript
// 发送验证码
async function sendCode(mobile) {
  const response = await fetch('http://localhost:3002/api/auth/send-code', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile })
  });
  return await response.json();
}

// 登录
async function login(mobile, code) {
  const response = await fetch('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile, code })
  });
  const result = await response.json();

  if (result.success) {
    // 保存token
    localStorage.setItem('token', result.data.token);
    localStorage.setItem('user', JSON.stringify(result.data.user));
  }

  return result;
}
```

## 九、注意事项

1. 生产环境请修改 `.env` 中的密钥配置
2. 建议使用 JWT 替换当前的简单token方案
3. 短信签名和模板需要先在阿里云审核通过
4. 建议配置 Redis 缓存以提高性能
5. 生产环境建议配置 HTTPS

## 十、故障排查

### 短信发送失败

1. 检查 AccessKey 是否正确
2. 检查签名和模板是否已审核通过
3. 检查账户余额是否充足
4. 查看控制台日志的错误信息

### 验证码验证失败

1. 检查验证码是否已过期（5分钟有效期）
2. 检查验证码是否已使用
3. 确认输入的验证码与短信发送的一致

## 十一、代码结构

```
├── SQL/
│   └── auth-schema.sql          # 数据库表结构
├── services/
│   ├── smsService.js            # 阿里云短信服务
│   └── authService.js           # 认证业务逻辑
├── controllers/
│   └── authController.js        # 控制器
├── routes/
│   └── authRoutes.js            # 路由
├── auth-server.js               # 服务器入口
├── .env.auth.example            # 环境变量示例
└── SMS_VERIFICATION_SETUP.md    # 本文档
```

## 十二、阿里云短信SDK示例

```javascript
const Dysmsapi = require('@alicloud/dysmsapi20170525');
const OpenApi = require('@alicloud/openapi-client');

// 初始化客户端
const config = new OpenApi.Config({
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    endpoint: 'dysmsapi.aliyuncs.com'
});
const client = new Dysmsapi(config);

// 发送短信
const request = new Dysmsapi.SendSmsRequest({
    phoneNumbers: '13800008888',
    signName: '你的签名',
    templateCode: 'SMS_123456789',
    templateParam: JSON.stringify({ code: '123456' })
});

const response = await client.sendSms(request);
```
