# Investigating why a Flaky Test Tracker entry is flaky

## Prompt I typed

> Investigate why "[Flaky Seed] Notification badge count updates in real time" is flaky (the current #1 entry in the Flaky Test Tracker). Dev server is running at http://localhost:3001.

## What Claude did

1. Loaded the `flaky-test-analysis` skill, which pulls real run history instead of speculating.
2. Fetched `GET http://localhost:3001/api/flaky-tests` and located this test case's entry: 30 total runs, 18 passed / 11 failed / 1 skipped, flakiness score 0.61.
3. Grouped its three recorded failure notes by frequency (6, 3, and 2 occurrences respectively).
4. Grepped both `client/` and `server/` for `notification|websocket|badge` to look for real corroborating code, since the skill's instructions require marking a hypothesis "unconfirmed" rather than "likely" when no supporting code exists.
5. Found only unrelated UI status-badge components (`SeverityBadge`, `ResultBadge`, etc.) — no notification or WebSocket feature exists anywhere in the codebase. Confirmed this test case's failure notes are synthetic seed data written to populate the tracker demo, not tied to a built feature.
6. Wrote the report using `CLAUDE.md`'s "Flaky Test Report Fields" exactly, refusing to present an unconfirmed guess as a confirmed root cause.

## Result

Output printed directly in chat (no file written — this is a diagnostic report, not a generated artifact):

```
## Flaky Test Report

**Test Case:** [Flaky Seed] Notification badge count updates in real time

**Flakiness Score:** 61% (11 failures / 18 passes / 1 skip across 30 runs, 38% fail rate)

**Hypotheses:**
1. WebSocket reconnect occasionally misses the count-update event sent during the gap — recorded on 6 of 11 failures, the most frequent recurring note. **Unconfirmed by code**: no WebSocket, polling, or notification-badge implementation exists anywhere in `client/` or `server/` (grepped both trees) — this test case and its notes are synthetic seed data written to populate the Flaky Test Tracker demo, not tied to a real feature.
2. Badge count read happens before the increment transaction commits — recorded on 3 of 11 failures. Same caveat: no corresponding `notifications`/`badge`-count code exists to corroborate or refute it.
3. Client-side count cache isn't invalidated on a rapid double-notification burst — recorded on 2 of 11 failures, the weakest signal (fewest occurrences, no corroborating code).

**Recommended Next Step:** No code fix applies today — there is no real notification/WebSocket feature backing this test, so the flakiness is entirely seed data generated for demo purposes. When that feature is actually built, prioritize integration test coverage for the WebSocket-reconnect gap specifically (hypothesis 1), since it accounts for the largest share of recorded failures.

**Suggested Severity:** Minor
```

Takeaway: the skill correctly refused to fabricate a "confirmed" root cause for code that doesn't exist, instead of producing a plausible-sounding but false diagnosis.
