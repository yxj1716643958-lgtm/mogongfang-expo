# NE_ADCI_MAE - 东北亚数字文化创新博览会模型艺术展区

赛博工业风格的数字文化博览会网站，包含注册登录、主功能菜单和详情页。

## 项目结构

```
NE_ADCI_MAE/
├── index.html           # 注册/登录页面
├── dashboard.html       # 主功能菜单/控制中心
├── detail.html          # 展品详情页
├── server.js            # 开发服务器 (端口 8080)
├── package.json         # 项目配置
└── assets/
    ├── css/
    │   ├── style.css        # 全局样式系统
    │   ├── dashboard.css    # 控制中心样式
    │   └── detail.css       # 详情页样式
    └── js/
        ├── app.js           # 核心应用脚本
        ├── login.js         # 登录页逻辑
        ├── dashboard.js     # 控制中心逻辑
        └── detail.js        # 详情页逻辑
```

## 快速开始

### 1. 启动开发服务器

```bash
npm run dev
```

服务器将在 `http://localhost:8080` 启动

### 2. 访问页面

- 注册/登录: `http://localhost:8080/index.html`
- 控制中心: `http://localhost:8080/dashboard.html`
- 展品详情: `http://localhost:8080/detail.html?id=model-x-72`

## 演示账号

| 类型   | 用户名 | 密码      |
|--------|--------|-----------|
| 专业观众 | demo   | demo123   |
| 模型爱好者 | user   | user123   |

## 设计系统

### 颜色规范

- **主色调**: 青色系 (#00e5ff, #00daf3)
- **次要色**: 紫色系 (#721199, #ebb2ff)
- **第三色**: 金黄色系 (#fec931, #ffeac0)
- **背景色**: 深色系 (#131315, #0e0e10)

### 字体

- **标题**: Space Grotesk (科技感等宽字体)
- **正文**: Manrope (现代无衬线字体)
- **图标**: Material Symbols Outlined

### 视觉特征

- 技术网格背景
- 玻璃态面板效果
- 斜角装饰元素
- 扫描线动画
- 霓虹发光效果

## 功能模块

### 1. 注册登录
- 身份类型选择 (专业观众/展商 vs 模型爱好者)
- 用户名密码登录
- 社交登录入口 (微信、邮箱、二维码)
- 会话管理

### 2. 控制中心
- 欢迎横幅
- 实时统计数据
- 功能模块导航
- 热门展品轮播
- 全局搜索 (Ctrl+K)
- 通知中心

### 3. 展品详情
- Hero 展示区
- 技术规格说明
- 展览日程排期
- 视觉图库 (带灯箱)
- 场馆位置信息
- 创作者资料
- 相关展品推荐
- 收藏、分享、预约功能

## 技术栈

- **前端**: 原生 HTML5, CSS3, JavaScript (ES6+)
- **样式**: 自定义 CSS + CSS 变量
- **图标**: Google Material Symbols
- **字体**: Google Fonts
- **开发服务器**: Node.js HTTP Server

## 浏览器支持

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 开发说明

### 添加新展品

在 `assets/js/detail.js` 中的 `ExhibitData.exhibits` 对象添加新条目:

```javascript
'new-model-id': {
    id: 'new-model-id',
    title: '展品标题',
    subtitle: '副标题',
    category: '分类',
    description: '描述',
    // ... 其他属性
}
```

### 自定义颜色

在 `assets/css/style.css` 的 `:root` 中修改 CSS 变量:

```css
:root {
    --primary-container: #00e5ff;
    --secondary: #ebb2ff;
    /* ... */
}
```

## 许可证

MIT License

---

© 2024 NE_DIGITAL_CULTURAL_EXPO. ALL_RIGHTS_RESERVED.
