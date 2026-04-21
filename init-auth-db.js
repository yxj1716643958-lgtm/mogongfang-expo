/**
 * 初始化认证数据库表
 */

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new Database(DB_PATH);

console.log('数据库路径:', DB_PATH);
console.log('开始创建认证数据库表...');

try {
    db.exec('BEGIN TRANSACTION');

    // 创建用户表
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mobile TEXT NOT NULL UNIQUE,
            nickname TEXT,
            avatar_url TEXT,
            status TEXT DEFAULT 'ACTIVE',
            last_login_at TEXT,
            last_login_ip TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: users');

    // 创建短信验证码表
    db.exec(`
        CREATE TABLE IF NOT EXISTS sms_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            mobile TEXT NOT NULL,
            code TEXT NOT NULL,
            scene TEXT DEFAULT 'login',
            expired_at TEXT NOT NULL,
            used_at TEXT,
            is_used INTEGER DEFAULT 0,
            request_ip TEXT,
            request_ua TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: sms_codes');

    // 创建登录日志表
    db.exec(`
        CREATE TABLE IF NOT EXISTS login_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            mobile TEXT NOT NULL,
            login_type TEXT DEFAULT 'SMS_CODE',
            is_success INTEGER DEFAULT 1,
            fail_reason TEXT,
            login_ip TEXT,
            login_location TEXT,
            device_id TEXT,
            user_agent TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    `);
    console.log('✓ 创建表: login_logs');

    db.exec('COMMIT');

    console.log('');
    console.log('✓ 认证数据库表创建成功！');

    // 验证表是否创建成功
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users', 'sms_codes', 'login_logs')").all();
    console.log('已创建的表:', tables.map(t => t.name).join(', '));

} catch (error) {
    db.exec('ROLLBACK');
    console.error('创建表失败:', error.message);
    process.exit(1);
} finally {
    db.close();
}
