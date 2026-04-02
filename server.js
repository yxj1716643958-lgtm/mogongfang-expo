/**
 * NE_ADCI_MAE - 开发服务器
 * 端口: 8080 (避开 3000-6000 范围)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject'
};

const server = http.createServer((req, res) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

    // 处理根路径
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = './index.html';
    }

    // 获取文件扩展名
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // 读取文件
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // 文件不存在
                console.log(`  -> 404 Not Found: ${filePath}`);
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.end('<!DOCTYPE html><html><head><title>404 - Not Found</title></head><body><h1>404 - File Not Found</h1></body></html>', 'utf-8');
            } else {
                // 服务器错误
                console.log(`  -> 500 Server Error: ${error.code}`);
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            // 成功响应
            console.log(`  -> 200 OK: ${filePath}`);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                                                                ║');
    console.log('║          NE_ADCI_MAE - 系统访问服务器                          ║');
    console.log('║          东北亚数字文化创新博览会模型艺术展区                  ║');
    console.log('║                                                                ║');
    console.log('╚════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log(`   服务器运行中: http://localhost:${PORT}`);
    console.log('   按 Ctrl+C 停止服务器');
    console.log('');
    console.log('   可用页面:');
    console.log(`     • 注册/登录: http://localhost:${PORT}/index.html`);
    console.log(`     • 控制中心: http://localhost:${PORT}/dashboard.html`);
    console.log(`     • 展品详情: http://localhost:${PORT}/detail.html?id=model-x-72`);
    console.log('');
});
