# 开源隐私边界 / Open-source privacy boundary

本文定义 Hks-Travel-Skill 公开仓库允许包含的内容，以及必须留在本地或云平台 Secret 系统中的内容。

## 可以公开

- `hks-travel-skill/` 内的指令、参考资料、模板和确定性脚本。
- 使用虚构人员、示例域名与匿名 ID 的 TravelPack 示例。
- 已完成画面级隐私检查的产品截图。
- 不含凭据的 `travel-app-manifest.json` 模板。
- 开源许可、第三方版权声明和安全边界说明。

## 必须隔离

- `.env`、云平台 Secret、API Key、OAuth Token、Cookie、验证码和访问令牌。
- 真实邮箱、手机号、身份证件、票据原件、住宿订单和付款信息。
- 生产 TravelPack、用户附件、数据库、备份、SQLite 文件和邮件 outbox。
- 浏览器配置、Playwright 状态、HAR、trace、控制台日志和截图缓存。
- Cloudflare Wrangler、WorkBuddy 或其他宿主生成的本地状态与账号缓存。
- 本机绝对路径、用户名、内部项目目录和未清理的错误堆栈。
- 历史发布压缩包与临时构建目录。

## 截图规则

1. 只截取产品页面内容，避开地址栏、浏览器资料、账号头像和系统通知。
2. 检查邮箱、验证码、访问链接 Token、地图 Key、账单备注、证件与附件名称。
3. 保留展示功能所需的最小画面。
4. 提交前再次打开最终 PNG，完成视觉检查。
5. 新截图应覆盖旧截图，避免把调试批次和时间戳文件提交到仓库。

## 发布前检查

```bash
npm run check
git status --short
git diff --cached --check
```

随后在代码托管平台启用 Secret scanning。首次公开推送前检查完整 Git 历史；已经进入历史的凭据需要立即轮换，并使用适合的历史重写工具移除。

自动审计只能覆盖已知模式。人工审核仍需检查业务数据、截图语义、第三方许可和公开链接的访问范围。

## English summary

The public repository may contain skill instructions, references, deterministic scripts, anonymous sample data, reviewed screenshots, and credential-free manifest templates. Keep credentials, personal data, production TravelPacks, attachments, databases, backups, browser state, host caches, logs, and build archives outside the repository.

Run `npm run check`, inspect the final images, review the complete Git history, and enable the hosting platform's secret scanning before publication. Rotate any credential that has entered Git history before making the repository public.
