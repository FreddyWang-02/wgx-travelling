# Phase 1 Handoff — Skill Intelligence

Branch: `phase1-skill-intelligence` (based on `main` @ Phase 0)
Status: complete, awaiting user confirmation before Phase 2.

---

## What Phase 1 Delivered

The Skill's core workflow was upgraded to the AI Travel Copilot pipeline:

```
User Request
→ Intent Extraction
→ Preference Extraction
→ Constraint Extraction
→ Missing Information Check
→ Research
→ Candidate Pool
→ Constraint-aware Planning
→ Explainable Decisions
→ User Review
→ TravelPack
→ Dynamic Replanning
```

No frontend, UI, schema, or deployment changes. TravelPack remains `schemaVersion = "1.1.0"`.

## Files Modified

- `hks-travel-skill/SKILL.md` — rewritten workflow:
  - New **Operating Modes** section: `new-trip`, `update-trip`, `local-replan`, `demo`, `deployment-upgrade`.
  - Workflow now runs intent → preference → constraint → missing-info → research → candidate pool → constraint-aware planning → explainable decisions → user review.
  - New **Dynamic Replanning** section (local-replan default, trigger list, flow, preservation).
  - Deployment & upgrade sections preserved verbatim (upgrade flow, scripts, boundaries).
  - Boundaries: added planning-reason rule (no chain-of-thought storage/display).

## Files Added

- `hks-travel-skill/references/planning-intelligence.md`
  - Hard vs Soft constraints with categories and rules.
  - Research → Candidate Pool pipeline (Candidate Places → Geographic Clustering → Time Feasibility → Constraint Check → Preference Matching → Final Itinerary).
  - Constraint-aware planning priority order.
  - Explainable planning: short user-facing planning reasons, CoT prohibited.
  - Missing information checklist.
- `hks-travel-skill/references/dynamic-replanning.md`
  - `full-plan` vs `local-replan` distinction, default is local-replan.
  - Trigger table (rain, tiredness, late start, closure, add/remove place, hotel change).
  - 9-step local-replan flow, impacted-scope judgment table, preservation rules, change-summary format.
- `tests/skill-intelligence.test.mjs` — 6 new tests verifying:
  - Operating modes exist in SKILL.md.
  - Pipeline stages (extraction, candidate pool, planning priorities, explainability) exist.
  - Hard/soft constraint lists and rules in planning-intelligence.md.
  - local-replan triggers, flow steps, preservation rules in dynamic-replanning.md.
  - New reference files exist and are linked from SKILL.md.
  - Deployment/upgrade references and scripts still referenced (no regression).

## Key Behavior Decisions

1. **Hard Constraints are locked.** Flights, hotel check-in/out, confirmed restaurant bookings, tickets, must-visit places, mobility limits, and user-declared fixed items cannot be silently modified; conflicts surface to the user.
2. **Soft Preferences guide optimization** (pace, crowd tolerance, budget lean, photo/cafés, walking distance) and may be traded off, with explainable trade-offs.
3. **Research feeds a candidate pool**, never the final itinerary directly.
4. **Planning reasons are short and user-facing**; stored in `itineraryItems[].notes` / materials — no schema change. `decisionLog` is a TravelPack 1.2 concern (Phase 2).
5. **local-replan is the default** for mid-trip changes; only the minimum impacted scope is replanned; unaffected IDs preserved; change summary shown before applying.
6. **deployment-upgrade mode** keeps the existing upgrade protocol untouched.

## Baseline Verification

- Before changes: `npm run check` → 4 pass / 0 fail (audit clean, sample validates, upgrade recognition intact).
- After changes: `npm run check` → 10 pass / 0 fail; audit `"safe": true`, 70 files scanned.

## Phase 2 Entry Conditions

All satisfied:

- [x] Operating modes defined in SKILL.md
- [x] Hard/soft constraint grammar defined
- [x] Candidate pool pipeline defined
- [x] Constraint-aware planning priorities defined
- [x] Explainable planning rule defined
- [x] local-replan default behavior defined
- [x] New reference files exist and are tested
- [x] TravelPack 1.1 sample still validates
- [x] Privacy audit still clean
- [x] All tests pass (10/10)
- [x] No frontend/UI/schema/deployment changes

Phase 2 (TravelPack 1.2) may add `preferences`, `constraints`, `planningMeta`, `alternatives`, `decisionLog`, `replanHistory`, `tripStatus` as additive fields without breaking 1.1.

## Do NOT in Phase 2 (carry-over constraints)

- Do not merge to main without user confirmation.
- Phase 1 scope is closed: no UI/frontend work in this branch.
- Keep `schemaVersion = "1.1.0"` in Phase 1 outputs; bump only in Phase 2.
