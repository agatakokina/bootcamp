const LABELS = {
  smoke: "Smoke",
  regression: "Regression",
  "smoke-regression": "Smoke / Regression",
};

const TONES = {
  smoke: "lime",
  regression: "purple",
  "smoke-regression": "indigo",
};

function TestTypeBadge({ testType }) {
  const tone = TONES[testType] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{LABELS[testType] ?? testType}</span>;
}

export default TestTypeBadge;
