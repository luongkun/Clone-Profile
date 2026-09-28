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
// Giới hạn dung lượng ảnh nhúng vào config.js: lớn hơn thì cảnh báo (file config
// phình to làm trang chậm đi khi tải lần đầu)
const AVATAR_MAX_BYTES = 300 * 1024;
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
const addServer = () => {
    const inputs = makeRow($('server-list'), '#', [['name', 'Tên nhóm/server'], ['inviteUrl', 'Link tham gia (invite Discord hoặc link nhóm Zalo)'], ['role', 'Vai trò'], ['description', 'Mô tả (textarea)', true], ['tag', 'Nhãn góc card']]);
    // Ô chọn loại nhóm: Discord (realtime) hoặc Zalo (nút Join + QR tuỳ chọn)
    const row = inputs.name.closest('.row');
    const grid = row.querySelector('.grid2');
    const typeWrap = document.createElement('label');
    typeWrap.innerHTML = '<b>Loại nhóm</b>';
    const typeSelect = document.createElement('select');
    typeSelect.dataset.field = 'type';
    typeSelect.innerHTML = '<option value="discord">Discord (icon + số member realtime)</option>' +
        '<option value="zalo">Zalo (nút Join mở link — QR tuỳ chọn)</option>';
    typeWrap.appendChild(typeSelect);
    grid.appendChild(typeWrap);

    // Ảnh QR nhóm Zalo: tải thẳng trong form (nhúng base64 vào config.js) —
    // người mua không cần gửi file riêng. Cũng chấp nhận đường dẫn file (vd zalo-qr.png).
    const qrWrap = document.createElement('label');
    qrWrap.innerHTML = '<b>Ảnh QR nhóm Zalo (tuỳ chọn)</b> <small>chỉ cần khi KHÔNG điền link — hoặc để khách quét cho nhanh</small>';
    const qrRow = document.createElement('div');
    qrRow.style.cssText = 'display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
    const qrBtn = document.createElement('button');
    qrBtn.type = 'button';
    qrBtn.className = 'btn-mini';
    qrBtn.innerHTML = '<i class="fa-solid fa-camera"></i>Chọn ảnh QR';
    const qrFile = document.createElement('input');
    qrFile.type = 'file';
    qrFile.accept = 'image/*';
    qrFile.hidden = true;
    const qrThumb = document.createElement('span');
    qrThumb.style.cssText = 'display:inline-flex;align-items:center;gap:6px;font-size:0.75rem;color:var(--text-muted,#9aa);';
    const qrClear = document.createElement('button');
    qrClear.type = 'button';
    qrClear.className = 'btn-danger';
    qrClear.innerHTML = '<i class="fa-solid fa-xmark"></i>';
    qrClear.hidden = true;
    qrRow.append(qrBtn, qrFile, qrThumb, qrClear);
    qrWrap.appendChild(qrRow);
    const qrInput = document.createElement('input');
    qrInput.type = 'hidden';
    qrInput.dataset.field = 'zaloQrImage';
    qrWrap.appendChild(qrInput);
    grid.appendChild(qrWrap);

    const refreshQr = () => {
        const v = qrInput.value;
        qrClear.hidden = !v;
        if (!v) {
            qrThumb.innerHTML = '<i class="fa-solid fa-qrcode"></i> chưa có';
        } else if (v.startsWith('data:')) {
            qrThumb.innerHTML = `<img src="${v}" alt="" style="height:34px;border-radius:6px;border:1px solid rgba(255,255,255,.25)"> <span>✓ đã nhúng vào config</span>`;
        } else {
            qrThumb.innerHTML = `<i class="fa-solid fa-file-image"></i> ${v.replace(/[<>&]/g, '')}`;
        }
    };
    qrBtn.addEventListener('click', () => qrFile.click());
    qrFile.addEventListener('change', () => {
        const f = qrFile.files[0];
        if (!f) return;
        if (!f.type.startsWith('image/')) { toast('✗ Chỉ nhận file ảnh'); return; }
        if (f.size > 500 * 1024) { toast(`✗ Ảnh ${Math.round(f.size / 1024)}KB — nén nhỏ lại (tối đa ~500KB)`); return; }
        const reader = new FileReader();
        reader.onload = () => {
            qrInput.value = reader.result;
            refreshQr();
            toast('✓ Ảnh QR nhóm Zalo đã sẵn sàng nhúng vào config.js');
        };
        reader.readAsDataURL(f);
    });
    qrClear.addEventListener('click', () => { qrInput.value = ''; qrFile.value = ''; refreshQr(); });
    qrInput.addEventListener('change', refreshQr);

    const syncQrField = () => { qrWrap.style.display = typeSelect.value === 'zalo' ? '' : 'none'; };
    typeSelect.addEventListener('change', syncQrField);
    syncQrField();
    refreshQr();
    // Đưa 2 ô mới vào map để fillRows nạp được giá trị từ config khi mở form
    inputs.type = typeSelect;
    inputs.zaloQrImage = qrInput;
    return inputs;
};
const addTrack = () => makeRow($('track-list'), '#', [['title', 'Tên bài'], ['artist', 'Ca sĩ'], ['url', 'File mp3']]);
const addTech = () => makeRow($('tech-list'), '#', [['name', 'Tên sở thích'], ['domain', 'Chi tiết nhỏ'], ['icon', 'Icon FontAwesome']]);

/* ---------------- nạp form từ object CONFIG ---------------- */
function fillForm(cfg) {
    const site = cfg.site || {};
    $('site-fullName').value = site.fullName || '';
    $('site-domain').value = site.domain || '';
    $('site-artistName').value = site.artistName || '';
    $('siteName').value = cfg.siteName || '';
    $('site-monogram').value = site.monogram || '';
    $('site-description').value = site.description || '';
    $('site-welcomeText').value = site.welcomeText || '';
    $('site-enterLabel').value = site.enterLabel || '';
    $('site-footerSuffix').value = site.footerSuffix || '';

    $('discordId').value = cfg.discordId || '';
    // Công tắc Discord: mặc định BẬT trừ khi config ghi rõ discordEnabled: false
    $('discord-enabled').checked = cfg.discordEnabled !== false;

    const p = cfg.profile || {};
    $('profile-name').value = p.name || '';
    $('profile-username').value = p.username || '';
    $('profile-title').value = p.title || '';
    $('profile-sync').checked = p.syncNameWithDiscord !== false;
    $('profile-bio').value = p.bio || '';
    $('profile-location').value = p.location || '';
    $('profile-banner').value = p.banner || '';
    $('profile-bannerData').value = p.bannerData || '';
    $('profile-avatar').value = p.avatar || '';
    $('profile-avatarData').value = p.avatarData || '';
    updateAvatarUploadUI();
    $('profile-avatarLocal').value = p.avatarLocal || '';
    $('profile-quotes').value = (p.quotes || []).join('\n');
    fillRows('badge-list', p.badges || [], addBadge, ['icon', 'label', 'color']);
    // Mục Donate (action: 'donate') không vào form — điều khiển bằng checkbox ở phần 3
    fillRows('social-list', (cfg.socials || []).filter(s => s.action !== 'donate'), addSocial, ['name', 'icon', 'url', 'copy']);

    const donate = cfg.donate || {};
    // Nút Donate trong socials là nguồn sự thật: enabled lấy theo có nút hay không
    $('social-donate').checked = (cfg.socials || []).some(s => s.action === 'donate') && donate.enabled !== false;
    $('donate-qrImage').value = donate.qrImage || '';
    $('donate-bankName').value = donate.bankName || '';
    $('donate-accountName').value = donate.accountName || '';
    $('donate-accountNumber').value = donate.accountNumber || '';
    $('donate-note').value = donate.note || '';

    fillRows('server-list', cfg.servers || [], addServer, ['name', 'inviteUrl', 'role', 'description', 'tag', 'type', 'zaloQrImage']);

    // Tiêu đề section nhóm (serversTitle) — để trống là dùng mặc định
    const st = cfg.serversTitle || {};
    $('servers-title-zalo').value = st.zalo || '';
    $('servers-title-combined').value = st.combined || '';
    $('servers-title-discord').value = st.discord || '';

    const music = cfg.music || {};
    $('music-enabled').checked = music.enabled !== false;
    $('music-autoplay').checked = !!music.autoplayOnEnter;
    $('music-volume').value = music.volume ?? 1;
    fillRows('track-list', music.playlist || [], addTrack, ['title', 'artist', 'url']);

    const love = cfg.setlove || {};
    $('setlove-enabled').checked = love.enabled !== false;
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
    $('love-partnerAvatarData').value = love.partnerAvatarData || '';

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
        fields.forEach(f => {
            if (inputs[f]) {
                inputs[f].value = item[f] ?? '';
                // select tự ẩn/hiện theo giá trị cần được đồng bộ sau khi nạp
                inputs[f].dispatchEvent(new Event('change'));
            }
        });
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
    // Ảnh người ấy tải lên (base64) — ưu tiên cao hơn localVisuals

    const photos = lines('love-photos').map(line => {
        const [src, ...rest] = line.split('|');
        if (!src.trim()) return null;
        return { src: src.trim(), caption: rest.join('|').trim() };
    }).filter(Boolean);

    const cfg = {
        site: {
            fullName: val('site-fullName'),
            domain: val('site-domain'),
            artistName: val('site-artistName'),
            description: val('site-description'),
            welcomeText: val('site-welcomeText'),
            enterLabel: val('site-enterLabel'),
            // Chữ logo footer = Tên nghệ sĩ (đổi một chỗ, đổi cả hai)
            footerBrand: val('site-artistName'),
            footerSuffix: val('site-footerSuffix'),
            monogram: val('site-monogram'),
        },
        siteName: val('siteName'),
        discordEnabled: $('discord-enabled').checked,
        discordId: val('discordId'),
        profile: {
            name: val('profile-name'),
            syncNameWithDiscord: $('profile-sync').checked,
            username: val('profile-username'),
            title: val('profile-title'),
            avatar: val('profile-avatar'),
            avatarData: val('profile-avatarData'),
            avatarLocal: val('profile-avatarLocal'),
            banner: val('profile-banner'),
            bannerData: val('profile-bannerData'),
            bio: val('profile-bio'),
            location: val('profile-location'),
            quotes: lines('profile-quotes'),
            badges: collectRows('badge-list', null, d => d.icon ? { icon: d.icon, label: d.label, color: d.color || '#ffffff' } : null),
        },
        servers: collectRows('server-list', null, d => {
            if (!d.name && !d.inviteUrl) return null;
            const isZalo = d.type === 'zalo';
            const out = {
                type: isZalo ? 'zalo' : 'discord',
                name: d.name, role: d.role, description: d.description,
                inviteUrl: d.inviteUrl || '',   // Zalo: link nhóm (nút Join); Discord: invite
                icon: '', banner: 'profile_banner_cyber.webp', cdnIcon: '', cdnBanner: 'profile_banner_cyber.webp',
                members: '', online: '', tag: d.tag || (isZalo ? 'NHÓM ZALO' : 'COMMUNITY'), featured: true,
            };
            if (isZalo) out.zaloQrImage = d.zaloQrImage || '';   // data: hoặc đường dẫn — trang hiểu cả hai
            return out;
        }),
        // Tiêu đề section nhóm: chỉ ghi những ô khách tự đặt (tránh rác trong config)
        serversTitle: (() => {
            const t = {};
            if (val('servers-title-zalo').trim()) t.zalo = val('servers-title-zalo').trim();
            if (val('servers-title-combined').trim()) t.combined = val('servers-title-combined').trim();
            if (val('servers-title-discord').trim()) t.discord = val('servers-title-discord').trim();
            return Object.keys(t).length ? t : undefined;
        })(),
        socials,
        donate: {
            enabled: $('social-donate').checked,
            qrImage: val('donate-qrImage') || 'qr-bank.png',
            bankName: val('donate-bankName'),
            accountName: val('donate-accountName'),
            accountNumber: val('donate-accountNumber'),
            note: val('donate-note'),
        },
        setlove: {
            enabled: $('setlove-enabled').checked,
            myName: val('love-myName'),
            partnerName: val('love-partnerName'),
            myDiscordId: myId,
            partnerDiscordId: partnerId,
            partnerAvatarData: val('love-partnerAvatarData'),
            localVisuals: visuals,
            startDate: val('love-startDate'),
            photos,
            quotes: lines('love-quotes'),
        },
        music: {
            enabled: $('music-enabled').checked,
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

/* ---------------- xem trước trang thật ----------------
 * Fetch index.html, thay thẻ <script src="config.js"> bằng CONFIG sinh từ form,
 * rồi chạy bản HTML đó trong iframe qua thuộc tính `srcdoc` (và tab riêng qua
 * document.write) — preview dùng ĐÚNG thông tin đang điền dở, không cần lưu file.
 * <base href> giữ cho style/script/icon/ảnh tải đúng từ thư mục gốc.
 * Cần chạy qua http server (file:// không fetch được index.html; bản deploy
 * Cloudflare có CSP chặn script nội tuyến nên cũng không dùng được).
 */
async function buildPreviewDoc() {
    if (location.protocol === 'file:') {
        throw new Error('Xem trước cần mở admin.html qua http server: python3 -m http.server 8000');
    }
    const res = await fetch('index.html', { cache: 'no-store' });
    if (!res.ok) throw new Error(`Không đọc được index.html (HTTP ${res.status})`);
    const csp = (res.headers.get('content-security-policy') || '');
    if (csp.includes('script-src') && !csp.includes('unsafe-inline')) {
        throw new Error('Trang đang chạy với CSP chặn script nội tuyến (bản deploy Cloudflare) — xem trước chỉ dùng được khi chạy cục bộ: python3 -m http.server 8000');
    }
    let html = await res.text();

    const cfgTag = /<script src="config\.js[^"]*"><\/script>/;
    if (!cfgTag.test(html)) throw new Error('index.html không có thẻ config.js');

    // JSON.stringify đủ an toàn làm source JS; escape '<' để chuỗi chứa "</script>"
    // (nếu người dùng gõ vào bio) không đóng sớm thẻ script
    const cfgJson = JSON.stringify(buildConfig()).replace(/</g, '\\u003c');
    html = html.replace(cfgTag, `<script>const CONFIG = ${cfgJson};</script>`);

    // <base> để style/script/icon của trang thật vẫn tải đúng từ thư mục gốc
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n    <base href="${location.href}">`);
    return html;
}

async function openPreview() {
    let html;
    try {
        html = await buildPreviewDoc();
    } catch (e) {
        toast(e.message);
        return;
    }
    $('preview-frame').srcdoc = html;
    $('preview-overlay').hidden = false;
    document.body.style.overflow = 'hidden';
    toast('✓ Đang xem trước với thông tin trong form');
}

function closePreview() {
    $('preview-overlay').hidden = true;
    $('preview-frame').srcdoc = '';   // dừng cả nhạc đang phát trong preview
    document.body.style.overflow = '';
}

$('btn-preview').onclick = openPreview;
$('btn-preview-back').onclick = closePreview;
$('btn-preview-open').onclick = async () => {
    let html;
    try {
        html = await buildPreviewDoc();
    } catch (e) {
        toast(e.message);
        return;
    }
    const w = window.open('', '_blank');
    if (!w) {
        toast('Trình duyệt chặn popup — dùng nút Xem trước (overlay) nhé');
        return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
};

// ESC để quay lại form — nhanh hơn bấm nút
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('preview-overlay').hidden) closePreview();
});

/* ---------------- bật/tắt nhóm field theo công tắc ----------------
 * Discord tắt -> ẩn luôn các field ID/username (không cần điền nữa);
 * Setlove tắt -> ẩn cả phần điền tên/ngày yêu.
 */
function syncToggleFields() {
    $('discord-fields').style.display = $('discord-enabled').checked ? '' : 'none';
    $('setlove-fields').style.display = $('setlove-enabled').checked ? '' : 'none';
    $('music-fields').style.display = $('music-enabled').checked ? '' : 'none';
}
$('discord-enabled').addEventListener('change', syncToggleFields);
$('setlove-enabled').addEventListener('change', syncToggleFields);
$('music-enabled').addEventListener('change', syncToggleFields);

/* ---------------- tải ảnh lên (avatar chính / banner / avatar người ấy) ----------------
 * Một hàm dùng chung cho cả 3 khung upload: đọc ảnh thành base64 data-URL và
 * nhúng thẳng vào config.js — người mua không cần thêm file nào vào repo.
 * config.js đọc các trường avatarData / bannerData / setlove.partnerAvatarData.
 */
function setupUploadBox({ btn, clear, file, status, preview, hiddenInput, maxBytes, icon, label }) {
    const refresh = () => {
        const data = val(hiddenInput);
        if (data) {
            preview.innerHTML = `<img src="${data}" alt="">`;
            $(clear).hidden = false;
            $(status).textContent = `✓ Đã có ảnh — sẽ nhúng vào config.js`;
            $(status).className = 'ok';
        } else {
            preview.innerHTML = `<i class="${icon}"></i>`;
            $(clear).hidden = true;
            $(status).textContent = '';
            $(status).className = '';
        }
    };
    $(btn).addEventListener('click', () => $(file).click());
    $(clear).addEventListener('click', () => { $(hiddenInput).value = ''; refresh(); });
    $(file).addEventListener('change', () => {
        const f = $(file).files[0];
        if (!f) return;
        const st = $(status);
        if (!f.type.startsWith('image/')) {
            st.textContent = '✗ Chỉ nhận file ảnh (png/jpg/webp)';
            st.className = 'err';
            return;
        }
        if (f.size > maxBytes) {
            st.textContent = `✗ Ảnh ${Math.round(f.size / 1024)}KB — vượt mức khuyên dùng ${Math.round(maxBytes / 1024)}KB, hãy nén nhỏ lại`;
            st.className = 'err';
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            $(hiddenInput).value = reader.result;
            refresh();
            toast(`✓ ${label} đã sẵn sàng nhúng vào config.js`);
        };
        reader.readAsDataURL(f);
    });
    refresh();
    return refresh;
}

// Avatar chính (khi tắt Discord) — hiển thị trong khung tròn 64px
const updateAvatarUploadUI = setupUploadBox({
    btn: 'avatar-upload-btn', clear: 'avatar-upload-clear', file: 'avatar-upload-file',
    status: 'avatar-upload-status', preview: $('avatar-upload-preview'),
    hiddenInput: 'profile-avatarData', maxBytes: AVATAR_MAX_BYTES,
    icon: 'fa-solid fa-image', label: 'Ảnh đại diện'
});
// Banner card — khung chữ nhật 120×64, cho phép nặng hơn
const updateBannerUploadUI = setupUploadBox({
    btn: 'banner-upload-btn', clear: 'banner-upload-clear', file: 'banner-upload-file',
    status: 'banner-upload-status', preview: $('banner-upload-preview'),
    hiddenInput: 'profile-bannerData', maxBytes: 500 * 1024,
    icon: 'fa-solid fa-image', label: 'Ảnh banner'
});
// Avatar người ấy trong Setlove (khi không dùng Discord cho người ấy)
const updateLoveUploadUI = setupUploadBox({
    btn: 'love-upload-btn', clear: 'love-upload-clear', file: 'love-upload-file',
    status: 'love-upload-status', preview: $('love-upload-preview'),
    hiddenInput: 'love-partnerAvatarData', maxBytes: AVATAR_MAX_BYTES,
    icon: 'fa-solid fa-heart', label: 'Avatar người ấy'
});

/* ---------------- sự kiện ---------------- */
$('add-badge').onclick = addBadge;
$('add-social').onclick = addSocial;
$('add-server').onclick = addServer;
$('add-track').onclick = addTrack;
$('add-tech').onclick = addTech;

/* ---- bố cục nhanh mục 5: 1 Zalo / 1 Discord / 2 Zalo / 2 Discord ----
 * Bấm là form tự sinh đúng số hàng đúng loại; người mua chỉ điền nội dung.
 * Hàng có sẵn bị THAY THẾ (có xác nhận nếu đã điền gì đó).
 */
function applyServerLayout(kind) {
    const existing = [...document.querySelectorAll('#server-list .row')];
    const hasContent = existing.some(row => [...row.querySelectorAll('[data-field]')]
        .some(inp => inp.value.trim() && inp.dataset.field !== 'type'));
    if (hasContent && !confirm('Bố cục mới sẽ THAY THẾ các nhóm đang điền. Tiếp tục?')) return;
    $('server-list').innerHTML = '';
    const plan = { '1zalo': ['zalo'], '1discord': ['discord'], '2zalo': ['zalo', 'zalo'], '2discord': ['discord', 'discord'] }[kind];
    plan.forEach(type => {
        const inputs = addServer();
        const sel = inputs.type;
        sel.value = type;
        sel.dispatchEvent(new Event('change'));
    });
    toast(kind.startsWith('2') ? '✓ Đã sinh 2 hàng nhóm' : '✓ Đã sinh 1 hàng nhóm');
}
document.querySelectorAll('#server-layout-picker [data-layout]').forEach(btn => {
    btn.addEventListener('click', () => applyServerLayout(btn.dataset.layout));
});

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
    syncToggleFields();
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
