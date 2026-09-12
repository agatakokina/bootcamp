import { useEffect, useState } from "react";
import { fetchDeletedTestCases, restoreTestCase } from "../api/test-cases.js";
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

function TrashModal({ onClose, onRestored }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoringId, setRestoringId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchDeletedTestCases()
      .then((data) => setItems(data.items))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRestore(id) {
    setRestoringId(id);
    setError(null);
    try {
      await restoreTestCase(id);
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
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Deleted Test Cases</h2>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : items.length === 0 ? (
          <p>Nothing in the trash.</p>
        ) : (
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
              {items.map((tc) => (
                <tr key={tc.id}>
                  <td>{tc.title}</td>
                  <td>
                    <SeverityBadge severity={tc.severity} />
                  </td>
                  <td>{formatDate(tc.deleted_at)}</td>
                  <td>
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => handleRestore(tc.id)}
                      disabled={restoringId === tc.id}
                    >
                      {restoringId === tc.id ? "Restoring..." : "Restore"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

export default TrashModal;
