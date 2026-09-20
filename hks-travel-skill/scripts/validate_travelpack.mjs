#!/usr/bin/env node
import fs from "node:fs";
import { addonCollectionsV12, supportedSchemaVersions, validateTravelPack } from "../assets/frontend-template/protocol.mjs";

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: node validate_travelpack.mjs <travelpack.json>");
  process.exit(2);
}

let pack;
try {
  pack = JSON.parse(fs.readFileSync(filename, "utf8"));
} catch (error) {
  console.error(`INVALID_JSON: ${error.message}`);
  process.exit(1);
}

const errors = validateTravelPack(pack);
if (errors.length) {
  console.error(errors.map(({ path, message }) => `- ${path}: ${message}`).join("\n"));
  process.exit(1);
}

const coreCollections = ["companions", "days", "places", "itineraryItems", "transportSegments", "stays", "tasks", "expenses", "materials", "assets", "sources"];
const collections = {};
for (const name of [...coreCollections, ...addonCollectionsV12]) {
  if (Array.isArray(pack[name])) collections[name] = pack[name].length;
}
console.log(JSON.stringify({
  valid: true,
  protocol: pack.protocol,
  schemaVersion: pack.schemaVersion,
  supportedSchemaVersions,
  tripId: pack.trip.id,
  tripStatus: pack.tripStatus ?? null,
  collections,
  planningAddons: addonCollectionsV12.filter((name) => Array.isArray(pack[name])),
}, null, 2));
