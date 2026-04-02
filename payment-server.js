/**
 * 微信支付 H5 支付服务器
 * 微信支付 v3 API
 *
 * 需要配置的环境变量：
 * - WECHAT_MCHID: 商户号
 * - WECHAT_SERIAL_NO: API证书序列号
 * - WECHAT_PRIVATE_KEY_PATH: 商户API私钥路径
 * - WECHAT_APICLIENT_CERT_PATH: 商户API证书路径
 * - WECHAT_APICLIENT_KEY_PATH: 商户API密钥路径
 * - WECHAT_NOTIFY_URL: 支付结果通知回调地址
 * - SERVER_PORT: 服务器端口 (默认 3000)
 */

const express = require('express');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const app = express();
const PORT = process.env.SERVER_PORT || 3000;

// 微信支付配置
const WECHAT_PAY_CONFIG = {
    mchid: process.env.WECHAT_MCHID || '',                    // 商户号
    serial_no: process.env.WECHAT_SERIAL_NO || '',             // API证书序列号
    private_key_path: process.env.WECHAT_PRIVATE_KEY_PATH || '', // 商户API私钥
    apiclient_cert: process.env.WECHAT_APICLIENT_CERT_PATH || '', // 商户API证书
    apiclient_key: process.env.WECHAT_APICLIENT_KEY_PATH || '',   // 商户API密钥
    notify_url: process.env.WECHAT_NOTIFY_URL || '',           // 支付结果通知URL
    appid: process.env.WECHAT_APPID || '',                     // 应用ID
    api_v3_key: process.env.WECHAT_API_V3_KEY || '',           // APIv3密钥
};

// 微信支付API地址
const WECHAT_PAY_API = {
    base: 'https://api.mch.weixin.qq.com',
    h5_order: '/v3/pay/transactions/h5',
    query_order: '/v3/pay/transactions/out-trade-no/{out_trade_no}',
    close_order: '/v3/pay/transactions/out-trade-no/{out_trade_no}/close',
};

// 票种配置
const TICKET_TYPES = {
    'STD-001': { name: '标准单日票', price: 9800 },      // 单位：分
    'PRO-002': { name: '专业/创作者票', price: 19800 },
    'VIP-003': { name: '至尊VIP通行证', price: 48800 },
};

// 内存存储订单（生产环境应使用数据库）
const orders = new Map();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 配置
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

/**
 * 生成商户订单号
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
 * 生成微信支付签名
 */
function wechatPaySign(method, url, timestamp, nonceStr, body) {
    const signStr = `${method}\n${url}\n${timestamp}\n${nonceStr}\n${body}\n`;

    // 读取私钥
    let privateKey;
    try {
        privateKey = fs.readFileSync(WECHAT_PAY_CONFIG.private_key_path);
    } catch (error) {
        console.error('读取私钥失败:', error.message);
        throw new Error('私钥文件读取失败');
    }

    const sign = crypto.createSign('SHA256');
    sign.update(signStr);
    return sign.sign(privateKey, 'base64');
}

/**
 * 发送微信支付请求
 */
function wechatPayRequest(method, path, body = '') {
    return new Promise((resolve, reject) => {
        const timestamp = Math.floor(Date.now() / 1000);
        const nonceStr = crypto.randomBytes(16).toString('hex');
        const url = WECHAT_PAY_API.base + path;

        // 生成签名
        const signature = wechatPaySign(method.toUpperCase(), path, timestamp, nonceStr, body);

        // 构建请求头
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${WECHAT_PAY_CONFIG.mchid}",nonce_str="${nonceStr}",timestamp="${timestamp}",serial_no="${WECHAT_PAY_CONFIG.serial_no}",signature="${signature}"`,
        };

        const options = {
            hostname: 'api.mch.weixin.qq.com',
            port: 443,
            path: path,
            method: method,
            headers: headers,
        };

        // 如果需要证书（退款等操作）
        if (WECHAT_PAY_CONFIG.apiclient_cert && WECHAT_PAY_CONFIG.apiclient_key) {
            options.cert = fs.readFileSync(WECHAT_PAY_CONFIG.apiclient_cert);
            options.key = fs.readFileSync(WECHAT_PAY_CONFIG.apiclient_key);
        }

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (res.statusCode === 200 || res.statusCode === 204) {
                        resolve(result);
                    } else {
                        reject({ statusCode: res.statusCode, ...result });
                    }
                } catch (error) {
                    reject({ statusCode: res.statusCode, message: data });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        if (body) {
            req.write(body);
        }
        req.end();
    });
}

/**
 * 解密支付回调通知数据
 */
function decryptNotify(ciphertext, associated_data, nonce) {
    const key = Buffer.from(WECHAT_PAY_CONFIG.api_v3_key, 'utf-8');
    const cipherText = Buffer.from(ciphertext, 'base64');

    const authTag = cipherText.slice(-16);
    const encrypted = cipherText.slice(0, -16);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(nonce, 'utf-8'));
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
}

/**
 * 验证微信支付签名
 */
function verifyNotifySign(timestamp, nonce, body, signature) {
    const signStr = `${timestamp}\n${nonceStr}\n${body}\n`;
    const pubKey = fs.readFileSync(WECHAT_PAY_CONFIG.apiclient_cert);

    const verify = crypto.createVerify('SHA256');
    verify.update(signStr);
    return verify.verify(pubKey, signature, 'base64');
}

// ==================== API 路由 ====================

/**
 * 健康检查
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: '支付服务运行正常' });
});

/**
 * 创建支付订单 - 统一下单
 */
app.post('/api/payment/create', async (req, res) => {
    try {
        const { ticketId, ticketName, ticketPrice, userInfo = {} } = req.body;

        // 验证票种
        if (!TICKET_TYPES[ticketId]) {
            return res.status(400).json({
                code: 'FAIL',
                message: '无效的票种ID'
            });
        }

        const ticket = TICKET_TYPES[ticketId];
        const actualPrice = ticketPrice || ticket.price;

        // 生成订单号
        const outTradeNo = generateOrderNo();

        // 构建订单数据
        const orderData = {
            appid: WECHAT_PAY_CONFIG.appid,
            mchid: WECHAT_PAY_CONFIG.mchid,
            description: ticket.name,
            out_trade_no: outTradeNo,
            notify_url: WECHAT_PAY_CONFIG.notify_url,
            amount: {
                total: actualPrice,
                currency: 'CNY'
            },
            scene_info: {
                payer_client_ip: req.ip || '127.0.0.1',
                h5_info: {
                    type: 'Wap',
                    app_name: '东北亚数字文创博览会',
                    app_url: req.headers.referer || 'https://your-domain.com'
                }
            }
        };

        // 保存订单
        orders.set(outTradeNo, {
            orderNo: outTradeNo,
            ticketId,
            ticketName: ticket.name,
            price: actualPrice,
            status: 'PENDING',
            userInfo,
            createdAt: new Date(),
        });

        // 调用微信支付统一下单API
        const result = await wechatPayRequest(
            'POST',
            WECHAT_PAY_API.h5_order,
            JSON.stringify(orderData)
        );

        // 返回支付链接
        res.json({
            code: 'SUCCESS',
            message: '订单创建成功',
            data: {
                orderNo: outTradeNo,
                ticketName: ticket.name,
                price: actualPrice,
                mwebUrl: result.h5_url || result.mweb_url
            }
        });

    } catch (error) {
        console.error('创建订单失败:', error);
        res.status(500).json({
            code: 'FAIL',
            message: error.message || '创建订单失败'
        });
    }
});

/**
 * 查询订单状态
 */
app.get('/api/payment/query/:orderNo', async (req, res) => {
    try {
        const { orderNo } = req.params;
        const order = orders.get(orderNo);

        if (!order) {
            return res.status(404).json({
                code: 'FAIL',
                message: '订单不存在'
            });
        }

        // 从微信支付查询订单状态
        const result = await wechatPayRequest(
            'GET',
            WECHAT_PAY_API.query_order.replace('{out_trade_no}', orderNo),
            ''
        );

        // 更新本地订单状态
        if (result.trade_state === 'SUCCESS') {
            order.status = 'PAID';
            order.paidAt = new Date();
            order.transactionId = result.transaction_id;
        }

        res.json({
            code: 'SUCCESS',
            data: {
                orderNo: order.orderNo,
                ticketName: order.ticketName,
                price: order.price,
                status: order.status,
                paidAt: order.paidAt,
            }
        });

    } catch (error) {
        console.error('查询订单失败:', error);
        res.status(500).json({
            code: 'FAIL',
            message: error.message || '查询订单失败'
        });
    }
});

/**
 * 微信支付结果通知回调
 */
app.post('/api/payment/notify', async (req, res) => {
    try {
        const { timestamp, nonce, body, signature } = req.body;

        // 验证签名
        if (!verifyNotifySign(timestamp, nonce, body, signature)) {
            return res.status(401).json({
                code: 'FAIL',
                message: '签名验证失败'
            });
        }

        // 解密回调数据
        const resource = req.body.resource;
        const decrypted = decryptNotify(
            resource.ciphertext,
            resource.associated_data,
            resource.nonce
        );

        const orderNo = decrypted.out_trade_no;
        const tradeState = decrypted.trade_state;

        // 更新订单状态
        if (orders.has(orderNo)) {
            const order = orders.get(orderNo);
            if (tradeState === 'SUCCESS') {
                order.status = 'PAID';
                order.paidAt = new Date();
                order.transactionId = decrypted.transaction_id;
                order.payerInfo = decrypted.payer;
            }
        }

        // 返回成功响应
        res.json({ code: 'SUCCESS', message: '处理成功' });

    } catch (error) {
        console.error('处理支付回调失败:', error);
        res.status(500).json({
            code: 'FAIL',
            message: '处理失败'
        });
    }
});

/**
 * 支付成功页面
 */
app.get('/payment/success', (req, res) => {
    const { orderNo } = req.query;
    res.sendFile(path.join(__dirname, 'payment-success.html'));
});

/**
 * 支付失败页面
 */
app.get('/payment/failed', (req, res) => {
    const { orderNo, errorCode } = req.query;
    res.sendFile(path.join(__dirname, 'payment-failed.html'));
});

// 启动服务器
app.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║          微信支付 H5 支付服务器                                ║');
    console.log('║          WeChat Pay H5 Payment Server                         ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   服务器运行中: http://localhost:${PORT}`);
    console.log(`   支付回调地址: ${WECHAT_PAY_CONFIG.notify_url || '请配置 WECHAT_NOTIFY_URL'}`);
    console.log('');
    console.log('   可用端点:');
    console.log(`     • 健康检查: http://localhost:${PORT}/health`);
    console.log(`     • 创建订单: POST http://localhost:${PORT}/api/payment/create`);
    console.log(`     • 查询订单: GET http://localhost:${PORT}/api/payment/query/:orderNo`);
    console.log(`     • 支付回调: POST http://localhost:${PORT}/api/payment/notify`);
    console.log('');
    console.log('   环境变量配置检查:');
    console.log(`     • 商户号 (WECHAT_MCHID): ${WECHAT_PAY_CONFIG.mchid ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`     • 应用ID (WECHAT_APPID): ${WECHAT_PAY_CONFIG.appid ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`     • API序列号 (WECHAT_SERIAL_NO): ${WECHAT_PAY_CONFIG.serial_no ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`     • 私钥路径 (WECHAT_PRIVATE_KEY_PATH): ${WECHAT_PAY_CONFIG.private_key_path ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`     • APIv3密钥 (WECHAT_API_V3_KEY): ${WECHAT_PAY_CONFIG.api_v3_key ? '✓ 已配置' : '✗ 未配置'}`);
    console.log(`     • 回调URL (WECHAT_NOTIFY_URL): ${WECHAT_PAY_CONFIG.notify_url ? '✓ 已配置' : '✗ 未配置'}`);
    console.log('');
    console.log('   提示: 请在项目目录创建 .env 文件配置以上环境变量');
    console.log('');
});

module.exports = app;
