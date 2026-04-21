-- ============================================
-- 东北亚数字文创博览会 - 票务系统数据库
-- 数据库版本：v1.0
-- 创建日期：2026-04-10
-- ============================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS ne_expo_ticket
DEFAULT CHARACTER SET utf8mb4
DEFAULT COLLATE utf8mb4_unicode_ci;

USE ne_expo_ticket;

-- ============================================
-- 1. 票种配置表
-- ============================================
CREATE TABLE IF NOT EXISTS ticket_types (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_code VARCHAR(50) NOT NULL UNIQUE COMMENT '票种代码',
    ticket_name VARCHAR(100) NOT NULL COMMENT '票种名称',
    ticket_category ENUM('PAID', 'FREE', 'INVITATION') NOT NULL COMMENT '票种类别',

    original_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '原价',
    sale_price DECIMAL(10,2) DEFAULT 0.00 COMMENT '售价',

    benefits JSON COMMENT '票种权益配置',
    description TEXT COMMENT '票种描述',

    total_quantity INT DEFAULT NULL COMMENT '总数量',
    sold_quantity INT DEFAULT 0 COMMENT '已售数量',
    daily_limit INT DEFAULT NULL COMMENT '每日限购',
    user_limit INT DEFAULT NULL COMMENT '每人限购',

    sale_start_time DATETIME COMMENT '开售时间',
    sale_end_time DATETIME COMMENT '停售时间',
    valid_start_time DATETIME COMMENT '有效期开始',
    valid_end_time DATETIME COMMENT '有效期结束',

    require_audit BOOLEAN DEFAULT FALSE COMMENT '是否需要审核',
    auto_audit_rules JSON COMMENT '自动审核规则',

    is_active BOOLEAN DEFAULT TRUE COMMENT '是否启用',
    sort_order INT DEFAULT 0 COMMENT '排序',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(50) COMMENT '创建人',

    INDEX idx_ticket_category (ticket_category),
    INDEX idx_active_time (is_active, sale_start_time, sale_end_time),
    INDEX idx_code (ticket_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票种配置表';

-- 插入初始票种数据
INSERT INTO ticket_types (
    ticket_code, ticket_name, ticket_category,
    original_price, sale_price,
    benefits, description,
    sale_start_time, sale_end_time,
    valid_start_time, valid_end_time,
    total_quantity, user_limit, is_active, sort_order
) VALUES
(
    'EARLY_BIRD',
    '早鸟体验票',
    'PAID',
    69.90,
    39.90,
    '{"includes": ["展会限定纪念品", "透卡票+打卡册", "可加¥169升级VIP"]}',
    '线上专属优惠，适合首次观展体验',
    '2024-01-01 00:00:00',
    '2024-12-31 23:59:59',
    '2024-06-01 09:00:00',
    '2024-06-03 18:00:00',
    5000,
    3,
    TRUE,
    1
),
(
    'VIP',
    '至尊VIP票',
    'PAID',
    399.00,
    199.00,
    '{"includes": ["含早鸟票所有权益", "价值99元限定大礼包", "单日嘉宾授课席位", "签售+提早入场", "优先抢购权益"]}',
    '全程尊享权益，含嘉宾席位及专属福利',
    '2024-01-01 00:00:00',
    '2024-12-31 23:59:59',
    '2024-06-01 08:30:00',
    '2024-06-03 18:00:00',
    500,
    1,
    TRUE,
    2
),
(
    'INVITATION',
    '邀请函票',
    'INVITATION',
    0.00,
    0.00,
    '{"includes": ["免费观展", "专业交流机会"], "requires": ["审核通过"]}',
    '专业观众、媒体、合作伙伴专用',
    '2024-01-01 00:00:00',
    '2024-06-01 23:59:59',
    '2024-06-01 09:00:00',
    '2024-06-03 18:00:00',
    NULL,
    1,
    TRUE,
    3
);

-- 更新邀请函票种配置
UPDATE ticket_types
SET require_audit = TRUE
WHERE ticket_code = 'INVITATION';

-- ============================================
-- 2. 订单主表
-- ============================================
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_no VARCHAR(32) NOT NULL UNIQUE COMMENT '订单号',

    user_id BIGINT UNSIGNED COMMENT '用户ID',
    user_name VARCHAR(100) NOT NULL COMMENT '购票人姓名',
    user_phone VARCHAR(20) NOT NULL COMMENT '购票人手机号',
    user_email VARCHAR(100) COMMENT '购票人邮箱',
    user_id_card VARCHAR(20) COMMENT '身份证号',

    order_type ENUM('PAID', 'FREE', 'INVITATION') NOT NULL COMMENT '订单类型',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '订单总金额',
    paid_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '实付金额',
    discount_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '优惠金额',

    ticket_type_id BIGINT UNSIGNED NOT NULL COMMENT '票种ID',
    ticket_quantity INT NOT NULL DEFAULT 1 COMMENT '购票数量',
    ticket_info JSON COMMENT '票种快照',

    order_status ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED') NOT NULL DEFAULT 'PENDING' COMMENT '订单状态',
    payment_status ENUM('UNPAID', 'PAYING', 'PAID', 'FAILED', 'REFUNDED') NOT NULL DEFAULT 'UNPAID' COMMENT '支付状态',

    payment_method VARCHAR(50) COMMENT '支付方式',
    payment_channel VARCHAR(50) COMMENT '支付渠道',
    transaction_id VARCHAR(100) COMMENT '第三方支付流水号',

    audit_status ENUM('PENDING', 'APPROVED', 'REJECTED') COMMENT '审核状态',
    audit_reason TEXT COMMENT '审核原因',
    audit_time TIMESTAMP NULL COMMENT '审核时间',
    audit_by VARCHAR(50) COMMENT '审核人',

    paid_at TIMESTAMP NULL COMMENT '支付时间',
    expired_at TIMESTAMP NULL COMMENT '订单过期时间',
    refunded_at TIMESTAMP NULL COMMENT '退款时间',

    client_ip VARCHAR(50) COMMENT '客户端IP',
    user_agent TEXT COMMENT '用户代理',
    remark TEXT COMMENT '备注',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_phone (user_phone),
    INDEX idx_order_status (order_status),
    INDEX idx_payment_status (payment_status),
    INDEX idx_audit_status (audit_status),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_user_phone_type (user_phone, ticket_type_id, order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='订单主表';

-- ============================================
-- 3. 票券表
-- ============================================
CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_no VARCHAR(32) NOT NULL UNIQUE COMMENT '票号',

    order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单号',
    user_id BIGINT UNSIGNED COMMENT '用户ID',
    user_name VARCHAR(100) NOT NULL COMMENT '使用人姓名',
    user_phone VARCHAR(20) NOT NULL COMMENT '使用人手机号',

    ticket_type_id BIGINT UNSIGNED NOT NULL COMMENT '票种ID',
    ticket_code VARCHAR(50) NOT NULL COMMENT '票种代码',
    ticket_name VARCHAR(100) NOT NULL COMMENT '票种名称',
    ticket_category ENUM('PAID', 'FREE', 'INVITATION') NOT NULL COMMENT '票种类别',

    qr_code_token VARCHAR(64) NOT NULL UNIQUE COMMENT '二维码token',
    qr_code_short VARCHAR(20) NOT NULL UNIQUE COMMENT '二维码短码',
    qr_code_url VARCHAR(500) COMMENT '二维码图片URL',

    benefits JSON COMMENT '票种权益',

    valid_start_time DATETIME NOT NULL COMMENT '有效期开始',
    valid_end_time DATETIME NOT NULL COMMENT '有效期结束',

    ticket_status ENUM('ACTIVE', 'USED', 'REFUNDED', 'CANCELLED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE' COMMENT '票券状态',

    verified_at TIMESTAMP NULL COMMENT '核销时间',
    verified_by VARCHAR(50) COMMENT '核销员',
    verified_device VARCHAR(100) COMMENT '核销设备ID',
    verify_location VARCHAR(200) COMMENT '核销地点',

    cancelled_at TIMESTAMP NULL COMMENT '作废时间',
    cancelled_by VARCHAR(50) COMMENT '作废人',
    cancel_reason VARCHAR(200) COMMENT '作废原因',

    total_amount DECIMAL(10,2) COMMENT '票面金额',

    issue_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '出票时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_order_id (order_id),
    INDEX idx_user_phone (user_phone),
    INDEX idx_qr_token (qr_code_token),
    INDEX idx_qr_short (qr_code_short),
    INDEX idx_ticket_status (ticket_status),
    INDEX idx_valid_time (valid_start_time, valid_end_time),
    INDEX idx_user_phone_status (user_phone, ticket_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='票券表';

-- ============================================
-- 4. 支付记录表
-- ============================================
CREATE TABLE IF NOT EXISTS payment_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    order_id BIGINT UNSIGNED NOT NULL COMMENT '订单ID',
    order_no VARCHAR(32) NOT NULL COMMENT '订单号',
    transaction_id VARCHAR(100) COMMENT '第三方支付流水号',

    payment_channel VARCHAR(50) NOT NULL COMMENT '支付渠道',
    payment_method VARCHAR(50) NOT NULL COMMENT '支付方式',

    order_amount DECIMAL(10,2) NOT NULL COMMENT '订单金额',
    paid_amount DECIMAL(10,2) NOT NULL COMMENT '支付金额',
    fee_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '手续费',

    payment_status ENUM('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'PARTIAL_REFUNDED') NOT NULL DEFAULT 'PENDING' COMMENT '支付状态',

    third_party_no VARCHAR(100) COMMENT '第三方交易号',
    third_party_data JSON COMMENT '第三方返回数据',

    payment_time TIMESTAMP NULL COMMENT '支付时间',
    refund_time TIMESTAMP NULL COMMENT '退款时间',

    client_ip VARCHAR(50) COMMENT '客户端IP',
    error_code VARCHAR(50) COMMENT '错误码',
    error_message TEXT COMMENT '错误信息',
    remark TEXT COMMENT '备注',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_order_id (order_id),
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_third_party_no (third_party_no),
    INDEX idx_payment_status (payment_status),
    INDEX idx_payment_channel (payment_channel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='支付记录表';

-- ============================================
-- 5. 核销记录表
-- ============================================
CREATE TABLE IF NOT EXISTS verification_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

    ticket_id BIGINT UNSIGNED COMMENT '票券ID',
    ticket_no VARCHAR(32) NOT NULL COMMENT '票号',
    order_id BIGINT UNSIGNED COMMENT '订单ID',

    verify_type ENUM('QR_CODE', 'MANUAL', 'BATCH') NOT NULL DEFAULT 'QR_CODE' COMMENT '核销方式',
    verify_status ENUM('SUCCESS', 'FAILED', 'CANCELLED') NOT NULL COMMENT '核销状态',

    verifier_id VARCHAR(50) NOT NULL COMMENT '核销员ID',
    verifier_name VARCHAR(100) NOT NULL COMMENT '核销员姓名',
    device_id VARCHAR(100) COMMENT '设备ID',

    verify_location VARCHAR(200) COMMENT '核销地点',
    verify_gate VARCHAR(50) COMMENT '入口/闸机',

    verify_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '核销时间',

    fail_reason VARCHAR(200) COMMENT '失败原因',

    client_ip VARCHAR(50) COMMENT '客户端IP',
    remark TEXT COMMENT '备注',

    INDEX idx_ticket_id (ticket_id),
    INDEX idx_ticket_no (ticket_no),
    INDEX idx_verifier_id (verifier_id),
    INDEX idx_verify_time (verify_time),
    INDEX idx_verify_status (verify_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='核销记录表';

-- ============================================
-- 6. 邀请函申请表
-- ============================================
CREATE TABLE IF NOT EXISTS invitation_applications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    application_no VARCHAR(32) NOT NULL UNIQUE COMMENT '申请单号',

    applicant_name VARCHAR(100) NOT NULL COMMENT '申请人姓名',
    applicant_phone VARCHAR(20) NOT NULL COMMENT '申请人手机号',
    applicant_email VARCHAR(100) COMMENT '申请人邮箱',
    applicant_company VARCHAR(200) COMMENT '申请人公司',
    applicant_position VARCHAR(100) COMMENT '申请人职位',

    ticket_type_id BIGINT UNSIGNED NOT NULL COMMENT '票种ID',
    apply_quantity INT NOT NULL DEFAULT 1 COMMENT '申请数量',
    apply_reason TEXT COMMENT '申请原因',

    audit_status ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING' COMMENT '审核状态',
    audit_by VARCHAR(50) COMMENT '审核人',
    audit_time TIMESTAMP NULL COMMENT '审核时间',
    audit_reason VARCHAR(500) COMMENT '审核原因',

    order_id BIGINT UNSIGNED COMMENT '关联订单ID',
    ticket_ids JSON COMMENT '关联票券ID列表',

    approved_at TIMESTAMP NULL COMMENT '通过时间',
    rejected_at TIMESTAMP NULL COMMENT '拒绝时间',

    source_type ENUM('WEB', 'ADMIN', 'IMPORT', 'API') NOT NULL DEFAULT 'WEB' COMMENT '申请来源',
    batch_no VARCHAR(50) COMMENT '批次号',

    client_ip VARCHAR(50) COMMENT '客户端IP',
    user_agent TEXT COMMENT '用户代理',
    remark TEXT COMMENT '备注',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_applicant_phone (applicant_phone),
    INDEX idx_audit_status (audit_status),
    INDEX idx_source_type (source_type),
    INDEX idx_batch_no (batch_no),
    INDEX idx_created_at (created_at),
    UNIQUE KEY uk_phone_status (applicant_phone, audit_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='邀请函申请表';

-- ============================================
-- 初始化完成
-- ============================================
SELECT 'Database schema created successfully!' AS Status;
