/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const { sendCode, login, getCurrentUser, logout } = require('../controllers/authController');

// 发送验证码
router.post('/send-code', sendCode);

// 登录
router.post('/login', login);

// 获取当前用户信息
router.get('/me', getCurrentUser);

// 退出登录
router.post('/logout', logout);

module.exports = router;
