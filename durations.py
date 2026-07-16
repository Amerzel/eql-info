"""Buff-duration renderer.

Shared between the webapp (`app.py`) and the wiki tooling
(`eqlwiki/wiki_export.py`, `eqlwiki/audit_spellpage_durations.py`).

Model (EQEmu classic, verified 2026-07-16 against in-game observation):

    displayed_ticks = min(formula(caster_level), cap)   # formulas 1-12
    displayed_ticks = cap                                # formulas 0, 11, 15
    Permanent                                            # formula 50

Formula table (from EQEmu common/spdat.cpp CalcBuffDuration_formula):

    0        cap                                   # fixed at cap
    1        (level + 1) // 2                      # ceil(L/2)
    2        (level * 3 + 4) // 5                  # ceil(3L/5)
    3        level * 30                            # 30 ticks per level
    4        50                                    # 50 ticks flat
    5        2                                     # 2 ticks flat
    6        (level + 1) // 2                      # ceil(L/2)
    7        level                                 # L ticks
    8        level + 10
    9        2 * level + 10
    10       3 * level + 10
    11       cap                                   # fixed at cap
    12       (level + 3) // 4                      # ceil(L/4)
    15       cap                                   # fixed at cap
    50       permanent

Observed calibration points:
    - Blessing of the Squire  (formula 3,  cap 400)  L16 shaman = 40 min
      → min(480, 400) = 400 = 40 min ✓
    - Assiduous Vision        (formula 3,  cap 1950) L50 shaman = 150 min
      → min(1500, 1950) = 1500 = 150 min ✓
    - See Invisible           (formula 11, cap 270)  L50 mage   = 27 min
      → cap directly = 270 = 27 min ✓
    - Burnout                 (formula 11, cap 600)  L50 mage   = 60 min
      → cap directly = 600 = 60 min ✓
    - Blessing of the Knight  (formula 15, cap 500)  L50 cleric = 50 min
      → cap directly = 500 = 50 min ✓
    - Dark Temptation         (formula 50, cap 600)  = Permanent ✓
    - Improved Invis Undead   (formula 3,  cap 100)  L50 = 10 min
      → min(1500, 100) = 100 = 10 min ✓

An earlier revision of this module simplified everything to cap × 6 sec,
which happens to be right for formulas 11 and 15 and for any spell whose
cap ≤ formula(50) — the majority — but wrong for high-cap formula-based
spells like Assiduous Vision. Restored to the full EQEmu table.
"""
from __future__ import annotations

MAX_LEVEL = 50  # EQL cap; matches webapp/app.py MAX_LEVEL


def calc_duration_ticks(formula: int | None, cap: int | None,
                        level: int = MAX_LEVEL) -> int:
    """Return the game-displayed buff duration in ticks at the given
    caster level. Applies EQEmu's per-formula table then clamps by cap.

    formula == 50 is the "permanent" flag; callers should render that
    as "Permanent" and skip us (we return the cap as a sentinel).
    """
    f = formula or 0
    c = cap or 0
    # Fixed-at-cap formulas
    if f in (0, 11, 15, 50):
        return c
    # Scaling formulas
    if   f == 1:  d = (level + 1) // 2
    elif f == 2:  d = (level * 3 + 4) // 5
    elif f == 3:  d = level * 30
    elif f == 4:  d = 50
    elif f == 5:  d = 2
    elif f == 6:  d = (level + 1) // 2
    elif f == 7:  d = level
    elif f == 8:  d = level + 10
    elif f == 9:  d = 2 * level + 10
    elif f == 10: d = 3 * level + 10
    elif f == 12: d = (level + 3) // 4
    else:         d = c
    return min(d, c) if c else d


def _fmt_ticks(ticks: int) -> str:
    """Render a tick count as "N Sec" / "N Min" / "N Min N Sec".

    Never converts to hours — minute-form is more scannable in dense
    spell tables and matches the wiki editors' phrasing.
    """
    if ticks <= 0:
        return "0 Sec"
    secs = ticks * 6
    if secs >= 60:
        m, s = divmod(secs, 60)
        return f"{m} Min {s} Sec" if s else f"{m} Min"
    return f"{secs} Sec"


def render_duration(formula: int | None, cap: int | None,
                    level: int = MAX_LEVEL) -> str:
    """Return the game-displayed duration string for a buff at the
    given caster level. Defaults to MAX_LEVEL (L50) which is what the
    wiki cares about.
    """
    if formula == 50:
        return "Permanent"
    if not cap and formula not in (4, 5):
        return "Instant"
    ticks = calc_duration_ticks(formula, cap, level)
    if ticks <= 0:
        return "Instant"
    return _fmt_ticks(ticks)
