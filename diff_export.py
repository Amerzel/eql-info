#!/usr/bin/env python3
"""Readable diff between two spells.json exports (patch-over-patch changelog).

Spells are keyed by their EQ `id` (column 0 of spells_us.txt), which is stable
across patches — new spells get new ids, existing ones keep theirs. Because the
export only holds the verified/in-game set, this diff is effectively the
player-facing changelog:

  ADDED    — newly in-game (brand-new spell, or one newly marked verified)
  REMOVED  — no longer in-game (pulled from data, or un-verified)
  CHANGED  — same spell, significant fields moved (mana, cast/recast, range,
             level, effect values, resist, target, description, availability)

Usage:
    # compare the working-tree export against the last committed version
    .venv/bin/python diff_export.py

    # compare two explicit files
    .venv/bin/python diff_export.py OLD.json NEW.json

    # write a markdown report instead of plain text
    .venv/bin/python diff_export.py --format md --out CHANGES.md

Only "significant" fields are compared (see SCALAR_FIELDS + effects +
class_availability). Engine/animation/eql_new_* noise is intentionally ignored
so the report stays readable.
"""
import argparse
import json
import os
import subprocess
import sys

from app import render_duration

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_EXPORT = os.path.join(HERE, "docs", "data", "spells.json")
GIT_PATH = "docs/data/spells.json"  # path within the webapp repo

# (key, label) — scalar fields worth reporting when they change.
SCALAR_FIELDS = [
    ("name", "Name"),
    ("min_level", "Min level"),
    ("mana", "Mana"),
    ("cast_time", "Cast time (ms)"),
    ("recovery_time", "Recovery (ms)"),
    ("recast_time", "Recast (ms)"),
    ("range", "Range"),
    ("aoe_range", "AoE range"),
    ("target_type_name", "Target"),
    ("resist_type_name", "Resist"),
    ("skill_name", "Skill"),
    ("good_effect", "Good-effect flag"),
    ("description_rendered", "Description"),
]


def _load_path(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _load_git(ref):
    """Load the committed spells.json at a git ref (e.g. HEAD)."""
    try:
        blob = subprocess.run(
            ["git", "-C", HERE, "show", f"{ref}:{GIT_PATH}"],
            capture_output=True, text=True, check=True,
        ).stdout
    except subprocess.CalledProcessError as e:
        raise SystemExit(f"could not read {GIT_PATH} at git ref '{ref}': {e.stderr.strip()}")
    return json.loads(blob)


def _by_id(doc):
    return {s["id"]: s for s in doc.get("spells", [])}


def _verified_classes(spell):
    return [r for r in spell.get("class_availability", []) if r.get("verified")]


def _class_summary(spell):
    vs = _verified_classes(spell)
    if not vs:
        return "(no verified class)"
    return ", ".join(f"{r['class']} L{r['level']}" for r in sorted(vs, key=lambda r: r["level"]))


def _dmg_note(effect_id, value):
    """Annotate effect-0 negative base values with the abs() the client shows."""
    if effect_id == 0 and isinstance(value, int) and value < 0:
        return f" (damage {abs(value)})"
    return ""


def _diff_effects(old, new):
    """Per-slot effect comparison. Returns list of change strings."""
    lines = []
    o = {e["slot"]: e for e in old.get("effects", [])}
    n = {e["slot"]: e for e in new.get("effects", [])}
    for slot in sorted(set(o) | set(n)):
        oe, ne = o.get(slot), n.get(slot)
        if oe and not ne:
            lines.append(f"effect slot {slot} removed ({oe['effect_name']})")
        elif ne and not oe:
            lines.append(f"effect slot {slot} added ({ne['effect_name']} "
                         f"base {ne['base_value']}{_dmg_note(ne['effect_id'], ne['base_value'])})")
        else:
            if oe["effect_id"] != ne["effect_id"]:
                lines.append(f"effect slot {slot}: {oe['effect_name']} → {ne['effect_name']}")
            for k in ("base_value", "max_value", "formula", "limit_value"):
                if oe.get(k) != ne.get(k):
                    note = ""
                    if k in ("base_value", "max_value"):
                        note = _dmg_note(ne["effect_id"], ne.get(k))
                    lines.append(f"effect slot {slot} {k}: {oe.get(k)} → {ne.get(k)}{note}")
    return lines


def _diff_availability(old, new):
    """Compare per-class level + verified state. Returns list of change strings."""
    lines = []
    o = {r["class"]: r for r in old.get("class_availability", [])}
    n = {r["class"]: r for r in new.get("class_availability", [])}
    for cls in sorted(set(o) | set(n)):
        orow, nrow = o.get(cls), n.get(cls)
        if orow and not nrow:
            lines.append(f"{cls}: removed from class list")
        elif nrow and not orow:
            v = " (in-game)" if nrow.get("verified") else " (not verified)"
            lines.append(f"{cls}: now castable at L{nrow['level']}{v}")
        else:
            if orow["level"] != nrow["level"]:
                lines.append(f"{cls}: level {orow['level']} → {nrow['level']}")
            if bool(orow.get("verified")) != bool(nrow.get("verified")):
                a, b = bool(orow.get("verified")), bool(nrow.get("verified"))
                lines.append(f"{cls}: in-game {a} → {b}")
    return lines


def _diff_duration(old, new):
    of, oc = old.get("buff_duration_formula"), old.get("buff_duration")
    nf, nc = new.get("buff_duration_formula"), new.get("buff_duration")
    if (of, oc) != (nf, nc):
        return [f"Duration: {render_duration(of, oc)} → {render_duration(nf, nc)}"]
    return []


def diff_spell(old, new):
    """All significant change lines for a spell present in both exports."""
    lines = []
    for key, label in SCALAR_FIELDS:
        ov, nv = old.get(key), new.get(key)
        if ov != nv:
            if key == "description_rendered":
                lines.append(f"{label}:")
                lines.append(f"    old: {ov!r}")
                lines.append(f"    new: {nv!r}")
            else:
                lines.append(f"{label}: {ov} → {nv}")
    lines += _diff_duration(old, new)
    lines += _diff_effects(old, new)
    lines += _diff_availability(old, new)
    return lines


def build_report(old_doc, new_doc):
    old, new = _by_id(old_doc), _by_id(new_doc)
    added = [new[i] for i in new if i not in old]
    removed = [old[i] for i in old if i not in new]
    changed = []
    for i in sorted(set(old) & set(new)):
        lines = diff_spell(old[i], new[i])
        if lines:
            changed.append((new[i], lines))
    added.sort(key=lambda s: s["name"].lower())
    removed.sort(key=lambda s: s["name"].lower())
    changed.sort(key=lambda c: c[0]["name"].lower())
    return added, removed, changed


def render_text(old_doc, new_doc, *, md=False):
    added, removed, changed = build_report(old_doc, new_doc)
    H1 = (lambda s: f"## {s}") if md else (lambda s: s)
    # The +/-/~ markers already denote add/remove/change, so no list bullet.
    bullet = "  "
    out = []
    o_from = old_doc.get("generated", "?")
    o_to = new_doc.get("generated", "?")
    title = f"EQL spell changes: {o_from} → {o_to}"
    out.append(f"# {title}" if md else title)
    out.append(f"({len(added)} added, {len(removed)} removed, {len(changed)} changed; "
               f"{old_doc.get('spell_count','?')} → {new_doc.get('spell_count','?')} in-game)")
    out.append("")

    out.append(H1(f"ADDED ({len(added)})"))
    for s in added:
        n_eff = len(s.get("effects", []))
        out.append(f"{bullet}+ [{s['id']}] {s['name']} — {_class_summary(s)}  ({n_eff} effects)")
    if not added:
        out.append(f"{bullet}(none)")
    out.append("")

    out.append(H1(f"REMOVED ({len(removed)})"))
    for s in removed:
        out.append(f"{bullet}- [{s['id']}] {s['name']} — was {_class_summary(s)}")
    if not removed:
        out.append(f"{bullet}(none)")
    out.append("")

    out.append(H1(f"CHANGED ({len(changed)})"))
    for s, lines in changed:
        out.append(f"{bullet}~ [{s['id']}] {s['name']}" if md else f"  ~ [{s['id']}] {s['name']}")
        for ln in lines:
            out.append(f"      {ln}")
    if not changed:
        out.append(f"{bullet}(none)")
    return "\n".join(out) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("old", nargs="?", help="old spells.json (default: committed HEAD version)")
    ap.add_argument("new", nargs="?", help="new spells.json (default: working-tree export)")
    ap.add_argument("--git-ref", default="HEAD",
                    help="git ref to load the old export from when 'old' is omitted (default HEAD)")
    ap.add_argument("--format", choices=["text", "md"], default="text")
    ap.add_argument("--out", help="write report to this path instead of stdout")
    args = ap.parse_args()

    if args.old:
        old_doc = _load_path(args.old)
        new_doc = _load_path(args.new or DEFAULT_EXPORT)
    else:
        # Default: what changed since the last commit.
        old_doc = _load_git(args.git_ref)
        new_doc = _load_path(DEFAULT_EXPORT)

    report = render_text(old_doc, new_doc, md=(args.format == "md"))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(report)
        print(f"wrote {args.out}")
    else:
        sys.stdout.write(report)


if __name__ == "__main__":
    main()
