# Foundation Audit

Generated: 2026-09-20 (Phase 0 — Preserve & Baseline)

---

## 1. Current Architecture

The project is a complete **Skill / Agent + Web App** system:

| Layer | Description |
|---|---|
| **SKILL orchestration** | `hks-travel-skill/SKILL.md` — defines the agent workflow (research → confirm → generate → deploy → upgrade) |
| **references/** | 14 markdown files covering product contracts, schema, adapters, map routing, flight routing, deployment routing, upgrading, hosting, etc. |
| **frontend template** | `assets/frontend-template/` — vanilla HTML/CSS/JS, ES modules, no build system, no React |
| **backend template** | `assets/backend-template/` — Cloudflare Workers (worker.js + wrangler.jsonc.template + schema.sql) |
| **TravelPack** | JSON schema version 1.1.0; validated by `validate_travelpack.mjs` |
| **maps** | Three-stage negotiation: Agent MCP/connector → user API key → OpenStreetMap fallback → schematic route map |
| **deployment** | Four target types: host-native (WorkBuddy), Cloudflare, Codex Sites, generic static preview |
| **WorkBuddy adapter** | `host-adapter.mjs` — bridge between frontend and WorkBuddy's database/auth/publishing |
| **upgrade logic** | `plan_deployment_upgrade.mjs`, `build_deployment_backup.mjs`, `verify_deployment_upgrade.mjs` — deterministic, reversible, data-preserving |
| **tests** | 4 Node.js native tests (`node --test`); 0 npm dependencies |

The architecture is intentionally lightweight: no framework, no bundler, no runtime deps — pure ES modules with Node.js ≥20.

---

## 2. Main Entry Points

| File | Role |
|---|---|
| `hks-travel-skill/SKILL.md` | Core agent instructions; workflow, boundaries, rules |
| `hks-travel-skill/references/product-contract.md` | Five-module product spec and UI acceptance criteria |
| `hks-travel-skill/references/travelpack-1.1.md` | TravelPack 1.1.0 schema contract |
| `hks-travel-skill/references/deployment-routing.md` | Host capability discovery and deployment target selection |
| `hks-travel-skill/references/hosting.md` | Data ownership and deployment order |
| `hks-travel-skill/references/upgrading-deployments.md` | Upgrade protocol for existing deployments |
| `hks-travel-skill/references/map-routing.md` | Three-stage map capability negotiation |
| `hks-travel-skill/references/adapters-workbuddy.md` | WorkBuddy native cloud adapter |
| `hks-travel-skill/references/adapters-cloudflare.md` | Cloudflare Worker+D1 adapter |
| `hks-travel-skill/references/adapters-codex-sites.md` | Codex/OpenAI Sites adapter |
| `hks-travel-skill/references/adapters-generic.md` | Generic agent/MCP adapter |
| `hks-travel-skill/assets/frontend-template/index.html` | Frontend entry point |
| `hks-travel-skill/assets/frontend-template/app.mjs` | Main application logic (~2000 lines) |
| `hks-travel-skill/assets/frontend-template/app.css` | All styling (six UI themes, dark mode) |
| `hks-travel-skill/assets/frontend-template/protocol.mjs` | TravelPack validate/build/format functions |
| `hks-travel-skill/assets/frontend-template/maintenance.mjs` | Edit/save conflict detection, ledger, tasks-to-ICS |
| `hks-travel-skill/assets/frontend-template/transfer.mjs` | Serialize/deserialize TravelPack to/from backend |
| `hks-travel-skill/assets/frontend-template/map-adapter.mjs` | Map rendering abstraction (Leaflet + adapter) |
| `hks-travel-skill/assets/frontend-template/host-adapter.mjs` | Host-specific API/auth bridge |
| `hks-travel-skill/scripts/validate_travelpack.mjs` | CLI: validates a TravelPack JSON against schema |
| `hks-travel-skill/scripts/build_deployment_manifest.mjs` | CLI: produces public travel-app-manifest.json |
| `hks-travel-skill/scripts/build_deployment_backup.mjs` | CLI: creates SHA-256 backup of deployment |
| `hks-travel-skill/scripts/plan_deployment_upgrade.mjs` | CLI: generates deterministic upgrade plan |
| `hks-travel-skill/scripts/verify_deployment_upgrade.mjs` | CLI: verifies post-upgrade data integrity |
| `hks-travel-skill/scripts/serve_ui_preview.mjs` | CLI: serves static preview on random port |
| `hks-travel-skill/scripts/build_static_preview.mjs` | CLI: builds static preview from TravelPack |
| `hks-travel-skill/scripts/select_deployment_target.mjs` | CLI: selects best deployment target from capabilities |
| `hks-travel-skill/scripts/select_map_capability.mjs` | CLI: selects map capability from available tools |
| `hks-travel-skill/scripts/verify_cloud_deployment.mjs` | CLI: verifies live cloud deployment |
| `scripts/audit-public-tree.mjs` | CLI: scans public repo for secrets/keys/PII |
| `tests/skill.test.mjs` | Test suite (4 tests) |

---

## 3. Frontend Stack

**Confirmed (not guessed):**

- **HTML** — single `index.html`; no SPA framework
- **CSS** — vanilla CSS with CSS custom properties for theming (6 styles × light/dark)
- **JavaScript** — ES Modules (`"type": "module"` in package.json), no transpiler
- **React**: **No**
- **Build system**: **None** — files are served directly; no Vite/Webpack/bundler
- **Third-party libraries**:
  - **Leaflet 1.9.4** — for OpenStreetMap fallback rendering (`vendor/leaflet/`)
  - **Lucide 0.468.0** — icon set (`lucide.js`)
- No package.json runtime dependencies — only `"type": "module"`

The app uses `import` / `export` ES modules exclusively. It works in any modern browser without a build step.

---

## 4. Current TravelPack Schema (1.1.0)

```jsonc
{
  "protocol": "travelpack",
  "schemaVersion": "1.1.0",
  "appearance": { "styleId": "aviation" | "natural" | "minimal" | "collage" | "print" | "urban" },
  "trip": { "id", "title", "startDate", "endDate", "defaultTimezone", "destination", "subtitle?", "destinationCode?", "note?" },
  "companions": [{ "id", "name", "avatarUrl?" }],
  "days": [{ "id", "date", "title" }],
  "places": [{ "id", "name", "links[]", "location?": { "longitude", "latitude", "coordinateSystem": "WGS84" } }],
  "itineraryItems": [{ "id", "dayId", "placeId", "order", "kind", "startTime", "endTime", "notes?", "links?" }],
  "transportSegments": [{ "id", "purpose": "outbound"|"intermediate"|"return", "mode", "from", "to", "departure", "arrival", "status": "planned"|"booked"|"cancelled"|"replaced", "milestones[]", "materialIds[]" }],
  "stays": [{ "id", "placeId", "checkIn", "checkOut", "status", "materialIds[]", "links?" }],
  "tasks": [{ "id", "title", "kind", "status": "pending"|"done", "dueAt", "relatedRefs[]" }],
  "expenses": [{ "date", "title", "currency": "XXX", "amountMinor": int, "payerId", "splitMode": "equal"|"custom", "allocations[]" }],
  "materials": [{ "kind": "place"|"ticket"|"guide"|"link", "title", "relatedRefs[]", "assetIds[]", "sensitive": bool }],
  "assets": [{ "id", "url", "mimeType", "fileName", "uploadAt" }],
  "sources": [{ "platform", "title", "url", "retrievedAt", "freshness": { "kind": "live"|"dynamic"|"seasonal"|"stable", "checkedAt", "status": "current"|"needs-recheck", "publishedAt?", "validUntil?" } }]
}
```

Key invariants: all IDs unique at top level; all references must exist; `amountMinor` is integer; times are `HH:MM`; no invented prices/counts.

---

## 5. Deployment Architecture

Four-tier target selection (priority order):

1. **Host-native** (e.g., WorkBuddy Sites + DB + auth) — zero user setup, preferred
2. **Connected MCP** — already-authenticated map or cloud tools
3. **Authenticated CLI** (Cloudflare Wrangler login)
4. **User cloud** — Cloudflare, or any free tier the user provides

Deployment modes:
- **`standard-cloud`**: Full backend (Worker + D1 DB + Secrets + Token routes)
- **`host-native`**: Uses host's built-in database/auth; no separate backend code needed
- **`single-owner-published-share`**: Single-owner edit + protected read snapshot

Static preview is **only** for UI review (`--ui-review`); never announced as a live deployment.

The manifest (`travel-app-manifest.json`) records: product ID, skill/frontend/host-adapter versions, data schema version, deployment mode, site URL, deployment time — **never** secrets.

---

## 6. Map Architecture

Three independent capabilities, negotiated in stages:

| Stage | What | How |
|---|---|---|
| 1. Location search | POI lookup & coordinates | Agent MCP / connector (Tencent, AMap, Baidu, Google) |
| 2. Route data | Walking/driving/transit routes | Same map service, or schematic dashed line by `order` |
| 3. Basemap rendering | Visual tiles on page | `window.TRAVEL_MAP_ADAPTER` → official Web SDK (Tencent/AMap) → OSM public tiles fallback → schematic route map |

Key rule: **MCP ≠ basemap**. A connected Tencent Map MCP provides POI/route data but does not enable the JS GL basemap on the web page.

Base map authorization requires:
1. Official documentation explicitly lists the SDK/API
2. Developer registration, Key, domain allowlist, or OAuth completed
3. Attribution/logo/credits displayed
4. Credentials come from user-owned host Secret, not chat/history/TravelPack

If no map capability is available, the page shows a schematic route map (ordered dots with connecting dashed lines). No coordinate fields are shown for unlocated places.

---

## 7. Upgrade / Persistence

### Save / Revision
- Every write to the backend includes the current `revision` token
- Server rejects writes with stale revision (HTTP 412 / equivalent)
- WorkBuddy native: uses browser DB SDK revision

### Backup
- `build_deployment_backup.mjs` creates a timestamped backup directory
- Includes TravelPack JSON, current manifest, attachment manifest
- SHA-256 checksums for integrity verification
- Stored in user-owned project or explicitly chosen location

### Manifest
- `travel-app-manifest.json` published at site root
- Read by upgrade flow to identify source project, version, schema
- Missing manifest → `legacy-audit-required` (must audit before upgrading)

### Upgrade flow
1. Read manifest → locate original project
2. Read live TravelPack + revision
3. Run `plan_deployment_upgrade.mjs` → classify upgrade
4. Back up before changes
5. Execute: code-only upgrade or data migration
6. Verify: `verify_deployment_upgrade.mjs` + real browser check
7. On failure: restore from backup; do not overwrite concurrent user writes

Migration rules:
- Each migration has unique `from`/`to` paths inside the skill bundle
- No absolute paths, no directory traversal
- Migration scripts are deterministic, stateless, no network access
- Must preserve stable IDs and protected user data
- Must have automated test coverage

---

## 8. Test Baseline

**Environment:**
- Node.js: `v22.22.2` (meets ≥20 requirement)
- npm: `10.9.7`
- Runtime deps: **0** (none installed)

**`npm run audit`:**
```json
{ "safe": true, "filesScanned": 64, "root": "/private/tmp/Hks-Travel-Skill" }
```
→ Clean. No secrets, keys, emails, or absolute paths in public tree.

**`npm test` (4 tests, all pass):**
```
✔ public skill metadata and screenshots are complete (1.9ms)
✔ bundled sample validates (29.3ms)
✔ new manifest uses public product id and legacy upgrades remain recognized (26.6ms)
✔ public tree passes the privacy audit (36.6ms)

tests 4 | pass 4 | fail 0 | cancelled 0 | skipped 0
```

**Post-migration verification (workspace copy):**
```json
{ "safe": true, "filesScanned": 63, "root": "<workspace-root>" }
```
All 4 tests pass. Zero regression.

---

## Findings

**BASELINE ISSUES (pre-existing, not introduced by migration):**
- None. All tests pass; audit clean.

**Technical debt noted for later phases:**
- Frontend is ~2000 LOC in a single `app.mjs` file — no modular decomposition
- No build system means no type checking, no linting beyond the privacy audit
- `package.json` has no devDependencies (no eslint, no prettier)
- Backend template only supports Cloudflare Workers (no Supabase/Firebase/etc.)
- Only 4 tests cover the entire skill logic

These are documented but **not addressed** in Phase 0 per constraints.
