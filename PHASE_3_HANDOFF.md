# Phase 3 Handoff — Product UX & Interaction Architecture

Branch: `phase3-product-ux` (based on `main` @ `7bc0543`, Phase 2 merged)
Status: complete, awaiting user confirmation before Phase 4.

Baseline before changes: `npm run check` → 30 pass / 0 fail, audit `"safe": true`, 78 files.
After changes: `npm run check` → **56 pass / 0 fail**, audit `"safe": true`, 84 files.

Verified in a real browser at 1440×900 and 390×844 against the TravelPack 1.2 and 1.1 samples.

---

## What Phase 3 Delivered

Phase 2 turned the planning behaviours into a data contract. Phase 3 turns that data into a product experience users can read and act on.

Scope: **information architecture + interaction + data surfacing**. Not a visual redesign — the Sunny Travel Journal look stays in Phase 4.

```
概览 Overview  ·  行程 Itinerary  ·  准备 Prepare  ·  记账 Budget  ·  资料 Materials
                  └─ [ 行程 ] [ 地图 ]
✨ Travel AI (global floating capability)
```

## Files

Modified: `assets/frontend-template/index.html`, `app.mjs`, `app.css`, `references/product-contract.md`, `SKILL.md`.
Added: `assets/frontend-template/ux.mjs`, `references/product-ux-v1.md`, `references/agent-bridge.md`, `tests/phase3-product-ux.test.mjs`.

No TravelPack schema change, no validator change, no dependency added.

## Key Decisions

1. **Five first-level modules, always.** Map and AI Copilot are deliberately *not* navigation entries, so the product never becomes seven bottom tabs.
2. **概览 replaces 出行 without removing it.** The module is renamed and becomes an aggregate home, but the entire boarding-pass capability (purpose tabs, segment tabs, ticket face, milestones, attachments, edit/clear) is rendered unchanged inside it as 「出行票据与途中交通」.
3. **Map is an itinerary view.** `[行程][地图]` switches inside the module. Desktop list view keeps the V4 aviation two-column baseline (list + map); narrow screens show one at a time. List and map read one `itineraryItems` ordering and share a single `selectedItineraryItemId`, so selection syncs in both directions.
4. **AI Copilot is a global capability.** Floating entry + bottom sheet, context-aware quick actions, never a page. It collects context and produces a structured request; it never edits the trip itself.
5. **Honest status, no fabrication.** `tripStatus` is rendered as user copy. `needsRecheckCount` is described as a planning snapshot (contract-compliant) with an explicitly separate live recount. "Next item" falls back to 「下一项计划」 when the current moment can't be determined.
6. **No internal jargon in the UI.** 「AI 安排理由」and「已锁定安排」replace Decision Log / Hard Constraint / reasoning wording.
7. **1.2 fields are optional at every read site.** 1.1 packs hide the new surfaces instead of throwing.

## UX Layer Separation

- `ux.mjs` — pure data→language mapping, request building and markup builders. No DOM, fully unit-testable.
- `app.mjs` — DOM rendering and event wiring, importing the above.

## Agent Bridge

`window.TRAVEL_HOST_ADAPTER.requestAgentUpdate?.(request)` with a flat, stable request:

```jsonc
{ "action", "tripId", "dayId", "itineraryItemId", "text",
  "context": { "module", "schemaVersion", "tripStatus", "selectedDayId", "selectedItineraryItemId" } }
```

Present → 「交给当前 Agent 处理」. Absent → 「复制调整请求」 plus explicit copy that **the web page does not replan by itself**. Frontend stores no keys and hardcodes no model endpoint.

## Bugs Found During Browser Acceptance

1. **`openAlternatives` was shadowed by its own destructured dataset binding** — clicking 换一个 threw an async TypeError and the sheet never opened. Renamed the binding, and added a regression test that fails if any `button.dataset` binding collides with a module-level function.
2. **List→map selection was never wired** — only map→list worked. Added card-body selection writing the single shared state.
3. **AI reason duplicated** at both day level and card level. Day-scoped reasons now render once in the day block; cards show item/place reasons and, in 全程 view, their own day's reasons.
4. **Fixed floating entry covered the map detail action** at the page bottom. Added scroll clearance so the detail card can always clear the button.

## Verification

- 56 tests pass; audit clean; both schema versions still validate and build.
- Browser: overview, five-module nav, itinerary list, itinerary map, locked constraint, AI reason, 换一个, copilot sheet, quick action, fallback request, AI recent changes, prepare, budget, materials — all checked at desktop and 390px. No horizontal overflow in any module; no page errors beyond the pre-existing `favicon.ico` 404.
- Screenshots are committed under `docs/screenshots/phase3/` (8 desktop at 1440×900, 6 mobile at 390×844). `contact-sheet.png` combines all of them for one-shot handover; `README.md` in that folder captions each file. The three pre-existing Phase 0 screenshots in `docs/screenshots/` are untouched.

## Open Questions

1. **Reserved space for the floating entry.** Bottom padding gives clearance, but a fixed button still floats over content at intermediate scroll positions. A collapse-on-scroll behaviour would need a Phase 4 decision.
2. **`preferences` editing** currently opens the existing trip editor. A dedicated lightweight preference editor is not built.
3. **Prepare phase buckets** use thresholds (≥30 / 7–29 / 1–6 days, during, after, unscheduled). The 1–6 day bucket is labelled 出发前一周内 (renamed from 出发前 1 天 before merge; boundaries unchanged).
4. **Budget shows 已花 / 应收合计 / 应付合计** on the module home; per-person 个人应摊 / 实际支付 / 应收应付 stays in the 个人汇总 sub-tab rather than duplicating a second per-person block above the fold.
5. **`replanHistory` surfaces on 概览 only.** Per-day context is not shown on the itinerary page.
6. **Six style variants are untouched.** The new layout is verified in the default `aviation` style; the other five and dark mode share the same variables but were not screenshot-verified in this phase.
7. **Alternatives entry button is status-aware**: 「换一个」 while an `available` option exists, 「重新选择」 once only `selected` options remain. Panel actions and the agent request behaviour are unchanged.

## Phase 4 Entry Conditions

All satisfied:

- [x] First-level IA frozen at exactly five entries
- [x] Map is an itinerary view, not a module
- [x] AI Copilot is a global capability, not a module
- [x] 概览 inherits and preserves the former 出行 capability
- [x] TravelPack 1.2 fields surfaced in user language (`preferences`, `constraints`, `decisionLog`, `alternatives`, `replanHistory`, `planningMeta`, `tripStatus`)
- [x] Agent bridge contract documented with a copyable fallback
- [x] TravelPack 1.1 degrades gracefully with no errors
- [x] 56 tests pass; privacy audit clean
- [x] Browser acceptance completed at desktop and 390px
- [x] No schema change, no framework migration, no dependency, no motion library

Phase 4 (UI Redesign / "Sunny Travel Journal") may restyle this structure. It must keep the frozen IA, keep 1.1/1.2 compatibility, and keep the copilot free of credentials.

## Do NOT in Phase 4 (carry-over constraints)

- Do not merge this branch to `main` without user confirmation.
- Do not add a sixth first-level tab for map or copilot.
- Do not put model credentials or chain-of-thought into the frontend or TravelPack.
- Do not change TravelPack 1.1 / 1.2 contracts.
