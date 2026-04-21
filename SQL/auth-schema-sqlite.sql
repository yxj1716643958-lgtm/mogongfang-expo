-- ============================================
-- 手机号验证码登录系统 - SQLite 数据库表结构
-- 创建日期：2026-04-21
-- ============================================

-- 1. 用户表
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
);

-- 2. 短信验证码表
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
);

-- 3. 登录日志表
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
);
