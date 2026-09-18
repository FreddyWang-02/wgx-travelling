const MAX_DOCUMENT_BYTES = 1024 * 1024;
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const COLLECTIONS = [
  "companions",
  "days",
  "places",
  "itineraryItems",
  "transportSegments",
  "stays",
  "tasks",
  "expenses",
  "materials",
  "assets",
  "sources",
];

function json(body, status = 200, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

async function tokenMatches(candidate, expected) {
  if (!candidate || !expected) return false;
  const encoder = new TextEncoder();
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    difference |= a[index] ^ b[index];
  }
  return difference === 0;
}

function parseRoute(pathname) {
  const match = pathname.match(/^\/api\/(r|e)\/([^/]+)(?:(?:\/attachments\/([^/]+))|(?:\/(access-links|places-search)))?$/);
  if (!match) return null;
  return {
    mode: match[1] === "e" ? "edit" : "read",
    token: decodeURIComponent(match[2]),
    attachmentName: match[3] ? decodeURIComponent(match[3]) : null,
    action: match[4] || null,
  };
}

async function tokenHash(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function authorize(route, env) {
  const stored = await env.DB.prepare(
    "SELECT token_hash FROM access_tokens WHERE mode = ?",
  ).bind(route.mode).first();
  if (stored?.token_hash) {
    return tokenMatches(await tokenHash(route.token), stored.token_hash);
  }
  const bootstrapToken = route.mode === "edit" ? env.EDIT_TOKEN : env.READ_TOKEN;
  return tokenMatches(route.token, bootstrapToken);
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function rotateAccessLinks(env) {
  const editToken = randomToken();
  const readToken = randomToken();
  const [editHash, readHash] = await Promise.all([tokenHash(editToken), tokenHash(readToken)]);
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO access_tokens (mode, token_hash, updated_at) VALUES ('edit', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(mode) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at`,
    ).bind(editHash),
    env.DB.prepare(
      `INSERT INTO access_tokens (mode, token_hash, updated_at) VALUES ('read', ?, CURRENT_TIMESTAMP)
       ON CONFLICT(mode) DO UPDATE SET token_hash = excluded.token_hash, updated_at = excluded.updated_at`,
    ).bind(readHash),
  ]);
  return json({
    editToken,
    readToken,
    editPath: `/e/${editToken}`,
    readPath: `/r/${readToken}`,
  });
}

async function readDocument(env) {
  return env.DB.prepare(
    "SELECT revision, document_json, updated_at FROM trip_document WHERE id = 1",
  ).first();
}

function privateFilteredDocument(document) {
  const copy = structuredClone(document);
  const hiddenMaterialIds = new Set(
    (copy.materials || []).filter((material) => material.sensitive).map((material) => material.id),
  );
  const hiddenAssetIds = new Set(
    (copy.materials || []).filter((material) => hiddenMaterialIds.has(material.id)).flatMap((material) => material.assetIds || []),
  );
  copy.materials = (copy.materials || []).map((material) => {
    if (!hiddenMaterialIds.has(material.id)) return material;
    return {
      id: material.id,
      kind: material.kind,
      title: material.title,
      description: material.description || "敏感原件在只读分享中隐藏。",
      relatedRefs: material.relatedRefs || [],
      sensitive: true,
      assetIds: [],
      url: null,
    };
  });
  copy.assets = (copy.assets || []).filter((asset) => !hiddenAssetIds.has(asset.id)).map((asset) => ({
    ...asset,
    storageKey: undefined,
    privateUrl: undefined,
  }));
  return copy;
}

async function getDocument(env, mode = "edit") {
  const row = await readDocument(env);
  if (!row) return json({ error: "document_not_found" }, 404);
  const document = JSON.parse(row.document_json);
  return json(
    {
      revision: row.revision,
      updatedAt: row.updated_at,
      capabilities: {
        attachments: Boolean(env.ATTACHMENTS),
        placeSearch: Boolean(env.TENCENT_MAP_KEY),
      },
      document: mode === "read" ? privateFilteredDocument(document) : document,
    },
    200,
    { etag: `"${row.revision}"` },
  );
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isValidTravelPack(document) {
  if (!isPlainObject(document) || document.protocol !== "travelpack" || document.schemaVersion !== "1.1.0") return false;
  if (!isPlainObject(document.trip) || typeof document.trip.id !== "string" || typeof document.trip.title !== "string") return false;
  if (!COLLECTIONS.every((name) => Array.isArray(document[name]))) return false;
  if (document.appearance && !["aviation", "natural", "minimal", "collage", "print", "urban"].includes(document.appearance.styleId)) return false;
  if (!document.tasks.every((task) => ["pending", "done"].includes(task.status)
    && (task.dueAt == null || (isPlainObject(task.dueAt) && typeof task.dueAt.localDate === "string")))) return false;
  if (!document.expenses.every((expense) => typeof expense.date === "string"
    && /^[A-Z]{3}$/.test(expense.currency || "")
    && ["equal", "custom"].includes(expense.splitMode)
    && Array.isArray(expense.allocations))) return false;
  if (!document.materials.every((material) => ["place", "ticket", "guide", "link"].includes(material.kind)
    && Array.isArray(material.relatedRefs)
    && Array.isArray(material.assetIds)
    && typeof material.sensitive === "boolean")) return false;
  if (!document.sources.every((source) => typeof source.platform === "string"
    && typeof source.title === "string"
    && typeof source.url === "string"
    && typeof source.retrievedAt === "string")) return false;
  return true;
}

function parseRevision(value) {
  if (!value) return null;
  const normalized = value.trim().replace(/^W\//, "").replace(/^"|"$/g, "");
  const revision = Number(normalized);
  return Number.isSafeInteger(revision) && revision > 0 ? revision : null;
}

async function putDocument(request, env) {
  const expectedRevision = parseRevision(request.headers.get("if-match"));
  if (!expectedRevision) {
    return json({ error: "if_match_required" }, 428);
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_DOCUMENT_BYTES) {
    return json({ error: "document_too_large" }, 413);
  }

  let document;
  try {
    document = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  if (!isValidTravelPack(document)) {
    return json({ error: "invalid_travelpack" }, 400);
  }

  const nextRevision = expectedRevision + 1;
  const result = await env.DB.prepare(
    `UPDATE trip_document
       SET revision = ?, document_json = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = 1 AND revision = ?`,
  )
    .bind(nextRevision, JSON.stringify(document), expectedRevision)
    .run();

  if (result.meta.changes !== 1) {
    const current = await readDocument(env);
    return json(
      { error: "revision_conflict", currentRevision: current?.revision ?? null },
      412,
    );
  }
  return json({ saved: true, revision: nextRevision }, 200, {
    etag: `"${nextRevision}"`,
  });
}

async function putAttachment(request, env, name) {
  if (!env.ATTACHMENTS) return json({ error: "attachment_storage_unavailable" }, 503);
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(name)) {
    return json({ error: "invalid_attachment_id" }, 400);
  }
  const mime = (request.headers.get("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!ATTACHMENT_TYPES.has(mime)) return json({ error: "attachment_type_not_allowed" }, 415);
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_ATTACHMENT_BYTES) {
    return json({ error: "attachment_too_large" }, 413);
  }
  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_ATTACHMENT_BYTES) {
    return json({ error: "attachment_too_large" }, 413);
  }
  if (!hasExpectedSignature(new Uint8Array(body), mime)) {
    return json({ error: "attachment_signature_mismatch" }, 415);
  }
  const originalName = cleanFilename(request.headers.get("x-file-name"), mime);
  const storageKey = `assets/${name}`;
  await env.ATTACHMENTS.put(storageKey, body, {
    httpMetadata: {
      contentType: mime,
      contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(originalName)}`,
    },
    customMetadata: { originalName },
  });
  return json({
    uploaded: true,
    asset: { id: name, name: originalName, mime, size: body.byteLength, storageKey },
  }, 201);
}

function cleanFilename(value, mime) {
  let decoded = "";
  try {
    decoded = decodeURIComponent(value || "");
  } catch {
    decoded = value || "";
  }
  const fallback = mime === "application/pdf" ? "attachment.pdf" : `attachment.${mime.split("/")[1]}`;
  return decoded.replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim().slice(0, 120) || fallback;
}

function hasExpectedSignature(bytes, mime) {
  const starts = (...values) => values.every((value, index) => bytes[index] === value);
  if (mime === "application/pdf") return starts(0x25, 0x50, 0x44, 0x46, 0x2d);
  if (mime === "image/jpeg") return starts(0xff, 0xd8, 0xff);
  if (mime === "image/png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mime === "image/webp") {
    return starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  return false;
}

async function assetIsVisible(env, name, mode) {
  const row = await readDocument(env);
  if (!row) return false;
  const document = JSON.parse(row.document_json);
  if (!(document.assets || []).some((asset) => asset.id === name)) return false;
  if (mode === "edit") return true;
  return !(document.materials || []).some(
    (material) => material.sensitive && (material.assetIds || []).includes(name),
  );
}

async function getAttachment(env, name, mode) {
  if (!env.ATTACHMENTS || !(await assetIsVisible(env, name, mode))) {
    return json({ error: "attachment_not_found" }, 404);
  }
  const object = await env.ATTACHMENTS.get(`assets/${name}`);
  if (!object) return json({ error: "attachment_not_found" }, 404);
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "private, no-store");
  headers.set("x-content-type-options", "nosniff");
  return new Response(object.body, { headers });
}

async function searchPlaces(request, env) {
  if (!env.TENCENT_MAP_KEY) return json({ error: "place_search_unavailable" }, 503);
  const sourceUrl = new URL(request.url);
  const query = (sourceUrl.searchParams.get("query") || "").trim();
  const region = (sourceUrl.searchParams.get("region") || "").trim();
  if (query.length < 2 || query.length > 50 || region.length < 2 || region.length > 30) {
    return json({ error: "invalid_place_search" }, 400);
  }
  const target = new URL("https://apis.map.qq.com/ws/place/v1/search");
  target.searchParams.set("keyword", query);
  target.searchParams.set("boundary", `region(${region},0)`);
  target.searchParams.set("page_size", "10");
  target.searchParams.set("key", env.TENCENT_MAP_KEY);
  const response = await fetch(target, { headers: { accept: "application/json" } });
  if (!response.ok) return json({ error: "place_search_failed" }, 502);
  const payload = await response.json();
  if (payload.status !== 0 || !Array.isArray(payload.data)) {
    return json({ error: "place_search_failed", providerStatus: payload.status }, 502);
  }
  return json({
    provider: "tencent-lbs",
    coordinateSystem: "GCJ02",
    results: payload.data.slice(0, 10).map((place) => ({
      id: String(place.id || ""),
      name: String(place.title || ""),
      address: String(place.address || ""),
      category: String(place.category || ""),
      location: {
        longitude: Number(place.location?.lng),
        latitude: Number(place.location?.lat),
        coordinateSystem: "GCJ02",
      },
    })).filter((place) => place.name && Number.isFinite(place.location.longitude) && Number.isFinite(place.location.latitude)),
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, platform: "cloudflare" });
    }
    if (url.pathname === "/api/demo" && request.method === "GET") {
      return getDocument(env, "read");
    }

    const route = parseRoute(url.pathname);
    if (!route || !(await authorize(route, env))) {
      return json({ error: "not_found" }, 404);
    }

    if (route.attachmentName) {
      if (request.method === "PUT" && route.mode === "edit") {
        return putAttachment(request, env, route.attachmentName);
      }
      if (request.method === "GET") {
        return getAttachment(env, route.attachmentName, route.mode);
      }
      if (request.method === "PUT") return json({ error: "read_only" }, 403);
      return json({ error: "method_not_allowed" }, 405, { allow: "GET, PUT" });
    }

    if (route.action === "access-links") {
      if (route.mode !== "edit") return json({ error: "not_found" }, 404);
      if (request.method === "POST") return rotateAccessLinks(env);
      return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
    }

    if (route.action === "places-search") {
      if (route.mode !== "edit") return json({ error: "not_found" }, 404);
      if (request.method === "GET") return searchPlaces(request, env);
      return json({ error: "method_not_allowed" }, 405, { allow: "GET" });
    }

    if (request.method === "GET") return getDocument(env, route.mode);
    if (request.method === "PUT" && route.mode === "edit") {
      return putDocument(request, env);
    }
    if (request.method === "PUT") return json({ error: "read_only" }, 403);
    return json({ error: "method_not_allowed" }, 405, { allow: "GET, PUT" });
  },
};
