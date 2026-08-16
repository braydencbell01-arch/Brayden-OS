#!/usr/bin/env python3
"""Rebuild Phil Royale cards: unique full-bleed BGs + original likeness cutouts.

Does not redesign characters — only rembg cutouts from pre-restyle likenesses,
optional zoom/crop/angle, and attack-related prop overlays.
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter
from rembg import remove

CW, CH, TW = 768, 1024, 900
LIKENESS = Path("/tmp/card-likeness")
BG_DIR = Path("/tmp/card-unique-bg")
PROP_DIR = Path("/tmp/card-props")
OUT = Path(__file__).resolve().parents[1] / "public" / "characters"

# Per-card zoom into likeness (1.0 = full subject; higher = tighter crop)
ZOOM: dict[str, float] = {
    "phil-card.png": 1.08,
    "evil-phil-card.png": 1.12,
    "todd-card.png": 1.15,
    "lynne-card.png": 1.1,
    "berry-card.png": 1.12,
    "susan-card.png": 1.1,
    "mike-card.png": 1.08,
    "tristan-card.png": 1.1,
    "pete-card.png": 1.05,
    "beans-card.png": 1.15,
    "finley-card.png": 1.18,
    "shay-card.png": 1.18,
    "chicken-card.png": 1.1,
    "chicken-army-card.png": 1.05,
    "dan-card.png": 1.0,  # keep cool lawn-chair pose framing
    "coach-graf-card.png": 1.0,
    "gretchin-card.png": 1.0,
    "jeremy-card.png": 1.0,
    "kathie-card.png": 1.0,
    "dave-card.png": 1.0,
    "scott-card.png": 1.0,
    "hamburger-chicken-card.png": 1.0,
}

# Slight rotation degrees for variety (likeness unchanged)
ROTATE: dict[str, float] = {
    "todd-card.png": -4,
    "berry-card.png": 3,
    "susan-card.png": -2,
    "mike-card.png": 2,
    "tristan-card.png": -3,
    "beans-card.png": 4,
    "finley-card.png": -3,
    "shay-card.png": 3,
}

# Attack / trait props: (prop file, scale vs card width, x frac, y frac)
PROPS: dict[str, tuple[str, float, float, float]] = {
    "phil-card.png": ("prop-sundae.png", 0.28, 0.12, 0.72),
    "evil-phil-card.png": ("prop-chicken.png", 0.26, 0.78, 0.7),
    "lynne-card.png": ("prop-pan.png", 0.32, 0.08, 0.68),
    "berry-card.png": ("prop-berries.png", 0.3, 0.75, 0.65),
    "susan-card.png": ("prop-soup.png", 0.34, 0.1, 0.7),
    "mike-card.png": ("prop-dumbbell.png", 0.3, 0.78, 0.68),
    "tristan-card.png": ("prop-baseball.png", 0.32, 0.08, 0.7),
    "scott-card.png": ("prop-cash.png", 0.34, 0.72, 0.66),
    "dave-card.png": ("prop-gloves.png", 0.3, 0.1, 0.72),
    "coach-graf-card.png": ("prop-whistle.png", 0.28, 0.75, 0.68),
    "gretchin-card.png": ("prop-magic.png", 0.3, 0.1, 0.7),
    "kathie-card.png": ("prop-chicken.png", 0.26, 0.78, 0.7),
    "phil-spirit-card.png": ("prop-sundae.png", 0.22, 0.15, 0.75),
}

SPIRIT_FROM_MAIN = {
    "phil-card.png": "phil-spirit",
    "pete-card.png": "pete-spirit",
    "jeremy-card.png": "jeremy-spirit",
}


def cover(im: Image.Image, w: int, h: int) -> Image.Image:
    im = im.convert("RGBA")
    scale = max(w / im.width, h / im.height)
    nw, nh = int(im.width * scale) + 1, int(im.height * scale) + 1
    im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x0, y0 = (nw - w) // 2, (nh - h) // 2
    return im.crop((x0, y0, x0 + w, y0 + h))


def clean_cutout(src: Path) -> Image.Image:
    raw = Image.open(src).convert("RGBA")
    # If already on a solid blue / dark plate, rembg still helps isolate subject
    cut = remove(raw)
    bbox = cut.getbbox()
    if not bbox:
        return cut
    cut = cut.crop(bbox)
    # Drop near-opaque rectangular frame leftovers: erode thin edge if mostly black
    return cut


def zoom_subject(cut: Image.Image, zoom: float) -> Image.Image:
    if zoom <= 1.01:
        return cut
    w, h = cut.size
    cw, ch = int(w / zoom), int(h / zoom)
    # Bias toward upper body / head
    x0 = (w - cw) // 2
    y0 = max(0, int((h - ch) * 0.15))
    return cut.crop((x0, y0, x0 + cw, y0 + ch))


def place_subject(card: Image.Image, cut: Image.Image, fill: float = 0.92) -> None:
    """Place subject large so it fills the card — no inset 'card in card' look."""
    # Leave tiny safe margin so nothing clips the UI frame awkwardly
    max_w, max_h = int(CW * 0.98), int(CH * fill)
    ratio = min(max_w / cut.width, max_h / cut.height)
    nw, nh = max(1, int(cut.width * ratio)), max(1, int(cut.height * ratio))
    sc = cut.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (CW - nw) // 2
    y = CH - nh - int(CH * 0.02)  # sit on bottom edge of frame
    if y < int(CH * 0.02):
        y = int(CH * 0.02)
    card.alpha_composite(sc, (x, y))


def prop_cut(name: str) -> Image.Image | None:
    p = PROP_DIR / name
    if not p.exists():
        return None
    return remove(Image.open(p).convert("RGBA"))


def place_prop(card: Image.Image, prop: Image.Image, scale: float, xf: float, yf: float) -> None:
    tw = int(CW * scale)
    ratio = tw / prop.width
    nw, nh = tw, max(1, int(prop.height * ratio))
    sc = prop.resize((nw, nh), Image.Resampling.LANCZOS)
    x = int(CW * xf) - nw // 2
    y = int(CH * yf) - nh // 2
    x = max(0, min(CW - nw, x))
    y = max(0, min(CH - nh, y))
    card.alpha_composite(sc, (x, y))


def build_card(card_name: str) -> None:
    src = LIKENESS / card_name
    if not src.exists():
        print(f"skip missing likeness {card_name}")
        return
    bg_name = "bg-" + card_name.replace("-card.png", ".png")
    bg_path = BG_DIR / bg_name
    if not bg_path.exists():
        raise SystemExit(f"missing unique BG {bg_path}")

    bg = cover(Image.open(bg_path), CW, CH)
    cut = clean_cutout(src)
    cut = zoom_subject(cut, ZOOM.get(card_name, 1.05))
    rot = ROTATE.get(card_name)
    if rot:
        cut = cut.rotate(rot, expand=True, resample=Image.Resampling.BICUBIC)

    # Props behind subject so they feel "around" them
    if card_name in PROPS:
        pname, sc, xf, yf = PROPS[card_name]
        p = prop_cut(pname)
        if p is not None:
            place_prop(bg, p, sc, xf, yf)

    place_subject(bg, cut, fill=0.94)
    out = OUT / card_name
    bg.convert("RGB").save(out, quality=95)
    # Verify full-bleed: no pure black corners
    rgb = bg.convert("RGB")
    corners = [rgb.getpixel((1, 1)), rgb.getpixel((CW - 2, 1)), rgb.getpixel((1, CH - 2))]
    print(f"wrote {card_name} corners={corners}")


def neck_head(cut: Image.Image) -> Image.Image:
    """Head only — cut at neck (~35% of subject height) with soft fade."""
    bbox = cut.getbbox()
    if not bbox:
        return cut
    x0, y0, x1, y1 = bbox
    h = y1 - y0
    head_h = max(8, int(h * 0.36))
    head = cut.crop((x0, y0, x1, y0 + head_h)).copy()
    # Soft alpha fade on bottom ~18% so it reads as a floating head cutoff
    fade = max(4, int(head.height * 0.18))
    pixels = head.load()
    for y in range(head.height - fade, head.height):
        t = (y - (head.height - fade)) / fade
        mul = 1.0 - t
        for x in range(head.width):
            r, g, b, a = pixels[x, y]
            pixels[x, y] = (r, g, b, int(a * mul))
    return head


def write_spirit(main_card: str, prefix: str) -> None:
    main = OUT / main_card
    cut = remove(Image.open(main).convert("RGBA"))
    head = neck_head(cut)

    troop = Image.new("RGBA", (TW, TW), (0, 0, 0, 0))
    ratio = min((TW * 0.82) / head.width, (TW * 0.82) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    troop.alpha_composite(sc, ((TW - nw) // 2, (TW - nh) // 2 - 40))
    troop.save(OUT / f"{prefix}-troop.png")
    troop.transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(OUT / f"{prefix}-troop-back.png")

    bg_path = BG_DIR / f"bg-{prefix}.png"
    bg = cover(Image.open(bg_path), CW, CH)
    # Head large on spirit card, still neck-cut only
    ratio = min((CW * 0.9) / head.width, (CH * 0.7) / head.height)
    nw, nh = int(head.width * ratio), int(head.height * ratio)
    sc = head.resize((nw, nh), Image.Resampling.LANCZOS)
    bg.alpha_composite(sc, ((CW - nw) // 2, (CH - nh) // 2 - 40))
    if f"{prefix}-card.png" in PROPS:
        pname, scp, xf, yf = PROPS[f"{prefix}-card.png"]
        p = prop_cut(pname)
        if p is not None:
            place_prop(bg, p, scp, xf, yf)
    bg.convert("RGB").save(OUT / f"{prefix}-card.png", quality=95)
    print(f"spirit {prefix} neck-cut from {main_card}")


def main() -> None:
    cards = sorted(p.name for p in LIKENESS.glob("*-card.png"))
    # Build non-spirit cards first; spirits from mains after
    mains = [c for c in cards if "spirit" not in c]
    for c in mains:
        build_card(c)
    for main, prefix in SPIRIT_FROM_MAIN.items():
        write_spirit(main, prefix)


if __name__ == "__main__":
    main()
