// 测试邀请函API
const sqlite = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'expo_tickets.db');
console.log('数据库路径:', dbPath);

const db = new sqlite(dbPath, { readonly: true });

// 检查表是否存在
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('数据库中的表:', tables.map(t => t.name));

// 检查invitation_applications表结构
if (tables.find(t => t.name === 'invitation_applications')) {
    const columns = db.pragma('table_info(invitation_applications)');
    console.log('invitation_applications表的列:', columns.map(c => c.name));

    // 查询数据
    const apps = db.prepare('SELECT * FROM invitation_applications LIMIT 5').all();
    console.log('申请数据:', apps);
} else {
    console.log('invitation_applications表不存在');
}

db.close();
