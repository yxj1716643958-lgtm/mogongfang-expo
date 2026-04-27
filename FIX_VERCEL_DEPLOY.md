# Vercel部署修复指南

## 问题分析

1. **API地址配置问题**：前端API地址缺少端口号3001
   - 错误：`http://101.200.126.62/api/v1`
   - 正确：`http://101.200.126.62:3001/api/v1`

2. **CORS配置问题**：服务器需要允许Vercel域名

3. **混合内容问题**：HTTPS网站无法访问HTTP API（需要配置nginx反向代理）

## 已完成的修复

### 1. 更新前端API配置
已更新以下文件的API地址，添加端口号3001：
- ✅ my-tickets.html
- ✅ admin.html
- ✅ verify.html
- ✅ payment-result.html
- ✅ index.html (已正确)
- ✅ tickets.html (已正确)

### 2. 更新服务器CORS配置
已更新 `ticket-server.js`，添加Vercel域名到CORS白名单：
```javascript
const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://101.200.126.62:8080',
    'https://www.uka-hc.com',  // 新增
    'https://uka-hc.com'       // 新增
];
```

## 下一步操作

### 1. 部署服务器更新

在服务器上执行：
```bash
# 1. 上传更新后的ticket-server.js到服务器
scp ticket-server.js root@101.200.126.62:/root/

# 2. 重启服务
ssh root@101.200.126.62 "pm2 restart ticket-server"
```

或者使用提供的脚本：
```bash
deploy-server-cors.bat
```

### 2. 重新部署到Vercel

由于Vercel CLI登录问题，推荐使用以下方法：

**方法1：通过Vercel Dashboard**
1. 访问 https://vercel.com/uka111/mogongfang-expo
2. 点击 "Redeploy" 按钮
3. 确认部署

**方法2：通过Git集成**
1. 提交代码到Git仓库
2. Vercel会自动部署

**方法3：使用命令行（需要重新登录）**
```bash
vercel login
vercel --prod
```

### 3. 配置nginx反向代理（可选但推荐）

在服务器上配置nginx反向代理，使API支持HTTPS：

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

配置后，前端API地址可改为：
```javascript
'https://101.200.126.62/api/v1'  // 使用HTTPS，无需端口号
```

## 验证步骤

1. 检查网站能否访问：https://www.uka-hc.com
2. 检查API是否正常：
   - 打开浏览器开发者工具
   - 访问"我的门票"页面
   - 检查Network标签，确认API请求成功
3. 检查二维码是否能正常显示

## 常见问题

### 问题1：API请求失败（CORS错误）
**解决**：确保服务器CORS配置已更新并重启

### 问题2：API请求失败（混合内容错误）
**解决**：配置nginx反向代理支持HTTPS

### 问题3：二维码无法显示
**解决**：确保API请求成功，检查二维码数据是否返回

## 当前状态

- ✅ 前端API配置已修复（添加端口号3001）
- ⏳ 服务器CORS配置待部署
- ⏳ Vercel重新部署待执行
- ⏳ nginx反向代理待配置（可选）
