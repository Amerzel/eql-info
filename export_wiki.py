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
# Names follow EQEmu spdat.h SpellTargetType (corrected 2026-07-21);
# keep in sync with webapp/app.py.
TARGET_TYPES = {
    1: "Line of Sight", 2: "Targeted AE", 3: "Group v1", 4: "PB AE",
    5: "Single Target", 6: "Self", 8: "Targeted AE", 9: "Animal",
    10: "Undead", 11: "Summoned", 13: "Lifetap", 14: "Pet",
    15: "Corpse", 16: "Plant", 17: "Uber Giants", 18: "Uber Dragons",
    20: "Targeted AE Tap", 24: "AE Undead", 25: "AE Summoned",
    32: "AE Hatelist", 33: "Hatelist", 34: "Chest", 35: "Special Muramite",
    36: "Area (Players)", 37: "Area (NPCs)", 38: "Summoned Pet",
    39: "Group (No Pets)", 40: "AE Bard", 41: "Group",
    42: "Directional AE", 43: "Single in Group (and Pet)", 44: "Beam",
    45: "Ring (Ground Target)", 46: "Target of Target", 47: "Pet Owner",
    50: "Targeted AE (No Players' Pets)", 51: "Single Friendly (or Self)",
    52: "All Group Members", 56: "Single Friendly (or Self)",
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


def write_index(total, per_class):
    """A basic landing page linking to every JSON file, so the team only needs
    one URL. per_class is a list of (class_name, slug, count)."""
    rows = "\n".join(
        f'      <li><a href="by_class/{slug}.json">{name}</a> '
        f'<span class="muted">— {count} spells</span></li>'
        for name, slug, count in per_class)
    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>EQL Spell Data — Wiki Export</title>
<style>
  body {{ background:#1a1612; color:#ddd4c4; font-family:system-ui,sans-serif;
         line-height:1.5; margin:0; padding:2rem; }}
  main {{ max-width:760px; margin:0 auto; }}
  h1 {{ color:#d5b46a; margin-bottom:.2rem; }}
  h2 {{ color:#c47b3a; margin-top:1.8rem; border-bottom:1px solid #3b332b;
        padding-bottom:.2rem; }}
  a {{ color:#b8d0f2; text-decoration:none; }}
  a:hover {{ text-decoration:underline; }}
  code {{ background:#2a241e; padding:.05em .35em; border-radius:3px; }}
  .muted {{ color:#8a7e6e; }}
  ul {{ list-style:none; padding-left:0; }}
  li {{ padding:.15rem 0; }}
  .fields li {{ list-style:disc; }}
  .fields {{ padding-left:1.3rem; }}
</style>
</head>
<body>
<main>
  <h1>EverQuest Legends — Spell Data</h1>
  <p class="muted">JSON export for generating <a href="https://eqlwiki.com">eqlwiki</a>
  spell pages. In-game (verified) spells only — {total} total. Generated {TODAY}.</p>

  <h2>All spells</h2>
  <ul>
    <li><a href="spells.json">spells.json</a>
      <span class="muted">— all {total} spells (use for individual spell detail pages)</span></li>
  </ul>

  <h2>By class</h2>
  <p class="muted">Each file lists that class's spells with the per-class
  <code>level</code> (use for the class overview pages).</p>
  <ul>
{rows}
  </ul>

  <h2>Spell icon mapping</h2>
  <p class="muted">EQL renders icons numerically from <code>Spells##.tga</code> sheets,
  <em>not</em> the wiki's 22-letter Spellicon set. The wiki's <code>spellicon = X</code>
  is a lossy approximation of the real per-spell icon.</p>
  <ul>
    <li><a href="icons.html">icons.html</a>
      <span class="muted">— side-by-side comparison of wiki letter vs. in-game icon, per spell, grouped by class</span></li>
    <li><a href="spell_icons.json">spell_icons.json</a>
      <span class="muted">— id → (new_icon, sheet, sheet_row/col, icon_url, current wiki letter) for every verified spell</span></li>
    <li><a href="spell_icons.zip">spell_icons.zip</a>
      <span class="muted">— the 138 PNGs actually rendered in-game + a README with the naming convention (for uploading to the wiki)</span></li>
  </ul>

  <h2>What's in each spell</h2>
  <ul class="fields">
    <li><code>name</code>, <code>icon</code>, <code>spell_type</code>, <code>skill</code></li>
    <li><code>description</code> (rendered) and <code>description_template</code> (raw <code>#N/%z</code> placeholders)</li>
    <li><code>mana</code>, <code>range</code>, <code>cast_seconds</code>, <code>fizzle_seconds</code>, <code>recast_seconds</code></li>
    <li><code>duration</code> (+ <code>duration_ticks</code>), <code>target</code>, <code>resist</code></li>
    <li><code>classes</code> — verified classes + levels</li>
    <li><code>effects</code> — per slot: <code>effect_id, effect, base, limit, formula, max</code> (raw signed; negative = damage/decrease)</li>
    <li><code>messages</code> — cast-on-you / cast-on-other / wears-off</li>
  </ul>
  <p class="muted">Not included (sourced by hand on the wiki): the spellicon
  letter code, kind, location / where-to-obtain, other.</p>
</main>
</body>
</html>
"""
    path = os.path.join(OUT_DIR, "index.html")
    with open(path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  wrote {path}")


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

    per_class = []
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
        slug = _slug(cname)
        cpath = os.path.join(BY_CLASS_DIR, f"{slug}.json")
        with open(cpath, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"  wrote {cpath}  ({len(cls)} spells)")
        per_class.append((cname, slug, len(cls)))

    write_index(len(spells), per_class)


if __name__ == "__main__":
    main()
