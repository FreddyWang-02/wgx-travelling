# Phase 3 界面验收截图

TravelPack 1.2 样例数据（`assets/frontend-template/travelpack.sample.1.2.json`），通过本地 HTTP 打开 `build_static_preview.mjs --ui-review` 产物后截图。

- 桌面端：1440 × 900
- 移动端：390 × 844
- 全部截图来自同一份最终构建，未做任何后期裁剪

## 一张图看完

`contact-sheet.png` — 上面 8 张桌面端 + 下面 6 张移动端合成的一张长图，带标题与说明。**只需要发一张图时用这张。**

## 桌面端

| 文件 | 界面 | 验证要点 |
|---|---|---|
| `desktop-01-overview.png` | 概览 Overview | 状态条（旅行状态「旅行进行中」/ 已锁定安排 4 项 / 待复核信息 3 项 + 快照说明）、下一项计划、🔒 已锁定安排、交通与住宿摘要、你的旅行偏好、AI 最近调整、原「出行」票面 |
| `desktop-02-itinerary-list.png` | 行程 · 行程视图 | 日期导航、当日主题 +「✨ 调整这一天」、✨ AI 安排理由、节点卡（时间 / 类型 / 🔒 / 换一个）、绘制地图与编号 |
| `desktop-03-itinerary-map.png` | 行程 · 地图视图 | 地图占满宽度；证明地图是行程模块内部视图，不是一级模块 |
| `desktop-04-alternatives.png` | 换一个 / 重新选择 | `alternatives[]` 关联当前节点，展示标题 / 理由 / 状态 / 来源数。入口按钮语义跟随状态：还有 `available` 显示「换一个」，只剩 `selected` 显示「重新选择」 |
| `desktop-05-copilot.png` | AI Copilot 变更请求 | 无宿主时生成可复制的结构化 Skill 请求，并明示「网页不会自动重规划」 |
| `desktop-06-prepare.png` | 准备 Prepare | 按出发前时间阶段分组（出发前 30 天 / 7 天 / 一周内 / 旅行中 / 待排期）+ 行李清单；三列统计容器保持不变 |
| `desktop-07-budget.png` | 记账 Budget | 新增首页摘要：已花 / 应收合计 / 应付合计；个人汇总与结算建议保留 |
| `desktop-08-materials.png` | 资料 Materials | 来源时效用户化：已过期 / 当前有效 |

## 移动端

| 文件 | 界面 | 验证要点 |
|---|---|---|
| `mobile-01-overview.png` | 概览 | 状态条三列并排；浮动入口抬高到底部导航之上；横向溢出 0 |
| `mobile-02-itinerary-list.png` | 行程视图 | 窄屏只显示清单（地图按视图切换隐藏） |
| `mobile-03-itinerary-map.png` | 地图视图 | 地图占满宽度 |
| `mobile-04-copilot.png` | AI Copilot | Bottom Sheet 贴底、快捷动作单列、上下文行完整 |
| `mobile-05-budget.png` | 记账 | 摘要与个人汇总在窄屏的排布 |
| `mobile-06-prepare.png` | 准备 | 时间阶段分组在窄屏的排布 |

## 未包含

- 六套 `appearance.styleId` 中只截取了默认 `aviation`；其余五套与深色模式共用同一组变量，本阶段未逐套截图。
- 静态预览为只读模式，因此截图中的编辑入口不显示编辑态操作（`app.mode = "demo"`）。
