// Spell Upgrade (mote tier) prototype — category-based scaling model.
//
// The tier system is SERVER-PUSHED: none of this lives in spells_us.txt.
// Rates below are reverse-engineered from n=88 tooltip observations
// (spell-upgrades/STATUS.md, 2026-07-20). Scaling is CATEGORY-based:
//
//   category          cast     mana     duration
//   nuke / lifetap    -2%/t    -2%/t    n/a          (all solid)
//   DoT-flagged       -4%/t    -2%/t    +5%/t        (all solid)
//   heal              -4%/t    -2%/t    n/a          (solid)
//   HoT               -4%/t    -2%/t    +5%/t        (duration inferred)
//   debuff            -4%/t    -4%/t    +10%/t       (duration inferred)
//   CC (charm/mez)    -4%/t    -4%/t    +10%/t       (solid)
//   buff              -4%/t    -4%/t    +10%/t       (solid)
//
// Universal: recovery -2%/t (nearest 0.1s, ties DOWN); reuse -2%/t
// (display floor-truncated, hard floor 1s); resist base-15*t; motes to
// next tier = 2^tier. Instant and Permanent durations are exempt.
//
// Combat-observed only (tooltip-hidden): nuke damage floor(base*(1+0.06t))
// (exact on Expulse Undead T1-T5); heals ~+3%/t (single datapoint).
//
// PROC RULE (James, 2026-07-27): a parent's Spell Level applies to its
// proc'd spell at HALF rate — Level X parent -> Level V proc (floor(N/2)).
// CHARM RULE (James, 2026-08-03, in-game): each Spell Level raises a charm
// spell's target-level cap (SPA 22 max_value) by +1.

import { MAX_LEVEL, displayedValue } from "./data.js";
import { formatValue } from "./presentation.js";
import { renderDuration, substitute } from "./text.js";
import { escapeHtml } from "./text.js";

const TIER_MAX = 10; // reagent-skip patch note implies cap 10; unverified.

const CATEGORIES = {
  nuke:   { label: "Nuke / lifetap", cast: 0.02, mana: 0.02, dur: null, durConf: null,       conf: "solid" },
  dot:    { label: "DoT",            cast: 0.04, mana: 0.02, dur: 0.05, durConf: "solid",    conf: "solid" },
  heal:   { label: "Heal",           cast: 0.04, mana: 0.02, dur: null, durConf: null,       conf: "solid" },
  hot:    { label: "Heal over time", cast: 0.04, mana: 0.02, dur: 0.05, durConf: "inferred", conf: "solid" },
  debuff: { label: "Debuff",         cast: 0.04, mana: 0.04, dur: 0.10, durConf: "inferred", conf: "solid" },
  cc:     { label: "Charm / mez",    cast: 0.04, mana: 0.04, dur: 0.10, durConf: "solid",    conf: "solid" },
  buff:   { label: "Buff",           cast: 0.04, mana: 0.04, dur: 0.10, durConf: "solid",    conf: "solid" },
  pet:    { label: "Pet summon",     cast: 0.04, mana: 0.04, dur: null, durConf: null,       conf: "inferred" },
  other:  { label: "Uncategorized",  cast: 0.04, mana: 0.04, dur: 0.10, durConf: "inferred", conf: "inferred" },
};

// SPA ids: 0 = HP (damage when base<0, heal when >0), 100 = HoT, 22 = charm,
// 31 = mez.
export function classifyUpgradeCategory(spell, effects) {
  const hasDur = (spell.buff_duration_formula || 0) > 0 &&
                 spell.buff_duration_formula !== 50 &&
                 (spell.buff_duration || 0) > 0;
  const isPerm = spell.buff_duration_formula === 50;
  const dmg  = effects.some(e => e.effect_id === 0 && e.base_value < 0);
  const heal = effects.some(e => (e.effect_id === 0 && e.base_value > 0) ||
                                 e.effect_id === 100);
  const cc   = effects.some(e => e.effect_id === 22 || e.effect_id === 31);

  let key;
  if (spell.good_effect === 0) {
    if (cc) key = "cc";
    else if (dmg && (hasDur || isPerm)) key = "dot";
    else if (dmg) key = "nuke";
    else key = "debuff";
  } else {
    const isPet = !!(spell.teleport_zone && spell.teleport_zone.startsWith("PCPet"));
    if (isPet) key = "pet";
    else if (heal && !hasDur && !isPerm) key = "heal";
    else if (heal && hasDur) key = "hot";
    else if (hasDur || isPerm) key = "buff";
    else key = "other";
  }
  return { key, ...CATEGORIES[key] };
}

// ---- rounding helpers matching observed tooltip behavior -----------------

const roundHalfDown = x => Math.ceil(x - 0.5);

function fmt2(x) { // cast: 2 decimals, trailing zeros trimmed
  return x.toFixed(2).replace(/\.?0+$/, "");
}

function fmtTicks(ticks) {
  const secs = ticks * 6;
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60), s = secs % 60;
  return s ? `${m} min ${s}s` : `${m} min`;
}

// ---- per-tier computation ------------------------------------------------

function computeTiers(spell, effects, cat) {
  const castS = (spell.cast_time || 0) / 1000;
  const recS  = (spell.recovery_time || 0) / 1000;
  const reuseS = (spell.recast_time || 0) / 1000;
  const durTicks = spell.buff_duration || 0;
  const isPerm = spell.buff_duration_formula === 50;
  const hasDur = cat.dur !== null && !isPerm && durTicks > 0 &&
                 (spell.buff_duration_formula || 0) > 0;
  const isDurationSpell = (spell.buff_duration_formula || 0) > 0;

  // SPA 0 = per-tick HP on duration spells / the whole hit on instants;
  // SPA 79 = the separate one-time initial hit on DD+DoT hybrids.
  const dmgEff  = effects.find(e => e.effect_id === 0 && e.base_value < 0);
  const initEff = effects.find(e => e.effect_id === 79 && e.base_value < 0);
  const healEff = effects.find(e => e.effect_id === 0 && e.base_value > 0);
  const dmgAtCap = dmgEff ? Math.abs(displayedValue(
    0, dmgEff.base_value, dmgEff.formula, dmgEff.max_value, MAX_LEVEL, isDurationSpell)) : 0;
  const initAtCap = initEff ? Math.abs(displayedValue(
    79, initEff.base_value, initEff.formula, initEff.max_value, MAX_LEVEL, false)) : 0;
  const healAtCap = healEff ? Math.abs(displayedValue(
    0, healEff.base_value, healEff.formula, healEff.max_value, MAX_LEVEL, false)) : 0;

  const tiers = [];
  for (let t = 0; t <= TIER_MAX; t++) {
    tiers.push({
      mana:  spell.mana > 0 ? Math.round(spell.mana * (1 - cat.mana * t)) : null,
      cast:  fmt2(castS * (1 - cat.cast * t)),
      rec:   (roundHalfDown(recS * (1 - 0.02 * t) * 10) / 10).toFixed(1),
      reuse: Math.max(1, Math.floor(reuseS * (1 - 0.02 * t))),
      dur:   hasDur ? Math.round(durTicks * (1 + cat.dur * t)) : null,
      resist: spell.good_effect === 0 ? (spell.resist_difficulty || 0) - 15 * t : null,
      dmg:   dmgAtCap ? Math.floor(dmgAtCap * (1 + (cat.key === "dot" ? 0.03 : 0.06) * t)) : null,
      init:  initAtCap ? Math.floor(initAtCap * (1 + 0.06 * t)) : null,
      heal:  healAtCap ? Math.round(healAtCap * (1 + 0.03 * t)) : null,
    });
  }
  return { tiers, hasDur, isPerm, dmgAtCap, healAtCap };
}

// ---- rendering -----------------------------------------------------------

const Q = `<span class="tier-badge tier-inferred" title="Not yet verified in EQL — extrapolated">?</span>`;

function valCell(base, upgraded, unit = "") {
  if (upgraded === null || upgraded === undefined || String(upgraded) === String(base)) {
    return `${base}${unit}`;
  }
  return `${base}${unit} <span class="upg-paren">(${upgraded}${unit})</span>`;
}

// ── D2 (design pass §7): Modeled Upgrades as a FIRST-CLASS control ─────────
// The tier slider sits beside the caster-level slider; the MAIN Stats table
// updates in place; the Description re-renders through the EXISTING substitute
// pipeline fed with MODELED inputs (uniform base+cap scaling keeps ranges as
// ranges — the 4.4/§7 description contract; tier 0 is byte-identical to the
// source render). Damage/heal/initial-hit are at-cap quantities and are NOT
// composed with the caster-level column (order of operations unverified — the
// same discipline as focus effects); they render as their own modeled line.

// Spell Levels display as roman numerals (in-game style): blank at 0, I..X.
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// Level chip shared by stats/description/value cells.
export function levelChip(upg) {
  return upg > 0
    ? ` <span class="upg-chip" title="Modeled Spell Level — server-side upgrade system, reverse-engineered rates">Level ${ROMAN[upg]}</span>`
    : "";
}

// Which model quantity (if any) scales this effect row.
export function upgradeKind(eid, base) {
  if (eid === 0 && base < 0) return "dmg";
  if ((eid === 0 && base > 0) || eid === 100) return "heal";
  if (eid === 79 && base < 0) return "init";
  return "none";
}

// James's direction (D2 review): caster level gives the BASE value; the Spell
// Level multiplies it. The per-tier multiplier is level-independent by model
// assumption (multiplicative % system; rates observed at L50).
export function applyUpgrade(kind, value, upg, rates) {
  if (!upg || !rates || kind === "none" || value === null) return value;
  const sign = value < 0 ? -1 : 1;
  const mag = Math.abs(value);
  if (kind === "dmg") return sign * Math.floor(mag * (1 + rates.dmgRate * upg));
  if (kind === "init") return sign * Math.floor(mag * (1 + 0.06 * upg));
  if (kind === "heal") return sign * Math.round(mag * (1 + rates.healRate * upg));
  return value;
}

// Live refresh of the Scaling-values grid: composes the caster-level slider
// (base value) with the Spell Level (multiplier). Shared by BOTH sliders.
export function refreshValueCells() {
  const lvlSlider = document.querySelector("[data-level-slider]");
  const level = lvlSlider ? Math.max(1, Math.min(+(/** @type {HTMLInputElement} */ (lvlSlider)).value || MAX_LEVEL, MAX_LEVEL)) : MAX_LEVEL;
  const panel = document.querySelector("[data-upgrade]");
  const upgSlider = document.querySelector("[data-upgrade-slider]");
  const upg = (panel && upgSlider) ? Math.max(0, Math.min(+(/** @type {HTMLInputElement} */ (upgSlider)).value || 0, TIER_MAX)) : 0;
  const rates = panel ? JSON.parse(panel.getAttribute("data-upgrade")) : null;
  for (const cell of document.querySelectorAll("[data-level-cell]")) {
    const d = /** @type {HTMLElement} */ (cell).dataset;
    const mark = cell.querySelector(".fact-mark");
    const base = displayedValue(+d.eid, +d.base, +d.formula, +d.max, level, d.dur === "1");
    const kind = d.upg || "none";
    const scaled = applyUpgrade(kind, base, upg, rates);
    cell.innerHTML = escapeHtml(formatValue(+d.eid, scaled)) +
      (kind !== "none" ? levelChip(upg) : "");
    if (mark) cell.appendChild(mark);
  }
  for (const cell of document.querySelectorAll("[data-cap-cell]")) {
    const d = /** @type {HTMLElement} */ (cell).dataset;
    const capVal = displayedValue(+d.eid, +d.base, +d.formula, +d.max, +d.cap, d.dur === "1");
    const kind = d.upg || "none";
    const scaled = applyUpgrade(kind, capVal, upg, rates);
    cell.innerHTML = `Caps at L${d.cap}: ${escapeHtml(formatValue(+d.eid, scaled))}` +
      (kind !== "none" ? levelChip(upg) : "");
  }
  // CHARM RULE (James, in-game, 2026-08-03): upgrading a charm spell raises
  // its target-level cap by +1 per Spell Level rank.
  for (const el of document.querySelectorAll("[data-charm-cap]")) {
    const base = +(/** @type {HTMLElement} */ (el).dataset.capBase) || 0;
    el.innerHTML = `≤L${base + upg}${upg > 0 ? levelChip(upg) : ""}`;
  }
}

export function renderUpgradeControl(spell, effects, selTier = 0) {
  if (spell.is_discipline) return "";
  const cat = classifyUpgradeCategory(spell, effects);
  const c = computeTiers(spell, effects, cat);

  const payload = escapeHtml(JSON.stringify({
    tiers: c.tiers,
    hasDur: c.hasDur, isPerm: c.isPerm,
    durFormula: spell.buff_duration_formula || 0,
    durTicks: spell.buff_duration || 0,
    durRate: cat.dur,
    dmgRate: cat.key === "dot" ? 0.03 : 0.06,
    healRate: 0.03,
    catLabel: cat.label,
  }));

  return `
    <div class="tier-panel" data-upgrade='${payload}' data-spell-id="${spell.id}">
      <div class="tier-label-row">
        <label>Spell Level <output data-u="tier">${ROMAN[selTier]}</output></label>
        <details class="help-pop"><summary aria-label="How this model works"
            title="How this model works">?</summary>
          <div class="help-body"><p class="muted">The upgrade system is
          <em>server-side</em> — none of these numbers come from client data.
          Rates are reverse-engineered from community tooltip captures
          (category: <strong>${escapeHtml(cat.label)}</strong>
          · cast −${cat.cast * 100}%/tier · mana −${cat.mana * 100}%/tier${cat.dur ? ` · duration +${cat.dur * 100}%/tier` : ""}
          · recovery/reuse −2%/tier). Damage/heal scaling is combat-observed at
          L${MAX_LEVEL} and is not combined with the caster-level column (order of
          operations unverified). Tier cap assumed ${TIER_MAX}. Your own AAs and
          stances further modify costs.${effects.some(e => e.effect_id === 22)
            ? " <strong>Charm:</strong> each Spell Level raises the charmable target-level cap by 1 (in-game observed)."
            : ""} <a href="#/upgrades">Full model →</a></p></div>
        </details>
      </div>
      <input type="range" min="0" max="${TIER_MAX}" value="${selTier}" step="1"
             data-upgrade-slider aria-label="Spell Level"
             aria-valuemin="0" aria-valuemax="${TIER_MAX}" aria-valuenow="${selTier}">
    </div>`;
}

// Per-tier stat values for the MAIN Stats table (base shown, modeled swap-in).
export function tierStats(tiers, tier) {
  return tiers[Math.max(0, Math.min(tier, tiers.length - 1))];
}

// Live update: tier slider moved. Rewrites the Stats cells, the modeled line,
// and re-renders the Description through substitute() with MODELED inputs.
export function updateUpgradePanel(slider) {
  const panel = slider.closest("[data-upgrade]");
  if (!panel) return;
  const d = JSON.parse(panel.getAttribute("data-upgrade"));
  const tier = Math.max(0, Math.min(+slider.value || 0, TIER_MAX));
  const out = panel.querySelector("[data-u=tier]");
  if (out) out.textContent = ROMAN[tier];
  slider.setAttribute("aria-valuenow", String(tier));
  const t = d.tiers[tier];

  // 1) main Stats cells (data-s hooks): base stays, modeled value swaps in.
  //    ONE Level chip in the section heading marks the modeled state — the
  //    per-cell chips ran ragged (James, design feedback).
  const setStat = (key, text) => {
    const cell = document.querySelector(`[data-s=${key}]`);
    if (cell) cell.innerHTML = text;
  };
  setStat("mana", t.mana !== null ? String(t.mana) : "");
  setStat("cast", `${t.cast}s`);
  setStat("rec", `${t.rec}s`);
  setStat("reuse", `${t.reuse}s`);
  if (t.resist !== null) setStat("resist", String(t.resist));
  if (d.hasDur && t.dur !== null) setStat("dur", fmtTicks(t.dur));
  const headChip = document.querySelector("[data-s-chip]");
  if (headChip) headChip.innerHTML = tier > 0 ? levelChip(tier).trim() : "";

  // 2) the Scaling-values grid composes caster level x Spell Level
  refreshValueCells();
  // notify proc summaries (they upgrade at HALF the parent's Spell Level)
  document.dispatchEvent(new CustomEvent("eql:upgrade-changed"));

  // 3) Description: re-render via the ORIGINAL pipeline with modeled inputs.
  //    Uniform base+cap scaling per supported slot keeps ranges as ranges
  //    (§7 contract); tier 0 restores the exact source render.
  const desc = /** @type {HTMLElement|null} */ (document.querySelector(".desc-rendered"));
  if (desc && desc.dataset.descTemplate !== undefined) {
    const tmpl = desc.dataset.descTemplate;
    const effs = JSON.parse(desc.dataset.descEffects || "[]");
    const durBase = desc.dataset.descDuration || "";
    if (tier === 0) {
      desc.innerHTML = desc.dataset.descOriginal;
    } else {
      const scaled = effs.map(e => {
        const r = { ...e };
        if (e.effect_id === 0 && e.base_value < 0) {          // damage slots
          r.base_value = -Math.floor(Math.abs(e.base_value) * (1 + d.dmgRate * tier));
          r.max_value = e.max_value < 0
            ? -Math.floor(Math.abs(e.max_value) * (1 + d.dmgRate * tier))
            : Math.floor(e.max_value * (1 + d.dmgRate * tier));
        } else if ((e.effect_id === 0 && e.base_value > 0) || e.effect_id === 100) {
          r.base_value = Math.round(e.base_value * (1 + d.healRate * tier));
          r.max_value = Math.round(e.max_value * (1 + d.healRate * tier));
        } else if (e.effect_id === 79 && e.base_value < 0) {
          r.base_value = -Math.floor(Math.abs(e.base_value) * (1 + 0.06 * tier));
          r.max_value = -Math.floor(Math.abs(e.max_value) * (1 + 0.06 * tier));
        }
        return r;
      });
      let dur = durBase;
      if (d.hasDur && d.durRate) {
        const ticks = Math.round(d.durTicks * (1 + d.durRate * tier));
        dur = renderDuration(d.durFormula, ticks, MAX_LEVEL);
      }
      desc.innerHTML = substitute(tmpl, scaled, dur) +
        ` <span class="upg-chip" title="Description quantities scaled by the modeled upgrade rates; ranges stay ranges">Level ${ROMAN[tier]}</span>`;
    }
  }

  // 4) URL persistence (?tier=N alongside ?level=N)
  const sid = panel.getAttribute("data-spell-id");
  if (sid) {
    try {
      const base = window.location.hash.split("?")[0];
      const usp = new URLSearchParams((window.location.hash.split("?")[1] || ""));
      if (tier > 0) usp.set("upgrade", String(tier)); else usp.delete("upgrade");
      const qs = usp.toString();
      history.replaceState(null, "", qs ? `${base}?${qs}` : base);
    } catch { /* sandboxed */ }
  }
}

const UPGRADE_CAVEAT = `
  <aside class="notice upg-caveat">
    <strong>Caveat:</strong> the upgrade system is <em>server-side</em> —
    none of these numbers come from client data. They're reverse-engineered
    from community tooltip captures and may change with any patch. Values
    marked <span class="tier-badge tier-inferred">?</span> are extrapolated
    or combat-observed rather than tooltip-confirmed; your own AAs and
    stances further modify mana costs. Tier cap assumed 10 (unverified past
    8).
  </aside>`;

// ---- general "Spell Upgrades" summary page (#/upgrades) ------------------

export function renderUpgradesPage() {
  const pct = r => (r === null ? "—" : `${r > 0 ? "+" : "−"}${Math.abs(r) * 100}%`);
  // 4th entry: damage/healing per tier (combat-observed — tooltips hide it).
  const catRows = [
    ["nuke",   "Instant direct damage: nukes, lifetaps, stun-nukes",
               `<strong>+6%</strong> damage <span class="muted">(of base, rounded down — verified on a fixed-roll ladder)</span>`, ""],
    ["dot",    "Anything with a damage-over-time component, incl. DD+DoT hybrids (Burning/Searing Arrow)",
               `<strong>+3%</strong> damage per tick; +6% on the direct-damage hit of hybrids ${Q}`, ""],
    ["heal",   "Instant heals",
               `~+3% healing ${Q} <span class="muted">(single report: 65→79 at T7)</span>`, ""],
    ["hot",    "Heals over time",
               `~+3% per tick ${Q} <span class="muted">(community table only)</span>`, "duration rate unverified"],
    ["debuff", "Non-damage detrimentals: Tash, slows, snares",
               `— <span class="muted">(debuff magnitudes not observed to scale)</span>`, "duration rate assumed"],
    ["cc",     "Charm and mesmerize (reportedly lull too)",
               `— <span class="muted">(max target level rises instead, per patch notes)</span>`, ""],
    ["pet",    "Pet and warder summons",
               `+1 pet level per tier <span class="muted">(capped at your level −1; pet HP/stats scale with level)</span>`, "mana/cast rates unverified"],
    ["buff",   "Beneficial duration spells, incl. self-only and damage shields",
               `— <span class="muted">(stat and damage-shield values don't scale — buff tiers give duration/mana/cast only)</span>`, ""],
  ].map(([k, desc, hp, note]) => {
    const c = CATEGORIES[k];
    return `<tr><td><strong>${escapeHtml(c.label)}</strong><br><span class="muted">${escapeHtml(desc)}</span></td>
      <td>${pct(-c.cast)}</td><td>${pct(-c.mana)}</td>
      <td>${c.dur === null ? "—" : pct(c.dur) + (note.includes("duration") ? ` ${Q}` : "")}</td>
      <td>${hp}</td>
      ${note ? `<td class="muted">${escapeHtml(note)}</td>` : "<td></td>"}</tr>`;
  }).join("");

  const motes = Array.from({ length: TIER_MAX }, (_, i) => {
    const t = i + 1;
    const unv = t >= 9 ? ` ${Q}` : "";
    return `<tr><td>Tier ${t}</td><td>${Math.pow(2, t - 1)}${unv}</td><td>${Math.pow(2, t) - 1}${unv}</td></tr>`;
  }).join("");

  return `
    <nav class="breadcrumb"><a href="#/">Classes</a> › <span>Spell Upgrades</span></nav>
    <h1>Spell Upgrades <span class="muted">(motes)</span></h1>
    <p class="lede">Since the 2026 Preorder Beta, spells can be upgraded
    through numeric tiers by placing <strong>motes</strong> (right-click-hold
    a spell → Place Mote). Each tier improves several stats at fixed
    per-tier rates — but the rates depend on the spell's <em>category</em>.
    Every spell page here has a tier slider showing its exact numbers.</p>
    ${UPGRADE_CAVEAT}

    <h2>Benefits by category</h2>
    <table class="spell-table">
      <thead><tr><th>Category</th><th>Cast time</th><th>Mana</th>
        <th>Duration</th><th>Damage / healing</th><th></th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>
    <p class="muted">Instant and Permanent durations never scale. Zero-mana
    spells (e.g. Cannibalize) have no mana row to reduce. Damage/healing
    rates are <em>combat-observed</em> — the in-game tooltip does not
    display them yet. Rule of thumb: a nuke at T5 costs 10% less mana,
    casts 10% faster, and hits ~30% harder — damage compounds fastest.</p>

    <h2>Universal — every category</h2>
    <table class="spell-table">
      <thead><tr><th>Stat</th><th>Per tier</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Recovery</td><td>−2%</td><td>shown to the nearest 0.1s; exact halves round down (1.35 → 1.3)</td></tr>
        <tr><td>Reuse</td><td>−2%</td><td>display drops fractions (11.96 → 11s); hard floor of 1 second</td></tr>
        <tr><td>Resist modifier</td><td>−15</td><td>added to the spell's own resist mod; only on resistable offensive spells</td></tr>
        <tr><td>Proc potency</td><td>tier ÷ 2</td><td>combat-innate buffs cast their proc at half the buff's tier (rounded down, caps at proc rank V)</td></tr>
      </tbody>
    </table>

    <h2>Mote costs</h2>
    <p>Each tier costs double the previous: <code>2^tier</code> motes to
    advance. Cumulative:</p>
    <table class="spell-table" style="max-width:28em">
      <thead><tr><th>Reach</th><th>Motes for this tier</th><th>Total spent</th></tr></thead>
      <tbody>${motes}</tbody>
    </table>

    <h2>Also scaling (per patch notes, mostly not visible in tooltips)</h2>
    <ul>
      <li>Pet summons: +1 pet level per tier, capped at your level −1; pet HP/stats scale too, and mana/cast reportedly drop like other spells.</li>
      <li>Charm/mez (and reportedly lull) max target level increases with tier (tooltip text doesn't update).</li>
      <li>Songs reportedly follow the same categories (unverified — no captures yet).</li>
      <li>10% chance per tier to skip reagent costs (100% at tier 10).</li>
      <li>Summon-item spells summon matching-tier items.</li>
      <li>Spellblade, Quickbuff, and Symphonic Aura trigger the upgraded versions.</li>
    </ul>

    <p class="muted">Model derived from ${escapeHtml("94")} community tooltip
    captures (last updated 2026-07-20) — thanks to the players sharing
    screenshots in the spell-upgrade research thread. Corrections welcome.</p>`;
}

// Called from app.js on slider input. Reads the precomputed tier table off
// the panel's data attribute and rewrites the value cells.
