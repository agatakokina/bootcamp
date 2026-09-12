const COLORS = {
  urgent: { bg: "#fee2e2", fg: "#b91c1c" },
  high: { bg: "#ffedd5", fg: "#c2410c" },
  medium: { bg: "#dbeafe", fg: "#1d4ed8" },
  low: { bg: "#e5e7eb", fg: "#4b5563" },
};

function BugPriorityBadge({ priority }) {
  const colors = COLORS[priority] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span className="badge" style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {priority}
    </span>
  );
}

export default BugPriorityBadge;
