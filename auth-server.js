/**
 * 认证服务器
 * 提供手机号验证码登录功能
 * 端口: 3002
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.AUTH_PORT || 3002;

// ==================== 中间件 ====================

// CORS
app.use(cors({
    origin: '*',
    credentials: true
}));

// JSON解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 获取真实IP
app.set('trust proxy', true);

// ==================== 路由 ====================

// 健康检查
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: '认证服务运行中',
        data: {
            timestamp: new Date().toISOString(),
            service: 'auth-service'
        }
    });
});

// API路由
app.use('/api/auth', require('./routes/authRoutes'));

// 404处理
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在',
        data: null
    });
});

// 错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: err.message || '服务器错误',
        data: null
    });
});

// ==================== 启动服务 ====================

app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║              认证服务 - 手机号验证码登录系统                    ║');
    console.log('║              Auth Service - SMS Login System                   ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   服务运行中: http://localhost:${PORT}`);
    console.log('');
    console.log('   可用接口:');
    console.log(`     • POST   /api/auth/send-code  - 发送验证码`);
    console.log(`     • POST   /api/auth/login      - 手机号登录`);
    console.log(`     • GET    /api/auth/me         - 获取用户信息`);
    console.log(`     • POST   /api/auth/logout     - 退出登录`);
    console.log(`     • GET    /health              - 健康检查`);
    console.log('');
});

module.exports = app;
