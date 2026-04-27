/**
 * 调试票券搜索功能
 */

const { pool } = require('./sqlite-adapter');

async function debugTicketSearch() {
    try {
        const mobile = '13900139000';
        const now = new Date().toISOString();

        console.log('搜索参数:');
        console.log('  手机号:', mobile);
        console.log('  当前时间:', now);
        console.log('');

        const [tickets] = await pool.query(
            `SELECT ticket_no, ticket_name, ticket_category, user_name, user_phone,
                    qr_code_token, valid_start_time, valid_end_time, ticket_status
             FROM tickets
             WHERE user_phone = ? AND ticket_status = 'ACTIVE'
             AND valid_start_time <= ? AND valid_end_time >= ?
             ORDER BY created_at DESC`,
            [mobile, now, now]
        );

        console.log('查询结果:');
        console.log('  类型:', typeof tickets);
        console.log('  是否为数组:', Array.isArray(tickets));
        console.log('  长度:', tickets ? tickets.length : 'N/A');
        console.log('  内容:', tickets);
        console.log('');

        if (tickets && tickets.length > 0) {
            console.log('找到票券:');
            tickets.forEach((ticket, index) => {
                console.log(`  ${index + 1}. ${ticket.ticket_no} - ${ticket.user_name} (${ticket.ticket_name})`);
            });
        } else {
            console.log('未找到有效票券');
        }

    } catch (error) {
        console.error('调试失败:', error);
    } finally {
        process.exit(0);
    }
}

debugTicketSearch();
