"""Decode, validate and optimise one image.

usage: imgproc.py SRC OUTDIR KEY [UPSCALE]
Writes OUTDIR/KEY-<width>.webp for several widths, strips all metadata, honours
EXIF orientation. Prints one JSON line: {"w":..,"h":..,"widths":[..]} or {"error":..}.
"""
import json
import os
import sys

from PIL import Image, ImageFilter, ImageOps

Image.MAX_IMAGE_PIXELS = 40_000_000


def fail(code):
    print(json.dumps({"error": code}))
    sys.exit(2)


src, outdir, key = sys.argv[1:4]
upscale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0

try:
    im = Image.open(src)
    fmt = im.format
    im.load()
except Exception:
    fail("unreadable")
if fmt not in ("JPEG", "PNG", "WEBP", "MPO"):
    fail("format")

im = ImageOps.exif_transpose(im)
if im.mode not in ("RGB", "RGBA"):
    im = im.convert("RGBA" if "A" in im.getbands() else "RGB")

if upscale > 1:
    im = im.resize((round(im.width * upscale), round(im.height * upscale)), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=60, threshold=2))

MAX_W = 1920
if im.width > MAX_W:
    im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)

w, h = im.size
widths = sorted({x for x in (400, 800, 1280) if x < w} | {w})
os.makedirs(outdir, exist_ok=True)
for x in widths:
    r = im if x == w else im.resize((x, max(1, round(h * x / w))), Image.LANCZOS)
    r.save(os.path.join(outdir, f"{key}-{x}.webp"), "WEBP", quality=82, method=4)
print(json.dumps({"w": w, "h": h, "widths": widths}))
