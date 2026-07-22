// Static data tables. Generated from the Python sources skills_data.py
// and spa_data.py — keep in sync if those change.

export const CLASS_NAMES = [
  "Warrior", "Cleric", "Paladin", "Ranger", "Shadow Knight",
  "Druid", "Monk", "Bard", "Rogue", "Shaman",
  "Necromancer", "Wizard", "Magician", "Enchanter", "Beastlord", "Berserker",
];

// Exact in-game Target strings for verified types (2026-07-21);
// keep in sync with webapp/app.py.
export const TARGET_TYPES = {
  1: "Bolt", 2: "Targeted AE", 3: "Group", 4: "PB AE",
  5: "Single", 6: "Self", 8: "Targeted AE", 9: "Animal",
  10: "Undead", 11: "Construct/Elemental", 13: "Lifetap", 14: "Pet",
  15: "Corpse", 16: "Plant", 17: "Uber Giants", 18: "Uber Dragons",
  20: "Targeted AE Tap", 24: "AE Undead", 25: "AE Summoned",
  32: "AE Hatelist", 33: "Hatelist", 34: "Chest", 35: "Special Muramite",
  36: "Area (Players)", 37: "Area (NPCs)", 38: "Summoned Pet",
  39: "Group (No Pets)", 40: "AE Bard", 41: "Group",
  42: "Directional AE", 43: "Single in Group (and Pet)", 44: "Beam",
  45: "Free Target AE", 46: "Target of Target", 47: "Pet Owner",
  50: "Targeted AE (No Players' Pets)", 51: "Single Friendly (or Self)",
  52: "All Group Members", 56: "Target Group Member or Self",
};

export const RESIST_TYPES = {
  0: "Unresistable", 1: "Magic", 2: "Fire", 3: "Cold",
  4: "Poison", 5: "Disease", 6: "Chromatic", 7: "Prismatic",
  8: "Physical", 9: "Corruption",
};

export const MAX_LEVEL = 50;

export function targetName(t) { return TARGET_TYPES[t] || `#${t}`; }
export function resistName(r) { return RESIST_TYPES[r] || `#${r}`; }
export function className(i) { return CLASS_NAMES[i] || `Class ${i}`; }

// Direct-HP effects (the "CurrentHP" family): 0 CurrentHP, 69 CurrentHPOnce,
// 79 CurrentHPPlus. For these a negative base is HP loss (damage/DoT), and the
// live client shows the magnitude — so display abs(). Other effects keep their
// sign, where negative means a real decrease (snare, stat debuff, AC down).
const HP_DAMAGE_EFFECTS = new Set([0, 69, 79]);

// EQEmu spell-value formula table. Given the spell file's raw `base`,
// `formula`, and `max`, compute the value the live client would show at the
// given caster `level`. For negative-base effects (damage/debuff) each level
// makes the magnitude grow rather than shrink — implemented symmetrically so
// the same formula works for both buffs and damage.
//
// Confirmed at L1 against in-game observations (Yaulp +10 STR / +5 AC; Courage
// +2 AC; Strengthen +5 STR; Dexterous Aura +5 DEX; Minor Healing 12 HP).
//
// Mirrors Server/zone/spell_effects.cpp CalcSpellEffectValue_formula. Two
// quirks to know:
//
//   • Degenerating formulas (107, 108, 120, 122) shrink over the buff's
//     remaining-tick count — we can't compute this statically, so we return
//     `base` (the un-degenerated starting value, which is what a tooltip
//     shows). Mark these `degenerating: true` so the caller can choose how
//     to label them.
//   • Breakpoint formulas (111-118) only start scaling past a level
//     threshold (e.g. 111 needs level >16). Below the threshold, return
//     `base`. The Symbol-line spells (115-118) are class-specific.
//   • Random formula (123) returns a midpoint estimate; the real cast rolls
//     between base and abs(max).
//
// Formula 121 is `level/3` per EQEmu source but `level/4` per the
// content-creator gist; EQL's behavior not yet observed. Going with /3 to
// match EQEmu canon — flag if a Bard L1 Chant-of-* observation contradicts.
export function calcSpellValue(base, formula, max, level) {
  let delta = 0;
  if (formula === 0 || formula === 100) {
    delta = 0;
  } else if (formula >= 1 && formula <= 10) {
    delta = level * formula;
  } else {
    switch (formula) {
      case 101: delta = Math.floor(level / 2); break;
      case 102: delta = level; break;
      case 103: delta = level * 2; break;
      case 104: delta = level * 3; break;
      case 105: delta = level * 4; break;
      case 106: delta = level * 5; break;
      // 107/108: degenerating — return base (un-degenerated start value)
      case 107: delta = 0; break;
      case 108: delta = 0; break;
      // EQL: 109 uses /4 (matches EQEmu; confirmed via Chant of Battle @ L10)
      case 109: delta = Math.floor(level / 4); break;
      case 110: delta = Math.floor(level / 6); break;
      // 111-114: breakpoint scaling (no contribution below the threshold)
      case 111: delta = 6 * Math.max(0, level - 16); break;
      case 112: delta = 8 * Math.max(0, level - 24); break;
      case 113: delta = 10 * Math.max(0, level - 34); break;
      case 114: delta = 15 * Math.max(0, level - 44); break;
      // 115-118: Symbol-line breakpoints (Symbol of Transal, Ryltan, Pinzarn, Naltron).
      // These ignore the negative-base sign convention upstream — return delta
      // applied to `ubase` directly, not `updownsign * (ubase + delta)`.
      case 115: delta = level > 15 ? 7 * (level - 15) : 0; break;
      case 116: delta = level > 24 ? 10 * (level - 24) : 0; break;
      case 117: delta = level > 34 ? 13 * (level - 34) : 0; break;
      case 118: delta = level > 44 ? 20 * (level - 44) : 0; break;
      case 119: delta = Math.floor(level / 8); break;
      case 120: delta = 0; break;  // degenerating
      case 121: delta = Math.floor(level / 3); break;
      case 122: delta = 0; break;  // degenerating (Splurt)
      case 123: {
        // Random between base and abs(max) — return midpoint estimate.
        const m = Math.abs(max);
        if (m === 0) { delta = 0; break; }
        // Caller's base+delta is `base + delta` for buffs, so set delta so
        // that result lands at (base + m) / 2.
        delta = Math.floor((m - Math.abs(base)) / 2);
        break;
      }
      // 124-126: level>50 only (no L1-50 contribution)
      case 124: delta = Math.max(0, level - 50); break;
      case 125: delta = 2 * Math.max(0, level - 50); break;
      case 126: delta = 3 * Math.max(0, level - 50); break;
      // 139/140 — late-level bonus on top of base (kicks in past L30)
      case 139: delta = level > 30 ? Math.floor((level - 30) / 2) : 0; break;
      case 140: delta = level > 30 ? level - 30 : 0; break;
      default:  delta = 0; break;
    }
  }
  let result = base >= 0 ? base + delta : base - delta;
  if (max !== 0) {
    if (base >= 0) {
      if (result > max) result = max;
    } else {
      const cap = -Math.abs(max);
      if (result < cap) result = cap;
    }
  }
  return result;
}

// Formulas whose value shrinks each tick (107, 108, 120, 122). For these
// the calc returns the starting (un-degenerated) value; the caller may
// want to show "starts at X / fades to base" or label them with a hint.
export const DEGENERATING_FORMULAS = new Set([107, 108, 120, 122]);

// Formula 123 is a random roll between base and abs(max). The calc returns
// the midpoint estimate; the caller may want to show the full range.
export const RANDOM_FORMULAS = new Set([123]);

// SPA divisors applied at display time. effect_id=1 (AC) shows raw/4.
// SPA 416 (AC2) is the only other confirmed AC variant per the canonical SPA
// list — likely also /4 but not yet validated in-game. (Earlier we suspected
// 221 and 262 were AC variants too; per the RedGuides canonical list they are
// REDUCE_WEIGHT and INCREASE_STAT_CAP respectively, unrelated to AC.)
const SPA_DIVISORS = new Map([
  [1, 4],   // ArmorClass — confirmed
  // effect_id 3 (MovementSpeed) — NOT a simple divisor. Buffs (Spirit of
  // Wolf raw=35 → +7) look additive ~ raw/5, but debuffs (Snare raw=-50 →
  // -19 velocity, ~57% slow on base=33) look multiplicative. Two different
  // display mechanics; needs more data to model. Leaving raw for now.
]);

// SPAs where the `base_value` is a SPELL ID reference, not a magnitude.
// The display should resolve the referenced spell rather than show "+N".
//   85  — MeleeProc (a.k.a. AddProcSpell): proc the referenced spell on hit
//   289 — CastOnFadeEffect: cast spell when buff fades naturally
//   333 — CastOnRuneFadeEffect: cast spell when rune is depleted
//   361 — SpellOnDeath: cast spell when buffed target dies
//   373 — CastOnFadeEffectAlways: cast spell when buff fades (any reason)
//   442 — TriggerOnReqTarget: cast spell when target condition is met
//   443 — TriggerOnReqCaster: cast spell when caster condition is met
// (For 442/443 the limit_value is a spell-restriction ID; rendering
// support for those is TODO — we'd need a restriction-ID label table.)
export const SPELL_ID_REF_SPAS = new Set([85, 289, 333, 361, 373, 442, 443]);

// SPAs where `limit_value` (not base_value) holds the spell ID to trigger.
// Most trigger / proc SPAs put `chance` in base and the target spell ID in
// limit. Wiki Tier-1 gate doesn't render these yet — included for future
// extension. Source: EQEmu spell_effects.cpp + the content-creator gist.
export const SPELL_ID_LIMIT_SPAS = new Set([
  201, 288, 323, 339, 340, 360, 365, 374, 419, 470, 475,
]);

// Instant nukes display HP damage as a positive magnitude (game shows "8 damage").
// Duration spells (DoT, HP-cost buff) preserve the negative sign instead — the
// game's effect breakdown shows "-5 HP" per tick. Caller passes `isDuration`
// (typically `spell.buff_duration_formula > 0`).
export function displayedValue(effectId, base, formula, max, level, isDuration = false) {
  const raw = calcSpellValue(base, formula, max, level);
  const div = SPA_DIVISORS.get(effectId) || 1;
  let v = div === 1 ? raw : Math.trunc(raw / div);
  if (HP_DAMAGE_EFFECTS.has(effectId) && !isDuration) v = Math.abs(v);
  return v;
}

// Backwards-compat shim: old callsites passed (effectId, rawValue) and got
// just the abs() treatment for HP damage. New code should call displayedValue
// instead.
export function effectValue(effectId, v) {
  return HP_DAMAGE_EFFECTS.has(effectId) ? Math.abs(v) : v;
}

// ─── Confidence tiers ──────────────────────────────────────────────────────
// How much we trust our prediction for a given formula or SPA. Use
// `confidenceTier(effectId, formula)` for the combined tier of an effect row.
// See project_spell_formula_table.md memory for details.
//
//   "solid"    — confirmed via in-game observation, safe to publish
//   "inferred" — extrapolated from EQEmu source, not yet validated in EQL
//   "partial"  — mechanic understood but numbers don't match cleanly
//   "unknown"  — no info; render generically and omit from confident outputs

export const FORMULA_TIER = {
  0: "solid", 100: "solid", 101: "solid", 102: "solid", 103: "solid",
  109: "solid",  // EQL diverges from EQEmu: /4 (not /3)
  2: "solid", 3: "solid",
  // Promoted to solid 2026-06-10 via eqprogression tooltip cross-check.
  // Tooltip range lower = formula at spell's lowest-class min_level; upper = max cap.
  4: "solid",    // Healing (Cleric L10): tooltip 135–175; 95+10·4=135 ✓
  7: "solid",    // Greater Healing (Cleric L20): tooltip 280–350; 140+20·7=280 ✓
  10: "solid",   // Superior Healing (Cleric L30): tooltip 500–600; 200+30·10=500 ✓
  104: "solid",  // Lightning Strike (Druid L31): tooltip 163–184; 70+31·3=163 ✓
  105: "solid",  // Earthquake (Druid L31): tooltip 214–246; 90+31·4=214 ✓
  1: "solid",    // Mend Bones @L10: tooltip 25–32; 15+10·1=25 ✓
  // Tier 2 — from EQEmu source, not yet validated against tooltip or in-game
  5: "inferred", 6: "inferred",
  8: "inferred", 9: "inferred",
  106: "inferred", 107: "inferred", 108: "inferred", 110: "inferred",
  111: "inferred", 112: "inferred", 113: "inferred", 114: "inferred", 115: "inferred",
  116: "inferred", 117: "inferred", 118: "inferred", 119: "inferred", 120: "inferred",
  121: "inferred", 139: "inferred", 140: "inferred",
};

export const SPA_TIER = {
  // Solid — directly verified at L1 or L10
  0: "solid", 1: "solid", 4: "solid", 5: "solid", 6: "solid", 10: "solid",
  46: "solid", 47: "solid", 50: "solid", 69: "solid", 79: "solid",
  85: "solid",
  // Promoted 2026-06-10 via in-game stat-sheet observation @ L10:
  2: "solid",   // Grim Aura @L10: +10 ATK ✓ (base=5 fm=101 → 5+5=10)
  7: "solid",   // Spirit of Bear @L10: +13 STA ✓ (base=8 fm=101 → 8+5=13)
  15: "solid",  // Dark Pact @L10: +2 mana/tick ✓ (base=2 fm=100)
  48: "solid",  // Endure Poison @L10: +20 PR (capped at max) ✓
  49: "solid",  // Endure Disease @L10: +20 DR (capped at max) ✓
  // Inferred by analogy with the confirmed family members
  8: "inferred", 9: "inferred",
  59: "inferred",
  97: "inferred", 111: "inferred",
  416: "inferred",  // AC2 — likely /4 like SPA 1, not yet validated
  // Partial — mechanic confirmed but numbers off
  3: "partial",
};

export function confidenceTier(effectId, formula) {
  const f = FORMULA_TIER[formula] ?? "unknown";
  const s = SPA_TIER[effectId] ?? "unknown";
  // Combined tier is the WEAKEST of the two — if either is unknown the row is
  // unknown; if either is partial it's partial; etc.
  const rank = { solid: 0, inferred: 1, partial: 2, unknown: 3 };
  return rank[f] >= rank[s] ? f : s;
}

// URL slug ↔ class index. Lowercased, spaces → hyphens ("Shadow Knight" →
// "shadow-knight") for readable class URLs like #/class/druid.
export function classSlug(i) {
  return (CLASS_NAMES[i] || `class-${i}`).toLowerCase().replace(/\s+/g, "-");
}
const _CLASS_SLUG_TO_INDEX = new Map(
  CLASS_NAMES.map((n, i) => [n.toLowerCase().replace(/\s+/g, "-"), i]));
// Resolve a URL arg to a class index: accepts a name slug, or a numeric id
// (so old #/class/5 links still work). Returns NaN if unrecognized.
export function classIndexFromArg(arg) {
  if (arg == null) return NaN;
  const s = String(arg).toLowerCase();
  if (_CLASS_SLUG_TO_INDEX.has(s)) return _CLASS_SLUG_TO_INDEX.get(s);
  const n = parseInt(arg, 10);
  return Number.isNaN(n) ? NaN : n;
}
// SPA names (485 entries from EQEmu spdat.h #defines)
export const SPA_NAMES = {"0": "HP", "1": "AC", "2": "AttackPower", "3": "MovementRate", "4": "STR", "5": "DEX", "6": "AGI", "7": "STA", "8": "INT", "9": "WIS", "10": "CHA", "11": "Haste", "12": "Invisibility", "13": "SeeInvis", "14": "EnduringBreath", "15": "MANA", "16": "NpcFrenzy", "17": "NpcAwareness", "18": "NpcAggro", "19": "NpcFaction", "20": "Blindness", "21": "Stun", "22": "Charm", "23": "Fear", "24": "Fatigue", "25": "BindAffinity", "26": "Gate", "27": "DispelMagic", "28": "InvisVsUndead", "29": "InvisVsAnimals", "30": "NpcAggroRadius", "31": "Enthrall", "32": "CreateItem", "33": "SummonPet", "34": "Confuse", "35": "Disease", "36": "Poison", "37": "DetectHostile", "38": "DetectMagic", "39": "NoTwincast", "40": "Invulnerability", "41": "Banish", "42": "ShadowStep", "43": "Berserk", "44": "Lycanthropy", "45": "Vampirism", "46": "ResistFire", "47": "ResistCold", "48": "ResistPoison", "49": "ResistDisease", "50": "ResistMagic", "51": "DetectTraps", "52": "DetectUndead", "53": "DetectSummoned", "54": "DetectAnimals", "55": "Stoneskin", "56": "TrueNorth", "57": "Levitation", "58": "ChangeForm", "59": "DamageShield", "60": "TransferItem", "61": "ItemLore", "62": "ItemIdentify", "63": "NpcWipeHateList", "64": "SpinStun", "65": "Infravision", "66": "Ultravision", "67": "EyeOfZomm", "68": "ReclaimEnergy", "69": "MaxHp", "70": "CorpseBomb", "71": "CreateUndead", "72": "PreserveCorpse", "73": "BindSight", "74": "FeignDeath", "75": "Ventriloquism", "76": "Sentinel", "77": "LocateCorpse", "78": "SpellShield", "79": "InstantHp", "80": "EnchantLight", "81": "Resurrect", "82": "SummonTarget", "83": "Portal", "84": "HpNpcOnly", "85": "AddProcSpell", "86": "NpcHelpRadius", "87": "Magnification", "88": "Evacuate", "89": "Height", "90": "IgnorePet", "91": "SummonCorpse", "92": "Hate", "93": "WeatherControl", "94": "Fragile", "95": "Sacrifice", "96": "Silence", "97": "MaxMana", "98": "BardHaste", "99": "Root", "100": "Healdot", "101": "Completeheal", "102": "PetFearless", "103": "CallPet", "104": "Translocate", "105": "NpcAntiGate", "106": "BeastlordPet", "107": "AlterPetLevel", "108": "Familiar", "109": "CreateItemInBag", "110": "Archery", "111": "ResistAll", "112": "FizzleSkill", "113": "SummonMount", "114": "ModifyHate", "115": "Cornucopia", "116": "Curse", "117": "HitMagic", "118": "Amplification", "119": "AttackSpeedMax", "120": "Healmod", "121": "Ironmaiden", "122": "Reduceskill", "123": "Immunity", "124": "FocusDamageMod", "125": "FocusHealMod", "126": "FocusResistMod", "127": "FocusCastTimeMod", "128": "FocusDurationMod", "129": "FocusRangeMod", "130": "FocusHateMod", "131": "FocusReagentMod", "132": "FocusManacostMod", "133": "FocusStuntimeMod", "134": "FocusLevelMax", "135": "FocusResistType", "136": "FocusTargetType", "137": "FocusWhichSpa", "138": "FocusBeneficial", "139": "FocusWhichSpell", "140": "FocusDurationMin", "141": "FocusInstantOnly", "142": "FocusLevelMin", "143": "FocusCasttimeMin", "144": "FocusCasttimeMax", "145": "NpcPortalWarderBanish", "146": "PortalLocations", "147": "PercentHeal", "148": "StackingBlock", "149": "StripVirtualSlot", "150": "DivineIntervention", "151": "PocketPet", "152": "PetSwarm", "153": "HealthBalance", "154": "CancelNegativeMagic", "155": "PopResurrect", "156": "Mirror", "157": "Feedback", "158": "Reflect", "159": "ModifyAllStats", "160": "ChangeSobriety", "161": "SpellGuard", "162": "MeleeGuard", "163": "AbsorbHit", "164": "ObjectSenseTrap", "165": "ObjectDisarmTrap", "166": "ObjectPicklock", "167": "FocusPet", "168": "Defensive", "169": "CriticalMelee", "170": "CriticalSpell", "171": "CripplingBlow", "172": "Evasion", "173": "Riposte", "174": "Dodge", "175": "Parry", "176": "DualWield", "177": "DoubleAttack", "178": "MeleeLifetap", "179": "Puretone", "180": "Sanctification", "181": "Fearless", "182": "HundredHands", "183": "SkillIncreaseChance", "184": "Accuracy", "185": "SkillDamageMod", "186": "MinDamageDoneMod", "187": "ManaBalance", "188": "Block", "189": "Endurance", "190": "IncreaseMaxEndurance", "191": "Amnesia", "192": "HateOverTime", "193": "SkillAttack", "194": "Fade", "195": "StunResist", "196": "Strikethrough1", "197": "SkillDamageTaken", "198": "InstantEndurance", "199": "Taunt", "200": "ProcChance", "201": "RangeAbility", "202": "IllusionOthers", "203": "MassGroupBuff", "204": "GroupFearImmunity", "205": "Rampage", "206": "AeTaunt", "207": "FleshToBone", "208": "PurgePoison", "209": "CancelBeneficial", "210": "ShieldCaster", "211": "DestructiveForce", "212": "FocusFrenziedDevastation", "213": "PetPctMaxHp", "214": "HpMaxHp", "215": "PetPctAvoidance", "216": "MeleeAccuracy", "217": "Headshot", "218": "PetCritMelee", "219": "SlayUndead", "220": "IncreaseSkillDamage", "221": "ReduceWeight", "222": "BlockBehind", "223": "DoubleRiposte", "224": "AddRiposte", "225": "GiveDoubleAttack", "226": "2hBash", "227": "ReduceSkillTimer", "228": "Acrobatics", "229": "CastThroughStun", "230": "ExtendedShielding", "231": "BashChance", "232": "DivineSave", "233": "Metabolism", "234": "PoisonMastery", "235": "FocusChanneling", "236": "FreePet", "237": "PetAffinity", "238": "PermIllusion", "239": "Stonewall", "240": "StringUnbreakable", "241": "ImproveReclaimEnergy", "242": "IncreaseChangeMemwipe", "243": "EnhancedCharm", "244": "EnhancedRoot", "245": "TrapCircumvention", "246": "IncreaseAirSupply", "247": "IncreaseMaxSkill", "248": "ExtraSpecialization", "249": "OffhandMinWeaponDamage", "250": "IncreaseProcChance", "251": "EndlessQuiver", "252": "BackstabFront", "253": "ChaoticStab", "254": "Nospell", "255": "ShieldingDurationMod", "256": "ShroudOfStealth", "257": "GivePetHold", "258": "TripleBackstab", "259": "AcLimitMod", "260": "AddInstrumentMod", "261": "SongModCap", "262": "IncreaseStatCap", "263": "TradeskillMastery", "264": "ReduceAaTimer", "265": "NoFizzle", "266": "Add2hAttackChance", "267": "AddPetCommands", "268": "AlchemyFailRate", "269": "FirstAid", "270": "ExtendSongRange", "271": "BaseRunMod", "272": "IncreaseCastingLevel", "273": "Dotcrit", "274": "Healcrit", "275": "Mendcrit", "276": "DualWieldAmt", "277": "ExtraDiChance", "278": "FinishingBlow", "279": "Flurry", "280": "PetFlurry", "281": "PetFeign", "282": "IncreaseBandageAmt", "283": "WuAttack", "284": "ImproveLoh", "285": "NimbleEvasion", "286": "FocusDamageAmt", "287": "FocusDurationAmt", "288": "AddProcHit", "289": "DoomEffect", "290": "IncreaseRunSpeedCap", "291": "Purify", "292": "Strikethrough", "293": "StunResist2", "294": "SpellCritChance", "295": "ReduceSpecialTimer", "296": "FocusDamageModDetrimental", "297": "FocusDamageAmtDetrimental", "298": "TinyCompanion", "299": "WakeDead", "300": "Doppelganger", "301": "IncreaseRangeDmg", "302": "FocusDamageModCrit", "303": "FocusDamageAmtCrit", "304": "SecondaryRiposteMod", "305": "DamageShieldMod", "306": "WeakDead2", "307": "Appraisal", "308": "ZoneSuspendMinion", "309": "TeleportCastersBindpoint", "310": "FocusReuseTimer", "311": "FocusCombatSkill", "312": "Observer", "313": "ForageMaster", "314": "ImprovedInvis", "315": "ImprovedInvisUndead", "316": "ImprovedInvisAnimals", "317": "IncreaseWornHpRegenCap", "318": "IncreaseWornManaRegenCap", "319": "CriticalHpRegen", "320": "ShieldBlockChance", "321": "ReduceTargetHate", "322": "GateStartingCity", "323": "DefensiveProc", "324": "HpForMana", "325": "NoBreakAeSneak", "326": "AddSpellSlots", "327": "AddBuffSlots", "328": "IncreaseNegativeHpLimit", "329": "ManaAbsorbPctDmg", "330": "CritAttackModifier", "331": "FailAlchemyItemRecovery", "332": "SummonToCorpse", "333": "DoomRuneEffect", "334": "NoMoveHp", "335": "FocusedImmunity", "336": "IllusionaryTarget", "337": "IncreaseExpMod", "338": "ExpedientRecovery", "339": "FocusCastingProc", "340": "ChanceSpell", "341": "WornAttackCap", "342": "NoPanic", "343": "SpellInterrupt", "344": "ItemChanneling", "345": "AssassinateMaxLevel", "346": "HeadshotMaxLevel", "347": "DoubleRangedAttack", "348": "FocusManaMin", "349": "IncreaseShieldDmg", "350": "Manaburn", "351": "SpawnInteractiveObject", "352": "IncreaseTrapCount", "353": "IncreaseSoiCount", "354": "DeactivateAllTraps", "355": "LearnTrap", "356": "ChangeTriggerType", "357": "FocusMute", "358": "InstantMana", "359": "PassiveSenseTrap", "360": "ProcOnKillShot", "361": "ProcOnDeath", "362": "PotionBelt", "363": "Bandolier", "364": "AddTripleAttackChance", "365": "ProcOnSpellKillShot", "366": "GroupShielding", "367": "ModifyBodyType", "368": "ModifyFaction", "369": "Corruption", "370": "ResistCorruption", "371": "Slow", "372": "GrantForaging", "373": "DoomAlways", "374": "TriggerSpell", "375": "CritDotDmgMod", "376": "Fling", "377": "DoomEntity", "378": "ResistOtherSpa", "379": "DirectionalTeleport", "380": "ExplosiveKnockback", "381": "FlingToward", "382": "Suppression", "383": "FocusCastingProcNormalized", "384": "FlingAt", "385": "FocusWhichGroup", "386": "DoomDispeller", "387": "DoomDispellee", "388": "SummonAllCorpses", "389": "RefreshSpellTimer", "390": "LockoutSpellTimer", "391": "FocusManaMax", "392": "FocusHealAmt", "393": "FocusHealModBeneficial", "394": "FocusHealAmtBeneficial", "395": "FocusHealModCrit", "396": "FocusHealAmtCrit", "397": "AddPetAc", "398": "FocusSwarmPetDuration", "399": "FocusTwincastChance", "400": "Healburn", "401": "ManaIgnite", "402": "EnduranceIgnite", "403": "FocusSpellClass", "404": "FocusSpellSubclass", "405": "StaffBlockChance", "406": "DoomLimitUse", "407": "DoomFocusUsed", "408": "LimitHp", "409": "LimitMana", "410": "LimitEndurance", "411": "FocusLimitClass", "412": "FocusLimitRace", "413": "FocusBaseEffects", "414": "FocusLimitSkill", "415": "FocusLimitItemClass", "416": "AC2", "417": "Mana2", "418": "FocusIncreaseSkillDmg2", "419": "ProcEffect2", "420": "FocusLimitUse", "421": "FocusLimitUseAmt", "422": "FocusLimitUseMin", "423": "FocusLimitUseType", "424": "Gravitate", "425": "Fly", "426": "AddExtendedTargetSlots", "427": "SkillProc", "428": "ProcSkillModifier", "429": "SkillProcSuccess", "430": "PostEffect", "431": "PostEffectData", "432": "ExpandMaxActiveTrophyBenefits", "433": "AddNormalizedSkillMinDmgAmt", "434": "AddNormalizedSkillMinDmgAmt2", "435": "FragileDefense", "436": "FreezeBuffTimer", "437": "TeleportToAnchor", "438": "TranslocateToAnchor", "439": "Assassinate", "440": "FinishingBlowMax", "441": "DistanceRemoval", "442": "RequireTargetDoom", "443": "RequireCasterDoom", "444": "ImprovedTaunt", "445": "AddMercSlot", "446": "StackerA", "447": "StackerB", "448": "StackerC", "449": "StackerD", "450": "DotGuard", "451": "MeleeThresholdGuard", "452": "SpellThresholdGuard", "453": "MeleeThresholdDoom", "454": "SpellThresholdDoom", "455": "AddHatePct", "456": "AddHateOverTimePct", "457": "ResourceTap", "458": "FactionMod", "459": "SkillDamageMod2", "460": "OverrideNotFocusable", "461": "FocusDamageMod2", "462": "FocusDamageAmt2", "463": "Shield", "464": "PcPetRampage", "465": "PcPetAeRampage", "466": "PcPetFlurry", "467": "DamageShieldMitigationAmt", "468": "DamageShieldMitigationPct", "469": "ChanceBestInSpellGroup", "470": "TriggerBestInSpellGroup", "471": "DoubleMeleeAttacks", "472": "AaBuyNextRank", "473": "DoubleBackstabFront", "474": "PetMeleeCritDmgMod", "475": "TriggerSpellNonItem", "476": "WeaponStance", "477": "HatelistToTop", "478": "HatelistToTail", "479": "FocusLimitMinValue", "480": "FocusLimitMaxValue", "481": "FocusCastSpellOnLand", "482": "SkillBaseDamageMod", "483": "FocusIncomingDmgMod", "484": "FocusIncomingDmgAmt", "485": "FocusLimitCasterClass", "486": "FocusLimitSameCaster", "487": "ExtendTradeskillCap", "488": "DefenderMeleeForcePct", "489": "WornEnduranceRegenCap", "490": "FocusMinReuseTime", "491": "FocusMaxReuseTime", "492": "FocusEnduranceMin", "493": "FocusEnduranceMax", "494": "PetAddAtk", "495": "FocusDurationMax", "496": "CritMeleeDmgModMax", "497": "FocusCastProcNoBypass", "498": "AddExtraPrimaryAttackPct", "499": "AddExtraSecondaryAttackPct", "500": "FocusCastTimeMod2", "501": "FocusCastTimeAmt", "502": "Fearstun", "503": "MeleeDmgPositionMod", "504": "MeleeDmgPositionAmt", "505": "DmgTakenPositionMod", "506": "DmgTakenPositionAmt", "507": "AmplifyMod", "508": "AmplifyAmt", "509": "HealthTransfer", "510": "FocusResistIncoming", "511": "FocusTimerMin", "512": "ProcTimerMod", "513": "ManaMax", "514": "EnduranceMax", "515": "AcAvoidanceMax", "516": "AcMitigationMax", "517": "AttackOffenseMax", "518": "AttackAccuracyMax", "519": "LuckAmt", "520": "LuckPct", "521": "EnduranceAbsorbPctDmg", "522": "InstantManaPct", "523": "InstantEndurancePct", "524": "DurationHpPct", "525": "DurationManaPct", "526": "DurationEndurancePct", "537": "PromisedRenewalTrigger"};

export function spaName(id) { return SPA_NAMES[id] || `SE #${id}`; }

// ---------------------------------------------------------------------------
// Effect-filter model for the #/spells browse page.
//
// EFFECT_BUCKETS split the HP SPAs (0/79/100) into player-facing heal/nuke
// categories. Each carries a SQL predicate over `spell_effects se` + `spells s`;
// {dur} and {V} are expanded by the browse view (see views.js). Because the
// buckets consume SPA 0/79/100, those three are absent from EFFECT_LABELS.
// EFFECT_LABELS maps every other in-use SPA to a friendly dropdown label;
// Increase/Decrease direction shows via the value sign in the results table.
// ---------------------------------------------------------------------------
export const EFFECT_DUR = "(s.buff_duration_formula>0 OR s.buff_duration>0)";
export const EFFECT_VAL = "COALESCE(NULLIF(se.base_value,0), se.max_value)";

export const EFFECT_BUCKETS = [
  { key: "nuke", label: "Nuke (Direct Damage)", pred: "(({V}<0) AND ((se.effect_id=79) OR (se.effect_id=0 AND NOT {dur})))" },
  { key: "dot", label: "Damage over Time (DoT)", pred: "(se.effect_id=0 AND {V}<0 AND {dur})" },
  { key: "heal", label: "Direct Heal", pred: "(({V}>0) AND ((se.effect_id=79) OR (se.effect_id=0 AND NOT {dur})))" },
  { key: "hot", label: "Heal over Time / Regen", pred: "(se.effect_id=100 OR (se.effect_id=0 AND {V}>0 AND {dur}))" },
];

export const EFFECT_LABELS = {
  1: "Armor Class (AC)", 2: "Attack Power (ATK)", 3: "Movement Speed", 4: "Strength (STR)",
  5: "Dexterity (DEX)", 6: "Agility (AGI)", 7: "Stamina (STA)", 8: "Intelligence (INT)",
  9: "Wisdom (WIS)", 10: "Charisma (CHA)", 11: "Melee Haste", 12: "Invisibility",
  13: "See Invisible", 14: "Enduring Breath (Water Breathing)", 15: "Mana",
  18: "Add Hate (Aggro)", 19: "Faction Modifier", 20: "Blind", 21: "Stun", 22: "Charm",
  23: "Fear", 24: "Fatigue (Endurance Drain)", 25: "Bind Affinity", 26: "Gate",
  27: "Dispel (Cancel Magic)", 28: "Invisibility vs Undead", 29: "Invisibility vs Animals",
  30: "Reduce Aggro Radius (Lull)", 31: "Mesmerize", 32: "Summon Item", 33: "Summon Pet",
  35: "Disease Counter", 36: "Poison Counter", 40: "Invulnerability", 42: "Shadow Step",
  44: "Wolf Form", 46: "Fire Resist", 47: "Cold Resist", 48: "Poison Resist",
  49: "Disease Resist", 50: "Magic Resist", 52: "Sense Undead", 53: "Sense Summoned",
  54: "Sense Animals", 55: "Stoneskin", 56: "Sense Heading", 57: "Levitate",
  58: "Illusion", 59: "Damage Shield", 63: "Memory Blur", 64: "Spin Stun",
  65: "Infravision", 66: "Ultravision", 67: "Eye of Zomm", 68: "Reclaim Pet Energy",
  69: "Max Hit Points", 71: "Summon Undead Pet", 73: "Bind Sight", 74: "Feign Death",
  75: "Ventriloquism", 76: "Sentinel", 78: "Spell Shield (% mitigation)",
  81: "Resurrection", 83: "Teleport", 84: "Hit Points (NPC only)", 85: "Add Spell Proc",
  86: "Assist Radius (Pacify)", 87: "Magnify", 88: "Evacuate", 89: "Size",
  92: "Hate (Aggro)", 94: "Fragile (Fades on Hit)", 97: "Max Mana",
  98: "Bard Haste (Overhaste)", 99: "Root", 103: "Call Pet", 104: "Translocate",
  106: "Summon Warder (Beastlord Pet)", 109: "Summon Item", 111: "All Resists",
  112: "Fizzle Rate", 114: "Modify Hate", 115: "Create Food/Water", 116: "Curse Counter",
  117: "Attacks Count as Magic", 118: "Amplify Song Effects", 120: "Healing Modifier",
  121: "Reflect Melee Damage", 124: "Focus: Spell Damage %", 127: "Focus: Cast Time %",
  134: "Focus Limit: Max Spell Level", 136: "Focus Limit: Target Type",
  137: "Focus Limit: Effect (SPA)", 138: "Focus Limit: Beneficial/Detrimental",
  139: "Focus Limit: Specific Spell", 141: "Focus Limit: Instant Only",
  143: "Focus Limit: Min Cast Time", 146: "Teleport Destination",
  148: "Stacking: Block Slot", 149: "Stacking: Overwrite Slot", 158: "Spell Reflect",
  161: "Spell Damage Rune", 162: "Melee Damage Rune", 163: "Absorb Damage (Rune)",
  184: "Accuracy", 189: "Endurance", 192: "Hate over Time", 289: "Effect on Fade (Doom)",
  298: "Shrink Pet (Tiny Companion)", 311: "Focus Limit: Combat Skills",
  314: "Improved Invisibility", 315: "Improved Invis vs Undead", 323: "Defensive Proc",
  334: "HP Regen While Stationary", 340: "Chance to Cast Spell",
  374: "Cast Additional Spell (Trigger)", 382: "Suppression",
  457: "Resource Tap (HP/Mana/End)", 475: "Cast Additional Spell",
  537: "Promised Heal (Delayed Trigger)",
};
export function effectLabel(spa) { return EFFECT_LABELS[spa] || SPA_NAMES[spa] || `SE #${spa}`; }

// Skills (77 entries from EQEmu skills.h)
const _SKILL_DATA = {"SKILLS": [[0, "Skill1HBlunt", "1H Blunt"], [1, "Skill1HSlashing", "1H Slashing"], [2, "Skill2HBlunt", "2H Blunt"], [3, "Skill2HSlashing", "2H Slashing"], [4, "SkillAbjuration", "Abjuration"], [5, "SkillAlteration", "Alteration"], [6, "SkillApplyPoison", "Apply Poison"], [7, "SkillArchery", "Archery"], [8, "SkillBackstab", "Backstab"], [9, "SkillBindWound", "Bind Wound"], [10, "SkillBash", "Bash"], [11, "SkillBlock", "Block"], [12, "SkillBrassInstruments", "Brass Instruments"], [13, "SkillChanneling", "Channeling"], [14, "SkillConjuration", "Conjuration"], [15, "SkillDefense", "Defense"], [16, "SkillDisarm", "Disarm"], [17, "SkillDisarmTraps", "Disarm Traps"], [18, "SkillDivination", "Divination"], [19, "SkillDodge", "Dodge"], [20, "SkillDoubleAttack", "Double Attack"], [21, "SkillDragonPunch", "Dragon Punch / Tail Rake"], [22, "SkillDualWield", "Dual Wield"], [23, "SkillEagleStrike", "Eagle Strike"], [24, "SkillEvocation", "Evocation"], [25, "SkillFeignDeath", "Feign Death"], [26, "SkillFlyingKick", "Flying Kick"], [27, "SkillForage", "Forage"], [28, "SkillHandtoHand", "Hand to Hand"], [29, "SkillHide", "Hide"], [30, "SkillKick", "Kick"], [31, "SkillMeditate", "Meditate"], [32, "SkillMend", "Mend"], [33, "SkillOffense", "Offense"], [34, "SkillParry", "Parry"], [35, "SkillPickLock", "Pick Lock"], [36, "Skill1HPiercing", "1H Piercing"], [37, "SkillRiposte", "Riposte"], [38, "SkillRoundKick", "Round Kick"], [39, "SkillSafeFall", "Safe Fall"], [40, "SkillSenseHeading", "Sense Heading"], [41, "SkillSinging", "Singing"], [42, "SkillSneak", "Sneak"], [43, "SkillSpecializeAbjure", "Specialize Abjuration"], [44, "SkillSpecializeAlteration", "Specialize Alteration"], [45, "SkillSpecializeConjuration", "Specialize Conjuration"], [46, "SkillSpecializeDivination", "Specialize Divination"], [47, "SkillSpecializeEvocation", "Specialize Evocation"], [48, "SkillPickPockets", "Pick Pockets"], [49, "SkillStringedInstruments", "Stringed Instruments"], [50, "SkillSwimming", "Swimming"], [51, "SkillThrowing", "Throwing"], [52, "SkillTigerClaw", "Tiger Claw"], [53, "SkillTracking", "Tracking"], [54, "SkillWindInstruments", "Wind Instruments"], [55, "SkillFishing", "Fishing"], [56, "SkillMakePoison", "Make Poison"], [57, "SkillTinkering", "Tinkering"], [58, "SkillResearch", "Research"], [59, "SkillAlchemy", "Alchemy"], [60, "SkillBaking", "Baking"], [61, "SkillTailoring", "Tailoring"], [62, "SkillSenseTraps", "Sense Traps"], [63, "SkillBlacksmithing", "Blacksmithing"], [64, "SkillFletching", "Fletching"], [65, "SkillBrewing", "Brewing"], [66, "SkillAlcoholTolerance", "Alcohol Tolerance"], [67, "SkillBegging", "Begging"], [68, "SkillJewelryMaking", "Jewelry Making"], [69, "SkillPottery", "Pottery"], [70, "SkillPercussionInstruments", "Percussion Instruments"], [71, "SkillIntimidation", "Intimidation"], [72, "SkillBerserking", "Berserking"], [73, "SkillTaunt", "Taunt"], [74, "SkillFrenzy", "Frenzy"], [75, "SkillRemoveTraps", "Remove Traps"], [76, "SkillTripleAttack", "Triple Attack"]], "CATEGORIES": {"Combat": [0, 1, 2, 3, 7, 8, 10, 11, 15, 16, 19, 20, 21, 22, 23, 25, 26, 28, 30, 33, 34, 36, 37, 38, 39, 51, 52, 71, 72, 73, 74, 76], "Casting": [4, 5, 13, 14, 18, 24, 31, 43, 44, 45, 46, 47], "Stealth & Utility": [6, 9, 17, 27, 29, 32, 35, 40, 42, 48, 50, 53, 62, 75], "Bardic": [12, 41, 49, 54, 70], "Tradeskill": [55, 56, 57, 58, 59, 60, 61, 63, 64, 65, 66, 67, 68, 69]}};
export const SKILLS = _SKILL_DATA.SKILLS.map(s => ({ id: s[0], code: s[1], name: s[2] }));
export const SKILL_CATEGORIES = _SKILL_DATA.CATEGORIES;
export const SKILL_BY_ID = new Map(SKILLS.map(s => [s.id, s]));
export function skillName(id) {
  const s = SKILL_BY_ID.get(id);
  return s ? s.name : `Skill #${id}`;
}

// SPAs whose `limit_value` column is a skill ID (the SkillType enum), not a
// numeric magnitude. Source: EQEmu spell_effects.cpp + the content-creator
// gist. limit_value = -1 means "all skills".
export const SKILL_LIMIT_SPAS = new Set([
  169, 185, 186, 197, 220, 288, 330, 418, 427, 428, 429, 459,
]);

// Render `limit_value` for one effect row. For SPAs that gate by a combat
// skill type we resolve to the skill name; otherwise return the raw number.
export function limitValueLabel(effectId, limitValue) {
  if (SKILL_LIMIT_SPAS.has(effectId)) {
    if (limitValue === -1 || limitValue === 255) return "All Skills";
    return skillName(limitValue);
  }
  return String(limitValue);
}
