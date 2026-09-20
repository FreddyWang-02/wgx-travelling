# Phase 4A · 首页视觉验收截图

AI Travel Copilot — Phase 4A（Sunny Travel Storybook 首页视觉重构）的浏览器验收截图。

- 样例数据：`hks-travel-skill/assets/frontend-template/travelpack.sample.storybook.json`（北京，慢慢走）
- 构建方式：`node hks-travel-skill/scripts/build_static_preview.mjs <pack> <out> --ui-review`
  → `node hks-travel-skill/scripts/serve_ui_preview.mjs <out> --port <n>`
- 全部截图取自**同一份最终构建**，用真实 Chromium 打开 HTTP 地址截取，未经后期修饰。
- 本阶段截图交付为 **JPEG（质量 92）**：UI 截图在该质量下与 PNG 视觉无差别，仓库体积减少约 56%。
  `docs/screenshots/` 根目录与 `phase3/` 的历史截图保持 PNG，未做改动。

| 文件 | 视口 | 说明 |
| --- | --- | --- |
| `desktop-hero.jpg` | 1440×900 | 首屏。Destination Postcard Hero：明信片封面、手写目的地名与手绘下划线、航线与纸飞机、邮戳、三张宝丽来拼贴、旅行小狗与小猫、双 CTA、状态胶囊。 |
| `desktop-home-full.jpg` | 1440 整页 | 首页完整结构：Hero → 今天的旅程 → 为什么这样安排 → 已锁定安排 → 旅行状态 → 别错过 → 出行票据（Phase 3 能力）。 |
| `desktop-02-journey-why.jpg` | 1440 滚动 | 「今天的旅程」story line 与 Day 胶囊；「为什么这样安排？」消费 `decisionLog` 的用户语言表达。 |
| `desktop-03-locked-status.jpg` | 1440 滚动 | 「已锁定安排」消费 `constraints`（active）；「旅行状态」消费 `stays` / `tasks` / 待复核信息。 |
| `desktop-04-inspiration.jpg` | 1440 滚动 | 「别错过」通栏图集与出行票据区。 |
| `laptop-hero.jpg` | 1280×800 | 首屏在更窄桌面下的表现。 |
| `tablet-768-hero.jpg` | 768×1024 | 单列封面构图；CTA 仍在首屏可见范围内。 |
| `mobile-390-hero.jpg` | 390×844 | **移动端首屏（正式验收目标）**。Travel Postcard Cover 竖构图，主 CTA 与次 CTA 各占一行，全部落在首屏内。 |
| `mobile-390-home-full.jpg` | 390 整页 | 移动端完整首页，无横向溢出。 |
| `mobile-390-02-journey.jpg` | 390 滚动 | Day 胶囊可横滑，节点轴线与锁定标记保留。 |
| `mobile-390-03-status.jpg` | 390 滚动 | 旅行状态与灵感图单列堆叠。 |
| `dark-hero.jpg` | 1440×900 | 深色模式首屏：夜晚的手账，仍是暖色纸感。 |
| `reduced-motion-hero.jpg` | 1440×900 | `prefers-reduced-motion: reduce`：全部入场与循环动效停止，航线与内容信息量不变。 |
| `regression-itinerary.jpg` | 1440×900 | 回归证据：Phase 3 的行程模块（清单 + 地图）未受影响。 |
| `regression-aviation-overview.jpg` | 1440×900 | 回归证据：切到 `aviation` 时仍是 Phase 3 的票夹概览，新首页没有替换既有风格。 |
| `contact-sheet.jpg` | 1185 宽 | 以上 15 张合成总览长图，每张带中文说明，便于整体转交与浏览。 |

## 本阶段未包含的截图

- 六套旧风格（`natural` / `minimal` / `collage` / `print` / `urban`）与深色模式未逐套截图：
  它们与 Phase 3 完全一致（代码零改动），本阶段只截 `aviation` 作为"未被替换"的代表证据。
- 首页动画过程未录屏；动效规格以 `DESIGN.md` 的 Motion Map 为准，验收方式为逐项读取计算样式
  （`animation-name` / `stroke-dashoffset` / `opacity`），结果记录在 `报告/phase4a-report.md`。
