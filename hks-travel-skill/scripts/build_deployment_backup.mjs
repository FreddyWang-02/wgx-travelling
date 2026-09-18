#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { validateTravelPack } from "../assets/frontend-template/protocol.mjs";

const args = process.argv.slice(2);
const [travelPackPath, manifestPath, outputDirectory] = args;
const attachmentIndex = args.indexOf("--attachment-manifest");
const attachmentPath = attachmentIndex >= 0 ? args[attachmentIndex + 1] : null;
if (!travelPackPath || !manifestPath || !outputDirectory || (attachmentIndex >= 0 && !attachmentPath)) {
  console.error("Usage: node build_deployment_backup.mjs <travelpack.json> <deployment-manifest.json> <output-directory> [--attachment-manifest <file>]");
  process.exit(2);
}

const pack = JSON.parse(fs.readFileSync(travelPackPath, "utf8"));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const errors = validateTravelPack(pack);
if (errors.length) {
  console.error(errors.map((item) => `${item.path}: ${item.message}`).join("\n"));
  process.exit(1);
}
if (!["hks-travel-skill", "travel-guide-builder"].includes(manifest.product)) {
  console.error("Deployment manifest product must be hks-travel-skill or the legacy travel-guide-builder id");
  process.exit(1);
}

fs.mkdirSync(outputDirectory, { recursive: true });
const writeJson = (name, value) => {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(path.join(outputDirectory, name), text);
  return crypto.createHash("sha256").update(text).digest("hex");
};
const files = {
  "travelpack.json": writeJson("travelpack.json", pack),
  "deployment-manifest.json": writeJson("deployment-manifest.json", manifest),
};
if (attachmentPath) files["attachment-manifest.json"] = writeJson("attachment-manifest.json", JSON.parse(fs.readFileSync(attachmentPath, "utf8")));
const metadata = {
  format: "hks-travel-skill-deployment-backup",
  formatVersion: "1.0.0",
  createdAt: new Date().toISOString(),
  tripId: pack.trip.id,
  deploymentId: manifest.deploymentId,
  files,
};
writeJson("backup-metadata.json", metadata);
console.log(JSON.stringify({ backedUp: true, outputDirectory: path.resolve(outputDirectory), ...metadata }, null, 2));
