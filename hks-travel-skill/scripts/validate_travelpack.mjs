#!/usr/bin/env node
import fs from "node:fs";
import { validateTravelPack } from "../assets/frontend-template/protocol.mjs";

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

const collections = ["companions", "days", "places", "itineraryItems", "transportSegments", "stays", "tasks", "expenses", "materials", "assets", "sources"];
console.log(JSON.stringify({
  valid: true,
  protocol: pack.protocol,
  schemaVersion: pack.schemaVersion,
  tripId: pack.trip.id,
  collections: Object.fromEntries(collections.map((name) => [name, pack[name].length])),
}, null, 2));
