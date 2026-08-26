// Buff-stacking conflict engine — browser twin of eqltools.spells.stacking
// (the CheckStackConflict port, EQEmu zone/spells.cpp @ b69fa9cbcd75).
// PARITY-GATED against the Python source of truth — behavior changes go there
// first; see that module's docstring for the EQL adaptations (directive
// target slot is 1-BASED in `limit`, not Live's formula-201) and the
// documented deviations (runtime-state branches approximated pairwise).
//
// Verdicts: 0 = unrelated/stack · 1 = the cast spell overwrites the worn one
// · -1 = the cast spell is blocked.

import { calcSpellValue } from "./data.js";
import {
  BARD_ONLY_STACK_EFFECTS, IGNORED_IN_STACKING, SE_ACV2, SE_ARMORCLASS,
  SE_ASTACKER, SE_ATTACKSPEED, SE_ATTACKSPEED2, SE_BLANK, SE_BSTACKER,
  SE_CHA, SE_COMPLETEHEAL, SE_CSTACKER, SE_CURRENTHP, SE_DSTACKER,
  SE_GRAVITYEFFECT, SE_IMPROVEDTAUNT, SE_MANABURN, SE_MOVEMENTSPEED,
  SE_SCREECH, SE_STACKINGCOMMAND_BLOCK, SE_STACKINGCOMMAND_OVERWRITE,
} from "./stacking_rules.js";

export const EFFECT_COUNT = 12;
const GROUP_TARGET_TYPES = new Set([0x03, 0x28, 0x29]);
const STACKERS = [SE_ASTACKER, SE_BSTACKER, SE_CSTACKER, SE_DSTACKER];
const BLANK_EFFECT = [SE_BLANK, 0, 0, 100, 0];

// Build the engine's view of a spell from a spells.json record (or any
// object with the same fields). `effects` entries carry explicit slot
// numbers; gaps become blanks so positions are exact.
export function spellView(sp) {
  const effects = Array.from({ length: EFFECT_COUNT }, () => BLANK_EFFECT);
  for (const e of sp.effects || []) {
    if (e.slot >= 0 && e.slot < EFFECT_COUNT) {
      effects[e.slot] = [e.effect_id, e.base_value, e.limit_value, e.formula,
                         e.max_value];
    }
  }
  const bardLevel = sp.classes ? sp.classes[7] : 255;   // class index 8 = Bard
  return {
    id: sp.id, name: sp.name,
    goodEffect: sp.good_effect,
    buffDurationFormula: sp.buff_duration_formula,
    buffDuration: sp.buff_duration,
    targetType: sp.target_type,
    isBardSong: bardLevel < 255 && !sp.is_discipline,
    unstackableDot: !!sp.unstackable_dot,
    effects,
  };
}

const isDetrimental = (sp) => sp.goodEffect === 0;
const isGroupSpell = (sp) => GROUP_TARGET_TYPES.has(sp.targetType);
const hasEffect = (sp, spa) => sp.effects.some((e) => e[0] === spa);

function isBlankSlot(e) {
  const [spa, base, , formula] = e;
  return spa === SE_BLANK ||
    (spa === SE_CHA && base === 0 && formula === 100) ||
    spa === SE_STACKINGCOMMAND_BLOCK || spa === SE_STACKINGCOMMAND_OVERWRITE;
}

function isStackableDot(sp) {
  if (sp.unstackableDot || sp.goodEffect || !sp.buffDurationFormula) return false;
  return hasEffect(sp, SE_CURRENTHP) || hasEffect(sp, SE_GRAVITYEFFECT);
}

const value = (sp, slot, level) => {
  const e = sp.effects[slot];
  return calcSpellValue(e[1], e[3], e[4], level);
};

const directiveSlot = (e) => e[2] - 1;   // EQL: 1-based target slot in limit

// sp1 = worn, sp2 = being cast.
export function checkStackConflict(sp1, sp2, level1, level2) {
  if (sp1.id === sp2.id) {
    if (!isStackableDot(sp1) && !hasEffect(sp1, SE_MANABURN)) {
      if (level1 > level2) return hasEffect(sp1, SE_IMPROVEDTAUNT) ? 1 : -1;
      return 1;
    }
    if (hasEffect(sp1, SE_MANABURN)) return -1;
  }

  if (sp1.isBardSong !== sp2.isBardSong &&
      !isDetrimental(sp1) && !isDetrimental(sp2)) return 0;

  let effectMatch = sp1.id === sp2.id;
  if (!effectMatch) {
    effectMatch = true;
    for (let i = 0; i < EFFECT_COUNT; i++) {
      if (sp1.effects[i][0] !== sp2.effects[i][0] ||
          sp1.effects[i][0] === SE_MANABURN) { effectMatch = false; break; }
    }
  }

  if (!effectMatch) {
    for (let i = 0; i < EFFECT_COUNT; i++) {
      const e1 = sp1.effects[i], e2 = sp2.effects[i];

      if (e2[0] === SE_SCREECH && e2[1] === -1 &&
          sp1.effects.some((x) => x[0] === SE_SCREECH && x[1] === 1)) return -1;
      for (let k = 0; k < STACKERS.length; k++) {
        const stacker = STACKERS[k];
        if (e2[0] === stacker) {
          const worn = sp1.effects.filter((x) => x[0] === stacker).map((x) => x[1]);
          if (worn.length && e2[1] <= Math.max(...worn)) return -1;
        }
        if (k > 0 && e2[0] === STACKERS[k - 1] && hasEffect(sp1, stacker)) return -1;
      }

      if (e2[0] === SE_STACKINGCOMMAND_OVERWRITE) {
        const slot = directiveSlot(e2);
        if (slot >= 0 && slot < EFFECT_COUNT &&
            sp1.effects[slot][0] === e2[1] &&
            value(sp1, slot, level1) < e2[4]) return 1;
      } else if (e1[0] === SE_STACKINGCOMMAND_BLOCK) {
        const slot = directiveSlot(e1);
        if (slot >= 0 && slot < EFFECT_COUNT &&
            sp2.effects[slot][0] === e1[1] &&
            value(sp2, slot, level2) < e1[4]) {
          if (!isDetrimental(sp2)) return -1;   // Live 2018: detrimentals bypass
        }
      }
    }
  }

  const sp1Det = isDetrimental(sp1), sp2Det = isDetrimental(sp2);

  let willOverwrite = false, valuesEqual = true;
  for (let i = 0; i < EFFECT_COUNT; i++) {
    const e1 = sp1.effects[i], e2 = sp2.effects[i];
    if (isBlankSlot(e1) || isBlankSlot(e2)) continue;
    if (e1[0] !== e2[0]) continue;
    if (BARD_ONLY_STACK_EFFECTS.has(e1[0]) &&
        sp1.isBardSong && sp2.isBardSong) continue;
    if (IGNORED_IN_STACKING.has(e1[0])) continue;
    if ((e1[0] === SE_ARMORCLASS || e1[0] === SE_ACV2) && e2[1] < 0) continue;
    if (e1[0] === SE_COMPLETEHEAL) return -1;
    if (e1[0] === SE_CURRENTHP && sp1.id !== sp2.id && sp1Det && sp2Det) continue;

    let v1 = value(sp1, i, level1), v2 = value(sp2, i, level2);

    if (e1[0] === SE_MOVEMENTSPEED) {
      if (v1 < 0 && v2 > 0) return -1;
      if (v2 < 0 && v1 > 0) continue;
    }

    if (sp1.buffDuration > 0 && sp2.buffDuration > 0 && e1[0] === SE_CURRENTHP) {
      if (!sp1Det && sp2Det) continue;
      if (sp1Det && !sp2Det) return -1;
    }

    if (e1[0] === SE_ATTACKSPEED || e1[0] === SE_ATTACKSPEED2) { v1 -= 100; v2 -= 100; }
    v1 = Math.abs(v1); v2 = Math.abs(v2);

    if (v2 < v1) return -1;
    if (v2 !== v1) valuesEqual = false;
    willOverwrite = true;
  }

  if (willOverwrite) {
    if (valuesEqual && effectMatch && !isGroupSpell(sp2) && isGroupSpell(sp1)) return -1;
    return 1;
  }
  return 0;
}
