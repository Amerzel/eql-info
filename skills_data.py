"""Skill enum extracted from Server/common/skills.h.

EQ "skills" are a separate system from spells. The skill *list* is hardcoded
in the EQ client; we recover it from the EQEmu server enum since the EQL
client uses the same numeric ids.

Per-class skill caps and skill-up rates are server-side and not represented
here. We only know which skills exist and which spells use them (joining on
the `spells.skill` column).
"""

# (id, code_name, display_name)
SKILLS = [
    (0,  "Skill1HBlunt",            "1H Blunt"),
    (1,  "Skill1HSlashing",         "1H Slashing"),
    (2,  "Skill2HBlunt",            "2H Blunt"),
    (3,  "Skill2HSlashing",         "2H Slashing"),
    (4,  "SkillAbjuration",         "Abjuration"),
    (5,  "SkillAlteration",         "Alteration"),
    (6,  "SkillApplyPoison",        "Apply Poison"),
    (7,  "SkillArchery",            "Archery"),
    (8,  "SkillBackstab",           "Backstab"),
    (9,  "SkillBindWound",          "Bind Wound"),
    (10, "SkillBash",               "Bash"),
    (11, "SkillBlock",              "Block"),
    (12, "SkillBrassInstruments",   "Brass Instruments"),
    (13, "SkillChanneling",         "Channeling"),
    (14, "SkillConjuration",        "Conjuration"),
    (15, "SkillDefense",            "Defense"),
    (16, "SkillDisarm",             "Disarm"),
    (17, "SkillDisarmTraps",        "Disarm Traps"),
    (18, "SkillDivination",         "Divination"),
    (19, "SkillDodge",              "Dodge"),
    (20, "SkillDoubleAttack",       "Double Attack"),
    (21, "SkillDragonPunch",        "Dragon Punch / Tail Rake"),
    (22, "SkillDualWield",          "Dual Wield"),
    (23, "SkillEagleStrike",        "Eagle Strike"),
    (24, "SkillEvocation",          "Evocation"),
    (25, "SkillFeignDeath",         "Feign Death"),
    (26, "SkillFlyingKick",         "Flying Kick"),
    (27, "SkillForage",             "Forage"),
    (28, "SkillHandtoHand",         "Hand to Hand"),
    (29, "SkillHide",               "Hide"),
    (30, "SkillKick",               "Kick"),
    (31, "SkillMeditate",           "Meditate"),
    (32, "SkillMend",               "Mend"),
    (33, "SkillOffense",            "Offense"),
    (34, "SkillParry",              "Parry"),
    (35, "SkillPickLock",           "Pick Lock"),
    (36, "Skill1HPiercing",         "1H Piercing"),
    (37, "SkillRiposte",            "Riposte"),
    (38, "SkillRoundKick",          "Round Kick"),
    (39, "SkillSafeFall",           "Safe Fall"),
    (40, "SkillSenseHeading",       "Sense Heading"),
    (41, "SkillSinging",            "Singing"),
    (42, "SkillSneak",              "Sneak"),
    (43, "SkillSpecializeAbjure",   "Specialize Abjuration"),
    (44, "SkillSpecializeAlteration", "Specialize Alteration"),
    (45, "SkillSpecializeConjuration", "Specialize Conjuration"),
    (46, "SkillSpecializeDivination", "Specialize Divination"),
    (47, "SkillSpecializeEvocation", "Specialize Evocation"),
    (48, "SkillPickPockets",        "Pick Pockets"),
    (49, "SkillStringedInstruments", "Stringed Instruments"),
    (50, "SkillSwimming",           "Swimming"),
    (51, "SkillThrowing",           "Throwing"),
    (52, "SkillTigerClaw",          "Tiger Claw"),
    (53, "SkillTracking",           "Tracking"),
    (54, "SkillWindInstruments",    "Wind Instruments"),
    (55, "SkillFishing",            "Fishing"),
    (56, "SkillMakePoison",         "Make Poison"),
    (57, "SkillTinkering",          "Tinkering"),
    (58, "SkillResearch",           "Research"),
    (59, "SkillAlchemy",            "Alchemy"),
    (60, "SkillBaking",             "Baking"),
    (61, "SkillTailoring",          "Tailoring"),
    (62, "SkillSenseTraps",         "Sense Traps"),
    (63, "SkillBlacksmithing",      "Blacksmithing"),
    (64, "SkillFletching",          "Fletching"),
    (65, "SkillBrewing",            "Brewing"),
    (66, "SkillAlcoholTolerance",   "Alcohol Tolerance"),
    (67, "SkillBegging",            "Begging"),
    (68, "SkillJewelryMaking",      "Jewelry Making"),
    (69, "SkillPottery",            "Pottery"),
    (70, "SkillPercussionInstruments", "Percussion Instruments"),
    (71, "SkillIntimidation",       "Intimidation"),
    (72, "SkillBerserking",         "Berserking"),
    (73, "SkillTaunt",              "Taunt"),
    (74, "SkillFrenzy",             "Frenzy"),
    (75, "SkillRemoveTraps",        "Remove Traps"),
    (76, "SkillTripleAttack",       "Triple Attack"),
]

# Grouping for the index page.
CATEGORIES = {
    "Combat": {0, 1, 2, 3, 7, 8, 10, 11, 15, 16, 19, 20, 21, 22, 23, 25, 26,
               28, 30, 33, 34, 36, 37, 38, 39, 51, 52, 71, 72, 73, 74, 76},
    "Casting": {4, 5, 13, 14, 18, 24, 31, 43, 44, 45, 46, 47},
    "Stealth & Utility": {6, 9, 17, 27, 29, 32, 35, 40, 42, 48, 50, 53, 62, 75},
    "Bardic": {12, 41, 49, 54, 70},
    "Tradeskill": {55, 56, 57, 58, 59, 60, 61, 63, 64, 65, 66, 67, 68, 69},
}

SKILL_BY_ID = {sid: (code, name) for sid, code, name in SKILLS}


def skill_name(skill_id: int) -> str:
    info = SKILL_BY_ID.get(skill_id)
    return info[1] if info else f"Skill #{skill_id}"
