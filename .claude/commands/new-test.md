---
description: Interactively create a new manual test case file under tests/manual/
---

Walk the user through creating a manual test case, one question at a time. Do not skip ahead or ask multiple questions at once.

1. Ask: "What feature does this test cover?" Wait for the answer before continuing.
2. Ask: "What steps does the user take?" Wait for the answer before continuing. If the answer is a single block of text rather than a clear list, break it into a logical sequence of discrete steps.
3. Ask: "What is the expected result?" Wait for the answer before continuing.
4. Ask: "What is the severity?" and offer exactly these four choices: Critical, Major, Minor, Trivial. If the user's answer doesn't match one of these four exactly (case-insensitively), map it to the closest one or ask them to pick again — never accept a free-form value.

Once all four answers are collected, generate a test case file:

- Directory: `tests/manual/` (create it if it doesn't exist).
- Filename: a kebab-case slug derived from the feature name, e.g. `login-with-valid-credentials.md`. If a file with that name already exists, append `-2`, `-3`, etc. to keep it unique.
- File contents, formatted exactly as:

```markdown
# <Title derived from the feature>

## Steps
1. <first step>
2. <second step>
...

## Expected Result
<expected result>

## Severity
<Critical|Major|Minor|Trivial>
```

After writing the file, tell the user the path of the file you created and show them its contents.
