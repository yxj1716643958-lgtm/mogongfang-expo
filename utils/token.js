/**
 * Token 工具函数
 * 用于生成和验证票券二维码的加密token
 */

const crypto = require('crypto');

// 密钥配置（生产环境应从环境变量读取）
const SECRET_KEY = process.env.TOKEN_SECRET_KEY || 'ne_expo_ticket_secret_key_2024';

/**
 * 生成票券二维码token
 * @param {string} ticketNo - 票号
 * @param {Date} expireTime - 过期时间
 * @returns {string} Base64编码的token
 */
function generateTicketCode(ticketNo, expireTime) {
    try {
        const payload = {
            tno: ticketNo,
            exp: Math.floor(expireTime.getTime() / 1000)
        };

        const json = JSON.stringify(payload);
        const token = Buffer.from(json).toString('base64');

        return token;
    } catch (error) {
        console.error('生成票券token失败:', error);
        throw new Error('生成票券token失败');
    }
}

/**
 * 验证票券二维码token
 * @param {string} qrContent - 二维码内容
 * @returns {Object} 验证结果 { valid: boolean, ticketNo?: string, error?: string }
 */
function verifyTicketCode(qrContent) {
    try {
        // 解析Base64
        const json = Buffer.from(qrContent, 'base64').toString();
        const payload = JSON.parse(json);

        // 验证结构
        if (!payload.tno || !payload.exp) {
            return { valid: false, error: 'INVALID_TOKEN' };
        }

        // 检查过期时间
        const now = Math.floor(Date.now() / 1000);
        if (now > payload.exp) {
            return { valid: false, error: 'EXPIRED' };
        }

        return { valid: true, ticketNo: payload.tno };
    } catch (error) {
        console.error('验证票券token失败:', error);
        return { valid: false, error: 'INVALID_TOKEN' };
    }
}

/**
 * 生成短码（用于手动输入）
 * @param {string} ticketNo - 票号
 * @returns {string} 短码
 */
function generateShortCode(ticketNo) {
    // 截取票号后8位作为短码
    return ticketNo.substring(ticketNo.length - 8);
}

/**
 * 生成HMAC签名
 * @param {string} data - 待签名数据
 * @returns {string} 签名
 */
function generateSignature(data) {
    return crypto.createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
}

/**
 * 验证签名
 * @param {string} data - 原始数据
 * @param {string} signature - 签名
 * @returns {boolean} 验证结果
 */
function verifySignature(data, signature) {
    const expectedSignature = generateSignature(data);
    return signature === expectedSignature;
}

/**
 * 从token中提取票号
 * @param {string} qrContent - 二维码内容
 * @returns {string|null} 票号
 */
function extractTicketNo(qrContent) {
    const result = verifyTicketCode(qrContent);
    return result.valid ? result.ticketNo : null;
}

module.exports = {
    generateTicketCode,
    verifyTicketCode,
    generateShortCode,
    generateSignature,
    verifySignature,
    extractTicketNo
};
