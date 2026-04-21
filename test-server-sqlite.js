/**
 * 票务系统测试服务器 - SQLite版本
 * 用于测试汇付支付功能（无需安装MySQL）
 */

// 加载环境变量
require('dotenv').config();

const express = require('express');
const crypto = require('crypto');
const QRCode = require('qrcode');
const cors = require('cors');
const path = require('path');

// 使用SQLite适配器
const { pool } = require('./sqlite-adapter');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// ==================== 中间件配置 ====================
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ==================== 验证码存储（开发环境使用内存存储） ====================
const verificationCodes = new Map(); // mobile -> { code, createdAt, expiresAt, attempts }

// ==================== 票种配置 ====================
const TICKET_TYPES = {
    EARLY_BIRD: {
        name: '早鸟票',
        category: 'PAID',
        originalPrice: 59.90,
        salePrice: 39.90
    },
    VIP: {
        name: 'VIP票',
        category: 'PAID',
        originalPrice: 299.00,
        salePrice: 199.00
    },
    INVITATION: {
        name: '邀请函票',
        category: 'INVITATION',
        originalPrice: 0,
        salePrice: 0
    }
};

// ==================== 汇付配置 ====================
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

// ==================== 工具函数 ====================
function generateOrderNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `NE${timestamp}${random}`;
}

function generateTicketNo() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    return `TK${timestamp}${random}`;
}

function successResponse(data = {}, message = '操作成功') {
    return {
        code: 'SUCCESS',
        message,
        data,
        timestamp: new Date().toISOString()
    };
}

function errorResponse(message = '操作失败', code = 'ERROR') {
    return {
        code,
        message,
        timestamp: new Date().toISOString()
    };
}

// ==================== 汇付签名工具 ====================
class HuifuSignUtils {
    static sign(data, privateKey) {
        if (!privateKey) return '';
        try {
            const sign = crypto.createSign('RSA-SHA256');
            sign.update(data);
            sign.end();
            return sign.sign(privateKey, 'base64');
        } catch (error) {
            console.error('签名生成失败:', error.message);
            return '';
        }
    }

    static verify(data, publicKey, signature) {
        if (!publicKey) return false;
        try {
            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(data);
            verify.end();
            return verify.verify(publicKey, signature, 'base64');
        } catch (error) {
            console.error('签名验证失败:', error.message);
            return false;
        }
    }

    static formatPrivateKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) return key;
        return `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
    }

    static formatPublicKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) return key;
        return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    }

    static generateReqSeqId() {
        return Date.now().toString();
    }
}

function validateHuifuConfig() {
    const required = ['merchantId', 'appId', 'privateKey', 'publicKey'];
    const missing = required.filter(key => !HUIFU_CONFIG[key]);

    if (missing.length > 0) {
        console.warn(`汇付天下配置缺失: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

// ==================== 健康检查 ====================
app.get('/health', (req, res) => {
    res.json(successResponse({
        status: 'ok',
        database: 'SQLite',
        huifu: validateHuifuConfig() ? 'configured' : 'not configured'
    }, '服务运行正常'));
});

// ==================== 短信验证码接口 ====================
/**
 * 发送短信验证码
 * POST /api/v1/sms/send-code
 * Body: { mobile: string }
 */
app.post('/api/v1/sms/send-code', async (req, res) => {
    try {
        const { mobile } = req.body;

        // 验证手机号格式
        if (!mobile || !/^1[3-9]\d{9}$/.test(mobile)) {
            return res.status(400).json(errorResponse('INVALID_MOBILE', '手机号格式不正确'));
        }

        const now = Date.now();
        const existingCode = verificationCodes.get(mobile);

        // 检查是否在60秒内重复发送
        if (existingCode && existingCode.createdAt > now - 60000) {
            const remainingSeconds = Math.ceil((existingCode.createdAt - (now - 60000)) / 1000);
            return res.status(429).json(errorResponse('TOO_FREQUENT', `发送过于频繁，请${remainingSeconds}秒后再试`));
        }

        // 生成6位随机验证码
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // 存储验证码（5分钟有效期）
        verificationCodes.set(mobile, {
            code,
            createdAt: now,
            expiresAt: now + 300000, // 5分钟
            attempts: 0
        });

        // 开发环境：在控制台打印验证码
        console.log(`[SMS验证码] 手机号: ${mobile}, 验证码: ${code}, 有效期: 5分钟`);

        // TODO: 生产环境需要对接真实短信服务
        // await sendSMSviaProvider(mobile, code);

        res.json(successResponse({
            mobile,
            expiresIn: 300, // 5分钟
            // 开发环境返回验证码（方便测试），生产环境应移除
            debugCode: process.env.NODE_ENV === 'development' ? code : undefined
        }, '验证码发送成功'));

    } catch (error) {
        console.error('发送验证码失败:', error);
        res.status(500).json(errorResponse('SERVER_ERROR', '服务器错误'));
    }
});

/**
 * 验证短信验证码
 * POST /api/v1/sms/verify-code
 * Body: { mobile: string, code: string }
 */
app.post('/api/v1/sms/verify-code', (req, res) => {
    try {
        const { mobile, code } = req.body;

        if (!mobile || !code) {
            return res.status(400).json(errorResponse('MISSING_PARAMS', '缺少必要参数'));
        }

        // 开发环境测试模式：万能验证码 "123456"
        if (process.env.NODE_ENV !== 'production' && code === '123456') {
            console.log(`[SMS验证码] 测试模式验证通过: ${mobile}`);
            return res.json(successResponse({
                mobile,
                verified: true,
                testMode: true
            }, '验证成功（测试模式）'));
        }

        const storedData = verificationCodes.get(mobile);

        // 检查验证码是否存在
        if (!storedData) {
            return res.status(400).json(errorResponse('CODE_NOT_FOUND', '验证码不存在或已过期'));
        }

        // 检查是否过期
        if (Date.now() > storedData.expiresAt) {
            verificationCodes.delete(mobile);
            return res.status(400).json(errorResponse('CODE_EXPIRED', '验证码已过期'));
        }

        // 检查尝试次数（防止暴力破解）
        if (storedData.attempts >= 5) {
            verificationCodes.delete(mobile);
            return res.status(429).json(errorResponse('TOO_MANY_ATTEMPTS', '验证失败次数过多，请重新获取'));
        }

        // 验证码是否正确
        if (storedData.code !== code) {
            storedData.attempts++;
            return res.status(400).json(errorResponse('CODE_INVALID', '验证码不正确'));
        }

        // 验证成功，删除验证码
        verificationCodes.delete(mobile);

        res.json(successResponse({
            mobile,
            verified: true
        }, '验证成功'));

    } catch (error) {
        console.error('验证码验证失败:', error);
        res.status(500).json(errorResponse('SERVER_ERROR', '服务器错误'));
    }
});

// ==================== 订单相关接口 ====================
app.post('/api/v1/orders', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { ticketTypeCode, quantity, userInfo } = req.body;

        // 验证票种
        if (!TICKET_TYPES[ticketTypeCode]) {
            throw new Error('无效的票种代码');
        }

        const ticketType = TICKET_TYPES[ticketTypeCode];
        const orderNo = generateOrderNo();
        const totalAmount = ticketType.salePrice * quantity;

        // 创建订单
        const [orderResult] = await connection.query(
            `INSERT INTO orders (order_no, ticket_type_code, ticket_name, quantity, unit_price, total_amount, buyer_name, buyer_phone, order_status, payment_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 'UNPAID')`,
            [orderNo, ticketTypeCode, ticketType.name, quantity, ticketType.salePrice, totalAmount, userInfo.name, userInfo.phone]
        );

        await connection.commit();
        connection.release();

        res.json(successResponse({
            orderNo,
            ticketType: ticketTypeCode,
            ticketName: ticketType.name,
            quantity,
            unitPrice: ticketType.salePrice,
            totalAmount,
            orderStatus: 'PENDING',
            paymentStatus: 'UNPAID',
            createdAt: new Date().toISOString()
        }, '订单创建成功'));

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('订单创建失败:', error);
        res.status(500).json(errorResponse(error.message));
    }
});

app.get('/api/v1/orders/:orderNo', async (req, res) => {
    try {
        const { orderNo } = req.params;
        const connection = await pool.getConnection();

        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ?',
            [orderNo]
        );

        connection.release();

        if (!orders || orders.length === 0) {
            return res.status(404).json(errorResponse('订单不存在'));
        }

        res.json(successResponse(orders[0], '查询成功'));

    } catch (error) {
        console.error('订单查询失败:', error);
        res.status(500).json(errorResponse(error.message));
    }
});

// ==================== 支付相关接口 ====================
app.post('/api/v1/payments/huifu/create', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { orderNo, paymentMethod = 'HUIFU_H5', returnUrl } = req.body;

        // 验证汇付配置
        if (!validateHuifuConfig()) {
            throw new Error('汇付天下配置不完整');
        }

        // 查询订单（带锁）
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (!orders || orders.length === 0) {
            throw new Error('订单不存在');
        }

        const order = orders[0];

        // 验证订单状态
        if (order.payment_status === 'PAID') {
            await connection.commit();
            connection.release();
            return res.json(errorResponse('订单已支付', 'ALREADY_PAID'));
        }

        // 计算金额（分）
        const amountCent = Math.round(order.total_amount * 100);

        // 构建汇付请求参数
        const reqData = {
            trans_amt: amountCent.toString(),
            goods_desc: `${order.ticket_name} x${order.quantity}`,
            trans_curr_type: 'CNY',
            req_seq_id: `${orderNo}_${Date.now()}`,
            req_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
            party_order_id: orderNo,
            pay_mode: 'H5',
            risk_check_data: JSON.stringify({
                user_info_bind_phone: order.buyer_phone
            }),
            auth_code: '',
            acq_name: '',
            settle_cycle: '',
            buyer_bind_phone: order.buyer_phone,
            front_url: returnUrl || HUIFU_CONFIG.returnUrl,
            notify_url: HUIFU_CONFIG.notifyUrl
        };

        // 序列化请求数据
        const reqDataStr = JSON.stringify(reqData);

        // 生成签名
        const privateKey = HuifuSignUtils.formatPrivateKey(HUIFU_CONFIG.privateKey);
        const sign = HuifuSignUtils.sign(reqDataStr, privateKey);

        // 构建完整请求
        const requestData = {
            req_data: reqDataStr,
            sign,
            ev: 'RSA_1_1',
            merchant_id: HUIFU_CONFIG.merchantId,
            sys_id: HUIFU_CONFIG.sysId,
            product_id: HUIFU_CONFIG.appId
        };

        // 保存支付记录
        await connection.query(
            `INSERT INTO payment_records (order_no, payment_method, amount, status)
             VALUES (?, ?, ?, 'PENDING')`,
            [orderNo, paymentMethod, order.total_amount]
        );

        await connection.commit();
        connection.release();

        // 返回支付URL（测试模式）
        const paymentUrl = `${HUIFU_CONFIG.gatewayUrl}/api/page/pay/request`;

        res.json(successResponse({
            orderNo,
            paymentUrl,
            amount: order.total_amount,
            requestData // 调试信息
        }, '支付订单创建成功'));

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('支付创建失败:', error);
        res.status(500).json(errorResponse(error.message));
    }
});

app.post('/api/v1/payments/huifu/notify', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { resp_data, sign } = req.body;

        // 验证签名
        const publicKey = HuifuSignUtils.formatPublicKey(HUIFU_CONFIG.publicKey);
        const isValid = HuifuSignUtils.verify(resp_data, publicKey, sign);

        if (!isValid) {
            await connection.rollback();
            connection.release();
            return res.status(401).send('Sign Verify Failed');
        }

        // 解析回调数据
        const data = JSON.parse(resp_data);
        const { party_order_id: orderNo, trans_amt, trans_stat } = data;

        // 查询订单（带锁）
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (!orders || orders.length === 0) {
            await connection.commit();
            connection.release();
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        const order = orders[0];

        // 幂等检查
        if (order.payment_status === 'PAID') {
            await connection.commit();
            connection.release();
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        // 金额校验
        const orderAmountCent = Math.round(order.total_amount * 100);
        if (trans_amt !== orderAmountCent.toString()) {
            console.error('金额不匹配');
            await connection.commit();
            connection.release();
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        // 检查交易状态
        if (trans_stat !== 'S') {
            await connection.commit();
            connection.release();
            return res.status(200).send('RECV_ORD_ID_' + orderNo);
        }

        // 更新订单状态
        await connection.query(
            `UPDATE orders SET
                payment_status = 'PAID',
                payment_time = datetime('now'),
                order_status = 'PAID'
             WHERE order_no = ?`,
            [orderNo]
        );

        // 更新支付记录
        await connection.query(
            `UPDATE payment_records SET
                status = 'SUCCESS',
                payment_time = datetime('now')
             WHERE order_no = ?`,
            [orderNo]
        );

        await connection.commit();
        connection.release();

        res.status(200).send('RECV_ORD_ID_' + orderNo);

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('支付回调处理失败:', error);
        res.status(500).send('ERROR');
    }
});

// ==================== 测试用简化支付回调 ====================
/**
 * 简化版支付回调（仅用于测试，不需要签名）
 * 警告：生产环境请删除此接口或添加严格的访问控制
 */
app.post('/api/v1/payments/notify', async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { orderNo, status, amount, transactionId } = req.body;

        if (!orderNo || !status) {
            throw new Error('参数不完整');
        }

        console.log(`[测试支付回调] 订单号=${orderNo}, 状态=${status}`);

        // 查询订单（带锁）
        const [orders] = await connection.query(
            'SELECT * FROM orders WHERE order_no = ? FOR UPDATE',
            [orderNo]
        );

        if (!orders || orders.length === 0) {
            await connection.commit();
            connection.release();
            return res.json(errorResponse('订单不存在'));
        }

        const order = orders[0];

        // 幂等检查
        if (order.payment_status === 'PAID') {
            await connection.commit();
            connection.release();
            return res.json(successResponse(null, '订单已支付'));
        }

        // 处理支付成功
        if (status === 'success') {
            // 更新订单状态
            await connection.query(
                `UPDATE orders SET
                    payment_status = 'PAID',
                    payment_time = datetime('now'),
                    order_status = 'PAID',
                    trade_no = ?
                 WHERE order_no = ?`,
                [transactionId || `TEST_${Date.now()}`, orderNo]
            );

            // 更新支付记录
            await connection.query(
                `UPDATE payment_records SET
                    status = 'SUCCESS',
                    payment_time = datetime('now')
                 WHERE order_no = ?`,
                [orderNo]
            );

            await connection.commit();
            connection.release();

            console.log(`[测试支付回调] 订单支付成功: ${orderNo}`);
            return res.json(successResponse(null, '支付成功'));

        } else {
            // 支付失败
            await connection.query(
                `UPDATE payment_records SET status = 'FAILED' WHERE order_no = ?`,
                [orderNo]
            );

            await connection.commit();
            connection.release();

            return res.json(errorResponse('支付失败'));
        }

    } catch (error) {
        if (connection) {
            await connection.rollback();
            connection.release();
        }
        console.error('[测试支付回调] 处理失败:', error);
        res.status(500).json(errorResponse(error.message));
    }
});

// ==================== 验票系统API ====================
/**
 * 导入验票服务
 */
const verifyService = require('./services/verifyService');

/**
 * 统一响应格式
 */
function successResponse(data = null, message = '操作成功') {
    return {
        code: 'SUCCESS',
        message,
        data,
        timestamp: new Date().toISOString()
    };
}

function errorResponse(message = '操作失败', code = 'ERROR') {
    return {
        code,
        message,
        timestamp: new Date().toISOString()
    };
}

/**
 * 预校验票券接口
 * POST /api/v1/tickets/verify-preview
 */
app.post('/api/v1/tickets/verify-preview', async (req, res) => {
    try {
        const { qr_content } = req.body;

        if (!qr_content) {
            return res.status(400).json(errorResponse('缺少二维码内容'));
        }

        const result = await verifyService.verifyPreview(qrContent);
        res.json(result);

    } catch (error) {
        console.error('预校验票券失败:', error);
        res.status(500).json(errorResponse('服务器错误'));
    }
});

/**
 * 确认核销接口
 * POST /api/v1/tickets/writeoff
 */
app.post('/api/v1/tickets/writeoff', async (req, res) => {
    try {
        const { ticket_code, operator_id, operator_name, device_id, gate_name } = req.body;

        if (!ticket_code || !operator_id || !operator_name) {
            return res.status(400).json(errorResponse('缺少必要参数'));
        }

        const result = await verifyService.writeoffTicket(ticket_code, {
            operatorId,
            operatorName,
            deviceId: device_id,
            gateName: gate_name
        });

        res.json(result);

    } catch (error) {
        console.error('核销票券失败:', error);
        res.status(500).json(errorResponse('服务器错误'));
    }
});

/**
 * 按手机号查询票券接口
 * GET /api/v1/tickets/search
 */
app.get('/api/v1/tickets/search', async (req, res) => {
    try {
        const { mobile } = req.query;

        if (!mobile) {
            return res.status(400).json(errorResponse('缺少手机号参数'));
        }

        // 验证手机号格式
        if (!/^1[3-9]\d{9}$/.test(mobile)) {
            return res.status(400).json(errorResponse('手机号格式不正确'));
        }

        const result = await verifyService.searchByMobile(mobile);
        res.json(result);

    } catch (error) {
        console.error('查询票券失败:', error);
        res.status(500).json(errorResponse('服务器错误'));
    }
});

/**
 * 获取核销记录接口
 * GET /api/v1/verify/records
 */
app.get('/api/v1/verify/records', async (req, res) => {
    try {
        const filters = {
            operator_id: req.query.operator_id,
            start_date: req.query.start_date,
            end_date: req.query.end_date,
            verify_result: req.query.verify_result,
            page: req.query.page,
            page_size: req.query.page_size
        };

        const result = await verifyService.getVerifyRecords(filters);
        res.json(result);

    } catch (error) {
        console.error('查询核销记录失败:', error);
        res.status(500).json(errorResponse('服务器错误'));
    }
});

// ==================== 我的票券API ====================
/**
 * 查询我的票券
 * GET /api/v1/tickets/my-tickets
 */
app.get('/api/v1/tickets/my-tickets', async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json(errorResponse('缺少手机号参数'));
        }

        const connection = await pool.getConnection();

        try {
            const [tickets] = await connection.query(
                `SELECT t.id, t.ticket_no, t.ticket_code, t.ticket_type_code as ticketTypeCode,
                        t.ticket_name as ticketName, t.visitor_name as userName,
                        t.visitor_phone as userPhone, t.ticket_status, t.check_status,
                        t.check_time, t.valid_start_time as validStartTime,
                        t.valid_end_time as validEndTime, t.created_at,
                        o.order_type as ticketCategory, tt.sale_price as ticketPrice
                 FROM tickets t
                 LEFT JOIN orders o ON t.order_no = o.order_no
                 LEFT JOIN ticket_types tt ON t.ticket_type_code = tt.ticket_code
                 WHERE t.visitor_phone = ?
                 ORDER BY t.created_at DESC`,
                [phone]
            );

            connection.release();

            const ticketList = tickets.map(ticket => {
                // 生成加密token（如果还没有）
                if (!ticket.ticket_code || ticket.ticket_code === '') {
                    const expireTime = new Date(ticket.validEndTime);
                    const { generateTicketCode } = require('./utils/token');
                    ticket.ticket_code = generateTicketCode(ticket.ticket_no, expireTime);
                    ticket.qrCodeToken = ticket.ticket_code;
                }

                return {
                    ticketId: ticket.id,
                    ticketNo: ticket.ticket_no,
                    ticketCode: ticket.ticket_code,
                    qrCodeToken: ticket.ticket_code,
                    qrCodeShort: ticket.ticket_no.substring(ticket.ticket_no.length - 8),
                    ticketType: ticket.ticketTypeCode,
                    ticketName: ticket.ticketName,
                    userName: ticket.userName,
                    userPhone: ticket.userPhone,
                    ticketStatus: ticket.ticket_status,
                    verifiedAt: ticket.check_time,
                    ticketCategory: ticket.ticketCategory || 'PAID',
                    ticketPrice: ticket.ticketPrice ? Math.round(ticket.ticketPrice * 100) : 0,
                    validStartTime: ticket.validStartTime,
                    validEndTime: ticket.validEndTime
                };
            });

            res.json(successResponse({
                total: ticketList.length,
                list: ticketList
            }, '查询成功'));

        } catch (error) {
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('查询我的票券失败:', error);
        res.status(500).json(errorResponse('查询失败'));
    }
});

/**
 * 查询票券详情
 * GET /api/v1/tickets/:ticketNo
 */
app.get('/api/v1/tickets/:ticketNo', async (req, res) => {
    try {
        const { ticketNo } = req.params;

        const connection = await pool.getConnection();

        try {
            const [tickets] = await connection.query(
                `SELECT t.*, tt.sale_price as ticketPrice
                 FROM tickets t
                 LEFT JOIN ticket_types tt ON t.ticket_type_code = tt.ticket_code
                 WHERE t.ticket_no = ?`,
                [ticketNo]
            );

            connection.release();

            if (!tickets || tickets.length === 0) {
                return res.status(404).json(errorResponse('票券不存在'));
            }

            const ticket = tickets[0];

            res.json(successResponse(ticket, '查询成功'));

        } catch (error) {
            connection.release();
            throw error;
        }

    } catch (error) {
        console.error('查询票券详情失败:', error);
        res.status(500).json(errorResponse('查询失败'));
    }
});

// ==================== 启动服务器 ====================
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║          东北亚数字文创博览会 - 票务系统（SQLite测试版）      ║');
    console.log('║          Ticket System Server (SQLite Test Edition)           ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   服务器运行中: http://localhost:${PORT}`);
    console.log('');
    console.log('   可用端点:');
    console.log(`     • 健康检查: GET    http://localhost:${PORT}/health`);
    console.log(`     • 创建订单: POST   http://localhost:${PORT}/api/v1/orders`);
    console.log(`     • 查询订单: GET    http://localhost:${PORT}/api/v1/orders/:orderNo`);
    console.log(`     • 创建支付: POST   http://localhost:${PORT}/api/v1/payments/huifu/create`);
    console.log(`     • 支付回调: POST   http://localhost:${PORT}/api/v1/payments/huifu/notify`);
    console.log('');
    console.log('   短信验证:');
    console.log(`     • 发送验证码: POST http://localhost:${PORT}/api/v1/sms/send-code`);
    console.log(`     • 验证验证码: POST http://localhost:${PORT}/api/v1/sms/verify-code`);
    console.log('');
    console.log('   验票系统:');
    console.log(`     • 预校验票券: POST http://localhost:${PORT}/api/v1/tickets/verify-preview`);
    console.log(`     • 确认核销:   POST http://localhost:${PORT}/api/v1/tickets/writeoff`);
    console.log(`     • 手机号查询: GET  http://localhost:${PORT}/api/v1/tickets/search?mobile=xxx`);
    console.log(`     • 核销记录:   GET  http://localhost:${PORT}/api/v1/verify/records`);
    console.log('');
    console.log('   环境变量:');
    console.log(`     • 数据库: SQLite`);
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
    console.log('   提示: 使用SQLite数据库进行测试，无需安装MySQL');
    console.log('');
});

module.exports = app;
