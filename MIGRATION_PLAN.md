# Migration Plan — AI Travel Copilot

Generated: 2026-09-20 (Phase 0 complete)

> This repository is the preserved foundation of [Hks-Travel-Skill](https://github.com/HANKSEN/Hks-Travel-Skill) (MIT License).  
> Original work by HANKSEN. Evolving into AI Travel Copilot.

---

## Current State

Phase 0 complete. The repository is a faithful, validated copy of the original project:
- All files preserved (SKILL.md, references/, scripts/, assets/, tests/, docs/)
- All 4 tests passing
- Privacy audit clean
- MIT license and original attribution intact
- Ready for phased evolution

---

## Phase 1 — Skill Intelligence

**Goal:** Upgrade the agent brain without touching the frontend or schema.

### Changes

| Item | Description |
|---|---|
| New SKILL.md | Rewrite as `ai-travel-copilot` — add `new-trip`, `update-trip`, `local-replan`, `demo` sub-actions |
| Hard constraints | Define constraint grammar: dates, budgets, accessibility, dietary, mobility, visa |
| Soft preferences | Define preference scoring: cuisine type, pace, crowd tolerance, photo style |
| Constraint-aware planning | Planner must reject infeasible plans early; surface conflicts to user |
| Explainable planning | Each itinerary decision gets a `reason` field; violations get `violation` explanations |
| Dynamic replanning | `local-replan` accepts partial trip context, produces revised itinerary, preserves confirmed segments |
| Demo prompt library | Pre-built prompts for interview/demo: "Show me a 3-day Tokyo trip with ramen focus" |

### Files to modify
- `hks-travel-skill/SKILL.md` (rewrite, keep backward compat notes)
- New `references/constraints.md`
- New `references/preferences.md`
- New `references/explainable-planning.md`

### Files NOT to touch
- `assets/frontend-template/*`
- `hks-travel-skill/references/travelpack-1.1.md`
- `hks-travel-skill/scripts/*`
- `tests/`

---

## Phase 2 — TravelPack 1.2

**Goal:** Extend the data schema without breaking 1.1 consumers.

### New top-level fields ( additive, non-breaking )

```jsonc
{
  "preferences": { /* soft preferences: cuisine, pace, crowd-tolerance, etc. */ },
  "constraints": { /* hard constraints: budget max, date range, accessibility, visa */ },
  "planningMeta": { /* planner version, reasoning trace summary */ },
  "alternatives": [ /* parallel itinerary options with trade-off notes */ ],
  "decisionLog": [ /* why each segment was chosen, what was rejected */ ],
  "replanHistory": [ /* previous plan revisions with timestamps */ ],
  "tripStatus": "draft" | "confirmed" | "in-progress" | "completed"
}
```

### Rules
- All 1.1 fields remain unchanged (no rename, no remove)
- 1.1 schema validation passes on 1.2 data (1.2 is a superset)
- Add `validate_travelpack.mjs` checks for new fields
- Update `product-contract.md` with new fields

---

## Phase 3 — Product UX

**Goal:** Evolve the five-module experience into a richer info architecture.

### Target structure

| Module | Current | Enhanced |
|---|---|---|
| 出行 | Transport tickets | + Flight status, gate alerts, real-time updates |
| 行程 | Day list + map | + Timeline view, weather overlay, time estimation |
| 准备 | Task checklist | + Document scanner, packing AI, pre-trip checklist |
| 记账 | Expense ledger | + Multi-currency, receipt OCR, group settlement |
| 资料 | Links & guides | + Embedded articles, offline cache, AR previews |

### New module
| Module | Purpose |
|---|---|
| **AI Copilot** | Chat interface for planning, replanning, Q&A about the trip |

### Design principles
- Preserve existing data structures (TravelPack 1.1/1.2 fields unchanged)
- Progressive enhancement: new UI reads same JSON, adds new rendering layers
- Mobile-first responsive design
- No breaking changes to edit/save API

---

## Phase 4 — UI Redesign

### Design Direction: "Sunny Travel Journal"

**Keywords:** bright · warm · fresh · friendly · scenic · playful · mobile-first

**Explicitly NOT:**
- ❌ Dark cyberpunk
- ❌ Heavy neon
- ❌ Overly technical AI dashboard
- ❌ Excessive glassmorphism

### Reference sources (Phase 4+, not Phase 0)
- [21st.dev](https://21st.dev) — component patterns
- [Aceternity UI](https://ui.aceternity.com) — motion patterns
- [Magic UI](https://magicui.design) — card/layouts
- [Uiverse](https://uiverse.io) — interactive elements
- [MotionSites](https://motion sites) — scroll animations
- [源铺](https://yuanchupu.com) — Chinese design inspiration
- [DrawKit](https://drawkit.io) — illustration style
- [unDraw](https://undraw.co) — flat illustrations
- [Icons8 Ouch](https://icons8.com/illustrations) — character style

### Deliverables
- Style guide (color palette, typography, spacing system)
- Component library (cards, buttons, inputs, nav, map wrapper)
- Six theme variants matching existing `styleId` values
- Dark mode parity for all six themes

---

## Phase 5 — Motion System

*(Forbidden in Phase 0. Documented here for future reference.)*

### Tools (Phase 5+)
- LottieFiles motion-design-skill
- GSAP (scroll trigger, stagger, FLIP)
- Lightweight SVG character animation (travel companion)

### Target motions
- Scroll reveal (staggered section entry)
- FLIP list reordering (itinerary drag drop feedback)
- Bottom sheet transitions
- Map route animation (pulsing dot along path)
- Success micro-animation (checkmark, confetti-lite)
- Travel companion character idle/bounce states

---

## Phase 6 — Demo Mode

*(Forbidden in Phase 0. Documented here for future reference.)*

### Requirements
- Zero API key required
- Self-contained demo TravelPack (realistic but synthetic)
- One-click trip generation from preset templates
- All five modules functional with demo data
- "How it works" walkthrough overlay

### Use cases
- Interview/portfolio showcase
- Conference demo
- New user onboarding
- Recruiter quick-experience link

---

## Phase 7 — Public GitHub Skill

*(Forbidden in Phase 0. Documented here for future reference.)*

### README structure
1. **Hero**: tagline + 30-second pitch
2. **Try in 3 minutes**: single-command install + first prompt
3. **Live Demo**: hosted link to example trip
4. **Architecture**: diagram of Skill → Agent → Frontend → Deploy
5. **Install Skill**: copy-paste instructions for Codex, Claude, WorkBuddy
6. **Demo Prompts**: 5 copy-paste prompts for interview scenarios
7. **For Recruiters**: what this demonstrates (product thinking, full-stack, deployment)
8. **For Technical Reviewers**: architecture deep-dive, TravelPack schema, upgrade story

---

## Current Technical Debt (Phase 0 observations)

| Debt | Impact | Phase to address |
|---|---|---|
| Single `app.mjs` file (~2000 LOC) | Hard to extend, hard to test | Phase 3 or 4 |
| No linting/type checking | Silent bugs in JS | Phase 1 |
| Cloudflare-only backend template | Limits deployment options | Phase 3 |
| 4 tests total | Low coverage | Phase 1 |
| No CI pipeline beyond GitHub Actions CI | Manual deployment risk | Phase 3 |

All debt documented, nothing addressed in Phase 0.

---

## Phase Entry Criteria

To proceed from Phase 0 to Phase 1:
- [x] Repository cloned and validated
- [x] All tests pass
- [x] Privacy audit clean
- [x] License and attribution preserved
- [x] FOUNDATION_AUDIT.md written
- [x] Migration plan documented
- [ ] User confirms readiness to begin Phase 1
