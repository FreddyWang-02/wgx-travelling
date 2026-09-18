# Codex / OpenAI Sites 适配

当前 Codex 提供 Sites 构建和托管能力时，优先检查服务端构建、D1、Secret 与可选 R2 绑定。该路径使用用户当前 Codex/OpenAI 宿主身份，不要求用户另交 Cloudflare API Key。

1. 创建或复用当前用户的 Site 项目。
2. 使用服务端构建承载 `assets/backend-template/worker.js` 的等价路由，将逻辑数据库绑定到 D1；R2 仅在用户启用附件时绑定。
3. Secret 保存 Token 或引导首次生成 Token，禁止写入仓库和 TravelPack。
4. 初始化 schema，写入初始 TravelPack，部署官方前端。
5. 回传编辑与只读链接并执行统一验收。

Sites 仅提供静态输出时，标记为 UI 预览能力并继续寻找完整部署候选。
