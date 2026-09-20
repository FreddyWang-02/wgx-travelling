# 动态重规划：local-replan 与 full-plan 规则

本文件定义 [SKILL 工作流](../SKILL.md) 的动态重规划阶段。重规划输出遵循 [TravelPack 1.2](travelpack-1.2.md) 与 [规划智能规则](planning-intelligence.md)；1.1 契约见 [TravelPack 1.1](travelpack-1.1.md)。字段细节以 [travelpack-1.2.md](travelpack-1.2.md) 为准，本文件不重复定义 schema。

local-replan 输出必须更新以下结构：

- `replanHistory[]`：**必填**，每次 local-replan 追加一条记录（`trigger`、`createdAt`、`status`、`affectedDayIds[]`、`affectedRefs[]`、`preservedRefs[]`、`summary`）。
- `decisionLog[]`：必要时要追加本次重规划的简短结论（如天气改道、偏好取舍）。
- `alternatives[]`：采用或放弃替代方案时更新对应条目 `status`。
- `planningMeta.lastPlannedAt`：记录最近一次重规划时间；`planningMeta.mode` 使用 `local-replan`。

本阶段只改数据契约，**不修改前端**：新增字段由前端安全忽略，重规划不要求 UI 同步改造。

## 模式区分

- **full-plan**：用户要求新旅行或推翻整份行程时，走完整的"意图提取 → 偏好提取 → 候选池 → 约束感知规划"流程。
- **local-replan**：用户旅行中或已规划行程出现变化时，**默认**使用 local-replan。

以下触发条件默认进入 local-replan，除非用户明确要求推翻整份计划：

- 下雨。
- 太累。
- 起晚。
- 景点闭馆。
- 临时增加地点。
- 临时删除地点。
- 酒店改变。

## local-replan 流程

1. **识别 Trigger**：记录触发类型、影响的日期范围与用户原话。
2. **找出受影响日期/地点**：从变更点向前向后扩展，直到行程恢复"未受波及"为止；扩展必须基于地理与时间依赖，禁止无依据扩大。
3. **锁定 Hard Constraints**：按 [规划智能](planning-intelligence.md) 的 Hard Constraint 定义锁定全部不可修改条目；变更范围触及 Hard Constraint 时必须显式告知用户，禁止静默改动。
4. **保留未受影响 itinerary IDs**：未受影响的节点保留原 `id`、`dayId`、`placeId` 与时间，禁止顺带"优化"。
5. **必要时研究替代地点**：仅当删除或受阻的节点需要替代物时，按 [信息源与证据规则](source-matrix.md) 研究同区域候选，走候选池检查流程；替代候选必须通过时间可行性与约束检查。
6. **只重新规划最小受影响范围**：变更后的逐日草案只包含被修改的日期与节点；其余日期原样保留。
7. **Constraint Check**：重规划结果必须通过全部 Hard Constraint；与 Soft Preference 的冲突在变更摘要中说明取舍理由。
8. **向用户展示修改摘要**：摘要只包含触发原因、受影响日期、被修改的节点、被保留的节点、未解决的待核验项。禁止把整份行程重新贴给用户。
9. **用户确认后应用**：确认后输出完整 TravelPack（保留全部稳定 ID，按 [SKILL.md 更新现有旅行](../SKILL.md) 规则处理增删）。用户未确认前保持原行程不变。同时在 `replanHistory[]` 记录本次重规划：已应用使用 `status = "applied"`，仅提出建议使用 `proposed`，用户放弃使用 `cancelled`。

## 受影响范围判定

| 触发 | 默认受影响范围 |
|---|---|
| 下雨 | 受影响天的户外节点与次日的移动衔接 |
| 太累 | 当日剩余节点与次日早间安排 |
| 起晚 | 当日早间节点顺序与时间 |
| 景点闭馆 | 该节点所在天，替代物在同天或相邻区域 |
| 临时增加地点 | 插入点的所在天，必要时相邻天 |
| 临时删除地点 | 删除点所在天，保留前后节点衔接 |
| 酒店改变 | 入住/退房日的时间窗口，与住宿绑定的交通 |

扩展判定：变更节点与 Hard Constraint 或同日其他节点存在时间衔接时，向前向后各扩展一节，直到衔接恢复可行。

## Preservation Rules（保留规则）

- 未受影响的 `itineraryItems`、`stays`、`transportSegments`、`tasks`、`expenses`、`materials` 原样保留。
- 用户笔记、已完成待办、上传资料不进入重规划范围。
- 被修改节点保留原 `id`；被删除节点从集合移除；新增节点使用新 `id`。
- 替代候选优先与节点原区域相邻，减少跨区移动；无合适替代时该节点保留为"待确认"状态，禁止虚构替代。

## 修改摘要格式

每个 local-replan 输出一个简短变更摘要，包含：

- 触发：一行说明触发类型与时间。
- 受影响：被修改的日期与节点列表。
- 保留：未受影响的日期与节点数量。
- 待核验：时间、开放状态等未确认项。
- 待确认：需要用户决定的取舍项。

禁止在摘要中展示推理日志、候选淘汰过程或模型内部状态；只保留用户可理解的结论（规则同 [规划智能：可解释规划](planning-intelligence.md)）。

摘要与 `replanHistory[].summary` 内容一致，并遵循以下映射：

| 摘要段落 | 结构化字段 |
|---|---|
| 触发 | `replanHistory[].trigger`、`createdAt` |
| 受影响 | `replanHistory[].affectedDayIds[]`、`affectedRefs[]` |
| 保留 | `replanHistory[].preservedRefs[]` |
| 待核验 | `sources[]` freshness 与待办项 |
| 待确认 | `replanHistory[].status = "proposed"` |

被删除对象的 ID 已不存在，不得写入 `affectedRefs[]`；改为引用仍存在的 `place` 或 `day`。
