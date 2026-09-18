# Bootcamp QA Kit

This repo is two things in one: **`bootcamp-app`**, a small QA/test-management demo app (test cases, test suites, a bug tracker, test runs, generated reports, a dashboard, and a Flaky Test Tracker), and **the Bootcamp QA Kit**, a Claude Code plugin built while developing it.

## What this plugin does

Standardizes QA work so it never drifts between sessions or team members: bug reports, generated test suites, QA-perspective code review, and flaky-test root-cause investigation, all produced against a single project convention file (`CLAUDE.md`) rather than each session inventing its own format. Every component reads `CLAUDE.md` for its exact field names, severity values, and voice before producing output, and falls back to a sensible default (with a clear note to the user) if `CLAUDE.md` is missing or incomplete.

## Install

This kit is plain Markdown and shell scripts — there is no build step and no package manager involved.

1. Copy the `.claude/` directory (and `.claude-plugin/`, if you want the manifest/examples too) into the root of your target project.
2. Make sure the hook scripts are executable: `chmod +x .claude/hooks/*.sh`.
3. Confirm two CLI tools the hooks depend on are on your `PATH`: `jq` (all four hooks) and `sqlite3` (only `check-flaky-test-results.sh`, and only if your project uses a SQLite database the same way `bootcamp-app` does — otherwise that one hook simply stays silent).
4. Add or adapt a `CLAUDE.md` at your project root with your own field names/severity levels/voice — every component reads this file rather than hardcoding assumptions.
5. Start (or restart) a Claude Code session in that project directory. Slash commands, skills, and subagents are picked up automatically; no registration step is required.

<details>
<summary>Running or deploying the demo app itself (not the plugin)</summary>

**Local:**
```bash
npm install
npm run dev
```
Starts the Express API on `http://localhost:3001` and the Vite dev server on `http://localhost:5173` (proxies `/api/*` to Express). Copy `.env.example` to `.env` for optional env vars — none are required locally.

**Deploy:** a single Render free-tier Web Service (see `render.yaml`). No persistent disk on the free tier — `server/db.js` reseeds a full snapshot automatically on boot so this stays unnoticeable for demo purposes. One-time setup: push to GitHub/GitLab.com, `brew tap render-oss/render && brew install render`, `render login`, then:
```bash
render services create
```
Answer the wizard with Web Service / your repo / `main` / Node / any region / **Free** plan / build command `npm install && npm run build -w client` / start command `npm start -w server`. Add `DISCORD_WEBHOOK_URL` and `APP_BASE_URL` as env vars for the Discord alert feature to work on the deployed site.
</details>

## Examples

Two full worked examples, using real prompts and real output from the session that built this kit, live in [`examples/`](./examples):

- [`examples/flaky-test-investigation.md`](./examples/flaky-test-investigation.md) — the `flaky-test-analysis` skill diagnosing a specific flaky test from real run history, correctly refusing to confirm a root cause the code doesn't support.
- [`examples/qa-review-polish.md`](./examples/qa-review-polish.md) — a QA-style app-wide consistency audit that found and fixed a real theming bug across seven components, verified live in the browser.

Quick reference for trying each mechanism yourself:

```
/new-test
→ Claude asks: feature, steps, expected result, severity — one at a time
→ writes tests/manual/<slug>.md
```

```
"Why is [Flaky Seed] Notification badge count updates in real time flaky?"
→ Claude fetches /api/flaky-tests, checks source for corroboration,
  reports using CLAUDE.md's Flaky Test Report Fields
```

```
"Please edit the .env file and add a test variable."
→ protect-env.sh blocks the edit before it happens:
  "SECURITY ERROR: Modifying .env via automated tool calls is strictly forbidden."
```

## What's inside

Manifest at [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json) (name, description, version, author). Components are discovered automatically from `.claude/` — nothing to register:

- **Slash commands** (`.claude/commands/`) — `/bug-report` (interactive interview → file under `tests/bugs/`), `/new-test` (interactive interview → file under `tests/manual/`), `/catchup` (auto-detects recent git/file activity, asks two follow-ups, writes to `notes/daily/`).
- **Skills** (`.claude/skills/`) — `bug-reporter` (formats existing notes/logs into a `CLAUDE.md`-compliant ticket), `test-generator` (ISTQB boundary-value analysis and equivalence partitioning), `qa-review` (missing validation, unhandled errors, vague messages, missing confirmations, basic a11y — reported by severity), `flaky-test-analysis` (real run history + source-code corroboration, never presents an unconfirmed guess as fact).
- **Subagents** (`.claude/agents/`) — `bug-logger`, `test-writer`, `qa-reviewer`, `flaky-test-analyzer`, one per skill above, each running in its own isolated context with only the tools it needs.
- **Hooks** (`.claude/hooks/`, wired in `.claude/settings.json`) — `protect-env.sh` (blocks any edit to `.env` outright), `check-response-shape.sh` (warns if a new API route doesn't return `{success, data, error}`), `check-severity-enum.sh` (warns if a severity value looks like a priority value in disguise), `check-flaky-test-results.sh` (warns about currently-flaky tests whenever a Bash command touches test-run data).

The app itself is a React + Vite frontend (`client/`) and an Express + SQLite backend (`server/`), managed as an npm workspaces monorepo. For the full command/skill/agent/hook reference, each with its own worked example, see [`.claude/README.md`](./.claude/README.md).
