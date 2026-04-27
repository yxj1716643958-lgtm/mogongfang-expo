/**
 * 初始化票种数据
 */
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'expo_tickets.db');
const db = new Database(DB_PATH);

// 插入票种数据
const insertTicket = db.prepare(`
    INSERT OR IGNORE INTO ticket_types (
        ticket_code, ticket_name, ticket_category,
        original_price, sale_price, benefits,
        description, is_active, created_at,
        valid_start_time, valid_end_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const tickets = [
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
        new Date().toISOString(),
        '2026-05-01T09:00:00.000Z',
        '2026-05-03T18:00:00.000Z'
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
        new Date().toISOString(),
        '2026-05-01T09:00:00.000Z',
        '2026-05-03T18:00:00.000Z'
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
        new Date().toISOString(),
        '2026-05-01T09:00:00.000Z',
        '2026-05-03T18:00:00.000Z'
    ]
];

const insertMany = db.transaction((tickets) => {
    for (const ticket of tickets) {
        insertTicket.run(...ticket);
    }
});

insertMany(tickets);

// 验证插入结果
const result = db.prepare('SELECT ticket_code, ticket_name, sale_price FROM ticket_types').all();
console.log('票种列表:');
result.forEach(row => {
    console.log(`  ${row.ticket_code}: ${row.ticket_name} - ¥${row.sale_price}`);
});

db.close();
console.log('\n[OK] 票种数据初始化完成!');
