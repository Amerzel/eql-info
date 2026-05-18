// SQLite access via sql.js-httpvfs. The DB is hosted as a static file at
// static/data/spells.sqlite; the browser issues HTTP Range requests to read
// only the b-tree pages it needs.
//
// We import the library from jsDelivr to avoid an npm build step. Pin the
// version explicitly so we don't accidentally break on upgrades.

// We import the main library via esm.sh (it ESM-wraps the UMD bundle).
// The Web Worker and WASM binary are vendored locally because the Worker
// constructor enforces same-origin — loading sqlite.worker.js from a CDN
// throws a SecurityError. esm.sh only re-exports the UMD result as
// `default`, so we destructure createDbWorker off it.
import sqlJsHttpvfs from "https://esm.sh/sql.js-httpvfs@0.8.12";
const { createDbWorker } = sqlJsHttpvfs;

const WORKER_URL = new URL("static/vendor/sqlite.worker.js", document.baseURI).href;
const WASM_URL   = new URL("static/vendor/sql-wasm.wasm",   document.baseURI).href;

// GitHub Pages opportunistically gzips application/octet-stream and serves
// byte ranges in the compressed-byte space, which makes sql.js-httpvfs fail
// (it expects ranges in uncompressed bytes). raw.githubusercontent.com does
// not gzip and sends proper Range responses with CORS, so we route the
// DB fetch through it when running on Pages. Local dev keeps the relative
// path so serve_docs.py (range-capable) can serve the file directly.
const RAW_URL = "https://raw.githubusercontent.com/Amerzel/eql-info/main/docs/static/data/spells.sqlite";

function dbUrl() {
  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1" || host === "") {
    return new URL("static/data/spells.sqlite", document.baseURI).href;
  }
  return RAW_URL;
}

let _workerPromise = null;

// 64 KB fetches (vs default 4 KB) cut round-trip count ~16x for table scans.
// Larger is even better for sequential reads but wastes bandwidth on random
// lookups; 64 KB hits a good balance.
const REQUEST_CHUNK_SIZE = 65536;

export function initDb() {
  if (_workerPromise) return _workerPromise;
  _workerPromise = createDbWorker(
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
  );
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
