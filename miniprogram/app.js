// app.js
App({
  globalData: {
    userInfo: null,
    openid: null,
    orderNo: null,
    appid: 'wx7f9e9cce0d300cd2', // 微信小程序AppID
    apiBaseUrl: 'http://101.200.126.62:3001', // 后端API地址
    h5BaseUrl: 'http://101.200.126.62:8080'   // H5页面地址
  },

  onLaunch(options) {
    console.log('[小程序启动]', options);

    // 从query中获取订单号
    if (options.query && options.query.orderNo) {
      this.globalData.orderNo = options.query.orderNo;
    }

    // 检查更新
    this.checkUpdate();
  },

  onShow(options) {
    console.log('[小程序显示]', options);
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();

      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已准备好，是否重启应用？',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });

          updateManager.onUpdateFailed(() => {
            wx.showModal({
              title: '更新失败',
              content: '新版本下载失败，请检查网络后重试',
              showCancel: false
            });
          });
        }
      });
    }
  },

  // 获取用户信息
  getUserInfo() {
    return this.globalData.userInfo;
  },

  // 设置用户信息
  setUserInfo(userInfo) {
    this.globalData.userInfo = userInfo;
  },

  // 获取OpenID
  getOpenid() {
    return this.globalData.openid;
  },

  // 设置OpenID
  setOpenid(openid) {
    this.globalData.openid = openid;
  }
});
