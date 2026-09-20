# 产品 UX 架构 v1（Phase 3）

本文件定义 AI Travel Copilot 网页的**信息架构与交互骨架**。它冻结一级导航、明确地图与 AI Copilot 的归属，并规定 TravelPack 1.2 智能字段如何变成用户能理解、能操作的界面。

视觉系统（配色、字体、动效）不在本文件范围，属于 Phase 4。本文件不改 TravelPack schema；字段契约见 [travelpack-1.2.md](travelpack-1.2.md)。

## 一级信息架构（固定 5 项）

```text
概览 Overview  ·  行程 Itinerary  ·  准备 Prepare  ·  记账 Budget  ·  资料 Materials
```

- 一级导航**始终是 5 项**，新增能力不得通过增加一级 Tab 实现。
- **地图不是一级模块**，它是「行程」内部的第二种视图。
- **AI Copilot 不是一级模块**，它是全局能力（Floating Action Button + Bottom Sheet）。
- 因此产品不是七个底部 Tab。

模块 id 与标签（`assets/frontend-template/ux.mjs` 的 `PRODUCT_MODULES`）：

| id | 标签 | 说明 |
|---|---|---|
| `overview` | 概览 | 聚合首页，继承原「出行」的交通与住宿能力 |
| `itinerary` | 行程 | 逐日列表 + 地图（内部视图切换） |
| `prepare` | 准备 | 待办、行李、日历 |
| `expenses` | 记账 | 账单、个人汇总、结算建议 |
| `materials` | 资料 | 票据、攻略、链接、来源、附件 |

## 概览 Overview

原「出行」一级入口升级为「概览」。**原出行能力全部保留**：交通分段、票面、时间节点、票据、附件、编辑与清空。概览只是把旅行摘要前置，不删除任何既有功能。

信息顺序：

1. **Trip Hero** — `trip.title`、日期、目的地、`days` 数量、同行人数、行程节点数。
2. **状态条** — `tripStatus` 用户文案 + 已锁定安排数量 + 待复核信息数量。
3. **下一项行程** — 从 `itineraryItems` 推断；无法可靠判断时不伪造实时状态。
4. **🔒 已锁定安排** — 消费 `constraints[]`，界面**不出现** Hard Constraint 字样。
5. **交通与住宿摘要** — 最近一段交通、下一次航班、当前或下一家住宿，可进入详情与编辑。
6. **你的旅行偏好** — 消费 `preferences`，轻量 tag 展示。
7. **AI 最近调整** — 消费 `replanHistory[]`。
8. **出行票据与途中交通** — 原出行模块的完整票夹能力。

### tripStatus 文案映射

| 数据值 | 界面文案 |
|---|---|
| `planning` | 正在规划 |
| `confirmed` | 行程已确认 |
| `in-progress` | 旅行进行中 |
| `completed` | 旅程完成 |

界面不得直接显示英文枚举值。

### 待复核信息

使用 `planningMeta.needsRecheckCount`，但必须遵守契约：[travelpack-1.2.md](travelpack-1.2.md) 规定它是**规划快照值**，不是实时派生值。

- 正确：「规划时有 2 项信息待复核」。
- 禁止：「当前实时还有 2 项」。
- 允许额外实时推导（sources 的 `needs-recheck`、`alternatives` 的 `needs-recheck`、`kind = recheck` 且 `status = pending` 的待办），但**只用于说明差异，不写回协议**。

### 「下一项」的诚实规则

`nextItineraryItem(pack, now)`：

- 能匹配当前日期与时间 → 标题「接下来」。
- 无法可靠判断（无实时时钟、当天已结束、日期不匹配）→ 标题「下一项计划」，并提示「暂未接入实时时间，这里按行程顺序显示下一项」。

禁止伪造实时状态。

## 行程 Itinerary

```text
日期导航
↓
[ 行程 ] [ 地图 ]      ← 视图切换，不是一级导航
```

### 行程视图

保留原有：节点卡片、`startTime` / `endTime`、地点、类型、备注、编辑、删除、拖拽把手与 Pointer Events 排序。

新增 TravelPack 1.2 消费能力：

| 能力 | 数据来源 | 界面 |
|---|---|---|
| Constraint Lock | `constraints[]` 中 `status = active` 且 `relatedRefs` 命中该节点 | 卡片头部轻量 🔒；卡片内一句「已锁定安排，AI 调整时不会自动移动。」 |
| Explainable Planning | `decisionLog[]` 的 `relatedRefs` 命中 item / day / place | 「✨ AI 安排理由」+ 短理由 |
| Alternatives | `alternatives[]` 的 `relatedRef` 命中 item 或 place | 入口按钮 → 轻量选择面板（`available` 显示「换一个」，只剩 `selected` 显示「重新选择」） |
| Day-level adjustment | `dayId` | 当日主题旁的「✨ 调整这一天」 |

文案纪律：界面统一使用「AI 安排理由」。**不出现** Decision Log / Reasoning / Chain of Thought 等字样，也不展示内部推理。

### 地图视图

地图是行程内部视图，必须支持：当前选中日期、当天 `itineraryItems`、路线编号、当前选中地点、地点详情。

- List 与 Map **读取同一份 `itineraryItems` 排序**。
- 点击行程卡片 → 地图选中对应地点；点击地图标记 → 行程卡片选中状态同步。
- 两者共用**唯一的** `selectedItineraryItemId`，不写两套独立状态。
- 保留原有绘制地图、网页底图切换、地图能力协商、无坐标降级与超时回退，不改地图供应商架构。

视图切换行为：

- `行程` 视图：桌面显示清单 + 地图两栏（沿用 V4 aviation 基线）；窄屏只显示清单。
- `地图` 视图：只显示地图，占满宽度。

## AI Copilot（全局能力）

入口：全局 Floating Action Button（✨ Travel AI），打开 Bottom Sheet / Drawer。**不是新的一级页面。**

快捷动作：

```text
😴 今天太累了      🌧️ 下雨了          🕙 明天晚一点出发
🍜 加一家餐厅      📷 想找拍照地点     💰 今天想少花一点
```

并提供自由文本输入。打开时建立上下文（模块、选中日期、选中节点、schemaVersion、tripStatus），用户不需要重复解释当前页面。

请求结构与 fallback 见 [agent-bridge.md](agent-bridge.md)。

## 准备 Prepare

保留原 Todo 能力：完成/取消完成、日历、新增、编辑、删除、行李清单。

结构改为按出发前时间阶段组织（由 `dueAt.localDate` 与旅行日期推导，**不新增 schema 字段**）：

| 阶段 | 判定 |
|---|---|
| 出发前 30 天 | 距出发 ≥ 30 天 |
| 出发前 7 天 | 距出发 7–29 天 |
| 出发前一周内 | 距出发 1–6 天 |
| 旅行中 | 日期落在旅行区间内 |
| 旅行后 | 日期晚于结束日 |
| 待排期 | 没有 `dueAt` |

- 行李清单（`kind = packing`）单独成节，保持原有的携带物品视角。
- 待完成 / 已完成 / 下一项三列统计容器保持不变。

## 记账 Budget

核心算法不改：`expenses`、`payerId`、`allocations`、`splitMode`、个人汇总、结算建议。

只增加首页级摘要（全部由现有 `expenses` 推导）：

```text
已花  ·  应收合计  ·  应付合计
```

- 逐人的「个人应摊 / 实际支付 / 应收应付」继续在「个人汇总」子 Tab 展示。
- **不虚构「总预算」字段**：TravelPack 没有总预算结构，界面就不造。

## 资料 Materials

保留机票、酒店、预约、门票、攻略、来源、附件。

增强来源时效的用户表达（由 `sources[].freshness` 推导，不发明状态）：

| 判定 | 文案 |
|---|---|
| `freshness.status = "needs-recheck"` | 建议复核 |
| `status = "current"` 且 `validUntil` 早于今天 | 已过期 |
| `status = "current"` | 当前有效 |
| 其它 | 待复核 |

## TravelPack 1.1 渐进增强

`schemaVersion = "1.1.0"` 时五个模块必须全部正常工作，以下能力自动隐藏或退化，**不得报错**：

| 能力 | 1.1 行为 |
|---|---|
| `preferences` | 不显示偏好区 |
| `constraints[]` | 不显示锁定标记与已锁定安排 |
| `decisionLog[]` | 不显示 AI 安排理由 |
| `alternatives[]` | 不显示「换一个」 |
| `replanHistory[]` | 不显示 AI 最近调整 |
| `planningMeta` | 不显示待复核信息 |
| `tripStatus` | 不显示旅行状态 |

## 视觉边界

本阶段是 UX 架构，不是视觉重构：

- **允许**：新结构所需 CSS、布局调整、Bottom Sheet 基础实现、新导航名称、基础响应式、基础 focus / active / selected 状态。
- **禁止**：全站重新配色、Sunny Travel Journal 最终视觉、大量渐变与玻璃拟态、大型 Hero 动画、GSAP / Lottie / Anime.js / Motion Skill、小狗角色、大规模插画、3D 动效。

六套 `appearance.styleId` 的兼容能力保留，新信息架构必须在所有 style 与明暗模式下可工作。最终视觉留给 Phase 4。

## 技术约束

- 继续使用 vanilla HTML / CSS / JS + ES Modules，不迁移 React / Vue / Next.js / Vite。
- 不新增大型依赖；能原生实现就原生实现。
- 数据映射与上下文组装集中在 `assets/frontend-template/ux.mjs`（纯函数，可测），DOM 渲染留在 `app.mjs`。
