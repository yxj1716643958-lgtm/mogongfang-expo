/**
 * 测试邀请函申请功能
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3001/api/v1';

async function testInvitationApply() {
    console.log('=== 测试邀请函申请 ===\n');

    const testData = {
        applicantInfo: {
            name: '测试用户',
            phone: '13800138888',
            idCard: '110101199001011234',
            email: 'test@example.com',
            company: '测试公司',
            position: '测试职位',
            reason: '申请参加博览会',
            inviteCode: '', // 留空表示无邀请码
            category: 'GENERAL'
        },
        smsCode: '123456' // 测试验证码
    };

    try {
        const response = await fetch(`${API_BASE}/invitations/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('申请结果:', JSON.stringify(result, null, 2));

        if (result.code === 'SUCCESS') {
            console.log('\n✓ 邀请函申请成功！');
            if (result.data.ticket) {
                console.log('✓ 票券已生成！');
                console.log('票号:', result.data.ticket.ticketNo);
                console.log('二维码Token:', result.data.ticket.qrCodeToken);
            }
        } else {
            console.log('\n✗ 申请失败:', result.message);
        }

    } catch (error) {
        console.error('测试失败:', error);
    }
}

testInvitationApply();
