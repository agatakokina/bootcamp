import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  addCaseToSuite,
  deleteSuite,
  fetchSuite,
  removeCaseFromSuite,
  reorderSuiteCases,
  updateSuite,
} from "../api/test-suites.js";
import { fetchTestCases } from "../api/test-cases.js";
import { createRun } from "../api/test-runs.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import TestTypeBadge from "../components/TestTypeBadge.jsx";
import SuiteStatusBadge from "../components/SuiteStatusBadge.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";

const STATUSES = ["draft", "ready", "in-progress", "passed", "failed"];

function TestSuiteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [suite, setSuite] = useState(null);
  const [cases, setCases] = useState([]);
  const [allTestCases, setAllTestCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [showDeleteSuite, setShowDeleteSuite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [startingRun, setStartingRun] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchSuite(id), fetchTestCases({ page: 1, pageSize: 100, sortBy: "updated_at", sortDir: "desc" })])
      .then(([suiteData, testCaseData]) => {
        setSuite(suiteData);
        setCases(suiteData.cases);
        setAllTestCases(testCaseData.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(e) {
    const status = e.target.value;
    setError(null);
    try {
      const updated = await updateSuite(id, { status });
      setSuite(updated);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddCase() {
    if (!selectedCaseId) return;
    setError(null);
    try {
      const updated = await addCaseToSuite(id, Number(selectedCaseId));
      setSuite(updated);
      setCases(updated.cases);
      setSelectedCaseId("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleConfirmRemoveCase() {
    const updated = await removeCaseFromSuite(id, removeTarget.id);
    setSuite(updated);
    setCases(updated.cases);
    setRemoveTarget(null);
  }

  async function handleConfirmDeleteSuite() {
    await deleteSuite(id);
    navigate("/test-suites");
  }

  async function handleNewRun() {
    setStartingRun(true);
    setError(null);
    try {
      const run = await createRun(id);
      navigate(`/test-runs/${run.id}`);
    } catch (err) {
      setError(err.message);
      setStartingRun(false);
    }
  }

  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  async function persistReorder(updated) {
    setCases(updated);
    try {
      await reorderSuiteCases(id, updated.map((c) => c.id));
    } catch (err) {
      setError(err.message);
      load();
    }
  }

  async function handleDrop(index) {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      return;
    }
    const updated = [...cases];
    const [moved] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, moved);
    setDraggedIndex(null);
    await persistReorder(updated);
  }

  // Keyboard-operable alternative to the drag handle above, which native
  // HTML5 drag-and-drop makes mouse-only.
  async function handleMove(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= cases.length) return;
    const updated = [...cases];
    [updated[index], updated[targetIndex]] = [updated[targetIndex], updated[index]];
    await persistReorder(updated);
  }

  if (loading) return <main className="page">Loading...</main>;
  if (error && !suite) return <main className="page">{error}</main>;
  if (!suite) return null;

  const availableCases = allTestCases.filter((tc) => !cases.some((c) => c.id === tc.id));

  return (
    <main className="page">
      <p>
        <Link to="/test-suites">← Back to Test Suites</Link>
      </p>

      <div className="page-header">
        <h1>{suite.name}</h1>
        <div className="page-header-actions">
          <select aria-label="Suite status" value={suite.status} onChange={handleStatusChange}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="button" onClick={handleNewRun} disabled={cases.length === 0 || startingRun}>
            {startingRun ? "Starting..." : "New Run"}
          </button>
          <button type="button" className="danger-button" onClick={() => setShowDeleteSuite(true)}>
            Delete Suite
          </button>
        </div>
      </div>

      <p className="suite-meta">
        Feature: <strong>{suite.feature}</strong> &nbsp;·&nbsp; <SuiteStatusBadge status={suite.status} /> &nbsp;·&nbsp;{" "}
        {cases.length} case{cases.length === 1 ? "" : "s"}
      </p>

      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th aria-label="Drag handle"></th>
            <th>Title</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Test Type</th>
            <th aria-label="Remove"></th>
          </tr>
        </thead>
        <tbody>
          {cases.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                No test cases in this suite yet.
              </td>
            </tr>
          ) : (
            cases.map((tc, index) => (
              <tr
                key={tc.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className="draggable-row"
              >
                <td className="drag-handle" aria-hidden="true">
                  ⠿
                </td>
                <td>{tc.title}</td>
                <td>
                  <SeverityBadge severity={tc.severity} />
                </td>
                <td>{tc.status}</td>
                <td>
                  <TestTypeBadge testType={tc.test_type} />
                </td>
                <td className="row-actions-cell">
                  <button
                    type="button"
                    className="reorder-button"
                    onClick={() => handleMove(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${tc.title} up`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="reorder-button"
                    onClick={() => handleMove(index, 1)}
                    disabled={index === cases.length - 1}
                    aria-label={`Move ${tc.title} down`}
                  >
                    ↓
                  </button>
                  <button className="link-button danger-text" onClick={() => setRemoveTarget(tc)}>
                    Remove
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <div className="add-case-row">
        <select aria-label="Add a test case to this suite" value={selectedCaseId} onChange={(e) => setSelectedCaseId(e.target.value)}>
          <option value="">Add a test case...</option>
          {availableCases.map((tc) => (
            <option key={tc.id} value={tc.id}>
              {tc.title}
            </option>
          ))}
        </select>
        <button onClick={handleAddCase} disabled={!selectedCaseId}>
          Add Case
        </button>
      </div>

      {showDeleteSuite && (
        <DeleteConfirmModal
          title="Delete Test Suite"
          label={suite.name}
          warning={
            cases.length > 0
              ? `This suite has ${cases.length} test case${
                  cases.length === 1 ? "" : "s"
                }. Deleting the suite will not delete the test cases themselves, only this suite and its case list.`
              : null
          }
          onClose={() => setShowDeleteSuite(false)}
          onConfirm={handleConfirmDeleteSuite}
        />
      )}

      {removeTarget && (
        <DeleteConfirmModal
          title="Remove Test Case"
          label={removeTarget.title}
          actionVerb="remove"
          irreversible={false}
          warning="This only removes the case from this suite — the test case itself is not deleted, and you can add it back anytime."
          confirmLabel="Remove"
          confirmingLabel="Removing..."
          onClose={() => setRemoveTarget(null)}
          onConfirm={handleConfirmRemoveCase}
        />
      )}
    </main>
  );
}

export default TestSuiteDetailPage;
