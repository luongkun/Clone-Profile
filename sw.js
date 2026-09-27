/*
 * Service worker tối giản cho PWA.
 * Chiến lược: KHÔNG cache trang (presence phải luôn realtime), chỉ dự phòng
 * khi MẠNG CHẾT hẳn — trả trang chính + ảnh dự phòng đã có sẵn trong SW.
 */
const CACHE = 'bio-shell-v1';
// LƯU Ý QUAN TRỌNG: chỉ đưa vào đây những đường dẫn trả 200 TRỰC TIẾP.
// Cloudflare Pages chuyển hướng 308 cho '/index.html' và '/404.html', mà
// cache.addAll thất bại nếu gặp phản hồi không phải 200 -> service worker
// sẽ không cài được. Vì vậy dùng './' và KHÔNG liệt kê file HTML nào.
const SHELL = ['./', './icon-192.png', './icon-512.png', './avatar-me.webp', './deco-me.webp', './avatar-partner.webp'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    const req = e.request;
    if (req.method !== 'GET') return;
    // Chỉ dự phòng request cùng nguồn; API/WebSocket/CDN ngoài để mặc định
    if (!req.url.startsWith(self.location.origin)) return;
    // Tải một phần (Range) của thẻ audio không cache được -> trả cho trình duyệt tự xử lý
    if (req.headers.has('range')) return;

    e.respondWith(
        // Mạng trước — không bao giờ phục vụ bản cũ khi còn online.
        // Chuỗi này được thiết kế để KHÔNG BAO GIỜ reject: nếu promise của
        // respondWith reject, trình duyệt coi cả request là lỗi mạng và trang
        // sẽ không tải được — đúng kiểu sự cố không được phép xảy ra.
        fetch(req)
            .then((res) => {
                // Chỉ cache phản hồi 200 hoàn chỉnh (bỏ 206/redirect)
                if (res.status === 200 && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
                }
                return res;
            })
            .catch(() => caches.match(req))
            // Không có cache: điều hướng thì trả trang chính đã cache
            .then((hit) => hit || (req.mode === 'navigate' ? caches.match('./') : null))
            .then((hit) => hit || new Response('Không có kết nối mạng.', {
                status: 503,
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }))
            .catch(() => new Response('', { status: 503 }))
    );
});
