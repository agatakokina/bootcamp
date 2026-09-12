---
description: Interactively create a new bug report file under tests/bugs/
---

Walk the user through creating a bug report, one question at a time. Do not skip ahead or ask multiple questions at once.

1. Ask: "What page or screen were you on?" Wait for the answer before continuing.
2. Ask: "What were you trying to do (repro steps)?" Wait for the answer before continuing. If the answer is a single block of text rather than a clear list, break it into a logical sequence of discrete numbered steps.
3. Ask: "What did you expect to happen?" Wait for the answer before continuing.
4. Ask: "What actually happened instead?" Wait for the answer before continuing.
5. Ask: "What is the severity level?" and offer exactly these four choices: Critical, Major, Minor, Trivial. If the user's answer doesn't match one of these four exactly (case-insensitively), map it to the closest one or ask them to pick again — never accept a free-form value.

Once all five answers are collected, generate a bug report file:

- Directory: `tests/bugs/` (create it if it doesn't exist).
- Filename: `YYYY-MM-DD-short-description.md`, where `YYYY-MM-DD` is today's date and `short-description` is a kebab-case slug derived from the bug title (e.g. `2026-09-09-login-button-unresponsive.md`). If a file with that name already exists, append `-2`, `-3`, etc. to keep it unique.
- File contents, formatted exactly as:

```markdown
# <Title derived from the bug description>

## Timestamp
<ISO 8601 date/time of creation>

## Location
<Page/Screen>

## Severity
<Critical|Major|Minor|Trivial>

## Reproduction Steps
1. <first step>
2. <second step>
...

## Expected vs Actual Results
**Expected:** <expected result>

**Actual:** <actual result>
```

After writing the file, tell the user the path of the file you created and show them its contents.
