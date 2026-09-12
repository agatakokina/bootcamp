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

export default db;
