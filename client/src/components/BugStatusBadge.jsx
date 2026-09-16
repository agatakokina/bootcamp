const TONES = {
  open: "blue",
  "in-progress": "yellow",
  resolved: "green",
  closed: "gray",
  reopened: "red",
};

function BugStatusBadge({ status }) {
  const tone = TONES[status] || "gray";
  return <span className={`badge badge-tone-${tone}`}>{status}</span>;
}

export default BugStatusBadge;
