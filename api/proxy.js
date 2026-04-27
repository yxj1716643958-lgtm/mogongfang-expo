/**
 * Vercel Serverless Function - API代理
 * 解决混合内容问题：HTTPS网站访问HTTP API
 */

const BACKEND_API = 'http://101.200.126.62:3001';

export default async function handler(req, res) {
    // 处理CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

    // 处理OPTIONS预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // 获取请求路径和查询参数
        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname.replace('/api/proxy', '') + url.search;

        // 构建后端API URL
        const backendUrl = `${BACKEND_API}${path}`;

        console.log('[API Proxy] Forwarding:', req.method, backendUrl);

        // 准备请求头
        const headers = {
            'Content-Type': 'application/json',
        };

        // 转发Authorization头
        if (req.headers.authorization) {
            headers['Authorization'] = req.headers.authorization;
        }

        // 转发请求到后端API
        const fetchOptions = {
            method: req.method,
            headers,
        };

        // 非GET请求添加body
        if (req.method !== 'GET' && req.body) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(backendUrl, fetchOptions);
        const contentType = response.headers.get('content-type');

        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        return res.status(response.status).json(data);
    } catch (error) {
        console.error('[API Proxy] Error:', error);
        return res.status(500).json({
            code: 'ERROR',
            message: '代理请求失败',
            error: error.message
        });
    }
}
