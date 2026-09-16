import { Router } from "express";
import db from "../db.js";

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function summarizeActivity(row) {
  if (row.action === "created") return `bug #${row.bug_id} reported`;
  if (row.action === "status_change") return `bug #${row.bug_id} marked ${row.new_value}`;
  if (row.action === "comment") return `bug #${row.bug_id} commented on`;
  return `bug #${row.bug_id} updated`;
}

function getMetrics() {
  const totalTestCases = db
    .prepare("SELECT COUNT(*) AS count FROM test_cases WHERE deleted_at IS NULL")
    .get().count;

  const resultCounts = db
    .prepare(`
      SELECT result, COUNT(*) AS count
      FROM test_run_results
      WHERE result IN ('passed', 'failed', 'skipped')
      GROUP BY result
    `)
    .all();

  const byResult = { passed: 0, failed: 0, skipped: 0 };
  resultCounts.forEach((row) => {
    byResult[row.result] = row.count;
  });
  const totalExecuted = byResult.passed + byResult.failed + byResult.skipped;
  const passRate = totalExecuted > 0 ? Math.round((byResult.passed / totalExecuted) * 1000) / 10 : null;

  const openBugs = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM bugs
      WHERE deleted_at IS NULL AND status IN ('open', 'in-progress', 'reopened')
    `)
    .get().count;

  const completedRuns = db
    .prepare(`
      SELECT start_time, end_time
      FROM test_runs_v2
      WHERE status = 'completed' AND end_time IS NOT NULL
    `)
    .all();

  let avgRunDurationMs = null;
  if (completedRuns.length > 0) {
    const totalMs = completedRuns.reduce((sum, run) => {
      return sum + (new Date(run.end_time).getTime() - new Date(run.start_time).getTime());
    }, 0);
    avgRunDurationMs = Math.round(totalMs / completedRuns.length);
  }

  return {
    total_test_cases: totalTestCases,
    pass_rate: passRate,
    open_bugs: openBugs,
    avg_run_duration_ms: avgRunDurationMs,
  };
}

function getRecentRuns() {
  return db
    .prepare(`
      SELECT tr.id, tr.status, tr.pass_count, tr.fail_count, tr.skip_count, tr.start_time, tr.end_time, ts.name AS suite_name
      FROM test_runs_v2 tr
      LEFT JOIN test_suites ts ON ts.id = tr.suite_id
      ORDER BY tr.start_time DESC
      LIMIT 10
    `)
    .all();
}

function getRecentActivity() {
  const rows = db
    .prepare(`
      SELECT ba.id, ba.bug_id, ba.action, ba.old_value, ba.new_value, ba.message, ba.created_at, b.title AS bug_title
      FROM bug_activity ba
      JOIN bugs b ON b.id = ba.bug_id
      ORDER BY ba.created_at DESC
      LIMIT 10
    `)
    .all();

  return rows.map((row) => ({ ...row, summary: summarizeActivity(row) }));
}

function handleGetDashboardMetrics(req, res) {
  ok(res, {
    metrics: getMetrics(),
    recent_runs: getRecentRuns(),
    recent_activity: getRecentActivity(),
  });
}

function getPassRateTrend() {
  const runs = db
    .prepare(`
      SELECT id, start_time, pass_count, fail_count, skip_count
      FROM test_runs_v2
      WHERE status = 'completed'
      ORDER BY start_time DESC
      LIMIT 10
    `)
    .all();

  return runs.reverse().map((run) => {
    const total = run.pass_count + run.fail_count + run.skip_count;
    const passRate = total > 0 ? Math.round((run.pass_count / total) * 1000) / 10 : null;
    return { run_id: run.id, date: run.start_time, pass_rate: passRate };
  });
}

const WEEKS_OF_BUG_HISTORY = 8;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function getBugsWeekly() {
  const now = Date.now();
  const buckets = Array.from({ length: WEEKS_OF_BUG_HISTORY }, (_, i) => {
    const weeksAgo = WEEKS_OF_BUG_HISTORY - 1 - i;
    const end = now - weeksAgo * MS_PER_WEEK;
    const start = end - MS_PER_WEEK;
    return { start, end, opened: 0, closed: 0 };
  });

  const addToBucket = (isoDate, field) => {
    const t = new Date(isoDate).getTime();
    const bucket = buckets.find((b) => t >= b.start && t < b.end);
    if (bucket) bucket[field] += 1;
  };

  db.prepare("SELECT created_at FROM bugs WHERE deleted_at IS NULL")
    .all()
    .forEach((row) => addToBucket(row.created_at, "opened"));

  db.prepare(`
      SELECT created_at
      FROM bug_activity
      WHERE action = 'status_change' AND new_value IN ('resolved', 'closed')
    `)
    .all()
    .forEach((row) => addToBucket(row.created_at, "closed"));

  return buckets.map((b) => ({
    week_start: new Date(b.start).toISOString(),
    opened: b.opened,
    closed: b.closed,
  }));
}

const TEST_CASE_STATUSES = ["draft", "ready", "passed", "failed", "skipped"];

function getCoverageByStatus() {
  const rows = db
    .prepare(`
      SELECT status, COUNT(*) AS count
      FROM test_cases
      WHERE deleted_at IS NULL
      GROUP BY status
    `)
    .all();

  const byStatus = Object.fromEntries(TEST_CASE_STATUSES.map((status) => [status, 0]));
  rows.forEach((row) => {
    byStatus[row.status] = row.count;
  });

  return TEST_CASE_STATUSES.map((status) => ({ status, count: byStatus[status] }));
}

function handleGetDashboardTrends(req, res) {
  ok(res, {
    pass_rate_trend: getPassRateTrend(),
    bugs_weekly: getBugsWeekly(),
    coverage_by_status: getCoverageByStatus(),
  });
}

router.get("/metrics", handleGetDashboardMetrics);
router.get("/trends", handleGetDashboardTrends);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
