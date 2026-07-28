// Human-friendly effect phrases for the Browse / class list summaries.
//
// A PHRASING layer on top of the presentation core (presentation.js): it
// consumes presentEffect() output, so the evidence ladder, level caps,
// resolver names, suppressions and ✓ marks all carry through unchanged. It
// only rewrites HOW a published claim reads ("Dmg 43" → "Deals 43 damage");
// it never publishes a number the registry didn't. Design note:
// scratch/FRIENDLY-SUMMARY-DESIGN.md. The wiki description regeneration will
// port this table to Python beside presentation.py (same twin pattern).

import { EFFECT_LABELS, spaName, capLevel } from "./data.js";
import { formatValue, isPaddingRow, presentEffect } from "./presentation.js";

// SPA groupings for verb-led magnitude phrases.
const MANA_SPA = 15;
const COUNTER_SPAS = { 35: "disease", 36: "poison", 116: "curse" };
const MOVEMENT_SPA = 3;
const ATTACK_SPEED_SPAS = new Set([11, 98]);  // §3 approved delta wording
const DAMAGE_SHIELD_SPA = 59;

// James's reviewed label shortening for the effect lines
// (scratch/effect-verb-shortening.md, 2026-07-28). LISTS/wiki only — the
// Browse effect-filter dropdown keeps the full EFFECT_LABELS names.
const SHORT_LABELS = new Map([
  ["Damage", "Dmg"], ["Healing", "Heal"], ["Armor Class", "AC"],
  ["Strength", "STR"], ["Max Hit Points", "Max HP"], ["Damage Shield", "DS"],
  ["Fire Resist", "FR"], ["Magic Resist", "MR"], ["Cold Resist", "CR"],
  ["Poison Resist", "PR"], ["Disease Resist", "DR"],
  ["Movement Speed", "Move"], ["Agility", "AGI"], ["Dexterity", "DEX"],
  ["Attack Power", "Attack"], ["Charisma", "CHA"], ["Endurance", "END"],
  ["Stamina", "STA"], ["Wisdom", "WIS"], ["Intelligence", "INT"],
  ["Faction Modifier", "Faction"], ["Modify Hate", "Hate"],
  ["Reflect Melee Damage", "Reflect"],
  ["HP Regen While Stationary", "HP Regen"],
  ["Spell Shield", "SS"], ["Spell Damage Rune", "SDR"],
]);
const L = (name) => SHORT_LABELS.get(name) || name;

// "Strength (STR)" -> "STR"; "Melee Haste" -> "Melee Haste".
function abbrev(spa) {
  const label = EFFECT_LABELS[spa] || spaName(spa);
  const m = /\(([^)]+)\)\s*$/.exec(label);
  return m ? m[1] : label;
}

// Label without a trailing parenthetical (used when a qualifier follows).
function plainLabel(spa) {
  const label = EFFECT_LABELS[spa] || spaName(spa);
  return label.replace(/\s*\([^)]+\)\s*$/, "");
}

function plural(n, word) { return `${n} ${word}${n === 1 ? "" : "s"}`; }

// Label-first phrase for a PUBLISHED magnitude (pres.kind === "value"):
// "Max Hit Points: +11 (L1) to +20 (L10)" — the effect leads, the numbers
// follow (James). `rng` (optional) = {v2, from, to}: the same magnitude at
// the top of its level-scaling range, rendered wiki-style so a per-cast
// RANDOM range ("between X and Y") can't be confused with level growth.
function valuePhrase(e, v, sp, rng) {
  const spa = e.effect_id;
  const isDot = (sp?.buff_duration_formula || 0) > 0 || (sp?.buff_duration || 0) > 0;
  const v2 = rng ? rng.v2 : undefined;
  // Formats one value via `f`, or the level range with `f` applied to BOTH
  // endpoints ("+34% (L9) to +55% (L50)").
  const fr = (f, a, b) => rng ? `${f(a)} (L${rng.from}) to ${f(b)} (L${rng.to})` : f(a);
  const plain = (unit = "") => (x) => `${Math.abs(x).toLocaleString()}${unit}`;
  const signed = (unit = "") => (x) =>
    `${x < 0 ? "−" : "+"}${Math.abs(x).toLocaleString()}${unit}`;
  if (spa === 0 || spa === 79 || spa === 100) {
    const r = fr(plain(), v, v2);
    // sign of the RAW base (fall back to max) decides harm/help — formula
    // output sign is not reliable (same rule as the legacy summary branch)
    const src = e.base_value !== 0 ? e.base_value : e.max_value;
    const harmful = src < 0;
    const perTick = spa === 100 || (spa === 0 && isDot);
    return `${L(harmful ? "Damage" : "Healing")}: ${r}${perTick ? " per tick" : ""}`;
  }
  if (spa === MANA_SPA) {
    return `${L("Mana")}: ${fr(signed(), v, v2)}${isDot ? " per tick" : ""}`;
  }
  if (spa in COUNTER_SPAS) {
    const kind = COUNTER_SPAS[spa];
    const cap = kind.charAt(0).toUpperCase() + kind.slice(1);
    return v < 0 ? `Cure ${cap}: ${plural(-v, "counter")}`
                 : `${cap} Counter: +${v}`;
  }
  if (spa === MOVEMENT_SPA) {
    if (v <= -95) return "Stops movement";   // e.g. Minor Illusion's −7000
    return `${L("Movement Speed")}: ${fr(signed("%"), v, v2)}`;
  }
  if (ATTACK_SPEED_SPAS.has(spa)) {
    // §3 delta semantics (value − 100%-of-normal); the label carries the
    // direction (James): Slow when negative, Haste when positive.
    const d = v - 100, d2 = v2 === undefined ? undefined : v2 - 100;
    if (d === 0) return formatValue(spa, v);
    return `${L(d < 0 ? "Slow" : "Haste")}: ${fr(plain("%"), d, d2)}`;
  }
  if (spa === DAMAGE_SHIELD_SPA) {
    // damage shields store harm as negative (client renders abs)
    return v < 0 ? `${L("Damage Shield")}: ${fr(plain(), v, v2)}`
                 : `${L("Damage Shield")} Mitigation: ${fr(plain(), v, v2)}`;
  }
  return `${L(plainLabel(spa))}: ${fr(signed(), v, v2)}`;
}

// "≤L55" cap parts become a trailing "(up to L55)" qualifier.
function splitCaps(parts) {
  const caps = [], rest = [];
  for (const p of parts) {
    if (/^≤L\d+$/.test(p.text || "")) caps.push(p.text.replace(/^≤L/, "up to L"));
    else rest.push(p);
  }
  return { caps, rest };
}

// Whether the top-of-range value can ride in the same phrase (a direction
// flip or a special-cased form falls back to the single own-level value).
function rangeUsable(spa, v, v2) {
  if (v2 === undefined || v2 === null || v2 === v) return false;
  if (spa === 11 || spa === 98) {
    const d = v - 100, d2 = v2 - 100;
    return d !== 0 && d2 !== 0 && (d < 0) === (d2 < 0);
  }
  if (spa === MOVEMENT_SPA && v <= -95) return false;   // "Stops movement"
  if (spa in COUNTER_SPAS) return false;                 // counters stay single
  return (v >= 0) === (v2 >= 0);
}

// One friendly phrase for one effect row, or "" (suppressed). Mirrors the
// contract of the legacy summary branch in views.js. With `rangeTo` set
// (list pages), a level-scaling magnitude reads as its growth range with the
// levels annotated: "Deals 8→43 damage (L4→L26)".
export function friendlyEffect(e, level, sp, resolvers, rangeTo) {
  const ctx = { level,
                isDuration: (sp?.buff_duration_formula || 0) > 0,
                beneficial: !!(sp?.good_effect),
                teleportZone: sp?.teleport_zone || null,
                spellName: resolvers?.spellName || null,
                raceName: resolvers?.raceName || null };
  const pres = presentEffect(e.effect_id, e.base_value || 0, e.limit_value || 0,
                             e.max_value || 0, e.formula || 0, ctx);
  if (pres.kind === "suppressed") return "";
  const mark = pres.publication === "fact"
    ? ' <span class="fact-mark" title="EQL-grounded">✓</span>' : "";
  if (pres.kind === "value") {
    let rng;
    if (rangeTo && rangeTo !== level) {
      const top = presentEffect(e.effect_id, e.base_value || 0, e.limit_value || 0,
                                e.max_value || 0, e.formula || 0,
                                { ...ctx, level: rangeTo });
      if (top.kind === "value" && rangeUsable(e.effect_id, pres.value, top.value)) {
        const cap = capLevel(e.base_value || 0, e.formula || 0, e.max_value || 0);
        rng = { v2: top.value, from: level,
                to: cap === null ? rangeTo : Math.min(cap, rangeTo) };
      }
    }
    return wrapNums(escapeHtml(valuePhrase(e, pres.value, sp, rng))) + mark;
  }
  // SPA 20 Blind: EQEmu's SE_Blind handler CURES when the spell is beneficial
  // with zero duration (spell_effects.cpp "'cure blind'") — without this,
  // Cure Blindness reads as "Blind".
  if (e.effect_id === 20 && sp?.good_effect &&
      !(sp?.buff_duration || sp?.buff_duration_formula)) {
    return "Cure Blindness" + mark;
  }
  // Semantic rows: friendly-case the bare label, fold caps into a qualifier,
  // keep every other part's text verbatim (reference wording stays qualified).
  const { caps, rest } = splitCaps(pres.parts);
  const texts = rest.map(p => {
    if (p.role === "label" && p.text === spaName(e.effect_id)) {
      return caps.length ? plainLabel(e.effect_id) : (EFFECT_LABELS[e.effect_id] || p.text);
    }
    return p.text;
  }).filter(Boolean);
  // "stun · 1s · …" reads label-first: "Stun: 1s · …"
  if (texts[0] === "stun" && /^[\d.]+s$/.test(texts[1] || "")) {
    texts.splice(0, 2, `Stun: ${texts[1]}`);
  }
  // "item #10342" (approved CreateItem form) reads as "Summons item #10342"
  if (/^item #\d+$/.test(texts[0] || "")) texts[0] = `Summons ${texts[0]}`;
  let out = wrapNums(escapeHtml(texts.join(" · ")));
  // a row whose parts carry no text stays hidden (raw-only rows, e.g.
  // teleport coordinates) — same as the legacy summary
  if (!out) return "";
  out = out.charAt(0).toUpperCase() + out.slice(1);
  if (caps.length) out += ` <span class="muted">(${caps.map(c => wrapNums(c)).join(", ")})</span>`;
  return out + mark;
}

// Drop-in replacement for the list summary: same filtering, first-5, dedupe
// and "+N more" rules as the legacy effectsSummary.
export function friendlySummary(effs, level, sp, resolvers, rangeTo) {
  // 148/149 stacking directives are LIST noise ("AC (#1) · slot 3 · ≥ 100");
  // they stay on the detail page. James flagged the triplet as unreadable
  // (2026-07 walkthrough) — the stacking-UX rethink is a backlog item.
  const meaningful = effs.filter(e =>
    e.effect_id !== 254 && e.effect_id !== 148 && e.effect_id !== 149 &&
    !isPaddingRow(e.effect_id, e.base_value,
                  e.limit_value, e.max_value, e.formula));
  const shown = meaningful.slice(0, 5);
  const parts = shown.map(e => friendlyEffect(e, level, sp, resolvers, rangeTo)).filter(Boolean);
  const seen = new Set();
  const deduped = parts.filter(p => !seen.has(p) && seen.add(p));
  const extra = meaningful.length - shown.length;
  // one line per effect (James); an effect's own qualifiers stay inline
  return deduped.map(p => `<div class="fx-line">${p}</div>`).join("") +
         (extra > 0 ? `<div class="fx-line muted">+${extra} more</div>` : "");
}

// Numeric tokens (values, %/s units, "(LN)" markers) get a fixed-width face
// so numbers pop out of the prose. Runs on ESCAPED text, before any HTML
// spans are appended.
function wrapNums(s) {
  return s.replace(/((?:[+−]\s?)?\d[\d,]*(?:\.\d+)?(?:%|s\b)?|\(L\d+\))/g,
                   '<span class="num">$1</span>');
}

function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
