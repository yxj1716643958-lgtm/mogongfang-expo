/**
 * 认证路由
 */

const express = require('express');
const router = express.Router();
const { sendCode, login, getCurrentUser, logout, register, loginPassword, sendResetCode, resetPassword } = require('../controllers/authController');

// 发送验证码
router.post('/send-code', sendCode);

// 短信验证码登录
router.post('/login', login);

// 密码注册
router.post('/register', register);

// 密码登录
router.post('/login-password', loginPassword);

// 发送重置密码验证码
router.post('/send-reset-code', sendResetCode);

// 重置密码
router.post('/reset-password', resetPassword);

// 获取当前用户信息
router.get('/me', getCurrentUser);

// 退出登录
router.post('/logout', logout);

module.exports = router;
