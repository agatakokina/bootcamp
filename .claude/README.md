# Claude Code Plugin Kit — Bootcamp App

This directory packages everything this project has taught Claude Code about itself: custom slash commands, skills, subagents, and hooks. Everything lives under `.claude/` at the repo root — nothing is scattered inside `client/` or `server/`.

```
.claude/
├── README.md              ← you are here
├── settings.json           ← wires the hooks below into PreToolUse/PostToolUse
├── commands/                ← human-invoked, typed as /command-name
│   ├── bug-report.md
│   ├── catchup.md
│   └── new-test.md
├── skills/                  ← auto-triggered by natural language, or delegated to by an agent
│   ├── bug-reporter/SKILL.md
│   ├── flaky-test-analysis/SKILL.md
│   ├── qa-review/SKILL.md
│   └── test-generator/SKILL.md
├── agents/                   ← subagents Claude Code delegates to automatically
│   ├── bug-logger.md
│   ├── flaky-test-analyzer.md
│   ├── qa-reviewer.md
│   └── test-writer.md
└── hooks/                     ← shell scripts run automatically on tool calls
    ├── protect-env.sh
    ├── check-response-shape.sh
    └── check-severity-enum.sh
```

This README is aimed at a human grading or reviewing this kit: what each piece does, how it's triggered, and a worked example you can run yourself.

## The four kinds of things in here, and how they differ

It's easy to assume a command, a skill, and an agent with similar names do the same thing. They don't — each is a different trigger mechanism:

| Mechanism | Where it lives | How it's triggered | Runs in |
|---|---|---|---|
| **Slash command** | `.claude/commands/*.md` | Human types `/name` explicitly | The main conversation |
| **Skill** | `.claude/skills/*/SKILL.md` | Claude auto-detects a matching request (or a human asks by name) | The main conversation, or inside whichever agent invokes it |
| **Subagent** | `.claude/agents/*.md` | Claude auto-delegates when a request matches the agent's `description`, or a human asks for it by name | An isolated subagent process with only the tools it's granted |
| **Hook** | `.claude/hooks/*.sh`, wired in `settings.json` | Automatic, on every matching tool call — never asked for | A shell process, before or after the tool runs |

Three of the four subagents each pair with a same-purpose skill (`bug-logger` ↔ `bug-reporter`, `qa-reviewer` ↔ `qa-review`, `test-writer` ↔ `test-generator`, `flaky-test-analyzer` ↔ `flaky-test-analysis`): the skill is the actual technique/instructions, and the agent is "run this skill in its own isolated context with only these tools." Asking Claude directly in conversation will usually trigger the skill inline; explicitly saying "use the qa-reviewer subagent" (or Claude choosing to delegate) runs it as an isolated agent instead. Either path produces the same kind of output.

The slash commands are a **separate, third thing** from the skills/agents that share a similar name, and are not interchangeable:

- **`/bug-report`** interactively interviews you and writes a new file under `tests/bugs/`.
- **`bug-reporter` skill / `bug-logger` agent** takes failure notes, logs, or a description you already typed and formats them into a `CLAUDE.md`-compliant bug ticket as chat output — it doesn't run an interview and doesn't write a file.
- Same split for **`/new-test`** (interview → new file under `tests/manual/`) vs. **`test-generator` skill / `test-writer` agent** (feature description → a full ISTQB-style test suite as chat output).

## Slash Commands

Typed directly by a human, e.g. `/new-test`.

### `/bug-report`
Interactively interviews you (page/screen, repro steps, expected, actual, severity — one question at a time, never skipping ahead) and writes the result to `tests/bugs/YYYY-MM-DD-short-description.md`.

**Worked example:**
```
> /bug-report
Claude: What page or screen were you on?
> /test-cases/import
Claude: What were you trying to do (repro steps)?
> Upload a CSV with a missing "steps" column
Claude: What did you expect to happen?
> A clear error telling me which column is missing
Claude: What actually happened instead?
> The page just shows a blank preview table with no rows and no message
Claude: What is the severity level? (Critical, Major, Minor, Trivial)
> major
Claude: Wrote tests/bugs/2026-09-16-csv-import-missing-column-silent.md
```
Resulting file:
```markdown
# CSV import gives no error when the steps column is missing

## Timestamp
2026-09-16T21:04:00Z

## Location
/test-cases/import

## Severity
Major

## Reproduction Steps
1. Upload a CSV with a missing "steps" column

## Expected vs Actual Results
**Expected:** A clear error telling me which column is missing

**Actual:** The page just shows a blank preview table with no rows and no message
```

### `/new-test`
Same interview pattern for a manual test case (feature, steps, expected result, severity), written to `tests/manual/<kebab-case-feature-name>.md`.

**Worked example:** `/new-test` → answer "Flaky Test Tracker root-cause expand", steps, expected result, severity "Minor" → writes `tests/manual/flaky-test-tracker-root-cause-expand.md` with `# Title`, `## Steps`, `## Expected Result`, `## Severity` sections.

### `/catchup`
No interview needed for the detection half — it inspects `git log --since="24 hours ago"`, `git status`, and recently modified files under `tests/` on its own first, then asks just two follow-ups ("anything else you completed?", "any blockers?", "focus for tomorrow?"). Writes `notes/daily/YYYY-MM-DD-catchup.md` and also prints the same content as a paste-ready block in chat.

**Worked example:** running `/catchup` on a day where the Flaky Test Tracker work happened would auto-detect commits/edits touching `server/flaky-tests.js`, `server/flakiness.js`, `client/src/pages/FlakyTestTrackerPage.jsx`, etc., propose "Built the Flaky Test Tracker: seed data, ranking API, tracker page, Discord alert hook" as a completed-today bullet, then ask you to confirm/add blockers and tomorrow's focus before writing `notes/daily/2026-09-16-catchup.md`.

## Skills

Auto-triggered when your request matches the skill's `description`, or invoke one directly ("use the qa-review skill on this PR").

| Skill | Triggers on | Technique |
|---|---|---|
| `bug-reporter` | "file a bug report", "log a bug ticket", "turn this error into an issue" | Extracts only facts implied by your input (never invents details), asks for anything missing, formats per `CLAUDE.md`'s Bug Report Fields |
| `qa-review` | "QA review this", "what could break", "audit this feature for bugs" | Checks missing input validation, unhandled error states, vague error messages, missing confirmation on destructive actions, basic a11y — reports by severity |
| `test-generator` | "write test cases for X", "apply boundary value analysis to Y" | ISTQB boundary-value analysis + equivalence partitioning: happy path, boundaries, partitions, negative cases |
| `flaky-test-analysis` | "why is this test flaky", "investigate this flaky test", "root-cause report for the most flaky test" | Pulls real run history from `/api/flaky-tests` (or `server/data.sqlite` directly), treats recurring failure notes as evidence, greps actual source for corroborating code, ranks hypotheses by evidence strength — never presents an unconfirmed guess as fact |

**Worked example (`flaky-test-analysis`, the newest one):**
```
> Why is "[Flaky Seed] Notification badge count updates in real time" flaky?
```
Claude fetches `GET /api/flaky-tests`, finds it's failed 11 of 30 runs with a flakiness score of 0.61, groups its three recurring failure notes by frequency, greps `client/` and `server/` for any real notification/WebSocket implementation to corroborate them, finds none (it's currently seed data, not a built feature), and reports back using the exact `CLAUDE.md` "Flaky Test Report Fields" structure — Test Case / Flakiness Score / Hypotheses (each marked confirmed or unconfirmed) / Recommended Next Step / Suggested Severity — rather than fabricating a confirmed root cause for code that doesn't exist.

## Subagents

Delegated to automatically, or ask for one by name ("use the flaky-test-analyzer subagent on X").

| Agent | Tools | Delegates to skill | Use when |
|---|---|---|---|
| `bug-logger` | Read, Write | `bug-reporter` | Turning raw notes/logs into a standardized bug ticket |
| `qa-reviewer` | Read, Grep | `qa-review` | Reviewing a feature/PR from a tester's perspective |
| `test-writer` | Read, Write | `test-generator` | Producing a full structured test suite for a feature |
| `flaky-test-analyzer` | Read, Grep, Bash | `flaky-test-analysis` | Diagnosing why one specific test is flaky |

All four read `CLAUDE.md` before producing output and use only its exact field names/values — they never invent their own format. If `CLAUDE.md` or the matching skill is missing, each agent falls back to a sensible default and says so explicitly rather than failing silently.

**Worked example:** delegating "review the Flaky Test Tracker page for QA risks" to `qa-reviewer` runs it in an isolated context with only `Read`/`Grep` — it can't accidentally edit anything — and returns findings grouped under Critical/Major/Minor/Trivial exactly as `CLAUDE.md` defines those levels, e.g. flagging that the "N hypotheses" expand button has no visible focus state, or that `/flaky-tests` doesn't tell the user when the list is empty because too few runs exist yet.

## Hooks

Wired into `.claude/settings.json`, run automatically — never invoked by name.

| Hook | Event | Matcher | Behavior |
|---|---|---|---|
| `protect-env.sh` | `PreToolUse` | `Write\|Edit` | **Blocks** (exit 2) any Write/Edit whose target path is `.env`, with a stderr `SECURITY ERROR` message. Everything else passes through untouched. |
| `check-response-shape.sh` | `PostToolUse` | `Write\|Edit` | **Warns only** (never blocks). After a route-handler file directly under `server/` is written, scans every `res.json()`/`res.send()` call and flags (via `systemMessage`) any that don't appear to return `CLAUDE.md`'s `{success, data, error}` envelope. Skips `server/index.js` and `server/db.js` since they aren't route handlers. |
| `check-severity-enum.sh` | `PostToolUse` | `Write\|Edit` | **Warns only**. Scans any edited `.js`/`.jsx`/`.ts`/`.tsx` file for lines mentioning "severity" that also contain a non-severity word like `high`/`medium`/`low` (valid bug *priority* values, but not valid *severity* values per `CLAUDE.md`), and flags them as a possible mix-up. |

**Worked example — try it yourself:**
```
> Please edit the .env file and add a test variable.
```
`protect-env.sh` fires before the Edit tool runs, exits 2, and Claude Code shows: `SECURITY ERROR: Modifying .env via automated tool calls is strictly forbidden.` The edit never happens — this is enforced by the hook, not by Claude's judgment, so it can't be argued around by rephrasing the request.

```
> In server/bugs.js, add a debug route that does res.send("ok").
```
Once the edit is written, `check-response-shape.sh` fires afterward and posts a warning that the new `res.send("ok")` doesn't match the required `{success, data, error}` shape — a nudge, not a block, so Claude (or you) can fix it before moving on.

## Quick self-check for a grader

1. `cat .claude/settings.json` — confirms both hooks are wired to `PreToolUse`/`PostToolUse` on `Write|Edit`.
2. Try the `protect-env.sh` example above — confirms a hook can actually block a tool call, not just log.
3. Run `/new-test` or `/bug-report` end-to-end — confirms a slash command's interactive flow and file output.
4. Ask "why is test X flaky" for anything in `/flaky-tests` — confirms a skill/agent pair added after the initial project setup still follows the same `CLAUDE.md`-driven conventions as the original three.
5. `ls .claude/agents .claude/skills .claude/commands .claude/hooks` — confirms everything really does sit at the top of the repo, not nested under `client/` or `server/`.
