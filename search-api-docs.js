/**
 * 搜索汇付/斗拱平台API文档和示例
 */

const https = require('https');
const domains = [
    'paas.huifu.com',
    'mer.chinapay.com',
    'huifu.com'
];

const paths = [
    '/api/docs',
    '/docs',
    '/api',
    '/help',
    '/document',
    '/api-document'
];

async function checkUrl(host, path) {
    return new Promise((resolve) => {
        const options = {
            hostname: host,
            port: 443,
            path: path,
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    // Check if page contains API documentation keywords
                    const keywords = ['API', '接口', '文档', 'document', 'SDK'];
                    const hasKeywords = keywords.some(kw =>
                        data.toLowerCase().includes(kw.toLowerCase())
                    );
                    resolve({
                        url: `https://${host}${path}`,
                        status: res.statusCode,
                        hasDocs: hasKeywords
                    });
                } else {
                    resolve({ url: `https://${host}${path}`, status: res.statusCode });
                }
            });
        });

        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => { req.destroy(); resolve(null); });
        req.end();
    });
}

async function main() {
    console.log('搜索API文档页面...\n');

    for (const domain of domains) {
        console.log(`检查域名: ${domain}`);
        for (const path of paths) {
            const result = await checkUrl(domain, path);
            if (result && result.status === 200) {
                console.log(`  ✓ ${result.url} - ${result.hasDocs ? '可能包含文档' : '页面存在'}`);
            } else if (result) {
                console.log(`  - ${result.url} - ${result.status}`);
            }
        }
        console.log();
    }

    console.log('\n建议:');
    console.log('1. 访问 https://mer.chinapay.com 登录商户平台查看API文档');
    console.log('2. 联系汇付技术支持获取斗拱平台最新API文档');
    console.log('3. 参考官方GitHub示例: huifurepo/dg-payment-skills');
    console.log('4. 检查商户账户是否已开通"托管收银台"产品');
}

main().catch(console.error);
