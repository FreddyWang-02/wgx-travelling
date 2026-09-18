#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

function request(label, url, options = {}) {
  const marker = "\n__TRAVEL_STATUS__";
  const args = [
    "--silent", "--show-error", "--retry", "3", "--max-time", "30",
    "--request", options.method || "GET",
  ];
  for (const [name, value] of Object.entries(options.headers || {})) args.push("--header", `${name}: ${value}`);
  if (options.body !== undefined) args.push("--data-binary", options.body);
  args.push("--write-out", `${marker}%{http_code}`, url);
  let raw;
  try {
    raw = execFileSync("curl", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (error) {
    throw new Error(`${label} request failed`, { cause: error });
  }
  const markerIndex = raw.lastIndexOf(marker);
  assert.ok(markerIndex >= 0, `${label} did not return a status marker`);
  const text = raw.slice(0, markerIndex);
  return {
    status: Number(raw.slice(markerIndex + marker.length)),
    text,
    json: () => JSON.parse(text),
  };
}

const [baseArg, readToken, editToken] = process.argv.slice(2);
if (!baseArg || !readToken || !editToken) {
  console.error("Usage: node verify_cloud_deployment.mjs <base-url> <read-token> <edit-token>");
  process.exit(2);
}
const base = baseArg.replace(/\/$/, "");
const readEndpoint = `${base}/api/r/${encodeURIComponent(readToken)}`;
const editEndpoint = `${base}/api/e/${encodeURIComponent(editToken)}`;

const health = request("health", `${base}/health`);
const readPage = request("read page", `${base}/r/${encodeURIComponent(readToken)}`);
const editPage = request("edit page", `${base}/e/${encodeURIComponent(editToken)}`);
const readResponse = request("read document", readEndpoint);
const editResponse = request("edit document", editEndpoint);

for (const [name, response] of Object.entries({ health, readPage, editPage, readResponse, editResponse })) {
  assert.equal(response.status, 200, `${name} should return 200`);
}

const readHtml = readPage.text;
const editHtml = editPage.text;
const readPayload = readResponse.json();
const editPayload = editResponse.json();

for (const label of ["出行", "行程", "准备", "记账", "资料"]) {
  assert.ok(readHtml.includes(label), `read page should include ${label}`);
}
assert.ok(editHtml.includes("维护旅行"), "edit page should expose the maintenance entry");
assert.ok(!readHtml.includes("data-delivery-mode=\"ui-review\""), "final page must not be a UI preview");
assert.equal(readPayload.revision, editPayload.revision, "read and edit links should expose the same revision");
assert.equal(readPayload.document.protocol, "travelpack");
assert.equal(readPayload.document.schemaVersion, "1.1.0");

for (const material of readPayload.document.materials.filter((item) => item.sensitive)) {
  assert.deepEqual(material.assetIds, []);
  assert.equal(material.url, null);
}
assert.ok(readPayload.document.assets.every((asset) => !("storageKey" in asset) && !("privateUrl" in asset)));

const denied = request("read-only write", readEndpoint, {
  method: "PUT",
  headers: { "content-type": "application/json", "if-match": `"${readPayload.revision}"` },
  body: JSON.stringify(readPayload.document),
});
assert.equal(denied.status, 403, "read-only links must reject writes");

const stale = request("stale write", editEndpoint, {
  method: "PUT",
  headers: { "content-type": "application/json", "if-match": '"999999999"' },
  body: JSON.stringify(editPayload.document),
});
assert.equal(stale.status, 412, "stale or mismatched revisions must be rejected");

const placeSearch = request("place search", `${editEndpoint}/places-search?query=${encodeURIComponent("故宫")}&region=${encodeURIComponent("北京")}`);
if (editPayload.capabilities.placeSearch) assert.equal(placeSearch.status, 200);
else assert.equal(placeSearch.status, 503, "map search should degrade explicitly without a key");

console.log(JSON.stringify({
  base,
  revision: editPayload.revision,
  checks: {
    health: "passed",
    fiveModules: "passed",
    existingLinks: "passed",
    readOnlyWriteRejected: "passed",
    sensitiveFieldsFiltered: "passed",
    staleRevisionRejected: "passed",
    placeSearch: editPayload.capabilities.placeSearch ? "live" : "manual-coordinate-and-schematic-fallback",
    attachments: editPayload.capabilities.attachments ? "available-not-mutated" : "skipped-by-user",
  },
}, null, 2));
