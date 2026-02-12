// ============================================
// 🚀 Threads Curation App - Calendar View
// OAuth 인증 + 토큰 자동 갱신 + 달력 레이아웃
// ============================================

const THREADS_API_BASE = 'https://graph.threads.net/v1.0';

const APP_CONFIG = {
    appId: '2804281983270480',
    redirectUri: window.location.origin + window.location.pathname,
    scope: 'threads_basic,threads_content_publish,threads_manage_insights'
};

const STORAGE_KEYS = {
    accessToken: 'threads_access_token',
    tokenExpiry: 'threads_token_expiry',
    userId: 'threads_user_id'
};

// Global State
let elements = {};
let allPosts = [];
let postsByDate = {};
let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth();

document.addEventListener('DOMContentLoaded', () => {
    initElements();
    initEventListeners();
    handleOAuthCallback();
    handleInitialToken();
    checkAndLoadPosts();
});

// 초기 토큰 설정 (URL 파라미터)
function handleInitialToken() {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');

    if (tokenParam) {
        saveTokenWithExpiry(tokenParam, 5184000);
        window.history.replaceState({}, document.title, window.location.pathname);
        showNotification('토큰이 설정되었습니다!', 'success');
    }
}

function initElements() {
    elements = {
        // Profile
        profileName: document.getElementById('profileName'),
        profileBio: document.getElementById('profileBio'),
        profileImage: document.getElementById('profileImage'),
        postCount: document.getElementById('postCount'),

        // States
        loadingState: document.getElementById('loadingState'),
        emptyState: document.getElementById('emptyState'),
        errorState: document.getElementById('errorState'),
        errorMessage: document.getElementById('errorMessage'),

        // Calendar
        calendarContainer: document.getElementById('calendarContainer'),
        calendarTitle: document.getElementById('calendarTitle'),
        calendarBody: document.getElementById('calendarBody'),
        prevMonth: document.getElementById('prevMonth'),
        nextMonth: document.getElementById('nextMonth'),

        // Stats
        monthPostCount: document.getElementById('monthPostCount'),
        activeDays: document.getElementById('activeDays'),
        maxPosts: document.getElementById('maxPosts'),

        // Posts Panel
        postsPanel: document.getElementById('postsPanel'),
        panelClose: document.getElementById('panelClose'),
        panelTitle: document.getElementById('panelTitle'),
        panelCount: document.getElementById('panelCount'),
        panelBody: document.getElementById('panelBody'),

        // Buttons
        settingsBtn: document.getElementById('settingsBtn'),
        connectBtn: document.getElementById('connectBtn'),
        retryBtn: document.getElementById('retryBtn'),
        oauthBtn: document.getElementById('oauthBtn'),
        oauthBtnModal: document.getElementById('oauthBtnModal'),

        // Modal
        settingsModal: document.getElementById('settingsModal'),
        modalClose: document.getElementById('modalClose'),
        accessToken: document.getElementById('accessToken'),
        saveToken: document.getElementById('saveToken'),
        clearToken: document.getElementById('clearToken'),
        refreshTokenBtn: document.getElementById('refreshTokenBtn'),

        // Token Status
        tokenStatus: document.getElementById('tokenStatus'),
        tokenExpiry: document.getElementById('tokenExpiry')
    };
}

function initEventListeners() {
    // Settings modal
    elements.settingsBtn.addEventListener('click', openSettings);
    elements.connectBtn?.addEventListener('click', openSettings);
    elements.modalClose.addEventListener('click', closeSettings);
    elements.settingsModal.addEventListener('click', (e) => {
        if (e.target === elements.settingsModal) closeSettings();
    });

    // Token actions
    elements.saveToken.addEventListener('click', saveAndConnect);
    elements.clearToken.addEventListener('click', clearTokenAndReset);
    elements.retryBtn?.addEventListener('click', () => fetchThreadsPosts());
    elements.oauthBtn?.addEventListener('click', startOAuthFlow);
    elements.oauthBtnModal?.addEventListener('click', startOAuthFlow);
    elements.refreshTokenBtn?.addEventListener('click', refreshAccessToken);

    // Calendar navigation
    elements.prevMonth?.addEventListener('click', () => navigateMonth(-1));
    elements.nextMonth?.addEventListener('click', () => navigateMonth(1));

    // Posts panel
    elements.panelClose?.addEventListener('click', closePostsPanel);

    // Close modal/panel on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettings();
            closePostsPanel();
        }
    });
}

// ============================================
// Calendar Functions
// ============================================

function navigateMonth(direction) {
    currentMonth += direction;

    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    } else if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }

    renderCalendar();
}

function renderCalendar() {
    const year = currentYear;
    const month = currentMonth;

    // Update title
    const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
    elements.calendarTitle.textContent = `${year}년 ${monthNames[month]}`;

    // Get first day and total days
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    // Clear calendar
    elements.calendarBody.innerHTML = '';

    // Calculate stats for this month
    let monthlyPostCount = 0;
    let activeDaysCount = 0;
    let maxDailyPosts = 0;

    // Create day cells
    for (let i = 0; i < 42; i++) {
        const cell = document.createElement('div');
        cell.className = 'day-cell';

        const dayNum = i - firstDay + 1;

        if (dayNum < 1 || dayNum > totalDays) {
            cell.classList.add('empty');
        } else {
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const postsForDay = postsByDate[dateKey] || [];
            const postCount = postsForDay.length;

            // Day number
            const dayNumber = document.createElement('span');
            dayNumber.className = 'day-number';
            dayNumber.textContent = dayNum;
            cell.appendChild(dayNumber);

            // Check if weekend
            const dayOfWeek = new Date(year, month, dayNum).getDay();
            if (dayOfWeek === 0) cell.classList.add('sunday');
            if (dayOfWeek === 6) cell.classList.add('saturday');

            // Check if today
            if (year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate()) {
                cell.classList.add('today');
            }

            // Add post count badge
            if (postCount > 0) {
                cell.classList.add('has-posts');

                const badge = document.createElement('span');
                badge.className = 'post-count-badge';
                badge.textContent = postCount;
                cell.appendChild(badge);

                // Update stats
                monthlyPostCount += postCount;
                activeDaysCount++;
                if (postCount > maxDailyPosts) maxDailyPosts = postCount;

                // Click handler
                cell.addEventListener('click', () => openPostsPanel(dateKey, postsForDay));
            }
        }

        elements.calendarBody.appendChild(cell);

        // Stop if we've filled the grid appropriately
        if (dayNum >= totalDays && i >= 34) break;
    }

    // Update monthly stats
    elements.monthPostCount.textContent = monthlyPostCount;
    elements.activeDays.textContent = activeDaysCount;
    elements.maxPosts.textContent = maxDailyPosts;
}

function groupPostsByDate(posts) {
    postsByDate = {};

    posts.forEach(post => {
        if (!post.timestamp) return;

        const date = new Date(post.timestamp);
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

        if (!postsByDate[dateKey]) {
            postsByDate[dateKey] = [];
        }
        postsByDate[dateKey].push(post);
    });

    // Sort posts within each day by time (newest first)
    Object.keys(postsByDate).forEach(key => {
        postsByDate[key].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    });
}

// ============================================
// Posts Panel Functions
// ============================================

function openPostsPanel(dateKey, posts) {
    const [year, month, day] = dateKey.split('-');
    elements.panelTitle.textContent = `${parseInt(month)}월 ${parseInt(day)}일의 포스트`;
    elements.panelCount.textContent = `${posts.length}개`;

    elements.panelBody.innerHTML = '';

    posts.forEach(post => {
        const postCard = createPanelPostCard(post);
        elements.panelBody.appendChild(postCard);
    });

    elements.postsPanel.classList.add('active');
    document.body.style.overflow = 'hidden';

    // Add overlay
    let overlay = document.querySelector('.panel-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'panel-overlay';
        overlay.addEventListener('click', closePostsPanel);
        document.body.appendChild(overlay);
    }
    overlay.classList.add('active');
}

function closePostsPanel() {
    elements.postsPanel.classList.remove('active');
    document.body.style.overflow = '';

    const overlay = document.querySelector('.panel-overlay');
    if (overlay) overlay.classList.remove('active');
}

function createPanelPostCard(post) {
    const card = document.createElement('div');
    card.className = 'panel-post';

    const time = new Date(post.timestamp);
    const timeStr = `${time.getHours()}:${String(time.getMinutes()).padStart(2, '0')}`;
    const typeLabel = getMediaTypeLabel(post.media_type);

    let imageHtml = '';
    if (post.media_type === 'IMAGE' && post.media_url) {
        imageHtml = `<img src="${post.media_url}" alt="" class="panel-post-image" loading="lazy">`;
    } else if (post.media_type === 'VIDEO' && post.thumbnail_url) {
        imageHtml = `<img src="${post.thumbnail_url}" alt="" class="panel-post-image" loading="lazy">`;
    }

    card.innerHTML = `
        <div class="panel-post-header">
            <span class="panel-post-type">${typeLabel}</span>
            <span class="panel-post-time">${timeStr}</span>
        </div>
        ${imageHtml}
        <p class="panel-post-content">${escapeHtml(post.text || '(텍스트 없음)')}</p>
        <a href="${post.permalink}" target="_blank" rel="noopener noreferrer" class="panel-post-link">
            Threads에서 보기
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
        </a>
    `;

    return card;
}

function getMediaTypeLabel(mediaType) {
    const labels = {
        'TEXT_POST': '💬 텍스트',
        'IMAGE': '🖼️ 이미지',
        'VIDEO': '🎬 비디오',
        'CAROUSEL_ALBUM': '📸 슬라이드',
        'AUDIO': '🎵 오디오'
    };
    return labels[mediaType] || '📝 포스트';
}

// ============================================
// OAuth Authentication Flow
// ============================================

function startOAuthFlow() {
    const authUrl = `https://threads.net/oauth/authorize?` +
        `client_id=${APP_CONFIG.appId}` +
        `&redirect_uri=${encodeURIComponent(APP_CONFIG.redirectUri)}` +
        `&scope=${APP_CONFIG.scope}` +
        `&response_type=code`;

    window.location.href = authUrl;
}

function handleOAuthCallback() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
        console.error('OAuth Error:', urlParams.get('error_description'));
        showNotification('인증이 취소되었습니다.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
    }

    if (code) {
        showNotification('인증 코드를 받았습니다. 토큰을 직접 입력해주세요.', 'info');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ============================================
// Token Management
// ============================================

function saveTokenWithExpiry(token, expiresIn = 5184000) {
    const expiryDate = new Date(Date.now() + expiresIn * 1000);
    localStorage.setItem(STORAGE_KEYS.accessToken, token);
    localStorage.setItem(STORAGE_KEYS.tokenExpiry, expiryDate.toISOString());
    updateTokenStatus();
}

function getTokenInfo() {
    const token = localStorage.getItem(STORAGE_KEYS.accessToken);
    const expiry = localStorage.getItem(STORAGE_KEYS.tokenExpiry);

    if (!token) return null;

    const expiryDate = expiry ? new Date(expiry) : null;
    const now = new Date();
    const daysRemaining = expiryDate ? Math.floor((expiryDate - now) / (1000 * 60 * 60 * 24)) : null;

    return {
        token,
        expiryDate,
        daysRemaining,
        isExpired: expiryDate ? now > expiryDate : false,
        needsRefresh: daysRemaining !== null && daysRemaining <= 7
    };
}

function updateTokenStatus() {
    const tokenInfo = getTokenInfo();

    if (!elements.tokenStatus) return;

    if (!tokenInfo) {
        elements.tokenStatus.innerHTML = '<span class="status-disconnected">🔴 연결되지 않음</span>';
        if (elements.tokenExpiry) elements.tokenExpiry.textContent = '';
        return;
    }

    if (tokenInfo.isExpired) {
        elements.tokenStatus.innerHTML = '<span class="status-expired">🔴 토큰 만료됨</span>';
        if (elements.tokenExpiry) elements.tokenExpiry.textContent = '새 토큰이 필요합니다';
    } else if (tokenInfo.needsRefresh) {
        elements.tokenStatus.innerHTML = '<span class="status-warning">🟡 갱신 필요</span>';
        if (elements.tokenExpiry) {
            elements.tokenExpiry.textContent = `${tokenInfo.daysRemaining}일 후 만료`;
        }
    } else {
        elements.tokenStatus.innerHTML = '<span class="status-connected">🟢 연결됨</span>';
        if (elements.tokenExpiry && tokenInfo.daysRemaining) {
            elements.tokenExpiry.textContent = `${tokenInfo.daysRemaining}일 후 만료`;
        }
    }
}

async function refreshAccessToken() {
    const tokenInfo = getTokenInfo();
    if (!tokenInfo || !tokenInfo.token) {
        showNotification('갱신할 토큰이 없습니다.', 'error');
        return;
    }

    try {
        showNotification('토큰 갱신 중...', 'info');

        const response = await fetch(
            `https://graph.threads.net/refresh_access_token?` +
            `grant_type=th_refresh_token&` +
            `access_token=${tokenInfo.token}`
        );

        if (!response.ok) {
            throw new Error('토큰 갱신에 실패했습니다.');
        }

        const data = await response.json();

        if (data.access_token) {
            saveTokenWithExpiry(data.access_token, data.expires_in);
            showNotification('토큰이 성공적으로 갱신되었습니다!', 'success');
            fetchThreadsPosts();
        }
    } catch (error) {
        console.error('Token refresh error:', error);
        showNotification(error.message, 'error');
    }
}

// ============================================
// Notification System
// ============================================

function showNotification(message, type = 'info') {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button class="notification-close">&times;</button>
    `;

    document.body.appendChild(notification);

    notification.querySelector('.notification-close').addEventListener('click', () => {
        notification.remove();
    });

    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('notification-fade');
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// ============================================
// State Management
// ============================================

function showState(state) {
    elements.loadingState.style.display = 'none';
    elements.emptyState.style.display = 'none';
    elements.errorState.style.display = 'none';
    elements.calendarContainer.style.display = 'none';

    switch (state) {
        case 'loading':
            elements.loadingState.style.display = 'flex';
            break;
        case 'empty':
            elements.emptyState.style.display = 'flex';
            break;
        case 'error':
            elements.errorState.style.display = 'flex';
            break;
        case 'calendar':
            elements.calendarContainer.style.display = 'block';
            break;
    }
}

// ============================================
// Modal Functions
// ============================================

function openSettings() {
    const tokenInfo = getTokenInfo();
    if (tokenInfo && tokenInfo.token) {
        elements.accessToken.value = tokenInfo.token;
    }
    updateTokenStatus();
    elements.settingsModal.classList.add('active');
}

function closeSettings() {
    elements.settingsModal.classList.remove('active');
}

function saveAndConnect() {
    const token = elements.accessToken.value.trim();
    if (!token) {
        alert('Access Token을 입력해주세요.');
        return;
    }

    saveTokenWithExpiry(token, 5184000);
    closeSettings();
    fetchThreadsPosts();
}

function clearTokenAndReset() {
    localStorage.removeItem(STORAGE_KEYS.accessToken);
    localStorage.removeItem(STORAGE_KEYS.tokenExpiry);
    localStorage.removeItem(STORAGE_KEYS.userId);
    elements.accessToken.value = '';
    closeSettings();
    showState('empty');
    elements.postCount.textContent = '0';
    allPosts = [];
    postsByDate = {};
    updateTokenStatus();
    showNotification('토큰이 삭제되었습니다.', 'info');
}

// ============================================
// API Functions
// ============================================

async function checkAndLoadPosts() {
    const tokenInfo = getTokenInfo();

    if (!tokenInfo) {
        showState('empty');
        return;
    }

    if (tokenInfo.isExpired) {
        elements.errorMessage.textContent = '토큰이 만료되었습니다. 설정에서 새 토큰을 입력해주세요.';
        showState('error');
        return;
    }

    await fetchThreadsPosts();
}

async function fetchThreadsPosts() {
    const tokenInfo = getTokenInfo();
    if (!tokenInfo || !tokenInfo.token) {
        showState('empty');
        return;
    }

    if (tokenInfo.isExpired) {
        elements.errorMessage.textContent = '토큰이 만료되었습니다.';
        showState('error');
        return;
    }

    showState('loading');

    try {
        // Get user profile
        const profileResponse = await fetch(
            `${THREADS_API_BASE}/me?fields=id,username,threads_profile_picture_url,threads_biography&access_token=${tokenInfo.token}`
        );

        if (!profileResponse.ok) {
            throw new Error('프로필을 불러올 수 없습니다. Access Token을 확인해주세요.');
        }

        const profile = await profileResponse.json();
        updateProfile(profile);

        // Get all posts (with pagination for more data)
        allPosts = await fetchAllPosts(tokenInfo.token);

        if (allPosts.length > 0) {
            elements.postCount.textContent = allPosts.length;
            groupPostsByDate(allPosts);

            // Set to current month or most recent post's month
            const latestPost = allPosts[0];
            if (latestPost && latestPost.timestamp) {
                const latestDate = new Date(latestPost.timestamp);
                currentYear = latestDate.getFullYear();
                currentMonth = latestDate.getMonth();
            }

            renderCalendar();
            showState('calendar');
        } else {
            showState('empty');
            elements.emptyState.querySelector('h2').textContent = '포스트가 없습니다';
            elements.emptyState.querySelector('p').textContent = 'Threads에 포스트를 작성해보세요!';
        }

    } catch (error) {
        console.error('Threads API Error:', error);
        elements.errorMessage.textContent = error.message;
        showState('error');
    }
}

async function fetchAllPosts(token) {
    let posts = [];
    let nextUrl = `${THREADS_API_BASE}/me/threads?fields=id,media_type,media_url,permalink,username,text,timestamp,thumbnail_url,is_quote_post&limit=100&access_token=${token}`;

    // Fetch up to 20 pages (2000 posts max) to get all posts including older ones
    for (let i = 0; i < 20 && nextUrl; i++) {
        try {
            const response = await fetch(nextUrl);
            if (!response.ok) break;

            const data = await response.json();

            if (data.data && data.data.length > 0) {
                // Filter out reposts
                const validPosts = data.data.filter(p => p.media_type !== 'REPOST_FACADE');
                posts = posts.concat(validPosts);
            }

            // Check for next page
            nextUrl = data.paging?.next || null;

            // If no more pages, break
            if (!data.data || data.data.length === 0) break;
        } catch (error) {
            console.error('Pagination error:', error);
            break;
        }
    }

    // Sort by timestamp (newest first)
    posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Total posts loaded: ${posts.length}`);

    return posts;
}

function updateProfile(profile) {
    if (profile.username) {
        elements.profileName.textContent = `@${profile.username}`;
    }
    if (profile.threads_biography) {
        elements.profileBio.textContent = profile.threads_biography;
    }
    if (profile.threads_profile_picture_url) {
        elements.profileImage.src = profile.threads_profile_picture_url;
    }
}

// ============================================
// Utility Functions
// ============================================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
