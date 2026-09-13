import { Router } from "express";
import db from "./db.js";

const SEVERITIES = ["critical", "major", "minor", "trivial"];
const STATUSES = ["draft", "ready", "passed", "failed", "skipped"];
const TEST_TYPES = ["smoke", "regression", "smoke-regression"];
const SEVERITY_RANK = { critical: 0, major: 1, minor: 2, trivial: 3 };

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function getSuitesForTestCase(testCaseId) {
  return db
    .prepare(`
      SELECT ts.id, ts.name
      FROM suite_test_cases stc
      JOIN test_suites ts ON ts.id = stc.suite_id
      WHERE stc.test_case_id = ?
      ORDER BY ts.name ASC
    `)
    .all(testCaseId);
}

function serializeRow(row) {
  return { ...row, steps: JSON.parse(row.steps), suites: getSuitesForTestCase(row.id) };
}

function validateTestCase(body, { partial = false } = {}) {
  const errors = [];
  const fields = {};

  const requireString = (key, label) => {
    if (body[key] === undefined) {
      if (!partial) errors.push(`${label} is required.`);
      return;
    }
    if (typeof body[key] !== "string" || body[key].trim() === "") {
      errors.push(`${label} must be a non-empty string.`);
      return;
    }
    fields[key] = body[key].trim();
  };

  requireString("title", "Title");
  requireString("expected_result", "Expected result");

  if (body.preconditions !== undefined) {
    if (typeof body.preconditions !== "string") {
      errors.push("Preconditions must be a string.");
    } else {
      fields.preconditions = body.preconditions.trim();
    }
  } else if (!partial) {
    fields.preconditions = "";
  }

  if (body.steps === undefined) {
    if (!partial) errors.push("Steps is required.");
  } else if (!Array.isArray(body.steps) || body.steps.length === 0 || body.steps.some((s) => typeof s !== "string" || s.trim() === "")) {
    errors.push("Steps must be a non-empty array of non-empty strings.");
  } else {
    fields.steps = JSON.stringify(body.steps.map((s) => s.trim()));
  }

  if (body.severity === undefined) {
    if (!partial) errors.push("Severity is required.");
  } else if (!SEVERITIES.includes(body.severity)) {
    errors.push(`Severity must be one of: ${SEVERITIES.join(", ")}.`);
  } else {
    fields.severity = body.severity;
  }

  if (body.status === undefined) {
    if (!partial) fields.status = "draft";
  } else if (!STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${STATUSES.join(", ")}.`);
  } else {
    fields.status = body.status;
  }

  if (body.test_type === undefined) {
    if (!partial) errors.push("Test type is required.");
  } else if (!TEST_TYPES.includes(body.test_type)) {
    errors.push(`Test type must be one of: ${TEST_TYPES.join(", ")}.`);
  } else {
    fields.test_type = body.test_type;
  }

  return { errors, fields };
}

function handleListTestCases(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const search = (req.query.search || "").trim();
  const status = req.query.status;
  const showDeleted = req.query.deleted === "true";
  const sortBy = req.query.sortBy === "severity" ? "severity" : "updated_at";
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  const where = [showDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"];
  const params = {};

  if (search) {
    where.push("title LIKE @search");
    params.search = `%${search}%`;
  }

  if (status) {
    if (!STATUSES.includes(status)) {
      return fail(res, 400, `Status must be one of: ${STATUSES.join(", ")}.`);
    }
    where.push("status = @status");
    params.status = status;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const orderClause =
    sortBy === "severity"
      ? `ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 WHEN 'minor' THEN 2 WHEN 'trivial' THEN 3 END ${sortDir}`
      : `ORDER BY updated_at ${sortDir}`;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM test_cases ${whereClause}`).get(params).count;

  const rows = db
    .prepare(`SELECT * FROM test_cases ${whereClause} ${orderClause} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  ok(res, {
    items: rows.map(serializeRow),
    total,
    page,
    pageSize,
  });
}

function handleGetTestCase(req, res) {
  const row = db.prepare("SELECT * FROM test_cases WHERE id = ?").get(req.params.id);
  if (!row) return fail(res, 404, "Test case not found.");
  ok(res, serializeRow(row));
}

function handleCreateTestCase(req, res) {
  const { errors, fields } = validateTestCase(req.body, { partial: false });
  if (errors.length) return fail(res, 400, errors.join(" "));

  const result = db
    .prepare(`
      INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, test_type)
      VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @test_type)
    `)
    .run(fields);

  const row = db.prepare("SELECT * FROM test_cases WHERE id = ?").get(result.lastInsertRowid);
  ok(res, serializeRow(row));
}

function handleUpdateTestCase(req, res) {
  const existing = db.prepare("SELECT * FROM test_cases WHERE id = ?").get(req.params.id);
  if (!existing) return fail(res, 404, "Test case not found.");

  const { errors, fields } = validateTestCase(req.body, { partial: true });
  if (errors.length) return fail(res, 400, errors.join(" "));
  if (Object.keys(fields).length === 0) return fail(res, 400, "No valid fields provided.");

  const setClause = Object.keys(fields)
    .map((key) => `${key} = @${key}`)
    .join(", ");

  db.prepare(`
    UPDATE test_cases
    SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `).run({ ...fields, id: req.params.id });

  const row = db.prepare("SELECT * FROM test_cases WHERE id = ?").get(req.params.id);
  ok(res, serializeRow(row));
}

function handleDeleteTestCase(req, res) {
  const existing = db.prepare("SELECT * FROM test_cases WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!existing) return fail(res, 404, "Test case not found.");

  db.prepare("UPDATE test_cases SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    req.params.id
  );
  ok(res, { id: Number(req.params.id) });
}

function handleRestoreTestCase(req, res) {
  const existing = db.prepare("SELECT * FROM test_cases WHERE id = ? AND deleted_at IS NOT NULL").get(req.params.id);
  if (!existing) return fail(res, 404, "Deleted test case not found.");

  db.prepare(`
    UPDATE test_cases
    SET deleted_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  const row = db.prepare("SELECT * FROM test_cases WHERE id = ?").get(req.params.id);
  ok(res, serializeRow(row));
}

router.get("/", handleListTestCases);
router.get("/:id", handleGetTestCase);
router.post("/", handleCreateTestCase);
router.put("/:id", handleUpdateTestCase);
router.delete("/:id", handleDeleteTestCase);
router.post("/:id/restore", handleRestoreTestCase);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
