export const SEVERITIES = ["critical", "major", "minor", "trivial"];
export const PRIORITIES = ["low", "medium", "high", "urgent"];

export const STATUS_TRANSITIONS = {
  open: ["in-progress", "closed"],
  "in-progress": ["resolved", "closed"],
  resolved: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in-progress", "closed"],
};

export const STATUSES = Object.keys(STATUS_TRANSITIONS);
