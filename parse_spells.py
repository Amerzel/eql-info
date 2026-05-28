#!/usr/bin/env python3
"""Parser for the EverQuest Legends spell file format.

Reads `spells_us.txt` (171 caret-delimited fields, last is a pipe-delimited
effects blob) and `spells_us_str.txt` (6 caret-delimited fields, with header)
and emits structured records.

Field schema is documented in SPELL_FORMAT.md alongside this file.

Usage:
    python3 parse_spells.py [--json out.json] [--limit N] [--id SPELLID]

Defaults: prints a human-readable summary of the first 3 spells.
"""
import argparse
import json
import os
import sys
from dataclasses import asdict, dataclass, field
from typing import List, Optional

HERE = os.path.dirname(os.path.abspath(__file__))
# EQL_DATA_DIR can point at the directory containing spells_us.txt /
# spells_us_str.txt. Defaults to the parent of this script (typical local
# layout where webapp/ sits beside the data files).
DATA_DIR = os.environ.get("EQL_DATA_DIR", os.path.dirname(HERE))
SPELLS_US = os.path.join(DATA_DIR, "spells_us.txt")
SPELLS_STR = os.path.join(DATA_DIR, "spells_us_str.txt")

# Ordered (eql_col, name, type) tuples for columns 0..170. The trailing
# pipe-delimited effects blob is parsed separately (it's the last field; the
# 2026-05 patch shifted it from index 170 to 171). Class & deity arrays are
# handled inline.
SCALAR_SCHEMA = [
    # (start_col, name, parse_fn, count) — count>1 means an array starting here
    (0, "id", int, 1),
    (1, "name", str, 1),
    (2, "eql_new_1", int, 1),
    (3, "teleport_zone", str, 1),
    (4, "range", float, 1),
    (5, "aoe_range", float, 1),
    (6, "push_back", float, 1),
    (7, "push_up", float, 1),
    (8, "cast_time", int, 1),
    (9, "recovery_time", int, 1),
    (10, "recast_time", int, 1),
    (11, "buff_duration_formula", int, 1),
    (12, "buff_duration", int, 1),
    (13, "aoe_duration", int, 1),
    (14, "mana", int, 1),
    (15, "component", int, 4),
    (19, "component_count", int, 4),
    (23, "no_expend_reagent", int, 4),
    (27, "light_type", int, 1),
    (28, "good_effect", int, 1),
    (29, "resist_type", int, 1),
    (30, "target_type", int, 1),
    (31, "base_difficulty", int, 1),
    (32, "skill", int, 1),
    (33, "zone_type", int, 1),
    (34, "environment_type", int, 1),
    (35, "time_of_day", int, 1),
    (36, "classes", int, 16),
    (52, "casting_animation", int, 1),
    (53, "target_animation", int, 1),
    (54, "travel_type", int, 1),
    (55, "spell_affect_index", int, 1),
    (56, "disallow_sit", int, 1),
    (57, "deity_agnostic", int, 1),
    (58, "deities", int, 16),
    (74, "npc_no_cast", int, 1),
    (75, "new_icon", int, 1),
    (76, "spell_anim", int, 1),
    (77, "uninterruptable", int, 1),
    (78, "resist_difficulty", int, 1),
    (79, "unstackable_dot", int, 1),
    (80, "deletable", int, 1),
    (81, "recourse_link", int, 1),
    (82, "no_partial_resist", int, 1),
    (83, "small_targets_only", int, 1),
    (84, "uses_persistent_particles_or_short_buff", int, 1),
    (85, "description_id", int, 1),
    (86, "type_description_id", int, 1),
    (87, "effect_description_id", int, 1),
    (88, "secondary_category_2", int, 1),
    (89, "npc_no_los", int, 1),
    (90, "feedbackable", int, 1),
    (91, "reflectable", int, 1),
    (92, "bonus_hate", int, 1),
    (93, "resist_per_level", int, 1),
    (94, "resist_cap", int, 1),
    (95, "ldon_trap", int, 1),
    (96, "endurance_cost", int, 1),
    (97, "timer_id", int, 1),
    (98, "is_discipline", int, 1),
    (99, "hate_added", int, 1),
    (100, "endurance_upkeep", int, 1),
    (101, "hit_number_type", int, 1),
    (102, "hit_number", int, 1),
    (103, "pvp_resist_base", int, 1),
    (104, "pvp_resist_per_level", int, 1),
    (105, "pvp_resist_cap", int, 1),
    (106, "pvp_duration", int, 1),
    (107, "pvp_duration_cap", int, 1),
    (108, "pcnpc_only_flag", int, 1),
    (109, "cast_not_standing", int, 1),
    (110, "can_mgb", int, 1),
    (111, "dispel_flag", int, 1),
    (112, "npc_category", int, 1),
    (113, "npc_usefulness", int, 1),
    (114, "min_resist", int, 1),
    (115, "max_resist", int, 1),
    (116, "viral_targets", int, 1),
    (117, "viral_timer", int, 1),
    (118, "nimbus_effect", int, 1),
    (119, "directional_start", float, 1),
    (120, "directional_end", float, 1),
    (121, "sneak", int, 1),
    (122, "not_focusable", int, 1),
    (123, "no_detrimental_spell_aggro", int, 1),
    (124, "show_wear_off_message", int, 1),
    (125, "suspendable", int, 1),
    (126, "viral_range", int, 1),
    (127, "song_cap", int, 1),
    (128, "stacks_with_self", int, 1),
    (129, "not_shown_to_player", int, 1),
    (130, "no_block", int, 1),
    (131, "anim_variation", int, 1),
    (132, "spell_group", int, 1),
    (133, "rank", int, 1),
    (134, "no_resist", int, 1),
    (135, "allow_spellscribe", int, 1),
    (136, "cast_restriction", int, 1),
    (137, "allow_rest", int, 1),
    (138, "can_cast_in_combat", int, 1),
    (139, "can_cast_out_of_combat", int, 1),
    (140, "show_dot_message", int, 1),
    (141, "invalid", int, 1),
    (142, "aoe_max_targets", int, 1),
    (143, "no_heal_damage_item_mod", int, 1),
    (144, "caster_requirement_id", int, 1),
    (145, "spell_class", int, 1),
    (146, "spell_subclass", int, 1),
    (147, "ai_valid_targets", int, 1),
    (148, "persist_death", int, 1),
    (149, "base_effects_focus_slope", float, 1),
    (150, "base_effects_focus_offset", float, 1),
    (151, "min_distance", float, 1),
    (152, "min_distance_mod", float, 1),
    (153, "max_distance", float, 1),
    (154, "max_distance_mod", float, 1),
    (155, "min_range", float, 1),
    (156, "no_remove", int, 1),
    (157, "spell_recourse_type", int, 1),
    (158, "only_during_fast_regen", int, 1),
    (159, "is_beta_only", int, 1),
    (160, "spell_subgroup", int, 1),
    (161, "eql_new_2", int, 1),
    (162, "eql_new_3", float, 1),
    (163, "eql_new_4", float, 1),
    (164, "spell_category", int, 1),
    # Cols 165-169: EQL-only tail. Names + semantics per SPELL_FORMAT.md.
    # 166 is the pet template (177700=Mage, 177701=Necro, 177702=Ench pets),
    # consumed by the spell detail page; the others are reserved/constant.
    (165, "eql_reserved_1", int, 1),
    (166, "eql_pet_template", int, 1),
    (167, "eql_reserved_2", int, 1),
    (168, "eql_reserved_3", int, 1),
    (169, "eql_reserved_4", int, 1),
    # Added by the 2026-05 patch for the "Rituals" feature: 1 = this portal-type
    # spell can be cast as a Ritual (from the Actions window, bypassing class/
    # level if any unlocked class meets the requirement). Set on 55 portal/
    # travel spells. Appended just before the effects blob, shifting it 170→171.
    (170, "ritual_eligible", int, 1),
]


def _parse(cell: str, fn):
    cell = cell.strip()
    if cell == "":
        # Empty cell: 0 for numeric, "" for string
        if fn is str:
            return ""
        try:
            return fn(0)
        except Exception:
            return None
    try:
        return fn(cell)
    except ValueError:
        # Some "int" cells contain floats like '0.0' — coerce
        if fn is int:
            try:
                return int(float(cell))
            except Exception:
                return None
        return None


@dataclass
class Effect:
    effect_id: int
    base_value: int
    limit_value: int
    formula: int
    max_value: int


@dataclass
class Spell:
    id: int = 0
    name: str = ""
    # Scalar/array fields populated dynamically from SCALAR_SCHEMA.
    classes: List[int] = field(default_factory=list)
    deities: List[int] = field(default_factory=list)
    component: List[int] = field(default_factory=list)
    component_count: List[int] = field(default_factory=list)
    no_expend_reagent: List[int] = field(default_factory=list)
    effects: List[Effect] = field(default_factory=list)
    # Strings from spells_us_str.txt
    you_cast: str = ""
    other_casts: str = ""
    cast_on_you: str = ""
    cast_on_other: str = ""
    spell_fades: str = ""
    # Everything else becomes attributes via __dict__
    _extras: dict = field(default_factory=dict)


def parse_effects_blob(blob: str) -> List[Effect]:
    """Parse pipe-tail: `1|<5fields>$2|<5fields>$3|...|<5fields>`.

    Returns a list of Effect.
    """
    if not blob:
        return []
    parts = blob.split("|")
    if not parts or parts[0] != "1":
        # Malformed — return empty rather than raise.
        return []
    rest = parts[1:]
    # Strip `$N` separators from each token.
    cleaned = []
    for tok in rest:
        if "$" in tok:
            tok = tok.split("$", 1)[0]
        cleaned.append(tok)
    if len(cleaned) % 5 != 0:
        return []
    effects = []
    for i in range(0, len(cleaned), 5):
        try:
            effects.append(Effect(
                effect_id=int(cleaned[i]),
                base_value=int(cleaned[i + 1]),
                limit_value=int(cleaned[i + 2]),
                formula=int(cleaned[i + 3]),
                max_value=int(cleaned[i + 4]),
            ))
        except ValueError:
            continue
    return effects


def parse_spell_line(cols: List[str]) -> Spell:
    if len(cols) < 172:
        # Pad to expected width so indexing doesn't fail.
        cols = cols + [""] * (172 - len(cols))
    sp = Spell()
    for start, name, fn, count in SCALAR_SCHEMA:
        if count == 1:
            val = _parse(cols[start], fn)
            if hasattr(sp, name):
                setattr(sp, name, val)
            else:
                sp._extras[name] = val
        else:
            arr = [_parse(cols[start + j], fn) for j in range(count)]
            if hasattr(sp, name):
                setattr(sp, name, arr)
            else:
                sp._extras[name] = arr
    # Effects blob is the trailing pipe-delimited field. Locate it by content
    # (it's the only field starting with "1|") rather than hard-coding an index,
    # so future column additions before it don't silently break effect parsing.
    blob = ""
    for cell in reversed(cols):
        if cell.startswith("1|"):
            blob = cell
            break
    sp.effects = parse_effects_blob(blob)
    return sp


def load_str_file(path: str) -> dict:
    """Returns {spell_id: (you_cast, other_casts, cast_on_you, cast_on_other, spell_fades)}."""
    out = {}
    with open(path, "r", encoding="latin-1") as f:
        for i, line in enumerate(f):
            line = line.rstrip("\r\n")
            if not line or line.startswith("#"):
                continue
            cols = line.split("^")
            try:
                sid = int(cols[0])
            except (ValueError, IndexError):
                continue
            # cols[1..5] are the 5 messages; cols[6] is trailing empty
            msgs = (cols[1] if len(cols) > 1 else "",
                    cols[2] if len(cols) > 2 else "",
                    cols[3] if len(cols) > 3 else "",
                    cols[4] if len(cols) > 4 else "",
                    cols[5] if len(cols) > 5 else "")
            out[sid] = msgs
    return out


def load_spells(spells_path: str = SPELLS_US, str_path: str = SPELLS_STR):
    strs = load_str_file(str_path) if str_path and os.path.exists(str_path) else {}
    with open(spells_path, "r", encoding="latin-1") as f:
        for line in f:
            line = line.rstrip("\r\n")
            if not line:
                continue
            cols = line.split("^")
            sp = parse_spell_line(cols)
            msgs = strs.get(sp.id)
            if msgs:
                sp.you_cast, sp.other_casts, sp.cast_on_you, sp.cast_on_other, sp.spell_fades = msgs
            yield sp


def spell_to_dict(sp: Spell) -> dict:
    d = asdict(sp)
    # Hoist _extras into the top dict for clean JSON.
    extras = d.pop("_extras", {})
    d.update(extras)
    return d


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", help="write all spells as JSON array to this path")
    ap.add_argument("--limit", type=int, default=3, help="limit when printing summary (default 3)")
    ap.add_argument("--id", type=int, help="print only the spell with this id")
    args = ap.parse_args()

    if args.json:
        with open(args.json, "w", encoding="utf-8") as out:
            out.write("[\n")
            first = True
            for sp in load_spells():
                if first:
                    first = False
                else:
                    out.write(",\n")
                json.dump(spell_to_dict(sp), out, ensure_ascii=False)
            out.write("\n]\n")
        print(f"wrote {args.json}")
        return

    count = 0
    for sp in load_spells():
        if args.id is not None:
            if sp.id != args.id:
                continue
        elif count >= args.limit:
            break
        count += 1
        print(f"\n=== Spell {sp.id}: {sp.name} ===")
        d = spell_to_dict(sp)
        for k in ("range", "mana", "cast_time", "buff_duration", "buff_duration_formula",
                  "target_type", "good_effect", "resist_type", "spell_category",
                  "new_icon", "classes", "you_cast", "cast_on_you", "spell_fades"):
            if k in d:
                print(f"  {k}: {d[k]}")
        print(f"  effects ({len(sp.effects)}):")
        for e in sp.effects:
            print(f"    eff={e.effect_id} base={e.base_value} limit={e.limit_value}"
                  f" formula={e.formula} max={e.max_value}")
        if args.id is not None:
            break


if __name__ == "__main__":
    main()
