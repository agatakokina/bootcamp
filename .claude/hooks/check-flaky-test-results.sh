#!/usr/bin/env bash
# PostToolUse hook: after a Bash command that plausibly touched
# test_run_results (a seed script, a direct sqlite3 query, or a curl call
# against the test-runs API), scans the local database for any test case
# whose pass/fail history has crossed the flaky threshold (>=30% flip rate
# across >=3 comparable runs — the same formula server/flakiness.js uses)
# and warns (never blocks) via systemMessage.
#
# This is a Claude Code-side detector, distinct from the app's own Discord
# alert in server/test-runs.js. That one fires for real end users hitting
# the deployed app through the UI; this hook instead catches flakiness
# introduced or exposed during a dev/ops session that used Claude Code's own
# Bash tool (e.g. running the seed script, or manually flipping a result via
# curl while testing).

set -euo pipefail

INPUT=$(cat)

COMMAND=$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')
[ -z "$COMMAND" ] && exit 0

case "$COMMAND" in
  *data.sqlite*|*test_run_results*|*test-runs*|*seed-flaky*|*seed-snapshot*|*flaky-tests*) ;;
  *) exit 0 ;;
esac

DB_PATH="${CLAUDE_PROJECT_DIR:-.}/server/data.sqlite"
[ -f "$DB_PATH" ] || exit 0
command -v sqlite3 >/dev/null 2>&1 || exit 0

# Same definition as server/flakiness.js: transitions between consecutive
# passed/failed results (skips excluded), divided by (comparable runs - 1).
# A test that fails every run scores 0 here (consistently broken, not
# flaky); one that alternates scores close to 1.
FLAKY=$(sqlite3 -separator '|' "$DB_PATH" "
  WITH ordered AS (
    SELECT
      r.test_case_id,
      r.result,
      LAG(r.result) OVER (PARTITION BY r.test_case_id ORDER BY tr.start_time, r.id) AS prev_result
    FROM test_run_results r
    JOIN test_runs_v2 tr ON tr.id = r.run_id
    WHERE r.result IN ('passed', 'failed')
  ),
  transitions AS (
    SELECT
      test_case_id,
      COUNT(*) AS total,
      SUM(CASE WHEN prev_result IS NOT NULL AND result != prev_result THEN 1 ELSE 0 END) AS flips
    FROM ordered
    GROUP BY test_case_id
    HAVING total >= 3
  )
  SELECT tc.title, t.total, CAST(ROUND(100.0 * t.flips / (t.total - 1)) AS INTEGER)
  FROM transitions t
  JOIN test_cases tc ON tc.id = t.test_case_id
  WHERE CAST(t.flips AS REAL) / (t.total - 1) >= 0.3
  ORDER BY (CAST(t.flips AS REAL) / (t.total - 1)) DESC
  LIMIT 10;
" 2>/dev/null || true)

[ -z "$FLAKY" ] && exit 0

LINES=""
while IFS='|' read -r title total score; do
  [ -z "$title" ] && continue
  LINES="${LINES}- ${title} — ${score}% flaky over ${total} runs\n"
done <<< "$FLAKY"

[ -z "$LINES" ] && exit 0

jq -n --arg lines "$(printf '%b' "$LINES")" \
  '{systemMessage: ("🟡 Flaky Test Tracker: this touched test run data, and the following test(s) are currently flaky (>=30% flip rate):\n" + $lines)}'

exit 0
