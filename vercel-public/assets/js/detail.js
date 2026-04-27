/**
 * NE_ADCI_MAE - 详情页脚本
 */

// 展品数据
const ExhibitData = {
    exhibits: {},

    init() {
        this.exhibits = {
            'model-x-72': {
                id: 'model-x-72',
                title: '星际拓荒者',
                subtitle: 'MK-IV 原型展机',
                category: '航天动力模型',
                description: '东北亚数字文化创新博览会年度旗舰展品。由 NE_TECH_LABS 开发，结合了 3D 打印钛合金框架与动态全息投影系统，代表了当代模型艺术的巅峰工艺。',
                image: 'https://images.unsplash.com/photo-1535378437323-9555f3e7f5aa?w=1920&q=80',
                tags: [
                    { label: 'ID: MODEL_X_72', type: 'primary' },
                    { label: '航天动力模型', type: 'secondary' }
                ],
                specs: [
                    { label: '模型比例 / SCALE', value: '1:12 HIGHER_DETAIL', color: 'primary' },
                    { label: '零件总数 / COMPONENT_COUNT', value: '4,285 UNITS', color: 'secondary-container' },
                    { label: '制造工艺 / PROTOCOL', value: 'SLA_TITANIUM_FUSION', color: 'tertiary-container' },
                    { label: '交互系统 / INTERFACE', value: 'NEURAL_SYNC_AR', color: 'primary-fixed-dim' }
                ],
                schedule: [
                    {
                        time: '09:00',
                        title: '动力系统演示 (SESSION_A)',
                        location: '主展厅中央区域 - 3号展位',
                        status: 'available'
                    },
                    {
                        time: '14:30',
                        title: '设计总监访谈: 数字建模未来',
                        location: '博览会 A1 剧场',
                        status: 'limited'
                    },
                    {
                        time: '18:00',
                        title: '沉浸式光影秀: 虚拟现实融合',
                        location: '全域展馆同步',
                        status: 'closed'
                    }
                ],
                gallery: [
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
                    'https://images.unsplash.com/photo-1535378437323-9555f3e7f5aa?w=600&q=80',
                    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80',
                    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&q=80',
                    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
                    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80'
                ],
                venue: {
                    location: '主展厅 • 3号展位',
                    period: '2024.03.15 - 2024.06.30'
                },
                creator: {
                    name: 'NE_TECH_LABS',
                    type: '模型研发实验室',
                    description: 'NE_TECH_LABS 是东北地区领先的模型技术研发机构，专注于高精度工业模型与数字化展示技术的创新。'
                },
                related: [
                    { id: 'mech-01', title: '泰坦机甲原型', category: '机械工程' },
                    { id: 'city-02', title: '未来城市综合体', category: '建筑模型' },
                    { id: 'vehicle-03', title: '磁悬浮列车', category: '交通运输' }
                ]
            },
            'mech-01': {
                id: 'mech-01',
                title: '泰坦机甲',
                subtitle: '原型机 v2.0',
                category: '机械工程',
                description: '工业级精密机甲模型，采用模块化设计理念，完美还原了未来工业机器人的复杂机械结构。每一个关节都经过精密计算，可完成真实动作模拟。',
                image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
                tags: [
                    { label: 'ID: MECH_01', type: 'primary' },
                    { label: '机械工程', type: 'secondary' }
                ],
                specs: [
                    { label: '模型比例 / SCALE', value: '1:8 INDUSTRIAL', color: 'primary' },
                    { label: '零件总数 / COMPONENT_COUNT', value: '3,672 UNITS', color: 'secondary-container' },
                    { label: '制造工艺 / PROTOCOL', value: 'CNC_PRECISION_MILLING', color: 'tertiary-container' },
                    { label: '交互系统 / INTERFACE', value: 'SERVO_CONTROL_V2', color: 'primary-fixed-dim' }
                ],
                schedule: [
                    {
                        time: '10:00',
                        title: '机甲动作演示',
                        location: 'B区展台',
                        status: 'available'
                    },
                    {
                        time: '15:00',
                        title: '结构解析讲座',
                        location: 'B2 会议室',
                        status: 'limited'
                    }
                ],
                gallery: [
                    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80',
                    'https://images.unsplash.com/photo-1535378437323-9555f3e7f5aa?w=600&q=80',
                    'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80'
                ],
                venue: {
                    location: 'B区展台',
                    period: '2024.03.15 - 2024.06.30'
                },
                creator: {
                    name: 'MECHA_WORKS',
                    type: '精密机械工作室',
                    description: '专注于高精度工业模型与机械装置设计，作品多次获得国际模型大赛奖项。'
                },
                related: [
                    { id: 'model-x-72', title: '星际拓荒者 MK-IV', category: '航天动力' },
                    { id: 'vehicle-03', title: '磁悬浮列车', category: '交通运输' }
                ]
            }
        },

        getAll() {
            return Object.values(this.exhibits);
        },

        getById(id) {
            return this.exhibits[id] || null;
        }
    }
};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initDetailPage();
});

/**
 * 初始化详情页
 */
function initDetailPage() {
    // 获取URL参数
    const urlParams = new URLSearchParams(window.location.search);
    const exhibitId = urlParams.get('id');

    if (!exhibitId) {
        App.Toast.error('未找到展品信息');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    // 加载展品数据
    loadExhibitData(exhibitId);

    // 初始化交互功能
    initActionButtons();
    initLightbox();
}

/**
 * 加载展品数据
 */
function loadExhibitData(id) {
    const exhibit = ExhibitData.getById(id);

    if (!exhibit) {
        App.Toast.error('展品不存在');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return;
    }

    // 更新页面标题
    document.title = `${exhibit.title} - NE_ADCI_MAE`;

    // 加载 Hero 区域
    loadHeroSection(exhibit);

    // 加载技术规格
    loadSpecs(exhibit.specs);

    // 加载日程安排
    loadSchedule(exhibit.schedule);

    // 加载图库
    loadGallery(exhibit.gallery);

    // 加载场馆信息
    loadVenue(exhibit.venue);

    // 加载创作者信息
    loadCreator(exhibit.creator);

    // 加载相关展品
    loadRelated(exhibit.related);
}

/**
 * 加载 Hero 区域
 */
function loadHeroSection(exhibit) {
    const heroImage = document.getElementById('heroImage');
    const heroTitle = document.getElementById('heroTitle');
    const heroDescription = document.getElementById('heroDescription');
    const heroTags = document.getElementById('heroTags');

    if (heroImage) heroImage.src = exhibit.image;
    if (heroImage) heroImage.alt = exhibit.title;

    if (heroTitle) {
        heroTitle.innerHTML = `${exhibit.title}<br/><span class="text-primary-fixed-dim">${exhibit.subtitle}</span>`;
    }

    if (heroDescription) heroDescription.textContent = exhibit.description;

    if (heroTags) {
        heroTags.innerHTML = exhibit.tags.map(tag => {
            const typeClass = tag.type === 'primary' ? 'bg-primary-container text-on-primary-container' : 'border border-primary text-primary';
            return `<span class="px-3 py-1 ${typeClass} text-[10px] font-bold font-label tracking-widest uppercase">${tag.label}</span>`;
        }).join('');
    }
}

/**
 * 加载技术规格
 */
function loadSpecs(specs) {
    const specsGrid = document.getElementById('specsGrid');
    if (!specsGrid) return;

    specsGrid.innerHTML = specs.map(spec => `
        <div class="spec-card bg-surface-container-high/40 p-6 border-l-2 border-${spec.color}">
            <h4 class="text-zinc-500 font-label text-[10px] tracking-widest uppercase mb-2">${spec.label}</h4>
            <p class="text-xl font-bold font-headline">${spec.value}</p>
        </div>
    `).join('');
}

/**
 * 加载日程安排
 */
function loadSchedule(schedule) {
    const scheduleList = document.getElementById('scheduleList');
    if (!scheduleList) return;

    const statusMap = {
        available: { label: '预约开放', class: 'available' },
        limited: { label: '限定席位', class: 'limited' },
        closed: { label: '已截止', class: 'closed' }
    };

    scheduleList.innerHTML = schedule.map(item => {
        const status = statusMap[item.status];
        return `
            <div class="schedule-item flex items-center justify-between p-5 bg-surface-container/30 transition-colors duration-200">
                <div class="flex gap-6 items-center">
                    <span class="text-primary-fixed-dim font-headline text-2xl font-bold">${item.time}</span>
                    <div>
                        <h4 class="font-bold text-on-surface">${item.title}</h4>
                        <p class="text-xs text-zinc-500">${item.location}</p>
                    </div>
                </div>
                <span class="status-badge px-3 py-1 text-[10px] font-bold font-label border uppercase ${status.class}">${status.label}</span>
            </div>
        `;
    }).join('');
}

/**
 * 加载图库
 */
function loadGallery(images) {
    const galleryGrid = document.getElementById('galleryGrid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = images.map((img, index) => `
        <div class="gallery-item beveled-corner h-64 border border-outline-variant hover:border-primary transition-all duration-300 group" data-index="${index}">
            <img src="${img}" alt="Gallery ${index + 1}" class="w-full h-full object-cover">
            <span class="gallery-zoom material-symbols-outlined text-white text-4xl">zoom_in</span>
        </div>
    `).join('');

    // 添加点击事件
    galleryGrid.querySelectorAll('.gallery-item').forEach(item => {
        item.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            openLightbox(index, images);
        });
    });
}

/**
 * 加载场馆信息
 */
function loadVenue(venue) {
    const venueLocation = document.getElementById('venueLocation');
    const exhibitionPeriod = document.getElementById('exhibitionPeriod');
    const mapImage = document.getElementById('mapImage');

    if (venueLocation) venueLocation.textContent = venue.location;
    if (exhibitionPeriod) exhibitionPeriod.textContent = venue.period;
    if (mapImage) mapImage.src = 'https://images.unsplash.com/photo-1524661135-423995f22d0b?w=400&q=80';
}

/**
 * 加载创作者信息
 */
function loadCreator(creator) {
    const creatorName = document.getElementById('creatorName');
    const creatorType = document.getElementById('creatorType');
    const creatorDescription = document.getElementById('creatorDescription');

    if (creatorName) creatorName.textContent = creator.name;
    if (creatorType) creatorType.textContent = creator.type;
    if (creatorDescription) creatorDescription.textContent = creator.description;
}

/**
 * 加载相关展品
 */
function loadRelated(related) {
    const relatedContainer = document.getElementById('relatedExhibits');
    if (!relatedContainer) return;

    relatedContainer.innerHTML = related.map(item => `
        <a href="detail.html?id=${item.id}" class="related-exhibit-card flex items-center gap-4 p-4 border border-outline-variant/30 rounded">
            <div class="w-16 h-16 bg-surface-container-high flex items-center justify-center">
                <span class="material-symbols-outlined text-on-surface-variant">view_in_ar</span>
            </div>
            <div>
                <h4 class="font-bold text-on-surface text-sm">${item.title}</h4>
                <p class="text-xs text-on-surface-variant">${item.category}</p>
            </div>
        </a>
    `).join('');
}

/**
 * 初始化操作按钮
 */
function initActionButtons() {
    // 收藏按钮
    const favoriteBtn = document.getElementById('favoriteBtn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', function() {
            this.classList.toggle('favorited');
            const icon = this.querySelector('.material-symbols-outlined');
            const text = this.querySelector('span');

            if (this.classList.contains('favorited')) {
                icon.textContent = 'favorite';
                text.childNodes[2].textContent = '已收藏';
                App.Toast.success('已添加到收藏');
            } else {
                icon.textContent = 'favorite_border';
                text.childNodes[2].textContent = '添加到收藏';
                App.Toast.info('已取消收藏');
            }
        });
    }

    // 分享按钮
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', showShareModal);
    }

    // 预约按钮
    const bookBtn = document.getElementById('bookBtn');
    if (bookBtn) {
        bookBtn.addEventListener('click', showBookingModal);
    }
}

/**
 * 显示分享弹窗
 */
function showShareModal() {
    const shareUrl = window.location.href;
    const shareTitle = document.title;

    const content = `
        <div class="share-modal-content">
            <div class="share-options">
                <div class="share-option" data-platform="wechat">
                    <div class="share-option-icon">
                        <span class="material-symbols-outlined text-success">chat</span>
                    </div>
                    <span class="share-option-label">微信</span>
                </div>
                <div class="share-option" data-platform="weibo">
                    <div class="share-option-icon">
                        <span class="material-symbols-outlined text-danger">alternate_email</span>
                    </div>
                    <span class="share-option-label">微博</span>
                </div>
                <div class="share-option" data-platform="qq">
                    <div class="share-option-icon">
                        <span class="material-symbols-outlined text-primary">forum</span>
                    </div>
                    <span class="share-option-label">QQ</span>
                </div>
                <div class="share-option" data-platform="link">
                    <div class="share-option-icon">
                        <span class="material-symbols-outlined text-on-surface-variant">link</span>
                    </div>
                    <span class="share-option-label">复制链接</span>
                </div>
            </div>
            <div class="share-link-container">
                <input type="text" class="share-link-input" value="${shareUrl}" readonly id="shareLinkInput">
                <button class="share-copy-btn" id="shareCopyBtn">复制</button>
            </div>
        </div>
    `;

    App.Modal.show(content, {
        title: '分享展品'
    });

    // 初始化分享选项
    const shareOptions = document.querySelectorAll('.share-option');
    shareOptions.forEach(option => {
        option.addEventListener('click', function() {
            const platform = this.getAttribute('data-platform');
            handleShare(platform, shareUrl, shareTitle);
        });
    });

    // 初始化复制按钮
    const copyBtn = document.getElementById('shareCopyBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const input = document.getElementById('shareLinkInput');
            input.select();
            document.execCommand('copy');

            this.textContent = '已复制';
            this.classList.add('copied');

            setTimeout(() => {
                this.textContent = '复制';
                this.classList.remove('copied');
            }, 2000);

            App.Toast.success('链接已复制到剪贴板');
        });
    }
}

/**
 * 处理分享
 */
function handleShare(platform, url, title) {
    switch(platform) {
        case 'wechat':
            App.Toast.info('请使用微信扫描二维码分享');
            break;
        case 'weibo':
            window.open(`https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
            break;
        case 'qq':
            window.open(`https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`, '_blank');
            break;
        case 'link':
            const input = document.getElementById('shareLinkInput');
            input.select();
            document.execCommand('copy');
            App.Toast.success('链接已复制到剪贴板');
            break;
    }
}

/**
 * 显示预约弹窗
 */
function showBookingModal() {
    const timeSlots = [
        '09:00 - 10:00',
        '10:00 - 11:00',
        '11:00 - 12:00',
        '14:00 - 15:00',
        '15:00 - 16:00',
        '16:00 - 17:00'
    ];

    const content = `
        <div class="booking-modal-content">
            <form class="booking-form" id="bookingForm">
                <div class="booking-form-group">
                    <label class="booking-form-label">参观日期</label>
                    <input type="date" class="booking-form-input" required min="${new Date().toISOString().split('T')[0]}">
                </div>
                <div class="booking-form-group">
                    <label class="booking-form-label">参观时段</label>
                    <div class="booking-time-slots">
                        ${timeSlots.map((slot, index) => `
                            <div class="booking-time-slot ${index === 0 ? 'selected' : ''}" data-time="${slot}">${slot}</div>
                        `).join('')}
                    </div>
                </div>
                <div class="booking-form-group">
                    <label class="booking-form-label">参观人数</label>
                    <select class="booking-form-select" required>
                        <option value="1">1人</option>
                        <option value="2">2人</option>
                        <option value="3">3人</option>
                        <option value="4">4人</option>
                        <option value="5">5人及以上</option>
                    </select>
                </div>
                <div class="booking-form-group">
                    <label class="booking-form-label">联系电话</label>
                    <input type="tel" class="booking-form-input" placeholder="请输入手机号码" required pattern="[0-9]{11}">
                </div>
                <div class="booking-form-group">
                    <label class="booking-form-label">备注信息</label>
                    <textarea class="booking-form-input" rows="3" placeholder="如有特殊需求请备注"></textarea>
                </div>
                <button type="submit" class="booking-submit-btn">确认预约</button>
            </form>
        </div>
    `;

    App.Modal.show(content, {
        title: '预约参观',
        size: 'max-w-md'
    });

    // 初始化时段选择
    const timeSlotElements = document.querySelectorAll('.booking-time-slot');
    timeSlotElements.forEach(slot => {
        slot.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            timeSlotElements.forEach(s => s.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // 初始化表单提交
    const bookingForm = document.getElementById('bookingForm');
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            App.Modal.close();
            App.Toast.success('预约申请已提交，请等待确认');
        });
    }
}

/**
 * 初始化灯箱
 */
function initLightbox() {
    // 灯箱在需要时创建
}

/**
 * 打开灯箱
 */
function openLightbox(index, images) {
    // 创建灯箱元素
    let lightbox = document.getElementById('lightbox');
    if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = `
            <div class="lightbox-content">
                <span class="lightbox-close material-symbols-outlined text-3xl">close</span>
                <span class="lightbox-nav lightbox-prev material-symbols-outlined text-4xl">chevron_left</span>
                <img src="" alt="" class="lightbox-image">
                <span class="lightbox-nav lightbox-next material-symbols-outlined text-4xl">chevron_right</span>
            </div>
        `;
        document.body.appendChild(lightbox);
    }

    const lightboxImage = lightbox.querySelector('.lightbox-image');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');

    let currentIndex = index;

    function showImage(index) {
        lightboxImage.src = images[index];
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        showImage(currentIndex);
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        showImage(currentIndex);
    }

    // 显示当前图片
    showImage(currentIndex);

    // 激活灯箱
    lightbox.classList.add('active');

    // 绑定事件
    closeBtn.onclick = () => {
        lightbox.classList.remove('active');
    };

    nextBtn.onclick = showNext;
    prevBtn.onclick = showPrev;

    // 键盘导航
    const handleKeydown = (e) => {
        if (!lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') lightbox.classList.remove('active');
        if (e.key === 'ArrowRight') showNext();
        if (e.key === 'ArrowLeft') showPrev();
    };

    document.addEventListener('keydown', handleKeydown);

    // 点击背景关闭
    lightbox.onclick = (e) => {
        if (e.target === lightbox) {
            lightbox.classList.remove('active');
            document.removeEventListener('keydown', handleKeydown);
        }
    };
}
