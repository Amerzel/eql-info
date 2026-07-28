// The IMMUTABLE commit URL of the currently deployed database. Updated by the
// deploy flow whenever the DB payload changes (deploy refuses a payload whose
// DB does not match this pin — see explorer/deploy.py). Never point at a
// mutable ref: production must consume only manifest-authenticated bytes.
export const DB_PIN_COMMIT = "42e3eb312a3726e7e92a092d0b57c3b40717a7b9";
