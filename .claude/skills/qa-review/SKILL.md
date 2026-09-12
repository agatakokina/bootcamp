---
name: qa-review
description: Use this skill whenever the user asks for a QA review, wants their changes or a PR reviewed, asks Claude to test their code, asks "what could break" or "what could go wrong", or asks to audit a feature for bugs. Trigger on requests like "QA review this", "review my changes", "test my code", "what could break here", or "audit this feature for bugs".
allowed-tools: Read, Grep
---

# QA Review

Review the given code changes, PR, or feature strictly from a QA/tester perspective — not as a code-quality or architecture review. Focus on how the feature could fail for a real user, not on style or implementation elegance.

## What to Evaluate

For the code or feature under review, specifically check for:

- **Missing input validation** — fields or parameters that accept invalid, out-of-range, wrong-type, or malformed input without being rejected.
- **Unhandled error states** — failure paths (network errors, empty results, exceptions, rejected promises) that aren't caught or surfaced to the user.
- **Vague or unclear user-facing error messages** — errors that don't tell the user what went wrong or how to fix it (e.g., generic "Something went wrong" with no detail).
- **Missing confirmation dialogs for destructive actions** — delete, remove, cancel, or other irreversible actions that execute without asking the user to confirm.
- **Basic accessibility (a11y) issues** — missing labels or alt text, non-semantic interactive elements, insufficient color contrast for status indicators, and controls that aren't keyboard-operable.

## Output Format

Report findings as a structured list grouped under exactly these four severity headings, in this order, using the severity definitions from the project's `CLAUDE.md`:

1. Critical
2. Major
3. Minor
4. Trivial

Under each heading, list only the findings at that severity, one per line, stating the concrete problem and where it occurs. Omit a heading entirely if it has no findings — do not print empty severity sections. If nothing of concern is found at any severity, say so plainly instead of inventing issues.
