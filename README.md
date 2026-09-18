# Bootcamp QA Kit

This repo is two things in one: **`bootcamp-app`**, a small QA/test-management demo app (test cases, test suites, a bug tracker, test runs, generated reports, a dashboard, and a Flaky Test Tracker), and **the Bootcamp QA Kit**, a Claude Code plugin built while developing it — standardized bug reports, generated test suites, QA-perspective review, and flaky-test root-cause investigation, all enforced against a single project convention file (`CLAUDE.md`) so output never drifts between sessions or team members.

## Overview

The kit packages everything Claude Code learned about this project's QA conventions into reusable, portable components: 3 slash commands, 4 skills, 4 subagents, and 4 safety/consistency hooks (manifest at [`.claude-plugin/plugin.json`](./.claude-plugin/plugin.json)). Every component reads `CLAUDE.md` for its exact field names, severity values, and voice before producing output, and falls back to a sensible default (with a clear note to the user) if `CLAUDE.md` is missing or incomplete — the kit adapts to the project, not the other way around.

The app itself is a React + Vite frontend (`client/`) and an Express + SQLite backend (`server/`), managed as an npm workspaces monorepo — see [Installation & Setup](#installation--setup) below to run or deploy it.

## Features

- **Bug reporting** — `/bug-report` (interactive interview → file under `tests/bugs/`) and the `bug-reporter` skill / `bug-logger` subagent (formats existing notes/logs into a `CLAUDE.md`-compliant ticket as chat output).
- **Test case generation** — `/new-test` (interactive interview → file under `tests/manual/`) and the `test-generator` skill / `test-writer` subagent (ISTQB boundary-value analysis and equivalence partitioning for a full structured suite).
- **Daily catchup notes** — `/catchup` (auto-detects recent git/file activity, asks two follow-up questions, writes to `notes/daily/`).
- **QA review** — the `qa-review` skill / `qa-reviewer` subagent (missing validation, unhandled errors, vague messages, missing confirmations, basic a11y — reported by severity).
- **Flaky-test investigation** — the `flaky-test-analysis` skill / `flaky-test-analyzer` subagent (pulls real run history, treats recurring failure notes as evidence, greps source for corroboration, never presents an unconfirmed guess as fact) plus a companion `check-flaky-test-results.sh` hook that surfaces the same analysis automatically from Bash activity.
- **Safety and consistency hooks** — blocks any edit to `.env` outright; warns (never blocks) when a new API route doesn't follow the required `{success, data, error}` response shape, or when a severity value looks like a priority value in disguise.

## Installation & Setup

### Using the kit in another project

This kit is plain Markdown and shell scripts — there is no build step and no package manager involved.

1. Copy the `.claude/` directory (and `.claude-plugin/`, if you want the manifest/examples too) into the root of your target project.
2. Make sure the hook scripts are executable: `chmod +x .claude/hooks/*.sh`.
3. Confirm two CLI tools the hooks depend on are on your `PATH`: `jq` (all four hooks) and `sqlite3` (only `check-flaky-test-results.sh`, and only if your project uses a SQLite database the same way `bootcamp-app` does — otherwise that one hook simply stays silent).
4. Add or adapt a `CLAUDE.md` at your project root with your own field names/severity levels/voice — every component reads this file rather than hardcoding assumptions.
5. Start (or restart) a Claude Code session in that project directory. Slash commands, skills, and subagents are picked up automatically; no registration step is required.

### Running the demo app locally

```bash
npm install
npm run dev
```

Starts the Express API on `http://localhost:3001` and the Vite dev server on `http://localhost:5173` (proxies `/api/*` to Express). Open `http://localhost:5173`. Copy `.env.example` to `.env` if you want to set optional env vars — none are required for local dev.

### Deploying the demo app

Deployed as a single Render free-tier Web Service (see `render.yaml`). **Free-tier trade-off:** no persistent disk — data resets on redeploy/idle spin-down, and `server/db.js` reseeds a full snapshot automatically on boot so this stays unnoticeable for demo purposes.

One-time setup: push to a GitHub/GitLab.com remote (Render needs one of those), `brew tap render-oss/render && brew install render`, then `render login`.

Deploy with:

```bash
render services create
```

Run with no flags, this opens the CLI's interactive wizard — answer with Web Service / your repo / `main` / Node / any region / **Free** plan / build command `npm install && npm run build -w client` / start command `npm start -w server`. Add `DISCORD_WEBHOOK_URL` and `APP_BASE_URL` (set to your live URL) as env vars if you want the Discord flaky/failure alerts to work on the deployed site. Subsequent pushes auto-deploy.

## Usage Examples

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

For the full reference — every command/skill/agent/hook individually documented with its own worked example — see [`.claude/README.md`](./.claude/README.md).
