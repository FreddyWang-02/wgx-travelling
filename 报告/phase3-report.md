# AI Travel Copilot — Phase 3 完成报告（Product UX & Interaction Architecture）

> 生成时间：2026-09-20 21:10
> 仓库：[FreddyWang-02/wgx-travelling](https://github.com/FreddyWang-02/wgx-travelling)
> 分支：`phase3-product-ux`
> 主 Commit：`d14ee59` — `feat: redesign travel product interaction architecture`
> 文档 Commit：`d58a396` — `docs: define AI Travel Copilot product UX`
> 测试 Commit：`fdbbb6b` — `test: cover Phase 3 product interaction`
> 前置：Phase 0 / 1 / 2 已完成并合并 main（Phase 3 基线 30 pass / 0 fail）

---

## 一、总体结论

**Phase 3 全部完成并通过验收。**

本阶段目标不是视觉美化，而是把 TravelPack 1.2 的智能数据变成用户能理解、能操作的旅行产品体验。

- 测试：**56 pass / 0 fail**（Phase 3 基线为 30 pass / 0 fail）
- 隐私审计：`{"safe": true, "filesScanned": 84}`
- 基线确认：改动前 `npm run check` = 30 pass / 0 fail，audit safe（78 files）——**基线通过后才开始开发**
- 浏览器验收：桌面 1440×900 + 移动端 390×844，全部模块通过，无页面级横向溢出
- 未改 TravelPack schema；未迁框架；未新增依赖；未引入动效库
- 分支已 push，**未合并 main**
- 报告与交接文档已生成；**未进入 Phase 4**

---

## 二、最终一级信息架构（IA）

```text
概览 Overview  ·  行程 Itinerary  ·  准备 Prepare  ·  记账 Budget  ·  资料 Materials

行程 Itinerary
├─ [ 行程 ]  List
└─ [ 地图 ]  Map

✨ Travel AI（全局能力：浮动入口 + Bottom Sheet）
```

### 为什么仍然是 5 个一级模块

| 诉求 | 处理方式 | 结果 |
|---|---|---|
| 地图需要更强的存在感 | 作为「行程」内部视图 + 视图切换 | 不新增一级 Tab |
| AI Copilot 需要随时可达 | 全局浮动入口 + Bottom Sheet | 不新增一级 Tab |
| 新增能力需要入口 | 模块内入口（如「添加交通」「添加地点」）或全局能力 | 不新增一级 Tab |

因为地图与 Copilot 都不挂一级导航，产品**始终是 5 个底部 Tab，而不是 7 个**。一级导航数量被测试固定：`data-tab` 恰好等于 `PRODUCT_MODULES` 的 5 个 id，且不含 `map` / `copilot`。

---

## 三、概览如何替代原「出行」入口

**改名 + 升级，不是替换。** 原「出行」的全部能力在概览中原样保留，渲染为最后一节「出行票据与途中交通」：

- 分段 chip（去程 / 途中交通 / 返程）与段内切换
- 航空票夹票面（出发地、抵达地、航班号、登机口、航站楼、座位、舱位、票据类型）
- 出发前时间节点（建议到达、值机截止、登机）
- 票据原件链接、订单链接、附件入口
- 编辑信息 / 清空、中转衔接、备注、复查待办

新增的聚合顺序（自上而下）：

| 区块 | 内容 | 数据来源 |
|---|---|---|
| Trip Hero | 标题、日期、目的地、天数、同行人数、节点数 | `trip`、`days`、`companions`、`itineraryItems` |
| 状态条 | 旅行状态、已锁定安排数量、待复核信息数量 | `tripStatus`、`constraints[]`、`planningMeta` |
| 下一项计划 | 节点、时间、当日主题；不可靠时不伪造实时状态 | `itineraryItems`、`days` |
| 🔒 已锁定安排 | 逐条列出锁定安排与来源 | `constraints[]`（`status = active`） |
| 交通与住宿 | 最近一段交通、当前住宿，可进入编辑 | `transportSegments`、`stays` |
| 你的旅行偏好 | chip + 用户说明 | `preferences` |
| AI 最近调整 | 触发、状态、受影响日期、摘要 | `replanHistory[]` |
| 出行票据与途中交通 | 原出行模块完整能力 | `transportSegments`、`materials` |

### tripStatus 文案映射（界面不出现英文枚举）

| 数据值 | 界面文案 |
|---|---|
| `planning` | 正在规划 |
| `confirmed` | 行程已确认 |
| `in-progress` | 旅行进行中 |
| `completed` | 旅程完成 |

### 待复核信息：遵守快照语义

界面显示「待复核信息 3 项」，并在旁注明「规划时有 3 项信息待复核；按当前资料重算为 1 项。」

- 快照值来自 `planningMeta.needsRecheckCount`，按要求表述为**规划快照**。
- 实时值由当前 `sources` / `alternatives` / `tasks` 现算，**只用于说明差异，不写回协议**。
- 界面和不出现「当前实时还有 N 项」这类表述（有测试断言）。

---

## 四、行程 / 地图如何联动

### 视图切换

`[ 行程 ] [ 地图 ]` 属于「行程」模块内部：

- **行程视图**：桌面保留 V4 aviation 基线的两栏（节点中轴线 + 大幅绘制地图）；窄屏只显示清单。
- **地图视图**：只显示地图，占满宽度。

### 双向联动

进入行程模块时自动挂载地图；列表与地图读取**同一份** `itineraryItems` 排序（按 `dayId` 分组、`order` 升序）。

- 点击行程卡片本体 → 选中该节点 → 地图标记高亮 → 地图详情卡更新。
- 点击地图标记 → 选中该节点 → 对应行程卡片高亮。

两者共用**唯一**的 `selectedItineraryItemId`。历史问题 `selectedMapItemId` 已彻底移除，并有测试断言全文件不再出现。

### 保留的地图能力

绘制地图、可缩放地图（OSM 保底）、地图能力协商、无坐标降级、瓦片失败与超时回退到绘图式路线图——全部未改。地图供应商架构零改动。

---

## 五、AI Copilot 为什么是全局能力

Copilot 是「随时能把当前处境交给 Agent」的入口，属于**跨模块能力**而不是第七个页面：

- 浮动入口 `✨ Travel AI`（桌面显示文案，移动端为图形按钮并抬高到底部导航之上）。
- 打开为 Bottom Sheet（移动端贴底）／底部弹层（桌面），**不是新的一级页面**。
- 打开即建立上下文：当前模块、选中日期、选中节点、`schemaVersion`、`tripStatus`。
- 快捷动作 6 个：😴 今天太累了 / 🌧️ 下雨了 / 🕙 明天晚一点出发 / 🍜 加一家餐厅 / 📷 想找拍照地点 / 💰 今天想少花一点，并提供自由文本输入。

实测上下文示例：

```text
概览 · 旅行进行中
行程 · 长城一日（2026-09-23） · 北京北站 · 旅行进行中
```

用户在 Day 3 点「✨ 调整这一天」说「今天太累了」，请求自动带上 Day 3 的 `dayId`，用户不需要重复解释当前页面。

---

## 六、TravelPack 1.2 字段如何映射到 UX

| 字段 | 界面 | 交互 |
|---|---|---|
| `preferences` | 概览「你的旅行偏好」chip（pace / 步行 / 人群 / 预算 / interests）+ 用户说明 | 点「编辑偏好」进入既有旅程编辑 |
| `constraints[]` | 概览「🔒 已锁定安排」；行程卡片头部轻量 🔒 + 「已锁定安排，AI 调整时不会自动移动。」 | 界面不出现 Hard Constraint 字样 |
| `decisionLog[]` | 「✨ AI 安排理由」+ 短理由 + 类型标签 | 当日理由显示在当日区，节点理由显示在卡片内，不重复 |
| `alternatives[]` | 卡片「换一个」→ 轻量选择面板（title / reason / status / 来源数） | 选择后**生成变更请求**，不改写数据 |
| `replanHistory[]` | 概览「AI 最近调整」（触发文案 / 状态 / 受影响日期 / 摘要） | 用户语言，不展示内部 ID |
| `planningMeta` | 概览状态条的待复核数量（快照措辞） | `overallConfidence` 不面向普通用户 |
| `tripStatus` | 概览状态条「旅行状态」 | 中文文案，不显示枚举 |

字段消费集中在 `assets/frontend-template/ux.mjs`（纯函数，无 DOM，可单测）；DOM 渲染在 `app.mjs`。

### 展示纪律

- 界面不出现 `Hard Constraint` / `Decision Log` / `Reasoning` / `Chain of Thought`（有测试断言）。
- 全部动态文案来自数据，不虚构：无数据时显示空状态或「—」。

---

## 七、Agent Bridge 设计

契约文档：`hks-travel-skill/references/agent-bridge.md`

### 能力与检测

```js
window.TRAVEL_HOST_ADAPTER.requestAgentUpdate?.(request)
hasAgentBridge(adapter) // typeof adapter?.requestAgentUpdate === "function"
```

### 请求结构（扁平、稳定、可扩展）

```jsonc
{
  "action": "replan-day" | "add-place" | "swap-item" | "ask" | "freeform",
  "tripId": "trip-beijing-2026",
  "dayId": "day-23" | null,
  "itineraryItemId": "item-badaling" | null,
  "text": "今天比较累，请减少步行和跨区移动。",
  "context": {
    "module": "itinerary",
    "schemaVersion": "1.2.0",
    "tripStatus": "in-progress",
    "selectedDayId": "day-23",
    "selectedItineraryItemId": "item-badaling"
  }
}
```

- 前 6 个键是一等字段，后续能力只加在 `context` 内，不改既有键。
- `dayId` / `itineraryItemId` 未选中时为 `null`，不伪造。

### 安全底线

前端**不**保存模型 Key、不硬编码模型接口、不写 Secret、不绕过 Skill 直接调用模型。有测试断言前端源码不含 `sk-` / `AKID` / `AIza` / 私钥 / 常见模型端点 / 内联凭据赋值，且请求体不含 token / secret / cookie / authorization 等键。

---

## 八、Fallback 如何工作

没有 `requestAgentUpdate()` 时（静态预览、只读分享、未接桥接的宿主）：

1. 生成结构化文本；
2. 提供「复制调整请求」按钮；
3. 明确提示：**网页不会自动重规划**，请把请求交给安装了 AI Travel Copilot Skill 的 Agent。

实测生成的请求：

```text
【AI Travel Copilot 调整请求】
- 旅行：北京，慢慢走
- 日期：胡同慢行（2026-09-22）
- 当前节点：雍和宫
- 诉求：请把「景山公园」换成「景山登顶可跳过」，理由：体力不足时保留山下步行，取消登顶，不影响次日行程。

请使用 AI Travel Copilot Skill 处理：
1. 保留所有已锁定安排（constraints 中 status = active 的条目）。
2. 只重规划最小受影响范围，其余日程保持不变。
3. 输出完整 TravelPack，并把本次调整写入 replanHistory。
```

同时「交给当前 Agent 处理」按钮在无桥接时隐藏，界面文案为「复制给 Skill Agent」，绝不暗示网页已经完成重规划。

---

## 九、1.1 compatibility 如何保证

**策略**：所有 1.2 字段在读取点都是可选；缺失时返回空值或隐藏区块，从不抛错。

浏览器实测（`travelpack.sample.json`，`schemaVersion = "1.1.0"`）：

| 检查 | 结果 |
|---|---|
| `body[data-app-ready]` | `true` |
| 一级导航 | 5 项 |
| 概览 Hero + 票面 | 正常 |
| 状态条单元格 / 已锁定安排 / 偏好 chip / AI 最近调整 | 0 / 隐藏 / 0 / 隐藏 |
| 行程模块锁定标记 / AI 理由 / 换一个 | 0 / 0 / 0 |
| 五个模块横向溢出 | 0 |
| 未处理的 Promise 拒绝 | 0 |

`ux.mjs` 的纯函数在 1.1 数据下的返回值也被单元测试固定（`tripStatusLabel → null`、`lockedConstraintsMarkup → ""`、`preferenceChips → []`、`recheckSnapshot → null` 等）。

---

## 十、自动测试

新增 `tests/phase3-product-ux.test.mjs`，**26** 个测试；全量 **56 pass / 0 fail**。

| # | 测试 | 对应要求 |
|---|---|---|
| 1 | 一级导航恰好 5 个产品模块 | 要求 1 |
| 2 | 一级导航文案为 概览/行程/准备/记账/资料 | 要求 2 |
| 3 | 地图是行程内部视图，不是一级模块 | 要求 3 |
| 4 | AI Copilot 是全局能力，不是一级模块 | 要求 4 |
| 5 | TravelPack 1.2 概览面可从样例数据渲染 | 要求 5 |
| 6 | 概览不伪造实时状态（快照措辞 / 「下一项计划」） | 诚实性 |
| 7 | 1.1 仍可构建预览且新能力全部退化 | 要求 6 |
| 8 | `tripStatus` 输出用户文案而非原始枚举 | 要求 7 |
| 9 | active constraints 映射到锁定 UI 状态 | 要求 8 |
| 10 | `decisionLog` 映射到行程 AI 理由 | 要求 9 |
| 11 | `alternatives` 能关联当前行程节点 | 要求 10 |
| 12 | `replanHistory` 生成用户可读摘要 | 要求 11 |
| 13 | 快捷动作产生结构化 Agent 请求 | 要求 12 |
| 14 | 无 Host Adapter 时有可复制兜底请求 | 要求 13 |
| 15 | 前端不保存任何模型凭据 | 要求 14 |
| 16 | List / Map 共用统一选中状态（含历史状态已移除） | 要求 15 |
| 17 | 拖拽排序能力保留（Pointer 阈值 + 重排函数可用） | 要求 16 |
| 18 | 点击处理器解构名不遮蔽模块函数（本次 bug 回归） | 工程质量 |
| 19 | 记账计算不变，摘要全部派生（不虚构总预算） | 要求 17 |
| 20 | 准备按出发阶段分组且统计容器不变 | 要求 12 章 |
| 21 | 资料时效用户表达（ok / warn / danger） | 要求 14 章 |
| 22 | 生成的 markup 转义不可信内容 | 安全 |
| 23 | 1.1 / 1.2 validator 全部继续通过 | 要求 19 |
| 24 | 1.1 / 1.2 静态预览均可构建 | 要求 20 |
| 25 | 未引入框架或动效库、零运行时依赖 | 要求 18 / 19 章 |
| 26 | 隐私审计继续 safe | 要求 18 |

测试不依赖浏览器框架：数据与文案走 `ux.mjs` 纯函数，导航与渲染片段走 `index.html` / `app.mjs` 的结构与 markup 断言。

---

## 十一、浏览器人工验收

预览构建：`node scripts/build_static_preview.mjs <sample> <dir> --ui-review`，通过本地 HTTP 打开（未使用 `file://`）。

### 桌面 1440×900

| 验收项 | 结果 |
|---|---|
| 概览 | 通过（Hero / 状态条 / 下一项 / 锁定 / 偏好 / AI 调整 / 票面） |
| 五模块导航 | 通过（5 项，概览 active） |
| 行程 List | 通过（日期导航、当日主题、调整这一天、AI 理由、节点卡） |
| 行程 Map | 通过（全宽绘制地图、编号标记、地点详情卡） |
| locked constraint | 通过（卡片 🔒 + 锁定说明；地点级约束同样生效） |
| AI 安排理由 | 通过（当日区 1 条，节点卡不重复） |
| 换一个 | 通过（面板显示 title / reason / status / 来源数） |
| AI Copilot Bottom Sheet | 通过 |
| quick action | 通过（6 个，选中态 + 自动填充文本） |
| fallback request | 通过（模式「复制给 Skill Agent」+ 提示） |
| AI 最近调整 | 通过（2 条，触发/状态/日期/摘要） |
| 准备 | 通过（出发前 7 天 / 出发前 1 天 / 旅行中 / 待排期 + 行李） |
| 记账 | 通过（已花 / 应收合计 / 应付合计 + 个人汇总 + 结算建议） |
| 资料 | 通过（5 条资料 + 2 条来源，已过期 / 当前有效） |
| 横向溢出 | 0 |
| 控制台严重异常 | 无（仅模板本身缺少的 `favicon.ico` 404，Phase 0 起即存在） |
| 原编辑能力回归 | 无（票面、模块内新增入口、拖拽把手、抽屉编辑器均在） |

### 移动端 390×844

| 验收项 | 结果 |
|---|---|
| 概览 / 五模块底部导航 | 通过（导航 fixed，浮动入口抬高到底部导航之上） |
| 行程 List | 通过（仅清单；地图面板按视图切换隐藏） |
| 行程 Map | 通过（仅地图） |
| AI Copilot Bottom Sheet | 通过（贴底、单列快捷动作、上下文行完整） |
| 记账 / 准备 / 资料 | 通过 |
| 每个模块横向溢出 | 0 |
| 浮动入口是否遮挡底部操作 | 否（底部留出滚动余量，地图详情卡可完全滚出按钮） |

### 1.1 样例

同样可正常打开：概览与票面正常，新能力静默隐藏，无报错、无溢出。

### 截图路径（临时，未提交 Git）

```text
/tmp/phase3-shots/desktop-01-overview.png      /tmp/phase3-shots/mobile-01-overview.png
/tmp/phase3-shots/desktop-02-itinerary-list.png /tmp/phase3-shots/mobile-02-itinerary-list.png
/tmp/phase3-shots/desktop-03-itinerary-map.png  /tmp/phase3-shots/mobile-03-itinerary-map.png
/tmp/phase3-shots/desktop-04-alternatives.png   /tmp/phase3-shots/mobile-04-copilot.png
/tmp/phase3-shots/desktop-05-copilot.png
/tmp/phase3-shots/desktop-06-prepare.png
/tmp/phase3-shots/desktop-07-budget.png
/tmp/phase3-shots/desktop-08-materials.png
```

按要求不把临时截图提交仓库。

---

## 十二、验收中发现并修复的真实缺陷

1. **`openAlternatives` 被同名解构绑定遮蔽**：点击「换一个」抛出异步 TypeError，面板永不打开（控制台不报错，因 async 处理器变成未处理的 Promise 拒绝）。修复为绑定别名，并在测试中新增「dataset 解构名不得与模块级函数同名」的回归断言。
2. **列表→地图选中从未接线**：只有地图→列表单向生效。补上卡片本体的选中处理，写同一个共享状态。
3. **AI 理由重复展示**：当日区与节点卡各显示一次。改为当日理由只在当日区显示，节点卡显示节点/地点级理由；「全程」视图下节点卡补齐所属日期理由。
4. **浮动入口遮挡地图详情操作按钮**：为底部留出滚动余量，使详情卡可完全滚出按钮（桌面与移动端均已实测无重叠）。

---

## 十三、本阶段视觉边界（合规确认）

**允许并已做**：新结构所需 CSS、布局调整、Bottom Sheet 基础实现、新导航名称、基础响应式、基础 focus / active / selected 状态。

**未做**：全站重新配色、Sunny Travel Journal 最终视觉、大量渐变、玻璃拟态、大型 Hero 动画、GSAP、Lottie、Anime.js、Motion Skill、React Bits、Aceternity、Magic UI、小狗角色、大规模插画、3D 动效。

**未做**：未改 `protocol.mjs`、未改 validator 契约、未改 TravelPack 1.2 schema、未新增顶层字段、未删除 TravelPack 1.1、未改地图服务架构、未改 Cloudflare 部署架构、未删除 WorkBuddy adapter、未删除 upgrade 协议、未接真实付费模型 API、未在前端写 Key、未实现真实支付/订票。

六套 `appearance.styleId` 与明暗模式变量完整保留；新信息架构不阻碍任何一套 style 工作。

---

## 十四、npm run check 结果

```text
> hks-travel-skill@4.12.0 check
> npm run audit && npm test

{ "safe": true, "filesScanned": 84 }

# tests 56
# pass 56
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

- 测试总数：**56**（Phase 3 基线 30 → 新增 26）
- 隐私审计：**safe**，扫描 84 个文件（基线 78 → 新增 4 个代码/文档文件 + 本报告与交接文档）
- Phase 1 / Phase 2 的 30 个测试**零改动、全部继续通过**

---

## 十五、Git 状态

| 项目 | 值 |
|---|---|
| 分支 | `phase3-product-ux`（基于 `main` @ `7bc0543`） |
| 文档 Commit | `d58a396` — `docs: define AI Travel Copilot product UX` |
| 主 Commit | `d14ee59` — `feat: redesign travel product interaction architecture` |
| 测试 Commit | `fdbbb6b` — `test: cover Phase 3 product interaction` |
| 报告 Commit | 本文件所在提交 — `docs: add Phase 3 handoff and completion report` |
| 是否修改 main | **否** |
| 是否合并 main | **否**，等用户审核 |
| 是否 push | 见文末状态 |

---

## 十六、已知问题

1. **浮动入口在中途滚动位置仍会压在内容上**（已通过底部留白保证关键操作可滚出）。折叠/隐藏式悬浮按钮需要 Phase 4 决定。
2. **`preferences` 没有独立编辑器**：点「编辑偏好」进入既有旅程编辑弹窗，未做轻量偏好设置中心。
3. **准备阶段的第三档标签**按需求写作「出发前 1 天」，实际区间是距出发 1–6 天；如需更准确可改为「出发前一周内」。
4. **记账首页摘要**只放 已花 / 应收合计 / 应付合计；逐人的个人应摊 / 实际支付 / 应收应付保留在「个人汇总」子 Tab，未在首屏重复一份逐人区块。
5. **`replanHistory` 只在概览展示**，行程页未按当天展示相关调整记录。
6. **六套风格中只对默认 `aviation` 做了截图验收**；其余五套与深色模式共用同一组变量，但未逐套截图。
7. **`alternatives` 中 `status = "selected"` 的条目仍显示「换一个」**（允许用户改回），但按钮语义可再斟酌。

---

## 十七、Phase 4 进入条件

全部满足：

- [x] 一级 IA 冻结为 5 项（概览 / 行程 / 准备 / 记账 / 资料）
- [x] 地图是行程内部视图，不是一级模块
- [x] AI Copilot 是全局能力，不是一级模块
- [x] 概览继承并保留原「出行」能力
- [x] TravelPack 1.2 七个字段全部有明确 UI 映射
- [x] Agent Bridge 契约与 fallback 已文档化
- [x] TravelPack 1.1 渐进增强，无报错
- [x] 56 pass / 0 fail；隐私审计 safe
- [x] 桌面与 390px 浏览器验收完成
- [x] 未改 schema、未迁框架、未新增依赖、未引入动效库

**Phase 3 已满足进入 Phase 4（UI Redesign / Sunny Travel Journal）的条件。** Phase 4 可以在这套结构上做视觉系统，前提是保持 IA 冻结、保持 1.1 / 1.2 兼容、保持前端无凭据。

---

## 十八、等待用户审核

按要求**未自动合并 main**，**未开始 Phase 4**。

请审核本报告与 `PHASE_3_HANDOFF.md`，确认后我再按流程开 PR（`phase3-product-ux` → `main`）或按要求调整。
