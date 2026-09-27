#!/usr/bin/env python3
"""
Kiểm tra tự động cho website bio (chạy được cả ở máy và trên GitHub Actions).

Bắt đúng những lỗi đã từng xảy ra thật trong dự án này:
  1. File được tham chiếu nhưng không tồn tại (từng bị: qr-bank.png 404, ảnh QR bị cắt)
  2. Ảnh QR chuyển khoản bị đổi/hỏng -> phải giải mã ra ĐÚNG chuỗi NAPAS như trước
  3. script.js / config.js sai cú pháp JavaScript
  4. style.css lệch ngoặc (file CSS bị vỡ âm thầm)

Cách dùng:  python3 .github/scripts/check_site.py [thư_mục_gốc]
"""

import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
HASH_FILE = os.path.join(ROOT, ".github", "qr-expected.sha256")
MIN_QR_PX = 600  # ảnh QR nhỏ hơn mức này thì soi điện thoại rất dễ trượt

loi: list[str] = []
da_qua: list[str] = []


def doc(rel):
    return open(os.path.join(ROOT, rel), encoding="utf-8").read()


# ---------------------------------------------------------------- 1. tham chiếu
# LƯU Ý: không được để chuỗi rỗng trong danh sách này — "x".startswith("") luôn đúng
# nên sẽ bỏ qua TOÀN BỘ tham chiếu cục bộ (lỗi này từng làm bộ kiểm tra báo đạt sai).
BO_QUA = ("http://", "https://", "//", "data:", "mailto:", "tel:", "javascript:", "#")


def kiem_tra_ton_tai(rel, nguon):
    rel = rel.strip()
    if not rel or rel.startswith(BO_QUA):
        return
    sach = rel.split("?")[0].split("#")[0]
    if not sach:
        return
    if not os.path.exists(os.path.join(ROOT, sach)):
        loi.append(f"THIẾU FILE: {nguon} trỏ tới '{rel}' nhưng không có file '{sach}'")


html = doc("index.html")
for m in re.finditer(r'(?:src|href)\s*=\s*"([^"]+)"', html):
    kiem_tra_ton_tai(m.group(1), "index.html")
da_qua.append("index.html: mọi file src/href cục bộ đều tồn tại")

css = doc("style.css")
# Bỏ hết data-URI trước khi quét: bên trong SVG (lớp grain) cũng có url() nội bộ như
# filter='url(%23n)' — nếu không bỏ sẽ bị báo thiếu file '%23n' (dương tính giả).
css_quet = re.sub(r"url\(\s*([\"'])data:.*?\1\s*\)", "url(#)", css, flags=re.S)
for m in re.finditer(r"url\(\s*['\"]?([^'\")]+)", css_quet):
    kiem_tra_ton_tai(m.group(1).strip(), "style.css")
da_qua.append("style.css: mọi file trong url() đều tồn tại")

config = doc("config.js")
for m in re.finditer(r'["\']([\w\-./]+\.(?:mp3|mp4|webm|png|jpe?g|webp|gif|svg|ico))["\']', config):
    kiem_tra_ton_tai(m.group(1), "config.js")
da_qua.append("config.js: mọi file nhạc/ảnh được khai báo đều tồn tại")

# og:image ghi bằng URL tuyệt đối -> kiểm tra file cùng tên có thật trong repo
for m in re.finditer(r'property="og:image"\s+content="([^"]+)"', html):
    ten = m.group(1).rsplit("/", 1)[-1]
    if ten and not os.path.exists(os.path.join(ROOT, ten)):
        loi.append(f"THẺ CHIA SẺ: og:image trỏ tới '{ten}' nhưng file này không có trong repo")
if not any("og:image" in x for x in loi):
    da_qua.append("og:image: file ảnh chia sẻ có thật trong repo")

# ------------------------------------------------------------------- 2. ảnh QR
m = re.search(r'qrImage\s*:\s*"([^"]+)"', config)
if not m:
    loi.append("QR: không tìm thấy donate.qrImage trong config.js")
else:
    qr_rel = m.group(1)
    qr_path = os.path.join(ROOT, qr_rel)
    if not os.path.exists(qr_path):
        loi.append(f"QR: config.js khai báo ảnh QR '{qr_rel}' nhưng không có file")
    elif not shutil.which("zbarimg"):
        print("!! Bỏ qua kiểm tra QR: chưa cài zbarimg (apt-get install zbar-tools)")
    else:
        try:
            from PIL import Image

            with Image.open(qr_path) as im:
                w, h = im.size
            if min(w, h) < MIN_QR_PX:
                loi.append(f"QR: ảnh chỉ {w}x{h}px, nhỏ hơn mức tối thiểu {MIN_QR_PX}px -> soi sẽ mờ")
            payload = subprocess.run(
                ["zbarimg", "--raw", "-q", qr_path], capture_output=True, text=True
            ).stdout.strip()
            if not payload:
                loi.append("QR: KHÔNG giải mã được ảnh QR này (máy quét sẽ không đọc được)")
            else:
                got = hashlib.sha256(payload.encode()).hexdigest()
                want = ""
                if os.path.exists(HASH_FILE):
                    for line in open(HASH_FILE, encoding="utf-8"):
                        line = line.strip()
                        if line and not line.startswith("#"):
                            want = line
                            break
                if not want:
                    loi.append(f"QR: thiếu file mốc so sánh {os.path.relpath(HASH_FILE, ROOT)}")
                elif got != want:
                    loi.append(
                        "QR: NỘI DUNG ĐÃ ĐỔI so với mốc an toàn!\n"
                        f"      mong đợi sha256 {want}\n"
                        f"      thực tế  sha256 {got}\n"
                        "      -> Nếu bạn CHỦ Ý đổi ảnh QR thì cập nhật lại .github/qr-expected.sha256,\n"
                        "         còn nếu không thì ĐỪNG push (tiền có thể chuyển sai người)."
                    )
                else:
                    da_qua.append(
                        f"QR: {qr_rel} {w}x{h}px, giải mã được và khớp mốc an toàn (sha256 {got[:12]}…)"
                    )
        except ImportError:
            print("!! Bỏ qua kích thước QR: chưa cài Pillow")

# ----------------------------------------------------------------- 3. JS / 4. CSS
if shutil.which("node"):
    js_files = ["script.js", "config.js"]
    for f in js_files:
        r = subprocess.run(["node", "--check", os.path.join(ROOT, f)], capture_output=True, text=True)
        if r.returncode != 0:
            loi.append(f"JS: {f} sai cú pháp:\n{r.stderr.strip()[:400]}")
    da_qua.append("script.js và config.js: cú pháp JavaScript hợp lệ")

    # Pages Functions là ES module (có `export`) — node --check chỉ hiểu CommonJS,
    # nên phải kiểm qua bản sao đuôi .mjs. Cùng file này cũng bị Cloudflare chạy
    # thật ở /api/stats nên sai cú pháp thì API chết âm thầm.
    import tempfile

    funcs = []
    func_dir = os.path.join(ROOT, "functions")
    for base, _dirs, files in os.walk(func_dir):
        for name in sorted(files):
            if name.endswith(".js"):
                funcs.append(os.path.join(base, name))
    for path in funcs:
        rel = os.path.relpath(path, ROOT)
        with open(path, "r", encoding="utf-8") as fh:
            src = fh.read()
        if "export" not in src:
            continue
        with tempfile.NamedTemporaryFile("w", suffix=".mjs", delete=False, encoding="utf-8") as tmp:
            tmp.write(src)
            tmp_path = tmp.name
        try:
            r = subprocess.run(["node", "--check", tmp_path], capture_output=True, text=True)
            if r.returncode != 0:
                loi.append(f"JS (Pages Function): {rel} sai cú pháp:\n{r.stderr.strip()[:400]}")
        finally:
            os.remove(tmp_path)
    if funcs:
        da_qua.append(f"{len(funcs)} Pages Function(s): cú pháp ES module hợp lệ")

    # API đếm lượt xem/thích là phần duy nhất chạy trên server — chạy thử logic
    # bằng KV giả (không cần tài khoản Cloudflare) để lỗi lộ ra ở máy, không phải
    # đợi tới lúc lên live mới biết.
    stats_test = os.path.join(ROOT, ".github", "scripts", "test_stats.mjs")
    if os.path.exists(stats_test):
        r = subprocess.run(["node", stats_test, ROOT], capture_output=True, text=True)
        if r.returncode != 0:
            loi.append("API lượt xem/lượt thích: phép thử logic thất bại:\n" + (r.stdout or r.stderr).strip()[-600:])
        else:
            tong = [ln for ln in r.stdout.splitlines() if "phép thử API đạt" in ln]
            da_qua.append("API lượt xem/lượt thích: " + (tong[0].strip() if tong else "phép thử logic đạt"))
else:
    print("!! Bỏ qua kiểm tra cú pháp JS: chưa có node")

if css.count("{") != css.count("}"):
    loi.append(f"CSS: style.css lệch ngoặc ({{ = {css.count('{')}, }} = {css.count('}')}) -> file đã vỡ")
else:
    da_qua.append(f"style.css: ngoặc cân bằng ({css.count('{')} cặp)")

# ------------------------------------------------------------------------ Kết quả
print()
for x in da_qua:
    print(f"  ✓ {x}")
if loi:
    print()
    for x in loi:
        print(f"  ✗ {x}")
    print(f"\nKẾT QUẢ: {len(loi)} lỗi — KHÔNG được push.")
    sys.exit(1)

print(f"\nKẾT QUẢ: tất cả {len(da_qua)} mục kiểm tra đều đạt.")
