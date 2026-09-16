const TONES = {
  draft: "gray",
  ready: "blue",
  "in-progress": "yellow",
  passed: "green",
  failed: "red",
};

function SuiteStatusBadge({ status }) {
  const tone = TONES[status] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{status}</span>;
}

export default SuiteStatusBadge;
