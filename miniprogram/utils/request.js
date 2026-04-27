// utils/request.js - API请求封装
const app = getApp();

/**
 * 发起HTTP请求
 */
function request(options) {
  const { url, method = 'GET', data = {}, header = {} } = options;

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl}${url}`,
      method,
      data,
      header: {
        'content-type': 'application/json',
        ...header
      },
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          if (res.data.code === 200) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.message || '请求失败'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail(err) {
        reject(err);
      }
    });
  });
}

/**
 * GET请求
 */
function get(url, data = {}) {
  return request({ url, method: 'GET', data });
}

/**
 * POST请求
 */
function post(url, data = {}) {
  return request({ url, method: 'POST', data });
}

module.exports = {
  request,
  get,
  post
};
