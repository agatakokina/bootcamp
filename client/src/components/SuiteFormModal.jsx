import { useEffect, useRef, useState } from "react";

const STATUSES = ["draft", "ready", "in-progress", "passed", "failed"];

function SuiteFormModal({ onClose, onSubmit }) {
  const modalRef = useRef(null);
  const [name, setName] = useState("");
  const [feature, setFeature] = useState("");
  const [status, setStatus] = useState("draft");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !feature.trim()) {
      setError("Name and feature are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), feature: feature.trim(), status });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal modal-small"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">New Test Suite</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Name *
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            Feature *
            <input
              type="text"
              placeholder="e.g. login"
              value={feature}
              onChange={(e) => setFeature(e.target.value)}
              required
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuiteFormModal;
