#!/usr/bin/env python3
"""Full spell-ID universe manifest — the baseline for detecting added/removed
spells across a patch.

The per-spell JSON export (export_json.py) only holds the *verified/in-game*
set, so it can't reveal brand-new spells (they aren't verified yet) or tell us
the full picture changed. This manifest captures EVERY spell id in
spells_us.txt with its name and class levels, committed to git, so after a
patch we can diff the new data against the previously-committed manifest and
see exactly what ids appeared or disappeared.

Writes a compact docs/data/_universe.json:
    {"generated","spell_count","spells":{"<id>":{"n": name, "c": {class_index: level}}}}
(only non-255 class slots are stored, so most entries are tiny.)

Usage:
    .venv/bin/python dump_universe.py            # (re)write the manifest from current raw data
    .venv/bin/python dump_universe.py --diff     # diff current raw data vs the committed manifest

Post-patch workflow: run --diff to review added/removed player spells, fold any
new in-game ones into verified/<class>.txt, then run with no args to refresh the
manifest and commit it.
"""
import argparse
import datetime
import json
import os
import subprocess
import sys

from parse_spells import load_spells

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_PATH = os.path.join(HERE, "docs", "data", "_universe.json")
GIT_PATH = "docs/data/_universe.json"
TODAY = datetime.date.today().isoformat()

# Caster classes we curate, by class_index. Used to filter the diff to spells
# that could be player-relevant at L1..MAX_LEVEL.
OURS = {1: "Cleric", 2: "Paladin", 3: "Ranger", 4: "Shadow Knight", 5: "Druid",
        7: "Bard", 9: "Shaman", 10: "Necromancer", 11: "Wizard", 12: "Magician",
        13: "Enchanter", 14: "Beastlord"}
MAX_LEVEL = 50


def build_universe():
    """Parse the current raw data into {id: {"n": name, "c": {class_index: level}}}."""
    out = {}
    for sp in load_spells():
        classes = {str(i): lvl for i, lvl in enumerate(sp.classes) if lvl != 255}
        out[str(sp.id)] = {"n": sp.name, "c": classes}
    return out


def _our_avail(entry):
    """List of (class, level) for our classes at L1..MAX_LEVEL, else []."""
    return [(OURS[int(i)], lvl) for i, lvl in entry["c"].items()
            if int(i) in OURS and lvl <= MAX_LEVEL]


def write_manifest():
    spells = build_universe()
    payload = {"generated": TODAY, "spell_count": len(spells), "spells": spells}
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    print(f"  wrote {OUT_PATH}  ({len(spells)} spells)")


def _load_git_manifest(ref="HEAD"):
    try:
        blob = subprocess.run(
            ["git", "-C", HERE, "show", f"{ref}:{GIT_PATH}"],
            capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"no committed manifest at {ref}:{GIT_PATH} "
                         f"(run 'dump_universe.py' and commit it first): {e.stderr.strip()}")
    return json.loads(blob)["spells"]


def run_diff():
    old = _load_git_manifest()
    new = build_universe()
    added = [i for i in new if i not in old]
    removed = [i for i in old if i not in new]
    print(f"universe: {len(old)} → {len(new)} spells "
          f"({len(added)} ids added, {len(removed)} ids removed)\n")

    a_ours = sorted(((i, new[i]) for i in added if _our_avail(new[i])),
                    key=lambda x: x[1]["n"].lower())
    r_ours = sorted(((i, old[i]) for i in removed if _our_avail(old[i])),
                    key=lambda x: x[1]["n"].lower())

    print(f"ADDED — castable by our classes at L1-{MAX_LEVEL} ({len(a_ours)}):")
    for i, e in a_ours:
        print(f"  + [{i}] {e['n']}: " + ", ".join(f"{c} L{l}" for c, l in _our_avail(e)))
    if not a_ours:
        print("  (none)")
    print(f"\nREMOVED — was castable by our classes at L1-{MAX_LEVEL} ({len(r_ours)}):")
    for i, e in r_ours:
        print(f"  - [{i}] {e['n']}: " + ", ".join(f"{c} L{l}" for c, l in _our_avail(e)))
    if not r_ours:
        print("  (none)")
    print("\n(After review, fold new in-game spells into verified/<class>.txt, "
          "then re-run 'dump_universe.py' to refresh the manifest and commit.)")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--diff", action="store_true",
                    help="diff current raw data against the committed manifest")
    args = ap.parse_args()
    if args.diff:
        run_diff()
    else:
        write_manifest()


if __name__ == "__main__":
    main()
