# 后端API部署指南

## 快速部署到Render.com

### 步骤1：准备GitHub仓库
1. 确保代码已推送到GitHub
2. 访问 https://github.com/yxj1716643958-lgtm/mogongfang-expo

### 步骤2：在Render部署
1. 访问 https://render.com
2. 使用GitHub账号登录
3. 点击 "New +" → "Web Service"
4. 选择GitHub仓库：`yxj1716643958-lgtm/mogongfang-expo`
5. 配置部署：

**基本设置：**
- Name: `mogongfang-expo-api`
- Runtime: `Node`
- Build Command: `npm install`
- Start Command: `node ticket-server.js`

**环境变量：**
```
AUTH_PORT=3001
SERVER_PORT=3001
SMS_DEBUG_MODE=false
NODE_ENV=production
```

**汇付配置：**
```
HUIFU_MERCHANT_ID=6666000195047270
HUIFU_SYS_ID=6666000195047270
HUIFU_APP_ID=KAZX
HUIFU_PRIVATE_KEY=你的私钥
HUIFU_PUBLIC_KEY=汇付公钥
HUIFU_GATEWAY_URL=https://spin.cloudpnr.com
HUIFU_ENVIRONMENT=PRODUCTION
```

**回调地址（重要）：**
部署后会获得URL，例如：`https://mogongfang-expo-api.onrender.com`

然后设置：
```
HUIFU_NOTIFY_URL=https://mogongfang-expo-api.onrender.com/api/v1/payments/huifu/notify
HUIFU_RETURN_URL=https://你的Vercel域名/payment-result.html
```

### 步骤3：更新前端配置
部署成功后，更新前端API地址。

在 `tickets.html` 中修改：
```javascript
const API_CONFIG = {
    baseUrl: 'https://mogongfang-expo-api.onrender.com/api/v1',
};
```

### 步骤4：推送更新
```bash
git add .
git commit -m "配置后端部署"
git push origin main
```

---

## 其他部署选项

### Railway.app
1. 访问 https://railway.app
2. 创建新项目 → 从GitHub导入
3. 添加环境变量
4. 部署

### Vercel Serverless Functions
需要重构代码为serverless函数格式。

---

## 数据库说明

当前使用SQLite数据库，免费层需要注意：
- SQLite文件在部署后会重置（每次重新部署）
- 生产环境建议使用云数据库（如PlanetScale、Supabase）

### 切换到MySQL/PostgreSQL

1. 创建云数据库账号
2. 获取数据库连接信息
3. 在Render环境变量设置：
```
DB_HOST=你的数据库主机
DB_PORT=3306
DB_USER=你的用户名
DB_PASSWORD=你的密码
DB_NAME=数据库名
```

---

## 验证部署

部署成功后，测试API：
```bash
curl https://你的API地址/health
```

应该返回：
```json
{
  "code": "SUCCESS",
  "message": "服务运行正常"
}
```
