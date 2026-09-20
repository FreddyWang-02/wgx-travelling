# TravelPack 1.2.0 输出约束（1.1 的 additive extension）

TravelPack 1.2.0 不是新协议，而是 [TravelPack 1.1](travelpack-1.1.md) 的**追加式扩展**。

- `protocol` 仍为 `travelpack`。
- `schemaVersion` 为 `"1.2.0"`。
- 1.1 的全部顶层字段、字段名与语义**完全不变**：不删除、不重命名、不改语义。
- 新能力只通过**新增字段**表达。
- `appearance.styleId` 在 Phase 4A 以加法方式新增取值 `storybook`（晴日手账，首页视觉方向）；原六个取值语义不变，1.1 与 1.2 数据继续按原规则校验。取值全集见 `protocol.mjs` 的 `supportedStyleIds`。
- 1.1 文档继续作为 legacy compatibility 契约存在；**字段细节以本文件为准，1.1 通用校验规则不在此重复抄写**。

```text
protocol = "travelpack"
schemaVersion = "1.2.0"
appearance
trip
companions[]
days[]
places[]
itineraryItems[]
transportSegments[]
stays[]
tasks[]
expenses[]
materials[]
assets[]
sources[]
preferences          ← 1.2 新增
constraints[]        ← 1.2 新增
planningMeta         ← 1.2 新增
alternatives[]       ← 1.2 新增
decisionLog[]        ← 1.2 新增
replanHistory[]      ← 1.2 新增
tripStatus           ← 1.2 新增
```

## 兼容策略

| schemaVersion | 校验行为 |
|---|---|
| `"1.1.0"` | 按 1.1 规则校验，**不要求** 1.2 新增字段。未知字段被忽略，不报错。 |
| `"1.2.0"` | 先执行全部 1.1 通用校验，再校验 1.2 新增字段。 |
| 其他值 | 校验失败。 |

- 1.2 是 1.1 的超集：通过 1.1 校验的数据，只要补齐 7 个新增字段即可升级为 1.2，无需改动任何旧字段。
- 现有前端即使不消费新增字段，也不得因此崩溃：新增字段必须能被安全忽略。
- 只有 `schemaVersion` 由 Skill 显式写入；升级 1.1 数据为 1.2 属于内容更新，不是升级部署。

## 通用规则

- 新增集合 `constraints[]`、`alternatives[]`、`decisionLog[]`、`replanHistory[]` 的 `id` 与 1.1 集合共享同一 ID 命名空间，跨集合必须唯一。
- 所有引用必须指向 TravelPack 中真实存在的对象；悬空引用视为校验失败。
- 新增结构只保存**用户可理解的结论与依据**，禁止保存 chain-of-thought、隐藏推理、内部 token 日志或模型 scratchpad。
- 新增结构禁止承载任何凭据：`apiKey`、`token`、`secret`、`password`、`cookie`、`authorization` 等键名，以及私钥、`sk-` 前缀密钥、云厂商 SecretId 等取值一律拒绝。
- 未提及的新增字段由调用方自行决定，validator 不为其背书。

## preferences（Soft Preferences）

保存用户软偏好。缺失或未知时使用 `null` 或空数组，**不得把模型推测伪装成用户明确偏好**；推断内容只在 `planningMeta` 或 `notes` 中体现来源状态。

| 字段 | 类型 | 说明 |
|---|---|---|
| `pace` | `"relaxed"` \| `"balanced"` \| `"packed"` \| `null` | 旅行节奏 |
| `interests` | `string[]` | 兴趣主题，**开放词表**（如 `food`、`photography`、`coast`、`shopping`、`cafes`、`culture`），允许未来扩展，不做封闭枚举 |
| `walkingTolerance` | `"low"` \| `"medium"` \| `"high"` \| `null` | 可承受步行量 |
| `crowdTolerance` | `"low"` \| `"medium"` \| `"high"` \| `null` | 对人群拥挤的容忍度 |
| `budgetPreference` | `"economy"` \| `"balanced"` \| `"comfort"` \| `"premium"` \| `null` | 预算倾向 |
| `preferredDayStart` | `HH:MM` \| `null` | 偏好每日开始时间，24 小时制 |
| `preferredDayEnd` | `HH:MM` \| `null` | 偏好每日结束时间，24 小时制 |
| `notes` | `string[]` | 补充说明，例如用户明确表达的例外 |

- `interests` 元素必须是非空字符串；不限定取值。
- `preferredDayStart` 与 `preferredDayEnd` 同时存在时，结束需晚于开始。
- 软偏好可以在冲突时权衡，但权衡必须写入 `decisionLog`。

## constraints[]（Hard Constraints）

保存用户硬约束。**只记录可追溯来源的事实**，不允许写入模型内部推理。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一 ID |
| `kind` | 枚举 | `flight` \| `stay` \| `reservation` \| `event` \| `must_visit` \| `mobility` \| `fixed_schedule` \| `other` |
| `description` | `string` | 非空描述，写清约束内容 |
| `relatedRefs[]` | `{ type, id }[]` | 指向真实对象 |
| `status` | 枚举 | `active` \| `resolved` \| `superseded` |
| `source` | 枚举 | `user` \| `booking` \| `material` \| `external` |
| `startAt` | `YYYY-MM-DD` \| `YYYY-MM-DDTHH:MM` \| `null` | 约束生效时间点，未知为 `null` |
| `endAt` | 同上 | 约束结束时间点，未知为 `null` |

- `relatedRefs` 必须指向真实 ID；没有关联对象时使用空数组。
- `startAt` 与 `endAt` 精度一致时，`endAt` 不得早于 `startAt`。
- Hard Constraint 在规划与重规划中锁定；被变更波及时必须显式告知用户。

## planningMeta（规划元信息）

保存**规划过程的可公开元信息**，不是 chain-of-thought 容器。

| 字段 | 类型 | 说明 |
|---|---|---|
| `mode` | 枚举 | `full-plan` \| `local-replan` \| `update-trip` \| `demo` |
| `generatedAt` | `YYYY-MM-DD` \| `YYYY-MM-DDTHH:MM` | 旅行数据生成时间 |
| `lastPlannedAt` | 同上 \| `null` | 最近一次规划或重规划时间 |
| `overallConfidence` | `number` ∈ `[0, 1]` \| `null` | 整体置信度，未知为 `null` |
| `needsRecheckCount` | 非负整数 | **规划快照值**：最近一次规划时的待复核数量（见下） |

禁止在 `planningMeta` 中保存 chain-of-thought、隐藏推理、内部 token 日志或模型 scratchpad；只保存用户可理解、产品需要的元信息。

### needsRecheckCount 语义（快照值，不是实时派生值）

`needsRecheckCount` 是**最近一次 full-plan / local-replan 时生成的"规划快照值"**，不是实时派生值。

- 它表示 `generatedAt` / `lastPlannedAt` 对应时刻的待复核数量。
- 运行期间如果 `sources`、`alternatives`、`tasks` 等数据状态发生变化（例如某条来源由 `needs-recheck` 变为 `current`，或新增了一条待复核备选），该字段**不会自动同步**。
- 前端或 Agent 若需要"当前实时数量"，必须**重新计算**（例如实时统计 `sources[].freshness.status = "needs-recheck"`、`tasks[].status = "pending"` 且 `kind = "recheck"`、`alternatives[].status = "needs-recheck"` 的条目），**不能假设 `needsRecheckCount` 永远实时同步**。
- 因此 validator 只保证它是非负整数，**不保证它与当前数据一致**。字段名、类型与 validator 行为均不因此改变。

## alternatives[]（候选替代方案）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一 ID |
| `relatedRef` | `{ type, id }` | 被替代或被对比对象的引用 |
| `kind` | 枚举 | `place` \| `itinerary` \| `transport` \| `stay` \| `other` |
| `title` | `string` | 非空标题 |
| `reason` | `string` | 不超过 280 字符的用户可理解短理由 |
| `status` | 枚举 | `available` \| `selected` \| `rejected` \| `needs-recheck` |
| `sourceIds[]` | `string[]` | 必须引用 `sources[]` 中的真实 ID；无来源时使用空数组 |

## decisionLog[]（Explainable Planning）

可解释规划的结构化载体。每条只写**结论与依据**，不写推理过程。

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一 ID |
| `kind` | 枚举 | `day_clustering` \| `constraint_protection` \| `preference_tradeoff` \| `weather_adaptation` \| `transport_optimization` \| `schedule_adjustment` \| `other` |
| `relatedRefs[]` | `{ type, id }[]` | 指向真实对象 |
| `reason` | `string` | 不超过 280 字符，简短、用户可理解 |
| `createdAt` | `YYYY-MM-DD` \| `YYYY-MM-DDTHH:MM` | 决策记录时间 |

正确示例：

```text
浅草与上野安排在同一天，可减少跨区移动。
```

错误用法：把模型完整推理过程、候选淘汰过程或内部状态写入 `reason`。

## replanHistory[]（Dynamic Replanning）

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `string` | 唯一 ID |
| `trigger` | 枚举 | `rain` \| `tired` \| `late_start` \| `closure` \| `add_place` \| `remove_place` \| `hotel_change` \| `user_request` \| `other` |
| `createdAt` | `YYYY-MM-DD` \| `YYYY-MM-DDTHH:MM` | 重规划发生时间 |
| `status` | 枚举 | `proposed` \| `applied` \| `cancelled` |
| `affectedDayIds[]` | `string[]` | 必须引用真实 `days[]` |
| `affectedRefs[]` | `{ type, id }[]` | 受影响对象引用，必须存在 |
| `preservedRefs[]` | `{ type, id }[]` | 明确保留的对象引用，必须存在 |
| `summary` | `string` | 不超过 280 字符的用户可理解修改摘要 |

- 被删除对象的 ID 已不存在，不得写入 `affectedRefs`；改为引用仍然存在的 `place` 或 `day`。
- `summary` 只描述触发、受影响、保留与待核验结果，不保存内部 reasoning trace。

## tripStatus

旅行整体状态，取值限定 `planning` \| `confirmed` \| `in-progress` \| `completed`。

- 仅描述旅行整体阶段，**不与** `transportSegments[].status`、`stays[].status` 混用。
- 早期规划稿中出现的 `draft` 取值已由 `planning` 取代。

## 引用完整性

新增字段可用的引用类型（`{ type, id }` 中的 `type`）：

```text
companion · day · place · itineraryItem · transportSegment · stay
task · expense · material · asset · source · constraint · alternative
```

- `alternatives[].sourceIds[]` 与 `replanHistory[].affectedDayIds[]` 使用直接 ID 数组，分别指向 `sources[]` 与 `days[]`。
- 任一层级出现悬空引用即校验失败。

## 安全规则

- 动态事实（航班动态、开放时间、预约状态）仍遵循 `sources[]` 的 `freshness` 规则，不由新字段替代。
- 凭据、Key、Cookie、Token、证件号与支付信息不得进入新增结构。
- 敏感票据继续使用 1.1 的 `materials[].sensitive = true`，新字段不改变该约定。
- 新字段只保存用户可理解的结论；模型隐藏推理不保存、不展示、不写入 TravelPack。

## 校验

```bash
node scripts/validate_travelpack.mjs <travelpack.json>
```

validator 同时支持 `1.1.0` 与 `1.2.0`；样例见 `assets/frontend-template/travelpack.sample.json`（1.1 regression）与 `assets/frontend-template/travelpack.sample.1.2.json`（1.2）。
