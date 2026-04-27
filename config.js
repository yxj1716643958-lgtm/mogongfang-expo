// API 配置文件
// 部署到 Vercel 时，此文件会被构建脚本替换为生产环境配置

const CONFIG = {
  // 根据环境自动选择 API 地址
  apiBaseUrl: (function() {
    // Vercel 生产环境
    if (window.location.hostname.includes('vercel.app') ||
        window.location.hostname.includes('northeast-asia-expo')) {
      return 'http://101.200.126.62:3001/api/v1'; // 你的服务器API地址
    }
    // 本地开发
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001/api/v1';
    }
    // 其他环境（直接IP访问）
    return 'http://101.200.126.62:3001/api/v1';
  })(),

  // 微信小程序配置
  wechat: {
    appId: 'wx7f9e9cce0d300cd2',
    miniappEnabled: true
  }
};

// 导出到全局
window.APP_CONFIG = CONFIG;
