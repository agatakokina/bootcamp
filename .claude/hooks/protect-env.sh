#!/usr/bin/env bash
# PreToolUse hook: blocks Write/Edit tool calls targeting the project's .env
# file. Exits 2 (blocking) with a stderr message when blocked, exits 0
# (allow) for every other tool or file path.

set -euo pipefail

INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

case "$TOOL_NAME" in
  Write|Edit) ;;
  *) exit 0 ;;
esac

case "$FILE_PATH" in
  .env|*/.env)
    echo "SECURITY ERROR: Modifying .env via automated tool calls is strictly forbidden." >&2
    exit 2
    ;;
  *)
    exit 0
    ;;
esac
