# AI Travel Copilot — Phase 1 完成报告（Skill Intelligence）

> 生成时间：2026-09-20 19:42
> 仓库：[FreddyWang-02/wgx-travelling](https://github.com/FreddyWang-02/wgx-travelling)
> 分支：`phase1-skill-intelligence`
> Commit：`6d445c9` — `feat: add constraint-aware travel planning intelligence`
> 前置：Phase 0（已完成，基线 4 pass / 0 fail）

---

## 一、总体结论

**Phase 1 全部完成并通过验收。**

本阶段只改造 Skill Intelligence（智能层），**没有触碰任何前端、UI、schema、部署与升级代码**。TravelPack 仍为 `schemaVersion = "1.1.0"`。

- 测试：**10 pass / 0 fail**（Phase 0 基线为 4 pass / 0 fail）
- 隐私审计：`{"safe": true, "filesScanned": 70}`
- 分支已推送到 GitHub，**未合并 main**（按要求）
- 交接文档 `PHASE_1_HANDOFF.md` 已生成
- **未自动进入 Phase 2**

---

## 二、本阶段做了什么（一句话）

把原来"研究 → 确认 → 生成 → 部署"的线性流程，升级为 **AI Travel Copilot 工作流**：先理解用户、区分不可动的硬约束和可权衡的软偏好，再研究、进候选池、约束感知地排计划、给出简短可理解的决策理由，并且支持旅行途中的局部重规划。

```
User Request
→ Intent Extraction（意图提取）
→ Preference Extraction（偏好提取）
→ Constraint Extraction（约束提取）
→ Missing Information Check（缺失信息检查）
→ Research（研究）
→ Candidate Pool（候选池）
→ Constraint-aware Planning（约束感知规划）
→ Explainable Decisions（可解释决策）
→ User Review（用户审核）
→ TravelPack（数据产物）
→ Dynamic Replanning（动态重规划）
```

---

## 三、文件变更清单

### 3.1 修改（1 个）

| 文件 | 改动 |
|------|------|
| `hks-travel-skill/SKILL.md` | 重写工作流；部署/升级/边界章节原样保留 |

### 3.2 新增（4 个）

| 文件 | 说明 |
|------|------|
| `hks-travel-skill/references/planning-intelligence.md` | 硬约束/软偏好、候选池、规划优先级、可解释规划、缺失信息检查 |
| `hks-travel-skill/references/dynamic-replanning.md` | local-replan 规则、影响范围判定、保留规则、修改摘要格式 |
| `tests/skill-intelligence.test.mjs` | 6 个新测试，验证规则真实存在 |
| `PHASE_1_HANDOFF.md` | 下一阶段接续文档 |

变更统计：`6 files changed, 420 insertions(+), 23 deletions(-)`（含本报告前的 5 个文件）

### 3.3 明确未动的部分

`assets/frontend-template/**`、`assets/backend-template/**`、`references/travelpack-1.1.md`、所有 `scripts/*.mjs`、`package.json`（无新依赖）、地图能力、部署能力、upgrade 机制——全部保持原样。

---

## 四、SKILL.md 工作流变化详解

### 4.1 新增：运营模式（Operating Modes）

Skill 现在会先识别用户请求属于哪种模式，只执行对应流程：

| 模式 | 含义 | 行为 |
|------|------|------|
| `new-trip` | 从零创建旅行 | 执行完整工作流第 1–14 步 |
| `update-trip` | 修改已有旅行内容 | 保留稳定 ID，输出完整 TravelPack |
| `local-replan` | 行程中/已规划行程局部变化 | **默认模式**，只重规划最小受影响范围 |
| `demo` | 演示 | 用内置示例数据走流程，不部署、不要求 Key |
| `deployment-upgrade` | 升级已部署网站 | 走原升级协议，**不改行程内容** |

> 模式识别不确定时，先与用户确认一次再执行。

### 4.2 工作流步骤（14 步，关键点）

1. **意图提取** —— 目的地、出发地、日期、同行人、出行目的；推断内容单独标记
2. **偏好提取** —— 软偏好（早起/节奏/走路量/拍照/咖啡馆/避人流/预算）
3. **约束提取** —— 硬约束（航班/酒店/预约餐厅/演出/必去地点/行动能力/用户声明不可改）
4. **缺失信息检查** —— 汇总提问，跳过用户已提供的
5. 展示偏好与约束摘要，等用户确认
6. **研究** —— 沿用原 `source-matrix.md` 的来源与时效规则（时效分级：航班 6h / 天气 6h / 临时通知 24h / 票价预约 7d / 季节体验 90d / 固定地址 180d）
7. **候选池** —— 研究结果不再直接变成攻略
8. **约束感知规划** —— 按优先级排期，每个正式节点必须有 `startTime` / `endTime`
9. **可解释决策** —— 每个关键决策一句 planning reason
10. UI 预览（六风格，HTTP 打开，不可用 `file://`）
11. TravelPack 1.1 输出 + `validate_travelpack.mjs` 校验
12. 宿主能力发现与部署路由
13. 部署遵守五模块契约 + 云端数据契约
14. 线上真机验收

> 第 6–14 步的原有规则（来源时效、六风格审核、部署路由四优先级、真机验收标准）**逐条保留，未削弱**。

---

## 五、Hard Constraints / Soft Preferences 如何工作

### 5.1 Hard Constraints（硬约束，不可静默修改）

定义的硬约束类别：

- 航班（已确认/已购票的班次与时间）
- 酒店入住 / 退房
- 已预约餐厅（有确认凭据）
- 演出 / 活动票券
- 必去地点（用户指定必须包含）
- 行动能力限制（无障碍、体力、时间不可用）
- 用户明确声明不可修改的安排

规则要点：

- **不得被 AI 静默修改、移动、删除或覆盖**
- 规划必须围绕硬约束组织；**冲突必须显式展示给用户并等待决定**，禁止自动取舍
- 修改只来自用户明确指令
- 承载方式：航班 → `transportSegments`，住宿 → `stays`，预约餐厅/演出/必去地点 → `itineraryItems`（保留用户给定时间）

### 5.2 Soft Preferences（软偏好，可权衡）

定义的软偏好：不喜欢早起、不喜欢赶、少走路、喜欢拍照、喜欢咖啡馆、避开人群、预算倾向、旅行节奏。

规则要点：

- 用于**候选排序与行程优化**，冲突时**允许权衡**，但权衡必须可解释
- 多个软偏好冲突 → 按用户当次强调的优先；仍无法判断 → 给 1–2 个替代方案
- **禁止把软偏好升级为硬约束**；**禁止因软偏好破坏硬约束**

### 5.3 优先级顺序（约束感知规划）

```
1. 地理聚类      同日节点相邻区域，减少跨区移动
2. 真实交通时间   用地图路线数据或官方交通时间，无法取得则标记待核验
3. 用户节奏      按软偏好控制节点密度与移动距离
4. 每日合理密度   默认 3–5 个节点
5. 用餐时间      餐厅预约优先于自由用餐
6. 休息时间      上下午各留 30–60 分钟缓冲
7. Hard Constraints   不得冲突，冲突必须显式上报
8. Soft Preferences   在前 7 项满足前提下排序取舍
```

---

## 六、Research → Candidate Pool 如何工作

关键变化：**研究结果不直接变成最终攻略**。

```
Research
→ Candidate Places（候选地点，带来源链接/所属区域/开放状态）
→ Geographic Clustering（地理聚类，无坐标时按官方地址与空间关系）
→ Time Feasibility（时间可行性，不满足则降级备选或移天）
→ Constraint Check（约束检查，校验硬约束不被破坏）
→ Preference Matching（偏好匹配，输出前 3 名与备选）
→ Final Itinerary（仅用户确认路线后才转为正式 itineraryItems）
```

候选池以**区域摘要**形式展示给用户确认，确认前不得写入 TravelPack。

---

## 七、Explainable Planning（可解释规划）

- 每个进入最终行程的关键决策生成**一句简短、用户可理解的自然语言理由**
- 示例（来自文档）：
  - "浅草和上野安排在同一天，因为位于相邻区域，可以减少跨区移动。"
  - "保留 19:30 的餐厅预约，因此下午行程提前结束。"
- **明确禁止**保存或展示模型隐藏推理过程或 chain-of-thought；planning reason 是面向用户的结论摘要，不是推理日志
- 保存方式：复用 TravelPack 1.1 的 `itineraryItems[].notes` 或 `materials` 攻略类条目，**不新增 schema 字段**
- 后续 TravelPack 1.2 将增加 `decisionLog`，Phase 1 只定义行为与数据需求

---

## 八、Dynamic Replanning 如何工作

### 8.1 模式区分

- `full-plan`：新旅行或用户要求推翻整份计划
- `local-replan`：局部变化，**默认使用**

### 8.2 触发条件（默认进 local-replan）

下雨、太累、起晚、景点闭馆、临时增加地点、临时删除地点、酒店改变

### 8.3 九步流程

```
1. 识别 Trigger
2. 找出受影响日期/地点
3. 锁定 Hard Constraints
4. 保留未受影响 itinerary IDs
5. 必要时研究替代地点（走候选池检查）
6. 只重规划最小受影响范围
7. Constraint Check
8. 向用户展示修改摘要
9. 用户确认后应用
```

> **禁止因为一天变化而无理由重建整个旅行。**

### 8.4 受影响范围判定表

| 触发 | 默认受影响范围 |
|------|---------------|
| 下雨 | 受影响天的户外节点与次日移动衔接 |
| 太累 | 当日剩余节点与次日早间安排 |
| 起晚 | 当日早间节点顺序与时间 |
| 景点闭馆 | 该节点所在天，替代物在同天或相邻区域 |
| 临时增加地点 | 插入点所在天，必要时相邻天 |
| 临时删除地点 | 删除点所在天，保留前后衔接 |
| 酒店改变 | 入住/退房日时间窗口，与住宿绑定的交通 |

### 8.5 保留规则（Preservation Rules）

- 未受影响的 `itineraryItems` / `stays` / `transportSegments` / `tasks` / `expenses` / `materials` **原样保留**
- 用户笔记、已完成待办、上传资料不进入重规划范围
- 被修改节点保留原 `id`；删除节点从集合移除；新增节点用新 `id`
- 替代候选优先与节点原区域相邻；无合适替代时保留"待确认"，禁止虚构

### 8.6 修改摘要格式（五段）

触发 / 受影响 / 保留 / 待核验 / 待确认 —— 只含用户可理解的结论，不展示推理日志。

---

## 九、测试

### 9.1 新增测试文件 `tests/skill-intelligence.test.mjs`（6 个测试）

| 测试 | 验证内容 |
|------|---------|
| SKILL workflow defines operating modes | 五个运营模式全部存在 |
| SKILL workflow enforces the AI Travel Copilot pipeline | 意图/偏好/约束提取、候选池、约束感知规划、planning reason 均存在 |
| planning-intelligence reference defines hard constraints and soft preferences | 硬约束 6 类 + 软偏好 8 类 + 候选池 6 阶段 + 可解释规划 + CoT 禁令 |
| dynamic-replanning reference defines local-replan rules | full-plan/local-replan 区分、7 类触发、9 步流程、保留规则 |
| new reference files exist and are linked from SKILL | 两个新文件存在且被 SKILL.md 引用 |
| deployment and upgrade sections are preserved | 升级相关 7 个引用 + 3 个脚本 + `legacy-audit-required` 未丢失 |

> 测试断言的是**文档中的真实规则文本**（如硬约束类别、触发词、流程步骤），不是空字符串，避免"为通过而通过"。

### 9.2 测试结果

```
npm run check

audit:  { "safe": true, "filesScanned": 70 }

✔ SKILL workflow defines operating modes
✔ SKILL workflow enforces the AI Travel Copilot pipeline
✔ planning-intelligence reference defines hard constraints and soft preferences
✔ dynamic-replanning reference defines local-replan rules
✔ new reference files exist and are linked from SKILL
✔ deployment and upgrade sections are preserved
✔ public skill metadata and screenshots are complete      ← Phase 0 原有
✔ bundled sample validates                                ← Phase 0 原有（TravelPack 1.1 仍通过）
✔ new manifest uses public product id and legacy upgrades remain recognized  ← Phase 0 原有
✔ public tree passes the privacy audit                    ← Phase 0 原有

tests 10 | pass 10 | fail 0 | cancelled 0 | skipped 0
```

原有 4 个测试全部保留且通过，**零回归**。

---

## 十、Git 状态

- 分支：`phase1-skill-intelligence`（从 `main` @ `c39f7d5` 拉出）
- Commit：`6d445c9` `feat: add constraint-aware travel planning intelligence`
- Push：**已推送**到 `origin/phase1-skill-intelligence`
- main：**未合并**（按要求）
- PR 入口：`https://github.com/FreddyWang-02/wgx-travelling/pull/new/phase1-skill-intelligence`

---

## 十一、Phase 2 进入条件

全部满足：

- [x] 运营模式已在 SKILL.md 定义
- [x] 硬约束/软偏好语法已定义
- [x] 候选池流水线已定义
- [x] 约束感知规划优先级已定义
- [x] 可解释规划规则已定义
- [x] local-replan 默认行为已定义
- [x] 新 reference 文件存在且被测试覆盖
- [x] TravelPack 1.1 sample 仍然通过校验
- [x] 隐私审计仍然通过
- [x] 全部测试通过（10/10）
- [x] 未改前端/UI/schema/部署

**Phase 2 内容预告（TravelPack 1.2，纯增量、不破坏 1.1）：**

```jsonc
{
  "preferences": {},      // 软偏好
  "constraints": {},     // 硬约束
  "planningMeta": {},    // 规划器版本、推理摘要
  "alternatives": [],    // 平行方案与权衡
  "decisionLog": [],     // 每段选择理由与被拒原因
  "replanHistory": [],   // 历史版本与时间戳
  "tripStatus": "draft" | "confirmed" | "in-progress" | "completed"
}
```

规则：1.1 字段全部不变；1.2 是 1.1 的超集，1.1 校验器可校验 1.2 数据。

---

## 十二、Phase 1 验收清单

- [x] 创建分支 `phase1-skill-intelligence`
- [x] 基线 `npm run check`：4 pass / 0 fail
- [x] 核心流程升级为 AI Travel Copilot 工作流
- [x] 硬约束 / 软偏好明确区分并写清规则
- [x] 加入 Candidate Pool 概念
- [x] 约束感知规划（9 项优先级）
- [x] 可解释规划（planning reason，禁 CoT）
- [x] 动态重规划（local-replan 默认 + 影响范围 + 保留规则 + 修改摘要）
- [x] 五个运营模式定义
- [x] 新增两个 references 文件
- [x] 未改 frontend / UI / GSAP / 动画 / 小狗角色 / 五模块前端
- [x] 未改 schemaVersion，未加 1.2 字段
- [x] 未删地图/部署/upgrade 能力，未重构 app.mjs，未迁移框架，未加依赖
- [x] 补充测试并全部通过
- [x] 提交到 `phase1-skill-intelligence`，未合并 main
- [x] `PHASE_1_HANDOFF.md` 已生成
- [x] 未自动开始 Phase 2

---

**Phase 1 状态：已完成，等待用户确认后进入 Phase 2。**
