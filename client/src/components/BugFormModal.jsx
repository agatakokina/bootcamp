import { useEffect, useRef, useState } from "react";
import { SEVERITIES, PRIORITIES } from "../constants/bugs.js";
import { stripLeadingNumber } from "../utils/text.js";

function BugFormModal({ bug, defaultSeverity, onClose, onSubmit }) {
  const modalRef = useRef(null);
  const isEdit = Boolean(bug);
  const [title, setTitle] = useState(bug?.title ?? "");
  const [description, setDescription] = useState(bug?.description ?? "");
  const [steps, setSteps] = useState(bug?.steps_to_reproduce?.join("\n") ?? "");
  const [expected, setExpected] = useState(bug?.expected ?? "");
  const [actual, setActual] = useState(bug?.actual ?? "");
  const [environment, setEnvironment] = useState(bug?.environment ?? "");
  const [severity, setSeverity] = useState(bug?.severity ?? defaultSeverity ?? "major");
  const [priority, setPriority] = useState(bug?.priority ?? "medium");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const stepsList = steps
      .split("\n")
      .map((s) => stripLeadingNumber(s))
      .filter(Boolean);

    if (!title.trim() || !description.trim() || !expected.trim() || !actual.trim() || stepsList.length === 0) {
      setError("Title, description, steps to reproduce, expected, and actual are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: stepsList,
        expected: expected.trim(),
        actual: actual.trim(),
        environment: environment.trim(),
        severity,
        priority,
      });
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
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title">{isEdit ? "Edit Bug" : "New Bug"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title *
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>

          <label>
            Description *
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>

          <label>
            Steps to Reproduce * (one per line)
            <textarea rows={4} value={steps} onChange={(e) => setSteps(e.target.value)} required />
          </label>

          <label>
            Expected *
            <textarea rows={2} value={expected} onChange={(e) => setExpected(e.target.value)} required />
          </label>

          <label>
            Actual *
            <textarea rows={2} value={actual} onChange={(e) => setActual(e.target.value)} required />
          </label>

          <label>
            Environment
            <input
              type="text"
              placeholder="e.g. Chrome 128, macOS 14"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
            />
          </label>

          <div className="form-row">
            <label>
              Severity *
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
          </div>

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

export default BugFormModal;
