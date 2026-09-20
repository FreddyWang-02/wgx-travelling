# DESIGN.md · Sunny Travel Storybook

AI Travel Copilot 的视觉真相（design source of truth）。Phase 4A 建立，后续所有页面
（行程 / Copilot / 次级页面）都以本文为准，而不是各自临场发挥。

- 生效范围：`appearance.styleId = "storybook"`（Phase 4A 新增，首页唯一验收风格）。
- 与既有六套 style 的关系：六套 style 的 token 与结构**原样保留**，互不影响。
  storybook 是加法，不是替换。
- 资产母版：`docs/design-reference/phase4a/`（**仅参考，永不上线**）。

---

## 1. Art Direction

**Sunny Travel Storybook** —— 一本晒过太阳的旅行手账：暖奶油纸张、落日橘的印章、
手写的目的地名、贴在页面上的宝丽来与纸胶带、一只背着包的小狗和一只趴着的小猫。

| 维度 | 定义 |
| --- | --- |
| Sunny | 暖奶油底 + 落日橘主色 + 黄油黄高光；永不冷灰 |
| Scenic | 每个目的地有自己的风景插画层（海岸 / 城市 / 山野 / 自然 / 人文） |
| Playful | 手绘涂鸦、贴纸、轻微旋转、纸胶带 |
| Illustrated | 图像语言是**矢量插画**，不是写实照片 |
| Animated | 低频、轻、自然的动效；角色活着，但页面不吵 |
| Warm | 全部灰阶都带暖偏（棕灰，而非蓝灰） |
| Editorial | 有明确主标题 / 副标题 / 眉标的杂志式层级 |
| Travel-first | 第一屏先给"想去"，再给"怎么操作" |
| Storybook | 纸、胶带、邮戳、明信片的地理隐喻是统一的 |
| Joyful | 情绪价值来自细节密度，而不是饱和度 |

### 记忆点（唯一一个，必须记住）

**Destination Postcard Hero**：一张盖着邮戳、贴着纸胶带、写着目的地名（手写体）的
风景明信片，旁边坐着旅行小狗和小猫，一条虚线航线从明信片里飞出去。
这是用户截图时会截的那一屏。

### 明确不做（Rejected）

Apple 风 / 冷淡极简 / SaaS Dashboard / 后台管理台 / 大量灰白矩形卡片 /
黑色赛博 / 蓝紫霓虹 AI 风 / 大量 Glassmorphism / 白底 + 圆角卡片就交差。

---

## 2. Color

语义 token（`assets/home/homepage.css` 中定义，`--sb-` 前缀，只作用于 storybook）。

| Token | 值 | 用途 |
| --- | --- | --- |
| `--sb-paper` | `#fdf8f0` | 页面底 / 纸张 |
| `--sb-paper-2` | `#f6ecdc` | 次级面 / 内页 |
| `--sb-card` | `#fffdf8` | 卡片面 |
| `--sb-ink` | `#3a3229` | 正文（暖棕，非纯黑） |
| `--sb-ink-soft` | `#776a5b` | 次要文字 |
| `--sb-line` | `#e6d8c2` | 分隔线 / 描边 |
| `--sb-sunset` | `#ef7548` | **主色**：Primary CTA、印章、路线 |
| `--sb-sunset-deep` | `#d95c30` | 主色 hover / press |
| `--sb-sunset-soft` | `#ffe6da` | 主色浅底 |
| `--sb-peri` | `#6d80d6` | **次色**：AI CTA、AI 相关 |
| `--sb-peri-soft` | `#e9ecfb` | 次色浅底 |
| `--sb-sage` | `#9cbb8e` | 自然 / 成功 |
| `--sb-butter` | `#f2cd6b` | 高光 / 太阳 / 强调 |
| `--sb-sky` | `#a5d3e7` | 天空 / 海 |
| `--sb-sand` | `#e8d3b4` | 沙滩 / 纸边 |
| `--sb-ok` / soft | `#4e9a6b` / `#e3f1e7` | 已确认 |
| `--sb-warn` / soft | `#c98a2e` / `#fbefd9` | 待复核 |
| `--sb-info` / soft | `#5b7fc7` / `#e5ecf9` | 已锁定 |
| `--sb-danger` / soft | `#c4574e` / `#fbe6e3` | 需要处理 |

规则：
1. 一个界面**只有一个主色**（sunset），其余都是它的陪衬或语义色。
2. 语义色只用于状态胶囊，不得用于大面积背景。
3. 深色模式：`--sb-paper` → `#1e1a16` 一族，文字转奶油白；主色提亮为 `#ff8a5e`。
   深色下仍是"夜晚的手账"，不是黑色赛博。

---

## 3. Typography

三档字体，各司其职，**不混用**：

| 角色 | Token | 字体栈 | 用途 |
| --- | --- | --- | --- |
| Script（手写） | `--sb-font-script` | `Caveat` → 系统手写 → CJK | 目的地名、副标题、贴纸标注 |
| Body | `--sb-font-body` | `Nunito` → PingFang SC → 系统 | 正文、按钮、表单 |
| Stamp（印章） | `--sb-font-stamp` | Nunito / system，大写 + 字距 | 邮戳、时间戳、眉标 |

`Caveat` 与 `Nunito` 是自托管 latin 子集（`assets/fonts/*.woff2`，OFL），
**不请求任何外部域名**。中文回落到系统 CJK 字体栈——中文正文不用手写体（可读性优先）。

层级（fluid，clamp）：

| 层 | 尺寸 | 字体 | 备注 |
| --- | --- | --- | --- |
| Destination | `clamp(52px, 13vw, 132px)` | script | 首页第一眼 |
| Display | `clamp(30px, 5.4vw, 46px)` | body 800 | 板块主标题 |
| Section | `clamp(19px, 2.6vw, 23px)` | body 800 | 卡片标题 |
| Body | `14px / 1.75` | body | 正文 |
| Micro | `10–11px` + `letter-spacing .14em` | stamp | 眉标 / 胶囊 |

字号规则：目的地名可以极大，正文一律不超过 15px。反差本身就是设计。

---

## 4. Spacing / Radius / Shadow

**Spacing**（4px 基准）：`--sb-s1:4 --sb-s2:8 --sb-s3:12 --sb-s4:16 --sb-s5:22 --sb-s6:30 --sb-s7:42 --sb-s8:60`

**Radius**：卡片与明信片**故意不统一**——这是纸质拼贴的语言。

| Token | 值 | 用途 |
| --- | --- | --- |
| `--sb-r-card` | `18px` | 主要卡片 |
| `--sb-r-photo` | `4px` | 宝丽来相纸（要像纸，不能圆） |
| `--sb-r-pill` | `999px` | 按钮 / 胶囊 |
| `--sb-r-tape` | `2px` | 纸胶带 |

**Shadow**：只有两级，都带暖偏，且必须"有厚度"而不是发光。

- `--sb-shadow-card: 0 10px 24px -14px rgba(90,62,38,.45)`
- `--sb-shadow-photo: 0 14px 26px -12px rgba(90,62,38,.5)`
- 纸片用**硬阴影**（`4px 5px 0` 型）制造"贴上去"的物理感。
- 禁止玻璃拟态、禁止彩色 glow。

---

## 5. Photo treatment

**关键约束（必须在后续 Phase 记住）**：TravelPack 1.2 契约里**没有任何图片字段**
（`assets` 只是附件登记，`materials.url` 是外链）。因此首页的图像系统是：

1. **默认：矢量风景插画**（`assets/homepage/scene-*.svg`）——按目的地主题族选择，
   完全离线、可换色、可动画、可无损缩放。这是"插画明信片"，不是写实照片。
2. **可选：真实照片**。图框 API 已预留 `data-photo` 位；将来若契约新增图片字段
   （Phase 4B/5 的加法演进），真实照片替换插画即可，版式不变。

照片/插画的统一处理（"这张纸被贴在页面上"）：
- 白色相纸边（`padding` + `--sb-card`），`--sb-r-photo` 小圆角；
- 轻微旋转 `-2.4° ~ +2.2°`（同一屏内角度不重复，符号不统一）；
- 纸胶带压在角上（`decor/tape-*.svg`）或邮戳压边；
- 叠加极轻的纸纹（`decor/paper-grain.svg`，透明度 ≤ 6%）；
- 不做黑白、不做高对比滤镜——颜色本身就是"晴天"。

---

## 6. Illustration

三层，全部矢量、全部 `currentColor` 友好：

| 层 | 目录 | 规则 |
| --- | --- | --- |
| 场景插画 | `assets/homepage/scene-*.svg` | 5 个目的地主题族，分层可动（云 / 浪 / 光） |
| 手绘涂鸦 | `assets/illustrations/*.svg` | 单线墨色，`stroke-width` 统一 2.2，圆头 |
| 装饰纸品 | `assets/decor/*.svg` | 邮戳 / 纸胶带 / 纸纹 / 压制花 |

**密度原则：Rich, not messy.** 首页同屏可见的独立手绘元素 **≤ 8 个**，
其中会动的 **≤ 3 个**。多出来的宁可放进"旅行灵感"区。

禁止：把资产母版整张当背景、把母版里的元素一股脑铺到首页、使用风格不统一的网上素材。

---

## 7. Mascots

统一风格的两只旅行角色，均为手写 SVG（`assets/mascots/`），**不使用外部素材**。

| | Travel Puppy（主） | Travel Cat（次） |
| --- | --- | --- |
| 形象 | 奶油色 + 米黄垂耳，落日橘领巾，帆布背包 | 银灰虎斑 + 奶油白胸口，奶油橘相机 |
| 性格 | 主动、好奇、负责行动 | 松弛、陪伴、负责可爱 |
| 语义 | 挂在 **AI CTA / 今日行程 / 行动** | 挂在 **陪伴 / 天气 / 休息 / 次级互动** |
| 出现位置 | Hero 右下角（看地图）、AI 理由卡 | Hero 台沿（趴着）、旅行状态卡 |
| 动画 | blink + breathe + tail wag（+ map look） | blink + breathe + tail sway（+ ear twitch） |

规范：
- 同一屏内两只都要出现，但**小狗一定比小猫先被看到**（尺寸 / 位置 / 对比度）。
- 角色之间允许极轻互动（小狗看地图，小猫在旁边趴着），**不做剧情动画**。
- 角色绝不遮挡文字与 CTA：Hero 内位置固定在右侧安全区。
- 线稿粗细与 `illustrations/` 一致，保证"同一个插画师画的"。

---

## 8. Motion

动效原则来自 ui-animation skill：**动画必须有用**（引导注意 / 表达关系 / 反馈 / 状态），
不是装饰。全部走 `transform` / `opacity`（GPU 合成），不碰 `width/height/top/left`。

### Token

```
--sb-t-micro : 140ms   按钮反馈
--sb-t-quick : 200ms   hover / 小位移
--sb-t-base  : 300ms   常规过渡
--sb-t-slow  : 460ms   板块入场
--sb-t-reveal: 720ms   Hero 揭示
--sb-ease-out   : cubic-bezier(.22,.75,.28,1)     入场
--sb-ease-in-out: cubic-bezier(.45,.05,.25,1)     屏内变化
--sb-ease-spring: cubic-bezier(.34,1.42,.42,1)    可爱反馈（少量）
```

### Homepage Motion Map

| # | 元素 | 动作 | duration | easing | 触发 | 次数 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Hero 明信片 | opacity 0→1 + scale .965→1 | 720ms | ease-out | 首屏 | 一次性 |
| 2 | 目的地名 | opacity + translateY 16→0 | 460ms（延迟 120ms） | ease-out | 首屏 | 一次性 |
| 3 | Hero 元信息 / 状态 | translateY 12→0，逐行 60ms stagger | 300ms | ease-out | 首屏（延迟 260ms） | 一次性 |
| 4 | 拼贴小图 | 旋转归位 + translateY 22→0，stagger 90ms | 460ms | ease-spring | 首屏（延迟 380ms） | 一次性 |
| 5 | 航线（SVG） | `stroke-dashoffset` 描绘 | 1200ms | linear | 首屏（延迟 620ms） | 一次性 |
| 6 | 航线上的小飞机 | 沿路径位移 + 轻微上下浮动 | 1200ms / 循环 3.4s | linear / ease-in-out | 首屏 | 一次 + 低频循环 |
| 7 | CTA 主按钮 | hover `translateY(-2px)` + 阴影加深；press `scale(.97)` | 140ms | ease-out | 悬停 / 按下 / 触摸 | 交互 |
| 8 | Primary CTA 首次 | 一次性高光扫过 | 900ms | ease-out | 首屏（延迟 1000ms） | 一次性 |
| 9 | Travel Puppy | blink 5.6s / breathe 4.2s / tail 1.9s | — | ease-in-out | 循环 | 无限（轻） |
| 10 | Travel Cat | blink 6.8s（错开）/ breathe 5.1s / ear 7.2s | — | ease-in-out | 循环 | 无限（轻） |
| 11 | Today's Journey 节点 | 滚动进入 translateY 18→0 + 轴线描绘 | 300ms / stagger 70ms | ease-out | IntersectionObserver | 一次性 |
| 12 | Why this route | 卡片升起 + ✨ 微缩放 | 300ms | ease-out | 滚动进入 | 一次性 |
| 13 | Locked plans | 逐行 50ms stagger | 200ms | ease-out | 滚动进入 | 一次性 |
| 14 | Travel status / 灵感图 | 逐项 60ms stagger | 300ms | ease-out | 滚动进入 | 一次性 |
| 15 | 云 / 浪 / 光 | 极慢漂移 | 9–26s | ease-in-out | 常驻 | 无限（低频） |

### 硬性边界

- 首屏总入场 ≤ 1.6s；任何一次入场 stagger 总时长 ≤ 500ms。
- **禁止**：全屏粒子、持续发光、满屏飞行物、每张卡片都在弹、到处 3D 翻转、到处打字机。
- 前景角色的循环动效必须肉眼"几乎注意不到"——要像呼吸，不像 GIF。
- 滚动进入的动画只播一次，绝不来回重播。

### `prefers-reduced-motion: reduce`

- 所有入场/滚动动画取消位移与缩放：**只保留 opacity 瞬间切换**。
- 角色循环全部停止（保持静止的可爱姿势）。
- 云 / 浪 / 光 / 飞机的持续动画停止。
- 信息量不变：任何"靠动画才出现的内容"必须静态可见。

---

## 9. Destination adaptation

固定的是系统，变化的只有"目的地主题层"。**不换 UI，只换主题层。**

`ux.mjs#destinationTheme(trip, preferences)` 从目的地名与偏好推导出一个主题：

| 主题 | 触发信号（示例） | 场景 | 主色偏移 | 氛围元素 |
| --- | --- | --- | --- | --- |
| `coast` | 海 / 岛 / 湾 / 冲绳 / 济州 / Bali / Santorini | 海岸 + 礁石 + 落日 | sunset + sky | 浪、太阳、海鸥 |
| `city` | 东京 / 香港 / 纽约 / 上海 / Paris / 首尔 | 天际线 + 街道 + 车灯 | sunset + peri | 路灯、云、飞机 |
| `mountain` | 瑞士 / 云南 / 阿尔卑斯 / 高原 / Interlaken | 层叠山脊 + 湖 | sage + sky | 雪山、松、云 |
| `nature` | 森林 / 秋天 / 赏枫 / 北海道 / 京都 | 树林 + 花田 | sage + butter | 花、叶、太阳 |
| `heritage` | 故宫 / 寺庙 / 古城 / 京都 / 西安 | 屋檐 + 塔 + 灯笼 | sunset + sand | 灯笼、塔、花 |
| `default` | 无法判断 | 通用远景（复用 nature 的暖阳丘陵场景） | sunset + sky | 太阳、云、纸飞机 |

同时变化：**目的地名、主题副标题（一句情绪文案）、拼贴小图的三种构图、
氛围元素种类、航线两端标签、邮戳上的城市与日期**。
不变化：布局、组件、圆角、层级、动效、导航。

`preferences.interests` 参与加权（`coast`/`nature`/`hiking`/`culture` 等），
但**目的地的确定性高于偏好**——去京都就是 heritage，哪怕用户爱海。

---

## 10. Homepage hierarchy

第一屏 `Hero` 只回答两个问题：**去哪** + **现在点哪里**。

```
A. Hero（明信片）
   ├ 眉标：DESTINATION CODE · 日期区间
   ├ 目的地名（script，极大）
   ├ 主题副标题（一句情绪文案）
   ├ 邮戳（城市 / 日期 / 日数）
   ├ 拼贴小图 ×3（旋转、纸胶带）
   ├ 航线 SVG（虚线 + 纸飞机）
   ├ 角色：小狗（右下，看地图）+ 小猫（台沿，趴着）
   ├ 状态胶囊：tripStatus / 已锁定 / 待复核
   └ CTA：Primary「开始今天的旅程」＋ Secondary「✨ 问问旅行 AI」
B. Today's Journey      今日路线 story line（时间 → 地点 → 一句话）
C. Why this route       消费 decisionLog，用户语言，不出现字段名
D. Locked plans         消费 constraints（active），统一文案「🔒 已锁定安排」
E. Travel status        酒店 / 预约 / 天气建议复核（消费 stays / tasks / sources）
F. Don't miss           旅行灵感图（视觉空间允许时才出现，可选）
```

**禁止**：KPI dashboard、指标大数字墙、字段名直接上屏
（`decisionLog` / `constraints` / `Hard Constraint` / reasoning 一律不得出现）。

板块顺序即优先级；B 之后是"解释"，F 是"加分项"。空间不足时先砍 F，再砍 C，
**A / B / D / E 永不可砍**。

---

## 11. CTA system

| 级别 | 样式 | 文案 | 位置 |
| --- | --- | --- | --- |
| Primary | 落日橘实心胶囊 + 箭头，白字 800 | 开始今天的旅程 | Hero 主位 |
| Secondary | 纸白胶囊 + 描边 + ✨ | 问问旅行 AI | Hero 主 CTA 右侧 |
| Tertiary | 文字按钮 / 胶囊 chip | 打开行程、在地图上看 | 板块内 |

规则：
- Primary 是页面上**唯一**的落日橘大按钮，别处不得抢。
- 状态齐全：`hover`（抬升 + 阴影）、`active/press`（缩到 .97）、
  `focus-visible`（3px 落日橘描边环，offset 2px）、移动端 `:active` 有触感反馈。
- 触摸目标 ≥ 44×44。禁止把主 CTA 做成透明文字链接。
- 移动端：Primary 占满一行；Secondary 紧随其下（仍是一行）。

---

## 12. Mobile（390px 为正式设计目标）

390px **不是桌面缩小的结果**，是另一套构图。

- Hero 变成 **Travel Cover / Postcard Cover**：明信片竖过来，目的地名分两行，
  拼贴小图减到 2 张并退到右下角叠放，航线缩短。
- 角色缩到 62–72px，**只出现在安全区**（右下 / 底部），绝不压文字与 CTA。
- CTA：Primary 整行占满，Secondary 整行或半行，位于首屏可见范围内。
- 所有横向滚动容器（如果有）必须 `scroll-snap` + 隐藏滚动条；
  页面本身 `overflow-x` 必须为 0。
- 字号不缩到 12px 以下；行高 ≥ 1.6；点击区 ≥ 44px。
- 底部导航是 `fixed`，要为它留出 `padding-bottom` 与 `safe-area-inset`。

---

## 13. Do / Don't

**Do**
- 先定方向再写代码；每个板块先问"这一屏最想让人看到什么"。
- 用纸、胶带、邮戳、手写体建立"这是一本手账"的物理隐喻。
- 让角色轻微地活着；让动效服务于理解。
- 让目的地决定主题层；让系统保持不变。
- 390px 与桌面各自构图，各自验收。

**Don't**
- 不要灰白矩形卡片堆叠，不要 SaaS Dashboard 的指标墙。
- 不要玻璃拟态、霓虹 glow、紫蓝渐变。
- 不要把资产母版当页面素材；母版只提供设计语言。
- 不要为了"用了动效"而加动效；不要满屏都在动。
- 不要在 UI 上出现契约字段名或 AI 推理过程。
- 不要用一个写死的目的地（济州岛只是 sample）做视觉。

---

## 14. 资产清单（生产）

| 路径 | 内容 | 用途 |
| --- | --- | --- |
| `assets/home/homepage.css` | storybook token + 首页布局 + 动效 | 唯一首页样式来源 |
| `assets/home/home-assets.mjs` | 内联涂鸦 SVG、场景/角色加载与缓存 | 资产运行时 |
| `assets/mascots/travel-puppy.svg` | 主角色（分部件可动） | Hero、AI 理由 |
| `assets/mascots/travel-cat.svg` | 次角色（分部件可动） | Hero、状态卡 |
| `assets/homepage/scene-*.svg` | 5 个目的地主题族风景 | Hero + 拼贴 |
| `assets/illustrations/*.svg` | 手绘涂鸦 | 氛围装饰 |
| `assets/decor/*.svg` | 邮戳 / 胶带 / 纸纹 | CSS 背景，纸感 |
| `assets/fonts/*.woff2` | Caveat / Nunito latin 子集（OFL） | 字体 |
| `docs/design-reference/phase4a/*.jpg` | 5 张资产母版 | **仅参考** |

### 资产加载方式（不要改坏）

`assets/home/home-assets.mjs` 在首次渲染前把角色与场景 SVG **取回并内联到 DOM**，原因是只有同文档的
SVG 才能被 CSS 分部件驱动（眨眼 / 尾巴 / 呼吸），也才能被 `prefers-reduced-motion` 统一接管。
取回是单例的（切 Day、切 Tab 不会重复请求），失败时不阻塞渲染——版式退化为主题色面，CTA 仍然可用。
涂鸦是以 `currentColor` 描边的内联片段；邮戳 / 纸胶带 / 纸纹则作为 CSS `background-image` 使用，
因此那三个文件里的颜色是**写死的**（外部 SVG 文档不继承页面的 `currentColor` 与 CSS 变量）。
