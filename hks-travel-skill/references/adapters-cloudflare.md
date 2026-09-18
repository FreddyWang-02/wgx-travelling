# Cloudflare 适配

该路径使用 `assets/backend-template/worker.js`、`schema.sql` 和 `wrangler.jsonc.template`。它属于已验证回退路径，仅在宿主原生能力和已连接 MCP 无法完成完整部署时使用。

优先复用当前环境已有的 Wrangler 登录。需要用户登录或授权 Cloudflare 时再请求；需要开通计费或绑定支付时停止并确认。D1 承载 TravelPack 和 Token 哈希，R2 保持可选。

部署后执行统一验收，并把数据写入当前用户自己的 Cloudflare 项目。
