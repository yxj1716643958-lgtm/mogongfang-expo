-- ============================================
-- 手机号验证码登录系统 - 数据库表结构
-- 创建日期：2026-04-21
-- ============================================

USE ne_expo_ticket;

-- ============================================
-- 1. 用户表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
    mobile VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号（唯一）',
    nickname VARCHAR(100) COMMENT '昵称',
    avatar_url VARCHAR(500) COMMENT '头像URL',

    -- 用户状态
    status ENUM('ACTIVE', 'DISABLED', 'DELETED') NOT NULL DEFAULT 'ACTIVE' COMMENT '用户状态',

    -- 登录信息
    last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
    last_login_ip VARCHAR(50) COMMENT '最后登录IP',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    INDEX idx_mobile (mobile),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- ============================================
-- 2. 短信验证码表
-- ============================================
CREATE TABLE IF NOT EXISTS sms_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '验证码ID',
    mobile VARCHAR(20) NOT NULL COMMENT '手机号',
    code VARCHAR(10) NOT NULL COMMENT '验证码',
    scene VARCHAR(20) NOT NULL DEFAULT 'login' COMMENT '场景：login, register, reset_password',

    -- 有效期与使用状态
    expired_at TIMESTAMP NOT NULL COMMENT '过期时间（5分钟有效）',
    used_at TIMESTAMP NULL COMMENT '使用时间',
    is_used BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否已使用',

    -- 请求信息
    request_ip VARCHAR(50) COMMENT '请求IP',
    request_ua TEXT COMMENT '用户代理',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_mobile_scene (mobile, scene),
    INDEX idx_expired_at (expired_at),
    INDEX idx_is_used (is_used),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='短信验证码表';

-- ============================================
-- 3. 登录日志表（可选，用于安全审计）
-- ============================================
CREATE TABLE IF NOT EXISTS login_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
    user_id BIGINT UNSIGNED COMMENT '用户ID',
    mobile VARCHAR(20) NOT NULL COMMENT '手机号',
    login_type ENUM('SMS_CODE', 'PASSWORD', 'WECHAT') NOT NULL DEFAULT 'SMS_CODE' COMMENT '登录方式',

    -- 登录结果
    is_success BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否成功',
    fail_reason VARCHAR(200) COMMENT '失败原因',

    -- 登录信息
    login_ip VARCHAR(50) COMMENT '登录IP',
    login_location VARCHAR(200) COMMENT '登录地点',
    device_id VARCHAR(100) COMMENT '设备ID',
    user_agent TEXT COMMENT '用户代理',

    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',

    INDEX idx_user_id (user_id),
    INDEX idx_mobile (mobile),
    INDEX idx_created_at (created_at),
    INDEX idx_is_success (is_success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='登录日志表';

-- ============================================
-- 初始化完成
-- ============================================
SELECT 'Auth database schema created successfully!' AS Status;
