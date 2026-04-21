/**
 * 初始化票务系统 SQLite 数据库
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new Database(DB_PATH);

console.log('数据库路径:', DB_PATH);
console.log('开始创建票务数据库表...');

try {
    db.exec('BEGIN TRANSACTION');

    // 创建票种表
    db.exec(`
        CREATE TABLE IF NOT EXISTS ticket_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_code TEXT NOT NULL UNIQUE,
            ticket_name TEXT NOT NULL,
            ticket_category TEXT NOT NULL,
            original_price REAL DEFAULT 0.0,
            sale_price REAL DEFAULT 0.0,
            benefits TEXT,
            description TEXT,
            total_quantity INTEGER,
            sold_quantity INTEGER DEFAULT 0,
            daily_limit INTEGER,
            user_limit INTEGER,
            sale_start_time TEXT,
            sale_end_time TEXT,
            valid_start_time TEXT,
            valid_end_time TEXT,
            require_audit INTEGER DEFAULT 0,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: ticket_types');

    // 插入票种数据
    const ticketTypes = db.prepare('SELECT COUNT(*) as count FROM ticket_types').get();
    if (ticketTypes.count === 0) {
        db.exec(`
            INSERT INTO ticket_types (ticket_code, ticket_name, ticket_category, original_price, sale_price, benefits, description, sale_start_time, sale_end_time, valid_start_time, valid_end_time, total_quantity, user_limit, is_active, sort_order)
            VALUES
            ('EARLY_BIRD', '早鸟体验票', 'PAID', 69.90, 39.90, '{"includes": ["展会限定纪念品", "透卡票+打卡册"]}', '线上专属优惠，适合首次观展体验', '2024-01-01 00:00:00', '2024-12-31 23:59:59', '2024-06-01 09:00:00', '2024-06-03 18:00:00', 5000, 3, 1, 1),
            ('VIP', '至尊VIP票', 'PAID', 399.00, 199.00, '{"includes": ["含早鸟票所有权益", "价值99元限定大礼包"]}', '全程尊享权益，含嘉宾席位及专属福利', '2024-01-01 00:00:00', '2024-12-31 23:59:59', '2024-06-01 08:30:00', '2024-06-03 18:00:00', 500, 1, 1, 2),
            ('INVITATION', '邀请函票', 'INVITATION', 0.0, 0.0, '{"includes": ["免费观展", "专业交流机会"]}', '专业观众、媒体、合作伙伴专用', '2024-01-01 00:00:00', '2024-12-31 23:59:59', '2024-06-01 09:00:00', '2024-06-03 18:00:00', NULL, 1, 1, 3)
        `);
        console.log('✓ 插入票种数据');
    }

    // 创建订单表
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL UNIQUE,
            user_id INTEGER,
            user_name TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            user_email TEXT,
            user_id_card TEXT,
            order_type TEXT NOT NULL,
            total_amount REAL NOT NULL DEFAULT 0.0,
            paid_amount REAL DEFAULT 0.0,
            discount_amount REAL DEFAULT 0.0,
            ticket_type_id INTEGER NOT NULL,
            ticket_quantity INTEGER NOT NULL DEFAULT 1,
            ticket_info TEXT,
            order_status TEXT NOT NULL DEFAULT 'PENDING',
            payment_status TEXT NOT NULL DEFAULT 'UNPAID',
            payment_method TEXT,
            payment_channel TEXT,
            transaction_id TEXT,
            audit_status TEXT,
            audit_reason TEXT,
            audit_time TEXT,
            audit_by TEXT,
            paid_at TEXT,
            expired_at TEXT,
            refunded_at TEXT,
            client_ip TEXT,
            user_agent TEXT,
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: orders');

    // 创建票券表
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_no TEXT NOT NULL UNIQUE,
            order_id INTEGER NOT NULL,
            order_no TEXT NOT NULL,
            user_id INTEGER,
            user_name TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            ticket_type_id INTEGER NOT NULL,
            ticket_code TEXT NOT NULL,
            ticket_name TEXT NOT NULL,
            ticket_category TEXT NOT NULL,
            qr_code_token TEXT NOT NULL UNIQUE,
            qr_code_short TEXT NOT NULL UNIQUE,
            qr_code_url TEXT,
            benefits TEXT,
            valid_start_time TEXT NOT NULL,
            valid_end_time TEXT NOT NULL,
            ticket_status TEXT NOT NULL DEFAULT 'ACTIVE',
            verified_at TEXT,
            verified_by TEXT,
            verified_device TEXT,
            verify_location TEXT,
            cancelled_at TEXT,
            cancelled_by TEXT,
            cancel_reason TEXT,
            total_amount REAL,
            issue_time TEXT DEFAULT (datetime('now')),
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: tickets');

    // 创建支付记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS payment_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            order_no TEXT NOT NULL,
            transaction_id TEXT,
            payment_channel TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            order_amount REAL NOT NULL,
            paid_amount REAL NOT NULL,
            fee_amount REAL DEFAULT 0.0,
            payment_status TEXT NOT NULL DEFAULT 'PENDING',
            third_party_no TEXT,
            third_party_data TEXT,
            payment_time TEXT,
            refund_time TEXT,
            client_ip TEXT,
            error_code TEXT,
            error_message TEXT,
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: payment_records');

    // 创建核销记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS verification_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER,
            ticket_no TEXT NOT NULL,
            order_id INTEGER,
            verify_type TEXT NOT NULL DEFAULT 'QR_CODE',
            verify_status TEXT NOT NULL,
            verifier_id TEXT NOT NULL,
            verifier_name TEXT NOT NULL,
            device_id TEXT,
            verify_location TEXT,
            verify_gate TEXT,
            verify_time TEXT DEFAULT (datetime('now')),
            fail_reason TEXT,
            client_ip TEXT,
            remark TEXT
        )
    `);
    console.log('✓ 创建表: verification_records');

    // 创建邀请函申请表
    db.exec(`
        CREATE TABLE IF NOT EXISTS invitation_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_no TEXT NOT NULL UNIQUE,
            applicant_name TEXT NOT NULL,
            applicant_phone TEXT NOT NULL,
            applicant_email TEXT,
            applicant_company TEXT,
            applicant_position TEXT,
            ticket_type_id INTEGER NOT NULL,
            apply_quantity INTEGER NOT NULL DEFAULT 1,
            apply_reason TEXT,
            audit_status TEXT NOT NULL DEFAULT 'PENDING',
            audit_by TEXT,
            audit_time TEXT,
            audit_reason TEXT,
            order_id INTEGER,
            ticket_ids TEXT,
            approved_at TEXT,
            rejected_at TEXT,
            source_type TEXT NOT NULL DEFAULT 'WEB',
            batch_no TEXT,
            client_ip TEXT,
            user_agent TEXT,
            remark TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: invitation_applications');

    db.exec('COMMIT');

    console.log('');
    console.log('✓ 票务数据库表创建成功！');

    // 验证表是否创建成功
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    console.log('已创建的表:', tables.map(t => t.name).join(', '));

} catch (error) {
    db.exec('ROLLBACK');
    console.error('创建表失败:', error.message);
    process.exit(1);
} finally {
    db.close();
}
