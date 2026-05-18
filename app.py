"""EQL Spell Explorer — Flask web app.

Routes:
  /                          home page (class picker + search)
  /class/<class_index>       spells available to a class, grouped by level
  /spell/<spell_id>          full spell detail page
  /group/<spell_group>       all spells in a spell_group (Rk.II / Rk.III chain)
  /effect/<effect_id>        all spells that use a given SPA effect id
  /search?q=...              search spells by name

Run:
  .venv/bin/python app.py
"""
import os
import re
import sqlite3
from dataclasses import dataclass
from flask import Flask, render_template, abort, request, g, url_for, jsonify
from skills_data import SKILLS, CATEGORIES as SKILL_CATEGORIES, skill_name as _skill_name
from spa_data import spa_name

APP_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(APP_DIR, "spells.sqlite")

# EQL server level cap. All class/level views hard-hide rows above this.
# (The EQL spell file ships entries through L125 — Live data — but only
# L1..MAX_LEVEL is actually obtainable on this server.)
MAX_LEVEL = 50

app = Flask(__name__)

CLASS_NAMES = [
    "Warrior", "Cleric", "Paladin", "Ranger", "Shadow Knight",
    "Druid", "Monk", "Bard", "Rogue", "Shaman",
    "Necromancer", "Wizard", "Magician", "Enchanter", "Beastlord", "Berserker",
]

# Target-type names — partial; common ones suffice for v1.
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
    47: "Free Target", 50: "Tap (group)", 52: "All Group Members",
}

RESIST_TYPES = {0: "Unresistable", 1: "Magic", 2: "Fire", 3: "Cold",
                4: "Poison", 5: "Disease", 6: "Chromatic", 7: "Prismatic",
                8: "Physical", 9: "Corruption"}


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(_):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def dbstr(string_id: int, type_: int = 6) -> str | None:
    if not string_id:
        return None
    row = get_db().execute(
        "SELECT text FROM dbstr WHERE id=? AND type=?",
        (string_id, type_)).fetchone()
    return row["text"] if row else None


# ---------------------------------------------------------------------------
# Text rendering
# ---------------------------------------------------------------------------

def render_duration(formula: int | None, cap: int | None) -> str:
    if not cap:
        return "instant"
    # 1 tick = 6 seconds.
    ticks = cap
    secs = ticks * 6
    if secs >= 60:
        return f"{secs//60} min {secs%60}s" if secs % 60 else f"{secs//60} min"
    return f"{secs}s"


def substitute(text: str, effects: list, duration: str) -> str:
    """#N, $N, @N positional substitution from effect slots."""
    if not text:
        return ""

    def get(idx: int):
        return effects[idx] if 0 <= idx < len(effects) else None

    def hash_repl(m):
        e = get(int(m.group(1)) - 1)
        return str(e["base_value"]) if e else m.group(0)

    def dollar_repl(m):
        e = get(int(m.group(1)) - 1)
        if not e:
            return m.group(0)
        return str(e["max_value"] if e["max_value"] else e["base_value"])

    def at_repl(m):
        e = get(int(m.group(1)) - 1)
        return str(e["max_value"]) if e else m.group(0)

    text = re.sub(r"#(\d+)", hash_repl, text)
    text = re.sub(r"\$(\d+)", dollar_repl, text)
    text = re.sub(r"@(\d+)", at_repl, text)
    text = text.replace("%z", duration)
    # Some color-coding tags; leave or strip:
    text = re.sub(r"<c\s+\"#[0-9A-Fa-f]+\">", "", text)
    text = text.replace("</c>", "").replace("<BR>", "<br>")
    return text


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.route("/")
def home():
    db = get_db()
    # Only count spells that are obtainable at L1..MAX_LEVEL.
    n_spells = db.execute(
        "SELECT COUNT(DISTINCT spell_id) AS c FROM spell_classes "
        "WHERE min_level <= ?", (MAX_LEVEL,)).fetchone()["c"]
    counts = {}
    for r in db.execute(
        "SELECT class_index, class_name, COUNT(*) AS n "
        "FROM spell_classes WHERE min_level <= ? "
        "GROUP BY class_index ORDER BY class_index", (MAX_LEVEL,)
    ):
        counts[r["class_index"]] = (r["class_name"], r["n"])
    return render_template("home.html",
                           classes=[(i, *counts.get(i, (CLASS_NAMES[i], 0)))
                                    for i in range(16)],
                           n_spells=n_spells, max_level=MAX_LEVEL)


@app.route("/class/<int:class_index>")
def class_page(class_index: int):
    if not 0 <= class_index < 16:
        abort(404)
    # Filters
    kind = request.args.get("kind", "all")  # all, spells, disc
    good = request.args.get("good", "all")  # all, buff, det
    level_min = request.args.get("level_min", type=int)
    level_max = request.args.get("level_max", type=int)

    # Hard-cap: never show entries above MAX_LEVEL.
    where = ["sc.class_index = ?", "sc.min_level <= ?"]
    params = [class_index, MAX_LEVEL]
    if kind == "spells":
        where.append("s.is_discipline = 0")
    elif kind == "disc":
        where.append("s.is_discipline = 1")
    if good == "buff":
        where.append("s.good_effect IN (1, 2)")
    elif good == "det":
        where.append("s.good_effect = 0")
    if level_min is not None:
        where.append("sc.min_level >= ?")
        params.append(level_min)
    if level_max is not None:
        where.append("sc.min_level <= ?")
        params.append(min(level_max, MAX_LEVEL))

    db = get_db()
    rows = db.execute(
        "SELECT s.id, s.name, s.new_icon, s.mana, s.cast_time, "
        "       s.buff_duration, s.buff_duration_formula, s.target_type, "
        "       s.good_effect, s.is_discipline, sc.min_level "
        "  FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id "
        " WHERE " + " AND ".join(where) +
        " ORDER BY sc.min_level, s.name",
        params).fetchall()
    by_level = {}
    for r in rows:
        by_level.setdefault(r["min_level"], []).append(r)
    return render_template("class.html",
                           class_index=class_index,
                           class_name=CLASS_NAMES[class_index],
                           by_level=sorted(by_level.items()),
                           total=len(rows),
                           kind=kind, good=good,
                           level_min=level_min, level_max=level_max)


@app.route("/spell/<int:spell_id>")
def spell_page(spell_id: int):
    db = get_db()
    spell = db.execute("SELECT * FROM spells WHERE id = ?",
                       (spell_id,)).fetchone()
    if not spell:
        abort(404)
    effects = db.execute(
        "SELECT * FROM spell_effects WHERE spell_id = ? ORDER BY slot",
        (spell_id,)).fetchall()
    msgs = db.execute(
        "SELECT * FROM spell_messages WHERE spell_id = ?",
        (spell_id,)).fetchone()
    classes = db.execute(
        "SELECT class_index, class_name, min_level FROM spell_classes "
        "WHERE spell_id = ? AND min_level <= ? "
        "ORDER BY min_level, class_index",
        (spell_id, MAX_LEVEL)).fetchall()
    # Spell line — sibling spells in the same spell_group.
    group_siblings = []
    if spell["spell_group"]:
        group_siblings = db.execute(
            "SELECT id, name, rank FROM spells "
            "WHERE spell_group = ? AND spell_group != 0 "
            "ORDER BY rank, id",
            (spell["spell_group"],)).fetchall()

    # Resolve description text.
    duration = render_duration(spell["buff_duration_formula"],
                               spell["buff_duration"])
    # description_id resolves to dbstr type 6 (the spell's full description),
    # while the category IDs resolve to type 5 (short category labels like
    # "Utility Beneficial", "Direct Damage", etc.).
    desc_text = dbstr(spell["description_id"], 6)
    type_text = dbstr(spell["type_description_id"], 5)
    effect_text = dbstr(spell["effect_description_id"], 5)
    secondary_text = dbstr(spell["secondary_category_2"], 5)
    # spell_category packed code → EQL category name (dbstr type 27)
    category_text = dbstr(spell["spell_category"], 27) if spell["spell_category"] and spell["spell_category"] > 0 else None
    rendered = substitute(desc_text, effects, duration) if desc_text else ""

    return render_template(
        "spell.html",
        spell=spell, effects=effects, msgs=msgs, classes=classes,
        class_names=CLASS_NAMES, target_types=TARGET_TYPES,
        resist_types=RESIST_TYPES, group_siblings=group_siblings,
        duration=duration,
        desc_text=desc_text, desc_rendered=rendered,
        type_text=type_text, effect_text=effect_text,
        secondary_text=secondary_text, category_text=category_text,
    )


@app.route("/api/spell/<int:spell_id>")
def api_spell(spell_id: int):
    """Compact JSON payload for the hover tooltip."""
    db = get_db()
    spell = db.execute("SELECT * FROM spells WHERE id = ?",
                       (spell_id,)).fetchone()
    if not spell:
        abort(404)
    effects = db.execute(
        "SELECT * FROM spell_effects WHERE spell_id = ? ORDER BY slot",
        (spell_id,)).fetchall()
    classes = db.execute(
        "SELECT class_index, class_name, min_level FROM spell_classes "
        "WHERE spell_id = ? AND min_level <= ? "
        "ORDER BY min_level, class_index",
        (spell_id, MAX_LEVEL)).fetchall()
    duration = render_duration(spell["buff_duration_formula"],
                               spell["buff_duration"])
    desc_text = dbstr(spell["description_id"], 6)
    rendered = substitute(desc_text, effects, duration) if desc_text else ""
    category_text = (dbstr(spell["spell_category"], 27)
                     if spell["spell_category"] and spell["spell_category"] > 0
                     else None)

    return jsonify({
        "id": spell["id"],
        "name": spell["name"],
        "icon": (url_for("static", filename=f"icons/icon_{spell['new_icon']:04d}.png")
                 if spell["new_icon"] else None),
        "mana": spell["mana"],
        "endurance_cost": spell["endurance_cost"],
        "cast_time_s": (spell["cast_time"] or 0) / 1000.0,
        "recast_s": (spell["recast_time"] or 0) / 1000.0,
        "recovery_s": (spell["recovery_time"] or 0) / 1000.0,
        "range": spell["range"],
        "aoe_range": spell["aoe_range"],
        "duration": duration,
        "target": TARGET_TYPES.get(spell["target_type"], f"#{spell['target_type']}"),
        "resist": RESIST_TYPES.get(spell["resist_type"], f"#{spell['resist_type']}"),
        "resist_difficulty": spell["resist_difficulty"],
        "is_discipline": bool(spell["is_discipline"]),
        "good_effect": spell["good_effect"],
        "category": category_text,
        "description": rendered,
        "effects": [
            {"slot": e["slot"] + 1, "id": e["effect_id"],
             "name": spa_name(e["effect_id"]),
             "base": e["base_value"], "limit": e["limit_value"],
             "formula": e["formula"], "max": e["max_value"]}
            for e in effects
        ],
        "classes": [
            {"index": c["class_index"], "name": c["class_name"],
             "level": c["min_level"]}
            for c in classes
        ],
    })


@app.route("/group/<int:spell_group>")
def group_page(spell_group: int):
    if spell_group == 0:
        abort(404)
    db = get_db()
    rows = db.execute(
        "SELECT id, name, rank, new_icon FROM spells "
        "WHERE spell_group = ? ORDER BY rank, id",
        (spell_group,)).fetchall()
    if not rows:
        abort(404)
    return render_template("group.html", spell_group=spell_group, rows=rows)


@app.route("/effect/<int:effect_id>")
def effect_page(effect_id: int):
    db = get_db()
    # Cap to spells obtainable by some class at L<=MAX_LEVEL.
    rows = db.execute(
        "SELECT s.id, s.name, s.new_icon, se.slot, se.base_value, "
        "       se.limit_value, se.formula, se.max_value "
        "  FROM spell_effects se JOIN spells s ON s.id = se.spell_id "
        " WHERE se.effect_id = ? "
        "   AND EXISTS (SELECT 1 FROM spell_classes sc "
        "               WHERE sc.spell_id = s.id AND sc.min_level <= ?) "
        " ORDER BY s.name LIMIT 500",
        (effect_id, MAX_LEVEL)).fetchall()
    return render_template("effect.html", effect_id=effect_id, rows=rows)


@app.route("/aas")
def aa_index():
    """Group AAs by name; show rank count per group."""
    q = (request.args.get("q") or "").strip()
    db = get_db()
    if q:
        rows = db.execute(
            "SELECT name, COUNT(*) AS ranks, MIN(dbstr_id) AS first_id "
            "  FROM aas WHERE name LIKE ? COLLATE NOCASE "
            "  GROUP BY name ORDER BY name COLLATE NOCASE LIMIT 1000",
            (f"%{q}%",)).fetchall()
    else:
        rows = db.execute(
            "SELECT name, COUNT(*) AS ranks, MIN(dbstr_id) AS first_id "
            "  FROM aas GROUP BY name ORDER BY name COLLATE NOCASE"
        ).fetchall()
    return render_template("aas.html", rows=rows, q=q)


@app.route("/aa/<name>")
def aa_detail(name: str):
    db = get_db()
    ranks = db.execute(
        "SELECT dbstr_id, name, description FROM aas "
        " WHERE name = ? COLLATE NOCASE ORDER BY dbstr_id",
        (name,)).fetchall()
    if not ranks:
        abort(404)
    return render_template("aa.html", name=ranks[0]["name"], ranks=ranks)


@app.route("/skills")
def skills_index():
    db = get_db()
    # Count only spells obtainable at L<=MAX_LEVEL (must have a class row in range).
    counts = {row["skill"]: row["c"] for row in db.execute(
        "SELECT s.skill, COUNT(DISTINCT s.id) AS c "
        "  FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id "
        " WHERE sc.min_level <= ? "
        " GROUP BY s.skill", (MAX_LEVEL,))}
    # Build category groupings with counts.
    groups = []
    for cat, ids in SKILL_CATEGORIES.items():
        items = [(sid, code, name, counts.get(sid, 0))
                 for sid, code, name in SKILLS if sid in ids]
        items.sort(key=lambda r: r[2])
        groups.append((cat, items))
    # Any skills not categorized:
    all_categorized = set().union(*SKILL_CATEGORIES.values())
    uncategorized = [(sid, code, name, counts.get(sid, 0))
                     for sid, code, name in SKILLS if sid not in all_categorized]
    if uncategorized:
        groups.append(("Other", uncategorized))
    return render_template("skills.html", groups=groups)


@app.route("/skill/<int:skill_id>")
def skill_page(skill_id: int):
    info = None
    for sid, code, name in SKILLS:
        if sid == skill_id:
            info = (sid, code, name)
            break
    if info is None:
        abort(404)
    db = get_db()
    # Cap to L<=MAX_LEVEL: only include spells where at least one class
    # min_level fits. Disciplines and class-less skill spells excluded
    # implicitly by the join condition.
    spells = db.execute(
        "SELECT s.id, s.name, s.new_icon, s.is_discipline, s.mana, "
        "       s.endurance_cost, s.cast_time, "
        "       MIN(sc.min_level) AS first_level, "
        "       GROUP_CONCAT(DISTINCT sc.class_name) AS class_list "
        "  FROM spells s "
        "  JOIN spell_classes sc ON sc.spell_id = s.id "
        " WHERE s.skill = ? AND sc.min_level <= ? "
        " GROUP BY s.id "
        " ORDER BY first_level, s.name",
        (skill_id, MAX_LEVEL)).fetchall()
    return render_template("skill.html",
                           skill_id=skill_id, skill_code=info[1],
                           skill_name=info[2], spells=spells)


@app.route("/diff", methods=["GET", "POST"])
def diff_page():
    """Paste a class+level+spell-name list (one per line); we report missing
    vs extra against EQL data."""
    class_index = request.values.get("class_index", type=int)
    level_min = max(1, request.values.get("level_min", default=1, type=int))
    level_max = min(MAX_LEVEL, request.values.get("level_max", default=MAX_LEVEL, type=int))
    pasted = request.values.get("pasted", "")

    result = None
    if request.method == "POST" and class_index is not None:
        # Parse the paste — one spell name per line; ignore blanks and
        # ignore parenthetical decorations or "Rk. II" suffixes.
        import re as _re
        lines = [_re.sub(r"\s*\([^)]*\)", "", ln).strip()
                 for ln in pasted.splitlines()]
        lines = [_re.sub(r"\s*Rk\.\s*[IVX]+\s*$", "", ln).strip()
                 for ln in lines]
        screenshot_names = [ln for ln in lines if ln]

        # Pull all EQL spells for this class in the requested level range.
        db = get_db()
        eql_rows = db.execute(
            "SELECT s.id, s.name, sc.min_level "
            "  FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id "
            " WHERE sc.class_index = ? AND sc.min_level BETWEEN ? AND ? "
            " ORDER BY sc.min_level, s.name",
            (class_index, level_min, level_max)).fetchall()

        # Case-insensitive matching, with optional fuzzy similarity for
        # near-misses. Single pass; track which EQL names got claimed.
        import difflib
        eql_by_lower = {r["name"].lower(): r for r in eql_rows}
        eql_keys = list(eql_by_lower.keys())
        shot_lower = {n.lower(): n for n in screenshot_names}

        exact_match = []
        missing_from_eql = []
        fuzzy = []
        claimed = set()  # lowercased EQL names that we've matched to a paste

        for low, original in shot_lower.items():
            if low in eql_by_lower:
                exact_match.append((original, eql_by_lower[low]))
                claimed.add(low)
                continue
            cand = difflib.get_close_matches(low, eql_keys, n=1, cutoff=0.85)
            if cand:
                fuzzy.append((original, eql_by_lower[cand[0]]))
                claimed.add(cand[0])
            else:
                missing_from_eql.append(original)

        extra_in_eql = [r for r in eql_rows
                        if r["name"].lower() not in claimed]

        result = {
            "exact_match": exact_match,
            "missing_from_eql": missing_from_eql,
            "extra_in_eql": extra_in_eql,
            "fuzzy": fuzzy,
            "n_pasted": len(screenshot_names),
            "n_eql": len(eql_rows),
        }

    return render_template("diff.html",
                           class_names=CLASS_NAMES,
                           class_index=class_index,
                           level_min=level_min,
                           level_max=level_max,
                           pasted=pasted,
                           result=result)


@app.route("/search")
def search():
    q = (request.args.get("q") or "").strip()
    rows = []
    if q:
        rows = get_db().execute(
            "SELECT id, name, new_icon FROM spells "
            "WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT 200",
            (f"%{q}%",)).fetchall()
    return render_template("search.html", q=q, rows=rows)


# Jinja helpers
@app.template_filter("spa_name")
def _filter_spa_name(effect_id):
    return spa_name(effect_id)


@app.template_filter("skill_name")
def _filter_skill_name(skill_id):
    return _skill_name(skill_id)


@app.template_filter("icon_path")
def icon_path(new_icon):
    if not new_icon or new_icon < 1:
        return None
    return url_for("static", filename=f"icons/icon_{new_icon:04d}.png")


@app.template_filter("ms_to_seconds")
def ms_to_seconds(ms):
    if not ms:
        return "0"
    return f"{ms/1000:g}"


@app.template_filter("level_display")
def level_display(lvl):
    if lvl == 254:
        return "—"
    if lvl == 255:
        return "n/a"
    return str(lvl)


if __name__ == "__main__":
    # debug=False so the dev server doesn't auto-reload (auto-reload was
    # creating zombie processes when run via nohup).
    app.run(host="127.0.0.1", port=5000, debug=False)
