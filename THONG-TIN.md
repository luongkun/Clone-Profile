# 📝 PHIẾU ĐIỀN THÔNG TIN — ĐỔI TRANG THÀNH CỦA BẠN

> **Cách dùng:** điền giá trị vào cột **"Giá trị của bạn"** bên dưới, sau đó mở
> `config.js` và copy từng giá trị vào đúng mục đã ghi chú. Xong chạy:
>
> ```bash
> node setup.mjs
> ```
>
> Ký hiệu: 🔴 = **bắt buộc phải đổi** · 🟡 = tuỳ chọn (muốn ẩn thì để `""` hoặc `[]`)

---

## PHẦN 0 — THÔNG TIN WEBSITE → `site` trong config.js

| # | Nội dung | Giá trị của bạn | Tên biến trong config |
|---|----------|-----------------|----------------------|
| 🔴 0.1 | Tên đầy đủ của bạn (footer + thẻ chia sẻ FB/Discord) | `→ ...........` | `site.fullName` |
| 🔴 0.2 | Domain sau khi deploy (không có https://) — vd `tenban.pages.dev` | `→ ...........` | `site.domain` |
| 🟡 0.3 | Mô tả trang khi dán link lên Facebook/Messenger/Discord | `→ ...........` | `site.description` |
| 🟡 0.4 | Câu nhỏ dưới tên ở màn hình chào | `→ ...........` | `site.welcomeText` |
| 🟡 0.5 | Chữ trên nút "vào trang" | `→ ...........` | `site.enterLabel` |
| 🟡 0.6 | Chữ logo ở footer giữa card | `→ ...........` | `site.footerBrand` |
| 🟡 0.7 | Chữ nhỏ kế bên footer (vd `PROFILE`) | `→ ...........` | `site.footerSuffix` |
| 🟡 0.8 | 1–2 chữ cái trong favicon/icon app (vd `NL`) | `→ ...........` | `site.monogram` |

## PHẦN 1 — TIÊU ĐỀ TAB & DISCORD → đầu file config.js

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🔴 1.1 | Tên chạy ở tiêu đề tab (vd `@TenBan`) | `→ ...........` | `siteName` |
| 🔴 1.2 | Discord User ID của bạn (Developer Mode → chuột phải avatar → Copy User ID) | `→ ...........` | `discordId` |
| 🟡 1.3 | Bật kết nối Discord realtime? (`false` = bio thường, ẩn vùng presence + nút Copy Discord) | `→ ...........` | `discordEnabled` |

> ⚠️ Để presence realtime chạy được: tài khoản Discord ở 1.2 phải tham gia server <https://discord.gg/lanyard>

## PHẦN 2 — PROFILE CÁ NHÂN → `profile` trong config.js

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🔴 2.1 | Tên hiển thị trên card (dự phòng khi chưa có Discord) | `→ ...........` | `profile.name` |
| 🟡 2.2 | Tên trên card lấy theo Discord thật? (`true`/`false`) | `→ ...........` | `profile.syncNameWithDiscord` |
| 🔴 2.3 | Username Discord (dòng `@username`) | `→ ...........` | `profile.username` |
| 🟡 2.4 | Tagline ngắn (vd `Gamer • Music Lover • Coffee Addict`) | `→ ...........` | `profile.title` |
| 🟡 2.5 | Link avatar dự phòng (khi CDN Discord bị chặn) — thường giữ nguyên | `→ ...........` | `profile.avatar` |
| 🟡 2.6 | File avatar dự phòng local — thường giữ nguyên | `→ ...........` | `profile.avatarLocal` |
| 🟡 2.7 | Ảnh banner card (file trong repo) | `→ ...........` | `profile.banner` |
| 🟡 2.8 | Bio dài (giới thiệu bản thân) | `→ ...........` | `profile.bio` |
| 🟡 2.9 | Vị trí (vd `Hà Nội, Việt Nam`) | `→ ...........` | `profile.location` |
| 🟡 2.10 | 4 câu quote ngắn xoay vòng | `→ 1) ......... 2) ......... 3) ......... 4) .........` | `profile.quotes` |
| 🟡 2.11 | Badges (mỗi cái: icon FontAwesome + nhãn) | `→ xem ví dụ trong config` | `profile.badges` |

## PHẦN 3 — DIRECT CONNECTIONS (mạng xã hội) → `socials` trong config.js

> Mỗi dòng một mục. Mục `copy` = bấm là sao chép (không mở link).
> Icon mẫu: `fa-brands fa-facebook`, `fa-brands fa-tiktok`, `fa-brands fa-instagram`,
> `fa-brands fa-youtube`, `fa-brands fa-github`, `fa-solid fa-envelope`…

| # | Mạng | Link (hoặc nội dung cần copy) | Icon |
|---|------|-------------------------------|------|
| 🔴 3.1 | Facebook | `→ ...........` | `fa-brands fa-facebook` |
| 🔴 3.2 | TikTok | `→ ...........` | `fa-brands fa-tiktok` |
| 🔴 3.3 | Email | `→ ...........` | `fa-solid fa-envelope` |
| 🟡 3.4 | Spotify | `→ ...........` | `fa-brands fa-spotify` |
| 🟡 3.5 | Instagram | `→ ...........` | `fa-brands fa-instagram` |
| 🟡 3.6 | YouTube | `→ ...........` | `fa-brands fa-youtube` |
| 🟡 3.7 | GitHub | `→ ...........` | `fa-brands fa-github` |
| 🟡 3.8 | Nút Donate (giữ nguyên, điền QR ở Phần 4) | — | `fa-solid fa-qrcode` |

```js
// Ví dụ 1 mục social trong config.js:
{ name: "Facebook", icon: "fa-brands fa-facebook", url: "https://facebook.com/tenban" },
{ name: "Email",    icon: "fa-solid fa-envelope",  url: "", copy: "email@cuaban.com" },
```

## PHẦN 4 — DONATE → `donate` trong config.js

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🟡 4.1 | File ảnh QR chuyển khoản (đặt cùng thư mục gốc) | `→ ...........` | `donate.qrImage` |
| 🟡 4.2 | Tên ngân hàng (để trống `""` = ẩn dòng) | `→ ...........` | `donate.bankName` |
| 🟡 4.3 | Tên chủ tài khoản | `→ ...........` | `donate.accountName` |
| 🟡 4.4 | Số tài khoản | `→ ...........` | `donate.accountNumber` |
| 🟡 4.5 | Lời nhắn chuyển khoản | `→ ...........` | `donate.note` |

> ⚠️ Đổi ảnh QR xong PHẢI chạy `python3 .github/scripts/check_site.py` và cập nhật
> mốc: `zbarimg --raw -q qr-bank.png | sha256sum > .github/qr-expected.sha256`
> (QR sai một ký tự = tiền chuyển sai người — bộ kiểm tra sẽ chặn push).

## PHẦN 5 — DISCORD SERVER → `servers` trong config.js

> Nên dùng **invite vĩnh viễn** (Expire after: Never). Icon/banner/member/online
> tự cập nhật realtime từ Discord — chỉ cần điền invite là đủ.

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🟡 5.1 | Link invite server (vĩnh viễn) | `→ ...........` | `servers[].inviteUrl` |
| 🟡 5.2 | Tên server (chỉ hiện lúc chưa load xong) | `→ ...........` | `servers[].name` |
| 🟡 5.3 | Vai trò/nhãn (vd `Cộng đồng ...`) | `→ ...........` | `servers[].role` |
| 🟡 5.4 | Mô tả ngắn về server | `→ ...........` | `servers[].description` |
| 🟡 5.5 | Nhãn góc card (vd `COMMUNITY`) | `→ ...........` | `servers[].tag` |

## PHẦN 6 — NHẠC NỀN → `music` trong config.js

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🟡 6.1 | Tự phát nhạc khi khách bấm vào? (`true`/`false`) | `→ ...........` | `music.autoplayOnEnter` |
| 🟡 6.2 | Âm lượng mặc định (0 → 1, vd `0.5`) | `→ ...........` | `music.volume` |
| 🟡 6.3 | Bài 1: tên / ca sĩ / file mp3 | `→ ....... / ....... / .......` | `music.playlist[0]` |
| 🟡 6.4 | Bài 2: tên / ca sĩ / file mp3 | `→ ....... / ....... / .......` | `music.playlist[1]` |
| 🟡 6.5 | Bài 3: tên / ca sĩ / file mp3 | `→ ....... / ....... / .......` | `music.playlist[2]` |

> File mp3 đặt cùng thư mục gốc với index.html. Không muốn nhạc thì để `playlist: []`.

## PHẦN 7 — PANEL SETLOVE (cặp đôi) → `setlove` trong config.js

| # | Nội dung | Giá trị của bạn | Tên biến |
|---|----------|-----------------|----------|
| 🟡 7.0 | Bật panel Setlove? (`false` = mất nút trái tim + panel) | `→ ...........` | `setlove.enabled` |
| 🟡 7.1 | Tên của bạn | `→ ...........` | `setlove.myName` |
| 🟡 7.2 | Tên người ấy | `→ ...........` | `setlove.partnerName` |
| 🟡 7.3 | Discord ID của bạn | `→ ...........` | `setlove.myDiscordId` |
| 🟡 7.4 | Discord ID người ấy | `→ ...........` | `setlove.partnerDiscordId` |
| 🟡 7.5 | Ngày bắt đầu yêu (YYYY-MM-DD, vd `2026-05-27`) | `→ ...........` | `setlove.startDate` |
| 🟡 7.6 | Các câu yêu thương (bấm vào câu để đổi) | `→ 1) ....... 2) ....... …` | `setlove.quotes` |
| 🟡 7.7 | Ảnh kỷ niệm: `{ src: "...", caption: "..." }` — để `[]` để ẩn | `→ ...........` | `setlove.photos` |

> Không dùng panel này? Xoá mục `setlove` khỏi config — nút trái tim sẽ tự biến mất.

## PHẦN 8 — SỞ THÍCH (6 pill) → `techStack` trong config.js

| # | Tên sở thích | Chi tiết nhỏ | Icon |
|---|-------------|--------------|------|
| 🟡 8.1 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |
| 🟡 8.2 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |
| 🟡 8.3 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |
| 🟡 8.4 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |
| 🟡 8.5 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |
| 🟡 8.6 | `→ ...........` | `→ ...........` | `→ fa-solid fa-....` |

```js
// Ví dụ 1 pill trong config.js:
{ name: "Gaming", domain: "PC • Mobile • Co-op", icon: "fa-solid fa-gamepad" },
```

## PHẦN 9 — HIỆU ỨNG → `effects` trong config.js (đều là `true`/`false`)

| # | Hiệu ứng | Bật? |
|---|----------|------|
| 🟡 9.1 | Card nghiêng theo chuột (`enableTilt`) | `→ ...........` |
| 🟡 9.2 | Đốm sáng theo chuột (`enableSpotlight`) | `→ ...........` |
| 🟡 9.3 | Con trỏ tuỳ chỉnh (`enableCustomCursor`) | `→ ...........` |
| 🟡 9.4 | Hạt nền bay (`enableParticles`) | `→ ...........` |
| 🟡 9.5 | Sao băng (`enableShootingStars`) | `→ ...........` |

## PHẦN 10 — FILE ẢNH CẦN THAY (không cần sửa code)

| # | File | Là gì | Đã thay? |
|---|------|-------|---------|
| 🟡 10.1 | `avatar-me.webp` | Avatar dự phòng của bạn | `→ ☐` |
| 🟡 10.2 | `avatar-partner.webp` | Avatar dự phòng người ấy | `→ ☐` |
| 🟡 10.3 | `deco-me.webp` | Khung avatar dự phòng của bạn | `→ ☐` |
| 🟡 10.4 | `banner_executive.webp` | Banner card | `→ ☐` |
| 🟡 10.5 | `profile_banner_cyber.webp` | Banner dự phòng card server | `→ ☐` |
| 🟡 10.6 | `qr-bank.png` | Ảnh QR chuyển khoản | `→ ☐` |
| 🟡 10.7 | `og-image.jpg` | Ảnh 1200×630 khi chia sẻ link | `→ ☐` |
| 🟡 10.8 | `icon-192.png` / `icon-512.png` / favicon… | Bộ icon app (sinh lại bằng make_icons.py) | `→ ☐` |
| 🟡 10.9 | `bai*.mp3` | Các bài nhạc nền | `→ ☐` |

---

## ✅ SAU KHI ĐIỀN XONG — 3 LỆNH CUỐI

```bash
node setup.mjs                                    # 1. đồng bộ mọi nơi khác từ config.js
python3 .github/scripts/check_site.py             # 2. kiểm tra (cả QR)
python3 -m http.server 8000                       # 3. thử tại http://127.0.0.1:8000
```

> Bảo mật trước khi giao trang cho khách: xoá số tài khoản/QR của **người bán**
> khỏi Phần 4 và file `qr-bank.png`, điền thông tin của người mua vào.
