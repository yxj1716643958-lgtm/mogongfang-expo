/**
 * 测试斗拱平台托管收银台预下单接口
 */

require('dotenv').config();
const crypto = require('crypto');

// 汇付配置
const config = {
    merchantId: process.env.HUIFU_MERCHANT_ID || '',
    appId: process.env.HUIFU_APP_ID || '',
    privateKey: process.env.HUIFU_PRIVATE_KEY || '',
    publicKey: process.env.HUIFU_PUBLIC_KEY || '',
    gatewayUrl: process.env.HUIFU_GATEWAY_URL || 'https://paas.huifu.com'
};

console.log('='.repeat(60));
console.log('斗拱平台API测试');
console.log('='.repeat(60));
console.log(`商户号: ${config.merchantId}`);
console.log(`产品ID: ${config.appId}`);
console.log(`网关地址: ${config.gatewayUrl}`);
console.log('='.repeat(60));

// RSA签名工具
class SignUtils {
    static sign(data, privateKey) {
        const formats = this.formatPrivateKey(privateKey);
        for (const format of formats) {
            try {
                const buffer = Buffer.from(data, 'utf8');
                return crypto.sign('sha256', buffer, {
                    key: format,
                    padding: crypto.constants.RSA_PKCS1_PADDING
                }).toString('base64');
            } catch (e) {
                continue;
            }
        }
        throw new Error('签名失败');
    }

    static formatPrivateKey(key) {
        if (!key) return [''];
        if (key.includes('-----BEGIN')) return [key];
        const cleanKey = key.replace(/\s/g, '');
        const formattedKey = cleanKey.match(/.{1,64}/g)?.join('\n') || cleanKey;
        return [
            `-----BEGIN PRIVATE KEY-----\n${formattedKey}\n-----END PRIVATE KEY-----`,
            `-----BEGIN RSA PRIVATE KEY-----\n${formattedKey}\n-----END RSA PRIVATE KEY-----`
        ];
    }

    static generateReqSeqId() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        return `${timestamp}${random}`;
    }
}

// 测试API连接
async function testDouguoAPI() {
    const url = `${config.gatewayUrl}/v2/trade/hosting/payment/preorder`;
    const reqDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reqSeqId = SignUtils.generateReqSeqId();

    // 构建请求数据
    const requestData = {
        req_seq_id: reqSeqId,
        req_date: reqDate,
        huifu_id: config.merchantId,
        pre_order_type: '1',  // H5支付
        trans_amt: '100',      // 1元（测试）
        goods_desc: '测试商品',
        mer_ord_id: `TEST${reqSeqId}`,
        time_expire: new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' '),
        notify_url: 'http://101.200.126.62:3001/api/v1/payments/huifu/notify',
        risk_check_data: JSON.stringify({
            user_info: {
                user_name: '测试用户',
                user_mobile: '13800138000'
            }
        })
    };

    console.log('\n请求数据:');
    console.log(JSON.stringify(requestData, null, 2));

    // 生成签名
    const dataStr = JSON.stringify(requestData);
    const sign = SignUtils.sign(dataStr, config.privateKey);
    console.log(`\n签名长度: ${sign.length}`);

    // 构建请求体
    const requestBody = {
        req_data: dataStr,
        sign: sign
    };

    console.log(`\n请求URL: ${url}`);

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 15000
        });

        console.log(`\n响应状态: ${response.status} ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        console.log(`响应类型: ${contentType}`);

        const text = await response.text();
        console.log(`\n响应内容:`);
        console.log(text.substring(0, 1000));

        if (response.ok && contentType && contentType.includes('application/json')) {
            const result = JSON.parse(text);
            console.log('\n解析后的JSON:');
            console.log(JSON.stringify(result, null, 2));

            // 检查响应格式
            if (result.resp_data || result.data) {
                const data = result.resp_data ? JSON.parse(result.resp_data) : result.data;
                console.log('\n业务数据:');
                console.log(JSON.stringify(data, null, 2));

                if (data.resp_code === '00000000' || data.resp_code === '0000') {
                    console.log('\n✅ 测试成功！API返回成功码');
                    return true;
                } else {
                    console.log(`\n❌ 测试失败：API返回错误码 ${data.resp_code}`);
                    console.log(`错误描述: ${data.resp_desc || data.resp_msg || data.message}`);
                    return false;
                }
            }
        }

        console.log('\n⚠️ 无法解析响应，请检查API是否可用');
        return false;

    } catch (error) {
        console.error(`\n❌ 请求失败: ${error.message}`);
        return false;
    }
}

// 运行测试
testDouguoAPI().then(success => {
    console.log('\n' + '='.repeat(60));
    if (success) {
        console.log('测试结论: ✅ 斗拱平台API连接正常');
        console.log('建议: 可以进行真实支付测试');
    } else {
        console.log('测试结论: ❌ 斗拱平台API连接失败');
        console.log('可能原因:');
        console.log('1. 网关地址不正确');
        console.log('2. 商户未开通托管收银台产品');
        console.log('3. 签名验证失败');
        console.log('4. 网络连接问题');
        console.log('\n建议:');
        console.log('1. 联系汇付技术支持确认网关地址和产品开通状态');
        console.log('2. 检查商户号和产品ID是否匹配');
        console.log('3. 暂时使用 PAYMENT_DEBUG_MODE=true 测试其他功能');
    }
    console.log('='.repeat(60));
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error('测试执行失败:', err);
    process.exit(1);
});
