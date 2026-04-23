/**
 * 汇付支付签名测试脚本
 */
require('dotenv').config();
const crypto = require('crypto');

// 汇付配置
const HUIFU_CONFIG = {
    merchantId: process.env.HUIFU_MERCHANT_ID || '',
    sysId: process.env.HUIFU_SYS_ID || '',
    appId: process.env.HUIFU_APP_ID || '',
    privateKey: process.env.HUIFU_PRIVATE_KEY || '',
    merchantPublicKey: process.env.HUIFU_MERCHANT_PUBLIC_KEY || '',
    publicKey: process.env.HUIFU_PUBLIC_KEY || '',
    notifyUrl: process.env.HUIFU_NOTIFY_URL || 'http://localhost:3001/api/v1/payments/huifu/notify',
    returnUrl: process.env.HUIFU_RETURN_URL || 'http://localhost:8080/payment-result.html',
    gatewayUrl: process.env.HUIFU_GATEWAY_URL || 'https://spin.cloudpnr.com',
    environment: process.env.HUIFU_ENVIRONMENT || 'PRODUCTION'
};

class HuifuSignUtils {
    /**
     * 生成RSA签名
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
     * 格式化私钥（添加PEM头尾）
     * 尝试PKCS#1和PKCS#8两种格式
     */
    static formatPrivateKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) {
            return key;
        }
        // 先尝试PKCS#8格式
        try {
            const pkcs8 = `-----BEGIN PRIVATE KEY-----\n${key}\n-----END PRIVATE KEY-----`;
            crypto.createSign('SHA256').update('test').sign(pkcs8);
            return pkcs8;
        } catch (e) {
            // 如果PKCS#8失败，尝试PKCS#1格式
            console.log('PKCS#8格式失败，尝试PKCS#1格式');
            const pkcs1 = `-----BEGIN RSA PRIVATE KEY-----\n${key}\n-----END RSA PRIVATE KEY-----`;
            return pkcs1;
        }
    }

    /**
     * 格式化公钥（添加PEM头尾）
     */
    static formatPublicKey(key) {
        if (!key) return '';
        if (key.includes('-----BEGIN')) {
            return key;
        }
        return `-----BEGIN PUBLIC KEY-----\n${key}\n-----END PUBLIC KEY-----`;
    }
}

console.log('='.repeat(60));
console.log('汇付支付签名测试');
console.log('='.repeat(60));

// 1. 检查配置完整性
console.log('\n1. 配置检查:');
console.log('  商户号:', HUIFU_CONFIG.merchantId || '未设置');
console.log('  系统ID:', HUIFU_CONFIG.sysId || '未设置');
console.log('  产品ID:', HUIFU_CONFIG.appId || '未设置');
console.log('  私钥长度:', HUIFU_CONFIG.privateKey.length);
console.log('  公钥长度:', HUIFU_CONFIG.publicKey.length);

// 2. 测试密钥格式化
console.log('\n2. 密钥格式化测试:');
const formattedPrivateKey = HuifuSignUtils.formatPrivateKey(HUIFU_CONFIG.privateKey);
const formattedPublicKey = HuifuSignUtils.formatPublicKey(HUIFU_CONFIG.publicKey);

console.log('  私钥前50字符:', formattedPrivateKey.substring(0, 50) + '...');
console.log('  公钥前50字符:', formattedPublicKey.substring(0, 50) + '...');

// 3. 模拟签名数据
console.log('\n3. 模拟签名测试:');

const requestData = {
    req_seq_id: Date.now().toString() + Math.floor(Math.random() * 1000000).toString(),
    req_date: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    huifu_id: HUIFU_CONFIG.merchantId,
    sys_id: HUIFU_CONFIG.sysId,
    product_id: HUIFU_CONFIG.appId,
    mer_ord_id: 'TEST' + Date.now(),
    trans_amt: '3990',
    goods_desc: '早鸟体验票',
    client_ip: '127.0.0.1',
    notify_url: HUIFU_CONFIG.notifyUrl,
    bg_url: HUIFU_CONFIG.returnUrl
};

const dataStr = JSON.stringify(requestData);
console.log('  待签名数据:', dataStr.substring(0, 100) + '...');

try {
    const signature = HuifuSignUtils.sign(dataStr, HUIFU_CONFIG.privateKey);
    console.log('  签名成功!');
    console.log('  签名值:', signature.substring(0, 50) + '...');
    console.log('  签名长度:', signature.length);
} catch (error) {
    console.error('  签名失败:', error.message);
    console.error('  错误详情:', error);
}

// 4. 测试请求数据构建
console.log('\n4. 请求数据构建:');
const requestBody = {
    req_data: dataStr,
    sign: HuifuSignUtils.sign(dataStr, HUIFU_CONFIG.privateKey)
};
console.log('  完整请求体:', JSON.stringify(requestBody, null, 2).substring(0, 200) + '...');

// 5. 验证私钥是否有效
console.log('\n5. 密钥对验证:');
try {
    // 尝试用私钥签名，用商户公钥验证
    const testData = 'test123';
    const testSignature = HuifuSignUtils.sign(testData, HUIFU_CONFIG.privateKey);
    console.log('  测试签名成功');

    if (HUIFU_CONFIG.merchantPublicKey) {
        const merchantPubKey = HuifuSignUtils.formatPublicKey(HUIFU_CONFIG.merchantPublicKey);
        const verify = crypto.createVerify('SHA256');
        verify.update(testData, 'utf8');
        const isValid = verify.verify(merchantPubKey, testSignature, 'base64');
        console.log('  商户公钥验签结果:', isValid ? '✓ 通过' : '✗ 失败');
    } else {
        console.log('  商户公钥未配置，跳过验证');
    }
} catch (error) {
    console.error('  密钥验证失败:', error.message);
}

// 6. 测试不同密钥格式
console.log('\n6. 测试PKCS#1格式:');
try {
    const pkcs1Key = `-----BEGIN RSA PRIVATE KEY-----\n${HUIFU_CONFIG.privateKey}\n-----END RSA PRIVATE KEY-----`;
    const sign = crypto.createSign('SHA256');
    sign.update('test', 'utf8');
    const pkcs1Signature = sign.sign(pkcs1Key, 'base64');
    console.log('  PKCS#1格式签名: 成功');

    if (HUIFU_CONFIG.merchantPublicKey) {
        const verify = crypto.createVerify('SHA256');
        verify.update('test', 'utf8');
        const isValid = verify.verify(formattedPublicKey, pkcs1Signature, 'base64');
        console.log('  PKCS#1签名验证:', isValid ? '✓ 通过' : '✗ 失败');
    }
} catch (error) {
    console.error('  PKCS#1格式失败:', error.message);
}

console.log('\n' + '='.repeat(60));
