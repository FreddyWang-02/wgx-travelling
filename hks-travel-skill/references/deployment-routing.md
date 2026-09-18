# 宿主能力发现与部署路由

## 默认目标

用户提出“网页工具”“部署”“上线”或“分享链接”时，最终交付默认包含在线编辑、保存和只读分享。静态 HTML 只承担 UI 审阅，不能自动降级为最终交付。

## 能力发现

先检查当前宿主已经提供的工具、Skill、MCP、插件、云项目和已有登录状态。只做只读查询或最小无副作用探针。能力清单描述产品结果与宿主能力，不预设云函数、SQL 或 URL Token：

```json
{
  "id": "workbuddy-native",
  "kind": "host-native",
  "free": true,
  "billingRequired": false,
  "userSetup": "confirm",
  "capabilities": {
    "hosting": true,
    "database": true,
    "ownerEdit": true,
    "readOnlyShare": true,
    "accessControl": true,
    "conflictProtection": true,
    "objectStorage": false
  }
}
```

`kind` 依次使用 `host-native`、`connected-mcp`、`authenticated-cli`、`user-cloud`。`userSetup` 使用 `none`、`confirm`、`login`、`api-key`。

将全部候选写入临时 JSON 后运行：

```bash
node scripts/select_deployment_target.mjs <capabilities.json>
```

路由规则固定为：宿主原生免费能力 → 已连接免费 MCP → 已登录免费 CLI → 用户自有免费云。需要用户提供账号、登录或 API Key 的路径排在最后。

用户要求票据或资料附件时，`objectStorage` 与可分享附件 URL 成为本次交付的必选能力。对象存储缺失时可以继续完成在线编辑和只读分享，但必须把附件明确标为未启用，并继续检查下一候选；用户接受无附件交付后才能停止路由。

用户指定微信、企业微信或其他分享渠道时，在满足数据闭环的候选中增加渠道实机可达性验收。可达性不代替访问控制、持久化和冲突识别，也不允许用静态页面换取表面可打开。

## 完整交付模式

选择器接受下列任一模式：

1. `standard-cloud`：托管、服务端函数、数据库、Secret、匿名读取和 Token 路由齐备，使用标准 HTTP API 与 revision/CAS。
2. `host-native`：宿主提供数据库、所有者编辑、只读分享、访问控制和冲突保护。可以直接使用浏览器 SDK、宿主身份与数据库规则。
3. `single-owner-published-share`：所有者在宿主内编辑，分享端读取受保护的发布快照；保存前重新读取版本并识别冲突。

`serverFunctions`、`secrets`、`tokenRoutes` 只属于 `standard-cloud`。宿主原生模式不需要补齐这些实现。

## 停止条件

- 所有候选都无法提供持久化编辑、访问控制下的只读分享或冲突识别时，停止正式部署并报告缺口。
- 任何候选需要开通付费、绑定支付或超出免费额度时，先取得用户确认。
- 静态预览只能标记为“UI 样式预览”或“静态只读预览”。
- 宿主不能保证每位用户的数据隔离或只读拒写时，该宿主不能承载正式产品。标准云模式还需保证 Secret 私密性。
- 目标分享渠道实机无法打开时，停止宣称该渠道可用，记录拦截表现并提供已验证的浏览器入口或更换宿主候选。

## 适配器

- WorkBuddy：读取 [WorkBuddy 适配](adapters-workbuddy.md)。
- Codex / OpenAI Sites：读取 [Codex Sites 适配](adapters-codex-sites.md)。
- Cloudflare：读取 [Cloudflare 适配](adapters-cloudflare.md)。
- 其他 Agent 或 MCP：读取 [通用适配](adapters-generic.md)。
