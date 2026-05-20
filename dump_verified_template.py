"""Dump per-class L1-50 spell lists into verified/<class>.txt files.

The user reviews each file against in-game screenshots and DELETES lines
for spells that aren't actually obtainable in the game. The lines that
remain are treated as the "verified" set by build_db.py.

Format: one spell per line, padded level prefix for at-a-glance scanning.

    L 1  Lifetap
    L 1  Spike of Disease
    L 2  Sense the Dead

Run with:    .venv/bin/python dump_verified_template.py
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "spells.sqlite")
OUT_DIR = os.path.join(os.path.dirname(__file__), "verified")

CLASS_NAMES = [
    "Warrior", "Cleric", "Paladin", "Ranger", "Shadow Knight",
    "Druid", "Monk", "Bard", "Rogue", "Shaman",
    "Necromancer", "Wizard", "Magician", "Enchanter", "Beastlord", "Berserker",
]


def slug(name): return name.lower().replace(" ", "")


def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"missing {DB_PATH}")
    os.makedirs(OUT_DIR, exist_ok=True)
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row

    for ci, cname in enumerate(CLASS_NAMES):
        rows = c.execute("""
          SELECT s.name, sc.min_level
            FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
           WHERE sc.class_index = ? AND sc.min_level <= 50
             AND s.is_discipline = 0
           ORDER BY sc.min_level, s.name COLLATE NOCASE
        """, (ci,)).fetchall()
        if not rows:
            continue
        path = os.path.join(OUT_DIR, f"{slug(cname)}.txt")
        if os.path.exists(path):
            print(f"  SKIP {path} (already exists — delete it to regenerate)")
            continue
        with open(path, "w", encoding="utf-8") as f:
            f.write(f"# UNREVIEWED — delete this line once you've reviewed\n")
            f.write(f"# this file against in-game screenshots. Until then,\n")
            f.write(f"# build_db.py will skip this file entirely.\n")
            f.write(f"#\n")
            f.write(f"# {cname} — L1-50 spells from EQL client data.\n")
            f.write(f"# Delete lines for spells NOT actually obtainable in-game.\n")
            f.write(f"# Lines that remain are treated as verified.\n")
            f.write(f"# Total dumped: {len(rows)} spells.\n")
            f.write(f"\n")
            for r in rows:
                f.write(f"L{r['min_level']:2d}  {r['name']}\n")
        print(f"  wrote {path}  ({len(rows)} spells)")


if __name__ == "__main__":
    main()
