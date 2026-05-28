#!/usr/bin/env python3
"""Build the SQLite database that backs the EQL spell explorer.

Reads:
  ../spells_us.txt           — EQL spell rows (171 caret-delimited fields)
  ../spells_us_str.txt       — companion message text (caster/casted/fades)
  <Live install>/dbstr_us.txt — string table for descriptions

Writes:
  ./spells.sqlite             — SQLite database

Tables:
  spells          — one row per spell (denormalized scalar fields)
  spell_classes   — (spell_id, class_index, min_level) — narrow long table
  spell_effects   — (spell_id, slot, effect_id, base_value, limit_value,
                    formula, max_value)
  spell_messages  — (spell_id, you_cast, other_casts, cast_on_you,
                    cast_on_other, spell_fades)
  dbstr           — (id, type, text)  — full Live string table
"""
import os
import re
import sys
import sqlite3

HERE = os.path.dirname(os.path.abspath(__file__))
from parse_spells import load_spells, load_str_file, spell_to_dict, DATA_DIR  # noqa: E402

DB_PATH = os.path.join(HERE, "spells.sqlite")
# dbstr_us.txt is the string table the spell explorer joins descriptions /
# category names against. Resolution order:
#   1. $EQL_DBSTR (explicit override)
#   2. $EQL_DATA_DIR/dbstr_us.txt
#   3. $EQL_DATA_DIR/eq_txt/New folder/dbstr_us.txt (the original zip layout)
#   4. <data_dir>/../eq_txt/New folder/dbstr_us.txt
#   5. The Live EQ install (development fallback; works on this author's WSL).
LIVE_DBSTR = "/mnt/c/Users/Public/Daybreak Game Company/Installed Games/EverQuest/dbstr_us.txt"

def _resolve_dbstr():
    if os.environ.get("EQL_DBSTR"):
        return os.environ["EQL_DBSTR"]
    candidates = [
        os.path.join(DATA_DIR, "dbstr_us.txt"),
        os.path.join(DATA_DIR, "eq_txt", "New folder", "dbstr_us.txt"),
        os.path.join(os.path.dirname(DATA_DIR), "eq_txt", "New folder", "dbstr_us.txt"),
        LIVE_DBSTR,
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return LIVE_DBSTR  # let the build skip dbstr loading if absent

DBSTR_PATH_DEFAULT = _resolve_dbstr()

CLASS_NAMES = [
    "Warrior", "Cleric", "Paladin", "Ranger", "Shadow Knight",
    "Druid", "Monk", "Bard", "Rogue", "Shaman",
    "Necromancer", "Wizard", "Magician", "Enchanter", "Beastlord", "Berserker",
]

VERIFIED_DIR = os.path.join(os.path.dirname(__file__), "verified")


def _slug(name): return name.lower().replace(" ", "")


def _norm(s):
    """Normalize a spell name for case-insensitive comparison: lowercase,
    collapse whitespace, and treat backtick / curly-quote as straight
    apostrophe (handles oddities like 'Jaxan's Jig o` Vigor')."""
    return " ".join(s.lower().replace("`", "'")
                              .replace("’", "'").split())


def load_verified(conn):
    """Apply verified/<class>.txt lists to spell_classes.verified.

    Each line in a class file is "L## Spell Name". Whitespace-only and
    "#"-prefixed lines are ignored. Sets verified=1 on matching (class,
    name, level) rows; reports any line that doesn't match.
    """
    if not os.path.isdir(VERIFIED_DIR):
        print(f"  (no {VERIFIED_DIR}/ — skipping verified-flag pass)")
        return
    n_marked = 0
    unmatched = []
    for ci, cname in enumerate(CLASS_NAMES):
        path = os.path.join(VERIFIED_DIR, f"{_slug(cname)}.txt")
        if not os.path.exists(path):
            continue
        with open(path, encoding="utf-8") as f:
            head = f.read(500)
        if "UNREVIEWED" in head:
            print(f"  verified: {cname} skipped — file still has UNREVIEWED marker")
            continue
        # Existing castable rows for this class, keyed by normalized name.
        # We need the spell_id too because the same display name can
        # appear on multiple spells (different ranks) and only one is
        # actually castable by this class at the declared level.
        existing = {}
        for r in conn.execute(
            "SELECT s.id, s.name, sc.min_level FROM spells s "
            "JOIN spell_classes sc ON sc.spell_id = s.id "
            "WHERE sc.class_index = ?", (ci,)):
            existing.setdefault(_norm(r[1]), []).append((r[0], r[1], r[2]))
        for lineno, raw in enumerate(open(path, encoding="utf-8"), 1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            # Format: "L## Spell Name" — split into level and name.
            m = re.match(r"^L\s*(\d+)\s+(.+?)\s*$", line)
            if not m:
                unmatched.append((cname, lineno, line, "bad format"))
                continue
            lvl = int(m.group(1))
            name = m.group(2)
            key = _norm(name)
            candidates = existing.get(key, [])
            hit = next(((sid, n, l) for (sid, n, l) in candidates if l == lvl), None)
            if not hit:
                if candidates:
                    levels = ", ".join(f"L{l}" for _, _, l in candidates)
                    unmatched.append((cname, lineno, line,
                                      f"name found but at {levels}, not L{lvl}"))
                else:
                    unmatched.append((cname, lineno, line, "no matching spell"))
                continue
            conn.execute(
                "UPDATE spell_classes SET verified = 1 "
                "WHERE class_index = ? AND min_level = ? AND spell_id = ?",
                (ci, lvl, hit[0]))
            n_marked += 1
    conn.commit()
    print(f"  verified: marked {n_marked} class-rows")
    if unmatched:
        print(f"  verified: {len(unmatched)} unmatched lines:")
        for cname, lineno, line, why in unmatched:
            print(f"    {cname}:{lineno} — {line}  [{why}]")


SCHEMA = """
DROP TABLE IF EXISTS spells;
DROP TABLE IF EXISTS spell_classes;
DROP TABLE IF EXISTS spell_effects;
DROP TABLE IF EXISTS spell_messages;
DROP TABLE IF EXISTS dbstr;

CREATE TABLE spells (
  id                INTEGER PRIMARY KEY,
  name              TEXT NOT NULL,
  range             REAL,
  aoe_range         REAL,
  cast_time         INTEGER,
  recovery_time     INTEGER,
  recast_time       INTEGER,
  mana              INTEGER,
  buff_duration_formula INTEGER,
  buff_duration     INTEGER,
  target_type       INTEGER,
  good_effect       INTEGER,
  resist_type       INTEGER,
  base_difficulty   INTEGER,
  skill             INTEGER,
  new_icon          INTEGER,
  description_id    INTEGER,
  type_description_id INTEGER,
  effect_description_id INTEGER,
  secondary_category_2 INTEGER,
  spell_class       INTEGER,
  spell_subclass    INTEGER,
  spell_group       INTEGER,
  rank              INTEGER,
  spell_category    INTEGER,
  is_discipline     INTEGER,
  endurance_cost    INTEGER,
  recourse_link     INTEGER,
  pet_template      INTEGER,
  resist_difficulty INTEGER,
  timer_id          INTEGER,
  reflectable       INTEGER,
  min_level         INTEGER,
  teleport_zone     TEXT,
  ritual_eligible   INTEGER
);

CREATE TABLE spell_classes (
  spell_id    INTEGER NOT NULL,
  class_index INTEGER NOT NULL,
  class_name  TEXT NOT NULL,
  min_level   INTEGER NOT NULL,
  verified    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (spell_id, class_index)
);
CREATE INDEX idx_class_level ON spell_classes (class_index, min_level);
CREATE INDEX idx_class_verified ON spell_classes (class_index, verified);

CREATE TABLE spell_effects (
  spell_id    INTEGER NOT NULL,
  slot        INTEGER NOT NULL,
  effect_id   INTEGER NOT NULL,
  base_value  INTEGER,
  limit_value INTEGER,
  formula     INTEGER,
  max_value   INTEGER,
  PRIMARY KEY (spell_id, slot)
);
CREATE INDEX idx_effect ON spell_effects (effect_id);

CREATE TABLE spell_messages (
  spell_id     INTEGER PRIMARY KEY,
  you_cast     TEXT,
  other_casts  TEXT,
  cast_on_you  TEXT,
  cast_on_other TEXT,
  spell_fades  TEXT
);

CREATE TABLE dbstr (
  id    INTEGER NOT NULL,
  type  INTEGER NOT NULL,
  text  TEXT,
  PRIMARY KEY (id, type)
);
CREATE INDEX idx_dbstr_id ON dbstr (id);

CREATE INDEX idx_spell_group ON spells (spell_group);
CREATE INDEX idx_spell_name  ON spells (name COLLATE NOCASE);

-- AAs derived from dbstr: type 1 = name, type 4 = description.
-- Multiple dbstr ids with the same type-1 name represent ranks of one AA.
DROP TABLE IF EXISTS aas;
CREATE TABLE aas (
  dbstr_id    INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT
);
CREATE INDEX idx_aa_name ON aas (name COLLATE NOCASE);
"""


def main():
    dbstr_path = sys.argv[1] if len(sys.argv) > 1 else DBSTR_PATH_DEFAULT

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(SCHEMA)

    # --- Load dbstr_us.txt -------------------------------------------------
    n_dbstr = 0
    if os.path.exists(dbstr_path):
        rows = []
        with open(dbstr_path, "r", encoding="latin-1") as f:
            for line in f:
                cols = line.rstrip("\r\n").split("^")
                if len(cols) < 4 or not cols[0].isdigit():
                    continue
                try:
                    rows.append((int(cols[0]), int(cols[1]), cols[2]))
                except ValueError:
                    continue
        conn.executemany(
            "INSERT OR REPLACE INTO dbstr (id, type, text) VALUES (?,?,?)",
            rows)
        n_dbstr = len(rows)
        print(f"  dbstr_us.txt: {n_dbstr} rows")
    else:
        print(f"  WARN: dbstr_us.txt not found at {dbstr_path}; skipping")

    # --- Load spell messages from spells_us_str.txt ------------------------
    msg_path = os.path.join(DATA_DIR, "spells_us_str.txt")
    msgs = load_str_file(msg_path) if os.path.exists(msg_path) else {}
    if msgs:
        conn.executemany(
            "INSERT OR REPLACE INTO spell_messages "
            "(spell_id, you_cast, other_casts, cast_on_you, cast_on_other, spell_fades) "
            "VALUES (?,?,?,?,?,?)",
            [(k, *v) for k, v in msgs.items()])
    print(f"  spells_us_str.txt: {len(msgs)} rows")

    # --- Load spells -------------------------------------------------------
    n_spells = 0
    n_eff = 0
    n_class_rows = 0
    spell_rows = []
    class_rows = []
    effect_rows = []
    for sp in load_spells():
        d = spell_to_dict(sp)
        # min_level across classes (excluding 255 = unavailable, 254 = "no
        # level restriction"). 254 still counts as available, level 1.
        levels = [l for l in d["classes"] if l < 254]
        min_level = min(levels) if levels else None

        spell_rows.append((
            d["id"], d["name"], d.get("range"), d.get("aoe_range"),
            d.get("cast_time"), d.get("recovery_time"), d.get("recast_time"),
            d.get("mana"), d.get("buff_duration_formula"), d.get("buff_duration"),
            d.get("target_type"), d.get("good_effect"), d.get("resist_type"),
            d.get("base_difficulty"), d.get("skill"), d.get("new_icon"),
            d.get("description_id"), d.get("type_description_id"),
            d.get("effect_description_id"), d.get("secondary_category_2"),
            d.get("spell_class"), d.get("spell_subclass"),
            d.get("spell_group"), d.get("rank"), d.get("spell_category"),
            d.get("is_discipline"), d.get("endurance_cost"),
            d.get("recourse_link"), d.get("eql_pet_template"),
            d.get("resist_difficulty"),
            d.get("timer_id"), d.get("reflectable"),
            min_level, d.get("teleport_zone"), d.get("ritual_eligible"),
        ))

        for ci, lvl in enumerate(d["classes"]):
            if lvl == 255:  # not available to this class
                continue
            class_rows.append((d["id"], ci, CLASS_NAMES[ci], lvl))

        for slot, e in enumerate(sp.effects):
            if e.effect_id == 254:  # placeholder/no-op effect
                continue
            effect_rows.append((d["id"], slot, e.effect_id, e.base_value,
                                e.limit_value, e.formula, e.max_value))
        n_spells += 1
        if n_spells % 20000 == 0:
            print(f"  ... loaded {n_spells} spells")

    conn.executemany(
        "INSERT INTO spells VALUES "
        "(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        spell_rows)
    conn.executemany(
        "INSERT INTO spell_classes (spell_id, class_index, class_name, min_level) "
        "VALUES (?,?,?,?)", class_rows)
    conn.executemany(
        "INSERT INTO spell_effects VALUES (?,?,?,?,?,?,?)", effect_rows)
    conn.commit()

    n_class_rows = len(class_rows)
    n_eff = len(effect_rows)
    print(f"  spells_us.txt: {n_spells} spells, "
          f"{n_class_rows} class-rows, {n_eff} effects")

    load_verified(conn)

    # --- Populate AA table from dbstr -------------------------------------
    aa_rows = conn.execute(
        "SELECT n.id, n.text AS name, d.text AS description "
        "  FROM dbstr n LEFT JOIN dbstr d ON d.id = n.id AND d.type = 4 "
        " WHERE n.type = 1"
    ).fetchall()
    conn.executemany(
        "INSERT INTO aas (dbstr_id, name, description) VALUES (?,?,?)",
        [(r[0], r[1], r[2]) for r in aa_rows])
    conn.commit()
    print(f"  aas: {len(aa_rows)} dbstr type-1 entries indexed")

    print(f"Done. DB: {DB_PATH}")
    conn.close()


if __name__ == "__main__":
    main()
