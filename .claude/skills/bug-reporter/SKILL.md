---
name: bug-reporter
description: Use this skill whenever the user asks to file a bug report, log a bug ticket, turn an error into an issue, create a bug report for a failure, or format a failure as a bug. Trigger on requests like "file a bug report", "log a bug ticket", "turn this error into an issue", "create a bug report for X", or "format this failure as a bug".
allowed-tools: Read, Grep
---

# Bug Reporter

Take raw notes, error logs, stack traces, or failure descriptions the user provides and convert them into a clean, standardized bug report.

## Required Fields

Every bug report must use exactly the Bug Report Fields defined in the project's `CLAUDE.md`, in this order:

- **Title** — short name of the bug.
- **Steps to Reproduce** — numbered, one action per step.
- **Expected** — what should have happened.
- **Actual** — what happened instead.
- **Severity** — one of the exact values from `CLAUDE.md`'s "Severity Levels" section: Critical, Major, Minor, Trivial.
- **Status** — one of the exact values `CLAUDE.md` defines for bug reports: open, in-progress, resolved, closed, reopened. Default to "open" for a newly filed bug unless the user says otherwise.

Do not add fields beyond these six, and do not rename them. If `CLAUDE.md` does not exist or does not define these fields, fall back to this same field set and tell the user you did so.

## Turning Raw Input Into a Report

- Extract the concrete facts from the user's notes or logs: what they were doing, what error or log lines appeared, and what the correct behavior would be. Do not invent details that aren't implied by the input.
- If the input is missing something needed for a field (e.g., no clear expected behavior), ask the user rather than guessing, unless the answer is obvious from context.
- Write in the voice defined in `CLAUDE.md`: clear, direct English, no buzzwords, no filler, no hedging.

## Output Format

Output the bug report as plain, readable text using the field structure above. Do not wrap the entire bug report in a Markdown code block.
