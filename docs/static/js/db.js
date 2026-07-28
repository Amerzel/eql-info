// SQLite access via sql.js-httpvfs. The DB is hosted as a static file at
// static/data/spells.sqlite; the browser issues HTTP Range requests to read
// only the b-tree pages it needs.
//
// SERVED-SURFACE GATE (docs/SERVED-SURFACE.md): production consumes ONLY
// manifest-authenticated resources —
//   * the library is VENDORED byte-exact from npm sql.js-httpvfs@0.8.12
//     (dist/index.js, UMD; loaded as a classic script because no ESM build
//     exists — the exact-bytes vendoring is what keeps provenance clean);
//   * the production DB URL is pinned to an IMMUTABLE commit (db_pin.js,
//     enforced by the deploy flow), never a mutable branch.
import { DB_PIN_COMMIT } from "./db_pin.js";

const LIB_URL = new URL("static/vendor/sql.js-httpvfs-0.8.12.js", document.baseURI).href;
const WORKER_URL = new URL("static/vendor/sqlite.worker.js", document.baseURI).href;
const WASM_URL   = new URL("static/vendor/sql-wasm.wasm",   document.baseURI).href;

// GitHub Pages gzips application/octet-stream when the client negotiates it
// and then serves ranges in COMPRESSED-byte space, which breaks sql.js-httpvfs
// (it needs ranges over the uncompressed file). raw.githubusercontent.com
// serves proper uncompressed Range responses with CORS — pinned to the exact
// deployed-DB commit so the bytes are immutable and audit-bound.
function dbUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "") {
    return new URL("static/data/spells.sqlite", document.baseURI).href;
  }
  return "https://raw.githubusercontent.com/Amerzel/eql-info/" +
         DB_PIN_COMMIT + "/docs/static/data/spells.sqlite";
}

// The vendored UMD attaches its exports (createDbWorker) to window when loaded
// as a classic script. Loaded lazily, once.
let _libPromise = null;
function loadLib() {
  if (_libPromise) return _libPromise;
  _libPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = LIB_URL;
    s.onload = () => resolve(/** @type {any} */ (window).createDbWorker);
    s.onerror = () => reject(new Error("failed to load sql.js-httpvfs"));
    document.head.appendChild(s);
  });
  return _libPromise;
}

let _workerPromise = null;

// 64 KB fetches (vs default 4 KB) cut round-trip count ~16x for table scans.
// Larger is even better for sequential reads but wastes bandwidth on random
// lookups; 64 KB hits a good balance.
const REQUEST_CHUNK_SIZE = 65536;

export function initDb() {
  if (_workerPromise) return _workerPromise;
  _workerPromise = loadLib().then((createDbWorker) => createDbWorker(
    [{
      from: "inline",
      config: {
        serverMode: "full",
        url: dbUrl(),
        requestChunkSize: REQUEST_CHUNK_SIZE,
      },
    }],
    WORKER_URL,
    WASM_URL,
  ));
  return _workerPromise;
}

// ---------------------------------------------------------------------------
// In-memory query cache.
// Same SQL + params returns the same rows for the lifetime of the page, so
// re-navigating to a previously-visited view is instant. We keep it modest;
// the values are reasonably small structured rows.
// ---------------------------------------------------------------------------
const _cache = new Map();
const _CACHE_LIMIT = 200;

function _cacheKey(sql, params) {
  return sql + "\x1f" + JSON.stringify(params);
}

/** Run a parameterized SELECT and return rows as plain objects. */
export async function query(sql, params = []) {
  const key = _cacheKey(sql, params);
  if (_cache.has(key)) {
    // LRU touch.
    const v = _cache.get(key);
    _cache.delete(key); _cache.set(key, v);
    return v;
  }
  const worker = await initDb();
  const rows = await worker.db.query(sql, params);
  _cache.set(key, rows);
  if (_cache.size > _CACHE_LIMIT) {
    // Drop oldest insertion.
    const oldest = _cache.keys().next().value;
    _cache.delete(oldest);
  }
  return rows;
}

/** Convenience: first row, or null. */
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length ? rows[0] : null;
}

/** Resolve a dbstr text entry. Returns null if missing. */
export async function dbstr(id, type) {
  if (!id) return null;
  const row = await queryOne(
    "SELECT text FROM dbstr WHERE id = ? AND type = ?", [id, type]);
  return row ? row.text : null;
}
