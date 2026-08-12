#!/usr/bin/env python3
"""Make transparent battlefield troop cutouts (no blue/gray studio box).

Card portraits keep the blue studio. Troop / troop-back art must be true
RGBA cutouts so units never show a rectangular background on the arena.

Preferred (ML cutout — handles gray plates the blue-key misses):

  python3 scripts/knock-blue-bg.py --rembg public/characters/foo-card.png \\
      -o public/characters/foo-troop.png

Fallback chroma-key for simple solid blues:

  python3 scripts/knock-blue-bg.py public/characters/foo-troop.png
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image


def knock_blue(path: Path) -> None:
    im = Image.open(path).convert('RGBA')
    px = im.load()
    w, h = im.size
    soft = 28
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            is_blue_studio = (
                b > 90 and b > r + 40 and b > g + 20 and r < 90 and g < 160
            )
            is_bright_blue = b > 180 and r < 80 and g < 140 and b > r + 80
            # Light blue-gray plates (Pete Spirit leftover box)
            lum = (r + g + b) / 3
            sat = max(r, g, b) - min(r, g, b)
            is_light_plate = lum > 155 and sat < 45 and b >= r - 8 and b >= g - 8
            if not (is_blue_studio or is_bright_blue or is_light_plate):
                continue
            if is_light_plate and not (is_blue_studio or is_bright_blue):
                px[x, y] = (r, g, b, 0)
                continue
            score = min(b - r, b - g)
            if score > soft:
                px[x, y] = (r, g, b, 0)
            else:
                alpha = max(0, min(255, int(255 * (1 - (score - 20) / (soft + 40)))))
                px[x, y] = (r, g, b, min(a, alpha))
    im.save(path, optimize=True)
    zeros = sum(1 for p in im.getdata() if p[3] == 0)
    print(f'{path}: chroma alpha0={100 * zeros / (w * h):.1f}%')


def rembg_cut(src: Path, dst: Path) -> None:
    from rembg import remove
    import numpy as np

    im = Image.open(src).convert('RGBA')
    out = remove(im)
    a = np.array(out)
    op = a[:, :, 3] > 16
    if not op.any():
        raise SystemExit(f'rembg returned empty cutout for {src}')
    ys, xs = np.where(op)
    pad = 28
    y0, y1 = max(0, ys.min() - pad), min(a.shape[0], ys.max() + pad + 1)
    x0, x1 = max(0, xs.min() - pad), min(a.shape[1], xs.max() + pad + 1)
    crop = a[y0:y1, x0:x1]
    h, w = crop.shape[:2]
    side = max(h, w, 900)
    canvas = np.zeros((side, side, 4), dtype=np.uint8)
    oy, ox = (side - h) // 2, (side - w) // 2
    canvas[oy : oy + h, ox : ox + w] = crop
    img = Image.fromarray(canvas).resize((900, 900), Image.Resampling.LANCZOS)
    img.save(dst, optimize=True)
    op2 = (np.array(img)[:, :, 3] > 128).mean()
    print(f'{dst}: rembg opaque={100 * op2:.1f}%')


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('paths', nargs='*', type=Path, help='PNG paths to chroma-key in place')
    ap.add_argument('--rembg', type=Path, help='Source image (usually *-card.png)')
    ap.add_argument('-o', '--output', type=Path, help='Output path for --rembg')
    args = ap.parse_args()
    if args.rembg:
        if not args.output:
            raise SystemExit('--rembg requires -o/--output')
        rembg_cut(args.rembg, args.output)
        return
    if not args.paths:
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(1)
    for path in args.paths:
        knock_blue(path)


if __name__ == '__main__':
    main()
