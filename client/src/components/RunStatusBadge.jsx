const COLORS = {
  "in-progress": { bg: "#fef9c3", fg: "#854d0e" },
  completed: { bg: "#dcfce7", fg: "#166534" },
};

function RunStatusBadge({ status }) {
  const colors = COLORS[status] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span className="badge" style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {status}
    </span>
  );
}

export default RunStatusBadge;
