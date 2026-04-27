/**
 * NE_ADCI_MAE - 主控制中心页面脚本
 * 3x3 工业网格布局
 */

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

/**
 * 初始化控制中心
 */
function initDashboard() {
    // 检查登录状态
    checkLoginStatus();

    // 初始化倒计时
    initCountdown();

    // 初始化菜单交互
    initMenuTiles();

    // 初始化登出功能
    initLogout();

    // 更新用户信息
    updateUserInfo();

    console.log('%cNE_ADCI_MAE Dashboard Initialized', 'color: #00e5ff; font-size: 14px; font-weight: bold;');
}

/**
 * 检查登录状态
 */
function checkLoginStatus() {
    const userData = localStorage.getItem('ne_adcimae_user');

    if (!userData) {
        // 未登录，跳转到登录页
        showToast('未登录，请先登录', 'error');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }

    const user = JSON.parse(userData);
    console.log('当前用户:', user.username, '类型:', user.userType);
}

/**
 * 初始化倒计时
 */
function initCountdown() {
    const countdownEl = document.getElementById('countdown');
    if (!countdownEl) return;

    // 设置目标日期：博览会开幕日期
    const targetDate = new Date('2024-06-15T09:00:00').getTime();

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = targetDate - now;

        if (distance < 0) {
            countdownEl.textContent = 'EXPO OPENED';
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        countdownEl.textContent = `${days} DAYS : ${String(hours).padStart(2, '0')} : ${String(minutes).padStart(2, '0')} : ${String(seconds).padStart(2, '0')}`;
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

/**
 * 初始化菜单交互
 */
function initMenuTiles() {
    const menuTiles = document.querySelectorAll('.menu-tile');

    menuTiles.forEach(tile => {
        tile.addEventListener('click', function(e) {
            const section = this.getAttribute('data-section');
            const href = this.getAttribute('href');

            // 如果有 href 且不是 #，则直接跳转
            if (href && href !== '#') {
                return;
            }

            e.preventDefault();

            // 根据选中的菜单项执行操作
            handleMenuClick(section, this);
        });

        // 添加悬停音效效果（可选）
        tile.addEventListener('mouseenter', function() {
            // 可以添加悬停效果
        });
    });
}

/**
 * 处理菜单点击
 */
function handleMenuClick(section, element) {
    switch(section) {
        case 'about':
            // 已链接到 about.html
            break;
        case 'search':
            // 已链接到 exhibitors.html
            break;
        case 'highlights':
            // 已链接到 highlights.html
            break;
        case 'tickets':
            // 已链接到 tickets.html
            break;
        case 'contact':
            showContactModal();
            break;
        default:
            console.log('Unknown section:', section);
    }
}

/**
 * 显示搜索弹窗
 */
function showSearchModal() {
    const content = `
        <div class="space-y-6">
            <div class="relative">
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">search</span>
                <input type="text" id="exhibitorSearchInput" placeholder="搜索参展商、展品、品牌..." class="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-outline-variant text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary-container transition-colors">
            </div>
            <div class="flex gap-2 flex-wrap">
                <span class="px-3 py-1 bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant cursor-pointer hover:border-primary hover:text-primary transition-colors">模型厂商</span>
                <span class="px-3 py-1 bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant cursor-pointer hover:border-primary hover:text-primary transition-colors">数字工作室</span>
                <span class="px-3 py-1 bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant cursor-pointer hover:border-primary hover:text-primary transition-colors">艺术机构</span>
                <span class="px-3 py-1 bg-surface-container-high border border-outline-variant text-xs text-on-surface-variant cursor-pointer hover:border-primary hover:text-primary transition-colors">独立创作者</span>
            </div>
            <div id="searchResults" class="space-y-2 max-h-64 overflow-y-auto">
                <!-- 搜索结果将在这里显示 -->
            </div>
        </div>
    `;

    showModal('参展商搜索', content);

    // 初始化搜索功能
    const searchInput = document.getElementById('exhibitorSearchInput');
    const searchResults = document.getElementById('searchResults');

    // 显示默认结果
    searchResults.innerHTML = `
        <div class="p-4 bg-surface-container-low/60 hover:bg-surface-container-high cursor-pointer transition-colors" data-id="exhibitor-1">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-primary/10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-primary">business</span>
                </div>
                <div>
                    <h4 class="font-bold text-on-surface">NE_TECH_LABS</h4>
                    <p class="text-xs text-on-surface-variant">航天动力模型 • 展位 A3-01</p>
                </div>
            </div>
        </div>
        <div class="p-4 bg-surface-container-low/60 hover:bg-surface-container-high cursor-pointer transition-colors" data-id="exhibitor-2">
            <div class="flex items-center gap-4">
                <div class="w-12 h-12 bg-secondary/10 flex items-center justify-center">
                    <span class="material-symbols-outlined text-secondary">precision_manufacturing</span>
                </div>
                <div>
                    <h4 class="font-bold text-on-surface">MECHA_WORKS</h4>
                    <p class="text-xs text-on-surface-variant">精密机械模型 • 展位 B2-05</p>
                </div>
            </div>
        </div>
    `;

    // 添加结果点击事件
    searchResults.querySelectorAll('[data-id]').forEach(item => {
        item.addEventListener('click', function() {
            const id = this.getAttribute('data-id');
            closeModal();
            showToast(`已选择参展商: ${id}`, 'success');
        });
    });

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (query.length >= 2) {
            performSearch(query, searchResults);
        }
    });

    searchInput.focus();
}

/**
 * 执行搜索
 */
function performSearch(query, resultsContainer) {
    // 模拟搜索结果
    resultsContainer.innerHTML = `
        <div class="p-4 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl mb-2 block">search</span>
            <p>搜索 "${query}" 的结果...</p>
        </div>
    `;

    setTimeout(() => {
        resultsContainer.innerHTML = `
            <div class="p-4 bg-surface-container-low/60 hover:bg-surface-container-high cursor-pointer transition-colors">
                <p class="text-on-surface-variant text-sm">找到 2 个相关结果</p>
            </div>
        `;
    }, 500);
}

/**
 * 显示票务弹窗
 */
function showTicketModal() {
    const content = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="ticket-option p-4 border border-outline-variant cursor-pointer hover:border-primary transition-colors" data-ticket="standard">
                    <h4 class="font-bold text-on-surface mb-2">普通票</h4>
                    <p class="text-2xl font-bold text-primary mb-2">¥128</p>
                    <p class="text-xs text-on-surface-variant">单日入场，全馆通票</p>
                </div>
                <div class="ticket-option p-4 border border-primary cursor-pointer bg-primary/5 relative" data-ticket="professional">
                    <span class="absolute -top-2 -right-2 bg-primary text-on-primary text-[10px] px-2 py-0.5">推荐</span>
                    <h4 class="font-bold text-on-surface mb-2">专业观众票</h4>
                    <p class="text-2xl font-bold text-primary mb-2">¥368</p>
                    <p class="text-xs text-on-surface-variant">三日通票，含论坛席位</p>
                </div>
                <div class="ticket-option p-4 border border-outline-variant cursor-pointer hover:border-tertiary transition-colors" data-ticket="vip">
                    <h4 class="font-bold text-on-surface mb-2">VIP通行证</h4>
                    <p class="text-2xl font-bold text-tertiary mb-2">¥888</p>
                    <p class="text-xs text-on-surface-variant">全程VIP专属服务</p>
                </div>
            </div>
            <form class="space-y-4">
                <div>
                    <label class="text-[10px] text-primary-container tracking-widest font-label block mb-2">购票人姓名</label>
                    <input type="text" class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary-container" placeholder="请输入姓名">
                </div>
                <div>
                    <label class="text-[10px] text-primary-container tracking-widest font-label block mb-2">联系电话</label>
                    <input type="tel" class="w-full px-4 py-3 bg-surface-container-low border border-outline-variant text-on-surface focus:outline-none focus:border-primary-container" placeholder="请输入手机号">
                </div>
                <button type="button" class="w-full py-4 bg-primary-container text-on-primary-container font-bold tracking-widest hover:brightness-110 transition-all">
                    立即购票
                </button>
            </form>
        </div>
    `;

    showModal('票务预订', content);

    // 初始化票种选择
    const ticketOptions = document.querySelectorAll('.ticket-option');
    ticketOptions.forEach(option => {
        option.addEventListener('click', function() {
            ticketOptions.forEach(o => {
                o.classList.remove('border-primary', 'bg-primary/5', 'border-tertiary', 'bg-tertiary/5');
                o.classList.add('border-outline-variant');
            });

            const type = this.getAttribute('data-ticket');
            if (type === 'professional') {
                this.classList.add('border-primary', 'bg-primary/5');
            } else if (type === 'vip') {
                this.classList.add('border-tertiary', 'bg-tertiary/5');
            }
        });
    });
}

/**
 * 显示联系方式弹窗
 */
function showContactModal() {
    const content = `
        <div class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="p-6 bg-surface-container-low/60 border border-outline-variant">
                    <span class="material-symbols-outlined text-primary text-3xl mb-3">mail</span>
                    <h4 class="font-bold text-on-surface mb-2">电子邮箱</h4>
                    <p class="text-sm text-on-surface-variant">office@ne_adci.com</p>
                </div>
                <div class="p-6 bg-surface-container-low/60 border border-outline-variant">
                    <span class="material-symbols-outlined text-primary text-3xl mb-3">phone</span>
                    <h4 class="font-bold text-on-surface mb-2">客服热线</h4>
                    <p class="text-sm text-on-surface-variant">400-888-0808</p>
                </div>
                <div class="p-6 bg-surface-container-low/60 border border-outline-variant">
                    <span class="material-symbols-outlined text-primary text-3xl mb-3">location_on</span>
                    <h4 class="font-bold text-on-surface mb-2">展馆地址</h4>
                    <p class="text-sm text-on-surface-variant">辽宁省沈阳市和平区文化路88号</p>
                </div>
                <div class="p-6 bg-surface-container-low/60 border border-outline-variant">
                    <span class="material-symbols-outlined text-primary text-3xl mb-3">schedule</span>
                    <h4 class="font-bold text-on-surface mb-2">开放时间</h4>
                    <p class="text-sm text-on-surface-variant">每日 09:00 - 18:00</p>
                </div>
            </div>
            <div class="p-6 bg-primary/5 border border-primary/20">
                <h4 class="font-bold text-on-surface mb-3">商务合作咨询</h4>
                <p class="text-sm text-on-surface-variant mb-4">如果您有意向参展或寻求商务合作，请通过以下方式联系我们：</p>
                <div class="flex items-center gap-4">
                    <span class="material-symbols-outlined text-primary">business_center</span>
                    <div>
                        <p class="text-xs text-on-surface-variant">商务合作专线</p>
                        <p class="text-sm font-bold text-primary">business@ne_adci.com</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    showModal('联系我们', content);
}

/**
 * 显示通用弹窗
 */
function showModal(title, content) {
    // 移除已存在的弹窗
    closeModal();

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4';
    overlay.id = 'customModal';
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    // 创建弹窗内容
    const modal = document.createElement('div');
    modal.className = 'bg-surface-container-high border border-outline-variant max-w-2xl w-full max-h-[90vh] overflow-y-auto';
    modal.innerHTML = `
        <div class="flex items-center justify-between p-6 border-b border-outline-variant/30">
            <h3 class="text-xl font-bold font-headline text-on-surface">${title}</h3>
            <button class="modal-close p-2 hover:bg-surface-container-low rounded transition-colors">
                <span class="material-symbols-outlined text-on-surface-variant">close</span>
            </button>
        </div>
        <div class="p-6">
            ${content}
        </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 添加关闭按钮事件
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // ESC 键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);

    // 保存引用用于清理
    overlay._escHandler = handleEsc;
}

/**
 * 关闭弹窗
 */
function closeModal() {
    const modal = document.getElementById('customModal');
    if (modal) {
        if (modal._escHandler) {
            document.removeEventListener('keydown', modal._escHandler);
        }
        modal.remove();
    }
}

/**
 * 初始化登出功能
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('ne_adcimae_user');
            localStorage.removeItem('ne_adcimae_login_time');
            localStorage.removeItem('selected_user_type');

            showToast('已安全退出系统', 'success');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    });
}

/**
 * 更新用户信息
 */
function updateUserInfo() {
    const userData = localStorage.getItem('ne_adcimae_user');
    if (userData) {
        const user = JSON.parse(userData);
        const userIcon = document.getElementById('userIcon');
        if (userIcon) {
            userIcon.setAttribute('title', `用户: ${user.username}`);
        }
    }
}

/**
 * 显示提示信息
 */
function showToast(message, type = 'info') {
    // 移除已存在的提示
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    const colors = {
        success: 'border-tertiary-container text-on-surface',
        error: 'border-error text-on-surface',
        info: 'border-primary-container text-on-surface'
    };

    toast.className = `fixed bottom-8 right-8 z-50 px-6 py-4 bg-surface-container-high border ${colors[type] || colors.info} shadow-2xl flex items-center gap-3 animate-fade-in`;
    toast.innerHTML = `
        <span class="material-symbols-outlined">${type === 'success' ? 'check_circle' : type === 'error' ? 'error' : 'info'}</span>
        <span class="text-sm font-label">${message}</span>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
        animation: fadeIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);
