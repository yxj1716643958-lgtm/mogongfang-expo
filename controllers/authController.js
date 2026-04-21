/**
 * 认证控制器
 * 处理认证相关的HTTP请求
 */

const { sendLoginCode, loginWithSms, registerWithPassword, loginWithPassword, sendResetCode, resetPassword } = require('../services/authService');

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

/**
 * 密码注册接口
 * POST /api/auth/register
 */
async function register(req, res) {
    try {
        const { mobile, password, code, email, userType } = req.body;

        // 参数验证
        if (!mobile || !password || !code) {
            return res.json({
                success: false,
                message: '手机号、密码和验证码不能为空',
                data: null
            });
        }

        // 密码验证
        if (password.length < 6 || password.length > 20) {
            return res.json({
                success: false,
                message: '密码长度应为6-20位',
                data: null
            });
        }

        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return res.json({
                success: false,
                message: '密码需包含字母和数字',
                data: null
            });
        }

        // 获取请求信息
        const loginInfo = {
            ip: req.ip || req.connection.remoteAddress,
            ua: req.get('user-agent')
        };

        // 注册
        const result = await registerWithPassword(mobile, password, code, {
            email,
            userType,
            loginInfo
        });

        if (result.success) {
            // 生成token
            const { generateToken } = require('../services/authService');
            const token = generateToken(result.user);

            return res.json({
                success: true,
                message: result.exists ? '登录成功' : '注册成功',
                data: {
                    user: result.user,
                    token: token
                }
            });
        } else {
            return res.json({
                success: false,
                message: '注册失败',
                data: null
            });
        }

    } catch (error) {
        console.error('注册失败:', error);
        return res.json({
            success: false,
            message: error.message || '服务器错误',
            data: null
        });
    }
}

/**
 * 密码登录接口
 * POST /api/auth/login-password
 */
async function loginPassword(req, res) {
    try {
        const { mobile, password } = req.body;

        // 参数验证
        if (!mobile || !password) {
            return res.json({
                success: false,
                message: '手机号和密码不能为空',
                data: null
            });
        }

        // 获取请求信息
        const loginInfo = {
            ip: req.ip || req.connection.remoteAddress,
            ua: req.get('user-agent')
        };

        // 登录
        const result = await loginWithPassword(mobile, password, loginInfo);

        if (result.success) {
            // 生成token
            const { generateToken } = require('../services/authService');
            const token = generateToken(result.user);

            return res.json({
                success: true,
                message: '登录成功',
                data: {
                    user: result.user,
                    token: token
                }
            });
        } else {
            return res.json({
                success: false,
                message: '登录失败',
                data: null
            });
        }

    } catch (error) {
        console.error('登录失败:', error);
        return res.json({
            success: false,
            message: error.message || '服务器错误',
            data: null
        });
    }
}

/**
 * 发送重置密码验证码
 * POST /api/auth/send-reset-code
 */
async function sendResetCodeHandler(req, res) {
    try {
        const { mobile } = req.body;

        if (!mobile) {
            return res.json({
                success: false,
                message: '手机号不能为空',
                data: null
            });
        }

        const result = await sendResetCode(mobile);
        return res.json(result);

    } catch (error) {
        console.error('发送重置验证码失败:', error);
        return res.json({
            success: false,
            message: '服务器错误',
            data: null
        });
    }
}

/**
 * 重置密码
 * POST /api/auth/reset-password
 */
async function resetPasswordHandler(req, res) {
    try {
        const { mobile, code, newPassword } = req.body;

        // 参数验证
        if (!mobile || !code || !newPassword) {
            return res.json({
                success: false,
                message: '手机号、验证码和新密码不能为空',
                data: null
            });
        }

        // 密码验证
        if (newPassword.length < 6 || newPassword.length > 20) {
            return res.json({
                success: false,
                message: '密码长度应为6-20位',
                data: null
            });
        }

        if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
            return res.json({
                success: false,
                message: '密码需包含字母和数字',
                data: null
            });
        }

        const result = await resetPassword(mobile, code, newPassword);
        return res.json(result);

    } catch (error) {
        console.error('重置密码失败:', error);
        return res.json({
            success: false,
            message: error.message || '服务器错误',
            data: null
        });
    }
}

module.exports = {
    sendCode,
    login,
    getCurrentUser,
    logout,
    register,
    loginPassword,
    sendResetCode: sendResetCodeHandler,
    resetPassword: resetPasswordHandler
};
