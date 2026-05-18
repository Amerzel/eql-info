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

let _workerPromise = null;

export function initDb() {
  if (_workerPromise) return _workerPromise;
  _workerPromise = createDbWorker(
    [{
      from: "inline",
      config: {
        serverMode: "full",
        // Relative to the page's URL; works on Pages, on local file:// (after
        // serving via http.server), and on any subpath deployment.
        url: new URL("static/data/spells.sqlite", document.baseURI).href,
        requestChunkSize: 4096,
      },
    }],
    WORKER_URL,
    WASM_URL,
  );
  return _workerPromise;
}

/** Run a parameterized SELECT and return rows as plain objects. */
export async function query(sql, params = []) {
  const worker = await initDb();
  const rows = await worker.db.query(sql, params);
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
