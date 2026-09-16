const TONES = {
  pending: "gray",
  passed: "green",
  failed: "red",
  skipped: "blue",
};

function ResultBadge({ result }) {
  const tone = TONES[result] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{result}</span>;
}

export default ResultBadge;
