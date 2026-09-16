import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { addBugComment, changeBugStatus, deleteBug, fetchBug, updateBug } from "../api/bugs.js";
import { STATUS_TRANSITIONS } from "../constants/bugs.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import BugStatusBadge from "../components/BugStatusBadge.jsx";
import BugPriorityBadge from "../components/BugPriorityBadge.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import BugFormModal from "../components/BugFormModal.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(entry) {
  if (entry.action === "created") return "Bug reported";
  if (entry.action === "status_change") return `Status changed: ${entry.old_value} → ${entry.new_value}`;
  return "Comment";
}

function BugDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bug, setBug] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [nextStatus, setNextStatus] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBug(id)
      .then(setBug)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleChangeStatus() {
    if (!nextStatus) return;
    setChangingStatus(true);
    setError(null);
    try {
      const updated = await changeBugStatus(id, nextStatus, statusMessage.trim() || undefined);
      setBug(updated);
      setNextStatus("");
      setStatusMessage("");
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleAddComment() {
    if (!commentText.trim()) return;
    setPostingComment(true);
    setError(null);
    try {
      const updated = await addBugComment(id, commentText.trim());
      setBug(updated);
      setCommentText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingComment(false);
    }
  }

  async function handleUpdateBug(payload) {
    const updated = await updateBug(id, payload);
    setBug(updated);
    setShowEdit(false);
  }

  async function handleConfirmDelete() {
    await deleteBug(id);
    navigate("/bugs");
  }

  if (loading) return <main className="page">Loading...</main>;
  if (error && !bug) {
    return (
      <main className="page">
        <p className="form-error">{error}</p>
        <p>
          <Link to="/bugs">← Back to Bugs</Link>
        </p>
      </main>
    );
  }
  if (!bug) return null;

  const allowedNext = STATUS_TRANSITIONS[bug.status] || [];

  return (
    <main className="page">
      <p>
        <Link to="/bugs">← Back to Bugs</Link>
      </p>

      <div className="page-header">
        <h1>{bug.title}</h1>
        <div className="page-header-actions">
          <button type="button" className="secondary-button" onClick={() => setShowEdit(true)}>
            Edit
          </button>
          <button type="button" className="danger-button" onClick={() => setShowDelete(true)}>
            Delete Bug
          </button>
        </div>
      </div>

      <p className="suite-meta">
        <SeverityBadge severity={bug.severity} /> &nbsp; <BugPriorityBadge priority={bug.priority} /> &nbsp;{" "}
        <BugStatusBadge status={bug.status} /> &nbsp;·&nbsp; Updated {formatDate(bug.updated_at)}
      </p>

      {error && <p className="form-error">{error}</p>}

      <section className="details-section">
        <h3>Description</h3>
        <p>{bug.description}</p>
      </section>

      {bug.environment && (
        <section className="details-section">
          <h3>Environment</h3>
          <p>{bug.environment}</p>
        </section>
      )}

      <section className="details-section">
        <h3>Steps to Reproduce</h3>
        <ol>
          {bug.steps_to_reproduce.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <section className="details-section">
        <h3>Expected</h3>
        <p>{bug.expected}</p>
      </section>

      <section className="details-section">
        <h3>Actual</h3>
        <p>{bug.actual}</p>
      </section>

      <section className="details-section">
        <h3>Change Status</h3>
        {allowedNext.length === 0 ? (
          <p>No further status transitions are available.</p>
        ) : (
          <div className="add-case-row">
            <select aria-label="Change bug status" value={nextStatus} onChange={(e) => setNextStatus(e.target.value)}>
              <option value="">Change status to...</option>
              {allowedNext.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="text"
              aria-label="Status change note"
              placeholder="Optional note..."
              value={statusMessage}
              onChange={(e) => setStatusMessage(e.target.value)}
            />
            <button type="button" onClick={handleChangeStatus} disabled={!nextStatus || changingStatus}>
              {changingStatus ? "Updating..." : "Update"}
            </button>
          </div>
        )}
      </section>

      <section className="details-section">
        <h3>Activity</h3>
        <ul className="activity-timeline">
          {bug.activity.map((entry) => (
            <li key={entry.id} className="activity-entry">
              <div className="activity-meta">
                <strong>{activityLabel(entry)}</strong>
                <span className="activity-time">{formatDate(entry.created_at)}</span>
              </div>
              {entry.message && <p className="activity-message">{entry.message}</p>}
            </li>
          ))}
        </ul>

        <div className="add-case-row">
          <input
            type="text"
            aria-label="Add a comment"
            placeholder="Add a comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />
          <button type="button" onClick={handleAddComment} disabled={!commentText.trim() || postingComment}>
            {postingComment ? "Posting..." : "Comment"}
          </button>
        </div>
      </section>

      {showEdit && (
        <BugFormModal bug={bug} onClose={() => setShowEdit(false)} onSubmit={handleUpdateBug} />
      )}

      {showDelete && (
        <DeleteConfirmModal
          title="Delete Bug"
          label={bug.title}
          irreversible={false}
          warning="This is a soft delete — the bug and its full activity history are hidden but not destroyed, and can be restored from Trash on the Bugs page."
          onClose={() => setShowDelete(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </main>
  );
}

export default BugDetailPage;
