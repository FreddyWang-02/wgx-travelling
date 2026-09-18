CREATE TABLE IF NOT EXISTS trip_document (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  revision INTEGER NOT NULL,
  document_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS access_tokens (
  mode TEXT PRIMARY KEY CHECK (mode IN ('edit', 'read')),
  token_hash TEXT NOT NULL CHECK (length(token_hash) = 64),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO trip_document (id, revision, document_json)
VALUES (
  1,
  1,
  '{"protocol":"travelpack","schemaVersion":"1.1.0","baseRevision":null,"trip":{"id":"trip-new","title":"待导入旅行","startDate":null,"endDate":null},"companions":[],"days":[],"places":[],"itineraryItems":[],"transportSegments":[],"stays":[],"tasks":[],"expenses":[],"materials":[],"assets":[],"sources":[]}'
);
