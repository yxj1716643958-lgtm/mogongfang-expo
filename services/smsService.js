/**
 * 阿里云短信服务
 * 使用 @alicloud/dysmsapi20170525 SDK
 */

const Dysmsapi = require('@alicloud/dysmsapi20170525');
const $OpenApi = require('@alicloud/openapi-client');

// 从环境变量读取配置
const accessKeyId = process.env.ALIYUN_ACCESS_KEY_ID;
const accessKeySecret = process.env.ALIYUN_ACCESS_KEY_SECRET;
const signName = process.env.ALIYUN_SMS_SIGN_NAME;
const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;

/**
 * 初始化阿里云短信客户端
 */
function createSmsClient() {
    const config = new $OpenApi.Config({
        accessKeyId: accessKeyId,
        accessKeySecret: accessKeySecret,
        endpoint: 'dysmsapi.aliyuncs.com'
    });

    return new Dysmsapi.default(config);
}

/**
 * 发送短信验证码
 * @param {string} mobile - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<Object>} 发送结果
 */
async function sendVerificationCode(mobile, code) {
    const client = createSmsClient();

    const request = new Dysmsapi.SendSmsRequest({
        phoneNumbers: mobile,
        signName: signName,
        templateCode: templateCode,
        templateParam: JSON.stringify({ code: code })
    });

    try {
        const response = await client.sendSms(request);

        if (response.statusCode === 200 && response.body.code === 'OK') {
            return {
                success: true,
                requestId: response.body.requestId,
                bizId: response.body.bizId,
                message: '发送成功'
            };
        } else {
            return {
                success: false,
                code: response.body.code,
                message: response.body.message || '发送失败'
            };
        }
    } catch (error) {
        console.error('阿里云短信发送失败:', error);
        return {
            success: false,
            message: error.message || '短信服务异常'
        };
    }
}

/**
 * 批量发送短信（用于营销等场景）
 * @param {Array<string>} mobiles - 手机号数组
 * @param {string} signName - 签名
 * @param {string} templateCode - 模板CODE
 * @param {Object} templateParam - 模板参数
 * @returns {Promise<Object>}
 */
async function sendBatchSms(mobiles, signName, templateCode, templateParam) {
    const client = createSmsClient();

    const request = new Dysmsapi.SendBatchSmsRequest({
        phoneNumberJson: JSON.stringify(mobiles),
        signNameJson: JSON.stringify(Array(mobiles.length).fill(signName)),
        templateCode: templateCode,
        templateParamJson: JSON.stringify(templateParam)
    });

    try {
        const response = await client.sendBatchSms(request);

        if (response.statusCode === 200) {
            return {
                success: true,
                requestId: response.body.requestId,
                message: '批量发送成功'
            };
        } else {
            return {
                success: false,
                code: response.body.code,
                message: response.body.message || '批量发送失败'
            };
        }
    } catch (error) {
        console.error('阿里云批量短信发送失败:', error);
        return {
            success: false,
            message: error.message || '短信服务异常'
        };
    }
}

/**
 * 查询短信发送详情
 * @param {string} mobile - 手机号
 * @param {string} bizId - 短信发送回执ID
 * @param {Date} sendDate - 发送日期
 * @returns {Promise<Object>}
 */
async function querySendDetails(mobile, bizId, sendDate) {
    const client = createSmsClient();

    const request = new Dysmsapi.QuerySendDetailsRequest({
        phoneNumber: mobile,
        bizId: bizId,
        sendDate: sendDate.toISOString().slice(0, 10).replace(/-/g, ''),
        pageSize: 10,
        currentPage: 1
    });

    try {
        const response = await client.querySendDetails(request);

        return {
            success: response.statusCode === 200,
            data: response.body
        };
    } catch (error) {
        console.error('查询短信详情失败:', error);
        return {
            success: false,
            message: error.message
        };
    }
}

module.exports = {
    sendVerificationCode,
    sendBatchSms,
    querySendDetails
};
