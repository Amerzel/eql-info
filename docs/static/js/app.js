// EQL Spell Explorer — SPA entry point.
//
// Hash-based router dispatches to renderers in views.js. Each view returns an
// HTML string that we inject into #app. Forms post their data into the URL as
// query-string parameters and trigger a re-render.

import {
  renderHome, renderClass, renderSpell, renderGroup, renderEffect,
  renderSkills, renderSkill, renderAAs, renderAA, renderSearch,
  renderRaces, renderRace, renderBrowse, renderStacks, updateLevelView,
  loadProcInline,
} from "./views.js";
import { initDb, query } from "./db.js";
import { prefetchSpells } from "./tooltip.js";
import { classSlug, classIndexFromArg } from "./data.js";
import { updateUpgradePanel, renderUpgradesPage } from "./upgrades.js";
import { renderTargetsPage } from "./targets.js";

const app = document.getElementById("app");

function _setHtml(html) {
  app.innerHTML = html;
  // ?upgrade=N deep link: run the Spell Level handler once so stats/description/
  // grid render at the selected level (the slider itself is pre-positioned).
  const upgInit = app.querySelector("[data-upgrade-slider]");
  if (upgInit && +(/** @type {HTMLInputElement} */ (upgInit)).value > 0) {
    updateUpgradePanel(upgInit);
  }
  // proc summaries are OPEN by default — the toggle event never fires for
  // pre-opened details, so load them explicitly after each render
  for (const det of app.querySelectorAll("details[data-proc-spell][open]")) {
    loadProcInline(det);
  }
  window.scrollTo(0, 0);
  // After the new view is in the DOM, kick off a background prefetch of the
  // tooltip data for every spell link currently visible. The first hovers
  // will then be instant.
  const ids = [];
  for (const a of app.querySelectorAll('a[href^="#/spell/"]')) {
    const m = a.getAttribute("href").match(/#\/spell\/(\d+)/);
    if (m) ids.push(parseInt(m[1], 10));
  }
  // Dedupe and cap at 100 so we don't drown the worker on /class pages with
  // hundreds of rows. Hovering past the first 100 will fall back to lazy fetch.
  // 40 keeps the tooltip cache warm for the visible viewport without
  // starving subsequent page renders behind hundreds of queued worker
  // queries (D3: the longer browse journeys made 100 noticeably heavy).
  prefetchSpells([...new Set(ids)].slice(0, 40));
}

function loading(label = "Loading…") {
  return `<p class="muted" style="padding:2em 0">${label}</p>`;
}

function parseHash() {
  // Hash format: "#/path/segments?query=string"
  let h = window.location.hash || "#/";
  if (h.startsWith("#")) h = h.slice(1);
  const [path, qs] = h.split("?");
  return {
    segs: path.split("/").filter(Boolean),
    params: new URLSearchParams(qs || ""),
  };
}

let _routeSeq = 0;

// The last-picked trio is shared between Browse (#/spells) and Spell
// (#/stacks): saved to localStorage whenever a trio is in the URL, restored
// when either page is opened without one (header links are bare). Browse's
// "All classes" button carries ?all=1 so it can clear the trio explicitly.
function withSavedTrio(head, params) {
  const KEY = "eqlTrio";
  const cls = params.getAll("class").filter(Boolean);
  if (cls.length) {
    try { localStorage.setItem(KEY, JSON.stringify(cls.slice(0, 3))); } catch { /* private mode */ }
    return params;
  }
  if (params.has("all")) return params;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "null");
    if (Array.isArray(saved) && saved.length) {
      for (const c of saved) params.append("class", String(c));
      const qs = params.toString();
      history.replaceState(null, "", "#/" + head + (qs ? "?" + qs : ""));
    }
  } catch { /* corrupt storage — ignore */ }
  return params;
}

async function route() {
  const seq = ++_routeSeq;
  const setHtml = (html) => { if (seq === _routeSeq) _setHtml(html); };
  setHtml(loading());
  const { segs, params } = parseHash();
  try {
    if (segs.length === 0) return setHtml(await renderHome());
    const [head, arg1, arg2] = segs;
    switch (head) {
      case "spells": return setHtml(await renderBrowse(withSavedTrio("spells", params)));
      case "class":  return setHtml(await renderClass(classIndexFromArg(arg1), params));
      case "spell":  return setHtml(await renderSpell(parseInt(arg1, 10), params));
      case "group":  return setHtml(await renderGroup(parseInt(arg1, 10)));
      case "effect": return setHtml(await renderEffect(parseInt(arg1, 10)));
      case "skills": return setHtml(await renderSkills());
      case "skill":  return setHtml(await renderSkill(parseInt(arg1, 10)));
      case "aas":    return setHtml(await renderAAs(params));
      case "aa":     return setHtml(await renderAA(decodeURIComponent(arg1)));
      case "races":  return setHtml(await renderRaces());
      case "race":   return setHtml(await renderRace(parseInt(arg1, 10)));
      case "search": return setHtml(await renderSearch(params));
      case "stacks": return setHtml(await renderStacks(withSavedTrio("stacks", params)));
      case "upgrades": return setHtml(renderUpgradesPage());
      case "targets": return setHtml(await renderTargetsPage());
      default:       return setHtml(`<p>Unknown route: ${head}</p>`);
    }
  } catch (err) {
    console.error(err);
    setHtml(`<p>Error loading page: <code>${(err && err.message) || err}</code></p>`);
  }
}

// Turn a dynamically-rendered filter form into a hash navigation.
function navigateForm(form) {
  const kind = form.dataset.form;
  // Drop empty values (e.g. unset class dropdown slots) so URLs stay clean.
  const usp = new URLSearchParams();
  for (const [k, v] of new FormData(form).entries()) if (v !== "") usp.append(k, String(v));
  const qs = usp.toString();
  if (kind === "class") {
    const { segs } = parseHash();
    const idx = classIndexFromArg(segs[1]);
    window.location.hash = "#/class/" + classSlug(idx) + (qs ? "?" + qs : "");
  } else if (kind === "browse") {
    window.location.hash = "#/spells" + (qs ? "?" + qs : "");
  } else if (kind === "stacks") {
    window.location.hash = "#/stacks" + (qs ? "?" + qs : "");
  } else if (kind === "aas") {
    window.location.hash = "#/aas" + (qs ? "?" + qs : "");
  } else if (kind === "search") {
    window.location.hash = "#/search" + (qs ? "?" + qs : "");
  }
}

// Intercept form submissions on dynamically-rendered pages to navigate
// without a full reload.
// #/stacks fold chips: toggle the hidden comparison sub-rows under a parent
app.addEventListener("click", (e) => {
  const chip = /** @type {HTMLElement|null} */ (
    /** @type {Element} */ (e.target).closest("button[data-fold]"));
  if (!chip) return;
  const open = chip.getAttribute("aria-expanded") !== "true";
  chip.setAttribute("aria-expanded", String(open));
  chip.classList.toggle("open", open);
  document.querySelectorAll(`tr[data-fold-of="${chip.dataset.fold}"]`)
    .forEach(tr => { /** @type {HTMLElement} */ (tr).hidden = !open; });
});

app.addEventListener("submit", (e) => {
  const form = /** @type {Element} */ (e.target).closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  navigateForm(form);
});

// Browse page: apply filters the moment a control changes (no Apply click).
// `change` (not `input`) so number fields fire on commit, not per keystroke.
app.addEventListener("change", (e) => {
  const form = /** @type {Element} */ (e.target).closest(
    'form[data-form="browse"], form[data-form="stacks"]');
  if (form) navigateForm(form);
});

// Spell-upgrade tier slider (spell detail page) — recompute displayed
// values client-side without a re-route.
app.addEventListener("input", (e) => {
  // #/stacks Spell Level slider: live roman-numeral readout while dragging
  // (the page re-renders on release via the change listener below)
  const stacksUpg = /** @type {HTMLInputElement|null} */ (
    /** @type {Element} */ (e.target).closest("input[data-stacks-upg]"));
  if (stacksUpg) {
    const out = document.querySelector("[data-stacks-upg-out]");
    const v = +stacksUpg.value || 0;
    if (out) out.textContent = v ? ("I II III IV V VI VII VIII IX X".split(" ")[v - 1]) : "0";
    return;
  }
  const upg = /** @type {Element} */ (e.target).closest("input[data-upgrade-slider]");
  if (upg) { updateUpgradePanel(upg); return; }
  // Caster-level slider (spell detail page) — recompute effect values + duration
  // client-side without a re-route.
  const lvl = /** @type {Element} */ (e.target).closest("input[data-level-slider]");
  if (lvl) updateLevelView(lvl);
});

// Header Classes dropdown: close after picking a class or clicking away.
document.addEventListener("click", (e) => {
  const open = document.querySelector(".nav-classes[open]");
  if (!open) return;
  const t = /** @type {Element} */ (e.target);
  if (t.closest(".nav-classes-list a") || !t.closest(".nav-classes")) {
    /** @type {HTMLDetailsElement} */ (open).open = false;
  }
});

// Top-bar search form (lives outside #app).
document.addEventListener("submit", (e) => {
  const f = /** @type {HTMLFormElement|null} */ (
    /** @type {Element} */ (e.target).closest("form[data-topform=search]"));
  if (!f) return;
  e.preventDefault();
  const q = String((new FormData(f)).get("q") || "");
  window.location.hash = "#/search?q=" + encodeURIComponent(q);
});

// ── D3: proc-inline lazy loading (capture phase — toggle doesn't bubble) ──
document.addEventListener("toggle", (e) => {
  const det = /** @type {HTMLElement} */ (e.target);
  if (det && det.matches && det.matches("details[data-proc-spell]") &&
      /** @type {HTMLDetailsElement} */ (det).open) {
    loadProcInline(det);
  }
}, true);

// ── D3: search-as-you-type — a debounced suggestion dropdown under the top
//    search box; Enter still runs the full search page. ──
let _sugTimer = 0;
const _sugBox = document.createElement("div");
_sugBox.className = "search-suggest";
_sugBox.style.display = "none";
document.addEventListener("input", (e) => {
  const inp = /** @type {HTMLInputElement} */ (
    /** @type {Element} */ (e.target).closest?.('form[data-topform=search] input[name=q]'));
  if (!inp) return;
  if (!_sugBox.parentElement) inp.closest("form").appendChild(_sugBox);
  clearTimeout(_sugTimer);
  const q = inp.value.trim();
  if (q.length < 2) { _sugBox.style.display = "none"; return; }
  _sugTimer = setTimeout(async () => {
    try {
      const rows = await query(
        `SELECT DISTINCT s.id, s.name FROM spells s
          JOIN spell_classes sc ON sc.spell_id = s.id
         WHERE sc.verified = 1 AND sc.min_level <= 50 AND s.name LIKE ?
         ORDER BY s.name LIMIT 8`, ["%" + q + "%"]);
      if (!rows.length || inp.value.trim() !== q) { _sugBox.style.display = "none"; return; }
      _sugBox.innerHTML = rows.map(r =>
        `<a href="#/spell/${r.id}">${r.name.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</a>`).join("");
      _sugBox.style.display = "block";
    } catch { _sugBox.style.display = "none"; }
  }, 250);
});
document.addEventListener("click", (e) => {
  if (!(/** @type {Element} */ (e.target).closest?.(".search-suggest, form[data-topform=search]"))) {
    _sugBox.style.display = "none";
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") _sugBox.style.display = "none";
});
window.addEventListener("hashchange", () => {
  _sugBox.style.display = "none";
  _sugBox.innerHTML = "";          // no stale hidden links lingering in the DOM
});

window.addEventListener("hashchange", route);

// Kick off the DB worker init in parallel with the first render so the
// network round-trip overlaps with the initial paint.
initDb().catch(err => console.error("DB init failed:", err));
route();
