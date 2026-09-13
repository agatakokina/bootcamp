import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchReport, reportExportUrl } from "../api/reports.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import TestTypeBadge from "../components/TestTypeBadge.jsx";
import ResultBadge from "../components/ResultBadge.jsx";

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

function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchReport(id)
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function handlePrint() {
    const printWindow = window.open(`${reportExportUrl(id)}?inline=1`, "_blank");
    if (printWindow) {
      printWindow.onload = () => printWindow.print();
    }
  }

  if (loading) return <main className="page">Loading...</main>;
  if (error && !report) {
    return (
      <main className="page">
        <p className="form-error">{error}</p>
        <p>
          <Link to="/reports">← Back to Reports</Link>
        </p>
      </main>
    );
  }
  if (!report) return null;

  const passRate = report.total_count > 0 ? Math.round((report.passed_count / report.total_count) * 1000) / 10 : 0;

  return (
    <main className="page">
      <p>
        <Link to="/reports">← Back to Reports</Link>
      </p>

      <div className="page-header">
        <h1>{report.suite_name}</h1>
        <div className="page-header-actions">
          <a className="secondary-button-link" href={reportExportUrl(report.id)}>
            Download HTML
          </a>
          <button type="button" onClick={handlePrint}>
            Print / Save as PDF
          </button>
        </div>
      </div>

      <p className="suite-meta">
        Run date: {formatDate(report.run_date)} &nbsp;·&nbsp; Generated: {formatDate(report.generated_at)}
      </p>

      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-value">{report.total_count}</div>
          <div className="metric-label">Total</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.passed_count}</div>
          <div className="metric-label">Passed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.failed_count}</div>
          <div className="metric-label">Failed</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{report.skipped_count}</div>
          <div className="metric-label">Skipped</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{passRate}%</div>
          <div className="metric-label">Pass Rate</div>
        </div>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Test Type</th>
            <th>Result</th>
            <th>Duration</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {report.results.map((r) => (
            <tr key={r.test_case_id}>
              <td>{r.title}</td>
              <td>
                <SeverityBadge severity={r.severity} />
              </td>
              <td>
                <TestTypeBadge testType={r.test_type} />
              </td>
              <td>
                <ResultBadge result={r.result} />
              </td>
              <td>{r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</td>
              <td>{r.notes || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default ReportDetailPage;
