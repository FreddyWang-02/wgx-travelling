import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  addonCollectionsV12,
  supportedSchemaVersions,
  validateTravelPack,
} from "../hks-travel-skill/assets/frontend-template/protocol.mjs";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "hks-travel-skill");
const template = path.join(skill, "assets/frontend-template");
const sampleV11 = path.join(template, "travelpack.sample.json");
const sampleV12 = path.join(template, "travelpack.sample.1.2.json");
const validator = path.join(skill, "scripts/validate_travelpack.mjs");
const previewBuilder = path.join(skill, "scripts/build_static_preview.mjs");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const copy = (value) => JSON.parse(JSON.stringify(value));
const loadV12 = () => readJson(sampleV12);

const errorsOf = (pack) => validateTravelPack(pack);
const pathsOf = (pack) => errorsOf(pack).map((entry) => entry.path);
const textOf = (pack) => errorsOf(pack).map((entry) => `${entry.path}: ${entry.message}`).join("\n");

const runValidator = (file) => JSON.parse(execFileSync(process.execPath, [validator, file], { encoding: "utf8" }));

test("TravelPack 1.1 sample keeps validating without regression", () => {
  const pack = readJson(sampleV11);
  assert.deepEqual(errorsOf(pack), [], "1.1 sample must stay valid");
  assert.equal(pack.schemaVersion, "1.1.0");
  const result = runValidator(sampleV11);
  assert.equal(result.valid, true);
  assert.equal(result.schemaVersion, "1.1.0");
});

test("TravelPack 1.2 sample validates", () => {
  const pack = loadV12();
  assert.equal(pack.schemaVersion, "1.2.0");
  assert.deepEqual(errorsOf(pack), [], "1.2 sample must be valid");
  const result = runValidator(sampleV12);
  assert.equal(result.valid, true);
  assert.equal(result.schemaVersion, "1.2.0");
});

test("validator advertises both schema versions and reports 1.2 collections", () => {
  assert.deepEqual(supportedSchemaVersions, ["1.1.0", "1.2.0"]);
  assert.deepEqual(addonCollectionsV12, ["constraints", "alternatives", "decisionLog", "replanHistory"]);
  const result = runValidator(sampleV12);
  assert.equal(result.tripStatus, "in-progress");
  assert.equal(result.collections.constraints, 4);
  assert.equal(result.collections.alternatives, 3);
  assert.equal(result.collections.decisionLog, 3);
  assert.equal(result.collections.replanHistory, 2);
  assert.deepEqual(result.planningAddons, addonCollectionsV12);
});

test("1.1 sample is rejected when relabelled as 1.2 without the new fields", () => {
  // 证明 1.2 的 7 个新增字段是硬性要求，而不是"看到了才校验"。
  const pack = readJson(sampleV11);
  pack.schemaVersion = "1.2.0";
  const paths = pathsOf(pack);
  for (const field of ["preferences", "constraints", "planningMeta", "alternatives", "decisionLog", "replanHistory", "tripStatus"]) {
    assert.ok(paths.includes(field), `relabelled 1.1 sample must report missing ${field}`);
  }
});

test("each missing 1.2 top-level field fails validation", () => {
  for (const field of ["preferences", "constraints", "planningMeta", "alternatives", "decisionLog", "replanHistory", "tripStatus"]) {
    const pack = loadV12();
    delete pack[field];
    const paths = pathsOf(pack);
    assert.ok(paths.includes(field), `deleting ${field} must fail validation, got: ${paths.join(", ")}`);
  }
});

test("invalid tripStatus fails", () => {
  const pack = loadV12();
  pack.tripStatus = "draft";
  assert.ok(pathsOf(pack).includes("tripStatus"), "legacy draft value must be rejected");
  for (const value of ["planning", "confirmed", "in-progress", "completed"]) {
    const candidate = loadV12();
    candidate.tripStatus = value;
    assert.deepEqual(errorsOf(candidate), [], `${value} must be accepted`);
  }
});

test("invalid constraint references fail", () => {
  const pack = loadV12();
  pack.constraints[0].relatedRefs[0].id = "segment-does-not-exist";
  assert.match(textOf(pack), /constraints\[0\]\.relatedRefs\[0\]\.id: 引用不存在/);

  const unknownType = loadV12();
  unknownType.constraints[1].relatedRefs[0].type = "spaceship";
  assert.match(textOf(unknownType), /constraints\[1\]\.relatedRefs\[0\]\.type: 未知引用类型/);

  const badKind = loadV12();
  badKind.constraints[2].kind = "vibe";
  assert.match(textOf(badKind), /constraints\[2\]\.kind/);

  const badSource = loadV12();
  badSource.constraints[3].source = "model-guess";
  assert.match(textOf(badSource), /constraints\[3\]\.source: 必须是 user、booking、material、external 之一/);

  const badWindow = loadV12();
  badWindow.constraints[0].startAt = "2026-09-20T18:00";
  badWindow.constraints[0].endAt = "2026-09-20T09:00";
  assert.match(textOf(badWindow), /constraints\[0\]: endAt 需晚于或等于 startAt/);
});

test("invalid alternative sourceIds fail", () => {
  const pack = loadV12();
  pack.alternatives[0].sourceIds = ["source-missing"];
  assert.match(textOf(pack), /alternatives\[0\]\.sourceIds\[0\]: 引用不存在：source-missing/);

  const empty = loadV12();
  empty.alternatives[0].sourceIds = [""];
  assert.match(textOf(empty), /alternatives\[0\]\.sourceIds\[0\]/);

  const badRef = loadV12();
  badRef.alternatives[1].relatedRef = { type: "place", id: "place-nope" };
  assert.match(textOf(badRef), /alternatives\[1\]\.relatedRef\.id: 引用不存在/);

  const badStatus = loadV12();
  badStatus.alternatives[2].status = "maybe";
  assert.match(textOf(badStatus), /alternatives\[2\]\.status/);
});

test("invalid overallConfidence fails", () => {
  const tooHigh = loadV12();
  tooHigh.planningMeta.overallConfidence = 1.4;
  assert.match(textOf(tooHigh), /planningMeta\.overallConfidence: 必须是 null 或 0 到 1 之间的数字/);

  const negative = loadV12();
  negative.planningMeta.overallConfidence = -0.1;
  assert.match(textOf(negative), /planningMeta\.overallConfidence/);

  const stringy = loadV12();
  stringy.planningMeta.overallConfidence = "0.8";
  assert.match(textOf(stringy), /planningMeta\.overallConfidence/);

  const missing = loadV12();
  delete missing.planningMeta.overallConfidence;
  assert.match(textOf(missing), /planningMeta\.overallConfidence/);

  const nullish = loadV12();
  nullish.planningMeta.overallConfidence = null;
  assert.deepEqual(errorsOf(nullish), [], "null confidence is allowed");

  const badCount = loadV12();
  badCount.planningMeta.needsRecheckCount = -1;
  assert.match(textOf(badCount), /planningMeta\.needsRecheckCount: 必须是非负整数/);

  const badMode = loadV12();
  badMode.planningMeta.mode = "freestyle";
  assert.match(textOf(badMode), /planningMeta\.mode/);
});

test("invalid preference times fail", () => {
  for (const value of ["25:00", "8:30", "0830", "24:00", ""]) {
    const pack = loadV12();
    pack.preferences.preferredDayStart = value;
    assert.match(textOf(pack), /preferences\.preferredDayStart/, `preferredDayStart ${JSON.stringify(value)} must fail`);
  }

  const reversed = loadV12();
  reversed.preferences.preferredDayStart = "21:00";
  reversed.preferences.preferredDayEnd = "09:00";
  assert.match(textOf(reversed), /preferences: preferredDayEnd 需晚于 preferredDayStart/);
});

test("invalid preference enums and shapes fail", () => {
  const badPace = loadV12();
  badPace.preferences.pace = "fast";
  assert.match(textOf(badPace), /preferences\.pace/);

  const badBudget = loadV12();
  badBudget.preferences.budgetPreference = "cheap";
  assert.match(textOf(badBudget), /preferences\.budgetPreference/);

  const badInterests = loadV12();
  badInterests.preferences.interests = ["food", 42];
  assert.match(textOf(badInterests), /preferences\.interests\[1\]/);

  const badNotes = loadV12();
  badNotes.preferences.notes = "不喜欢早起";
  assert.match(textOf(badNotes), /preferences\.notes: 必须是数组/);

  const nullPrefs = loadV12();
  nullPrefs.preferences.pace = null;
  nullPrefs.preferences.walkingTolerance = null;
  nullPrefs.preferences.crowdTolerance = null;
  nullPrefs.preferences.budgetPreference = null;
  nullPrefs.preferences.preferredDayStart = null;
  nullPrefs.preferences.preferredDayEnd = null;
  assert.deepEqual(errorsOf(nullPrefs), [], "unknown soft preferences use null");
});

test("open interests vocabulary stays allowed", () => {
  const pack = loadV12();
  pack.preferences.interests = ["food", "night-photography", "苔藓观察", "tea-house"];
  assert.deepEqual(errorsOf(pack), []);
});

test("replanHistory day ids and references must exist", () => {
  const badDay = loadV12();
  badDay.replanHistory[0].affectedDayIds = ["day-99"];
  assert.match(textOf(badDay), /replanHistory\[0\]\.affectedDayIds\[0\]: 引用不存在：day-99/);

  const badRef = loadV12();
  badRef.replanHistory[0].affectedRefs = [{ type: "place", id: "place-gone" }];
  assert.match(textOf(badRef), /replanHistory\[0\]\.affectedRefs\[0\]\.id: 引用不存在/);

  const badPreserved = loadV12();
  badPreserved.replanHistory[1].preservedRefs = [{ type: "itineraryItem", id: "item-gone" }];
  assert.match(textOf(badPreserved), /replanHistory\[1\]\.preservedRefs\[0\]\.id: 引用不存在/);

  const badTrigger = loadV12();
  badTrigger.replanHistory[0].trigger = "earthquake";
  assert.match(textOf(badTrigger), /replanHistory\[0\]\.trigger/);

  const badStatus = loadV12();
  badStatus.replanHistory[1].status = "pending";
  assert.match(textOf(badStatus), /replanHistory\[1\]\.status/);

  const badSummary = loadV12();
  badSummary.replanHistory[0].summary = "";
  assert.match(textOf(badSummary), /replanHistory\[0\]\.summary/);
});

test("decisionLog reasons stay short and CoT-free", () => {
  const pack = loadV12();
  pack.decisionLog[0].reason = "因为".repeat(200);
  assert.match(textOf(pack), /decisionLog\[0\]\.reason: 必须是不超过 280 字符/);

  const badKind = loadV12();
  badKind.decisionLog[1].kind = "vibes";
  assert.match(textOf(badKind), /decisionLog\[1\]\.kind/);

  const badRefs = loadV12();
  badRefs.decisionLog[2].relatedRefs = [{ type: "day", id: "day-gone" }];
  assert.match(textOf(badRefs), /decisionLog\[2\]\.relatedRefs\[0\]\.id: 引用不存在/);

  const badDate = loadV12();
  badDate.decisionLog[0].createdAt = "2026/09/15";
  assert.match(textOf(badDate), /decisionLog\[0\]\.createdAt/);

  const constraintRef = loadV12();
  constraintRef.decisionLog[1].relatedRefs = [{ type: "constraint", id: "constraint-flights-missing" }];
  assert.match(textOf(constraintRef), /decisionLog\[1\]\.relatedRefs\[0\]\.id: 引用不存在/);
});

test("ids stay unique across 1.1 and 1.2 collections", () => {
  const collision = loadV12();
  collision.constraints.push({ ...copy(collision.constraints[0]), id: "day-20" });
  assert.match(textOf(collision), /constraints\[4\]\.id: ID 与 days\[0\] 重复/);

  const duplicated = loadV12();
  duplicated.alternatives.push(copy(duplicated.alternatives[0]));
  assert.match(textOf(duplicated), /alternatives\[3\]\.id: ID 与 alternatives\[0\] 重复/);

  const noId = loadV12();
  noId.replanHistory.push({ ...copy(noId.replanHistory[0]), id: undefined });
  assert.match(textOf(noId), /replanHistory\[2\]\.id: 缺少 ID/);
});

test("credential-like keys and secrets are rejected in 1.2 structures", () => {
  const keyed = loadV12();
  keyed.preferences.apiKey = "not-a-real-key";
  assert.match(textOf(keyed), /preferences\.apiKey: 疑似凭据类字段/);

  const token = loadV12();
  token.planningMeta.accessToken = "not-a-real-token";
  assert.match(textOf(token), /planningMeta\.accessToken: 疑似凭据类字段/);

  const nestedSecret = loadV12();
  nestedSecret.replanHistory[0].preservedRefs = [{ type: "place", id: "place-lama", clientSecret: "x" }];
  assert.match(textOf(nestedSecret), /preservedRefs\[0\]\.clientSecret: 疑似凭据类字段/);

  const secretValue = loadV12();
  secretValue.constraints[0].description = `密钥占位 sk-${"a".repeat(20)}`;
  assert.match(textOf(secretValue), /constraints\[0\]\.description: 疑似敏感凭据/);
});

test("1.2 stays an additive superset that ignores unknown fields", () => {
  const upgraded = readJson(sampleV11);
  upgraded.schemaVersion = "1.2.0";
  upgraded.preferences = {
    pace: null,
    interests: [],
    walkingTolerance: null,
    crowdTolerance: null,
    budgetPreference: null,
    preferredDayStart: null,
    preferredDayEnd: null,
    notes: [],
  };
  upgraded.constraints = [];
  upgraded.planningMeta = { mode: "full-plan", generatedAt: "2026-09-15", lastPlannedAt: null, overallConfidence: null, needsRecheckCount: 0 };
  upgraded.alternatives = [];
  upgraded.decisionLog = [];
  upgraded.replanHistory = [];
  upgraded.tripStatus = "confirmed";
  assert.deepEqual(errorsOf(upgraded), [], "1.1 data must upgrade to 1.2 by adding fields only");

  const forwardCompatible = loadV12();
  forwardCompatible.futureModule = { timeline: true, ui: "phase-3" };
  forwardCompatible.preferences.futureField = ["x"];
  assert.deepEqual(errorsOf(forwardCompatible), [], "unknown added fields must be ignored, not rejected");
});

test("TravelPack 1.2 sample builds a static preview", () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "travelpack-12-preview-"));
  const result = JSON.parse(execFileSync(process.execPath, [previewBuilder, sampleV12, outputDir, "--ui-review"], { encoding: "utf8" }));
  assert.equal(result.built, true);
  assert.equal(result.tripId, "trip-beijing-2026");
  const html = fs.readFileSync(path.join(outputDir, "index.html"), "utf8");
  const embedded = html.match(/<script id="travelpack-data" type="application\/json">(.*?)<\/script>/s);
  assert.ok(embedded, "preview must embed the travelpack payload");
  const payload = JSON.parse(embedded[1].replaceAll("\\u003c", "<"));
  assert.equal(payload.schemaVersion, "1.2.0");
  assert.equal(payload.tripStatus, "in-progress");
  assert.equal(payload.replanHistory.length, 2);
  assert.equal(payload.decisionLog.length, 3);
  assert.ok(fs.existsSync(path.join(outputDir, "protocol.mjs")), "frontend template must be copied unchanged");
  assert.ok(fs.existsSync(path.join(outputDir, "travelpack.sample.json")), "1.1 sample must remain bundled");

  // 1.1 sample must keep building through the same pipeline (no regression).
  const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), "travelpack-11-preview-"));
  const legacy = JSON.parse(execFileSync(process.execPath, [previewBuilder, sampleV11, legacyDir, "--ui-review"], { encoding: "utf8" }));
  assert.equal(legacy.built, true);
});

test("SKILL adopts TravelPack 1.2 while keeping the 1.1 legacy contract", () => {
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  assert.match(instructions, /references\/travelpack-1\.2\.md/);
  assert.match(instructions, /references\/travelpack-1\.1\.md/);
  assert.match(instructions, /schemaVersion = "1\.2\.0"/);
  assert.match(instructions, /TravelPack 1\.2 数据契约/);
  for (const field of ["preferences", "constraints", "planningMeta", "alternatives", "decisionLog", "replanHistory", "tripStatus"]) {
    assert.match(instructions, new RegExp(field), `SKILL.md must map ${field}`);
  }
  assert.ok(fs.existsSync(path.join(skill, "references/travelpack-1.2.md")), "travelpack-1.2.md must exist");
  assert.ok(fs.existsSync(path.join(skill, "references/travelpack-1.1.md")), "travelpack-1.1.md must stay as legacy contract");

  const replanning = fs.readFileSync(path.join(skill, "references/dynamic-replanning.md"), "utf8");
  assert.match(replanning, /replanHistory/);
  assert.match(replanning, /planningMeta\.lastPlannedAt/);
  assert.match(replanning, /不修改前端/);

  const intelligence = fs.readFileSync(path.join(skill, "references/planning-intelligence.md"), "utf8");
  assert.match(intelligence, /travelpack-1\.2\.md/);
  for (const field of ["preferences", "constraints", "decisionLog", "alternatives"]) {
    assert.match(intelligence, new RegExp(field), `planning-intelligence.md must map ${field}`);
  }
});

test("public tree still passes the privacy audit", () => {
  const result = JSON.parse(execFileSync(process.execPath, [path.join(root, "scripts/audit-public-tree.mjs")], { encoding: "utf8" }));
  assert.equal(result.safe, true);
});
