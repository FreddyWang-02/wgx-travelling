# 旅行工具云端数据契约

## 产品结果

完整部署需要实现以下结果：

- 所有者可以读取、编辑并持久化完整 TravelPack；
- 页面刷新和更换设备后可以读取最后一次成功保存的数据；
- 分享者可以读取，同时无法修改源数据或发布副本；
- 保存时使用宿主版本、条件写入或保存前复查识别旧版本；
- 每位用户的数据位于其自己的宿主项目或独立数据域；
- 地点搜索和附件属于可选能力，不影响五模块编辑、保存与分享。

云函数、SQL、Secret、URL Token、`If-Match` 和 HTTP 412 都属于实现选项。适配器满足上述结果后即可交付。

## 模式一：标准云 API

`assets/backend-template/` 提供 Cloudflare 参考实现。具备服务端函数、数据库和 Secret 的宿主可以复用以下接口：

| 方法与路径 | 用途 |
|---|---|
| `GET /health` | 返回部署和数据库健康状态 |
| `GET /api/r/{readToken}` | 读取经过敏感字段过滤的 TravelPack |
| `GET /api/e/{editToken}` | 读取可编辑 TravelPack |
| `PUT /api/e/{editToken}` | 使用 `If-Match` revision 保存完整 TravelPack |
| `POST /api/e/{editToken}/access-links` | 轮换编辑与只读 Token |
| `GET /api/e/{editToken}/places-search` | 可选地点搜索 |
| `PUT /api/e/{editToken}/attachments/{assetId}` | 可选附件上传 |
| `GET /api/{r|e}/{token}/attachments/{assetId}` | 按权限读取附件 |

读取成功返回 `revision`、`document` 和 `capabilities`。保存成功返回新 revision；旧 revision 返回 HTTP 412；缺少 `If-Match` 返回 428；只读 Token 写入返回 401 或 403。

最低持久化模型包含：

- `trip_document`：当前 revision 和完整 TravelPack JSON；
- `access_tokens`：编辑、只读 Token 的哈希。

## 模式二：宿主原生云

宿主提供浏览器 Database SDK、当前用户身份、项目权限或数据库规则时，使用 `assets/frontend-template/host-adapter.mjs` 创建并注入全局适配器：

```js
import { createTravelHostAdapter } from "./host-adapter.mjs";

window.TRAVEL_HOST_ADAPTER = createTravelHostAdapter({
  mode: "edit", // 分享页使用 "read"
  capabilities: {
    attachments: false,
    placeSearch: false,
    accessLinks: false
  },
  async load() {
    return { document, version, capabilities };
  },
  async prepareEdit() {
    // 可选：需要登录的宿主在打开编辑弹窗前完成会话验证。
    // 用户取消时抛出 code = "auth_cancelled"。
  },
  async save({ document, expectedVersion }) {
    return { version: nextVersion };
  },
  async searchPlaces({ query, region }) {},
  async uploadAttachment({ assetId, file, fileName, contentType }) {},
  getAttachmentUrl(assetId) {},
  async rotateAccessLinks() {}
});
```

`load()` 和 `save()` 为编辑模式必需方法。只读页只需实现 `load()`，并将 `mode` 设为 `read`。可选方法缺失时，模板自动隐藏或停用对应入口。

需要邮箱验证码、OAuth 或其他交互式登录的宿主必须实现 `prepareEdit()`，并在打开新增、编辑或数据弹窗前完成身份验证。登录界面使用原生 `<dialog>.showModal()` 或宿主等价顶层模态能力，禁止用普通 `div + z-index` 覆盖已经打开的原生 `<dialog>`。发码、验证和取消分支都必须恢复按钮可用状态并结束 Promise；用户取消时返回 `auth_cancelled`，页面保持可操作。`save()` 仍需再次校验会话，防止编辑期间登录失效。

`version` 可以是整数、宿主记录版本、ETag 或稳定的更新时间字符串。`save()` 必须比较 `expectedVersion`。发现旧版本时抛出带有 `code: "revision_conflict"` 的错误，前端会显示冲突提示并保留用户输入。

宿主身份或数据库规则必须确保：

- 编辑页只有所有者或明确授权的编辑者可以写入；
- 只读分享页没有写权限；
- 浏览器中出现的项目公开标识不等同于写入凭据；
- 私密 Key、Cookie 和管理员凭据不进入前端包。

## 模式三：单人编辑与只读发布快照

宿主无法对同一记录提供细粒度读写权限时，可以分离数据域：

1. 所有者编辑私有旅行文档；
2. 每次保存后同步一份经过敏感字段过滤的只读发布快照；
3. 分享页只读取发布快照，并且没有写入路径；
4. 保存前重新读取源文档版本；版本变化时停止保存并提示冲突；
5. 向用户说明分享内容以最近一次成功发布为准。

该模式适合单人维护。多人同时编辑需要升级到宿主原生原子版本控制或标准云 API。

## 附件

对象存储属于可选能力。未提供对象存储时隐藏附件入口，其余编辑、保存和分享保持正常。只读分享中的敏感附件必须隐藏；宿主无法实现附件权限隔离时不得开放附件功能。

## 部署版本与升级

正式站点必须公开不含凭据的 `travel-app-manifest.json`，用于记录 Skill、前端、宿主适配器和数据 schema 版本以及宿主部署标识。升级流程读取线上最新 `version` 或 revision 后备份；纯代码升级不得调用初始化写入，也不得改变 TravelPack。数据迁移使用副本和条件写入，保存时发现 revision 变化立即停止。完整规范见 [已部署旅行网站升级协议](upgrading-deployments.md)。
