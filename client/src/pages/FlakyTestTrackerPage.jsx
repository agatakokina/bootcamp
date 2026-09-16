import { useEffect, useState } from "react";
import { fetchFlakyTests } from "../api/flaky-tests.js";
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

function MetricCard({ value, label, hint }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {hint && <div className="metric-hint">{hint}</div>}
    </div>
  );
}

function flakinessColor(pct) {
  if (pct >= 40) return "#b91c1c";
  if (pct >= 20) return "#c2410c";
  if (pct >= 5) return "#b45309";
  return "#166534";
}

function FlakinessBar({ score }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flakiness-cell">
      <div className="flakiness-bar-track" aria-hidden="true">
        <div className="flakiness-bar-fill" style={{ width: `${pct}%`, backgroundColor: flakinessColor(pct) }} />
      </div>
      <span>{pct}%</span>
    </div>
  );
}

function FlakyTestRow({ rank, test, expanded, onToggle }) {
  const hypothesisCount = test.root_cause_hypotheses.length;
  const detailId = `flaky-detail-${test.test_case_id}`;
  return (
    <>
      <tr className="clickable-row" onClick={onToggle}>
        <td>{rank}</td>
        <td>{test.title}</td>
        <td>
          <SeverityBadge severity={test.severity} />
        </td>
        <td>
          <TestTypeBadge testType={test.test_type} />
        </td>
        <td>
          <FlakinessBar score={test.flakiness_score} />
        </td>
        <td>{Math.round(test.fail_rate * 100)}%</td>
        <td>
          {test.pass_count}/{test.fail_count}/{test.skip_count}
        </td>
        <td>
          <ResultBadge result={test.last_result} />
        </td>
        <td>
          <button
            type="button"
            className="secondary-button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            {expanded ? "Hide" : `${hypothesisCount} hypothes${hypothesisCount === 1 ? "is" : "es"}`}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr id={detailId} className="flaky-detail-row">
          <td colSpan={9}>
            {hypothesisCount === 0 ? (
              <p className="empty-state-body">No failures recorded for this test yet.</p>
            ) : (
              <ul className="hypothesis-list">
                {test.root_cause_hypotheses.map((h, i) => (
                  <li key={i}>
                    <span>{h.hypothesis}</span>
                    <span className="hypothesis-count">
                      seen in {h.occurrences} run{h.occurrences === 1 ? "" : "s"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function FlakyTestTrackerPage() {
  const [tests, setTests] = useState([]);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setLoading(true);
    fetchFlakyTests(10)
      .then((data) => {
        setTests(data.tests);
        setGeneratedAt(data.generated_at);
        setError(null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const mostFlaky = tests[0];
  const avgScorePct = tests.length
    ? Math.round((tests.reduce((sum, t) => sum + t.flakiness_score, 0) / tests.length) * 100)
    : 0;

  return (
    <main className="page">
      <div className="page-header">
        <h1>Flaky Test Tracker</h1>
      </div>

      <p className="page-subtitle">
        The top {tests.length || 10} tests ranked by how often their result flips between passed and failed across
        historical runs. A high score means the test alternates rather than reliably passing or reliably failing —
        a test that fails every run is broken, not flaky, and won't rank highly here.
      </p>

      {error && <p className="form-error">Failed to load flaky tests: {error}</p>}

      {!loading && !error && tests.length > 0 && (
        <div className="metric-grid">
          <MetricCard value={tests.length} label="Tests Tracked" />
          <MetricCard
            value={`${Math.round(mostFlaky.flakiness_score * 100)}%`}
            label="Highest Flakiness Score"
            hint={mostFlaky.title}
          />
          <MetricCard value={`${avgScorePct}%`} label="Avg Flakiness (Top 10)" />
        </div>
      )}

      <table className="table" aria-label="Top flaky tests ranked by flakiness score">
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Test Case</th>
            <th scope="col">Severity</th>
            <th scope="col">Type</th>
            <th scope="col">Flakiness</th>
            <th scope="col">Fail Rate</th>
            <th scope="col">Runs (P/F/S)</th>
            <th scope="col">Last Result</th>
            <th scope="col">Root Cause</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={9} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : tests.length === 0 ? (
            <tr>
              <td colSpan={9} className="empty-cell">
                No test has enough run history yet to score for flakiness. Run the same suite a few times, or seed
                sample data, then check back.
              </td>
            </tr>
          ) : (
            tests.map((t, index) => (
              <FlakyTestRow
                key={t.test_case_id}
                rank={index + 1}
                test={t}
                expanded={expandedId === t.test_case_id}
                onToggle={() => setExpandedId((id) => (id === t.test_case_id ? null : t.test_case_id))}
              />
            ))
          )}
        </tbody>
      </table>

      {generatedAt && <p className="page-footnote">Last computed {formatDate(generatedAt)}</p>}
    </main>
  );
}

export default FlakyTestTrackerPage;
