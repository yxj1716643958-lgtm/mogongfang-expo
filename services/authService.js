/**
 * 认证服务
 * 处理用户登录、注册、验证码相关业务逻辑
 */

const { pool } = require('../sqlite-adapter');
const { sendVerificationCode } = require('./smsService');

/**
 * 生成6位随机验证码
 * @returns {string}
 */
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 检查手机号发送频率限制
 * @param {string} mobile - 手机号
 * @returns {Promise<Object>} 限制信息
 */
async function checkSendLimit(mobile) {
    const connection = await pool.getConnection();

    try {
        const now = new Date();

        // 1. 检查1分钟内是否发送过
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
        const [recentRecords] = await connection.query(
            `SELECT COUNT(*) as count FROM sms_codes
             WHERE mobile = ?
               AND created_at > ?
               AND scene = 'login'`,
            [mobile, oneMinuteAgo.toISOString()]
        );

        if (recentRecords[0].count > 0) {
            return {
                allowed: false,
                reason: '1分钟内只能发送一次验证码',
                retryAfter: 60
            };
        }

        // 2. 检查今日发送次数
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const [todayRecords] = await connection.query(
            `SELECT COUNT(*) as count FROM sms_codes
             WHERE mobile = ?
               AND created_at >= ?
               AND scene = 'login'`,
            [mobile, todayStart.toISOString()]
        );

        const DAILY_LIMIT = 10;
        if (todayRecords[0].count >= DAILY_LIMIT) {
            return {
                allowed: false,
                reason: `今日发送次数已达上限(${DAILY_LIMIT}次)`,
                retryAfter: 86400
            };
        }

        // 3. 检查是否有未使用的验证码
        const [unusedRecords] = await connection.query(
            `SELECT * FROM sms_codes
             WHERE mobile = ?
               AND scene = 'login'
               AND is_used = FALSE
               AND expired_at > ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [mobile, now.toISOString()]
        );

        if (unusedRecords.length > 0) {
            // 如果有未过期的未使用验证码，使其失效
            await connection.query(
                `UPDATE sms_codes SET is_used = TRUE WHERE id = ?`,
                [unusedRecords[0].id]
            );
        }

        return {
            allowed: true,
            todayCount: todayRecords[0].count,
            todayLimit: DAILY_LIMIT
        };

    } finally {
        connection.release();
    }
}

/**
 * 发送登录验证码
 * @param {string} mobile - 手机号
 * @param {Object} requestInfo - 请求信息（IP, UA等）
 * @returns {Promise<Object>}
 */
async function sendLoginCode(mobile, requestInfo = {}) {
    // 1. 验证手机号格式
    const mobileRegex = /^1[3-9]\d{9}$/;
    if (!mobileRegex.test(mobile)) {
        return {
            success: false,
            message: '手机号格式不正确'
        };
    }

    // 2. 检查发送频率限制
    const limitCheck = await checkSendLimit(mobile);
    if (!limitCheck.allowed) {
        return {
            success: false,
            message: limitCheck.reason,
            retryAfter: limitCheck.retryAfter
        };
    }

    // 3. 生成验证码
    const code = generateCode();
    const expiredAt = new Date(Date.now() + 5 * 60 * 1000); // 5分钟后过期

    // 4. 存入数据库
    const connection = await pool.getConnection();
    try {
        await connection.query(
            `INSERT INTO sms_codes (mobile, code, scene, expired_at, request_ip, request_ua)
             VALUES (?, ?, 'login', ?, ?, ?)`,
            [mobile, code, expiredAt.toISOString(), requestInfo.ip, requestInfo.ua]
        );
    } catch (error) {
        connection.release();
        console.error('保存验证码失败:', error);
        return {
            success: false,
            message: '保存验证码失败'
        };
    } finally {
        connection.release();
    }

    // 5. 发送短信
    const smsResult = await sendVerificationCode(mobile, code);

    if (!smsResult.success) {
        return {
            success: false,
            message: `短信发送失败: ${smsResult.message}`
        };
    }

    return {
        success: true,
        message: '验证码已发送',
        data: {
            expiredAt: expiredAt.toISOString(),
            todayCount: limitCheck.todayCount + 1,
            todayLimit: limitCheck.todayLimit
        }
    };
}

/**
 * 验证验证码
 * @param {string} mobile - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<Object>}
 */
async function verifyCode(mobile, code) {
    const connection = await pool.getConnection();

    try {
        const now = new Date();

        // 查询最新的有效验证码
        const [records] = await connection.query(
            `SELECT * FROM sms_codes
             WHERE mobile = ?
               AND code = ?
               AND scene = 'login'
               AND is_used = FALSE
               AND expired_at > ?
             ORDER BY created_at DESC
             LIMIT 1`,
            [mobile, code, now.toISOString()]
        );

        if (records.length === 0) {
            // 检查是否有匹配但已过期/已使用的验证码
            const [expiredRecords] = await connection.query(
                `SELECT * FROM sms_codes
                 WHERE mobile = ?
                   AND code = ?
                   AND scene = 'login'
                 ORDER BY created_at DESC
                 LIMIT 1`,
                [mobile, code]
            );

            if (expiredRecords.length > 0) {
                const record = expiredRecords[0];
                if (record.is_used) {
                    return {
                        valid: false,
                        message: '验证码已使用'
                    };
                }
                if (new Date(record.expired_at) <= now) {
                    return {
                        valid: false,
                        message: '验证码已过期'
                    };
                }
            }

            return {
                valid: false,
                message: '验证码错误'
            };
        }

        const record = records[0];

        // 标记验证码已使用
        await connection.query(
            `UPDATE sms_codes SET is_used = TRUE, used_at = ? WHERE id = ?`,
            [now.toISOString(), record.id]
        );

        return {
            valid: true,
            message: '验证码正确',
            recordId: record.id
        };

    } finally {
        connection.release();
    }
}

/**
 * 根据手机号查找或创建用户
 * @param {string} mobile - 手机号
 * @returns {Promise<Object>}
 */
async function findOrCreateUser(mobile) {
    const connection = await pool.getConnection();

    try {
        // 查找用户
        const [users] = await connection.query(
            `SELECT * FROM users WHERE mobile = ? AND status != 'DELETED'`,
            [mobile]
        );

        if (users.length > 0) {
            // 更新最后登录时间
            await connection.query(
                `UPDATE users SET last_login_at = ? WHERE id = ?`,
                [new Date().toISOString(), users[0].id]
            );

            return {
                exists: true,
                user: users[0]
            };
        }

        // 创建新用户
        const [result] = await connection.query(
            `INSERT INTO users (mobile, nickname, last_login_at)
             VALUES (?, ?, ?)`,
            [mobile, `用户${mobile.substring(7)}`, new Date().toISOString()]
        );

        const [newUser] = await connection.query(
            `SELECT * FROM users WHERE id = ?`,
            [result.insertId]
        );

        return {
            exists: false,
            user: newUser[0]
        };

    } finally {
        connection.release();
    }
}

/**
 * 手机号验证码登录
 * @param {string} mobile - 手机号
 * @param {string} code - 验证码
 * @param {Object} loginInfo - 登录信息（IP, UA等）
 * @returns {Promise<Object>}
 */
async function loginWithSms(mobile, code, loginInfo = {}) {
    const connection = await pool.getConnection();

    try {
        // 1. 验证验证码
        const verifyResult = await verifyCode(mobile, code);
        if (!verifyResult.valid) {
            // 记录登录失败日志
            await logLoginAttempt(connection, {
                userId: null,
                mobile,
                success: false,
                failReason: verifyResult.message,
                loginInfo
            });

            return {
                success: false,
                message: verifyResult.message
            };
        }

        // 2. 查找或创建用户
        const userResult = await findOrCreateUser(mobile);

        // 3. 记录登录日志
        await logLoginAttempt(connection, {
            userId: userResult.user.id,
            mobile,
            success: true,
            loginInfo
        });

        // 4. 更新用户最后登录IP
        await connection.query(
            `UPDATE users SET last_login_ip = ? WHERE id = ?`,
            [loginInfo.ip, userResult.user.id]
        );

        // 5. 生成简单token（生产环境应使用JWT）
        const token = generateToken(userResult.user);

        return {
            success: true,
            message: userResult.exists ? '登录成功' : '注册并登录成功',
            data: {
                user: sanitizeUser(userResult.user),
                token: token
            }
        };

    } finally {
        connection.release();
    }
}

/**
 * 记录登录尝试
 */
async function logLoginAttempt(connection, { userId, mobile, success, failReason, loginInfo }) {
    await connection.query(
        `INSERT INTO login_logs (user_id, mobile, login_type, is_success, fail_reason, login_ip, user_agent)
         VALUES (?, ?, 'SMS_CODE', ?, ?, ?, ?)`,
        [userId, mobile, success ? 1 : 0, failReason || null, loginInfo.ip, loginInfo.ua]
    );
}

/**
 * 生成简单token
 * @param {Object} user - 用户对象
 * @returns {string}
 */
function generateToken(user) {
    // 生产环境应使用JWT或其他安全的token方案
    const payload = {
        userId: user.id,
        mobile: user.mobile,
        timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64');
}

/**
 * 验证token
 * @param {string} token - token字符串
 * @returns {Object|null}
 */
function verifyToken(token) {
    try {
        const payload = JSON.parse(Buffer.from(token, 'base64').toString());
        // 检查token是否过期（7天）
        if (Date.now() - payload.timestamp > 7 * 24 * 60 * 60 * 1000) {
            return null;
        }
        return payload;
    } catch {
        return null;
    }
}

/**
 * 脱敏用户信息
 * @param {Object} user - 用户对象
 * @returns {Object}
 */
function sanitizeUser(user) {
    const { id, mobile, nickname, avatar_url, status, created_at } = user;
    return {
        id,
        mobile,
        nickname,
        avatar_url,
        status,
        created_at
    };
}

module.exports = {
    sendLoginCode,
    verifyCode,
    findOrCreateUser,
    loginWithSms,
    verifyToken,
    generateToken
};
