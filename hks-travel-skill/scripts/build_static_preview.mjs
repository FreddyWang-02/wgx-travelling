#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateTravelPack } from "../assets/frontend-template/protocol.mjs";

const [, , inputName, outputName, modeFlag] = process.argv;
if (!inputName || !outputName) {
  console.error("Usage: node build_static_preview.mjs <travelpack.json> <output-directory> [--ui-review]");
  process.exit(2);
}

const pack = JSON.parse(fs.readFileSync(inputName, "utf8"));
const errors = validateTravelPack(pack);
if (errors.length) {
  console.error(errors.map(({ path: field, message }) => `- ${field}: ${message}`).join("\n"));
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const templateDir = path.resolve(scriptDir, "../assets/frontend-template");
const outputDir = path.resolve(outputName);
fs.mkdirSync(outputDir, { recursive: true });

for (const name of fs.readdirSync(templateDir)) {
  fs.cpSync(path.join(templateDir, name), path.join(outputDir, name), { recursive: true });
}

const indexPath = path.join(outputDir, "index.html");
const index = fs.readFileSync(indexPath, "utf8");
const payload = JSON.stringify(pack).replaceAll("<", "\\u003c");
const marker = '<script type="module" src="/app.mjs"></script>';
if (!index.includes(marker)) throw new Error("frontend template is missing the module script marker");
const deliveryMode = modeFlag === "--ui-review" ? "ui-review" : "static-read-only-preview";
const withMode = index.replace("<body>", `<body data-delivery-mode="${deliveryMode}">`);
const withData = withMode.replace(marker, `<script id="travelpack-data" type="application/json">${payload}</script>\n  ${marker}`);
const previewHtml = withData
  .replace('href="/vendor/leaflet/leaflet.css"', 'href="./vendor/leaflet/leaflet.css"')
  .replace('href="/app.css"', 'href="./app.css"')
  .replace('src="/lucide.js"', 'src="./lucide.js"')
  .replace('src="/vendor/leaflet/leaflet.js"', 'src="./vendor/leaflet/leaflet.js"')
  .replace('src="/app.mjs"', 'src="./app.mjs"');
fs.writeFileSync(indexPath, previewHtml);
const nextCommand = `node scripts/serve_ui_preview.mjs ${JSON.stringify(outputDir)} --port 0`;
console.log(JSON.stringify({
  built: true,
  mode: deliveryMode,
  outputDir,
  tripId: pack.trip.id,
  reviewUrlRequired: true,
  filePreviewAllowed: false,
  nextCommand,
}, null, 2));
