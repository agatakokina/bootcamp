const COLORS = {
  pending: { bg: "#e5e7eb", fg: "#4b5563" },
  passed: { bg: "#dcfce7", fg: "#166534" },
  failed: { bg: "#fee2e2", fg: "#b91c1c" },
  skipped: { bg: "#dbeafe", fg: "#1d4ed8" },
};

function ResultBadge({ result }) {
  const colors = COLORS[result] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span className="badge" style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {result}
    </span>
  );
}

export default ResultBadge;
