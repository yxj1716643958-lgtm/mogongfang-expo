/**
 * NE_ADCI_MAE - 登录页面交互脚本
 */

// 用户数据存储
const USER_DATA_KEY = 'ne_adcimae_user';

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
});

/**
 * 初始化登录页面
 */
function initLoginPage() {
    // 检查是否已登录
    checkLoginStatus();

    // 初始化表单提交
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 初始化身份选择按钮
    initIdentityButtons();

    // 初始化社交登录按钮
    initSocialLoginButtons();

    // 添加输入框焦点效果
    initInputEffects();
}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const userData = localStorage.getItem(USER_DATA_KEY);
    if (userData) {
        // 已登录，跳转到主页
        window.location.href = 'dashboard.html';
    }
}

/**
 * 处理登录表单提交
 */
function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
        showToast('请输入完整的登录信息', 'error');
        return;
    }

    // 模拟登录验证
    const loginData = {
        username: username,
        userType: localStorage.getItem('selected_user_type') || 'enthusiast',
        loginTime: new Date().toISOString(),
        sessionId: generateSessionId()
    };

    // 保存用户数据
    localStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData));

    // 显示成功提示
    showToast('身份验证成功，正在进入系统...', 'success');

    // 延迟跳转
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 1500);
}

/**
 * 初始化身份选择按钮
 */
function initIdentityButtons() {
    const identityBtns = document.querySelectorAll('.identity-btn');

    identityBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const userType = this.getAttribute('data-type');

            // 保存用户类型选择
            localStorage.setItem('selected_user_type', userType);

            // 高亮选中的按钮
            identityBtns.forEach(b => b.classList.remove('border-primary-container', 'border-secondary'));
            this.classList.add(userType === 'exhibitor' ? 'border-primary-container' : 'border-secondary');

            // 聚焦到用户名输入框
            document.getElementById('username').focus();

            showToast(`已选择: ${userType === 'exhibitor' ? '专业观众/展商' : '模型爱好者'}`, 'success');
        });
    });
}

/**
 * 初始化社交登录按钮
 */
function initSocialLoginButtons() {
    const socialBtns = document.querySelectorAll('.social-btn');

    socialBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const provider = this.getAttribute('data-provider');
            let providerName = '';

            switch(provider) {
                case 'wechat':
                    providerName = '微信';
                    break;
                case 'email':
                    providerName = '邮箱';
                    break;
                case 'qr':
                    providerName = '二维码';
                    break;
                default:
                    providerName = '第三方平台';
            }

            showToast(`正在连接${providerName}认证服务...`, 'success');

            // 模拟社交登录
            setTimeout(() => {
                const loginData = {
                    username: `user_${provider}`,
                    userType: 'enthusiast',
                    loginTime: new Date().toISOString(),
                    sessionId: generateSessionId(),
                    socialProvider: provider
                };

                localStorage.setItem(USER_DATA_KEY, JSON.stringify(loginData));
                window.location.href = 'dashboard.html';
            }, 1000);
        });
    });
}

/**
 * 初始化输入框效果
 */
function initInputEffects() {
    const inputs = document.querySelectorAll('input[type="text"], input[type="password"]');

    inputs.forEach(input => {
        // 聚焦时添加效果
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });

        // 失焦时移除效果
        input.addEventListener('blur', function() {
            this.parentElement.classList.remove('focused');
        });
    });
}

/**
 * 生成会话ID
 */
function generateSessionId() {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
}

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
    // 移除已存在的提示
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }

    // 创建新提示
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    // 添加到页面
    document.body.appendChild(toast);

    // 3秒后自动移除
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * 演示账号快速登录（开发测试用）
 */
const DEMO_ACCOUNTS = {
    exhibitor: { username: 'demo', password: 'demo123' },
    enthusiast: { username: 'user', password: 'user123' }
};

// 在控制台提供快速登录提示
console.log('%cNE_ADCI_MAE 系统访问', 'color: #00e5ff; font-size: 20px; font-weight: bold;');
console.log('%c演示账号:', 'color: #c3f5ff; font-size: 14px;');
console.log('%c专业观众: demo / demo123', 'color: #ebb2ff;');
console.log('%c模型爱好者: user / user123', 'color: #ebb2ff;');
