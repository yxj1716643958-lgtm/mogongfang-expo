/**
 * SQLite数据库适配器
 * 用于替代MySQL进行开发和测试
 */

const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');

// 创建数据库连接
const db = new Database(DB_PATH);

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建数据库表结构
function initDatabase() {
    // 创建data目录
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    // 迁移：添加缺失的列
    try {
        // 检查orders表
        const columns = db.pragma('table_info(orders)');
        const columnNames = columns.map(col => col.name);

        // 需要添加的列
        const requiredColumns = ['transaction_id', 'paid_at', 'user_id', 'user_idcard', 'verified_at', 'verified_by', 'verified_device', 'verify_location'];

        for (const col of requiredColumns) {
            if (!columnNames.includes(col)) {
                console.log(`添加${col}列到orders表...`);
                db.exec(`ALTER TABLE orders ADD COLUMN ${col} TEXT`);
            }
        }

        // 检查tickets表
        const ticketsColumns = db.pragma('table_info(tickets)');
        const ticketsColumnNames = ticketsColumns.map(col => col.name);
        const requiredTicketColumns = ['ticket_type_id', 'qr_code_token', 'qr_code_short', 'user_name', 'user_phone', 'user_idcard', 'id_card', 'id_card_hash', 'ticket_category', 'total_amount', 'used_at', 'invite_code', 'application_id', 'verified_at', 'verified_by'];

        for (const col of requiredTicketColumns) {
            if (!ticketsColumnNames.includes(col)) {
                console.log(`添加${col}列到tickets表...`);
                db.exec(`ALTER TABLE tickets ADD COLUMN ${col} TEXT`);
            }
        }

        // 检查payment_records表
        const paymentColumns = db.pragma('table_info(payment_records)');
        const paymentColumnNames = paymentColumns.map(col => col.name);
        const requiredPaymentColumns = ['order_id', 'payment_status', 'paid_amount', 'third_party_no', 'third_party_data', 'client_ip', 'error_code', 'error_message'];

        for (const col of requiredPaymentColumns) {
            if (!paymentColumnNames.includes(col)) {
                console.log(`添加${col}列到payment_records表...`);
                if (col === 'paid_amount' || col === 'third_party_no' || col === 'third_party_data') {
                    db.exec(`ALTER TABLE payment_records ADD COLUMN ${col} TEXT`);
                } else {
                    db.exec(`ALTER TABLE payment_records ADD COLUMN ${col} TEXT`);
                }
            }
        }

        // 检查invitation_applications表
        const invColumns = db.pragma('table_info(invitation_applications)');
        const invColumnNames = invColumns.map(col => col.name);
        const requiredInvColumns = ['applicant_idcard', 'applicant_idcard_hash', 'applicant_email', 'invite_code', 'category', 'ticket_type_id', 'apply_quantity', 'audit_status', 'audit_reason', 'source_type', 'client_ip'];

        for (const col of requiredInvColumns) {
            if (!invColumnNames.includes(col)) {
                console.log(`添加${col}列到invitation_applications表...`);
                db.exec(`ALTER TABLE invitation_applications ADD COLUMN ${col} TEXT`);
            }
        }

        // 重命名列（如果需要）
        if (invColumnNames.includes('application_status') && !invColumnNames.includes('audit_status')) {
            console.log('重命名application_status为audit_status...');
            db.exec(`ALTER TABLE invitation_applications RENAME COLUMN application_status TO audit_status`);
        }
        if (invColumnNames.includes('audit_opinion') && !invColumnNames.includes('audit_reason')) {
            console.log('重命名audit_opinion为audit_reason...');
            db.exec(`ALTER TABLE invitation_applications RENAME COLUMN audit_opinion TO audit_reason`);
        }

    } catch (e) {
        console.log('迁移跳过或失败:', e.message);
    }

    // 创建票种表
    db.exec(`
        CREATE TABLE IF NOT EXISTS ticket_types (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_code TEXT NOT NULL UNIQUE,
            ticket_name TEXT NOT NULL,
            ticket_category TEXT NOT NULL,
            original_price REAL DEFAULT 0.00,
            sale_price REAL DEFAULT 0.00,
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
            auto_audit_rules TEXT,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            created_by TEXT
        )
    `);

    // 创建订单表
    db.exec(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL UNIQUE,
            user_name TEXT NOT NULL,
            user_phone TEXT NOT NULL,
            user_email TEXT,
            order_type TEXT,
            total_amount REAL NOT NULL,
            ticket_type_id INTEGER,
            ticket_quantity INTEGER NOT NULL,
            ticket_info TEXT,
            order_status TEXT DEFAULT 'PENDING',
            payment_status TEXT DEFAULT 'UNPAID',
            payment_method TEXT,
            payment_time TEXT,
            trade_no TEXT,
            transaction_id TEXT,
            paid_amount REAL,
            expired_at TEXT,
            client_ip TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建支付记录表
    db.exec(`
        CREATE TABLE IF NOT EXISTS payment_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_no TEXT NOT NULL,
            payment_method TEXT NOT NULL,
            transaction_id TEXT,
            amount REAL NOT NULL,
            status TEXT DEFAULT 'PENDING',
            payment_time TEXT,
            notify_data TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建票券表（支持验票系统）
    db.exec(`
        CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_no TEXT NOT NULL UNIQUE,
            ticket_code TEXT NOT NULL UNIQUE,
            order_id INTEGER NOT NULL,
            order_no TEXT NOT NULL,
            ticket_type_code TEXT,
            ticket_name TEXT NOT NULL,
            visitor_name TEXT,
            visitor_phone TEXT,
            ticket_status TEXT DEFAULT 'ACTIVE',
            qr_code_data TEXT NOT NULL,
            check_status TEXT DEFAULT 'UNCHECKED',
            check_time TEXT,
            check_operator TEXT,
            valid_start_time TEXT NOT NULL,
            valid_end_time TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建邀请函申请表
    db.exec(`
        CREATE TABLE IF NOT EXISTS invitation_applications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            application_no TEXT NOT NULL UNIQUE,
            applicant_name TEXT NOT NULL,
            applicant_phone TEXT NOT NULL,
            organization TEXT,
            position TEXT,
            apply_reason TEXT NOT NULL,
            application_status TEXT DEFAULT 'PENDING',
            audit_opinion TEXT,
            audit_time TEXT,
            audit_by TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建核销记录表（支持验票系统）
    db.exec(`
        CREATE TABLE IF NOT EXISTS verify_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id INTEGER NOT NULL,
            ticket_no TEXT NOT NULL,
            ticket_code TEXT NOT NULL,
            verify_result TEXT NOT NULL,
            verify_message TEXT,
            operator_id TEXT NOT NULL,
            operator_name TEXT NOT NULL,
            device_id TEXT,
            gate_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // 创建操作员表（支持验票系统）
    db.exec(`
        CREATE TABLE IF NOT EXISTS operators (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            operator_code TEXT NOT NULL UNIQUE,
            operator_name TEXT NOT NULL,
            password_hash TEXT,
            mobile TEXT,
            role TEXT NOT NULL DEFAULT 'VERIFIER',
            permissions TEXT,
            is_active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            last_login_at TEXT
        )
    `);

    // 插入初始票种数据
    const stmt = db.prepare('SELECT COUNT(*) as count FROM ticket_types');
    const result = stmt.get();

    if (result.count === 0) {
        const now = new Date().toISOString();
        const expoStart = new Date('2026-05-01T09:00:00').toISOString();
        const expoEnd = new Date('2026-05-03T18:00:00').toISOString();

        const insertTicket = db.prepare(`
            INSERT INTO ticket_types (
                ticket_code, ticket_name, ticket_category,
                original_price, sale_price, benefits,
                description, is_active, created_at,
                valid_start_time, valid_end_time
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((tickets) => {
            for (const ticket of tickets) {
                insertTicket.run(...ticket);
            }
        });

        insertMany([
            [
                'EARLY_BIRD',
                '早鸟票',
                'PAID',
                59.90,
                39.90,
                JSON.stringify({
                    highlights: ['限时特惠', '抢先体验', '数字艺术展区'],
                    includes: ['所有展区通票', 'VR体验项目', '数字互动装置']
                }),
                '早鸟票专享优惠价格，限量发售，售完即止。包含所有展区参观资格。',
                1,
                now,
                expoStart,
                expoEnd
            ],
            [
                'VIP',
                'VIP票',
                'PAID',
                299.00,
                199.00,
                JSON.stringify({
                    highlights: ['专属通道', '优先体验', '周边礼品'],
                    includes: ['所有展区通票', 'VIP专属休息区', '限量周边礼包', '专家导览服务']
                }),
                'VIP专属特权，享受尊贵观展体验，包含专属礼品和增值服务。',
                1,
                now,
                expoStart,
                expoEnd
            ],
            [
                'INVITATION',
                '邀请函票',
                'INVITATION',
                0,
                0,
                JSON.stringify({
                    highlights: ['免费观展', '专属邀请'],
                    includes: ['所有展区通票', 'VIP专属通道']
                }),
                '通过审核的邀请函，免费观展，享受VIP待遇。',
                1,
                now,
                expoStart,
                expoEnd
            ]
        ]);

        console.log('✓ 初始票种数据已插入');
    }

    // 插入测试操作员数据
    const operatorStmt = db.prepare('SELECT COUNT(*) as count FROM operators');
    const operatorResult = operatorStmt.get();

    if (operatorResult.count === 0) {
        const insertOperator = db.prepare(`
            INSERT INTO operators (
                operator_code, operator_name, password_hash, mobile, role
            ) VALUES (?, ?, ?, ?, ?)
        `);

        const insertManyOperators = db.transaction((operators) => {
            for (const op of operators) {
                insertOperator.run(...op);
            }
        });

        // 注意：这里的密码是明文 "123456" 的简单哈希，生产环境应该使用bcrypt
        insertManyOperators([
            ['OP001', '张核销员', 'hash_123456', '13800138001', 'VERIFIER'],
            ['OP002', '李核销员', 'hash_123456', '13800138002', 'VERIFIER'],
            ['ADMIN', '管理员', 'hash_admin123', '13800138000', 'ADMIN']
        ]);

        console.log('✓ 初始操作员数据已插入');
    }
}

module.exports = { db, initDatabase };
