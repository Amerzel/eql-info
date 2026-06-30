"""Regenerate docs/data/wiki/icons.html — per-spell letter ↔ in-game-icon
comparison page for the wiki team.

Each verified spell becomes one row, grouped by class. For each spell we show:

  - level on this class
  - spell name (id)
  - current wiki spellicon value (if any)
  - the wiki letter PNG (so the visual is on the page itself)
  - the actual in-game PNG (Spellicon_<new_icon>.png)
  - new_icon value + sheet number
  - status: visually-matches / migrate-to-numeric / blank / no-wiki-page

Data sources:
  - spells.sqlite                                            current DB
  - ../eqlwiki/letter_visual_match.json                       MSE=0 sets
  - ../eqlwiki/letter_overrides.txt                           manual overrides
  - ../eqlwiki/spell_icon_mapping.json                        last cached wiki spellicon
                                                              (refresh via the eqlwiki tooling)
  - docs/data/wiki/letters/<letter>.png                        wiki letter PNGs
  - docs/data/wiki/icons/icon_<new_icon:04d>.png               in-game icon PNGs

Run with the existing webapp .venv:  .venv/bin/python build_icons_html.py
"""
from __future__ import annotations

import datetime
import html
import json
import sqlite3
import sys
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
DB = HERE / "spells.sqlite"
EQLWIKI = HERE.parent / "eqlwiki"
OUT = HERE / "docs" / "data" / "wiki" / "icons.html"

# Match the order on the existing class pages.
CLASS_ORDER = [
    "Bard", "Beastlord", "Cleric", "Druid", "Enchanter",
    "Magician", "Necromancer", "Paladin", "Ranger",
    "Shadow Knight", "Shaman", "Wizard",
]


def load_visual_match() -> tuple[dict[str, set[int]], list[int]]:
    """{letter: set(new_icon) for MSE=0 set} + letterless icons."""
    p = EQLWIKI / "letter_visual_match.json"
    if not p.exists():
        return {}, []
    d = json.loads(p.read_text(encoding="utf-8"))
    return ({l: set(info.get("identical", []))
             for l, info in d.get("letters", {}).items()},
             d.get("letterless_icons", []))


def load_overrides() -> dict[str, set[int]]:
    p = EQLWIKI / "letter_overrides.txt"
    out: dict[str, set[int]] = {}
    if not p.exists():
        return out
    for raw in p.read_text(encoding="utf-8").splitlines():
        s = raw.split("#", 1)[0].strip()
        if not s:
            continue
        parts = s.split()
        if len(parts) != 2 or not parts[0].isdigit():
            continue
        n, letter = int(parts[0]), parts[1]
        out.setdefault(letter, set()).add(n)
    return out


def load_wiki_spellicons() -> dict[int, str]:
    """spell_id → current spellicon value from the last cached snapshot."""
    p = EQLWIKI / "spell_icon_mapping.json"
    if not p.exists():
        return {}
    return {row["spell_id"]: row.get("wiki_spellicon", "")
             for row in json.loads(p.read_text(encoding="utf-8"))}


def sheet_for(new_icon: int) -> str:
    """Cell N lives on sheet N // 36 + 1 (Spells01.tga..Spells63.tga)."""
    return f"Spells{(new_icon // 36) + 1:02d}.tga"


def render_status(wiki_val: str, new_icon: int,
                   visual_set: set[int], overrides: dict[str, set[int]]) -> tuple[str, str]:
    """(class, html) for the status cell."""
    if wiki_val == "(no wiki page)":
        return "no-page", "no wiki page"
    wiki_val = (wiki_val or "").strip()
    if not wiki_val:
        return "blank", "blank — fill in"
    if wiki_val.isdigit():
        if int(wiki_val) == new_icon:
            return "ok", "OK (numeric)"
        return "wrong-num", f"wrong numeric ({wiki_val})"
    # Letter case
    auto_match = new_icon in visual_set
    manual_match = new_icon in overrides.get(wiki_val, set())
    if auto_match:
        return "ok", "OK (pixel match)"
    if manual_match:
        return "ok", "OK (manual override)"
    return "migrate", "migrate to numeric"


def main():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row

    visual_map, letterless = load_visual_match()
    overrides = load_overrides()
    wiki_icon_map = load_wiki_spellicons()

    # Fetch every verified spell × class assignment.
    rows = db.execute("""
        SELECT s.id, s.name, s.new_icon, c.class_name, c.min_level
        FROM spells s JOIN spell_classes c ON c.spell_id = s.id
        WHERE c.verified = 1
        ORDER BY c.class_name, c.min_level, s.name
    """).fetchall()

    by_class: dict[str, list[sqlite3.Row]] = defaultdict(list)
    for r in rows:
        by_class[r["class_name"]].append(r)

    total_spells = len({r["id"] for r in rows})
    today = datetime.date.today().isoformat()

    # Summary counters per status across all rows
    counts = {"ok": 0, "migrate": 0, "blank": 0, "no-page": 0, "wrong-num": 0}

    # Render
    sections: list[str] = []
    toc: list[str] = []
    for cls in CLASS_ORDER:
        spells = by_class.get(cls, [])
        if not spells:
            continue
        slug = cls.lower().replace(" ", "-")
        toc.append(f'<a href="#{slug}">{cls}</a> <span class="muted">({len(spells)})</span>')

        cls_rows: list[str] = []
        for r in spells:
            wiki_val = wiki_icon_map.get(r["id"], "(no wiki page)")
            disp_val = wiki_val if wiki_val else "(blank)"
            visual_set = visual_map.get(wiki_val.strip(), set()) if wiki_val and not wiki_val.isdigit() else set()
            status_cls, status_text = render_status(wiki_val, r["new_icon"],
                                                      visual_set, overrides)
            counts[status_cls] = counts.get(status_cls, 0) + 1

            # Letter image cell — only if wiki_val is a letter we have a PNG for.
            letter_img = ""
            if wiki_val and not wiki_val.isdigit() and wiki_val != "(no wiki page)":
                letter_img = (f'<img class="icon" src="letters/{html.escape(wiki_val)}.png" '
                                f'alt="{html.escape(wiki_val)}" loading="lazy">')

            cls_rows.append(
                f'<tr class="row-{status_cls}">'
                f'<td>L{r["min_level"]}</td>'
                f'<td class="name">{html.escape(r["name"])}'
                f'<br><span class="muted">id {r["id"]}</span></td>'
                f'<td>{html.escape(disp_val) if disp_val else "—"}</td>'
                f'<td>{letter_img}</td>'
                f'<td><img class="icon" src="icons/icon_{r["new_icon"]:04d}.png" '
                  f'loading="lazy"></td>'
                f'<td class="cell-id">{r["new_icon"]}</td>'
                f'<td class="muted">{sheet_for(r["new_icon"])}</td>'
                f'<td class="status">{status_text}</td>'
                f'</tr>'
            )

        sections.append(
            f'<h2 id="{slug}">{cls} <span class="muted">— {len(spells)} spells</span></h2>'
            f'<table>'
            f'<tr><th>Level</th><th>Spell</th><th>Wiki: spellicon=</th>'
            f'<th>Wiki icon</th><th>In-game icon</th><th>new_icon</th>'
            f'<th>Sheet</th><th>Status</th></tr>'
            + "\n".join(cls_rows)
            + "</table>"
        )

    summary = (
        f'<div class="summary">'
        f'<strong>{total_spells} verified spells</strong> across {len(by_class)} classes.'
        f' Status counts: '
        f'<span class="row-ok">{counts["ok"]} OK</span> · '
        f'<span class="row-migrate">{counts["migrate"]} migrate to numeric</span> · '
        f'<span class="row-blank">{counts["blank"]} blank</span> · '
        f'<span class="row-no-page">{counts["no-page"]} no wiki page</span> · '
        f'<span class="row-wrong-num">{counts["wrong-num"]} numeric mismatch</span>'
        f'</div>'
    )

    html_doc = """<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>EQL Spell Icons — Wiki Letter vs In-Game</title>
<style>
body{background:#1a1612;color:#ddd4c4;font:14px/1.5 system-ui,-apple-system,sans-serif;margin:0;padding:2rem}
main{max-width:1100px;margin:0 auto}
h1{color:#d5b46a;margin-bottom:.3rem}
h2{color:#c47b3a;margin-top:2rem;border-bottom:1px solid #3b332b;padding-bottom:.3rem}
a{color:#b8d0f2;text-decoration:none}
a:hover{text-decoration:underline}
.toc{background:#2a241e;padding:1rem;border-radius:4px;margin:1rem 0;line-height:1.9}
.summary{background:#2a241e;padding:1rem;border-radius:4px;margin:1rem 0}
.muted{color:#8a7e6e}
table{width:100%;border-collapse:collapse;margin:.5rem 0;table-layout:fixed}
table tr{border-bottom:1px solid #2a241e}
table th{text-align:left;padding:.4rem .6rem;color:#a89773;font-weight:600;font-size:12px;text-transform:uppercase;background:#221d17}
table td{padding:.4rem .6rem;vertical-align:middle}
table td.name{font-weight:500}
table td.cell-id{font-family:ui-monospace,monospace;color:#a4c47c}
table td.status{font-size:12px}
.icon{width:40px;height:40px;image-rendering:pixelated;display:block}
.row-ok td.status{color:#a4c47c}
.row-migrate{background:rgba(196,123,58,.08)}
.row-migrate td.status{color:#e0884a;font-weight:600}
.row-blank{background:rgba(255,255,0,.05)}
.row-blank td.status{color:#e6d56b}
.row-no-page{background:rgba(255,255,255,.04)}
.row-no-page td.status{color:#a89773;font-style:italic}
.row-wrong-num td.status{color:#e0884a}
code{background:#2a241e;padding:.05em .35em;border-radius:3px}
</style></head><body><main>
<h1>EQL Spell Icons — Wiki Letter vs In-Game</h1>
<p class="muted">Per-spell comparison of the wiki's <code>spellicon = X</code> letter
(rendered as the <code>Spellicon_X.png</code> image stored on the wiki) against the
actual in-game icon EQL renders from <code>Spells##.tga</code>. Generated __TODAY__.</p>

__SUMMARY__

<p>Legend:
<strong class="row-ok" style="background:none;padding:0">OK</strong>
= letter PNG is pixel-identical (or manually marked equivalent) to the in-game icon;
<strong style="color:#e0884a">migrate to numeric</strong> = letter PNG depicts a
different icon than the spell's in-game one, so the spell page should
switch to <code>spellicon = &lt;new_icon&gt;</code>;
<strong style="color:#e6d56b">blank</strong> = wiki page has no spellicon yet.
The auto pixel-match data is from <code>letter_visual_match.json</code> +
manual overrides in <code>letter_overrides.txt</code>.</p>

<div class="toc">__TOC__</div>

__SECTIONS__

</main></body></html>"""
    html_doc = (html_doc
                 .replace("__TODAY__", today)
                 .replace("__SUMMARY__", summary)
                 .replace("__TOC__", " · ".join(toc))
                 .replace("__SECTIONS__", "\n".join(sections)))

    OUT.write_text(html_doc, encoding="utf-8")
    print(f"wrote {OUT}    ({len(rows)} rows, {total_spells} spells)")
    print(f"  status counts: {counts}")


if __name__ == "__main__":
    main()
