# Discord-Profile

Trang bio cá nhân tĩnh, tích hợp **Discord Presence thời gian thực** qua [Lanyard](https://github.com/Phineas/lanyard) và tự động lấy thông tin **máy chủ Discord** từ Invite API.

> 🛠️ **Muốn đưa trang thành của bạn?** Đọc [SETUP.md](SETUP.md) trước — chỉ cần sửa
> `config.js` rồi chạy `node setup.mjs`, mọi nơi còn lại được đồng bộ tự động.

Giao diện gồm: màn hình chào, thẻ profile (tên / tên ID / avatar / khung avatar đồng bộ theo tài khoản Discord), widget nhạc nền, particle canvas, custom cursor, khu "sở thích" và card máy chủ Discord có số thành viên / số online cập nhật realtime.

## Cấu trúc file

| File | Vai trò |
|---|---|
| `config.js` | **Nơi cần sửa**: thông tin website, Discord ID, profile, máy chủ, social, playlist nhạc |
| `setup.mjs` | **Chạy sau khi sửa config** (`node setup.mjs`): ghi lại thẻ chia sẻ, manifest, sitemap, robots, service worker từ config |
| `SETUP.md` | Hướng dẫn từng bước đưa trang thành của bạn |
| `index.html` | Khung trang, markup tĩnh (giá trị dự phòng được setup.mjs ghi lại, JS đổ dữ liệu thật vào) |
| `style.css` | Toàn bộ giao diện, responsive, hiệu ứng |
| `script.js` | Lanyard realtime, render máy chủ, audio, cursor, particle, typewriter |
| `bai1.mp3` | Nhạc nền |
| `banner_executive.webp`, `profile_banner_cyber.webp` | Ảnh banner của card và của card máy chủ |
| `avatar_decoration.webp`, `favicon*`, `apple-touch-icon.png` | Icon, favicon |
| `qr-bank.png` | Ảnh QR chuyển khoản, hiện khi bấm nút Donate |
| `og-image.jpg` | Thẻ 1200×630 hiện khi chia sẻ link lên Facebook / Messenger / Discord |
| `icon-192.png`, `icon-512.png` | Icon khi khách cài trang thành app (monogram NL) |
| `icon-512-maskable.png` | Bản maskable cho Android: nền đặc kín góc + chữ thu nhỏ nằm trong vùng an toàn |
| `functions/api/stats.js` | API đếm lượt xem / lượt thích (Cloudflare Pages Function + KV) |
| `.github/scripts/check_site.py` | Bộ kiểm tra tự động (chạy ở máy và trên CI) |
| `.github/scripts/make_icons.py` | Sinh lại cả bộ icon từ chữ — `setup.mjs` tự ghi chữ monogram vào đây |
| `.github/scripts/make_og_image.py` | Sinh lại thẻ chia sẻ `og-image.jpg` — tên/handle/domain cũng do `setup.mjs` ghi |

### Ghi chú về dung lượng

Trang đã được nén tối đa có thể đo được:

- Thẻ audio dùng `preload="none"` — bài nhạc **không tải** cho tới khi khách bấm vào màn chào.
- Ảnh QR được nạp **lúc trình duyệt rảnh** (`requestIdleCallback`) nên bấm Donate là hiện ngay, mà vẫn không tranh băng thông với lần vẽ đầu tiên (xem `loadDonateQr()`).
- Ba ảnh nền/khung dùng WebP đã cắt đúng khung nhìn thật (banner card hiển thị 1124×117 CSS nên ảnh chỉ cần đúng tỉ lệ đó, ở 2x cho màn Retina).

Tổng tài nguyên tải lần đầu khoảng **0.3 MB** cho khách không bật nhạc (trước đây ~2.9 MB).

## Kiểm tra trước khi push

```bash
python3 .github/scripts/check_site.py
```

Bộ kiểm tra canh 9 nhóm lỗi đã từng xảy ra thật: file được tham chiếu nhưng thiếu, ảnh QR bị đổi/hỏng (giải mã và so với mốc sha256 trong `.github/qr-expected.sha256`), sai cú pháp JavaScript, CSS lệch ngoặc, cú pháp ES module của Pages Function, và **logic API đếm lượt xem/lượt thích** (`.github/scripts/test_stats.mjs`, chạy với KV giả — không cần tài khoản Cloudflare).

Cùng bộ kiểm tra này cũng chạy tự động trong GitHub Actions mỗi lần push lên `main`.

> Khi **chủ ý** đổi ảnh QR: chạy `python3 .github/scripts/check_site.py` để lấy hash mới rồi cập nhật `.github/qr-expected.sha256`. Nếu không cập nhật, CI sẽ chặn push — đó là chủ ý, vì QR sai một ký tự là tiền chuyển sai người.

## Cấu hình

Đọc [SETUP.md](SETUP.md) cho luồng đầy đủ. Tóm tắt: sửa `config.js` (mọi thông tin
nằm ở đây, kể cả tiêu đề/thẻ chia sẻ qua mục `site`), rồi chạy:

```bash
node setup.mjs
```

**Điều kiện để presence hoạt động**: tài khoản Discord phải tham gia server [discord.gg/lanyard](https://discord.gg/lanyard). Nếu không, Lanyard trả 404 và trang hiển thị thông báo "Chưa kích hoạt Lanyard".

**Cách lấy Discord User ID**: bật Developer Mode trong Discord → chuột phải vào avatar → Copy User ID.

Nên dùng **invite vĩnh viễn** (Expire after: Never) cho máy chủ, nếu không card máy chủ sẽ mất dữ liệu sau khi link hết hạn.

## Lượt xem & lượt thích (tuỳ chọn)

Trang có sẵn vùng "👁 lượt xem · ❤️ lượt thích" ở footer, dùng hàm trong
`functions/api/stats.js` (Cloudflare Pages Function) + một KV namespace của Cloudflare.

**Chưa gắn KV thì phần này tự ẩn** — không lỗi, không ảnh hưởng gì khác.

> Project `luongkun` **đã bật sẵn**: namespace `bio-stats`
> (`c86f65cc025e4c8b949e5e7ed85cab09`) đã gắn với biến `STATS` cho cả Production và
> Preview. Phần dưới chỉ cần làm lại khi bạn tạo project Pages mới.

1. Cloudflare Dashboard → **Workers & Pages → KV → Create namespace**, đặt tên ví dụ `bio-stats`.
2. Vào project Pages `luongkun` → **Settings → Functions → KV namespace bindings → Add binding**:
   - Variable name: `STATS` (đúng chữ này, code đọc `env.STATS`)
   - KV namespace: `bio-stats`
3. Chọn môi trường **Production** (và **Preview** nếu muốn thử ở bản preview), rồi **Save**.
4. Push code lên `main` (Pages sẽ deploy cả thư mục `functions/`) hoặc bấm **Retry deployment**.

Kiểm tra nhanh sau khi deploy:

```bash
curl -s https://luongkun.pages.dev/api/stats
# -> {"views":12,"likes":3,"liked":false}
```

Chống lạm dụng có sẵn: chỉ nhận request cùng origin, mỗi IP tính tối đa **1 lượt xem / 10 phút**
và **1 lượt thích / ngày**. IP được băm trước khi lưu, khoá tự hết hạn nên không lưu dữ liệu lâu dài.

## Chạy thử tại máy

Trang gồm nhiều file nên cần chạy qua HTTP server, không mở trực tiếp bằng `file://`:

```bash
python3 -m http.server 8000
# rồi mở http://127.0.0.1:8000
```

Lưu ý: `python3 -m http.server` không chạy được `functions/`, nên khi thử ở máy phần
lượt xem / lượt thích sẽ tự ẩn — đó là hành vi đúng, không phải lỗi.

## Deploy

Toàn bộ là file tĩnh, không cần build. Có thể deploy thẳng lên GitHub Pages, Cloudflare Pages, Netlify hoặc Vercel (chọn thư mục gốc làm thư mục publish).

## Giấy phép

Dùng cho mục đích cá nhân.
