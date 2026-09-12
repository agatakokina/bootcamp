---
name: test-generator
description: Use this skill whenever the user asks to generate test cases, write QA/manual tests, design a test suite for a feature or input field, or apply formal test-design techniques such as ISTQB boundary-value analysis or equivalence partitioning. Trigger on requests like "write test cases for X", "generate QA tests", "what should we test for this input", "apply boundary value analysis to Y", or "design a test suite for this feature". Also trigger when the user is filling out or extending files under tests/manual/ and wants systematic coverage rather than a single ad-hoc case.
---

# Test Generator

Generate systematic, ISTQB-style test suites rather than one-off happy-path cases.

## Test Design Technique

For every input or feature under test, apply formal ISTQB techniques before writing test cases:

1. **Equivalence Partitioning** — divide each input into valid and invalid partitions (e.g., for a numeric field: below range, in range, above range; for a string: empty, too short, valid length, too long). Pick one representative value per partition rather than testing every possible value.
2. **Boundary Value Analysis** — for every bounded input, test the boundary and its immediate neighbors, not just the middle of the range.

## Required Coverage

A generated test suite must systematically include, for every relevant input or flow:

- **Happy path(s)** — the standard, valid, expected-to-succeed scenario(s).
- **Boundary values** — minimum, maximum, minimum − 1, maximum + 1, empty string, whitespace-only input, and maximum-length input.
- **Equivalence partitions** — at least one representative case per valid and invalid partition identified above.
- **Negative cases** — invalid input types (e.g., a number where text is expected), missing required fields, and duplicate values where uniqueness is expected.

Do not stop at a single happy-path test case when the request is to "generate test cases" or "write a test suite" — cover all four categories above unless the user explicitly scopes the request down (e.g., "just the happy path").

## CLAUDE.md Compliance

Before writing any test case, read the project's `CLAUDE.md` and strictly follow it:

- **Field shape** — every test case must use exactly the fields defined under "Test Case Fields" in `CLAUDE.md` (title, preconditions, steps, expected result, severity, status, test type, and any other field listed there), in that structure. Do not add or drop fields.
- **Severity** — assign one of the exact severity values defined in `CLAUDE.md`'s "Severity Levels" section, using its definitions to judge severity from the impact of the scenario failing (not from whether the specific test case passes or fails).
- **Status** — assign one of the exact status values defined in `CLAUDE.md` (defaulting to the value CLAUDE.md specifies as the default, e.g. "draft", unless the user states otherwise).
- **Formatting and voice** — follow the exact formatting rules and the "Voice" section in `CLAUDE.md`: clear, direct English, no buzzwords, no filler.

If `CLAUDE.md` does not exist or does not define one of these things, fall back to sensible defaults and tell the user what you assumed.

## Output

Present each test case as a distinct, clearly separated block. When there are several test cases (e.g., one suite covering happy path + boundaries + partitions + negatives), group or label them so the user can see which category each one covers.
