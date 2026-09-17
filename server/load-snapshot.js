// Loads server/seed-snapshot.json (a full export of every table, produced by
// scripts/export-snapshot.js) into a fresh database, preserving explicit ids
// so foreign keys between tables stay consistent. Used by db.js so a brand
// new database — local first run, or Render after its disk gets wiped on a
// redeploy/restart — starts with the exact same content as local dev, not a
// smaller hand-curated demo set.

import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dependency order: parents before children, so foreign keys are satisfied
// row by row as each table is inserted.
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

export function loadSeedSnapshot(db) {
  const snapshotPath = path.join(__dirname, "seed-snapshot.json");
  if (!fs.existsSync(snapshotPath)) return;

  const snapshot = JSON.parse(fs.readFileSync(snapshotPath, "utf-8"));

  const insertAll = db.transaction(() => {
    for (const table of TABLES) {
      const rows = snapshot[table] || [];
      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const placeholders = columns.map((c) => `@${c}`).join(", ");
      const insert = db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
      for (const row of rows) insert.run(row);
    }
  });

  insertAll();
}
