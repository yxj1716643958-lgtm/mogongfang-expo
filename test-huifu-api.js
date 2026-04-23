/**
 * 汇付API实际测试
 */
require('dotenv').config();
const crypto = require('crypto');

// 汇付配置
const HUIFU_CONFIG = {
    merchantId: process.env.HUIFU_MERCHANT_ID || '',
    sysId: process.env.HUIFU_SYS_ID || '',
    appId: process.env.HUIFU_APP_ID || '',
    privateKey: process.env.HUIFU_PRIVATE_KEY || '',
    publicKey: process.env.HUIFU_PUBLIC_KEY || '',
    notifyUrl: process.env.HUIFU_NOTIFY_URL || 'http://localhost:3001/api/v1/payments/huifu/notify',
    returnUrl: process.env.HUIFU_RETURN_URL || 'http://localhost:8080/payment-result.html',
    gatewayUrl: process.env.HUIFU_GATEWAY_URL || 'https://spin.cloudpnr.com',
};

class HuifuSignUtils {
    static sign(data, privateKey) {
        try {
            const formattedKey = privateKey.includes('-----BEGIN')
                ? privateKey
                : `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
            const sign = crypto.createSign('SHA256');
            sign.update(data, 'utf8');
            return sign.sign(formattedKey, 'base64');
        } catch (error) {
            console.error('RSA签名失败:', error);
            throw new Error('签名失败');
        }
    }

    static generateReqSeqId() {
        return Date.now().toString() + Math.floor(Math.random() * 1000000).toString();
    }
}

async function testHuifuAPI() {
    console.log('='.repeat(60));
    console.log('汇付API实际测试');
    console.log('='.repeat(60));

    // 构建请求数据
    const reqDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reqSeqId = HuifuSignUtils.generateReqSeqId();
    const expireTime = new Date(Date.now() + 30 * 60 * 1000);
    const timeExpire = expireTime.toISOString().slice(0, 19).replace(/[-T:]/g, '');

    const requestData = {
        req_seq_id: reqSeqId,
        req_date: reqDate,
        huifu_id: HUIFU_CONFIG.merchantId,
        sys_id: HUIFU_CONFIG.sysId,
        product_id: HUIFU_CONFIG.appId,
        mer_ord_id: 'TEST' + Date.now(),
        trans_amt: '3990',
        goods_desc: '早鸟体验票',
        time_expire: timeExpire,
        client_ip: '127.0.0.1',
        notify_url: HUIFU_CONFIG.notifyUrl,
        bg_url: HUIFU_CONFIG.returnUrl
    };

    console.log('\n1. 请求数据:');
    console.log(JSON.stringify(requestData, null, 2));

    // 序列化并签名
    const dataStr = JSON.stringify(requestData);
    const sign = HuifuSignUtils.sign(dataStr, HUIFU_CONFIG.privateKey);

    console.log('\n2. 签名:');
    console.log('  待签名数据长度:', dataStr.length);
    console.log('  签名值长度:', sign.length);
    console.log('  签名值(前50字符):', sign.substring(0, 50));

    // 构建请求体
    const requestBody = {
        req_data: dataStr,
        sign: sign
    };

    console.log('\n3. 发送请求:');
    const url = HUIFU_CONFIG.gatewayUrl + '/gateway/api/rest/api/transaction/h5pay';
    console.log('  URL:', url);

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 30000
        });

        console.log('\n4. 响应:');
        console.log('  HTTP状态:', response.status);
        console.log('  Content-Type:', response.headers.get('content-type'));

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            console.log('  响应内容:', text);
            return;
        }

        const result = await response.json();
        console.log('  响应数据:');
        console.log(JSON.stringify(result, null, 2));

        // 检查响应码
        if (result.resp_data) {
            const data = JSON.parse(result.resp_data);
            console.log('\n5. 业务响应:');
            console.log('  响应码:', data.resp_code);
            console.log('  响应描述:', data.resp_desc);
        }

        // 验证响应签名
        if (result.resp_data && result.sign) {
            console.log('\n6. 响应签名验证:');
            try {
                const formattedPublicKey = HUIFU_CONFIG.publicKey.includes('-----BEGIN')
                    ? HUIFU_CONFIG.publicKey
                    : `-----BEGIN PUBLIC KEY-----\n${HUIFU_CONFIG.publicKey}\n-----END PUBLIC KEY-----`;
                const verify = crypto.createVerify('SHA256');
                verify.update(result.resp_data, 'utf8');
                const isValid = verify.verify(formattedPublicKey, result.sign, 'base64');
                console.log('  签名验证:', isValid ? '✓ 通过' : '✗ 失败');
            } catch (e) {
                console.log('  签名验证失败:', e.message);
            }
        }

    } catch (error) {
        console.error('\n请求失败:', error.message);
        console.error('错误详情:', error);
    }

    console.log('\n' + '='.repeat(60));
}

testHuifuAPI();
