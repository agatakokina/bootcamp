const TONES = {
  "in-progress": "yellow",
  completed: "green",
};

function RunStatusBadge({ status }) {
  const tone = TONES[status] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{status}</span>;
}

export default RunStatusBadge;
