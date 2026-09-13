import { Router } from "express";
import db from "./db.js";

const RESULTS = ["pending", "passed", "failed", "skipped"];
const SETTABLE_RESULTS = ["passed", "failed", "skipped"];

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function getRunOr404(id) {
  return db
    .prepare(`
      SELECT tr.*, ts.name AS suite_name
      FROM test_runs_v2 tr
      LEFT JOIN test_suites ts ON ts.id = tr.suite_id
      WHERE tr.id = ?
    `)
    .get(id);
}

function getRunResults(runId) {
  return db
    .prepare(`
      SELECT
        r.id, r.run_id, r.test_case_id, r.result, r.duration_ms, r.notes, r.failed_at, r.discord_alert_sent_at,
        tc.title, tc.severity, tc.test_type
      FROM test_run_results r
      JOIN test_cases tc ON tc.id = r.test_case_id
      WHERE r.run_id = ?
      ORDER BY r.sort_order ASC
    `)
    .all(runId);
}

function serializeRun(run, withResults) {
  const base = { ...run };
  if (withResults) base.results = getRunResults(run.id);
  return base;
}

function recomputeRunCounts(runId) {
  const counts = db
    .prepare(`
      SELECT result, COUNT(*) AS count
      FROM test_run_results
      WHERE run_id = ?
      GROUP BY result
    `)
    .all(runId);

  const byResult = { pending: 0, passed: 0, failed: 0, skipped: 0 };
  counts.forEach((row) => {
    byResult[row.result] = row.count;
  });

  const isCompleted = byResult.pending === 0;
  const run = db.prepare("SELECT status, end_time FROM test_runs_v2 WHERE id = ?").get(runId);

  db.prepare(`
    UPDATE test_runs_v2
    SET pass_count = ?, fail_count = ?, skip_count = ?, status = ?, end_time = ?
    WHERE id = ?
  `).run(
    byResult.passed,
    byResult.failed,
    byResult.skipped,
    isCompleted ? "completed" : "in-progress",
    isCompleted ? run.end_time || new Date().toISOString() : null,
    runId
  );
}

async function postDiscordFailureAlert({ caseTitle, notes, runId }) {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("DISCORD_WEBHOOK_URL is not set; skipping failure alert.");
    return false;
  }

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:5173";
  const runLink = `${baseUrl}/test-runs/${runId}`;

  const content = [
    `🔴 Test failed: **${caseTitle}**`,
    `Notes: ${notes && notes.trim() ? notes.trim() : "No notes provided."}`,
    `Run: ${runLink}`,
  ].join("\n");

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!res.ok) {
    throw new Error(`Discord webhook responded with ${res.status}`);
  }

  return true;
}

function handleListRuns(req, res) {
  const runs = db
    .prepare(`
      SELECT tr.*, ts.name AS suite_name
      FROM test_runs_v2 tr
      LEFT JOIN test_suites ts ON ts.id = tr.suite_id
      ORDER BY tr.start_time DESC
    `)
    .all();

  ok(res, runs.map((run) => serializeRun(run, false)));
}

function handleGetRun(req, res) {
  const run = getRunOr404(req.params.id);
  if (!run) return fail(res, 404, "Run not found.");
  ok(res, serializeRun(run, true));
}

function handleCreateRun(req, res) {
  const suiteId = Number(req.body.suite_id);
  if (!Number.isInteger(suiteId)) return fail(res, 400, "suite_id must be an integer.");

  const suite = db.prepare("SELECT id FROM test_suites WHERE id = ?").get(suiteId);
  if (!suite) return fail(res, 404, "Suite not found.");

  let createdBy = null;
  if (req.body.created_by !== undefined) {
    if (typeof req.body.created_by !== "string") return fail(res, 400, "created_by must be a string.");
    createdBy = req.body.created_by.trim() || null;
  }

  const suiteCases = db
    .prepare(`
      SELECT tc.id
      FROM suite_test_cases stc
      JOIN test_cases tc ON tc.id = stc.test_case_id
      WHERE stc.suite_id = ? AND tc.deleted_at IS NULL
      ORDER BY stc.sort_order ASC
    `)
    .all(suiteId);

  if (suiteCases.length === 0) {
    return fail(res, 400, "This suite has no active test cases to run.");
  }

  const insertRun = db.prepare(`
    INSERT INTO test_runs_v2 (suite_id, created_by) VALUES (?, ?)
  `);
  const insertResult = db.prepare(`
    INSERT INTO test_run_results (run_id, test_case_id, sort_order) VALUES (?, ?, ?)
  `);

  const createRun = db.transaction(() => {
    const result = insertRun.run(suiteId, createdBy);
    const runId = result.lastInsertRowid;
    suiteCases.forEach((tc, index) => insertResult.run(runId, tc.id, index));
    return runId;
  });

  const runId = createRun();
  ok(res, serializeRun(getRunOr404(runId), true));
}

async function handleUpdateRunResult(req, res) {
  try {
    const run = getRunOr404(req.params.id);
    if (!run) return fail(res, 404, "Run not found.");

    const resultRow = db
      .prepare("SELECT * FROM test_run_results WHERE run_id = ? AND test_case_id = ?")
      .get(req.params.id, req.params.testCaseId);
    if (!resultRow) return fail(res, 404, "This test case is not part of the run.");

    const newResult = req.body.result;
    if (!SETTABLE_RESULTS.includes(newResult)) {
      return fail(res, 400, `Result must be one of: ${SETTABLE_RESULTS.join(", ")}.`);
    }

    let notes = resultRow.notes;
    if (req.body.notes !== undefined) {
      if (typeof req.body.notes !== "string") return fail(res, 400, "Notes must be a string.");
      notes = req.body.notes.trim() || null;
    }

    let durationMs = resultRow.duration_ms;
    if (req.body.duration_ms !== undefined) {
      if (!Number.isInteger(req.body.duration_ms) || req.body.duration_ms < 0) {
        return fail(res, 400, "duration_ms must be a non-negative integer.");
      }
      durationMs = req.body.duration_ms;
    }

    const failedAt = newResult === "failed" ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE test_run_results
      SET result = ?, notes = ?, duration_ms = ?, failed_at = ?
      WHERE id = ?
    `).run(newResult, notes, durationMs, failedAt, resultRow.id);

    if (newResult === "failed") {
      const testCase = db.prepare("SELECT title FROM test_cases WHERE id = ?").get(req.params.testCaseId);
      try {
        await postDiscordFailureAlert({ caseTitle: testCase.title, notes, runId: req.params.id });
        db.prepare("UPDATE test_run_results SET discord_alert_sent_at = ? WHERE id = ?").run(
          new Date().toISOString(),
          resultRow.id
        );
      } catch (webhookErr) {
        console.error("Failed to send Discord failure alert:", webhookErr);
      }
    }

    recomputeRunCounts(req.params.id);

    ok(res, serializeRun(getRunOr404(req.params.id), true));
  } catch (err) {
    console.error(err);
    fail(res, 500, "Unexpected server error.");
  }
}

router.get("/", handleListRuns);
router.get("/:id", handleGetRun);
router.post("/", handleCreateRun);
router.put("/:id/results/:testCaseId", handleUpdateRunResult);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
