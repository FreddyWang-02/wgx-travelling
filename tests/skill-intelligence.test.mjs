import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "hks-travel-skill");
const references = path.join(skill, "references");

const read = (file) => fs.readFileSync(path.join(references, file), "utf8");

test("SKILL workflow defines operating modes", () => {
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  for (const mode of ["new-trip", "update-trip", "local-replan", "demo", "deployment-upgrade"]) {
    assert.match(instructions, new RegExp(mode), `SKILL.md missing operating mode ${mode}`);
  }
  assert.match(instructions, /运营模式/);
});

test("SKILL workflow enforces the AI Travel Copilot pipeline", () => {
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  // Intent → preference → constraint extraction
  assert.match(instructions, /意图提取/);
  assert.match(instructions, /偏好提取/);
  assert.match(instructions, /约束提取/);
  assert.match(instructions, /缺失信息检查/);
  // Research → candidate pool, not directly final itinerary
  assert.match(instructions, /候选池/);
  assert.match(instructions, /研究结果不直接变成最终攻略/);
  // Constraint-aware planning priorities
  assert.match(instructions, /约束感知规划/);
  assert.match(instructions, /地理聚类/);
  // Explainable planning
  assert.match(instructions, /可解释决策/);
  assert.match(instructions, /planning reason/);
});

test("planning-intelligence reference defines hard constraints and soft preferences", () => {
  const doc = read("planning-intelligence.md");
  assert.match(doc, /Hard Constraints/);
  assert.match(doc, /Soft Preferences/);
  // Concrete hard constraint categories required
  for (const item of ["航班", "酒店", "已预约餐厅", "演出", "必去地点", "行动能力限制"]) {
    assert.match(doc, new RegExp(item), `hard constraint missing: ${item}`);
  }
  assert.match(doc, /不得被 AI 静默修改/);
  // Concrete soft preferences
  for (const item of ["不喜欢早起", "不喜欢赶", "少走路", "喜欢拍照", "咖啡馆", "避开人群", "预算倾向", "旅行节奏"]) {
    assert.match(doc, new RegExp(item), `soft preference missing: ${item}`);
  }
  assert.match(doc, /允许在冲突时权衡/);
  assert.match(doc, /禁止把 Soft Preference 升级为 Hard Constraint/);
  // Candidate pool pipeline stages
  assert.match(doc, /Candidate Places/);
  assert.match(doc, /Geographic Clustering/);
  assert.match(doc, /Time Feasibility/);
  assert.match(doc, /Constraint Check/);
  assert.match(doc, /Preference Matching/);
  assert.match(doc, /Final Itinerary/);
  // Explainability
  assert.match(doc, /可解释规划/);
  assert.match(doc, /简短 planning reason/);
  assert.match(doc, /禁止保存或展示模型隐藏推理过程或 chain-of-thought/);
  // Missing information check
  assert.match(doc, /缺失信息检查/);
});

test("dynamic-replanning reference defines local-replan rules", () => {
  const doc = read("dynamic-replanning.md");
  // Mode distinction and default
  assert.match(doc, /full-plan/);
  assert.match(doc, /local-replan/);
  assert.match(doc, /默认.*使用 local-replan/);
  // Trigger list
  for (const trigger of ["下雨", "太累", "起晚", "景点闭馆", "临时增加地点", "临时删除地点", "酒店改变"]) {
    assert.match(doc, new RegExp(trigger), `replan trigger missing: ${trigger}`);
  }
  // local-replan flow steps
  assert.match(doc, /识别 Trigger/);
  assert.match(doc, /找出受影响日期\/地点/);
  assert.match(doc, /锁定 Hard Constraints/);
  assert.match(doc, /保留未受影响 itinerary IDs/);
  assert.match(doc, /最小受影响范围/);
  assert.match(doc, /修改摘要/);
  assert.match(doc, /用户确认后应用/);
  // Preservation rules
  assert.match(doc, /Preservation Rules/);
  assert.match(doc, /保留原 `id`/);
  assert.match(doc, /被删除节点从集合移除/);
  assert.match(doc, /新增节点使用新 `id`/);
});

test("new reference files exist and are linked from SKILL", () => {
  assert.ok(fs.existsSync(path.join(references, "planning-intelligence.md")), "planning-intelligence.md exists");
  assert.ok(fs.existsSync(path.join(references, "dynamic-replanning.md")), "dynamic-replanning.md exists");
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  assert.match(instructions, /references\/planning-intelligence\.md/);
  assert.match(instructions, /references\/dynamic-replanning\.md/);
});

test("deployment and upgrade sections are preserved", () => {
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  for (const file of ["upgrading-deployments.md", "deployment-routing.md", "hosting.md", "backend-contract.md", "product-contract.md", "travelpack-1.1.md", "source-matrix.md"]) {
    assert.match(instructions, new RegExp(file), `SKILL.md must still reference ${file}`);
  }
  assert.match(instructions, /plan_deployment_upgrade\.mjs/);
  assert.match(instructions, /build_deployment_backup\.mjs/);
  assert.match(instructions, /verify_deployment_upgrade\.mjs/);
  assert.match(instructions, /legacy-audit-required/);
});
