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
    gatewayUrl: process.env.HUIFU_GATEWAY_URL || 'https://spin.cloudpnr.com',
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
            // 处理私钥格式
            const formattedKey = this.formatPrivateKey(privateKey);
            const sign = crypto.createSign('SHA256');
            sign.update(data, 'utf8');
            return sign.sign(formattedKey, 'base64');
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
            const formattedKey = this.formatPublicKey(publicKey);
            const verify = crypto.createVerify('SHA256');
            verify.update(data, 'utf8');
            return verify.verify(formattedKey, signature, 'base64');
        } catch (error) {
            console.error('RSA验签失败:', error);
            return false;
        }
    }

    /**
     * 格式化私钥（添加PEM头尾）
     * @param {string} key - 私钥（可能不含PEM头尾）
     * @returns {string} 格式化后的私钥
     */
    static formatPrivateKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) {
            return key;
        }
        // Base64编码的密钥，添加PEM头尾
        return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }

    /**
     * 格式化公钥（添加PEM头尾）
     * @param {string} key - 公钥（可能不含PEM头尾）
     * @returns {string} 格式化后的公钥
     */
    static formatPublicKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) {
            return key;
        }
        // Base64编码的密钥，添加PEM头尾
        return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
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
     * 发送汇付API请求
     * @param {string} apiUrl - API路径
     * @param {Object} requestData - 请求数据
     * @param {string} method - HTTP方法
     * @returns {Promise<Object>} 响应结果
     */
    static async request(apiUrl, requestData, method = 'POST') {
        try {
            // 序列化请求数据
            const dataStr = JSON.stringify(requestData);

            // 生成签名
            const sign = HuifuSignUtils.sign(dataStr, HUIFU_CONFIG.privateKey);

            // 构建完整请求体
            const requestBody = {
                req_data: dataStr,
                sign: sign
            };

            // 构建完整URL
            const url = HUIFU_CONFIG.gatewayUrl + apiUrl;

            console.log(`[汇付请求] ${method} ${url}`);
            console.log(`[汇付请求数据]`, JSON.stringify(requestData, null, 2));

            // 发送HTTPS请求
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: method === 'POST' ? JSON.stringify(requestBody) : undefined,
                timeout: 30000  // 30秒超时
            });

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

            // 验证响应签名
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

            // 解析resp_data
            if (result.resp_data) {
                try {
                    result.data = JSON.parse(result.resp_data);
                } catch (e) {
                    console.error('解析resp_data失败:', e);
                }
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
     * 构建H5支付下单请求
     * @param {Object} params - 订单参数
     * @returns {Object} 包含url和requestData的对象
     */
    static buildOrderRequest(params) {
        const {
            orderNo,           // 商户订单号
            transAmt,          // 交易金额（分）
            goodsDesc = '门票', // 商品描述
            userInfo = {},     // 用户信息
            clientIp = '127.0.0.1'
        } = params;

        const reqDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const reqSeqId = HuifuSignUtils.generateReqSeqId();

        // 计算过期时间（30分钟后）
        const expireTime = new Date(Date.now() + 30 * 60 * 1000);
        const timeExpire = expireTime.toISOString().slice(0, 19).replace(/[-T:]/g, '');

        // 构建请求数据（根据汇付天下H5支付接口规范）
        const requestData = {
            req_seq_id: reqSeqId,
            req_date: reqDate,
            huifu_id: HUIFU_CONFIG.merchantId,
            sys_id: HUIFU_CONFIG.sysId,
            product_id: HUIFU_CONFIG.appId,
            mer_ord_id: orderNo,
            trans_amt: transAmt.toString(),
            goods_desc: goodsDesc,
            time_expire: timeExpire,
            client_ip: clientIp,
            notify_url: HUIFU_CONFIG.notifyUrl,
            bg_url: HUIFU_CONFIG.returnUrl
        };

        // 添加用户信息（如果有）
        if (userInfo && (userInfo.name || userInfo.phone)) {
            requestData.risk_check_data = {
                user_info: {
                    user_name: userInfo.name || '',
                    user_mobile: userInfo.phone || '',
                    user_email: userInfo.email || ''
                }
            };
        }

        return {
            url: '/gateway/api/rest/api/transaction/h5pay',
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

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
    res.json(successResponse({
        status: 'ok',
        timestamp: new Date().toISOString()
    }, '服务运行正常'));
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
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { orderNo, paymentMethod = 'HUIFU_H5', returnUrl } = req.body;

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

        // 7. 处理汇付响应
        if (huifuResult.data && huifuResult.data.resp_code === '00000000') {
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
                    huifuResult.data.hf_seq_id || '',
                    JSON.stringify(huifuResult.data),
                    req.ip || null
                ]
            );

            await connection.commit();

            // 返回支付URL
            res.json(successResponse({
                paymentId: orderRequest.reqSeqId,
                orderNo: orderNo,
                paymentUrl: huifuResult.data.pay_url || huifuResult.data.pay_url,
                expiredAt: order.expired_at
            }, '支付订单创建成功'));

        } else {
            throw new Error(huifuResult.data?.resp_desc || '汇付下单失败');
        }

    } catch (error) {
        await connection.rollback();
        console.error('创建汇付支付失败:', error);
        res.status(400).json(errorResponse(error.message || '创建支付失败'));
    } finally {
        connection.release();
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

        // 1. 获取回调参数
        const { resp_data, sign } = req.body;

        if (!resp_data || !sign) {
            console.error('[汇付回调] 参数缺失');
            return res.status(400).send('Bad Request');
        }

        console.log('[汇付回调] 收到异步通知');

        // 2. 验证签名（关键安全措施）
        const isValid = HuifuSignUtils.verify(
            resp_data,
            HUIFU_CONFIG.publicKey,
            sign
        );

        if (!isValid) {
            console.error('[汇付回调] 签名验证失败');
            return res.status(401).send('Sign Verify Failed');
        }

        console.log('[汇付回调] 签名验证通过');

        // 3. 解析回调数据
        const callbackData = JSON.parse(resp_data);

        const {
            mer_ord_id: orderNo,
            req_seq_id: reqSeqId,
            trans_amt: transAmt,
            trans_stat: transStat,
            hf_seq_id: hfSeqId,
            sub_resp_code: subRespCode,
            sub_resp_desc: subRespDesc
        } = callbackData;

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

        // 7. 处理支付成功
        if (subRespCode === '00000000' && transStat === 'S') {

            // 更新订单状态
            await connection.query(
                `UPDATE orders SET
                    order_status = 'PAID',
                    payment_status = 'PAID',
                    paid_amount = ?,
                    transaction_id = ?,
                    paid_at = NOW()
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
                    payment_time = NOW()
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
    try {
        const { ticketTypeId = 3, applicantInfo } = req.body;

        if (!applicantInfo || !applicantInfo.name || !applicantInfo.phone) {
            return res.status(400).json(errorResponse('申请信息不完整'));
        }

        // 检查是否已有待审核申请
        const [existingApps] = await pool.query(
            `SELECT id FROM invitation_applications
             WHERE applicant_phone = ? AND audit_status = 'PENDING'`,
            [applicantInfo.phone]
        );

        if (existingApps.length > 0) {
            return res.status(400).json(errorResponse('您已有待审核的申请，请勿重复提交'));
        }

        // 检查是否已获得邀请函
        const [existingTickets] = await pool.query(
            `SELECT t.id FROM tickets t
             INNER JOIN orders o ON t.order_id = o.id
             WHERE t.user_phone = ? AND t.ticket_category = 'INVITATION' AND t.ticket_status = 'ACTIVE'`,
            [applicantInfo.phone]
        );

        if (existingTickets.length > 0) {
            return res.status(400).json(errorResponse('您已拥有有效的邀请函票'));
        }

        const applicationNo = generateApplicationNo();

        const [result] = await pool.query(
            `INSERT INTO invitation_applications (
                application_no, applicant_name, applicant_phone, applicant_email,
                applicant_company, applicant_position, apply_reason,
                ticket_type_id, apply_quantity, audit_status, source_type,
                client_ip, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                applicationNo,
                applicantInfo.name,
                applicantInfo.phone,
                applicantInfo.email || null,
                applicantInfo.company || null,
                applicantInfo.position || null,
                applicantInfo.reason || null,
                ticketTypeId,
                1,
                'PENDING',
                'WEB',
                req.ip || null
            ]
        );

        res.json(successResponse({
            applicationId: result.insertId,
            applicationNo,
            auditStatus: 'PENDING'
        }, '申请提交成功'));

    } catch (error) {
        console.error('提交邀请函申请失败:', error);
        res.status(500).json(errorResponse('提交申请失败'));
    }
});

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

// ==================== 票券模块 ====================

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

// ==================== 核销模块 ====================

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
                `INSERT INTO verification_records (
                    ticket_no, verify_type, verify_status, verifier_id,
                    verifier_name, device_id, fail_reason, verify_time
                ) VALUES (?, 'QR_CODE', 'FAILED', ?, ?, ?, '票券不存在', NOW())`,
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
                `INSERT INTO verification_records (
                    ticket_id, ticket_no, order_id, verify_type, verify_status,
                    verifier_id, verifier_name, device_id, fail_reason, verify_time
                ) VALUES (?, ?, ?, 'QR_CODE', 'FAILED', ?, ?, ?, ?, NOW())`,
                [ticket.id, ticket.ticket_no, ticket.order_id, verifierInfo.verifierId, verifierInfo.verifierName || '', verifierInfo.deviceId || '', statusText]
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
                `INSERT INTO verification_records (
                    ticket_id, ticket_no, order_id, verify_type, verify_status,
                    verifier_id, verifier_name, device_id, fail_reason, verify_time
                ) VALUES (?, ?, ?, 'QR_CODE', 'FAILED', ?, ?, ?, '不在有效期内', NOW())`,
                [ticket.id, ticket.ticket_no, ticket.order_id, verifierInfo.verifierId, verifierInfo.verifierName || '', verifierInfo.deviceId || '']
            );
            await connection.commit();
            return res.status(400).json(errorResponse('不在有效期内'));
        }

        // 更新票券状态
        const [result] = await connection.query(
            `UPDATE tickets SET
                ticket_status = 'USED',
                verified_at = NOW(),
                verified_by = ?,
                verified_device = ?,
                verify_location = ?
            WHERE id = ? AND ticket_status = 'ACTIVE'`,
            [
                verifierInfo.verifierId,
                verifierInfo.deviceId || null,
                verifierInfo.location || null,
                ticket.id
            ]
        );

        if (result.affectedRows === 0) {
            await connection.commit();
            return res.status(400).json(errorResponse('票券已被核销'));
        }

        // 记录核销成功日志
        await connection.query(
            `INSERT INTO verification_records (
                ticket_id, ticket_no, order_id, verify_type, verify_status,
                verifier_id, verifier_name, device_id, verify_location,
                verify_gate, verify_time
            ) VALUES (?, ?, ?, 'QR_CODE', 'SUCCESS', ?, ?, ?, ?, ?, NOW())`,
            [
                ticket.id,
                ticket.ticket_no,
                ticket.order_id,
                verifierInfo.verifierId,
                verifierInfo.verifierName || '',
                verifierInfo.deviceId || '',
                verifierInfo.location || '',
                verifierInfo.gate || null
            ]
        );

        await connection.commit();

        res.json(successResponse({
            ticketNo: ticket.ticket_no,
            ticketName: ticket.ticket_name,
            userName: ticket.user_name,
            userPhone: ticket.user_phone.substring(0, 3) + '****' + ticket.user_phone.substring(7),
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
            SELECT vr.*, t.ticket_name, t.user_name, t.user_phone
            FROM verification_records vr
            LEFT JOIN tickets t ON vr.ticket_no = t.ticket_no
            WHERE 1=1
        `;
        const params = [];
        const conditions = [];

        if (verifierId) {
            conditions.push('vr.verifier_id = ?');
            params.push(verifierId);
        }

        if (startDate) {
            conditions.push('vr.verify_time >= ?');
            params.push(startDate);
        }

        if (endDate) {
            conditions.push('vr.verify_time <= ?');
            params.push(endDate);
        }

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY vr.verify_time DESC LIMIT ? OFFSET ?';
        params.push(parseInt(pageSize), (parseInt(page) - 1) * parseInt(pageSize));

        const [records] = await pool.query(query, params);

        // 查询总数
        let countQuery = 'SELECT COUNT(*) as total FROM verification_records vr WHERE 1=1';
        const countParams = [];
        const countConditions = [];

        if (verifierId) {
            countConditions.push('verifier_id = ?');
            countParams.push(verifierId);
        }

        if (startDate) {
            countConditions.push('verify_time >= ?');
            countParams.push(startDate);
        }

        if (endDate) {
            countConditions.push('verify_time <= ?');
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

        // 有效期设置（可根据实际活动时间调整）
        const validStartTime = new Date('2024-06-01T09:00:00');
        const validEndTime = new Date('2024-06-03T18:00:00');

        const [ticketResult] = await connection.query(
            `INSERT INTO tickets (
                ticket_no, order_id, order_no, user_name, user_phone,
                ticket_type_id, ticket_code, ticket_name, ticket_category,
                qr_code_token, qr_code_short,
                valid_start_time, valid_end_time, ticket_status,
                total_amount, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                ticketNo,
                orderId,
                orderNo,
                userInfo.name,
                userInfo.phone,
                ticketTypeId,
                ticketType.code,
                ticketType.name,
                ticketType.category || 'PAID',
                qrCodeToken,
                qrCodeShort,
                validStartTime,
                validEndTime,
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
    console.log(`     • 我的票券: GET    http://localhost:${PORT}/api/v1/tickets/my-tickets`);
    console.log(`     • 扫码核销: POST   http://localhost:${PORT}/api/v1/verify/scan`);
    console.log(`     • 核销记录: GET    http://localhost:${PORT}/api/v1/verify/records`);
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
