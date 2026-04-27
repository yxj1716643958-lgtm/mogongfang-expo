# Vercel部署 - API代理解决方案

## 问题说明

**错误**: `my-tickets:719 查询失败: TypeError: Failed to fetch`

**原因**:
1. **混合内容问题**: HTTPS网站无法访问HTTP API
2. Vercel部署的是旧代码（API地址没有端口号）

## 解决方案

已创建Vercel Serverless Function作为API代理，解决混合内容问题。

### 文件变更

1. **新增文件**:
   - `api/proxy.js` - Vercel serverless function，代理API请求

2. **更新文件**:
   - `my-tickets.html` - API配置改为使用 `/api/proxy`
   - `admin.html` - API配置改为使用 `/api/proxy`
   - `verify.html` - API配置改为使用 `/api/proxy`
   - `payment-result.html` - API配置改为使用 `/api/proxy`
   - `vercel.json` - 添加functions配置
   - `.vercelignore` - 确保api目录不被忽略

## 部署方法

### 方法1: 通过Vercel Dashboard (推荐)

1. 访问 https://vercel.com/uka111/mogongfang-expo
2. 点击 "Redeploy" 按钮
3. 确认部署

### 方法2: 通过Git集成

1. 提交代码到Git仓库:
```bash
git add .
git commit -m "添加API代理解决混合内容问题"
git push
```

2. Vercel会自动部署

### 方法3: 使用Vercel CLI (需要重新登录)

```bash
# 登录Vercel
vercel login

# 部署
vercel --prod
```

## 验证步骤

部署完成后：

1. 访问 https://www.uka-hc.com
2. 打开浏览器开发者工具 (F12)
3. 访问"我的门票"页面
4. 检查Network标签：
   - 请求应该发送到 `/api/proxy/v1/tickets/...`
   - 状态应该是 200

## 工作原理

```
浏览器 → Vercel (HTTPS) → Serverless Function → 后端API (HTTP)
         ↓                  ↓                        ↓
      HTTPS请求        代理转发请求            处理业务逻辑
```

通过Vercel Serverless Function作为代理，避免了混合内容问题。

## 故障排除

### 问题1: 代理请求失败

**症状**: API请求返回500错误

**解决**:
1. 检查后端API是否正常运行
```bash
curl http://101.200.126.62:3001/api/v1/health
```

2. 检查Vercel函数日志
- 访问Vercel Dashboard
- 查看Functions标签

### 问题2: CORS错误

**症状**: 控制台显示CORS错误

**解决**: 确保服务器CORS配置已更新并重启

### 问题3: 部署失败

**症状**: Vercel部署时出现错误

**解决**: 检查vercel.json和api/proxy.js语法是否正确

## API端点列表

前端使用的API端点会自动通过代理转发：

| 前端请求 | 实际转发到 |
|---------|-----------|
| `/api/proxy/v1/tickets/types` | `http://101.200.126.62:3001/api/v1/tickets/types` |
| `/api/proxy/v1/tickets/user-tickets` | `http://101.200.126.62:3001/api/v1/tickets/user-tickets` |
| `/api/proxy/v1/invitations/applications` | `http://101.200.126.62:3001/api/v1/invitations/applications` |
