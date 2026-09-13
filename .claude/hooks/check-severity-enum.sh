#!/usr/bin/env bash
# PostToolUse hook: warns (never blocks) when a JS/TS/React file is written or
# edited and appears to assign a wrong severity word on the same line as
# "severity" (CLAUDE.md defines severity as exactly critical/major/minor/
# trivial). Deliberately checks only the matching line itself, not a
# surrounding window, because "high"/"medium"/"low" are also legitimate
# PRIORITY values elsewhere in this codebase (bugs feature) and a window
# picks up unrelated adjacent lines as false positives.

set -euo pipefail

INPUT=$(cat)

FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // .tool_response.filePath // empty')

[ -z "$FILE_PATH" ] && exit 0

case "$FILE_PATH" in
  *.js|*.jsx|*.ts|*.tsx) ;;
  *) exit 0 ;;
esac

[ -f "$FILE_PATH" ] || exit 0

WRONG_WORDS='high|medium|low|blocker|cosmetic'

VIOLATIONS=""
while IFS=: read -r lineno rest; do
  match=$(printf '%s' "$rest" | { grep -Eio "\\b(${WRONG_WORDS})\\b" || true; } | tr '[:upper:]' '[:lower:]' | sort -u | tr '\n' ',' | sed 's/,$//')
  if [ -n "$match" ]; then
    trimmed=$(printf '%s' "$rest" | sed -e 's/^[[:space:]]*//')
    VIOLATIONS="${VIOLATIONS}Line ${lineno}: ${trimmed}  (suspect word(s): ${match})\n"
  fi
done < <(grep -n -iE '\bseverity\b' "$FILE_PATH" || true)

if [ -n "$VIOLATIONS" ]; then
  jq -n \
    --arg file "$FILE_PATH" \
    --arg lines "$(printf '%b' "$VIOLATIONS")" \
    '{systemMessage: ("⚠️  Possible wrong severity value in " + $file + " — CLAUDE.md defines severity as exactly critical/major/minor/trivial.\n" + $lines)}'
fi

exit 0
