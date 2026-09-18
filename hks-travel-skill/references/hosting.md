# 数据归属与操作步骤

## 数据归属

每位用户拥有独立运行实例或独立数据域。TravelPack、宿主权限或访问 Token、数据库和附件归当前用户的宿主项目或用户授权的云项目。开发者测试项目只承载演示与验收数据。

标准云模式必须支持 Secret 或等效私密配置。宿主原生模式可以使用当前用户身份与数据库权限规则。Token、Key、Cookie 和支付信息均不得写入 TravelPack、日志、仓库或导出文件。

## 统一部署顺序

1. 完成路线确认和 UI 样式确认。
2. 生成并严格校验 TravelPack。
3. 按 [宿主能力发现与部署路由](deployment-routing.md) 选择免费且用户配置成本最低的完整部署候选。
4. 取得本次部署授权；平台自身要求激活数据库或云服务时使用官方确认框。
5. 部署 `assets/frontend-template/`，按 [云端数据契约](backend-contract.md) 接入标准 API 或宿主原生适配器。
6. 初始化数据库并写入 TravelPack。标准云模式生成编辑与只读 Token；宿主原生模式配置所有者编辑和只读分享权限。
7. 回传编辑入口和只读分享入口，执行读取、编辑保存、只读拒写、刷新恢复与冲突识别验收。
8. 基于 `assets/deployment-manifest.template.json` 生成并发布 `travel-app-manifest.json`，写入真实版本、部署模式、项目标识、正式地址和发布时间。版本清单不得包含凭据。

## 升级现有部署

用户要求新版 Skill 更新既有站点时读取 [已部署旅行网站升级协议](upgrading-deployments.md)。升级必须定位原宿主项目、备份线上最新数据、生成确定性计划并更新原发布目标。纯代码升级保留数据库与 TravelPack；数据 schema 变化使用登记迁移和 revision 条件写入。升级后同时验收编辑入口和只读分享入口。

## 宿主顺序

1. 当前 Agent 自带的云服务、站点、函数和数据库。
2. 已连接的免费 MCP 或插件。
3. 当前环境已经登录的免费云 CLI。
4. 用户自己的免费云账号。

用户提供 API Key、注册云账号或完成额外登录属于最后路径。任何候选需要开通付费或绑定支付时暂停并确认。

## WorkBuddy

读取 [WorkBuddy 原生云适配](adapters-workbuddy.md)。优先使用 WorkBuddy 当前用户项目内的 Sites、浏览器 Database SDK、身份与权限规则；云函数和 Secret 属于可选增强。WorkBuddy 只有静态托管时继续检查已连接 MCP；静态页面只用于 UI 审阅。

## Codex

读取 [Codex / OpenAI Sites 适配](adapters-codex-sites.md)。Sites 具备完整服务端与数据库能力时优先于用户 Cloudflare。Sites 当前不可用或能力探针失败时，再检查已连接 MCP、现有 CLI 和 Cloudflare。

## Cloudflare

读取 [Cloudflare 适配](adapters-cloudflare.md)。该路径已经具备 Worker + D1 参考实现，R2 保持可选。它承担完整部署回退，不承担默认首选。

## 地图与附件

地点能力继续按 [地图能力协商](map-routing.md) 选择宿主连接器、已连接地图 MCP、用户 Key 或绘图式路线图。地图搜索缺失不阻塞编辑、保存与分享。

附件对象存储属于可选能力。缺少对象存储时隐藏附件入口，并明确报告附件暂不可用；其余五模块必须完整工作。
