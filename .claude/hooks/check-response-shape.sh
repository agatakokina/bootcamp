#!/usr/bin/env bash
# PostToolUse hook: warns (never blocks) when a router file directly under
# server/ (e.g. server/bugs.js, server/test-cases.js) is written/edited and
# appears to send a response that doesn't follow the {success, data, error}
# envelope required by CLAUDE.md's API Response Shape. server/index.js
# (app bootstrap) and server/db.js (schema/seed only) are excluded since
# they aren't route-handler files.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

[ -z "$FILE_PATH" ] && exit 0

# Only care about *.js files directly under a top-level server/ directory.
case "$FILE_PATH" in
  */server/*.js|server/*.js) ;;
  *) exit 0 ;;
esac

# Skip non-route-handler infrastructure files.
case "$(basename "$FILE_PATH")" in
  index.js|db.js) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

VIOLATIONS=""
while IFS=: read -r lineno rest; do
  # Look at a small window of lines after the response call for "success" —
  # a plain grep on the match line alone would miss multi-line res.json({...}).
  context=$(sed -n "${lineno},$((lineno + 5))p" "$FILE_PATH")
  if ! printf '%s' "$context" | grep -q "success"; then
    trimmed=$(printf '%s' "$rest" | sed -e 's/^[[:space:]]*//')
    VIOLATIONS="${VIOLATIONS}Line ${lineno}: ${trimmed}\n"
  fi
done < <(grep -n -E 'res\.(json|send)\(' "$FILE_PATH" || true)

if [ -n "$VIOLATIONS" ]; then
  jq -n \
    --arg file "$FILE_PATH" \
    --arg lines "$(printf '%b' "$VIOLATIONS")" \
    '{systemMessage: ("⚠️  CLAUDE.md response-shape warning in " + $file + ": one or more res.json()/res.send() calls do not appear to return the {success, data, error} envelope.\n" + $lines)}'
fi

exit 0
