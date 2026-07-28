# Third-party vendored assets

These files are vendored (not authored here) and must be served **same-origin**
(Web Workers cannot be loaded from a CDN at runtime). The SPA loads
`sql.js-httpvfs@0.8.12` (see `../js/db.js`), which uses these two files.

| File | SHA-256 | Upstream | License |
|---|---|---|---|
| `sql-wasm.wasm` | `f71cee54ad1d4cccb781aad1fa79aa245a47fd3bd5172bb9f0d0897d47c7df15` | **sql.js** (https://github.com/sql-js/sql.js) | **MIT** |
| `sqlite.worker.js` | `e48eea05c22fb0a9eee181c249488ac498899d58ccde20c17d223218416ef49d` | **sql.js-httpvfs** 0.8.12 (https://github.com/phiresky/sql.js-httpvfs) | **Apache-2.0** |

Verified against upstream (v0.8.12): sql.js-httpvfs ships **Apache-2.0**; sql.js
ships **MIT**. SQLite itself, compiled into the wasm, is public domain.

---

## sql.js — MIT License

Exact upstream copyright (from https://github.com/sql-js/sql.js `LICENSE`):

```
Copyright (c) 2017 sql.js authors (see AUTHORS)
Copyright 2017 Ryusei Yamaguchi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## sql.js-httpvfs — Apache License 2.0

`sqlite.worker.js`, `sql-wasm.wasm`, and `sql.js-httpvfs-0.8.12.js` are from
**sql.js-httpvfs 0.8.12** (Apache-2.0; upstream ships the standard Apache
License 2.0 text; https://github.com/phiresky/sql.js-httpvfs/blob/v0.8.12/LICENSE).

**Provenance (verified 2026-07-27, served-surface gate):** all three files are
BYTE-IDENTICAL to the npm `sql.js-httpvfs@0.8.12` package's `dist/` artifacts
(`npm ci` reproduces them locally for comparison):

- `sql.js-httpvfs-0.8.12.js` = dist/index.js, sha256
  `02747547b5354312e6db8446c3258f672ec7916817b97292ef4deb6cd0c221e9`
- `sqlite.worker.js` = dist/sqlite.worker.js, sha256
  `e48eea05c22fb0a9eee181c249488ac498899d58ccde20c17d223218416ef49d`
- `sql-wasm.wasm` = dist/sql-wasm.wasm, sha256
  `f71cee54ad1d4cccb781aad1fa79aa245a47fd3bd5172bb9f0d0897d47c7df15`

---

## §6.7 audit

- ~~Vendor the verbatim upstream LICENSE files~~ **DONE (2026-07-27):**
  `LICENSE-sql.js.txt` (MIT, fetched verbatim from sql-js/sql.js) and
  `LICENSE-sql.js-httpvfs.txt` (Apache-2.0 full text, fetched verbatim from
  phiresky/sql.js-httpvfs @ v0.8.12) now ship alongside the artifacts.
- ~~Pin the exact sql.js release compiled into `sql-wasm.wasm`~~ **DONE at the
  npm-package level** (byte-identity above). The sql.js build inside 0.8.12 is
  fixed by upstream's v0.8.12 build (sql.js is bundled into dist, not a runtime
  dependency); its exact tag is upstream's lockfile concern — our provenance
  boundary is the byte-identical npm artifact, which is recorded.
