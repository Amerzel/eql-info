// View renderers. Each function returns an HTML string for a given route's
// data. All DB queries respect the MAX_LEVEL cap.

import { query, queryOne, dbstr } from "./db.js";
import {
  CLASS_NAMES, MAX_LEVEL, SKILLS, SKILL_CATEGORIES,
  targetName, resistName, className, spaName, skillName, classSlug, classIndexFromArg,
  displayedValue, confidenceTier, limitValueLabel,
  EFFECT_BUCKETS, EFFECT_LABELS, EFFECT_DUR, EFFECT_VAL,
  EFFECT_LIFETAP, EFFECT_MANATAP, EFFECT_GROUPS,
} from "./data.js";
import { PLAYER_RACES, PLAYER_RACE_IDS } from "./races_data.js";
import {
  renderDuration, substitute, modeTag, fmtFloat, fmtSeconds, levelDisplay,
  escapeHtml,
} from "./text.js";
import { renderUpgradePanel } from "./upgrades.js";

function iconImg(newIcon, cls = "icon") {
  if (!newIcon || newIcon < 1) return "";
  const padded = String(newIcon).padStart(4, "0");
  return `<img src="static/icons/icon_${padded}.png" class="${cls}" alt="">`;
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
      <a class="feature-card" href="#/spells">
        <span class="feature-title">Browse Spells</span>
        <span class="feature-desc">Every spell in one filterable, sortable table.
        Pick a class trio and search by effect — nuke, heal, snare, lifetap,
        charm, resists and more — plus level and cast type.</span>
        <span class="feature-go">Open browser →</span>
      </a>
      <a class="feature-card" href="#/upgrades">
        <span class="feature-title">Spell Upgrades</span>
        <span class="feature-desc">The mote tier system: per-tier benefits by
        category, plus a tier slider on every spell's detail page to preview
        upgraded values.</span>
        <span class="feature-go">View upgrades →</span>
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
      // Category from the client's own dbstr type-5 label. `cat2` (effect
      // category) is the sub-label — Blast of Cold's cat="Direct Damage",
      // cat2="Cold". Show cat2 in-line when it differs from cat, else the
      // top-level cat alone.
      const catText = sp.cat2 && sp.cat2 !== sp.cat
        ? `${escapeHtml(sp.cat)} · ${escapeHtml(sp.cat2)}`
        : (sp.cat ? escapeHtml(sp.cat) : "");
      return `<tr>
        <td>${iconImg(sp.new_icon)}</td>
        <td><a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a> ${tag}</td>
        <td class="muted">${catText}</td>
        <td>${sp.mana}</td>
        <td>${fmtSeconds(sp.cast_time)}s</td>
        <td>${sp.buff_duration || '—'}</td>
        <td>${targetName(sp.target_type)}</td>
      </tr>`;
    }).join("");
    body += `<section class="level-block">
      <h2>Level ${levelDisplay(lvl)}</h2>
      <table class="spell-table">
        <thead><tr><th>Icon</th><th>Name</th><th>Category</th><th>Mana</th><th>Cast</th>
          <th>Duration</th><th>Targets</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
    </section>`;
  }
  if (!body) body = `<p class="muted">No spells match this filter.</p>`;

  return `
    <nav class="breadcrumb"><a href="#/">Classes</a> › <span>${escapeHtml(CLASS_NAMES[classIndex])}</span></nav>
    <h1>${escapeHtml(CLASS_NAMES[classIndex])} spell list</h1>
    ${filterForm}
    <p class="muted">${rows.length} spells match, grouped by minimum level.</p>
    ${body}`;
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

// SPAs whose base_value is an id/reference/flag, not a magnitude — show the
// label alone (e.g. "Summon Item", not "CreateItem 22,502"). Covers item/pet/
// form references, proc/trigger spell ids, and stacking directives.
const NO_VALUE_SPAS = new Set([
  32, 33, 44, 58, 71, 85, 106, 109, 146, 148, 149, 289, 340, 374, 475, 537,
]);

// Compact per-effect label for the Effects summary column (eqltools-style).
function shortEffectLabel(id, sign) {
  if (id === 0 || id === 79) return sign < 0 ? "Dmg" : "Heal";
  if (id === 100) return "HoT";
  return spaName(id);
}

// "AC 15 · MaxHp 20 · Heal 20" — up to 5 effects, each valued at `level`.
function effectsSummary(effs, level) {
  // Skip blank slots: SPA 254, and padding effects that carry no magnitude
  // (base 0 & max 0 — e.g. unused CHA slots, redundant portal-location rows).
  const meaningful = effs.filter(e =>
    e.effect_id !== 254 && !(e.base_value === 0 && e.max_value === 0));
  const parts = meaningful.slice(0, 5).map(e => {
    const src = e.base_value !== 0 ? e.base_value : e.max_value;
    const lbl = escapeHtml(shortEffectLabel(e.effect_id, src));
    if (NO_VALUE_SPAS.has(e.effect_id)) return lbl;   // base is an id, not a value
    let v = displayedValue(e.effect_id, e.base_value, e.formula, e.max_value, level, false);
    if (e.effect_id === 0 || e.effect_id === 79 || e.effect_id === 100) v = Math.abs(v);
    return v ? `${lbl} ${v.toLocaleString()}` : lbl;
  });
  const extra = meaningful.length - parts.length;
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
  if (rows.length) {
    const catRows = await query(
      `SELECT s.id, dc.text AS cat, de.text AS cat2
         FROM spells s
         LEFT JOIN dbstr dc ON dc.id = s.type_description_id AND dc.type = 5
         LEFT JOIN dbstr de ON de.id = s.effect_description_id AND de.type = 5
        WHERE s.id IN (${idSubq})`, args);
    for (const r of catRows) catMap.set(r.id, r);
    const effRows = await query(
      `SELECT se.spell_id, se.effect_id, se.base_value, se.max_value, se.formula
         FROM spell_effects se
        WHERE se.spell_id IN (${idSubq})
        ORDER BY se.spell_id, se.slot`, args);
    for (const e of effRows) {
      if (!effMap.has(e.spell_id)) effMap.set(e.spell_id, []);
      effMap.get(e.spell_id).push(e);
    }
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
    Array.from({ length: 16 }, (_, i) => i).map(i =>
      `<option value="${classSlug(i)}"${selIdx === i ? " selected" : ""}>${escapeHtml(CLASS_NAMES[i])}</option>`).join("");
  const classPickers = [0, 1, 2].map(slot =>
    `<select name="class">${classOption(clsIdxs[slot] ?? -1)}</select>`).join(" ");
  const allParams = new URLSearchParams(params); allParams.delete("class");
  const allBtn = `<a href="#/spells${allParams.toString() ? "?" + allParams.toString() : ""}"
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
      <input type="hidden" name="sort" value="${sort}">
      <input type="hidden" name="dir" value="${dir === "DESC" ? "desc" : "asc"}">
      <div class="diff-controls" style="margin-bottom:.5em">
        <span class="muted">Classes:</span>
        ${allBtn}
        <span class="muted">or pick up to 3:</span>
        ${classPickers}
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
    const catText = cat.cat2 && cat.cat2 !== cat.cat
      ? `${escapeHtml(cat.cat)} · ${escapeHtml(cat.cat2)}`
      : (cat.cat ? escapeHtml(cat.cat) : "");
    const effText = effectsSummary(effMap.get(sp.id) || [], sp.min_level);
    return `<tr>
      <td>${levelDisplay(sp.min_level)}</td>
      <td>${iconImg(sp.new_icon)}</td>
      <td><a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a> ${tags.join(" ")}</td>
      <td class="muted">${classCell}</td>
      <td class="muted">${catText}</td>
      <td>${effText}</td>
      <td>${sp.mana}</td>
      <td>${fmtSeconds(sp.cast_time)}s</td>
      <td>${fmtDur(sp.buff_duration)}</td>
      <td>${targetName(sp.target_type)}</td>
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
  const clsLabel = clsIdxs.length ? clsIdxs.map(i => CLASS_NAMES[i]).join(" / ") : "all classes";
  const capped = rows.length >= 2000 ? " (showing first 2000)" : "";

  return `<div class="wide-page">
    <nav class="breadcrumb"><a href="#/">Home</a> › Browse</nav>
    <h1>Browse Spells</h1>
    ${filterForm}
    <p class="muted">${rows.length.toLocaleString()} spell${rows.length === 1 ? "" : "s"}${capped}
      — ${escapeHtml(clsLabel)}${effLabel ? ` · effect: ${escapeHtml(effLabel)}` : ""}.
      Effect values shown at each spell's own level.</p>
    ${rows.length ? `<table class="spell-table">
      <thead>${head}</thead><tbody>${body}</tbody></table>`
      : '<p class="muted">No spells match — pick a caster class or widen the level range.</p>'}
    </div>`;
}

// ---------------------------------------------------------------------------
// SPELL DETAIL
// ---------------------------------------------------------------------------

export async function renderSpell(spellId) {
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

  const duration = renderDuration(spell.buff_duration_formula, spell.buff_duration);
  const descText = await dbstr(spell.description_id, 6);
  const typeText = await dbstr(spell.type_description_id, 5);
  const effectText = await dbstr(spell.effect_description_id, 5);
  const secText = await dbstr(spell.secondary_category_2, 5);
  const catText = spell.spell_category > 0
    ? await dbstr(spell.spell_category, 27) : null;
  const rendered = descText ? substitute(descText, effects, duration) : "";

  const isDuration = (spell.buff_duration_formula || 0) > 0;
  const tierBadge = (tier) => {
    if (tier === "solid")    return "";
    if (tier === "inferred") return `<span class="tier-badge tier-inferred" title="Predicted from EQEmu source — not yet verified in EQL">?</span>`;
    if (tier === "partial")  return `<span class="tier-badge tier-partial"  title="Mechanic understood but observed values diverge from prediction">~</span>`;
    if (tier === "unknown")  return `<span class="tier-badge tier-unknown"  title="Unknown formula or SPA — value may be wrong">!</span>`;
    return "";
  };
  const effectsHtml = effects.length ? `
    <table class="effects-table">
      <thead><tr><th>Slot</th><th>Effect</th><th>@L1</th><th>@L${MAX_LEVEL}</th>
        <th>Limit</th><th>Formula</th></tr></thead>
      <tbody>${effects.map(e => {
        const tier = confidenceTier(e.effect_id, e.formula);
        return `<tr class="tier-${tier}">
        <td>${e.slot + 1}</td>
        <td><a href="#/effect/${e.effect_id}">${escapeHtml(spaName(e.effect_id))}</a>
            <span class="muted">#${e.effect_id}</span></td>
        <td>${displayedValue(e.effect_id, e.base_value, e.formula, e.max_value, 1, isDuration)} ${tierBadge(tier)}</td>
        <td>${displayedValue(e.effect_id, e.base_value, e.formula, e.max_value, MAX_LEVEL, isDuration)}</td>
        <td>${escapeHtml(limitValueLabel(e.effect_id, e.limit_value))}</td>
        <td>${e.formula}</td>
      </tr>`;
      }).join("")}</tbody>
    </table>` : `<p class="muted">No effects recorded.</p>`;

  const classesHtml = classes.length ? `
    <table class="kv">${classes.map(c => `<tr>
      <th><a href="#/class/${classSlug(c.class_index)}">${escapeHtml(c.class_name)}</a></th>
      <td>L${levelDisplay(c.min_level)}</td></tr>`).join("")}</table>`
    : `<p class="muted">No player classes can cast this at L≤${MAX_LEVEL}.</p>`;

  const lineHtml = groupSiblings.length > 1 ? `
    <h2>Spell line</h2>
    <ul class="line">${groupSiblings.map(s => `<li${s.id === spell.id ? ' class="current"' : ''}>
      Rk.${s.rank}: <a href="#/spell/${s.id}">${escapeHtml(s.name)}</a></li>`).join("")}</ul>` : "";

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
        ${rendered ? `<div class="desc desc-rendered">${rendered}</div>` : ""}
        ${descText ? `<details class="raw-detail"><summary>Template text (placeholders visible)</summary><pre class="desc-raw">${escapeHtml(descText)}</pre></details>` : ""}
        ${catText ? `<p class="muted"><strong>Category:</strong> ${escapeHtml(catText)} <span class="muted">(code ${spell.spell_category})</span></p>` : ""}
        ${typeText ? `<p class="muted"><strong>Type:</strong> ${escapeHtml(typeText)}</p>` : ""}
        ${effectText ? `<p class="muted"><strong>Effect:</strong> ${escapeHtml(effectText)}</p>` : ""}
        ${secText ? `<p class="muted"><strong>Secondary:</strong> ${escapeHtml(secText)}</p>` : ""}
        <h2>Effects</h2>${effectsHtml}
        ${msgsHtml}
      </section>
      <aside class="col-right">
        <h2>Stats</h2>
        <table class="kv">
          <tr><th>Mana</th><td>${spell.mana}</td></tr>
          ${spell.endurance_cost ? `<tr><th>Endurance</th><td>${spell.endurance_cost}</td></tr>` : ""}
          <tr><th>Cast time</th><td>${fmtSeconds(spell.cast_time)}s</td></tr>
          <tr><th>Reuse <span class="muted">(in-game)</span></th><td>${Math.floor((spell.recast_time || 0) / 1000)}s
              <span class="muted">(raw recast: ${fmtSeconds(spell.recast_time)}s)</span></td></tr>
          <tr><th>Recovery <span class="muted">(internal)</span></th><td>${fmtSeconds(spell.recovery_time)}s</td></tr>
          <tr><th>Duration</th><td>${duration}${spell.buff_duration ? ` <span class="muted">(formula ${spell.buff_duration_formula}, cap ${spell.buff_duration})</span>` : ""}</td></tr>
          <tr><th>Range</th><td>${spell.range}</td></tr>
          ${spell.aoe_range ? `<tr><th>AoE range</th><td>${spell.aoe_range}</td></tr>` : ""}
          <tr><th>Resist diff</th><td>${spell.resist_difficulty}</td></tr>
          ${spell.timer_id ? `<tr><th>Timer (shared cooldown)</th><td>${spell.timer_id}</td></tr>` : ""}
          ${spell.reflectable === -1 ? `<tr><th>Reflectable</th><td>Yes</td></tr>` :
            (spell.reflectable === 0 && spell.good_effect === 0
              ? `<tr><th>Reflectable</th><td>No</td></tr>` : "")}
          ${spell.pet_template ? `<tr><th>Pet template</th><td>${spell.pet_template}</td></tr>` : ""}
          ${spell.teleport_zone ? `<tr><th>Teleport / pet</th><td>${escapeHtml(spell.teleport_zone)}</td></tr>` : ""}
          ${spell.recourse_link ? `<tr><th>Recourse</th><td><a href="#/spell/${spell.recourse_link}">spell #${spell.recourse_link}</a></td></tr>` : ""}
        </table>
        ${renderUpgradePanel(spell, effects)}
        <h2>Classes</h2>${classesHtml}
        ${lineHtml}
      </aside>
    </div>`;
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
    <p class="muted">First 500 spells matching this spell-affect, restricted to L≤${MAX_LEVEL}.</p>
    <table class="spell-table">
      <thead><tr><th>Icon</th><th>Name</th><th>Slot</th>
        <th>Base</th><th>Limit</th><th>Formula</th><th>Max</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${iconImg(r.new_icon)}</td>
        <td><a href="#/spell/${r.id}">${escapeHtml(r.name)}</a></td>
        <td>${r.slot + 1}</td>
        <td>${r.base_value}</td>
        <td>${escapeHtml(limitValueLabel(eid, r.limit_value))}</td>
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
    const items = SKILLS.filter(s => ids.includes(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));
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
