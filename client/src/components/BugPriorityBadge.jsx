const TONES = {
  urgent: "red",
  high: "orange",
  medium: "blue",
  low: "gray",
};

function BugPriorityBadge({ priority }) {
  const tone = TONES[priority] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{priority}</span>;
}

export default BugPriorityBadge;
