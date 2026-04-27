# 项目结构说明

**项目名称**: 东北亚数字文创博览会 - 票务系统  
**最后更新**: 2026-04-24

---

## 📁 目录结构

```
E:\魔攻方 第二次尝试/
├── 📄 核心服务器文件
│   ├── server.js              # 前端静态文件服务器 (端口8080)
│   ├── ticket-server.js       # 票务系统后端API (端口3001)
│   ├── auth-server.js         # 认证服务 (端口3002)
│   └── payment-server.js      # 支付服务
│
├── 📄 数据库相关
│   ├── sqlite-adapter.js      # SQLite数据库适配器
│   ├── sqlite-db.js           # 数据库初始化和迁移
│   ├── data/                  # SQLite数据库文件目录
│   │   └── expo_tickets.db    # 主数据库文件
│   └── SQL/                   # MySQL数据库脚本（备用）
│
├── 🌐 前端页面（根目录）
│   ├── index.html             # 首页/登录页
│   ├── tickets.html           # 票务购买页面
│   ├── login.html             # 登录页面
│   ├── register.html          # 注册页面
│   ├── my-tickets.html        # 我的票券页面
│   ├── admin.html             # 管理后台
│   ├── dashboard.html         # 控制面板
│   ├── payment-result.html    # 支付结果页面
│   └── ...                    # 其他页面
│
├── 🌐 前端页面（public目录）
│   ├── invitation.html        # 邀请函申请页面 ⭐ 新增
│   ├── my-invitations.html    # 我的邀请函页面 ⭐ 新增
│   └── verify-terminal.html   # 核销终端页面
│
├── 📂 资源目录
│   ├── assets/                # 静态资源（CSS、JS、图片）
│   │   ├── css/
│   │   ├── js/
│   │   ├── images/
│   │   └── data/
│   └── public/                # 公共静态文件
│
├── 🔧 服务层
│   ├── controllers/           # 控制器
│   │   └── authController.js
│   ├── routes/                # 路由
│   │   └── authRoutes.js
│   ├── services/              # 业务服务
│   │   ├── authService.js
│   │   ├── smsService.js
│   │   └── verifyService.js
│   └── utils/                 # 工具函数
│       └── token.js
│
├── 🧪 测试文件
│   ├── test-*.js              # 各种API测试脚本
│   ├── test-*.html            # 测试页面
│   ├── init-*.js              # 数据库初始化脚本
│   └── reinit-db.js           # 数据库重置脚本
│
├── ⚙️ 配置文件
│   ├── .env                   # 环境变量配置
│   ├── package.json           # 项目依赖
│   └── vercel.json            # Vercel部署配置
│
└── 📝 文档
    ├── 上传配置到服务器指南.md
    ├── 后端小程序改版日志集锦.md
    ├── 汇付支付集成状态报告.md
    ├── 支付问题排查报告.md
    └── 邀请函门票系统规划.md
```

---

## 🚀 启动方式

### 开发环境

**启动前端服务器** (端口8080):
```bash
cd "E:\魔攻方 第二次尝试"
node server.js
```

**启动后端API服务器** (端口3001):
```bash
cd "E:\魔攻方 第二次尝试"
node ticket-server.js
```

**启动认证服务** (可选，端口3002):
```bash
cd "E:\魔攻方 第二次尝试"
node auth-server.js
```

---

## 🌐 访问地址

| 页面 | URL | 说明 |
|------|-----|------|
| 首页 | http://localhost:8080/ | 主入口 |
| 票务购买 | http://localhost:8080/tickets.html | 购票页面 |
| 邀请函申请 | http://localhost:8080/invitation.html | ⭐ 邀请函申请 |
| 我的邀请函 | http://localhost:8080/my-invitations.html | ⭐ 邀请函列表 |
| 核销终端 | http://localhost:8080/verify-terminal.html | ⭐ 现场核销 |
| 我的票券 | http://localhost:8080/my-tickets.html | 已购票券 |
| 管理后台 | http://localhost:8080/admin.html | 后台管理 |

---

## 🔌 API端点

### 票务相关
- `POST /api/v1/orders` - 创建订单
- `GET /api/v1/orders/:orderNo` - 查询订单
- `POST /api/v1/payments/huifu/create` - 创建汇付支付
- `POST /api/v1/payments/huifu/notify` - 支付回调

### 邀请函相关 ⭐ 新增
- `POST /api/v1/invitations/apply` - 提交邀请函申请
- `GET /api/v1/invitations/my-applications` - 查询我的申请
- `GET /api/v1/invitations/my-tickets` - 查询我的邀请函票券

### 核销相关
- `POST /api/v1/verify/preview` - 核销预览
- `POST /api/v1/verify/scan` - 扫码核销
- `GET /api/v1/verify/records` - 核销记录

---

## 💾 数据库

**当前使用**: SQLite (better-sqlite3)  
**数据库文件**: `data/expo_tickets.db`

**主要表**:
- `orders` - 订单表
- `tickets` - 票券表
- `invitation_applications` - 邀请函申请表 ⭐ 新增
- `payment_records` - 支付记录
- `verification_records` - 核销记录

---

## 🔑 环境变量

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=ne_expo_ticket

# 服务器配置
SERVER_PORT=3001
AUTH_PORT=3002
QR_SECRET_KEY=ne_expo_ticket_secret_key_2024

# 汇付天下配置
HUIFU_MERCHANT_ID=6666000195047270
HUIFU_SYS_ID=6666000195047270
HUIFU_APP_ID=KAZX
HUIFU_PRIVATE_KEY=...
HUIFU_PUBLIC_KEY=...
HUIFU_NOTIFY_URL=http://101.200.126.62:3001/api/v1/payments/huifu/notify
HUIFU_GATEWAY_URL=https://paas.huifu.com
HUIFU_ENVIRONMENT=PRODUCTION

# 短信配置
ALIYUN_ACCESS_KEY_ID=...
ALIYUN_ACCESS_KEY_SECRET=...
ALIYUN_SMS_SIGN_NAME=长春知行智研科技
ALIYUN_SMS_TEMPLATE_CODE=SMS_50592009

# 调试模式
SMS_DEBUG_MODE=false
PAYMENT_DEBUG_MODE=false
```

---

## 📦 核心依赖

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "better-sqlite3": "^12.9.0",
    "cors": "^2.8.5",
    "dotenv": "^17.4.2",
    "qrcode": "^1.5.3",
    "@alicloud/dysmsapi20170525": "^3.1.3",
    "mysql2": "^3.6.0"
  }
}
```

---

## 🎯 核心功能模块

### 1. 票务系统
- 订单创建和管理
- 在线支付（汇付天下）
- 票券生成和二维码
- 票券核销

### 2. 邀请函系统 ⭐ 新增
- 邀请函申请
- 身份证验证和加密
- 自动审核（邀请码/VIP类别）
- 电子票券生成
- 现场核销

### 3. 用户系统
- 用户注册/登录
- 短信验证码
- 用户信息管理

### 4. 核销系统
- 扫码核销
- 手机号补验
- 核销记录统计

---

## 📝 最近更新

**2026-04-24**:
- ✅ 添加邀请函申请功能
- ✅ 添加身份证加密存储
- ✅ 添加自动审核机制
- ✅ 添加核销预览接口
- ✅ 更新汇付支付到斗拱平台API

---

## 🚧 待完成

- [ ] 完善邀请函审核后台
- [ ] 添加退款功能
- [ ] 实现MySQL生产环境部署
- [ ] 添加数据统计报表

---

**文档版本**: v1.0  
**更新时间**: 2026-04-24
