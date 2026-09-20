# Phase 2 Handoff — TravelPack 1.2

Branch: `phase2-travelpack-1.2` (based on `main` @ `70e0dd0`, Phase 1 merged)
Status: complete, awaiting user confirmation before Phase 3.

Baseline before changes: `npm run check` → 10 pass / 0 fail, audit `"safe": true`, 73 files.
After changes: `npm run check` → **30 pass / 0 fail**, audit `"safe": true`, 76 files.

---

## What Phase 2 Delivered

Phase 1 defined the AI Travel Copilot behaviours (hard/soft constraints, candidate pool, explainable planning, local-replan). Phase 2 turns those behaviours into a **structured data contract**: `schemaVersion = "1.2.0"`.

Scope was deliberately narrow — **Data Contract + Validation + Compatibility**. No UI, navigation, framework, dependency, map or deployment change.

```
TravelPack 1.1.0
+ preferences       (Soft Preferences)
+ constraints[]     (Hard Constraints)
+ planningMeta      (planning mode / confidence / recheck count)
+ alternatives[]    (candidate alternatives)
+ decisionLog[]     (Explainable Planning)
+ replanHistory[]   (Dynamic Replanning)
+ tripStatus
= TravelPack 1.2.0
```

## New Top-Level Fields

| Field | Type | Notes |
|---|---|---|
| `preferences` | object | `pace`, `interests[]` (open vocabulary), `walkingTolerance`, `crowdTolerance`, `budgetPreference`, `preferredDayStart`, `preferredDayEnd`, `notes[]`. Enum values nullable; times are 24h `HH:MM` or `null`. |
| `constraints[]` | array | `id`, `kind` (`flight`/`stay`/`reservation`/`event`/`must_visit`/`mobility`/`fixed_schedule`/`other`), `description`, `relatedRefs[]`, `status` (`active`/`resolved`/`superseded`), `source` (`user`/`booking`/`material`/`external`), `startAt`, `endAt` (nullable). |
| `planningMeta` | object | `mode` (`full-plan`/`local-replan`/`update-trip`/`demo`), `generatedAt`, `lastPlannedAt` (nullable), `overallConfidence` (0–1 or `null`), `needsRecheckCount`. |
| `alternatives[]` | array | `id`, `relatedRef`, `kind`, `title`, `reason`, `status` (`available`/`selected`/`rejected`/`needs-recheck`), `sourceIds[]`. |
| `decisionLog[]` | array | `id`, `kind`, `relatedRefs[]`, `reason`, `createdAt`. |
| `replanHistory[]` | array | `id`, `trigger`, `createdAt`, `status` (`proposed`/`applied`/`cancelled`), `affectedDayIds[]`, `affectedRefs[]`, `preservedRefs[]`, `summary`. |
| `tripStatus` | string | `planning` / `confirmed` / `in-progress` / `completed`. |

`tripStatus` replaces the `draft` value sketched in `MIGRATION_PLAN.md` with `planning`, and stays separate from `transportSegments[].status` / `stays[].status`.

## Validator Compatibility Strategy

`hks-travel-skill/assets/frontend-template/protocol.mjs` now exports `supportedSchemaVersions = ["1.1.0", "1.2.0"]`.

- `schemaVersion = "1.1.0"` → runs the original 1.1 checks only, byte-for-byte behaviour. The seven new fields are neither required nor inspected. Unknown extra fields stay ignored.
- `schemaVersion = "1.2.0"` → runs **all** 1.1 checks first, then the 1.2 add-on checks. 1.2 data must satisfy the 1.1 contract too.
- Any other version string fails with `当前支持 1.1.0、1.2.0`.

1.2-specific checks: presence/type of the seven fields, enum legality, `HH:MM` and `YYYY-MM-DD[THH:MM]` formats, `overallConfidence ∈ [0,1]` or `null`, `needsRecheckCount` non-negative integer, ID uniqueness across the whole 1.1 + 1.2 namespace, reference integrity for `relatedRefs` / `affectedRefs` / `preservedRefs` / `relatedRef` / `affectedDayIds` / `sourceIds`, `tripStatus` legality, and a credential scan (forbidden key names plus private-key / `sk-` / `AKID` / `AIza` value patterns) over the new subtrees.

Design constraint honoured: **zero new dependencies**, no schema library, existing error-reporting style kept (`{ path, message }` arrays with a readable message per field).

One robustness bug was found and fixed while writing the tests: malformed `preferences.interests` / `preferences.notes` / reference arrays previously threw a `TypeError` instead of returning a validation error. New 1.2 helpers now report a clean error and never crash on malformed input.

## Samples

- `assets/frontend-template/travelpack.sample.json` — **unchanged**, stays the TravelPack 1.1 regression sample.
- `assets/frontend-template/travelpack.sample.1.2.json` — **new**. Upgrades the same Beijing trip data rather than inventing an unrelated trip. Contains 8 soft preferences, 4 hard constraints, `planningMeta`, 3 alternatives, 3 decisionLog entries, 2 replanHistory entries and `tripStatus: "in-progress"`. The rain replan on `day-22` is reflected in the itinerary (什刹海 walking replaced by 雍和宫 indoor visit), so the history is coherent with the plan rather than decorative. No keys, emails, ID numbers or real personal data.

## Frontend Compatibility

No frontend file was modified. Verified two ways:

1. `build_static_preview.mjs` runs `validateTravelPack` on the 1.2 sample — passes, and the full template is copied unchanged.
2. The built `index.html` embeds the 1.2 payload (including `tripStatus` and `replanHistory`), and the existing frontend reads the pack only through named fields (`state.pack.materials`, `state.pack.trip.id`, …) — there is no iteration over top-level keys, so unknown additive fields are safely ignored.

Both paths are now locked in by automated tests (1.2 sample builds a preview; 1.1 sample still builds through the same pipeline).

## Tests

`tests/travelpack-1.2.test.mjs` adds 20 tests; total suite is now **30 pass / 0 fail**.

Coverage: 1.1 sample validates (no regression) · 1.2 sample validates · CLI reports both schema versions and 1.2 collections · 1.1 sample relabelled as 1.2 without new fields fails on all seven · each missing 1.2 field fails · invalid `tripStatus` fails · invalid constraint refs (missing id, unknown type, bad kind, bad source, reversed window) fail · invalid `sourceIds` fail · invalid `overallConfidence` fails · invalid preference times fail · invalid preference enums/shapes fail · open `interests` vocabulary accepted · `replanHistory` day/ref integrity fails · `decisionLog` reason length and CoT guard · cross-collection ID uniqueness · credential-like keys and secret values rejected · additive-superset upgrade path and unknown-field tolerance · 1.2 sample static preview build · SKILL/reference wiring · privacy audit.

Validator tests construct genuinely invalid packs and assert the failure, not string presence.

## Docs Updated

- New `hks-travel-skill/references/travelpack-1.2.md` — full 1.2 contract: additive-extension statement, field/enum/null rules, reference integrity, safety rules, CoT prohibition, 1.1 ↔ 1.2 compatibility strategy, and a pointer to `travelpack-1.1.md` instead of copying the old contract.
- `hks-travel-skill/SKILL.md` — formal output protocol is now TravelPack 1.2; new **TravelPack 1.2 数据契约** section maps each AI behaviour to its field; step 11 defaults new trips to `1.2.0` while keeping the 1.1 legacy link; boundary added that 1.2 is additive-only and must not carry credentials or chain-of-thought.
- `references/planning-intelligence.md` — Soft Preferences → `preferences`, Hard Constraints → `constraints[]`, Explainable Planning → `decisionLog[]`, candidates → `alternatives[]`; schema details delegated to `travelpack-1.2.md`.
- `references/dynamic-replanning.md` — local-replan must write `replanHistory[]`, optionally `decisionLog[]` / `alternatives[]` / `planningMeta.lastPlannedAt`, and must **not** change the frontend.
- `travelpack-1.1.md` was **not** deleted or edited; it remains the legacy compatibility document.

## Open Questions

1. `MIGRATION_PLAN.md` (Phase 0 era) sketches `constraints` as an **object** and `tripStatus` as `draft`. Phase 2 ships `constraints[]` as an array and `planning` instead of `draft`, per the Phase 2 specification. `MIGRATION_PLAN.md` was not edited; it should be reconciled in a later phase if it is still treated as a live design doc.
2. `MIGRATION_PLAN.md` also says "Update `product-contract.md` with new fields" — not done in Phase 2, because `product-contract.md` describes the five-module product surface and Phase 2 was data-contract only. Field documentation lives in `travelpack-1.2.md`.
3. `needsRecheckCount` is a stored count, not derived. Nothing enforces that it matches the actual number of `needs-recheck` sources/tasks/alternatives. A derived-or-validated rule would need a Phase 3 decision.
4. `reason` / `summary` are capped at 280 characters as a structural no-chain-of-thought guard. This is a judgement call; adjust the limit if real usage proves too tight.
5. The frontend still validates with `1.2` support but does **not** display any new field. Any UI surfacing of `decisionLog` / `replanHistory` / `constraints` is Phase 3 work.

## Phase 3 Entry Conditions

All satisfied:

- [x] TravelPack 1.2.0 defined as an additive extension of 1.1.0
- [x] All seven new top-level fields specified with types, enums and null behaviour
- [x] No 1.1 field deleted, renamed or semantically changed
- [x] Validator supports both `1.1.0` and `1.2.0` with no 1.1 regression
- [x] Reference integrity, ID uniqueness and credential rules enforced
- [x] Chain-of-thought storage explicitly prohibited in schema, validator and docs
- [x] `references/travelpack-1.2.md` created; `travelpack-1.1.md` preserved as legacy
- [x] 1.1 sample preserved; 1.2 sample added and valid
- [x] SKILL.md, planning-intelligence.md and dynamic-replanning.md wired to the new fields
- [x] Frontend unchanged and proven tolerant of the new sample
- [x] 1.2 sample builds a static preview (automated test)
- [x] `npm run check` → 30 pass / 0 fail; privacy audit clean
- [x] No npm dependency added; no UI / navigation / framework / map / deployment change

Phase 3 (Product UX) may now read the new fields. It must keep the 1.1/1.2 contracts intact and treat new-field rendering as progressive enhancement.

## Do NOT in Phase 3 (carry-over constraints)

- Do not merge this branch to `main` without user confirmation.
- Do not treat the new fields as optional in 1.2 output — validator rejects incomplete 1.2 packs.
- Do not store chain-of-thought or credentials in any TravelPack structure.
- Do not rename or drop 1.1 fields; 1.1 consumers may still be in the wild.
