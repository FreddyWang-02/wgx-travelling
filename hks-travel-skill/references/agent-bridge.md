# Agent Bridge：网页与 Agent 之间的调整请求契约

本文件定义 TravelPack 网页端把用户的调整诉求交给 Agent 的**可选**能力。它是 [五模块产品交付契约](product-contract.md) 与 [产品 UX 架构](product-ux-v1.md) 的配套实现约定。

## 安全底线（不可协商）

浏览器前端**不得**：

- 保存或读取模型 API Key、Token、Cookie 或任何 Secret；
- 硬编码模型接口地址或供应商 SDK；
- 默认绕过 Skill 自己调用模型；
- 在 TravelPack、日志、导出文件或请求体里写入凭据。

网页只负责**收集上下文 + 生成结构化请求**，真正执行规划的是宿主 Agent 或用户手动转交的 Skill Agent。

## 桥接能力

宿主可选实现：

```js
window.TRAVEL_HOST_ADAPTER.requestAgentUpdate?.(request)
```

- 存在且为函数时：网页显示「交给当前 Agent 处理」，点击后把请求交给宿主。
- 不存在时：网页显示「复制调整请求」，并明确告知用户**网页不会自动重规划**，需要把请求交给安装了 AI Travel Copilot Skill 的 Agent。

检测方式（`assets/frontend-template/ux.mjs`）：

```js
hasAgentBridge(adapter) // typeof adapter?.requestAgentUpdate === "function"
```

## 请求结构

```jsonc
{
  "action": "replan-day" | "add-place" | "swap-item" | "ask" | "freeform",
  "tripId": "trip-beijing-2026",
  "dayId": "day-23" | null,
  "itineraryItemId": "item-badaling" | null,
  "text": "今天比较累，请减少步行和跨区移动。",
  "context": {
    "module": "itinerary",          // 当前一级模块 id
    "schemaVersion": "1.2.0",        // 或 "1.1.0"
    "tripStatus": "in-progress",     // 1.1 数据为 null
    "selectedDayId": "day-23",
    "selectedItineraryItemId": "item-badaling"
  }
}
```

设计约束：

- **扁平且稳定**：前 6 个键是一等字段，新增能力只放在 `context` 内，不改变既有键。
- **只带上下文，不带凭据**：`context` 只包含页面位置与旅行标识。
- **可空**：`dayId` / `itineraryItemId` 在用户没有选中具体日期或节点时为 `null`，不允许伪造。
- **不携带 chain-of-thought**：`text` 是用户诉求原文或快捷动作文案，不是模型推理。

构造与序列化由 `ux.mjs` 负责，网页不自行拼装：

```js
buildAgentRequest({ action, pack, text, module, dayId, itineraryItemId })
```

## 页面上下文如何产生

AI Copilot 打开时建立 context object，用户不需要重复解释当前页面：

| 来源 | 写入字段 |
|---|---|
| 当前一级模块 | `context.module` |
| 行程页选中的日期 | `dayId` / `context.selectedDayId` |
| 行程页选中的节点（列表或地图） | `itineraryItemId` / `context.selectedItineraryItemId` |
| TravelPack 版本 | `context.schemaVersion` |
| 旅行整体状态 | `context.tripStatus` |

- 在 Day 3 打开 Copilot 说「今天太累了」，请求必须带 Day 3 的 `dayId`。
- 在某个地点点「换一个」，请求必须带该 `itineraryItemId` 与对应 `dayId`。

## Fallback：可复制的 Skill 请求

宿主没有 `requestAgentUpdate()` 时，网页必须仍可用：

1. 生成结构化文本（`formatAgentRequestText`）；
2. 提供「复制调整请求」按钮；
3. 明确说明：这段请求可交给安装了 AI Travel Copilot Skill 的 Agent。

文本形如：

```text
【AI Travel Copilot 调整请求】
- 旅行：北京，慢慢走
- 日期：长城一日（2026-09-23）
- 当前节点：八达岭长城
- 诉求：今天比较累，请减少步行和跨区移动。

请使用 AI Travel Copilot Skill 处理：
1. 保留所有已锁定安排（constraints 中 status = active 的条目）。
2. 只重规划最小受影响范围，其余日程保持不变。
3. 输出完整 TravelPack，并把本次调整写入 replanHistory。
```

**禁止暗示网页本身已经完成 AI 重规划。** 复制成功只表示请求已生成。

## 快捷动作

`COPILOT_QUICK_ACTIONS` 提供上下文感知的快捷入口：

```text
😴 今天太累了      🌧️ 下雨了          🕙 明天晚一点出发
🍜 加一家餐厅      📷 想找拍照地点     💰 今天想少花一点
```

每个动作映射到 `action` 与默认 `text`，用户可继续编辑文本。

## 网页不做什么

- 不静默修改旅行数据。选择替代方案只生成**变更请求**，不改写 TravelPack。
- 不在前端执行重规划。重规划由 Skill 按 [动态重规划](dynamic-replanning.md) 完成。
- 不写回 `replanHistory`。该字段由 Skill 在应用调整时写入。

## 与本阶段其它部分的关系

- 一级信息架构见 [product-ux-v1.md](product-ux-v1.md)。
- 字段契约见 [travelpack-1.2.md](travelpack-1.2.md)。
- 宿主适配器其它能力（`load` / `save` / `prepareEdit` / 附件 / 地图）见 [宿主能力发现与部署路由](deployment-routing.md)。
