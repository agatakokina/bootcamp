import { useEffect, useRef, useState } from "react";
import { fetchDeletedBugs, restoreBug } from "../api/bugs.js";
import SeverityBadge from "./SeverityBadge.jsx";

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BugTrashModal({ onClose, onRestored }) {
  const modalRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchDeletedBugs()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  async function handleRestore(id) {
    setRestoringId(id);
    setError(null);
    try {
      await restoreBug(id);
      load();
      onRestored?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">Deleted Bugs</h2>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>Nothing in the trash.</p>
        ) : (
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Deleted</th>
                <th aria-label="Restore"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((bug) => (
                <tr key={bug.id}>
                  <td>{bug.title}</td>
                  <td>
                    <SeverityBadge severity={bug.severity} />
                  </td>
                  <td>{formatDate(bug.deleted_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleRestore(bug.id)}
                      disabled={restoringId === bug.id}
                    >
                      {restoringId === bug.id ? "Restoring..." : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default BugTrashModal;
