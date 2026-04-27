/**
 * 测试邀请函申请 - 模拟前端请求
 */

const fetch = require('node-fetch');

async function testApply() {
    const API_BASE = 'http://localhost:3001/api/v1';

    // 模拟前端发送的数据
    const testData = {
        applicantInfo: {
            name: '张三',
            phone: '13812345678',
            idCard: '110101199001011234',
            email: 'zhangsan@example.com',
            company: '测试公司',
            position: '工程师',
            reason: '申请参加博览会',
            inviteCode: '',
            category: 'GENERAL'
        },
        smsCode: '123456'
    };

    console.log('发送申请请求...');
    console.log('数据:', JSON.stringify(testData, null, 2));

    try {
        const response = await fetch(`${API_BASE}/invitations/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(testData)
        });

        console.log('响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));

        const result = await response.json();
        console.log('响应结果:', JSON.stringify(result, null, 2));

        if (result.code === 'SUCCESS') {
            console.log('✓ 申请成功');
        } else {
            console.log('✗ 申请失败:', result.message);
        }

    } catch (error) {
        console.error('请求失败:', error.message);
    }
}

testApply();
