# 微信小程序支付 + 支付宝双支付实施计划

## 一、项目概述

### 目标
为票务系统同时添加支付宝和微信小程序两种支付方式，1周内完成上线。

### 背景
- 现有系统：Node.js + Express + SQLite
- 已支持：调试模式
- 需求：支付宝 + 微信小程序双支付
- 时间要求：1周内上线
- 现状：小程序账号待注册

### 调整策略
由于时间紧张，采用**分阶段实施**：
- **第一阶段（3天）**：支付宝支付优先上线
- **第二阶段（并行）**：注册小程序，开发微信支付
- **第三阶段（第7天）**：双支付同时在线

## 二、分阶段实施计划

### 阶段一：支付宝支付（优先，Day 1-3）

#### 任务清单
- [x] 现有代码已支持支付宝支付基础
- [ ] 优化支付宝支付UI
- [ ] 实现支付宝二维码显示
- [ ] 支付状态轮询
- [ ] 测试支付流程

#### 文件修改
- `tickets.html` - 启用支付宝支付选项
- `ticket-server.js` - 确认支付宝支付接口正常
- `.env` - 确认汇付配置正确

#### 预期成果
支付宝支付功能上线，用户可正常购票支付

### 阶段二：微信小程序并行开发（Day 1-7）

#### 2.1 小程序注册（Day 1-3，与阶段一并行）
- [ ] 注册微信小程序账号
- [ ] 提交企业认证（300元/年，需1-3天审核）
- [ ] 获取AppID和AppSecret
- [ ] 开通微信支付功能

#### 2.2 小程序开发（Day 4-6）
- [ ] 创建小程序项目
- [ ] 实现支付页面
- [ ] 实现Webview页面
- [ ] 接入后端API

#### 2.3 后端适配（Day 4-6）
- [ ] 添加微信小程序支付接口
- [ ] 实现URL Scheme生成
- [ ] 修改支付创建接口

### 阶段三：双支付上线（Day 7）

#### 任务清单
- [ ] 启用微信支付选项
- [ ] 完整流程测试
- [ ] 部署到阿里云服务器
- [ ] 监控和日志配置

## 二、技术架构

### 2.1 系统流程图
```
H5购票页面 → 选择微信支付 → 生成小程序URL Scheme 
  → 跳转微信小程序 → 获取OpenID → 创建支付 
  → 汇付支付API → 支付回调 → 生成票券 → 返回H5查看
```

### 2.2 关键组件
- **H5前端**：tickets.html, payment-result.html
- **小程序**：支付页面、Webview页面、结果页面
- **后端API**：订单创建、支付创建、OpenID获取、URL Scheme生成
- **数据库**：现有表结构已足够，可选添加微信用户映射表

## 三、实施步骤

### 阶段一：准备工作（2-3天）
**任务清单：**
- [ ] 注册微信小程序账号（企业认证）
- [ ] 获取小程序AppID和AppSecret
- [ ] 开通微信支付功能
- [ ] 配置服务器域名白名单
- [ ] 申请小程序支付权限

### 阶段二：后端开发（2-3天）

**新增API端点：**
- [ ] `GET /api/v1/wechat/miniapp/code2session` - OpenID获取
- [ ] `POST /api/v1/wechat/miniapp/scheme` - URL Scheme生成
- [ ] `GET /api/v1/payments/miniapp/status/:orderNo` - 支付状态查询

**修改现有接口：**
- [ ] `POST /api/v1/payments/huifu/create` - 支持WECHAT_MINIAPP
- [ ] `POST /api/v1/payments/huifu/notify` - 处理小程序支付回调

**文件修改：**
- [ ] `ticket-server.js` - 添加微信小程序支付逻辑
- [ ] `.env` - 添加小程序配置

### 阶段三：小程序开发（3-4天）

**小程序页面：**
- [ ] `pages/payment/payment.wxml` - 支付页面
- [ ] `pages/payment/payment.js` - 支付逻辑
- [ ] `pages/webview/webview.wxml` - Webview容器
- [ ] `pages/result/result.wxml` - 结果页面
- [ ] `utils/request.js` - API请求封装

**配置文件：**
- [ ] `app.json` - 小程序配置
- [ ] `project.config.json` - 项目配置
- [ ] `app.js` - 小程序入口

### 阶段四：前端适配（1-2天）

**H5页面修改：**
- [ ] `tickets.html` - 启用微信支付选项
- [ ] `tickets.html` - 实现跳转小程序逻辑
- [ ] `payment-result.html` - 优化支付结果轮询
- [ ] `payment-result.html` - 处理小程序返回

### 阶段五：联调测试（2-3天）
- [ ] 完整支付流程测试
- [ ] 异常情况处理测试
- [ ] 支付回调测试
- [ ] 性能测试
- [ ] 安全测试

**总时间：10-15天**

## 四、关键文件清单

### 需要修改的文件
- `E:\魔攻方 第二次尝试\ticket-server.js` - 后端主服务
- `E:\魔攻方 第二次尝试\tickets.html` - 购票页面
- `E:\魔攻方 第二次尝试\payment-result.html` - 支付结果页
- `E:\魔攻方 第二次尝试\.env` - 环境变量配置

### 需要新建的文件/目录
- `miniprogram/` - 微信小程序项目目录
- `miniprogram/pages/payment/` - 支付页面
- `miniprogram/pages/webview/` - Webview页面
- `miniprogram/pages/result/` - 结果页面
- `miniprogram/utils/` - 工具函数

## 五、数据流设计

### 5.1 支付创建流程
```
1. 用户在H5选择微信支付
2. 后端生成小程序URL Scheme
3. 跳转到小程序并传递订单号
4. 小程序获取OpenID
5. 小程序调用后端创建支付（传递OpenID）
6. 后端调用汇付API（trad_type=T_MINIAPP）
7. 返回支付参数给小程序
8. 小程序调起支付
9. 支付完成后汇付回调后端
10. 后端生成票券
11. 小程序查询支付状态
12. 返回H5页面显示票券
```

### 5.2 API接口设计

#### 后端新增接口
```javascript
// OpenID获取
GET /api/v1/wechat/miniapp/code2session?code={code}

// URL Scheme生成  
POST /api/v1/wechat/miniapp/scheme
Body: { orderNo, path, query }

// 小程序支付创建（扩展现有接口）
POST /api/v1/payments/huifu/create
Body: { orderNo, paymentMethod: 'WECHAT_MINIAPP', wxOpenid, wxAppid }

// 支付状态查询（小程序轮询用）
GET /api/v1/payments/${orderNo}/status
```

## 六、安全考虑

### 6.1 签名验证
- ✅ 汇付回调签名验证（已有）
- ✅ 订单金额校验（已有）
- ✅ 幂等性处理（已有）

### 6.2 新增安全措施
- OpenID与用户手机号绑定验证
- URL Scheme有效期控制（30分钟）
- 小程序支付限额控制
- 防重放攻击保护

## 七、降级策略

### 7.1 渐进式启用
- 功能开关控制
- 灰度发布（先开放10%用户）
- 实时监控成功率

### 7.2 故障降级
- 小程序不可用时引导使用支付宝
- API失败时显示降级提示
- 保持调试模式作为备用

## 八、成功标准

### 8.1 功能验收
- ✅ 用户可通过微信小程序完成支付
- ✅ 支付成功后票券正确生成
- ✅ H5页面可查看已购票券
- ✅ 支付失败时有明确提示

### 8.2 性能指标
- 小程序跳转成功率 > 95%
- 支付创建响应时间 < 2秒
- 支付回调处理时间 < 5秒
- 票券生成成功率 > 99%

### 8.3 安全要求
- 所有支付请求通过HTTPS
- 签名验证通过率100%
- 无重复出票问题
- 无金额篡改漏洞
