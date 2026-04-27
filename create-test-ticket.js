const sqlite = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new sqlite(dbPath);

// 先检查tickets表有哪些列
const columns = db.pragma('table_info(tickets)');
console.log('Tickets表的列:', columns.map(c => c.name).join(', '));

const timestamp = Date.now();
const ticketNo = `TEST${timestamp}`;
const qrCodeToken = `test_qr_token_${timestamp}`;

// 创建订单
const orderNo = `ORD${timestamp}`;
db.prepare(`
    INSERT INTO orders (
        order_no, user_name, user_phone,
        total_amount, ticket_quantity, order_status, payment_status
    ) VALUES (?, ?, ?, ?, ?, 'PAID', 'PAID')
`).run(orderNo, '测试用户', '13900139000', 100, 1);

const orderId = db.prepare('SELECT last_insert_rowid() as id').get().id;

// 构建INSERT语句，根据实际存在的列
const columnNames = columns.map(c => c.name);

// 必须的列
const requiredColumns = [
    'ticket_no', 'ticket_code', 'order_id', 'order_no',
    'ticket_name', 'visitor_name', 'visitor_phone',
    'ticket_status', 'valid_start_time', 'valid_end_time',
    'qr_code_data'
];

// 可选的列（如果存在就添加）
const optionalColumns = ['ticket_type_code', 'qr_code_token', 'qr_code_short'];

const insertColumns = [...requiredColumns];
const placeholders = requiredColumns.map(() => '?');

// 检查并添加可选列
if (columnNames.includes('ticket_type_code')) {
    insertColumns.push('ticket_type_code');
    placeholders.push('\'GENERAL\'');
}
if (columnNames.includes('qr_code_token')) {
    insertColumns.push('qr_code_token');
    placeholders.push('?');
}
if (columnNames.includes('qr_code_short')) {
    insertColumns.push('qr_code_short');
    placeholders.push('?');
}

const sql = `INSERT INTO tickets (${insertColumns.join(', ')}) VALUES (${placeholders.join(', ')})`;
console.log('SQL:', sql);

const values = [
    ticketNo, ticketNo, orderId, orderNo,
    '测试普通票', '测试用户', '13900139000',
    'ACTIVE',
    new Date().toISOString(),
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    qrCodeToken
];

if (columnNames.includes('qr_code_token')) {
    values.push(qrCodeToken);
}
if (columnNames.includes('qr_code_short')) {
    values.push(`TEST${timestamp}`);
}

db.prepare(sql).run(...values);

console.log('测试票券创建成功：');
console.log('  票号:', ticketNo);
console.log('  QR码Token:', qrCodeToken);
console.log('  手机号: 13900139000');

db.close();
