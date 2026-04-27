/**
 * MySQL to SQLite 适配器
 * 将MySQL2的异步API转换为better-sqlite3的同步API
 */

const { db } = require('./sqlite-db');

class Connection {
    constructor() {
        this.db = db;
        this._transaction = false;
    }

    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            try {
                // 处理MySQL特有的语法
                sql = this.convertMySQLSyntax(sql);

                // 查询操作
                if (sql.trim().toUpperCase().startsWith('SELECT')) {
                    const stmt = this.db.prepare(sql);
                    const results = stmt.all(...params);
                    resolve([results, {}]);
                }
                // 插入操作
                else if (sql.trim().toUpperCase().startsWith('INSERT')) {
                    const stmt = this.db.prepare(sql);
                    const info = stmt.run(...params);
                    resolve([{ insertId: info.lastInsertRowid, affectedRows: info.changes }, {}]);
                }
                // 更新/删除操作
                else {
                    const stmt = this.db.prepare(sql);
                    const info = stmt.run(...params);
                    resolve([{ affectedRows: info.changes }, {}]);
                }
            } catch (error) {
                reject(error);
            }
        });
    }

    async beginTransaction() {
        this._transaction = true;
        this.db.prepare('BEGIN TRANSACTION').run();
    }

    async commit() {
        this._transaction = false;
        this.db.prepare('COMMIT').run();
    }

    async rollback() {
        this._transaction = false;
        this.db.prepare('ROLLBACK').run();
    }

    release() {
        if (this._transaction) {
            this.rollback();
        }
    }

    convertMySQLSyntax(sql) {
        // 转换MySQL特有函数为SQLite兼容语法
        sql = sql.replace(/NOW\(\)/gi, "datetime('now')");
        sql = sql.replace(/CURRENT_TIMESTAMP/gi, "datetime('now')");

        // 转换DATE函数
        sql = sql.replace(/DATE\((\w+)\)/gi, "date($1)");

        // 转换IFNULL
        sql = sql.replace(/IFNULL\(([^,]+),\s*([^)]+)\)/gi, "COALESCE($1, $2)");

        // 转换字符集声明
        sql = sql.replace(/CHARACTER SET\s+\w+/gi, '');
        sql = sql.replace(/COLLATE\s+\w+/gi, '');

        // 转换AUTO_INCREMENT为AUTOINCREMENT
        sql = sql.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');

        // 转换TINYINT
        sql = sql.replace(/TINYINT\(1\)/gi, 'INTEGER');
        sql = sql.replace(/BOOLEAN/gi, 'INTEGER');

        // 转换DECIMAL
        sql = sql.replace(/DECIMAL\((\d+),(\d+)\)/gi, 'REAL');

        // 转换TEXT为TEXT
        sql = sql.replace(/LONGTEXT/gi, 'TEXT');
        sql = sql.replace(/MEDIUMTEXT/gi, 'TEXT');
        sql = sql.replace(/TINYTEXT/gi, 'TEXT');

        // 移除FOR UPDATE锁语法（SQLite不支持）
        sql = sql.replace(/FOR UPDATE/gi, '');

        return sql;
    }
}

class Pool {
    constructor() {
        this.getConnection = this.getConnection.bind(this);
    }

    async getConnection() {
        return new Connection();
    }

    async end() {
        // SQLite不需要关闭连接池
    }

    async query(sql, params = []) {
        const conn = await this.getConnection();
        try {
            return await conn.query(sql, params);
        } finally {
            conn.release();
        }
    }
}

// 创建全局连接池
const pool = new Pool();

module.exports = { pool, Connection };
