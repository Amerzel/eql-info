# EverQuest Legends (EQL) Spell File Format

Reverse-engineered from `spells_us.txt` (73,915 spells) + `spells_us_str.txt`,
cross-referenced against the Live EverQuest client
(`C:\Users\Public\Daybreak Game Company\Installed Games\EverQuest\spells_us.txt`,
166 fields, 70,954 spells) and the older 237-field EQEmu/RoF reference
(`SPDat_Spell_Struct` in `Server/common/spdat.h`).

## Headline: EQL ≈ Live EQ + 5 trailing fields

**EQL's spell format IS the modern Live EverQuest format**, with exactly 5
extra fields appended at the end (just before the pipe-tail) and ~3,000 extra
spells (custom content). Specifically:

- EQL columns `[0..164]` are **bitwise identical** to Live columns `[0..164]`
  for 99%+ of shared spells (the 1% deltas are content edits, not structural).
- EQL column **170** is the same pipe-delimited effects blob as Live column
  **165**, identical for 69,147 of 70,848 shared spells (97.6%); the remaining
  deltas are spells EQL reworked.
- EQL columns **165–169** are the only EQL-specific additions, and **four of
  the five are reserved sentinels** with a single observed value.

The earlier characterization of "5 message-text columns moved out, per-effect
arrays packed into pipe tail, etc." is true — but those changes were already
made by Daybreak in the modern Live client. EQL did not invent the layout; it
just consumed Live's format and added 5 fields.

### Structural deltas Live made vs the older EQEmu/RoF 237-field format

1. 5 message-text columns extracted to `spells_us_str.txt`.
2. Per-effect arrays (effect_id, base_value, limit_value, max_value, formula;
   12 slots each = 60 columns) packed into a variable-length pipe-tail.
3. Two icon columns + `activated` + 4 always-zero "opening" fields removed.
4. `spell_category` relocated from middle to near the end.
5. Field count reduced 237 → 166.

### EQL's additions vs Live

- 5 trailing columns at positions 165–169 (only one functionally used).
- ~2,961 extra spells (EQL: 73,915 vs Live: 70,954).
- Some pipe-tail effect data edited to rework individual spells.

---

## File 1: `spells_us.txt`

171 caret-delimited columns. No header row. Columns 0–169 are scalar fields;
column 170 holds the variable-length pipe-tail "effects" string.

### Column map

`REF#` = corresponding column index in standard EQEmu/RoF 237-field
`spells_us.txt` (see `SPDat_Spell_Struct` in `spdat.h` for semantics).
`?` means the column did not statistically align to any REF column — typically
either a field with values too sparse to disambiguate, or a new EQL-specific
field.

| EQL# | REF# | Standard name              | Type        | Notes |
|-----:|-----:|----------------------------|-------------|-------|
|   0  |   0  | id                         | int         | SPELLINDEX |
|   1  |   1  | name                       | str(64)     | SPELLNAME |
|   2  |   2  | linked_item_id             | int         | **Live field, not EQL-new.** Mostly 0; ~155 spells reference an item id (11503/11504/11506/11514 etc.). All affected spells are firework/launchable-item spells ("Blazing Comet", "Happy Panda", "Ground Bloom Flower", …) → this is the item that fires the spell. |
|   3  |   3  | teleport_zone              | str(64)     | NPC_FILENAME (pet name / item / zone) |
|   4  |   9  | range                      | float       | RANGE |
|   5  |  10  | aoe_range                  | float       | IMPACTRANGE |
|   6  |  11  | push_back                  | float       | OUTFORCE |
|   7  |  12  | push_up                    | float       | UPFORCE |
|   8  |  13  | cast_time                  | uint32 ms   | CASTINGTIME |
|   9  |  14  | recovery_time              | uint32 ms   | RECOVERYDELAY |
|  10  |  15  | recast_time                | uint32 ms   | SPELLDELAY |
|  11  |  16  | buff_duration_formula      | uint32      | DURATIONBASE |
|  12  |  17  | buff_duration              | uint32      | DURATIONCAP |
|  13  |  18  | aoe_duration               | uint32      | IMPACTDURATION |
|  14  |  19  | mana                       | int32       | MANACOST |
|  15  |  58  | component[0]               | int32       | EXPENDREAGENT1 (item id, -1 if none) |
|  16  |  59  | component[1]               | int32       | EXPENDREAGENT2 |
|  17  |  60  | component[2]               | int32       | EXPENDREAGENT3 |
|  18  |  61  | component[3]               | int32       | EXPENDREAGENT4 |
|  19  |  62  | component_count[0]         | int         | EXPENDQTY1 |
|  20  |  63  | component_count[1]         | int         | EXPENDQTY2 |
|  21  |  64  | component_count[2]         | int         | EXPENDQTY3 |
|  22  |  65  | component_count[3]         | int         | EXPENDQTY4 |
|  23  |  66  | no_expend_reagent[0]       | int         | NOEXPENDREAGENT1 (focus item) |
|  24  |  67  | no_expend_reagent[1]       | int         | NOEXPENDREAGENT2 |
|  25  |  68  | no_expend_reagent[2]       | int         | NOEXPENDREAGENT3 |
|  26  |  69  | no_expend_reagent[3]       | int         | NOEXPENDREAGENT4 |
|  27  |  82  | light_type                 | int         | LIGHTTYPE |
|  28  |  83  | good_effect                | int8        | BENEFICIAL (0=detr, 1=benef, 2=benef group only) |
|  29  |  85  | resist_type                | int         | RESISTTYPE |
|  30  |  98  | target_type                | uint8       | TYPENUMBER (SpellTargetType) |
|  31  |  99  | base_difficulty            | int         | BASEDIFFICULTY |
|  32  | 100  | skill                      | int         | CASTINGSKILL |
|  33  | 101  | zone_type                  | int8        | ZONETYPE (0/1/2: outdoor/dungeon/any-ish) |
|  34  | 102  | environment_type           | int8        | ENVIRONMENTTYPE |
|  35  | 103  | time_of_day                | int8        | TIMEOFDAY |
|  36–51| 104–119 | classes[16]            | uint8[16]   | Per-class min level. 255 = unavailable, 254 = available. WARRIORMIN…BERSERKERMIN |
|  52  | 120  | casting_animation          | uint8       | CASTINGANIM |
|  53  | 121  | target_animation           | uint8       | TARGETANIM |
|  54  | 122  | travel_type                | uint32      | TRAVELTYPE |
|  55  | 123  | spell_affect_index         | uint16      | SPELLAFFECTINDEX |
|  56  | 124  | disallow_sit               | int8        | CANCELONSIT |
|  57  | 125  | deity_agnostic             | int8        | DEITY_AGNOSTIC |
|  58–73| 126–141 | deities[16]            | int8[16]    | Per-deity flag (-1 restrict, 0 don't, 1 restrict legacy). DEITY_BERTOXXULOUS…DEITY_VEESHAN |
|  74  | 142  | npc_no_cast                | int         | NPC_NO_CAST (0–100) |
|  75  | 144  | new_icon                   | int16       | NEW_ICON (spell-gem/buff icon). REF col 143 (ai_pt_bonus) dropped. |
|  76  | 145  | spell_anim                 | int16       | SPELL_EFFECT_INDEX (particles) |
|  77  | 146  | uninterruptable            | bool        | NO_INTERRUPT |
|  78  | 147  | resist_difficulty          | int16       | RESIST_MOD |
|  79  | 148  | unstackable_dot            | bool        | NOT_STACKABLE_DOT |
|  80  | 149  | deletable                  | int         | DELETE_OK |
|  81  | 150  | recourse_link              | uint16      | REFLECT_SPELLINDEX (recourse spell id) |
|  82  | 151  | no_partial_resist          | bool        | NO_PARTIAL_SAVE |
|  83  | 152  | small_targets_only         | bool        | SMALL_TARGETS_ONLY |
|  84  | 153/154 | uses_persistent_particles / short_buff_box | bool | one or both of these (statistically ambiguous, mostly 0) |
|  85  | 155  | description_id             | int         | DESCRIPTION_INDEX (eqstr table id) |
|  86  | 156  | type_description_id        | int         | PRIMARY_CATEGORY |
|  87  | 157  | effect_description_id      | int         | SECONDARY_CATEGORY_1 |
|  88  | 158  | secondary_category_2       | int         | SECONDARY_CATEGORY_2 |
|  89  | 159  | npc_no_los                 | bool        | NO_NPC_LOS |
|  90  | 160  | feedbackable               | bool        | FEEDBACKABLE |
|  91  | 161  | reflectable                | bool        | REFLECTABLE |
|  92  | 162  | bonus_hate                 | int         | HATE_MOD |
|  93  | 163  | resist_per_level           | int         | RESIST_PER_LEVEL |
|  94  | 164  | resist_cap                 | int         | RESIST_CAP |
|  95  | 165  | ldon_trap                  | bool        | AFFECT_INANIMATE |
|  96  | 166  | endurance_cost             | int         | STAMINA_COST |
|  97  | 167  | timer_id                   | int16       | TIMER_INDEX |
|  98  | 168  | is_discipline              | bool        | IS_SKILL (combat-window flag) |
|  99  | 173  | hate_added                 | int         | SPELL_HATE_GIVEN. REF cols 169–172 (the always-zero "opening" fields) dropped. |
| 100  | 174  | endurance_upkeep           | int         | ENDUR_UPKEEP |
| 101  | 175  | hit_number_type            | int         | LIMITED_USE_TYPE |
| 102  | 176  | hit_number                 | int         | LIMITED_USE_COUNT |
| 103  | 177  | pvp_resist_base            | int         | PVP_RESIST_MOD |
| 104  | 178  | pvp_resist_per_level       | int         | PVP_RESIST_PER_LEVEL |
| 105  | 179  | pvp_resist_cap             | int         | PVP_RESIST_CAP |
| 106  | 181  | pvp_duration               | int         | PVP_DURATION. **REF col 180 (spell_category) skipped here — moved to EQL col 164.** |
| 107  | 182  | pvp_duration_cap           | int         | PVP_DURATION_CAP |
| 108  | 183  | pcnpc_only_flag            | int         | PCNPC_ONLY_FLAG |
| 109  | 184  | cast_not_standing          | bool        | CAST_NOT_STANDING |
| 110  | 185  | can_mgb                    | bool        | CAN_MGB |
| 111  | 186  | dispel_flag                | int         | NO_DISPELL |
| 112  | 187  | npc_category               | int         | NPC_MEM_CATEGORY |
| 113  | 188  | npc_usefulness             | int         | NPC_USEFULNESS |
| 114  | 189  | min_resist                 | int         | MIN_RESIST |
| 115  | 190  | max_resist                 | int         | MAX_RESIST |
| 116  | 191  | viral_targets              | uint8       | MIN_SPREAD_TIME |
| 117  | 192  | viral_timer                | uint8       | MAX_SPREAD_TIME |
| 118  | 193  | nimbus_effect              | int         | DURATION_PARTICLE_EFFECT |
| 119  | 194  | directional_start          | float       | CONE_START_ANGLE |
| 120  | 195  | directional_end            | float       | CONE_END_ANGLE |
| 121  | 196  | sneak                      | bool        | SNEAK_ATTACK |
| 122  | 197  | not_focusable              | bool        | NOT_FOCUSABLE |
| 123  | 198  | no_detrimental_spell_aggro | bool        | NO_DETRIMENTAL_SPELL_AGGRO |
| 124  | 199  | show_wear_off_message      | bool        | SHOW_WEAR_OFF_MESSAGE |
| 125  | 200  | suspendable                | bool        | IS_COUNTDOWN_HELD |
| 126  | 201  | viral_range                | int         | SPREAD_RADIUS |
| 127  | 202  | song_cap                   | int         | BASE_EFFECTS_FOCUS_CAP |
| 128  | 203  | stacks_with_self           | bool        | STACKS_WITH_SELF |
| 129  | 204  | not_shown_to_player        | bool        | NOT_SHOWN_TO_PLAYER |
| 130  | 205  | no_block                   | bool        | NO_BUFF_BLOCK |
| 131  | 206  | anim_variation             | int8        | ANIM_VARIATION |
| 132  | 207  | spell_group                | int         | SPELL_GROUP |
| 133  | 208  | rank                       | int         | SPELL_GROUP_RANK |
| 134  | 209  | no_resist                  | int         | NO_RESIST |
| 135  | 210  | allow_spellscribe          | int         | ALLOW_SPELLSCRIBE (EQL has non-boolean values here too) |
| 136  | 211  | cast_restriction           | int         | SPELL_REQ_ASSOCIATION_ID |
| 137  | 212  | allow_rest                 | bool        | BYPASS_REGEN_CHECK |
| 138  | 213  | can_cast_in_combat         | bool        | CAN_CAST_IN_COMBAT |
| 139  | 214  | can_cast_out_of_combat     | bool        | CAN_CAST_OUT_OF_COMBAT |
| 140  | 215  | show_dot_message           | bool        | SHOW_DOT_MESSAGE |
| 141  | 216  | invalid                    | int         | INVALID (mostly -1 in EQL) |
| 142  | 218  | aoe_max_targets            | int         | MAX_TARGETS. REF col 217 (override_crit_chance) appears to be dropped. |
| 143  | 219  | no_heal_damage_item_mod    | int         | NO_HEAL_DAMAGE_ITEM_MOD |
| 144  | 220  | caster_requirement_id      | int         | CASTER_REQUIREMENT_ID |
| 145  | 221  | spell_class                | int         | SPELL_CLASS |
| 146  | 222  | spell_subclass             | int         | SPELL_SUBCLASS |
| 147  | 223  | ai_valid_targets           | int         | AI_VALID_TARGETS |
| 148  | 224  | persist_death              | bool        | NO_STRIP_ON_DEATH |
| 149  | 225  | base_effects_focus_slope   | float       | BASE_EFFECTS_FOCUS_SLOPE |
| 150  | 226  | base_effects_focus_offset  | float       | BASE_EFFECTS_FOCUS_OFFSET |
| 151  | 227  | min_distance               | float       | DISTANCE_MOD_CLOSE_DIST |
| 152  | 228  | min_distance_mod           | float       | DISTANCE_MOD_CLOSE_MULT |
| 153  | 229  | max_distance               | float       | DISTANCE_MOD_FAR_DIST |
| 154  | 230  | max_distance_mod           | float       | DISTANCE_MOD_FAR_MULT |
| 155  | 231  | min_range                  | float       | MIN_RANGE |
| 156  | 232  | no_remove                  | bool        | NO_REMOVE |
| 157  | 233  | spell_recourse_type        | int         | SPELL_RECOURSE_TYPE |
| 158  | 234  | only_during_fast_regen     | bool        | ONLY_DURING_FAST_REGEN |
| 159  | 235  | is_beta_only               | bool        | IS_BETA_ONLY |
| 160  | 236  | spell_subgroup             | int         | SPELL_SUBGROUP |
| 161  | 161  | live_field_161             | bool?       | **Live field.** Mostly 0, sometimes 1. |
| 162  | 162  | live_field_162             | float       | **Live field.** Mostly 0, rare values 1, 2, 8, 0.0. |
| 163  | 163  | live_field_163             | float       | **Live field.** Mostly 0, rare values 2, 8, 0.0. |
| 164  | 164  | spell_category             | int         | GLOBAL_GROUP — relocated by Live from middle to here. Default sentinel: `-99`. |
| 165  |   —  | **eql_reserved_1**         | int         | **EQL-only.** Always `0` across all observed spells. |
| 166  |   —  | **eql_pet_template**       | int         | **EQL-only.** 254 spells set this. Values 177700 = Magician/elemental pet, 177701 = Necromancer/undead pet, 177702 = Enchanter animation pet. |
| 167  |   —  | **eql_reserved_2**         | int         | **EQL-only.** Always `-1` across all observed spells. |
| 168  |   —  | **eql_reserved_3**         | int         | **EQL-only.** Always `-1` across all observed spells. |
| 169  |   —  | **eql_reserved_4**         | int         | **EQL-only.** Always `-1` across all observed spells. |
| 170  |   —  | **eql_patch_flag** (parser: `eql_new_10`) | bool | **EQL-only, added by the 2026-05 patch.** Binary flag: `1` on 55 spells (teleport/utility — Gate, Ring/Circle/Portal ports, Evacuate, Succor, Bind Affinity, Shrink), `0` on all others. Meaning undetermined. Its insertion shifted the effects blob from col 170 → 171. |
| 171  | 165  | **effects_blob**           | string      | Pipe-delimited per-spell effects list. See next section. (Same format as Live col 165.) |

### Dropped REF columns (not present in EQL `spells_us.txt`)

| REF#    | Standard name        | Where it went |
|---------|----------------------|---------------|
| 2       | player_1 ("PLAYER_1")| dropped (always the same string) |
| 4–8     | 5 message-text fields| moved to `spells_us_str.txt` |
| 20–31   | base_value[12]       | pipe tail (per-effect) |
| 32–43   | limit_value[12]      | pipe tail |
| 44–55   | max_value[12]        | pipe tail |
| 56–57   | icon, memicon        | dropped (replaced by new_icon at REF 144) |
| 70–81   | formula[12]          | pipe tail |
| 84      | activated            | dropped |
| 86–97   | effect_id[12]        | pipe tail |
| 143     | ai_pt_bonus          | dropped |
| 169–172 | 4 always-zero fields | dropped |
| 217     | override_crit_chance | dropped (or merged into one of the new tail fields) |

### Column 171 — effects blob (pipe-delimited)

Format:
```
1|<eff1>$2|<eff2>$3|<eff3>$4|...$N|<effN>
```
or for a single effect:
```
1|<eff1>
```
or empty (some NPC/utility spells, ~427 of 73,915).

Each `<effK>` is 5 `|`-separated subfields in this order:

| Pos | Subfield     | Standard equivalent          |
|----:|--------------|------------------------------|
|  0  | effect_id    | REF effect_id[k-1]           |
|  1  | base_value   | REF base_value[k-1]          |
|  2  | limit_value  | REF limit_value[k-1]         |
|  3  | formula      | REF formula[k-1]             |
|  4  | max_value    | REF max_value[k-1]           |

The **last subfield of every non-final effect** is appended with `$N` where
`N` is the 1-based index of the **next** effect. So you parse by splitting on
`|`, then for every 6th token (positions 5, 10, 15, …) strip everything from
`$` onward to get the real `max_value`. (Token 0 is the literal `1`.)

Notes:
- The leading `1` is a fixed marker, **not** an effect count.
- Up to 41 effects observed; standard EQEmu caps at 12.
- Effect IDs can exceed 254 (EQL extends the SE_ enumeration; e.g. 289 seen).

---

## File 2: `spells_us_str.txt`

Same caret-delimited format, **with a header line**. 6 columns + a trailing
empty column (trailing `^`).

| Col | Name             | Standard equiv         |
|----:|------------------|------------------------|
|  0  | SPELLINDEX       | id (matches `spells_us.txt` col 0) |
|  1  | CASTERMETXT      | you_cast (REF 4)       |
|  2  | CASTEROTHERTXT   | other_casts (REF 5)    |
|  3  | CASTEDMETXT      | cast_on_you (REF 6)    |
|  4  | CASTEDOTHERTXT   | cast_on_other (REF 7)  |
|  5  | SPELLGONE        | spell_fades (REF 8)    |

Row count: 1 header + 73,915 data rows. ~59k rows have at least one non-empty
message; the remainder are stub rows with empty messages.

---

## Companion files

The Live EQ client provides several other tables EQL is likely to share:

- **`dbstr_us.txt`** (~72k rows) — string table. Format: `id^type^text^?^`.
  Targets of `description_id` (col 85), `type_description_id` (col 86),
  `effect_description_id` (col 87), and `secondary_category_2` (col 88) all
  resolve into this file. Live's copy is included in the install.
- **`eqstr_us.txt`** — general client string table.
- **`racedata.txt`** — per-race data, useful when classes/deities maps need
  human-readable names.
- **`spells.eff`, `spellsnew.eff`, `spellsnew.edd`** — binary effect / particle
  data files; almost certainly the data behind `nimbus_effect` (col 118),
  `spell_anim` (col 76), and `casting_animation` (col 52). Format: not yet
  reversed here, but should be inspected if visuals are needed.

## Open questions (residual)

1. **EQL col 80** (Live col 80) and **EQL col 135** (Live col 135) carry
   non-boolean values in some rows (e.g. `18`–`20`, `138`). This is **Live
   behavior**, not EQL — so the older EQEmu names "deletable" /
   "allow_spellscribe" are no longer accurate. Resolving the modern semantics
   requires a current Live client spdat reference; the older RoF struct names
   are documented above only as historical pointers.
2. **EQL col 84** (Live col 84) — RoF's struct can't disambiguate
   `uses_persistent_particles` (RoF 153) vs `short_buff_box` (RoF 154); both
   are mostly 0. Again a Live-era spdat reference would settle it.
3. **EQL cols 161–163** (Live cols 161–163) — modern Live fields, purpose not
   yet identified. Likely added when Live introduced focus-effect base-effects
   slope/offset (cols 149/150) or a related expansion mechanic.
4. **`eql_pet_template` (col 166)** — values `177700/01/02` are EQL-specific
   pet template identifiers. There is almost certainly a separate EQL pet /
   template data file that defines these IDs. Searching for it is the next
   investigation step.
5. **EQL col 141** sentinel default flipped from `0` to `-1` — likely a Live
   change; check whether Live's distribution shows the same default.
