import { Router } from "express";
import db from "./db.js";

const SEVERITIES = ["critical", "major", "minor", "trivial"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const STATUS_TRANSITIONS = {
  open: ["in-progress", "closed"],
  "in-progress": ["resolved", "closed"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in-progress", "closed"],
};

const STATUSES = Object.keys(STATUS_TRANSITIONS);

const SEVERITY_RANK = { critical: 0, major: 1, minor: 2, trivial: 3 };
const PRIORITY_RANK = { urgent: 0, high: 1, medium: 2, low: 3 };

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function getBugOr404(id) {
  return db.prepare("SELECT * FROM bugs WHERE id = ?").get(id);
}

function getActiveBugOr404(id) {
  return db.prepare("SELECT * FROM bugs WHERE id = ? AND deleted_at IS NULL").get(id);
}

function getBugActivity(bugId) {
  return db
    .prepare("SELECT * FROM bug_activity WHERE bug_id = ? ORDER BY created_at ASC, id ASC")
    .all(bugId);
}

function serializeBug(row, withActivity) {
  const base = { ...row, steps_to_reproduce: JSON.parse(row.steps_to_reproduce) };
  if (withActivity) base.activity = getBugActivity(row.id);
  return base;
}

function validateBug(body, { partial = false } = {}) {
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
  requireString("description", "Description");
  requireString("expected", "Expected");
  requireString("actual", "Actual");

  if (body.environment !== undefined) {
    if (typeof body.environment !== "string") {
      errors.push("Environment must be a string.");
    } else {
      fields.environment = body.environment.trim();
    }
  } else if (!partial) {
    fields.environment = "";
  }

  if (body.steps_to_reproduce === undefined) {
    if (!partial) errors.push("Steps to reproduce is required.");
  } else if (
    !Array.isArray(body.steps_to_reproduce) ||
    body.steps_to_reproduce.length === 0 ||
    body.steps_to_reproduce.some((s) => typeof s !== "string" || s.trim() === "")
  ) {
    errors.push("Steps to reproduce must be a non-empty array of non-empty strings.");
  } else {
    fields.steps_to_reproduce = JSON.stringify(body.steps_to_reproduce.map((s) => s.trim()));
  }

  if (body.severity === undefined) {
    if (!partial) errors.push("Severity is required.");
  } else if (!SEVERITIES.includes(body.severity)) {
    errors.push(`Severity must be one of: ${SEVERITIES.join(", ")}.`);
  } else {
    fields.severity = body.severity;
  }

  if (body.priority === undefined) {
    if (!partial) fields.priority = "medium";
  } else if (!PRIORITIES.includes(body.priority)) {
    errors.push(`Priority must be one of: ${PRIORITIES.join(", ")}.`);
  } else {
    fields.priority = body.priority;
  }

  if (body.status !== undefined) {
    errors.push("Status cannot be set here. Use PATCH /api/bugs/:id/status to change status.");
  }

  return { errors, fields };
}

function handleListBugs(req, res) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
  const status = req.query.status;
  const severity = req.query.severity;
  const priority = req.query.priority;
  const search = (req.query.search || "").trim();
  const showDeleted = req.query.deleted === "true";
  const sortBy = ["severity", "priority", "status"].includes(req.query.sortBy) ? req.query.sortBy : "updated_at";
  const sortDir = req.query.sortDir === "asc" ? "asc" : "desc";

  const where = [showDeleted ? "deleted_at IS NOT NULL" : "deleted_at IS NULL"];
  const params = {};

  if (status) {
    if (!STATUSES.includes(status)) return fail(res, 400, `Status must be one of: ${STATUSES.join(", ")}.`);
    where.push("status = @status");
    params.status = status;
  }

  if (severity) {
    if (!SEVERITIES.includes(severity)) return fail(res, 400, `Severity must be one of: ${SEVERITIES.join(", ")}.`);
    where.push("severity = @severity");
    params.severity = severity;
  }

  if (priority) {
    if (!PRIORITIES.includes(priority)) return fail(res, 400, `Priority must be one of: ${PRIORITIES.join(", ")}.`);
    where.push("priority = @priority");
    params.priority = priority;
  }

  if (search) {
    where.push("(title LIKE @search OR description LIKE @search)");
    params.search = `%${search}%`;
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const orderClause =
    sortBy === "severity"
      ? `ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'major' THEN 1 WHEN 'minor' THEN 2 WHEN 'trivial' THEN 3 END ${sortDir}`
      : sortBy === "priority"
      ? `ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END ${sortDir}`
      : sortBy === "status"
      ? `ORDER BY status ${sortDir}`
      : `ORDER BY updated_at ${sortDir}`;

  const total = db.prepare(`SELECT COUNT(*) AS count FROM bugs ${whereClause}`).get(params).count;

  const rows = db
    .prepare(`SELECT * FROM bugs ${whereClause} ${orderClause} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset: (page - 1) * pageSize });

  ok(res, {
    items: rows.map((row) => serializeBug(row, false)),
    total,
    page,
    pageSize,
  });
}

function handleGetBug(req, res) {
  const row = getActiveBugOr404(req.params.id);
  if (!row) return fail(res, 404, "Bug not found.");
  ok(res, serializeBug(row, true));
}

function handleCreateBug(req, res) {
  const { errors, fields } = validateBug(req.body, { partial: false });
  if (errors.length) return fail(res, 400, errors.join(" "));

  const result = db
    .prepare(`
      INSERT INTO bugs (title, description, severity, priority, steps_to_reproduce, expected, actual, environment)
      VALUES (@title, @description, @severity, @priority, @steps_to_reproduce, @expected, @actual, @environment)
    `)
    .run(fields);

  const bugId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message)
    VALUES (?, 'created', NULL, NULL, NULL)
  `).run(bugId);

  ok(res, serializeBug(getBugOr404(bugId), true));
}

function handleUpdateBug(req, res) {
  const existing = getActiveBugOr404(req.params.id);
  if (!existing) return fail(res, 404, "Bug not found.");

  const { errors, fields } = validateBug(req.body, { partial: true });
  if (errors.length) return fail(res, 400, errors.join(" "));
  if (Object.keys(fields).length === 0) return fail(res, 400, "No valid fields provided.");

  const setClause = Object.keys(fields)
    .map((key) => `${key} = @${key}`)
    .join(", ");

  db.prepare(`
    UPDATE bugs
    SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `).run({ ...fields, id: req.params.id });

  ok(res, serializeBug(getBugOr404(req.params.id), true));
}

function handleDeleteBug(req, res) {
  const existing = getActiveBugOr404(req.params.id);
  if (!existing) return fail(res, 404, "Bug not found.");

  db.prepare("UPDATE bugs SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(req.params.id);
  ok(res, { id: Number(req.params.id) });
}

function handleRestoreBug(req, res) {
  const existing = db.prepare("SELECT * FROM bugs WHERE id = ? AND deleted_at IS NOT NULL").get(req.params.id);
  if (!existing) return fail(res, 404, "Deleted bug not found.");

  db.prepare(`
    UPDATE bugs
    SET deleted_at = NULL, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ?
  `).run(req.params.id);

  ok(res, serializeBug(getBugOr404(req.params.id), true));
}

function handleChangeBugStatus(req, res) {
  const existing = getActiveBugOr404(req.params.id);
  if (!existing) return fail(res, 404, "Bug not found.");

  const newStatus = req.body.status;
  if (!STATUSES.includes(newStatus)) {
    return fail(res, 400, `Status must be one of: ${STATUSES.join(", ")}.`);
  }

  const allowedNext = STATUS_TRANSITIONS[existing.status];
  if (!allowedNext.includes(newStatus)) {
    return fail(
      res,
      400,
      `Cannot transition from "${existing.status}" to "${newStatus}". Allowed next statuses: ${allowedNext.join(", ")}.`
    );
  }

  let message = null;
  if (req.body.message !== undefined) {
    if (typeof req.body.message !== "string") return fail(res, 400, "Message must be a string.");
    message = req.body.message.trim() || null;
  }

  db.prepare(`
    UPDATE bugs SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?
  `).run(newStatus, req.params.id);

  db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message)
    VALUES (?, 'status_change', ?, ?, ?)
  `).run(req.params.id, existing.status, newStatus, message);

  ok(res, serializeBug(getBugOr404(req.params.id), true));
}

function handleAddBugComment(req, res) {
  const existing = getActiveBugOr404(req.params.id);
  if (!existing) return fail(res, 404, "Bug not found.");

  if (typeof req.body.message !== "string" || req.body.message.trim() === "") {
    return fail(res, 400, "Message must be a non-empty string.");
  }

  db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message)
    VALUES (?, 'comment', NULL, NULL, ?)
  `).run(req.params.id, req.body.message.trim());

  db.prepare("UPDATE bugs SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(req.params.id);

  ok(res, serializeBug(getBugOr404(req.params.id), true));
}

router.get("/", handleListBugs);
router.get("/:id", handleGetBug);
router.post("/", handleCreateBug);
router.put("/:id", handleUpdateBug);
router.delete("/:id", handleDeleteBug);
router.post("/:id/restore", handleRestoreBug);
router.patch("/:id/status", handleChangeBugStatus);
router.post("/:id/comments", handleAddBugComment);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
