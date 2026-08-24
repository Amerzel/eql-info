// The IMMUTABLE commit URL of the currently deployed database. Updated by the
// deploy flow whenever the DB payload changes (deploy refuses a payload whose
// DB does not match this pin — see explorer/deploy.py). Never point at a
// mutable ref: production must consume only manifest-authenticated bytes.
export const DB_PIN_COMMIT = "e7e50a198e24f4a3cb5ccd8bbfbc4872b17695f2";
