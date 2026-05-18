"""Player-race definitions.

racedata.txt contains 1082 race entries (player + monster) but its schema
is mostly animation / skeleton references — no class permissions exposed.
We surface just the 16 player races plus their dbstr-sourced lore (type 8)
and singular/plural names (types 11 / 12).

NOTE: Race↔class restrictions are server-side character-creation rules
and are NOT available from client data. We deliberately do NOT publish a
race→class table here since EQL may diverge from the canonical Live EQ
restrictions and we'd just be guessing.
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

