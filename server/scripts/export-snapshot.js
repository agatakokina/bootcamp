// One-time export of the CURRENT local database into server/seed-snapshot.json,
// so db.js can seed a fresh database (local or Render, where the disk is
// wiped on every restart) with the exact same content as local dev instead
// of a smaller hand-curated demo set.
//
// Usage: node scripts/export-snapshot.js   (run from server/, or via npm script)

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import db from "../db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dependency order matters for re-insertion (parents before children).
const TABLES = [
  "test_cases",
  "test_suites",
  "suite_test_cases",
  "bugs",
  "bug_activity",
  "test_runs_v2",
  "test_run_results",
  "reports",
  "user_preferences",
];

const snapshot = {};
for (const table of TABLES) {
  snapshot[table] = db.prepare(`SELECT * FROM ${table}`).all();
}

const outPath = path.join(__dirname, "../seed-snapshot.json");
fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");

console.log(`Wrote snapshot to ${outPath}`);
for (const table of TABLES) {
  console.log(`  ${table}: ${snapshot[table].length} rows`);
}
