import { Router } from "express";
import db from "./db.js";
import { computeFlakinessScore, MIN_RUNS_FOR_RANKING } from "./flakiness.js";

const router = Router();

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function handleListFlakyTests(req, res) {
  const limit = Math.min(Math.max(Number(req.query.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const rows = db
    .prepare(`
      SELECT
        r.test_case_id, r.result, r.notes,
        tr.start_time,
        tc.title, tc.severity, tc.test_type, tc.status
      FROM test_run_results r
      JOIN test_runs_v2 tr ON tr.id = r.run_id
      JOIN test_cases tc ON tc.id = r.test_case_id
      WHERE tc.deleted_at IS NULL
      ORDER BY r.test_case_id ASC, tr.start_time ASC
    `)
    .all();

  const byTestCase = new Map();
  for (const row of rows) {
    if (!byTestCase.has(row.test_case_id)) {
      byTestCase.set(row.test_case_id, {
        test_case_id: row.test_case_id,
        title: row.title,
        severity: row.severity,
        test_type: row.test_type,
        status: row.status,
        entries: [],
      });
    }
    byTestCase.get(row.test_case_id).entries.push(row);
  }

  const summaries = [];
  for (const tc of byTestCase.values()) {
    const sequence = tc.entries.filter((e) => e.result === "passed" || e.result === "failed").map((e) => e.result);
    if (sequence.length < MIN_RUNS_FOR_RANKING) continue;

    const passCount = sequence.filter((r) => r === "passed").length;
    const failCount = sequence.length - passCount;
    const skipCount = tc.entries.length - sequence.length;

    const hypothesisCounts = new Map();
    for (const e of tc.entries) {
      if (e.result !== "failed") continue;
      const text = (e.notes || "").trim();
      if (!text) continue;
      hypothesisCounts.set(text, (hypothesisCounts.get(text) || 0) + 1);
    }
    const rootCauseHypotheses = [...hypothesisCounts.entries()]
      .map(([hypothesis, occurrences]) => ({ hypothesis, occurrences }))
      .sort((a, b) => b.occurrences - a.occurrences);

    const last = tc.entries[tc.entries.length - 1];

    summaries.push({
      test_case_id: tc.test_case_id,
      title: tc.title,
      severity: tc.severity,
      test_type: tc.test_type,
      status: tc.status,
      total_runs: tc.entries.length,
      pass_count: passCount,
      fail_count: failCount,
      skip_count: skipCount,
      flakiness_score: Math.round(computeFlakinessScore(sequence) * 100) / 100,
      fail_rate: Math.round((failCount / sequence.length) * 100) / 100,
      last_result: last.result,
      last_run_at: last.start_time,
      root_cause_hypotheses: rootCauseHypotheses.length
        ? rootCauseHypotheses
        : failCount > 0
          ? [
              {
                hypothesis: "No failure notes were recorded — add notes when marking a run failed to help narrow this down.",
                occurrences: failCount,
              },
            ]
          : [],
    });
  }

  summaries.sort((a, b) => b.flakiness_score - a.flakiness_score || b.fail_count - a.fail_count);

  ok(res, {
    generated_at: new Date().toISOString(),
    tests: summaries.slice(0, limit),
  });
}

router.get("/", handleListFlakyTests);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
