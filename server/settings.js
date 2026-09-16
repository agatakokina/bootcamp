import { Router } from "express";
import db from "./db.js";

const THEMES = ["light", "dark", "system"];
const SEVERITIES = ["critical", "major", "minor", "trivial"];
const PAGE_SIZES = [10, 20, 50, 100];

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function getSettingsRow() {
  return db.prepare("SELECT * FROM user_preferences ORDER BY id ASC LIMIT 1").get();
}

function serializeSettings(row) {
  return {
    theme: row.theme,
    default_severity_for_new_bugs: row.default_severity_for_new_bugs,
    default_page_size: row.default_page_size,
    timezone: row.timezone,
    auto_generate_report_after_run: Boolean(row.auto_generate_report_after_run),
  };
}

function handleGetSettings(req, res) {
  ok(res, serializeSettings(getSettingsRow()));
}

function handleUpdateSettings(req, res) {
  const body = req.body;
  const errors = [];
  const fields = {};

  if (body.theme !== undefined) {
    if (!THEMES.includes(body.theme)) {
      errors.push(`Theme must be one of: ${THEMES.join(", ")}.`);
    } else {
      fields.theme = body.theme;
    }
  }

  if (body.default_severity_for_new_bugs !== undefined) {
    if (!SEVERITIES.includes(body.default_severity_for_new_bugs)) {
      errors.push(`Default severity must be one of: ${SEVERITIES.join(", ")}.`);
    } else {
      fields.default_severity_for_new_bugs = body.default_severity_for_new_bugs;
    }
  }

  if (body.default_page_size !== undefined) {
    if (!PAGE_SIZES.includes(body.default_page_size)) {
      errors.push(`Default page size must be one of: ${PAGE_SIZES.join(", ")}.`);
    } else {
      fields.default_page_size = body.default_page_size;
    }
  }

  if (body.timezone !== undefined) {
    if (body.timezone !== null && typeof body.timezone !== "string") {
      errors.push("Timezone must be a string.");
    } else {
      fields.timezone = body.timezone;
    }
  }

  if (body.auto_generate_report_after_run !== undefined) {
    if (typeof body.auto_generate_report_after_run !== "boolean") {
      errors.push("auto_generate_report_after_run must be a boolean.");
    } else {
      fields.auto_generate_report_after_run = body.auto_generate_report_after_run ? 1 : 0;
    }
  }

  if (errors.length) return fail(res, 400, errors.join(" "));
  if (Object.keys(fields).length === 0) return fail(res, 400, "No valid fields provided.");

  const row = getSettingsRow();
  const setClause = Object.keys(fields)
    .map((key) => `${key} = @${key}`)
    .join(", ");

  db.prepare(`
    UPDATE user_preferences
    SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = @id
  `).run({ ...fields, id: row.id });

  ok(res, serializeSettings(getSettingsRow()));
}

router.get("/", handleGetSettings);
router.put("/", handleUpdateSettings);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
