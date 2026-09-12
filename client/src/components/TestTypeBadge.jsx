const LABELS = {
  smoke: "Smoke",
  regression: "Regression",
  "smoke-regression": "Smoke / Regression",
};

const COLORS = {
  smoke: { bg: "#ecfccb", fg: "#3f6212" },
  regression: { bg: "#ede9fe", fg: "#5b21b6" },
  "smoke-regression": { bg: "#e0e7ff", fg: "#3730a3" },
};

function TestTypeBadge({ testType }) {
  const colors = COLORS[testType] || { bg: "#e5e7eb", fg: "#374151" };
  return (
    <span className="badge" style={{ backgroundColor: colors.bg, color: colors.fg }}>
      {LABELS[testType] ?? testType}
    </span>
  );
}

export default TestTypeBadge;
