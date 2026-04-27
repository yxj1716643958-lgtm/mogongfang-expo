/**
 * 测试汇付支付可能的网关地址
 */

const https = require('https');

const gateways = [
    'https://api.huifu.com',
    'https://gate.huifu.com',
    'https://pay.huifu.com',
    'https://newpay.huifu.com',
    'https://spin.cloudpnr.com',
    'https://hfgj.testpnr.com',
    'https://mer.chinapay.com',
    'https://api.chinapay.com'
];

async function testGateway(gateway) {
    const url = new URL(gateway);
    const options = {
        hostname: url.hostname,
        port: 443,
        path: '/gateway/api/rest/api/transaction/h5pay',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Huifu-Gateway-Test/1.0'
        },
        timeout: 5000
    };

    return new Promise((resolve) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    gateway,
                    status: res.statusCode,
                    exists: res.statusCode !== 404
                });
            });
        });

        req.on('error', (err) => {
            resolve({
                gateway,
                status: 'ERROR',
                error: err.message
            });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({
                gateway,
                status: 'TIMEOUT'
            });
        });

        // 发送空请求触发响应
        req.write(JSON.stringify({}));
        req.end();
    });
}

async function main() {
    console.log('测试汇付支付可能的网关地址...\n');

    for (const gateway of gateways) {
        const result = await testGateway(gateway);
        console.log(`✓ ${gateway}`);
        console.log(`  状态: ${result.status}`);
        if (result.error) console.log(`  错误: ${result.error}`);
        console.log('');
    }

    console.log('\n提示：');
    console.log('1. 如果所有地址都返回404，请确认：');
    console.log('   - API路径是否正确');
    console.log('   - 商户号和产品ID是否匹配');
    console.log('   - 是否已开通H5支付产品');
    console.log('2. 建议联系汇付技术支持获取正确的网关地址');
}

main().catch(console.error);
