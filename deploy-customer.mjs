#!/usr/bin/env node
/**
 * ====================================================================
 *  DEPLOY HỘ KHÁCH — dựng bản riêng của từng khách rồi đẩy lên
 *  Cloudflare Pages bằng tài khoản service của shop.
 * ====================================================================
 *
 *  Người bán dùng: khách chỉ nhận link live, không cần tài khoản nào.
 *
 *  Cách dùng:
 *      node deploy-customer.mjs --customer lan-anh --dry-run   # chỉ dựng + kiểm tra
 *      node deploy-customer.mjs --customer lan-anh             # deploy thật
 *      node deploy-customer.mjs --customer lan-anh --no-assets # bỏ qua assets/ của khách
 *      node deploy-customer.mjs --customer lan-anh --keep      # giữ thư mục build lại
 *
 *  Môi trường cần có (khi deploy thật):
 *      CF_API_TOKEN     token của tài khoản service
 *      CF_ACCOUNT_ID    id tài khoản service
 *      WRANGLER         đường dẫn wrangler (mặc định: "wrangler" trong PATH)
 *
 *  Xem DEPLOY-HO.md để thiết lập tài khoản service và token.
 *
 *  Thư mục build: customers/build/<slug>/ — sinh lại mỗi lần chạy, tự xoá
 *  khi xong trừ khi dùng --keep.
 */

import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

// ------------------------------------------------------------------ tham số
const args = process.argv.slice(2);
const flag = (name) => {
    const i = args.indexOf(name);
    if (i === -1) return false;
    args.splice(i, 1);
    return true;
};
const needValue = (name) => {
    const i = args.indexOf(name);
    if (i === -1 || !args[i + 1]) {
        console.error(`✗ Thiếu giá trị cho ${name}`);
        process.exit(1);
    }
    const v = args[i + 1];
    args.splice(i, 2);
    return v;
};

const customer = needValue('--customer');
const dryRun = flag('--dry-run');
const noAssets = flag('--no-assets');
const keep = flag('--keep');
const customDomain = flag('--custom-domain'); // khách sẽ gắn domain riêng (site.domain != *.pages.dev)
if (args.length) {
    console.error(`✗ Tham số không rõ: ${args.join(' ')}`);
    process.exit(1);
}

const slug = customer.trim().toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    console.error(`✗ Tên khách không hợp lệ sau khi chuẩn hoá: "${customer}" -> "${slug}"`);
    console.error('  (chỉ chữ thường, số và gạch ngang — đây cũng là tên project Pages)');
    process.exit(1);
}

const custDir = path.join(ROOT, 'customers', slug);
const buildDir = path.join(ROOT, 'customers', 'build', slug);
const distDir = path.join(buildDir, 'dist');
const CF_API_TOKEN = process.env.CF_API_TOKEN || '';
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID || '';
const WRANGLER = process.env.WRANGLER || 'wrangler';

const step = (msg) => console.log(`\n▶ ${msg}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);

console.log(`Khách:         ${customer} (slug: ${slug})`);
console.log(`Thư mục khách:  ${path.relative(ROOT, custDir)}`);
if (dryRun) console.log('Chế độ:        DRY-RUN — chỉ dựng và kiểm tra, không deploy\n');

// ------------------------------------------------------------------ 1. kiểm tra đầu vào
step('Kiểm tra thư mục khách');
if (!fs.existsSync(path.join(custDir, 'config.js'))) {
    console.error(`✗ Thiếu ${path.relative(ROOT, path.join(custDir, 'config.js'))}.`);
    console.error('  Hãy copy config.js gốc rồi điền theo THONG-TIN.md của khách.');
    process.exit(1);
}
const configSrc = fs.readFileSync(path.join(custDir, 'config.js'), 'utf8');
let CONFIG = null;
try {
    CONFIG = new Function(`${configSrc}\n;return CONFIG;`)();
} catch (e) {
    console.error(`✗ config.js của khách sai cú pháp: ${e.message}`);
    process.exit(1);
}
const site = CONFIG.site || {};
if (!site.domain) {
    console.error('✗ config.js của khách thiếu site.domain (vd "lan-anh.pages.dev").');
    console.error('  setup.mjs cần domain này để ghi sitemap/canonical/thẻ chia sẻ.');
    process.exit(1);
}
ok(`site.domain = ${site.domain}`);
if (!dryRun && !customDomain && site.domain !== `${slug}.pages.dev`) {
    console.error(`✗ Lệch domain: config ghi "${site.domain}" nhưng project sẽ là "${slug}.pages.dev".`);
    console.error('  Sửa site.domain trong config.js của khách, hoặc thêm --custom-domain');
    console.error('  nếu khách sẽ dùng domain riêng (canonical/OG sẽ trỏ theo domain đó).');
    process.exit(1);
}
if (CONFIG.donate && CONFIG.donate.enabled !== false && !(CONFIG.donate.qrImage || '').startsWith('http')) {
    const qr = path.join(custDir, 'assets', path.basename(CONFIG.donate.qrImage));
    if (!noAssets && !fs.existsSync(qr)) {
        console.error(`✗ donate bật nhưng chưa có ảnh QR của khách: ${path.relative(ROOT, qr)}`);
        console.error('  Khách cần gửi ảnh QR chuyển khoản (đúng người, đúng số tài khoản!)');
        process.exit(1);
    }
}

// ------------------------------------------------------------------ 2. dựng dist
step('Dựng thư mục build (template + assets khách)');
fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

// 2a. copy toàn bộ template trừ .git và các file hỗ trợ người bán
// (.github GIỮ LẠI: setup.mjs/check_site.py cần scripts + mốc QR; xoá trước khi deploy)
const EXCLUDE = new Set(['.git', 'customers', 'node_modules', 'DEPLOY-HO.md',
    'deploy-customer.mjs', 'admin.html', 'admin.js', 'THONG-TIN.md', '.freebuff', '__pycache__']);
let copied = 0;
const copyDir = (src, dest) => {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        if (EXCLUDE.has(entry.name)) continue;
        const s = path.join(src, entry.name);
        const d = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDir(s, d);
        else { fs.copyFileSync(s, d); copied++; }
    }
};
copyDir(ROOT, distDir);
ok(`template: ${copied} file`);

// 2b. chép assets khách đè lên (file phẳng, đúng tên file template)
if (!noAssets) {
    for (const sub of ['assets', 'pending-assets']) {
        const dir = path.join(custDir, sub);
        if (!fs.existsSync(dir)) continue;
        let n = 0;
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.isDirectory()) {
                console.error(`✗ ${sub}/${entry.name}/ là thư mục — assets phải là file đặt phẳng (đúng tên file template).`);
                process.exit(1);
            }
            fs.copyFileSync(path.join(dir, entry.name), path.join(distDir, entry.name));
            n++;
        }
        if (n) ok(`${sub}/: đè ${n} file của khách`);
    }
}

// 2c. config.js của khách đè lên config.js template
fs.copyFileSync(path.join(custDir, 'config.js'), path.join(distDir, 'config.js'));

// ------------------------------------------------------------------ 3. setup
step('Chạy setup.mjs (đồng bộ index/manifest/sitemap/robots/sw từ config khách)');
execFileSync('node', ['setup.mjs'], { cwd: distDir, stdio: 'inherit' });

// ------------------------------------------------------------------ 4. icon + og-image
step('Sinh lại icon + og-image theo tên khách');
// QUAN TRỌNG: chạy bản script NẰM TRONG dist (setup.mjs đã ghi monogram/tên khách
// vào đó), không phải bản ở gốc repo — chạy nhầm bản gốc sẽ sinh lại icon/og-image
// mang thương hiệu người bán mà vẫn báo ✓.
const pyIcons = spawnSync('python3', ['.github/scripts/make_icons.py', distDir], { cwd: distDir, encoding: 'utf8' });
if (pyIcons.error || pyIcons.status !== 0) {
    console.warn(`  ! make_icons.py bỏ qua: ${(pyIcons.stderr || pyIcons.error?.message || '').trim().slice(0, 300)}`);
    console.warn('    (cần Pillow + font Noto; không có thì giữ icon template — chấp nhận được)');
} else {
    ok('icon-192/512/maskable + favicon: đã sinh theo monogram khách');
}
const pyOg = spawnSync('python3', ['.github/scripts/make_og_image.py', distDir], { cwd: distDir, encoding: 'utf8' });
if (pyOg.error || pyOg.status !== 0) {
    console.warn(`  ! make_og_image.py bỏ qua: ${(pyOg.stderr || pyOg.error?.message || '').trim().slice(0, 300)}`);
} else {
    ok('og-image.jpg: đã sinh theo tên khách');
}

// ------------------------------------------------------------------ 4b. mốc QR của khách
// check_site.py so ảnh QR với mốc sha256 trong .github/qr-expected.sha256 — mốc trong
// template là QR của NGƯỜI BÁN. Khách dùng QR riêng thì phải tính lại mốc theo QR khách,
// nếu không check sẽ chặn oan (hoặc tệ hơn: QR của bạn vẫn nằm trong bản deploy).
if (CONFIG.donate && CONFIG.donate.enabled !== false && !(CONFIG.donate.qrImage || '').startsWith('http')) {
    step('Cập nhật mốc QR theo QR của khách');
    const qrDist = path.join(distDir, CONFIG.donate.qrImage);
    if (!fs.existsSync(qrDist)) {
        console.error(`✗ config khai báo ảnh QR '${CONFIG.donate.qrImage}' nhưng dist không có file này.`);
        process.exit(1);
    }
    const hasZbar = spawnSync('zbarimg', ['--version'], { encoding: 'utf8' }).status === 0;
    if (!hasZbar) {
        console.warn('  ! Chưa cài zbarimg (apt-get install zbar-tools) — check_site sẽ bỏ qua phần QR.');
        console.warn('    BẮT BUỘC soi QR bằng điện thoại trước khi bàn giao: đúng ngân hàng, đúng số TK của khách.');
    } else {
        const decode = spawnSync('zbarimg', ['--raw', '-q', qrDist], { encoding: 'utf8' });
        const payload = (decode.stdout || '').trim();
        if (decode.status !== 0 || !payload) {
            console.error('✗ Ảnh QR của khách KHÔNG giải mã được — máy quét điện thoại cũng sẽ không đọc được.');
            console.error('  Yêu cầu khách gửi lại ảnh QR nét, chụp thẳng, không bị cắt.');
            process.exit(1);
        }
        const got = crypto.createHash('sha256').update(payload).digest('hex');
        fs.mkdirSync(path.join(distDir, '.github'), { recursive: true });
        fs.writeFileSync(path.join(distDir, '.github', 'qr-expected.sha256'),
            `# Mốc QR của khách ${slug} — deploy-customer.mjs tự sinh từ ảnh QR trong dist.\n${got}\n`);
        ok(`mốc mới: sha256 ${got.slice(0, 12)}…`);
        console.log('  NỘI DUNG QR (soi kỹ — phải là tài khoản CỦA KHÁCH, không phải của bạn):');
        console.log(`    ${payload.length > 300 ? payload.slice(0, 300) + '…' : payload}`);
    }
}

// ------------------------------------------------------------------ 5. kiểm tra
step('Chạy check_site.py trong thư mục build');
const chk = spawnSync('python3', ['.github/scripts/check_site.py', distDir], { cwd: ROOT, encoding: 'utf8' });
process.stdout.write(chk.stdout || '');
if (chk.status !== 0) {
    console.error(`\n✗ Kiểm tra thất bại (${(chk.stderr || '').trim().slice(0, 300)}) — KHÔNG deploy.`);
    console.error('  Sửa config/assets của khách rồi chạy lại.');
    process.exit(1);
}
ok('check_site: tất cả mục kiểm tra đạt');

// ------------------------------------------------------------------ 6. xác minh build
step('Xác nhận bản build sạch trước khi đẩy lên');
const mustHave = ['index.html', 'config.js', 'script.js', 'style.css', '_headers', '_redirects',
    'manifest.json', 'robots.txt', 'sitemap.xml', 'sw.js', 'og-image.jpg', 'icon-192.png', 'icon-512.png'];
for (const f of mustHave) {
    if (!fs.existsSync(path.join(distDir, f))) {
        console.error(`✗ Thiếu file bắt buộc trong dist: ${f}`);
        process.exit(1);
    }
}
ok(`${mustHave.length} file bắt buộc đều có`);
const deployConfig = fs.readFileSync(path.join(distDir, 'config.js'), 'utf8');
if (deployConfig !== configSrc) {
    console.error('✗ config.js trong dist khác với config khách — không deploy.');
    process.exit(1);
}
ok('config.js trong dist khớp nguyên văn với config khách');

// ------------------------------------------------------------------ 7. dry-run kết thúc
if (dryRun) {
    console.log('\n━━━ DRY-RUN XONG — bản build nằm ở ━━━');
    console.log(`  ${distDir}`);
    console.log(`  Mở thử:  python3 -m http.server 8899 --directory "${distDir}"`);
    console.log(`  Deploy thật:  CF_API_TOKEN=… CF_ACCOUNT_ID=… node deploy-customer.mjs --customer ${slug}`);
    process.exit(0);
}

// ------------------------------------------------------------------ 8. token
step('Kiểm tra token Cloudflare');
if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    console.error('✗ Thiếu CF_API_TOKEN hoặc CF_ACCOUNT_ID (biến môi trường).');
    console.error('  Xem DEPLOY-HO.md bước 1 để tạo token cho tài khoản service.');
    process.exit(1);
}

const wr = (argsW) => spawnSync(WRANGLER, argsW, {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, CLOUDFLARE_API_TOKEN: CF_API_TOKEN, CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID },
});

const verify = wr(['whoami']);
if (verify.status !== 0) {
    console.error(`✗ wrangler whoami thất bại:\n${(verify.stderr || verify.stdout).trim().slice(0, 500)}`);
    console.error('  Token sai/hết hạn? Tạo token mới theo DEPLOY-HO.md bước 1.');
    process.exit(1);
}
const whoamiOut = `${verify.stdout}\n${verify.stderr}`;
const emailLine = whoamiOut.split('\n').find((l) => /@/.test(l) && !/account/i.test(l)) || '';
ok(`wrangler whoami: ${emailLine.trim() || 'token hợp lệ'}`);

// ------------------------------------------------------------------ 9. KV namespace
step('Bảo đảm KV namespace cho stats');
const kvName = `STATS-${slug}`;
const cfApi = async (method, urlPath, body) => {
    const res = await fetch(`https://api.cloudflare.com/client/v4${urlPath}`, {
        method,
        headers: {
            Authorization: `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* trả null */ }
    return { status: res.status, json };
};

const kvList = await cfApi('GET', `/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces?per_page=100`);
if (!kvList.json?.success) {
    console.error(`✗ Không liệt kê được KV namespace: ${JSON.stringify(kvList.json?.errors || kvList.status).slice(0, 300)}`);
    console.error('  Token thiếu quyền "Workers KV Storage · Edit"?');
    process.exit(1);
}
let ns = (kvList.json.result || []).find((n) => n.title === kvName);
if (!ns) {
    const create = await cfApi('POST', `/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces`, { title: kvName });
    if (!create.json?.success) {
        console.error(`✗ Không tạo được KV namespace ${kvName}: ${JSON.stringify(create.json?.errors || create.status).slice(0, 300)}`);
        process.exit(1);
    }
    ns = create.json.result;
    ok(`đã tạo ${kvName} (${ns.id})`);
} else {
    ok(`đã có ${kvName} (${ns.id})`);
}

// ------------------------------------------------------------------ 10. project Pages
step('Bảo đảm project Pages tồn tại');
const projName = slug;
let proj = null;
const projGet = await cfApi('GET', `/accounts/${CF_ACCOUNT_ID}/pages/projects/${projName}`);
if (projGet.json?.success) {
    proj = projGet.json.result;
    ok(`project đã có: https://${projName}.pages.dev`);
} else if (projGet.status === 404) {
    const create = await cfApi('POST', `/accounts/${CF_ACCOUNT_ID}/pages/projects`, {
        name: projName,
        production_branch: 'main',
    });
    if (!create.json?.success) {
        console.error(`✗ Không tạo được project Pages "${projName}": ${JSON.stringify(create.json?.errors || create.status).slice(0, 400)}`);
        process.exit(1);
    }
    proj = create.json.result;
    ok(`đã tạo project ${projName}.pages.dev`);
} else {
    console.error(`✗ Không truy vấn được project Pages: ${JSON.stringify(projGet.json?.errors || projGet.status).slice(0, 300)}`);
    process.exit(1);
}

// ------------------------------------------------------------------ 11. gắn KV binding
step('Gắn KV binding STATS vào project');
const bindingPayload = {
    production_deployments: { kv_namespaces: { STATS: ns.id } },
    preview_deployments: { kv_namespaces: { STATS: ns.id } },
};
const patch = await cfApi('PATCH', `/accounts/${CF_ACCOUNT_ID}/pages/projects/${projName}`, bindingPayload);
if (!patch.json?.success) {
    console.warn(`  ! Gắn binding qua API thất bại: ${JSON.stringify(patch.json?.errors || patch.status).slice(0, 300)}`);
    console.warn('    Gắn tay trong dashboard: project → Settings → Functions → KV namespace bindings');
    console.warn(`    → tên biến STATS, namespace ${kvName} (${ns.id}), rồi deploy lại 1 lần.`);
    console.warn('    (Trang vẫn chạy tốt nếu chưa gắn — phần stats tự ẩn.)');
} else {
    ok(`STATS -> ${kvName} (production + preview)`);
}

// ------------------------------------------------------------------ 12. deploy
step('Dọn file hỗ trợ khỏi dist trước khi đẩy lên');
fs.rmSync(path.join(distDir, '.github'), { recursive: true, force: true });
fs.rmSync(path.join(distDir, 'deployments.log'), { force: true });
ok('đã bỏ .github (scripts kiểm tra) khỏi bản deploy');

step('Deploy dist lên Cloudflare Pages');
const deploy = wr(['pages', 'deploy', distDir, `--project-name=${projName}`, '--commit-dirty=true']);
if (deploy.status !== 0) {
    console.error(`✗ Deploy thất bại:\n${`${deploy.stderr || ''}\n${deploy.stdout || ''}`.trim().slice(0, 800)}`);
    process.exit(1);
}
const deployOut = `${deploy.stdout || ''}\n${deploy.stderr || ''}`;
const deployUrlMatch = deployOut.match(/https:\/\/[a-z0-9-]+\.pages\.dev/i);
const liveUrl = `https://${projName}.pages.dev`;
ok(`live: ${liveUrl}${deployUrlMatch ? `  (bản lần này: ${deployUrlMatch[0]})` : ''}`);

// ------------------------------------------------------------------ 13. xác minh live
step('Xác minh trang live');
const httpCode = async (u) => {
    try {
        const res = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
        return String(res.status);
    } catch {
        return 'không phản hồi';
    }
};
const home = await httpCode(liveUrl);
if (home === '200') ok(`${liveUrl} -> 200`);
else console.warn(`  ! ${liveUrl} -> ${home} (đôi khi CDN cần ~30s để ấm, thử lại sau)`);
const api = await httpCode(`${liveUrl}/api/stats`);
if (api === '200') ok('/api/stats -> 200 (KV đã hoạt động)');
else console.warn(`  ! /api/stats -> ${api} — kiểm tra lại binding STATS (trang vẫn chạy, phần stats tự ẩn)`);

// ------------------------------------------------------------------ 14. ghi log
step('Ghi log vào thư mục khách');
fs.mkdirSync(custDir, { recursive: true });
const logFile = path.join(custDir, 'deployments.log');
const htmlHash = crypto.createHash('sha256').update(fs.readFileSync(path.join(distDir, 'index.html'))).digest('hex').slice(0, 12);
fs.appendFileSync(logFile, `${new Date().toISOString()}  ${liveUrl}  index.html#${htmlHash}  KV=${ns.id}\n`);
ok(path.relative(ROOT, logFile));

// ------------------------------------------------------------------ xong
if (!keep) fs.rmSync(buildDir, { recursive: true, force: true });
console.log('\n━━━ XONG ━━━');
console.log(`  Link bàn giao khách: ${liveUrl}`);
console.log(`  Domain riêng: dashboard Pages → ${projName} → Custom domains (hỏi khách thêm bản ghi CNAME)`);
console.log('  Nếu đã gắn domain riêng: đặt site.domain = domain đó trong config.js rồi chạy lại với --custom-domain.');
