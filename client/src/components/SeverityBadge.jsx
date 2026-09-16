const TONES = {
  critical: "red",
  major: "orange",
  minor: "blue",
  trivial: "gray",
};

function SeverityBadge({ severity }) {
  const tone = TONES[severity] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{severity}</span>;
}

export default SeverityBadge;
