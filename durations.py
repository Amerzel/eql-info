"""Buff-duration formula table and duration-string renderer.

Shared between the webapp (`app.py`) and the wiki tooling
(`eqlwiki/wiki_export.py`, `eqlwiki/audit_spellpage_durations.py`).

The formulas were reverse-engineered from wiki-verified canonical
spells and cross-checked against the classic EQEmu source. See
`/tmp/.../scratchpad/validate_formulas.py` for the 18-case check.
"""
from __future__ import annotations

MAX_LEVEL = 50  # EQL cap; matches webapp/app.py MAX_LEVEL


def calc_buff_duration(formula: int, cap: int, level: int) -> int:
    """Return the buff duration in ticks (6 sec each) at the given
    caster level, clamped by the cap when the cap is > 0.

    formula = 50 is the client's "permanent" flag — the buff lasts
    until manually removed / cured / triggered. Caller is expected
    to render that as "Permanent" and skip us.
    """
    if formula == 0: return 0
    if formula == 50: return cap or 72000
    if formula == 1:  d = (level + 1) // 2
    elif formula == 2:  d = (level * 3 + 4) // 5
    elif formula == 3:  d = level * 30
    elif formula == 4:  d = 50
    elif formula == 5:  d = 2
    elif formula == 6:  d = (level + 1) // 2 + 5
    elif formula == 7:  d = level
    elif formula == 8:  d = level + 10
    elif formula == 9:  d = 2 * level + 10
    elif formula == 10: d = 3 * level + 10
    elif formula == 11: d = 3 * level
    elif formula == 12: d = (level + 3) // 4
    elif formula == 15: d = cap
    else: d = cap
    return min(d, cap) if cap else d


def _fmt_ticks(ticks: int) -> str:
    """Render a tick count as "N Sec" / "N Min" / "N Min N Sec".

    Never converts to hours — a 3-hour buff renders as "180 Min", not
    "3 Hours". Minute-form is more scannable in dense spell tables and
    matches the wiki editors' existing phrasing.
    """
    if ticks <= 0:
        return "0 Sec"
    secs = ticks * 6
    if secs >= 60:
        m, s = divmod(secs, 60)
        return f"{m} Min {s} Sec" if s else f"{m} Min"
    return f"{secs} Sec"


def render_duration_range(formula: int | None,
                          cap: int | None,
                          min_level: int | None,
                          max_level: int = MAX_LEVEL) -> str:
    """Render the duration string for a spell from its earliest learn
    level up through wherever its duration stops growing.

    The upper endpoint is the *saturation level* — the lowest level in
    `[min_level, max_level]` at which the duration reaches its L50
    value. For formulas that saturate below L50 (e.g. formula 3 with a
    small cap, formula 10 hitting cap before L50), we show the range
    ending at the saturation level; for formulas that keep growing
    through L50, the endpoint is L50.

    Cases (in order):
      - formula == 50: "Permanent"
      - cap missing / 0: "Instant"
      - min_level ≥ max_level, or already at saturation at min_level:
        single-value at that duration
      - otherwise: "<lo> @L<lvl_lo> to <hi> @L<sat_lvl>"
    """
    if formula == 50:
        return "Permanent"
    if not cap:
        return "Instant"

    lo_lvl = min_level if (min_level and min_level > 0) else 1
    if lo_lvl > max_level:
        lo_lvl = max_level

    hi_ticks = calc_buff_duration(formula or 0, cap, max_level)
    lo_ticks = calc_buff_duration(formula or 0, cap, lo_lvl)

    if lo_lvl >= max_level or lo_ticks == hi_ticks:
        return _fmt_ticks(hi_ticks)

    # Find saturation level: lowest lvl in (lo_lvl, max_level] where
    # the duration first reaches hi_ticks. For monotone formulas this
    # is well-defined; unknown-formula falls back to max_level.
    sat_lvl = max_level
    for lvl in range(lo_lvl + 1, max_level + 1):
        if calc_buff_duration(formula or 0, cap, lvl) >= hi_ticks:
            sat_lvl = lvl
            break

    return f"{_fmt_ticks(lo_ticks)} @L{lo_lvl} to {_fmt_ticks(hi_ticks)} @L{sat_lvl}"


def render_duration_static(formula: int | None, cap: int | None) -> str:
    """Legacy cap-only renderer (matches wiki_export._fmt_duration).

    Kept for callers that render RadSpellRow2 rows (which don't get an
    @L range today). Delete once every caller has switched over.
    """
    if formula == 50:
        return "Permanent"
    if not cap:
        return "Instant"
    return _fmt_ticks(cap)


def render_duration_at_level(formula: int | None,
                             cap: int | None,
                             level: int = MAX_LEVEL) -> str:
    """Render the single duration value at a specific caster level.

    Unlike render_duration_range this emits no @L annotation — just
    the duration value at `level`. Used on RadSpellRow2 class-list
    rows where the user wants the L50 max, not the ramp.
    """
    if formula == 50:
        return "Permanent"
    if not cap:
        return "Instant"
    ticks = calc_buff_duration(formula or 0, cap, level)
    return _fmt_ticks(ticks)
