// Shared flakiness scoring, used by both the Flaky Test Tracker list
// endpoint and the Discord alert hook so the definition of "flaky" can't
// drift between the two.

// A test needs at least this many comparable (passed/failed) results before
// a flakiness score means anything.
export const MIN_RUNS_FOR_RANKING = 3;

// Flakiness = how often the result flips between consecutive runs, not how
// often it fails. A test that fails every run scores 0 (consistently
// broken, not flaky); one that alternates pass/fail/pass/fail scores near 1.
export function computeFlakinessScore(sequence) {
  if (sequence.length < 2) return 0;
  let transitions = 0;
  for (let i = 1; i < sequence.length; i++) {
    if (sequence[i] !== sequence[i - 1]) transitions++;
  }
  return transitions / (sequence.length - 1);
}

export function getFlakinessForTestCase(db, testCaseId) {
  const rows = db
    .prepare(`
      SELECT r.result
      FROM test_run_results r
      JOIN test_runs_v2 tr ON tr.id = r.run_id
      WHERE r.test_case_id = ?
      ORDER BY tr.start_time ASC
    `)
    .all(testCaseId);

  const sequence = rows.filter((r) => r.result === "passed" || r.result === "failed").map((r) => r.result);
  if (sequence.length < MIN_RUNS_FOR_RANKING) return null;

  const failCount = sequence.filter((r) => r === "failed").length;

  return {
    flakiness_score: Math.round(computeFlakinessScore(sequence) * 100) / 100,
    fail_rate: Math.round((failCount / sequence.length) * 100) / 100,
    total_runs: sequence.length,
  };
}
