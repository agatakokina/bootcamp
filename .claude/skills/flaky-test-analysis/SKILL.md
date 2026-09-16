---
name: flaky-test-analysis
description: Use this skill whenever the user asks to investigate a flaky test, wants root-cause hypotheses for a test from the Flaky Test Tracker, asks "why is this test flaky", or wants a deep-dive report on a specific flaky test. Trigger on requests like "investigate this flaky test", "why does X keep flipping", "give me a root-cause report for the most flaky test".
allowed-tools: Read, Grep, Bash
---

# Flaky Test Analysis

Diagnose why a specific test case is flaky (its result flips between passed and failed across runs) and produce a ranked, evidence-backed root-cause report — not a generic "add retries" guess.

## Identify the Target

If the user names a specific test, use it. Otherwise, fetch the current ranking from a running server with:

```bash
curl -s http://localhost:3001/api/flaky-tests | python3 -m json.tool
```

If the server isn't running, query `server/data.sqlite` directly instead (read-only): join `test_run_results`, `test_runs_v2`, and `test_cases` on `test_case_id` to reconstruct the same pass/fail sequence and failure notes for the test in question. Never write to this database.

## Gather Evidence

For the target test case, collect:

1. **The full chronological result sequence** and its flakiness score / fail rate (from the API response, or recomputed from the raw rows).
2. **Every recorded failure note** (`test_run_results.notes` where `result = 'failed'`) — these are real signal, not filler. Group identical or near-identical notes and count occurrences; a note that recurs across many failures is stronger evidence than a one-off.
3. **Corroborating source code**, when the test's title or notes point at a feature area. Grep the relevant `client/` or `server/` files for patterns that plausibly cause exactly this kind of intermittent failure: unguarded `async`/`await` races, `setTimeout`/`setInterval`/debounce logic, WebSocket or polling reconnect handling, unbounded retries, shared mutable state written from more than one place, or timing-dependent UI renders (`useEffect` firing before data resolves). Cite the exact file and line when you find something that matches; if nothing corroborates a hypothesis, say so explicitly rather than presenting a guess as confirmed.

## Rank Hypotheses

Order hypotheses by strength of evidence: a hypothesis backed by both a recurring failure note and corroborating code ranks above one backed by only a note, which ranks above a plausible guess with neither. Never invent a hypothesis that contradicts the actual failure notes or code you found.

## Output

Read the project's `CLAUDE.md` before writing the report. Follow its "Flaky Test Report Fields" section exactly — the exact fields, in that order, with no additions or omissions — and use only the exact Severity values from its "Severity Levels" section. Follow its "Voice" section: clear, direct English, no buzzwords, no filler, no hedging.

The "Recommended Next Step" must be one concrete, actionable step (e.g., "add a `waitFor` around the WebSocket event before asserting" or "guard the increment in `notifications.js` with a mutex"), never "investigate further" or "add retries" as a default deflection.

If `CLAUDE.md` is missing or incomplete, fall back to the field set above and clearly tell the user what you assumed.
