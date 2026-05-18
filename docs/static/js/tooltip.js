// Hover tooltip for spell links. Queries the local SQLite worker (via db.js)
// instead of a server endpoint. Cached per-spell so subsequent hovers are
// instant.

import { query, queryOne, dbstr } from "./db.js";
import {
  targetName, resistName, MAX_LEVEL, spaName,
} from "./data.js";
import {
  renderDuration, substitute, modeTag, fmtFloat, fmtSeconds, escapeHtml,
} from "./text.js";

const HOVER_DELAY_MS = 250;
const cache = new Map();
let tooltipEl = null;
let hoverTimer = null;
let activeLink = null;
let currentSpellId = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;
  tooltipEl = document.createElement("div");
  tooltipEl.className = "spell-tooltip";
  tooltipEl.style.display = "none";
  document.body.appendChild(tooltipEl);
  return tooltipEl;
}

async function loadSpell(spellId) {
  if (cache.has(spellId)) return cache.get(spellId);
  const p = (async () => {
    const spell = await queryOne("SELECT * FROM spells WHERE id = ?", [spellId]);
    if (!spell) throw new Error("not found");
    const effects = await query(
      "SELECT * FROM spell_effects WHERE spell_id = ? ORDER BY slot", [spellId]);
    const classes = await query(
      `SELECT class_index, class_name, min_level FROM spell_classes
        WHERE spell_id = ? AND min_level <= ?
        ORDER BY min_level, class_index`, [spellId, MAX_LEVEL]);
    const duration = renderDuration(spell.buff_duration_formula, spell.buff_duration);
    const descRaw = await dbstr(spell.description_id, 6);
    const description = descRaw ? substitute(descRaw, effects, duration) : "";
    const category = spell.spell_category > 0
      ? await dbstr(spell.spell_category, 27) : null;
    return { spell, effects, classes, duration, description, category };
  })();
  cache.set(spellId, p);
  return p;
}

function renderTooltip(data) {
  const { spell, effects, classes, duration, description, category } = data;
  const padded = String(spell.new_icon || 0).padStart(4, "0");
  const iconHtml = spell.new_icon
    ? `<img src="static/icons/icon_${padded}.png" class="tt-icon" alt="">` : "";
  const cost = spell.is_discipline
    ? `<dt>Endurance</dt><dd>${spell.endurance_cost || 0}</dd>`
    : `<dt>Mana</dt><dd>${spell.mana || 0}</dd>`;
  const effectsHtml = effects.length
    ? `<table class="tt-effects">
         <thead><tr><th>#</th><th>Effect</th><th>Base</th><th>Lim</th><th>Form</th><th>Max</th></tr></thead>
         <tbody>${effects.map(e => `<tr>
           <td>${e.slot + 1}</td>
           <td>${escapeHtml(spaName(e.effect_id))} <span class="muted">#${e.effect_id}</span></td>
           <td>${e.base_value}</td><td>${e.limit_value}</td>
           <td>${e.formula}</td><td>${e.max_value}</td></tr>`).join("")}
         </tbody></table>`
    : '<p class="muted">No effects.</p>';
  const classesHtml = classes.length
    ? `<div class="tt-classes">${classes.map(c =>
        `<span class="tt-class">${escapeHtml(c.class_name)} <b>L${c.min_level}</b></span>`).join("")}</div>`
    : `<p class="muted">No player classes ≤ L${MAX_LEVEL}.</p>`;
  const descHtml = description
    ? `<div class="tt-desc">${description}</div>` : "";
  const categoryHtml = category
    ? `<span class="muted">${escapeHtml(category)}</span>` : "";

  return `
    <div class="tt-header">
      ${iconHtml}
      <div class="tt-title">
        <div class="tt-name">${escapeHtml(spell.name)} ${modeTag(spell.good_effect, !!spell.is_discipline)}</div>
        <div class="tt-meta"><span class="muted">#${spell.id}</span> ${categoryHtml}</div>
      </div>
    </div>
    ${descHtml}
    <dl class="tt-stats">
      ${cost}
      <dt>Cast</dt><dd>${fmtSeconds(spell.cast_time)}s</dd>
      <dt>Recast</dt><dd>${fmtSeconds(spell.recast_time)}s</dd>
      <dt>Recov</dt><dd>${fmtSeconds(spell.recovery_time)}s</dd>
      <dt>Range</dt><dd>${fmtFloat(spell.range)}</dd>
      ${spell.aoe_range ? `<dt>AoE</dt><dd>${fmtFloat(spell.aoe_range)}</dd>` : ""}
      <dt>Duration</dt><dd>${duration}</dd>
      <dt>Target</dt><dd>${escapeHtml(targetName(spell.target_type))}</dd>
      <dt>Resist</dt><dd>${escapeHtml(resistName(spell.resist_type))} (${spell.resist_difficulty})</dd>
    </dl>
    <div class="tt-section-label">Effects</div>${effectsHtml}
    <div class="tt-section-label">Classes</div>${classesHtml}`;
}

function positionTooltip(evt) {
  if (!tooltipEl || tooltipEl.style.display === "none") return;
  const margin = 12;
  const tw = tooltipEl.offsetWidth;
  const th = tooltipEl.offsetHeight;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let x = evt.clientX + margin;
  let y = evt.clientY + margin;
  if (x + tw + margin > vw) x = evt.clientX - tw - margin;
  if (y + th + margin > vh) y = vh - th - margin;
  if (y < margin) y = margin;
  tooltipEl.style.left = (x + window.scrollX) + "px";
  tooltipEl.style.top = (y + window.scrollY) + "px";
}

function showFor(link, evt) {
  // Hash-based links look like "#/spell/123"; extract the id.
  const href = link.getAttribute("href") || "";
  const m = href.match(/#\/spell\/(\d+)/);
  if (!m) return;
  const id = parseInt(m[1], 10);
  currentSpellId = id;
  const tt = ensureTooltip();
  tt.style.display = "block";
  tt.innerHTML = '<div class="muted">Loading…</div>';
  positionTooltip(evt);

  loadSpell(id).then(data => {
    if (currentSpellId !== id) return;
    tt.innerHTML = renderTooltip(data);
    positionTooltip(evt);
  }).catch(err => {
    if (currentSpellId !== id) return;
    tt.innerHTML = `<div class="muted">Error loading spell ${id}</div>`;
  });
}

function hide() {
  currentSpellId = null;
  if (tooltipEl) tooltipEl.style.display = "none";
}

document.addEventListener("mouseover", (evt) => {
  const link = evt.target.closest('a[href^="#/spell/"]');
  if (!link) return;
  activeLink = link;
  clearTimeout(hoverTimer);
  hoverTimer = setTimeout(() => {
    if (activeLink === link) showFor(link, evt);
  }, HOVER_DELAY_MS);
});
document.addEventListener("mouseout", (evt) => {
  const link = evt.target.closest('a[href^="#/spell/"]');
  if (!link) return;
  activeLink = null;
  clearTimeout(hoverTimer);
  hide();
});
document.addEventListener("mousemove", positionTooltip);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hide(); });
document.addEventListener("scroll", hide, { passive: true });
window.addEventListener("hashchange", hide);
