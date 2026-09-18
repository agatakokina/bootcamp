import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchDashboardMetrics, fetchDashboardTrends } from "../api/dashboard.js";
import PassRateTrendChart from "../components/charts/PassRateTrendChart.jsx";
import BugsWeeklyChart from "../components/charts/BugsWeeklyChart.jsx";
import CoverageDonutChart from "../components/charts/CoverageDonutChart.jsx";

const REFRESH_INTERVAL_MS = 30000;

function formatDuration(ms) {
  if (ms == null) return "—";
  const totalSeconds = Math.round(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

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

function MetricCard({ value, label, hint, tone }) {
  return (
    <div className="metric-card">
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
      {hint && <div className={`metric-hint${tone ? ` metric-hint-${tone}` : ""}`}>{hint}</div>}
    </div>
  );
}

function EmptyStateCard({ title, children }) {
  return (
    <div className="empty-state-card">
      <p className="empty-state-title">{title}</p>
      <p className="empty-state-body">{children}</p>
    </div>
  );
}

const RECENT_RUNS_LIMIT = 4;
const RECENT_ACTIVITY_COLLAPSED_LIMIT = 3;

function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trends, setTrends] = useState(null);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const hasLoadedOnce = useRef(false);

  const load = useCallback(() => {
    if (!hasLoadedOnce.current) setLoading(true);
    fetchDashboardMetrics()
      .then((result) => {
        setData(result);
        setError(null);
        hasLoadedOnce.current = true;
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetchDashboardTrends()
      .then((result) => setTrends(result))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  if (loading && !data) {
    return (
      <main className="page">
        <h1>Dashboard</h1>
        <div className="metric-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="metric-card skeleton" />
          ))}
        </div>
        <div className="skeleton skeleton-block" />
        <div className="skeleton skeleton-block" />
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="page">
        <h1>Dashboard</h1>
        <p className="form-error">Failed to load dashboard: {error}</p>
        <button type="button" onClick={load}>
          Retry
        </button>
      </main>
    );
  }

  if (!data) return null;

  const { metrics, recent_runs, recent_activity } = data;

  return (
    <main className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {error && (
        <p className="form-warning">
          The last auto-refresh failed ({error}) — showing the last successfully loaded data.
        </p>
      )}

      <div className="metric-grid">
        <MetricCard
          value={metrics.total_test_cases}
          label="Total Test Cases"
          hint={
            metrics.total_test_cases === 0 ? <Link to="/test-cases">Create your first test case →</Link> : null
          }
        />
        <MetricCard
          value={metrics.pass_rate !== null ? `${metrics.pass_rate}%` : "—"}
          label="Pass Rate"
          hint={metrics.pass_rate === null ? "No test runs recorded yet" : null}
        />
        <MetricCard
          value={metrics.open_bugs}
          label="Open Bugs"
          hint={metrics.open_bugs === 0 ? "✓ No open bugs" : null}
          tone={metrics.open_bugs === 0 ? "positive" : null}
        />
        <MetricCard
          value={formatDuration(metrics.avg_run_duration_ms)}
          label="Avg Run Duration"
          hint={metrics.avg_run_duration_ms === null ? "No completed runs yet" : null}
        />
      </div>

      {trends && (
        <div className="charts-grid">
          <PassRateTrendChart data={trends.pass_rate_trend} />
          <BugsWeeklyChart data={trends.bugs_weekly} />
          <CoverageDonutChart data={trends.coverage_by_status} />
        </div>
      )}

      <section className="details-section">
        <div className="details-section-header">
          <h3>Recent Test Runs</h3>
          <Link to="/test-runs" className="section-link">
            View All Runs →
          </Link>
        </div>
        {recent_runs.length === 0 ? (
          <EmptyStateCard title="No test runs yet">
            Click "New Run" on a <Link to="/test-suites">suite page</Link> to execute your first test.
          </EmptyStateCard>
        ) : (
          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Suite</th>
                <th>Pass</th>
                <th>Fail</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {recent_runs.slice(0, RECENT_RUNS_LIMIT).map((run) => (
                <tr key={run.id}>
                  <td>
                    <Link to={`/test-runs/${run.id}`}>{run.suite_name || "(deleted suite)"}</Link>
                  </td>
                  <td>{run.pass_count}</td>
                  <td>{run.fail_count}</td>
                  <td>{formatDate(run.start_time)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <section className="details-section">
        <h3>Recent Activity</h3>
        {recent_activity.length === 0 ? (
          <EmptyStateCard title="No activity recorded">
            Create or update a <Link to="/bugs">bug</Link> to see events here.
          </EmptyStateCard>
        ) : (
          <>
            <ul className="activity-timeline">
              {(showAllActivity ? recent_activity : recent_activity.slice(0, RECENT_ACTIVITY_COLLAPSED_LIMIT)).map(
                (item) => (
                  <li key={item.id} className="activity-entry">
                    <div className="activity-meta">
                      <Link to={`/bugs/${item.bug_id}`}>{item.summary}</Link>
                      <span className="activity-time">{formatDate(item.created_at)}</span>
                    </div>
                    {item.message && <p className="activity-message">{item.message}</p>}
                  </li>
                )
              )}
            </ul>
            {recent_activity.length > RECENT_ACTIVITY_COLLAPSED_LIMIT && (
              <button type="button" className="link-button" onClick={() => setShowAllActivity((v) => !v)}>
                {showAllActivity ? "Show Less" : `Show More (${recent_activity.length - RECENT_ACTIVITY_COLLAPSED_LIMIT})`}
              </button>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default DashboardPage;
