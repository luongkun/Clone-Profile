/**
 * API đếm LƯỢT XEM + LƯỢT THÍCH cho trang bio.
 *
 * Đây là Cloudflare Pages Function: file `functions/api/stats.js` tự động trở
 * thành đường dẫn `/api/stats` ngay khi deploy lên Pages — không cần server riêng,
 * không cần build, và vẫn nằm cùng origin với trang nên CSP ('self') không phải sửa.
 *
 * CẦN LÀM MỘT LẦN: tạo KV namespace rồi gắn vào project Pages với tên biến STATS
 * (xem hướng dẫn ở README.md, mục "Lượt xem & lượt thích"). Chưa gắn thì API trả
 * { disabled: true } và trang tự ẩn phần này — không vỡ gì.
 *
 * Chống lạm dụng ở mức vừa đủ: chỉ nhận request cùng origin, mỗi IP chỉ tính
 * 1 lượt xem / 10 phút và 1 lượt thích / ngày.
 */

const JSON_HEADERS = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
};

const VIEW_COOLDOWN_SECONDS = 600;      // 10 phút
const LIKE_COOLDOWN_SECONDS = 86400;    // 1 ngày

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

/** Chỉ cho phép request xuất phát từ chính website này. */
function sameOrigin(request) {
    const origin = request.headers.get('Origin');
    const referer = request.headers.get('Referer');
    const host = new URL(request.url).host;
    const from = origin || referer;
    if (!from) return true;             // curl/kiểm tra nội bộ không gửi hai header này
    try {
        return new URL(from).host === host;
    } catch {
        return false;
    }
}

/** Băm IP để KV không lưu địa chỉ thô; khoá tự hết hạn nên không lưu lâu dài. */
async function visitorKey(request, kind) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`bio-stats|${ip}`));
    const hash = [...new Uint8Array(digest)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
    return `rl:${kind}:${hash}`;
}

async function readCount(kv, key) {
    return parseInt((await kv.get(key)) || '0', 10) || 0;
}

async function bump(kv, key, cooldownKey, cooldownSeconds) {
    const blocked = await kv.get(cooldownKey);
    if (blocked) return false;
    await kv.put(cooldownKey, '1', { expirationTtl: cooldownSeconds });
    // KV không có phép tăng nguyên tử: đọc - sửa - ghi. Với lưu lượng của một
    // trang cá nhân thì chênh lệch vài lượt khi trùng thời điểm là chấp nhận được.
    const current = await readCount(kv, key);
    await kv.put(key, String(current + 1));
    return true;
}

async function payload(kv, request, extra = {}) {
    const liked = Boolean(await kv.get(await visitorKey(request, 'like')));
    return json({
        views: await readCount(kv, 'views'),
        likes: await readCount(kv, 'likes'),
        liked,
        ...extra
    });
}

export async function onRequestGet({ request, env }) {
    const kv = env.STATS;
    if (!kv) return json({ disabled: true });
    if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });

    await bump(kv, 'views', await visitorKey(request, 'view'), VIEW_COOLDOWN_SECONDS);
    return payload(kv, request);
}

export async function onRequestPost({ request, env }) {
    const kv = env.STATS;
    if (!kv) return json({ disabled: true });
    if (!sameOrigin(request)) return new Response('Forbidden', { status: 403 });

    let action = '';
    try {
        ({ action } = await request.json());
    } catch {
        return json({ error: 'bad_request' }, 400);
    }
    if (action !== 'like') return json({ error: 'unknown_action' }, 400);

    // counted = false khi hôm nay IP này đã thích rồi (trang sẽ cảm ơn khác đi)
    const counted = await bump(kv, 'likes', await visitorKey(request, 'like'), LIKE_COOLDOWN_SECONDS);
    return payload(kv, request, { liked: true, counted });
}

// Chặn mọi method khác cho gọn
export async function onRequest({ request, env }) {
    if (request.method === 'GET') return onRequestGet({ request, env });
    if (request.method === 'POST') return onRequestPost({ request, env });
    return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, POST' } });
}
