# Node.js 后端从 Render 迁移到阿里云 ECS 完整方案

## 📋 方案概述

将部署在 Render（国外）的 Node.js 后端服务迁移到阿里云 ECS（国内），解决以下问题：
- ✅ 免费版休眠问题
- ✅ 支付回调稳定性
- ✅ 使用人民币计费
- ✅ 国内访问速度更快

---

## 一、服务器购买建议

### 推荐配置
```
实例规格：ecs.t6-c1m2.large (共享型x86实例)
- 2核 vCPU
- 2GB 内存
- 按量付费

操作系统：Ubuntu 22.04 LTS 64位

网络带宽：
- 公网带宽：5 Mbps（按使用量付费）
- 分配公网 IP
```

### 费用预估（华东区域）
| 项目 | 价格 |
|------|------|
| ECS实例（按量付费） | 约 ¥0.08/小时 ≈ ¥58/月 |
| 公网带宽（按量） | 约 ¥0.08/GB |
| **月总计** | **约 ¥60-80/月** |

### 购买步骤
1. 登录阿里云：https://ecs.console.aliyun.com
2. 点击"创建实例"
3. 选择"自定义购买"
4. 选择上述配置
5. 确认订单并支付

---

## 二、服务器初始化步骤

### 2.1 获取服务器信息
购买完成后记录：
- **公网IP地址**
- **root密码**

### 2.2 连接服务器
```bash
ssh root@你的公网IP
```

### 2.3 更新系统
```bash
apt update && apt upgrade -y
```

### 2.4 安装 Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
node -v
```

### 2.5 安装其他工具
```bash
apt install git nginx -y
npm install -g pm2
```

---

## 三、部署步骤

### 3.1 克隆项目
```bash
cd /opt
git clone https://github.com/yxj1716643958-lgtm/mogongfang-expo.git
cd mogongfang-expo
npm install
```

### 3.2 配置环境变量
```bash
cat > .env << 'EOF'
SERVER_PORT=3001
AUTH_PORT=3002
NODE_ENV=production

# 从你的项目.env文件复制配置
# 注意：不要在GitHub上提交真实密钥
EOF
```

### 3.3 启动服务
```bash
pm2 start auth-server.js --name "auth-service"
pm2 start ticket-server.js --name "ticket-service"
pm2 startup
pm2 save
```

---

## 四、安全组配置

在阿里云ECS控制台添加入方向规则：
- TCP 22 (SSH)
- TCP 80 (HTTP)
- TCP 443 (HTTPS)

---

## 五、Nginx 配置

```bash
nano /etc/nginx/sites-available/mogongfang-api
```

配置内容参考完整文档。

---

## 六、HTTPS 配置

```bash
apt install certbot python3-certbot-nginx -y
certbot --nginx -d api.yourdomain.com
```

---

## 详细完整文档

由于篇幅限制，完整文档请访问：
https://github.com/yxj1716643958-lgtm/mogongfang-expo/wiki

或查看项目中的 `DEPLOYMENT.md` 文件。

---

## 快速开始

1. 购买阿里云ECS
2. SSH连接服务器
3. 运行以下命令：

```bash
curl -o- https://raw.githubusercontent.com/yxj1716643958-lgtm/mogongfang-expo/main/scripts/deploy.sh | bash
```

（部署脚本待创建）
