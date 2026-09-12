import { Router } from "express";
import db from "./db.js";

const STATUSES = ["draft", "ready", "in-progress", "passed", "failed"];

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function getSuiteOr404(id) {
  return db.prepare("SELECT * FROM test_suites WHERE id = ?").get(id);
}

function getSuiteCases(suiteId) {
  return db
    .prepare(`
      SELECT tc.id, tc.title, tc.severity, tc.status, tc.test_type, stc.sort_order
      FROM suite_test_cases stc
      JOIN test_cases tc ON tc.id = stc.test_case_id
      WHERE stc.suite_id = ? AND tc.deleted_at IS NULL
      ORDER BY stc.sort_order ASC
    `)
    .all(suiteId);
}

function serializeSuite(suite, withCases) {
  const caseCount = db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM suite_test_cases stc
      JOIN test_cases tc ON tc.id = stc.test_case_id
      WHERE stc.suite_id = ? AND tc.deleted_at IS NULL
    `)
    .get(suite.id).count;

  const base = { ...suite, case_count: caseCount };
  if (withCases) base.cases = getSuiteCases(suite.id);
  return base;
}

function validateSuite(body, { partial = false } = {}) {
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

  requireString("name", "Name");
  requireString("feature", "Feature");

  if (body.status === undefined) {
    if (!partial) fields.status = "draft";
  } else if (!STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${STATUSES.join(", ")}.`);
  } else {
    fields.status = body.status;
  }

  return { errors, fields };
}

function handleListSuites(req, res) {
  const status = req.query.status;
  const where = [];
  const params = {};

  if (status) {
    if (!STATUSES.includes(status)) {
      return fail(res, 400, `Status must be one of: ${STATUSES.join(", ")}.`);
    }
    where.push("status = @status");
    params.status = status;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const suites = db.prepare(`SELECT * FROM test_suites ${whereClause} ORDER BY updated_at DESC`).all(params);

  ok(res, suites.map((s) => serializeSuite(s, false)));
}

function handleGetSuite(req, res) {
  const suite = getSuiteOr404(req.params.id);
  if (!suite) return fail(res, 404, "Suite not found.");
  ok(res, serializeSuite(suite, true));
}

function handleCreateSuite(req, res) {
  const { errors, fields } = validateSuite(req.body, { partial: false });
  if (errors.length) return fail(res, 400, errors.join(" "));

  const result = db
    .prepare("INSERT INTO test_suites (name, feature, status) VALUES (@name, @feature, @status)")
    .run(fields);

  ok(res, serializeSuite(getSuiteOr404(result.lastInsertRowid), true));
}

function handleUpdateSuite(req, res) {
  const existing = getSuiteOr404(req.params.id);
  if (!existing) return fail(res, 404, "Suite not found.");

  const { errors, fields } = validateSuite(req.body, { partial: true });
  if (errors.length) return fail(res, 400, errors.join(" "));
  if (Object.keys(fields).length === 0) return fail(res, 400, "No valid fields provided.");

  const setClause = Object.keys(fields)
    .map((key) => `${key} = @${key}`)
    .join(", ");

  db.prepare(`
    UPDATE test_suites
    SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `).run({ ...fields, id: req.params.id });

  ok(res, serializeSuite(getSuiteOr404(req.params.id), true));
}

function handleDeleteSuite(req, res) {
  const existing = getSuiteOr404(req.params.id);
  if (!existing) return fail(res, 404, "Suite not found.");

  db.prepare("DELETE FROM test_suites WHERE id = ?").run(req.params.id);
  ok(res, { id: Number(req.params.id) });
}

function handleAddCaseToSuite(req, res) {
  const suite = getSuiteOr404(req.params.id);
  if (!suite) return fail(res, 404, "Suite not found.");

  const testCaseId = Number(req.body.test_case_id);
  if (!Number.isInteger(testCaseId)) return fail(res, 400, "test_case_id must be an integer.");

  const testCase = db.prepare("SELECT id FROM test_cases WHERE id = ? AND deleted_at IS NULL").get(testCaseId);
  if (!testCase) return fail(res, 404, "Test case not found.");

  const existingLink = db
    .prepare("SELECT id FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?")
    .get(req.params.id, testCaseId);
  if (existingLink) return fail(res, 400, "This test case is already in the suite.");

  const nextOrder = db
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM suite_test_cases WHERE suite_id = ?")
    .get(req.params.id).next;

  db.prepare("INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order) VALUES (?, ?, ?)").run(
    req.params.id,
    testCaseId,
    nextOrder
  );

  db.prepare("UPDATE test_suites SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    req.params.id
  );

  ok(res, serializeSuite(getSuiteOr404(req.params.id), true));
}

function handleRemoveCaseFromSuite(req, res) {
  const suite = getSuiteOr404(req.params.id);
  if (!suite) return fail(res, 404, "Suite not found.");

  const link = db
    .prepare("SELECT id FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?")
    .get(req.params.id, req.params.testCaseId);
  if (!link) return fail(res, 404, "This test case is not in the suite.");

  db.prepare("DELETE FROM suite_test_cases WHERE suite_id = ? AND test_case_id = ?").run(
    req.params.id,
    req.params.testCaseId
  );

  const remaining = getSuiteCases(req.params.id);
  const renumber = db.prepare("UPDATE suite_test_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?");
  const renumberAll = db.transaction((rows) => {
    rows.forEach((row, index) => renumber.run(index, req.params.id, row.id));
  });
  renumberAll(remaining);

  db.prepare("UPDATE test_suites SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    req.params.id
  );

  ok(res, serializeSuite(getSuiteOr404(req.params.id), true));
}

function handleReorderSuiteCases(req, res) {
  const suite = getSuiteOr404(req.params.id);
  if (!suite) return fail(res, 404, "Suite not found.");

  const order = req.body.order;
  if (!Array.isArray(order) || order.some((id) => !Number.isInteger(id))) {
    return fail(res, 400, "order must be an array of test case IDs.");
  }

  const currentIds = getSuiteCases(req.params.id)
    .map((c) => c.id)
    .sort((a, b) => a - b);
  const proposedIds = [...order].sort((a, b) => a - b);

  if (JSON.stringify(currentIds) !== JSON.stringify(proposedIds)) {
    return fail(res, 400, "order must contain exactly the test case IDs currently in the suite.");
  }

  const setOrder = db.prepare("UPDATE suite_test_cases SET sort_order = ? WHERE suite_id = ? AND test_case_id = ?");
  const reorder = db.transaction((ids) => {
    ids.forEach((testCaseId, index) => setOrder.run(index, req.params.id, testCaseId));
  });
  reorder(order);

  db.prepare("UPDATE test_suites SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(
    req.params.id
  );

  ok(res, serializeSuite(getSuiteOr404(req.params.id), true));
}

router.get("/", handleListSuites);
router.get("/:id", handleGetSuite);
router.post("/", handleCreateSuite);
router.put("/:id", handleUpdateSuite);
router.delete("/:id", handleDeleteSuite);
router.post("/:id/cases", handleAddCaseToSuite);
router.delete("/:id/cases/:testCaseId", handleRemoveCaseFromSuite);
router.put("/:id/reorder", handleReorderSuiteCases);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  fail(res, 500, err.message || "Unexpected server error.");
});

export default router;
