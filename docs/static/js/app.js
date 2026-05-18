// EQL Spell Explorer — SPA entry point.
//
// Hash-based router dispatches to renderers in views.js. Each view returns an
// HTML string that we inject into #app. Forms post their data into the URL as
// query-string parameters and trigger a re-render.

import {
  renderHome, renderClass, renderSpell, renderGroup, renderEffect,
  renderSkills, renderSkill, renderAAs, renderAA, renderSearch,
} from "./views.js";
import { initDb } from "./db.js";
import { prefetchSpells } from "./tooltip.js";

const app = document.getElementById("app");

function setHtml(html) {
  app.innerHTML = html;
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
  prefetchSpells([...new Set(ids)].slice(0, 100));
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

async function route() {
  setHtml(loading());
  const { segs, params } = parseHash();
  try {
    if (segs.length === 0) return setHtml(await renderHome());
    const [head, arg1, arg2] = segs;
    switch (head) {
      case "class":  return setHtml(await renderClass(parseInt(arg1, 10), params));
      case "spell":  return setHtml(await renderSpell(parseInt(arg1, 10)));
      case "group":  return setHtml(await renderGroup(parseInt(arg1, 10)));
      case "effect": return setHtml(await renderEffect(parseInt(arg1, 10)));
      case "skills": return setHtml(await renderSkills());
      case "skill":  return setHtml(await renderSkill(parseInt(arg1, 10)));
      case "aas":    return setHtml(await renderAAs(params));
      case "aa":     return setHtml(await renderAA(decodeURIComponent(arg1)));
      case "search": return setHtml(await renderSearch(params));
      default:       return setHtml(`<p>Unknown route: ${head}</p>`);
    }
  } catch (err) {
    console.error(err);
    setHtml(`<p>Error loading page: <code>${(err && err.message) || err}</code></p>`);
  }
}

// Intercept form submissions on dynamically-rendered pages to navigate
// without a full reload.
app.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-form]");
  if (!form) return;
  e.preventDefault();
  const kind = form.dataset.form;
  const fd = new FormData(form);
  const qs = new URLSearchParams(fd).toString();
  if (kind === "class") {
    const { segs } = parseHash();
    const idx = parseInt(segs[1], 10);
    window.location.hash = "#/class/" + idx + (qs ? "?" + qs : "");
  } else if (kind === "aas") {
    window.location.hash = "#/aas" + (qs ? "?" + qs : "");
  } else if (kind === "search") {
    window.location.hash = "#/search" + (qs ? "?" + qs : "");
  }
});

// Top-bar search form (lives outside #app).
document.addEventListener("submit", (e) => {
  const f = e.target.closest("form[data-topform=search]");
  if (!f) return;
  e.preventDefault();
  const q = (new FormData(f)).get("q") || "";
  window.location.hash = "#/search?q=" + encodeURIComponent(q);
});

window.addEventListener("hashchange", route);

// Kick off the DB worker init in parallel with the first render so the
// network round-trip overlaps with the initial paint.
initDb().catch(err => console.error("DB init failed:", err));
route();
