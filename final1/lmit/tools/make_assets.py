"""Build brand assets from the supplied LMIT photographs and fonts.

Run once from the project root:  python3 tools/make_assets.py
Inputs live in seed/originals and seed/work. Outputs go to public/brand,
public/fonts and seed/work. Nothing here invents artwork: the logo pixels
come from the supplied logo image and are only recoloured.
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, "seed", "originals")
WORK = os.path.join(ROOT, "seed", "work")
BRAND = os.path.join(ROOT, "public", "brand")
FONTS = os.path.join(ROOT, "public", "fonts")

FOREST = (8, 37, 25)
CREAM = (240, 223, 200)
os.makedirs(BRAND, exist_ok=True)

# ---------- logo ----------
logo = Image.open(os.path.join(ORIG, "logo.png")).convert("RGB")
L = logo.convert("L")
bg_l = L.getpixel((20, 170))
box_all = (40, 45, 705, 305)
crop_l = L.crop(box_all)
vals = sorted(crop_l.getdata())
cream_l = vals[int(len(vals) * 0.998)]


def make_logo(box, color, scale=2):
    c = L.crop(box).resize(((box[2] - box[0]) * scale, (box[3] - box[1]) * scale), Image.LANCZOS)
    alpha = c.point(lambda v: max(0, min(255, int((v - bg_l) * 255 / (cream_l - bg_l)))))
    out = Image.new("RGBA", c.size, color + (255,))
    out.putalpha(alpha)
    return out


parts = {
    "lockup": box_all,
    "wordmark": (180, 45, 710, 255),
    "mark": (42, 48, 168, 256),
}
for name, box in parts.items():
    make_logo(box, CREAM).save(os.path.join(BRAND, f"logo-{name}-cream.png"), optimize=True)
    make_logo(box, FOREST).save(os.path.join(BRAND, f"logo-{name}-forest.png"), optimize=True)

# favicons from the mark
mark = make_logo(parts["mark"], CREAM)


def icon(size, pad=0.2, radius=0.22):
    bgc = Image.new("RGBA", (size, size), FOREST + (255,))
    m = mark.copy()
    target_h = int(size * (1 - 2 * pad))
    m = m.resize((int(m.width * target_h / m.height), target_h), Image.LANCZOS)
    bgc.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), int(size * radius), fill=255)
    bgc.putalpha(mask)
    return bgc


for s in (32, 180, 192, 512):
    icon(s, radius=0.0 if s == 180 else 0.22).save(os.path.join(BRAND, f"icon-{s}.png"), optimize=True)
icon(64).save(os.path.join(BRAND, "favicon.ico"), sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])

# share image 1200x630
og = Image.new("RGB", (1200, 630), FOREST)
d = ImageDraw.Draw(og)
d.rectangle((24, 24, 1175, 605), outline=(201, 162, 87), width=2)
lock = make_logo(box_all, CREAM, scale=2)
lw = 760
lock = lock.resize((lw, int(lock.height * lw / lock.width)), Image.LANCZOS)
og.paste(lock, ((1200 - lw) // 2, (630 - lock.height) // 2), lock)
og.save(os.path.join(BRAND, "og-image.png"), optimize=True)

# ---------- menu thumbnails cut from the printed menu ----------
menu = Image.open(os.path.join(ORIG, "menu.png")).convert("RGB")
cols = [(235, 313), (321, 397), (406, 483)]
rows = [(131, 197), (243, 301), (353, 411), (456, 509)]
names = ["fondue-cake", "london-cake", "lmit-cake", "cookies", "classic-chocolate", "cheese-madrid",
         "lemon-tiramisu", "tiramisu", "mango-tiramisu", "pecan-bites", "berry-bites", "pomegranate-bites"]
i = 0
for r in rows:
    for c in cols:
        im = menu.crop((c[0], r[0], c[1], r[1]))
        im.save(os.path.join(WORK, f"dessert-{names[i]}.png"))
        i += 1

# ---------- fonts (subset to what the site uses) ----------
from fontTools import subset
from fontTools.ttLib import TTFont

latin = list(range(0x20, 0x7F)) + [0xA0, 0xA9, 0xB7, 0xD7, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026, 0x2022]
arabic = latin + list(range(0x600, 0x700)) + list(range(0x750, 0x780)) + list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFF00)) + [0x200C, 0x200D, 0x200E, 0x200F, 0x25CC]
jobs = [
    ("bodoni.ttf", "bodoni-moda.woff", latin),
    ("jost.ttf", "jost.woff", latin),
    ("naskh.ttf", "noto-naskh-arabic.woff", arabic),
    ("plex-400.ttf", "plex-arabic-400.woff", arabic),
    ("plex-500.ttf", "plex-arabic-500.woff", arabic),
    ("plex-600.ttf", "plex-arabic-600.woff", arabic),
]
for src, dst, uni in jobs:
    opts = subset.Options()
    opts.flavor = "woff"
    opts.layout_features = ["*"]
    opts.notdef_outline = True
    opts.name_IDs = [1, 2, 3, 4, 6]
    font = TTFont(os.path.join(WORK, src))
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=uni)
    sub.subset(font)
    font.flavor = "woff"
    font.save(os.path.join(FONTS, dst))
    print(dst, os.path.getsize(os.path.join(FONTS, dst)))
print("logo bg/cream luminance", bg_l, cream_l)
