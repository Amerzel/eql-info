// Description substitution + duration rendering.
// Ported from app.py (render_duration + substitute).

export function renderDuration(formula, cap) {
  // buff_duration_formula = 50 marks a permanent buff when cap is 0.
  // Applies to Shielding lines, Damage Shield coats, Combat Innates,
  // all Rogue poisons, various perma-buffs — the game shows "Permanent".
  // A few formula=50 spells DO carry a cap (Dark Temptation: 600 → 60
  // min); those keep the numeric render.
  if (formula === 50 && !cap) return "permanent";
  if (!cap) return "instant";
  // 1 tick = 6 seconds. We don't try to map every EQ formula precisely; we
  // expose the cap-as-ticks since that's what the live client shows for most
  // buffs. If you want true per-level duration it's a formula table lookup.
  const ticks = cap;
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
