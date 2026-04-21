# 票务系统启动指南

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 初始化数据库

**方式一：使用MySQL命令行**
```bash
mysql -u root -p < SQL/ticket-schema.sql
```

**方式二：使用MySQL客户端**
1. 打开MySQL客户端（如Navicat、MySQL Workbench）
2. 执行 `SQL/ticket-schema.sql` 文件中的SQL语句

### 3. 配置环境变量（可选）

创建 `.env` 文件（可选，有默认值）：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=ne_expo_ticket

# 服务器配置
SERVER_PORT=3001

# 二维码加密密钥（生产环境请修改）
QR_SECRET_KEY=your_secret_key_here
```

### 4. 启动服务

**启动票务服务器：**
```bash
npm run ticket-server
```

**或同时启动静态服务器：**
```bash
# 终端1：启动票务API
npm run ticket-server

# 终端2：启动静态页面服务器
npm start
```

### 5. 访问系统

- 前端页面：http://localhost:8080
- 票务API：http://localhost:3001
- API文档：查看下方的接口列表

---

## 接口列表

### 健康检查
```
GET /health
```

### 订单模块
```
POST   /api/v1/orders                    # 创建订单
GET    /api/v1/orders/:orderNo           # 查询订单
POST   /api/v1/orders/:orderNo/cancel    # 取消订单
```

### 支付模块
```
POST   /api/v1/payments/create                      # 创建支付
GET    /api/v1/payments/:orderNo/status             # 查询支付状态
POST   /api/v1/payments/notify                      # 支付回调
```

### 邀请函模块
```
POST   /api/v1/invitations/apply                    # 提交申请
GET    /api/v1/invitations/my-applications          # 我的申请
```

### 票券模块
```
GET    /api/v1/tickets/my-tickets                   # 我的票券
GET    /api/v1/tickets/:ticketNo                    # 票券详情
```

### 核销模块
```
POST   /api/v1/verify/scan                          # 扫码核销
GET    /api/v1/verify/records                       # 核销记录
```

---

## 功能说明

### 用户端功能

1. **购票**
   - 访问 `tickets.html` 选择票种
   - 填写姓名、手机号、邮箱
   - 完成支付（演示版本直接成功）

2. **邀请函申请**
   - 点击"立即申请"按钮
   - 填写申请信息（姓名、手机、邮箱、公司、职位、申请原因）
   - 等待审核（演示版本需要管理员手动审核）

3. **查看门票**
   - 访问 `my-tickets.html`
   - 输入购票/申请手机号
   - 查看电子票和二维码

### 管理员功能

需要手动实现或通过数据库操作：

1. **审核邀请函**
```sql
-- 查看待审核申请
SELECT * FROM invitation_applications WHERE audit_status = 'PENDING';

-- 审核通过（同时创建订单和票券需要调用后端接口）
UPDATE invitation_applications SET audit_status = 'APPROVED', audit_time = NOW() WHERE id = ?;
```

2. **直接发放邀请函**
```sql
-- 插入申请记录并直接审核通过
INSERT INTO invitation_applications (application_no, applicant_name, applicant_phone, ...)
VALUES (...);

-- 创建订单和票券（需要通过后端API）
```

3. **查看核销记录**
```bash
curl "http://localhost:3001/api/v1/verify/records"
```

---

## 演示流程

### 完整购票流程

1. 访问 http://localhost:8080/tickets.html
2. 点击"早鸟体验票"的"立即购票"按钮
3. 填写购票信息（姓名、手机号）
4. 确认购票
5. 跳转到支付页面（演示版本）
6. 支付成功后跳转到结果页面
7. 访问"我的门票"查看电子票

### 邀请函申请流程

1. 访问 http://localhost:8080/tickets.html
2. 点击"邀请函申请"的"立即申请"按钮
3. 填写申请信息
4. 提交申请
5. 等待管理员审核
6. 审核通过后可在"我的门票"查看

### 核销流程

1. 使用核销端扫描门票二维码
2. 调用 `/api/v1/verify/scan` 接口
3. 系统验证票券有效性
4. 更新票券状态为"已使用"
5. 记录核销日志

---

## 测试数据

### 模拟支付回调

```bash
curl -X POST http://localhost:3001/api/v1/payments/notify \
  -H "Content-Type: application/json" \
  -d '{
    "orderNo": "NE20240410120001123",
    "status": "success",
    "amount": 39.90
  }'
```

### 查询订单状态

```bash
curl http://localhost:3001/api/v1/orders/NE20240410120001123
```

### 查询我的票券

```bash
curl "http://localhost:3001/api/v1/tickets/my-tickets?phone=13800138000"
```

---

## 常见问题

### 1. 数据库连接失败

检查：
- MySQL服务是否启动
- 数据库配置是否正确（用户名、密码、数据库名）
- 是否已执行 `SQL/ticket-schema.sql` 创建数据库

### 2. API请求失败

检查：
- ticket-server 是否启动
- 端口是否被占用
- 前端API配置是否正确（`API_CONFIG.baseUrl`）

### 3. 支付后未出票

检查：
- 支付回调是否正确触发
- 订单状态是否更新为PAID
- 查看后端日志

### 4. 二维码无法生成

检查：
- qrcode 库是否正确安装
- 浏览器是否支持Canvas

---

## 生产环境部署

### 1. 环境变量

生产环境必须配置以下环境变量：

```env
DB_HOST=your_db_host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=ne_expo_ticket
SERVER_PORT=3001
QR_SECRET_KEY=your_random_secret_key_min_32_chars
```

### 2. 汇付天下对接

修改 `ticket-server.js` 中的支付相关代码，接入真实的汇付天下SDK。

### 3. HTTPS

生产环境必须使用HTTPS：
- 申请SSL证书
- 配置Nginx反向代理
- 更新回调URL

### 4. 安全加固

- 启用接口限流
- 添加请求签名验证
- 配置CORS白名单
- 启用SQL注入防护

---

## 技术支持

遇到问题请检查：
1. 浏览器控制台是否有错误
2. 服务器终端日志
3. MySQL数据库日志

---

*票务系统版本：v1.0*
*最后更新：2026-04-10*
