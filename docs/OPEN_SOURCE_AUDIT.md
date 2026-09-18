# 开源发布审计记录

审计日期：2026-09-18<br>
审计范围：当前公开目录 `Hks-Travel-Skill/`

## 结论

- 严重风险：0
- 高风险：0
- 待复核：1
- 自动隐私扫描：通过
- Skill 结构校验：通过
- 开源仓库自动化测试：通过

待复核项为 `hks-travel-skill/scripts/verify_cloud_deployment.mjs` 调用本机 `curl` 验证用户指定的部署地址。该脚本只读取目标站点的 HTTP 响应，并在部署验收场景中按用户授权运行。安全边界已经写入 `SECURITY.md`。

## 已隔离内容

以下内容只存在于开发工作区，没有复制到公开目录：

- 本地数据库、生产或测试 TravelPack、附件和备份。
- 邮件 outbox、真实邮箱、验证码和身份会话。
- 浏览器快照、控制台日志、HAR、trace 和 Playwright 状态。
- Wrangler 与其他云平台本地状态、账号缓存和临时构建文件。
- 本机用户名、绝对路径与内部项目目录。
- 历史 ZIP 发布包和旧版本构建产物。

## 已公开内容

- Skill 指令、参考协议、前后端模板和确定性脚本。
- 使用虚构人物与演示金额的 TravelPack 示例。
- 三张经过视觉检查且不含凭据的真实部署页面截图。
- MIT License 以及 Leaflet、Lucide 的第三方许可声明。

## 后续发布门禁

每次发布前运行：

```bash
npm run check
```

同时检查完整 Git 历史、最终截图和托管平台 Secret scanning 结果。新增地图 Key、云平台 Secret、邮箱验证数据或用户附件时，只能保存在宿主 Secret 与私有数据系统中。
