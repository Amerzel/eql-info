#!/usr/bin/env python3
"""Extract spell icons from the EQL Spells*.tga spritesheets into PNGs.

EQ convention: each Spells##.tga is 256x256 with a 6x6 grid of 40x40 icons
(240x240 of useful area, padded at the bottom-right). Output filenames are
**0-indexed to match the spell file's `new_icon` field directly**, so a spell
with new_icon=N uses icon_NNNN.png with no off-by-one. The math:
  sheet  = N // 36 + 1    -> Spells{sheet:02d}.tga
  local  = N % 36
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


CLASS_TGA = [
    # (class_index, filename) — order matches CLASS_NAMES in webapp/skills_data.py
    (0,  "warrior01.tga"),
    (1,  "cleric01.tga"),
    (2,  "paladin01.tga"),
    (3,  "ranger01.tga"),
    (4,  "shadowknight01.tga"),
    (5,  "druid01.tga"),
    (6,  "monk01.tga"),
    (7,  "bard01.tga"),
    (8,  "rogue01.tga"),
    (9,  "shaman01.tga"),
    (10, "necromancer01.tga"),
    (11, "wizard01.tga"),
    (12, "magician01.tga"),
    (13, "enchanter01.tga"),
    (14, "beastlord01.tga"),
    (15, "Berserker01.tga"),
]
CLASS_TILE_W, CLASS_TILE_H = 64, 128


def extract_spell_icons():
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
            icon_id = (sheet - 1) * ICONS_PER_SHEET + local  # 0-indexed, matches new_icon
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
    print(f"Wrote {n_written} spell icons to {OUT_DIR}")


def extract_class_banners():
    """First 64x128 frame of each <class>01.tga -> static/icons/classes/<index>.png."""
    out_dir = os.path.join(OUT_DIR, "classes")
    os.makedirs(out_dir, exist_ok=True)
    n = 0
    for idx, fname in CLASS_TGA:
        src = os.path.join(ICONS_DIR, fname)
        if not os.path.exists(src):
            print(f"  WARN: missing {src}")
            continue
        try:
            img = Image.open(src).convert("RGBA")
        except Exception as exc:
            print(f"  ERROR loading {src}: {exc}")
            continue
        tile = img.crop((0, 0, CLASS_TILE_W, CLASS_TILE_H))
        tile.save(os.path.join(out_dir, f"{idx:02d}.png"), "PNG", optimize=True)
        n += 1
    print(f"Wrote {n} class banners to {out_dir}")


def main():
    extract_spell_icons()
    extract_class_banners()


if __name__ == "__main__":
    main()
