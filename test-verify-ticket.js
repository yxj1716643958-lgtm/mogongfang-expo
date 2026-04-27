/**
 * 测试票券核销功能
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';

// 操作员信息
const OPERATOR_INFO = {
    operatorId: 'TEST_OPERATOR',
    operatorName: '测试核销员',
    deviceId: 'TEST_DEVICE',
    gateName: '测试入口'
};

async function testVerifyFlow() {
    console.log('=== 开始测试票券核销流程 ===\n');

    try {
        // 1. 创建一个测试订单
        console.log('1. 创建测试订单...');
        const orderResponse = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ticketTypeCode: 'INVITATION',
                quantity: 1,
                userInfo: {
                    name: '测试用户',
                    phone: '13800138000',
                    email: 'test@example.com'
                }
            })
        });

        const orderResult = await orderResponse.json();
        console.log('订单创建结果:', JSON.stringify(orderResult, null, 2));

        if (orderResult.code !== 'SUCCESS') {
            console.error('订单创建失败，终止测试');
            return;
        }

        // 获取票券信息
        const ticket = orderResult.data.tickets && orderResult.data.tickets[0];
        if (!ticket) {
            console.error('未生成票券，终止测试');
            return;
        }

        const qrCodeToken = ticket.qrCodeToken;
        console.log('生成的二维码Token:', qrCodeToken);
        console.log('');

        // 2. 测试核销预览
        console.log('2. 测试核销预览...');
        const previewResponse = await fetch(`${API_BASE}/verify/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrContent: qrCodeToken,
                verifierInfo: OPERATOR_INFO
            })
        });

        const previewResult = await previewResponse.json();
        console.log('预览结果:', JSON.stringify(previewResult, null, 2));
        console.log('');

        if (previewResult.code !== 'SUCCESS') {
            console.error('预览失败，终止测试');
            return;
        }

        // 3. 测试扫码核销
        console.log('3. 测试扫码核销...');
        const scanResponse = await fetch(`${API_BASE}/verify/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrCodeToken: qrCodeToken,
                verifierInfo: OPERATOR_INFO
            })
        });

        const scanResult = await scanResponse.json();
        console.log('核销结果:', JSON.stringify(scanResult, null, 2));
        console.log('');

        // 4. 验证重复核销会失败
        console.log('4. 测试重复核销（应该失败）...');
        const duplicateResponse = await fetch(`${API_BASE}/verify/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrCodeToken: qrCodeToken,
                verifierInfo: OPERATOR_INFO
            })
        });

        const duplicateResult = await duplicateResponse.json();
        console.log('重复核销结果:', JSON.stringify(duplicateResult, null, 2));
        console.log('');

        // 5. 查询核销记录
        console.log('5. 查询核销记录...');
        const recordsResponse = await fetch(`${API_BASE}/verify/records?page=1&page_size=5`);
        const recordsResult = await recordsResponse.json();
        console.log('核销记录:', JSON.stringify(recordsResult, null, 2));
        console.log('');

        // 6. 测试按手机号搜索票券
        console.log('6. 测试按手机号搜索票券...');
        const searchResponse = await fetch(`${API_BASE}/tickets/search?mobile=13800138000`);
        const searchResult = await searchResponse.json();
        console.log('搜索结果:', JSON.stringify(searchResult, null, 2));
        console.log('');

        console.log('=== 测试完成 ===');

    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
testVerifyFlow();
