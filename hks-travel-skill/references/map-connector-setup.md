# 地图连接器发现、安装与验证

地图能力检查包含“当前已挂载工具”和“宿主可配置能力”两层。当前工具列表没有地图工具时，继续检查宿主的 MCP、连接器、插件市场和自定义 Server 配置入口。完成这一轮发现与配置尝试后，才允许进入保底路线。

## WorkBuddy 操作路径

1. 打开 WorkBuddy **设置 → MCP**；部分版本位于 **插件 → MCP 服务器**。
2. 先搜索 `高德地图`、`百度地图`、`Google Maps`、`腾讯地图` 和 `地图`。已存在官方或企业连接器时优先安装并启用 POI 搜索、地理编码和路线规划工具。
3. 市场没有目标连接器时点击 **Add MCP Server / 添加 MCP Server**，选择 Streamable HTTP；粘贴下方官方 Server 地址并使用 WorkBuddy 的凭据字段保存 Key。
4. OAuth、API Key、计费开通或账号创建需要用户在操作时确认。Agent 应完成其余可自动完成的检查、配置和连通性验证；禁止要求用户把 Key 发到聊天或写入 TravelPack。
5. 保存后回到 MCP 面板，确认状态为已连接并启用相关工具。新会话中执行一次地点搜索与一次步行路线测试，记录提供方、工具名和返回的坐标系。

WorkBuddy 官方说明：<https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/MCP-Guide>。连接器开发与用户自填 Token 规范：<https://open.workbuddy.cn/docs/connector>。

## 推荐官方 MCP

### 高德地图（中国大陆优先）

- 创建应用与 Key：<https://lbs.amap.com/api/mcp-server/gettingstarted>
- Streamable HTTP：`https://mcp.amap.com/mcp?key=${AMAP_MAPS_KEY}`
- 能力覆盖 POI、地理编码、路径规划、天气以及专属地图。使用 `assets/map-connectors/workbuddy/amap.mcp.example.json` 作为配置模板。
- 网页底图使用高德官方 JS API 时，按官方文档申请 Web 端 Key 与安全密钥；禁止把可直接访问的内部瓦片地址当作免 Key 公共服务。

### 百度地图

- 快速接入：<https://lbs.baidu.com/docs/ai?title=mcpserver%2Fquickstart>
- Streamable HTTP：`https://mcp.map.baidu.com/mcp?ak=${BAIDU_MAPS_AK}`
- 使用 `assets/map-connectors/workbuddy/baidu.mcp.example.json` 作为配置模板。

### Google Maps Grounding Lite（海外目的地优先）

- MCP 文档：<https://developers.google.com/maps/ai/grounding-lite/reference/mcp>
- Endpoint：`https://mapstools.googleapis.com/mcp`
- Header：`X-Goog-Api-Key: ${GOOGLE_MAPS_API_KEY}`
- 能力覆盖地点搜索、天气和驾车/步行路线。使用 `assets/map-connectors/workbuddy/google-maps.mcp.example.json` 作为配置模板。

### 腾讯位置服务 MCP

- 腾讯位置服务已提供官方 MCP Server，能力建立在 WebService API 之上，可用于地址解析、POI 搜索、路线规划、距离矩阵与天气等数据查询。优先从 WorkBuddy MCP 市场安装官方“腾讯位置服务”连接器并完成一次地点搜索和一次路线规划测试。
- MCP 的 WebService Key 与配额只授权数据接口，不负责浏览器中的地图底图渲染。页面要显示腾讯底图，仍需单独配置 JavaScript API GL 的 Web 端 Key、域名白名单和 `window.TRAVEL_MAP_ADAPTER`。
- 宿主无法安装官方 MCP 时，可继续使用腾讯位置服务 WebService，通过宿主 Secret 和 `searchPlaces` 适配器接入。禁止自行选择来源不明的第三方 MCP。

### 用户需要腾讯网页底图时的引导

1. 打开腾讯位置服务控制台：<https://lbs.qq.com/dev/console/application/mine>，登录后进入“应用管理 → 我的应用”。
2. 创建应用并添加 Key，启用 JavaScript API GL；需要网页运行时地点搜索时再启用 WebService API。
3. 为 JavaScript API GL 配置正式站点的精确域名白名单。测试通配符只能用于短期排查，上线前必须收紧。
4. Key 由用户填写到自己的 WorkBuddy 云项目配置：前端底图使用 `TENCENT_MAP_WEB_KEY`，服务端 WebService 使用 Secret `TENCENT_MAP_KEY`。禁止把 Key 写入 TravelPack、导出文件、日志或公开聊天。
5. 部署时加载腾讯官方 JavaScript API GL，注册 `window.TRAVEL_MAP_ADAPTER`，处理 TravelPack WGS84 与腾讯 GCJ-02 的坐标转换，并在正式域名完成缩放、平移、标记和版权标识验收。

## 决策状态

- `connector-present`：当前会话已挂载并通过测试。
- `connector-installable`：宿主存在可安装连接器，Agent 已准备配置并等待必要授权或 Key。
- `connector-installable` 同时覆盖宿主已经发现、需要 Key 或 OAuth 才能启用的 `configurable: true` 连接器；此状态不得直接降级。
- `connector-configured`：已完成安装、启用和连通性测试。
- `connector-blocked`：宿主不支持 MCP，或用户暂不提供必要凭据；记录具体阻断点。
- `fallback-after-setup-attempt`：完成发现与配置尝试后仍不可用，允许使用名称、日期、链接和备注创建无坐标地点，并进入底图保底。

禁止仅依据当前工具列表为空直接写入 `fallback`。

## 合规性检查

连接器可用与网页底图可用分别核验。MCP Key 只授权对应 MCP 能力，不能推定同一服务商的内部瓦片端点也获得授权。服务商官方文档没有公开某个裸瓦片 URL 时，即使该 URL 返回真实地图图片，也不能进入生产候选。HTTP 200、Content-Type、图片体积和 Referer 测试只验证技术可达性。

高德官方 Web 地图接入要求开发者 Key；2021-12-02 后创建的 Key 还需配合安全密钥。生产环境优先使用服务端代理保护安全密钥，并遵循高德来源标识和服务协议。需要免 Key 保底时使用已明确授权的底图服务或本地绘图式路线图。

OpenStreetMap 标准瓦片只在其官方 Tile Usage Policy 范围内作为低流量保底：显示 `© OpenStreetMap contributors`、保留正常 Referer、遵守浏览器缓存、禁止批量预取和离线下载。公共瓦片服务没有 SLA，不能包装成无限量免费地图服务。官方政策：<https://operations.osmfoundation.org/policies/tiles/>。

## 机器判定

将宿主工具、连接器市场和自定义 Server 入口的发现结果整理为 JSON，并执行：

```bash
node scripts/select_map_capability.mjs map-capabilities.json
```

`discoveryComplete` 只有在三类入口都已检查后才能设为 `true`。脚本在发现未完成时以状态码 2 终止；发现可安装官方连接器时返回 `configure-connector`；完整发现后无可用候选时才返回 `fallbackAllowed: true`。

能力 JSON 必须在每次攻略生成或更新任务中重新发现并生成。上一次任务中的授权失败、用户取消或缺少 Key 只能描述当次结果，禁止复制为后续任务的永久能力状态。腾讯位置服务只有在宿主提供已核实连接器时标记为 `configurable: true`；缺少官方 MCP Endpoint 时继续使用官方 Web Service + 宿主 Secret 路径，禁止编造 MCP Server 地址或样例。
