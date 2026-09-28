# Deploy hộ khách — mô hình "agency" (không dính tài khoản cá nhân của bạn, không cần khách lập tài khoản)

> Dành cho **người bán**. Người mua không cần biết Cloudflare là gì — họ chỉ nhận link live.

## Ý tưởng chính

Tạo **một tài khoản Cloudflare "service"** mang tên shop/thương hiệu của bạn (email riêng, không phải
tài khoản cá nhân hiện tại). Toàn bộ khách deploy vào tài khoản đó, mỗi khách 1 project Pages.
Với khách, đây là dịch vụ hosting bán kèm template — họ nhận URL `ten-khach.<shop>.pages.dev`
(hoặc gắn domain riêng của họ sau).

| | Bạn (seller) | Khách |
|---|---|---|
| Tài khoản Cloudflare | Service account của shop ✅ | Không cần tạo ❌ |
| Token API | 1 token dài hạn, chỉ quyền Pages + KV | Không có gì |
| Domain | `ten-khach.<shop>.pages.dev` | Có thể gắn domain riêng sau |

## Bước 0 — Tạo tài khoản service (làm 1 lần)

1. Email riêng cho shop (vd `hosting@<shop>.com` — KHÔNG dùng email cá nhân) → đăng ký tại
   [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up).
2. Đổi tên account theo thương hiệu shop (Manage Account → Preferences), vd `Bio Shop Hosting`.
3. Bật 2FA cho account service.
4. Bạn là "bên vận hành": nội dung khách vi phạm thì bạn có quyền gỡ. Nên ghi điều khoản này vào
   mô tả dịch vụ để có căn cứ khi có report/DMCA.

## Bước 1 — Tạo API token (làm 1 lần)

**My Profile → API Tokens → Create Token → Custom token** với quyền:

| Quyền | Tác dụng |
|---|---|
| Account · Cloudflare Pages · Edit | tạo/deploy project Pages |
| Account · Workers KV Storage · Edit | tạo KV namespace và gắn binding `STATS` |
| User · User Details · Read | để script xác nhận token còn hiệu lực |

- Account Resources: **Include → tài khoản service** (chỉ đúng account đó).
- TTL: không hạn chế, hoặc 1 năm rồi đặt lịch xoay (`--rotate-token` với wrangler ≥ 3.92 nếu bật
  Token rotation; hoặc tạo token mới + xoá token cũ).
- Copy token vào password manager hoặc file `.env.local` (đã nằm trong `.gitignore`):

```
CF_API_TOKEN=...
CF_ACCOUNT_ID=...
```

`CF_ACCOUNT_ID` xem ở trang chủ dashboard của account service (mục Account ID). **Không commit token.**

## Bước 2 — Cài công cụ (làm 1 lần)

```bash
npm install -g wrangler     # CLI Cloudflare; script gọi nó để đẩy file lên Pages
python3 -c "import PIL" 2>/dev/null || pip install pillow   # sinh icon/og-image theo tên khách
```

Ubuntu cần font Noto cho script icon: `sudo apt-get install fonts-noto-core` (có sẵn trên runner CI).
Thiếu Pillow/font thì script deploy vẫn chạy — chỉ là icon/og-image giữ bản template.

## Bước 3 — Thư mục khách hàng

Mỗi khách 1 thư mục con trong `customers/` (thư mục này **không commit** — xem `customers/README.md`):

```
customers/
  ten-khach/
    config.js        # BẮT BUỘC — copy từ config.js gốc rồi điền theo THONG-TIN.md
    assets/          # ảnh/nhạc riêng của khách (đúng tên file template), tuỳ chọn
    pending-assets/  # nơi tạm chứa file khách gửi qua Zipy/Drive, tuỳ chọn
    notes.md         # ghi chú riêng, tuỳ chọn (không deploy)
```

- `site.domain` trong config của khách **phải** = `<ten-khach>.pages.dev` — vì `setup.mjs` ghi
  domain này vào sitemap/canonical/thẻ OG. Khách có domain riêng thì đặt domain đó và thêm cờ
  `--custom-domain` khi deploy.
- File trong `assets/` đặt phẳng, đúng tên file template (`avatar-me.webp`, `qr-bank.png`,
  `bai1.mp3`, …). File nào khách không gửi thì giữ bản template.
- Ảnh avatar/banner khung Setlove nhúng base64 (`profile.avatarData`, `profile.bannerData`,
  `setlove.partnerAvatarData`) có thể tạo bằng `admin.html` ở máy rồi copy chuỗi vào config —
  không cần file riêng.

## Bước 4 — Deploy một khách

```bash
# 1) Dựng bản build + chạy toàn bộ kiểm tra, KHÔNG deploy — luôn chạy trước
node deploy-customer.mjs --customer lan-anh --dry-run

# 2) Deploy thật (token đọc từ biến môi trường hoặc .env.local)
set -a; source .env.local; set +a
node deploy-customer.mjs --customer lan-anh

# Biến thể
node deploy-customer.mjs --customer lan-anh --no-assets   # bỏ qua assets/ của khách
node deploy-customer.mjs --customer lan-anh --keep        # giữ thư mục build lại để soi
```

Script tự làm hết các bước:

1. Kiểm tra config khách (cú pháp, `site.domain`, ảnh QR nếu bật donate).
2. Dựng `customers/build/<slug>/dist` = template + assets khách + config khách.
3. Chạy `node setup.mjs` — đồng bộ index/manifest/sitemap/robots/sw theo config khách.
4. Chạy 2 script Python sinh lại **icon monogram** và **og-image** đúng tên khách.
5. Chạy `check_site.py` trong dist — có lỗi thì dừng, không deploy.
6. Bảo đảm có KV namespace `STATS-<slug>` và project Pages `<slug>`, gắn binding `STATS`.
7. `wrangler pages deploy` → link live `https://<slug>.pages.dev`.
8. Xác minh live (trang + `/api/stats`) và ghi `deployments.log` vào thư mục khách.

Bàn giao khách: gửi link live + hẹn ngày bảo trì. Khách muốn sửa nội dung thì gửi lại
phiếu THONG-TIN.md đã điền — bạn cập nhật config rồi chạy lại 1 lệnh là xong.

> 📦 **Bộ file gửi khách khi bán** (kèm sản phẩm, KHÔNG deploy lên trang live):
> `HUONG-DAN-KHACH.md` — hướng dẫn khách tự điền và gửi thông tin; `admin.html` + `admin.js`
> — form điền thông tin; `THONG-TIN.md` — cho khách thích sửa config tay. Khách đọc
> `HUONG-DAN-KHACH.md` là đủ, không cần biết gì thêm.

## Domain riêng của khách

1. Trong config khách đặt `site.domain = tenmiencuakhach.com` rồi deploy với `--custom-domain`.
2. Dashboard → Pages → project `<slug>` → **Custom domains** → thêm domain (không cần zone trong
   account service; Pages chấp nhận domain từ account Cloudflare khác).
3. Bảo khách thêm bản ghi mà dashboard yêu cầu (thường là CNAME `<slug>.pages.dev` hoặc record A).
   Khách chỉ đụng DNS của tên miền họ — không phải cấp quyền tài khoản.
4. Deploy lại 1 lần sau khi domain verify để canonical/OG khớp.


### Không muốn mở file config của khách? Dùng --ingest (tự động hoàn toàn)

Khách tự điền `admin.html` (hoặc sửa config.js) rồi gửi lại **một file** — config.js,
zip hoặc thư mục (kèm ảnh QR/avatar/nhạc). Bạn **không mở file nào**, chỉ chạy:

```bash
# Nạp mọi thứ khách gửi + dựng + kiểm tra
node deploy-customer.mjs --customer lan-anh --ingest ~/Downloads/lan-anh.zip --dry-run

# Ấn y là deploy thật (bỏ --dry-run) — ra link live
node deploy-customer.mjs --customer lan-anh --ingest ~/Downloads/lan-anh.zip

# Khách gửi thêm ảnh/nhạc sau này (không đụng config):
node deploy-customer.mjs --customer lan-anh --assets ~/Downloads/anh-moi.zip
```

Script tự làm: trích zip (hoặc nhận thư mục/file lẻ), xếp config.js đúng chỗ, ảnh/nhạc vào
`assets/`, notes.md vào thư mục khách, **sao lưu config cũ** thành `config.js.bak-…`, và **tự sửa
`site.domain` sai của khách** thành `<slug>.pages.dev`. Domain riêng (khác *.pages.dev) vẫn phải
đặt trong config + cờ `--custom-domain`.

## Bảo trì nhiều khách

| Việc | Lệnh |
|---|---|
| Cập nhật template cho TẤT CẢ khách | sửa template gốc → lặp `node deploy-customer.mjs --customer <mỗi-khách>` |
| Danh sách khách đang vận hành | `ls customers/` (trừ `build/`, `README.md`) |
| Sửa nội dung 1 khách | sửa `customers/<khách>/config.js` → deploy lại |
| Tắt trang 1 khách (vi phạm/hết hạn) | dashboard Pages → project → Delete project |
| Xem ai deploy gần đây | `cat customers/*/deployments.log` |

## Rủi ro cần biết (chấp nhận trước khi làm dịch vụ)

- **Tài khoản service bị khoá/vi phạm → toàn bộ khách sập cùng lúc.** Đó là lý do không dùng tài
  khoản cá nhân; chấp nhận rủi ro này như một phần mô hình kinh doanh, giữ nội dung khách trong
  sạch và có điều khoản để gỡ nhanh.
- Report/DMCA sẽ về email của account service — kiểm tra hộp thư đó thường xuyên.
- Token là chìa khoá của cả hệ: chỉ để trong `.env.local`/password manager, không commit, xoay
  định kỳ. Máy chạy deploy nên là máy của bạn, không phải máy khách.
- Miễn phí của Pages đủ cho trang bio (băng thông/requests không giới hạn, 500 build/tháng).
  Nếu một ngày vượt (khó xảy ra) thì nâng gói của account service — vẫn không dính tài khoản cá nhân.
