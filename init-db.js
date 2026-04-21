/**
 * 数据库初始化脚本
 * 用于创建数据库和表结构
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
    console.log('正在连接MySQL服务器...');

    // 首先连接MySQL服务器（不指定数据库）
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        multipleStatements: true
    });

    try {
        console.log('✓ MySQL连接成功');

        // 读取SQL文件
        const sqlFile = path.join(__dirname, 'SQL', 'ticket-schema.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');

        console.log('正在创建数据库和表结构...');

        // 执行SQL脚本
        await connection.query(sql);
        console.log('✓ 数据库和表结构创建成功');

        // 检查表是否创建成功
        const [tables] = await connection.query('SHOW TABLES');
        console.log('✓ 已创建的表:', tables.map(t => Object.values(t)[0]).join(', '));

    } catch (error) {
        console.error('× 数据库初始化失败:', error.message);
        throw error;
    } finally {
        await connection.end();
    }
}

// 加载环境变量
require('dotenv').config();

// 执行初始化
initializeDatabase()
    .then(() => {
        console.log('\n数据库初始化完成！');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n初始化失败:', error.message);
        process.exit(1);
    });
