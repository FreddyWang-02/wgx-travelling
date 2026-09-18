#!/usr/bin/env node
import fs from "node:fs";

const filename = process.argv[2];
if (!filename) {
  console.error("Usage: node select_deployment_target.mjs <capabilities.json>");
  process.exit(2);
}

const input = JSON.parse(fs.readFileSync(filename, "utf8"));
const providers = Array.isArray(input.providers) ? input.providers : [];
const rank = { "host-native": 0, "connected-mcp": 1, "authenticated-cli": 2, "user-cloud": 3 };

const profiles = [
  {
    id: "standard-cloud",
    required: ["hosting", "serverFunctions", "database", "secrets", "anonymousRead", "tokenRoutes"],
    limitations: [],
  },
  {
    id: "host-native",
    required: ["hosting", "database", "ownerEdit", "readOnlyShare", "accessControl", "conflictProtection"],
    limitations: ["uses-host-native-auth-and-storage"],
  },
  {
    id: "single-owner-published-share",
    required: ["hosting", "database", "ownerEdit", "publishedReadOnly", "accessControl", "savePreflight"],
    limitations: ["read-only-share-is-a-published-snapshot", "conflicts-use-save-preflight"],
  },
];

const evaluated = providers.map((provider) => {
  const profileResults = profiles.map((profile) => ({
    id: profile.id,
    missing: profile.required.filter((name) => provider.capabilities?.[name] !== true),
    limitations: profile.limitations,
  }));
  const matchedProfile = profileResults.find((profile) => profile.missing.length === 0) || null;
  const closestProfile = [...profileResults].sort((a, b) => a.missing.length - b.missing.length)[0];
  const eligible = provider.free === true && provider.billingRequired !== true && Boolean(matchedProfile);
  return {
    id: provider.id,
    kind: provider.kind,
    eligible,
    deploymentMode: matchedProfile?.id || null,
    missing: eligible ? [] : closestProfile.missing,
    profileChecks: profileResults,
    limitations: matchedProfile?.limitations || [],
    userSetup: provider.userSetup || "unknown",
    attachments: provider.capabilities?.objectStorage === true,
  };
}).sort((a, b) => (rank[a.kind] ?? 99) - (rank[b.kind] ?? 99));

const selected = evaluated.find((provider) => provider.eligible && ["none", "confirm"].includes(provider.userSetup))
  || evaluated.find((provider) => provider.eligible)
  || null;

console.log(JSON.stringify({
  selected,
  evaluated,
  finalDeliveryAllowed: Boolean(selected),
  staticPreviewOnly: !selected,
  nextAction: selected
    ? `deploy-with:${selected.id}`
    : "report-missing-capabilities-and-request-user-direction",
}, null, 2));
