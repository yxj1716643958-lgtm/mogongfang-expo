// pages/result/result.js
const app = getApp();

Page({
  data: {
    orderNo: '',
    status: '',
    errorMsg: '',
    loading: true,
    ticketName: '',
    quantity: 0,
    tickets: []
  },

  onLoad(options) {
    console.log('[结果页面] 加载', options);

    const { orderNo, status, errorMsg } = options;

    if (!orderNo) {
      this.setData({
        loading: false,
        errorMsg: '缺少订单信息'
      });
      return;
    }

    this.setData({
      orderNo,
      status: status || 'pending',
      errorMsg: errorMsg || ''
    });

    // 如果状态未知，查询支付状态
    if (!status || status === 'pending') {
      this.checkPaymentStatus();
    } else if (status === 'success') {
      this.loadTickets();
    } else {
      this.setData({ loading: false });
    }
  },

  // 查询支付状态
  async checkPaymentStatus() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/v1/payments/${this.data.orderNo}/status`,
        method: 'GET'
      });

      if (res.data.code !== 200) {
        throw new Error(res.data.message || '查询支付状态失败');
      }

      const paymentStatus = res.data.data.paymentStatus;

      if (paymentStatus === 'PAID') {
        this.setData({ status: 'success' });
        await this.loadTickets();
      } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
        this.setData({ status: 'failed', loading: false });
      } else {
        // 继续轮询
        setTimeout(() => this.checkPaymentStatus(), 2000);
      }

    } catch (error) {
      console.error('[结果页面] 查询支付状态失败:', error);
      this.setData({
        status: 'failed',
        errorMsg: error.message,
        loading: false
      });
    }
  },

  // 加载票券信息
  async loadTickets() {
    try {
      const res = await wx.request({
        url: `${app.globalData.apiBaseUrl}/api/v1/tickets/by-order/${this.data.orderNo}`,
        method: 'GET'
      });

      if (res.data.code !== 200) {
        throw new Error(res.data.message || '获取票券失败');
      }

      const tickets = res.data.data.list || [];

      this.setData({
        tickets,
        quantity: tickets.length,
        ticketName: tickets[0]?.ticketName || '',
        loading: false
      });

    } catch (error) {
      console.error('[结果页面] 加载票券失败:', error);
      this.setData({
        loading: false,
        errorMsg: error.message
      });
    }
  },

  // 查看全部票券
  viewTickets() {
    // 跳转到H5的票券列表页面
    wx.navigateToWebview({
      url: `${app.globalData.h5BaseUrl}/my-tickets.html`
    });
  },

  // 返回H5页面
  backToH5() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 如果无法返回，直接跳转到H5首页
        wx.navigateToWebview({
          url: app.globalData.h5BaseUrl
        });
      }
    });
  },

  // 重新支付
  retryPay() {
    wx.redirectTo({
      url: `/pages/payment/payment?orderNo=${this.data.orderNo}`
    });
  }
});
