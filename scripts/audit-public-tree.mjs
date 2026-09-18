#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const self = path.resolve(import.meta.filename);
const deniedNames = [
  /^\.DS_Store$/,
  /^\.env(?:\.|$)/,
  /^auth\.secret$/,
  /\.(?:log|sqlite3?|db|pem|key|p12|pfx|har|trace|zip)$/i,
];
const ignoredSegments = new Set([".git", "node_modules"]);
const deniedSegments = new Set([
  ".playwright-cli", ".wrangler", "mail-outbox", "backups", "output",
  "release", "__pycache__", ".cache",
]);
const textExtensions = new Set([".css", ".html", ".js", ".json", ".jsonc", ".md", ".mjs", ".sql", ".yaml", ".yml"]);
const contentRules = [
  ["absolute macOS home path", /\/Users\/[A-Za-z0-9._-]+\//g],
  ["private key", /BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY/g],
  ["OpenAI-style secret", /\bsk-[A-Za-z0-9_-]{16,}\b/g],
  ["Tencent cloud secret id", /\bAKID[A-Za-z0-9]{12,}\b/g],
  ["Google API key", /\bAIza[A-Za-z0-9_-]{20,}\b/g],
  ["non-example email", /\b[A-Z0-9._%+-]+@(?!example\.(?:com|test)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/gi],
];

const failures = [];
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relative = path.relative(root, full);
    const segments = relative.split(path.sep);
    if (segments.some((segment) => ignoredSegments.has(segment))) continue;
    if (segments.some((segment) => deniedSegments.has(segment))) {
      failures.push(`${relative}: forbidden generated/private directory`);
      continue;
    }
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) files.push(full);
  }
}
walk(root);

for (const file of files) {
  const relative = path.relative(root, file);
  if (deniedNames.some((rule) => rule.test(path.basename(file)))) {
    failures.push(`${relative}: forbidden runtime or credential file`);
  }
  if (file === self || !textExtensions.has(path.extname(file).toLowerCase())) continue;
  const content = fs.readFileSync(file, "utf8");
  for (const [label, rule] of contentRules) {
    rule.lastIndex = 0;
    if (rule.test(content)) failures.push(`${relative}: ${label}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(JSON.stringify({ safe: true, filesScanned: files.length, root }, null, 2));
