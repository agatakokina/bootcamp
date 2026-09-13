import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchRuns } from "../api/test-runs.js";
import RunStatusBadge from "../components/RunStatusBadge.jsx";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TestRunsPage() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRuns()
      .then(setRuns)
      .catch((err) => {
        setError(err.message);
        setRuns([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Test Runs</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Suite</th>
            <th>Status</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : runs.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                No test runs yet. Start one from a suite's detail page.
              </td>
            </tr>
          ) : (
            runs.map((run) => (
              <tr key={run.id}>
                <td>
                  <Link to={`/test-runs/${run.id}`}>{run.suite_name || "(deleted suite)"}</Link>
                </td>
                <td>
                  <RunStatusBadge status={run.status} />
                </td>
                <td>{run.pass_count}</td>
                <td>{run.fail_count}</td>
                <td>{run.skip_count}</td>
                <td>{formatDate(run.start_time)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

export default TestRunsPage;
