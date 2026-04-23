/**
 * 测试不同的汇付API URL
 */
require('dotenv').config();

const GATEWAY_URL = process.env.HUIFU_GATEWAY_URL || 'https://spin.cloudpnr.com';

// 可能的URL路径
const possiblePaths = [
    '/gateway/api/rest/api/transaction/h5pay',    // 原始路径
    '/gateway/api/rest/transaction/h5pay',        // 去掉一个/api
    '/gateway/api/transaction/h5pay',             // 更简单的路径
    '/rest/api/transaction/h5pay',                // 另一种格式
];

async function testURL(path) {
    const url = GATEWAY_URL + path;
    console.log(`\n测试: ${url}`);

    try {
        const fetch = (await import('node-fetch')).default;

        // 发送一个简单的测试请求（会签名失败，但至少能知道URL是否正确）
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ test: 'test' }),
            timeout: 10000
        });

        console.log(`  HTTP状态: ${response.status}`);

        if (response.status === 404) {
            console.log('  → URL不存在');
        } else if (response.status === 400 || response.status === 401) {
            console.log('  → URL正确（参数错误）');
            const text = await response.text();
            if (text) console.log(`  响应: ${text.substring(0, 100)}`);
        } else {
            const text = await response.text();
            console.log(`  响应: ${text.substring(0, 100)}`);
        }

        return response.status !== 404;
    } catch (error) {
        console.log(`  错误: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('测试汇付API URL');
    console.log('网关地址:', GATEWAY_URL);
    console.log('='.repeat(60));

    for (const path of possiblePaths) {
        const valid = await testURL(path);
        if (valid) {
            console.log(`\n✓ 找到有效URL: ${path}`);
            break;
        }
    }

    console.log('\n' + '='.repeat(60));
}

main();
