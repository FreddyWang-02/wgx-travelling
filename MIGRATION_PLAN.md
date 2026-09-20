# Migration Plan — AI Travel Copilot

Generated: 2026-09-20 (Phase 0 complete)

> This repository is the preserved foundation of [Hks-Travel-Skill](https://github.com/HANKSEN/Hks-Travel-Skill) (MIT License).  
> Original work by HANKSEN. Evolving into AI Travel Copilot.

---

## Phase Status（Phase 2 完成后回填）

| Phase | 内容 | 状态 |
|---|---|---|
| Phase 0 | Foundation（原样导入并验证） | implemented |
| Phase 1 | Skill Intelligence | implemented（已合并 main） |
| Phase 2 | TravelPack 1.2 数据契约 | **implemented / completed**（分支 `phase2-travelpack-1.2`，未合并 main） |
| Phase 3 | Product UX | not started |

**本文档的性质**：以下是 Phase 0 时代的历史设计稿，**不是现行权威文档**。各 Phase 的实际实现以代码、`PHASE_N_HANDOFF.md`、`报告/phaseN-report.md` 与 `hks-travel-skill/references/` 下的契约文档为准。

**不要重复实现**：Phase 0 / 1 / 2 均已完成，后续 Agent 不要按本文档重新实现这些内容。

**TravelPack 1.2 的现行权威文档**：`hks-travel-skill/references/travelpack-1.2.md`。本文档与它冲突时，**一律以 `travelpack-1.2.md` 为准**。

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

**Status: implemented / completed.** 已在分支 `phase2-travelpack-1.2` 交付（`13d87e1` schema、`31359cb` tests、`a98b04f` / `b72de90` docs）。**不要重新实现。**

### Phase 2 Final Decision / Superseded

本节是 Phase 2 实现完成后的回填说明，用于纠正下方 Phase 0 草案中已经过期的设计。**下方草案原文保留不改写，但以下决定优先级更高。**

| 事项 | Phase 0 草案 | Phase 2 最终决定 |
|---|---|---|
| Hard Constraints 容器 | `constraints` **object** | **`constraints[]` 数组**。每项含 `id`、`kind`、`description`、`relatedRefs[]`、`status`、`source`、`startAt`、`endAt` |
| 旅行整体状态取值 | `"draft"` 等 | **`planning` / `confirmed` / `in-progress` / `completed`** |
| `draft` | 草案取值 | **已废弃（superseded）**，由 `planning` 替代 |
| `planningMeta` 用途 | "reasoning trace summary" | 只保存可公开的规划元信息（`mode`、时间戳、`overallConfidence`、`needsRecheckCount`）。**禁止保存 chain-of-thought、隐藏推理或内部推理日志** |
| 新增字段校验 | 草案未定义 | validator 同时支持 `1.1.0` 与 `1.2.0`；完整规则见 `hks-travel-skill/references/travelpack-1.2.md` |
| 字段文档位置 | 草案写明改 `product-contract.md` | 字段文档统一写入 `hks-travel-skill/references/travelpack-1.2.md`（见下方 Rules 回填说明） |

**权威文档**：TravelPack 1.2 的现行权威文档为 `hks-travel-skill/references/travelpack-1.2.md`。**本文档（MIGRATION_PLAN.md）与它冲突时，一律以 `travelpack-1.2.md` 为准。**

### New top-level fields ( additive, non-breaking )

```jsonc
{
  "preferences": { /* soft preferences: cuisine, pace, crowd-tolerance, etc. */ },
  "constraints": { /* hard constraints: budget max, date range, accessibility, visa */ }, // SUPERSEDED: 最终为 constraints[] 数组，见上方 Final Decision
  "planningMeta": { /* planner version, reasoning trace summary */ }, // SUPERSEDED: 不保存 reasoning trace，只保留可公开元信息
  "alternatives": [ /* parallel itinerary options with trade-off notes */ ],
  "decisionLog": [ /* why each segment was chosen, what was rejected */ ],
  "replanHistory": [ /* previous plan revisions with timestamps */ ],
  "tripStatus": "draft" | "confirmed" | "in-progress" | "completed" // SUPERSEDED: draft 已废弃，由 planning 替代
}
```

### Rules
- All 1.1 fields remain unchanged (no rename, no remove)
- 1.1 schema validation passes on 1.2 data (1.2 is a superset)
- Add `validate_travelpack.mjs` checks for new fields
- Update `product-contract.md` with new fields
  - **回填（Phase 2 最终决定）**：未改 `product-contract.md`。该文档描述五模块产品面；TravelPack 1.2 的字段文档统一写入 `hks-travel-skill/references/travelpack-1.2.md`。

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

> **回填说明（Phase 2 完成后）**：以上是 Phase 0 → Phase 1 的进入条件，**Phase 1 与 Phase 2 均已完成**，最后一项的历史状态不再代表当前进度。Phase 2 的实际状态、validator 兼容策略与 Phase 3 进入条件见 `PHASE_2_HANDOFF.md` 与 `报告/phase2-report.md`。
