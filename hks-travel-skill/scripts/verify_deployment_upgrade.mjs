#!/usr/bin/env node
import fs from "node:fs";
import { isDeepStrictEqual } from "node:util";
import { validateTravelPack } from "../assets/frontend-template/protocol.mjs";

const [, , beforePath, afterPath, planPath] = process.argv;
if (!beforePath || !afterPath || !planPath) {
  console.error("Usage: node verify_deployment_upgrade.mjs <before-travelpack.json> <after-travelpack.json> <upgrade-plan.json>");
  process.exit(2);
}

const read = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const before = read(beforePath);
const after = read(afterPath);
const plan = read(planPath);
const errors = validateTravelPack(after).map((item) => `${item.path}: ${item.message}`);

if (before.trip?.id !== after.trip?.id) errors.push("trip.id: 升级后旅行 ID 发生变化");
if (plan.status === "in-place-code-upgrade" && !isDeepStrictEqual(before, after)) {
  errors.push("travelpack: 纯代码升级改变了用户数据");
}

const stableCollections = ["companions", "days", "places", "itineraryItems", "transportSegments", "stays", "tasks", "expenses", "materials", "assets", "sources"];
if (plan.status === "data-migration-required") {
  for (const collection of stableCollections) {
    const afterIds = new Set((after[collection] || []).map((item) => item.id));
    for (const item of before[collection] || []) {
      if (item.id && !afterIds.has(item.id)) errors.push(`${collection}.${item.id}: 迁移丢失稳定 ID`);
    }
  }
}

const result = {
  verified: errors.length === 0,
  planStatus: plan.status,
  tripId: after.trip?.id || null,
  checks: ["travelpack-valid", "trip-id-stable", plan.status === "in-place-code-upgrade" ? "data-unchanged" : "stable-ids-preserved"],
  errors,
};
console.log(JSON.stringify(result, null, 2));
if (errors.length) process.exitCode = 1;
