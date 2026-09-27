/**
 * ADMIN — sinh config.js từ form trực quan.
 * File riêng (CSP của trang cấm inline script). Không dùng thư viện ngoài.
 *
 * Cách hoạt động:
 *  - Bấm "Nạp config hiện có": fetch config.js và đọc object CONFIG (tự nạp form).
 *    CSP cấm eval nên dùng Function constructor — bị chặn thì báo mời điền tay,
 *    mọi tính năng khác vẫn hoạt động.
 *  - Bấm "Tải config.js": xuất toàn bộ form thành file config.js hoàn chỉnh
 *    (Blob download — hoạt động cả khi mở file:// lẫn qua http server).
 */

/* ---------------- helpers ---------------- */
const $ = (id) => document.getElementById(id);
const val = (id) => ($(id) ? $(id).value.trim() : '');
const num = (id, fallback = 0) => {
    const n = parseFloat(val(id));
    return Number.isFinite(n) ? n : fallback;
};
const lines = (id) => val(id).split('\n').map(s => s.trim()).filter(Boolean);
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
const q = (s) => `"${esc(s)}"`;
const toastEl = $('toast');

function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

/* ---------------- danh sách động (rows) ---------------- */
function makeRow(container, placeholder, fields) {
    const row = document.createElement('div');
    row.className = 'row';
    const head = document.createElement('div');
    head.className = 'row-head';
    head.innerHTML = `<b>${placeholder}</b>`;
    const del = document.createElement('button');
    del.className = 'btn-danger';
    del.innerHTML = '<i class="fa-solid fa-trash"></i>';
    del.onclick = () => { row.remove(); renumber(container); };
    head.appendChild(del);
    row.appendChild(head);

    const grid = document.createElement('div');
    grid.className = 'grid2';
    const inputs = {};
    fields.forEach(([id, label, isTextarea]) => {
        const wrap = document.createElement('label');
        const b = document.createElement('b');
        b.textContent = label;
        wrap.appendChild(b);
        let input;
        if (isTextarea) {
            input = document.createElement('textarea');
            input.rows = 2;
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        input.dataset.field = id;
        wrap.appendChild(input);
        (fields.length > 2 ? grid : row).appendChild(wrap);
        inputs[id] = input;
    });
    if (fields.length > 2) row.appendChild(grid);
    container.appendChild(row);
    renumber(container);
    return inputs;
}

function renumber(container) {
    [...container.querySelectorAll('.row')].forEach((row, i) => {
        const b = row.querySelector('.row-head b');
        if (b && b.textContent.startsWith('#')) b.textContent = `#${i + 1}`;
    });
}

const addBadge = () => makeRow($('badge-list'), '#', [['icon', 'Icon FontAwesome'], ['label', 'Nhãn hiển thị'], ['color', 'Màu chữ (tuỳ chọn)']]);
const addSocial = () => makeRow($('social-list'), '#', [['name', 'Tên mạng'], ['icon', 'Icon FontAwesome'], ['url', 'Link'], ['copy', 'Nội dung copy (tuỳ chọn)']]);
const addServer = () => makeRow($('server-list'), '#', [['name', 'Tên server'], ['inviteUrl', 'Link invite vĩnh viễn'], ['role', 'Vai trò'], ['description', 'Mô tả (textarea)', true], ['tag', 'Nhãn góc card']]);
const addTrack = () => makeRow($('track-list'), '#', [['title', 'Tên bài'], ['artist', 'Ca sĩ'], ['url', 'File mp3']]);
const addTech = () => makeRow($('tech-list'), '#', [['name', 'Tên sở thích'], ['domain', 'Chi tiết nhỏ'], ['icon', 'Icon FontAwesome']]);

/* ---------------- nạp form từ object CONFIG ---------------- */
function fillForm(cfg) {
    const site = cfg.site || {};
    $('site-fullName').value = site.fullName || '';
    $('site-domain').value = site.domain || '';
    $('siteName').value = cfg.siteName || '';
    $('site-monogram').value = site.monogram || '';
    $('site-description').value = site.description || '';
    $('site-welcomeText').value = site.welcomeText || '';
    $('site-enterLabel').value = site.enterLabel || '';
    $('site-footerSuffix').value = site.footerSuffix || '';
    $('site-footerBrand').value = site.footerBrand || '';

    $('discordId').value = cfg.discordId || '';

    const p = cfg.profile || {};
    $('profile-name').value = p.name || '';
    $('profile-username').value = p.username || '';
    $('profile-title').value = p.title || '';
    $('profile-sync').checked = p.syncNameWithDiscord !== false;
    $('profile-bio').value = p.bio || '';
    $('profile-location').value = p.location || '';
    $('profile-banner').value = p.banner || '';
    $('profile-avatar').value = p.avatar || '';
    $('profile-avatarLocal').value = p.avatarLocal || '';
    $('profile-quotes').value = (p.quotes || []).join('\n');
    fillRows('badge-list', p.badges || [], addBadge, ['icon', 'label', 'color']);
    // Mục Donate (action: 'donate') không vào form — điều khiển bằng checkbox ở phần 3
    fillRows('social-list', (cfg.socials || []).filter(s => s.action !== 'donate'), addSocial, ['name', 'icon', 'url', 'copy']);

    const donate = cfg.donate || {};
    $('donate-qrImage').value = donate.qrImage || '';
    $('donate-bankName').value = donate.bankName || '';
    $('donate-accountName').value = donate.accountName || '';
    $('donate-accountNumber').value = donate.accountNumber || '';
    $('donate-note').value = donate.note || '';

    fillRows('server-list', cfg.servers || [], addServer, ['name', 'inviteUrl', 'role', 'description', 'tag']);

    const music = cfg.music || {};
    $('music-autoplay').checked = !!music.autoplayOnEnter;
    $('music-volume').value = music.volume ?? 1;
    fillRows('track-list', music.playlist || [], addTrack, ['title', 'artist', 'url']);

    const love = cfg.setlove || {};
    $('love-myName').value = love.myName || '';
    $('love-partnerName').value = love.partnerName || '';
    $('love-myId').value = love.myDiscordId || '';
    $('love-partnerId').value = love.partnerDiscordId || '';
    $('love-startDate').value = love.startDate || '';
    $('love-quotes').value = (love.quotes || []).join('\n');
    $('love-photos').value = (love.photos || []).map(ph => `${ph.src || ''} | ${ph.caption || ''}`).join('\n');

    const visuals = Object.entries(love.localVisuals || {});
    if (visuals.length >= 1 && visuals[0][1]) {
        $('love-myAvatarLocal').value = visuals[0][1].avatar || '';
        $('love-myDecoLocal').value = visuals[0][1].deco || '';
    }
    if (visuals.length >= 2 && visuals[1][1]) $('love-partnerAvatarLocal').value = visuals[1][1].avatar || '';

    fillRows('tech-list', cfg.techStack || [], addTech, ['name', 'domain', 'icon']);

    const eff = cfg.effects || {};
    $('effects-tilt').checked = eff.enableTilt !== false;
    $('effects-spotlight').checked = eff.enableSpotlight !== false;
    $('effects-cursor').checked = eff.enableCustomCursor !== false;
    $('effects-particles').checked = eff.enableParticles !== false;
    $('effects-stars').checked = eff.enableShootingStars !== false;
}

function fillRows(listId, items, addFn, fields) {
    $(listId).innerHTML = '';
    items.forEach(item => {
        const inputs = addFn();
        fields.forEach(f => { if (inputs[f]) inputs[f].value = item[f] ?? ''; });
    });
}

function collectRows(listId, fields, mapFn) {
    return [...$(listId).querySelectorAll('.row')].map(row => {
        const data = {};
        row.querySelectorAll('[data-field]').forEach(inp => { data[inp.dataset.field] = inp.value.trim(); });
        return mapFn(data);
    }).filter(Boolean);
}

/* ---------------- sinh config.js ---------------- */
function buildConfig() {
    const socials = collectRows('social-list', null, d => {
        if (!d.name) return null;
        const s = { name: d.name, icon: d.icon || 'fa-solid fa-link' };
        if (d.copy) s.copy = d.copy; else s.url = d.url;
        return s;
    });
    if ($('social-donate').checked) {
        socials.push({ name: 'Donate', icon: 'fa-solid fa-qrcode', action: 'donate', highlight: true });
    }

    const visuals = {};
    const myId = val('love-myId');
    const partnerId = val('love-partnerId');
    if (myId) visuals[myId] = { avatar: val('love-myAvatarLocal') || null, deco: val('love-myDecoLocal') || null };
    if (partnerId) visuals[partnerId] = { avatar: val('love-partnerAvatarLocal') || null, deco: null };

    const photos = lines('love-photos').map(line => {
        const [src, ...rest] = line.split('|');
        if (!src.trim()) return null;
        return { src: src.trim(), caption: rest.join('|').trim() };
    }).filter(Boolean);

    const cfg = {
        site: {
            fullName: val('site-fullName'),
            domain: val('site-domain'),
            description: val('site-description'),
            welcomeText: val('site-welcomeText'),
            enterLabel: val('site-enterLabel'),
            footerBrand: val('site-footerBrand'),
            footerSuffix: val('site-footerSuffix'),
            monogram: val('site-monogram'),
        },
        siteName: val('siteName'),
        discordId: val('discordId'),
        profile: {
            name: val('profile-name'),
            syncNameWithDiscord: $('profile-sync').checked,
            username: val('profile-username'),
            title: val('profile-title'),
            avatar: val('profile-avatar'),
            avatarLocal: val('profile-avatarLocal'),
            banner: val('profile-banner'),
            bio: val('profile-bio'),
            location: val('profile-location'),
            quotes: lines('profile-quotes'),
            badges: collectRows('badge-list', null, d => d.icon ? { icon: d.icon, label: d.label, color: d.color || '#ffffff' } : null),
        },
        servers: collectRows('server-list', null, d => d.inviteUrl ? {
            name: d.name, role: d.role, description: d.description, inviteUrl: d.inviteUrl,
            icon: '', banner: 'profile_banner_cyber.webp', cdnIcon: '', cdnBanner: 'profile_banner_cyber.webp',
            members: '', online: '', tag: d.tag || 'COMMUNITY', featured: true,
        } : null),
        socials,
        donate: {
            qrImage: val('donate-qrImage') || 'qr-bank.png',
            bankName: val('donate-bankName'),
            accountName: val('donate-accountName'),
            accountNumber: val('donate-accountNumber'),
            note: val('donate-note'),
        },
        setlove: {
            myName: val('love-myName'),
            partnerName: val('love-partnerName'),
            myDiscordId: myId,
            partnerDiscordId: partnerId,
            localVisuals: visuals,
            startDate: val('love-startDate'),
            photos,
            quotes: lines('love-quotes'),
        },
        music: {
            autoplayOnEnter: $('music-autoplay').checked,
            volume: num('music-volume', 1),
            playlist: collectRows('track-list', null, d => d.url ? { title: d.title, artist: d.artist, url: d.url } : null),
            title: '', artist: '', url: '',
        },
        effects: {
            enableTilt: $('effects-tilt').checked,
            enableSpotlight: $('effects-spotlight').checked,
            enableCustomCursor: $('effects-cursor').checked,
            enableParticles: $('effects-particles').checked,
            enableShootingStars: $('effects-stars').checked,
        },
        techStack: collectRows('tech-list', null, d => d.name ? { name: d.name, domain: d.domain, icon: d.icon } : null),
    };
    return cfg;
}

// In object JS với thụt dòng 4 space cho dễ đọc/sửa tay sau này
function printJS(value, indent = 0) {
    const pad = '    '.repeat(indent);
    const padIn = '    '.repeat(indent + 1);
    if (Array.isArray(value)) {
        if (value.length === 0) return '[]';
        const items = value.map(v => `${padIn}${printJS(v, indent + 1)}`);
        return `[\n${items.join(',\n')}\n${pad}]`;
    }
    if (value && typeof value === 'object') {
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';
        const items = keys
            .filter(k => value[k] !== undefined)
            .map(k => {
                const v = value[k];
                if (v === '' || v === null) return `${padIn}${k}: "",`;
                return `${padIn}${k}: ${printJS(v, indent + 1)},`;
            });
        return `{\n${items.join('\n')}\n${pad}}`;
    }
    if (typeof value === 'boolean' || typeof value === 'number') return String(value);
    return q(value ?? '');
}

function buildConfigFile() {
    const cfg = buildConfig();
    const header = `/**
 * ====================================================================
 *                 BIO PAGE - CẤU HÌNH TÙY CHỈNH (CONFIG)
 * ====================================================================
 * File được sinh bởi trang admin.html — vẫn có thể sửa tay bình thường.
 * Sau khi lưu file này, chạy \`node setup.mjs\` để đồng bộ phần còn lại.
 */

const CONFIG = ${printJS(cfg)};
`;
    return header;
}

/* ---------------- sự kiện ---------------- */
$('add-badge').onclick = addBadge;
$('add-social').onclick = addSocial;
$('add-server').onclick = addServer;
$('add-track').onclick = addTrack;
$('add-tech').onclick = addTech;

$('btn-download').onclick = () => {
    if (!val('site-domain')) {
        toast('⚠️ Chưa điền Domain (phần 0)');
        $('site-domain').focus();
        return;
    }
    if (!val('discordId')) {
        toast('⚠️ Chưa điền Discord User ID (phần 1)');
        $('discordId').focus();
        return;
    }
    const blob = new Blob([buildConfigFile()], { type: 'text/javascript;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'config.js';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('✓ Đã tải config.js — thay file trong thư mục trang rồi chạy node setup.mjs');
};

$('btn-copy').onclick = async () => {
    try {
        await navigator.clipboard.writeText(buildConfigFile());
        toast('✓ Đã copy nội dung config.js vào clipboard');
    } catch {
        toast('Không copy được — hãy dùng nút Tải config.js');
    }
};

$('btn-reload').onclick = async () => {
    const status = $('load-status');
    try {
        const res = await fetch('config.js', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const src = await res.text();
        const cfg = new Function(`${src}\n;return CONFIG;`)(); // CSP eval-block vẫn tính là lỗi → rơi vào catch
        fillForm(cfg);
        status.textContent = '✓ Đã nạp config hiện có';
        status.className = 'ok';
        toast('✓ Đã nạp thông tin từ config.js hiện tại');
    } catch (e) {
        status.textContent = 'Không tự nạp được — điền tay (vẫn dùng được đầy đủ)';
        status.className = 'warn';
        toast('Không đọc được config.js hiện có — hãy điền trực tiếp vào form');
    }
};

// Tự nạp khi mở qua http server (mở file:// thì fetch bị chặn — điền tay)
(async () => {
    const status = $('load-status');
    if (location.protocol === 'file:') {
        status.textContent = 'Mở qua python3 -m http.server 8000 để tự nạp config';
        status.className = 'warn';
        return;
    }
    try {
        const res = await fetch('config.js', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const cfg = new Function(`${await res.text()}\n;return CONFIG;`)();
        fillForm(cfg);
        status.textContent = '✓ Đã nạp config hiện có — sửa rồi tải lại';
        status.className = 'ok';
    } catch {
        status.textContent = 'Không tự nạp được — điền tay (vẫn dùng được đầy đủ)';
        status.className = 'warn';
    }
})();
