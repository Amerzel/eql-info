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

  const t0 = c.tiers[0];
  return `
    <h2>Spell upgrades <span class="muted">(motes)</span></h2>
    <div class="upgrade-panel" data-upgrade='${payload}'>
      <div class="upgrade-slider-row">
        <label>Tier <output data-u="tier">0</output></label>
        <input type="range" min="0" max="${TIER_MAX}" value="0" step="1"
               data-upgrade-slider aria-label="Upgrade tier">
      </div>
      <p class="muted upg-cat">Category: <strong>${escapeHtml(cat.label)}</strong>${catBadge}
        · cast −${cat.cast * 100}%/tier · mana −${cat.mana * 100}%/tier${cat.dur ? ` · duration +${cat.dur * 100}%/tier` : ""}</p>
      <table class="kv">
        ${spell.mana > 0 ? `<tr><th>Mana</th><td data-u="mana">${spell.mana}</td></tr>` : ""}
        ${spell.cast_time > 0 ? `<tr><th>Cast</th><td data-u="cast">${t0.cast}s</td></tr>` : `<tr><th>Cast</th><td class="muted">Instant (exempt)</td></tr>`}
        <tr><th>Recovery</th><td data-u="rec">${t0.rec}s</td></tr>
        <tr><th>Reuse <span class="muted">(in-game)</span></th><td data-u="reuse">${t0.reuse}s</td></tr>
        ${c.hasDur ? `<tr><th>Duration${durBadge}</th><td data-u="dur">${fmtTicks(spell.buff_duration)}</td></tr>` : ""}
        ${c.isPerm ? `<tr><th>Duration</th><td class="muted">Permanent (exempt from tier scaling)</td></tr>` : ""}
        ${t0.resist !== null ? `<tr><th>Resist mod</th><td data-u="resist">${t0.resist}</td></tr>` : ""}
        ${t0.dmg ? `<tr><th>Damage @L${MAX_LEVEL}${dmgBadge}</th><td data-u="dmg">${t0.dmg}</td></tr>` : ""}
        ${t0.heal ? `<tr><th>Heal @L${MAX_LEVEL} ${Q}</th><td data-u="heal">${t0.heal}</td></tr>` : ""}
        <tr><th>Motes → next tier</th><td data-u="motes">1 <span class="muted">(0 spent total)</span></td></tr>
      </table>
      <p class="muted upg-note">Server-pushed system reverse-engineered from
      community tooltip captures (n=88, 2026-07-20). Damage/heal rows are
      <em>combat-observed</em> — the in-game tooltip does not show them
      scaling yet. Tier cap assumed 10 (unverified past 8).</p>
    </div>`;
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
