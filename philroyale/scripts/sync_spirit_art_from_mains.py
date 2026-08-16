#!/usr/bin/env python3
"""Rebuild Phil / Pete / Jeremy Spirit art as floating heads from main cards.

Spirits are head-only (cut at the neck). Battlefield troops for non-spirit cards
are never touched by card-restyle pipelines.

Usage (from repo root, with rembg + Pillow + numpy installed):
  python3 philroyale/scripts/sync_spirit_art_from_mains.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
CHARS = ROOT / "public" / "characters"
BG_DIR = Path("/tmp/card-unique-bg")
CW, CH, TW = 768, 1024, 900

SPIRIT_FROM_MAIN = {
    "phil-card.png": "phil-spirit",
    "pete-card.png": "pete-spirit",  # Pete (id dan) uses pete-*.png
    "jeremy-card.png": "jeremy-spirit",
}


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGBA")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(im.width * scale) + 1, int(im.height * scale) + 1
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))


def pick_bg(prefix: str) -> Image.Image:
    named = BG_DIR / f"bg-{prefix}.png"
    if named.exists():
        return cover(Image.open(named), CW, CH)
    # Fallback soft gradient — never leave black letterboxing
    img = Image.new("RGBA", (CW, CH), (40, 90, 160, 255))
    return img


def floating_head(cut: Image.Image) -> Image.Image:
    """Head + neck only from a full-body (or bust) cutout."""
    bbox = cut.getbbox()
    if not bbox:
        return cut
    x0, y0, x1, y1 = bbox
    w, h = x1 - x0, y1 - y0
    # Top band where the face lives
    band_h = max(16, int(h * 0.22))
    band = cut.crop((x0, y0, x1, y0 + band_h))
    arr = np.array(band)
    a = arr[:, :, 3]
    ys, xs = np.where(a > 40)
    if len(xs) == 0:
        head = band
    else:
        cx = int(xs.mean())
        cy = min(int(ys.mean()), int(band_h * 0.4))
        side = int(band_h * 1.05)
        lx = max(0, cx - side // 2)
        ly = max(0, cy - int(side * 0.55))
        rx = min(band.width, lx + side)
        ry = min(band.height, ly + int(side * 0.95))
        head = band.crop((lx, ly, rx, ry))
    bb = head.getbbox()
    if bb:
        head = head.crop(bb)
    # Soft fade at neck
    fade = max(4, int(head.height * 0.22))
    px = head.load()
    for y in range(head.height - fade, head.height):
        mul = max(0.0, 1.0 - (y - (head.height - fade)) / fade)
        for x in range(head.width):
            r, g, b, a = px[x, y]
            px[x, y] = (r, g, b, int(a * mul))
    return head


def write_spirit(main_name: str, prefix: str) -> None:
    main = CHARS / main_name
    if not main.exists():
        raise SystemExit(f"missing main card {main}")
    cut = remove(Image.open(main).convert("RGBA"))
    bb = cut.getbbox()
    if bb:
        cut = cut.crop(bb)
    head = floating_head(cut)

    troop = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
    glow = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse(
        (TW // 2 - 160, TW // 2 + 90, TW // 2 + 160, TW // 2 + 190),
        fill=(120, 80, 255, 50),
    )
    troop = Image.alpha_composite(troop, glow.filter(ImageFilter.GaussianBlur(24)))
    ratio = min((TW * 0.72) / head.width, (TW * 0.72) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    troop.alpha_composite(sc, ((TW - nw) // 2, (TW - nh) // 2 - 40))
    troop.save(CHARS / f"{prefix}-troop.png")
    troop.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(
        CHARS / f"{prefix}-troop-back.png"
    )

    bg = pick_bg(prefix)
    ratio = min((CW * 0.82) / head.width, (CH * 0.55) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    bg.alpha_composite(sc, ((CW - nw) // 2, (CH - nh) // 2 - 30))
    bg.convert("RGB").save(CHARS / f"{prefix}-card.png", quality=95)
    print(f"synced {prefix} ← {main_name} (head/neck only)")


def main() -> None:
    for main, prefix in SPIRIT_FROM_MAIN.items():
        write_spirit(main, prefix)


if __name__ == "__main__":
    main()
