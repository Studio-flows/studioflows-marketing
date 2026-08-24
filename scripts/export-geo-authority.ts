import { execFileSync } from "node:child_process";

import { buildGeoAuthorityExport } from "../lib/geo/authority-export.ts";

const requestedSha = process.argv[2];
if (requestedSha === undefined || !/^[0-9a-f]{40}$/.test(requestedSha)) {
  throw new Error("GEO_AUTHORITY_COMMIT_SHA_REQUIRED");
}

const currentSha = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
if (currentSha !== requestedSha) {
  throw new Error("GEO_AUTHORITY_CHECKOUT_SHA_MISMATCH");
}

const dirtyState = execFileSync("git", ["status", "--porcelain"], {
  encoding: "utf8",
}).trim();
if (dirtyState.length > 0) {
  throw new Error("GEO_AUTHORITY_CHECKOUT_DIRTY");
}

process.stdout.write(`${JSON.stringify(buildGeoAuthorityExport(requestedSha))}\n`);
