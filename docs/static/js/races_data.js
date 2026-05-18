// Player-race definitions. Mirror of races_data.py.
//
// We intentionally do NOT publish a race->class permission table here. Those
// rules are server-side character-creation logic and EQL may diverge from
// the canonical Live EQ restrictions. Without authoritative EQL data we'd
// just be guessing — see races_data.py for the full reasoning.

export const PLAYER_RACES = [
  { id:   1, code: "HUM", expansion: "Classic" },
  { id:   2, code: "BAR", expansion: "Classic" },
  { id:   3, code: "ERU", expansion: "Classic" },
  { id:   4, code: "ELF", expansion: "Classic" },
  { id:   5, code: "HIE", expansion: "Classic" },
  { id:   6, code: "DEF", expansion: "Classic" },
  { id:   7, code: "HEL", expansion: "Classic" },
  { id:   8, code: "DWF", expansion: "Classic" },
  { id:   9, code: "TRL", expansion: "Classic" },
  { id:  10, code: "OGR", expansion: "Classic" },
  { id:  11, code: "HFL", expansion: "Classic" },
  { id:  12, code: "GNM", expansion: "Classic" },
  { id: 128, code: "IKS", expansion: "Ruins of Kunark" },
  { id: 130, code: "VAH", expansion: "Shadows of Luclin" },
  { id: 330, code: "FRG", expansion: "Legacy of Ykesha" },
  { id: 522, code: "DRK", expansion: "Serpent's Spine" },
];

export const PLAYER_RACE_IDS = new Set(PLAYER_RACES.map(r => r.id));
