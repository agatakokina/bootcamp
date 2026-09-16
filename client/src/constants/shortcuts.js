const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent || "");

const MOD_LABEL = isMac ? "⌘" : "Ctrl";

// Single source of truth for every global keyboard shortcut in the app.
// Both the global keydown listener (KeyboardShortcuts.jsx) and the help
// cheat sheet (ShortcutsHelpModal.jsx) read from this exact array, so
// adding a shortcut here is the only change needed to make it live and
// documented at the same time.
//
// type "combo": a single keypress with modifiers (mod = Cmd on Mac / Ctrl elsewhere).
// type "sequence": an ordered, unmodified key sequence (e.g. "g" then "t").
export const SHORTCUTS = [
  {
    id: "quick-search",
    type: "combo",
    key: "k",
    mod: true,
    action: "openQuickSearch",
    label: `${MOD_LABEL}+K`,
    description: "Open quick search",
    category: "General",
  },
  {
    id: "help",
    type: "combo",
    key: "?",
    shift: true,
    action: "openHelp",
    label: "Shift+?",
    description: "Show this keyboard shortcuts list",
    category: "General",
  },
  {
    id: "goto-dashboard",
    type: "sequence",
    keys: ["g", "d"],
    path: "/dashboard",
    label: "G then D",
    description: "Go to Dashboard",
    category: "Navigation",
  },
  {
    id: "goto-test-cases",
    type: "sequence",
    keys: ["g", "t"],
    path: "/test-cases",
    label: "G then T",
    description: "Go to Test Cases",
    category: "Navigation",
  },
  {
    id: "goto-bugs",
    type: "sequence",
    keys: ["g", "b"],
    path: "/bugs",
    label: "G then B",
    description: "Go to Bugs",
    category: "Navigation",
  },
  {
    id: "goto-test-runs",
    type: "sequence",
    keys: ["g", "r"],
    path: "/test-runs",
    label: "G then R",
    description: "Go to Test Runs",
    category: "Navigation",
  },
];
