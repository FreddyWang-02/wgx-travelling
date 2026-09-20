# AI Travel Copilot — under active redesign

Based on [Hks-Travel-Skill](https://github.com/HANKSEN/Hks-Travel-Skill) (MIT License).
Research · Plan · Deploy · Upgrade · Redesign.

[English](README_EN.md) · 中文

> **Note:** This is Phase 0 of an evolution from Hks-Travel-Skill into AI Travel Copilot.
> See [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the roadmap.

Hks-Travel-Skill 是一个面向 Codex 与兼容 Agent 的旅行攻略 Skill。它把目的地研究、路线确认、七种 UI 风格预览、TravelPack 数据生成、可编辑网站部署和既有网站安全升级连成完整工作流。

当前版本：`4.12.0`<br>
Skill ID：`hks-travel-skill`

## 页面预览

以下截图来自真实部署页面。画面经过公开信息检查，不含邮箱、验证码、访问令牌、地图 Key 或本地运行信息。

### 旅行票夹

![旅行票夹桌面端](docs/screenshots/travel-wallet-desktop.png)

### 行程与路线图

![行程桌面端](docs/screenshots/itinerary-desktop.png)

### 移动端适配

<img src="docs/screenshots/itinerary-mobile.png" alt="行程移动端" width="390">

## 能力

- 按偏好研究目的地、交通、住宿区域、预约规则和季节变化，并保留来源与核验时间。
- 在正式部署前展示晴日手账、航空票夹、自然手账、极简导览、拼贴裁纸、印刷和都市七种 UI 风格。
- 生成并验证 TravelPack 1.1.0。
- 交付“出行、行程、准备、记账、资料”五模块旅行网站。
- 支持鼠标和触摸拖拽、待办、日历导出、AA 记账、附件与只读分享。
- 发现宿主云能力，并在 WorkBuddy、Cloudflare、Codex Sites 或通用静态预览之间进行部署路由。
- 通过版本清单、备份、迁移验证和回滚点安全升级已部署网站。

## 安装

克隆仓库后，把 Skill 目录复制到 Agent 的 Skill 目录：

```bash
git clone https://github.com/HANKSEN/Hks-Travel-Skill.git
cp -R Hks-Travel-Skill/hks-travel-skill ~/.codex/skills/hks-travel-skill
```

其他兼容 Agent 可以把 `hks-travel-skill/` 放入其文档指定的 Skills 目录。重启或刷新 Agent 后，确认 `$hks-travel-skill` 可以被识别。

## 使用

```text
请使用 $hks-travel-skill 帮我规划 9 天丽江和香格里拉旅行。
先确认偏好和路线，再展示 UI 风格，得到我的部署授权后发布可编辑网站。
```

更新已经部署的网站：

```text
请使用最新版 Hks-Travel-Skill 升级这个网站：<网站地址>。
保留数据库、用户编辑内容、附件、访问链接和域名；升级前备份，升级后验证编辑与只读入口。
```

新版 Skill 包不会主动修改线上网站。Agent 会读取 `travel-app-manifest.json`，定位原部署项目并生成升级计划。缺少版本清单的历史站点会先进入审计和备份流程。

## 地图说明

地图 MCP、WebService API 和网页底图属于三项独立能力。地图 MCP 可以提供地点与路线数据；腾讯地图、高德地图等网页底图通常还需要官方 Web Key、域名白名单和前端适配器。Skill 会在需要账号、Key、OAuth 或计费信息时展示配置步骤并等待授权。

所有凭据都应通过宿主 Secret、身份系统或环境变量注入。请勿把 Key、验证码或访问令牌写入 TravelPack、聊天记录、日志或公开版本清单。

## 项目结构

```text
Hks-Travel-Skill/
├── hks-travel-skill/
│   ├── SKILL.md
│   ├── agents/
│   ├── assets/
│   ├── references/
│   └── scripts/
├── docs/screenshots/
├── scripts/audit-public-tree.mjs
├── tests/
├── PRIVACY.md
├── SECURITY.md
└── THIRD_PARTY_NOTICES.md
```

`SKILL.md` 只保留核心工作流与边界。宿主适配、数据协议、地图、部署和升级细节位于 `references/`；确定性校验和打包逻辑位于 `scripts/`。

## 开发与检查

需要 Node.js 20 或更高版本。仓库没有运行时 npm 依赖。

```bash
npm run audit
npm test
npm run check
```

`npm run audit` 会拒绝常见密钥、真实邮箱、本机绝对路径、数据库、日志、缓存和发布压缩包。提交前仍应人工检查截图、Git 历史和托管平台的 Secret scanning 结果。

## 隐私与安全

公开发布前请阅读 [PRIVACY.md](PRIVACY.md)、[SECURITY.md](SECURITY.md) 和[开源发布审计记录](docs/OPEN_SOURCE_AUDIT.md)。仓库只包含 Skill、匿名示例数据和经过检查的页面截图。生产数据库、邮箱验证码、邮件 outbox、浏览器状态、云平台缓存、本地日志和历史发布包都应留在仓库外。

## 第三方组件

前端模板内置 Leaflet 1.9.4 和 Lucide 0.468.0。许可与版权信息见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

项目采用 [MIT License](LICENSE)。第三方组件继续适用各自许可证。
