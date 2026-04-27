/**
 * 获取第一张有效票券的二维码Token
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new Database(DB_PATH);

try {
    const ticket = db.prepare(`
        SELECT ticket_no, ticket_name, user_name, user_phone,
               ticket_status, qr_code_token
        FROM tickets
        WHERE ticket_status = 'ACTIVE'
        ORDER BY created_at DESC
        LIMIT 1
    `).get();

    if (ticket) {
        console.log('找到有效票券:');
        console.log(JSON.stringify(ticket, null, 2));
    } else {
        console.log('未找到有效票券');
    }

} catch (error) {
    console.error('查询失败:', error);
} finally {
    db.close();
}
