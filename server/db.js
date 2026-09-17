import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadSeedSnapshot } from "./load-snapshot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, "data.sqlite"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    preconditions TEXT,
    steps TEXT NOT NULL,
    expected_result TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'trivial')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'passed', 'failed', 'skipped')) DEFAULT 'draft',
    test_type TEXT NOT NULL CHECK (test_type IN ('smoke', 'regression', 'smoke-regression')),
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS test_suites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    feature TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'ready', 'in-progress', 'passed', 'failed')) DEFAULT 'draft',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS suite_test_cases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    UNIQUE (suite_id, test_case_id)
  );

  CREATE INDEX IF NOT EXISTS idx_suite_test_cases_suite ON suite_test_cases(suite_id);

  CREATE TABLE IF NOT EXISTS bugs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('critical', 'major', 'minor', 'trivial')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    status TEXT NOT NULL CHECK (status IN ('open', 'in-progress', 'resolved', 'closed', 'reopened')) DEFAULT 'open',
    steps_to_reproduce TEXT NOT NULL,
    expected TEXT NOT NULL,
    actual TEXT NOT NULL,
    environment TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS bug_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bug_id INTEGER NOT NULL REFERENCES bugs(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('created', 'status_change', 'comment')),
    old_value TEXT,
    new_value TEXT,
    message TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_bug_activity_bug ON bug_activity(bug_id);

  CREATE TABLE IF NOT EXISTS test_runs_v2 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    suite_id INTEGER REFERENCES test_suites(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')) DEFAULT 'in-progress',
    pass_count INTEGER NOT NULL DEFAULT 0,
    fail_count INTEGER NOT NULL DEFAULT 0,
    skip_count INTEGER NOT NULL DEFAULT 0,
    start_time TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    end_time TEXT,
    created_by TEXT
  );

  CREATE TABLE IF NOT EXISTS test_run_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES test_runs_v2(id) ON DELETE CASCADE,
    test_case_id INTEGER NOT NULL REFERENCES test_cases(id),
    result TEXT NOT NULL CHECK (result IN ('pending', 'passed', 'failed', 'skipped')) DEFAULT 'pending',
    duration_ms INTEGER,
    notes TEXT,
    failed_at TEXT,
    discord_alert_sent_at TEXT,
    sort_order INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_test_run_results_run ON test_run_results(run_id);

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES test_runs_v2(id) ON DELETE SET NULL,
    suite_name TEXT NOT NULL,
    run_date TEXT NOT NULL,
    total_count INTEGER NOT NULL,
    passed_count INTEGER NOT NULL,
    failed_count INTEGER NOT NULL,
    skipped_count INTEGER NOT NULL,
    results TEXT NOT NULL,
    generated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme TEXT NOT NULL CHECK (theme IN ('light', 'dark', 'system')) DEFAULT 'system',
    default_severity_for_new_bugs TEXT NOT NULL CHECK (default_severity_for_new_bugs IN ('critical', 'major', 'minor', 'trivial')) DEFAULT 'minor',
    default_page_size INTEGER NOT NULL CHECK (default_page_size IN (10, 20, 50, 100)) DEFAULT 20,
    timezone TEXT,
    auto_generate_report_after_run INTEGER NOT NULL CHECK (auto_generate_report_after_run IN (0, 1)) DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`);

db.pragma("foreign_keys = ON");

const bugColumns = db.prepare("PRAGMA table_info(bugs)").all().map((c) => c.name);
if (!bugColumns.includes("deleted_at")) {
  db.exec("ALTER TABLE bugs ADD COLUMN deleted_at TEXT");
}

const testCaseColumns = db.prepare("PRAGMA table_info(test_cases)").all().map((c) => c.name);
if (!testCaseColumns.includes("deleted_at")) {
  db.exec("ALTER TABLE test_cases ADD COLUMN deleted_at TEXT");
}
if (!testCaseColumns.includes("flaky_alert_sent_at")) {
  db.exec("ALTER TABLE test_cases ADD COLUMN flaky_alert_sent_at TEXT");
}

// Seed a brand-new database (empty test_cases table) from a full snapshot of
// the local dev database, so every environment — a fresh local clone, or
// Render after its disk gets wiped on a redeploy/restart — starts with the
// same complete content instead of a smaller hand-curated demo set.
// Regenerate the snapshot after making meaningful local changes you want
// reflected everywhere: `node scripts/export-snapshot.js` (from server/).
const seedCount = db.prepare("SELECT COUNT(*) AS count FROM test_cases").get().count;

if (seedCount === 0) {
  loadSeedSnapshot(db);
}

export default db;
