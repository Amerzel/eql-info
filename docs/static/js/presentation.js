// Shared effect-presentation kernel (Phase 5A.4) — the JS twin of
// src/eqltools/spells/presentation.py, consuming the GENERATED registry
// (field_semantics.js). Parity-gated: tests byte-compare Python vs JS
// presentations over a deterministic vector set + the real corpus (private).
// Keep the two in lockstep — edit the Python source of truth first.
//
// Differential-grounding policy (plan §8-5A.4): unmarked values use pinned
// reference semantics by default; every effect-bearing surface carries a nearby
// disclosure; rare `fact` claims get a visible "EQL-grounded" marker;
// inferred/unknown stay conservative as labelled raw. Consumers key on
// `publication`, not `markedReference`.

import { FIELD_SEMANTICS } from "./field_semantics.js";
import { displayedValue, confidenceTier, spaName } from "./data.js";

// §8 friendly grounding legend (design pass D1): compact, user-facing, with
// the community feedback channel. The ✓ stays the rare positive marker.
export const DISCLOSURE =
  "Spell data is modeled from EverQuest reference sources; ✓ marks values " +
  "confirmed in EQL. Spot something off? Ping Amerzel on the official EQL Discord.";

// §3 surface formatter (design pass D1): SPA 11/98 store attack speed as a
// percent of normal (40 = slowed to 40%, 160 = hasted to 160%); players care
// about the DELTA. Wording candidate (a) — pending James's pick at the D1
// checkpoint. Value core untouched; this formats DISPLAY only.
export function formatValue(eid, value) {
  if ((eid === 11 || eid === 98) && value !== null && value !== 0) {
    const d = value - 100;
    if (d === 0) return "No attack-speed change";
    return d < 0 ? `Slows attack speed by ${-d}%`
                 : `Increases attack speed by ${d}%`;
  }
  return value === null ? "" : String(value);
}

// The ONE approved presentation-padding signature (5A.1 sign-off): the SPA-10
// CHA inert spacer — EXACT and NULL-distinct (null !== 0). Shared by every
// consumer; the generic base==0&&max==0 filter was REJECTED (hid 34 real rows).
export function isPaddingRow(spa, base, limit, mx, formula) {
  return spa === 10 && base === 0 && limit === 0 && mx === 0 && formula === 100;
}

const LADDER = ["fact", "reference", "inferred", "unknown"];
const QUAL = { OBSERVED: "fact", EQL_DATA: "fact", REFERENCE: "reference",
               INFERRED: "inferred", UNKNOWN: "unknown" };

function weakest(quals) {
  if (!quals.length) return "fact";
  return LADDER[Math.max(...quals.map(q => LADDER.indexOf(q)))];
}

const VALUE_ROLES = new Set(["magnitude", "movement-magnitude", "modifier-magnitude"]);
const VALUE_CONSUMED = new Set(["scaling", "cap"]);
const SILENT_ROLES = new Set(["unused", "enable-flag", "instant-flag",
  "beneficial-flag", "unconsumed-parameter", "unconsumed-sentinel",
  "self-reference-equality", "scale-permille", "resource-selector", "cap-amount",
  "pvp-duration-ms"]);  // EQL has no PvP — stun PvP duration never displays
const RAW_ROLES = new Set(["coord-component", "flight-mode", "gender/texture",
  "helm/variant", "target-code", "evac-target"]);

// number formatting identical to Python's `g` for the ms->s case
function gfmt(x) { return String(parseFloat(x.toPrecision(6))); }

const PART_BUILDERS = {
  "chance-pct": v => (v ? `${v}% chance` : null),
  "bind-point-index": v => `bind point ${v}`,
  "success-threshold": v => `success threshold ${v}`,
  "proc-rate-modifier": v => (v ? `proc-rate mod ${v}` : null),
  "proc-type": v => (v ? `proc type ${v}` : null),
  "duration-ms": v => `${gfmt(v / 1000)}s`,
  "item-id": v => `item #${v}`,
  "spa-id": v => `${spaName(v)} (#${v})`,
  "slot": v => `slot ${v}`,
  "threshold": v => (v ? `≥ ${v}` : null),
  "charges/count": v => (v && v > 1 ? `×${v}` : null),
  "dispel-count": v => `Dispel (${v})`,
  "resurrect-pct": v => `Resurrect ${v}%`,
  "negate-mode-enum": v => (v ? `mode ${v}` : null),
  "reclaim-pct": v => (v ? `${v}% reclaimed` : null),
};
for (const sel of ["level-bound", "time-bound-ms", "type-selector", "spa-selector",
                   "spell-selector", "skill-selector", "skill-qualifier",
                   "effect-type-selector", "bound/selector", "selector-bound"]) {
  PART_BUILDERS[sel] = v => (v ? `${sel} ${v}` : null);
}

const FAMILY_KIND = {
  magnitude: "value", movement: "value", "focus-modifier": "focus",
  structural: "structural", control: "control", stun: "stun",
  "spell-ref": "spell-link", "self-ref": "suppressed",
  "spell-limit": "chance-spell", "item-ref": "item-ref", "race-ref": "race",
  stacking: "stacking", teleport: "teleport", pet: "pet",
  dispel: "dispel", resurrect: "resurrect",
  "resource-tap": "reference-model", suppression: "suppression",
  "focus-predicate": "focus", unknown: "unknown",
};

function nameOrId(resolver, ident, prefix) {
  if (resolver) {
    const n = resolver(ident);
    if (n) return n;
  }
  return `${prefix} #${ident}`;
}

/**
 * @param {number} spa
 * @param {number} base
 * @param {number} limit
 * @param {number} mx
 * @param {number} formula
 * @param {{level: number, isDuration?: boolean, beneficial?: boolean,
 *          spellName?: ((id: number) => string|null)|null,
 *          itemName?: ((id: number) => string|null)|null,
 *          raceName?: ((id: number) => string|null)|null,
 *          teleportZone?: string|null}} opts
 */
export function presentEffect(spa, base, limit, mx, formula,
                              { level, isDuration = false, beneficial = false,
                                spellName = null, raceName = null,
                                itemName = null, teleportZone = null }) {
  const ent = FIELD_SEMANTICS[String(spa)];
  const raws = { base, limit, max: mx, formula };
  const mk = (over) => Object.assign({ kind: "unknown", parts: [],
    publication: "unknown", markedReference: false, value: null,
    confidence: "", rawDetail: "" }, over);
  if (!ent) {
    return mk({ rawDetail:
      `Raw base=${base} limit=${limit} max=${mx} formula=${formula}` });
  }
  const fam = ent.family;
  let kind = FAMILY_KIND[fam] || "unknown";
  const parts = [];
  const rawBits = [];
  let value = null, confidence = "";
  const F = (n) => ent.fields[n];

  if (fam === "self-ref") {
    return mk({ kind: "suppressed", publication: "fact" });
  }

  if (VALUE_ROLES.has(F("base").role)) {
    const consumed = [F("base").evidence];
    consumed.push(VALUE_CONSUMED.has(F("formula").role) ? F("formula").evidence
                                                        : "UNKNOWN");
    if (VALUE_CONSUMED.has(F("max").role)) consumed.push(F("max").evidence);
    else if (raws.max) consumed.push(F("max").evidence);
    const qual = weakest(consumed.map(e => QUAL[e]));
    if (qual === "fact" || qual === "reference") {
      value = displayedValue(spa, base, formula, mx, level, isDuration);
      confidence = confidenceTier(spa, formula);
      parts.push({ field: "base", role: F("base").role, text: String(value),
                   qualification: qual, linkSpellId: null, rawValue: base });
    } else {
      rawBits.push(`base=${base} formula=${formula} max=${mx}`);
    }
  }

  for (const fname of ["base", "limit", "max", "formula"]) {
    const fm = F(fname);
    const role = fm.role, v = raws[fname === "max" ? "max" : fname];
    if (fname === "base" && VALUE_ROLES.has(F("base").role)) continue;
    if (VALUE_CONSUMED.has(role) && VALUE_ROLES.has(F("base").role)) continue;
    if (SILENT_ROLES.has(role)) continue;
    if (fm.evidence === "UNKNOWN" || role === "unresolved") {
      if (v !== null && v !== 0) rawBits.push(`${fname}=${v} (${role})`);
      continue;
    }
    if (role === "spell-id") {
      parts.push({ field: fname, role, text: nameOrId(spellName, v, "spell"),
                   qualification: QUAL[fm.evidence], linkSpellId: v, rawValue: null });
      continue;
    }
    if (role === "race-id") {
      parts.push({ field: fname, role, text: nameOrId(raceName, v, "race"),
                   qualification: QUAL[fm.evidence], linkSpellId: null, rawValue: null });
      continue;
    }
    // dbstr type 44 ("Summoned: <name>" by ITEM id) — client data; absence
    // degrades to the honest "item #id".
    if (role === "item-id") {
      parts.push({ field: fname, role, text: nameOrId(itemName, v, "item"),
                   qualification: QUAL[fm.evidence], linkSpellId: null, rawValue: v });
      continue;
    }
    if (role === "target-level-cap") {
      // stun caps suppressed when beneficial (Harvest 255 sentinel); CONTROL
      // caps are real regardless of the flag (lull line is beneficial-flagged).
      const show = v > 0 && (fam !== "stun" || !beneficial);
      if (show) {
        parts.push({ field: fname, role, text: `≤L${v}`,
                     qualification: QUAL[fm.evidence], linkSpellId: null, rawValue: v });
      }
      continue;
    }
    if (RAW_ROLES.has(role)) {
      if (v !== null && v !== 0) rawBits.push(`${fname}=${v} (${role})`);
      continue;
    }
    const builder = PART_BUILDERS[role];
    if (!builder) {
      if (v !== null && v !== 0) rawBits.push(`${fname}=${v} (${role}, unmapped)`);
      continue;
    }
    const text = builder(v);
    if (text !== null) {
      parts.push({ field: fname, role, text, qualification: QUAL[fm.evidence],
                   linkSpellId: null, rawValue: v });
    }
  }

  if (["structural", "control", "focus-predicate", "pet", "stun"].includes(fam)) {
    let label = fam === "stun" ? "stun" : spaName(spa);
    if (fam === "pet" && teleportZone) {
      parts.unshift({ field: "", role: "label", text: `Summons: ${teleportZone}`,
                      qualification: "fact", linkSpellId: null, rawValue: null });
    } else {
      parts.unshift({ field: "", role: "label", text: label,
                      qualification: "reference", linkSpellId: null, rawValue: null });
    }
  } else if (fam === "teleport") {
    // one semantic claim per spell: only the ACTION SPA (83/88/104) carries the
    // target part; SPA 146 coord rows carry raw detail only.
    if ([83, 88, 104].includes(spa)) {
      if (teleportZone) {
        parts.unshift({ field: "", role: "teleport-target",
                        text: `Teleport target: ${teleportZone}`,
                        qualification: "fact", linkSpellId: null, rawValue: null });
      } else {
        parts.unshift({ field: "", role: "label", text: "Teleport",
                        qualification: "reference", linkSpellId: null, rawValue: null });
      }
    }
  } else if (fam === "resource-tap") {
    const res = { 0: "HP", 1: "mana", 2: "endurance" }[limit] ?? `resource ${limit}`;
    parts.length = 0;
    parts.push({ field: "", role: "reference-model",
      text: `Reference model: returns ${gfmt(base / 10)}% of spell damage as ` +
            `${res}, capped at ${mx} per damage event`,
      qualification: "reference", linkSpellId: null, rawValue: null });
    rawBits.push(`base=${base} limit=${limit} max=${mx}`);
  } else if (fam === "suppression") {
    parts.unshift({ field: "", role: "label", text: "Suppress",
                    qualification: "reference", linkSpellId: null, rawValue: null });
  }

  const publication = parts.length ? weakest(parts.map(p => p.qualification))
                                   : (rawBits.length ? "unknown" : "fact");
  if (kind === "value" && value === null && !parts.length) kind = "unknown";
  return {
    kind, parts, publication,
    markedReference: parts.some(p => p.qualification === "reference"),
    value, confidence,
    rawDetail: rawBits.length ? "Raw " + rawBits.join("; ") : "",
  };
}

export function presentationText(pres) {
  return pres.parts.map(p => p.text).filter(Boolean).join(" · ");
}
