# 安全说明 / Security

## 报告问题

请通过代码托管平台的私密安全报告功能提交漏洞。报告中不要附带真实邮箱验证码、访问令牌、地图 Key、云平台 Secret、旅行证件或生产数据库。

## 凭据边界

Hks-Travel-Skill 不要求把凭据写入 TravelPack、Skill 文件、日志或公开版本清单。云平台凭据应通过宿主身份、Secret 管理或环境变量注入。地图 Web Key 应配置域名白名单，并遵循地图服务商的公开使用规则。

`verify_cloud_deployment.mjs` 仅在用户要求验证其部署地址时调用本机 `curl`，读取目标站点的公开 HTTP 响应。脚本不会读取浏览器 Cookie、SSH 配置、云平台凭据或本地数据库。

## Supported boundary

Security reports should use the hosting platform's private reporting channel. Do not attach live verification codes, access tokens, map keys, cloud secrets, identity documents, or production databases.

Credentials must stay in the host identity system, secret manager, or environment variables. They must not be stored in TravelPack, logs, public manifests, or committed files.
