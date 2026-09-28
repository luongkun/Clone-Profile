# 📝 HƯỚNG DẪN GỬI THÔNG TIN (dành cho người mua)

Bạn **không cần cài gì, không cần biết lập trình** — chỉ cần điền form, tải 1 file
và gửi lại. Sau đó bạn nhận được **link trang web live** của mình.

> 📦 Nhận từ người bán file **`all-in-one.html`** (1 file duy nhất)? Chỉ cần nháy đúp mở
> bằng Chrome/Edge/Cốc Cốc là điền được luôn — mọi hướng dẫn dưới đây vẫn áp dụng,
> bỏ qua các chỗ yêu cầu mở thư mục sản phẩm.

---

## Bước 1 — Điền thông tin trong `admin.html`

1. Mở file **`admin.html`** trong thư mục sản phẩm (nhấn đúp để mở bằng Chrome/Edge/Cốc Cốc).
2. Điền form theo từng phần — mỗi ô đều có chú thích ngay bên dưới.
3. Bấm **Xem trước** bất cứ lúc nào để xem trang sẽ trông thế nào với thông tin của bạn
   (chạy ngay khi nháy đúp mở file, không cần cài đặt gì thêm).

> 💡 Nếu bấm Xem trước mà form báo "*Bản nhúng cho xem trước chưa có*": máy của bạn đang có
> bản sản phẩm chưa chạy lần lệnh đồng bộ — báo người bán, hoặc tự chạy 1 lệnh `node setup.mjs`
> trong thư mục sản phẩm (cần cài [Node.js](https://nodejs.org)) rồi mở lại `admin.html`.

Vài công tắc cần quyết:

| Công tắc | Bật khi nào |
|---|---|
| **Discord** | Bạn muốn hiện trạng thái online/game đang chơi realtime từ Discord → cần Discord ID (Cách lấy: Discord → Cài đặt → Nâng cao → bật Developer Mode → chuột phải vào chính mình → Copy User ID). **Tắt** thì trang vẫn chạy — khi đó dùng nút **tải avatar lên** trong form. |
| **Nhạc nền** | Không muốn nhạc thì tắt — widget nhạc biến mất hẳn. |
| **Donate (QR)** | Bật nếu muốn hiện mã chuyển khoản. |
| **Setlove (cặp đôi)** | Panel kỷ niệm ngày yêu — không cần thì tắt. |

> 💡 Ảnh avatar / banner **upload thẳng trong form** là được — đã nhúng vào file config,
> **không cần gửi file ảnh riêng** cho những mục này.

## Bước 2 — Tải file `config.js` về máy

Cuối trang admin bấm **Tải config.js** (hoặc nút sao chép rồi dán vào file notepad, lưu tên
`config.js`). Kiểm tra thư mục *Downloads* thấy file `config.js` là được.

## Bước 3 — Gom thành 1 file zip

Cùng thư mục, chọn các file sau rồi nén (chuột phải → *Nén thành ZIP* / *Compress*):

| File | Khi nào cần |
|---|---|
| `config.js` | ✅ **Bắt buộc** |
| `qr-bank.png` (ảnh QR ngân hàng) | Nếu bật Donate. **Phải là QR của đúng tài khoản bạn**, ảnh rõ nét (≥ 600px), chụp thẳng không bị cắt. Tên file phải đúng như điền trong form. Ảnh QR **nhóm Zalo** thì khỏi gửi file — upload thẳng trong form admin (mục 5). |
| File nhạc `.mp3` | Nếu dùng nhạc riêng — tên file phải đúng như điền trong playlist. |
| `notes.txt` | Tuỳ chọn — ghi chú thêm điều bạn muốn. |

Đặt tên zip theo tên bạn, ví dụ `lan-anh.zip`.

## Bước 4 — Gửi lại

Gửi file zip qua đúng kênh bạn đã mua sản phẩm (email / tin nhắn / link Google Drive).
Điền thêm **tên miền bạn muốn** (nếu có) trong notes: dùng miễn phí sẽ nhận link dạng
`ten-ban.pages.dev`; nếu bạn đã có tên miền riêng, ghi rõ trong notes để được hướng dẫn nối.

## Sau khi gửi

- Bạn nhận **link live** — mở thử, kiểm tra nút Donate, nhạc, và các nút mạng xã hội.
- Muốn **sửa nội dung** sau này: mở lại `admin.html`, sửa, tải config mới, gửi lại — không phải làm lại từ đầu.

---

❓ **Bị kẹt ở bước nào?** Chụp màn hình trang admin đang mở + mô tả vấn đề, gửi cho người bán — sẽ được hỗ trợ.
