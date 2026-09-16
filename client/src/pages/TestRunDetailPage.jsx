import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { fetchRun, updateRunResult } from "../api/test-runs.js";
import { createReport } from "../api/reports.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import TestTypeBadge from "../components/TestTypeBadge.jsx";
import RunStatusBadge from "../components/RunStatusBadge.jsx";
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

function TestRunDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [savingCaseId, setSavingCaseId] = useState(null);
  const [generatingReport, setGeneratingReport] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchRun(id)
      .then((data) => {
        setRun(data);
        const drafts = {};
        data.results.forEach((r) => {
          drafts[r.test_case_id] = r.notes || "";
        });
        setNotesDraft(drafts);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSetResult(testCaseId, result) {
    setSavingCaseId(testCaseId);
    setError(null);
    try {
      const updated = await updateRunResult(id, testCaseId, {
        result,
        notes: notesDraft[testCaseId] ?? "",
      });
      setRun(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingCaseId(null);
    }
  }

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setError(null);
    try {
      const report = await createReport(id);
      navigate(`/reports/${report.id}`);
    } catch (err) {
      setError(err.message);
      setGeneratingReport(false);
    }
  }

  if (loading) return <main className="page">Loading...</main>;
  if (error && !run) {
    return (
      <main className="page">
        <p className="form-error">{error}</p>
        <p>
          <Link to="/test-runs">← Back to Test Runs</Link>
        </p>
      </main>
    );
  }
  if (!run) return null;

  return (
    <main className="page">
      <p>
        <Link to="/test-runs">← Back to Test Runs</Link>
      </p>

      <div className="page-header">
        <h1>{run.suite_name || "(deleted suite)"}</h1>
        <div className="page-header-actions">
          <RunStatusBadge status={run.status} />
          <button type="button" onClick={handleGenerateReport} disabled={generatingReport}>
            {generatingReport ? "Generating..." : "Generate Report"}
          </button>
        </div>
      </div>

      <p className="suite-meta">
        {run.pass_count} passed &nbsp;·&nbsp; {run.fail_count} failed &nbsp;·&nbsp; {run.skip_count} skipped
        &nbsp;·&nbsp; Started {formatDate(run.start_time)}
        {run.end_time && <> &nbsp;·&nbsp; Ended {formatDate(run.end_time)}</>}
        {run.created_by && <> &nbsp;·&nbsp; by {run.created_by}</>}
      </p>

      {error && <p className="form-error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Severity</th>
            <th>Test Type</th>
            <th>Result</th>
            <th>Notes</th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {run.results.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>
                <SeverityBadge severity={r.severity} />
              </td>
              <td>
                <TestTypeBadge testType={r.test_type} />
              </td>
              <td>
                <ResultBadge result={r.result} />
                {r.discord_alert_sent_at && <div className="activity-time">🔔 Alert sent</div>}
              </td>
              <td>
                <input
                  type="text"
                  aria-label={`Notes for ${r.title}`}
                  value={notesDraft[r.test_case_id] ?? ""}
                  onChange={(e) => setNotesDraft((prev) => ({ ...prev, [r.test_case_id]: e.target.value }))}
                  placeholder="Notes..."
                />
              </td>
              <td>
                <div className="result-actions">
                  <button
                    type="button"
                    className="result-button pass"
                    disabled={savingCaseId === r.test_case_id}
                    onClick={() => handleSetResult(r.test_case_id, "passed")}
                  >
                    Pass
                  </button>
                  <button
                    type="button"
                    className="result-button fail"
                    disabled={savingCaseId === r.test_case_id}
                    onClick={() => handleSetResult(r.test_case_id, "failed")}
                  >
                    Fail
                  </button>
                  <button
                    type="button"
                    className="result-button skip"
                    disabled={savingCaseId === r.test_case_id}
                    onClick={() => handleSetResult(r.test_case_id, "skipped")}
                  >
                    Skip
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export default TestRunDetailPage;
