// View renderers. Each function returns an HTML string for a given route's
// data. All DB queries respect the MAX_LEVEL cap.

import { query, queryOne, dbstr } from "./db.js";
import {
  CLASS_NAMES, MAX_LEVEL, SKILLS, SKILL_CATEGORIES, calcSpellValue,
  targetName, resistName, className, spaName, skillName, classSlug, classIndexFromArg,
  displayedValue, capLevel, clampLevel, spellLevelHash, confidenceTier, limitValueLabel,
  EFFECT_BUCKETS, EFFECT_LABELS, EFFECT_DUR, EFFECT_VAL,
  EFFECT_LIFETAP, EFFECT_MANATAP, EFFECT_GROUPS, categoryLabel, categoryDisplay,
} from "./data.js";
import { PLAYER_RACES, PLAYER_RACE_IDS } from "./races_data.js";
import {
  renderDuration, substitute, modeTag, fmtFloat, fmtSeconds, levelDisplay,
  escapeHtml, durationTicks,
} from "./text.js";
import { ROMAN, applyUpgrade, classifyUpgradeCategory, descEffectsAt, levelChip, refreshDescription, refreshDurationStat, refreshValueCells, renderUpgradeControl, upgradeKind } from "./upgrades.js";
import { DISCLOSURE, formatValue, isPaddingRow, presentEffect, presentationText } from "./presentation.js";
import { friendlySummary, focusPhrase, petPhrase } from "./friendly.js";
import { checkStackConflict, spellView } from "./stacking.js";
import { FIELD_SEMANTICS } from "./field_semantics.js";

function iconImg(newIcon, cls = "icon") {
  if (!newIcon || newIcon < 1) return "";
  const padded = String(newIcon).padStart(4, "0");
  return `<img src="static/icons/icon_${padded}.png" class="${cls}" alt="">`;
}

// Render presentation parts (5A.4): link spell-ref parts; suppressed -> "";
// conservative -> an em dash with the labelled raw detail in the title.
// Collect spell-id / race-id targets from effects (per the registry roles)
// and prefetch their names — the honest resolver contract: display-only,
// degrades to #id when absent.
export async function buildResolvers(effects, queryFn) {
  const spellIds = new Set(), raceIds = new Set(), itemIds = new Set();
  for (const e of effects) {
    const ent = FIELD_SEMANTICS[String(e.effect_id)];
    if (!ent) continue;
    const raws = { base: e.base_value, limit: e.limit_value,
                   max: e.max_value, formula: e.formula };
    for (const [f, fm] of Object.entries(ent.fields)) {
      const v = raws[f];
      if (!v) continue;
      // spell-selector (focus limit 139) stores exclusions as negative ids
      if (fm.role === "spell-id" || fm.role === "spell-selector") spellIds.add(Math.abs(v));
      if (fm.role === "race-id") raceIds.add(v);
      if (fm.role === "item-id" && v > 0) itemIds.add(v);
    }
  }
  const spellNames = new Map(), raceNames = new Map(), itemNames = new Map();
  if (spellIds.size) {
    const rows = await queryFn(
      `SELECT id, name FROM spells WHERE id IN (${[...spellIds].join(",")})`);
    for (const r of rows) spellNames.set(r.id, r.name);
  }
  if (raceIds.size) {
    const rows = await queryFn(
      `SELECT id, text FROM dbstr WHERE type = 11 AND id IN (${[...raceIds].join(",")})`);
    for (const r of rows) raceNames.set(r.id, r.text);
  }
  if (itemIds.size) {
    // dbstr type 44: "Summoned: <name>" keyed by ITEM id (client data)
    const rows = await queryFn(
      `SELECT id, text FROM dbstr WHERE type = 44 AND id IN (${[...itemIds].join(",")})`);
    for (const r of rows) itemNames.set(r.id, r.text.replace(/^Summoned: /, ""));
  }
  return { spellName: id => spellNames.get(id) || null,
           raceName: id => raceNames.get(id) || null,
           itemName: id => itemNames.get(id) || null };
}

// D3 §4 (+ James's D3 review): a COMPACT summary of the proc's triggered
// spell — expanded by default, one level deep (text only, no nested
// expansions). PROC UPGRADE RULE (James, 2026-07-27): the parent's Spell
// Level applies to the proc'd spell at HALF RATE — a Level X spell procs a
// Level V triggered spell (floor(N/2)). Base proc chance stays server-side.
function _currentUpgradeLevel() {
  const s = /** @type {HTMLInputElement|null} */ (
    document.querySelector("[data-upgrade-slider]"));
  return s ? Math.max(0, Math.min(+s.value || 0, 10)) : 0;
}

function _currentCasterLevel() {
  const s = /** @type {HTMLInputElement|null} */ (
    document.querySelector("[data-level-slider]"));
  return s ? Math.max(1, Math.min(+s.value || MAX_LEVEL, MAX_LEVEL)) : MAX_LEVEL;
}

export async function loadProcInline(det, force = false) {
  const el = /** @type {HTMLElement} */ (det);
  if (el.dataset.loaded && !force) return;
  el.dataset.loaded = "1";
  const body = el.querySelector(".proc-body");
  const sid = +el.dataset.procSpell;
  try {
    const sp = await queryOne("SELECT * FROM spells WHERE id = ?", [sid]);
    if (!sp) { body.textContent = "Triggered spell not found."; return; }
    const effs = await query(
      "SELECT * FROM spell_effects WHERE spell_id = ? ORDER BY slot", [sid]);
    const resolvers = await buildResolvers(effs, query);
    const procLevel = Math.floor(_currentUpgradeLevel() / 2);   // HALF rate
    const casterLevel = _currentCasterLevel();                   // base values follow it
    const cat = classifyUpgradeCategory(sp, effs);
    const rates = { dmgRate: cat.key === "dot" ? 0.03 : 0.06, healRate: 0.03 };
    const parts = effs
      .filter(e => e.effect_id !== 254 && !isPaddingRow(
        e.effect_id, e.base_value, e.limit_value, e.max_value, e.formula))
      .slice(0, 5).map(e => {
        const pres = presentEffect(e.effect_id, e.base_value || 0,
          e.limit_value || 0, e.max_value || 0, e.formula || 0,
          { level: casterLevel,
            isDuration: (sp.buff_duration_formula || 0) > 0,
            beneficial: !!sp.good_effect,
            teleportZone: sp.teleport_zone || null,
            spellName: resolvers.spellName, raceName: resolvers.raceName,
               itemName: resolvers.itemName });
        if (pres.kind === "value") {
          const kind = upgradeKind(e.effect_id, e.base_value);
          const v = applyUpgrade(kind, pres.value, procLevel, rates);
          const src = e.base_value !== 0 ? e.base_value : e.max_value;
          const lbl = escapeHtml(shortEffectLabel(e.effect_id, src));
          const chip = kind !== "none" && procLevel > 0 ? levelChip(procLevel) : "";
          return (v ? `${lbl} ${Math.abs(v).toLocaleString()}` : lbl) + chip;
        }
        if (pres.kind === "suppressed") return "";
        return escapeHtml(presentationText(pres));
      }).filter(Boolean);
    const dur = renderDuration(sp.buff_duration_formula, sp.buff_duration, MAX_LEVEL);
    const half = procLevel > 0
      ? `<span class="muted"> · procs upgrade at half the spell's Level → Level ${ROMAN[procLevel]}</span>` : "";
    body.innerHTML = `
      ${iconImg(sp.new_icon)} <a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a>
      <span class="muted">— ${parts.join(" · ") || "no effects"}${dur && !/^instant$/i.test(dur) ? ` · ${escapeHtml(dur)}` : ""}</span>${half}
      <div class="muted proc-note">Base proc chance is server-side (DEX-dependent) and
      not present in spell data.</div>`;
  } catch (err) {
    body.textContent = "Could not load the triggered spell.";
  }
}

// The parent Spell Level slider moved: re-render every loaded proc summary at
// the new half-rate level (upgrades.js dispatches; no import cycle).
document.addEventListener("eql:upgrade-changed", () => {
  for (const det of document.querySelectorAll("details[data-proc-spell]")) {
    if (/** @type {HTMLElement} */ (det).dataset.loaded) loadProcInline(det, true);
  }
});

// Detail-page proc rows (SPA 85/323): readable phrase with the proc link
// kept. Rate = 100+limit (EQEmu AddProcToWeapon/AddDefensiveProc) —
// reference, unverified in EQL. The rate itself lives in the Stats "Proc
// rate" field (procRateKv), where a "?" popover explains the mechanics.
function procMult(e) { return (100 + (e.limit_value || 0)) / 100; }

function procRowHtml(e, pres) {
  if (e.effect_id !== 85 && e.effect_id !== 323) return null;
  const proc = pres.parts.find(p => p.linkSpellId);
  if (!proc) return null;
  const struck = e.effect_id === 323 ? " when struck" : "";
  const rate = procMult(e) > 1 ? ` (${procMult(e)}× rate)` : "";
  return `Procs <a href="#/spell/${proc.linkSpellId}">${escapeHtml(proc.text)}</a>${escapeHtml(struck + rate)}`;
}

// Stats-panel "Proc rate" row for any spell granting a proc: "Normal" or
// "2.5× normal", so the unmodified case is explicit (James 2026-08-07).
function procRateKv(effects) {
  const pr = effects.find(e => e.effect_id === 85 || e.effect_id === 323);
  if (!pr) return "";
  const mult = procMult(pr);
  const label = mult === 1 ? "Normal" : `${mult}× normal`;
  return `<tr><th>Proc rate</th><td>${label} <details class="help-pop">
    <summary aria-label="About proc rates" title="About proc rates">?</summary>
    <div class="help-body"><p class="muted">Proc chances are normalized
    per-minute — slow and fast weapons land about the same procs per minute;
    DEX raises the chance, and offhand weapons proc at half rate. This
    spell's proc fires at <strong>${mult === 1 ? "the normal rate" : `${mult}× that normal rate`}</strong>
    (EQEmu reference — not yet verified in EQL).</p></div>
  </details></td></tr>`;
}

function presPartsHtml(pres, spa) {
  if (pres.kind === "suppressed") return "";
  if (!pres.parts.length) return '<span class="muted">—</span>';
  return pres.parts.map(p => {
    if (p.linkSpellId) return `<a href="#/spell/${p.linkSpellId}">${escapeHtml(p.text)}</a>`;
    // CHARM RULE hook: charm's target-level cap scales +1 per Spell Level —
    // tag the cap so the upgrade slider can rewrite it live (upgrades.js).
    if (spa === 22 && p.role === "target-level-cap" && p.rawValue) {
      return `<span data-charm-cap data-cap-base="${p.rawValue}">${escapeHtml(p.text)}</span>`;
    }
    return escapeHtml(p.text);
  }).join(" · ");
}

function link(href, text) {
  return `<a href="${href}">${escapeHtml(text)}</a>`;
}

// ---------------------------------------------------------------------------
// HOME
// ---------------------------------------------------------------------------

export async function renderHome() {
  const totalRow = await queryOne(
    "SELECT COUNT(DISTINCT spell_id) AS c FROM spell_classes " +
    "WHERE min_level <= ? AND verified = 1",
    [MAX_LEVEL]);
  const total = totalRow ? totalRow.c : 0;

  const classRows = await query(
    `SELECT class_index, class_name, COUNT(*) AS n
       FROM spell_classes
      WHERE min_level <= ? AND verified = 1
      GROUP BY class_index`,
    [MAX_LEVEL]);
  const counts = new Map(classRows.map(r => [r.class_index, r.n]));

  // Class cards listed alphabetically by display name. Pure-melee classes
  // (Warrior, Monk, Rogue, Berserker) have no spell data so they're hidden.
  const HIDE = new Set([0, 6, 8, 15]);
  const classIndices = Array.from({ length: 16 }, (_, i) => i)
    .filter(i => !HIDE.has(i))
    .sort((a, b) => CLASS_NAMES[a].localeCompare(CLASS_NAMES[b]));
  const cards = classIndices.map(i => {
    const c = counts.get(i) || 0;
    const banner = `static/icons/classes/${String(i).padStart(2, "0")}.png`;
    return `<a class="class-card" href="#/class/${classSlug(i)}">
              <img class="class-banner" src="${banner}" alt="" loading="lazy">
              <span class="class-name">${escapeHtml(CLASS_NAMES[i])}</span>
              <span class="class-count">${c} spells</span>
            </a>`;
  }).join("");

  return `
    <h1>EverQuest Legends — Spell Explorer</h1>
    <p class="lede">${total.toLocaleString()} spells obtainable at L1–${MAX_LEVEL}.
    Search by name above, jump into a tool below, or browse by class.</p>
    <div class="feature-grid">
      <a class="feature-card feature-primary" href="#/spells">
        <span class="trio-tease" aria-hidden="true">
          <span class="trio-banner trio-q">?</span><span
            class="trio-banner trio-q">?</span><span
            class="trio-banner trio-q">?</span>
        </span>
        <span class="feature-body">
          <span class="feature-title">Browse Spells — all classes</span>
          <span class="feature-desc">Every spell in one filterable,
          sortable table. <strong>Pick your class trio</strong>, search by effect —
          nuke, heal, snare, lifetap, charm, resists and more — filter by level,
          and preview values at any caster level.</span>
          <span class="feature-go">Start browsing →</span>
        </span>
      </a>
    </div>
    <h2>Browse by class</h2>
    <div class="class-grid">${cards}</div>
    <p class="muted" style="margin-top:1.5em">Reference:
    <a href="#/targets">Target Types</a> — every targeting type with its exact
    in-game tooltip string.</p>
  `;
}

// ---------------------------------------------------------------------------
// CLASS
// ---------------------------------------------------------------------------

export async function renderClass(classIndex, params) {
  if (!Number.isInteger(classIndex) || classIndex < 0 || classIndex > 15) {
    return `<p>Unknown class index.</p>`;
  }
  const kind = params.get("kind") || "all";
  const good = params.get("good") || "all";
  const lMin = Math.max(1, parseInt(params.get("level_min") || "1", 10) || 1);
  const lMax = Math.min(MAX_LEVEL,
                        parseInt(params.get("level_max") || String(MAX_LEVEL), 10)
                        || MAX_LEVEL);

  const where = ["sc.class_index = ?", "sc.min_level <= ?",
                 "sc.min_level >= ?", "sc.min_level <= ?",
                 "sc.verified = 1"];
  const args = [classIndex, MAX_LEVEL, lMin, lMax];
  if (kind === "spells") where.push("s.is_discipline = 0");
  else if (kind === "disc") where.push("s.is_discipline = 1");
  if (good === "buff") where.push("s.good_effect IN (1, 2)");
  else if (good === "det") where.push("s.good_effect = 0");

  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, s.mana, s.cast_time,
            s.buff_duration, s.buff_duration_formula, s.target_type,
            s.good_effect, s.is_discipline, s.teleport_zone,
            sc.min_level,
            (SELECT text FROM dbstr WHERE id = s.type_description_id AND type = 5)   AS cat,
            (SELECT text FROM dbstr WHERE id = s.effect_description_id AND type = 5) AS cat2
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE ${where.join(" AND ")}
      ORDER BY sc.min_level, s.name`,
    args);

  const byLevel = new Map();
  for (const r of rows) {
    if (!byLevel.has(r.min_level)) byLevel.set(r.min_level, []);
    byLevel.get(r.min_level).push(r);
  }

  // Friendly effects summaries (same generator as Browse) + name resolvers.
  const effMap = new Map();
  let clsResolvers = null;
  if (rows.length) {
    const effRows = await query(
      `SELECT se.spell_id, se.effect_id, se.base_value, se.limit_value, se.max_value, se.formula
         FROM spell_effects se
        WHERE se.spell_id IN (SELECT s.id FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
                              WHERE ${where.join(" AND ")})
        ORDER BY se.spell_id, se.slot`, args);
    for (const e of effRows) {
      if (!effMap.has(e.spell_id)) effMap.set(e.spell_id, []);
      effMap.get(e.spell_id).push(e);
    }
    clsResolvers = await buildResolvers(effRows, query);
  }

  const sel = (cur, val) => (cur === val ? " selected" : "");
  const filterForm = `
    <form class="diff-form" data-form="class">
      <div class="diff-controls">
        <label>Kind:
          <select name="kind">
            <option value="all"${sel(kind, "all")}>All</option>
            <option value="spells"${sel(kind, "spells")}>Spells only</option>
            <option value="disc"${sel(kind, "disc")}>Disciplines only</option>
          </select>
        </label>
        <label>Mode:
          <select name="good">
            <option value="all"${sel(good, "all")}>All</option>
            <option value="buff"${sel(good, "buff")}>Beneficial</option>
            <option value="det"${sel(good, "det")}>Detrimental</option>
          </select>
        </label>
        <label>Level min:
          <input type="number" name="level_min" value="${lMin}" min="1" max="${MAX_LEVEL}" style="width:5em">
        </label>
        <label>Level max:
          <input type="number" name="level_max" value="${lMax}" min="1" max="${MAX_LEVEL}" style="width:5em">
        </label>
        <button type="submit">Apply</button>
        <a href="#/class/${classSlug(classIndex)}" class="muted">reset</a>
      </div>
    </form>`;

  let body = "";
  for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
    const items = byLevel.get(lvl).map(sp => {
      const hasDuration = sp.buff_duration > 0 || sp.buff_duration_formula > 0;
      const tags = [];
      if (sp.is_discipline) tags.push('<span class="tag tag-disc">disc</span>');
      // teleport_zone is dual-use: pet summons store the pet template here
      // (always "PCPet..." prefix), real teleport spells store a zone short
      // name like "northkarana" or "qrg". Only flag the latter as port.
      if (sp.teleport_zone && !sp.teleport_zone.startsWith("PCPet")) {
        tags.push('<span class="tag tag-port">port</span>');
      } else if (sp.teleport_zone) {
        tags.push('<span class="tag tag-pet">pet</span>');
      }
      if ((sp.good_effect === 1 || sp.good_effect === 2) && hasDuration) tags.push('<span class="tag tag-buff">buff</span>');
      if ([3, 36, 39, 52].includes(sp.target_type)) tags.push('<span class="tag tag-grp">group</span>');
      if (sp.good_effect === 0) tags.push('<span class="tag tag-deb">det</span>');
      const tag = tags.join(" ");
      return `<tr>
        <td>${iconImg(sp.new_icon)}</td>
        <td><a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a> ${tag}</td>
        <td>${friendlySummary(effMap.get(sp.id) || [], sp.min_level, sp, clsResolvers, MAX_LEVEL)}</td>
        ${shortCategoryCell(sp.cat, sp.cat2)}
        <td>${sp.mana}</td>
        <td>${fmtSeconds(sp.cast_time)}s</td>
        <td>${fmtDur(sp.buff_duration)}</td>
        ${shortTargetCell(sp.target_type)}
      </tr>`;
    }).join("");
    body += `<section class="level-block">
      <h2>Level ${levelDisplay(lvl)}</h2>
      <table class="spell-table t-class">
        <colgroup><col class="c-icon"><col class="c-name"><col class="c-eff"><col
          class="c-cat"><col class="c-num"><col class="c-num"><col class="c-dur"><col
          class="c-tgt"></colgroup>
        <thead><tr><th>Icon</th><th>Name</th><th>Effects</th><th>Category</th><th>Mana</th>
          <th>Cast</th><th>Duration</th><th>Targets</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
    </section>`;
  }
  if (!body) body = `<p class="muted">No spells match this filter.</p>`;

  return `<div class="wide-page">
    <nav class="breadcrumb"><a href="#/">Classes</a> › <span>${escapeHtml(CLASS_NAMES[classIndex])}</span></nav>
    <h1>${escapeHtml(CLASS_NAMES[classIndex])} spell list</h1>
    ${filterForm}
    <p class="muted">${rows.length} spells match, grouped by minimum level.</p>
    <p class="muted disclosure">${DISCLOSURE}</p>
    ${body}</div>`;
}

// ---------------------------------------------------------------------------
// BROWSE — all spells in one flat, sortable, filterable table (also the
// effect-search entry point). Class pages are left untouched.
// ---------------------------------------------------------------------------

// All 16 classes appear in the trio picker (EQL lets you play three at once).
// This page shows spells only — disciplines are out of scope — so pure-melee
// classes contribute no rows, but they stay selectable so any trio is shareable.
const CLASS_ABBR = ["WAR", "CLR", "PAL", "RNG", "SHD", "DRU", "MNK", "BRD",
                    "ROG", "SHM", "NEC", "WIZ", "MAG", "ENC", "BST", "BER"];

// Sortable columns → the SQL expression to ORDER BY.
const BROWSE_SORTS = { name: "s.name", level: "min_level", mana: "s.mana", cast: "s.cast_time" };

// LIST-ONLY short target names (hover shows the exact in-game string; the
// detail page keeps the verbatim "Target:" text — target_type policy).
const TARGET_SHORT = { 51: "Friendly", 56: "Group Member", 11: "Construct", 45: "Free AE" };
function shortTargetCell(t) {
  const full = targetName(t);
  const short = TARGET_SHORT[t] || full;
  return short === full ? `<td>${full}</td>`
                        : `<td title="${escapeHtml(full)}">${short}</td>`;
}

// LIST-ONLY compact category: the specific sub-label when present ("Fire",
// "Blind", "Cure"), the top-level otherwise; full pair on hover.
function shortCategoryCell(rawCat, rawCat2) {
  const cat = categoryLabel(rawCat), cat2 = categoryLabel(rawCat2);
  const short = categoryDisplay(rawCat, rawCat2);
  const full = cat2 && cat2 !== cat ? `${cat} · ${cat2}` : (cat || "");
  return `<td class="muted"${full !== short ? ` title="${escapeHtml(full)}"` : ""}>${escapeHtml(short)}</td>`;
}

// Compact per-effect label for the Effects summary column (eqltools-style).
function shortEffectLabel(id, sign) {
  if (id === 0 || id === 79) return sign < 0 ? "Dmg" : "Heal";
  if (id === 100) return "HoT";
  return spaName(id);
}

// "AC 15 · MaxHp 20 · Heal 20" — up to 5 effects, each valued at `level`.
// `sp` supplies the SPELL context the core requires (good_effect,
// buff_duration_formula, teleport_zone) — 5A.4 hardening finding 1.
function effectsSummary(effs, level, sp, resolvers) {
  // Skip SPA 254 and ONLY the approved exact padding signature (5A.1 sign-off);
  // the generic base==0&&max==0 filter was REJECTED (hid 34 real rows).
  const meaningful = effs.filter(e =>
    e.effect_id !== 254 && !isPaddingRow(e.effect_id, e.base_value,
                                         e.limit_value, e.max_value, e.formula));
  const shown = meaningful.slice(0, 5);
  const parts = shown.map(e => {
    // registry-driven (5A.4): the presentation core decides what each field
    // MEANS; magnitudes keep the legacy label+value form for parity.
    const pres = presentEffect(e.effect_id, e.base_value || 0, e.limit_value || 0,
                               e.max_value || 0, e.formula || 0, {
                                 level,
                                 isDuration: (sp?.buff_duration_formula || 0) > 0,
                                 beneficial: !!(sp?.good_effect),
                                 teleportZone: sp?.teleport_zone || null,
                                 spellName: resolvers?.spellName || null,
                                 raceName: resolvers?.raceName || null,
                                 itemName: resolvers?.itemName || null });
    if (pres.kind === "value") {
      const src = e.base_value !== 0 ? e.base_value : e.max_value;
      const lbl = escapeHtml(shortEffectLabel(e.effect_id, src));
      let v = pres.value;
      if (e.effect_id === 0 || e.effect_id === 79 || e.effect_id === 100) v = Math.abs(v);
      const vmark = pres.publication === "fact"
        ? ' <span class="fact-mark" title="EQL-grounded">✓</span>' : "";
      if (e.effect_id === 11 || e.effect_id === 98) {
        return escapeHtml(formatValue(e.effect_id, v)) + vmark;   // §3 delta wording
      }
      return (v ? `${lbl} ${v.toLocaleString()}` : lbl) + vmark;
    }
    if (pres.kind === "suppressed") return "";
    const mark = pres.publication === "fact"
      ? ' <span class="fact-mark" title="EQL-grounded">✓</span>' : "";
    return (escapeHtml(presentationText(pres)) || escapeHtml(spaName(e.effect_id))) + mark;
  }).filter(Boolean);
  // one semantic claim once: identical part strings collapse (e.g. a spell
  // with several rows resolving to the same displayed claim)
  const seen = new Set();
  const deduped = parts.filter(p => !seen.has(p) && seen.add(p));
  parts.length = 0; parts.push(...deduped);
  const extra = meaningful.length - shown.length;
  return parts.join(" · ") + (extra > 0 ? ` <span class="muted">+${extra}</span>` : "");
}

// Duration ticks → "27m" / "18s" (tick = 6s). This is the cap value.
function fmtDur(ticks) {
  if (!ticks || ticks <= 0) return "—";
  const s = ticks * 6;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60), r = s % 60;
  return r ? `${m}m${r}s` : `${m}m`;
}

// Build a "#/spells?…" URL from the current params with a set of overrides.
// An override of "" or null drops the key.
function browseUrl(params, overrides) {
  const p = new URLSearchParams(params);
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null || v === "") p.delete(k); else p.set(k, v);
  }
  const qs = p.toString();
  return "#/spells" + (qs ? "?" + qs : "");
}

// A clickable, sort-toggling column header.
function sortHeader(params, col, label, curSort, curDir) {
  const active = curSort === col;
  const nextDir = active && curDir === "ASC" ? "desc" : "asc";
  const arrow = active ? (curDir === "ASC" ? " ▲" : " ▼") : "";
  return `<th><a href="${browseUrl(params, { sort: col, dir: nextDir, page: null })}">${label}${arrow}</a></th>`;
}

// Expand the {dur}/{V}/{lifetap}/{manatap} placeholders in a bucket predicate
// into their SQL fragments (over spell_effects se + spells s).
function expandPred(p) {
  return p.replace(/\{dur\}/g, EFFECT_DUR).replace(/\{V\}/g, EFFECT_VAL)
          .replace(/\{lifetap\}/g, EFFECT_LIFETAP).replace(/\{manatap\}/g, EFFECT_MANATAP);
}

// Resolve the ?effect= param to a SQL predicate (over spell_effects se +
// spells s). Returns { pred, spa } or null. A plain "spa:<n>" is an
// effect_id match; a "bucket:<key>" expands the bucket's placeholders.
function resolveEffect(effect) {
  if (effect.startsWith("bucket:")) {
    const b = EFFECT_BUCKETS.find(x => x.key === effect.slice(7));
    if (b) return { pred: expandPred(b.pred), spa: null };
  } else if (effect.startsWith("spa:")) {
    const n = parseInt(effect.slice(4), 10);
    if (Number.isInteger(n)) return { pred: "se.effect_id = " + n, spa: n };
  }
  return null;
}

export async function renderBrowse(params) {
  const clsSlugs = params.getAll("class").filter(Boolean);
  const clsIdxs = [...new Set(clsSlugs.map(classIndexFromArg)
    .filter(i => Number.isInteger(i) && i >= 0 && i <= 15))];
  const clsSet = new Set(clsIdxs);
  const good = params.get("good") || "all";
  const lMin = Math.max(1, parseInt(params.get("level_min") || "1", 10) || 1);
  const lMax = Math.min(MAX_LEVEL,
                        parseInt(params.get("level_max") || String(MAX_LEVEL), 10) || MAX_LEVEL);
  const lineId = parseInt(params.get("line") || "0", 10) || 0;
  const effect = params.get("effect") || "";
  const sort = BROWSE_SORTS[params.get("sort")] ? params.get("sort") : "level";
  const dir = params.get("dir") === "desc" ? "DESC" : "ASC";

  // Spells only — disciplines are out of scope for this page.
  const where = ["sc.verified = 1", "s.is_discipline = 0",
                 "sc.min_level <= ?", "sc.min_level >= ?", "sc.min_level <= ?"];
  const args = [MAX_LEVEL, lMin, lMax];
  if (clsIdxs.length) {
    where.push(`sc.class_index IN (${clsIdxs.map(() => "?").join(",")})`);
    args.push(...clsIdxs);
  }
  if (good === "buff") where.push("s.good_effect IN (1, 2)");
  else if (good === "det") where.push("s.good_effect = 0");
  if (lineId) { where.push("s.spell_category = ?"); args.push(lineId); }

  const eff = resolveEffect(effect);
  if (eff) where.push(`EXISTS (SELECT 1 FROM spell_effects se WHERE se.spell_id = s.id AND ${eff.pred})`);

  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, s.mana, s.cast_time, s.buff_duration,
            s.buff_duration_formula, s.target_type, s.good_effect, s.teleport_zone,
            MIN(sc.min_level) AS min_level,
            GROUP_CONCAT(DISTINCT sc.class_index || ':' || sc.min_level) AS class_pairs
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE ${where.join(" AND ")}
      GROUP BY s.id
      ORDER BY ${BROWSE_SORTS[sort]} ${dir}, s.name ASC
      LIMIT 2000`, args);

  // Bulk-fetch category + effects for the result set, filtered by a subquery
  // (so we never build a giant IN(id,id,…) list that trips the variable cap).
  const idSubq = `SELECT s.id FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
                  WHERE ${where.join(" AND ")} GROUP BY s.id`;
  const catMap = new Map(), effMap = new Map();
  let browseResolvers = null;
  if (rows.length) {
    const catRows = await query(
      `SELECT s.id, dc.text AS cat, de.text AS cat2
         FROM spells s
         LEFT JOIN dbstr dc ON dc.id = s.type_description_id AND dc.type = 5
         LEFT JOIN dbstr de ON de.id = s.effect_description_id AND de.type = 5
        WHERE s.id IN (${idSubq})`, args);
    for (const r of catRows) catMap.set(r.id, r);
    const effRows = await query(
      `SELECT se.spell_id, se.effect_id, se.base_value, se.limit_value, se.max_value, se.formula
         FROM spell_effects se
        WHERE se.spell_id IN (${idSubq})
        ORDER BY se.spell_id, se.slot`, args);
    for (const e of effRows) {
      if (!effMap.has(e.spell_id)) effMap.set(e.spell_id, []);
      effMap.get(e.spell_id).push(e);
    }
    browseResolvers = await buildResolvers(effRows, query);
  }

  // Class-aware effect list: when a trio is selected, restrict the Effect
  // dropdown to effects those classes actually have. The current selection is
  // always kept so it never vanishes while you're editing other filters.
  let classSpas = null, classBuckets = null;
  if (clsIdxs.length) {
    const ph = clsIdxs.map(() => "?").join(",");
    const cargs = [...clsIdxs, MAX_LEVEL];
    const cwhere = `sc.verified=1 AND s.is_discipline=0 AND sc.class_index IN (${ph}) AND sc.min_level<=?`;
    const spaRows = await query(
      `SELECT DISTINCT se.effect_id FROM spell_effects se
         JOIN spells s ON s.id = se.spell_id JOIN spell_classes sc ON sc.spell_id = s.id
        WHERE ${cwhere}`, cargs);
    classSpas = new Set(spaRows.map(r => r.effect_id));
    const caseCols = EFFECT_BUCKETS.map(b =>
      `MAX(CASE WHEN ${expandPred(b.pred)} THEN 1 ELSE 0 END) AS b_${b.key}`).join(", ");
    const bRow = await queryOne(
      `SELECT ${caseCols} FROM spell_effects se
         JOIN spells s ON s.id = se.spell_id JOIN spell_classes sc ON sc.spell_id = s.id
        WHERE ${cwhere}`, cargs);
    classBuckets = new Set(EFFECT_BUCKETS.filter(b => bRow && bRow["b_" + b.key]).map(b => b.key));
  }

  // ── filter form ──
  const sel = (cur, val) => (cur === val ? " selected" : "");
  // Class picker: an "All" button plus three single-class dropdowns (EQL's
  // three-class trio). Each dropdown is name="class"; empty slots submit "" and
  // are dropped when the URL is built, so only chosen classes end up in it.
  const classOption = (selIdx) => `<option value="">(any)</option>` +
    Array.from({ length: 16 }, (_, i) => i)
      .sort((a, b) => CLASS_NAMES[a].localeCompare(CLASS_NAMES[b]))
      .map(i =>
        `<option value="${classSlug(i)}"${selIdx === i ? " selected" : ""}>${escapeHtml(CLASS_NAMES[i])}</option>`).join("");
  // Each slot is a vertical class banner (the class's own banner art when
  // picked, a "?" placeholder when empty) over its dropdown — the trio reads
  // as "pick 3" at a glance. The form navigates on change, so the re-render
  // swaps in the picked class's banner.
  const classPickers = [0, 1, 2].map(slot => {
    const idx = clsIdxs[slot] ?? -1;
    const banner = idx >= 0
      ? `<img class="trio-banner" alt=""
           src="static/icons/classes/${String(idx).padStart(2, "0")}.png">`
      : `<span class="trio-banner trio-q">?</span>`;
    return `<label class="trio-slot">${banner}<select name="class">${classOption(idx)}</select></label>`;
  }).join(" ");
  const allParams = new URLSearchParams(params); allParams.delete("class");
  allParams.set("all", "1");   // explicit trio-clear (beats the saved-trio restore)
  const allBtn = `<a href="#/spells?${allParams.toString()}"
    class="classbtn${clsIdxs.length ? "" : " active"}">All classes</a>`;
  // Build the Effect dropdown as one <optgroup> per EFFECT_GROUPS entry:
  // buckets first (in listed order), then that group's SPAs sorted by label.
  // Class-aware: hide options the selected trio can't cast, but always keep
  // the current selection. Empty groups are dropped.
  const bucketByKey = new Map(EFFECT_BUCKETS.map(b => [b.key, b]));
  const showBucket = key => !classBuckets || classBuckets.has(key) || effect === "bucket:" + key;
  const showSpa = spa => !classSpas || classSpas.has(spa) || effect === "spa:" + spa;
  const groupsHtml = EFFECT_GROUPS.map(g => {
    const opts = [];
    for (const key of g.buckets) {
      const b = bucketByKey.get(key);
      if (b && showBucket(key))
        opts.push(`<option value="bucket:${key}"${sel(effect, "bucket:" + key)}>${escapeHtml(b.label)}</option>`);
    }
    g.spas.filter(showSpa)
      .map(spa => ({ spa, label: EFFECT_LABELS[spa] }))
      .sort((a, b) => a.label.localeCompare(b.label))
      .forEach(o => opts.push(`<option value="spa:${o.spa}"${sel(effect, "spa:" + o.spa)}>${escapeHtml(o.label)}</option>`));
    return opts.length ? `<optgroup label="${escapeHtml(g.label)}">${opts.join("")}</optgroup>` : "";
  }).join("");
  const effectSelect = `<select name="effect"><option value="">Any effect</option>${groupsHtml}</select>`;

  const filterForm = `
    <form class="diff-form" data-form="browse">
      ${lineId ? `<input type="hidden" name="line" value="${lineId}">` : ""}
      <input type="hidden" name="sort" value="${sort}">
      <input type="hidden" name="dir" value="${dir === "DESC" ? "desc" : "asc"}">
      <div class="diff-controls trio-row" style="margin-bottom:.5em">
        ${allBtn}
        <span class="muted">or pick your trio:</span>
        <span class="trio-slots">${classPickers}</span>
        ${clsIdxs.length ? `<a class="muted" style="margin-left:.6em"
          href="#/stacks?${clsIdxs.map(i => "class=" + classSlug(i)).join("&")}">→ What stacks for this trio</a>` : ""}
      </div>
      <div class="diff-controls">
        <label>Effect: ${effectSelect}</label>
        <label>Mode:
          <select name="good">
            <option value="all"${sel(good, "all")}>All</option>
            <option value="buff"${sel(good, "buff")}>Beneficial</option>
            <option value="det"${sel(good, "det")}>Detrimental</option>
          </select></label>
        <label>Level min: <input type="number" name="level_min" value="${lMin}" min="1" max="${MAX_LEVEL}" style="width:5em"></label>
        <label>Level max: <input type="number" name="level_max" value="${lMax}" min="1" max="${MAX_LEVEL}" style="width:5em"></label>
        <button type="submit">Apply</button>
        <a href="#/spells" class="muted">reset</a>
      </div>
    </form>`;

  // ── table ──
  const body = rows.map(sp => {
    const tags = [];
    if (sp.teleport_zone && !sp.teleport_zone.startsWith("PCPet")) tags.push('<span class="tag tag-port">port</span>');
    else if (sp.teleport_zone) tags.push('<span class="tag tag-pet">pet</span>');
    const hasDuration = sp.buff_duration > 0 || sp.buff_duration_formula > 0;
    if ((sp.good_effect === 1 || sp.good_effect === 2) && hasDuration) tags.push('<span class="tag tag-buff">buff</span>');
    if (sp.good_effect === 0) tags.push('<span class="tag tag-deb">det</span>');
    // Classes column: "CLR 1 · DRU 5" from the class:level pairs, low level first.
    const classCell = (sp.class_pairs || "").split(",")
      .map(p => { const [ci, lv] = p.split(":").map(Number); return { ci, lv }; })
      .sort((a, b) => a.lv - b.lv || a.ci - b.ci)
      .map(x => escapeHtml(`${CLASS_ABBR[x.ci] || x.ci} ${x.lv}`)).join(" · ");
    const cat = catMap.get(sp.id) || {};
    const effText = friendlySummary(effMap.get(sp.id) || [], sp.min_level, sp, browseResolvers, MAX_LEVEL);
    return `<tr>
      <td>${levelDisplay(sp.min_level)}</td>
      <td>${iconImg(sp.new_icon)}</td>
      <td><a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a> ${tags.join(" ")}</td>
      <td class="muted">${classCell}</td>
      ${shortCategoryCell(cat.cat, cat.cat2)}
      <td>${effText}</td>
      <td>${sp.mana}</td>
      <td>${fmtSeconds(sp.cast_time)}s</td>
      <td>${fmtDur(sp.buff_duration)}</td>
      ${shortTargetCell(sp.target_type)}
    </tr>`;
  }).join("");

  const head = `<tr>
    ${sortHeader(params, "level", "Lvl", sort, dir)}
    <th>Icon</th>
    ${sortHeader(params, "name", "Name", sort, dir)}
    <th>Classes</th>
    <th>Category</th>
    <th>Effects</th>
    ${sortHeader(params, "mana", "Mana", sort, dir)}
    ${sortHeader(params, "cast", "Cast", sort, dir)}
    <th>Dur</th>
    <th>Targets</th></tr>`;

  const effLabel = eff
    ? (eff.spa !== null ? EFFECT_LABELS[eff.spa] || spaName(eff.spa)
                        : (EFFECT_BUCKETS.find(b => "bucket:" + b.key === effect) || {}).label)
    : null;
  const lineName = lineId ? await dbstr(lineId, 27) : null;
  const clsLabel = clsIdxs.length ? clsIdxs.map(i => CLASS_NAMES[i]).join(" / ") : "all classes";
  const capped = rows.length >= 2000 ? " (showing first 2000)" : "";

  return `<div class="wide-page">
    <nav class="breadcrumb"><a href="#/">Home</a> › Browse</nav>
    <h1>Browse Spells</h1>
    ${filterForm}
    <p class="muted">${rows.length.toLocaleString()} spell${rows.length === 1 ? "" : "s"}${capped}
      — ${escapeHtml(clsLabel)}${effLabel ? ` · effect: ${escapeHtml(effLabel)}` : ""}${lineName ? ` · spell line: ${escapeHtml(lineName)} <a href="#/spells">×</a>` : ""}.
      Scaling values read wiki-style: own-level value to capped value, e.g. “Damage: 8 (L4) to 43 (L26)”.</p>
    <p class="muted disclosure">${DISCLOSURE}</p>
    ${rows.length ? `<table class="spell-table t-browse">
      <colgroup><col class="c-lvl"><col class="c-icon"><col class="c-name"><col
        class="c-cls"><col class="c-cat"><col class="c-eff"><col class="c-num"><col
        class="c-num"><col class="c-dur"><col class="c-tgt"></colgroup>
      <thead>${head}</thead><tbody>${body}</tbody></table>`
      : '<p class="muted">No spells match — pick a caster class or widen the level range.</p>'}
    </div>`;
}

// ---------------------------------------------------------------------------
// SPELL DETAIL
// ---------------------------------------------------------------------------

export async function renderSpell(spellId, params) {
  // Caster-level slider selection (1..MAX_LEVEL), from the URL hash so it is
  // shareable and survives reload. Defaults to MAX_LEVEL (no behavior change).
  const selLevel = clampLevel(params && params.get("level"), MAX_LEVEL);
  const selUpgrade = Math.max(0, Math.min(+(params && params.get("upgrade")) || 0, 10));
  const spell = await queryOne("SELECT * FROM spells WHERE id = ?", [spellId]);
  if (!spell) return `<p>Spell #${spellId} not found.</p>`;
  const effects = await query(
    "SELECT * FROM spell_effects WHERE spell_id = ? ORDER BY slot", [spellId]);
  const classes = await query(
    `SELECT class_index, class_name, min_level FROM spell_classes
      WHERE spell_id = ? AND min_level <= ?
      ORDER BY min_level, class_index`, [spellId, MAX_LEVEL]);
  const msgs = await queryOne(
    "SELECT * FROM spell_messages WHERE spell_id = ?", [spellId]);
  let groupSiblings = [];
  if (spell.spell_group) {
    groupSiblings = await query(
      `SELECT id, name, rank FROM spells
        WHERE spell_group = ? AND spell_group != 0
        ORDER BY rank, id`, [spell.spell_group]);
  }

  // Duration is rendered at the L50 cap and does NOT track the level slider.
  // Only f3 (and f50 permanent) are OBSERVED; the plan records f3's sub-L50
  // values as extrapolated, not observed (OPEN_SOURCE_PLAN §4.2). Publishing a
  // scaled duration below L50 (and desyncing it from the fixed L50 description
  // %z token) is deferred until lower-level duration publication is approved.
  // The description likewise stays at L50 (its #N/@N are base/max — Phase 4.4).
  const duration = renderDuration(spell.buff_duration_formula, spell.buff_duration, MAX_LEVEL);
  const durationAtLevel = renderDuration(spell.buff_duration_formula, spell.buff_duration, selLevel);
  const descText = await dbstr(spell.description_id, 6);
  const typeText = await dbstr(spell.type_description_id, 5);
  const effectText = await dbstr(spell.effect_description_id, 5);
  const secText = await dbstr(spell.secondary_category_2, 5);
  const catText = spell.spell_category > 0
    ? await dbstr(spell.spell_category, 27) : null;
  // Client-accurate render (OBS-2026-027): #N substitutes the LEVEL-SCALED
  // value; %z prose stays the cap duration. Same composer as the live sliders.
  const rendered = descText
    ? substitute(descText, descEffectsAt(effects, selLevel, 0, null), duration,
                 spell.aoe_max_targets, spell.aoe_duration) : "";

  const isDuration = (spell.buff_duration_formula || 0) > 0;
  const tierBadge = (tier) => {
    if (tier === "solid")    return "";
    if (tier === "inferred") return `<span class="tier-badge tier-inferred" title="Predicted from EQEmu source — not yet verified in EQL">?</span>`;
    if (tier === "partial")  return `<span class="tier-badge tier-partial"  title="Mechanic understood but observed values diverge from prediction">~</span>`;
    if (tier === "unknown")  return `<span class="tier-badge tier-unknown"  title="Unknown formula or SPA — value may be wrong">!</span>`;
    return "";
  };
  // Per-effect natural design cap (the level it stops scaling). The @Lcap
  // column only appears when at least one effect scales past L50 or never caps —
  // no visual noise on spells that fully cap by 50.
  // 5A.4: the presentation core (registry-driven) decides each row's meaning.
  // The TABLE hides only the approved exact padding signature; the full effect
  // list still feeds description substitution and the upgrade panel.
  const visEffects = effects.filter(e => !isPaddingRow(
    e.effect_id, e.base_value, e.limit_value, e.max_value, e.formula));
  const resolvers = await buildResolvers(visEffects, query);
  const press = visEffects.map(e => presentEffect(
    e.effect_id, e.base_value || 0, e.limit_value || 0, e.max_value || 0,
    e.formula || 0, { level: MAX_LEVEL, isDuration,
                      beneficial: !!spell.good_effect,
                      teleportZone: spell.teleport_zone || null,
                      spellName: resolvers.spellName,
                      raceName: resolvers.raceName,
                      itemName: resolvers.itemName }));
  // ── adaptive sections (design pass D1): the corpus splits nearly evenly
  //    into value rows and semantic rows — render only the sections this
  //    spell actually has (backlog §1, approved). Column model per §2:
  //    one slider-driven value column + a level-led Scaling limit.
  const valueRows = [], semanticRows = [];
  visEffects.forEach((e, i) => {
    const pres = press[i];
    if (pres.kind === "value") valueRows.push([e, pres]);
    else if (pres.kind !== "suppressed") semanticRows.push([e, pres]);
  });
  const dv = (e, lvl) => displayedValue(e.effect_id, e.base_value, e.formula, e.max_value, lvl, isDuration);
  const scalingLimit = (e) => {
    const c = capLevel(e.base_value, e.formula, e.max_value);
    if (c === null)
      return `<td class="val val-cap beyond" title="Scales every level with no ceiling">No formula cap</td>`;
    if (c <= 1)
      return `<td class="val val-cap" title="Does not scale with caster level">Fixed</td>`;
    if (c > MAX_LEVEL)
      return `<td class="val val-cap beyond" data-cap-cell data-eid="${e.effect_id}" data-base="${e.base_value}"
        data-formula="${e.formula}" data-max="${e.max_value}" data-cap="${c}" data-dur="${isDuration ? 1 : 0}"
        data-upg="${upgradeKind(e.effect_id, e.base_value)}"
        title="EQL caps at L${MAX_LEVEL}; the full classic value needs L${c}">Caps at L${c}: ${escapeHtml(formatValue(e.effect_id, dv(e, c)))}</td>`;
    return `<td class="val val-cap" title="Stops scaling at L${c} (within EQL's L${MAX_LEVEL})">Caps at L${c}</td>`;
  };
  const factOf = (pres) => pres.publication === "fact"
    ? ' <span class="fact-mark" title="EQL-grounded">✓</span>' : "";
  // non-base parts of a VALUE row (e.g. Accuracy's skill qualifier) ride
  // along in the Effect cell as muted context
  const sideParts = (pres) => {
    const extra = pres.parts.filter(p => p.field !== "base" && p.text);
    return extra.length
      ? ` <span class="muted">· ${extra.map(p => escapeHtml(p.text)).join(" · ")}</span>` : "";
  };
  const hasProc = semanticRows.some(([, pres]) => pres.parts.some(p => p.linkSpellId));
  const levelSlider = (valueRows.length || hasProc) ? `
    <div class="level-panel" data-level-panel data-spell-id="${spell.id}">
      <label for="lvlSlider">Caster level: <output id="lvlOut" data-level-out>${selLevel}</output>
        <span class="muted">(the value column follows this)</span></label>
      <input id="lvlSlider" type="range" min="1" max="${MAX_LEVEL}" value="${selLevel}"
             data-level-slider aria-label="Caster level"
             aria-valuemin="1" aria-valuemax="${MAX_LEVEL}" aria-valuenow="${selLevel}">
    </div>` : "";
  const valuesHtml = valueRows.length ? `
    <h3 class="fx-section">Scaling values</h3>
    <table class="effects-table">
      <thead><tr><th>Slot</th><th>Effect</th>
        <th class="val" data-level-col-head>At L${selLevel}</th>
        <th class="val">Scaling limit</th></tr></thead>
      <tbody>${valueRows.map(([e, pres]) => {
        const tier = confidenceTier(e.effect_id, e.formula);
        return `<tr class="tier-${tier}">
        <td>${e.slot + 1}</td>
        <td><a href="#/effect/${e.effect_id}">${escapeHtml(spaName(e.effect_id))}</a>
            <span class="muted">#${e.effect_id}</span>${sideParts(pres)} ${tierBadge(tier)}</td>
        <td class="val val-live" data-level-cell data-eid="${e.effect_id}" data-base="${e.base_value}"
            data-formula="${e.formula}" data-max="${e.max_value}" data-dur="${isDuration ? 1 : 0}"
            data-upg="${upgradeKind(e.effect_id, e.base_value)}">${escapeHtml(formatValue(e.effect_id, dv(e, selLevel)))}${factOf(pres)}</td>
        ${scalingLimit(e)}
      </tr>`;
      }).join("")}</tbody>
    </table>` : "";
  const semanticHtml = semanticRows.length ? `
    <h3 class="fx-section">Other effects</h3>
    <ul class="sem-effects">${semanticRows.map(([e, pres]) => `
      <li class="sem-effect">
        <span class="pres-cell"><a href="#/effect/${e.effect_id}">${escapeHtml(spaName(e.effect_id))}</a>
          <span class="muted">—</span> ${(() => {
            const fp = focusPhrase(e, resolvers);
            if (fp != null) return escapeHtml(fp) + factOf(pres);
            const pp = petPhrase(pres);
            if (pp != null) return escapeHtml(pp);   // decoded template: no ✓
            return (procRowHtml(e, pres)
              ?? (presPartsHtml(pres, e.effect_id) || '<span class="muted">—</span>')) + factOf(pres);
          })()}</span>
        ${(() => {
          const proc = pres.parts.find(p => p.linkSpellId);
          return proc ? `
        <details class="proc-inline" data-proc-spell="${proc.linkSpellId}" open>
          <summary>Triggered effect</summary>
          <div class="proc-body muted">Loading…</div>
        </details>` : "";
        })()}
        <details class="raw-detail"><summary>Technical details</summary>
          <span class="muted">slot ${e.slot + 1} · base ${e.base_value} · limit ${e.limit_value}
          · max ${e.max_value} · formula ${e.formula}${pres.rawDetail ? ` · ${escapeHtml(pres.rawDetail)}` : ""}</span>
        </details>
      </li>`).join("")}</ul>` : "";
  const tierControl = renderUpgradeControl(spell, effects, selUpgrade);
  const simPanel = (levelSlider || tierControl)
    ? `<div class="sim-panel">${levelSlider}${tierControl}</div>` : "";
  const effectsHtml = (valueRows.length || semanticRows.length)
    ? `${simPanel}${valuesHtml}${semanticHtml}`
    : `${simPanel}<p class="muted">No effects recorded.</p>`;

  const classesHtml = classes.length ? `
    <table class="kv">${classes.map(c => `<tr>
      <th><a href="#/class/${classSlug(c.class_index)}">${escapeHtml(c.class_name)}</a></th>
      <td>L${levelDisplay(c.min_level)}</td></tr>`).join("")}</table>`
    : `<p class="muted">No player classes can cast this at L≤${MAX_LEVEL}.</p>`;

  const lineHtml = groupSiblings.length > 1 ? `
    <h2>Ranks</h2>
    <ul class="line">${groupSiblings.map(s => `<li${s.id === spell.id ? ' class="current"' : ''}>
      Rk.${s.rank}: <a href="#/spell/${s.id}">${escapeHtml(s.name)}</a></li>`).join("")}</ul>` : "";

  // The in-game "Spell Line" (spell_category -> dbstr type 27): level-ordered
  // mates, e.g. Holy Remedy = Minor -> Light -> Healing -> Greater -> Superior.
  const lineMates = spell.spell_category > 0 ? await query(
    `SELECT s.id, s.name, MIN(sc.min_level) AS lvl
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE s.spell_category = ? AND sc.verified = 1 AND sc.min_level <= ?
      GROUP BY s.id ORDER BY lvl, s.id`, [spell.spell_category, MAX_LEVEL]) : [];
  const lineMatesHtml = (catText && lineMates.length > 1) ? `
    <h2>Spell line — ${escapeHtml(catText)}</h2>
    <ul class="line">${lineMates.map(s => `<li${s.id === spell.id ? ' class="current"' : ''}>
      L${s.lvl}: <a href="#/spell/${s.id}">${escapeHtml(s.name)}</a></li>`).join("")}</ul>` : "";

  const msgsHtml = msgs ? `
    <h2>Messages</h2>
    <dl class="msgs">
      ${msgs.you_cast ? `<dt>When you cast</dt><dd>${escapeHtml(msgs.you_cast)}</dd>` : ""}
      ${msgs.other_casts ? `<dt>When someone else casts</dt><dd>${escapeHtml(msgs.other_casts)}</dd>` : ""}
      ${msgs.cast_on_you ? `<dt>Cast on you</dt><dd>${escapeHtml(msgs.cast_on_you)}</dd>` : ""}
      ${msgs.cast_on_other ? `<dt>Cast on other</dt><dd>${escapeHtml(msgs.cast_on_other)}</dd>` : ""}
      ${msgs.spell_fades ? `<dt>Fades</dt><dd>${escapeHtml(msgs.spell_fades)}</dd>` : ""}
    </dl>` : "";

  return `
    <nav class="breadcrumb"><a href="#/">Classes</a> ›
      <span>${escapeHtml(spell.name)} <span class="muted">(#${spell.id})</span></span></nav>
    <div class="spell-header">
      ${iconImg(spell.new_icon, "icon icon-lg")}
      <div><h1>${escapeHtml(spell.name)}${spell.ritual_eligible ? ' <span class="tag tag-ritual" title="Castable as a Ritual from the Actions window (default L): bypasses class/level requirements if an unlocked class qualifies.">Ritual</span>' : ""}</h1>
        <div class="muted">
          Spell #${spell.id} · ${spell.is_discipline ? "Discipline" : "Spell"}
          ${spell.spell_group ? ` · <a href="#/group/${spell.spell_group}">Spell group ${spell.spell_group}</a> (Rk.${spell.rank})` : ""}
          · Target: ${escapeHtml(targetName(spell.target_type))}
          · Resist: ${escapeHtml(resistName(spell.resist_type))}
        </div></div>
    </div>
    <div class="cols">
      <section class="col-left">
        <h2>Description</h2>
        ${rendered ? `<div class="desc desc-rendered"
          data-desc-original="${escapeHtml(rendered)}"
          data-desc-template="${escapeHtml(descText || "")}"
          data-aoe-max="${spell.aoe_max_targets || 0}"
          data-aoe-dur="${spell.aoe_duration || 0}"
          data-desc-duration="${escapeHtml(duration)}"
          data-desc-effects="${escapeHtml(JSON.stringify(effects.map(e => ({
            slot: e.slot, effect_id: e.effect_id, base_value: e.base_value,
            limit_value: e.limit_value, max_value: e.max_value, formula: e.formula,
          }))))}">${rendered}</div>` : ""}
        ${descText ? `<details class="raw-detail"><summary>Template text (placeholders visible)</summary><pre class="desc-raw">${escapeHtml(descText)}</pre></details>` : ""}
        ${catText ? `<p class="muted"><strong>Spell line:</strong> <a href="#/spells?line=${spell.spell_category}">${escapeHtml(catText)}</a></p>` : ""}
        ${typeText ? `<p class="muted"><strong>Type:</strong> ${escapeHtml(categoryLabel(typeText))}</p>` : ""}
        ${effectText ? `<p class="muted"><strong>Effect:</strong> ${escapeHtml(categoryLabel(effectText))}</p>` : ""}
        ${secText ? `<p class="muted"><strong>Secondary:</strong> ${escapeHtml(secText)}</p>` : ""}
        <h2>Effects</h2>\n        <p class="muted disclosure">${DISCLOSURE}</p>${effectsHtml}
        ${msgsHtml}
      </section>
      <aside class="col-right">
        <h2>Stats <span data-s-chip></span></h2>
        <table class="kv">
          <tr><th>Mana</th><td data-s="mana">${spell.mana}</td></tr>
          ${spell.endurance_cost ? `<tr><th>Endurance</th><td>${spell.endurance_cost}</td></tr>` : ""}
          <tr><th>Cast time</th><td data-s="cast">${fmtSeconds(spell.cast_time)}s</td></tr>
          <tr><th>Reuse <span class="muted">(in-game)</span></th><td data-s="reuse">${Math.floor((spell.recast_time || 0) / 1000)}s
              <span class="muted">(raw recast: ${fmtSeconds(spell.recast_time)}s)</span></td></tr>
          <tr><th>Recovery <span class="muted">(internal)</span></th><td data-s="rec">${fmtSeconds(spell.recovery_time)}s</td></tr>
          <tr><th>Duration <span class="muted" data-dur-level>@L${selLevel}</span></th><td data-s="dur" data-dur-formula="${spell.buff_duration_formula}" data-dur-cap="${spell.buff_duration}">${durationAtLevel}${spell.buff_duration ? ` <span class="muted">(formula ${spell.buff_duration_formula}, cap ${spell.buff_duration})</span>` : ""}</td></tr>
          <tr><th>Range</th><td>${spell.range}</td></tr>
          ${procRateKv(visEffects)}
          ${spell.aoe_range ? `<tr><th>AoE range</th><td>${spell.aoe_range}</td></tr>` : ""}
          <tr><th>Resist diff</th><td data-s="resist">${spell.resist_difficulty}</td></tr>
          ${spell.timer_id ? `<tr><th>Timer (shared cooldown)</th><td>${spell.timer_id}</td></tr>` : ""}
          ${spell.reflectable === -1 ? `<tr><th>Reflectable</th><td>Yes</td></tr>` :
            (spell.reflectable === 0 && spell.good_effect === 0
              ? `<tr><th>Reflectable</th><td>No</td></tr>` : "")}
          ${spell.pet_template ? `<tr><th>Pet template</th><td>${spell.pet_template}</td></tr>` : ""}
          ${spell.teleport_zone ? `<tr><th>Teleport / pet</th><td>${escapeHtml(spell.teleport_zone)}</td></tr>` : ""}
          ${spell.recourse_link ? `<tr><th>Recourse</th><td><a href="#/spell/${spell.recourse_link}">spell #${spell.recourse_link}</a></td></tr>` : ""}
        </table>
        <h2>Classes</h2>${classesHtml}
        ${lineMatesHtml}
        ${lineHtml}
        ${await stackingPanel(spell)}
      </aside>
    </div>`;
}

// ── detail-page stacking panel ───────────────────────────────────────────
// "Before you buy": what replaces this spell, what it blocks, what it will
// not land over — computed against every obtainable spell with the same
// parity-gated engine as #/stacks (verdicts at L50). Answers the community
// "obsolete due to <xyz>" request on the spell's own page.
let _stackCorpus = null;
async function stackCorpus() {
  if (_stackCorpus) return _stackCorpus;
  const spells = await query(
    `SELECT s.id, s.name, s.good_effect, s.buff_duration, s.buff_duration_formula,
            s.target_type, s.is_discipline
       FROM spells s
      WHERE s.id IN (SELECT spell_id FROM spell_classes WHERE verified = 1)
        AND s.is_discipline = 0`);
  const effRows = await query(
    `SELECT spell_id, slot, effect_id, base_value, limit_value, formula, max_value
       FROM spell_effects
      WHERE spell_id IN (SELECT spell_id FROM spell_classes WHERE verified = 1)
      ORDER BY spell_id, slot`);
  const bardRows = await query(
    `SELECT DISTINCT spell_id FROM spell_classes
      WHERE class_index = 7 AND min_level < 255 AND verified = 1`);
  const effMap = new Map();
  for (const e of effRows) {
    if (!effMap.has(e.spell_id)) effMap.set(e.spell_id, []);
    effMap.get(e.spell_id).push(e);
  }
  const bardSet = new Set(bardRows.map(r => r.spell_id));
  _stackCorpus = spells.map(r => {
    const classes = Array.from({ length: 16 }, () => 255);
    if (bardSet.has(r.id)) classes[7] = 1;
    return { name: r.name, view: spellView({ ...r, classes, effects: effMap.get(r.id) || [] }) };
  });
  return _stackCorpus;
}

async function stackingPanel(spell) {
  // instants (no duration) do not occupy a buff slot — nothing to show
  if (!spell.buff_duration_formula) return "";
  const corpus = await stackCorpus();
  const mine = corpus.find(c => c.view.id === spell.id);
  if (!mine) return "";
  const replacedBy = [], blocks = [], blockedBy = [];
  for (const other of corpus) {
    if (other.view.id === spell.id) continue;
    const out = checkStackConflict(mine.view, other.view, 50, 50);   // other cast over me
    const back = checkStackConflict(other.view, mine.view, 50, 50); // me cast over other
    if (out === 1) replacedBy.push(other);
    if (out === -1) blocks.push(other);
    if (back === -1) blockedBy.push(other);
  }
  if (!replacedBy.length && !blocks.length && !blockedBy.length) return "";
  const list = (items) => items
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `<a href="#/spell/${c.view.id}">${escapeHtml(c.name)}</a>`).join(", ");
  const row = (label, items) => items.length ? `
    <details class="stack-detail"><summary>${label} <span class="muted">(${items.length})</span></summary>
      <div class="stack-detail-list">${list(items)}</div></details>` : "";
  return `<h2>Stacking</h2>
    <div class="muted" style="font-size:.85em;margin-bottom:.35em">vs. all
    obtainable spells at L50 · reference semantics (EQEmu-derived)</div>
    ${row("Replaced when these land", replacedBy)}
    ${row("Blocks these from landing", blocks)}
    ${row("Will not land over", blockedBy)}`;
}

// Live-recompute the spell detail page when the caster-level slider moves — no
// re-route (mirrors the upgrade-tier slider). Updates the value column, the
// DESCRIPTION (#N substitutes the level-scaled value — client behavior,
// OBS-2026-027) and the Duration stat (f3/f11 are OBSERVED level-scaling —
// OBS-2026-001/024). Persists ?level in the hash via replaceState so it
// stays shareable without triggering a navigation.
export function updateLevelView(slider) {
  const level = clampLevel(slider.value, MAX_LEVEL);
  slider.setAttribute("aria-valuenow", String(level));
  const out = document.querySelector("[data-level-out]");
  if (out) out.textContent = String(level);
  for (const h of document.querySelectorAll("[data-level-col-head]")) h.textContent = "At L" + level;
  refreshValueCells();                    // composes caster level × Spell Level
  refreshDescription();
  refreshDurationStat();
  for (const det of document.querySelectorAll("details[data-proc-spell]")) {
    if (/** @type {HTMLElement} */ (det).dataset.loaded) loadProcInline(det, true);
  }
  const panel = slider.closest("[data-level-panel]");
  const id = panel && panel.dataset.spellId;
  if (id) {
    try {
      let hash = spellLevelHash(id, level, MAX_LEVEL);
      // preserve ?upgrade — the two sliders share the URL
      const upg = /** @type {HTMLInputElement|null} */ (document.querySelector("[data-upgrade-slider]"));
      if (upg && +upg.value > 0) hash += (hash.includes("?") ? "&" : "?") + "upgrade=" + upg.value;
      history.replaceState(null, "", hash);
    } catch { /* file:// — ignore */ }
  }
}

// ---------------------------------------------------------------------------
// GROUP
// ---------------------------------------------------------------------------

export async function renderGroup(gid) {
  const rows = await query(
    "SELECT id, name, rank, new_icon FROM spells WHERE spell_group = ? ORDER BY rank, id",
    [gid]);
  if (!rows.length) return `<p>No spell group ${gid}.</p>`;
  return `<nav class="breadcrumb"><a href="#/">Classes</a> › Spell group ${gid}</nav>
    <h1>Spell group ${gid}</h1>
    <table class="spell-table">
      <thead><tr><th>Icon</th><th>Rank</th><th>Name</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${iconImg(r.new_icon)}</td>
        <td>Rk.${r.rank}</td>
        <td><a href="#/spell/${r.id}">${escapeHtml(r.name)}</a></td>
      </tr>`).join("")}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// EFFECT REVERSE-INDEX
// ---------------------------------------------------------------------------

export async function renderEffect(eid) {
  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, se.slot, se.base_value,
            se.limit_value, se.formula, se.max_value
       FROM spell_effects se JOIN spells s ON s.id = se.spell_id
      WHERE se.effect_id = ?
        AND EXISTS (SELECT 1 FROM spell_classes sc
                    WHERE sc.spell_id = s.id AND sc.min_level <= ?)
      ORDER BY s.name LIMIT 500`,
    [eid, MAX_LEVEL]);
  return `<nav class="breadcrumb"><a href="#/">Classes</a> › Effect ${escapeHtml(spaName(eid))}</nav>
    <h1>Spells using ${escapeHtml(spaName(eid))} <span class="muted">#${eid}</span></h1>
    <p class="muted">First 500 spells matching this spell-affect, restricted to L≤${MAX_LEVEL}.\n      Raw field values shown verbatim (unverified corpus). ${DISCLOSURE}</p>
    <table class="spell-table">
      <thead><tr><th>Icon</th><th>Name</th><th>Slot</th>
        <th>Raw Base</th><th>Raw Limit</th><th>Formula</th><th>Raw Max</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${iconImg(r.new_icon)}</td>
        <td><a href="#/spell/${r.id}">${escapeHtml(r.name)}</a></td>
        <td>${r.slot + 1}</td>
        <td>${r.base_value}</td>
        <td>${r.limit_value} <span class="muted">${escapeHtml(limitValueLabel(eid, r.limit_value))}</span></td>
        <td>${r.formula}</td><td>${r.max_value}</td>
      </tr>`).join("")}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// SKILLS
// ---------------------------------------------------------------------------

export async function renderSkills() {
  const counts = await query(
    `SELECT s.skill, COUNT(DISTINCT s.id) AS c
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE sc.min_level <= ?
      GROUP BY s.skill`, [MAX_LEVEL]);
  const countMap = new Map(counts.map(r => [r.skill, r.c]));
  const all = new Set();
  const groups = Object.entries(SKILL_CATEGORIES).map(([cat, ids]) => {
    ids.forEach(i => all.add(i));
    const items = SKILLS.filter(s => ids.includes(/** @type {number} */ (s.id)))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    return { cat, items };
  });
  const uncategorized = SKILLS.filter(s => !all.has(s.id));
  if (uncategorized.length) groups.push({ cat: "Other", items: uncategorized });

  return `<nav class="breadcrumb"><a href="#/">Classes</a> › Skills</nav>
    <h1>Skills</h1>
    <p class="lede">${SKILLS.length} skills.
    Click into a skill to see which spells/disciplines use it.
    <span class="muted">Per-class skill caps and skill-up rates are server-side
    and not represented here.</span></p>
    ${groups.map(g => `<section class="skill-cat">
      <h2>${escapeHtml(g.cat)}</h2>
      <table class="spell-table">
        <thead><tr><th>Skill</th><th>Code</th><th>Spells / Disciplines</th></tr></thead>
        <tbody>${g.items.map(s => `<tr>
          <td><a href="#/skill/${s.id}">${escapeHtml(s.name)}</a></td>
          <td class="muted"><code>${escapeHtml(s.code)}</code> · id ${s.id}</td>
          <td>${countMap.get(s.id) || '—'}</td></tr>`).join("")}</tbody>
      </table></section>`).join("")}`;
}

export async function renderSkill(skillId) {
  const info = SKILLS.find(s => s.id === skillId);
  if (!info) return `<p>Unknown skill #${skillId}.</p>`;
  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, s.is_discipline, s.mana,
            s.endurance_cost, s.cast_time,
            MIN(sc.min_level) AS first_level,
            GROUP_CONCAT(DISTINCT sc.class_name) AS class_list
       FROM spells s
       JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE s.skill = ? AND sc.min_level <= ?
      GROUP BY s.id
      ORDER BY first_level, s.name`,
    [skillId, MAX_LEVEL]);
  return `<nav class="breadcrumb"><a href="#/">Classes</a> ›
      <a href="#/skills">Skills</a> › ${escapeHtml(info.name)}</nav>
    <h1>${escapeHtml(info.name)}</h1>
    <p class="muted"><code>${escapeHtml(info.code)}</code> · skill id ${info.id}
    · ${rows.length} spells/disciplines use this skill.</p>
    ${rows.length ? `<table class="spell-table">
      <thead><tr><th>Icon</th><th>Name</th><th>First Lv</th><th>Classes</th>
        <th>Mana</th><th>End</th><th>Cast</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${iconImg(r.new_icon)}</td>
        <td><a href="#/spell/${r.id}">${escapeHtml(r.name)}</a>${r.is_discipline ? ' <span class="tag tag-disc">disc</span>' : ''}</td>
        <td>${r.first_level ?? '—'}</td>
        <td class="muted">${escapeHtml(r.class_list || '—')}</td>
        <td>${r.mana}</td><td>${r.endurance_cost}</td>
        <td>${fmtSeconds(r.cast_time)}s</td>
      </tr>`).join("")}</tbody></table>`
      : '<p class="muted">No spells/disciplines reference this skill in EQL data at L≤' + MAX_LEVEL + '.</p>'}`;
}

// ---------------------------------------------------------------------------
// RACES
// ---------------------------------------------------------------------------

export async function renderRaces() {
  const rows = [];
  for (const r of PLAYER_RACES) {
    const name = (await dbstr(r.id, 11)) || r.code;
    rows.push({ ...r, name });
  }
  return `<nav class="breadcrumb"><a href="#/">Classes</a> › Races</nav>
    <h1>Player Races</h1>
    <p class="lede">${rows.length} player races. Click into a race for lore.</p>
    <aside class="notice">
      <strong>Note:</strong> Race↔class permissions (which races can roll which
      classes) are server-side character-creation rules and aren't available
      from the EQL client files we have. We deliberately don't publish a
      race→class table since EQL may differ from Live and we'd just be guessing.
    </aside>
    <table class="spell-table">
      <thead><tr><th>Race</th><th>Code</th><th>Expansion</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><a href="#/race/${r.id}">${escapeHtml(r.name)}</a></td>
        <td class="muted"><code>${r.code}</code></td>
        <td class="muted">${escapeHtml(r.expansion)}</td></tr>`).join("")}</tbody>
    </table>`;
}

export async function renderRace(raceId) {
  if (!PLAYER_RACE_IDS.has(raceId)) return `<p>Unknown race id ${raceId}.</p>`;
  const meta = PLAYER_RACES.find(r => r.id === raceId);
  const singular = (await dbstr(raceId, 11)) || meta.code;
  const plural   = (await dbstr(raceId, 12)) || singular;
  const lore     = (await dbstr(raceId, 8))  || "";
  return `<nav class="breadcrumb">
      <a href="#/">Classes</a> ›
      <a href="#/races">Races</a> ›
      <span>${escapeHtml(singular)}</span>
    </nav>
    <h1>${escapeHtml(singular)}</h1>
    <p class="muted"><code>${meta.code}</code> · race id ${raceId} ·
      introduced in <em>${escapeHtml(meta.expansion)}</em> ·
      plural: <em>${escapeHtml(plural)}</em></p>
    ${lore ? `<div class="desc desc-rendered">${lore}</div>` : ""}
    <aside class="notice">
      <strong>Note:</strong> Which classes a ${escapeHtml(singular)} can roll
      is determined by the EQL server's character-creation rules, not the
      client data we have access to. Browse the
      <a href="#/">class list</a> directly for spell lists.
    </aside>`;
}

// ---------------------------------------------------------------------------
// AAs
// ---------------------------------------------------------------------------

export async function renderAAs(params) {
  const q = (params.get("q") || "").trim();
  const baseSql = `SELECT name, COUNT(*) AS ranks, MIN(dbstr_id) AS first_id FROM aas`;
  const order = `GROUP BY name ORDER BY name COLLATE NOCASE`;
  const rows = q
    ? await query(`${baseSql} WHERE name LIKE ? COLLATE NOCASE ${order} LIMIT 1000`, [`%${q}%`])
    : await query(`${baseSql} ${order}`);
  return `<nav class="breadcrumb"><a href="#/">Classes</a> › Alternate Advancement</nav>
    <h1>Alternate Advancement</h1>
    <p class="lede">${rows.length} distinct entries catalogued from <code>dbstr_us.txt</code>
    (type 1 names + type 4 descriptions).</p>
    <aside class="notice">
      <strong>Note:</strong> This list mixes real player AAs with
      <em>item-bestowed effect descriptors</em>. About 500 of the entries
      (look for <code>Item:</code> and <code>Focus:</code> prefixes) are
      effects granted by gear, not abilities a character can train.
      Per-class restrictions, prerequisites, point costs, and rank
      progressions are server-side data we don't have, so we can't tell
      you which class can train a given AA or how much it costs &mdash;
      only what the dbstr name and description say.
    </aside>
    <form class="diff-form" data-form="aas">
      <div class="diff-controls">
        <label>Filter by name:
          <input type="text" name="q" value="${escapeHtml(q)}" placeholder="Combat, Innate, Hastened…">
        </label>
        <button type="submit">Search</button>
        ${q ? '<a href="#/aas" class="muted">clear</a>' : ''}
      </div>
    </form>
    <table class="spell-table">
      <thead><tr><th>Name</th><th>Ranks</th><th>First dbstr id</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td><a href="#/aa/${encodeURIComponent(r.name)}">${escapeHtml(r.name)}</a></td>
        <td>${r.ranks}</td>
        <td class="muted">${r.first_id}</td>
      </tr>`).join("")}</tbody>
    </table>`;
}

export async function renderAA(name) {
  const ranks = await query(
    "SELECT dbstr_id, name, description FROM aas WHERE name = ? COLLATE NOCASE ORDER BY dbstr_id",
    [name]);
  if (!ranks.length) return `<p>No AA named ${escapeHtml(name)}.</p>`;
  return `<nav class="breadcrumb"><a href="#/">Classes</a> ›
      <a href="#/aas">AAs</a> › ${escapeHtml(ranks[0].name)}</nav>
    <h1>${escapeHtml(ranks[0].name)}</h1>
    <p class="muted">${ranks.length} rank${ranks.length === 1 ? '' : 's'}
    found in <code>dbstr_us.txt</code>.</p>
    <aside class="notice">
      <strong>Note:</strong> AA prerequisites, point cost, per-class
      eligibility, and rank-progression rules are server-side data we
      don't have access to. If the name starts with <code>Item:</code>
      or <code>Focus:</code>, this is not a player-trainable AA at all
      &mdash; it's an effect granted by gear that the client surfaces in
      the same dbstr table.
    </aside>
    <table class="effects-table">
      <thead><tr><th>Rank #</th><th>dbstr id</th><th>Description</th></tr></thead>
      <tbody>${ranks.map((r, i) => `<tr>
        <td>${i + 1}</td><td class="muted">${r.dbstr_id}</td>
        <td>${r.description || '—'}</td></tr>`).join("")}</tbody>
    </table>`;
}

// ---------------------------------------------------------------------------
// SEARCH
// ---------------------------------------------------------------------------

export async function renderSearch(params) {
  const q = (params.get("q") || "").trim();
  let rows = [];
  if (q) {
    rows = await query(
      "SELECT id, name, new_icon FROM spells WHERE name LIKE ? COLLATE NOCASE ORDER BY name LIMIT 200",
      [`%${q}%`]);
  }
  return `<h1>Search: <span class="muted">${escapeHtml(q)}</span></h1>
    ${rows.length ? `<table class="spell-table">
      <thead><tr><th>Icon</th><th>Name</th><th>#</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${iconImg(r.new_icon)}</td>
        <td><a href="#/spell/${r.id}">${escapeHtml(r.name)}</a></td>
        <td class="muted">${r.id}</td></tr>`).join("")}</tbody></table>`
      : (q ? '<p>No matches.</p>' : '<p class="muted">Type a query above to search.</p>')}`;
}

// ── #/stacks — "given this trio, what all stacks together?" ──────────────
// Runs the parity-gated stacking engine (stacking.js — the CheckStackConflict
// port, REFERENCE semantics) pairwise over the trio's castable duration
// spells and presents the RESOLVED answer: best-in-line survivors, "pick one"
// exclusive groups, and per-row expandable notes showing what each survivor
// replaces or conflicts with. The full verdict matrix is computed anyway, so
// richer conflict views can be added without reworking the engine plumbing.

async function stacksCandidates(clsIdxs, level, pool) {
  const ph = clsIdxs.map(() => "?").join(",");
  const goodPred = pool === "det" ? "s.good_effect = 0" : "s.good_effect IN (1, 2)";
  // "party" = buffs placeable on one of YOUR characters (self/single/friendly/
  // group targets); "pet" = pet-only buffs, a separate stacking surface (they
  // occupy the pet's slots, so they only conflict among themselves);
  // "det" = every duration detrimental ("what stacks on one target").
  const targPred = pool === "party" ? "s.target_type IN (5, 6, 40, 41, 51, 56)"
    : pool === "pet" ? "s.target_type = 14" : "1=1";
  // buffs must persist to occupy a slot; the detrimental casting view also
  // wants INSTANT nukes/utilities (they never stack — nothing to resolve)
  const durPred = pool === "det" ? "1=1" : "s.buff_duration_formula != 0";
  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, s.good_effect, s.buff_duration,
            s.buff_duration_formula, s.target_type, s.is_discipline,
            s.spell_category, s.mana, s.cast_time, s.recast_time,
            s.aoe_max_targets,
            MIN(sc.min_level) AS min_level,
            GROUP_CONCAT(sc.class_index || ':' || sc.min_level) AS class_pairs
       FROM spells s JOIN spell_classes sc ON sc.spell_id = s.id
      WHERE sc.verified = 1 AND s.is_discipline = 0
        AND sc.class_index IN (${ph}) AND sc.min_level <= ?
        AND ${goodPred} AND ${targPred}
        AND ${durPred}
      GROUP BY s.id ORDER BY s.name`, [...clsIdxs, level]);
  if (!rows.length) return { rows, effMap: new Map(), bardSet: new Set() };
  const ids = rows.map(r => r.id);
  const sub = ids.map(() => "?").join(",");
  const effRows = await query(
    `SELECT spell_id, slot, effect_id, base_value, limit_value, formula, max_value
       FROM spell_effects WHERE spell_id IN (${sub}) ORDER BY spell_id, slot`, ids);
  const effMap = new Map();
  for (const e of effRows) {
    if (!effMap.has(e.spell_id)) effMap.set(e.spell_id, []);
    effMap.get(e.spell_id).push(e);
  }
  const bardRows = await query(
    `SELECT DISTINCT spell_id FROM spell_classes
      WHERE spell_id IN (${sub}) AND class_index = 7 AND min_level < 255`, ids);
  return { rows, effMap, bardSet: new Set(bardRows.map(r => r.spell_id)) };
}

export async function renderStacks(params) {
  const clsSlugs = params.getAll("class").filter(Boolean);
  const clsIdxs = [...new Set(clsSlugs.map(classIndexFromArg)
    .filter(i => Number.isInteger(i) && i >= 0 && i <= 15))];
  const level = Math.min(MAX_LEVEL,
    Math.max(1, parseInt(params.get("level") || String(MAX_LEVEL), 10) || MAX_LEVEL));
  const upg = Math.min(10, Math.max(0, parseInt(params.get("upg") || "0", 10) || 0));
  const mode = params.get("mode") === "det" ? "det" : "buffs";

  const classOption = (selIdx) => `<option value="">(pick)</option>` +
    Array.from({ length: 16 }, (_, i) => i)
      .sort((a, b) => CLASS_NAMES[a].localeCompare(CLASS_NAMES[b]))
      .map(i =>
        `<option value="${classSlug(i)}"${selIdx === i ? " selected" : ""}>${escapeHtml(CLASS_NAMES[i])}</option>`).join("");
  const classPickers = [0, 1, 2].map(slot => {
    const idx = clsIdxs[slot] ?? -1;
    const banner = idx >= 0
      ? `<img class="trio-banner" alt="" src="static/icons/classes/${String(idx).padStart(2, "0")}.png">`
      : `<span class="trio-banner trio-q">?</span>`;
    return `<label class="trio-slot">${banner}<select name="class">${classOption(idx)}</select></label>`;
  }).join(" ");
  const modeTab = (m, label) => {
    const p = new URLSearchParams(params); p.set("mode", m);
    return `<a class="classbtn${mode === m ? " active" : ""}" href="#/stacks?${p.toString()}">${label}</a>`;
  };
  const form = `
    <form class="diff-form" data-form="stacks">
      <input type="hidden" name="mode" value="${mode}">
      <div class="diff-controls trio-row" style="margin-bottom:.5em">
        <span class="muted">Your trio:</span>
        <span class="trio-slots">${classPickers}</span>
        ${clsIdxs.length ? `<a class="muted" style="margin-left:.6em"
          href="#/spells?${clsIdxs.map(i => "class=" + classSlug(i)).join("&")}">→ Browse this trio's spells</a>` : ""}
        <label>at level <input type="number" name="level" value="${level}" min="1" max="${MAX_LEVEL}" style="width:5em"></label>
        <label title="apply the upgrade model as if EVERY spell were at this Spell Level (0 = unupgraded client values)">Spell Level
          <output data-stacks-upg-out>${upg ? ROMAN[upg] : "0"}</output>
          <input type="range" name="upg" value="${upg}" min="0" max="10" step="1"
            data-stacks-upg style="width:9em;vertical-align:middle"
            aria-label="Spell Level (upgrade tier for every spell)"></label>
      </div>
    </form>
    <div class="diff-controls" style="margin-bottom:.75em">
      ${modeTab("buffs", "Buffs you can keep up together")}
      ${modeTab("det", "Debuffs & Damage")}
    </div>`;

  const intro = `<h2>Spell Stacking</h2>
    <p class="muted">Pick your three classes and a level: the list below is the
    resolved set — every row can be up at the same time. Superseded lower ranks
    are folded into their replacement; mutually exclusive spells are grouped as
    "pick one". Verdicts come from the game's stacking rules (reference
    semantics, EQEmu-derived).</p>`;

  if (clsIdxs.length === 0) {
    return `${intro}${form}<p class="muted">Choose at least one class to begin.</p>`;
  }

  // order (James 2026-08-25): benefit sections -> pet pool -> pick-one
  // groups -> situational, all expanded
  const pools = mode === "det" ? [["det", ""]]
    : [["party", ""], ["pet", "On your pet"]];
  const parts = [];
  let partyTail = "";
  for (const [pool, heading] of pools) {
    const { rows, effMap, bardSet } = await stacksCandidates(clsIdxs, level, pool);
    if (!rows.length) continue;
    const sec = await stacksSection(rows, effMap, bardSet, clsIdxs, level,
      pool === "party" ? "party" : pool === "det" ? "det" : null, upg);
    parts.push((heading ? `<h3>${heading}</h3>` : "") + sec.head);
    if (pool === "party") partyTail = sec.tail;
    else parts.push(sec.tail);
  }
  if (!parts.length) return `${intro}${form}<p>No castable ${mode === "det" ? "duration detrimentals" : "buffs"} for this trio at L${level}.</p>`;
  const body = parts.join("") + partyTail;
  return `${intro}${form}${body}
    <p class="muted" style="font-size:.85em">Stacking verdicts are computed from
    the game's rules as implemented by the EQEmu project (reference semantics);
    same-slot arbitration at your chosen level. Methodology cross-checked with
    <a href="https://eqltools.com/spellmaster" rel="noopener">eqltools.com</a>.</p>`;
}

// Ordered benefit sections for the buffs view (James, 2026-08-25): the
// buffs you keep up all the time first, situational utility last. A spell
// lands in the FIRST section any of its effects matches.
const STACK_BENEFIT_SECTIONS = [
  // weapon procs ONLY — trigger SPAs (289/340/374/475) ride delayed-heal
  // style spells (Efflorescing Heal) and classify by their real effects
  { label: "Procs", spas: [85, 323] },
  { label: "Haste", spas: [11, 98] },
  { label: "Attack", spas: [2] },
  { label: "HP & Regen", spas: [69, 100, 0, 44] },
  { label: "Armor Class", spas: [1, 416] },
  { label: "Stats", spas: [4, 5, 6, 7, 8, 9, 10, 97] },
  { label: "Resists", spas: [46, 47, 48, 49, 50, 111] },
  { label: "Mana", spas: [15] },
  { label: "Damage Shield", spas: [59] },
  { label: "Runes & Absorbs", spas: [55, 78, 161, 162, 163] },
];
const STACK_SITUATIONAL = "Situational & utility";

// Detrimental tab layout (James 2026-08-25): a casting-priority view —
// Direct Damage / DoTs / Debuffs & Control, damage sorted high-to-low so
// the player reads "what should I be casting" top-down.
const STACK_DET_SECTIONS = ["Direct Damage", "Area Damage (AE)",
                            "Damage over Time", "Debuffs & Control"];

// AE = capped multi-target (rains/PBAE with aoe_max_targets) or an
// AE-shaped target type (4 PB AE, 8 targeted AE) — separated from
// single-target nukes so the comparisons stay like-for-like (James).
const stackIsAe = (r) => r.aoe_max_targets > 1 ||
  r.target_type === 4 || r.target_type === 8;

function stackDetSection(r, effs) {
  // roots are CONTROL (James 2026-08-25) even when the spell also damages
  if (effs.some(e => e.effect_id === 99)) return "Debuffs & Control";
  // SPA 0 TICKS on duration spells; SPA 79 is a ONE-TIME hit even when the
  // spell carries a debuff rider with a duration (Fire/Ice are nukes whose
  // duration belongs to the resist debuff — James 2026-08-25)
  const ticking = effs.some(e => e.effect_id === 0 && e.base_value < 0);
  const oneShot = effs.some(e => e.effect_id === 79 && e.base_value < 0);
  const dd = (!r.buff_duration_formula && (ticking || oneShot)) ||
             (r.buff_duration_formula && !ticking && oneShot);
  if (dd) return stackIsAe(r) ? "Area Damage (AE)" : "Direct Damage";
  if (r.buff_duration_formula && ticking) return "Damage over Time";
  return "Debuffs & Control";
}

function stackBenefitSection(effs) {
  for (const s of STACK_BENEFIT_SECTIONS) {
    if (effs.some(e => s.spas.includes(e.effect_id) &&
        !(e.effect_id === 0 && e.base_value < 0) &&
        !(e.effect_id === 10 && e.base_value === 0))) return s.label;   // CHA spacer
  }
  return STACK_SITUATIONAL;
}

async function stacksSection(rows, effMap, bardSet, clsIdxs, level, layout, upg = 0) {
  // ── same-line rank fold FIRST (the client's own spell-line data) ──
  // The engine's value arbitration can invert quality where smaller numbers
  // are better (the lull line: `base` is the reduced assist radius, `max`
  // the target-level cap — Pacify's radius 1 loses a raw value comparison
  // to Lull's 15 despite being four ranks higher). Within a line the rank
  // order is authoritative: keep the highest castable rank, fold the rest.
  const byLine = new Map();
  for (const r of rows) {
    const key = r.spell_category || "solo:" + r.id;
    if (!byLine.has(key)) byLine.set(key, []);
    byLine.get(key).push(r);
  }
  // a spell may only fold/supersede another when their durations are in the
  // same regime (James 2026-08-25: Spirit of Cheetah's 48s sprint must not
  // eat Spirit of Wolf's 36 minutes). Order-of-magnitude tolerance: rank
  // upgrades legitimately trade some duration (Calm's 42s folds Soothe's
  // 2.5min — higher lull ranks pulse shorter but reach higher targets); a
  // 45x burst-vs-sustained gap is a different KIND of spell and never
  // folds. Negative ticks = permanent.
  const durTicks = (r) => {
    const t = durationTicks(r.buff_duration_formula, r.buff_duration, level);
    return t < 0 ? Infinity : t;
  };
  const durOk = (winner, loser) => durTicks(winner) * 10 >= durTicks(loser);
  const lineFolded = new Map();          // survivor id -> folded lower ranks
  const lineRows = [];
  for (const members of byLine.values()) {
    members.sort((a, b) => b.min_level - a.min_level || b.id - a.id);
    const unclaimed = [...members];
    while (unclaimed.length) {
      const head = unclaimed.shift();
      lineRows.push(head);
      const folds = unclaimed.filter(m => durOk(head, m));
      if (folds.length) {
        lineFolded.set(head.id, folds);
        for (const f of folds) unclaimed.splice(unclaimed.indexOf(f), 1);
      }
    }
  }
  rows = lineRows;
  const byId = new Map(rows.map(r => [r.id, r]));

  // engine views straight from DB rows (same shape the parity gate proves)
  const views = new Map(rows.map(r => {
    const classes = Array.from({ length: 16 }, () => 255);
    if (bardSet.has(r.id)) classes[7] = 1;
    return [r.id, spellView({
      id: r.id, name: r.name, good_effect: r.good_effect,
      buff_duration_formula: r.buff_duration_formula,
      buff_duration: r.buff_duration, target_type: r.target_type,
      is_discipline: r.is_discipline, classes,
      effects: effMap.get(r.id) || [],
    })];
  }));
  const ids = rows.map(r => r.id);
  const verdict = new Map();     // "a:b" -> conflict(a worn, b cast)
  for (const a of ids) for (const b of ids) {
    if (a !== b) verdict.set(a + ":" + b,
      checkStackConflict(views.get(a), views.get(b), level, level));
  }
  const v = (a, b) => verdict.get(a + ":" + b);

  // a is SUPERSEDED by b when casting b replaces a AND a cannot reclaim its
  // slot (the clean one-way upgrade shape: same line ranks, Temperance-style
  // directives, higher-value same-slot buffs).
  // instants occupy no buff slot: engine verdicts between them are
  // meaningless for a loadout — only duration spells contest slots
  const hasDur = (r) => !!r.buff_duration_formula;
  const supersededBy = new Map();
  for (const a of ids) for (const b of ids) {
    if (a !== b && hasDur(byId.get(a)) && hasDur(byId.get(b)) &&
        v(a, b) === 1 && v(b, a) === -1 &&
        durOk(byId.get(b), byId.get(a))) {
      if (!supersededBy.has(a)) supersededBy.set(a, []);
      supersededBy.get(a).push(b);
    }
  }
  // survivorship is a FIXPOINT against surviving spells only: a spell is
  // dropped iff some spell that itself survives supersedes it. (A spell
  // superseded only by dropped spells is castable in game — e.g. an illusion
  // blocked by Phantom Chain stays available once Guard replaces the Chain.)
  let dropped = new Set();
  for (let pass = 0; pass < ids.length; pass++) {
    const next = new Set(ids.filter(a =>
      (supersededBy.get(a) || []).some(b => !dropped.has(b))));
    if (next.size === dropped.size && [...next].every(x => dropped.has(x))) break;
    dropped = next;
  }
  const survivors = ids.filter(a => !dropped.has(a));

  // exclusive relation among survivors: any remaining nonzero verdict either
  // direction (mutual blocks, one-way blocks, last-cast-wins overwrites)
  const parent = new Map(survivors.map(x => [x, x]));
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (x, y) => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); };
  for (let i = 0; i < survivors.length; i++) for (let j = i + 1; j < survivors.length; j++) {
    const a = survivors[i], b = survivors[j];
    if (hasDur(byId.get(a)) && hasDur(byId.get(b)) &&
        (v(a, b) !== 0 || v(b, a) !== 0)) union(a, b);
  }
  const groups = new Map();
  for (const s of survivors) {
    const root = find(s);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(s);
  }
  const soloRows = [], pickOne = [];
  for (const members of groups.values()) {
    if (members.length === 1) soloRows.push(members[0]);
    else pickOne.push(members);
  }

  const resolvers = await buildResolvers(
    [...effMap.values()].flat(), query);
  const cells = (r, nameHtml) => {
    const classCell = (r.class_pairs || "").split(",")
      .map(p => { const [ci, lv] = p.split(":").map(Number); return { ci, lv }; })
      .filter(x => clsIdxs.includes(x.ci))
      .sort((a, b) => a.lv - b.lv)
      .map(x => escapeHtml(`${CLASS_ABBR[x.ci] || x.ci} ${x.lv}`)).join(" · ");
    let eff = friendlySummary(scaleEffs(r), level, r, resolvers, level);
    // modeled values must not wear the EQL-grounded mark
    if (upg) eff = eff.replace(/\s*<span class="fact-mark"[^>]*>[^<]*<\/span>/g, "");
    const aeCap = r.aoe_max_targets > 1 ? r.aoe_max_targets : 0;
    const effCols = layout === "det" ? (() => {
      const total = damageAt(r);
      if (!total) return `<td class="muted">—</td><td class="muted">—</td>`;
      // AE spells show the FULL-CAP number as the headline (James: the
      // largest number is the comparison that matters); the per-target
      // figure lives in the hover title
      const cell = (v) => {
        if (v === null) return "—";
        if (!aeCap) return v.toFixed(1);
        return `${(v * aeCap).toFixed(1)} <span class="muted"
          title="at the full ${aeCap}-target cap; per target: ${v.toFixed(1)}">×${aeCap}</span>`;
      };
      const perManaV = manaAt(r) > 0 ? total / manaAt(r) : null;
      const castS = castMsAt(r) / 1000, reuseS = recastMsAt(r) / 1000;
      const t = durTicksAt(r);
      const cycle = (r.buff_duration_formula && isFinite(t) && t > 0)
        ? Math.max(t * 6, castS + reuseS) : (castS + reuseS);
      const dpsV = cycle > 0 ? total / cycle : null;
      return `<td>${cell(perManaV)}</td><td>${cell(dpsV)}</td>`;
    })() : "";
    return `<td>${iconImg(r.new_icon)}</td>
      <td>${nameHtml}</td>
      <td class="muted">${classCell}</td>
      <td>${eff}</td>
      ${effCols}
      <td>${manaAt(r)}</td>
      <td>${fmtSeconds(castMsAt(r))}s${recastMsAt(r) > 0
        ? ` <span class="muted">/ ${fmtSeconds(recastMsAt(r))}s</span>` : ""}</td>
      <td>${fmtDur(durCapAt(r))}</td>
      ${aeCap ? shortTargetCell(r.target_type).replace("</td>",
          ` <span class="muted">×${aeCap}</span></td>`) : shortTargetCell(r.target_type)}`;
  };
  const rowHtml = (id) => {
    const r = byId.get(id);
    // "replaces" = folded same-line lower ranks (client line data) + spells
    // the engine says this one strictly supersedes
    const engineReps = ids.filter(x => v(x, id) === 1 && v(id, x) === -1);
    const lineReps = (lineFolded.get(id) || []).map(x => x.id);
    const reps = [...new Set([...lineReps, ...engineReps])]
      .map(x => byId.get(x) || (lineFolded.get(id) || []).find(m => m.id === x))
      .filter(Boolean)
      .sort((a, b) => b.min_level - a.min_level);
    // replaced spells expand as FULL comparison sub-rows under the parent
    // (James 2026-08-25) — the +N chip toggles them
    const chip = reps.length ? ` <button type="button" class="stack-fold-chip"
        data-fold="${r.id}" aria-expanded="false"
        title="replaces ${reps.length} lower-rank spell${reps.length > 1 ? "s" : ""} — click to compare">+${reps.length}</button>` : "";
    const parent = `<tr>${cells(r,
      `<a href="#/spell/${r.id}">${escapeHtml(r.name)}</a>${chip}`)}</tr>`;
    const subs = reps.map(x => `<tr class="stack-sub" data-fold-of="${r.id}" hidden>
      ${cells(x, `<span class="stack-sub-mark">↳</span> <a href="#/spell/${x.id}">${escapeHtml(x.name)}</a>`)}</tr>`).join("");
    return parent + subs;
  };
  // shared fixed column plan (site listing-table system): every section
  // table lines up; Effects absorbs the leftover width; mobile card layer
  // applies via .spell-table
  const detCols = layout === "det"
    ? `<col class="c-eff"><col class="c-eff">` : "";
  const detHead = layout === "det"
    ? `<th title="DPM — Damage per Mana: total damage per point of mana spent">DPM</th>
       <th title="DPS — Damage per Second, sustained: nukes over cast+recast, DoTs spread over their running duration">DPS</th>` : "";
  const stackCols = `<colgroup><col class="c-icon"><col class="c-name">
    <col class="c-cls"><col>${detCols}<col class="c-num"><col class="c-cast"><col class="c-dur"><col class="c-tgt"></colgroup>`;
  const tableHead = `<tr><th>Icon</th><th>Name</th><th>Your classes</th><th>Effects</th>${detHead}<th>Mana</th>
    <th title="cast time / recast cooldown">Cast / Recast</th><th>Dur</th><th>Target</th></tr>`;
  const stackTable = (rowsHtml) =>
    `<table class="spell-table t-stacks">${stackCols}${tableHead}${rowsHtml}</table>`;

  // ── uniform Spell Level (upgrade tier) modeling — DISPLAY + sort only.
  // Stacking/fold verdicts stay at base values: a uniform tier scales both
  // sides of every comparison, and the engine's reference semantics stay
  // honest to client data. Rates = the solved n=94 category model
  // (upgrades.js); scaled values are MODELED, so fact marks are stripped.
  const upCat = new Map();   // spell id -> classifyUpgradeCategory result
  const catOf = (r) => {
    if (!upCat.has(r.id)) upCat.set(r.id, classifyUpgradeCategory(r, effMap.get(r.id) || []));
    return upCat.get(r.id);
  };
  const scaleEffs = (r) => {
    const effs = effMap.get(r.id) || [];
    if (!upg) return effs;
    // model semantics (D2 review): caster level gives the BASE value, the
    // Spell Level MULTIPLIES it — so scale the FINAL leveled value and emit
    // a flat (formula-100) effect. Lossless here: this page renders at one
    // fixed level, so ranges are single values anyway. Matches the detail
    // page's slider exactly (Upheaval 638 -> 1020 at tier 10).
    const dmgRate = catOf(r).key === "dot" ? 0.03 : 0.06;
    const flat = (e, rate, rnd) => {
      const v = calcSpellValue(e.base_value, e.formula, e.max_value, level);
      const scaled = (v < 0 ? -1 : 1) * rnd(Math.abs(v) * (1 + rate * upg));
      return { ...e, base_value: scaled, formula: 100, max_value: 0 };
    };
    return effs.map(e => {
      if (e.effect_id === 0 && e.base_value < 0) return flat(e, dmgRate, Math.floor);
      if ((e.effect_id === 0 && e.base_value > 0) || e.effect_id === 100 || e.effect_id === 44)
        return flat(e, 0.03, Math.round);
      if (e.effect_id === 79 && e.base_value < 0) return flat(e, 0.06, Math.floor);
      return e;
    });
  };
  const manaAt = (r) => (upg && r.mana > 0)
    ? Math.round(r.mana * (1 - catOf(r).mana * upg)) : r.mana;
  const castMsAt = (r) => upg ? r.cast_time * (1 - catOf(r).cast * upg) : r.cast_time;
  const recastMsAt = (r) => (upg && r.recast_time > 0)
    ? Math.max(1000, Math.floor(r.recast_time * (1 - 0.02 * upg))) : r.recast_time;
  const durEligible = (r) => catOf(r).dur !== null &&
    (r.buff_duration_formula || 0) > 0 && r.buff_duration_formula !== 50 &&
    (r.buff_duration || 0) > 0;
  const durTicksAt = (r) => {
    const t = durTicks(r);
    if (!upg || !durEligible(r) || !isFinite(t)) return t;
    return Math.round(t * (1 + catOf(r).dur * upg));
  };
  const durCapAt = (r) => (upg && durEligible(r))
    ? Math.round(r.buff_duration * (1 + catOf(r).dur * upg)) : r.buff_duration;
  const damageAt = (r) => {
    let best = 0;
    for (const e of scaleEffs(r)) {
      if ((e.effect_id === 0 || e.effect_id === 79) && e.base_value < 0) {
        const val = Math.abs(calcSpellValue(e.base_value, e.formula, e.max_value, level));
        const t = r.buff_duration_formula && e.effect_id === 0
          ? Math.max(1, Math.min(durTicksAt(r), 1e6)) : 1;
        best = Math.max(best, val * t);
      }
    }
    return best;
  };
  const groupBlock = (members) => {
    const names = members.map(id => byId.get(id).name);
    const label = names.every(n => /^(Illusion|Minor Illusion|Phantom|Wolf Form|Treeform|Form of)/.test(n))
      ? "Illusions & forms" : escapeHtml(names[0]) + " group";
    return `<h4 class="stack-section stack-pickone">Pick one — ${label}
      <span class="muted">(${members.length} options; they replace each other)</span></h4>
      ${stackTable(members.map(id => rowHtml(id)).join(""))}`;
  };
  const sortedGroups = pickOne.sort((a, b) => b.length - a.length);
  // a group belongs to the benefit section of its best member (James
  // 2026-08-25: Berserker Spirit and Firefist are stat/attack CHOICES, not
  // bottom-of-page noise)
  const groupSection = (members) =>
    stackBenefitSection(effMap.get(members[0]) || []);
  const groupHtml = sortedGroups
    .map(members => groupBlock(members)).join("");
  const soloSpells = soloRows.map(id => byId.get(id))
    .sort((a, b) => a.min_level - b.min_level || a.name.localeCompare(b.name));
  let soloHtml, situHtml = "", groupsPlaced = false;
  if (layout) {
    const classify = layout === "party"
      ? (r) => stackBenefitSection(effMap.get(r.id) || [])
      : (r) => stackDetSection(r, effMap.get(r.id) || []);
    const order = layout === "party"
      ? STACK_BENEFIT_SECTIONS.map(x => x.label) : STACK_DET_SECTIONS;
    const sortFor = (label, arr) =>
      (layout === "det" && label !== "Debuffs & Control")
        ? arr.sort((a, b) => damageAt(b) - damageAt(a) || a.name.localeCompare(b.name))
        : arr;
    const bySection = new Map();
    for (const r of soloSpells) {
      const label = classify(r);
      if (!bySection.has(label)) bySection.set(label, []);
      bySection.get(label).push(r);
    }
    const groupsBy = new Map();
    for (const members of sortedGroups) {
      const label = classify(byId.get(members[0]));
      if (!groupsBy.has(label)) groupsBy.set(label, []);
      groupsBy.get(label).push(members);
    }
    groupsPlaced = true;
    const parts = [];
    for (const label of order) {
      const members = bySection.get(label);
      const groups = groupsBy.get(label) || [];
      if (!members && !groups.length) continue;
      parts.push(`<h4 class="stack-section">${label}</h4>`);
      if (members) parts.push(stackTable(
        sortFor(label, members).map(r => rowHtml(r.id)).join("")));
      for (const g of groups) parts.push(groupBlock(g));
    }
    const situ = layout === "party" ? bySection.get(STACK_SITUATIONAL) : null;
    const situGroups = layout === "party" ? (groupsBy.get(STACK_SITUATIONAL) || []) : [];
    situHtml = (situ || situGroups.length) ? `<h4 class="stack-section">${STACK_SITUATIONAL}
      <span class="muted">(${(situ || []).length + situGroups.flat().length} — invis, vision,
      levitate, illusions, lulls…)</span></h4>
      ${situ ? stackTable(situ.map(r => rowHtml(r.id)).join("")) : ""}
      ${situGroups.map(g => groupBlock(g)).join("")}` : "";
    soloHtml = parts.join("");
  } else {
    soloHtml = stackTable(soloSpells.map(r => rowHtml(r.id)).join(""));
  }


  const foldedCount = (ids.length - survivors.length) +
    [...lineFolded.values()].reduce((n, m) => n + m.length, 0);
  const modeled = upg ? ` <span class="muted">· values MODELED at Spell Level ${upg}
    (upgrade model; fact marks off)</span>` : "";
  const summary = layout === "det"
    ? `<p>${survivors.length} spells in the casting toolkit, damage sorted high to low${modeled}` +
      (foldedCount ? ` <span class="muted">(${foldedCount} superseded lower ranks folded in)</span>` : "") + `.</p>`
    : `<p>${survivors.length - pickOne.flat().length} spells stack freely${modeled}` +
      (pickOne.length ? ` + ${pickOne.length} "pick one" group${pickOne.length > 1 ? "s" : ""}` : "") +
      (foldedCount ? ` <span class="muted">(${foldedCount} superseded lower ranks folded in)</span>` : "") + `.</p>`;

  return { head: `${summary}${soloHtml}`,
           tail: `${groupsPlaced ? "" : groupHtml}${situHtml}` };
}
