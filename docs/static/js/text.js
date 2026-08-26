// Description substitution + duration rendering.
// Ported from app.py (render_duration + substitute).

// Mirrors eqltools.explorer.render.render_duration (Phase 4.5): OBSERVED-ONLY
// publication. Level-scaled formulas are exactly the OBSERVED ones:
// f3 (30*level, Assiduous Vision), f11 (30*(level+3); Strengthen &
// Skin like Wood @L1 show 12:00 vs the 27:00 cap — obs:OBS-2026-001/024,
// 2026-08-05), and f15 (10*(level+10); Blessing of the Page @CLR10 shows
// 20 min vs the 30 min cap — obs:OBS-2026-043, 2026-08-06). Formula 50 is
// permanent; a zero cap is instant. Every other (EQEmu-reference /
// unverified) formula keeps the naive cap×6 — we do NOT publish unverified
// per-level durations. LEVEL IS REQUIRED (no hidden default).
export function durationTicks(formula, cap, level) {
  if (level === undefined) throw new Error("durationTicks: level is required");
  if (formula === 50) return -1;                       // permanent sentinel
  if (!cap) return 0;
  if (formula === 3) return Math.min(30 * level, cap);
  if (formula === 11) return Math.min(30 * (level + 3), cap);
  if (formula === 15) return Math.min(10 * (level + 10), cap);
  return cap;
}

export function renderDuration(formula, cap, level) {
  if (formula === 50) return "permanent";
  const ticks = durationTicks(formula, cap, level);
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
export function substitute(text, effects, durationStr, aoeMaxTargets, aoeDurationMs) {
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
  // %T = the AE target cap (aoe_max_targets; OBSERVED: Upheaval 8, Gravity
  // Flux 4). Left verbatim when unknown/zero.
  if (aoeMaxTargets) text = text.split("%T").join(String(aoeMaxTargets));
  // %i = the rain/wave AE's run time in seconds (aoe_duration ms; OBSERVED:
  // Avalanche 7500 -> "7.5 seconds").
  if (aoeDurationMs) text = text.split("%i").join(String(aoeDurationMs / 1000));

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
