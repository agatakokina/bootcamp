// Manually (re-)generate the Flaky Test Tracker demo data against the local
// SQLite file. This same seeding also runs automatically on every server
// boot (see db.js) if it isn't present yet — this script exists for forcing
// a fresh regenerate during development without restarting the server.
//
// Usage: npm run seed:flaky -w server

import db from "../db.js";
import { FLAKY_SUITE_NAME, seedFlakyTestRuns } from "../seed-flaky-data.js";

const { caseCount, runCount, stats } = seedFlakyTestRuns(db);

console.log(`Seeded "${FLAKY_SUITE_NAME}" with ${caseCount} test cases and ${runCount} runs.\n`);
console.log("Observed pass/fail/skip counts per test case:");
for (const [title, counts] of stats) {
  const total = counts.passed + counts.failed + counts.skipped;
  const failRate = ((counts.failed / total) * 100).toFixed(0);
  console.log(`  ${failRate.padStart(3)}% fail  P:${counts.passed} F:${counts.failed} S:${counts.skipped}  ${title}`);
}
