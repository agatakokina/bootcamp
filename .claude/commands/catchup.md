---
description: Summarize recent project activity into a daily catchup note
---

Generate a daily catchup summary in two steps: auto-detect recent activity, then ask the user to fill gaps.

## Step 1 — Auto-detect recent activity

Gather signals from the last ~24 hours (adjust the window if the project has been quiet longer and say so):

- If this is a git repository: run `git log --since="24 hours ago" --oneline --all` and `git status --short` to see recent commits and uncommitted changes.
- If it is not a git repository, or git shows little activity: fall back to recently modified files, e.g. `find . -type f -mtime -1 -not -path "*/node_modules/*" -not -path "*/.git/*"` (adjust excludes for the project).
- Look specifically for new/modified files under `tests/manual/`, `tests/bugs/`, and any other test or docs directories, since those indicate test cases or bug reports created recently.

From these signals, build a short bullet list of likely completed tasks (e.g. "Created bug report: login button unresponsive", "Added manual test case: password reset flow", "Modified src/auth.js").

## Step 2 — Ask the user to fill gaps

Ask one question at a time, showing your detected list first:

1. Say: "Here is what I noticed you worked on: [list identified tasks]. Is there anything else you completed?" Wait for the answer.
2. Ask: "Did you encounter any blockers or risks today?" Wait for the answer. If they say no/none, record "None".

Then ask (or auto-suggest and let them confirm/edit): "What's your focus for tomorrow?" A brief auto-suggested next step based on detected activity is fine if they have nothing specific.

## Step 3 — Produce the output

- Directory: `notes/daily/` (create it if it doesn't exist).
- Filename: `YYYY-MM-DD-catchup.md` using today's date. If it already exists, overwrite it (it's the single daily note for today) unless the user asks otherwise.
- File contents and chat output both use this exact structure:

```markdown
# Catchup — <YYYY-MM-DD>

## Completed Today
- <auto-detected item>
- <auto-detected item>
- <user-added item>

## Blockers / Risks
- <user response, or "None">

## Focus for Tomorrow
- <auto-suggested or user-provided next step>
```

After writing the file, print the same content again directly in the chat as a clean, ready-to-paste block (e.g. inside a fenced code block) for pasting into Slack/Teams, and tell the user the path of the file you created.
