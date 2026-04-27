/**
 * 东北亚数字文创博览会 - 票务系统后端服务
 *
 * 功能：
 * - 订单管理
 * - 支付处理（汇付天下/微信支付）
 * - 票券管理
 * - 邀请函申请
 * - 核销接口
 *
 * 环境变量：
 * - DB_HOST: 数据库主机
 * - DB_PORT: 数据库端口
 * - DB_USER: 数据库用户
 * - DB_PASSWORD: 数据库密码
 * - DB_NAME: 数据库名称
 * - SERVER_PORT: 服务器端口（默认3001）
 * - QR_SECRET_KEY: 二维码加密密钥
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cors = require('cors');
const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// ==================== 数据库配置 ====================
// 使用SQLite适配器
const { pool } = require('./sqlite-adapter');
const { initDatabase } = require('./sqlite-db');

// 初始化数据库
initDatabase();

// ==================== 票种配置 ====================
const TICKET_TYPES = {
    'EARLY_BIRD': {
        id: 1,
        name: '早鸟体验票',
        code: 'EARLY_BIRD',
        price: 3990,  // 单位：分
        category: 'PAID'
    },
    'VIP': {
        id: 2,
        name: '至尊VIP票',
        code: 'VIP',
        price: 19900,
        category: 'PAID'
    },
    'INVITATION': {
        id: 3,
        name: '邀请函票',
        code: 'INVITATION',
        price: 0,
        category: 'INVITATION'
    }
};

// ==================== 工具函数 ====================

/**
 * 身份证加密工具类
 */
class IdCardUtils {
    static SECRET = process.env.ID_CARD_SECRET || 'expo-invitation-secret-2024';

    /**
     * 加密身份证号
     */
    static encrypt(idCard) {
        if (!idCard) return null;
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.SECRET.padEnd(32).substring(0, 32)), iv);
        let encrypted = cipher.update(idCard, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    /**
     * 解密身份证号
     */
    static decrypt(encrypted) {
        if (!encrypted) return null;
        try {
            const parts = encrypted.split(':');
            const iv = Buffer.from(parts[0], 'hex');
            const encryptedData = parts[1];
            const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.SECRET.padEnd(32).substring(0, 32)), iv);
            let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            console.error('身份证解密失败:', e);
            return null;
        }
    }

    /**
     * 身份证哈希（用于验证唯一性）
     */
    static hash(idCard) {
        if (!idCard) return null;
        return crypto.createHash('sha256').update(idCard).digest('hex');
    }

    /**
     * 身份证脱敏显示
     */
    static mask(idCard) {
        if (!idCard || idCard.length !== 18) return idCard;
        return idCard.substring(0, 6) + '********' + idCard.substring(14);
    }

    /**
     * 验证身份证号格式
     */
    static validate(idCard) {
        if (!idCard) return false;
        // 18位身份证正则
        const regex = /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
        return regex.test(idCard);
    }
}

/**
 * 生成订单号
 */
function generateOrderNo() {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NE${timestamp}${random}`;
}

/**
 * 生成票号
 */
function generateTicketNo() {
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `TK${dateStr}${random}`;
}

/**
 * 生成申请单号
 */
function generateApplicationNo() {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV${timestamp}${random}`;
}

/**
 * 生成二维码token（简单版，生产环境应使用加密）
 */
function generateQRCodeToken(ticketNo) {
    const data = {
        ticketNo,
        timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * 生成短码
 */
function generateShortCode(ticketNo) {
    // 简化版：截取票号后8位
    return ticketNo.substring(ticketNo.length - 8);
}

/**
 * 手机号脱敏
 */
function maskPhone(phone) {
    if (!phone || phone.length !== 11) return phone;
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
}

/**
 * 标准响应
 */
function successResponse(data, message = '成功') {
    return {
        code: 'SUCCESS',
        message,
        data
    };
}

function errorResponse(message, code = 'FAIL') {
    return {
        code,
        message
    };
}

// ==================== 汇付天下配置 ====================
const HUIFU_CONFIG = {
    merchantId: process.env.HUIFU_MERCHANT_ID || '',
    sysId: process.env.HUIFU_SYS_ID || '',
    appId: process.env.HUIFU_APP_ID || '',
    privateKey: process.env.HUIFU_PRIVATE_KEY || '',
    publicKey: process.env.HUIFU_PUBLIC_KEY || '',
    notifyUrl: process.env.HUIFU_NOTIFY_URL || 'http://localhost:3001/api/v1/payments/huifu/notify',
    returnUrl: process.env.HUIFU_RETURN_URL || 'http://localhost:8080/payment-result.html',
    gatewayUrl: process.env.HUIFU_GATEWAY_URL || 'https://paas.huifu.com',
    environment: process.env.HUIFU_ENVIRONMENT || 'PRODUCTION'
};

/**
 * 验证汇付配置完整性
 */
function validateHuifuConfig() {
    const required = ['merchantId', 'appId', 'privateKey', 'publicKey'];
    const missing = required.filter(key => !HUIFU_CONFIG[key]);

    if (missing.length > 0) {
        console.warn(`汇付天下配置缺失: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

// ==================== 汇付天下签名工具类 ====================
/**
 * 汇付天下RSA签名工具类
 */
class HuifuSignUtils {

    /**
     * 生成RSA签名
     * @param {string} data - 待签名数据（JSON字符串）
     * @param {string} privateKey - 商户RSA私钥
     * @returns {string} Base64编码的签名
     */
    static sign(data, privateKey) {
        try {
            console.log('[签名调试] 待签名数据长度:', data.length);
            console.log('[签名调试] 私钥长度:', privateKey?.length);

            // 尝试多种私钥格式
            const formats = this.formatPrivateKey(privateKey);
            console.log('[签名调试] 生成了', formats.length, '种密钥格式');

            for (let i = 0; i < formats.length; i++) {
                const format = formats[i];
                console.log(`[签名调试] 尝试第${i+1}种格式`);

                // 尝试多种签名方法（兼容Node.js 20+）
                const methods = [
                    // 方法1: crypto.sign with RSA_PKCS1_PADDING
                    () => {
                        const buffer = Buffer.from(data, 'utf8');
                        return crypto.sign('sha256', buffer, {
                            key: format,
                            padding: crypto.constants.RSA_PKCS1_PADDING
                        }).toString('base64');
                    },
                    // 方法2: 传统的createSign（回退方案）
                    () => {
                        const sign = crypto.createSign('SHA256');
                        sign.update(data, 'utf8');
                        return sign.sign(format, 'base64');
                    }
                ];

                for (let j = 0; j < methods.length; j++) {
                    try {
                        const signature = methods[j]();
                        console.log(`[签名] 使用方法${j+1}成功`);
                        return signature;
                    } catch (e) {
                        console.log(`[签名] 方法${j+1}失败: ${e.message}`);
                        continue;
                    }
                }
            }

            throw new Error('所有密钥格式均失败');
        } catch (error) {
            console.error('RSA签名失败:', error);
            throw new Error('签名失败');
        }
    }

    /**
     * 验证RSA签名
     * @param {string} data - 原始数据
     * @param {string} publicKey - 汇付公钥
     * @param {string} signature - 签名值
     * @returns {boolean} 验证结果
     */
    static verify(data, publicKey, signature) {
        try {
            const formats = this.formatPublicKey(publicKey);

            for (const format of formats) {
                try {
                    const verify = crypto.createVerify('SHA256');
                    verify.update(data, 'utf8');
                    const result = verify.verify(format, signature, 'base64');
                    if (result) {
                        console.log('[验签] 公钥格式验证成功');
                        return true;
                    }
                } catch (e) {
                    console.log(`[验签] 尝试公钥格式失败: ${e.message}`);
                    continue;
                }
            }

            return false;
        } catch (error) {
            console.error('RSA验签失败:', error);
            return false;
        }
    }

    /**
     * 格式化私钥（返回多种可能的格式）
     * @param {string} key - 私钥（可能不含PEM头尾）
     * @returns {string[]} 格式化后的私钥数组（尝试多种格式）
     */
    static formatPrivateKey(key) {
        if (!key) return [''];
        if (key.includes('-----BEGIN')) {
            return [key];
        }
        // Base64编码的密钥，每64字符换行
        const cleanKey = key.replace(/\s/g, '');
        const formattedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;

        // 返回多种格式：PKCS#8 和 PKCS#1
        return [
            `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`,
            `-----BEGIN RSA PRIVATE KEY-----\n${formattedKey}\n-----END RSA PRIVATE KEY-----`
        ];
    }

    /**
     * 格式化公钥（返回多种可能的格式）
     * @param {string} key - 公钥（可能不含PEM头尾）
     * @returns {string[]} 格式化后的公钥数组（尝试多种格式）
     */
    static formatPublicKey(key) {
        if (!key) return [''];
        if (key.includes('-----BEGIN')) {
            return [key];
        }
        // Base64编码的密钥，每64字符换行
        const cleanKey = key.replace(/\s/g, '');
        const formattedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;

        // 返回多种格式
        return [
            `-----BEGIN PUBLIC KEY-----\n${formattedKey}\n-----END PUBLIC KEY-----`,
            `-----BEGIN RSA PUBLIC KEY-----\n${formattedKey}\n-----END RSA PUBLIC KEY-----`
        ];
    }

    /**
     * 生成请求流水号
     * 格式: 时间戳(13位) + 随机数(6位)
     * @returns {string} 请求流水号
     */
    static generateReqSeqId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `${timestamp}${random}`;
    }
}

// ==================== 汇付天下HTTP请求客户端 ====================
/**
 * 汇付天下HTTP请求客户端
 */
class HuifuHttpClient {

    /**
     * 发送汇付API请求（支持V1和V2格式）
     * @param {string} apiUrl - API路径
     * @param {Object} requestData - 请求数据
     * @param {string} method - HTTP方法
     * @returns {Promise<Object>} 响应结果
     */
    static async request(apiUrl, requestData, method = 'POST') {
        try {
            // 序列化请求数据
            console.log('[汇付请求] 开始序列化请求数据...');
            const dataStr = JSON.stringify(requestData);
            console.log('[汇付请求] 序列化成功，长度:', dataStr.length);
            console.log('[汇付请求] 序列化结果前200字符:', dataStr.substring(0, 200));

            // 生成签名
            console.log('[汇付请求] 开始生成签名...');
            const sign = HuifuSignUtils.sign(dataStr, HUIFU_CONFIG.privateKey);
            console.log('[汇付请求] 签名成功，长度:', sign.length);

            // 构建完整请求体（V1和V2格式兼容）
            const requestBody = {
                req_data: dataStr,
                sign: sign
            };

            // 构建完整URL
            const url = HUIFU_CONFIG.gatewayUrl + apiUrl;

            console.log(`[汇付请求] ${method} ${url}`);
            console.log(`[汇付请求数据]`, JSON.stringify(requestData, null, 2));

            // 设置超时控制
            const AbortController = globalThis.AbortController || (await import('abort-controller')).default;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000);

            // 发送HTTPS请求
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: method === 'POST' ? JSON.stringify(requestBody) : undefined,
                signal: controller.signal
            });

            clearTimeout(timeout);

            // 检查响应状态
            if (!response.ok) {
                const text = await response.text();
                console.error(`[汇付错误] HTTP ${response.status}: ${text}`);
                throw new Error(`汇付API返回错误: ${response.status} ${response.statusText}`);
            }

            // 检查响应内容类型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error(`[汇付错误] 非JSON响应: ${contentType}`);
                console.error(`[汇付错误] 响应内容: ${text.substring(0, 500)}`);
                throw new Error(`汇付API返回非JSON响应: ${contentType}`);
            }

            const result = await response.json();

            console.log(`[汇付响应]`, JSON.stringify(result, null, 2));

            // 验证响应签名（支持V1格式）
            if (result.resp_data && result.sign) {
                const isValid = HuifuSignUtils.verify(
                    result.resp_data,
                    HUIFU_CONFIG.publicKey,
                    result.sign
                );

                if (!isValid) {
                    console.error('汇付响应签名验证失败');
                    throw new Error('响应签名验证失败');
                }
                console.log('[汇付响应] 签名验证通过');
            }

            // 解析响应数据（支持多种格式）
            if (result.resp_data) {
                // V1格式：数据在resp_data字段中
                try {
                    result.data = JSON.parse(result.resp_data);
                } catch (e) {
                    console.error('解析resp_data失败:', e);
                }
            } else if (result.data && typeof result.data === 'string') {
                // V2格式：data可能是JSON字符串
                try {
                    result.data = JSON.parse(result.data);
                } catch (e) {
                    // 保持原样
                }
            } else if (!result.data && result.resp_code) {
                // V2格式：直接在根级别
                result.data = result;
            }

            return result;

        } catch (error) {
            console.error('汇付API请求失败:', error);
            throw error;
        }
    }
}

// ==================== 汇付天下请求数据构建器 ====================
/**
 * 汇付天下请求数据构建工具
 */
class HuifuRequestBuilder {

    /**
     * 构建聚合正扫支付下单请求（斗拱平台V2 API）
     * @param {Object} params - 订单参数
     * @returns {Object} 包含url和requestData的对象
     */
    static buildOrderRequest(params) {
        const {
            orderNo,           // 商户订单号
            transAmt,          // 交易金额（分）
            goodsDesc = '门票', // 商品描述
            userInfo = {},     // 用户信息
            clientIp = '127.0.0.1',
            paymentMethod = 'HUIFU_H5' // 支付方式
        } = params;

        const reqDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reqSeqId = HuifuSignUtils.generateReqSeqId();

        // 计算过期时间（30分钟后）
        const expireTime = new Date(Date.now() + 30 * 60 * 1000);
        const expireTimeStr = expireTime.toISOString().slice(0, 19).replace('T', ' ');

        // 确定预下单类型
        // 1: H5支付、PC支付
        // 2: 支付宝小程序
        // 3: 微信小程序
        let preOrderType = '1'; // 默认H5支付
        let acctSplitBunch = '';

        // 根据支付方式设置预下单类型
        if (paymentMethod === 'WECHAT_MINIAPP') {
            preOrderType = '3'; // 微信小程序
            if (params.wxAppid && params.wxOpenid) {
                acctSplitBunch = JSON.stringify({
                    sub_appid: params.wxAppid,
                    sub_openid: params.wxOpenid
                });
            }
        } else if (paymentMethod === 'ALIPAY_MINIAPP') {
            preOrderType = '2'; // 支付宝小程序
        }

        // 构建请求数据（斗拱平台托管收银台预下单接口）
        const requestData = {
            req_seq_id: reqSeqId,
            req_date: reqDate,
            huifu_id: HUIFU_CONFIG.merchantId,
            pre_order_type: preOrderType,
            trans_amt: transAmt.toString(),
            goods_desc: goodsDesc,
            mer_ord_id: orderNo,
            time_expire: expireTimeStr,
            notify_url: HUIFU_CONFIG.notifyUrl,
            risk_check_data: JSON.stringify({
                user_info: {
                    user_name: userInfo.name || '',
                    user_mobile: userInfo.phone || '',
                    user_email: userInfo.email || ''
                }
            })
        };

        // 添加微信小程序等额外数据
        if (acctSplitBunch) {
            requestData.acct_split_bunch = acctSplitBunch;
        }

        return {
            url: '/v2/trade/hosting/payment/preorder',
            requestData,
            reqSeqId,
            reqDate
        };
    }

    /**
     * 构建订单查询请求
     * @param {string} orderNo - 商户订单号
     * @returns {Object} 请求数据
     */
    static buildQueryRequest(orderNo) {
        const reqDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reqSeqId = HuifuSignUtils.generateReqSeqId();

        return {
            req_seq_id: reqSeqId,
            req_date: reqDate,
            huifu_id: HUIFU_CONFIG.merchantId,
            mer_ord_id: orderNo
        };
    }
}

// ==================== 中间件 ====================
// 静态文件服务
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 配置 - 允许 Vercel 和本地开发
const allowedOrigins = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'http://101.200.126.62:8080',
    'https://www.uka-hc.com',
    'https://uka-hc.com'
];

app.use(cors({
    origin: function(origin, callback) {
        // 允许没有 origin 的请求（如移动应用、Postman等）
        if (!origin) return callback(null, true);

        // 开发环境允许所有本地请求
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        // 生产环境检查白名单
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            // 暂时允许所有源（方便测试）
            // 生产环境应该取消注释下面这行
            // callback(new Error('CORS not allowed'));
            callback(null, true);
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求日志
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    const huifuConfigured = validateHuifuConfig();
    const config = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'SQLite',
        huifu: huifuConfigured ? 'configured' : 'not_configured',
        huifuGateway: HUIFU_CONFIG.gatewayUrl,
        huifuEnvironment: HUIFU_CONFIG.environment,
        paymentDebugMode: process.env.PAYMENT_DEBUG_MODE === 'true'
    };

    res.json(successResponse(config, '服务运行正常'));
});

// ==================== 订单模块 ====================

/**
 * 创建订单
 */
app.post('/api/v1/orders', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { ticketTypeCode, quantity = 1, userInfo } = req.body;

        // 验证参数
        if (!ticketTypeCode || !userInfo || !userInfo.name || !userInfo.phone) {
            throw new Error('参数不完整');
        }

        // 获取票种信息
        const ticketType = TICKET_TYPES[ticketTypeCode];
        if (!ticketType) {
            throw new Error('无效的票种');
        }

        const totalAmount = ticketType.price * quantity;

        // 生成订单号
        const orderNo = generateOrderNo();

        // 创建订单
        const [orderResult] = await connection.query(
            `INSERT INTO orders (
                order_no, user_name, user_phone, user_email,
                order_type, total_amount, ticket_type_id,
                ticket_quantity, ticket_info, order_status,
                payment_status, expired_at, client_ip
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                orderNo,
                userInfo.name,
                userInfo.phone,
                userInfo.email || null,
                ticketType.category,
                totalAmount / 100,  // 转换为元
                ticketType.id,
                quantity,
                JSON.stringify({
                    ticketCode: ticketType.code,
                    ticketName: ticketType.name,
                    price: ticketType.price
                }),
                ticketType.category === 'PAID' ? 'PENDING' : 'PAID',
                ticketType.category === 'PAID' ? 'UNPAID' : 'PAID',
                new Date(Date.now() + 30 * 60 * 1000).toISOString(),  // 30分钟后过期
                req.ip || null
            ]
        );

        const orderId = orderResult.insertId;

        // 免费票直接出票
        let tickets = [];
        if (ticketType.category !== 'PAID') {
            tickets = await issueTickets(connection, {
                orderId,
                orderNo,
                ticketTypeId: ticketType.id,
                ticketType,
                userInfo,
                quantity
            });
        }

        await connection.commit();

        res.json(successResponse({
            orderId,
            orderNo,
            totalAmount: totalAmount / 100,
            orderStatus: ticketType.category === 'PAID' ? 'PENDING' : 'PAID',
            paymentStatus: ticketType.category === 'PAID' ? 'UNPAID' : 'PAID',
            expiredAt: new Date(Date.now() + 30 * 60 * 1000),
            tickets
        }, '订单创建成功'));

    } catch (error) {
        await connection.rollback();
        console.error('创建订单失败:', error);
        res.status(400).json(errorResponse(error.message || '创建订单失败'));
    } finally {
        connection.release();
    }
});

/**
 * 查询订单
 */
app.get('/api/v1/orders/:orderNo', async (req, res) => {
    try {
        const { orderNo } = req.params;

        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        if (orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        // 查询票券信息
        const [tickets] = await pool.query(
            'SELECT ticket_no, ticket_name, ticket_status, verified_at FROM tickets WHERE order_no = ?',
            [orderNo]
        );

        res.json(successResponse({
            ...order,
            tickets
        }));

    } catch (error) {
        console.error('查询订单失败:', error);
        res.status(500).json(errorResponse('查询订单失败'));
    }
});

/**
 * 取消订单
 */
app.post('/api/v1/orders/:orderNo/cancel', async (req, res) => {
    try {
        const { orderNo } = req.params;

        const [result] = await pool.query(
            `UPDATE orders SET order_status = 'CANCELLED'
             WHERE order_no = ? AND order_status = 'PENDING'`,
            [orderNo]
        );

        if (result.affectedRows === 0) {
            return res.status(400).json(errorResponse('订单不存在或无法取消'));
        }

        res.json(successResponse(null, '订单已取消'));

    } catch (error) {
        console.error('取消订单失败:', error);
        res.status(500).json(errorResponse('取消订单失败'));
    }
});

// ==================== 支付模块 ====================

/**
 * 创建汇付H5支付订单
 */
app.post('/api/v1/payments/huifu/create', async (req, res) => {
    console.log('[支付创建] 请求收到:', JSON.stringify(req.body));
    let connection;
    try {
        console.log('[支付创建] 获取数据库连接...');
        connection = await pool.getConnection();
        console.log('[支付创建] 数据库连接成功');

        console.log('[支付创建] 开始事务...');
        await connection.beginTransaction();
        console.log('[支付创建] 事务开始成功');

        const { orderNo, paymentMethod = 'HUIFU_H5', returnUrl } = req.body;

        // ============ 支付调试模式 ============
        const paymentDebugMode = process.env.PAYMENT_DEBUG_MODE === 'true';

        if (paymentDebugMode) {
            console.log('[支付调试] 调试模式已开启，跳过真实支付');

            // 查询订单
            const [orders] = await connection.query(
                'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
                [orderNo]
            );

            if (orders.length === 0) {
                throw new Error('订单不存在');
            }

            const order = orders[0];

            if (order.payment_status === 'PAID') {
                throw new Error('订单已支付');
            }

            // 解析票种信息
            const ticketInfo = JSON.parse(order.ticket_info);

            // 直接模拟支付成功，更新订单状态
            await connection.query(
                `UPDATE orders SET
                    order_status = 'PAID',
                    payment_status = 'PAID',
                    paid_amount = ?,
                    transaction_id = ?,
                    paid_at = datetime('now')
                WHERE id = ?`,
                [order.total_amount, 'DEBUG_' + Date.now(), order.id]
            );

            // 出票
            const tickets = await issueTickets(connection, {
                orderId: order.id,
                orderNo: order.order_no,
                ticketTypeId: order.ticket_type_id,
                ticketType: {
                    code: ticketInfo.ticketCode,
                    name: ticketInfo.ticketName,
                    price: ticketInfo.price,
                    category: order.order_type
                },
                userInfo: {
                    name: order.user_name,
                    phone: order.user_phone,
                    userId: order.user_id
                },
                quantity: order.ticket_quantity
            });

            await connection.commit();

            console.log(`[支付调试] 订单支付成功并已出票: ${orderNo}, 票券数量: ${tickets.length}`);

            // 返回模拟支付结果
            return res.json(successResponse({
                paymentId: 'DEBUG_' + Date.now(),
                orderNo: orderNo,
                debugMode: true,
                message: '调试模式：已跳过真实支付，票券已生成',
                tickets: tickets.map(t => ({
                    ticketNo: t.ticketNo,
                    qrCodeToken: t.qrCodeToken
                }))
            }, '支付订单创建成功（调试模式）'));
        }

        // ============ 正常支付流程 ============
        // 验证汇付配置
        if (!validateHuifuConfig()) {
            throw new Error('汇付天下配置不完整');
        }

        // 1. 查询订单信息（带锁）
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (orders.length === 0) {
            throw new Error('订单不存在');
        }

        const order = orders[0];

        // 2. 验证订单状态
        if (order.order_status !== 'PENDING') {
            throw new Error('订单状态不允许支付');
        }

        if (order.payment_status === 'PAID') {
            throw new Error('订单已支付');
        }

        // 3. 检查订单是否过期
        if (order.expired_at && new Date() > new Date(order.expired_at)) {
            await connection.query(
                'UPDATE orders SET order_status = ? WHERE order_no = ?',
                ['EXPIRED', orderNo]
            );
            throw new Error('订单已过期');
        }

        // 4. 解析票种信息
        const ticketInfo = JSON.parse(order.ticket_info);

        // 5. 构建汇付请求
        const orderRequest = HuifuRequestBuilder.buildOrderRequest({
            orderNo: orderNo,
            transAmt: Math.round(order.total_amount * 100),  // 转换为分
            goodsDesc: ticketInfo.ticketName || '门票',
            userInfo: {
                name: order.user_name,
                phone: order.user_phone,
                email: order.user_email
            },
            clientIp: req.ip || '127.0.0.1'
        });

        // 6. 调用汇付下单接口
        const huifuResult = await HuifuHttpClient.request(
            orderRequest.url,
            orderRequest.requestData
        );

        // 7. 处理汇付响应（支持V1和V2格式）
        const isSuccess = huifuResult.data && (
            huifuResult.data.resp_code === '00000000' ||  // V1格式
            huifuResult.data.resp_code === '0000' ||      // V2格式
            huifuResult.data.code === '0000'              // 其他V2变体
        );

        if (isSuccess) {
            // 下单成功，保存支付记录
            await connection.query(
                `INSERT INTO payment_records (
                    order_id, order_no, transaction_id,
                    payment_channel, payment_method,
                    order_amount, paid_amount,
                    payment_status, third_party_no,
                    third_party_data, client_ip
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    order.id,
                    orderNo,
                    orderRequest.reqSeqId,
                    'HUIFU',
                    paymentMethod,
                    order.total_amount,
                    order.total_amount,
                    'PENDING',
                    huifuResult.data.hf_seq_id || huifuResult.data.seq_id || orderRequest.reqSeqId,
                    JSON.stringify(huifuResult.data),
                    req.ip || null
                ]
            );

            await connection.commit();

            // 返回支付URL（支持多种可能的字段名）
            const paymentUrl = huifuResult.data.pay_url ||
                              huifuResult.data.url ||
                              huifuResult.data.payment_url ||
                              huifuResult.data.cashier_url;

            if (!paymentUrl) {
                console.error('[支付创建] 响应中没有找到支付URL:', JSON.stringify(huifuResult.data));
                throw new Error('汇付响应未返回支付URL');
            }

            res.json(successResponse({
                paymentId: orderRequest.reqSeqId,
                orderNo: orderNo,
                paymentUrl: paymentUrl,
                expiredAt: order.expired_at
            }, '支付订单创建成功'));

        } else {
            const errorMsg = huifuResult.data?.resp_desc ||
                           huifuResult.data?.resp_msg ||
                           huifuResult.data?.message ||
                           '汇付下单失败';
            throw new Error(errorMsg);
        }

    } catch (error) {
        console.error('[支付创建] 错误详情:', error);
        console.error('[支付创建] 错误堆栈:', error.stack);
        console.error('[支付创建] 错误消息:', error.message);
        if (connection) {
            await connection.rollback();
        }
        res.status(400).json(errorResponse(error.message || '创建支付失败'));
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

/**
 * 查询支付状态
 */
app.get('/api/v1/payments/:orderNo/status', async (req, res) => {
    try {
        const { orderNo } = req.params;

        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        if (orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        res.json(successResponse({
            orderNo: order.order_no,
            paymentStatus: order.payment_status,
            orderStatus: order.order_status,
            paidAmount: order.paid_amount || 0,
            paidAt: order.paid_at
        }));

    } catch (error) {
        console.error('查询支付状态失败:', error);
        res.status(500).json(errorResponse('查询支付状态失败'));
    }
});

/**
 * 主动查询汇付支付状态
 */
app.get('/api/v1/payments/huifu/query/:orderNo', async (req, res) => {
    try {
        const { orderNo } = req.params;

        // 验证汇付配置
        if (!validateHuifuConfig()) {
            return res.status(400).json(errorResponse('汇付天下配置不完整'));
        }

        // 查询本地订单
        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        if (orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        // 如果本地已支付，直接返回
        if (order.payment_status === 'PAID') {
            return res.json(successResponse({
                orderNo: order.order_no,
                paymentStatus: 'PAID',
                orderStatus: order.order_status,
                paidAmount: order.paid_amount,
                paidAt: order.paid_at
            }));
        }

        // 调用汇付查询接口
        const queryRequest = HuifuRequestBuilder.buildQueryRequest(orderNo);
        const result = await HuifuHttpClient.request(
            '/gateway/api/rest/api/transaction/query',
            queryRequest
        );

        if (result.data && result.data.resp_code === '00000000') {
            const { trans_stat, trans_amt, hf_seq_id } = result.data;

            return res.json(successResponse({
                orderNo: orderNo,
                paymentStatus: trans_stat === 'S' ? 'PAID' : 'PAYING',
                orderStatus: trans_stat === 'S' ? 'PAID' : 'PENDING',
                paidAmount: trans_amt ? parseFloat(trans_amt) / 100 : 0,
                transStat: trans_stat,
                huifuSeqId: hf_seq_id
            }));
        } else {
            return res.json(errorResponse(result.data?.resp_desc || '查询失败'));
        }

    } catch (error) {
        console.error('查询汇付支付状态失败:', error);
        res.status(500).json(errorResponse('查询支付状态失败'));
    }
});

/**
 * 汇付支付异步回调处理
 *
 * 关键安全措施：
 * 1. 签名验证：使用汇付公钥验证回调签名
 * 2. 金额校验：比对订单金额和回调金额，防止篡改
 * 3. 幂等处理：使用数据库锁和状态检查，避免重复出票
 * 4. 响应格式：返回 RECV_ORD_ID_ + 订单号
 */
app.post('/api/v1/payments/huifu/notify', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. 获取回调参数（支持V1和V2格式）
        let respData = req.body.resp_data;
        let sign = req.body.sign;

        // V2格式：数据可能直接在body中
        if (!respData && !sign) {
            // 尝试V2格式处理
            const v2Data = req.body.data || req.body;
            if (typeof v2Data === 'string') {
                respData = v2Data;
            } else {
                respData = JSON.stringify(v2Data);
            }
            sign = req.body.sign || req.body.signature;
        }

        if (!respData || !sign) {
            console.error('[汇付回调] 参数缺失');
            console.error('[汇付回调] 请求体:', JSON.stringify(req.body));
            return res.status(400).send('Bad Request');
        }

        console.log('[汇付回调] 收到异步通知');

        // 2. 验证签名（关键安全措施）
        const isValid = HuifuSignUtils.verify(
            respData,
            HUIFU_CONFIG.publicKey,
            sign
        );

        if (!isValid) {
            console.error('[汇付回调] 签名验证失败');
            return res.status(401).send('Sign Verify Failed');
        }

        console.log('[汇付回调] 签名验证通过');

        // 3. 解析回调数据（支持JSON字符串和已解析的对象）
        let callbackData;
        if (typeof respData === 'string') {
            callbackData = JSON.parse(respData);
        } else {
            callbackData = respData;
        }

        // 支持多种可能的字段名（V1和V2格式兼容）
        const orderNo = callbackData.mer_ord_id || callbackData.orderNo || callbackData.party_order_id;
        const reqSeqId = callbackData.req_seq_id || callbackData.reqSeqId || callbackData.seq_id;
        const transAmt = callbackData.trans_amt || callbackData.transAmt || callbackData.amount;
        const transStat = callbackData.trans_stat || callbackData.transStat || callbackData.status;
        const hfSeqId = callbackData.hf_seq_id || callbackData.hfSeqId || callbackData.seqId;
        const subRespCode = callbackData.sub_resp_code || callbackData.subRespCode || callbackData.resp_code || callbackData.respCode;
        const subRespDesc = callbackData.sub_resp_desc || callbackData.subRespDesc || callbackData.resp_desc || callbackData.respMsg || callbackData.message;

        console.log(`[汇付回调] 订单号=${orderNo}, 流水号=${reqSeqId}, 状态=${transStat}, 金额=${transAmt}`);

        // 4. 查询订单（带锁，防止并发）
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (orders.length === 0) {
            console.error(`[汇付回调] 订单不存在: ${orderNo}`);
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        const order = orders[0];

        // 5. 幂等性检查（关键）
        if (order.payment_status === 'PAID') {
            console.log(`[汇付回调] 订单已支付，跳过处理: ${orderNo}`);
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        // 6. 金额校验（防篡改）
        const orderAmountCent = Math.round(order.total_amount * 100);
        if (transAmt !== orderAmountCent.toString()) {
            console.error(`[汇付回调] 金额不匹配: 订单${orderAmountCent}分, 回调${transAmt}分`);
            // 仍然返回成功，避免汇付重复推送
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        console.log('[汇付回调] 金额校验通过');

        // 7. 处理支付成功（支持多种成功码）
        const isSuccess = (subRespCode === '00000000' || subRespCode === '0000') &&
                         (transStat === 'S' || transStat === 'SUCCESS' || transStat === 'success');

        if (isSuccess) {
            // 更新订单状态
            await connection.query(
                `UPDATE orders SET
                    order_status = 'PAID',
                    payment_status = 'PAID',
                    paid_amount = ?,
                    transaction_id = ?,
                    paid_at = datetime('now')
                WHERE id = ?`,
                [
                    parseFloat(transAmt) / 100,  // 转换为元
                    hfSeqId,
                    order.id
                ]
            );

            // 更新支付记录
            await connection.query(
                `UPDATE payment_records SET
                    payment_status = 'SUCCESS',
                    paid_amount = ?,
                    third_party_no = ?,
                    payment_time = datetime('now')
                WHERE order_no = ? AND payment_status = 'PENDING'`,
                [parseFloat(transAmt) / 100, hfSeqId, orderNo]
            );

            // 出票（调用现有issueTickets函数）
            const ticketType = JSON.parse(order.ticket_info);
            const tickets = await issueTickets(connection, {
                orderId: order.id,
                orderNo: order.order_no,
                ticketTypeId: order.ticket_type_id,
                ticketType: {
                    code: ticketType.ticketCode,
                    name: ticketType.ticketName,
                    price: ticketType.price,
                    category: order.order_type
                },
                userInfo: {
                    name: order.user_name,
                    phone: order.user_phone,
                    userId: order.user_id
                },
                quantity: order.ticket_quantity
            });

            await connection.commit();

            console.log(`[汇付回调] 订单支付成功并已出票: ${orderNo}, 票券数量: ${tickets.length}`);

            // 返回汇付要求的响应格式
            return res.status(200).send('RECV_ORD_ID_' + orderNo);

        } else {
            // 支付失败处理
            await connection.query(
                `UPDATE orders SET
                    payment_status = 'FAILED'
                WHERE order_no = ?`,
                [orderNo]
            );

            await connection.query(
                `UPDATE payment_records SET
                    payment_status = 'FAILED',
                    error_code = ?,
                    error_message = ?
                WHERE order_no = ? AND payment_status = 'PENDING'`,
                [subRespCode, subRespDesc, orderNo]
            );

            await connection.commit();

            console.log(`[汇付回调] 订单支付失败: ${orderNo}, 原因: ${subRespDesc}`);

            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

    } catch (error) {
        await connection.rollback();
        console.error('[汇付回调] 处理失败:', error);
        return res.status(500).send('Internal Server Error');
    } finally {
        connection.release();
    }
});

/**
 * 兼容旧版支付回调接口（模拟）
 * 已废弃，请使用 /api/v1/payments/huifu/notify
 */
app.post('/api/v1/payments/notify', async (req, res) => {
    console.warn('[支付回调] 使用了旧版接口，建议使用 /api/v1/payments/huifu/notify');

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { orderNo, status, amount } = req.body;

        // 查询订单
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (orders.length === 0) {
            throw new Error('订单不存在');
        }

        const order = orders[0];

        // 幂等性检查
        if (order.payment_status === 'PAID') {
            await connection.commit();
            return res.json(successResponse(null, '处理成功'));
        }

        if (status === 'success') {
            // 更新订单状态
            await connection.query(
                `UPDATE orders SET
                    order_status = 'PAID',
                    payment_status = 'PAID',
                    paid_at = NOW()
                WHERE order_no = ?`,
                [orderNo]
            );

            // 出票
            const ticketType = JSON.parse(order.ticket_info);
            const tickets = await issueTickets(connection, {
                orderId: order.id,
                orderNo: order.order_no,
                ticketTypeId: order.ticket_type_id,
                ticketType: {
                    code: ticketType.ticketCode,
                    name: ticketType.ticketName,
                    price: ticketType.price
                },
                userInfo: {
                    name: order.user_name,
                    phone: order.user_phone,
                    userId: order.user_id
                },
                quantity: order.ticket_quantity
            });

            console.log(`订单 ${orderNo} 支付成功，已出票 ${tickets.length} 张`);
        }

        await connection.commit();
        res.json(successResponse(null, '处理成功'));

    } catch (error) {
        await connection.rollback();
        console.error('处理支付回调失败:', error);
        res.status(500).json(errorResponse('处理失败'));
    } finally {
        connection.release();
    }
});

// ==================== 邀请函模块 ====================

/**
 * 提交邀请函申请
 */
app.post('/api/v1/invitations/apply', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { applicantInfo, smsCode } = req.body;

        // 验证必填字段
        if (!applicantInfo || !applicantInfo.name || !applicantInfo.phone || !applicantInfo.idCard) {
            return res.status(400).json(errorResponse('请填写完整信息（姓名、手机、身份证）'));
        }

        // 验证身份证格式
        if (!IdCardUtils.validate(applicantInfo.idCard)) {
            return res.status(400).json(errorResponse('身份证号格式不正确'));
        }

        // 验证短信验证码（实际项目中应调用短信服务验证）
        // if (smsCode !== '123456') {
        //     return res.status(400).json(errorResponse('验证码不正确'));
        // }

        // 检查是否已有待审核申请
        const [existingApps] = await connection.query(
            `SELECT id FROM invitation_applications
             WHERE applicant_phone = ? AND audit_status = 'PENDING'`,
            [applicantInfo.phone]
        );

        if (existingApps.length > 0) {
            await connection.rollback();
            return res.status(400).json(errorResponse('您已有待审核的申请，请勿重复提交'));
        }

        // 检查身份证是否已获得邀请函
        const idCardHash = IdCardUtils.hash(applicantInfo.idCard);
        const [existingTickets] = await connection.query(
            `SELECT id FROM tickets WHERE id_card_hash = ? AND ticket_status = 'ACTIVE'`,
            [idCardHash]
        );

        if (existingTickets.length > 0) {
            await connection.rollback();
            return res.status(400).json(errorResponse('该身份证已获得邀请函'));
        }

        // 判断是否自动审核通过
        const autoApprove = determineAutoApproval(applicantInfo);

        const applicationNo = generateApplicationNo();
        const encryptedIdCard = IdCardUtils.encrypt(applicantInfo.idCard);

        // 插入申请记录
        const [result] = await connection.query(
            `INSERT INTO invitation_applications (
                application_no, applicant_name, applicant_idcard, applicant_idcard_hash,
                applicant_phone, applicant_email, applicant_company, applicant_position,
                apply_reason, invite_code, category, ticket_type_id, apply_quantity,
                audit_status, audit_by, audit_time, source_type, client_ip, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                applicationNo,
                applicantInfo.name,
                encryptedIdCard,
                idCardHash,
                applicantInfo.phone,
                applicantInfo.email || null,
                applicantInfo.company || null,
                applicantInfo.position || null,
                applicantInfo.reason || null,
                applicantInfo.inviteCode || null,
                applicantInfo.category || 'GENERAL',
                3, // 邀请函票种ID
                1,
                autoApprove ? 'APPROVED' : 'PENDING',
                autoApprove ? 'SYSTEM' : null,
                autoApprove ? new Date().toISOString() : null,
                'WEB',
                req.ip || null
            ]
        );

        let responseData = {
            applicationId: result.insertId,
            applicationNo,
            auditStatus: autoApprove ? 'APPROVED' : 'PENDING'
        };

        // 自动通过时直接发放票券
        if (autoApprove) {
            const ticket = await issueInvitationTicket(connection, {
                applicationId: result.insertId,
                applicationNo,
                applicantInfo
            });

            responseData.ticket = {
                ticketNo: ticket.ticket_no,
                qrCodeToken: ticket.qr_code_token
            };
        }

        await connection.commit();

        const message = autoApprove ? '申请通过，票券已生成' : '申请提交成功，请等待审核';
        res.json(successResponse(responseData, message));

    } catch (error) {
        await connection.rollback();
        console.error('提交邀请函申请失败:', error);
        res.status(500).json(errorResponse('提交申请失败'));
    } finally {
        connection.release();
    }
});

/**
 * 判断是否自动审核通过
 */
function determineAutoApproval(applicantInfo) {
    // 有邀请码自动通过
    if (applicantInfo.inviteCode && applicantInfo.inviteCode.length > 0) {
        return true;
    }

    // 特定类别自动通过
    const autoApproveCategories = ['VIP', 'EXHIBITOR', 'MEDIA', 'SPONSOR'];
    if (applicantInfo.category && autoApproveCategories.includes(applicantInfo.category.toUpperCase())) {
        return true;
    }

    // 默认需要人工审核
    return false;
}

/**
 * 发放邀请函票券
 */
async function issueInvitationTicket(connection, applicationData) {
    const { applicationId, applicationNo, applicantInfo } = applicationData;

    // 创建虚拟订单（邀请函无需支付）
    const orderNo = generateOrderNo();
    const [orderResult] = await connection.query(
        `INSERT INTO orders (
            order_no, user_name, user_phone, user_email, user_idcard,
            order_type, total_amount, ticket_type_id, ticket_quantity,
            ticket_info, order_status, payment_status, client_ip, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            orderNo,
            applicantInfo.name,
            applicantInfo.phone,
            applicantInfo.email || null,
            IdCardUtils.mask(applicantInfo.idCard),
            'INVITATION',
            0, // 免费
            3, // 邀请函票种ID
            1,
            JSON.stringify({
                ticketCode: 'INVITATION',
                ticketName: '邀请函票',
                price: 0
            }),
            'COMPLETED',
            'PAID',
            null
        ]
    );

    // 生成票号和二维码token
    const ticketNo = generateTicketNo();
    const qrCodeData = {
        type: 'invitation',
        ticketNo: ticketNo,
        userId: applicantInfo.phone,
        timestamp: Date.now()
    };
    const qrCodeToken = Buffer.from(JSON.stringify(qrCodeData)).toString('base64');

    // 创建票券
    const validStart = new Date();
    const validEnd = new Date();
    validEnd.setDate(validEnd.getDate() + 7); // 7天有效期

    const [ticketResult] = await connection.query(
        `INSERT INTO tickets (
            ticket_no, order_id, ticket_type_id, ticket_type,
            ticket_name, ticket_category, user_name, user_phone,
            user_idcard, id_card, id_card_hash, qr_code_token,
            qr_code_short, total_amount, valid_start_time, valid_end_time,
            ticket_status, invite_code, application_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
            ticketNo,
            orderResult.insertId,
            3,
            'INVITATION',
            '邀请函票',
            'INVITATION',
            applicantInfo.name,
            applicantInfo.phone,
            IdCardUtils.mask(applicantInfo.idCard),
            IdCardUtils.encrypt(applicantInfo.idCard),
            IdCardUtils.hash(applicantInfo.idCard),
            qrCodeToken,
            generateShortCode(ticketNo),
            0,
            validStart.toISOString(),
            validEnd.toISOString(),
            'ACTIVE',
            applicantInfo.inviteCode || null,
            applicationId
        ]
    );

    return {
        id: ticketResult.insertId,
        ticket_no: ticketNo,
        qr_code_token: qrCodeToken
    };
}

/**
 * 查询我的申请
 */
app.get('/api/v1/invitations/my-applications', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json(errorResponse('手机号参数缺失'));
        }

        const [applications] = await pool.query(
            `SELECT id, application_no, applicant_name, applicant_phone, applicant_company,
                    audit_status, audit_reason, created_at
             FROM invitation_applications
             WHERE applicant_phone = ?
             ORDER BY created_at DESC`,
            [phone]
        );

        res.json(successResponse({
            total: applications.length,
            list: applications
        }));

    } catch (error) {
        console.error('查询申请失败:', error);
        res.status(500).json(errorResponse('查询申请失败'));
    }
});

/**
 * 查询我的邀请函票券
 */
app.get('/api/v1/invitations/my-tickets', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json(errorResponse('手机号参数缺失'));
        }

        const [tickets] = await pool.query(
            `SELECT ticket_no, ticket_name, ticket_category,
                    user_name, user_phone, qr_code_token, qr_code_short,
                    ticket_status, valid_start_time, valid_end_time,
                    verified_at, verified_by, invite_code, created_at
             FROM tickets
             WHERE user_phone = ? AND ticket_category = 'INVITATION'
             ORDER BY created_at DESC`,
            [phone]
        );

        res.json(successResponse({
            total: tickets.length,
            tickets: tickets
        }));

    } catch (error) {
        console.error('查询邀请函失败:', error);
        res.status(500).json(errorResponse('查询邀请函失败'));
    }
});

// ==================== 票券模块 ====================

/**
 * 获取票种列表
 */
app.get('/api/v1/tickets/types', async (req, res) => {
    try {
        const ticketTypes = await pool.query(
            'SELECT * FROM ticket_types WHERE is_active = 1 ORDER BY sort_order, id'
        );

        // 格式化返回数据
        const formattedTypes = ticketTypes[0].map(type => ({
            id: type.id,
            code: type.ticket_code,
            name: type.ticket_name,
            category: type.ticket_category,
            originalPrice: type.original_price,
            salePrice: type.sale_price,
            benefits: type.benefits ? JSON.parse(type.benefits) : null,
            description: type.description,
            validStartTime: type.valid_start_time,
            validEndTime: type.valid_end_time
        }));

        res.json(successResponse('获取票种列表成功', formattedTypes));
    } catch (error) {
        console.error('获取票种列表失败:', error);
        res.status(500).json(errorResponse('获取票种列表失败'));
    }
});

/**
 * ==================== 管理后台API ====================
 */

/**
 * 获取所有申请（支持状态筛选）
 */
app.get('/api/v1/invitations/applications', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT ia.id, ia.application_no, ia.applicant_name as real_name,
                   ia.applicant_phone as phone, ia.applicant_idcard as id_card,
                   ia.applicant_company, ia.category as vip_category,
                   ia.invite_code as invitation_code,
                   ia.audit_status as status, ia.audit_reason as reject_reason,
                   ia.created_at, ia.audit_time, t.ticket_no
            FROM invitation_applications ia
            LEFT JOIN tickets t ON ia.application_no = t.order_no
        `;
        const params = [];

        if (status && status !== 'ALL') {
            query += ' WHERE ia.audit_status = ?';
            params.push(status);
        }

        query += ' ORDER BY ia.created_at DESC';

        const [applications] = await pool.query(query, params);

        // 解密身份证号用于显示
        const list = applications.map(app => ({
            ...app,
            id_card: app.id_card ? IdCardUtils.mask(app.id_card) : null,
            reason: app.audit_reason || null
        }));

        res.json(successResponse({
            total: list.length,
            list
        }));

    } catch (error) {
        console.error('获取申请列表失败:', error);
        res.status(500).json(errorResponse('获取申请列表失败'));
    }
});

/**
 * 同意邀请函申请
 */
app.post('/api/v1/invitations/:id/approve', async (req, res) => {
    const connection = await pool;
    try {
        const { id } = req.params;

        // 查询申请信息
        const [applications] = await connection.query(
            'SELECT * FROM invitation_applications WHERE id = ? FOR UPDATE',
            [id]
        );

        if (applications.length === 0) {
            return res.status(404).json(errorResponse('申请不存在'));
        }

        const application = applications[0];

        if (application.audit_status !== 'PENDING') {
            return res.status(400).json(errorResponse('申请已处理'));
        }

        // 更新申请状态
        await connection.query(
            `UPDATE invitation_applications SET
                audit_status = 'APPROVED',
                audit_time = datetime('now'),
                audit_by = 'ADMIN'
            WHERE id = ?`,
            [id]
        );

        // 生成邀请函票券
        const ticketNo = generateTicketNo();
        const qrCodeToken = generateQRCodeToken(ticketNo);

        await connection.query(
            `INSERT INTO tickets (
                ticket_no, ticket_type_id, ticket_name, ticket_category,
                order_id, order_no, user_id, user_name, user_phone,
                qr_code_token, qr_code_short,
                ticket_status, valid_start_time, valid_end_time,
                invite_code, created_at
            ) VALUES (?, 3, '邀请函票', 'INVITATION', NULL, ?, NULL, ?, ?, ?, ?, 'ACTIVE',
              (SELECT value FROM system_config WHERE key = 'expo_start_date'),
              (SELECT value FROM system_config WHERE key = 'expo_end_date'),
              ?, datetime('now'))`,
            [
                ticketNo,
                application.application_no,
                application.applicant_name,
                application.applicant_phone,
                qrCodeToken,
                qrCodeToken.substring(0, 8),
                application.invitation_code || null
            ]
        );

        // 更新申请表中的票号
        await connection.query(
            'UPDATE invitation_applications SET ticket_no = ? WHERE id = ?',
            [ticketNo, id]
        );

        console.log(`[邀请函审核] 同意申请: ${id}, 生成票券: ${ticketNo}`);

        res.json(successResponse({
            ticketNo,
            message: '申请已通过，票券已生成'
        }, '审核成功'));

    } catch (error) {
        console.error('同意申请失败:', error);
        res.status(500).json(errorResponse('同意申请失败'));
    }
});

/**
 * 拒绝邀请函申请
 */
app.post('/api/v1/invitations/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const [applications] = await pool.query(
            'SELECT * FROM invitation_applications WHERE id = ?',
            [id]
        );

        if (applications.length === 0) {
            return res.status(404).json(errorResponse('申请不存在'));
        }

        const application = applications[0];

        if (application.audit_status !== 'PENDING') {
            return res.status(400).json(errorResponse('申请已处理'));
        }

        // 更新申请状态
        await pool.query(
            `UPDATE invitation_applications SET
                audit_status = 'REJECTED',
                audit_reason = ?,
                audit_time = datetime('now'),
                audit_by = 'ADMIN'
            WHERE id = ?`,
            [reason || '', id]
        );

        console.log(`[邀请函审核] 拒绝申请: ${id}, 理由: ${reason}`);

        res.json(successResponse({ message: '申请已拒绝' }, '拒绝成功'));

    } catch (error) {
        console.error('拒绝申请失败:', error);
        res.status(500).json(errorResponse('拒绝申请失败'));
    }
});

/**
 * 获取所有票券（管理后台用）
 */
app.get('/api/v1/tickets/all', async (req, res) => {
    try {
        const [tickets] = await pool.query(
            `SELECT ticket_no, ticket_name, ticket_category,
                    user_name, user_phone, ticket_status,
                    valid_start_time, valid_end_time,
                    verified_at, created_at
             FROM tickets
             ORDER BY created_at DESC`
        );

        res.json(successResponse({
            total: tickets.length,
            list: tickets
        }));

    } catch (error) {
        console.error('获取所有票券失败:', error);
        res.status(500).json(errorResponse('获取所有票券失败'));
    }
});

/**
 * ==================== 用户API ====================
 */

/**
 * 我的票券列表
 */
app.get('/api/v1/tickets/my-tickets', async (req, res) => {
    try {
        const { phone, status } = req.query;

        if (!phone) {
            return res.status(400).json(errorResponse('手机号参数缺失'));
        }

        let query = `
            SELECT t.*, o.order_no
            FROM tickets t
            LEFT JOIN orders o ON t.order_id = o.id
            WHERE t.user_phone = ?
        `;
        const params = [phone];

        if (status) {
            query += ' AND t.ticket_status = ?';
            params.push(status);
        }

        query += ' ORDER BY t.created_at DESC';

        const [tickets] = await pool.query(query, params);

        // 转换数据格式
        const ticketList = tickets.map(ticket => ({
            ticketId: ticket.id,
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            ticketCategory: ticket.ticket_category,
            ticketPrice: Math.round(parseFloat(ticket.total_amount || 0) * 100),  // 转换为分
            userName: ticket.user_name,
            userPhone: ticket.user_phone,
            validStartTime: ticket.valid_start_time,
            validEndTime: ticket.valid_end_time,
            ticketStatus: ticket.ticket_status,
            verifiedAt: ticket.verified_at,
            qrCodeToken: ticket.qr_code_token,
            qrCodeShort: ticket.qr_code_short
        }));

        res.json(successResponse({
            total: ticketList.length,
            list: ticketList
        }));

    } catch (error) {
        console.error('查询票券失败:', error);
        res.status(500).json(errorResponse('查询票券失败'));
    }
});

/**
 * 获取票券详情
 */
app.get('/api/v1/tickets/:ticketNo', async (req, res) => {
    try {
        const { ticketNo } = req.params;

        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE ticket_no = ?',
            [ticketNo]
        );

        if (tickets.length === 0) {
            return res.status(404).json(errorResponse('票券不存在'));
        }

        const ticket = tickets[0];

        res.json(successResponse({
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            ticketCategory: ticket.ticket_category,
            userName: ticket.user_name,
            userPhone: ticket.user_phone,
            validStartTime: ticket.valid_start_time,
            validEndTime: ticket.valid_end_time,
            ticketStatus: ticket.ticket_status,
            verifiedAt: ticket.verified_at,
            verifiedBy: ticket.verified_by,
            benefits: JSON.parse(ticket.benefits || '{}')
        }));

    } catch (error) {
        console.error('查询票券详情失败:', error);
        res.status(500).json(errorResponse('查询票券详情失败'));
    }
});

/**
 * 按手机号搜索票券（核销用）
 */
app.get('/api/v1/tickets/search', async (req, res) => {
    try {
        const { mobile } = req.query;
        console.log('[票券搜索] 收到请求，手机号:', mobile);

        if (!mobile) {
            return res.status(400).json(errorResponse('手机号参数缺失'));
        }

        // 验证手机号格式
        if (!/^1[3-9]\d{9}$/.test(mobile)) {
            return res.status(400).json(errorResponse('手机号格式不正确'));
        }

        console.log('[票券搜索] 手机号格式验证通过');

        // 查询该手机号的有效票券（未使用且在有效期内）
        const now = new Date().toISOString();
        const [tickets] = await pool.query(
            `SELECT ticket_no, ticket_name, ticket_category, user_name, user_phone,
                    qr_code_token, valid_start_time, valid_end_time, ticket_status
             FROM tickets
             WHERE user_phone = ? AND ticket_status = 'ACTIVE'
             AND valid_start_time <= ? AND valid_end_time >= ?
             ORDER BY created_at DESC`,
            [mobile, now, now]
        );

        // 转换数据格式
        console.log('[票券搜索] 手机号:', mobile, '找到票券:', tickets.length);
        const ticketList = tickets.map(ticket => ({
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            ticketCategory: ticket.ticket_category,
            userName: ticket.user_name,
            userPhone: ticket.user_phone,
            holderMobileLast4: maskPhone(ticket.user_phone),
            qrContent: ticket.qr_code_token,
            validStartTime: ticket.valid_start_time,
            validEndTime: ticket.valid_end_time,
            ticketStatus: ticket.ticket_status
        }));

        res.json(successResponse({
            total: ticketList.length,
            tickets: ticketList
        }));

    } catch (error) {
        console.error('[票券搜索] 异常:', error);
        res.status(500).json(errorResponse('搜索票券失败'));
    }
});

// ==================== 核销模块 ====================

/**
 * 核销预览（显示票券信息，供核销员确认）
 */
app.post('/api/v1/verify/preview', async (req, res) => {
    try {
        const { qrContent, verifierInfo } = req.body;

        if (!qrContent) {
            return res.status(400).json(errorResponse('二维码内容不能为空'));
        }

        // 查询票券
        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE qr_code_token = ?',
            [qrContent]
        );

        if (tickets.length === 0) {
            return res.status(404).json(errorResponse('票券不存在'));
        }

        const ticket = tickets[0];

        // 检查票券状态
        if (ticket.ticket_status !== 'ACTIVE') {
            const statusText = {
                'USED': '票券已使用',
                'CANCELLED': '票券已作废',
                'EXPIRED': '票券已过期'
            }[ticket.ticket_status] || '票券无效';

            return res.status(400).json(errorResponse(statusText));
        }

        // 检查有效期
        const now = new Date();
        const validStart = new Date(ticket.valid_start_time);
        const validEnd = new Date(ticket.valid_end_time);

        if (now < validStart || now > validEnd) {
            return res.status(400).json(errorResponse('不在有效期内'));
        }

        // 返回票券信息（脱敏）
        // 兼容不同列名：user_name/visitor_name, user_phone/visitor_phone
        const holderName = ticket.user_name || ticket.visitor_name || null;
        const holderPhone = ticket.user_phone || ticket.visitor_phone || null;
        const holderIdCard = ticket.user_idcard || ticket.id_card || null;

        const ticketInfo = {
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            ticketCategory: ticket.ticket_category,
            holderName: holderName,
            holderPhone: holderPhone ? maskPhone(holderPhone) : null,
            holderIdCard: holderIdCard, // 已脱敏
            validStartTime: ticket.valid_start_time,
            validEndTime: ticket.valid_end_time,
            ticketStatus: ticket.ticket_status,
            inviteCode: ticket.invite_code || null,
            qrCodeToken: ticket.qr_code_token // 添加二维码token，用于后续核销
        };

        res.json(successResponse(ticketInfo, '预览成功'));

    } catch (error) {
        console.error('预览失败:', error);
        res.status(500).json(errorResponse('预览失败'));
    }
});

/**
 * 扫码核销
 */
app.post('/api/v1/verify/scan', async (req, res) => {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { qrCodeToken, verifierInfo } = req.body;

        if (!qrCodeToken || !verifierInfo || !verifierInfo.verifierId) {
            return res.status(400).json(errorResponse('参数不完整'));
        }

        // 查询票券
        const [tickets] = await connection.query(
            'SELECT * FROM tickets WHERE qr_code_token = ? FOR UPDATE',
            [qrCodeToken]
        );

        if (tickets.length === 0) {
            // 记录失败日志
            await connection.query(
                `INSERT INTO verify_records (
                    ticket_no, ticket_code, verify_result, verify_message,
                    operator_id, operator_name, device_id, created_at
                ) VALUES (?, ?, 'FAILED', '票券不存在', ?, ?, ?, datetime('now'))`,
                [qrCodeToken.substring(0, 20), verifierInfo.verifierId, verifierInfo.verifierName || '']
            );
            await connection.commit();
            return res.status(404).json(errorResponse('票券不存在'));
        }

        const ticket = tickets[0];

        // 检查票券状态
        if (ticket.ticket_status !== 'ACTIVE') {
            const statusText = {
                'USED': '票券已使用',
                'CANCELLED': '票券已作废',
                'EXPIRED': '票券已过期'
            }[ticket.ticket_status] || '票券无效';

            // 记录失败日志
            await connection.query(
                `INSERT INTO verify_records (
                    ticket_id, ticket_no, ticket_code, verify_result, verify_message,
                    operator_id, operator_name, device_id, created_at
                ) VALUES (?, ?, ?, 'FAILED', ?, ?, ?, ?, datetime('now'))`,
                [ticket.id, ticket.ticket_no, qrCodeToken.substring(0, 50), statusText, verifierInfo.verifierId, verifierInfo.verifierName || '', verifierInfo.deviceId || '']
            );
            await connection.commit();
            return res.status(400).json(errorResponse(statusText));
        }

        // 检查有效期
        const now = new Date();
        const validStart = new Date(ticket.valid_start_time);
        const validEnd = new Date(ticket.valid_end_time);

        if (now < validStart || now > validEnd) {
            await connection.query(
                `INSERT INTO verify_records (
                    ticket_id, ticket_no, ticket_code, verify_result, verify_message,
                    operator_id, operator_name, device_id, created_at
                ) VALUES (?, ?, ?, 'FAILED', '不在有效期内', ?, ?, ?, datetime('now'))`,
                [ticket.id, ticket.ticket_no, qrCodeToken.substring(0, 50), verifierInfo.verifierId, verifierInfo.verifierName || '', verifierInfo.deviceId || '']
            );
            await connection.commit();
            return res.status(400).json(errorResponse('不在有效期内'));
        }

        // 更新票券状态
        const [result] = await connection.query(
            `UPDATE tickets SET
                ticket_status = 'USED',
                check_status = 'CHECKED',
                check_time = datetime('now'),
                check_operator = ?,
                verified_at = datetime('now'),
                verified_by = ?
            WHERE id = ? AND ticket_status = 'ACTIVE'`,
            [
                verifierInfo.verifierName || verifierInfo.verifierId,
                verifierInfo.verifierId,
                ticket.id
            ]
        );

        if (result.affectedRows === 0) {
            await connection.commit();
            return res.status(400).json(errorResponse('票券已被核销'));
        }

        // 记录核销成功日志
        await connection.query(
            `INSERT INTO verify_records (
                ticket_id, ticket_no, ticket_code, verify_result, verify_message,
                operator_id, operator_name, device_id, gate_name, created_at
            ) VALUES (?, ?, ?, 'SUCCESS', '核销成功', ?, ?, ?, ?, datetime('now'))`,
            [
                ticket.id,
                ticket.ticket_no,
                qrCodeToken.substring(0, 50),
                verifierInfo.verifierId,
                verifierInfo.verifierName || '',
                verifierInfo.deviceId || '',
                verifierInfo.gate || null
            ]
        );

        await connection.commit();

        // 获取用户姓名和手机号（兼容不同列名）
        const userName = ticket.user_name || ticket.visitor_name || '未知';
        const userPhone = ticket.user_phone || ticket.visitor_phone || '';
        const maskedPhone = userPhone && userPhone.length >= 11
            ? userPhone.substring(0, 3) + '****' + userPhone.substring(7)
            : '***';

        res.json(successResponse({
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            userName: userName,
            userPhone: maskedPhone,
            verifyStatus: 'SUCCESS',
            verifyTime: new Date()
        }, '核销成功'));

    } catch (error) {
        await connection.rollback();
        console.error('核销失败:', error);
        res.status(500).json(errorResponse('核销失败'));
    } finally {
        connection.release();
    }
});

/**
 * 查询核销记录
 */
app.get('/api/v1/verify/records', async (req, res) => {
    try {
        const { verifierId, startDate, endDate, page = 1, pageSize = 20 } = req.query;

        let query = `
            SELECT vr.*, t.ticket_name, t.user_name as visitor_name, t.user_phone
            FROM verify_records vr
            LEFT JOIN tickets t ON vr.ticket_no = t.ticket_no
            WHERE 1=1
        `;
        const params = [];
        const conditions = [];

        if (verifierId) {
            conditions.push('vr.operator_id = ?');
            params.push(verifierId);
        }

        if (startDate) {
            conditions.push('DATE(vr.created_at) >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('DATE(vr.created_at) <= ?');
            params.push(endDate);
        }

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY vr.created_at DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

        const [records] = await pool.query(query, params);

        // 查询总数
        let countQuery = 'SELECT COUNT(*) as total FROM verify_records vr WHERE 1=1';
        const countParams = [];
        const countConditions = [];

        if (verifierId) {
            countConditions.push('operator_id = ?');
            countParams.push(verifierId);
        }

        if (startDate) {
            countConditions.push('DATE(created_at) >= ?');
            countParams.push(startDate);
        }

        if (endDate) {
            countConditions.push('DATE(created_at) <= ?');
            countParams.push(endDate);
        }

        if (countConditions.length > 0) {
            countQuery += ' AND ' + countConditions.join(' AND ');
        }

        const [countResult] = await pool.query(countQuery, countParams);

        res.json(successResponse({
            total: countResult[0].total,
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            list: records
        }));

    } catch (error) {
        console.error('查询核销记录失败:', error);
        res.status(500).json(errorResponse('查询核销记录失败'));
    }
});

// ==================== 辅助函数 ====================

/**
 * 出票函数
 */
async function issueTickets(connection, params) {
    const { orderId, orderNo, ticketTypeId, ticketType, userInfo, quantity } = params;

    const tickets = [];

    for (let i = 0; i < quantity; i++) {
        const ticketNo = generateTicketNo();
        const qrCodeToken = generateQRCodeToken(ticketNo);
        const qrCodeShort = generateShortCode(ticketNo);

        // 有效期设置（活动时间：2026年5月1-3日）
        const validStartTime = new Date('2026-05-01T09:00:00');
        const validEndTime = new Date('2026-05-03T18:00:00');

        const [ticketResult] = await connection.query(
            `INSERT INTO tickets (
                ticket_no, order_id, order_no, user_name, user_phone,
                visitor_name, visitor_phone,
                ticket_type_id, ticket_type_code, ticket_code, ticket_name, ticket_category,
                qr_code_data, qr_code_token, qr_code_short,
                valid_start_time, valid_end_time, ticket_status,
                total_amount
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                ticketNo,
                orderId,
                orderNo,
                userInfo.name,
                userInfo.phone,
                userInfo.name,
                userInfo.phone,
                ticketTypeId,
                ticketType.code,
                ticketNo,  // 使用唯一票号而不是票种代码
                ticketType.name,
                ticketType.category || 'PAID',
                qrCodeToken,
                qrCodeToken,
                qrCodeShort,
                validStartTime.toISOString(),
                validEndTime.toISOString(),
                'ACTIVE',
                ticketType.price / 100  // 转换为元
            ]
        );

        tickets.push({
            ticketId: ticketResult.insertId,
            ticketNo,
            qrCodeToken,
            qrCodeShort
        });
    }

    return tickets;
}

// ==================== 管理后台API ====================

/**
 * 获取统计数据
 */
app.get('/api/v1/admin/stats', async (req, res) => {
    try {
        // 今日访客（用注册用户数代替）
        const today = new Date().toISOString().split('T')[0];
        const [todayUsers] = await pool.query(
            'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = ?',
            [today]
        );

        // 票务销售总数
        const [ticketStats] = await pool.query(
            'SELECT COUNT(*) as count FROM orders WHERE order_status = ?',
            ['PAID']
        );

        // 收入总额
        const [revenueStats] = await pool.query(
            'SELECT IFNULL(SUM(paid_amount), 0) as total FROM orders WHERE payment_status = ?',
            ['PAID']
        );

        // 核销数量
        const [checkinStats] = await pool.query(
            'SELECT COUNT(*) as count FROM verify_records'
        );

        res.json(successResponse({
            todayVisitors: todayUsers[0].count,
            totalTickets: ticketStats[0].count,
            totalRevenue: revenueStats[0].total || 0,
            totalCheckins: checkinStats[0].count
        }));

    } catch (error) {
        console.error('获取统计数据失败:', error);
        res.status(500).json(errorResponse('获取统计数据失败'));
    }
});

/**
 * 获取订单列表（管理后台）
 */
app.get('/api/v1/admin/orders', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const status = req.query.status;
        const search = req.query.search;

        let query = `
            SELECT
                o.id,
                o.order_no,
                o.user_name,
                o.user_phone,
                o.ticket_quantity,
                o.total_amount,
                o.order_status,
                o.payment_status,
                o.created_at,
                o.ticket_info
            FROM orders o
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND o.payment_status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (o.order_no LIKE ? OR o.user_phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, (page - 1) * limit);

        const [orders] = await pool.query(query, params);

        // 解析ticket_info获取票名
        const ordersWithTicketName = orders.map(order => {
            let ticketName = '-';
            try {
                const ticketInfo = typeof order.ticket_info === 'string'
                    ? JSON.parse(order.ticket_info)
                    : order.ticket_info;
                ticketName = ticketInfo.ticketName || '-';
            } catch (e) {
                console.error('解析ticket_info失败:', e);
            }
            return {
                ...order,
                ticketName
            };
        });

        // 获取总数
        let countQuery = 'SELECT COUNT(*) as total FROM orders o WHERE 1=1';
        const countParams = [];

        if (status) {
            countQuery += ' AND o.payment_status = ?';
            countParams.push(status);
        }

        if (search) {
            countQuery += ' AND (o.order_no LIKE ? OR o.user_phone LIKE ?)';
            countParams.push(`%${search}%`, `%${search}%`);
        }

        const [countResult] = await pool.query(countQuery, countParams);

        res.json(successResponse({
            orders: ordersWithTicketName,
            total: countResult[0].total,
            page,
            limit
        }));

    } catch (error) {
        console.error('获取订单列表失败:', error);
        res.status(500).json(errorResponse('获取订单列表失败'));
    }
});

/**
 * 获取订单详情（管理后台）
 */
app.get('/api/v1/admin/orders/:orderNo', async (req, res) => {
    try {
        const { orderNo } = req.params;

        const [orders] = await pool.query(
            `SELECT o.* FROM orders o WHERE o.order_no = ?`,
            [orderNo]
        );

        if (orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        // 解析ticket_info获取票名
        let ticketName = '-';
        try {
            const ticketInfo = typeof order.ticket_info === 'string'
                ? JSON.parse(order.ticket_info)
                : order.ticket_info;
            ticketName = ticketInfo.ticketName || '-';
        } catch (e) {
            console.error('解析ticket_info失败:', e);
        }

        // 获取订单关联的票券
        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE order_no = ?',
            [orderNo]
        );

        res.json(successResponse({
            order: {
                ...order,
                ticketName
            },
            tickets
        }));

    } catch (error) {
        console.error('获取订单详情失败:', error);
        res.status(500).json(errorResponse('获取订单详情失败'));
    }
});

/**
 * 获取票券列表（管理后台）
 */
app.get('/api/v1/admin/tickets', async (req, res) => {
    try {
        const status = req.query.status;
        const search = req.query.search;

        let query = `
            SELECT
                t.ticket_no,
                t.user_name,
                t.user_phone,
                t.ticket_name,
                t.ticket_status,
                t.used_at,
                t.created_at
            FROM tickets t
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            query += ' AND t.ticket_status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (t.ticket_no LIKE ? OR t.user_phone LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY t.created_at DESC LIMIT 100';

        const [tickets] = await pool.query(query, params);

        res.json(successResponse({ tickets }));

    } catch (error) {
        console.error('获取票券列表失败:', error);
        res.status(500).json(errorResponse('获取票券列表失败'));
    }
});

/**
 * 获取核销记录（管理后台）
 */
app.get('/api/v1/admin/checkins', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;

        const [checkins] = await pool.query(
            `SELECT
                vr.ticket_no,
                vr.created_at as checked_at,
                vr.operator_id as checked_by,
                t.user_name,
                t.ticket_name
            FROM verify_records vr
            LEFT JOIN tickets t ON vr.ticket_no = t.ticket_no
            ORDER BY vr.created_at DESC
            LIMIT ?`,
            [limit]
        );

        res.json(successResponse({ checkins }));

    } catch (error) {
        console.error('获取核销记录失败:', error);
        res.status(500).json(errorResponse('获取核销记录失败'));
    }
});

/**
 * 票券核销接口（管理后台）
 */
app.post('/api/v1/tickets/checkin', async (req, res) => {
    const connection = await pool;

    try {
        const { ticketNo } = req.body;

        if (!ticketNo) {
            return res.status(400).json(errorResponse('票号不能为空'));
        }

        // 查询票券
        const [tickets] = await pool.query(
            'SELECT * FROM tickets WHERE ticket_no = ?',
            [ticketNo]
        );

        if (tickets.length === 0) {
            return res.status(404).json(errorResponse('票券不存在'));
        }

        const ticket = tickets[0];

        // 检查票券状态
        if (ticket.ticket_status === 'USED') {
            return res.status(400).json(errorResponse('票券已使用'));
        }

        if (ticket.ticket_status === 'EXPIRED') {
            return res.status(400).json(errorResponse('票券已过期'));
        }

        if (ticket.ticket_status !== 'ACTIVE') {
            return res.status(400).json(errorResponse('票券状态异常'));
        }

        // 检查有效期
        const now = new Date();
        if (ticket.valid_start_time && now < new Date(ticket.valid_start_time)) {
            return res.status(400).json(errorResponse('票券尚未生效'));
        }

        if (ticket.valid_end_time && now > new Date(ticket.valid_end_time)) {
            return res.status(400).json(errorResponse('票券已过期'));
        }

        // 核销票券
        await pool.query(
            `UPDATE tickets SET
                ticket_status = 'USED',
                used_at = NOW()
            WHERE ticket_no = ?`,
            [ticketNo]
        );

        // 记录核销记录
        await pool.query(
            `INSERT INTO verify_records (ticket_no, ticket_code, verify_result, verify_message, operator_id, operator_name, created_at)
            VALUES (?, ?, 'SUCCESS', '管理员核销', 'ADMIN', '管理员', datetime('now'))`,
            [ticketNo, ticketNo.substring(0, 50)]
        );

        res.json(successResponse({
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            userName: ticket.user_name
        }, '核销成功'));

    } catch (error) {
        console.error('核销失败:', error);
        res.status(500).json(errorResponse('核销失败'));
    }
});

// ==================== 微信小程序相关接口 ====================

/**
 * 查询微信小程序支付配置状态
 * 供前端检查微信支付是否启用
 */
app.get('/api/v1/wechat/miniapp/config', (req, res) => {
    const enabled = process.env.WECHAT_MINIAPP_ENABLED === 'true';
    const hasAppId = !!process.env.WECHAT_MINIAPP_APPID;

    res.json(successResponse({
        enabled: enabled && hasAppId,
        appid: process.env.WECHAT_MINIAPP_APPID || '',
        message: !hasAppId ? '小程序AppID未配置' : (!enabled ? '小程序支付未启用' : '小程序支付已启用')
    }, '查询成功'));
});

/**
 * 微信小程序登录 - 获取OpenID
 */
app.get('/api/v1/wechat/miniapp/code2session', async (req, res) => {
    try {
        const { code } = req.query;

        if (!code) {
            return res.status(400).json(errorResponse('code不能为空'));
        }

        const appId = process.env.WECHAT_MINIAPP_APPID;
        const appSecret = process.env.WECHAT_MINIAPP_SECRET;

        if (!appId || !appSecret) {
            return res.status(500).json(errorResponse('微信小程序配置不完整'));
        }

        // 调用微信API获取session_key和openid
        const https = require('https');
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

        https.get(url, (wechatRes) => {
            let data = '';

            wechatRes.on('data', (chunk) => {
                data += chunk;
            });

            wechatRes.on('end', () => {
                try {
                    const result = JSON.parse(data);

                    if (result.errcode) {
                        console.error('[微信登录] 获取OpenID失败:', result);
                        return res.status(400).json(errorResponse(result.errmsg || '获取OpenID失败'));
                    }

                    // 返回openid和session_key
                    res.json(successResponse({
                        openid: result.openid,
                        sessionKey: result.session_key,
                        unionid: result.unionid
                    }, '获取OpenID成功'));

                } catch (error) {
                    console.error('[微信登录] 解析响应失败:', error);
                    res.status(500).json(errorResponse('解析响应失败'));
                }
            });

        }).on('error', (error) => {
            console.error('[微信登录] 请求微信API失败:', error);
            res.status(500).json(errorResponse('请求微信API失败'));
        });

    } catch (error) {
        console.error('[微信登录] 错误:', error);
        res.status(500).json(errorResponse('服务器错误'));
    }
});

/**
 * 生成微信小程序URL Scheme
 * 用于从H5页面跳转到小程序
 */
app.post('/api/v1/wechat/miniapp/scheme', async (req, res) => {
    try {
        const { orderNo, path = 'pages/payment/payment', query = {} } = req.body;

        if (!orderNo) {
            return res.status(400).json(errorResponse('订单号不能为空'));
        }

        const appId = process.env.WECHAT_MINIAPP_APPID;
        if (!appId) {
            return res.status(500).json(errorResponse('微信小程序配置不完整'));
        }

        // 构建query字符串
        const queryString = Object.entries({ orderNo, ...query })
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');

        // 构建完整的path
        const fullPath = `${path}?${queryString}`;

        // 生成URL Scheme
        // 格式: weixin://dl/business/?t=TICKET
        // 实际应该调用微信API生成，这里先提供模拟方案
        const scheme = `weixin://dl/business/?s=${Buffer.from(fullPath).toString('base64')}`;

        // 同时生成URL Link（备用）
        const link = `https://wxaurl.cn/placeholder?orderNo=${orderNo}`;

        res.json(successResponse({
            scheme,
            link,
            path: fullPath,
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString() // 30分钟后过期
        }, '生成URL Scheme成功'));

    } catch (error) {
        console.error('[URL Scheme] 错误:', error);
        res.status(500).json(errorResponse('生成URL Scheme失败'));
    }
});

/**
 * 微信小程序支付创建
 * 扩展现有的汇付支付接口，支持小程序支付
 */
app.post('/api/v1/payments/miniapp/create', async (req, res) => {
    let connection;
    try {
        const { orderNo, wxOpenid, wxAppid } = req.body;

        if (!orderNo || !wxOpenid) {
            return res.status(400).json(errorResponse('订单号和OpenID不能为空'));
        }

        connection = await pool;
        await connection.beginTransaction();

        // 查询订单
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (orders.length === 0) {
            await connection.rollback();
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        if (order.payment_status === 'PAID') {
            await connection.rollback();
            return res.status(400).json(errorResponse('订单已支付'));
        }

        // TODO: 调用汇付小程序支付API
        // 这里需要等待汇付开通小程序支付后实现
        // 目前返回模拟数据

        const mockPaymentData = {
            orderId: orderNo,
            timestamp: Math.floor(Date.now() / 1000),
            nonceStr: generateOrderNo(),
            prepayId: `PREPAY_ID_${Date.now()}`,
            signType: 'RSA',
            package: `prepay_id=PREPAY_ID_${Date.now()}`
        };

        await connection.rollback();

        res.json(successResponse({
            ...mockPaymentData,
            message: '小程序支付功能待微信支付开通后启用'
        }, '创建小程序支付成功（模拟）'));

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('[小程序支付] 错误:', error);
        res.status(500).json(errorResponse('创建小程序支付失败'));
    }
});

/**
 * 小程序支付状态查询（轮询用）
 */
app.get('/api/v1/payments/:orderNo/status', async (req, res) => {
    try {
        const { orderNo } = req.params;

        const [orders] = await pool.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        if (orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        res.json(successResponse({
            orderNo: order.order_no,
            paymentStatus: order.payment_status,
            orderStatus: order.order_status,
            paidAmount: order.paid_amount,
            paidAt: order.paid_at
        }, '查询成功'));

    } catch (error) {
        console.error('[支付状态查询] 错误:', error);
        res.status(500).json(errorResponse('查询支付状态失败'));
    }
});

// ==================== 错误处理 ====================
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json(errorResponse('服务器内部错误'));
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║          东北亚数字文创博览会 - 票务系统                        ║');
    console.log('║          Ticket System Server                                  ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   服务器运行中: http://localhost:${PORT}`);
    console.log('');
    console.log('   可用端点:');
    console.log(`     • 健康检查: GET    http://localhost:${PORT}/health`);
    console.log(`     • 创建订单: POST   http://localhost:${PORT}/api/v1/orders`);
    console.log(`     • 查询订单: GET    http://localhost:${PORT}/api/v1/orders/:orderNo`);
    console.log(`     • 创建支付: POST   http://localhost:${PORT}/api/v1/payments/create`);
    console.log(`     • 支付状态: GET    http://localhost:${PORT}/api/v1/payments/:orderNo/status`);
    console.log(`     • 支付回调: POST   http://localhost:${PORT}/api/v1/payments/notify`);
    console.log(`     • 邀请函申请: POST  http://localhost:${PORT}/api/v1/invitations/apply`);
    console.log(`     • 我的申请: GET    http://localhost:${PORT}/api/v1/invitations/my-applications`);
    console.log(`     • 我的邀请函: GET  http://localhost:${PORT}/api/v1/invitations/my-tickets`);
    console.log(`     • 所有申请: GET    http://localhost:${PORT}/api/v1/invitations/applications`);
    console.log(`     • 同意申请: POST   http://localhost:${PORT}/api/v1/invitations/:id/approve`);
    console.log(`     • 拒绝申请: POST   http://localhost:${PORT}/api/v1/invitations/:id/reject`);
    console.log(`     • 所有票券: GET    http://localhost:${PORT}/api/v1/tickets/all`);
    console.log(`     • 我的票券: GET    http://localhost:${PORT}/api/v1/tickets/my-tickets`);
    console.log(`     • 核销预览: POST   http://localhost:${PORT}/api/v1/verify/preview`);
    console.log(`     • 扫码核销: POST   http://localhost:${PORT}/api/v1/verify/scan`);
    console.log(`     • 核销记录: GET    http://localhost:${PORT}/api/v1/verify/records`);
    console.log('');
    console.log('   微信小程序端点:');
    console.log(`     • 获取OpenID: GET  http://localhost:${PORT}/api/v1/wechat/miniapp/code2session`);
    console.log(`     • URL Scheme: POST http://localhost:${PORT}/api/v1/wechat/miniapp/scheme`);
    console.log(`     • 小程序支付: POST http://localhost:${PORT}/api/v1/payments/miniapp/create`);
    console.log('');
    console.log('   环境变量:');
    console.log(`     • 数据库: SQLite (data/expo_tickets.db)`);
    console.log(`     • 票种: ${Object.keys(TICKET_TYPES).join(', ')}`);
    console.log('');

    // 汇付配置状态
    if (validateHuifuConfig()) {
        console.log('   ✓ 汇付天下配置完整');
        console.log(`     • 商户号: ${HUIFU_CONFIG.merchantId}`);
        console.log(`     • 产品ID: ${HUIFU_CONFIG.appId}`);
        console.log(`     • 环境: ${HUIFU_CONFIG.environment}`);
    } else {
        console.log('   ✗ 汇付天下配置不完整，请检查.env文件');
    }
    console.log('');

    console.log('   提示: 使用SQLite数据库，数据文件位于 data/expo_tickets.db');
    console.log('');
});

module.exports = app;
