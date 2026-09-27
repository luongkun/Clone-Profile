/**
 * Chạy thử API đếm lượt xem / lượt thích (functions/api/stats.js) bằng KV giả.
 *
 * Vì sao có file này: đây là phần DUY NHẤT của website chạy trên server. Sai một
 * dòng ở đây thì lỗi không hiện ra ở máy (máy cục bộ không chạy Pages Function),
 * mà chỉ hiện trên live — đúng kiểu lỗi khó lần. Bộ kiểm tra này chạy được ở máy
 * và trong GitHub Actions, không cần tài khoản Cloudflare.
 *
 * Cách dùng:  node .github/scripts/test_stats.mjs [thư_mục_gốc]
 */

import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] || path.join(here, '..', '..'));
const target = path.join(root, 'functions', 'api', 'stats.js');
const api = await import('file://' + encodeURI(target));

const HOST = 'https://luongkun.pages.dev';

function makeKv() {
    const store = new Map();
    return {
        store,
        ttl: [],
        async get(key) { return store.has(key) ? store.get(key) : null; },
        async put(key, value, opts) {
            store.set(key, value);
            this.ttl.push((opts && opts.expirationTtl) || 0);
        }
    };
}

function req(method, { origin = HOST, ip = '1.2.3.4', body, rawBody } = {}) {
    const headers = new Headers({ 'CF-Connecting-IP': ip });
    if (origin) headers.set('Origin', origin);
    const init = { method, headers };
    if (rawBody !== undefined) {
        init.body = rawBody;
    } else if (body) {
        init.body = JSON.stringify(body);
        headers.set('Content-Type', 'application/json');
    }
    return new Request(`${HOST}/api/stats`, init);
}

const kv = makeKv();
const env = { STATS: kv };
const results = [];
const check = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });

let res = await api.onRequestGet({ request: req('GET'), env });
let data = await res.json();
check('Lượt xem đầu tiên được tính (views = 1)', data.views === 1 && data.likes === 0 && data.liked === false, JSON.stringify(data));

res = await api.onRequestGet({ request: req('GET'), env });
data = await res.json();
check('Cùng IP trong 10 phút: không đếm trùng lượt xem', data.views === 1, JSON.stringify(data));

res = await api.onRequestGet({ request: req('GET', { ip: '5.6.7.8' }), env });
data = await res.json();
check('IP khác: views = 2', data.views === 2, JSON.stringify(data));

res = await api.onRequestPost({ request: req('POST', { body: { action: 'like' } }), env });
data = await res.json();
check('Thích trang: likes = 1, counted = true', data.likes === 1 && data.counted === true && data.liked === true, JSON.stringify(data));

res = await api.onRequestPost({ request: req('POST', { body: { action: 'like' } }), env });
data = await res.json();
check('Cùng IP thích lần hai trong ngày: không cộng thêm', data.likes === 1 && data.counted === false, JSON.stringify(data));

res = await api.onRequestPost({ request: req('POST', { body: { action: 'like' }, ip: '5.6.7.8' }), env });
data = await res.json();
check('IP khác thích: likes = 2', data.likes === 2 && data.counted === true, JSON.stringify(data));

res = await api.onRequestGet({ request: req('GET'), env });
data = await res.json();
check('Quay lại sau khi thích: liked = true (tim đặc)', data.liked === true, JSON.stringify(data));

res = await api.onRequestGet({ request: req('GET', { origin: 'https://evil.example' }), env });
check('Request từ site khác: chặn bằng 403', res.status === 403, `status=${res.status}`);

res = await api.onRequest({ request: req('DELETE'), env });
check('Method khác: 405 kèm Allow: GET, POST', res.status === 405 && res.headers.get('Allow') === 'GET, POST', `status=${res.status}`);

res = await api.onRequestGet({ request: req('GET'), env: {} });
data = await res.json();
check('Chưa gắn KV: trả { disabled: true } để trang tự ẩn', data.disabled === true, JSON.stringify(data));

res = await api.onRequestPost({ request: req('POST', { body: { action: 'xoa-het' } }), env });
check('Action lạ: 400', res.status === 400, `status=${res.status}`);

res = await api.onRequestPost({ request: req('POST', { rawBody: 'khong-phai-json' }), env });
check('Body không phải JSON: 400', res.status === 400, `status=${res.status}`);

// Khoá chống trùng PHẢI hết hạn (không lưu IP lâu dài), còn hai biến đếm thì
// KHÔNG được hết hạn — nếu khoá đếm có TTL thì số liệu sẽ tự mất sau vài ngày.
const expiring = kv.ttl.filter(t => t > 0);
const permanent = kv.ttl.filter(t => t === 0);
check('Khoá chống trùng có hạn dùng (600s cho lượt xem, 86400s cho lượt thích)',
    expiring.filter(t => t === 600).length >= 2 && expiring.filter(t => t === 86400).length >= 2,
    `ttl=${JSON.stringify(kv.ttl)}`);
check('Biến đếm không hết hạn (số liệu không tự mất)',
    permanent.length === 4 && kv.store.get('views') === '2' && kv.store.get('likes') === '2',
    `counter puts=${permanent.length}, views=${kv.store.get('views')}, likes=${kv.store.get('likes')}`);

const failed = results.filter(r => !r.pass);
for (const r of results) {
    console.log(`${r.pass ? '  ✓' : '  ✗'} ${r.name}${r.pass ? '' : ` -> ${r.detail}`}`);
}
console.log(`\n${results.length - failed.length}/${results.length} phép thử API đạt`);
process.exit(failed.length ? 1 : 0);
