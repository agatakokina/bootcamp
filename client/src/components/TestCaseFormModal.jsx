import { useState } from "react";
import { stripLeadingNumber } from "../utils/text.js";

const SEVERITIES = ["critical", "major", "minor", "trivial"];
const STATUSES = ["draft", "ready", "passed", "failed", "skipped"];
const TEST_TYPES = ["smoke", "regression", "smoke-regression"];

function toFormState(testCase) {
  return {
    title: testCase?.title ?? "",
    preconditions: testCase?.preconditions ?? "",
    steps: testCase?.steps?.join("\n") ?? "",
    expected_result: testCase?.expected_result ?? "",
    severity: testCase?.severity ?? "major",
    status: testCase?.status ?? "draft",
    test_type: testCase?.test_type ?? "smoke",
  };
}

function TestCaseFormModal({ testCase, onClose, onSubmit }) {
  const [form, setForm] = useState(() => toFormState(testCase));
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(testCase);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const steps = form.steps
      .split("\n")
      .map((s) => stripLeadingNumber(s))
      .filter(Boolean);

    if (!form.title.trim() || !form.expected_result.trim() || steps.length === 0) {
      setError("Title, steps, and expected result are required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        preconditions: form.preconditions.trim(),
        steps,
        expected_result: form.expected_result.trim(),
        severity: form.severity,
        status: form.status,
        test_type: form.test_type,
      });
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isEdit ? "Edit Test Case" : "New Test Case"}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Title *
            <input
              type="text"
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              required
            />
          </label>

          <label>
            Preconditions
            <textarea
              rows={2}
              value={form.preconditions}
              onChange={(e) => update("preconditions", e.target.value)}
            />
          </label>

          <label>
            Steps * (one per line)
            <textarea
              rows={4}
              value={form.steps}
              onChange={(e) => update("steps", e.target.value)}
              required
            />
          </label>

          <label>
            Expected Result *
            <textarea
              rows={2}
              value={form.expected_result}
              onChange={(e) => update("expected_result", e.target.value)}
              required
            />
          </label>

          <div className="form-row">
            <label>
              Severity *
              <select value={form.severity} onChange={(e) => update("severity", e.target.value)}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Status *
              <select value={form.status} onChange={(e) => update("status", e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Test Type *
              <select value={form.test_type} onChange={(e) => update("test_type", e.target.value)}>
                {TEST_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
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

export default TestCaseFormModal;
