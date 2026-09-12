const COLORS = {
  critical: { bg: "#fee2e2", fg: "#b91c1c" },
  major: { bg: "#ffedd5", fg: "#c2410c" },
  minor: { bg: "#dbeafe", fg: "#1d4ed8" },
  trivial: { bg: "#e5e7eb", fg: "#4b5563" },
};

function SeverityBadge({ severity }) {
  const colors = COLORS[severity] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span
      className="badge"
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {severity}
    </span>
  );
}

export default SeverityBadge;
