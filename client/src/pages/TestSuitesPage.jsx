import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createSuite, fetchSuites } from "../api/test-suites.js";
import SuiteStatusBadge from "../components/SuiteStatusBadge.jsx";
import SuiteFormModal from "../components/SuiteFormModal.jsx";

const STATUSES = ["draft", "ready", "in-progress", "passed", "failed"];

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TestSuitesPage() {
  const [suites, setSuites] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchSuites({ status: statusFilter })
      .then(setSuites)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(payload) {
    await createSuite(payload);
    setShowCreate(false);
    load();
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Test Suites</h1>
        <button onClick={() => setShowCreate(true)}>+ New Suite</button>
      </div>

      <div className="toolbar">
        <select aria-label="Filter suites by status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Feature</th>
            <th>Status</th>
            <th>Cases</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : suites.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-cell">
                No test suites found.
              </td>
            </tr>
          ) : (
            suites.map((suite) => (
              <tr key={suite.id}>
                <td>
                  <Link to={`/test-suites/${suite.id}`}>{suite.name}</Link>
                </td>
                <td>{suite.feature}</td>
                <td>
                  <SuiteStatusBadge status={suite.status} />
                </td>
                <td>{suite.case_count}</td>
                <td>{formatDate(suite.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      {showCreate && <SuiteFormModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} />}
    </main>
  );
}

export default TestSuitesPage;
