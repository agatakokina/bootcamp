import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createTestCase, deleteTestCase, exportTestCases, fetchTestCases, updateTestCase } from "../api/test-cases.js";
import SeverityBadge from "../components/SeverityBadge.jsx";
import TestTypeBadge from "../components/TestTypeBadge.jsx";
import Pagination from "../components/Pagination.jsx";
import RowMenu from "../components/RowMenu.jsx";
import TestCaseFormModal from "../components/TestCaseFormModal.jsx";
import TestCaseDetailsModal from "../components/TestCaseDetailsModal.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import TrashModal from "../components/TrashModal.jsx";

const STATUSES = ["draft", "ready", "passed", "failed", "skipped"];
const PAGE_SIZE = 20;

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function formatDate(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TestCasesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("updated_at");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [activeTestCase, setActiveTestCase] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchTestCases({ page, pageSize: PAGE_SIZE, search, status: statusFilter, sortBy, sortDir })
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (location.state?.openTestCase) {
      setActiveTestCase(location.state.openTestCase);
      setModalMode("details");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

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
    await createTestCase(payload);
    setModalMode(null);
    setPage(1);
    load();
  }

  async function handleUpdate(payload) {
    await updateTestCase(activeTestCase.id, payload);
    setModalMode(null);
    setActiveTestCase(null);
    load();
  }

  async function handleConfirmDelete() {
    await deleteTestCase(activeTestCase.id);
    setModalMode(null);
    setActiveTestCase(null);
    load();
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      const { blob, filename } = await exportTestCases({ search, status: statusFilter, sortBy, sortDir });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  }

  function openDetails(tc) {
    setActiveTestCase(tc);
    setModalMode("details");
  }

  function openEdit(tc) {
    setActiveTestCase(tc);
    setModalMode("edit");
  }

  function openDelete(tc) {
    setActiveTestCase(tc);
    setModalMode("delete");
  }

  function closeModal() {
    setModalMode(null);
    setActiveTestCase(null);
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Test Cases</h1>
        <div className="page-header-actions">
          <button type="button" className="secondary-button" onClick={() => setShowTrash(true)}>
            View Trash
          </button>
          <Link to="/test-cases/import" className="secondary-button-link">
            Import CSV
          </Link>
          <button type="button" className="secondary-button" onClick={handleExport} disabled={exporting}>
            {exporting ? "Exporting..." : "Download CSV"}
          </button>
          <button
            onClick={() => {
              setActiveTestCase(null);
              setModalMode("create");
            }}
          >
            + New Test Case
          </button>
        </div>
      </div>

      <div className="toolbar">
        <input
          type="search"
          aria-label="Search test cases by title"
          placeholder="Search by title..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          aria-label="Filter test cases by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {capitalize(s)}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="table-scroll">
      <table className="table">
        <thead>
          <tr>
            <th>Title</th>
            <th className="sortable" onClick={() => toggleSort("severity")}>
              Severity{sortIndicator("severity")}
            </th>
            <th>Status</th>
            <th>Test Type</th>
            <th className="sortable" onClick={() => toggleSort("updated_at")}>
              Updated{sortIndicator("updated_at")}
            </th>
            <th aria-label="Actions"></th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                Loading...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={6} className="empty-cell">
                No test cases found.
              </td>
            </tr>
          ) : (
            items.map((tc) => (
              <tr key={tc.id}>
                <td>
                  <button type="button" className="row-title-button" onClick={() => openDetails(tc)}>
                    {tc.title}
                  </button>
                </td>
                <td>
                  <SeverityBadge severity={tc.severity} />
                </td>
                <td>{capitalize(tc.status)}</td>
                <td>
                  <TestTypeBadge testType={tc.test_type} />
                </td>
                <td>{formatDate(tc.updated_at)}</td>
                <td>
                  <RowMenu onEdit={() => openEdit(tc)} onDelete={() => openDelete(tc)} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </div>

      <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />

      {modalMode === "create" && <TestCaseFormModal onClose={closeModal} onSubmit={handleCreate} />}

      {modalMode === "edit" && activeTestCase && (
        <TestCaseFormModal testCase={activeTestCase} onClose={closeModal} onSubmit={handleUpdate} />
      )}

      {modalMode === "details" && activeTestCase && (
        <TestCaseDetailsModal testCase={activeTestCase} onClose={closeModal} />
      )}

      {modalMode === "delete" && activeTestCase && (
        <DeleteConfirmModal
          title="Delete Test Case"
          label={activeTestCase.title}
          irreversible={false}
          warning={
            activeTestCase.suites?.length
              ? `This test case is used in ${activeTestCase.suites.length} test suite${
                  activeTestCase.suites.length === 1 ? "" : "s"
                }: ${activeTestCase.suites.map((s) => s.name).join(", ")}. Deleting it will hide it from ${
                  activeTestCase.suites.length === 1 ? "that suite" : "those suites"
                } too, until it's restored from Trash.`
              : "This is a soft delete — you can restore it from Trash if needed."
          }
          onClose={closeModal}
          onConfirm={handleConfirmDelete}
        />
      )}

      {showTrash && (
        <TrashModal
          onClose={() => setShowTrash(false)}
          onRestored={load}
        />
      )}
    </main>
  );
}

export default TestCasesPage;
