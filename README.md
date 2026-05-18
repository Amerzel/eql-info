# EQL Spell Explorer

A small Flask web app that reads the EverQuest Legends client data files
(`spells_us.txt`, `spells_us_str.txt`, `dbstr_us.txt`, plus the spell-icon
TGAs from `uifiles/default/`) and renders a browsable spell catalog with
per-class spell lists, spell-line trees, an Alternate Advancement index, a
skill catalog, and rich hover tooltips.

## What's in the repo

Code only. No game data, no extracted icons, no SQLite database — those are
all `.gitignore`'d. If you want to run this you need your own legally
obtained copy of the EQL client data files (see [Setup](#setup) below).

```
.
├── app.py                # Flask application
├── build_db.py           # builds spells.sqlite from spells_us.txt + dbstr_us.txt
├── extract_icons.py      # crops Spells01..63.tga into PNGs
├── parse_spells.py       # spell-file parser (also usable as a standalone CLI)
├── skills_data.py        # 77-skill table from EQEmu's skills.h
├── spa_data.py           # 485 SPA (spell-affect) names from EQEmu's spdat.h
├── templates/            # Jinja templates
├── static/css/, js/      # styles, hover-tooltip JS
├── SPELL_FORMAT.md       # reverse-engineered spec for the EQL spell file format
├── requirements.txt
└── LICENSE
```

## Features

- **Per-class spell lists** at `/class/<index>` (0=Warrior … 15=Berserker),
  grouped by level, with filter controls for spells/disciplines and
  beneficial/detrimental.
- **Spell detail page** with substituted descriptions (placeholder text from
  `dbstr_us.txt` is filled with each spell's effect values), all effects with
  SPA names, classes, spell-line siblings, recourse links.
- **Hover tooltips** on every spell link, fetched lazily from a JSON endpoint
  (`/api/spell/<id>`) and cached client-side.
- **Skill catalog** at `/skills` listing all 77 EQ skills with the spells
  that reference each.
- **Alternate Advancement index** at `/aas` — rank-folded by name, with the
  per-rank description from `dbstr_us.txt`.
- **Spell search** by name at `/search?q=`.
- **Effect reverse-index** at `/effect/<spa>` — every spell that uses a
  given SPA.
- **Spell-group view** at `/group/<id>` — Rk.II / Rk.III / Rk.III chains.

### Level cap

The EQL server is currently L1–50; the spell *file* ships L1–125 (inherited
from Live EverQuest). The app hard-hides every entry above L50 so the lists
match what's actually obtainable on the server. The cap lives at
`MAX_LEVEL = 50` near the top of `app.py`.

### What's NOT here (server-side data)

The EQL client files contain spell *definitions*, but the *distribution* of
spells — who sells the scroll, what quest rewards it, NPC spell lists, AA
prerequisites and costs, per-class skill caps — all lives in the server
database. This app shows only what's recoverable from the client.

## Setup

This is set up for the author's local development environment and assumes
data files live in a sibling directory. To run it yourself you'll need to
either follow that layout or set the environment variables documented below.

### Prerequisites

- Python 3.10+
- An EQL install with at least `spells_us.txt`, `spells_us_str.txt`,
  `dbstr_us.txt`, and the `uifiles/default/Spells01..63.tga` files.

### Local install

```bash
git clone <this repo>
cd eql-spell-explorer
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
```

### Data layout (default)

By default the build scripts look for game data in the parent directory:

```
<some-parent-dir>/
├── spells_us.txt          ← from EQL client
├── spells_us_str.txt      ← from EQL client
├── dbstr_us.txt           ← from EQL client (or Live as a fallback)
├── uifiles/default/Spells01..63.tga
└── eql-spell-explorer/    ← this repo
```

Or override with env vars:

```bash
export EQL_DATA_DIR=/path/to/eql/data
export EQL_UIFILES_DIR=/path/to/eql/uifiles/default
export EQL_DBSTR=/path/to/dbstr_us.txt   # optional explicit override
```

### Build the database and extract icons

```bash
.venv/bin/python build_db.py        # writes spells.sqlite
.venv/bin/python extract_icons.py   # writes static/icons/*.png (2,268 files)
```

### Run

```bash
.venv/bin/python app.py
```

Visit http://127.0.0.1:5000 .

## Reverse-engineering notes

The EQL spell file format is essentially modern Live EverQuest's format
(166 caret-delimited fields including a pipe-delimited per-effect tail)
plus 5 EQL-specific trailing fields (4 are reserved sentinels; 1 is a pet
template id). See [`SPELL_FORMAT.md`](SPELL_FORMAT.md) for the full
field-by-field spec.

## Acknowledgments

- **EQEmu** project for the open-source server emulator whose
  `Server/common/spdat.h` and `skills.h` provided the SPA effect and skill
  enums.
- **Daybreak Game Company** / Sony Online Entertainment / Verant for
  EverQuest, the underlying game whose data format this app reads.

## License

[MIT](LICENSE) — applies to the source code only. Game data is not licensed
under this repository and is not distributed here.
