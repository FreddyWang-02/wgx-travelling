#!/usr/bin/env node

import fs from "node:fs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("用法: node select_map_capability.mjs <capabilities.json>");
  process.exit(1);
}

const input = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const providers = Array.isArray(input.providers) ? input.providers : [];
const supportsCoreMap = (provider) =>
  provider?.official === true &&
  provider?.capabilities?.placeSearch === true &&
  provider?.capabilities?.geocoding === true &&
  provider?.capabilities?.routing === true;

const configured = providers.find(
  (provider) => supportsCoreMap(provider) && provider.connected === true,
);

if (configured) {
  console.log(JSON.stringify({
    status: "connector-present",
    action: "use-connector",
    selected: configured,
    fallbackAllowed: false,
  }, null, 2));
  process.exit(0);
}

const installable = providers.find(
  (provider) => supportsCoreMap(provider) && (provider.installable === true || provider.configurable === true),
);

if (installable) {
  console.log(JSON.stringify({
    status: "connector-installable",
    action: "configure-connector",
    selected: installable,
    requiredUserAction: installable.requiredUserAction ?? "authorize-or-add-credential",
    fallbackAllowed: false,
  }, null, 2));
  process.exit(0);
}

if (input.discoveryComplete !== true) {
  console.error("地图连接器发现尚未完成：继续检查宿主 MCP、连接器市场和自定义 Server 配置入口。");
  process.exit(2);
}

console.log(JSON.stringify({
  status: "fallback-after-setup-attempt",
  action: "use-no-coordinate-place-form",
  selected: null,
  fallbackAllowed: true,
  reason: input.blockedReason ?? "no-supported-official-connector",
}, null, 2));
