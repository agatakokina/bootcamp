# App-wide QA polish pass across every page

## Prompt I typed

> Let's move to Step 4: App-Wide Polish. Please check all pages (Dashboard, Settings, Bug Tracker, Flaky Test Tracker, NavBar) to make sure they share a cohesive theme, color palette, and visual design. Fix any inconsistencies.

## What Claude did

1. Read every badge component (`SeverityBadge`, `TestTypeBadge`, `ResultBadge`, `RunStatusBadge`, `BugStatusBadge`, `BugPriorityBadge`, `SuiteStatusBadge`) and found each one hardcoded light-mode-only hex colors (e.g. `background: "#fee2e2"`), completely bypassing the app's existing dark/light CSS-variable theme system.
2. Confirmed the problem visually: switched the running app to dark mode and screenshotted the Bugs and Flaky Test Tracker pages — the badges rendered as bright pastel light-mode chips clashing against the dark surface.
3. Found the same hardcoded-color problem in `.form-error`, `.form-warning`, `.form-success`, and a few danger-text/hover rules elsewhere in `index.css`.
4. Designed a shared "tone" system: nine semantic colors (red, orange, yellow, green, blue, purple, indigo, lime, gray), each with a light-mode value and a muted, tinted dark-mode value, added as CSS custom properties in `:root` and `:root[data-theme="dark"]`.
5. Refactored all seven badge components to map their value to a tone name and render a `badge-tone-*` class instead of inline styles, then rewired the form-state and hover rules onto the same tone variables.
6. Computed WCAG contrast ratios programmatically for every tone/background pairing in both themes, rather than eyeballing it — confirmed all pass AA (lowest: 6.62:1 dark, 4.52:1 light).
7. Re-verified in the browser: dark mode now shows muted, cohesive badges everywhere; switched back to light mode and confirmed it was pixel-identical to before the change (no regression).

## Result

Files changed:
- `client/src/index.css` — new tone-based color system, replacing every hardcoded status/severity/result color in the app.
- `client/src/components/SeverityBadge.jsx`, `TestTypeBadge.jsx`, `ResultBadge.jsx`, `RunStatusBadge.jsx`, `BugStatusBadge.jsx`, `BugPriorityBadge.jsx`, `SuiteStatusBadge.jsx` — refactored from inline `style={{...}}` to `className="badge badge-tone-X"`.

Verified output (screenshot comparison, dark mode, Bugs page):
- **Before:** severity/priority/status badges rendered as solid, near-white pastel chips (`#fee2e2`, `#dbeafe`, `#dcfce7`) that visually clashed against the dark page background.
- **After:** same badges render as muted, tinted chips (e.g. red badge background `rgba(248,113,113,0.16)` with `#fca5a5` text) that read as part of the dark surface instead of a light-mode sticker pasted on top of it.

Confirmed via live screenshots across Bugs, Flaky Test Tracker, Test Cases, Test Runs, and Settings, in both themes — no visual regressions, full cross-page cohesion restored.
