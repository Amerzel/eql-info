// Description substitution + duration rendering.
// Ported from app.py (render_duration + substitute).

// Mirrors eqltools.explorer.render.render_duration (Phase 4.5): OBSERVED-ONLY
// publication. Only formula 3 (30*level per tick, observed via Assiduous Vision)
// is level-scaled; formula 50 is permanent; a zero cap is instant. EVERY other
// (EQEmu-reference / unverified) formula keeps the deployed naive cap×6 — we do
// NOT publish unverified per-level durations. LEVEL IS REQUIRED (no hidden
// default); callers pass MAX_LEVEL since the SPA has no per-level UI yet.
export function renderDuration(formula, cap, level) {
  if (level === undefined) throw new Error("renderDuration: level is required");
  if (formula === 50) return "permanent";
  if (!cap) return "instant";
  const ticks = formula === 3 ? Math.min(30 * level, cap) : cap;
  if (ticks <= 0) return "instant";
  const secs = ticks * 6;
  if (secs >= 60) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return s ? `${m} min ${s}s` : `${m} min`;
  }
  return `${secs}s`;
}

/**
 * EQ description placeholder substitution.
 *   #N -> base_value of effect slot N (1-indexed)
 *   $N -> calculated value at level (we approximate with max_value, or base
 *         if max is 0). The real client applies the formula at the caster's
 *         level; for a level-agnostic browser this is a reasonable fallback.
 *   @N -> max_value (cap) of effect slot N
 *   %z -> the duration string ("20 min", "instant", …)
 *
 * EQ encodes damage spells with NEGATIVE base_value (effect_id=0 =
 * decrease HP) and the live client renders the absolute value in
 * descriptions ("causing 8 damage", not "causing -8 damage"). We follow
 * the same convention.
 */
export function substitute(text, effects, durationStr) {
  if (!text) return "";
  const get = idx => (idx >= 0 && idx < effects.length) ? effects[idx] : null;
  const fmt = v => String(Math.abs(parseInt(v, 10) || 0));

  text = text.replace(/#(\d+)/g, (m, n) => {
    const e = get(parseInt(n, 10) - 1);
    return e ? fmt(e.base_value) : m;
  });
  text = text.replace(/\$(\d+)/g, (m, n) => {
    const e = get(parseInt(n, 10) - 1);
    if (!e) return m;
    return fmt(e.max_value || e.base_value);
  });
  text = text.replace(/@(\d+)/g, (m, n) => {
    const e = get(parseInt(n, 10) - 1);
    return e ? fmt(e.max_value) : m;
  });
  text = text.split("%z").join(durationStr || "");

  // Strip the in-client color tags; let the existing CSS handle styling.
  text = text.replace(/<c\s+"#[0-9A-Fa-f]+">/g, "");
  text = text.split("</c>").join("");
  text = text.split("<BR>").join("<br>");
  return text;
}

export function modeTag(good, isDisc) {
  if (isDisc) return '<span class="tt-tag tt-disc">disc</span>';
  if (good === 1) return '<span class="tt-tag tt-buff">buff</span>';
  if (good === 2) return '<span class="tt-tag tt-grp">group buff</span>';
  return '<span class="tt-tag tt-det">det</span>';
}

export function fmtFloat(n) {
  if (n == null) return "—";
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return Number(n).toFixed(2).replace(/\.?0+$/, "");
}

export function fmtSeconds(ms) {
  return ((ms || 0) / 1000).toString().replace(/\.?0+$/, "") || "0";
}

export function levelDisplay(lvl) {
  if (lvl === 254) return "—";
  if (lvl === 255) return "n/a";
  return String(lvl);
}

export function escapeHtml(s) {
  if (s == null) return "";
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  }[c]));
}
