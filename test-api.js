// 测试邀请函API
const express = require('express');
const sqlite = require('better-sqlite3');
const path = require('path');

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new sqlite(dbPath);

// 测试查询
app.get('/test-applications', (req, res) => {
    try {
        console.log('收到请求');

        const query = `
            SELECT ia.id, ia.application_no, ia.applicant_name as real_name,
                   ia.applicant_phone as phone, ia.applicant_id_card as id_card,
                   ia.applicant_company, ia.category as vip_category,
                   ia.invite_code as invitation_code,
                   ia.audit_status as status, ia.audit_reason as reject_reason,
                   ia.created_at, ia.audit_time, t.ticket_no
            FROM invitation_applications ia
            LEFT JOIN tickets t ON ia.application_no = t.order_no
            ORDER BY ia.created_at DESC
        `;

        console.log('执行查询:', query);

        const applications = db.prepare(query).all();

        console.log('查询结果:', applications.length);

        res.json({
            success: true,
            data: applications
        });

    } catch (error) {
        console.error('错误:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.listen(3002, () => {
    console.log('测试服务器运行在端口3002');
    console.log('访问: http://localhost:3002/test-applications');
});
