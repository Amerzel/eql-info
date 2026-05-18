"""Player-race definitions.

racedata.txt contains 1082 race entries (player + monster) but the schema
is mostly animation/skeleton references — no class permissions. We pair
the 16 player races with canonical EQ race-class permissions from Live
EverQuest lore. dbstr_us.txt provides the lore description (type 8) and
race name singular / plural (types 11 / 12).
"""

# (race_id, short_code, expansion)
PLAYER_RACES = [
    (1,   "HUM", "Classic"),
    (2,   "BAR", "Classic"),
    (3,   "ERU", "Classic"),
    (4,   "ELF", "Classic"),
    (5,   "HIE", "Classic"),
    (6,   "DEF", "Classic"),
    (7,   "HEL", "Classic"),
    (8,   "DWF", "Classic"),
    (9,   "TRL", "Classic"),
    (10,  "OGR", "Classic"),
    (11,  "HFL", "Classic"),
    (12,  "GNM", "Classic"),
    (128, "IKS", "Ruins of Kunark"),
    (130, "VAH", "Shadows of Luclin"),
    (330, "FRG", "Legacy of Ykesha"),
    (522, "DRK", "Serpent's Spine"),
]

# class indexes match CLASS_NAMES in skills_data.py:
#   0 Warrior, 1 Cleric, 2 Paladin, 3 Ranger, 4 Shadow Knight, 5 Druid,
#   6 Monk, 7 Bard, 8 Rogue, 9 Shaman, 10 Necromancer, 11 Wizard,
#   12 Magician, 13 Enchanter, 14 Beastlord, 15 Berserker
RACE_CLASSES = {
    1:   {0, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13},                # Human
    2:   {0, 8, 9, 14, 15},                                       # Barbarian
    3:   {1, 2, 4, 10, 11, 12, 13},                               # Erudite
    4:   {0, 3, 5, 7, 8},                                         # Wood Elf
    5:   {1, 2, 11, 12, 13},                                      # High Elf
    6:   {0, 1, 4, 8, 10, 11, 12, 13},                            # Dark Elf
    7:   {0, 2, 3, 5, 7, 8},                                      # Half Elf
    8:   {0, 1, 2, 8, 15},                                        # Dwarf
    9:   {0, 4, 6, 9, 14, 15},                                    # Troll  (Monk added in modern era? Keep conservative — drop if EQL differs)
    10:  {0, 4, 9, 14, 15},                                       # Ogre
    11:  {0, 1, 2, 3, 5, 8},                                      # Halfling
    12:  {0, 1, 2, 4, 8, 10, 11, 12, 13},                         # Gnome
    128: {0, 4, 6, 9, 10, 14},                                    # Iksar
    130: {0, 7, 8, 9, 14, 15},                                    # Vah Shir / Kerran
    330: {0, 1, 2, 4, 6, 8, 9, 10, 11},                           # Froglok
    522: {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13},          # Drakkin
}

# Conservative correction: Trolls historically can't be Monk.
RACE_CLASSES[9] = {0, 4, 9, 14, 15}
