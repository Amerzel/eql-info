// Player-race definitions. Mirror of races_data.py.
// Each entry: { id, code, expansion }
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

// race_id -> Set of class indexes (0..15)
export const RACE_CLASSES = {
    1: new Set([0, 1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13]),    // Human
    2: new Set([0, 8, 9, 14, 15]),                            // Barbarian
    3: new Set([1, 2, 4, 10, 11, 12, 13]),                    // Erudite
    4: new Set([0, 3, 5, 7, 8]),                              // Wood Elf
    5: new Set([1, 2, 11, 12, 13]),                           // High Elf
    6: new Set([0, 1, 4, 8, 10, 11, 12, 13]),                 // Dark Elf
    7: new Set([0, 2, 3, 5, 7, 8]),                           // Half Elf
    8: new Set([0, 1, 2, 8, 15]),                             // Dwarf
    9: new Set([0, 4, 9, 14, 15]),                            // Troll
   10: new Set([0, 4, 9, 14, 15]),                            // Ogre
   11: new Set([0, 1, 2, 3, 5, 8]),                           // Halfling
   12: new Set([0, 1, 2, 4, 8, 10, 11, 12, 13]),              // Gnome
  128: new Set([0, 4, 6, 9, 10, 14]),                         // Iksar
  130: new Set([0, 7, 8, 9, 14, 15]),                         // Vah Shir
  330: new Set([0, 1, 2, 4, 6, 8, 9, 10, 11]),                // Froglok
  522: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]), // Drakkin
};
