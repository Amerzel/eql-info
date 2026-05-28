#!/usr/bin/env python3
"""Team-facing JSON export: just the fields needed to write the eqlwiki pages.

Two wiki page types drive the field set:
  - Class spell OVERVIEW pages ({{RadSpellRow2}} rows): lvl, name, description,
    school(skill), target, mana, cast, reuse(recast), duration, max(effect).
  - Individual spell DETAIL pages ({{Spellpage}}): name, icon, description,
    classes+levels, slots(effects), skill, mana, range, casting/fizzle/recast
    times, duration, target, spell_type, resist, cast/fade messages.

Fields the wiki sources by hand (NOT in client data) are intentionally omitted:
  - the spellicon LETTER code (we give the numeric icon only)
  - "kind", "location"/"where to obtain", "other"
These are left for the wiki team.

Outputs (under docs/data/wiki/):
    spells.json            — all in-game spells, one array (for detail pages)
    by_class/<class>.json  — per class, each spell with its level (for overviews)

Run:  .venv/bin/python export_wiki.py   (after build_db.py)
"""
import datetime
import json
import os
import sqlite3

from parse_spells import load_spells, spell_to_dict
from spa_data import spa_name
from skills_data import skill_name
from app import substitute, render_duration

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "spells.sqlite")
OUT_DIR = os.path.join(HERE, "docs", "data", "wiki")
BY_CLASS_DIR = os.path.join(OUT_DIR, "by_class")
TODAY = datetime.date.today().isoformat()

CLASS_NAMES = [
    "Warrior", "Cleric", "Paladin", "Ranger", "Shadow Knight",
    "Druid", "Monk", "Bard", "Rogue", "Shaman",
    "Necromancer", "Wizard", "Magician", "Enchanter", "Beastlord", "Berserker",
]
TARGET_TYPES = {
    1: "Line of Sight", 2: "Targeted AE", 3: "Group v1", 4: "PB AE",
    5: "Single Target", 6: "Self", 8: "Targeted AE", 9: "Animal",
    10: "Undead", 11: "Summoned", 13: "Lifetap", 14: "Pet",
    15: "Corpse", 16: "Plant", 17: "Uber Giants", 18: "Uber Dragons",
    20: "Targeted AE (Caster)", 24: "AE Undead", 25: "AE Summoned",
    32: "Hatelist 2", 33: "Hatelist", 34: "Chest", 35: "Special Muramite",
    36: "Group v2", 38: "Directional AE", 39: "Group Teleport",
    40: "Beam", 41: "Single in Group", 42: "Directional AE Caster",
    43: "Free Target", 44: "Beam", 45: "Pet Owner", 46: "Target Of Target",
    47: "Free Target", 50: "Tap (group)", 51: "Single Friendly (or Self)",
    52: "All Group Members",
}
RESIST_TYPES = {
    0: "Unresistable", 1: "Magic", 2: "Fire", 3: "Cold",
    4: "Poison", 5: "Disease", 6: "Chromatic", 7: "Prismatic",
    8: "Physical", 9: "Corruption",
}


def _slug(name):
    return name.lower().replace(" ", "")


def _secs(ms):
    return round((ms or 0) / 1000.0, 2)


def load_db(conn):
    class_avail = {}
    for sid, cname, lvl in conn.execute(
        "SELECT spell_id, class_name, min_level FROM spell_classes WHERE verified = 1"
    ):
        class_avail.setdefault(sid, []).append({"class": cname, "level": lvl})
    dbstr = {}
    for sid, typ, text in conn.execute(
        "SELECT id, type, text FROM dbstr WHERE type = 6"
    ):
        dbstr[sid] = text
    return class_avail, dbstr


def build_obj(sp, classes, dbstr):
    d = spell_to_dict(sp)
    raw_effects = d.get("effects", [])  # raw dicts: effect_id, base_value, max_value, ...
    duration_str = render_duration(d.get("buff_duration_formula"), d.get("buff_duration"))
    template = dbstr.get(d.get("description_id"))
    description = substitute(template, raw_effects, duration_str) if template else ""
    good = d.get("good_effect")
    return {
        "id": sp.id,
        "name": sp.name,
        "icon": d.get("new_icon"),
        "spell_type": "Beneficial" if good in (1, 2) else "Detrimental",
        "skill": skill_name(d.get("skill")),
        "description": description,
        "description_template": template or "",
        "mana": d.get("mana") or 0,
        "range": d.get("range") or 0,
        "cast_seconds": _secs(d.get("cast_time")),
        "fizzle_seconds": _secs(d.get("recovery_time")),
        "recast_seconds": _secs(d.get("recast_time")),
        "duration": duration_str,
        "duration_ticks": d.get("buff_duration") or 0,
        "target": TARGET_TYPES.get(d.get("target_type"), f"#{d.get('target_type')}"),
        "resist": RESIST_TYPES.get(d.get("resist_type"), f"#{d.get('resist_type')}"),
        "classes": sorted(classes, key=lambda r: r["level"]),
        "effects": [
            {"slot": i + 1, "effect_id": e["effect_id"], "effect": spa_name(e["effect_id"]),
             "base": e["base_value"], "limit": e["limit_value"],
             "formula": e["formula"], "max": e["max_value"]}
            for i, e in enumerate(raw_effects)
        ],
        "messages": {
            "cast_on_you": d.get("cast_on_you", ""),
            "cast_on_other": d.get("cast_on_other", ""),
            "wears_off": d.get("spell_fades", ""),
        },
    }


FIELD_NOTES = {
    "_about": "Stripped EQL spell data for generating eqlwiki overview "
              "(RadSpellRow2) and detail (Spellpage) pages. In-game/verified "
              "spells only.",
    "icon": "numeric spell icon; the wiki's single-letter spellicon code is a "
            "wiki convention not present in client data.",
    "description_template": "raw dbstr text with #N/$N/@N/%z placeholders, before "
            "substitution; 'description' is the rendered (filled-in) form.",
    "times": "cast_seconds / fizzle_seconds (recovery) / recast_seconds in "
             "seconds; duration is a rendered string, duration_ticks the raw cap.",
    "effects": "complete per-slot effect record: effect_id (SPA number), effect "
               "(name), base, limit, formula, max. Values are RAW SIGNED "
               "(negative = damage / decrease); abs() for damage display. This "
               "is the data the future 'Max Effect' algorithm keys off.",
    "omitted": "wiki-sourced fields not in client data: spellicon letter, kind, "
               "location / where-to-obtain, other.",
}


def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"missing {DB_PATH} — run build_db.py first")
    os.makedirs(BY_CLASS_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    class_avail, dbstr = load_db(conn)
    verified_ids = set(class_avail)

    spells = []
    for sp in load_spells():
        if sp.id in verified_ids:
            spells.append(build_obj(sp, class_avail[sp.id], dbstr))
    spells.sort(key=lambda s: s["id"])

    combined = {
        "generated": TODAY,
        "notes": FIELD_NOTES,
        "spell_count": len(spells),
        "spells": spells,
    }
    out = os.path.join(OUT_DIR, "spells.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False, indent=2)
    print(f"  wrote {out}  ({len(spells)} spells)")

    for ci, cname in enumerate(CLASS_NAMES):
        cls = []
        for s in spells:
            row = next((r for r in s["classes"] if r["class"] == cname), None)
            if row:
                obj = dict(s)
                obj["level"] = row["level"]
                cls.append(obj)
        if not cls:
            continue
        cls.sort(key=lambda s: (s["level"], s["name"].lower()))
        payload = {"generated": TODAY, "class": cname,
                   "spell_count": len(cls), "spells": cls}
        cpath = os.path.join(BY_CLASS_DIR, f"{_slug(cname)}.json")
        with open(cpath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"  wrote {cpath}  ({len(cls)} spells)")


if __name__ == "__main__":
    main()
