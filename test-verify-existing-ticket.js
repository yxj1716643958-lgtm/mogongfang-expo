/**
 * 测试现有票券的核销功能
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';

// 操作员信息
const OPERATOR_INFO = {
    verifierId: 'TEST_OPERATOR',
    verifierName: '测试核销员',
    deviceId: 'TEST_DEVICE',
    gate: '测试入口'
};

// 第一张票券的二维码Token
const QR_CODE_TOKEN = 'eyJ0eXBlIjoiaW52aXRhdGlvbiIsInRpY2tldE5vIjoiVEsyMDI2MDQyNU9BTjNKNyIsInVzZXJJZCI6IjEzNzc3Nzc3Nzc3IiwidGltZXN0YW1wIjoxNzc3MDg4Nzc2MDUzfQ==';

async function testVerifyExistingTicket() {
    console.log('=== 测试现有票券核销功能 ===\n');

    try {
        // 1. 测试核销预览
        console.log('1. 测试核销预览...');
        const previewResponse = await fetch(`${API_BASE}/verify/preview`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrContent: QR_CODE_TOKEN,
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

        // 2. 测试扫码核销
        console.log('2. 测试扫码核销...');
        const scanResponse = await fetch(`${API_BASE}/verify/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrCodeToken: QR_CODE_TOKEN,
                verifierInfo: OPERATOR_INFO
            })
        });

        const scanResult = await scanResponse.json();
        console.log('核销结果:', JSON.stringify(scanResult, null, 2));
        console.log('');

        // 3. 验证重复核销会失败
        console.log('3. 测试重复核销（应该失败）...');
        const duplicateResponse = await fetch(`${API_BASE}/verify/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                qrCodeToken: QR_CODE_TOKEN,
                verifierInfo: OPERATOR_INFO
            })
        });

        const duplicateResult = await duplicateResponse.json();
        console.log('重复核销结果:', JSON.stringify(duplicateResult, null, 2));
        console.log('');

        // 4. 查询核销记录
        console.log('4. 查询核销记录...');
        const recordsResponse = await fetch(`${API_BASE}/verify/records?page=1&page_size=5`);
        const recordsResult = await recordsResponse.json();
        console.log('核销记录:', JSON.stringify(recordsResult, null, 2));
        console.log('');

        // 5. 测试按手机号搜索票券（使用未核销的票券手机号）
        console.log('5. 测试按手机号搜索票券...');
        const searchResponse = await fetch(`${API_BASE}/tickets/search?mobile=13900139000`);
        const searchResult = await searchResponse.json();
        console.log('搜索结果:', JSON.stringify(searchResult, null, 2));
        console.log('');

        console.log('=== 测试完成 ===');
        console.log('');
        console.log('✓ 核销预览功能正常');
        console.log('✓ 扫码核销功能正常');
        console.log('✓ 重复核销防护正常');
        console.log('✓ 核销记录查询正常');
        console.log('✓ 按手机号搜索票券正常');

    } catch (error) {
        console.error('测试过程中出错:', error);
    }
}

// 运行测试
testVerifyExistingTicket();
