#!/usr/bin/env python3
"""
Sinh bộ icon monogram "NL" cho website (favicon, icon cài app, bản maskable).

Vì sao có file này: bộ icon được vẽ lại từ chữ, không phải ảnh chụp tay — giữ
script trong repo để sau này đổi chữ (ví dụ "NL" -> tên khác) chỉ cần sửa LABEL
rồi chạy lại, thay vì mò lại từng kích thước.

Phong cách bám đúng thiết kế "DT" cũ:
  - nền vuông đen bo góc 12% (đo từ icon cũ)
  - monogram trắng, in nghiêng, nét rất đậm
  - một nét sổ chéo cắt qua chữ (đặc trưng của bộ icon cũ)
  - chữ chiếm 66% bề rộng × 44% chiều cao icon (đo từ icon cũ)

Cách dùng:  python3 .github/scripts/make_icons.py [thư_mục_gốc]
Cần: Pillow + font Noto Sans Black Italic (có sẵn trên Ubuntu và trên runner CI).
"""

import math
import os
import struct
import sys

from PIL import Image, ImageChops, ImageDraw, ImageFont

LABEL = "NL"                     # chữ trong icon — đổi ở đây khi cần
FONT_PATH = "/usr/share/fonts/noto/NotoSans-BlackItalic.ttf"
FONT_FALLBACKS = [
    "/usr/share/fonts/truetype/noto/NotoSans-BlackItalic.ttf",
    "/usr/share/fonts/noto/NotoSans-Black.ttf",
]

MASTER = 1024                    # kích thước gốc, hạ mẫu xuống các cỡ nhỏ
RADIUS_RATIO = 0.12              # bo góc
GLYPH_H_RATIO = 0.44             # chiều cao chữ / cạnh icon
GLYPH_W_RATIO = 0.66             # bề rộng chữ / cạnh icon
KERNING = -40                    # âm = hai chữ sát nhau hơn
SHEAR = 0.08                     # nghiêng thêm ngoài độ nghiêng của font
CUT = (58, 0.035, (0.48, 0.52))  # nét sổ: góc, độ dày, tâm
BG = (5, 5, 5, 255)
FG = (255, 255, 255, 255)
MASKABLE_SCALE = 0.78            # bản maskable: thu nhỏ chữ để nằm trong vùng an toàn


def find_font() -> str:
    for path in [FONT_PATH, *FONT_FALLBACKS]:
        if os.path.exists(path):
            return path
    raise SystemExit("Không tìm thấy font Noto Sans Black Italic.")


def render_glyph(text: str) -> Image.Image:
    """Vẽ chữ trắng trên nền trong suốt, cắt sát, chuẩn hoá về tỉ lệ icon cũ."""
    font = ImageFont.truetype(find_font(), 700)
    canvas = Image.new("L", (2600, 1600), 0)
    draw = ImageDraw.Draw(canvas)
    x = 500
    for ch in text:
        draw.text((x, 300), ch, font=font, fill=255)
        x += font.getlength(ch) + KERNING

    glyph = canvas.crop(canvas.getbbox())
    target_h = int(MASTER * GLYPH_H_RATIO)
    scale = target_h / glyph.height
    glyph = glyph.resize((max(1, round(glyph.width * scale)), target_h), Image.LANCZOS)

    # nghiêng thêm: chừa khoảng trống hai bên để không bị cắt cụt
    pad = 400
    padded = Image.new("L", (glyph.width + pad * 2, glyph.height), 0)
    padded.paste(glyph, (pad, 0))
    pw, ph = padded.size
    padded = padded.transform((pw, ph), Image.AFFINE,
                             (1, SHEAR, -SHEAR * ph / 2, 0, 1, 0), resample=Image.BICUBIC)
    glyph = padded.crop(padded.getbbox())

    if glyph.width > MASTER * GLYPH_W_RATIO:
        ratio = (MASTER * GLYPH_W_RATIO) / glyph.width
        glyph = glyph.resize((round(MASTER * GLYPH_W_RATIO), max(1, round(glyph.height * ratio))), Image.LANCZOS)
    return glyph


def cut_mask(size: int, angle: float, thickness: float, center: tuple) -> Image.Image:
    """Mặt nạ hình băng chéo — khoét chữ để tạo nét sổ."""
    mask = Image.new("L", (size * 2, size * 2), 0)
    draw = ImageDraw.Draw(mask)
    t = size * thickness
    cx, cy = size * 2 * center[0], size * 2 * center[1]
    rad = math.radians(angle)
    dx, dy = math.cos(rad), -math.sin(rad)
    nx, ny = -dy, dx
    span = size * 3
    draw.polygon([
        (cx + dx * span, cy + dy * span), (cx - dx * span, cy - dy * span),
        (cx - dx * span + nx * t, cy - dy * span + ny * t), (cx + dx * span + nx * t, cy + dy * span + ny * t),
    ], fill=255)
    return mask.crop((size // 2, size // 2, size // 2 + size, size // 2 + size))


def build_master(glyph_scale: float = 1.0) -> Image.Image:
    """Icon nền đen bo góc (bản dùng cho favicon và icon 'any')."""
    icon = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
    ImageDraw.Draw(icon).rounded_rectangle(
        (0, 0, MASTER - 1, MASTER - 1), radius=round(MASTER * RADIUS_RATIO), fill=BG)

    glyph = render_glyph(LABEL)
    if glyph_scale != 1.0:
        glyph = glyph.resize((max(1, round(glyph.width * glyph_scale)),
                              max(1, round(glyph.height * glyph_scale))), Image.LANCZOS)

    layer = Image.new("L", (MASTER, MASTER), 0)
    layer.paste(glyph, ((MASTER - glyph.width) // 2, round((MASTER - glyph.height) * 0.52)))
    layer = ImageChops.subtract(layer, cut_mask(MASTER, *CUT))
    icon.paste(Image.new("RGBA", (MASTER, MASTER), FG), (0, 0), layer)
    return icon


def build_maskable() -> Image.Image:
    """Bản maskable: nền đặc kín cả 4 góc (không trong suốt) và chữ thu nhỏ
       để nằm gọn trong vùng an toàn 80% — Android cắt tròn/méo đều không mất chữ."""
    glyph = render_glyph(LABEL)
    small = glyph.resize((max(1, round(glyph.width * MASKABLE_SCALE)),
                          max(1, round(glyph.height * MASKABLE_SCALE))), Image.LANCZOS)
    icon = Image.new("RGBA", (MASTER, MASTER), BG)          # nền đặc, kín góc
    layer = Image.new("L", (MASTER, MASTER), 0)
    layer.paste(small, ((MASTER - small.width) // 2, round((MASTER - small.height) * 0.5)))
    layer = ImageChops.subtract(layer, cut_mask(MASTER, *CUT))
    icon.paste(Image.new("RGBA", (MASTER, MASTER), FG), (0, 0), layer)
    return icon


def write_ico(path: str, images: list) -> None:
    """Đóng gói .ico với các khung PNG (đúng cấu trúc file ico cũ trong repo)."""
    frames = []
    for img in images:
        tmp = f"/tmp/.ico-frame-{img.size[0]}.png"
        img.save(tmp, format="PNG", optimize=True)
        with open(tmp, "rb") as fh:
            frames.append((img.size[0], fh.read()))
        os.remove(tmp)

    offset = 6 + 16 * len(frames)
    header = struct.pack("<HHH", 0, 1, len(frames))
    entries, blobs = b"", b""
    for size, data in frames:
        dim = 0 if size >= 256 else size
        entries += struct.pack("<BBBBHHII", dim, dim, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    with open(path, "wb") as fh:
        fh.write(header + entries + blobs)


def main() -> None:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    master = build_master()
    maskable = build_maskable()

    written = []
    for name, size in (("favicon-16x16.png", 16), ("favicon-32x32.png", 32),
                       ("apple-touch-icon.png", 180), ("icon-192.png", 192),
                       ("icon-512.png", 512)):
        master.resize((size, size), Image.LANCZOS).save(os.path.join(root, name), optimize=True)
        written.append(f"{name} ({size}px)")

    maskable.resize((512, 512), Image.LANCZOS).save(os.path.join(root, "icon-512-maskable.png"), optimize=True)
    written.append("icon-512-maskable.png (512px)")

    write_ico(os.path.join(root, "favicon.ico"),
              [master.resize((s, s), Image.LANCZOS) for s in (16, 32, 48, 64, 256)])
    written.append("favicon.ico (16/32/48/64/256)")

    for line in written:
        print("  ✓", line)
    print(f"Xong — monogram \"{LABEL}\", nền bo góc {int(RADIUS_RATIO * 100)}%.")


if __name__ == "__main__":
    main()
