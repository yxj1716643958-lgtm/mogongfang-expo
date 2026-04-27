# 微信小程序使用指南

## 目录结构

```
miniprogram/
├── app.js              # 小程序入口
├── app.json            # 小程序配置
├── app.wxss            # 全局样式
├── project.config.json # 项目配置
├── sitemap.json        # 站点地图
├── pages/              # 页面目录
│   ├── payment/        # 支付页面
│   ├── webview/        # Webview容器
│   └── result/         # 支付结果页
└── utils/              # 工具函数
    └── request.js      # API请求封装
```

## 配置步骤

### 1. 修改配置文件

打开 `miniprogram/app.js`，修改以下配置：

```javascript
globalData: {
  apiBaseUrl: 'https://你的后端域名.com',  // 修改为实际后端地址
  h5BaseUrl: 'https://你的H5域名.com'      // H5页面地址
}
```

### 2. 配置小程序信息

1. 打开微信开发者工具
2. 导入项目，选择 `miniprogram` 目录
3. 在 `project.config.json` 中填入你的 `appid`

### 3. 配置服务器域名

登录微信公众平台，配置以下域名白名单：

**request合法域名**：
```
https://你的后端域名.com
```

**webview合法域名**：
```
https://你的H5域名.com
```

## 开发流程

### 1. 本地开发
1. 使用微信开发者工具打开项目
2. 确保后端服务已启动
3. 点击「编译」按钮进行预览

### 2. 测试支付流程
1. 从H5页面选择微信支付
2. 跳转到小程序
3. 完成支付
4. 查看支付结果

### 3. 发布上线
1. 在微信开发者工具中点击「上传」
2. 登录微信公众平台提交审核
3. 审核通过后发布

## API接口

### 后端需要提供的接口

| 接口 | 方法 | 说明 |
|-----|------|------|
| /api/v1/wechat/miniapp/code2session | GET | 获取OpenID |
| /api/v1/wechat/miniapp/scheme | POST | 生成URL Scheme |
| /api/v1/payments/miniapp/create | POST | 创建小程序支付 |
| /api/v1/payments/:orderNo/status | GET | 查询支付状态 |

## 注意事项

1. **AppID配置**：确保 `project.config.json` 中的 `appid` 正确
2. **HTTPS要求**：所有接口域名必须使用HTTPS
3. **支付开通**：微信支付需要企业资质，审核时间1-3天
4. **域名白名单**：必须在微信公众平台配置合法域名
