#!/usr/bin/env python3
"""Build the static-site bundle under docs/ for GitHub Pages deployment.

Copies:
  static/css/style.css           → docs/static/css/style.css
  static/icons/icon_*.png        → docs/static/icons/*.png
  spells.sqlite                  → docs/static/data/spells.sqlite

Does NOT copy:
  static/js/tooltip.js           — replaced by docs/static/js/tooltip.js (SPA flavor)
  templates/                     — replaced by docs/index.html (SPA shell)

The SPA itself (docs/index.html + docs/static/js/*) is hand-written and
checked into git. This script only refreshes the parts that need to be in
sync with a freshly built spells.sqlite + icons.

Pages should be configured to serve from main branch /docs.
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC_STATIC = os.path.join(HERE, "static")
SRC_DB     = os.path.join(HERE, "spells.sqlite")
OUT        = os.path.join(HERE, "docs")
OUT_STATIC = os.path.join(OUT, "static")


def copy_file(src, dst, *, label):
    if not os.path.exists(src):
        print(f"  WARN: missing {label} at {src}", file=sys.stderr)
        return False
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copy2(src, dst)
    sz = os.path.getsize(dst)
    print(f"  {label}: {sz:,} bytes")
    return True


def copy_tree(src, dst, *, label):
    if not os.path.exists(src):
        print(f"  WARN: missing {label} dir at {src}", file=sys.stderr)
        return 0
    os.makedirs(dst, exist_ok=True)
    n = 0
    total = 0
    for name in sorted(os.listdir(src)):
        sp = os.path.join(src, name)
        if os.path.isfile(sp):
            shutil.copy2(sp, os.path.join(dst, name))
            total += os.path.getsize(sp)
            n += 1
    print(f"  {label}: {n} files, {total:,} bytes")
    return n


def main():
    if not os.path.exists(OUT):
        print(f"  ERROR: {OUT} does not exist. Create it first.", file=sys.stderr)
        sys.exit(1)

    print("Copying static assets into docs/ …")
    copy_file(os.path.join(SRC_STATIC, "css", "style.css"),
              os.path.join(OUT_STATIC, "css", "style.css"),
              label="style.css")
    copy_tree(os.path.join(SRC_STATIC, "icons"),
              os.path.join(OUT_STATIC, "icons"),
              label="icons")
    copy_file(SRC_DB,
              os.path.join(OUT_STATIC, "data", "spells.sqlite"),
              label="spells.sqlite")

    print("\nDone.")
    print("To preview locally:  python3 -m http.server --directory docs 8000")
    print("Then visit: http://127.0.0.1:8000/")
    print("\nFor GitHub Pages: Settings → Pages → Source = main /docs.")


if __name__ == "__main__":
    main()
