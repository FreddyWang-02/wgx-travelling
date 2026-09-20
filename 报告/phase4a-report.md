# Phase 4A 报告 · Homepage Visual Redesign（Sunny Travel Storybook）

> 本报告供转交外部模型作为上下文使用。信息完整优先，格式不限。
> 视觉真相以仓库根目录 `DESIGN.md` 为准；本文记录"为什么这么做、怎么做的、验收结果"。

- 仓库：`https://github.com/FreddyWang-02/wgx-travelling`
- 分支：`phase4a-homepage-visual`（基于 `main` = `cb45788`，**未合并 main**）
- 范围：**只做首页 / 概览**。Phase 4B 的行程重构、Copilot 重构、次级页面一律未动。

---

## 1. 视觉方向选择：A / B / C

按阶段要求先内部分析了三个方向：

| 方向 | 内容 | 判断 |
| --- | --- | --- |
| A · Scenic Travel Collage | 以写实风景照片为主体的拼贴 Hero | **否决**。TravelPack 1.2 契约里没有任何图片字段（`assets` 只是附件登记，`materials.url` 是外链），没有真实照片来源；用随机网图既不合规也不允许，用 AI 生成写实照片又会带来版权与"照片必须对得上目的地"的问题。 |
| B · Travel Journal / Postcard | 手账 + 明信片 + 纸胶带 + 邮戳 + 宝丽来相纸的纸质拼贴语言 | **选中**。 |
| C · Illustrated Travel Story | 插画 + 角色 + 涂鸦驱动的叙事 | 部分吸收（见下），但不作为主导方向。 |

**最终选择 B（Travel Journal / Postcard）**，理由：

1. 5 张资产母版的标题本身就是 "Sunny Travel Journal"，母版的骨架（手写标题 + 宝丽来拼贴 + 邮戳 + 纸胶带）
   就是 B 的构图，选 B 是对母版最忠实、信息损耗最小的落地方式。
2. B 是唯一**不依赖写实摄影**也能成立的方案——图像位可以是"插画明信片"，
   这在没有图片字段的数据契约下是唯一诚实的做法。
3. B 天然容纳阶段要求的全部元素：角色（作为手账里的伙伴）、手绘航线（画在纸上的虚线）、
   今日旅程（手账的一天）、邮戳与贴纸（纸质语言）。
4. Mobile 要求"可以更像 Travel Cover / Postcard Cover"，B 直接就是封面。

C 的插画语言被吸收为 B 的**图像处理方式**（场景是矢量插画而非照片），
但主导方向是 B 的纸质拼贴构图，没有把三个方向混成一个。

---

## 2. 最终 Art Direction

**Sunny Travel Storybook** — 一本晒过太阳的旅行手账。关键词 Sunny / Scenic / Playful / Illustrated /
Animated / Warm / Editorial / Travel-first / Storybook / Joyful。

**记忆点（唯一一个）**：*Destination Postcard Hero* —— 一张盖着邮戳、贴着纸胶带、写着目的地名（手写体）
的风景明信片，旁边坐着旅行小狗和小猫，一条虚线航线从明信片里飞出去。

**明确不做**：Apple 风 / 冷淡极简 / SaaS Dashboard / 后台管理台 / 灰白矩形卡片堆 /
黑色赛博 / 蓝紫霓虹 AI 风 / 大量 Glassmorphism。

完整 token（颜色 / 字体 / 间距 / 圆角 / 阴影 / 照片处理 / 插画 / 角色 / 动效 / 目的地自适应 /
首页层级 / 移动端 / Do-Don't）见 `DESIGN.md`。

### 2.1 与阶段禁用项的对照自查

| 禁止项 | 本阶段实际做法 |
| --- | --- |
| Apple 风 / 冷淡极简 | 暖奶油纸底 + 落日橘主色 + 手写体，无冷灰 |
| SaaS Dashboard / 后台台 | 首页无指标墙、无 KPI 卡；第一屏是明信片封面 |
| 大量灰白矩形卡片 | 卡片是纸质（硬阴影 + 纸纹 + 手写标注），大量元素是插画与贴纸 |
| 黑色赛博 / 蓝紫霓虹 | 深色模式是"夜晚的手账"（暖棕色系），无 glow |
| 大量 Glassmorphism | 全程没有 `backdrop-filter` 玻璃层（唯一模糊是既有导航的既有实现） |
| 白底 + 圆角卡片 = 完成 | 首页有插画 / 角色 / 航线 / 邮戳 / 拼贴 / 动效六层内容 |

---

## 3. 资产包如何使用

收到的 `phase4a_visual_assets_v1.zip` 内含 5 张 1536×1024 PNG 母版。**已逐张用多模态能力查看**，
并逐张提取 Hero / 色彩 / 拼贴 / 角色 / 手绘元素 / UI component / route / stamp / photo style /
texture / motion opportunity 十一个维度。提取结论见 `docs/design-reference/phase4a/README.md`
与 `DESIGN.md`。

**跨母版的共同视觉语言**（这是真正被复用的部分）：

- 暖奶油纸张底 + 落日橘主色 + 蓝紫次色 + 鼠尾草绿 / 黄油黄 / 天空蓝点缀；
- 手写体承担"标题 / 目的地名 / 贴纸标注"，正文用圆润无衬线，印章用大写 + 字距；
- 宝丽来相纸（厚下边 + 小圆角 + 硬阴影 + 轻微旋转）+ 纸胶带 + 邮戳构成"纸"的物理隐喻；
- 单线墨色涂鸦（统一线宽、圆头），虚线航线 + 纸飞机是路线语言；
- 角色是统一风格的一狗一猫，小狗负责行动、小猫负责陪伴；
- UI 是胶囊按钮 + 贴纸标签 + 四态状态胶囊（已确认 / 待复核 / 已锁定 / 需要处理）。

**严格遵守的禁令**：没有把任何一张母版作为网页背景或首页图片；没有把母版里的元素成批铺到首页；
母版以 1400px JPEG 存放在 `docs/design-reference/phase4a/`，位置与用途在 README 里标注为 reference-only，
产品页面不引用该目录的任何文件。

### 3.1 reference asset vs production asset

| 类别 | 内容 | 位置 |
| --- | --- | --- |
| **reference only（永不上线）** | 5 张资产母版 | `docs/design-reference/phase4a/*.jpg` |
| **production（本次新建）** | 角色 2 个、场景插画 5 个、涂鸦 12 个、纸质装饰 4 个、字体 2 个 | `assets/mascots/`、`assets/homepage/`、`assets/illustrations/`、`assets/decor/`、`assets/fonts/` |
| **production（本次新建）** | 首页样式、首页纯逻辑、资产运行时 | `assets/home/homepage.css`、`home-ux.mjs`、`home-assets.mjs` |

角色与场景是**按母版风格重新绘制的矢量资产**，不是母版切图。

---

## 4. Hero 做了什么

`.sb-hero` 是一个两栏栅格叠在一张铺满的场景插画上：

1. **底**：目的地主题场景插画（`scene-*.svg`），`preserveAspectRatio="slice"` 铺满，
   因此任何视口比例下都是"照片满幅"而不是"图片居中留白"。
2. **面纱**：从左侧 96% 不透明度渐变到右侧 0% 的奶油色渐变，让左侧文字可读、右侧插画完全露出。
   底部另有一道很轻的暖光，只压在小狗与小猫身后，保证角色与背景的分离。
3. **氛围层**：按主题选 2–3 个涂鸦（太阳 / 云 / 飞机 / 浪 / 花 / 帐篷 / 相机 / 罗盘），
   全部放在右半视觉区，**绝不压标题与 CTA**。
4. **左栏**：眉标（目的地代码 + 日期区间）、超大明信片式目的地名、手绘下划线、
   一句主题情绪文案、行程元信息、交通胶囊、主 CTA + 次 CTA、四枚状态胶囊。
5. **右栏**：手绘航线 + 纸飞机 + 两端代码标签、邮戳、三张宝丽来拼贴、小狗与小猫。
6. **纸纹**：整页叠一层 5% 不透明度的纸纹（`decor/paper-grain.svg`），Hero 内另叠一层 7%。

Hero 不是"后台 header"：没有工具条、没有筛选、没有统计数字；它是一个封面。

## 5. Travel Collage

三张宝丽来，共用**同一张目的地场景插画**，靠取景不同做出三张"照片"：

- 相纸本体：`--sb-r-photo: 4px` 小圆角 + 白色相纸边 + 厚下边（宝丽来）+ 硬阴影；
- 旋转角互不相同（−3.4° / +2.6° / −1.4°），纵向错位，`z-index` 阶梯叠放；
- 前两张与第三张各压一条纸胶带；
- 下边用 `Caveat` 手写体写主题短句（如「海风很轻」「Sea you soon」）；
- hover 时摆正 + 上浮 6px，并抬到最上层；
- 取景公式写在 CSS 注释里：`translate = (50% − 目标横向占比, 50% − 目标纵向占比)`，
  `crop-b` 取前景、`crop-c` 取中景、`crop-a` 是全景。

移动端收成 2–3 张更小的、靠右叠放，不越界、不压 CTA。

## 6. Puppy 实现

- 资产：`assets/mascots/travel-puppy.svg`，200×200，手写矢量，非外部素材。
- 形象：奶油色身体 + 米黄垂耳 + 落日橘领巾 + 帆布背包 + 前爪扶着的地图（地图上有虚线路线与图钉）。
- 可动部件用类名暴露给 CSS：`.pup-breathe`（整体呼吸）、`.pup-head`（头部轻摆）、
  `.pup-eyes`（眨眼）、`.pup-tail`（摇尾）、`.pup-map`（地图轻起伏）。
- 出现位置：Hero 右下角（与小猫一起），以及「旅行状态」卡右下角作为极淡的陪伴角色。
- 与 AI / 行动语义绑定：住在行动侧（Hero 主位与状态卡）。

**动画**：blink 5.6s（93%→94% 处 56ms 快速闭合）、breathe 4.2s（`scaleY 1.016` + 1px 位移）、
tail wag 1.9s（−4° ↔ +5°）、head sway 6.4s（−2.1° ↔ +1.5°）、map 3.8s（1.6px 位移）。
全部 `transform-box: fill-box` + 精确 `transform-origin`，只动 `transform`。

## 7. Cat 实现

- 资产：`assets/mascots/travel-cat.svg`，200×160，卧姿。
- 形象：银灰虎斑 + 奶油白胸口与四爪 + 粉鼻 + 脖子上挂着的黄油色相机。
- 可动部件：`.cat-breathe`、`.cat-head`、`.cat-eyes`、`.cat-tail`、`.cat-camera`。
- 出现位置：Hero 台沿（在小狗左侧、略低）、「别错过」之外不重复出现。
- 与陪伴 / 松弛语义绑定：尺寸略小、位置略低、动画更慢，一眼看去小狗先被注意到。

**动画**：breathe 5.1s（比小狗更慢更小）、blink 6.8s 且**延迟 2.4s 与小狗错开**、
tail sway 3.4s、head/ear 7.6s 且延迟 1.2s。

角色之间只有极轻的互动暗示（小狗看地图、小猫趴在旁边），**没有做剧情动画**。

## 8. Route 做了什么

- 航线是**固定构图**（不是数据驱动的地理路线），路径常量 `STORYBOOK_ROUTE_PATH` 同时用于
  SVG `d` 和 CSS，保证两者永远一致。
- 一端是出发地代码（`SHA`，来自 `transportSegments[0].from.code`，缺省时回落地名），
  另一端是目的地代码（`PEK`，来自 `to.code` 或 `trip.destinationCode`）；两端各有一个图钉。
- **航线描绘**：`stroke-dashoffset` 从 391（路径等长）到 0，1200ms linear，延迟 620ms，一次性。
- **纸飞机**：作为 SVG 内的一个分组，用 10 个关键帧沿路径的**实际采样坐标**飞行
  （坐标由贝塞尔采样得出，误差 < 1 单位），1200ms 一次性，`animation-fill-mode: both`
  使它在延迟期间停在起点、在结束后停在终点。
- 航线盒用 `aspect-ratio: 420 / 200` 与 viewBox 同比例，因此容器不留边、
  标记点的百分比位置在任意视口下都与坐标一一对应。
- 交通信息（`上海虹桥 → 北京首都 · CA1502`）作为**一枚虚线胶囊**放在左栏元信息下方，
  不在画面上再挂一个漂浮图例。

## 9. CTA 如何处理

| 级别 | 样式 | 文案 | 行为 |
| --- | --- | --- | --- |
| Primary | 落日橘实心胶囊 + 箭头，白字 800，52px 高 | 开始今天的旅程 | 真的跳转：把行程模块的焦点日设为今天（或最近的一天）并切到「行程」 |
| Secondary | 纸白胶囊 + 描边 + ✨ | 问问旅行 AI | 打开全局 AI Copilot，并带上当前页面上下文 |
| Tertiary | 文字按钮 / 胶囊 chip | 打开行程、在地图上查看 | 板块内跳转 |

状态齐全：`hover` 抬升 2px 且箭头右移 3px；`active` 缩到 0.972；`focus-visible` 3px 落日橘描边环；
移动端 `:active` 有触感反馈（`-webkit-tap-highlight-color: transparent` + 缩放）。
Primary 是页面上唯一的落日橘大按钮；首屏还有一次性高光扫过（900ms，延迟 1000ms，仅一次）。
移动端 Primary 占满一行、Secondary 紧随其下一行，两者都在首屏内。

## 10. Motion

完整 Motion Map（15 项：动作 / duration / easing / 触发 / 次数）见 `DESIGN.md` 第 8 节。摘要：

- 首屏入场：Hero 揭示 720ms → 目的地名 +120ms → 元信息 +240ms → CTA +300ms → 胶囊 +380ms →
  拼贴 stagger 90ms（420/510/600ms）→ 航线描绘 +620ms → 邮戳 +700ms → CTA 高光 +1000ms。
  首屏总入场 1.6s 以内。
- 滚动揭示：`IntersectionObserver`（`rootMargin 0 0 -10%`，`threshold .08`），
  只播一次、不重播；节点 / 锁定行 / 状态行 / 理由行 / 灵感卡各自 50–70ms stagger，总时长 ≤ 500ms。
- 常驻循环：角色呼吸 / 眨眼 / 摇尾 / 头部、云漂移 26s、氛围浮动 15–18s、罗盘 60s 旋转。
- 硬约束：只动 `transform` / `opacity`；禁止全屏粒子、持续发光、满屏飞行物、每张卡都在弹、3D 翻转、打字机。
- **降级安全**：默认所有内容可见，只有 JS 成功挂上 `sb-motion-ready` 之后才进入"待揭示"状态；
  脚本挂了内容也不会消失。

**`prefers-reduced-motion: reduce`**：入场与滚动动效全部取消位移与缩放（只保留瞬间切换）、
角色与氛围循环全部停止、航线保持**完全可见**（`stroke-dashoffset: 0`）、
纸飞机停在终点；信息量不变（实测所有板块 `opacity = 1`）。

## 11. Destination adaptation

`home-ux.mjs#destinationTheme(trip, preferences)` 把目的地解析到 6 个主题族之一：

| 主题 | 触发示例 | 场景 | 变化内容 |
| --- | --- | --- | --- |
| `coast` | 济州、冲绳、巴厘、三亚、海岛、bali/jeju/okinawa | scene-coast | 海浪 / 太阳 / 海鸥氛围 |
| `city` | 东京、香港、上海、北京、纽约、巴黎 | scene-city | 天际线、云、飞机 |
| `mountain` | 瑞士、云南、西藏、阿尔卑斯、因特拉肯 | scene-mountain | 雪山、松、帐篷 |
| `nature` | 北海道、京都、森林、赏枫、花海 | scene-nature | 花、叶、太阳 |
| `heritage` | 故宫、寺庙、古城、京都、奈良、西安 | scene-heritage | 灯笼、花、相机 |
| `default` | 无法判断 | scene-nature | 通用远景 |

规则：**目的地的确定性高于偏好**——能判断出目的地就按目的地（去京都就是 heritage，哪怕用户爱海）；
判断不出来才参考 `preferences.interests`；再判断不出来才是 `default`。

同时变化：目的地名、主题情绪文案、三张拼贴的取景、氛围元素种类、航线两端标签、邮戳内容。
**不变化**：布局、组件、圆角、层级、动效、导航、1.1/1.2 数据契约。

实测：济州岛→coast、东京→city、Switzerland→mountain、京都→heritage、云南→mountain、
未知地方→default；北京（样本）→city。

## 12. Mobile（390px 是正式设计目标）

- 390px **不是桌面缩小**：Hero 变成竖构图 Travel Postcard Cover —— 先封面（拼贴 / 航线 / 邮戳 / 角色），
  再目的地名与文案，最后 CTA 与状态胶囊。
- 目的地名 `clamp(44px, 16vw, 62px)`；主 CTA 与次 CTA 各占满一行、均 54px 高；
  首屏（844px 高、底部导航 68px）内 Hero 高度实测 705px，`heroBottom = 777`，
  即 **Hero 完整落在首屏内**。
- 拼贴缩到 3 张更小的、靠右叠放，右边界 329 < 容器 347（不出血）；
  角色缩到 84–112px，只在右下安全区；氛围元素只保留 3 个并压到右侧。
- 实测 `documentElement.scrollWidth − clientWidth = 0`（横向溢出 0），390 / 768 / 1280 / 1440 四个断点均为 0。
- 触摸目标：CTA 54px、Day 胶囊 46px、风格按钮与更多菜单保持既有的 ≥ 44px。

## 13. 首页信息结构（落地对照）

| 阶段要求 | 落地 | 消费的数据 |
| --- | --- | --- |
| A. Hero | `.sb-hero` | `trip`、`appearance`、`transportSegments`、`constraints`、`tasks`、`sources` |
| B. Today's Journey | `.sb-journey`（story line + Day 胶囊） | `days`、`itineraryItems`、`places`、`constraints` |
| C. Why this route | `.sb-why` | `decisionLog`（当日优先，当日无记录时回退到全趟） |
| D. Locked plans | `.sb-locked` | `constraints`（`status = active`），文案固定「🔒 已锁定安排」 |
| E. Travel status | `.sb-status` | `stays`、`tasks(kind=reservation)`、复核信号 |
| F. Don't miss | `.sb-inspiration` | `places`（必去 / 有链接 / 未排入行程优先），无数据时整块不出现 |

没有 KPI dashboard；没有出现 `Hard Constraint` / `decisionLog` / `constraints` / `planningMeta` /
`Reasoning` / chain-of-thought 等字样（有测试断言）。

---

## 14. Skills Used Report

按阶段要求逐项说明（不是"参考了 xxx skill"）。

| # | Skill name | Available / Unavailable | Read instructions? | Where used | What output |
| --- | --- | --- | --- | --- | --- |
| 1 | `frontend-design`（SkillHub: `frontend-design-guidelines`） | **Available**（SkillHub 命中，评分 0.106，1976 downloads）。本地已装列表里没有，属于"可调用、未安装" | 是，完整读过 `SKILL.md`（5727 bytes） | §2 Art Direction：按它的"先定方向再写代码""禁止通用字体""禁止紫色渐变白底""必须有一个记忆点"执行 | 定下 Sunny Travel Storybook 方向；选定 Caveat + Nunito 替代 Inter/系统字体；写下"记忆点 = Destination Postcard Hero"；`DESIGN.md` 的 Art Direction 与 Do/Don't 章节 |
| 2 | `frontend-design`（SkillHub: `frontend-design-2`） | **Available**（4432 downloads） | 是，读过 `SKILL.md`（4440 bytes） | 与 #1 同职责，作为交叉校验：核对"配色要有支配色 + 尖锐强调色""空间构成要打破对称""背景要有质感而不是纯色" | 确认单主色（落日橘）策略；加入非对称拼贴与整页纸纹；确认实现复杂度要匹配视觉野心 |
| 3 | `frontend-design`（SkillHub: `anthropics-frontend-design`） | **Available**（4076 downloads） | 是，读过（内容与 #2 同源） | 交叉校验，未额外产出 | 无（避免重复采纳） |
| 4 | `design-md` | **Unavailable**（SkillHub 搜 "design md design document" 无等价命中，最高分 0.05 且为无关 skill） | — | 该职责由阶段规格 §25 直接定义 | 按阶段规格手写 `DESIGN.md`：Art Direction / Color / Typography / Spacing / Radius / Shadow / Photo treatment / Illustration / Mascots / Motion（含 Motion Map）/ Destination adaptation / Homepage hierarchy / Mobile / Do-Don't |
| 5 | `motion-design-skill` | **Unavailable**（无同名或等价命中） | — | 职责由 #6 的 ui-animation 承担 | — |
| 6 | `ui-animation`（SkillHub: `travisjneuman-claude-ui-animation`） | **Available**（16722 bytes） | 是，完整读过 | §10 Motion 与 `DESIGN.md` 的 Motion Map：直接采用它的时长分级（100/150/250/400/600ms → 本项目 140/200/300/460/720ms）、easing 语义（入场 ease-out、屏内 ease-in-out、可爱反馈 spring）、"stagger 30–50ms/项、总时长 ≤500ms"、"只用 GPU 合成属性"、"列表入场用 translateY + opacity"、以及它的 reduced-motion 与 WCAG 2.2.2/2.3.1/2.3.3 检查表 | `--sb-t-*` / `--sb-ease-*` token 体系；15 项 Motion Map；`prefers-reduced-motion` 分支（动画关闭 + 内容保可见 + 航线保持可见）；动效性能约束写进 `DESIGN.md` |
| 7 | `motion-ref-skill` | **Unavailable**（SkillHub 搜 "motion reference pattern" 无等价命中） | — | 职责由 #6 的 ui-animation 的 pattern 章节承担 | — |
| 8 | `svg-character-animator` | **Unavailable**（SkillHub 搜 "svg character animation rig" 无命中） | — | 该职责由本项目自建方案承担 | 手工设计"分部件命名 + CSS 驱动"的角色动画契约：SVG 内用 `.pup-eyes` / `.pup-tail` / `.cat-breathe` 等类名暴露部件，CSS 用 `transform-box: fill-box` + 精确 `transform-origin` 驱动眨眼 / 摇尾 / 呼吸 / 头部轻摆；两只角色共用同一套 `@keyframes`，靠 duration 与 delay 做出性格差异 |
| 9 | `animations` / `ui-animation`（SkillHub: `ui-animation` 简诗 AI 版） | **Available**（17236 bytes，但内容与 #6 同源，属派生） | 是，读过用于确认没有额外方法论 | 未单独采纳 | 无（避免重复） |
| 10 | `GSAP related skills` | **Unavailable**（SkillHub 无 GSAP 专项 skill） | — | 未使用 GSAP | 本项目零运行时依赖，`package.json` 无 dependencies；GSAP 的适用场景（复杂 sequence / SVG 沿路径 / 复杂 stagger）全部用 CSS + WAAPI 等价能力实现：沿路径飞行用 SVG 内分组 + 关键帧采样坐标，stagger 用 `nth-child` 延迟，航线描绘用 `stroke-dashoffset` |
| 11 | `travelpack-phase-upgrade`（本项目自带） | **Available**（本地已安装） | 是，作为本阶段执行规程 | 全程：预检基线 → 新分支 → 加法式演进 → 新 sample → 测试 → 浏览器验收 → 文档 → 收尾 | 基线 56 pass / audit safe；分支 `phase4a-homepage-visual`；`styleId` 加法扩展；新增验收样本；20 个新测试；两轮浏览器验收；`PHASE_4A_HANDOFF.md` + 本报告 |
| 12 | `agent-browser`（官方插件） | **Available** | 是 | §15 浏览器验收：`set viewport` / `open` / `wait` / `eval` / `screenshot --full` / `click` / `errors` / `set media light reduced-motion` | 全部验收数据与 15 张截图；`prefers-reduced-motion` 的计算样式验证；横向溢出定位（用 `getBoundingClientRect` 遍历找出被 Day 胶囊撑宽的栅格列） |
| 13 | `find-skills`（官方插件） | **Available** | 是 | 在写 CSS 之前检索是否有可用的设计 / 动效 skill | SkillHub 命中清单（frontend-design ×5、ui-animation ×2），以及"design-md / motion-ref / svg-character-animator / GSAP 无等价 skill"的结论 |

**关于安装策略的说明（重要）**：上面 1–3、6、9 这五个 skill 是从 SkillHub 取回并在临时目录读取
指令后遵循其方法执行的，**没有安装进 `~/.workbuddy/skills/`**。原因是它们都是纯 markdown
（无脚本、无依赖），读取指令即可完整交付方法论；而安装动作会带来额外副作用，且会让后续会话的
skill 列表被这些第三方包污染。检索与下载记录、文件大小逐项列在上表中，可复核。

---

## 15. 外部 UI 灵感

阶段允许联网检索外部 UI 灵感。**本次没有抓取任何外部站点的代码或模板**：设计完全从收到的 5 张
资产母版与 `DESIGN.md` 的 token 体系推导而来。明确说明如下，避免"声称参考但实际没有"：

| 站点 | 是否使用 | 说明 |
| --- | --- | --- |
| 21st.dev（Hero / Gallery / Collage / Bento / CTA） | **未使用** | 母版已提供完整的 Hero + Collage 构图，外部组件会增加"AI 模板感"风险 |
| Aceternity UI（Cards / Timeline / Reveal / Carousel） | **未使用** | 其 Reveal 风格是暗色 + 光效，与本 Art Direction 冲突；滚动揭示用原生 `IntersectionObserver` |
| Magic UI（Animated List / Micro Interaction） | **未使用** | 同上 |
| React Bits（Fade / Scroll Reveal / Animated Content） | **未使用** | 技术栈不符（本项目 vanilla + 零依赖） |
| Uiverse（Button / Badge / Loading） | **未使用** | 按钮与胶囊按母版的落日橘 + 纸白胶囊重绘 |
| yuanpu.cc（手账 / 情绪化旅行 UI） | **未使用** | 母版的"手写体 + 宝丽来 + 纸胶带"已经就是这类语言 |
| MotionSites（Hero motion / landing motion） | **未使用** | 动效 spec 来自 ui-animation skill 的时长 / easing 体系 |

唯一的外部网络访问是：用 `find-skills` 检索 skill 市场，以及下载两个 OFL 字体文件
（Caveat / Nunito 的 latin 子集，已自托管并记入 `THIRD_PARTY_NOTICES.md`）。

---

## 16. dependencies

- **前端运行时依赖：0**（`package.json` 仍然只有 `scripts`，没有任何 `dependencies` / `devDependencies`）。
- 新增资产：2 个 woff2 字体（116KB）+ SVG 资产（约 140KB）。
- 没有引入 GSAP、没有任何 CDN 请求；`DOMAIN` 级新增外部请求为 **0**（有测试断言首页样式与资产
  运行时里不出现 `http://` / `https://`）。
- 技术栈未变：vanilla HTML / CSS / JS + ES Modules，无构建系统，无 React / Vue / Vite / Next.js。

---

## 17. tests

```
npm run check
→ audit: { "safe": true, "filesScanned": 152 }
→ tests: 76 pass / 0 fail / 0 skipped
```

- Phase 0–3 的 **56 个测试全部保持通过**（`tests/skill.test.mjs`、`skill-intelligence.test.mjs`、
  `travelpack-1.2.test.mjs`、`phase3-product-ux.test.mjs`）。
- 新增 `tests/phase4a-homepage.test.mjs`：**20 个测试**，覆盖
  ① `styleId` 加法的双向兼容（旧值语义不变 / 新值可用 / 未知值仍被拒）；
  ② `styleLabels` 与 validator 枚举不会漂移；
  ③ 目的地主题判定与偏好回落；
  ④ 所有被引用的生产资产在磁盘上真实存在、角色 SVG 真的暴露了可动部件；
  ⑤ 首页只加载本地资产（无外部域名）；
  ⑥ 焦点日选择、当日/全趟两级理由回退、无数据时整块不出现；
  ⑦ 「已锁定安排 / 旅行状态 / 灵感卡」的用户语言与长度上限；
  ⑧ 首页 markup 的完整结构（双 CTA、航线路径同源、3 张拼贴、6 个板块）；
  ⑨ 可见文案不出现契约字段名；
  ⑩ 恶意目的地名 / 标题被转义（XSS 用例）；
  ⑪ **1.1 数据渲染首页不报错、不出现 undefined、缺字段板块整体消失**；
  ⑫ **缺资产时退化为主题色面但 CTA 仍可用**；
  ⑬ 六套旧 style 与 Phase 3 概览结构没被移除、`transportPanelSection` 仍在；
  ⑭ storybook 是新默认且在风格弹窗里可选、一级导航仍为 5 项；
  ⑮ `reduced-motion` 分支关掉了该关的动效且内容保可见、动效不碰布局属性；
  ⑯ storybook 验收样本可校验、可构建预览，且整目录拷贝带上了全部首页资产。

---

## 18. 浏览器验收

验收对象：`travelpack.sample.storybook.json`（北京，慢慢走）经 `build_static_preview --ui-review`
构建、`serve_ui_preview` 以 HTTP 提供的真实页面。**禁止用 `file://` 或文件查看器**，实际用的是
真实 Chromium。

| 检查项 | 结果 |
| --- | --- |
| Console 严重错误 | **0**（`agent-browser errors` 无输出；仅有模板既有的 `favicon.ico` 404 现象） |
| 横向溢出 390 / 768 / 1280 / 1440 | **0 / 0 / 0 / 0** |
| 五个一级模块（概览/行程/准备/记账/资料） | 全部正常渲染 |
| 六套旧风格 | 全部仍是 Phase 3 概览（`classic = true, sbHome = false`），溢出 0 |
| Day 胶囊换天 | day-22 → 标题变「接下来的一天」，节点数随数据变化 |
| Primary CTA | 切到「行程」并把焦点日设为 09/20（今天），`data-view-tab = itinerary` |
| Secondary CTA | 打开 AI Copilot，上下文为「概览 · 抵达北京（2026-09-20） · 北京首都国际机场 T3 · 旅行进行中」 |
| 深色模式 | 背景 `rgb(36,29,23)`，暖色手账而非黑色赛博 |
| 字体加载 | `document.fonts.check('700 40px Caveat')` = true，Nunito = true |
| `prefers-reduced-motion` | 全部 `animationName = none`；航线 `stroke-dashoffset = 0`（保持可见）；纸飞机停在终点（`translate(392px, 38px)`）；所有板块 `opacity = 1` |
| 390px 首屏 | Hero 705px，`heroBottom = 777` < 底部导航 `top = 776`；主/次 CTA 均在首屏内 |

截图见 `docs/screenshots/phase4a/`（15 张 + 总览长图 + 逐张说明 README）。

---

## 19. 修改 / 新增的文件清单

**新增**

```
DESIGN.md
PHASE_4A_HANDOFF.md
报告/phase4a-report.md
tests/phase4a-homepage.test.mjs
hks-travel-skill/assets/frontend-template/assets/home/home-ux.mjs        (615 行)
hks-travel-skill/assets/frontend-template/assets/home/home-assets.mjs    (84 行)
hks-travel-skill/assets/frontend-template/assets/home/homepage.css       (986 行)
hks-travel-skill/assets/frontend-template/assets/mascots/travel-puppy.svg
hks-travel-skill/assets/frontend-template/assets/mascots/travel-cat.svg
hks-travel-skill/assets/frontend-template/assets/homepage/scene-{coast,city,mountain,nature,heritage}.svg
hks-travel-skill/assets/frontend-template/assets/illustrations/*.svg     (12 个)
hks-travel-skill/assets/frontend-template/assets/decor/*.svg             (4 个)
hks-travel-skill/assets/frontend-template/assets/fonts/*.woff2           (2 个)
hks-travel-skill/assets/frontend-template/travelpack.sample.storybook.json
docs/design-reference/phase4a/                                           (5 张母版 + README)
docs/screenshots/phase4a/                                                (15 张 + 长图 + README)
```

**修改**

```
hks-travel-skill/assets/frontend-template/index.html          风格弹窗新增 storybook；theme-color
hks-travel-skill/assets/frontend-template/app.css             顶部 @import 首页样式
hks-travel-skill/assets/frontend-template/app.mjs             首页分派 / 资产预取 / 滚动揭示 / CTA 与 Day 事件
hks-travel-skill/assets/frontend-template/protocol.mjs        导出 supportedStyleIds 并用于校验
hks-travel-skill/assets/backend-template/worker.js            styleId 白名单加入 storybook
hks-travel-skill/SKILL.md                                     六种 → 七种风格，指向 DESIGN.md
hks-travel-skill/references/travelpack-1.1.md                 styleId 取值（加法）
hks-travel-skill/references/travelpack-1.2.md                 styleId 取值说明
hks-travel-skill/references/product-contract.md               风格清单加入 storybook
hks-travel-skill/references/product-ux-v1.md                  Phase 4A 结论
README.md / README_EN.md                                      六种 → 七种风格
THIRD_PARTY_NOTICES.md                                        Caveat / Nunito 的 OFL 声明
```

**刻意未改动**：`travelpack.sample.json`（1.1 长期回归样本）、`travelpack.sample.1.2.json`（1.2 回归样本）、
`scripts/audit-public-tree.mjs`、`hks-travel-skill/references/travelpack-1.1.md` 的既有条款、
`docs/screenshots/` 根目录 Phase 0 的三张图、以及 Phase 0–3 的历史报告与交接文档。

---

## 20. known issues

1. **中文目的地名用不了手写体**：Caveat 不含 CJK 字形，中文只能回落系统字体，因此额外加了
   手绘下划线来补手写气质。要真正的中文手写体需引入中文 web font（数 MB，需单独评估）。
2. **风景是矢量插画而非写实照片**：契约没有图片字段。图框 API（`sb-postcard-scene` /
   `sb-inspire-scene`）已预留真实照片替换位，将来契约加法扩展时版式不变。
3. **取景百分比与场景插画强耦合**：`sb-crop-a/b/c` 的目标是中景 / 前景，替换场景图时要重新对景；
   换算公式写在 CSS 注释里。
4. **场景 SVG 内联多次会产生重复的渐变 `id`**：同内容同定义，浏览器取第一个，视觉无差异；
   未引入 id 前缀方案（会增加运行时复杂度而收益为零）。
5. **首页只在 `storybook` 下渲染**：其余六套 style 仍是 Phase 3 概览。这是刻意的边界，
   目的是不替换 `aviation` 的票纸构图（产品契约要求）。
6. **动效未做录屏**：验收方式是逐项读取计算样式与截图，不是观看动画。
7. `报告/` 与 `PHASE_4A_HANDOFF.md` 里的截图引用使用仓库内相对路径，不含本机绝对路径。

---

## 21. 本阶段明确没做的事

- 没有改行程模块、AI Copilot、准备 / 记账 / 资料的任何版式（Phase 4B / 4C / 4D 范围）。
- 没有做全站视觉改造。
- 没有合并 `main`。
- 没有改动任一既有 sample 文件。
- 没有引入任何 npm 依赖、外部 CDN 或第三方 JS 库。
- 没有把资产母版用作页面素材。
