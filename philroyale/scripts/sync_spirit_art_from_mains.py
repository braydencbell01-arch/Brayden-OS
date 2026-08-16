#!/usr/bin/env python3
"""Rebuild Phil / Pete / Jeremy Spirit art from their main card portraits.

Rule: whenever a spirit's main card art changes, regenerate the spirit card +
troop cutouts from that card's head. Battlefield troops for non-spirit cards
are never touched by card-restyle pipelines.

Usage (from repo root, with rembg + Pillow installed):
  python3 philroyale/scripts/sync_spirit_art_from_mains.py
"""
from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter
from rembg import remove

ROOT = Path(__file__).resolve().parents[1]
CHARS = ROOT / "public" / "characters"
BG_DIR = Path("/tmp/cr-bgs")
CW, CH, TW = 768, 1024, 900

# Main card file → spirit asset prefix
SPIRIT_FROM_MAIN = {
    "phil-card.png": "phil-spirit",
    "pete-card.png": "pete-spirit",  # Pete (id dan) uses pete-*.png
    "jeremy-card.png": "jeremy-spirit",
}


def pick_bg(seed: str) -> Image.Image:
    bgs = sorted(BG_DIR.glob("cr-bg-*.png")) if BG_DIR.is_dir() else []
    if not bgs:
        # Fallback soft gradient if exotic BGs not staged
        img = Image.new("RGBA", (CW, CH), (11, 95, 173, 255))
        return img
    h = int(hashlib.md5(seed.encode()).hexdigest(), 16)
    return Image.open(bgs[h % len(bgs)]).convert("RGBA").resize((CW, CH), Image.Resampling.LANCZOS)


def extract_head(card_path: Path) -> Image.Image:
    cut = remove(Image.open(card_path).convert("RGBA"))
    bbox = cut.getbbox()
    if not bbox:
        return cut
    x0, y0, x1, y1 = bbox
    h = y1 - y0
    head = cut.crop((x0, y0, x1, y0 + int(h * 0.42)))
    return remove(head)


def write_spirit(main_name: str, prefix: str) -> None:
    main = CHARS / main_name
    if not main.exists():
        raise SystemExit(f"missing main card {main}")
    head = extract_head(main)

    troop = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
    glow = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((TW // 2 - 180, TW // 2 + 80, TW // 2 + 180, TW // 2 + 200), fill=(120, 80, 255, 55))
    troop = Image.alpha_composite(troop, glow.filter(ImageFilter.GaussianBlur(28)))
    ratio = min((TW * 0.78) / head.width, (TW * 0.78) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    troop.alpha_composite(sc, ((TW - nw) // 2, (TW - nh) // 2 - 60))
    troop.save(CHARS / f"{prefix}-troop.png")
    troop.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(CHARS / f"{prefix}-troop-back.png")

    bg = pick_bg(f"{prefix}-card.png")
    card = bg.copy()
    ratio = min((CW * 0.85) / head.width, (CH * 0.55) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    card.alpha_composite(sc, ((CW - nw) // 2, 220))
    card.convert("RGB").save(CHARS / f"{prefix}-card.png", quality=95)
    print(f"synced {prefix} ← {main_name}")


def main() -> None:
    for main, prefix in SPIRIT_FROM_MAIN.items():
        write_spirit(main, prefix)


if __name__ == "__main__":
    main()
