#!/usr/bin/env node
/**
 * ====================================================================
 *   SETUP — đồng bộ toàn bộ trang từ config.js
 * ====================================================================
 *
 *   Sửa config.js  ->  chạy:  node setup.mjs  ->  xong.
 *
 * Script này ghi lại mọi nơi KHÔNG thể đọc config lúc chạy trang:
 *   - index.html   : <title>, meta description, thẻ chia sẻ OG/Twitter
 *                    (bot Facebook/Messenger/Discord không chạy JavaScript
 *                    nên các thẻ này bắt buộc viết tĩnh trong HTML),
 *                    + các giá trị dự phòng hiển thị trước khi JS chạy
 *   - manifest.json: tên app khi cài trang thành app (PWA)
 *   - sitemap.xml  : domain cho Google
 *   - robots.txt   : domain + danh sách file nhạc cần cấm index
 *   - sw.js        : tên cache + danh sách file dự phòng offline
 *   - .github/scripts/make_icons.py    : chữ monogram trong bộ icon
 *   - .github/scripts/make_og_image.py : tên/handle/domain trên thẻ chia sẻ
 *
 * Sau khi chạy xong, nếu đã đổi tên/monogram thì sinh lại ảnh:
 *   python3 .github/scripts/make_icons.py && python3 .github/scripts/make_og_image.py
 * rồi kiểm tra:  python3 .github/scripts/check_site.py
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const rel = (p) => path.join(ROOT, p);

const read = (p) => fs.readFileSync(rel(p), 'utf8');
const write = (p, content) => {
    const before = read(p);
    if (before === content) return false;
    fs.writeFileSync(rel(p), content);
    return true;
};
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const changed = [];
const done = (file, what) => changed.push(`${file.padEnd(34)} ${what}`);

// ---------------------------------------------------------------- 1. nạp config
const configSrc = read('config.js');
let CONFIG;
try {
    CONFIG = new Function(`${configSrc}\n;return CONFIG;`)();
} catch (e) {
    console.error('✗ Không đọc được config.js:', e.message);
    process.exit(1);
}
if (!CONFIG || typeof CONFIG !== 'object') {
    console.error('✗ config.js không trả về CONFIG — kiểm tra lại cú pháp.');
    process.exit(1);
}

// ---------------------------------------------------------------- 2. giá trị dùng chung
const site = CONFIG.site || {};
const profile = CONFIG.profile || {};
const music = CONFIG.music || {};
const donate = CONFIG.donate || {};

const fullName = site.fullName || profile.name || 'Bio';
const domain = String(site.domain || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
if (!domain) {
    console.error('✗ Thiếu CONFIG.site.domain trong config.js (vd "ten-ban.pages.dev").');
    process.exit(1);
}
const title = CONFIG.siteName || `@${profile.name || fullName}`;
const description = site.description || '';
const monogram = site.monogram || (fullName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase());
const origin = `https://${domain}`;
const ogTitle = `${fullName} — ${title}`;
const firstTrack = (Array.isArray(music.playlist) && music.playlist[0]) ||
    (music.url ? { title: music.title || 'Lofi Chill', artist: music.artist || '' } : null);

// ---------------------------------------------------------------- 3. index.html
let html = read('index.html');

// 3a. Vùng SETUP:BEGIN/END — tiêu đề, mô tả, thẻ chia sẻ (OG + Twitter)
const beginMarker = '<!-- ==================== SETUP:BEGIN';
const endMarker = 'SETUP:END';
const bIdx = html.indexOf(beginMarker);
const eIdx = html.indexOf(endMarker, bIdx);
if (bIdx === -1 || eIdx === -1) {
    console.error('✗ index.html thiếu vùng SETUP:BEGIN/END — không ghi được thẻ chia sẻ.');
    process.exit(1);
}
const setupBlock = [
    `${beginMarker} (setup.mjs tự ghi lại) ====================`,
    '         Vùng này được SINH LẠI từ config.js mỗi lần chạy: node setup.mjs',
    '         Các thẻ chia sẻ phải viết tĩnh vì bot Facebook/Messenger/Discord',
    '         không chạy JavaScript. KHÔNG sửa tay: lần chạy sau sẽ bị ghi đè.',
    '    -->',
    `    <title>${escText(title)}</title>`,
    `    <meta name="description" content="${escAttr(description)}">`,
    '',
    `    <link rel="canonical" href="${origin}/">`,
    '    <meta property="og:type" content="website">',
    `    <meta property="og:site_name" content="${escAttr(domain.split('.')[0])}">`,
    '    <meta property="og:locale" content="vi_VN">',
    `    <meta property="og:url" content="${origin}/">`,
    `    <meta property="og:title" content="${escAttr(ogTitle)}">`,
    `    <meta property="og:description" content="${escAttr(description)}">`,
    `    <meta property="og:image" content="${origin}/og-image.jpg">`,
    '    <meta property="og:image:width" content="1200">',
    '    <meta property="og:image:height" content="630">',
    `    <meta property="og:image:alt" content="${escAttr(`Thẻ giới thiệu ${fullName}`)}">`,
    '    <meta name="twitter:card" content="summary_large_image">',
    `    <meta name="twitter:title" content="${escAttr(ogTitle)}">`,
    `    <meta name="twitter:description" content="${escAttr(description)}">`,
    `    <meta name="twitter:image" content="${origin}/og-image.jpg">`,
    '    <!-- ==================== SETUP:END ==================== -->',
].join('\n');
// Cắt từ SETUP:BEGIN tới HẾT comment END cũ (tìm dấu '-->' sau chữ SETUP:END),
// rồi dọn luôn các dấu '-->' thừa nếu lần chạy trước từng bị lỗi
const endCommentClose = html.indexOf('-->', eIdx);
let rest = html.slice(endCommentClose + 3).replace(/^(?:\s*-->)+/, '');
html = html.slice(0, bIdx) + setupBlock + rest;

// 3b. Ảnh preload của banner theo CONFIG.profile.banner
if (profile.banner) {
    html = html.replace(
        /(<link rel="preload" as="image" href=")[^"]*("[^>]*data-setup-banner-preload)/,
        `$1${escAttr(profile.banner)}$2`
    );
}

// 3c. Giá trị dự phòng hiển thị trước khi JS chạy (chống nháy nội dung cũ)
// LƯU Ý: marker nằm ở CUỐI thẻ mở, giá trị ghi vào phần innerText cho tới '</'
// (riêng welcome-avatar là thẻ <img> tự đóng — sửa thuộc tính src, xem bên dưới).
if (profile.avatar) {
    html = html.replace(/(data-setup-welcome-avatar\s+src=")[^"]*(")/, `$1${escAttr(profile.avatar)}$2`);
}
const setInner = (marker, value) => {
    if (value === undefined || value === null) return;
    const re = new RegExp(`(data-setup-${marker}>)([\\s\\S]*?)(</)`);
    if (!re.test(html)) {
        console.warn(`! index.html: không tìm thấy data-setup-${marker} — bỏ qua.`);
        return;
    }
    html = html.replace(re, `$1${escText(value)}$3`);
};
setInner('welcome-name', profile.name);
setInner('welcome-text', site.welcomeText);
setInner('enter-label', site.enterLabel);
setInner('name', profile.name);
setInner('handle', profile.username ? `@${profile.username}` : undefined);
setInner('tagline', profile.title);
setInner('location', profile.location);
setInner('bio', profile.bio);
setInner('track-title', firstTrack ? firstTrack.title : undefined);
setInner('track-artist', firstTrack ? firstTrack.artist : undefined);
setInner('love-name-1', (CONFIG.setlove || {}).myName);
setInner('love-name-2', (CONFIG.setlove || {}).partnerName);
setInner('love-fallback', ((CONFIG.setlove || {}).myName || '').trim().charAt(0).toUpperCase());
setInner('love-fallback-2', ((CONFIG.setlove || {}).partnerName || '').trim().charAt(0).toUpperCase());
setInner('love-quote', ((CONFIG.setlove || {}).quotes || [])[0] ? `"${CONFIG.setlove.quotes[0]}"` : undefined);
setInner('footer-brand', site.footerBrand || site.artistName || fullName);
setInner('footer-suffix', site.footerSuffix);

// Bio nằm trên dòng riêng — chuẩn lại thụt dòng cho gọn
html = html.replace(/(data-setup-bio>\s*)([\s\S]*?)(\s*<\/p>)/, (m, a, b, c) =>
    b.trim() ? `${a}${escText(profile.bio || b.trim())}${c}` : m);

// 3d. 6 pill sở thích — sinh lại từ config.techStack (nếu có)
if (Array.isArray(CONFIG.techStack) && CONFIG.techStack.length > 0) {
    const gridStart = html.indexOf('<div class="arsenal-grid"');
    if (gridStart !== -1) {
        const openEnd = html.indexOf('>', gridStart) + 1;
        // tìm </div> ĐÚNG cặp của grid: đếm mở/đóng lồng nhau
        let depth = 1, i = openEnd;
        while (depth > 0 && i < html.length) {
            const nextOpen = html.indexOf('<div', i);
            const nextClose = html.indexOf('</div>', i);
            if (nextClose === -1) break;
            if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4; }
            else { depth--; i = nextClose + 6; }
        }
        const indent = '                                '; // 32 spaces, như pill gốc
        const pills = CONFIG.techStack.map(item =>
            `${indent}<div class="arsenal-pill" data-setup-arsenal>\n`
            + `${indent}    <div class="arsenal-icon-wrap">\n`
            + `${indent}        <i class="${escAttr(item.icon)}"></i>\n`
            + `${indent}    </div>\n`
            + `${indent}    <div class="arsenal-info">\n`
            + `${indent}        <span class="arsenal-name">${escText(item.name)}</span>\n`
            + `${indent}        <span class="arsenal-sub">${escText(item.domain)}</span>\n`
            + `${indent}    </div>\n`
            + `${indent}</div>`
        ).join('\n');
        html = html.slice(0, openEnd) + '\n' + pills + '\n' + html.slice(i - 6);
    }
}
// 3e. Nhúng BẢN CHÉP index.html vào admin.html — nút "Xem trước" của form dùng bản
// này khi admin.html được mở trực tiếp (file://), vì trình duyệt không cho fetch()
// file local. Không làm gì cả khi admin.html không có khung site-template.
let adminChanged = false;
try {
    const tmplBegin = '<script type="text/plain" id="site-template">';
    const tmplEnd = '</script>';
    let admin = read('admin.html');
    const aIdx = admin.indexOf(tmplBegin);
    if (aIdx !== -1) {
        // Nội dung nhúng phải "chết": biến mọi chuỗi mở đầu thẻ script và comment HTML
        // thành ký tự khoảng trắng vô hình — parser HTML không hiểu là thẻ nên không
        // cắt đoạn nhúng sớm, còn admin.js nhét vào srcdoc sẽ tự khôi phục.
        const embed = html
            .replace(/<script/gi, '<\u200bscript')
            .replace(/<\/script/gi, '<\u200b/script')
            .replace(/<!--/g, '<\u200b!--');
        const bodyStart = aIdx + tmplBegin.length;
        const bodyEnd = admin.indexOf(tmplEnd, bodyStart);
        if (bodyEnd === -1) {
            console.warn('! admin.html: khung site-template bị thủng (thiếu </script>) — bỏ qua.');
        } else {
            const next = admin.slice(0, bodyStart) + '\n' + embed + '\n    ' + admin.slice(bodyEnd);
            if (next !== admin) {
                fs.writeFileSync(rel('admin.html'), next);
                adminChanged = true;
            }
        }
    }
} catch (e) {
    console.warn('! Bỏ qua nhúng index.html vào admin.html:', e.message);
}
if (write('index.html', html)) done('index.html', 'thẻ chia sẻ + giá trị dự phòng');
if (adminChanged) done('admin.html', 'cập nhật bản nhúng cho nút Xem trước (mở file://)');

// ---------------------------------------------------------------- 3f. all-in-one.html
// 1 FILE DUY NHẤT gửi khách: form admin + trang bio gộp chung (CSS/JS trang bio nằm
// trong khung dữ liệu type="text/plain" — trình duyệt chỉ coi là văn bản, admin.js
// tự lắp lại lúc Xem trước). admin.js được nhúng bằng bootstrap gói JSON.stringify
// để mọi chuỗi nhạy cảm ('</script'...) trong code không phá vỡ khung chứa.
const css = read('style.css');
const scriptJs = read('script.js');
try {
    const zw = '\u200b';
    // Quy ước PHẢI khớp restoreSiteTemplate() trong admin.js: ZWSP đứng NGAY SAU '<',
    // trước '/' đối với thẻ đóng (nếu không khớp, admin.js sẽ không khôi phục được)
    const dead = (s) => s
        .replace(/<script/gi, '<' + zw + 'script')
        .replace(/<\/script/gi, '<' + zw + '/script')
        .replace(/<!--/g, '<' + zw + '!--');
    const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const frame = (id, s) => `<script type="text/plain" id="${id}">${dead(s)}</script>`;
    const adminJsSource = read('admin.js');
    // HTML tokenizer KHÔNG tha thứ cho 3 mẫu trong script nội tuyến:
    //   '</script'      → đóng sớm thẻ script
    //   '<!--' + '<script' → rơi vào chế độ "double-escaped", thẻ đóng THẬT cũng bị nuốt
    // Escape bằng \uXXXX (JSON hợp lệ, đọc ra đúng ký tự gốc):
    const jsonSafe = JSON.stringify(adminJsSource)
        .replace(/<\//gi, '<\\u002f')
        .replace(/<!--/g, '<\\u0021--')
        .replace(/<script/gi, '<\\u0073cript');
    // Chạy source ở GLOBAL scope bằng indirect eval — new Function sẽ giam mọi hàm
    // trong scope riêng (handler bấm Xem trước không gọi được buildPreviewDoc)
    const bootstrap = `window.__ADMIN_SRC__=${jsonSafe};
(0, eval)(window.__ADMIN_SRC__);`;
    // THÂN FORM admin: cắt nguyên phần giữa <body>…</body> của admin.html, bỏ khung
    // site-template (bản all-in-one dùng khung bio-template) và thẻ script admin.js cũ
    const adminHtml = read('admin.html');
    const bodyOpen = adminHtml.indexOf('<body>');
    const bodyClose = adminHtml.lastIndexOf('</body>');
    if (bodyOpen === -1 || bodyClose === -1) throw new Error('admin.html thiếu <body>');
    let bodyInner = adminHtml.slice(bodyOpen + '<body>'.length, bodyClose);
    const siteTmplBegin = '<script type="text/plain" id="site-template">';
    const stIdx = bodyInner.indexOf(siteTmplBegin);
    if (stIdx !== -1) {
        const stEnd = bodyInner.indexOf('</script>', stIdx);
        if (stEnd !== -1) bodyInner = bodyInner.slice(0, stIdx) + bodyInner.slice(stEnd + '</script>'.length);
    }
    bodyInner = bodyInner.replace(/<script src="admin\.js"[^>]*><\/script>/, '');
    // CSS CỦA ADMIN nằm inline trong admin.html (style.css là của trang bio!) —
    // trích khối <style>…</style> đầu file để dán vào <head> của all-in-one
    const cssStart = adminHtml.indexOf('<style>');
    const cssEnd = adminHtml.indexOf('</style>', cssStart);
    if (cssStart === -1 || cssEnd === -1) throw new Error('admin.html thiếu khối <style>');
    const adminCss = adminHtml.slice(cssStart + '<style>'.length, cssEnd);
    const allInOne = `<!DOCTYPE html>
<!--
  ALL-IN-ONE — form điền thông tin + trang bio trong MỘT file (tự sinh bởi setup.mjs, KHÔNG sửa tay).
  Gửi đúng file này cho khách: khách nháy đúp mở bằng Chrome/Edge/Cốc Cốc là điền + Xem trước + tải
  config.js gửi lại — không cần server, không cần file nào khác. Người bán nhận config.js rồi chạy:
  node deploy-customer.mjs --customer ten-khach --ingest config.js
-->
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex">
    <title>Admin — Điền thông tin trang bio</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>${adminCss}</style>
</head>
<body>
${bodyInner}
    <!-- Các khung dữ liệu dưới đây CHỈ là văn bản: admin.js đọc và lắp thành trang bio lúc Xem trước -->
    ${frame('bio-template', html)}
    ${frame('bio-css', css)}
    ${frame('bio-js', scriptJs)}
    ${frame('admin-src', adminJsSource)}

    <script>
${bootstrap}
    <\/script>
</body>
</html>
`;
    fs.writeFileSync(rel('all-in-one.html'), allInOne);
    done('all-in-one.html', `1 file duy nhất cho khách (admin + bio, ${(allInOne.length / 1024).toFixed(0)} KB)`);
} catch (e) {
    console.warn('! Bỏ qua sinh all-in-one.html:', e.message);
}

// ---------------------------------------------------------------- 4. manifest.json
try {
    const manifest = JSON.parse(read('manifest.json'));
    manifest.name = ogTitle;
    manifest.short_name = title;
    manifest.description = description;
    if (write('manifest.json', JSON.stringify(manifest, null, 4) + '\n')) {
        done('manifest.json', 'tên app + mô tả');
    }
} catch (e) {
    console.warn('! Bỏ qua manifest.json:', e.message);
}

// ---------------------------------------------------------------- 5. sitemap.xml
const sitemap = read('sitemap.xml').replace(/<loc>[^<]*<\/loc>/, `<loc>${origin}/</loc>`);
if (write('sitemap.xml', sitemap)) done('sitemap.xml', `domain -> ${domain}`);

// ---------------------------------------------------------------- 6. robots.txt
// Quét mọi file .mp3/.png được nhắc trong config để tự cấm index (nhạc bản quyền, ảnh QR)
const protectedFiles = [
    ...new Set(
        (configSrc.match(/[\w\-./]+\.(?:mp3|mp4|webm)/g) || [])
            .filter(f => !f.startsWith('http'))
    ),
];
if (donate.qrImage && !donate.qrImage.startsWith('http')) protectedFiles.push(donate.qrImage);
const robots = [
    'User-agent: *',
    'Allow: /',
    ...protectedFiles.map(f => `Disallow: /${f}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
].join('\n');
if (write('robots.txt', robots)) done('robots.txt', 'sitemap + danh sách file cấm index');

// ---------------------------------------------------------------- 7. sw.js
let sw = read('sw.js');
const CACHE_NAME = 'bio-shell-v1';
sw = sw.replace(/(const CACHE = ')[^']+(')/, `$1${CACHE_NAME}$2`);
// Shell offline: trang chính + ảnh dự phòng avatar/khung + icon PWA
const shellFiles = new Set(['./', './icon-192.png', './icon-512.png']);
if (profile.avatarLocal) shellFiles.add(`./${profile.avatarLocal}`);
const localVisuals = (CONFIG.setlove || {}).localVisuals || {};
Object.values(localVisuals).forEach(v => {
    if (v && v.avatar) shellFiles.add(`./${v.avatar}`);
    if (v && v.deco) shellFiles.add(`./${v.deco}`);
});
const shellLiteral = 'const SHELL = [' + [...shellFiles].map(f => `'${f}'`).join(', ') + '];';
if (/const SHELL = \[[\s\S]*?\];/.test(sw)) {
    sw = sw.replace(/const SHELL = \[[\s\S]*?\];/, shellLiteral);
}
if (write('sw.js', sw)) done('sw.js', `cache ${CACHE_NAME} + ${shellFiles.size} file offline`);

// ---------------------------------------------------------------- 8. script sinh icon + og-image
const iconsScript = '.github/scripts/make_icons.py';
let icons = read(iconsScript);
icons = icons.replace(/(LABEL = ")[^"]*(")/, `$1${monogram}$2`);
if (write(iconsScript, icons)) done(iconsScript, `monogram -> ${monogram}`);

const ogScript = '.github/scripts/make_og_image.py';
let og = read(ogScript);
og = og.replace(/(EYEBROW = ")[^"]*(")/, `$1${title}$2`)
    .replace(/(NAME = ")[^"]*(")/, `$1${fullName}$2`)
    .replace(/(HANDLE = ")[^"]*(")/, `$1@${profile.username || ''}$2`)
    .replace(/(TAGLINE = ")[^"]*(")/, `$1${profile.title || ''}$2`)
    .replace(/(DOMAIN = ")[^"]*(")/, `$1${domain}$2`);
if (write(ogScript, og)) done(ogScript, `tên/handle/domain cho og-image`);

// ---------------------------------------------------------------- 9. test_stats.mjs (chỉ host trong phép thử)
const testScript = '.github/scripts/test_stats.mjs';
let test = read(testScript);
test = test.replace(/(const HOST = ')[^']+(')/, `$1${origin}$2`);
if (write(testScript, test)) done(testScript, `host kiểm thử -> ${domain}`);

// ---------------------------------------------------------------- Kết quả
console.log('\n✓ setup.mjs hoàn tất — đồng bộ từ config.js:');
if (changed.length === 0) console.log('  (mọi file đã đồng bộ, không có gì phải ghi lại)');
changed.forEach(c => console.log(`  • ${c}`));
console.log('\nBước tiếp theo:');
console.log('  1. Đổi tên/monogram? Chạy: python3 .github/scripts/make_icons.py && python3 .github/scripts/make_og_image.py');
console.log('  2. Kiểm tra: python3 .github/scripts/check_site.py');
console.log('  3. Đổi ảnh thật: avatar-me.webp, avatar-partner.webp, banner_executive.webp, qr-bank.png, og-image.jpg');
