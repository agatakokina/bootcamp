import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createBug, fetchBugs } from "../api/bugs.js";
import { SEVERITIES, STATUSES } from "../constants/bugs.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import BugStatusBadge from "../components/BugStatusBadge.jsx";
import BugPriorityBadge from "../components/BugPriorityBadge.jsx";
import BugFormModal from "../components/BugFormModal.jsx";
import BugTrashModal from "../components/BugTrashModal.jsx";
import Pagination from "../components/Pagination.jsx";
import { useSettings } from "../context/SettingsContext.jsx";

const PAGE_SIZE = 20;

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BugsPage() {
  const { settings } = useSettings();
  const [bugs, setBugs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchBugs({ page, pageSize: PAGE_SIZE, status: statusFilter, severity: severityFilter, search, sortBy, sortDir })
      .then((data) => {
        setBugs(data.items);
        setTotal(data.total);
      })
      .catch((err) => {
        setError(err.message);
        setBugs([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [page, statusFilter, severityFilter, search, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(column) {
    if (sortBy === column) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
    setPage(1);
  }

  function sortIndicator(column) {
    if (sortBy !== column) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  async function handleCreate(payload) {
    await createBug(payload);
    setShowCreate(false);
    setPage(1);
    load();
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Bugs</h1>
        <div className="page-header-actions">
          <button type="button" className="secondary-button" onClick={() => setShowTrash(true)}>
            View Trash
          </button>
          <button onClick={() => setShowCreate(true)}>+ New Bug</button>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          aria-label="Search bugs by title or description"
          placeholder="Search title or description..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter bugs by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter bugs by severity"
          value={severityFilter}
          onChange={(e) => {
            setSeverityFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th className="sortable" onClick={() => toggleSort("severity")}>
              Severity{sortIndicator("severity")}
            </th>
            <th className="sortable" onClick={() => toggleSort("priority")}>
              Priority{sortIndicator("priority")}
            </th>
            <th className="sortable" onClick={() => toggleSort("status")}>
              Status{sortIndicator("status")}
            </th>
            <th className="sortable" onClick={() => toggleSort("updated_at")}>
              Updated{sortIndicator("updated_at")}
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : bugs.length === 0 ? (
            <tr>
              <td colSpan={5} className="empty-cell">
                No bugs found.
              </td>
            </tr>
          ) : (
            bugs.map((bug) => (
              <tr key={bug.id}>
                <td>
                  <Link to={`/bugs/${bug.id}`}>{bug.title}</Link>
                </td>
                <td>
                  <SeverityBadge severity={bug.severity} />
                </td>
                <td>
                  <BugPriorityBadge priority={bug.priority} />
                </td>
                <td>
                  <BugStatusBadge status={bug.status} />
                </td>
                <td>{formatDate(bug.updated_at)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {showCreate && (
        <BugFormModal
          defaultSeverity={settings?.default_severity_for_new_bugs}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}
      {showTrash && <BugTrashModal onClose={() => setShowTrash(false)} onRestored={load} />}
    </main>
  );
}

export default BugsPage;
