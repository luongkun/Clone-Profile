/**
 * ====================================================================
 *                 BIO PAGE - SCRIPT CONTROLLER
 * ====================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    initProfileUI();
    initClickToEnter();
    initAudioController();
    initMouseEffects();
    initParticleCanvas();
    initLanyardRealtime();
    initLocalClock();
    initGreeting();
    initSetlove();
    initDonate();
    initStats();
    initBannerVisualizer();
    // Nối chuỗi dự phòng cho mọi ảnh đang trỏ thẳng CDN Discord (khi trang vừa mở)
    applyGlobalAvatarFallbacks(LOCAL_AVATAR_FALLBACK);

    // PWA: đăng ký service worker (file riêng — CSP chỉ cho phép script cùng nguồn)
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
    }
});

/* ====================================================================
   0.3 CACHE DISCORD VISUALS — dự phòng khi Lanyard/CDN Discord chết
   ====================================================================
   Chỉ cache AVATAR + KHUNG (thứ ít đổi, thuộc về "danh tính").
   KHÔNG cache trạng thái online/nhạc — thứ đó phải luôn trung thực. */
const VISUALS_CACHE_KEY = 'discord-visuals-cache-v1';

function loadVisualCache() {
    try {
        return JSON.parse(localStorage.getItem(VISUALS_CACHE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

function saveVisualCache(userId, avatarUrl, decoUrl, avatarLocal, decoLocal) {
    if (!userId || !avatarUrl) return;
    try {
        const all = loadVisualCache();
        all[userId] = { avatar: avatarUrl, deco: decoUrl || null, avatarLocal: avatarLocal || null, decoLocal: decoLocal || null, at: Date.now() };
        localStorage.setItem(VISUALS_CACHE_KEY, JSON.stringify(all));
    } catch (e) { /* localStorage đầy / chế độ riêng tư — bỏ qua */ }
}

// Ảnh CDN Discord -> cùng file qua media.discordapp.net (proxy dự phòng)
function cdnFallbackUrls(url) {
    if (!url) return [];
    const urls = [url];
    if (url.includes('cdn.discordapp.com')) {
        urls.push(url.replace('cdn.discordapp.com', 'media.discordapp.net'));
    }
    return urls;
}

// Gắn ảnh theo CHUỖI dự phòng: CDN -> media -> file local. Ảnh hết vỡ khi bị chặn.
function setImgWithFallback(imgEl, primaryUrl, localFile) {
    if (!imgEl) return;
    const chain = [...cdnFallbackUrls(primaryUrl), localFile].filter(Boolean);
    let i = 0;
    imgEl.onerror = () => {
        i += 1;
        if (i < chain.length) {
            imgEl.src = chain[i];
        } else {
            imgEl.onerror = null; // hết chuỗi, dừng để không lặp vô hạn
        }
    };
    imgEl.src = chain[0];
}

// Ảnh <img> trỏ thẳng CDN Discord (avatar trong config, avatar màn chào...)
// đều được nối chuỗi dự phòng ngay khi mở trang.
function applyGlobalAvatarFallbacks(localAvatarFile) {
    document.querySelectorAll('img[src*="cdn.discordapp.com"]').forEach(img => {
        if (img.dataset.fallbackBound) return; // tránh gắn 2 lần
        img.dataset.fallbackBound = '1';
        setImgWithFallback(img, img.src, localAvatarFile);
    });
}

// Avatar dự phòng của bản thân (khai báo trong config.js -> profile.avatarLocal)
const LOCAL_AVATAR_FALLBACK = (typeof CONFIG !== 'undefined' && CONFIG.profile && CONFIG.profile.avatarLocal) || null;

/* ====================================================================
   0.5 SETLOVE SLIDE PANEL (tên + trái tim + đếm ngày yêu)
   ==================================================================== */
function initSetlove() {
    const panel = document.getElementById('setlove-panel');
    const arrow = document.getElementById('love-arrow');
    if (!panel || !arrow) return;

    // Tắt toàn bộ phần Setlove từ config (setlove.enabled: false):
    // mất luôn nút trái tim góc màn + panel trượt
    if (CONFIG.setlove && CONFIG.setlove.enabled === false) {
        arrow.remove();
        panel.remove();
        return;
    }

    // Nút trái tim phải nằm NGOÀI .main-viewport (tổ tiên có perspective/transform)
    // thì `position: fixed` mới neo vào MÀN HÌNH thật — nhờ đó mới đặt được nút
    // ra NGOÀI mép phải card. Panel thì vẫn ở TRONG card (không dời đi đâu).
    const viewport = document.querySelector('.main-viewport');
    if (viewport && viewport.contains(arrow)) document.body.appendChild(arrow);

    const cfg = CONFIG.setlove || {};
    const myName = document.getElementById('setlove-my-name');
    const partnerName = document.getElementById('setlove-partner-name');
    const startDateEl = document.getElementById('setlove-start-date');

    if (myName && cfg.myName) myName.textContent = cfg.myName;
    if (partnerName && cfg.partnerName) partnerName.textContent = cfg.partnerName;

    // Fallback: nếu chưa có avatar Discord thì hiện chữ cái đầu tên
    const setFallback = (id, name) => {
        const el = document.getElementById(id);
        if (el && name) el.textContent = name.trim().charAt(0).toUpperCase();
    };
    setFallback('setlove-my-fallback', cfg.myName);
    setFallback('setlove-partner-fallback', cfg.partnerName);

    // Đồng bộ avatar + khung từ Discord qua Lanyard (chỉ avatar & khung, không lấy tên)
    const LANYARD_API = 'https://api.lanyard.rest/v1/users/';
    const CDN = 'https://cdn.discordapp.com/';
    // Ảnh dự phòng local (khai báo trong config.js -> setlove.localVisuals):
    // dùng khi cdn.discordapp.com bị nhà mạng chặn
    const LOCAL_VISUALS = (CONFIG.setlove && CONFIG.setlove.localVisuals) || {};

    // Khôi phục avatar + khung từ cache (khi Lanyard/CDN chưa trả lời hoặc đã chết)
    function applyCachedVisuals(ids, cached) {
        if (!cached) return;
        const avatarImg = document.getElementById(ids.avatar);
        const decoImg = document.getElementById(ids.deco);
        const fallback = document.getElementById(ids.fallback);
        if (avatarImg && cached.avatar) {
            setImgWithFallback(avatarImg, cached.avatar, cached.avatarLocal);
            avatarImg.hidden = false;
            if (fallback) fallback.hidden = true;
        }
        if (decoImg) {
            if (cached.deco) {
                setImgWithFallback(decoImg, cached.deco, cached.decoLocal);
                decoImg.hidden = false;
            } else {
                decoImg.hidden = true;
            }
        }
    }

    // Dòng nhỏ "cập nhật X trước" — CHỈ hiện khi cache đã cũ (≥ 5 phút);
    // dữ liệu tươi thì không có gì thay đổi trên giao diện
    function showVisualAge(fetchedAt, nameId) {
        const nameEl = document.getElementById(nameId);
        if (!nameEl || !fetchedAt) return;
        const mins = Math.round((Date.now() - fetchedAt) / 60000);
        if (mins < 5) return;
        let label;
        if (mins < 60) label = `${mins} phút trước`;
        else if (mins < 1440) label = `${Math.floor(mins / 60)} giờ trước`;
        else label = `${Math.floor(mins / 1440)} ngày trước`;
        const person = nameEl.closest('.setlove-person');
        if (!person) return;
        let el = person.querySelector('.visual-age');
        if (!el) {
            el = document.createElement('span');
            el.className = 'visual-age';
            person.appendChild(el);
        }
        el.textContent = `cập nhật ${label}`;
    }

    function applyDiscordVisuals(ids, user) {
        if (!user) return;
        const avatarImg = document.getElementById(ids.avatar);
        const decoImg = document.getElementById(ids.deco);
        const fallback = document.getElementById(ids.fallback);

        if (avatarImg && user.avatar) {
            const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
            const local = LOCAL_VISUALS[user.id];
            // Chuỗi dự phòng: CDN -> media.discordapp.net -> file local (khi bị chặn)
            setImgWithFallback(avatarImg, `${CDN}avatars/${user.id}/${user.avatar}.${ext}?size=256`, local ? local.avatar : null);
            avatarImg.hidden = false;
            if (fallback) fallback.hidden = true;
        }

        let decoUrl = null;
        if (decoImg) {
            const decoAsset = user.avatar_decoration_data && user.avatar_decoration_data.asset;
            if (decoAsset) {
                decoUrl = `${CDN}avatar-decoration-presets/${decoAsset}.png`;
                setImgWithFallback(decoImg, decoUrl, LOCAL_VISUALS[user.id] ? LOCAL_VISUALS[user.id].deco : null);
                decoImg.hidden = false;
            } else {
                decoImg.hidden = true;
            }
        }

        // Lưu cache: lần sau Lanyard/CDN chết vẫn còn avatar + khung để hiện
        if (user.id && avatarImg && avatarImg.src) {
            const local = LOCAL_VISUALS[user.id];
            saveVisualCache(user.id, avatarImg.src, decoUrl, local ? local.avatar : null, local ? local.deco : null);
        }

        // Dữ liệu tươi đã tới: gỡ dòng "cập nhật X trước" (nếu có)
        const person = avatarImg && avatarImg.closest('.setlove-person');
        if (person) {
            const ageEl = person.querySelector('.visual-age');
            if (ageEl) ageEl.remove();
        }
    }

    function loadDiscordVisuals(ids, userId, retryDelay) {
        if (!userId || !ids) return;
        fetch(LANYARD_API + userId)
            .then(r => r.json())
            .then(json => {
                if (json.success && json.data && json.data.discord_user) {
                    applyDiscordVisuals(ids, { id: userId, ...json.data.discord_user });
                } else if (retryDelay) {
                    // Chưa được theo dõi bởi Lanyard — thử lại sau (vd: khi người ấy join discord.gg/lanyard)
                    setTimeout(() => loadDiscordVisuals(ids, userId, retryDelay), retryDelay);
                }
            })
            .catch(() => {
                if (retryDelay) setTimeout(() => loadDiscordVisuals(ids, userId, retryDelay), retryDelay);
            });
    }

    const myIds = { avatar: 'setlove-my-avatar', deco: 'setlove-my-deco', fallback: 'setlove-my-fallback' };
    const partnerIds = { avatar: 'setlove-partner-avatar', deco: 'setlove-partner-deco', fallback: 'setlove-partner-fallback' };

    // KHÔI PHỤC TỪ CACHE TRƯỚC KHI GỌI LANYARD: nếu Lanyard chết thì avatar + khung
    // vẫn hiện như bình thường (kèm dòng "cập nhật X trước" nếu cache đã cũ)
    const visualCache = loadVisualCache();
    [[myIds, cfg.myDiscordId, 'setlove-my-name'], [partnerIds, cfg.partnerDiscordId, 'setlove-partner-name']].forEach(([ids, uid, nameId]) => {
        const cached = visualCache[uid];
        if (cached) {
            applyCachedVisuals(ids, cached);
            showVisualAge(cached.at, nameId);
        }
    });

    loadDiscordVisuals(myIds, cfg.myDiscordId);
    // Người yêu: retry mỗi 60s đến khi Lanyard nhận được dữ liệu
    loadDiscordVisuals(partnerIds, cfg.partnerDiscordId, 60000);

    // Hook kiểm thử (chỉ chạy khi URL có ?debug): mô phỏng Lanyard chết —
    // khôi phục đúng đường cache như lúc mở trang thật
    if (new URLSearchParams(location.search).has('debug')) {
        window.__debugRestoreSetlove = (ageMinutes) => {
            const c = loadVisualCache();
            [[myIds, cfg.myDiscordId, 'setlove-my-name'], [partnerIds, cfg.partnerDiscordId, 'setlove-partner-name']].forEach(([ids, uid, nameId]) => {
                const cached = c[uid];
                if (!cached) return;
                cached.at = ageMinutes > 0 ? Date.now() - ageMinutes * 60000 : Date.now();
                applyCachedVisuals(ids, cached);
                if (ageMinutes > 0) showVisualAge(cached.at, nameId);
            });
            return {
                my: document.getElementById('setlove-my-avatar').naturalWidth,
                partner: document.getElementById('setlove-partner-avatar').naturalWidth,
                deco: document.getElementById('setlove-my-deco').naturalWidth,
                labels: [...document.querySelectorAll('.visual-age')].map(e => e.textContent)
            };
        };
    }

    // Đếm ngày/giờ/phút/giây yêu nhau — cập nhật mỗi giây
    const start = cfg.startDate ? new Date(cfg.startDate + 'T00:00:00+07:00') : null;
    const ids = ['love-days', 'love-hours', 'love-mins', 'love-secs'];
    const cells = ids.map(id => document.getElementById(id));

    function tickLove() {
        if (!start || isNaN(start) || !cells[0]) return;
        let diff = Date.now() - start.getTime();
        if (diff < 0) diff = 0;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor(diff / 3600000) % 24;
        const mins = Math.floor(diff / 60000) % 60;
        const secs = Math.floor(diff / 1000) % 60;
        const vals = [days, hours, mins, secs];
        for (let i = 0; i < 4; i++) {
            if (cells[i] && cells[i].textContent !== String(vals[i])) {
                cells[i].textContent = vals[i];
            }
        }
    }
    tickLove();
    setInterval(tickLove, 1000);

    if (startDateEl && start && !isNaN(start)) {
        // Hiển thị đầy đủ ngày bắt đầu yêu: DD/MM/YYYY (giờ Việt Nam)
        startDateEl.textContent = start.toLocaleDateString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh'
        });
    }

    const prefersStill = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    /* ------------------------------------------------------------------
       CỘT MỐC KỶ NIỆM — tự tính, KHÔNG phải cập nhật tay
       Hai loại mốc: tròn trăm ngày, và kỷ niệm theo tháng (đúng ngày trong
       tháng của startDate). Tính theo NGÀY giờ Việt Nam nên khách ở múi giờ
       nào cũng thấy đúng ngày của hai bạn.
       ------------------------------------------------------------------ */
    const milestoneBox = document.getElementById('setlove-milestone');
    const milestoneTextEl = document.getElementById('milestone-text');
    const milestoneFill = document.getElementById('milestone-fill');

    const VN_OFFSET = 7 * 3600000;
    const DAY_MS = 86400000;
    const dayNumber = (date) => Math.floor((date.getTime() + VN_OFFSET) / DAY_MS);
    const vnMidnight = (year, month, day) => Date.UTC(year, month - 1, day) - VN_OFFSET;

    const MONTH_LENGTH_DAYS = 30;   // 1 tháng = 30 ngày (cách hai bạn vẫn đếm)

    let startParts = null;
    if (cfg.startDate && /^\d{4}-\d{2}-\d{2}$/.test(cfg.startDate)) {
        startParts = cfg.startDate.split('-').map(Number);
    }
    let milestoneIsToday = false;

    // "1 tháng", "1 năm", "1 năm 2 tháng" — đọc tự nhiên hơn "14 tháng"
    function monthLabel(months) {
        if (months < 12) return `${months} tháng`;
        const years = Math.floor(months / 12);
        const rest = months % 12;
        return rest === 0 ? `${years} năm` : `${years} năm ${rest} tháng`;
    }

    // Một đợt tim bay khi đúng ngày kỷ niệm (chỉ chạy một lần, dùng transform)
    function heartBurst() {
        if (!milestoneBox || prefersStill) return;
        for (let i = 0; i < 14; i++) {
            const heart = document.createElement('i');
            heart.className = 'fa-solid fa-heart milestone-heart-burst';
            heart.setAttribute('aria-hidden', 'true');
            heart.style.setProperty('--drift', `${Math.round((Math.random() - 0.5) * 140)}px`);
            heart.style.marginLeft = `${Math.round((Math.random() - 0.5) * 110)}px`;
            heart.style.animationDelay = `${i * 80}ms`;
            heart.style.fontSize = `${11 + Math.round(Math.random() * 7)}px`;
            milestoneBox.appendChild(heart);
            setTimeout(() => heart.remove(), 3000 + i * 80);
        }
    }

    function updateMilestone() {
        if (!milestoneBox || !milestoneTextEl || !startParts) return;
        const [sy, sm, sd] = startParts;
        const startDay = dayNumber(new Date(vnMidnight(sy, sm, sd)));
        const today = dayNumber(new Date());
        const days = today - startDay;
        if (days < 0) return;   // ngày bắt đầu nằm ở tương lai: chưa có gì để đếm

        // --- mốc tròn trăm ngày kế tiếp
        const hundredDone = days > 0 && days % 100 === 0;
        const nextHundred = (Math.floor(days / 100) + 1) * 100;
        const hundredDay = startDay + nextHundred;

        // --- kỷ niệm theo tháng, với MỘT THÁNG = 30 NGÀY (theo cách hai bạn đếm):
        //     mốc thứ m rơi đúng vào ngày thứ m*30 kể từ ngày bắt đầu.
        //     Ví dụ ngày thứ 117 -> mốc 4 tháng (120 ngày) còn 3 ngày.
        const monthDone = days > 0 && days % MONTH_LENGTH_DAYS === 0 ? days / MONTH_LENGTH_DAYS : 0;
        const nextMonthIndex = Math.floor(days / MONTH_LENGTH_DAYS) + 1;
        const monthDay = startDay + nextMonthIndex * MONTH_LENGTH_DAYS;

        // --- chọn mốc gần hơn để hiển thị (hôm nay trùng cả hai thì gộp lại)
        let text = '';
        let progress = 0;
        milestoneIsToday = false;

        if (hundredDone && monthDone) {
            milestoneIsToday = true;
            text = `Hôm nay tròn ${days} ngày & kỷ niệm ${monthLabel(monthDone)} 💕`;
            progress = 1;
        } else if (hundredDone) {
            milestoneIsToday = true;
            text = `Hôm nay tròn ${days} ngày yêu nhau 💕`;
            progress = 1;
        } else if (monthDone) {
            milestoneIsToday = true;
            text = `Hôm nay kỷ niệm ${monthLabel(monthDone)} yêu nhau 💕`;
            progress = 1;
        } else if (hundredDay <= monthDay || !monthDay) {
            const left = hundredDay - today;
            const prev = hundredDay - 100;
            text = `Còn ${left} ngày nữa là mốc tròn ${nextHundred} ngày 💕`;
            progress = (today - prev) / (hundredDay - prev);
        } else {
            const left = monthDay - today;
            const prevMonth = startDay + (nextMonthIndex - 1) * MONTH_LENGTH_DAYS;
            text = `Còn ${left} ngày nữa là kỷ niệm ${monthLabel(nextMonthIndex)} 💕`;
            progress = (today - prevMonth) / (monthDay - prevMonth);
        }

        milestoneTextEl.textContent = text;
        milestoneBox.classList.toggle('is-today', milestoneIsToday);
        milestoneBox.hidden = false;
        if (milestoneFill) {
            const pct = Math.max(0, Math.min(1, progress));
            milestoneFill.style.width = `${(pct * 100).toFixed(1)}%`;
        }
        // Chỉ bắn tim khi panel đang mở (lúc mới tải trang panel còn đóng, bắn
        // thì khách không thấy gì); mở panel khi đúng ngày thì toggle() bắn.
        if (milestoneIsToday && document.body.classList.contains('love-open')) heartBurst();
    }

    updateMilestone();
    // Mỗi phút tính lại — đủ để sang ngày mới là con số tự đổi, mà gần như không tốn gì
    setInterval(updateMilestone, 60000);

    /* ------------------------------------------------------------------
       DẢI ẢNH KỶ NIỆM — chỉ dựng khi config.js có ảnh. Ảnh chỉ được tải
       khi khách mở panel lần đầu (mở trang vẫn nhẹ như trước).
       ------------------------------------------------------------------ */
    const photosWrap = document.getElementById('setlove-photos');
    const photosTrack = document.getElementById('setlove-photos-track');
    const photoList = (Array.isArray(cfg.photos) ? cfg.photos : [])
        .map(p => (typeof p === 'string' ? { src: p, caption: '' } : { src: (p && p.src) || '', caption: (p && p.caption) || '' }))
        .filter(p => p.src);
    let photosLoaded = false;

    const lightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('photo-lightbox-img');
    const lightboxCaption = document.getElementById('photo-lightbox-caption');

    function closePhoto() {
        if (!lightbox) return;
        document.body.classList.remove('photo-open');
        lightbox.setAttribute('aria-hidden', 'true');
    }

    function openPhoto(item) {
        if (!lightbox || !lightboxImg) return;
        lightboxImg.src = item.src;
        lightboxImg.alt = item.caption || 'Ảnh kỷ niệm';
        if (lightboxCaption) lightboxCaption.textContent = item.caption || '';
        document.body.classList.add('photo-open');
        lightbox.setAttribute('aria-hidden', 'false');
        playBeepSound(600, 0.05);
    }

    function loadPhotos() {
        if (photosLoaded || !photosTrack) return;
        photosLoaded = true;
        photosTrack.querySelectorAll('img[data-src]').forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }

    if (photosWrap && photosTrack && photoList.length > 0) {
        // Nhân đôi danh sách để dải trôi liền mạch (dịch đúng 50% rồi lặp)
        [...photoList, ...photoList].forEach(item => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'photo-item';
            btn.setAttribute('aria-label', item.caption ? `Xem ảnh: ${item.caption}` : 'Xem ảnh kỷ niệm');
            const img = document.createElement('img');
            img.alt = item.caption || 'Ảnh kỷ niệm';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.dataset.src = item.src;   // gán src thật khi panel mở (xem loadPhotos)
            btn.appendChild(img);
            btn.addEventListener('click', () => openPhoto(item));
            photosTrack.appendChild(btn);
        });
        photosWrap.hidden = false;

        const lightboxBackdrop = document.getElementById('photo-lightbox-backdrop');
        const lightboxClose = document.getElementById('photo-lightbox-close');
        if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closePhoto);
        if (lightboxClose) lightboxClose.addEventListener('click', closePhoto);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('photo-open')) closePhoto();
        });
    }

    // Mở/đóng panel trượt
    function toggle(open) {
        const willOpen = open !== undefined ? open : !document.body.classList.contains('love-open');
        document.body.classList.toggle('love-open', willOpen);
        panel.setAttribute('aria-hidden', String(!willOpen));
        arrow.setAttribute('aria-label', willOpen ? 'Quay lại bio' : 'Xem phần Setlove');
        if (willOpen) {
            loadPhotos();
            if (milestoneIsToday) heartBurst();   // đúng ngày kỷ niệm thì mở panel là có tim bay
        }
        positionArrow();
    }

    // Đặt nút trái tim:
    // - Panel ĐÓNG: nằm NGOÀI mép phải card (không đè nội dung)
    // - Panel MỞ: trượt sang trái theo panel, đứng cách mép trái panel 20px
    // Khoảng cách nút tối đa cho phép tính từ mép phải màn hình (44px nút + 6px lề)
    const MAX_RIGHT = 50;

    function positionArrow() {
        if (!arrow) return;
        if (document.body.classList.contains('love-open')) {
            // Panel MỞ: panel nằm trong card, neo mép phải card, rộng tối đa 880px.
            // Khi mở, card bị dịch sang trái `shift` px (xem CSS .main-viewport) nên
            // mép trái panel trên màn hình = mép phải card - shift - bề rộng panel.
            // Đặt nút cách mép trái panel 20px: nhờ transition `right` cùng duration với
            // panel, nút trượt sang TRÁI cùng nhịp với panel (không đứng yên bên phải).
            // (dùng offsetWidth/offsetLeft để không bị ảnh hưởng bởi transform đang chạy)
            arrow.style.width = '';
            arrow.style.height = '';
            const openCard = document.querySelector('.bio-card');
            if (!openCard) return;
            let cardLeft = 0, node = openCard;
            while (node) { cardLeft += node.offsetLeft; node = node.offsetParent; }
            const shift = window.innerWidth <= 640 ? 40 : 140; // khớp với translateX của .main-viewport
            // Bề rộng panel THẬT theo CSS (tránh lặp lại con số 880 ở 2 nơi)
            const panelWidth = parseFloat(getComputedStyle(panel).width) || openCard.offsetWidth;
            const panelLeft = cardLeft + openCard.offsetWidth - shift - panelWidth;
            // Màn hẹp: panel phủ gần hết card nên không còn chỗ đứng hẳn ra ngoài —
            // kẹp lại để nút luôn còn nhìn thấy & bấm được (nằm vắt mép trái panel).
            const ideal = window.innerWidth - panelLeft + 20;
            const maxRight = Math.max(0, window.innerWidth - MAX_RIGHT);
            arrow.style.right = Math.min(Math.max(0, ideal), maxRight) + 'px';
            return;
        }
        const card = document.querySelector('.bio-card');
        if (!card) return;
        // Dùng offsetLeft (không bị ảnh hưởng bởi transform) để lấy mép phải "gốc" của card
        let left = 0, n = card;
        while (n) { left += n.offsetLeft; n = n.offsetParent; }
        const cardRight = left + card.offsetWidth;
        const space = window.innerWidth - cardRight; // khoảng trống bên phải card
        const size = space >= 54 ? 44 : (space >= 44 ? 38 : 32); // thu nhỏ nếu chỗ hẹp
        const gap = space >= 54 ? 6 : 2;
        arrow.style.right = Math.max(0, space - size - gap) + 'px';
        if (size !== 44) {
            arrow.style.width = size + 'px';
            arrow.style.height = size + 'px';
        } else {
            arrow.style.width = '';
            arrow.style.height = '';
        }
    }
    // Đặt vị trí nút SAU khung hình đầu tiên. Đo layout (offsetLeft/offsetWidth) ngay
    // trong khối khởi động buộc trình duyệt tính lại TOÀN TRANG đúng lúc đang vẽ trang
    // đầu tiên — đo được ~48ms khựng. Nút trái tim nằm sau màn chào (che kín màn hình)
    // nên lùi lại 1 khung hình là không ai nhìn thấy.
    requestAnimationFrame(() => requestAnimationFrame(positionArrow));

    // Khi panel trượt xong (mở hoặc đóng): đo vị trí thật của panel và đặt nút cách mép trái panel 20px
    panel.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'transform') return;
        if (!document.body.classList.contains('love-open')) { positionArrow(); return; }
        // Hiệu chỉnh theo mép trái panel THẬT (phòng khi bề rộng panel lệch chút so với ước lượng)
        const rect = panel.getBoundingClientRect();
        const ideal = window.innerWidth - rect.left + 20;
        arrow.style.right = Math.min(ideal, Math.max(0, window.innerWidth - MAX_RIGHT)) + 'px';
    });

    // Cập nhật lại khi resize / layout thay đổi — tắt animation tạm để không bị trôi
    let arrowResizeTimer = null;
    window.addEventListener('resize', () => {
        arrow.style.transition = 'none';
        positionArrow();
        clearTimeout(arrowResizeTimer);
        arrowResizeTimer = setTimeout(() => { arrow.style.transition = ''; }, 150);
    });
    window.addEventListener('load', positionArrow);
    setTimeout(positionArrow, 400);
    setTimeout(positionArrow, 1200);
    // Gộp các lần báo cùng lúc vào MỘT khung hình: positionArrow() vừa đọc vừa ghi style,
    // gọi dồn dập sẽ bắt trình duyệt tính lại layout nhiều lần liên tiếp.
    let arrowRafId = null;
    const schedulePositionArrow = () => {
        if (arrowRafId !== null) return;
        arrowRafId = requestAnimationFrame(() => { arrowRafId = null; positionArrow(); });
    };
    if (window.ResizeObserver) new ResizeObserver(schedulePositionArrow).observe(document.body);

    // Câu nói yêu thương — tự động đổi qua lại (vẫn giữ hiệu ứng khi đổi)
    const quoteEl = document.getElementById('setlove-quote');
    const quotes = Array.isArray(cfg.quotes) && cfg.quotes.length ? cfg.quotes : ['Yêu nhau yêu hẳn đi 💕'];
    const QUOTE_INTERVAL = 6000; // đổi câu mỗi 6 giây
    let quoteIndex = 0;

    function showQuote(text) {
        quoteEl.textContent = `"${text}"`;
    }

    function nextQuote() {
        quoteIndex = (quoteIndex + 1) % quotes.length;
        quoteEl.classList.add('swap');
        setTimeout(() => {
            showQuote(quotes[quoteIndex]);
            quoteEl.classList.remove('swap');
        }, 300);
    }

    if (quoteEl && quotes.length > 1) {
        showQuote(quotes[0]);
        setInterval(nextQuote, QUOTE_INTERVAL);
    } else if (quoteEl) {
        showQuote(quotes[0]);
    }

    // Trái tim bay — canvas nền động khi mở panel
    const loveCanvas = document.getElementById('love-canvas');
    let heartsRunning = false;
    let heartsSpawn = null;

    function startHearts() {
        if (!loveCanvas || heartsRunning) return;
        heartsRunning = true;
        const ctx = loveCanvas.getContext('2d');
        let W, H;
        const DPR = Math.min(window.devicePixelRatio || 1, 2);

        function resize() {
            W = loveCanvas.clientWidth;
            H = loveCanvas.clientHeight;
            loveCanvas.width = W * DPR;
            loveCanvas.height = H * DPR;
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        }
        resize();
        window.addEventListener('resize', resize);

        const COLORS = ['#ff6b9d', '#ff8fb8', '#ff4f8b', '#ffa5c6', '#e8558f'];
        const hearts = [];

        function spawnHeart() {
            hearts.push({
                x: Math.random() * W,
                y: H + 20,
                size: 5 + Math.random() * 11,
                vy: 0.45 + Math.random() * 1.05,
                drift: Math.random() * 2 * Math.PI,
                driftSpeed: 0.008 + Math.random() * 0.02,
                sway: 12 + Math.random() * 26,
                alpha: 0.25 + Math.random() * 0.5,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                spin: (Math.random() - 0.5) * 0.02,
                angle: 0
            });
        }

        function drawHeart(x, y, s, rot, color, alpha) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot);
            ctx.scale(s / 12, s / 12);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(0, 4);
            ctx.bezierCurveTo(0, 1, -2.2, -1.5, -6, -1.5);
            ctx.bezierCurveTo(-11.5, -1.5, -11.5, 4.5, -11.5, 4.5);
            ctx.bezierCurveTo(-11.5, 8.5, -7.5, 12, 0, 16.5);
            ctx.bezierCurveTo(7.5, 12, 11.5, 8.5, 11.5, 4.5);
            ctx.bezierCurveTo(11.5, 4.5, 11.5, -1.5, 6, -1.5);
            ctx.bezierCurveTo(2.2, -1.5, 0, 1, 0, 4);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        // Rải tim đều ngay từ đầu để không phải chờ
        for (let i = 0; i < 26; i++) {
            spawnHeart();
            hearts[hearts.length - 1].y = Math.random() * H;
        }

        function loop() {
            if (!heartsRunning) return;
            ctx.clearRect(0, 0, W, H);

            if (Math.random() < 0.08 && hearts.length < 60) spawnHeart();

            for (let i = hearts.length - 1; i >= 0; i--) {
                const h = hearts[i];
                h.y -= h.vy;
                h.drift += h.driftSpeed;
                h.angle += h.spin;
                const x = h.x + Math.sin(h.drift) * h.sway;

                drawHeart(x, h.y, h.size, h.angle, h.color, h.alpha);

                if (h.y < -30) hearts.splice(i, 1);
            }
            requestAnimationFrame(loop);
        }
        loop();
    }

    function stopHearts() {
        heartsRunning = false;
    }

    // Chạy/dừng canvas theo panel — tiết kiệm CPU khi panel đóng
    const originalToggle = toggle;
    toggle = function (open) {
        originalToggle(open);
        if (document.body.classList.contains('love-open')) startHearts();
        else stopHearts();
    };

    arrow.addEventListener('click', () => toggle());

    // ESC để đóng
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') toggle(false);
    });
}

/* ====================================================================
   0.8 DONATE QR MODAL (bấm nút Donate -> hiện ảnh QR giữa màn hình)
   ==================================================================== */
// Ảnh QR chỉ được tải khi khách THẬT SỰ mở hộp thoại (tiết kiệm ~152KB cho người không dùng)
// Nạp ảnh QR vào sẵn (gọi lúc trang rảnh, hoặc lúc mở hộp thoại nếu chưa kịp).
// Idempotent: gọi lại nhiều lần cũng chỉ tải ảnh một lần.
function loadDonateQr() {
    const img = document.getElementById('donate-qr');
    const empty = document.getElementById('donate-qr-empty');
    const cfg = CONFIG.donate || {};
    if (!img || img.dataset.loaded || !cfg.qrImage) return;
    img.dataset.loaded = '1';
    img.addEventListener('load', () => {
        img.hidden = false;
        if (empty) empty.hidden = true;
    });
    img.addEventListener('error', () => {
        img.hidden = true;
        if (empty) empty.hidden = false;
    });
    img.src = cfg.qrImage;
}

function openDonate(open) {
    const modal = document.getElementById('donate-modal');
    if (!modal) return;
    const willOpen = open !== undefined ? open : !document.body.classList.contains('donate-open');
    document.body.classList.toggle('donate-open', willOpen);
    if (willOpen) loadDonateQr();
    modal.setAttribute('aria-hidden', String(!willOpen));
}

function initDonate() {
    const modal = document.getElementById('donate-modal');
    if (!modal) return;

    const backdrop = document.getElementById('donate-backdrop');
    const closeBtn = document.getElementById('donate-close');
    const info = document.getElementById('donate-info');
    const cfg = CONFIG.donate || {};

    // Ảnh QR: nạp SẴN khi trang vừa rảnh (trước đây chỉ bắt đầu tải lúc bấm Donate
    // nên mở hộp thoại phải chờ vài trăm ms mới thấy mã). Đặt ở lúc trình duyệt rảnh
    // nên vẫn không tranh băng thông với lần vẽ đầu tiên.
    if (cfg.qrImage) {
        const warmQr = () => loadDonateQr();
        if ('requestIdleCallback' in window) requestIdleCallback(warmQr, { timeout: 3000 });
        else setTimeout(warmQr, 1500);
    }

    // Thông tin chuyển khoản — chỉ hiện dòng nào có dữ liệu
    if (info) {
        const rows = [
            ['Ngân hàng', cfg.bankName],
            ['Chủ tài khoản', cfg.accountName],
            ['Số tài khoản', cfg.accountNumber],
            ['Nội dung', cfg.note]
        ].filter(r => r[1]);
        info.innerHTML = rows.map(([k, v]) => `<div class="donate-row"><span>${k}</span><b>${v}</b></div>`).join('');
        info.hidden = rows.length === 0;
    }

    if (backdrop) backdrop.addEventListener('click', () => openDonate(false));
    if (closeBtn) closeBtn.addEventListener('click', () => openDonate(false));
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('donate-open')) openDonate(false);
    });
}

/* ====================================================================
   0.95 LƯỢT XEM & LƯỢT THÍCH TRANG (Cloudflare Pages Function: /api/stats)
   ====================================================================
   Số liệu lấy từ hàm trong thư mục functions/ (KV của Cloudflare). Không có API
   — ví dụ khi mở bằng máy cục bộ hoặc chưa gắn KV — thì phần này để nguyên
   `hidden`, khách không thấy gì và trang chạy y như cũ. */
function formatStatNumber(value) {
    const n = Number(value) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace('.', ',') + 'M';
    if (n >= 10000) return Math.round(n / 1000) + 'k';
    return n.toLocaleString('vi-VN');
}

function initStats() {
    const box = document.getElementById('site-stats');
    const viewsEl = document.getElementById('stat-views');
    const likesEl = document.getElementById('stat-likes');
    const likeBtn = document.getElementById('stats-like');
    const likeIcon = document.getElementById('stats-like-icon');
    if (!box || !likeBtn) return;

    function paint(data) {
        if (viewsEl) viewsEl.textContent = formatStatNumber(data.views);
        if (likesEl) likesEl.textContent = formatStatNumber(data.likes);
        const liked = Boolean(data.liked);
        likeBtn.classList.toggle('liked', liked);
        likeBtn.setAttribute('aria-pressed', String(liked));
        if (likeIcon) likeIcon.className = liked ? 'fa-solid fa-heart' : 'fa-regular fa-heart';
        box.hidden = false;
    }

    // GET vừa đọc số liệu vừa tính một lượt xem (server tự chống đếm trùng theo IP)
    fetch('/api/stats', { headers: { Accept: 'application/json' } })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
            if (!data || data.disabled) return;
            paint(data);
        })
        .catch(() => {});

    likeBtn.addEventListener('click', () => {
        if (likeBtn.dataset.busy) return;
        likeBtn.dataset.busy = '1';
        playBeepSound(660, 0.06);
        fetch('/api/stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ action: 'like' })
        })
            .then(res => (res.ok ? res.json() : null))
            .then(data => {
                if (!data || data.disabled) return;
                paint(data);
                if (data.counted) {
                    likeBtn.classList.add('pop');
                    setTimeout(() => likeBtn.classList.remove('pop'), 460);
                    showToast('Cảm ơn bạn đã thích trang này 💗', 'fa-solid fa-heart');
                } else {
                    showToast('Bạn đã thích trang này hôm nay rồi 💗', 'fa-solid fa-heart');
                }
            })
            .catch(() => {})
            .finally(() => { delete likeBtn.dataset.busy; });
    });
}

/* ====================================================================
   0.9 BANNER AUDIO VISUALIZER (dải banner phản ứng theo nhạc đang phát)
   ==================================================================== */
function initBannerVisualizer() {
    const banner = document.getElementById('card-banner');
    const audio = document.getElementById('bg-audio');
    if (!banner || !audio) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'banner-visualizer';
    canvas.setAttribute('aria-hidden', 'true');
    banner.insertBefore(canvas, banner.firstChild);

    const ctx = canvas.getContext('2d');
    if (!ctx) { canvas.remove(); return; }

    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;

    /* --- Đồ thị âm thanh, dựng theo cách an toàn nhất ---
       source -> destination TRƯỚC (bảo đảm vẫn còn tiếng), rồi source -> analyser.
       Analyser chỉ ĐỌC dữ liệu nên không cần nối ra destination — nhờ vậy nó không
       nằm trên đường tiếng và không thể làm hỏng âm thanh.
       Nếu trình duyệt/tiện ích đã tạo MediaElementSource cho thẻ này rồi thì
       createMediaElementSource sẽ báo lỗi -> bỏ hiệu ứng, nhạc vẫn chạy bình thường. */
    let audioCtx = null;
    let analyser = null;
    let bins = null;
    let graphFailed = false;

    function ensureGraph() {
        if (analyser || graphFailed) return !!analyser;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { graphFailed = true; return false; }
        try {
            audioCtx = new AC();
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(audioCtx.destination);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 1024;
            analyser.smoothingTimeConstant = 0.82;
            source.connect(analyser);
            bins = new Uint8Array(analyser.frequencyBinCount);
            if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
            return true;
        } catch (e) {
            console.warn('Banner visualizer: không dựng được đồ thị âm thanh, bỏ hiệu ứng', e);
            analyser = null;
            bins = null;
            graphFailed = true;
            return false;
        }
    }

    function resumeCtx() {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    }

    function resize() {
        W = canvas.clientWidth;
        H = canvas.clientHeight;
        if (!W || !H) return;
        const pxW = Math.round(W * DPR);
        const pxH = Math.round(H * DPR);
        // Trùng kích thước: ghi lại như cũ vừa XOÁ canvas vừa đánh dấu layout "bẩn",
        // mà có 3 nơi gọi resize (khởi động, resize cửa sổ, ResizeObserver).
        // Ở đây chỉ xoá đúng phần bitmap: HÌNH ẢNH Y NHƯ TRƯỚC (bản gốc cũng bị xoá ở
        // mốc 400ms/1200ms) nhưng không phải tính lại layout toàn trang.
        if (canvas.width === pxW && canvas.height === pxH) {
            ctx.clearRect(0, 0, W, H);
            return;
        }
        canvas.width = pxW;
        canvas.height = pxH;
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    // Đo layout (clientWidth) ngay trong khối khởi động buộc trình duyệt tính lại
    // TOÀN TRANG giữa lúc khởi động. Lùi tới SAU lần vẽ đầu tiên (2 lớp rAF): lúc đó
    // layout đã sẵn sàng nên phép đo miễn phí — đo trong khung hình đầu sẽ buộc
    // trình duyệt tính layout 2 lần. Người xem chỉ thấy màn chào che kín.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        resize();
        if (audio.paused) { if (reduceMotion) drawStatic(); else drawIdle(); }
    }));
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(banner);

    /* --- Vẽ ---
       Tâm dải sáng đặt ở 40% chiều cao banner vì phần dưới bị .banner-gradient
       phủ tối 90–100% (nửa dưới mờ dần như ảnh phản chiếu, trông vẫn đẹp). */
    const BARS = 64;
    const levels = new Float32Array(BARS);
    const CY_RATIO = 0.40;
    const MAX_AMP = 0.30;
    const GAP = 2;
    // Đường cong làm nổi đỉnh (nhạc nhiều năng lượng ở dải thấp).
    const CURVE = 1.2;
    // Tự động khuếch đại: bám theo đỉnh mạnh nhất gần đây rồi lấy làm mốc 100%,
    // nhờ vậy bài nhạc to hay nhỏ đều cho dáng equalizer đẹp như nhau.
    const AGC_FLOOR = 55;          // sàn: đoạn im lặng không bị khuếch đại tạp âm
    const raw = new Float32Array(BARS);
    let agcPeak = 120;

    function roundRect(c, x, y, w, h, r) {
        if (c.roundRect) { c.beginPath(); c.roundRect(x, y, w, h, r); return; }
        r = Math.min(r, w / 2, h / 2);
        c.beginPath();
        c.moveTo(x + r, y);
        c.arcTo(x + w, y, x + w, y + h, r);
        c.arcTo(x + w, y + h, x, y + h, r);
        c.arcTo(x, y + h, x, y, r);
        c.arcTo(x, y, x + w, y, r);
        c.closePath();
    }

    let grad = null;
    let gradForW = -1;

    function sampleBars() {
        const n = bins.length;
        const usable = Math.max(8, Math.floor(n * 0.62)); // bỏ dải cao tần rất yếu
        let frameMax = 0;

        for (let i = 0; i < BARS; i++) {
            const t0 = Math.floor(Math.pow(i / BARS, 1.7) * usable);
            const t1 = Math.max(t0 + 1, Math.floor(Math.pow((i + 1) / BARS, 1.7) * usable));
            let m = 0;
            for (let k = t0; k < t1 && k < n; k++) if (bins[k] > m) m = bins[k];
            raw[i] = m;
            if (m > frameMax) frameMax = m;
        }

        // lên nhanh, xuống rất chậm -> mốc 100% bám sát độ to thật của bài
        if (frameMax > agcPeak) agcPeak += (frameMax - agcPeak) * 0.5;
        else agcPeak += (frameMax - agcPeak) * 0.015;
        const gain = Math.max(agcPeak, AGC_FLOOR);

        for (let i = 0; i < BARS; i++) {
            const v = Math.min(1, raw[i] / gain);
            // làm mượt để cột không giật
            levels[i] += (Math.pow(v, CURVE) - levels[i]) * 0.35;
        }
    }

    function drawSpectrum() {
        if (!W || !H) return;
        ctx.clearRect(0, 0, W, H);
        const cy = H * CY_RATIO;
        const amp = H * MAX_AMP;
        const barW = Math.max(1, (W - GAP * (BARS - 1)) / BARS);

        if (gradForW !== W) {
            grad = ctx.createLinearGradient(0, 0, W, 0);
            grad.addColorStop(0, '#ff6b9d');
            grad.addColorStop(0.45, '#ff8fb8');
            grad.addColorStop(0.75, '#c084fc');
            grad.addColorStop(1, '#a855f7');
            gradForW = W;
        }

        // hai lượt: quầng mờ trước, cột nét sau
        for (let pass = 0; pass < 2; pass++) {
            const halo = pass === 0;
            ctx.fillStyle = grad;
            for (let i = 0; i < BARS; i++) {
                // mờ dần ở hai đầu để không đụng badge góc phải
                const fade = Math.min(1, Math.min(i, BARS - 1 - i) / (BARS * 0.18));
                const v = levels[i] * fade;
                const h = Math.max(1.2, v * amp);
                const x = i * (barW + GAP);
                ctx.globalAlpha = halo ? 0.14 : 0.5 + v * 0.5;
                roundRect(ctx, x, cy - h, barW, h * 2, Math.min(barW / 2, 2.5));
                ctx.fill();
            }
        }

        // đường tâm mờ
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = '#ffd1e3';
        ctx.fillRect(0, cy - 0.5, W, 1);
        ctx.globalAlpha = 1;
    }

    // Khi nhạc dừng: một đường sóng TĨNH, êm — vừa là dấu hiệu "đang tạm dừng",
    // vừa không tốn CPU vì vòng lặp vẽ đã dừng hẳn (chỉ vẽ lại 1 lần).
    function drawIdle() {
        if (!W || !H) return;
        ctx.clearRect(0, 0, W, H);
        const cy = H * CY_RATIO;
        ctx.strokeStyle = 'rgba(255, 143, 184, 0.26)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let x = 0; x <= W; x += 5) {
            const fade = Math.min(1, Math.min(x, W - x) / (W * 0.16));
            const y = cy + Math.sin(x * 0.011) * H * 0.07 * fade;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    function drawStatic() {
        // Bản tĩnh cho người bật "giảm chuyển động"
        if (!W || !H) return;
        ctx.clearRect(0, 0, W, H);
        const cy = H * CY_RATIO;
        const g = ctx.createLinearGradient(0, 0, W, 0);
        g.addColorStop(0, 'rgba(255, 107, 157, 0.45)');
        g.addColorStop(0.5, 'rgba(255, 143, 184, 0.55)');
        g.addColorStop(1, 'rgba(168, 85, 247, 0.4)');
        ctx.fillStyle = g;
        ctx.fillRect(0, cy - 1.5, W, 3);
    }

    let rafId = null;
    let running = false;

    function frame() {
        if (analyser) { analyser.getByteFrequencyData(bins); sampleBars(); drawSpectrum(); }
        else drawIdle();
        rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (reduceMotion) { drawStatic(); return; }
        if (running || document.hidden) return;
        running = true;
        rafId = requestAnimationFrame(frame);
    }

    function stopToIdle() {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = null;
        levels.fill(0);
        if (reduceMotion) drawStatic(); else drawIdle();
    }

    // Nhạc chạy -> dựng đồ thị rồi vẽ; nhạc dừng -> về trạng thái thở nhẹ
    audio.addEventListener('play', () => {
        ensureGraph();
        resumeCtx();
        start();
    });
    audio.addEventListener('playing', () => {
        resumeCtx();
        start();
    });
    audio.addEventListener('pause', stopToIdle);
    audio.addEventListener('ended', stopToIdle);

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            running = false;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = null;
        } else if (!audio.paused) {
            start();
        }
    });

    // (Lần đo + vẽ đầu tiên đã được lùi sang khung hình đầu tiên ở phía trên)
    setTimeout(resize, 400);
    setTimeout(resize, 1200);
}

/* ====================================================================
   1. PROFILE UI INITIALIZATION FROM CONFIG
   ==================================================================== */
/* ====================================================================
   0.9 TIÊU ĐỀ TAB — hiệu ứng gõ chữ: gõ ra → giữ → xoá đi → gõ lại
   ==================================================================== */
const TITLE_TYPE_MS = 150;       // mỗi ký tự khi gõ ra
const TITLE_ERASE_MS = 70;       // mỗi ký tự khi xoá đi
const TITLE_HOLD_FULL_MS = 2600; // giữ nguyên câu hoàn chỉnh
const TITLE_HOLD_EMPTY_MS = 550; // nghỉ khi đã xoá hết

let titleTimer = null;
let titleVisibleChars = 0;
let titleErasing = false;
let titleStarted = false;

// Tiêu đề đầy đủ: ưu tiên CONFIG.siteName, không có thì lấy tên hiển thị Discord.
function titleText() {
    return CONFIG.siteName || `@${CONFIG.profile.name}`;
}

// SÀN của tiêu đề — không bao giờ cho tiêu đề trống: trình duyệt gặp tiêu đề rỗng
// sẽ tự hiện ĐỊA CHỈ trang ở tab (thành "luongkun.pages.dev"). Sàn là phần chữ
// trước khoảng trắng cuối: "@Luong Kun" -> "@Luong".
function titleFloor(text) {
    const cut = text.trimEnd().lastIndexOf(' ');
    return cut > 0 ? cut : 1;
}

function titleTick() {
    const full = titleText();
    const floor = titleFloor(full);
    if (!titleErasing) {
        titleVisibleChars++;
        document.title = full.slice(0, titleVisibleChars);
        if (titleVisibleChars >= full.length) {
            titleErasing = true;
            titleTimer = setTimeout(titleTick, TITLE_HOLD_FULL_MS);
            return;
        }
        titleTimer = setTimeout(titleTick, TITLE_TYPE_MS);
    } else {
        titleVisibleChars--;
        document.title = full.slice(0, Math.max(floor, titleVisibleChars));
        if (titleVisibleChars <= floor) {
            titleErasing = false;
            titleTimer = setTimeout(titleTick, TITLE_HOLD_EMPTY_MS);
            return;
        }
        titleTimer = setTimeout(titleTick, TITLE_ERASE_MS);
    }
}

function startTitleTyping() {
    // Ai bật "giảm chuyển động" trong hệ điều hành thì để tiêu đề đứng yên.
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.title = titleText();
        return;
    }
    if (titleStarted) return;   // chỉ dựng một vòng lặp duy nhất
    titleStarted = true;
    // Bắt đầu từ trạng thái "đủ chữ" (HTML đã có sẵn <title>@Luong Kun</title>) nên
    // không nháy, rồi mới xoá bớt và gõ lại.
    const full = titleText();
    titleVisibleChars = full.length;
    titleErasing = true;
    document.title = full;
    titleTimer = setTimeout(titleTick, TITLE_HOLD_FULL_MS);

    // Ẩn tab thì dừng vòng lặp (khỏi tốn CPU vô ích) và hiện sẵn tên đầy đủ;
    // quay lại tab thì chạy tiếp từ chỗ xoá.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            clearTimeout(titleTimer);
            titleTimer = null;
            if (!document.title) document.title = titleText();
        } else if (!titleTimer) {
            const full = titleText();
            titleVisibleChars = full.length;
            titleErasing = true;
            titleTimer = setTimeout(titleTick, TITLE_HOLD_FULL_MS);
        }
    });
}

function initProfileUI() {
    // Tiêu đề tab: hiệu ứng gõ chữ (xem startTitleTyping phía trên)
    startTitleTyping();

    // Set Profile Text
    const nameEl = document.getElementById('user-display-name');
    const handleEl = document.getElementById('user-handle');
    const taglineEl = document.getElementById('user-tagline');
    const bioEl = document.getElementById('user-bio');
    const avatarEl = document.getElementById('profile-avatar');
    const bannerEl = document.getElementById('card-banner');
    const locationEl = document.getElementById('user-location');

    if (nameEl) nameEl.textContent = CONFIG.profile.name;
    if (handleEl) handleEl.textContent = `@${CONFIG.profile.username}`;
    if (taglineEl) taglineEl.textContent = CONFIG.profile.title;
    if (bioEl) bioEl.textContent = CONFIG.profile.bio;
    if (locationEl && CONFIG.profile.location) locationEl.textContent = CONFIG.profile.location;
    if (avatarEl && CONFIG.profile.avatar) avatarEl.src = CONFIG.profile.avatar;
    if (bannerEl && CONFIG.profile.banner) bannerEl.style.backgroundImage = `url('${CONFIG.profile.banner}')`;

    // Synchronize Cute Welcome Overlay
    const enterAvatarEl = document.querySelector('.cute-avatar-img, .enter-avatar-img');
    const enterNameEl = document.querySelector('.cute-name, .enter-name');
    if (enterAvatarEl && CONFIG.profile.avatar) enterAvatarEl.src = CONFIG.profile.avatar;
    if (enterNameEl && CONFIG.profile.name) enterNameEl.textContent = CONFIG.profile.name;

    // Hydrate các chữ còn lại từ CONFIG.site (trước đây là giá trị cứng trong HTML).
    // script.js nằm cuối <body> nên các chỗ này được đổ trước lần vẽ đầu tiên.
    const site = CONFIG.site || {};
    const welcomeEl = document.querySelector('.cute-subtext');
    if (welcomeEl && site.welcomeText) welcomeEl.textContent = site.welcomeText;
    const enterLabelEl = document.querySelector('.cute-pill-label');
    if (enterLabelEl && site.enterLabel) enterLabelEl.textContent = site.enterLabel;
    const brandEl = document.querySelector('.mono-logo');
    if (brandEl && site.footerBrand) brandEl.textContent = site.footerBrand;
    const brandSubEl = document.querySelector('.insignia-sub');
    if (brandSubEl && site.footerSuffix) brandSubEl.textContent = site.footerSuffix;

    // Render Badges
    const badgesContainer = document.getElementById('badges-container');
    if (badgesContainer && CONFIG.profile.badges) {
        badgesContainer.innerHTML = '';
        CONFIG.profile.badges.forEach(badge => {
            const pill = document.createElement('div');
            pill.className = 'badge-pill';
            pill.innerHTML = `<i class="${badge.icon}"></i> <span>${badge.label}</span>`;
            badgesContainer.appendChild(pill);
        });
    }

    // Render 2 Discord Servers (Ảnh Avatar & Banner thật 100% từ Discord)
    const serversGrid = document.getElementById('servers-grid');
    if (serversGrid && CONFIG.servers) {
        serversGrid.innerHTML = '';
        CONFIG.servers.forEach((srv, idx) => {
            const card = document.createElement('div');
            card.className = 'server-card';
            card.id = `server-card-${idx}`;
            card.innerHTML = `
                <img src="${srv.banner}" alt="${srv.name} Banner" class="server-banner-img" id="server-banner-${idx}">
                <div class="server-body">
                    <div class="server-icon-wrap">
                        <img src="${srv.icon}" alt="${srv.name} Icon" class="server-icon" id="server-icon-${idx}">
                    </div>
                    <div class="server-content">
                        <div class="server-top-line">
                            <span class="server-name" id="server-name-${idx}">${srv.name}</span>
                            <span class="server-tag">${srv.tag}</span>
                        </div>
                        <div class="server-stats" id="server-stats-${idx}" style="display:flex;align-items:center;gap:7px;font-size:0.7rem;color:var(--text-muted);font-family:var(--font-mono);margin-top:1px;">
                            <span style="display:inline-flex;align-items:center;gap:4px;"><i class="fa-solid fa-circle" style="color:var(--status-online);font-size:0.45rem;"></i> ${srv.online || 'Active Hub'}</span>
                            <span>•</span>
                            <span>${srv.members || 'Community'}</span>
                        </div>
                        <span class="server-role">${srv.role}</span>
                        <p class="server-desc">${srv.description}</p>
                    </div>
                    <a href="${srv.inviteUrl}" target="_blank" rel="noopener noreferrer" class="server-join-btn">
                        <i class="fa-brands fa-discord"></i> Join
                    </a>
                </div>
            `;
            serversGrid.appendChild(card);

            // Fallback bindings if local or CDN image has network issues
            const bannerEl = card.querySelector('.server-banner-img');
            const iconEl = card.querySelector('.server-icon');
            if (bannerEl && srv.cdnBanner) {
                bannerEl.onerror = () => {
                    if (bannerEl.src !== srv.cdnBanner) bannerEl.src = srv.cdnBanner;
                };
            }
            if (iconEl && srv.cdnIcon) {
                iconEl.onerror = () => {
                    if (iconEl.src !== srv.cdnIcon) iconEl.src = srv.cdnIcon;
                };
            }

            // Fetch latest live Discord server data (real banner, icon, member count)
            fetchDiscordInviteData(srv.inviteUrl, idx);
        });

        // Real-time: làm mới số liệu máy chủ mỗi 60 giây khi trang còn mở
        if (!window.__inviteRefreshTimer) {
            window.__inviteRefreshTimer = setInterval(() => {
                CONFIG.servers.forEach((srv, idx) => fetchDiscordInviteData(srv.inviteUrl, idx));
            }, 60000);
        }
    }

    // Render Socials
    const socialsList = document.getElementById('socials-list');
    if (socialsList && CONFIG.socials) {
        socialsList.innerHTML = '';
        CONFIG.socials.forEach(soc => {
            const a = document.createElement('a');
            a.className = soc.highlight ? 'social-pill highlight' : 'social-pill';
            a.href = soc.url || '#';
            a.target = soc.url ? '_blank' : null;
            a.rel = 'noopener noreferrer';
            a.innerHTML = `<i class="${soc.icon}"></i> <span>${soc.name}</span>`;

            if (soc.action === 'donate') {
                // Mở hộp thoại ảnh QR thay vì điều hướng
                a.title = 'Ủng hộ tác giả — mở mã QR';
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    playBeepSound(560, 0.08);
                    openDonate(true);
                });
            }

            if (soc.copy) {
                // Mục copy (vd Email): chặn điều hướng, sao chép vào clipboard + toast
                a.addEventListener('click', (e) => {
                    e.preventDefault();
                    navigator.clipboard.writeText(soc.copy).then(() => {
                        showToast(`Đã sao chép ${soc.name}: ${soc.copy}`);
                        playBeepSound(640, 0.08);
                    }).catch(() => {
                        showToast(`Không sao chép được ${soc.name}`);
                    });
                });
            }

            socialsList.appendChild(a);
        });
    }

    // Render Core Arsenal from CONFIG (Symmetrical 2x2 Grid)
    const arsenalGrid = document.getElementById('arsenal-grid');
    if (arsenalGrid && Array.isArray(CONFIG.techStack) && CONFIG.techStack.length > 0) {
        arsenalGrid.innerHTML = '';
        CONFIG.techStack.forEach(item => {
            const pill = document.createElement('div');
            pill.className = 'arsenal-pill';
            pill.innerHTML = `
                <div class="arsenal-icon-wrap">
                    <i class="${item.icon}"></i>
                </div>
                <div class="arsenal-info">
                    <span class="arsenal-name">${item.name}</span>
                    <span class="arsenal-sub">${item.domain}</span>
                </div>
            `;
            arsenalGrid.appendChild(pill);
        });
    }

    // Copy Tag Button Event
    const copyTagBtn = document.getElementById('copy-tag-btn');
    if (copyTagBtn) {
        copyTagBtn.addEventListener('click', () => {
            const textToCopy = CONFIG.discordId || CONFIG.profile.username;
            navigator.clipboard.writeText(textToCopy).then(() => {
                showToast(`Đã sao chép Discord ID: ${textToCopy}`);
                playBeepSound(600, 0.08);
            });
        });
    }

    // Nút chia sẻ / sao chép liên kết:
    // - Điện thoại (con trỏ thô) + trình duyệt hỗ trợ -> mở bảng chia sẻ của hệ điều hành
    // - Còn lại -> sao chép liên kết như cũ
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        const isTouch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        const canShare = isTouch && typeof navigator.share === 'function';
        const tipEl = copyLinkBtn.querySelector('.tooltip');
        if (tipEl && canShare) tipEl.textContent = 'Chia sẻ';

        copyLinkBtn.addEventListener('click', () => {
            const link = window.location.href;
            if (canShare) {
                navigator.share({
                    title: titleText(),   // không lấy tiêu đề đang gõ dở
                    text: 'Ghé thăm không gian số của mình nhé',
                    url: link
                }).then(() => playBeepSound(680, 0.08)).catch(() => {});
                return;
            }
            navigator.clipboard.writeText(link).then(() => {
                showToast('Đã sao chép liên kết trang');
                playBeepSound(680, 0.08);
            });
        });
    }
}

/* ====================================================================
   1.1 DYNAMIC DISCORD GUILD INVITE FETCHER (Live Icon, Banner & Counts)
   ==================================================================== */
async function fetchDiscordInviteData(inviteUrl, idx) {
    try {
        const code = inviteUrl.split('/').pop().trim();
        if (!code) return;
        const res = await fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data || !data.guild) return;

        const guild = data.guild;
        const iconEl = document.getElementById(`server-icon-${idx}`);
        const bannerEl = document.getElementById(`server-banner-${idx}`);
        const statsEl = document.getElementById(`server-stats-${idx}`);
        const nameEl = document.getElementById(`server-name-${idx}`);

        // Update real server name if available
        if (nameEl && guild.name) {
            nameEl.textContent = guild.name;
        }

        // Update real server icon from Discord CDN
        if (iconEl && guild.icon) {
            const isGif = guild.icon.startsWith('a_');
            const ext = isGif ? 'gif' : 'png';
            iconEl.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=256`;
        }

        // Update real server banner or splash from Discord CDN
        if (bannerEl) {
            if (guild.banner) {
                const isGif = guild.banner.startsWith('a_');
                const ext = isGif ? 'gif' : 'png';
                bannerEl.src = `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.${ext}?size=1024`;
            } else if (guild.splash) {
                bannerEl.src = `https://cdn.discordapp.com/splashes/${guild.id}/${guild.splash}.png?size=1024`;
            }
        }

        // Update real member and online counts
        if (statsEl && data.approximate_member_count) {
            const onlineCount = data.approximate_presence_count || 0;
            const memberCount = data.approximate_member_count;
            statsEl.innerHTML = `
                <span style="display:inline-flex;align-items:center;gap:4px;"><i class="fa-solid fa-circle" style="color:var(--status-online);font-size:0.45rem;"></i> ${onlineCount.toLocaleString()} Online</span>
                <span>•</span>
                <span>${memberCount.toLocaleString()} Members</span>
            `;
        }
    } catch (e) {
        // Silently use values defined in config.js
    }
}

/* ====================================================================
   2. TYPEWRITER EFFECT FOR QUOTES
   ==================================================================== */
function initTypewriter() {
    const textEl = document.getElementById('typewriter-quote');
    if (!textEl || !CONFIG.profile.quotes || CONFIG.profile.quotes.length === 0) return;

    let quoteIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const quotes = CONFIG.profile.quotes;

    function typeLoop() {
        const currentQuote = quotes[quoteIndex];
        
        if (isDeleting) {
            charIndex--;
            textEl.textContent = currentQuote.substring(0, charIndex);
        } else {
            charIndex++;
            textEl.textContent = currentQuote.substring(0, charIndex);
        }

        let typeSpeed = isDeleting ? 30 : 65;

        if (!isDeleting && charIndex === currentQuote.length) {
            typeSpeed = 2600; // Pause at end of quote
            isDeleting = true;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            quoteIndex = (quoteIndex + 1) % quotes.length;
            typeSpeed = 500;
        }

        setTimeout(typeLoop, typeSpeed);
    }

    typeLoop();
}

/* ====================================================================
   3. CLICK TO ENTER OVERLAY (zyo.lol Iconic Experience)
   ==================================================================== */
function initClickToEnter() {
    const overlay = document.getElementById('enter-overlay');
    if (!overlay) return;

    overlay.addEventListener('click', () => {
        overlay.classList.add('entered');
        playBeepSound(440, 0.12);

        // Start Audio Playback if enabled
        if (CONFIG.music && CONFIG.music.autoplayOnEnter) {
            const audio = document.getElementById('bg-audio');
            if (audio) {
                ensureAudioSource();
                audio.play().then(() => {
                    updateAudioWidgetState(true);
                    if (playlist.length > 0 && playlist[currentTrackIndex]) {
                        showToast(`Đang phát: ${playlist[currentTrackIndex].title}`, 'fa-solid fa-music');
                    }
                }).catch(e => console.log('Audio autoplay prevented:', e));
            }
        }
    });
}

/* ====================================================================
   4. AUDIO PLAYER CONTROLLER (Playlist & Controls)
   ==================================================================== */
let currentTrackIndex = 0;
let playlist = [];

/* Gán src cho bài đang chọn — CHỈ gọi khi có người thật sự bấm nghe.
   Thẻ audio để preload="none" và KHÔNG gán src lúc vào trang, nên khách xem bio
   mà không bật nhạc thì không tải một byte nào của bài nhạc (trước đây tải 1.1MB). */
function ensureAudioSource() {
    const audio = document.getElementById('bg-audio');
    if (!audio || !playlist.length || !playlist[currentTrackIndex]) return;
    if (audio.getAttribute('src')) return;
    audio.src = playlist[currentTrackIndex].url;
}

function initAudioController() {
    const audio = document.getElementById('bg-audio');
    const playBtn = document.getElementById('audio-play-btn');
    const prevBtn = document.getElementById('audio-prev-btn');
    const nextBtn = document.getElementById('audio-next-btn');
    const playIcon = document.getElementById('play-icon');
    const disc = document.getElementById('audio-disc');
    const eq = document.getElementById('equalizer');
    const volumeSlider = document.getElementById('volume-slider');
    const trackTitle = document.getElementById('audio-track-title');
    const artistName = document.getElementById('audio-artist-name');

    if (!audio || !CONFIG.music) return;

    // Load playlist from config or fallback
    if (Array.isArray(CONFIG.music.playlist) && CONFIG.music.playlist.length > 0) {
        playlist = CONFIG.music.playlist;
    } else if (CONFIG.music.url) {
        playlist = [{
            title: CONFIG.music.title || 'Lofi Chill',
            artist: CONFIG.music.artist || 'luongkun',
            url: CONFIG.music.url
        }];
    }

    if (playlist.length === 0) return;

    // Hiện bài đầu tiên trong playlist ngay từ lúc tải trang
    // (trước đây là chữ cứng trong index.html)
    if (trackTitle && playlist[0]) trackTitle.textContent = playlist[0].title;
    if (artistName && playlist[0]) artistName.textContent = playlist[0].artist;

    // Cập nhật dòng gợi ý ở màn hình chào theo số bài thật trong playlist
    const hintEl = document.querySelector('.cute-audio-hint span');
    if (hintEl) {
        hintEl.textContent = `${playlist.length} track${playlist.length > 1 ? 's' : ''} playlist ready • tap anywhere`;
    }

    // Mặc định kéo sẵn mức tối đa (CONFIG.music.volume = 1). Dùng phép so với
    // số thay vì `|| 0.4` để mức 0 (tắt tiếng) cũng được tôn trọng.
    audio.volume = typeof CONFIG.music.volume === 'number' ? CONFIG.music.volume : 0.4;
    if (volumeSlider) volumeSlider.value = audio.volume;

    function loadTrack(index, autoPlay = false) {
        if (index < 0) index = playlist.length - 1;
        if (index >= playlist.length) index = 0;
        currentTrackIndex = index;

        const track = playlist[currentTrackIndex];
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch (e) {}

        // Chỉ nạp file nhạc khi thật sự chuẩn bị phát. Lúc mới vào trang chỉ cần
        // đổi nhãn bài hát, nên gỡ src đi mà không nạp file nào.
        audio.removeAttribute('src');
        if (autoPlay) {
            ensureAudioSource();
            audio.load();
        }

        if (trackTitle) {
            trackTitle.textContent = track.title;
            trackTitle.title = track.title;
        }
        if (artistName) {
            const countTag = playlist.length > 1 ? `${currentTrackIndex + 1}/${playlist.length} • ` : '';
            artistName.textContent = `${countTag}${track.artist}`;
        }

        if (autoPlay) {
            audio.play().then(() => {
                updateAudioWidgetState(true);
                showToast(`Đang phát: ${track.title}`, 'fa-solid fa-music');
            }).catch(err => {
                console.log('Audio play prevented:', err);
                updateAudioWidgetState(false);
            });
        }
    }

    function playNextTrack() {
        playBeepSound(560, 0.05);
        const nextIdx = (currentTrackIndex + 1) % playlist.length;
        loadTrack(nextIdx, true);
    }

    function playPrevTrack() {
        playBeepSound(480, 0.05);
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
            audio.play().catch(() => {});
            return;
        }
        const prevIdx = (currentTrackIndex - 1 + playlist.length) % playlist.length;
        loadTrack(prevIdx, true);
    }

    // Set initial track metadata
    loadTrack(0, false);

    // Play/Pause button
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            playBeepSound(520, 0.05);
            if (audio.paused) {
                ensureAudioSource();
                audio.play().then(() => {
                    updateAudioWidgetState(true);
                }).catch(e => console.log('Audio playback error:', e));
            } else {
                audio.pause();
                updateAudioWidgetState(false);
            }
        });
    }

    // Next track button
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            playNextTrack();
        });
    }

    // Prev track button
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            playPrevTrack();
        });
    }

    // Volume slider
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            audio.volume = parseFloat(e.target.value);
        });
    }

    // Audio events
    audio.addEventListener('play', () => updateAudioWidgetState(true));
    audio.addEventListener('pause', () => updateAudioWidgetState(false));
    audio.addEventListener('ended', () => {
        // Auto-advance to next song in playlist
        playNextTrack();
    });

    // Expose for external control or debugging
    window.bioPlayer = {
        next: playNextTrack,
        prev: playPrevTrack,
        load: loadTrack
    };
}

function updateAudioWidgetState(isPlaying) {
    const playIcon = document.getElementById('play-icon');
    const disc = document.getElementById('audio-disc');
    const eq = document.getElementById('equalizer');

    if (isPlaying) {
        if (playIcon) playIcon.className = 'fa-solid fa-pause';
        if (disc) disc.classList.add('playing');
        if (eq) eq.classList.add('active');
    } else {
        if (playIcon) playIcon.className = 'fa-solid fa-play';
        if (disc) disc.classList.remove('playing');
        if (eq) eq.classList.remove('active');
    }
}

/* ====================================================================
   5. MOUSE EFFECTS: SPOTLIGHT, 3D CARD TILT & CYBER RETICLE CURSOR
   ==================================================================== */
// Shared Stardust & Comet Trail arrays for particle canvas
const stardustSparks = [];
const cometRibbon = [];

function initMouseEffects() {
    const spotlight = document.getElementById('mouse-spotlight');
    const cursorDot = document.getElementById('cursor-dot');
    const cyberCursor = document.getElementById('cyber-cursor');
    const tiltContainer = document.getElementById('tilt-container');
    const bioCard = document.getElementById('bio-card');

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let prevMouseX = mouseX;
    let prevMouseY = mouseY;
    let cursorX = mouseX;
    let cursorY = mouseY;
    let prevCursorX = mouseX;
    let prevCursorY = mouseY;

    let currentAngle = 0;
    let scaleX = 1;
    let scaleY = 1;

    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;

    let hoveredElement = null;
    let physicsId = null;

    // Ambient spotlight được DỊCH bằng transform (xem style.css), KHÔNG vẽ lại gradient.
    // Trước đây mỗi lần rê chuột là một lần vẽ lại gradient phủ toàn màn hình.
    function moveSpotlight(x, y) {
        if (!spotlight || !CONFIG.effects.enableSpotlight) return;
        spotlight.style.transform = `translate3d(calc(-50% + ${(x - window.innerWidth / 2).toFixed(1)}px), calc(-50% + ${(y - window.innerHeight / 2).toFixed(1)}px), 0)`;
    }
    // Đổi kích thước cửa sổ: đặt lại theo vị trí chuột cuối cùng (giống hành vi cũ)
    window.addEventListener('resize', () => moveSpotlight(mouseX, mouseY));

    // Direct, 0ms Instant Pin for Laser Cursor Dot
    function updateCursorDot(x, y) {
        if (cursorDot) {
            cursorDot.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
        }
    }
    updateCursorDot(mouseX, mouseY);

    // Track Mouse Move
    window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;

        // Instant update for laser precision dot
        updateCursorDot(mouseX, mouseY);

        // Ensure visible
        document.body.classList.remove('cursor-hidden');

        const dx = mouseX - prevMouseX;
        const dy = mouseY - prevMouseY;
        const speed = Math.sqrt(dx * dx + dy * dy);

        // Add to Silk Comet Ribbon Trail
        cometRibbon.push({
            x: mouseX,
            y: mouseY,
            age: 0,
            life: 28,
            width: Math.min(speed * 0.45 + 3, 10)
        });

        // Limit ribbon array size for peak performance
        if (cometRibbon.length > 36) {
            cometRibbon.shift();
        }

        // Emit glowing stardust sparks when moving
        if (speed > 2.8) {
            const count = Math.min(Math.floor(speed / 4.5), 3);
            for (let i = 0; i < count; i++) {
                stardustSparks.push({
                    x: mouseX + (Math.random() - 0.5) * 8,
                    y: mouseY + (Math.random() - 0.5) * 8,
                    vx: (Math.random() - 0.5) * 2 - dx * 0.08,
                    vy: (Math.random() - 0.5) * 2 - dy * 0.08,
                    size: Math.random() * 2.2 + 1.2,
                    alpha: 0.9,
                    decay: Math.random() * 0.025 + 0.02
                });
            }
        }

        prevMouseX = mouseX;
        prevMouseY = mouseY;

        // Update ambient spotlight position directly (dịch lớp — chỉ tốn compositor)
        moveSpotlight(mouseX, mouseY);
        ensurePhysics(); // có chuột động đậy là vòng physics phải thức

        // Calculate 3D Card Tilt relative to window center
        if (CONFIG.effects.enableTilt && tiltContainer) {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            const maxTilt = 7; // degrees

            const deltaX = (mouseX - centerX) / centerX;
            const deltaY = (mouseY - centerY) / centerY;

            targetTiltX = -deltaY * maxTilt;
            targetTiltY = deltaX * maxTilt;

            // Card Glare coordinates
            if (bioCard) {
                const rect = bioCard.getBoundingClientRect();
                const glareX = mouseX - rect.left;
                const glareY = mouseY - rect.top;
                bioCard.style.setProperty('--glare-x', `${glareX}px`);
                bioCard.style.setProperty('--glare-y', `${glareY}px`);
            }
        }
    });

    // Window leave / enter handling
    document.addEventListener('mouseleave', () => {
        document.body.classList.add('cursor-hidden');
        targetTiltX = 0;
        targetTiltY = 0;
        hoveredElement = null;
        ensurePhysics(); // cần vòng lặp chạy để nghiêng card trở về 0 một cách mượt mà
    });

    document.addEventListener('mouseenter', () => {
        document.body.classList.remove('cursor-hidden');
    });

    // Tactile Click Interactions: Mousedown & Mouseup & Ripple
    window.addEventListener('mousedown', () => {
        document.body.classList.add('cursor-clicking');
    });

    window.addEventListener('mouseup', () => {
        document.body.classList.remove('cursor-clicking');
    });

    // Click Shockwave Ring & Stardust Spark Burst
    window.addEventListener('click', (e) => {
        // Create expanding shockwave ripple element
        const ripple = document.createElement('div');
        ripple.className = 'cursor-ripple';
        ripple.style.left = `${e.clientX}px`;
        ripple.style.top = `${e.clientY}px`;
        document.body.appendChild(ripple);
        setTimeout(() => {
            if (ripple && ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 500);

        // Spawn a radiant starburst of 8 micro sparks
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i + (Math.random() - 0.5) * 0.5;
            const burstSpeed = Math.random() * 3.5 + 2.5;
            stardustSparks.push({
                x: e.clientX,
                y: e.clientY,
                vx: Math.cos(angle) * burstSpeed,
                vy: Math.sin(angle) * burstSpeed,
                size: Math.random() * 2.5 + 1.2,
                alpha: 1.0,
                decay: Math.random() * 0.035 + 0.02
            });
        }
    });

    // Cursor hover effects on interactive elements with magnetic awareness
    const interactiveElements = 'a, button, input, .badge-pill, .server-card, .activity-card, .gear-slot, .nav-tab, .music-card, .social-item, .enter-btn, .enter-overlay, .volume-slider';
    document.addEventListener('mouseover', (e) => {
        const target = e.target.closest(interactiveElements);
        if (target) {
            document.body.classList.add('cursor-hover');
            // Magnetic pull targeting small buttons / badges
            if (target.matches('.badge-pill, .social-item, .gear-slot, .audio-btn, .nav-tab, .btn-icon')) {
                hoveredElement = target;
            } else {
                hoveredElement = null;
            }
        }
    });

    document.addEventListener('mouseout', (e) => {
        const target = e.target.closest(interactiveElements);
        if (target) {
            document.body.classList.remove('cursor-hover');
            hoveredElement = null;
        }
    });

    // Smooth physics loop (Lerp + Aerodynamic Stretch)
    //
    // Vòng lặp TỰ NGỦ khi mọi thứ đã đứng yên và TỰ THỨC khi có chuyển động.
    // Trước đây nó chạy 60 khung hình/giây MÃI MÃI dù chuột không nhúc nhích, mỗi
    // khung lại ghi lại transform → trình duyệt phải tính lại style liên tục và
    // giành CPU với chính việc vẽ trang. Không đổi gì về hình ảnh.
    let lastWriteX = NaN, lastWriteY = NaN, lastWriteAngle = NaN, lastWriteSX = NaN, lastWriteSY = NaN;
    let lastTiltXWrite = NaN, lastTiltYWrite = NaN;

    function ensurePhysics() {
        if (physicsId === null) physicsId = requestAnimationFrame(renderPhysics);
    }

    function renderPhysics() {
        physicsId = null;
        let targetX = mouseX;
        let targetY = mouseY;

        // Subtle Magnetic Snap towards element center when hovering small buttons
        if (hoveredElement) {
            const rect = hoveredElement.getBoundingClientRect();
            const elemCenterX = rect.left + rect.width / 2;
            const elemCenterY = rect.top + rect.height / 2;
            targetX = mouseX + (elemCenterX - mouseX) * 0.35;
            targetY = mouseY + (elemCenterY - mouseY) * 0.35;
        }

        // Elastic responsive Cyber Reticle Follower (Spring lerp = 0.18)
        cursorX += (targetX - cursorX) * 0.18;
        cursorY += (targetY - cursorY) * 0.18;

        // Calculate motion velocity of follower
        const vx = cursorX - prevCursorX;
        const vy = cursorY - prevCursorY;
        const speed = Math.sqrt(vx * vx + vy * vy);
        prevCursorX = cursorX;
        prevCursorY = cursorY;

        // Aerodynamic Velocity Stretch & Inertial Rotation
        if (speed > 1.2) {
            const moveAngle = Math.atan2(vy, vx) * (180 / Math.PI);
            let angleDiff = moveAngle - currentAngle;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            currentAngle += angleDiff * 0.14;

            const targetStretch = Math.min(speed * 0.014, 0.32);
            scaleX += (1 + targetStretch - scaleX) * 0.18;
            scaleY += (1 - targetStretch * 0.7 - scaleY) * 0.18;
        } else {
            // Settle smoothly to neutral angle and unit scale
            let angleDiff = 0 - currentAngle;
            while (angleDiff > 180) angleDiff -= 360;
            while (angleDiff < -180) angleDiff += 360;
            currentAngle += angleDiff * 0.08;

            scaleX += (1 - scaleX) * 0.12;
            scaleY += (1 - scaleY) * 0.12;
        }

        // Chỉ ghi style khi giá trị ĐỔI THẬT (dưới 0.02px / 0.05deg là mắt không thấy)
        if (cyberCursor) {
            const moved = !(Math.abs(cursorX - lastWriteX) < 0.02 && Math.abs(cursorY - lastWriteY) < 0.02 &&
                            Math.abs(currentAngle - lastWriteAngle) < 0.05 &&
                            Math.abs(scaleX - lastWriteSX) < 0.002 && Math.abs(scaleY - lastWriteSY) < 0.002);
            if (moved) {
                lastWriteX = cursorX; lastWriteY = cursorY; lastWriteAngle = currentAngle;
                lastWriteSX = scaleX; lastWriteSY = scaleY;
                cyberCursor.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) translate(-50%, -50%) rotate(${currentAngle.toFixed(1)}deg) scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`;
            }
        }

        // Smooth Card Tilt
        if (CONFIG.effects.enableTilt && tiltContainer) {
            currentTiltX += (targetTiltX - currentTiltX) * 0.08;
            currentTiltY += (targetTiltY - currentTiltY) * 0.08;
            // Cùng cách kiểm tra như con trỏ ở trên: khởi tạo NaN thì phép so sánh
            // phải là "chưa đổi?" (phủ định) — nếu viết ngược lại (>=) thì NaN luôn sai
            // và transform KHÔNG BAO GIỜ được ghi, tức mất hẳn hiệu ứng nghiêng card.
            // Ngưỡng 0.002° ≈ 0.04px ở mép card rộng 1140px — dưới một điểm ảnh,
            // nên trạng thái nghỉ của card trùng khít bản cũ.
            const tiltMoved = !(Math.abs(currentTiltX - lastTiltXWrite) < 0.002 &&
                                Math.abs(currentTiltY - lastTiltYWrite) < 0.002);
            if (tiltMoved) {
                lastTiltXWrite = currentTiltX; lastTiltYWrite = currentTiltY;
                tiltContainer.style.transform = `rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;
            }
        }

        // Đứng yên hoàn toàn (con trỏ đã tới đích, nghiêng về 0, không hover gì) → ngủ.
        // Mọi mousemove/mouseleave sẽ đánh thức lại bằng ensurePhysics().
        const still = Math.abs(cursorX - targetX) < 0.05 && Math.abs(cursorY - targetY) < 0.05 &&
                      Math.abs(currentAngle) < 0.05 && Math.abs(scaleX - 1) < 0.002 && Math.abs(scaleY - 1) < 0.002 &&
                      !hoveredElement &&
                      (!(CONFIG.effects.enableTilt && tiltContainer) ||
                       (Math.abs(targetTiltX - currentTiltX) < 0.002 && Math.abs(targetTiltY - currentTiltY) < 0.002));
        if (!still) ensurePhysics();
    }
    ensurePhysics();

    // Hook kiểm thử (chỉ chạy khi URL có ?debug) — xem vòng lặp có ngủ khi đứng yên hay không
    if (new URLSearchParams(location.search).has('debug')) {
        window.__debugPhysics = () => ({ awake: physicsId !== null, wrote: [lastWriteX, lastWriteY, lastWriteAngle] });
    }
}

/* ====================================================================
   6. MONOCHROME PARTICLE & FLUID STARDUST COMET CANVAS
   ==================================================================== */
function initParticleCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || !CONFIG.effects.enableParticles) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    // Ambient floating particles
    const particles = [];
    const particleCount = Math.min(Math.floor((width * height) / 18000), 65);

    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            radius: Math.random() * 1.5 + 0.5,
            speedX: (Math.random() - 0.5) * 0.35,
            speedY: (Math.random() - 0.5) * 0.35,
            alpha: Math.random() * 0.45 + 0.15
        });
    }

    // 4. Shooting Stars Generator (Lâu lâu có sao băng xẹt qua bầu trời)
    const shootingStars = [];
    let nextShootingStarTime = Date.now() + 1200; // Ngay sau khi vào 1.2s sẽ có 1 sao băng đầu tiên

    function spawnShootingStar() {
        if (CONFIG.effects.enableShootingStars === false) return;
        
        // Góc rơi tự nhiên chếch chéo từ 32° đến 52°
        const angleDeg = Math.random() * 20 + 32;
        const angle = (angleDeg * Math.PI) / 180;
        const speed = Math.random() * 12 + 18; // Tốc độ xẹt nhanh, mượt mà

        // Xuất phát từ cạnh trên hoặc mép trái phía trên
        const spawnFromTop = Math.random() > 0.35;
        const startX = spawnFromTop ? Math.random() * (width * 0.9) : -60;
        const startY = spawnFromTop ? -60 : Math.random() * (height * 0.45);

        // Chiều dài vệt đuôi sao băng phát sáng
        const trailLength = Math.random() * 160 + 220;

        shootingStars.push({
            x: startX,
            y: startY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            length: trailLength,
            width: Math.random() * 1.5 + 2.2,
            alpha: 1.0,
            decay: Math.random() * 0.012 + 0.012,
            glowHue: Math.random() > 0.4 ? 'rgba(168, 85, 247, 0.85)' : 'rgba(255, 255, 255, 0.95)',
            sparkTimer: 0
        });

        // Hẹn giờ sao băng tiếp theo xuất hiện ngẫu nhiên sau 4.5s đến 9.5s
        nextShootingStarTime = Date.now() + (Math.random() * 5000 + 4500);
    }

    // Nhấn phím 'S' để gọi sao băng tức thì nếu muốn thử
    window.addEventListener('keydown', (e) => {
        if (e.key && e.key.toLowerCase() === 's') {
            spawnShootingStar();
        }
    });

    function animateParticles() {
        ctx.clearRect(0, 0, width, height);

        // 1. Draw Ambient Floating Particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            p.x += p.speedX;
            p.y += p.speedY;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
            ctx.fill();

            // Connect nearby particles
            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const dx = p.x - p2.x;
                const dy = p.y - p2.y;
                const d2 = dx * dx + dy * dy;

                // So sánh BÌNH PHƯƠNG trước: ~2.000 cặp mỗi khung hình không còn phải
                // khai căn; chỉ khai căn khi hai hạt thật sự đủ gần để vẽ dây nối.
                if (d2 < 11025) { // 105px bình phương
                    const dist = Math.sqrt(d2);
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${0.07 * (1 - dist / 105)})`;
                    ctx.lineWidth = 0.75;
                    ctx.stroke();
                }
            }
        }

        // 2. Draw Fluid Glowing Silk Comet Ribbon Trail (theo chuột)
        if (cometRibbon.length > 2) {
            ctx.save();
            // Age and filter dead points
            for (let i = cometRibbon.length - 1; i >= 0; i--) {
                const pt = cometRibbon[i];
                pt.age++;
                if (pt.age >= pt.life) {
                    cometRibbon.splice(i, 1);
                }
            }

            // Draw smooth spline ribbon with quadratic curve interpolation
            for (let i = cometRibbon.length - 1; i > 0; i--) {
                const pt = cometRibbon[i];
                const prevPt = cometRibbon[i - 1];
                const progress = pt.age / pt.life;
                const alpha = (1 - progress) * 0.45;
                const lineWidth = pt.width * (1 - progress * 0.65);

                ctx.beginPath();
                ctx.moveTo(prevPt.x, prevPt.y);
                const midX = (prevPt.x + pt.x) / 2;
                const midY = (prevPt.y + pt.y) / 2;
                ctx.quadraticCurveTo(prevPt.x, prevPt.y, midX, midY);
                ctx.lineTo(pt.x, pt.y);

                ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 10 * (1 - progress);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 3. Draw Sparkling Stardust Particles
        for (let i = stardustSparks.length - 1; i >= 0; i--) {
            const s = stardustSparks[i];
            s.x += s.vx;
            s.y += s.vy;
            s.vx *= 0.94;
            s.vy *= 0.94;
            s.alpha -= s.decay;

            if (s.alpha <= 0) {
                stardustSparks.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
            ctx.shadowColor = '#ffffff';
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.restore();
        }

        // 4. Draw & Update Shooting Stars (Sao Băng Đằng Sau)
        if (CONFIG.effects.enableShootingStars !== false) {
            if (Date.now() >= nextShootingStarTime) {
                spawnShootingStar();
            }

            for (let i = shootingStars.length - 1; i >= 0; i--) {
                const star = shootingStars[i];
                star.x += star.vx;
                star.y += star.vy;
                star.alpha -= star.decay;

                // Loại bỏ sao băng khi đã mờ hoặc bay ra khỏi khung nhìn
                if (star.alpha <= 0 || star.x > width + 450 || star.y > height + 450) {
                    shootingStars.splice(i, 1);
                    continue;
                }

                // Phát sinh bụi sao lấp lánh dọc theo đường bay
                star.sparkTimer++;
                if (star.sparkTimer % 2 === 0) {
                    stardustSparks.push({
                        x: star.x - (star.vx * 0.25) + (Math.random() - 0.5) * 6,
                        y: star.y - (star.vy * 0.25) + (Math.random() - 0.5) * 6,
                        vx: (Math.random() - 0.5) * 1.2,
                        vy: (Math.random() - 0.5) * 1.2,
                        size: Math.random() * 2.0 + 0.8,
                        alpha: star.alpha * 0.9,
                        decay: Math.random() * 0.035 + 0.02
                    });
                }

                // Tọa độ đuôi sao băng
                const angle = Math.atan2(star.vy, star.vx);
                const tailX = star.x - Math.cos(angle) * star.length;
                const tailY = star.y - Math.sin(angle) * star.length;

                ctx.save();

                // Dải gradient phát quang từ đuôi mờ dần về đầu sáng rực
                const tailGrad = ctx.createLinearGradient(tailX, tailY, star.x, star.y);
                tailGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
                tailGrad.addColorStop(0.5, `rgba(255, 255, 255, ${star.alpha * 0.25})`);
                tailGrad.addColorStop(0.85, `rgba(255, 255, 255, ${star.alpha * 0.75})`);
                tailGrad.addColorStop(1, `rgba(255, 255, 255, ${star.alpha})`);

                ctx.beginPath();
                ctx.moveTo(tailX, tailY);
                ctx.lineTo(star.x, star.y);
                ctx.strokeStyle = tailGrad;
                ctx.lineWidth = star.width;
                ctx.lineCap = 'round';
                ctx.shadowColor = star.glowHue;
                ctx.shadowBlur = 16;
                ctx.stroke();

                // Tâm đầu sao băng rực sáng lấp lánh
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.width * 1.3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
                ctx.shadowColor = '#ffffff';
                ctx.shadowBlur = 22;
                ctx.fill();

                ctx.restore();
            }
        }

        requestAnimationFrame(animateParticles);
    }
    animateParticles();
}

/* ====================================================================
   7. DISCORD REALTIME PRESENCE (Lanyard WebSocket & REST)
   ==================================================================== */
let spotifyProgressInterval = null;

function initLanyardRealtime() {
    // Tắt Discord realtime từ config (discordEnabled: false) hoặc chưa điền ID
    if (CONFIG.discordEnabled === false || !CONFIG.discordId) {
        disableDiscordUI();
        return;
    }

    connectLanyardWebSocket();
}

// Tắt sạch UI phụ thuộc Discord khi discordEnabled: false — trang vẫn là một bio
// hoàn chỉnh (avatar/banner/tên lấy từ CONFIG, không kết nối Lanyard)
function disableDiscordUI() {
    // Vùng presence (status, Spotify, game đang chơi)
    const presenceSection = document.getElementById('presence-section');
    if (presenceSection) presenceSection.style.display = 'none';
    // Dot trạng thái trên avatar + nhãn DISCORD LIVE trên banner
    const statusIndicator = document.getElementById('status-indicator');
    if (statusIndicator) statusIndicator.style.display = 'none';
    const liveBadge = document.querySelector('.banner-badge-top');
    if (liveBadge) liveBadge.style.display = 'none';
    // Nút Copy Discord (không còn ID nào để copy)
    const copyBtn = document.getElementById('copy-tag-btn');
    if (copyBtn) copyBtn.style.display = 'none';
}

function connectLanyardWebSocket() {
    const ws = new WebSocket('wss://api.lanyard.rest/socket');
    let heartbeatInterval = null;

    ws.onopen = () => {
        // Subscribe to Discord User ID
        ws.send(JSON.stringify({
            op: 2,
            d: {
                subscribe_to_id: CONFIG.discordId
            }
        }));
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const { op, t, d } = data;

            // Opcode 1: Hello from Lanyard -> start heartbeat
            if (op === 1) {
                const interval = d.heartbeat_interval;
                heartbeatInterval = setInterval(() => {
                    ws.send(JSON.stringify({ op: 3 }));
                }, interval);
            }

            // Presence update event
            if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
                updateDiscordPresenceUI(d);
            }
        } catch (e) {
            console.error('Lanyard WS parse error:', e);
        }
    };

    ws.onerror = () => {
        fetchLanyardREST();
    };

    ws.onclose = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        // Fallback to REST polling if WebSocket disconnects
        setTimeout(fetchLanyardREST, 5000);
    };
}

async function fetchLanyardREST() {
    try {
        const res = await fetch(`https://api.lanyard.rest/v1/users/${CONFIG.discordId}`);
        if (res.status === 404) {
            setMockDiscordState(true);
            setTimeout(fetchLanyardREST, 4000);
            return;
        }
        const json = await res.json();
        if (json && json.success && json.data) {
            updateDiscordPresenceUI(json.data);
        } else {
            setMockDiscordState(true);
            setTimeout(fetchLanyardREST, 4000);
        }
    } catch (e) {
        setMockDiscordState(false);
        setTimeout(fetchLanyardREST, 5000);
    }
}

function updateDiscordPresenceUI(data) {
    if (!data) return;

    const { discord_user, discord_status, activities, listening_to_spotify, spotify } = data;

    // 1. Update Avatar & Decoration live from Discord API
    const liveAvatarUrl = (discord_user && discord_user.avatar)
        ? `https://cdn.discordapp.com/avatars/${discord_user.id}/${discord_user.avatar}.${discord_user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
        : null;

    if (liveAvatarUrl) {
        const avatarEl = document.getElementById('profile-avatar');
        if (avatarEl) setImgWithFallback(avatarEl, liveAvatarUrl, LOCAL_AVATAR_FALLBACK);
        const enterAvatarEl = document.querySelector('.cute-avatar-img, .enter-avatar-img');
        if (enterAvatarEl) setImgWithFallback(enterAvatarEl, liveAvatarUrl, LOCAL_AVATAR_FALLBACK);
    }

    // Avatar decoration (live from Discord)
    const decorationAsset = discord_user && discord_user.avatar_decoration_data
        ? discord_user.avatar_decoration_data.asset
        : null;
    document.querySelectorAll('.avatar-decoration').forEach(el => {
        if (decorationAsset) {
            const url = `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png`;
            if (el.getAttribute('src') !== url) setImgWithFallback(el, url, 'deco-me.webp');
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });

    // Lưu cache avatar + khung của bản thân (dùng cho lần Lanyard/CDN chết)
    if (liveAvatarUrl) {
        saveVisualCache(CONFIG.discordId, liveAvatarUrl,
            decorationAsset ? `https://cdn.discordapp.com/avatar-decoration-presets/${decorationAsset}.png` : null,
            LOCAL_AVATAR_FALLBACK, 'deco-me.webp');
    }

    // 1b. Đồng bộ TÊN HIỂN THỊ + USERNAME theo tài khoản Discord
    // Thứ tự ưu tiên: global_name (tên hiển thị) > display_name > username
    if (discord_user) {
        const liveName = discord_user.global_name || discord_user.display_name || discord_user.username;
        const liveHandle = (discord_user.discriminator && discord_user.discriminator !== '0')
            ? `${discord_user.username}#${discord_user.discriminator}`
            : `@${discord_user.username}`;

        if (liveName && CONFIG.profile.syncNameWithDiscord !== false) {
            const nameEl = document.getElementById('user-display-name');
            if (nameEl) nameEl.textContent = liveName;
            const enterNameEl = document.querySelector('.cute-name, .enter-name');
            if (enterNameEl) enterNameEl.textContent = liveName;
            // (Tiêu đề tab tự chạy theo titleText() ở startTitleTyping, không cần ghi lại)
            CONFIG.profile.name = liveName;
        }

        if (liveHandle) {
            const handleEl = document.getElementById('user-handle');
            if (handleEl) handleEl.textContent = liveHandle;
            CONFIG.profile.username = discord_user.username;
        }

        // Giữ config luôn khớp với tài khoản đang đăng nhập
        if (liveAvatarUrl) CONFIG.profile.avatar = liveAvatarUrl;
    }

    // 2. Update Status Dot & Top Banner Status
    const statusDot = document.querySelector('.status-dot');
    const headerStatusText = document.getElementById('header-status-text');

    if (statusDot) {
        statusDot.className = `status-dot ${discord_status}`;
    }

    if (headerStatusText) {
        headerStatusText.textContent = `DISCORD • ${discord_status.toUpperCase()}`;
    }

    // 3. Custom Status (activity type 4)
    const customStatus = activities ? activities.find(a => a.type === 4) : null;
    const customStatusEmoji = document.getElementById('custom-status-emoji');
    const customStatusText = document.getElementById('custom-status-text');

    if (customStatus) {
        let emoji = '💬';
        if (customStatus.emoji) {
            if (customStatus.emoji.id) {
                emoji = `<img src="https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.png" style="width:20px;height:20px;vertical-align:middle;">`;
            } else if (customStatus.emoji.name) {
                emoji = customStatus.emoji.name;
            }
        }
        if (customStatusEmoji) customStatusEmoji.innerHTML = emoji;
        if (customStatusText) customStatusText.textContent = customStatus.state || 'Online on Discord';
    } else {
        if (customStatusEmoji) customStatusEmoji.textContent = '⚡';
        if (customStatusText) customStatusText.textContent = `Status: ${discord_status.toUpperCase()} • Available`;
    }

    // 4. Spotify Live Activity
    const spotifyCard = document.getElementById('spotify-card');
    const spotifyArt = document.getElementById('spotify-album-art');
    const spotifyTrack = document.getElementById('spotify-track');
    const spotifyArtist = document.getElementById('spotify-artist');
    const spotifyTimeCurrent = document.getElementById('spotify-time-current');
    const spotifyTimeTotal = document.getElementById('spotify-time-total');
    const spotifyProgressFill = document.getElementById('spotify-progress-fill');

    if (spotifyProgressInterval) clearInterval(spotifyProgressInterval);

    if (listening_to_spotify && spotify) {
        if (spotifyCard) spotifyCard.style.display = 'flex';
        if (spotifyArt) spotifyArt.src = spotify.album_art_url;
        if (spotifyTrack) spotifyTrack.textContent = spotify.song;
        if (spotifyArtist) spotifyArtist.textContent = `by ${spotify.artist}`;

        const duration = spotify.timestamps.end - spotify.timestamps.start;
        if (spotifyTimeTotal) spotifyTimeTotal.textContent = formatMs(duration);

        function updateProgress() {
            const elapsed = Date.now() - spotify.timestamps.start;
            const clamped = Math.max(0, Math.min(elapsed, duration));
            const pct = (clamped / duration) * 100;

            if (spotifyTimeCurrent) spotifyTimeCurrent.textContent = formatMs(clamped);
            if (spotifyProgressFill) spotifyProgressFill.style.width = `${pct}%`;

            if (elapsed >= duration) {
                clearInterval(spotifyProgressInterval);
            }
        }

        updateProgress();
        spotifyProgressInterval = setInterval(updateProgress, 1000);
    } else {
        if (spotifyCard) spotifyCard.style.display = 'none';
    }

    // 5. Game / Other Activity (type 0, 1, 2, 3, 5)
    const gameActivity = activities ? activities.find(a => a.type !== 4) : null;
    const gameCard = document.getElementById('game-card');
    const gameArt = document.getElementById('game-art');
    const gameName = document.getElementById('game-name');
    const gameState = document.getElementById('game-state');
    const gameDetails = document.getElementById('game-details-text');
    const gameBadge = document.getElementById('game-badge');

    if (gameActivity) {
        if (gameCard) gameCard.style.display = 'flex';
        if (gameName) gameName.textContent = gameActivity.name;
        if (gameState) gameState.textContent = gameActivity.state || 'Active now';
        if (gameDetails) gameDetails.textContent = gameActivity.details || '';

        // Resolve Image
        if (gameArt) {
            if (gameActivity.assets && gameActivity.assets.large_image) {
                let imgUrl = gameActivity.assets.large_image;
                if (imgUrl.startsWith('mp:external/')) {
                    imgUrl = 'https://media.discordapp.net/' + imgUrl.replace('mp:', '');
                } else if (gameActivity.application_id) {
                    imgUrl = `https://cdn.discordapp.com/app-assets/${gameActivity.application_id}/${imgUrl}.png`;
                }
                gameArt.src = imgUrl;
                gameArt.style.display = 'block';
            } else {
                gameArt.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=200&auto=format&fit=crop';
            }
        }

        if (gameBadge) {
            let label = 'PLAYING GAME';
            let icon = 'fa-gamepad';
            if (gameActivity.name.toLowerCase().includes('visual studio code') || gameActivity.name.toLowerCase().includes('code')) {
                label = 'DEVELOPING';
                icon = 'fa-code';
            } else if (gameActivity.type === 2) {
                label = 'LISTENING';
                icon = 'fa-headphones';
            } else if (gameActivity.type === 3) {
                label = 'STREAMING / WATCHING';
                icon = 'fa-video';
            }
            gameBadge.innerHTML = `<i class="fa-solid ${icon}"></i> ${label}`;
        }
    } else {
        if (gameCard) gameCard.style.display = 'none';
    }
}

function setMockDiscordState(is404 = false) {
    const statusDot = document.querySelector('.status-dot');
    const headerStatusText = document.getElementById('header-status-text');
    const customStatusEmoji = document.getElementById('custom-status-emoji');
    const customStatusText = document.getElementById('custom-status-text');

    if (statusDot) statusDot.className = 'status-dot offline';
    if (headerStatusText) headerStatusText.textContent = 'DISCORD • STANDBY';

    if (customStatusEmoji) customStatusEmoji.innerHTML = '⚡';
    if (customStatusText) {
        if (is404) {
            customStatusText.innerHTML = `Chưa kích hoạt Lanyard • <a href="https://discord.gg/lanyard" target="_blank" rel="noopener noreferrer" style="color:#ffffff;text-decoration:underline;font-weight:700;">Tham gia server discord.gg/lanyard để kích hoạt</a>`;
        } else {
            customStatusText.textContent = 'Đang kết nối Discord Lanyard...';
        }
    }
}

function formatMs(ms) {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
}

/* ====================================================================
   8. REALTIME CLOCK IN FOOTER
   ==================================================================== */
function initLocalClock() {
    const clockEl = document.getElementById('local-time');
    if (!clockEl) return;

    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        clockEl.textContent = `${timeStr} (GMT+7)`;
    }

    updateClock();
    setInterval(updateClock, 1000);
}

/* ====================================================================
   8.1 TIME-BASED GREETING (Typewriter)
   ==================================================================== */
function initGreeting() {
    const greetingEl = document.getElementById('greeting-text');
    if (!greetingEl) return;

    function computeGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return `Chào buổi sáng ☀️`;
        if (hour >= 11 && hour < 13) return `Chào buổi trưa 🌤️`;
        if (hour >= 13 && hour < 18) return `Chào buổi chiều 🌇`;
        if (hour >= 18 && hour < 22) return `Chào buổi tối 🌙`;
        return `Khuya rồi, ngủ ngon nhé 💤`;
    }

    // Animate typing a full string character by character
    function typeText(text, done) {
        const arr = Array.from(text);
        let i = 0;
        greetingEl.textContent = '';
        function step() {
            if (i < arr.length) {
                greetingEl.textContent += arr[i];
                i++;
                setTimeout(step, 55);
            } else if (done) {
                done();
            }
        }
        step();
    }

    // Animate deleting the current string character by character
    function deleteText(done) {
        function step() {
            const arr = Array.from(greetingEl.textContent);
            if (arr.length > 0) {
                arr.pop();
                greetingEl.textContent = arr.join('');
                setTimeout(step, 25);
            } else {
                done();
            }
        }
        step();
    }

    let currentGreeting = computeGreeting();

    // Continuous typewriter loop: type -> pause -> delete -> (refresh time) -> repeat
    function loop() {
        typeText(currentGreeting, () => {
            setTimeout(() => {
                deleteText(() => {
                    const next = computeGreeting();
                    if (next !== currentGreeting) currentGreeting = next;
                    setTimeout(loop, 350);
                });
            }, 2600);
        });
    }

    loop();
}

/* ====================================================================
   9. TOAST NOTIFICATIONS & AUDIO EFFECTS
   ==================================================================== */
function showToast(message, icon = 'fa-solid fa-circle-check') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}

function playBeepSound(freq = 520, duration = 0.08) {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {
        // Silent catch for audio context restrictions
    }
}
