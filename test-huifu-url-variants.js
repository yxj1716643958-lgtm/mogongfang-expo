/**
 * 测试汇付/斗拱平台多种可能的API路径
 */

require('dotenv').config();
const crypto = require('crypto');

const config = {
    merchantId: process.env.HUIFU_MERCHANT_ID || '',
    privateKey: process.env.HUIFU_PRIVATE_KEY || ''
};

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
            } catch (e) { continue; }
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
}

// 测试多种可能的URL和请求格式
const testCases = [
    {
        name: '斗拱平台托管收银台 - REST风格',
        url: 'https://paas.huifu.com/v2/trade/hosting/payment/preorder',
        method: 'POST',
        body: { req_data: '{"test":"data"}', sign: 'test_sign' },
        headers: { 'Content-Type': 'application/json' }
    },
    {
        name: '斗拱平台托管收银台 - 服务器路径',
        url: 'https://paas.huifu.com/rest/server/v2/trade/hosting/payment/preorder',
        method: 'POST',
        body: { req_data: '{"test":"data"}', sign: 'test_sign' },
        headers: { 'Content-Type': 'application/json' }
    },
    {
        name: '旧版Spin平台',
        url: 'https://spin.cloudpnr.com/gateway/api/rest/api/transaction/acqTrade',
        method: 'POST',
        body: { req_data: '{"test":"data"}', sign: 'test_sign' },
        headers: { 'Content-Type': 'application/json' }
    },
    {
        name: '汇付API网关',
        url: 'https://api.huifu.com/gateway/api/rest/api/transaction/acqTrade',
        method: 'POST',
        body: { req_data: '{"test":"data"}', sign: 'test_sign' },
        headers: { 'Content-Type': 'application/json' }
    },
    {
        name: '斗拱平台根路径测试',
        url: 'https://paas.huifu.com/',
        method: 'GET',
        headers: { 'User-Agent': 'Huifu-Test/1.0' }
    },
    {
        name: '汇付API网关根路径测试',
        url: 'https://api.huifu.com/',
        method: 'GET',
        headers: { 'User-Agent': 'Huifu-Test/1.0' }
    },
    {
        name: '斗拱平台健康检查',
        url: 'https://paas.huifu.com/health',
        method: 'GET',
        headers: { 'User-Agent': 'Huifu-Test/1.0' }
    }
];

async function testUrl(testCase) {
    try {
        const fetch = (await import('node-fetch')).default;
        const options = {
            method: testCase.method,
            headers: testCase.headers,
            timeout: 10000
        };

        if (testCase.body) {
            options.body = JSON.stringify(testCase.body);
        }

        const response = await fetch(testCase.url, options);
        const text = await response.text();

        return {
            name: testCase.name,
            url: testCase.url,
            status: response.status,
            statusText: response.statusText,
            contentType: response.headers.get('content-type'),
            exists: response.status !== 404,
            success: response.status >= 200 && response.status < 300,
            responsePreview: text.substring(0, 200)
        };
    } catch (error) {
        return {
            name: testCase.name,
            url: testCase.url,
            status: 'ERROR',
            error: error.message
        };
    }
}

async function main() {
    console.log('='.repeat(70));
    console.log('测试汇付/斗拱平台可能的API端点');
    console.log('='.repeat(70));
    console.log(`商户号: ${config.merchantId}`);
    console.log('='.repeat(70));
    console.log();

    const results = [];

    for (const testCase of testCases) {
        console.log(`测试: ${testCase.name}`);
        console.log(`URL: ${testCase.url}`);
        const result = await testUrl(testCase);
        results.push(result);

        if (result.error) {
            console.log(`❌ 错误: ${result.error}`);
        } else {
            console.log(`✓ 状态: ${result.status} ${result.statusText}`);
            if (result.contentType) {
                console.log(`  类型: ${result.contentType}`);
            }
            if (result.exists && result.success) {
                console.log(`✅ 端点可访问且返回成功`);
            } else if (result.exists) {
                console.log(`⚠️  端点存在但返回: ${result.status}`);
            } else {
                console.log(`❌ 端点不存在(404)`);
            }
            if (result.responsePreview && result.responsePreview.length > 0) {
                console.log(`  响应预览: ${result.responsePreview.substring(0, 100)}...`);
            }
        }
        console.log();
    }

    console.log('='.repeat(70));
    console.log('测试总结:');
    console.log('='.repeat(70));

    const accessible = results.filter(r => r.exists && !r.error);
    const successful = results.filter(r => r.success);

    console.log(`可访问端点: ${accessible.length}/${results.length}`);
    console.log(`成功响应: ${successful.length}/${results.length}`);
    console.log();

    if (accessible.length > 0) {
        console.log('可访问的端点:');
        for (const r of accessible) {
            console.log(`  - ${r.url} (${r.status})`);
        }
    }

    if (successful.length > 0) {
        console.log('\n成功的端点:');
        for (const r of successful) {
            console.log(`  - ${r.name}: ${r.url}`);
        }
    }

    console.log('\n建议:');
    if (accessible.length === 0) {
        console.log('1. 所有测试端点都无法访问，可能需要联系汇付技术支持');
        console.log('2. 检查商户账户是否已开通相应产品');
        console.log('3. 暂时使用 PAYMENT_DEBUG_MODE=true 测试其他功能');
    } else if (successful.length === 0) {
        console.log('1. 有端点可访问但都返回错误，可能需要调整请求格式');
        console.log('2. 建议联系汇付技术支持获取最新的API文档和测试环境');
    } else {
        console.log('1. 有成功的端点，建议进一步测试完整的支付流程');
    }

    console.log('='.repeat(70));
}

main().catch(console.error);
