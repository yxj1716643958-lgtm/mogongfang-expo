# Vercel 部署指南

## 部署架构

```
┌─────────────────┐
│   Vercel CDN    │  ← 前端静态页面
│  (前端网站)     │
└────────┬────────┘
         │ HTTPS API 请求
         ↓
┌─────────────────┐
│  阿里云 ECS     │  ← 后端 API 服务
│  (Node.js)      │     ticket-server.js
│  SQLite 数据库  │
└─────────────────┘
```

## 前置要求

1. 安装 Vercel CLI：
```bash
npm install -g vercel
```

2. 登录 Vercel：
```bash
vercel login
```

## 快速部署

### Windows 用户
```bash
deploy-vercel.bat
```

### Linux/Mac 用户
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

## 手动部署

如果自动脚本失败，可以手动执行以下步骤：

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
确保 `.env` 文件中的配置正确

### 3. 部署
```bash
vercel --prod
```

## 部署后配置

### 1. 更新 API 地址

部署完成后，需要在 Vercel 项目设置中配置环境变量：

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目
3. 进入 Settings → Environment Variables
4. 添加以下变量：
   - `NEXT_PUBLIC_API_URL`: `http://101.200.126.62:3001/api/v1`

### 2. 配置自定义域名（可选）

1. 在 Vercel 项目中进入 Settings → Domains
2. 添加你的自定义域名
3. 按照提示配置 DNS

## 重要文件说明

- `vercel.json` - Vercel 部署配置
- `.vercelignore` - 排除不需要部署的文件
- `deploy-vercel.sh` - Linux/Mac 部署脚本
- `deploy-vercel.bat` - Windows 部署脚本

## 注意事项

1. **API 地址**：前端需要通过 HTTPS 访问后端 API，请确保你的服务器支持 HTTPS

2. **CORS 配置**：后端 API 需要配置 CORS 允许 Vercel 域名访问

3. **数据库**：SQLite 数据库保留在阿里云服务器上，不部署到 Vercel

4. **环境变量**：敏感信息（如微信小程序密钥）存储在服务器环境变量中，不提交到 Vercel

## 常见问题

### Q: 部署后 API 请求失败？
A: 检查后端服务器的 CORS 配置，确保允许 Vercel 域名访问

### Q: 如何更新部署？
A: 修改代码后重新运行部署脚本即可

### Q: 如何查看部署日志？
A: 访问 Vercel Dashboard → 你的项目 → Deployments
