#!/usr/bin/env python3
"""
Sinh thẻ chia sẻ (og-image.jpg, 1200×630) cho website.

Vì sao có file này: thẻ chia sẻ là thứ hiện ra đầu tiên khi ai đó dán link vào
Facebook / Messenger / Discord / Zalo — bot của họ KHÔNG chạy JavaScript nên
không thể sinh thẻ động. Giữ script trong repo để đổi tên / đổi câu giới thiệu
thì chạy lại là có thẻ mới, không phải mở phần mềm thiết kế.

Phong cách lấy đúng từ trang: nền đen, hai quầng sáng hồng - tím, monogram NL
(vẽ bằng make_icons.py để chắc chắn khớp favicon).

Cách dùng:  python3 .github/scripts/make_og_image.py [thư_mục_gốc] [ảnh_đại_diện]
Cần: Pillow + font Noto Sans (có sẵn trên Ubuntu và trên runner CI).
"""

import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from make_icons import build_master  # noqa: E402  (monogram NL dùng chung)

W, H = 1200, 630
BASE = (10, 10, 12)
PINK = (255, 92, 152)
VIOLET = (126, 92, 255)
WHITE = (255, 255, 255)
GREY = (182, 182, 196)
SOFT = (216, 216, 226)

EYEBROW = "@Luong Kun"
NAME = "Nguyễn Lương"
HANDLE = "@chilanoidau"
TAGLINE = "Gamer • Music Lover • Coffee Addict"
DOMAIN = "luongkun.pages.dev"

FONT_DIR = "/usr/share/fonts/noto"
FONTS = {
    "black": "NotoSans-Black.ttf",
    "bold": "NotoSans-Bold.ttf",
    "medium": "NotoSans-Medium.ttf",
    "regular": "NotoSans-Regular.ttf",
}


def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    for name in (FONTS[weight], FONTS["regular"]):
        path = os.path.join(FONT_DIR, name)
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    raise SystemExit("Không tìm thấy font Noto Sans.")


def draw_tracked(draw, xy, text, fnt, fill, tracking=0.0):
    """Vẽ chữ có giãn khoảng cách ký tự (PIL không hỗ trợ letter-spacing)."""
    x, y = xy
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += fnt.getlength(ch) + tracking
    return x


def tracked_width(text, fnt, tracking=0.0) -> float:
    return sum(fnt.getlength(ch) + tracking for ch in text) - tracking


def radial(size, color, alpha, blur):
    """Quầng sáng mờ hình tròn để dựng nền giống trang.

       Tự vẽ từng lớp ellipse nhỏ dần thay vì dùng Image.radial_gradient:
       radial_gradient() cho giá trị lớn nhất ở BỐN GÓC nên khi ghép lên nền
       sẽ lộ ra bốn mảng vuông (đã bị đúng lỗi này ở bản đầu).
    """
    diameter = max(size)
    mask = Image.new("L", (diameter, diameter), 0)
    ring = ImageDraw.Draw(mask)
    steps = 64
    centre = diameter / 2
    for i in range(steps, 0, -1):
        r = centre * i / steps
        ring.ellipse((centre - r, centre - r, centre + r, centre + r),
                     fill=int(alpha * (1 - i / steps) ** 2))
    layer = Image.new("RGBA", (diameter, diameter), color + (0,))
    layer.putalpha(mask.filter(ImageFilter.GaussianBlur(blur)))
    return layer


def circle_avatar(path, size):
    src = Image.open(path).convert("RGBA")
    side = min(src.size)
    src = src.crop(((src.width - side) // 2, (src.height - side) // 2,
                    (src.width + side) // 2, (src.height + side) // 2)).resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(src, (0, 0), mask)
    return out


def build(avatar_path: str) -> Image.Image:
    card = Image.new("RGBA", (W, H), BASE + (255,))

    # --- nền: hai quầng sáng như trang
    card.alpha_composite(radial((900, 900), PINK, 120, 150), (-260, -330))
    card.alpha_composite(radial((980, 980), VIOLET, 95, 170), (620, 210))
    card.alpha_composite(radial((520, 520), (255, 190, 220), 40, 120), (330, 380))

    # --- avatar bên trái: vòng sáng + vòng viền
    av_size = 260
    cx, cy = 250, 315
    card.alpha_composite(radial((520, 520), PINK, 150, 70),
                         (cx - 260, cy - 260))
    ring = Image.new("RGBA", (av_size + 40, av_size + 40), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((0, 0, ring.width - 1, ring.height - 1), outline=(255, 255, 255, 60), width=2)
    card.alpha_composite(ring, (cx - ring.width // 2, cy - ring.height // 2))
    card.alpha_composite(circle_avatar(avatar_path, av_size), (cx - av_size // 2, cy - av_size // 2))

    draw = ImageDraw.Draw(card)
    x0 = 430

    # --- nhãn thương hiệu thay cho chữ "PROFILE" chung chung
    eyebrow_font = font("bold", 30)
    draw_tracked(draw, (x0, 186), EYEBROW, eyebrow_font, PINK, tracking=7)

    # --- tên
    draw.text((x0, 240), NAME, font=font("black", 86), fill=WHITE)

    # --- tên ID
    draw.text((x0, 372), HANDLE, font=font("medium", 40), fill=GREY)

    # --- giới thiệu
    draw.text((x0, 432), TAGLINE, font=font("medium", 33), fill=SOFT)

    # --- địa chỉ trang trong "viên thuốc"
    pill_font = font("bold", 32)
    text_w = tracked_width(DOMAIN, pill_font)
    pad_x, pad_y = 30, 20
    pill = (x0, 492, x0 + text_w + pad_x * 2, 492 + 32 + pad_y * 2)
    draw.rounded_rectangle(pill, radius=(pill[3] - pill[1]) // 2, fill=(22, 22, 28, 235),
                           outline=PINK + (150,), width=2)
    draw.text((pill[0] + pad_x, pill[1] + pad_y - 4), DOMAIN, font=pill_font, fill=WHITE)

    # --- monogram NL, đúng bộ icon đang dùng cho favicon
    badge = 112
    mono = build_master().resize((badge, badge), Image.LANCZOS)
    mx, my = W - badge - 72, 62
    card.alpha_composite(radial((300, 300), PINK, 90, 60), (mx + badge // 2 - 150, my + badge // 2 - 150))
    card.alpha_composite(mono, (mx, my))

    return card


def main() -> None:
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
    avatar = sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "avatar-me.webp")
    out = os.path.join(root, "og-image.jpg")
    build(avatar).convert("RGB").save(out, format="JPEG", quality=92, optimize=True, progressive=True)
    print(f"  ✓ og-image.jpg ({os.path.getsize(out) / 1024:.1f} KB, 1200×630)")


if __name__ == "__main__":
    main()
