# 已部署旅行网站升级协议

## 适用范围

用户提出“用最新版 Skill 更新网站”“升级已部署攻略”“同步新版功能”或同类请求时进入本流程。内容更新继续使用“更新现有旅行”；产品代码、宿主适配器或数据 schema 更新使用本协议。

Skill 更新不会自动修改线上网站。升级属于一次新的线上发布操作，需要用户明确指定目标网站或宿主项目。优先更新原项目，保留原域名、数据库、权限、访问链接、附件和 Secret。禁止为了省事新建应用并静默替换链接。

## 版本清单

每次正式部署必须在网站根目录发布 `travel-app-manifest.json`，内容基于 `assets/deployment-manifest.template.json`，至少包含：

- `product`、`manifestVersion`；
- `skillVersion`、`frontendVersion`、`hostAdapterVersion`；
- `dataSchemaVersion`、`compatibleDataSchemaVersions`、`migrations`；
- `deploymentMode`、`deploymentId`、`siteUrl`、`deployedAt`。

版本清单只能保存公开版本和部署标识，禁止包含 Token、Cookie、Key、Secret、用户邮箱和数据库凭据。正式发布时把所有 `replace-at-deploy-time` 替换为真实值。静态资源使用版本化文件名或查询参数，防止浏览器继续加载旧缓存。

使用确定性脚本生成正式清单：

```bash
node scripts/build_deployment_manifest.mjs \
  assets/deployment-manifest.template.json deployment-info.json travel-app-manifest.json
```

`deployment-info.json` 只包含 `deploymentMode`、`deploymentId`、`siteUrl` 和可选 `deployedAt`。脚本会拒绝 Token、Secret、Cookie、密码、邮箱和 API Key 等敏感字段。

## 用户操作入口

推荐用户在原 Agent 任务中发送：

> 使用最新版 Hks-Travel-Skill 升级这个已部署网站：`<网站地址>`。保留现有数据库、用户编辑内容、附件、访问链接和域名。先备份并展示升级计划，完成后执行真实浏览器验收。

新任务也可以升级。Agent 必须确认当前账号能够定位并更新原宿主项目；只有公开网站地址且无法取得项目写权限时停止操作，向用户说明需要打开原任务或授权原项目。

## 升级步骤

1. **定位原项目**：从用户指定网站读取 `travel-app-manifest.json`，核对 `deploymentId`、`siteUrl` 和宿主项目。禁止仅凭相似标题猜测项目。
2. **读取线上数据**：通过当前正式适配器读取最新 TravelPack、revision、能力清单和附件清单。升级计划生成后再次读取 revision；期间出现变化时重新备份和计划。
3. **生成升级计划**：运行：

   ```bash
   node scripts/plan_deployment_upgrade.mjs current-manifest.json assets/deployment-manifest.template.json > upgrade-plan.json
   ```

   允许状态：
   - `already-current`：无需发布；
   - `in-place-code-upgrade`：数据 schema 兼容，只更新代码；
   - `data-migration-required`：存在明确迁移脚本，执行复制迁移。

   阻断状态：
   - `legacy-audit-required`：旧站缺少可信清单，先审计与备份；
   - `downgrade-blocked`：目标版本低于线上版本；
   - `incompatible-data-schema`：缺少受控迁移；
   - `invalid-target-manifest` 或 `invalid-version`：版本清单无效。

4. **备份**：导出最新 TravelPack、原版本清单和附件清单：

   ```bash
   node scripts/build_deployment_backup.mjs travelpack.json current-manifest.json backup-dir \
     --attachment-manifest attachment-manifest.json
   ```

   备份保存在用户拥有的项目或用户明确选择的位置。报告路径、时间和 SHA-256；禁止把私密 Token 或 Secret 放入备份。

5. **展示计划**：向用户说明版本差异、代码文件、宿主适配器变化、是否迁移数据、链接是否保持、风险和回滚点。用户已明确要求升级时，可以在计划无新增高风险动作的情况下继续；新增付费、账号、Key、权限扩大、域名变化或不可逆迁移时暂停确认。
6. **执行升级**：
   - 纯代码升级只替换前端资源、公开版本清单和确有变化的宿主适配器；禁止初始化数据库或写入示例 TravelPack。
   - 数据迁移在副本上运行，迁移结果先通过 TravelPack 校验。使用线上最新 revision 条件写入；冲突时停止并重新读取。
   - 更新原站点项目和原发布目标。宿主只能新建应用时，先向用户说明域名和链接会变化。
7. **验证数据**：导出升级后的 TravelPack 并运行：

   ```bash
   node scripts/verify_deployment_upgrade.mjs \
     backup-dir/travelpack.json after-travelpack.json upgrade-plan.json
   ```

   纯代码升级要求 TravelPack 完全一致；数据迁移要求 schema 有效、旅行 ID 与已有记录稳定 ID 保留。
8. **真实浏览器验收**：检查五模块、目标修复、未登录编辑预检、成功保存、取消登录、刷新恢复、只读拒写、冲突识别、附件读取、地图能力和用户指定分享渠道。浏览器必须确认已加载新版本资源及新版本清单。
9. **完成与回滚点**：验收通过后写入目标版本清单并报告备份位置。验收失败时恢复旧静态资源；数据迁移已经写入时使用备份和原 revision 规则执行受控恢复，禁止覆盖升级期间产生的新用户写入。

## 旧站兼容

缺少版本清单的站点统一标为 `legacy-audit-required`。Agent 需要读取原项目文件、当前 TravelPack、数据库结构、宿主适配器和线上资源版本，创建备份后生成一份“推定当前版本”报告。只有证据能够确认兼容性时才补写初始版本清单。无法确认数据 schema 或项目归属时停止升级。

## 数据迁移规则

- 每条迁移声明唯一的 `from`、`to` 和 Skill 包内真实存在的相对脚本路径；计划器拒绝绝对路径、目录穿越和缺失脚本。禁止现场生成未测试迁移直接写线上。
- 迁移脚本必须是确定性的纯数据转换，不访问网络，不修改附件对象，不读取 Secret。
- 保留 `trip.id` 和各集合稳定 ID；需要删除或合并记录时必须在迁移说明中列出，并在发布前取得用户确认。
- 用户笔记、已完成待办、真实账单、资料、附件引用和来源核验记录默认属于受保护内容。
- 每次迁移增加自动化用例，覆盖旧样本、重复执行和失败回滚。

## WorkBuddy 要求

- 优先回到原任务或通过 `deploymentId` 定位原应用，更新同一 Sites 项目。
- 保留原 Database 集合、权限规则、登录身份、只读发布副本和正式域名。
- 替换 `app.mjs`、`app.css`、协议模块等静态资源时同步更新缓存版本；宿主适配器只按目标版本差异更新。
- 发布前后各读取一次数据库 revision。版本变化时重新生成备份，禁止覆盖用户刚保存的内容。
- 发布后同时验证编辑地址与只读分享地址；只检查公开首页不足以完成升级验收。

## 升级完成回执

回执必须包含：原版本、目标版本、升级类型、原网站地址、数据 schema 是否迁移、备份位置、数据校验结果、浏览器验收结果、保留的域名／访问链接／附件能力和仍需用户处理的事项。禁止只回复“已更新”。
