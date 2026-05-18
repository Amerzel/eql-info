// View renderers. Each function returns an HTML string for a given route's
// data. All DB queries respect the MAX_LEVEL cap.

import { query, queryOne, dbstr } from "./db.js";
import {
  CLASS_NAMES, MAX_LEVEL, SKILLS, SKILL_CATEGORIES,
  targetName, resistName, className, spaName, skillName,
} from "./data.js";
import {
  renderDuration, substitute, modeTag, fmtFloat, fmtSeconds, levelDisplay,
  escapeHtml,
} from "./text.js";

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
    "SELECT COUNT(DISTINCT spell_id) AS c FROM spell_classes WHERE min_level <= ?",
    [MAX_LEVEL]);
  const total = totalRow ? totalRow.c : 0;

  const classRows = await query(
    `SELECT class_index, class_name, COUNT(*) AS n
       FROM spell_classes
      WHERE min_level <= ?
      GROUP BY class_index
      ORDER BY class_index`,
    [MAX_LEVEL]);
  const counts = new Map(classRows.map(r => [r.class_index, r.n]));

  const cards = Array.from({ length: 16 }, (_, i) => {
    const c = counts.get(i) || 0;
    const banner = `static/icons/classes/${String(i).padStart(2, "0")}.png`;
    return `<a class="class-card" href="#/class/${i}">
              <img class="class-banner" src="${banner}" alt="" loading="lazy">
              <span class="class-name">${escapeHtml(CLASS_NAMES[i])}</span>
              <span class="class-count">${c} spells</span>
            </a>`;
  }).join("");

  return `
    <h1>EverQuest Legends — Spell Explorer</h1>
    <p class="lede">${total.toLocaleString()} spells obtainable at L1–${MAX_LEVEL}.
    Pick a class to browse its spell list by level, or search by name above.
    <span class="muted">EQL ships spells through L125 in the file (inherited
    from Live); only L1–${MAX_LEVEL} are obtainable on this server, so we
    hard-hide the rest.</span></p>
    <aside class="notice">
      <strong>Note:</strong> These lists are generated from the EQL client's
      spell data. A spell appearing here means the client recognises that the
      class can cast it — not that the scroll is actually distributed on the
      server (via vendor, quest, or drop). The final in-game spell lists may
      differ.
    </aside>
    <div class="class-grid">${cards}</div>
    <h2>Catalogs</h2>
    <ul class="tool-list">
      <li><a href="#/skills">Skill list</a> — 77 EQ skills with the spells that use each.</li>
      <li><a href="#/aas">Alternate Advancement</a> — ~1,500 distinct AAs with rank-folded descriptions.</li>
    </ul>
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
                 "sc.min_level >= ?", "sc.min_level <= ?"];
  const args = [classIndex, MAX_LEVEL, lMin, lMax];
  if (kind === "spells") where.push("s.is_discipline = 0");
  else if (kind === "disc") where.push("s.is_discipline = 1");
  if (good === "buff") where.push("s.good_effect IN (1, 2)");
  else if (good === "det") where.push("s.good_effect = 0");

  const rows = await query(
    `SELECT s.id, s.name, s.new_icon, s.mana, s.cast_time,
            s.buff_duration, s.target_type, s.good_effect, s.is_discipline,
            sc.min_level
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
        <a href="#/class/${classIndex}" class="muted">reset</a>
      </div>
    </form>`;

  let body = "";
  for (const lvl of [...byLevel.keys()].sort((a, b) => a - b)) {
    const items = byLevel.get(lvl).map(sp => {
      let tag = "";
      if (sp.is_discipline) tag = '<span class="tag tag-disc">disc</span>';
      else if (sp.good_effect === 1) tag = '<span class="tag tag-buff">buff</span>';
      else if (sp.good_effect === 2) tag = '<span class="tag tag-grp">group buff</span>';
      else tag = '<span class="tag tag-deb">det</span>';
      return `<tr>
        <td>${iconImg(sp.new_icon)}</td>
        <td><a href="#/spell/${sp.id}">${escapeHtml(sp.name)}</a> ${tag}</td>
        <td>${sp.mana}</td>
        <td>${fmtSeconds(sp.cast_time)}s</td>
        <td>${sp.buff_duration || '—'}</td>
        <td>${targetName(sp.target_type)}</td>
      </tr>`;
    }).join("");
    body += `<section class="level-block">
      <h2>Level ${levelDisplay(lvl)}</h2>
      <table class="spell-table">
        <thead><tr><th>Icon</th><th>Name</th><th>Mana</th><th>Cast</th>
          <th>Duration</th><th>Targets</th></tr></thead>
        <tbody>${items}</tbody>
      </table>
    </section>`;
  }
  if (!body) body = `<p class="muted">No spells match this filter.</p>`;

  return `
    <nav class="breadcrumb"><a href="#/">Classes</a> › <span>${escapeHtml(CLASS_NAMES[classIndex])}</span></nav>
    <h1>${escapeHtml(CLASS_NAMES[classIndex])} spell list</h1>
    <aside class="notice">
      <strong>Note:</strong> This list is generated from the EQL client's
      spell data and may not exactly match what's available in game. The
      client says these spells are castable by this class at the levels
      shown — server-side distribution (vendors, quests, drops) determines
      what's actually obtainable.
    </aside>
    ${filterForm}
    <p class="muted">${rows.length} spells match, grouped by minimum level.</p>
    ${body}`;
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

  const effectsHtml = effects.length ? `
    <table class="effects-table">
      <thead><tr><th>Slot</th><th>Effect</th><th>Base</th><th>Limit</th>
        <th>Formula</th><th>Max</th></tr></thead>
      <tbody>${effects.map(e => `<tr>
        <td>${e.slot + 1}</td>
        <td><a href="#/effect/${e.effect_id}">${escapeHtml(spaName(e.effect_id))}</a>
            <span class="muted">#${e.effect_id}</span></td>
        <td>${e.base_value}</td><td>${e.limit_value}</td>
        <td>${e.formula}</td><td>${e.max_value}</td>
      </tr>`).join("")}</tbody>
    </table>` : `<p class="muted">No effects recorded.</p>`;

  const classesHtml = classes.length ? `
    <table class="kv">${classes.map(c => `<tr>
      <th><a href="#/class/${c.class_index}">${escapeHtml(c.class_name)}</a></th>
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
      <div><h1>${escapeHtml(spell.name)}</h1>
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
          <tr><th>Recast</th><td>${fmtSeconds(spell.recast_time)}s</td></tr>
          <tr><th>Recovery</th><td>${fmtSeconds(spell.recovery_time)}s</td></tr>
          <tr><th>Duration</th><td>${duration}${spell.buff_duration ? ` <span class="muted">(formula ${spell.buff_duration_formula}, cap ${spell.buff_duration})</span>` : ""}</td></tr>
          <tr><th>Range</th><td>${spell.range}</td></tr>
          ${spell.aoe_range ? `<tr><th>AoE range</th><td>${spell.aoe_range}</td></tr>` : ""}
          <tr><th>Resist diff</th><td>${spell.resist_difficulty}</td></tr>
          ${spell.pet_template ? `<tr><th>Pet template</th><td>${spell.pet_template}</td></tr>` : ""}
          ${spell.teleport_zone ? `<tr><th>Teleport / pet</th><td>${escapeHtml(spell.teleport_zone)}</td></tr>` : ""}
          ${spell.recourse_link ? `<tr><th>Recourse</th><td><a href="#/spell/${spell.recourse_link}">spell #${spell.recourse_link}</a></td></tr>` : ""}
        </table>
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
        <td>${r.base_value}</td><td>${r.limit_value}</td>
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
    <p class="lede">${rows.length} distinct AAs catalogued from <code>dbstr_us.txt</code>
    (type 1 names + type 4 descriptions).
    <span class="muted">AA prerequisites, costs, and per-class restrictions are
    server-side and not shown here.</span></p>
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
    found in <code>dbstr_us.txt</code>.
    AA prerequisites, point cost, and per-class eligibility are server-side
    and not available from client data.</p>
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
