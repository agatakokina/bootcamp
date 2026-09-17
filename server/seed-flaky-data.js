// Generates historical test run data with a realistic mix of flaky, stable,
// and consistently-broken test cases, so the Flaky Test Tracker feature has
// real data to compute against. Idempotent and safe to re-run: it wipes and
// regenerates only the "Flaky Test Tracker Demo Suite" it owns (identified
// by the TITLE_PREFIX on its test cases), leaving every other suite/case/run
// alone.
//
// Exported so it can run two ways: automatically on server boot (see
// db.js), which matters because Render's free tier has no persistent disk —
// the SQLite file is wiped on every redeploy, so this must regenerate itself
// rather than being a one-off script only run locally — and manually via
// `npm run seed:flaky -w server` during development.

export const FLAKY_SUITE_NAME = "Flaky Test Tracker Demo Suite";
const SUITE_FEATURE = "flaky-tracker-demo";
export const FLAKY_TITLE_PREFIX = "[Flaky Seed] ";
const NUM_RUNS = 30;
const RUN_CREATORS = ["ci-bot", "agata", "morgan"];

// Seeded PRNG (mulberry32) so re-running the seed reproduces the same data
// instead of a different random sample every time.
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TEST_CASE_DEFS = [
  {
    title: "Login redirects to last visited page after re-authentication",
    severity: "major",
    test_type: "smoke",
    flakeRate: 0.0,
    baseDurationMs: 480,
    failureNotes: [],
  },
  {
    title: "Bug status badge shows the correct color",
    severity: "trivial",
    test_type: "smoke",
    flakeRate: 0.0,
    baseDurationMs: 210,
    failureNotes: [],
  },
  {
    title: "Checkout completes with a saved payment method",
    severity: "major",
    test_type: "smoke",
    flakeRate: 0.03,
    baseDurationMs: 1400,
    failureNotes: ["Payment gateway occasionally returns a timeout on the confirm step under load."],
  },
  {
    title: "CSV export download completes successfully",
    severity: "minor",
    test_type: "regression",
    flakeRate: 0.08,
    baseDurationMs: 1900,
    failureNotes: [
      "Large export occasionally exceeds the request timeout before streaming completes.",
      "csv-stringify occasionally chokes on a field containing an unescaped delimiter from legacy data.",
    ],
  },
  {
    title: "Suite case order persists after drag-and-drop reorder",
    severity: "minor",
    test_type: "regression",
    flakeRate: 0.15,
    baseDurationMs: 900,
    failureNotes: [
      "Drag-and-drop reorder occasionally sends a stale sort_order array if the drop fires before the previous PATCH resolves.",
      "Two rapid reorders occasionally race and the second write overwrites the first with stale data.",
    ],
  },
  {
    title: "File upload completes without creating a duplicate record",
    severity: "major",
    test_type: "regression",
    flakeRate: 0.2,
    baseDurationMs: 1650,
    failureNotes: [
      "A double-submit guard race condition occasionally lets two upload requests through.",
      "Duplicate-detection query occasionally runs against a stale read replica.",
    ],
  },
  {
    title: "User session persists across a full page refresh",
    severity: "critical",
    test_type: "smoke-regression",
    flakeRate: 0.25,
    baseDurationMs: 760,
    failureNotes: [
      "Session cookie's SameSite attribute occasionally drops it on a hard refresh in Safari.",
      "Token refresh race: the refresh call and the page-load auth check occasionally interleave.",
      "Redis session store occasionally evicts the session under memory pressure.",
    ],
  },
  {
    title: "Dashboard chart renders after initial data fetch",
    severity: "minor",
    test_type: "regression",
    flakeRate: 0.3,
    baseDurationMs: 1100,
    failureNotes: [
      "Chart library renders before the async data fetch resolves, showing an empty canvas.",
      "ResizeObserver callback occasionally fires twice in rapid succession, causing a broken render.",
      "Chart data transform throws on a rare null field from the aggregation query.",
    ],
  },
  {
    title: "Password strength meter updates as the user types",
    severity: "trivial",
    test_type: "regression",
    flakeRate: 0.35,
    baseDurationMs: 540,
    failureNotes: [
      "Scoring runs in a worker that occasionally hasn't loaded yet on the first keystroke.",
      "Debounced keystroke handler occasionally drops the final keystroke before scoring.",
    ],
  },
  {
    title: "Notification badge count updates in real time",
    severity: "minor",
    test_type: "regression",
    flakeRate: 0.4,
    baseDurationMs: 950,
    failureNotes: [
      "WebSocket reconnect occasionally misses the count-update event sent during the gap.",
      "Badge count read occasionally happens before the increment transaction commits.",
      "Client-side count cache isn't invalidated on a rapid double-notification burst.",
    ],
  },
  {
    title: "Search results load within the expected timeout",
    severity: "major",
    test_type: "regression",
    flakeRate: 0.45,
    baseDurationMs: 1300,
    failureNotes: [
      "Search index refresh lags behind the write, so results are occasionally empty on the first request.",
      "Query occasionally times out under load before returning matches.",
      "Debounce timer sometimes fires before the input value is fully committed to state.",
    ],
  },
  {
    title: "Bulk delete removes every selected test case",
    severity: "critical",
    test_type: "regression",
    flakeRate: 1.0,
    baseDurationMs: 1050,
    failureNotes: [
      "Bulk delete endpoint only removes the first selected row; the remaining IDs in the batch are silently ignored (reproducible every run, not flaky).",
    ],
  },
];

export function seedFlakyTestRuns(db) {
  const rng = mulberry32(42);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];

  const cleanup = db.transaction(() => {
    const existingSuite = db.prepare("SELECT id FROM test_suites WHERE name = ?").get(FLAKY_SUITE_NAME);
    if (existingSuite) {
      const runIds = db
        .prepare("SELECT id FROM test_runs_v2 WHERE suite_id = ?")
        .all(existingSuite.id)
        .map((r) => r.id);
      const deleteRun = db.prepare("DELETE FROM test_runs_v2 WHERE id = ?");
      for (const id of runIds) deleteRun.run(id); // cascades to test_run_results
      db.prepare("DELETE FROM test_suites WHERE id = ?").run(existingSuite.id); // cascades suite_test_cases
    }
    db.prepare("DELETE FROM test_cases WHERE title LIKE ?").run(`${FLAKY_TITLE_PREFIX}%`);
  });

  const seed = db.transaction(() => {
    const insertCase = db.prepare(`
      INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, test_type)
      VALUES (@title, @preconditions, @steps, @expected_result, @severity, 'ready', @test_type)
    `);

    const caseIds = TEST_CASE_DEFS.map((def) => {
      const result = insertCase.run({
        title: `${FLAKY_TITLE_PREFIX}${def.title}`,
        preconditions: "The app is deployed and the demo dataset is loaded.",
        steps: JSON.stringify(["Run the automated check for this scenario in CI.", "Record pass, fail, or skip."]),
        expected_result: def.title,
        severity: def.severity,
        test_type: def.test_type,
      });
      return { id: result.lastInsertRowid, def };
    });

    const insertSuite = db.prepare(`
      INSERT INTO test_suites (name, feature, status)
      VALUES (@name, @feature, 'ready')
    `);
    const suiteId = insertSuite.run({ name: FLAKY_SUITE_NAME, feature: SUITE_FEATURE }).lastInsertRowid;

    const insertSuiteCase = db.prepare(`
      INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order)
      VALUES (@suite_id, @test_case_id, @sort_order)
    `);
    caseIds.forEach(({ id }, index) => {
      insertSuiteCase.run({ suite_id: suiteId, test_case_id: id, sort_order: index });
    });

    const insertRun = db.prepare(`
      INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
      VALUES (@suite_id, 'completed', @pass_count, @fail_count, @skip_count, @start_time, @end_time, @created_by)
    `);

    const insertResult = db.prepare(`
      INSERT INTO test_run_results
        (run_id, test_case_id, result, duration_ms, notes, failed_at, discord_alert_sent_at, sort_order)
      VALUES (@run_id, @test_case_id, @result, @duration_ms, @notes, @failed_at, null, @sort_order)
    `);

    const now = Date.now();
    const stats = new Map(caseIds.map(({ def }) => [def.title, { passed: 0, failed: 0, skipped: 0 }]));

    for (let runIndex = 0; runIndex < NUM_RUNS; runIndex++) {
      // Most recent run is "now"; earlier runs step back roughly one day at
      // a time with jitter, so timestamps look like real CI history rather
      // than perfectly even intervals.
      const daysAgo = NUM_RUNS - 1 - runIndex;
      const jitterMs = Math.floor(rng() * 4 * 60 * 60 * 1000); // up to 4h jitter
      const startTime = new Date(now - daysAgo * 24 * 60 * 60 * 1000 - jitterMs);

      let cursor = startTime.getTime();
      let passCount = 0;
      let failCount = 0;
      let skipCount = 0;
      const rowsToInsert = [];

      caseIds.forEach(({ id, def }, index) => {
        const duration = Math.round(def.baseDurationMs * (0.7 + rng() * 0.6));
        cursor += duration;

        const skipRoll = rng();
        let result;
        if (skipRoll < 0.02) {
          result = "skipped";
          skipCount++;
        } else if (rng() < def.flakeRate) {
          result = "failed";
          failCount++;
        } else {
          result = "passed";
          passCount++;
        }

        const failedAt = result === "failed" ? new Date(cursor).toISOString() : null;
        const notes = result === "failed" && def.failureNotes.length ? pick(def.failureNotes) : null;

        stats.get(def.title)[result === "skipped" ? "skipped" : result === "failed" ? "failed" : "passed"]++;

        rowsToInsert.push({
          test_case_id: id,
          result,
          duration_ms: result === "skipped" ? null : duration,
          notes,
          failed_at: failedAt,
          sort_order: index,
        });
      });

      const endTime = new Date(cursor);
      const runId = insertRun.run({
        suite_id: suiteId,
        pass_count: passCount,
        fail_count: failCount,
        skip_count: skipCount,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        created_by: pick(RUN_CREATORS),
      }).lastInsertRowid;

      for (const row of rowsToInsert) {
        insertResult.run({ run_id: runId, ...row });
      }
    }

    return stats;
  });

  cleanup();
  return { caseCount: TEST_CASE_DEFS.length, runCount: NUM_RUNS, stats: seed() };
}
