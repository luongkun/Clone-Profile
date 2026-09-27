# HƯỚNG DẪN CÀI ĐẶT CHO NGƯỜI MUA

> 📝 **Muốn xem nhanh cần điền những gì?** Mở [THONG-TIN.md](THONG-TIN.md) —
> phiếu điền thông tin đầy đủ theo từng mục, in ra hoặc điền trực tiếp vào đó.

Trang này được thiết kế để **chỉ cần sửa 1 file duy nhất là thành của bạn**: `config.js`.
Mọi nơi khác (thẻ chia sẻ, manifest, sitemap, robots, service worker, script sinh icon)
sẽ được **tự động ghi lại** bằng 1 lệnh.

> Yêu cầu: đã cài [Node.js](https://nodejs.org) (bản 18 trở lên). Python chỉ cần
> khi muốn sinh lại icon/og-image và chạy bộ kiểm tra.

---

## Bước 1 — Sửa `config.js`

> 💡 **Không thích sửa code tay?** Mở `admin.html` (qua `python3 -m http.server 8000`):
> form nhập trực quan chia đúng 9 phần của config, tự nạp thông tin hiện có,
> bấm **Tải config.js** là có file hoàn chỉnh thay vào thư mục trang.

Mở `config.js`, đi theo thứ tự các mục đã được đánh số. Các mục **bắt buộc**:

| Mục trong config | Ý nghĩa |
|---|---|
| `site.fullName` | Tên đầy đủ của bạn (footer + thẻ chia sẻ) |
| `site.domain` | Domain sau khi deploy (dùng subdomain `*.pages.dev` miễn phí cũng được) |
| `discordId` | Discord User ID của bạn — [hướng dẫn lấy](https://support.discord.com/hc/vi/articles/206346498) (bật Developer Mode → chuột phải avatar → Copy User ID) |
| `profile.*` | Tên, tagline, bio, vị trí, sở thích, badges |
| `socials` | Danh sách liên kết mạng xã hội |

Các mục **tuỳ chọn**:

| Mục trong config | Ý nghĩa |
|---|---|
| `servers` | Card máy chủ Discord (dùng invite vĩnh viễn — Expire after: Never) |
| `music.playlist` | Nhạc nền: đặt file `.mp3` vào thư mục gốc rồi khai báo tại đây |
| `donate` | Nút donate + ảnh QR ngân hàng |
| `setlove` | Panel cặp đôi: tên 2 người, 2 Discord ID, ngày bắt đầu yêu, câu nói |
| `effects` | Bật/tắt từng hiệu ứng (tilt, spotlight, cursor, particle, sao băng) |
| `techStack` | 6 pill sở thích |
| `discordEnabled` | `false` = tắt Discord realtime: ẩn vùng presence, dot trạng thái, nhãn DISCORD LIVE, nút Copy Discord — trang thành bio thường |
| `setlove.enabled` | `false` = tắt panel cặp đôi: mất luôn nút trái tim góc màn |
| `music.enabled` | `false` = tắt nhạc nền: ẩn widget điều khiển nhạc, không tự phát |
| `donate.enabled` | `false` = ẩn nút Donate khỏi danh sách social |

**Điều kiện để presence realtime hoạt động**: tài khoản Discord của bạn (và của
người ấy trong `setlove`) phải tham gia server [discord.gg/lanyard](https://discord.gg/lanyard).

## Bước 2 — Chạy setup

```bash
node setup.mjs
```

Lệnh này tự ghi lại toàn bộ phần còn lại từ `config.js`:

- `index.html` — tiêu đề tab, meta description, thẻ chia sẻ OG/Twitter (bot
  Facebook/Messenger/Discord không chạy JavaScript nên các thẻ này bắt buộc
  viết tĩnh), và các giá trị dự phòng hiển thị trước khi JS chạy.
- `manifest.json` — tên app khi khách cài trang thành app (PWA).
- `sitemap.xml` + `robots.txt` — domain cho Google, tự cấm index các file nhạc.
- `sw.js` — service worker offline (danh sách file dự phòng lấy theo config).
- `.github/scripts/make_icons.py` + `make_og_image.py` — chữ monogram, tên,
  handle, domain dùng khi sinh lại icon/thẻ chia sẻ.

Chạy được bao nhiêu lần cũng không sao — lệnh chỉ ghi lại đúng chỗ thay đổi.

## Bước 3 — Thay ảnh (cùng tên file thì khỏi sửa gì)

| File | Là gì |
|---|---|
| `avatar-me.webp` | Avatar dự phòng của bạn (khi CDN Discord bị chặn) |
| `avatar-partner.webp` | Avatar dự phòng của người ấy (panel Setlove) |
| `deco-me.webp` | Khung avatar dự phòng của bạn |
| `banner_executive.webp` | Ảnh banner của card (khai báo ở `profile.banner`) |
| `profile_banner_cyber.webp` | Ảnh banner dự phòng của card máy chủ |
| `qr-bank.png` | Ảnh QR chuyển khoản (khai báo ở `donate.qrImage`) |
| `og-image.jpg` | Ảnh 1200×630 khi dán link lên Facebook/Messenger/Discord |
| `bai*.mp3` … | Các bài nhạc nền (khai báo ở `music.playlist`) |

## Bước 4 — Sinh lại icon & og-image (chỉ khi đổi tên/monogram)

```bash
pip install Pillow          # nếu chưa có
python3 .github/scripts/make_icons.py
python3 .github/scripts/make_og_image.py avatar-me.webp
```

Bộ icon (favicon, icon cài app) và thẻ chia sẻ sẽ được vẽ lại đúng chữ monogram
trong `site.monogram` — không cần mở phần mềm thiết kế.

## Bước 5 — Kiểm tra rồi deploy

```bash
python3 .github/scripts/check_site.py
```

Bộ kiểm tra bắt các lỗi từng xảy ra thật: file được tham chiếu nhưng thiếu, ảnh
QR hỏng/đổi mà không chủ ý (so sha256 — **QR sai một ký tự là tiền chuyển sai
người**), sai cú pháp JS/CSS, lỗi API đếm lượt xem. Khi **chủ ý** đổi ảnh QR,
cập nhật mốc mới: `zbarimg --raw -q qr-bank.png | sha256sum > .github/qr-expected.sha256`.

Deploy: đẩy code lên GitHub rồi kết nối Cloudflare Pages / Netlify / Vercel /
GitHub Pages (thư mục gốc, không cần build). Lượt xem + lượt thích dùng
Cloudflare Pages Function + KV — xem hướng dẫn gắn KV trong `README.md`
(chưa gắn thì phần này tự ẩn, không lỗi).

---

## Checklist nhanh trước khi bàn giao

- [ ] `config.js`: đã đổi `site.*`, `discordId`, `profile.*`, `socials`
- [ ] Đã chạy `node setup.mjs` sau lần sửa config cuối
- [ ] Đã thay các file ảnh/nhạc riêng tư (avatar, QR, og-image, mp3)
- [ ] Đã chạy `make_icons.py` + `make_og_image.py` nếu đổi tên/monogram
- [ ] `check_site.py` báo "tất cả mục kiểm tra đều đạt"
- [ ] Đã xoá tài khoản/mã QR cá nhân của người bán khỏi ảnh và config
- [ ] Đã thử mở trang bằng `python3 -m http.server 8000` và bấm vào màn chào
