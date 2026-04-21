/**
 * 认证控制器
 * 处理认证相关的HTTP请求
 */

const { sendLoginCode, loginWithSms } = require('../services/authService');

/**
 * 发送验证码接口
 * POST /api/auth/send-code
 */
async function sendCode(req, res) {
    try {
        const { mobile } = req.body;

        // 参数验证
        if (!mobile) {
            return res.json({
                success: false,
                message: '手机号不能为空',
                data: null
            });
        }

        // 获取请求信息
        const requestInfo = {
            ip: req.ip || req.connection.remoteAddress,
            ua: req.get('user-agent')
        };

        // 发送验证码
        const result = await sendLoginCode(mobile, requestInfo);

        return res.json(result);

    } catch (error) {
        console.error('发送验证码失败:', error);
        return res.json({
            success: false,
            message: '服务器错误',
            data: null
        });
    }
}

/**
 * 登录接口
 * POST /api/auth/login
 */
async function login(req, res) {
    try {
        const { mobile, code } = req.body;

        // 参数验证
        if (!mobile || !code) {
            return res.json({
                success: false,
                message: '手机号和验证码不能为空',
                data: null
            });
        }

        if (code.length !== 6) {
            return res.json({
                success: false,
                message: '验证码格式错误',
                data: null
            });
        }

        // 获取请求信息
        const loginInfo = {
            ip: req.ip || req.connection.remoteAddress,
            ua: req.get('user-agent')
        };

        // 登录
        const result = await loginWithSms(mobile, code, loginInfo);

        return res.json(result);

    } catch (error) {
        console.error('登录失败:', error);
        return res.json({
            success: false,
            message: '服务器错误',
            data: null
        });
    }
}

/**
 * 获取当前用户信息
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.json({
                success: false,
                message: '未登录',
                data: null
            });
        }

        const { verifyToken } = require('../services/authService');
        const payload = verifyToken(token);

        if (!payload) {
            return res.json({
                success: false,
                message: '登录已过期',
                data: null
            });
        }

        const { pool } = require('../sqlite-adapter');
        const connection = await pool.getConnection();

        try {
            const [users] = await connection.query(
                `SELECT id, mobile, nickname, avatar_url, status, last_login_at, created_at
                 FROM users WHERE id = ? AND status != 'DELETED'`,
                [payload.userId]
            );

            if (users.length === 0) {
                return res.json({
                    success: false,
                    message: '用户不存在',
                    data: null
                });
            }

            return res.json({
                success: true,
                message: '获取成功',
                data: {
                    user: users[0]
                }
            });

        } finally {
            connection.release();
        }

    } catch (error) {
        console.error('获取用户信息失败:', error);
        return res.json({
            success: false,
            message: '服务器错误',
            data: null
        });
    }
}

/**
 * 退出登录
 * POST /api/auth/logout
 */
async function logout(req, res) {
    // 简单实现：客户端清除token即可
    // 如果需要服务端注销，可以实现token黑名单
    return res.json({
        success: true,
        message: '退出成功',
        data: null
    });
}

module.exports = {
    sendCode,
    login,
    getCurrentUser,
    logout
};
