/**
 * 测试汇付沙箱环境
 */

const SANDBOX_URL = 'https://hfgj.testpnr.com';

// 可能的API路径
const possiblePaths = [
    '/gateway/api/rest/api/transaction/h5pay',
    '/gateway/api/rest/transaction/h5pay',
    '/gateway/api/transaction/h5pay',
    '/rest/api/transaction/h5pay',
];

async function testURL(path, gateway) {
    const url = gateway + path;
    console.log(`\n测试: ${url}`);

    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ test: 'test' }),
            timeout: 10000
        });

        console.log(`  HTTP ${response.status}`);

        if (response.status === 400 || response.status === 401) {
            console.log('  ✓ URL正确（参数错误是预期的）');
            const text = await response.text();
            try {
                const json = JSON.parse(text);
                console.log(`  响应:`, JSON.stringify(json, null, 2).substring(0, 200));
            } catch {
                console.log(`  响应: ${text.substring(0, 200)}`);
            }
            return true;
        } else if (response.status === 404) {
            console.log('  ✗ URL不存在');
        } else {
            const text = await response.text();
            console.log(`  响应: ${text.substring(0, 100)}`);
        }

        return response.status !== 404;
    } catch (error) {
        console.log(`  ✗ 错误: ${error.message}`);
        return false;
    }
}

async function main() {
    console.log('='.repeat(60));
    console.log('测试汇付沙箱环境');
    console.log('='.repeat(60));

    for (const path of possiblePaths) {
        const valid = await testURL(path, SANDBOX_URL);
        if (valid) break;
    }

    console.log('\n' + '='.repeat(60));
}

main();
