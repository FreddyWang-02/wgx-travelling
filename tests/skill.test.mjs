import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const skill = path.join(root, "hks-travel-skill");

test("public skill metadata and screenshots are complete", () => {
  const instructions = fs.readFileSync(path.join(skill, "SKILL.md"), "utf8");
  assert.match(instructions, /^name: hks-travel-skill$/m);
  assert.match(instructions, /Hks-Travel-Skill/);
  for (const file of ["travel-wallet-desktop.png", "itinerary-desktop.png", "itinerary-mobile.png"]) {
    assert.ok(fs.existsSync(path.join(root, "docs/screenshots", file)), file);
  }
});

test("bundled sample validates", () => {
  const result = JSON.parse(execFileSync(process.execPath, [
    path.join(skill, "scripts/validate_travelpack.mjs"),
    path.join(skill, "assets/frontend-template/travelpack.sample.json"),
  ], { encoding: "utf8" }));
  assert.equal(result.valid, true);
  assert.equal(result.schemaVersion, "1.1.0");
});

test("new manifest uses public product id and legacy upgrades remain recognized", () => {
  const template = JSON.parse(fs.readFileSync(path.join(skill, "assets/deployment-manifest.template.json"), "utf8"));
  assert.equal(template.product, "hks-travel-skill");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "hks-travel-upgrade-"));
  const current = path.join(directory, "current.json");
  const target = path.join(directory, "target.json");
  fs.writeFileSync(current, JSON.stringify({
    ...template,
    product: "travel-guide-builder",
    skillVersion: "4.11.0",
    frontendVersion: "4.11.0",
    hostAdapterVersion: "2.0.0",
    deploymentId: "legacy-app",
    siteUrl: "https://example.com",
  }));
  fs.writeFileSync(target, JSON.stringify(template));
  const plan = JSON.parse(execFileSync(process.execPath, [
    path.join(skill, "scripts/plan_deployment_upgrade.mjs"), current, target,
  ], { encoding: "utf8" }));
  assert.equal(plan.status, "in-place-code-upgrade");
});

test("public tree passes the privacy audit", () => {
  const result = execFileSync(process.execPath, [path.join(root, "scripts/audit-public-tree.mjs")], { encoding: "utf8" });
  assert.match(result, /"safe": true/);
});
