// pages/payment/payment.js
const app = getApp();

Page({
  data: {
    orderNo: '',
    ticketName: '',
    quantity: 1,
    totalAmount: '0.00',
    loading: true,
    paying: false,
    errorMsg: ''
  },

  onLoad(options) {
    console.log('[支付页面] 加载', options);

    // 获取订单号
    const orderNo = options.orderNo || app.globalData.orderNo;
    if (!orderNo) {
      this.setData({
        loading: false,
        errorMsg: '缺少订单信息'
      });
      return;
    }

    this.setData({ orderNo });
    this.loadOrderInfo();
  },

  // 加载订单信息
  async loadOrderInfo() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/v1/orders/${this.data.orderNo}`,
        method: 'GET'
      });

      if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取订单信息失败');
      }

      const order = res.data.data;
      const ticketInfo = JSON.parse(order.ticket_info);

      this.setData({
        ticketName: ticketInfo.ticketName,
        quantity: order.ticket_quantity,
        totalAmount: (order.total_amount / 100).toFixed(2),
        loading: false
      });

    } catch (error) {
      console.error('[支付页面] 加载订单失败:', error);
      this.setData({
        loading: false,
        errorMsg: error.message || '加载订单信息失败'
      });
    }
  },

  // 处理支付
  async handlePay() {
    if (this.data.paying) return;

    this.setData({ paying: true });

    try {
      // 获取OpenID
      const openid = app.getOpenid();
      if (!openid) {
        // 需要先登录
        await this.loginAndGetOpenid();
      }

      // 创建支付
      const payRes = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/v1/payments/miniapp/create`,
        method: 'POST',
        data: {
          orderNo: this.data.orderNo,
          wxOpenid: app.getOpenid(),
          wxAppid: app.globalData.appid
        }
      });

      if (payRes.data.code !== 200) {
        throw new Error(payRes.data.message || '创建支付失败');
      }

      const paymentData = payRes.data.data;

      // 调起微信支付
      await wx.requestPayment({
        timeStamp: paymentData.timestamp,
        nonceStr: paymentData.nonceStr,
        package: paymentData.package,
        signType: paymentData.signType || 'RSA',
        paySign: paymentData.paySign || paymentData.sign,
        success: () => {
          // 支付成功，跳转到结果页
          wx.redirectTo({
            url: `/pages/result/result?orderNo=${this.data.orderNo}&status=success`
          });
        },
        fail: (error) => {
          console.error('[支付页面] 支付失败:', error);
          if (error.errMsg.includes('cancel')) {
            wx.showToast({
              title: '支付已取消',
              icon: 'none'
            });
          } else {
            wx.redirectTo({
              url: `/pages/result/result?orderNo=${this.data.orderNo}&status=failed`
            });
          }
        }
      });

    } catch (error) {
      console.error('[支付页面] 创建支付失败:', error);
      wx.showToast({
        title: error.message || '支付失败',
        icon: 'none'
      });
    } finally {
      this.setData({ paying: false });
    }
  },

  // 登录并获取OpenID
  async loginAndGetOpenid() {
    try {
      // 获取登录code
      const loginRes = await wx.login();

      // 获取OpenID
      const res = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/v1/wechat/miniapp/code2session`,
        method: 'GET',
        data: {
          code: loginRes.code
        }
      });

      if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取OpenID失败');
      }

      app.setOpenid(res.data.data.openid);

    } catch (error) {
      console.error('[支付页面] 获取OpenID失败:', error);
      throw error;
    }
  }
});
