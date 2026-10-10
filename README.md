# Discord-Profile

Trang bio cá nhân tĩnh, tích hợp **Discord Presence thời gian thực** qua [Lanyard](https://github.com/Phineas/lanyard) và tự động lấy thông tin **máy chủ Discord** từ Invite API.

Giao diện gồm: màn hình chào, thẻ profile (tên / tên ID / avatar / khung avatar đồng bộ theo tài khoản Discord), widget nhạc nền, particle canvas, custom cursor, khu "sở thích" và card máy chủ Discord có số thành viên / số online cập nhật realtime.

## Cấu trúc file

| File | Vai trò |
|---|---|
| `index.html` | Khung trang, markup tĩnh (JS sẽ đổ dữ liệu thật vào) |
| `style.css` | Toàn bộ giao diện, responsive, hiệu ứng |
| `config.js` | **Nơi cần sửa**: Discord ID, thông tin profile, máy chủ, social, playlist nhạc |
| `script.js` | Lanyard realtime, render máy chủ, audio, cursor, particle, typewriter |
| `1.mp3`, `2.mp3`, `3.mp3` | Nhạc nền (playlist trong `config.js`) |
| `banner_executive.webp`, `server_banner.webp` | Banner của card (tĩnh) và của card máy chủ (WebP động) |
| `deco-me.webp`, `avatar-me.webp` | Ảnh dự phòng khi CDN Discord bị chặn (đồng bộ theo acc hiện tại) |
| `favicon*`, `apple-touch-icon.png` | Favicon tab trình duyệt |
| `qr-bank-v2.png` | Ảnh QR chuyển khoản, hiện khi bấm nút Donate |
| `icon-192.png`, `icon-512.png` | Icon khi khách cài trang thành app (lá xanh) |
| `icon-512-maskable.png` | Bản maskable cho Android: nền đặc kín góc + chữ thu nhỏ nằm trong vùng an toàn |
| `functions/api/stats.js` | API đếm lượt xem / lượt thích (Cloudflare Pages Function + KV) |
| `.github/scripts/check_site.py` | Bộ kiểm tra tự động (chạy ở máy và trên CI) |
| `.github/scripts/make_icons.py` | Sinh lại cả bộ icon lá xanh |

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

Mở `config.js`:

```js
const CONFIG = {
    discordId: "1222143238056574990",   // Discord User ID của bạn
    profile: {
        name: "Toa",                     // giá trị dự phòng khi chưa có dữ liệu Discord
        syncNameWithDiscord: true,       // true = tên trên card lấy theo Discord
        location: "Ninh Bình, Việt Nam",
        // ...
    },
    servers: [ { inviteUrl: "https://discord.gg/..." } ],  // card Discord: tên/icon/số liệu tự live từ Invite API
    // Card nhóm khác (vd Zalo): dùng iconClass + statsText + joinText thay vì icon/members/online,
    // script.js sẽ tự bỏ qua fetch Discord khi link không phải discord.gg
    music: { playlist: [ /* ... */ ] },
    donate: {
        qrImage: "qr-bank-v2.png",          // đổi tên file ảnh QR ở đây nếu cần
        bankName: "",                     // 4 dòng này để trống thì tự ẩn
        accountName: "",
        accountNumber: "",
        note: ""
    },
    // ...
};
```

**Điều kiện để presence hoạt động**: tài khoản Discord phải tham gia server [discord.gg/lanyard](https://discord.gg/lanyard). Nếu không, Lanyard trả 404 và trang hiển thị thông báo "Chưa kích hoạt Lanyard".

**Cách lấy Discord User ID**: bật Developer Mode trong Discord → chuột phải vào avatar → Copy User ID.

Nên dùng **invite vĩnh viễn** (Expire after: Never) cho máy chủ, nếu không card máy chủ sẽ mất dữ liệu sau khi link hết hạn.

## Lượt xem & lượt thích (tuỳ chọn)

Trang có sẵn vùng "👁 lượt xem · ❤️ lượt thích" ở footer, dùng hàm trong
`functions/api/stats.js` (Cloudflare Pages Function) + một KV namespace của Cloudflare.

**Chưa gắn KV thì phần này tự ẩn** — không lỗi, không ảnh hưởng gì khác.

> Project `vth` **đã bật sẵn**: namespace `bio-stats`
> (`c86f65cc025e4c8b949e5e7ed85cab09`) đã gắn với biến `STATS` cho cả Production và
> Preview. Phần dưới chỉ cần làm lại khi bạn tạo project Pages mới.

1. Cloudflare Dashboard → **Workers & Pages → KV → Create namespace**, đặt tên ví dụ `bio-stats`.
2. Vào project Pages `vth` → **Settings → Functions → KV namespace bindings → Add binding**:
   - Variable name: `STATS` (đúng chữ này, code đọc `env.STATS`)
   - KV namespace: `bio-stats`
3. Chọn môi trường **Production** (và **Preview** nếu muốn thử ở bản preview), rồi **Save**.
4. Push code lên `main` (Pages sẽ deploy cả thư mục `functions/`) hoặc bấm **Retry deployment**.

Kiểm tra nhanh sau khi deploy:

```bash
curl -s https://vth.netlify.app/api/stats
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

### Nguồn ảnh banner

### Nguồn ảnh banner

- `banner_executive.webp`: ảnh cửa sổ anime xanh do bạn gửi (cắt bỏ viền tối, upscale nhẹ 2x).
- `server_banner.webp`: WebP động cảnh mưa anime (11 frames) — nén từ GIF bạn gửi xuống ~140KB.
