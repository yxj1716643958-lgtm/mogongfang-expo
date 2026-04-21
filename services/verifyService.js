/**
 * 验票服务
 * 处理票券核销相关的业务逻辑
 */

const { pool } = require('../sqlite-adapter');
const { verifyTicketCode } = require('../utils/token');

/**
 * 预校验票券
 * @param {string} qrContent - 二维码内容
 * @returns {Object} 校验结果
 */
async function verifyPreview(qrContent) {
    const connection = await pool.getConnection();

    try {
        // 1. 验证token
        const tokenResult = verifyTicketCode(qrContent);
        if (!tokenResult.valid) {
            return {
                code: tokenResult.error,
                message: getMessageForCode(tokenResult.error),
                data: null
            };
        }

        // 2. 查询票券
        const [tickets] = await connection.query(
            'SELECT * FROM tickets WHERE ticket_code = ?',
            [qrContent]
        );

        if (!tickets || tickets.length === 0) {
            return {
                code: 'NOT_FOUND',
                message: '票券不存在',
                data: null
            };
        }

        const ticket = tickets[0];

        // 3. 检查票券状态
        if (ticket.ticket_status !== 'ACTIVE') {
            return {
                code: mapStatusToResult(ticket.ticket_status),
                message: getMessageForCode(mapStatusToResult(ticket.ticket_status)),
                data: {
                    ticket_no: ticket.ticket_no,
                    used_at: ticket.check_time,
                    used_by: ticket.check_operator
                }
            };
        }

        // 4. 检查有效期
        const now = new Date();
        const validStart = new Date(ticket.valid_start_time);
        const validEnd = new Date(ticket.valid_end_time);

        if (now < validStart) {
            return {
                code: 'NOT_STARTED',
                message: '票券尚未到使用时间',
                data: {
                    ticket_no: ticket.ticket_no,
                    valid_start_time: ticket.valid_start_time
                }
            };
        }

        if (now > validEnd) {
            return {
                code: 'EXPIRED',
                message: '票券已过期',
                data: {
                    ticket_no: ticket.ticket_no,
                    valid_end_time: ticket.valid_end_time
                }
            };
        }

        // 5. 返回票券信息
        return {
            code: 'SUCCESS',
            message: '票券有效',
            data: {
                ticket_no: ticket.ticket_no,
                ticket_type: ticket.ticket_type_code,
                ticket_name: ticket.ticket_name,
                holder_name: ticket.visitor_name,
                holder_mobile_last4: maskMobile(ticket.visitor_phone),
                ticket_status: ticket.ticket_status,
                valid_start_time: ticket.valid_start_time,
                valid_end_time: ticket.valid_end_time,
                qr_content: ticket.qr_code_data
            }
        };

    } finally {
        connection.release();
    }
}

/**
 * 确认核销票券
 * @param {string} ticketCode - 票券代码（二维码内容）
 * @param {Object} operatorInfo - 操作员信息
 * @returns {Object} 核销结果
 */
async function writeoffTicket(ticketCode, operatorInfo) {
    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        // 1. 查询票券
        const [tickets] = await connection.query(
            'SELECT * FROM tickets WHERE ticket_code = ?',
            [ticketCode]
        );

        if (!tickets || tickets.length === 0) {
            await connection.rollback();
            return {
                code: 'NOT_FOUND',
                message: '票券不存在',
                data: null
            };
        }

        const ticket = tickets[0];

        // 2. 检查票券状态
        if (ticket.ticket_status !== 'ACTIVE') {
            // 记录失败日志
            await logVerifyAttempt(connection, {
                ticketId: ticket.id,
                ticketNo: ticket.ticket_no,
                ticketCode: ticketCode,
                result: mapStatusToResult(ticket.ticket_status),
                message: getMessageForCode(mapStatusToResult(ticket.ticket_status)),
                operatorInfo
            });

            await connection.commit();
            connection.release();

            return {
                code: mapStatusToResult(ticket.ticket_status),
                message: getMessageForCode(mapStatusToResult(ticket.ticket_status)),
                data: {
                    ticket_no: ticket.ticket_no,
                    used_at: ticket.check_time,
                    used_by: ticket.check_operator
                }
            };
        }

        // 3. 检查有效期
        const now = new Date();
        const validStart = new Date(ticket.valid_start_time);
        const validEnd = new Date(ticket.valid_end_time);

        if (now < validStart || now > validEnd) {
            // 记录失败日志
            await logVerifyAttempt(connection, {
                ticketId: ticket.id,
                ticketNo: ticket.ticket_no,
                ticketCode: ticketCode,
                result: 'EXPIRED',
                message: '票券已过期',
                operatorInfo
            });

            await connection.commit();
            connection.release();

            return {
                code: 'EXPIRED',
                message: '票券已过期',
                data: {
                    ticket_no: ticket.ticket_no,
                    valid_start_time: ticket.valid_start_time,
                    valid_end_time: ticket.valid_end_time
                }
            };
        }

        // 4. 原子更新状态
        const [updateResult] = await connection.query(
            `UPDATE tickets
             SET ticket_status = 'USED',
                 check_status = 'CHECKED',
                 check_time = datetime('now'),
                 check_operator = ?,
                 updated_at = datetime('now')
             WHERE ticket_code = ?
               AND ticket_status = 'ACTIVE'`,
            [operatorInfo.operatorName, ticketCode]
        );

        if (updateResult.affectedRows === 0) {
            // 并发情况，票已被其他核销员使用
            await connection.rollback();
            connection.release();

            return {
                code: 'ALREADY_USED',
                message: '核销失败：该票已被使用',
                data: null
            };
        }

        // 5. 记录核销日志
        const logId = await logVerifyAttempt(connection, {
            ticketId: ticket.id,
            ticketNo: ticket.ticket_no,
            ticketCode: ticketCode,
            result: 'SUCCESS',
            message: '核销成功',
            operatorInfo
        });

        await connection.commit();
        connection.release();

        return {
            code: 'SUCCESS',
            message: '核销成功',
            data: {
                ticket_no: ticket.ticket_no,
                ticket_name: ticket.ticket_name,
                holder_name: ticket.visitor_name,
                used_at: new Date().toISOString(),
                verify_record_id: logId
            }
        };

    } catch (error) {
        await connection.rollback();
        connection.release();

        console.error('核销失败:', error);
        return {
            code: 'SERVER_ERROR',
            message: '服务器错误',
            data: null
        };
    }
}

/**
 * 按手机号查询票券
 * @param {string} mobile - 手机号
 * @returns {Object} 查询结果
 */
async function searchByMobile(mobile) {
    const connection = await pool.getConnection();

    try {
        const [tickets] = await connection.query(
            `SELECT ticket_no, ticket_type_code, ticket_name,
                    visitor_name, visitor_phone, ticket_status
             FROM tickets
             WHERE visitor_phone = ?
               AND ticket_status = 'ACTIVE'
             ORDER BY created_at DESC`,
            [mobile]
        );

        connection.release();

        if (!tickets || tickets.length === 0) {
            return {
                code: 'NOT_FOUND',
                message: '未找到有效票券',
                data: {
                    total: 0,
                    tickets: []
                }
            };
        }

        const ticketList = tickets.map(ticket => ({
            ticket_no: ticket.ticket_no,
            ticket_type: ticket.ticket_type_code,
            ticket_name: ticket.ticket_name,
            ticket_status: ticket.ticket_status,
            holder_name: ticket.visitor_name,
            holder_mobile_last4: maskMobile(ticket.visitor_phone)
        }));

        return {
            code: 'SUCCESS',
            message: '查询成功',
            data: {
                total: ticketList.length,
                tickets: ticketList
            }
        };

    } catch (error) {
        connection.release();
        console.error('查询票券失败:', error);

        return {
            code: 'SERVER_ERROR',
            message: '服务器错误',
            data: null
        };
    }
}

/**
 * 查询核销记录
 * @param {Object} filters - 查询条件
 * @returns {Object} 查询结果
 */
async function getVerifyRecords(filters = {}) {
    const connection = await pool.getConnection();

    try {
        let query = `
            SELECT vr.*, t.ticket_name, t.visitor_name
            FROM verify_records vr
            LEFT JOIN tickets t ON vr.ticket_no = t.ticket_no
            WHERE 1=1
        `;
        const params = [];
        const conditions = [];

        if (filters.operator_id) {
            conditions.push('vr.operator_id = ?');
            params.push(filters.operator_id);
        }

        if (filters.start_date) {
            conditions.push('DATE(vr.created_at) >= ?');
            params.push(filters.start_date);
        }

        if (filters.end_date) {
            conditions.push('DATE(vr.created_at) <= ?');
            params.push(filters.end_date);
        }

        if (filters.verify_result) {
            conditions.push('vr.verify_result = ?');
            params.push(filters.verify_result);
        }

        if (conditions.length > 0) {
            query += ' AND ' + conditions.join(' AND ');
        }

        query += ' ORDER BY vr.created_at DESC';

        // 分页
        const page = parseInt(filters.page) || 1;
        const pageSize = parseInt(filters.page_size) || 20;
        const offset = (page - 1) * pageSize;

        query += ' LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        const [records] = await connection.query(query, params);

        // 查询总数
        let countQuery = 'SELECT COUNT(*) as total FROM verify_records vr WHERE 1=1';
        const countParams = [];
        const countConditions = [];

        if (filters.operator_id) {
            countConditions.push('operator_id = ?');
            countParams.push(filters.operator_id);
        }

        if (filters.start_date) {
            countConditions.push('DATE(created_at) >= ?');
            countParams.push(filters.start_date);
        }

        if (filters.end_date) {
            countConditions.push('DATE(created_at) <= ?');
            countParams.push(filters.end_date);
        }

        if (filters.verify_result) {
            countConditions.push('verify_result = ?');
            countParams.push(filters.verify_result);
        }

        if (countConditions.length > 0) {
            countQuery += ' AND ' + countConditions.join(' AND ');
        }

        const [countResult] = await connection.query(countQuery, countParams);

        connection.release();

        return {
            code: 'SUCCESS',
            message: '查询成功',
            data: {
                total: countResult[0].total,
                page: page,
                page_size: pageSize,
                records: records
            }
        };

    } catch (error) {
        connection.release();
        console.error('查询核销记录失败:', error);

        return {
            code: 'SERVER_ERROR',
            message: '服务器错误',
            data: null
        };
    }
}

/**
 * 记录核销尝试
 * @param {Object} connection - 数据库连接
 * @param {Object} data - 核销数据
 * @returns {number} 记录ID
 */
async function logVerifyAttempt(connection, data) {
    const {
        ticketId,
        ticketNo,
        ticketCode,
        result,
        message,
        operatorInfo
    } = data;

    const [insertResult] = await connection.query(
        `INSERT INTO verify_records (
            ticket_id, ticket_no, ticket_code,
            verify_result, verify_message,
            operator_id, operator_name, device_id, gate_name,
            created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            ticketId,
            ticketNo,
            ticketCode,
            result,
            message,
            operatorInfo.operatorId,
            operatorInfo.operatorName,
            operatorInfo.deviceId || null,
            operatorInfo.gateName || null
        ]
    );

    return insertResult.insertId;
}

/**
 * 辅助函数：映射状态到核销结果
 */
function mapStatusToResult(status) {
    const statusMap = {
        'ACTIVE': 'SUCCESS',
        'USED': 'ALREADY_USED',
        'EXPIRED': 'EXPIRED',
        'CANCELLED': 'CANCELLED',
        'REFUNDED': 'CANCELLED'
    };

    return statusMap[status] || 'INVALID_STATUS';
}

/**
 * 辅助函数：获取错误消息
 */
function getMessageForCode(code) {
    const messages = {
        'SUCCESS': '操作成功',
        'ALREADY_USED': '该票已被核销',
        'NOT_FOUND': '票券不存在',
        'EXPIRED': '票券已过期',
        'CANCELLED': '票券已作废',
        'INVALID_TOKEN': '二维码无效',
        'NOT_STARTED': '票券尚未到使用时间',
        'SERVER_ERROR': '服务器错误',
        'INVALID_STATUS': '无效的票券状态'
    };

    return messages[code] || '未知错误';
}

/**
 * 辅助函数：手机号脱敏
 */
function maskMobile(mobile) {
    if (!mobile || mobile.length < 7) return mobile;
    return mobile.substring(0, 3) + '****' + mobile.substring(7);
}

module.exports = {
    verifyPreview,
    writeoffTicket,
    searchByMobile,
    getVerifyRecords
};
