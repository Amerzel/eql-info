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

import { MAX_LEVEL, displayedValue } from "./data.js";
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
    if (heal && !hasDur && !isPerm) key = "heal";
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

  const dmgEff  = effects.find(e => e.effect_id === 0 && e.base_value < 0);
  const healEff = effects.find(e => e.effect_id === 0 && e.base_value > 0);
  const dmgAtCap = dmgEff ? Math.abs(displayedValue(
    0, dmgEff.base_value, dmgEff.formula, dmgEff.max_value, MAX_LEVEL, isDurationSpell)) : 0;
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
      dmg:   dmgAtCap ? Math.floor(dmgAtCap * (1 + 0.06 * t)) : null,
      heal:  healAtCap ? Math.round(healAtCap * (1 + 0.03 * t)) : null,
      motesNext: Math.pow(2, t),
      motesCum:  Math.pow(2, t) - 1,
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

export function renderUpgradePanel(spell, effects) {
  // Disciplines use endurance and a different advancement system; the mote
  // UI has only been observed on spells so far.
  if (spell.is_discipline) return "";
  const cat = classifyUpgradeCategory(spell, effects);
  const c = computeTiers(spell, effects, cat);

  const payload = escapeHtml(JSON.stringify({
    tiers: c.tiers,
    castBase: fmt2((spell.cast_time || 0) / 1000),
    recBase: ((spell.recovery_time || 0) / 1000).toFixed(1),
    reuseBase: Math.max(0, Math.floor((spell.recast_time || 0) / 1000)),
    manaBase: spell.mana,
    durBase: c.hasDur ? spell.buff_duration : null,
  }));

  const catBadge = cat.conf === "solid" ? "" : ` ${Q}`;
  const durBadge = cat.durConf === "inferred" ? ` ${Q}` : "";
  const dmgBadge = cat.key === "nuke" ? "" : ` ${Q}`;

  // Level-scaled uncapped durations (formula > 0, cap = 0, e.g. Boon of the
  // Garou durf=7) — we can't show absolute ticks, but the rate still applies.
  const levelScaledDur = !c.hasDur && !c.isPerm && cat.dur !== null &&
    (spell.buff_duration_formula || 0) > 0 && !(spell.buff_duration > 0);

  const t0 = c.tiers[0];
  return `
    <h2>Spell upgrades <span class="muted">(motes)</span></h2>
    <div class="upgrade-panel" data-upgrade='${payload}'>
      <div class="upgrade-slider-row">
        <label>Tier <output data-u="tier">0</output></label>
        <input type="range" min="0" max="${TIER_MAX}" value="0" step="1"
               data-upgrade-slider aria-label="Upgrade tier">
      </div>
      <p class="muted upg-cat">Category: <strong><a href="#/upgrades">${escapeHtml(cat.label)}</a></strong>${catBadge}
        · cast −${cat.cast * 100}%/tier · mana −${cat.mana * 100}%/tier${cat.dur ? ` · duration +${cat.dur * 100}%/tier` : ""}</p>
      <table class="kv">
        ${spell.mana > 0 ? `<tr><th>Mana</th><td data-u="mana">${spell.mana}</td></tr>` : ""}
        ${spell.cast_time > 0 ? `<tr><th>Cast</th><td data-u="cast">${t0.cast}s</td></tr>` : `<tr><th>Cast</th><td class="muted">Instant (exempt)</td></tr>`}
        <tr><th>Recovery</th><td data-u="rec">${t0.rec}s</td></tr>
        <tr><th>Reuse <span class="muted">(in-game)</span></th><td data-u="reuse">${t0.reuse}s</td></tr>
        ${c.hasDur ? `<tr><th>Duration${durBadge}</th><td data-u="dur">${fmtTicks(spell.buff_duration)}</td></tr>` : ""}
        ${c.isPerm ? `<tr><th>Duration</th><td class="muted">Permanent (exempt from tier scaling)</td></tr>` : ""}
        ${levelScaledDur ? `<tr><th>Duration</th><td class="muted">Level-scaled — +${cat.dur * 100}%/tier applies on top</td></tr>` : ""}
        ${t0.resist !== null ? `<tr><th>Resist mod</th><td data-u="resist">${t0.resist}</td></tr>` : ""}
        ${t0.dmg ? `<tr><th>Damage @L${MAX_LEVEL}${dmgBadge}</th><td data-u="dmg">${t0.dmg}</td></tr>` : ""}
        ${t0.heal ? `<tr><th>Heal @L${MAX_LEVEL} ${Q}</th><td data-u="heal">${t0.heal}</td></tr>` : ""}
        <tr><th>Motes → next tier</th><td data-u="motes">1 <span class="muted">(0 spent total)</span></td></tr>
      </table>
      ${UPGRADE_CAVEAT}
    </div>`;
}

const UPGRADE_CAVEAT = `
  <aside class="notice upg-caveat">
    <strong>Caveat:</strong> the upgrade system is <em>server-side</em> —
    none of these numbers come from client data. They're reverse-engineered
    from community tooltip captures and may change with any patch. Values
    marked <span class="tier-badge tier-inferred">?</span> are extrapolated
    or combat-observed rather than tooltip-confirmed; your own AAs and
    stances further modify mana costs. Tier cap assumed 10 (unverified past
    8). <a href="#/upgrades">Full details →</a>
  </aside>`;

// ---- general "Spell Upgrades" summary page (#/upgrades) ------------------

export function renderUpgradesPage() {
  const pct = r => (r === null ? "—" : `${r > 0 ? "+" : "−"}${Math.abs(r) * 100}%`);
  const catRows = [
    ["nuke",   "Instant direct damage: nukes, lifetaps, stun-nukes",       ""],
    ["dot",    "Anything with a damage-over-time component, incl. DD+DoT hybrids (Burning/Searing Arrow)", ""],
    ["heal",   "Instant heals",                                            ""],
    ["hot",    "Heals over time",                                          "duration rate unverified"],
    ["debuff", "Non-damage detrimentals: Tash, slows, snares",             "duration rate assumed"],
    ["cc",     "Charm and mesmerize",                                      ""],
    ["buff",   "Beneficial duration spells, incl. self-only and damage shields", ""],
  ].map(([k, desc, note]) => {
    const c = CATEGORIES[k];
    return `<tr><td><strong>${escapeHtml(c.label)}</strong><br><span class="muted">${escapeHtml(desc)}</span></td>
      <td>${pct(-c.cast)}</td><td>${pct(-c.mana)}</td>
      <td>${c.dur === null ? "—" : pct(c.dur) + (note.includes("duration") ? ` ${Q}` : "")}</td>
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
        <th>Duration</th><th></th></tr></thead>
      <tbody>${catRows}</tbody>
    </table>
    <p class="muted">Instant and Permanent durations never scale. Zero-mana
    spells (e.g. Cannibalize) have no mana row to reduce.</p>

    <h2>Universal — every category</h2>
    <table class="spell-table">
      <thead><tr><th>Stat</th><th>Per tier</th><th>Notes</th></tr></thead>
      <tbody>
        <tr><td>Recovery</td><td>−2%</td><td>shown to the nearest 0.1s; exact halves round down (1.35 → 1.3)</td></tr>
        <tr><td>Reuse</td><td>−2%</td><td>display drops fractions (11.96 → 11s); hard floor of 1 second</td></tr>
        <tr><td>Resist modifier</td><td>−15</td><td>added to the spell's own resist mod; only on resistable offensive spells</td></tr>
        <tr><td>Damage ${Q}</td><td>+6% of base</td><td><em>combat-observed</em>, rounded down — tooltips don't show it yet; verified on nukes, uncertain for DoT ticks</td></tr>
        <tr><td>Heal ${Q}</td><td>~+3% of base</td><td><em>combat-observed</em>, single report — treat as provisional</td></tr>
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
      <li>Pet summons: +1 pet level per tier, capped at your level −1; pet HP/stats scale too.</li>
      <li>Charm/mez max target level increases with tier (tooltip text doesn't update).</li>
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
export function updateUpgradePanel(slider) {
  const panel = slider.closest(".upgrade-panel");
  if (!panel) return;
  let data;
  try { data = JSON.parse(panel.dataset.upgrade); } catch { return; }
  const t = Math.max(0, Math.min(data.tiers.length - 1, parseInt(slider.value, 10) || 0));
  const v = data.tiers[t];
  const set = (key, html) => {
    const el = panel.querySelector(`[data-u="${key}"]`);
    if (el) el.innerHTML = html;
  };
  set("tier", String(t));
  if (v.mana !== null) set("mana", t === 0 ? String(data.manaBase) : valCell(data.manaBase, v.mana));
  set("cast", t === 0 ? `${data.castBase}s` : valCell(`${data.castBase}s`, `${v.cast}s`));
  set("rec",  t === 0 ? `${data.recBase}s` : valCell(`${data.recBase}s`, `${v.rec}s`));
  set("reuse", t === 0 ? `${Math.max(1, data.reuseBase)}s` : valCell(`${Math.max(1, data.reuseBase)}s`, `${v.reuse}s`));
  if (v.dur !== null) set("dur", t === 0 ? fmtTicks(data.durBase) : valCell(fmtTicks(data.durBase), fmtTicks(v.dur)));
  if (v.resist !== null) set("resist", String(v.resist));
  if (v.dmg) set("dmg", String(v.dmg));
  if (v.heal) set("heal", String(v.heal));
  set("motes", t >= data.tiers.length - 1
    ? `<span class="muted">at assumed cap · ${v.motesCum} spent total</span>`
    : `${v.motesNext} <span class="muted">(${v.motesCum} spent total)</span>`);
}
