// pages/webview/webview.js
const app = getApp();

Page({
  data: {
    url: ''
  },

  onLoad(options) {
    console.log('[Webview] 加载', options);

    const { url, orderNo } = options;

    if (url) {
      // 直接使用传入的URL
      this.setData({ url });
    } else if (orderNo) {
      // 根据订单号构建支付页面URL
      this.setData({
        url: `${app.globalData.h5BaseUrl}/payment-result.html?orderNo=${orderNo}&from=miniprogram`
      });
    } else {
      // 默认跳转到H5首页
      this.setData({ url: app.globalData.h5BaseUrl });
    }
  },

  handleMessage(e) {
    console.log('[Webview] 收到消息:', e.detail.data);
    const messages = e.detail.data;

    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      // 处理来自H5的消息
      if (lastMessage.action === 'close') {
        wx.navigateBack();
      } else if (lastMessage.action === 'payment_success') {
        wx.redirectTo({
          url: `/pages/result/result?orderNo=${lastMessage.orderNo}&status=success`
        });
      }
    }
  }
});
