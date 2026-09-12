const COLORS = {
  open: { bg: "#dbeafe", fg: "#1d4ed8" },
  "in-progress": { bg: "#fef9c3", fg: "#854d0e" },
  resolved: { bg: "#dcfce7", fg: "#166534" },
  closed: { bg: "#e5e7eb", fg: "#374151" },
  reopened: { bg: "#fee2e2", fg: "#b91c1c" },
};

function BugStatusBadge({ status }) {
  const colors = COLORS[status] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span className="badge" style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {status}
    </span>
  );
}

export default BugStatusBadge;
