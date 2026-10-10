#!/usr/bin/env python3
"""
Sinh bộ icon lá xanh cho website (favicon, icon cài app, bản maskable).

Hợp theme xanh lá:
  - nền tròn gradient xanh (trong suốt bên ngoài vòng tròn)
  - một chiếc lá vẽ tay nghiêng chéo, có gân giữa, viền trắng
  - vài tia sparkle trắng

Cách dùng:  python3 .github/scripts/make_icons.py [thư_mục_gốc]
Cần: Pillow (không cần font).
"""

import math
import os
import struct
import sys
import tempfile

from PIL import Image, ImageDraw

MASTER = 1024
CENTER = (MASTER // 2, MASTER // 2)

BG_TOP = (227, 245, 233)
BG_MID = (169, 223, 192)
BG_BOT = (53, 160, 111)
RING = (255, 255, 255)
LEAF_FILL = (223, 243, 230)
LEAF_EDGE = (47, 158, 104)
LEAF_VEIN = (30, 107, 71)
SPARKLE = (255, 255, 255)


def vertical_gradient(size, top, mid, bot):
    """Gradient dọc 3 điểm dừng."""
    img = Image.new("RGB", (size, size))
    draw = ImageDraw.Draw(img)
    for y in range(size):
        t = y / (size - 1)
        if t < 0.5:
            k = t / 0.5
            c = tuple(round(top[i] + (mid[i] - top[i]) * k) for i in range(3))
        else:
            k = (t - 0.5) / 0.5
            c = tuple(round(mid[i] + (bot[i] - mid[i]) * k) for i in range(3))
        draw.line([(0, y), (size, y)], fill=c)
    return img.convert("RGBA")


def circle_mask(size, radius_ratio=0.5):
    mask = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(mask)
    r = size * radius_ratio
    d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=255)
    return mask


def draw_sparkle(draw, x, y, s, fill):
    p = 0.20
    draw.polygon([
        (x, y - s), (x + s * p, y - s * p), (x + s, y),
        (x + s * p, y + s * p), (x, y + s), (x - s * p, y + s * p),
        (x - s, y), (x - s * p, y - s * p),
    ], fill=fill)


def draw_leaf(base, scale=1.0):
    """Vẽ một chiếc lá nghiêng chéo vào giữa ảnh RGBA `base` (1024x1024)."""
    size = MASTER
    # Lá là ellipse dài, xoay -30 độ quanh tâm
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    lw = 300 * scale   # rộng lá
    ll = 640 * scale   # dài lá
    cx, cy = size // 2, size // 2
    d.ellipse([cx - lw / 2, cy - ll / 2, cx + lw / 2, cy + ll / 2],
              fill=LEAF_FILL + (255,), outline=LEAF_EDGE + (255,),
              width=max(4, round(14 * scale)))
    # gân giữa
    d.line([(cx, cy - ll / 2 + 30 * scale), (cx, cy + ll / 2 - 30 * scale)],
           fill=LEAF_VEIN + (255,), width=max(3, round(12 * scale)))
    # gân phụ hai bên
    for k in (-1, 1):
        for t in (0.18, 0.38):
            y = cy - ll / 2 + ll * t
            d.line([(cx, y), (cx + k * lw * 0.32, y + ll * 0.09)],
                   fill=LEAF_VEIN + (200,), width=max(2, round(7 * scale)))
    layer = layer.rotate(30, resample=Image.BICUBIC, center=(cx, cy))
    base.alpha_composite(layer)


def draw_flower(base, scale=1.0):
    """Vẽ hoa anh đào vào giữa ảnh RGBA `base` (1024x1024)."""
    cx, cy = CENTER
    petal_len = 350 * scale
    petal_wid = 250 * scale
    dist = 190 * scale

    for k in range(5):
        layer = Image.new("RGBA", (MASTER, MASTER), (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        x0 = cx - petal_wid / 2
        y0 = cy - dist - petal_len / 2
        x1 = cx + petal_wid / 2
        y1 = cy - dist + petal_len / 2
        d.ellipse([x0, y0, x1, y1], fill=PETAL_FILL + (255,),
                  outline=PETAL_EDGE + (255,), width=max(3, round(8 * scale)))
        layer = layer.rotate(-k * 72, resample=Image.BICUBIC, center=(cx, cy))
        base.alpha_composite(layer)

    d = ImageDraw.Draw(base)
    cr = 78 * scale
    d.ellipse([cx - cr, cy - cr, cx + cr, cy + cr], fill=FLOWER_CENTER + (255,))
    for k in range(7):
        a = math.radians(k * (360 / 7) + 12)
        sx = cx + math.cos(a) * 44 * scale
        sy = cy + math.sin(a) * 44 * scale
        r = 13 * scale
        d.ellipse([sx - r, sy - r, sx + r, sy + r], fill=STAMEN + (255,))
    d.ellipse([cx - 12 * scale, cy - 12 * scale, cx + 12 * scale, cy + 12 * scale],
              fill=(255, 255, 255, 255))


def build_round():
    """Icon tròn: gradient trong hình tròn, nền ngoài trong suốt."""
    bg = vertical_gradient(MASTER, BG_TOP, BG_MID, BG_BOT)
    bg.putalpha(circle_mask(MASTER))
    draw_leaf(bg)
    d = ImageDraw.Draw(bg)
    r = MASTER / 2 - 16
    d.ellipse([CENTER[0] - r, CENTER[1] - r, CENTER[0] + r, CENTER[1] + r],
              outline=RING + (255,), width=26)
    for (x, y, s) in ((250, 300, 42), (790, 350, 30), (700, 770, 36)):
        draw_sparkle(d, x, y, s, SPARKLE + (230,))
    return bg


def build_square_bg():
    """Nền vuông gradient đặc (cho apple-touch-icon và maskable)."""
    return vertical_gradient(MASTER, BG_TOP, BG_MID, BG_BOT)


def build_apple(round_icon):
    bg = build_square_bg()
    bg.alpha_composite(round_icon)
    return bg.convert("RGB")


def build_maskable(round_icon):
    bg = build_square_bg()
    small = round_icon.resize((round(MASTER * 0.72),) * 2, Image.LANCZOS)
    bg.alpha_composite(small, ((MASTER - small.width) // 2,) * 2)
    return bg.convert("RGB")


def write_ico(path, images):
    """Đóng gói .ico với các khung PNG."""
    frames = []
    tmpdir = tempfile.gettempdir()
    for img in images:
        tmp = os.path.join(tmpdir, f".ico-frame-{img.size[0]}.png")
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


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    round_icon = build_round()

    written = []
    for name, size in (("favicon-16x16.png", 16), ("favicon-32x32.png", 32),
                       ("icon-192.png", 192), ("icon-512.png", 512)):
        round_icon.resize((size, size), Image.LANCZOS).save(os.path.join(root, name), optimize=True)
        written.append(f"{name} ({size}px)")

    build_apple(round_icon).resize((180, 180), Image.LANCZOS).save(
        os.path.join(root, "apple-touch-icon.png"), optimize=True)
    written.append("apple-touch-icon.png (180px, solid bg)")

    build_maskable(round_icon).resize((512, 512), Image.LANCZOS).save(
        os.path.join(root, "icon-512-maskable.png"), optimize=True)
    written.append("icon-512-maskable.png (512px)")

    write_ico(os.path.join(root, "favicon.ico"),
              [round_icon.resize((s, s), Image.LANCZOS) for s in (16, 32, 48, 64, 256)])
    written.append("favicon.ico (16/32/48/64/256)")

    for line in written:
        print("  [ok]", line)
    print("Done - round green leaf icon.")


if __name__ == "__main__":
    main()
