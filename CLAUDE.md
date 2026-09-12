# CLAUDE.md

## Stack
React + Vite frontend (`client/`) and an Express backend (`server/`), managed as an npm workspaces monorepo.

## Severity Levels
- **Critical** — the system is unusable or data is lost/corrupted; no workaround exists.
- **Major** — a core feature is broken but the system is still usable via a workaround.
- **Minor** — a non-core feature or edge case is broken with limited impact.
- **Trivial** — a cosmetic or wording issue with no functional impact.

## Test Case Fields
- **Title** — short name of what's being tested.
- **Preconditions** — state required before the steps can be run.
- **Steps** — numbered, one action per step.
- **Expected Result** — what should happen if the test passes.
- **Severity** — Critical / Major / Minor / Trivial.
- **Status** — draft / ready / passed / failed / skipped.
- **Test Type** — Smoke / Regression / "Smoke / Regression".

## Bug Report Fields
- **Title** — short name of the bug.
- **Steps to Reproduce** — numbered, one action per step.
- **Expected** — what should have happened.
- **Actual** — what happened instead.
- **Severity** — Critical / Major / Minor / Trivial.
- **Status** — open / in-progress / resolved / closed / reopened.

## API Response Shape
Every endpoint returns:
```json
{ "success": boolean, "data": any, "error": string | null }
```

## File Naming
- Files: kebab-case (e.g. `user-profile.js`).
- React components: PascalCase (e.g. `UserProfile.jsx`).
- API handlers: `handleVerbNoun` (e.g. `handleCreateUser`).

## Voice
Write all generated test cases and bug reports in clear, direct English. No buzzwords, no filler, no hedging — state facts plainly.
