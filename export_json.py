#!/usr/bin/env python3
"""Export the full raw spell record for every in-game (verified) spell as JSON.

Combines two sources:
  - parse_spells.py  — parses ALL 171 caret-delimited fields from spells_us.txt
                       (nothing is dropped; even the unknown eql_new_* fields).
  - spells.sqlite    — the verified-classification flags (which spells are
                       actually in the game) plus the dbstr string table for
                       resolving description / category text.

A spell is included iff at least one class has verified=1 for it. Every
numeric code that we have a label table for also gets a human-readable
companion (skill_name, target_type_name, resist_type_name, effect_name).
Codes we cannot decode (deities[], eql_new_*) are emitted verbatim and noted
in the field catalog.

Outputs (under docs/data/ so GitHub Pages serves them):
    docs/data/spells.json            — all in-game spells, one array
    docs/data/by_class/<class>.json  — per-class subset (verified for that class)
    docs/data/_field_catalog.json    — dictionary of all 171 raw fields

Run:    .venv/bin/python export_json.py
"""
import datetime
import json
import os
import sqlite3

from parse_spells import load_spells, spell_to_dict, SCALAR_SCHEMA
from spa_data import spa_name
from skills_data import skill_name
# Reuse the webapp's exact rendering so template→rendered stays in sync.
from app import substitute, render_duration

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "spells.sqlite")
OUT_DIR = os.path.join(HERE, "docs", "data")
BY_CLASS_DIR = os.path.join(OUT_DIR, "by_class")

MAX_LEVEL = 50
TODAY = datetime.date.today().isoformat()

# Mirrors app.py / docs/static/js/data.js. CLASS_NAMES is duplicated across
# build_db.py and dump_verified_template.py too — same convention here.
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


def load_db(conn):
    """Returns (class_avail, dbstr) where:
      class_avail[spell_id] = list of {class_index, class, level, verified}
                              for every class that can cast it (level != 255).
      dbstr[(id, type)]     = text  (types 5/6/27 — the ones we resolve).
    """
    class_avail = {}
    for sid, ci, cname, lvl, ver in conn.execute(
        "SELECT spell_id, class_index, class_name, min_level, verified "
        "FROM spell_classes"
    ):
        class_avail.setdefault(sid, []).append(
            {"class_index": ci, "class": cname, "level": lvl,
             "verified": bool(ver)}
        )
    dbstr = {}
    for sid, typ, text in conn.execute(
        "SELECT id, type, text FROM dbstr WHERE type IN (5, 6, 27)"
    ):
        dbstr[(sid, typ)] = text
    return class_avail, dbstr


def build_spell_obj(sp, class_avail, dbstr):
    """Turn a parsed Spell into the export dict: full raw fields verbatim, plus
    decoded label companions and resolved string text."""
    d = spell_to_dict(sp)

    # --- effects: keep raw values (sign intact), add SPA name + slot index ---
    d["effects"] = [
        {"slot": i, "effect_id": e["effect_id"], "effect_name": spa_name(e["effect_id"]),
         "base_value": e["base_value"], "limit_value": e["limit_value"],
         "formula": e["formula"], "max_value": e["max_value"]}
        for i, e in enumerate(d.get("effects", []))
    ]

    # --- class availability (decoded, with verified flag) -------------------
    avail = class_avail.get(sp.id, [])
    d["class_availability"] = sorted(avail, key=lambda r: r["class_index"])
    levels = [r["level"] for r in avail if r["level"] != 255]
    d["min_level"] = min(levels) if levels else None
    # `classes` stays as the verbatim 16-slot raw array from the parser.

    # --- label companions for the simple coded scalars ----------------------
    d["skill_name"] = skill_name(d.get("skill"))
    d["target_type_name"] = TARGET_TYPES.get(d.get("target_type"), f"#{d.get('target_type')}")
    d["resist_type_name"] = RESIST_TYPES.get(d.get("resist_type"), f"#{d.get('resist_type')}")

    # --- resolved string text -----------------------------------------------
    # description_template = dbstr type 6 verbatim (raw #N/$N/@N/%z placeholders);
    # description_rendered = the in-game tooltip, placeholders filled from the
    # effect slots + duration (damage shown as abs() per the live client).
    template = dbstr.get((d.get("description_id"), 6))
    duration = render_duration(d.get("buff_duration_formula"), d.get("buff_duration"))
    d["description_template"] = template
    d["description_rendered"] = substitute(template, d["effects"], duration) if template else ""
    d["type_description"] = dbstr.get((d.get("type_description_id"), 5))
    d["effect_description"] = dbstr.get((d.get("effect_description_id"), 5))
    d["secondary_category"] = dbstr.get((d.get("secondary_category_2"), 5))
    sc = d.get("spell_category")
    d["category"] = dbstr.get((sc, 27)) if sc and sc > 0 else None

    # --- messages grouped (de-dupe the flat top-level copies) ---------------
    d["messages"] = {
        "you_cast": d.pop("you_cast", ""),
        "other_casts": d.pop("other_casts", ""),
        "cast_on_you": d.pop("cast_on_you", ""),
        "cast_on_other": d.pop("cast_on_other", ""),
        "spell_fades": d.pop("spell_fades", ""),
    }
    return d


def write_field_catalog():
    """Emit a dictionary of every raw field so consumers know what each column
    is and whether we decode it."""
    decoded = {  # raw field -> companion key it gets a label in
        "skill": "skill_name",
        "target_type": "target_type_name",
        "resist_type": "resist_type_name",
    }
    fields = []
    for start, name, fn, count in SCALAR_SCHEMA:
        fields.append({
            "raw_index": start,
            "name": name,
            "type": fn.__name__,
            "array_len": count if count > 1 else 1,
            "decoded": name in decoded,
            "label_field": decoded.get(name),
        })
    catalog = {
        "generated": TODAY,
        "note": "All 171 spells_us.txt fields are parsed and exported verbatim. "
                "Field 170 is the effects blob (exported as the 'effects' array "
                "with effect_name labels). Messages come from spells_us_str.txt.",
        "raw_field_count": 171,
        "fields": fields,
        "added_export_keys": {
            "effects": "list of {slot, effect_id, effect_name, base_value, limit_value, formula, max_value} (base_value sign kept: negative=damage, positive=heal)",
            "class_availability": "decoded list of {class_index, class, level, verified}; a spell is in-game iff any entry has verified=true",
            "min_level": "lowest non-255 class level",
            "skill_name / target_type_name / resist_type_name": "label companions",
            "description_template": "dbstr type 6 verbatim (raw #N/$N/@N/%z placeholders, NOT substituted)",
            "description_rendered": "the in-game tooltip text: template with placeholders filled from effect slots + duration (damage shown as abs()). Derived — see description_template for the verbatim source.",
            "type_description / effect_description / secondary_category": "dbstr type 5",
            "category": "dbstr type 27",
            "messages": "{you_cast, other_casts, cast_on_you, cast_on_other, spell_fades} from spells_us_str.txt",
        },
        "undecoded": {
            "deities": "16-slot raw array; no deity-name table available — emitted as integers.",
            "eql_new_1..eql_new_9": "EQL-custom fields, meaning undetermined — emitted verbatim.",
            "classes": "16-slot raw min-level array (255 = N/A); see class_availability for the decoded form.",
        },
    }
    path = os.path.join(OUT_DIR, "_field_catalog.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=2)
    print(f"  wrote {path}  ({len(fields)} fields cataloged)")


def main():
    if not os.path.exists(DB_PATH):
        raise SystemExit(f"missing {DB_PATH} — run build_db.py first")
    os.makedirs(BY_CLASS_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    class_avail, dbstr = load_db(conn)

    # Verified = in-game: spell_id has at least one verified class row.
    verified_ids = {
        sid for sid, rows in class_avail.items()
        if any(r["verified"] for r in rows)
    }
    print(f"  in-game (verified) spells: {len(verified_ids)}")

    spells = []
    for sp in load_spells():
        if sp.id in verified_ids:
            spells.append(build_spell_obj(sp, class_avail, dbstr))
    spells.sort(key=lambda s: s["id"])

    # --- single combined file ----------------------------------------------
    combined = {
        "generated": TODAY,
        "source": "EverQuest Legends client (spells_us.txt) — in-game verified set",
        "max_level": MAX_LEVEL,
        "field_catalog": "_field_catalog.json",
        "spell_count": len(spells),
        "spells": spells,
    }
    out = os.path.join(OUT_DIR, "spells.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(combined, f, ensure_ascii=False)
    print(f"  wrote {out}  ({len(spells)} spells)")

    # --- per-class files (spells verified for that class) ------------------
    by_id = {s["id"]: s for s in spells}
    for ci, cname in enumerate(CLASS_NAMES):
        cls_spells = []
        for s in spells:
            row = next((r for r in s["class_availability"]
                        if r["class_index"] == ci and r["verified"]), None)
            if row:
                obj = dict(s)
                obj["level"] = row["level"]  # this class's level, surfaced
                cls_spells.append(obj)
        if not cls_spells:
            continue
        cls_spells.sort(key=lambda s: (s["level"], s["name"].lower()))
        payload = {
            "generated": TODAY,
            "class": cname,
            "class_index": ci,
            "max_level": MAX_LEVEL,
            "spell_count": len(cls_spells),
            "spells": cls_spells,
        }
        cpath = os.path.join(BY_CLASS_DIR, f"{_slug(cname)}.json")
        with open(cpath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False)
        print(f"  wrote {cpath}  ({len(cls_spells)} spells)")

    write_field_catalog()


if __name__ == "__main__":
    main()
