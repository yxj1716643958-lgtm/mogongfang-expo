# Vercel 部署快速指南

## 一、首次部署

### 1. 安装 Vercel CLI
```bash
npm install -g vercel
```

### 2. 登录 Vercel
```bash
vercel login
```
按提示选择登录方式（推荐使用 GitHub 登录）

### 3. 部署项目

**Windows 用户：**
双击运行 `deploy-vercel.bat`

**Mac/Linux 用户：**
```bash
chmod +x deploy-vercel.sh
./deploy-vercel.sh
```

### 4. 按提示操作
- 首次部署会询问项目设置
- 项目名称：`northeast-asia-expo`
- 是否覆盖现有项目：选择 `Yes`
- 构建命令：留空（直接回车）
- 输出目录：`.`（直接回车）

## 二、获取部署地址

部署成功后会显示：
```
✅ Production: https://your-project.vercel.app
```

保存这个地址，后续需要用到。

## 三、配置 CORS 白名单

编辑服务器上的 `ticket-server.js`，在 CORS 配置中添加你的 Vercel 域名：

```javascript
const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://101.200.126.62:8080',
    'https://your-project.vercel.app',  // 添加这行
];
```

然后重启服务器：
```bash
# 在服务器上执行
pm2 restart ticket-server
# 或者
node ticket-server.js
```

## 四、更新部署

每次修改代码后，重新运行部署脚本即可：

```bash
# Windows
deploy-vercel.bat

# Mac/Linux
./deploy-vercel.sh
```

## 五、访问网站

部署成功后，通过以下地址访问：
- 你的 Vercel 域名：`https://your-project.vercel.app`
- 或自定义域名（在 Vercel 控制台配置）

## 常见问题

### 问题1：部署后 API 请求失败
**原因**：CORS 配置未添加 Vercel 域名
**解决**：按照步骤三配置 CORS 白名单

### 问题2：页面显示但功能不正常
**原因**：API 地址配置错误
**解决**：检查 `deploy-vercel.bat` 中的 `API_BASE_URL` 是否正确

### 问题3：部署脚本执行失败
**原因**：Vercel CLI 未安装或未登录
**解决**：
```bash
npm install -g vercel
vercel login
```

## 项目结构

部署到 Vercel 的文件：
```
├── index.html              # 首页
├── tickets.html            # 购票页
├── my-tickets.html         # 我的门票
├── admin.html              # 管理后台
├── verify.html             # 核销页面
├── login.html              # 登录页
├── register.html           # 注册页
├── dashboard.html          # 控制台
├── payment-result.html     # 支付结果
├── assets/                 # 静态资源
│   ├── css/
│   ├── js/
│   └── images/
└── vercel.json             # Vercel 配置
```

不部署的文件（保留在服务器）：
- `server.js` - Express 服务器
- `ticket-server.js` - 后端 API
- `data/` - SQLite 数据库
- `.env` - 环境变量
