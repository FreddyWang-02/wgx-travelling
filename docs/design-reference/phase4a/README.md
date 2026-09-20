# Phase 4A 视觉资产母版（仅参考）

本目录存放 Phase 4A 收到的 5 张 **Art Direction / Asset Master Board**。

> **这些文件永远不会被产品页面加载。**
> 它们是"设计语言"的来源，不是页面素材。禁止把整张母版当网页背景、当首页图片，
> 或把母版里的元素一股脑铺到首页。

| 文件 | 母版内容 | 从中提取了什么 |
| --- | --- | --- |
| `01_travel_asset_board.jpg` | 目的地 Hero 图（济州 / 东京 / 瑞士 / 香港 / 云南）、旅行角色 7 态、UI 元素（按钮 / 邮戳 / 标签 / 卡片）、手绘元素与图标、邮戳与贴纸、背景纹理 | 目的地自适应 Hero 的做法、按键层级（落日橘主 / 蓝紫次 / 描边幽灵）、邮戳与贴纸语言、纸张纹理 |
| `02_mascot_states_board.jpg` | "Sunny Travel Journal" 手写标题、宝丽来拼贴、目的地标签列、主角旅行小狗 8 态、配角旅行小猫 5 态、UI 元素、目的地风格元素（6 城） | 手写体 + 照片拼贴的封面语言、角色的状态化设计、每个目的地一套"风格元素"的思路 |
| `03_design_system_board.jpg` | 品牌名与副标题、角色成对出现、六种目的地背景风格、UI 组件（主/次按钮、状态胶囊、Day 胶囊）、文字样式、照片框与贴纸、UI 图标、天气图标、地图/路线元素、Logo | **完整的色彩、圆角、按钮、状态胶囊、天气图标与路线元素规范**——`DESIGN.md` 的 token 主要来自这张 |
| `04_mascot_and_doodles_board.jpg` | 大幅场景 + 小狗小猫、木质指路牌、主角小狗 7 态、配角小猫 7 态、手绘元素与贴纸、邮戳与旅行标签、UI 图标、天气图标、照片框、装饰纸、色板与背景纹理 | 角色的姿态清单（Welcome / Exploring / Planning / Rainy / Tired / Success / Complete）、涂鸦清单（太阳 / 云 / 飞机 / 虚线航线 / 图钉 / 山 / 花 / 相机 / 指路牌）、色板 |
| `05_sunny_travel_homepage_board.jpg` | 最接近首页的一版：海岸 Hero + 手写标题 + 邮戳 + 角色、Travel Buddies 角色集、旅行元素插画、贴纸与邮戳、UI 组件与状态胶囊、照片风格参考（6 城）、背景纹理 | **首页版式与信息层级**：Hero 构图、拼贴、CTA 层级、状态胶囊四态（Confirmed / To Check / Locked / Action Needed） |

## 生产资产在哪里

母版只提供设计语言；真正上线的元素全部重新制作，放在前端模板内：

```
hks-travel-skill/assets/frontend-template/assets/
├── home/            首页样式、纯逻辑与资产运行时
├── mascots/         travel-puppy.svg / travel-cat.svg（分部件可动）
├── homepage/        scene-{coast,city,mountain,nature,heritage}.svg
├── illustrations/   12 个手绘涂鸦（currentColor 描边）
├── decor/           邮戳 / 纸胶带 / 纸纹 / 压制花
└── fonts/           Caveat / Nunito 自托管 latin 子集
```

角色与场景是**按母版的风格重新绘制的矢量资产**，不是母版切图；设计语言的对照说明见
仓库根目录 `DESIGN.md` 的 Art Direction 与 Mascots 章节。

## 关于母版文件格式

原始资产包为 5 张 1536×1024 PNG（合计约 14MB）。为控制公开仓库体积，这里以 1400px 宽的
JPEG（质量 82）保存（合计约 1.8MB）。构图、色彩与标注文字均完整保留，足以作为设计语言的依据。
原始 PNG 未随仓库提交。
