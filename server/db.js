import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const seedCount = db.prepare("SELECT COUNT(*) AS count FROM test_cases").get().count;

if (seedCount === 0) {
  const insert = db.prepare(`
    INSERT INTO test_cases (title, preconditions, steps, expected_result, severity, status, test_type)
    VALUES (@title, @preconditions, @steps, @expected_result, @severity, @status, @test_type)
  `);

  const seedData = [
    {
      title: "Successful login with valid credentials",
      preconditions: "A registered user account exists with a known username and password.",
      steps: JSON.stringify([
        "Go to the login page.",
        "Enter the registered username.",
        "Enter the correct password.",
        "Click the \"Log In\" button.",
      ]),
      expected_result: "The user is authenticated and redirected to the dashboard, with no error messages shown.",
      severity: "major",
      status: "passed",
      test_type: "smoke",
    },
    {
      title: "Login fails with incorrect password",
      preconditions: "A registered user account exists.",
      steps: JSON.stringify([
        "Go to the login page.",
        "Enter the registered username.",
        "Enter an incorrect password.",
        "Click the \"Log In\" button.",
      ]),
      expected_result: "An error message states the credentials are invalid, and the user stays on the login page.",
      severity: "major",
      status: "ready",
      test_type: "regression",
    },
    {
      title: "Password reset request with a registered email",
      preconditions: "A registered user account exists with a verified email address.",
      steps: JSON.stringify([
        "Go to the \"Forgot Password\" page.",
        "Enter the registered email address.",
        "Click the \"Send Reset Link\" button.",
      ]),
      expected_result: "A password reset email is sent, and the page shows a confirmation message.",
      severity: "major",
      status: "ready",
      test_type: "smoke-regression",
    },
    {
      title: "Search box trims leading and trailing whitespace",
      preconditions: "",
      steps: JSON.stringify([
        "Go to any page with a search box.",
        "Type \"  bug  \" (with leading and trailing spaces) into the search box.",
        "Submit the search.",
      ]),
      expected_result: "The search runs on \"bug\" with no extra spaces, and returns matching results.",
      severity: "trivial",
      status: "draft",
      test_type: "regression",
    },
    {
      title: "Deleting a test case removes it from the list",
      preconditions: "At least one test case exists in the system.",
      steps: JSON.stringify([
        "Go to the /test-cases page.",
        "Open the row menu for an existing test case.",
        "Click \"Delete\" and confirm the action.",
      ]),
      expected_result: "The test case is removed from the database and no longer appears in the list.",
      severity: "minor",
      status: "failed",
      test_type: "regression",
    },
  ];

  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });

  insertMany(seedData);
}

const suiteSeedCount = db.prepare("SELECT COUNT(*) AS count FROM test_suites").get().count;

if (suiteSeedCount === 0) {
  const insertSuite = db.prepare(`
    INSERT INTO test_suites (name, feature, status)
    VALUES (@name, @feature, @status)
  `);

  const insertSuiteCase = db.prepare(`
    INSERT INTO suite_test_cases (suite_id, test_case_id, sort_order)
    VALUES (@suite_id, @test_case_id, @sort_order)
  `);

  const suiteSeedData = [
    {
      name: "Login Regression Suite",
      feature: "login",
      status: "ready",
      caseTitles: [
        "Successful login with valid credentials",
        "Login fails with incorrect password",
        "Password reset request with a registered email",
      ],
    },
    {
      name: "Test Case Management Suite",
      feature: "test-cases",
      status: "draft",
      caseTitles: [
        "Deleting a test case removes it from the list",
        "Search box trims leading and trailing whitespace",
        "Successful login with valid credentials",
      ],
    },
  ];

  const insertSuites = db.transaction((suites) => {
    for (const suite of suites) {
      const result = insertSuite.run({ name: suite.name, feature: suite.feature, status: suite.status });
      const suiteId = result.lastInsertRowid;
      suite.caseTitles.forEach((title, index) => {
        const testCase = db.prepare("SELECT id FROM test_cases WHERE title = ?").get(title);
        if (testCase) {
          insertSuiteCase.run({ suite_id: suiteId, test_case_id: testCase.id, sort_order: index });
        }
      });
    }
  });

  insertSuites(suiteSeedData);
}

const bugSeedCount = db.prepare("SELECT COUNT(*) AS count FROM bugs").get().count;

if (bugSeedCount === 0) {
  const insertBug = db.prepare(`
    INSERT INTO bugs (title, description, severity, priority, status, steps_to_reproduce, expected, actual, environment)
    VALUES (@title, @description, @severity, @priority, @status, @steps_to_reproduce, @expected, @actual, @environment)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO bug_activity (bug_id, action, old_value, new_value, message, created_at)
    VALUES (@bug_id, @action, @old_value, @new_value, @message, @created_at)
  `);

  const bugSeedData = [
    {
      title: "Signup form shows blank white screen instead of error when email is already registered",
      description: "Submitting the signup form with an email that's already registered crashes the page instead of showing a validation error.",
      severity: "major",
      priority: "high",
      status: "open",
      steps_to_reproduce: JSON.stringify([
        "Open the signup form.",
        "Enter an email address that is already registered.",
        "Fill in the remaining required signup fields.",
        "Submit the form.",
      ]),
      expected: "The form displays an error message indicating the email is already registered.",
      actual: "The page goes blank (white screen) with no error message shown.",
      environment: "Chrome 128, macOS 14",
      activity: [],
    },
    {
      title: "Double-clicking Save creates duplicate test case records",
      description: "Clicking the Save button twice in quick succession on the new test case form creates two identical records instead of one.",
      severity: "minor",
      priority: "medium",
      status: "in-progress",
      steps_to_reproduce: JSON.stringify([
        "Go to the /test-cases page and click \"+ New Test Case.\"",
        "Fill in all required fields.",
        "Click the \"Save\" button twice in quick succession.",
      ]),
      expected: "Only one test case record is created.",
      actual: "Two identical test case records are created.",
      environment: "Chrome 128, macOS 14",
      activity: [{ action: "status_change", old_value: "open", new_value: "in-progress", message: "Reproduced locally; adding a submit guard." }],
    },
    {
      title: "Suite reorder drag handle has no keyboard alternative",
      description: "The test suite detail page's drag-and-drop case reordering only works with a mouse, with no keyboard-operable way to reorder cases.",
      severity: "major",
      priority: "medium",
      status: "resolved",
      steps_to_reproduce: JSON.stringify([
        "Go to a suite's detail page at /test-suites/:id.",
        "Try to reorder the cases using only the keyboard (Tab, arrow keys, Enter).",
      ]),
      expected: "Cases can be reordered using the keyboard alone.",
      actual: "There is no keyboard-operable way to reorder cases; only mouse drag-and-drop works.",
      environment: "Chrome 128, macOS 14, VoiceOver",
      activity: [
        { action: "status_change", old_value: "open", new_value: "in-progress", message: "Picked up; evaluating a move-up/move-down button pair as a keyboard fallback." },
        { action: "status_change", old_value: "in-progress", new_value: "resolved", message: "Added Move Up / Move Down buttons alongside the drag handle." },
      ],
    },
  ];

  const insertBugs = db.transaction((rows) => {
    for (const row of rows) {
      const { activity, ...bugFields } = row;
      const result = insertBug.run(bugFields);
      const bugId = result.lastInsertRowid;

      insertActivity.run({
        bug_id: bugId,
        action: "created",
        old_value: null,
        new_value: null,
        message: null,
        created_at: "2026-09-01T09:00:00.000Z",
      });

      activity.forEach((entry, index) => {
        insertActivity.run({
          bug_id: bugId,
          action: entry.action,
          old_value: entry.old_value,
          new_value: entry.new_value,
          message: entry.message,
          created_at: `2026-09-0${2 + index}T09:00:00.000Z`,
        });
      });
    }
  });

  insertBugs(bugSeedData);
}

const runSeedCount = db.prepare("SELECT COUNT(*) AS count FROM test_runs_v2").get().count;

if (runSeedCount === 0) {
  const loginSuite = db.prepare("SELECT id FROM test_suites WHERE name = ?").get("Login Regression Suite");

  if (loginSuite) {
    const suiteCases = db
      .prepare(`
        SELECT tc.id, tc.title
        FROM suite_test_cases stc
        JOIN test_cases tc ON tc.id = stc.test_case_id
        WHERE stc.suite_id = ?
        ORDER BY stc.sort_order ASC
      `)
      .all(loginSuite.id);

    const resultByTitle = {
      "Successful login with valid credentials": {
        result: "passed",
        duration_ms: 820,
        notes: null,
        failed_at: null,
        discord_alert_sent_at: null,
      },
      "Login fails with incorrect password": {
        result: "failed",
        duration_ms: 640,
        notes: "Error message does not appear; the page just reloads silently instead.",
        failed_at: "2026-09-05T10:15:00.000Z",
        discord_alert_sent_at: "2026-09-05T10:15:01.000Z",
      },
      "Password reset request with a registered email": {
        result: "skipped",
        duration_ms: null,
        notes: "Skipped: email service is not configured in this environment.",
        failed_at: null,
        discord_alert_sent_at: null,
      },
    };

    const insertRun = db.prepare(`
      INSERT INTO test_runs_v2 (suite_id, status, pass_count, fail_count, skip_count, start_time, end_time, created_by)
      VALUES (@suite_id, 'completed', 1, 1, 1, @start_time, @end_time, @created_by)
    `);

    const insertResult = db.prepare(`
      INSERT INTO test_run_results
        (run_id, test_case_id, result, duration_ms, notes, failed_at, discord_alert_sent_at, sort_order)
      VALUES (@run_id, @test_case_id, @result, @duration_ms, @notes, @failed_at, @discord_alert_sent_at, @sort_order)
    `);

    const insertRunAndResults = db.transaction(() => {
      const runResult = insertRun.run({
        suite_id: loginSuite.id,
        start_time: "2026-09-05T10:00:00.000Z",
        end_time: "2026-09-05T10:20:00.000Z",
        created_by: "agata",
      });
      const runId = runResult.lastInsertRowid;

      suiteCases.forEach((tc, index) => {
        const seed = resultByTitle[tc.title];
        if (!seed) return;
        insertResult.run({
          run_id: runId,
          test_case_id: tc.id,
          result: seed.result,
          duration_ms: seed.duration_ms,
          notes: seed.notes,
          failed_at: seed.failed_at,
          discord_alert_sent_at: seed.discord_alert_sent_at,
          sort_order: index,
        });
      });
    });

    insertRunAndResults();
  }
}

const reportSeedCount = db.prepare("SELECT COUNT(*) AS count FROM reports").get().count;

if (reportSeedCount === 0) {
  const sourceRun = db
    .prepare(`
      SELECT tr.*, ts.name AS suite_name
      FROM test_runs_v2 tr
      LEFT JOIN test_suites ts ON ts.id = tr.suite_id
      ORDER BY tr.start_time ASC
      LIMIT 1
    `)
    .get();

  if (sourceRun) {
    const results = db
      .prepare(`
        SELECT r.test_case_id, r.result, r.duration_ms, r.notes, tc.title, tc.severity, tc.test_type
        FROM test_run_results r
        JOIN test_cases tc ON tc.id = r.test_case_id
        WHERE r.run_id = ?
        ORDER BY r.sort_order ASC
      `)
      .all(sourceRun.id);

    db.prepare(`
      INSERT INTO reports
        (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results, generated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      sourceRun.id,
      sourceRun.suite_name || "(deleted suite)",
      sourceRun.start_time,
      results.length,
      sourceRun.pass_count,
      sourceRun.fail_count,
      sourceRun.skip_count,
      JSON.stringify(results),
      sourceRun.end_time || sourceRun.start_time
    );
  }
}

const preferencesCount = db.prepare("SELECT COUNT(*) AS count FROM user_preferences").get().count;

if (preferencesCount === 0) {
  db.prepare(`
    INSERT INTO user_preferences (theme, default_severity_for_new_bugs, default_page_size, timezone, auto_generate_report_after_run)
    VALUES ('system', 'minor', 20, NULL, 1)
  `).run();
}

export default db;
