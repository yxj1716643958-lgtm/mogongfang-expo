/**
 * NE_ADCI_MAE - 核心应用脚本
 * 全局功能和数据管理
 */

// 应用配置
const APP_CONFIG = {
    API_BASE_URL: '/api',
    ITEMS_PER_PAGE: 12,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30分钟
    DEV_SERVER_PORT: 8080
};

// 用户数据管理
const UserManager = {
    USER_DATA_KEY: 'ne_adcimae_user',

    getUser() {
        const userData = localStorage.getItem(this.USER_DATA_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    setUser(userData) {
        localStorage.setItem(this.USER_DATA_KEY, JSON.stringify(userData));
    },

    removeUser() {
        localStorage.removeItem(this.USER_DATA_KEY);
    },

    isLoggedIn() {
        return !!this.getUser();
    },

    getUsername() {
        const user = this.getUser();
        return user ? user.username : 'Guest';
    },

    getUserType() {
        const user = this.getUser();
        return user ? user.userType : 'guest';
    }
};

// 路由管理
const Router = {
    routes: {
        '/': 'index.html',
        '/login': 'index.html',
        '/dashboard': 'dashboard.html',
        '/detail': 'detail.html',
        '/exhibits': 'exhibits.html',
        '/schedule': 'schedule.html',
        '/archive': 'archive.html',
        '/vr': 'vr.html',
        '/collection': 'collection.html',
        '/workshop': 'workshop.html'
    },

    navigate(path) {
        window.location.href = path;
    },

    getCurrentRoute() {
        const path = window.location.pathname;
        return Object.keys(this.routes).find(key => path.includes(key)) || '/';
    }
};

// API 服务
const API = {
    async fetchExhibits() {
        // 模拟 API 调用
        return ExhibitData.getAll();
    },

    async fetchExhibitById(id) {
        return ExhibitData.getById(id);
    },

    async fetchSchedule() {
        return ScheduleData.getAll();
    },

    async fetchNews() {
        return NewsData.getAll();
    }
};

// 日期格式化
const DateUtils = {
    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}.${month}.${day}`;
    },

    formatTime(date) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    },

    formatDateTime(date) {
        return `${this.formatDate(date)} ${this.formatTime(date)}`;
    },

    getCurrentDate() {
        return this.formatDate(new Date());
    },

    getCurrentTime() {
        return this.formatTime(new Date());
    },

    getCurrentDateTime() {
        return this.formatDateTime(new Date());
    },

    getRelativeTime(date) {
        const now = new Date();
        const then = new Date(date);
        const diff = now - then;

        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}天前`;
        if (hours > 0) return `${hours}小时前`;
        if (minutes > 0) return `${minutes}分钟前`;
        return '刚刚';
    }
};

// Toast 通知
const Toast = {
    show(message, type = 'info', duration = 3000) {
        // 移除已存在的通知
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建新通知
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${this.getIcon(type)}</span>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // 显示动画
        setTimeout(() => toast.classList.add('show'), 10);

        // 自动移除
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    getIcon(type) {
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info',
            warning: 'warning'
        };
        return icons[type] || icons.info;
    },

    success(message, duration) {
        this.show(message, 'success', duration);
    },

    error(message, duration) {
        this.show(message, 'error', duration);
    },

    info(message, duration) {
        this.show(message, 'info', duration);
    },

    warning(message, duration) {
        this.show(message, 'warning', duration);
    }
};

// 模态框管理
const Modal = {
    show(content, options = {}) {
        // 移除已存在的模态框
        this.close();

        // 创建遮罩层
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay && options.closeOnOverlay !== false) {
                this.close();
            }
        });

        // 创建内容容器
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 flex items-center justify-center z-[101] p-4';
        modal.innerHTML = `
            <div class="modal-content ${options.size || ''}">
                ${options.title ? `
                    <div class="flex items-center justify-between p-6 border-b border-outline-variant/20">
                        <h3 class="text-xl font-bold font-headline">${options.title}</h3>
                        <button class="modal-close p-2 hover:bg-surface-container-high rounded">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                ` : ''}
                <div class="p-6">
                    ${content}
                </div>
                ${options.footer ? `
                    <div class="p-6 border-t border-outline-variant/20 flex justify-end gap-4">
                        ${options.footer}
                    </div>
                ` : ''}
            </div>
        `;

        // 添加关闭按钮事件
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', this.close);
        }

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        // 保存 ESC 键关闭
        this.escHandler = (e) => {
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.escHandler);
    },

    close() {
        const overlay = document.querySelector('.modal-overlay');
        const modal = document.querySelector('.fixed.inset-0.flex.items-center.justify-center.z-\\[101\\]');

        if (overlay) overlay.remove();
        if (modal) modal.remove();

        if (this.escHandler) {
            document.removeEventListener('keydown', this.escHandler);
            this.escHandler = null;
        }
    },

    confirm(message, onConfirm, onCancel) {
        const content = `
            <p class="text-on-surface-variant mb-6">${message}</p>
            <div class="flex justify-end gap-4">
                <button class="modal-cancel px-6 py-2 border border-outline-variant text-on-surface hover:bg-surface-container-high transition-colors">
                    取消
                </button>
                <button class="modal-confirm px-6 py-2 bg-primary-container text-on-primary-container hover:brightness-110 transition-colors">
                    确认
                </button>
            </div>
        `;

        this.show(content, {
            title: '确认操作',
            footer: ''
        });

        const confirmBtn = document.querySelector('.modal-confirm');
        const cancelBtn = document.querySelector('.modal-cancel');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.close();
                if (onConfirm) onConfirm();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.close();
                if (onCancel) onCancel();
            });
        }
    },

    alert(message, onOk) {
        const content = `
            <p class="text-on-surface-variant mb-6">${message}</p>
        `;

        this.show(content, {
            title: '提示',
            footer: `
                <button class="modal-ok px-6 py-2 bg-primary-container text-on-primary-container hover:brightness-110 transition-colors">
                    确定
                </button>
            `
        });

        const okBtn = document.querySelector('.modal-ok');
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                this.close();
                if (onOk) onOk();
            });
        }
    }
};

// 图片懒加载
const LazyLoad = {
    init() {
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadImage(entry.target);
                        this.observer.unobserve(entry.target);
                    }
                });
            }, {
                rootMargin: '50px 0px'
            });

            document.querySelectorAll('img[data-src]').forEach(img => {
                this.observer.observe(img);
            });
        } else {
            // 降级处理
            document.querySelectorAll('img[data-src]').forEach(img => {
                this.loadImage(img);
            });
        }
    },

    loadImage(img) {
        const src = img.getAttribute('data-src');
        if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            img.classList.add('loaded');
        }
    },

    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
};

// 搜索功能
const Search = {
    init(inputSelector, resultsSelector, searchFn) {
        const input = document.querySelector(inputSelector);
        const results = document.querySelector(resultsSelector);
        let debounceTimer;

        if (!input || !results) return;

        input.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const query = e.target.value.trim();

            debounceTimer = setTimeout(() => {
                if (query.length >= 2) {
                    this.performSearch(query, searchFn, results);
                } else {
                    results.innerHTML = '';
                    results.classList.remove('active');
                }
            }, 300);
        });

        // 点击外部关闭搜索结果
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.classList.remove('active');
            }
        });
    },

    async performSearch(query, searchFn, resultsContainer) {
        resultsContainer.innerHTML = '<div class="p-4 text-center text-on-surface-variant">搜索中...</div>';
        resultsContainer.classList.add('active');

        try {
            const results = await searchFn(query);
            this.displayResults(results, resultsContainer);
        } catch (error) {
            resultsContainer.innerHTML = '<div class="p-4 text-center text-error">搜索失败，请稍后重试</div>';
        }
    },

    displayResults(results, container) {
        if (results.length === 0) {
            container.innerHTML = '<div class="p-4 text-center text-on-surface-variant">未找到相关结果</div>';
            return;
        }

        const html = results.map(item => `
            <div class="search-result-item" data-id="${item.id}">
                <div class="flex items-center gap-4">
                    ${item.image ? `<img src="${item.image}" alt="${item.title}" class="w-12 h-12 object-cover rounded">` : ''}
                    <div>
                        <h4 class="font-bold text-on-surface">${item.title}</h4>
                        <p class="text-sm text-on-surface-variant">${item.description || ''}</p>
                    </div>
                </div>
            </div>
        `).join('');

        container.innerHTML = html;

        // 添加点击事件
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const id = item.getAttribute('data-id');
                Router.navigate(`/detail?id=${id}`);
            });
        });
    }
};

// 性能监控
const Performance = {
    marks: {},

    start(name) {
        this.marks[name] = performance.now();
    },

    end(name) {
        if (this.marks[name]) {
            const duration = performance.now() - this.marks[name];
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
            delete this.marks[name];
            return duration;
        }
    },

    measureAsync(name, fn) {
        return async (...args) => {
            this.start(name);
            try {
                const result = await fn(...args);
                this.end(name);
                return result;
            } catch (error) {
                this.end(name);
                throw error;
            }
        };
    }
};

// 会话管理
const Session = {
    init() {
        // 检查会话是否过期
        const loginTime = localStorage.getItem('ne_adcimae_login_time');
        if (loginTime) {
            const elapsed = Date.now() - parseInt(loginTime);
            if (elapsed > APP_CONFIG.SESSION_TIMEOUT) {
                this.expire();
            }
        }

        // 监听页面可见性变化
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkSession();
            }
        });
    },

    checkSession() {
        const loginTime = localStorage.getItem('ne_adcimae_login_time');
        if (loginTime) {
            const elapsed = Date.now() - parseInt(loginTime);
            if (elapsed > APP_CONFIG.SESSION_TIMEOUT) {
                this.expire();
            }
        }
    },

    expire() {
        UserManager.removeUser();
        localStorage.removeItem('ne_adcimae_login_time');
        Toast.warning('会话已过期，请重新登录');
        Router.navigate('/login');
    },

    refresh() {
        localStorage.setItem('ne_adcimae_login_time', Date.now().toString());
    }
};

// 初始化应用
function initApp() {
    // 检查登录状态
    if (!UserManager.isLoggedIn() && !window.location.pathname.includes('index.html')) {
        Router.navigate('/login');
        return;
    }

    // 更新登录时间
    if (UserManager.isLoggedIn()) {
        localStorage.setItem('ne_adcimae_login_time', Date.now().toString());
    }

    // 初始化会话管理
    Session.init();

    // 初始化图片懒加载
    LazyLoad.init();

    console.log('%cNE_ADCI_MAE System Initialized', 'color: #00e5ff; font-size: 14px; font-weight: bold;');
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}

// 导出到全局
window.App = {
    Config: APP_CONFIG,
    UserManager,
    Router,
    API,
    DateUtils,
    Toast,
    Modal,
    LazyLoad,
    Search,
    Performance,
    Session
};
