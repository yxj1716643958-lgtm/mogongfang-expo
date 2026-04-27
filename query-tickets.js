/**
 * 查询数据库中的票券
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new Database(DB_PATH);

console.log('=== 查询数据库中的票券 ===\n');

try {
    // 查询所有票券
    const tickets = db.prepare(`
        SELECT ticket_no, ticket_name, user_name, user_phone,
               ticket_status, qr_code_token,
               valid_start_time, valid_end_time
        FROM tickets
        ORDER BY created_at DESC
        LIMIT 10
    `).all();

    console.log(`找到 ${tickets.length} 张票券:\n`);

    tickets.forEach((ticket, index) => {
        console.log(`${index + 1}. 票号: ${ticket.ticket_no}`);
        console.log(`   票种: ${ticket.ticket_name}`);
        console.log(`   持有人: ${ticket.user_name} - ${ticket.user_phone}`);
        console.log(`   状态: ${ticket.ticket_status}`);
        console.log(`   有效期: ${ticket.valid_start_time} 至 ${ticket.valid_end_time}`);
        console.log(`   二维码Token: ${ticket.qr_code_token ? ticket.qr_code_token.substring(0, 50) + '...' : '无'}`);
        console.log('');
    });

    // 查询核销记录
    console.log('\n=== 核销记录 ===\n');
    const records = db.prepare(`
        SELECT * FROM verify_records
        ORDER BY created_at DESC
        LIMIT 5
    `).all();

    console.log(`找到 ${records.length} 条核销记录:\n`);
    records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.ticket_no} - ${record.verify_result} - ${record.created_at}`);
    });

} catch (error) {
    console.error('查询失败:', error);
} finally {
    db.close();
}
