# Phase 4A Handoff · Sunny Travel Storybook 首页

本文件是 Phase 4A 的交接说明。视觉真相以仓库根目录 **`DESIGN.md`** 为准，本文件只讲"做了什么、
边界在哪、下一阶段怎么接"。完整过程与验收数据见 `报告/phase4a-report.md`。

- 分支：`phase4a-homepage-visual`（**未合并 main**）
- 范围：**只做首页（概览）**。行程 / Copilot / 次级页面一律未动。

---

## 1. 这一阶段改了什么

首页在 `storybook` 风格下从"票夹 + 卡片"变成一本**晒过太阳的旅行手账**：

- **Destination Postcard Hero**：目的地风景插画 + 手写目的地名（含手绘下划线）+ 主题情绪副标题 +
  邮戳 + 三张宝丽来拼贴 + 手绘航线与飞过的小飞机 + 旅行小狗与小猫 + 状态胶囊 + 双 CTA。
- **今天的旅程**：把当日行程做成一条 story line，节点带时间、锁定标记与一句话说明，可用 Day 胶囊换天。
- **为什么这样安排**：把 `decisionLog` 翻译成用户语言，不出现任何契约字段名。
- **已锁定安排**：消费 `constraints`（`status = active`），统一文案「🔒 已锁定安排」。
- **旅行状态**：酒店 / 预约 / 待复核三类，用「已确认 / 已预约 / 建议复核」表达。
- **别错过**：通栏图集，是加分项，空间不足时第一个被砍。
- 末尾保留 **出行票据**区，Phase 3 的出行能力在首页继续可用。

## 2. 关键设计决策（下一阶段必须遵守）

1. **新增 `appearance.styleId = "storybook"`，不是替换。**
   原六套 style 的版式与 `aviation` 的票夹构图**一字未改**。选择 storybook 只影响首页；
   切回 `aviation` 时仍然是 Phase 3 的票夹概览。这是为了不违反 `product-contract.md` 里
   "`aviation` 必须沿用票夹构图、宿主不得把这些结构替换成通用卡片堆叠"的约定。
2. **storybook 是新旅行的默认方向**（`DEFAULT_STYLE`）。数据里已记录 `appearance.styleId` 的旅行仍按记录走。
3. **目的地自适应只换主题层，不换 UI。** 固定的是布局 / 组件 / 层级 / 动效 / 导航；
   变的只有目的地名、主题文案、场景插画、拼贴取景、氛围元素、航线两端标签与邮戳内容。
4. **图像语言是矢量插画，不是写实照片。** TravelPack 契约里没有图片字段（`assets` 只是附件登记），
   所以风景是 `scene-*.svg`，图框 API 已预留真实照片位（将来契约加法扩展时替换即可，版式不变）。
5. **动效必须"像呼吸，不像 GIF"。** 全部 spec 见 `DESIGN.md` 的 Motion Map；只允许
   `transform` / `opacity`，并完整支持 `prefers-reduced-motion`。
6. **一级导航恒为 5 项。** 首页没有新增一级 Tab。

## 3. 新增文件

```
DESIGN.md                                            设计真相（Art Direction / token / Motion Map / 移动端）
PHASE_4A_HANDOFF.md                                  本文件
hks-travel-skill/assets/frontend-template/assets/
├── home/home-ux.mjs                                 首页纯逻辑与 markup（615 行，可单测）
├── home/home-assets.mjs                             生产资产运行时（单例取回 + 内联）
├── home/homepage.css                                首页视觉与动效（986 行）
├── mascots/travel-puppy.svg                         主角色（分部件可动）
├── mascots/travel-cat.svg                           次角色（分部件可动）
├── homepage/scene-{coast,city,mountain,nature,heritage}.svg
├── illustrations/*.svg                              12 个手绘涂鸦
├── decor/{postmark,tape-washi,paper-grain,pressed-flower}.svg
└── fonts/{caveat,nunito}-latin-var.woff2            自托管 latin 子集（OFL）
hks-travel-skill/assets/frontend-template/travelpack.sample.storybook.json   本阶段视觉验收样本
docs/design-reference/phase4a/                       5 张资产母版（**仅参考**）+ README
docs/screenshots/phase4a/                            15 张验收截图 + 总览长图 + README
tests/phase4a-homepage.test.mjs                      20 个新测试
```

## 4. 修改的文件

| 文件 | 改动 |
| --- | --- |
| `frontend-template/index.html` | 风格弹窗新增「晴日手账」选项与预览块；`theme-color` 改为落日橘 |
| `frontend-template/app.css` | 顶部 `@import` 首页样式；其余零改动 |
| `frontend-template/app.mjs` | 首页分派（storybook → 新首页，其余 → Phase 3 概览）、资产预取、滚动揭示、CTA/Day 事件 |
| `frontend-template/protocol.mjs` | 新增 `supportedStyleIds` 并导出；`styleId` 校验改用它（加法） |
| `backend-template/worker.js` | `styleId` 白名单加入 `storybook` |
| `references/travelpack-1.1.md`、`travelpack-1.2.md`、`product-contract.md`、`product-ux-v1.md` | 记录新增取值与 Phase 4A 结论 |
| `SKILL.md`、`README.md`、`README_EN.md` | 六种 → 七种风格 |
| `THIRD_PARTY_NOTICES.md` | 新增 Caveat / Nunito 的 OFL 声明 |

## 5. 怎么验收

```bash
# 质量门禁
npm run check          # 76 pass / 0 fail，audit safe

# 首页预览（用本阶段的验收样本）
node hks-travel-skill/scripts/build_static_preview.mjs \
  hks-travel-skill/assets/frontend-template/travelpack.sample.storybook.json /tmp/p4a --ui-review
node hks-travel-skill/scripts/serve_ui_preview.mjs /tmp/p4a --port 4179
# 打开 http://127.0.0.1:4179/
```

- 用 `travelpack.sample.1.2.json` 或 `travelpack.sample.json` 构建时默认走 `aviation`（Phase 3 概览）；
  这两个样本**未被改动**，是长期回归样本。
- 切换风格：右上「晴日手账」按钮 → 七种方向。

## 6. 已知限制

1. **中文目的地名无法使用手写体**（Caveat 不含 CJK 字形，中文只能回落系统字体），
   因此加了手绘下划线 `sb-title-swash` 来补足手写气质。若后续要真正的中文手写体，
   需要引入中文 web font（体积大，需单独评估）。
2. **风景是插画，不是照片。** 契约没有图片字段；`home-assets.mjs` 与 `sb-postcard-scene`
   已预留真实照片的替换位。
3. **`homepage.css` 的取景百分比与场景插画强耦合**：`sb-crop-a/b/c` 的目标是中景/前景，
   换场景图时需要重新对景（注释里写了 `translate = 50% - 可见中心` 的换算公式）。
4. **首页只在 `storybook` 下渲染**；其余六套 style 仍是 Phase 3 概览。这是刻意的边界。
5. 场景 SVG 内联多次会产生重复的渐变 `id`；同内容同定义，浏览器取第一个，视觉无差异（不打算引入 id 前缀方案）。

## 7. 给 Phase 4B 的约束

- 行程模块可以复用 `DESIGN.md` 的 token、`assets/` 里的资产与 `home-ux.mjs` 的纯函数，**不要另起一套设计**。
- 继续走"加法"：新风格、新字段、新资产都不得让旧数据或旧风格失效。
- 动效沿用 Motion Map 的 token 与"只动 transform / opacity"的约束。
- 仍然不要动 `docs/screenshots/` 根目录下 Phase 0 的三张图（`tests/skill.test.mjs` 会断言它们存在）。


---

## 8. Git 状态

| commit | 说明 |
| --- | --- |
| `9e4b3af` | `docs: define Sunny Travel Storybook design system` |
| `4ea9e20` | `feat: add animated travel companions and homepage art assets` |
| `ae298a9` | `feat: redesign the adaptive travel homepage` |
| `d325052` | `test: cover the storybook homepage contract` |
| `23904d9` | `docs: add Phase 4A handoff, report and acceptance screenshots` |

- 分支 `phase4a-homepage-visual` 已推送到 `origin`，与远端一致；**main 未改动、未合并**。
- 收尾门禁：`npm run check` → audit `safe: true` / `filesScanned: 156`，76 pass / 0 fail。
- **截图已内嵌在 `报告/phase4a-report.md`**（16 张相对路径图片，含合成总览长图），
  报告可以单独转交、自己带图；逐张清单与说明另见 `docs/screenshots/phase4a/README.md`。
- 按阶段要求**没有创建 PR**，等视觉审核通过后再决定合并方式。
