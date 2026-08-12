#!/usr/bin/env python3
"""Knock Clash-style blue studio backgrounds out of troop PNGs (RGBA cutouts).

Card portraits keep the blue studio; battlefield troop / troop-back art must be
transparent so units never show a blue box. Run on any new troop assets:

  python3 scripts/knock-blue-bg.py public/characters/my-troop.png \\
      public/characters/my-troop-back.png
"""
from __future__ import annotations

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
            if not (is_blue_studio or is_bright_blue):
                continue
            score = min(b - r, b - g)
            if score > soft:
                px[x, y] = (r, g, b, 0)
            else:
                alpha = max(0, min(255, int(255 * (1 - (score - 20) / (soft + 40)))))
                px[x, y] = (r, g, b, min(a, alpha))
    im.save(path, optimize=True)
    zeros = sum(1 for p in im.getdata() if p[3] == 0)
    print(f'{path}: alpha0={100 * zeros / (w * h):.1f}%')


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__.strip(), file=sys.stderr)
        sys.exit(1)
    for arg in sys.argv[1:]:
        knock_blue(Path(arg))


if __name__ == '__main__':
    main()
