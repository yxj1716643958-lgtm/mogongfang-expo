/**
 * NE_ADCI_MAE - 控制中心页面脚本
 */

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initDashboard();
});

/**
 * 初始化控制中心
 */
function initDashboard() {
    // 更新用户信息
    updateUserInfo();

    // 更新当前日期
    updateCurrentDate();

    // 初始化导航
    initNavigation();

    // 初始化统计卡片动画
    initStatCards();

    // 加载热门展品
    loadFeaturedModels();

    // 初始化轮播控制
    initCarousel();

    // 初始化通知功能
    initNotifications();

    // 初始化搜索功能
    initSearch();

    // 初始化登出功能
    initLogout();
}

/**
 * 更新用户信息显示
 */
function updateUserInfo() {
    const user = App.UserManager.getUser();
    const userDisplayName = document.getElementById('userDisplayName');

    if (user && userDisplayName) {
        // 显示用户名，如果太长则截断
        let displayName = user.username;
        if (displayName.length > 10) {
            displayName = displayName.substring(0, 10) + '...';
        }
        userDisplayName.textContent = displayName;
    }
}

/**
 * 更新当前日期显示
 */
function updateCurrentDate() {
    const currentDateEl = document.getElementById('currentDate');
    if (currentDateEl) {
        currentDateEl.textContent = App.DateUtils.getCurrentDate();
    }
}

/**
 * 初始化导航
 */
function initNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');

            // 更新活动状态
            navLinks.forEach(l => {
                l.classList.remove('text-cyan-400', 'border-b-2', 'border-cyan-400', 'pb-1');
                l.classList.add('text-zinc-400');
            });
            this.classList.remove('text-zinc-400');
            this.classList.add('text-cyan-400', 'border-b-2', 'border-cyan-400', 'pb-1');

            // 根据选择的导航项执行操作
            handleNavigation(section);
        });
    });
}

/**
 * 处理导航点击
 */
function handleNavigation(section) {
    switch(section) {
        case 'exhibits':
            App.Toast.info('展品浏览功能开发中...');
            break;
        case 'models':
            // 当前页面
            break;
        case 'archive':
            App.Toast.info('历史档案功能开发中...');
            break;
        case 'schedule':
            App.Toast.info('活动日程功能开发中...');
            break;
        default:
            console.log('Unknown section:', section);
    }
}

/**
 * 初始化统计卡片动画
 */
function initStatCards() {
    const statCards = document.querySelectorAll('.stat-card');

    statCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';

        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 * index);
    });
}

/**
 * 加载热门展品
 */
function loadFeaturedModels() {
    const container = document.getElementById('featuredModels');
    if (!container) return;

    // 模拟数据加载
    const models = [
        {
            id: 'model-x-72',
            title: '星际拓荒者 MK-IV',
            category: '航天动力',
            image: 'https://images.unsplash.com/photo-1535378437323-9555f3e7f5aa?w=400&q=80',
            views: 12453
        },
        {
            id: 'mech-01',
            title: '泰坦机甲原型',
            category: '机械工程',
            image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
            views: 10234
        },
        {
            id: 'city-02',
            title: '未来城市综合体',
            category: '建筑模型',
            image: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=400&q=80',
            views: 8901
        },
        {
            id: 'vehicle-03',
            title: '磁悬浮列车',
            category: '交通运输',
            image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&q=80',
            views: 7654
        }
    ];

    const html = models.map(model => `
        <a href="detail.html?id=${model.id}" class="model-card group relative h-64 beveled-corner overflow-hidden border border-outline-variant hover:border-primary transition-all duration-300">
            <img src="${model.image}" alt="${model.title}" class="w-full h-full object-cover">
            <div class="model-card-content">
                <span class="px-2 py-1 bg-primary-container text-on-primary-container text-[10px] font-bold font-label tracking-widest uppercase inline-block mb-2">${model.category}</span>
                <h4 class="text-lg font-bold font-headline text-on-surface mb-1">${model.title}</h4>
                <p class="text-xs text-on-surface-variant">${model.views.toLocaleString()} 次浏览</p>
            </div>
        </a>
    `).join('');

    container.innerHTML = html;
}

/**
 * 初始化轮播控制
 */
function initCarousel() {
    const navButtons = document.querySelectorAll('.carousel-nav');

    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const direction = this.getAttribute('data-direction');
            const container = document.getElementById('featuredModels');

            if (!container) return;

            if (direction === 'prev') {
                // 向前滚动
                container.scrollBy({ left: -300, behavior: 'smooth' });
            } else {
                // 向后滚动
                container.scrollBy({ left: 300, behavior: 'smooth' });
            }
        });
    });
}

/**
 * 初始化通知功能
 */
function initNotifications() {
    const notificationBtn = document.getElementById('notificationBtn');

    if (!notificationBtn) return;

    notificationBtn.addEventListener('click', function() {
        // 模拟通知列表
        const notifications = [
            { title: '新展品上线', message: '星际拓荒者 MK-IV 现已开放参观', time: '10分钟前' },
            { title: '活动提醒', message: '动力系统演示将在30分钟后开始', time: '30分钟前' },
            { title: '系统更新', message: '系统已更新至 v2.0.1', time: '1小时前' }
        ];

        let content = '<div class="space-y-4">';

        notifications.forEach(notif => {
            content += `
                <div class="p-4 bg-surface-container-low/60 rounded hover:bg-surface-container-high transition-colors cursor-pointer">
                    <h4 class="font-bold text-on-surface text-sm mb-1">${notif.title}</h4>
                    <p class="text-xs text-on-surface-variant mb-2">${notif.message}</p>
                    <span class="text-[10px] text-on-surface-variant/60">${notif.time}</span>
                </div>
            `;
        });

        content += '</div>';

        App.Modal.show(content, {
            title: '通知中心',
            size: 'max-w-md'
        });
    });
}

/**
 * 初始化搜索功能
 */
function initSearch() {
    const searchBtn = document.getElementById('searchBtn');

    if (!searchBtn) return;

    searchBtn.addEventListener('click', function() {
        showSearchOverlay();
    });

    // 快捷键 Ctrl+K 打开搜索
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            showSearchOverlay();
        }

        // ESC 关闭搜索
        if (e.key === 'Escape') {
            closeSearchOverlay();
        }
    });
}

/**
 * 显示搜索遮罩
 */
function showSearchOverlay() {
    // 移除已存在的搜索遮罩
    closeSearchOverlay();

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay active';
    overlay.id = 'searchOverlay';
    overlay.innerHTML = `
        <div class="search-overlay-content">
            <div class="flex items-center gap-4 mb-4">
                <span class="material-symbols-outlined text-primary text-2xl">search</span>
                <input type="text" class="search-input" placeholder="搜索展品、活动、资讯..." id="searchInput" autofocus>
                <button class="text-on-surface-variant hover:text-on-surface" id="closeSearch">
                    <span class="material-symbols-outlined">close</span>
                </button>
            </div>
            <div class="search-results" id="searchResults"></div>
            <div class="mt-8 flex gap-4 text-xs text-on-surface-variant/60">
                <span>快捷键:</span>
                <kbd class="px-2 py-1 bg-surface-container-high rounded">ESC</kbd>
                <span>关闭</span>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    // 初始化搜索功能
    const searchInput = document.getElementById('searchInput');
    const closeSearchBtn = document.getElementById('closeSearch');

    if (searchInput) {
        searchInput.focus();
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    if (closeSearchBtn) {
        closeSearchBtn.addEventListener('click', closeSearchOverlay);
    }

    // 点击遮罩关闭
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeSearchOverlay();
        }
    });
}

/**
 * 关闭搜索遮罩
 */
function closeSearchOverlay() {
    const overlay = document.getElementById('searchOverlay');
    if (overlay) {
        overlay.remove();
        document.body.style.overflow = '';
    }
}

/**
 * 处理搜索
 */
async function handleSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('searchResults');

    if (!resultsContainer) return;

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = '<div class="text-center text-on-surface-60 py-8">搜索中...</div>';

    // 模拟搜索结果
    setTimeout(() => {
        const mockResults = [
            { id: 'model-x-72', type: 'exhibit', title: '星际拓荒者 MK-IV', description: '航天动力模型 • NE_TECH_LABS开发' },
            { id: 'mech-01', type: 'exhibit', title: '泰坦机甲原型', description: '机械工程模型 • 工业级精密制造' },
            { id: 'workshop-01', type: 'event', title: '模型制作工坊', description: '活动 • 今日 14:00 • A3工坊区' },
            { id: 'news-01', type: 'news', title: '新展品预告：量子计算机模型', description: '资讯 • 发布于2小时前' }
        ].filter(item => item.title.toLowerCase().includes(query.toLowerCase()));

        if (mockResults.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center text-on-surface-variant py-8">未找到相关结果</div>';
            return;
        }

        const html = mockResults.map(item => {
            const typeLabel = {
                exhibit: '展品',
                event: '活动',
                news: '资讯'
            }[item.type] || '其他';

            const typeColor = {
                exhibit: 'text-primary',
                event: 'text-tertiary-container',
                news: 'text-secondary'
            }[item.type] || 'text-on-surface-variant';

            return `
                <a href="detail.html?id=${item.id}" class="search-result-item block p-4 hover:bg-surface-container-high transition-colors">
                    <div class="flex items-start justify-between">
                        <div>
                            <span class="text-[10px] ${typeColor} font-label tracking-widest uppercase">${typeLabel}</span>
                            <h4 class="font-bold text-on-surface mt-1">${item.title}</h4>
                            <p class="text-sm text-on-surface-variant mt-1">${item.description}</p>
                        </div>
                        <span class="material-symbols-outlined text-outline">arrow_forward</span>
                    </div>
                </a>
            `;
        }).join('');

        resultsContainer.innerHTML = html;
    }, 300);
}

/**
 * 防抖函数
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * 初始化登出功能
 */
function initLogout() {
    const logoutBtn = document.getElementById('logoutBtn');

    if (!logoutBtn) return;

    logoutBtn.addEventListener('click', function() {
        App.Modal.confirm(
            '确定要退出登录吗？',
            () => {
                // 确认登出
                App.UserManager.removeUser();
                localStorage.removeItem('ne_adcimae_login_time');
                localStorage.removeItem('selected_user_type');

                App.Toast.success('已安全退出系统');

                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 1000);
            }
        );
    });
}

/**
 * 刷新统计数据（模拟实时更新）
 */
function refreshStats() {
    const stats = document.querySelectorAll('.stat-card');

    stats.forEach(card => {
        // 添加刷新动画
        card.style.transition = 'opacity 0.3s ease';
        card.style.opacity = '0.5';

        setTimeout(() => {
            card.style.opacity = '1';
        }, 300);
    });
}

// 每分钟刷新一次统计数据
setInterval(refreshStats, 60000);
