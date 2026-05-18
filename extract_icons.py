#!/usr/bin/env python3
"""Extract spell icons from the EQL Spells*.tga spritesheets into PNGs.

EQ convention: each Spells##.tga is 256x256 with a 6x6 grid of 40x40 icons
(240x240 of useful area, padded at the bottom-right). Icon id N maps to:
  sheet  = (N - 1) // 36 + 1   -> Spells{sheet:02d}.tga
  local  = (N - 1) % 36
  col, row = local % 6, local // 6
  crop box = (col*40, row*40, col*40+40, row*40+40)

Run: .venv/bin/python extract_icons.py
"""
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
# EQL_UIFILES_DIR can point at the EverQuest uifiles/default directory
# containing Spells01..63.tga. Defaults to ../uifiles/default relative
# to this script.
ICONS_DIR = os.environ.get(
    "EQL_UIFILES_DIR",
    os.path.join(os.path.dirname(HERE), "uifiles", "default"))
OUT_DIR = os.path.join(HERE, "static", "icons")
TOTAL_SHEETS = 63
ICON_SIZE = 40
ICONS_PER_ROW = 6
ICONS_PER_SHEET = 36


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    n_written = 0
    for sheet in range(1, TOTAL_SHEETS + 1):
        path = os.path.join(ICONS_DIR, f"Spells{sheet:02d}.tga")
        if not os.path.exists(path):
            print(f"  WARN: missing {path}")
            continue
        try:
            img = Image.open(path).convert("RGBA")
        except Exception as exc:
            print(f"  ERROR loading {path}: {exc}")
            continue
        for local in range(ICONS_PER_SHEET):
            icon_id = (sheet - 1) * ICONS_PER_SHEET + local + 1
            col = local % ICONS_PER_ROW
            row = local // ICONS_PER_ROW
            box = (col * ICON_SIZE, row * ICON_SIZE,
                   (col + 1) * ICON_SIZE, (row + 1) * ICON_SIZE)
            tile = img.crop(box)
            out = os.path.join(OUT_DIR, f"icon_{icon_id:04d}.png")
            tile.save(out, "PNG", optimize=True)
            n_written += 1
        if sheet % 10 == 0:
            print(f"  ...extracted through sheet {sheet}")
    print(f"Wrote {n_written} icons to {OUT_DIR}")


if __name__ == "__main__":
    main()
