import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchReports } from "../api/reports.js";

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

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchReports()
      .then(setReports)
      .catch((err) => {
        setError(err.message);
        setReports([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="page">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      {error && <p className="form-error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Suite</th>
            <th>Run Date</th>
            <th>Passed</th>
            <th>Failed</th>
            <th>Skipped</th>
            <th>Generated</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : reports.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                No reports yet. Generate one from a test run's detail page.
              </td>
            </tr>
          ) : (
            reports.map((report) => (
              <tr key={report.id}>
                <td>
                  <Link to={`/reports/${report.id}`}>{report.suite_name}</Link>
                </td>
                <td>{formatDate(report.run_date)}</td>
                <td>{report.passed_count}</td>
                <td>{report.failed_count}</td>
                <td>{report.skipped_count}</td>
                <td>{formatDate(report.generated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </main>
  );
}

export default ReportsPage;
