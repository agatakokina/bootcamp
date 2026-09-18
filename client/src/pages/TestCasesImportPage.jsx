import { useState } from "react";
import { Link } from "react-router-dom";
import { commitImport, previewImport } from "../api/test-cases.js";

const SEVERITIES = ["critical", "major", "minor", "trivial"];
const STATUSES = ["draft", "ready", "passed", "failed", "skipped"];
const TEST_TYPES = ["smoke", "regression", "smoke-regression"];

function TestCasesImportPage() {
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState(null);
  const [commitResult, setCommitResult] = useState(null);

  function resetAll() {
    setPreviewError(null);
    setPreview(null);
    setCommitError(null);
    setCommitResult(null);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    resetAll();
    setPreviewing(true);
    try {
      const data = await previewImport(file);
      setPreview(data);
    } catch (err) {
      setPreviewError(err.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleCommit() {
    const rows = preview.rows
      .filter((row) => row.fields)
      .map((row) => ({ ...row.fields, steps: JSON.parse(row.fields.steps) }));

    setCommitError(null);
    setCommitting(true);
    try {
      const result = await commitImport(rows);
      setCommitResult(result);
      setPreview(null);
    } catch (err) {
      setCommitError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  return (
    <main className="page">
      <p>
        <Link to="/test-cases">← Back to Test Cases</Link>
      </p>

      <div className="page-header">
        <h1>Import Test Cases</h1>
      </div>

      {commitResult ? (
        <>
          <p className="form-success">
            Imported {commitResult.imported_count} test case{commitResult.imported_count === 1 ? "" : "s"}.
            {commitResult.skipped_count > 0
              ? ` ${commitResult.skipped_count} row${commitResult.skipped_count === 1 ? "" : "s"} skipped.`
              : ""}
          </p>

          {commitResult.skipped_count > 0 && (
            <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {commitResult.skipped.map((s) => (
                  <tr key={s.index}>
                    <td>{s.index + 1}</td>
                    <td>{s.errors.join(" ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          <p>
            <Link to="/test-cases">Go to Test Cases →</Link>
            {" · "}
            <button type="button" className="link-button" onClick={resetAll}>
              Import another file
            </button>
          </p>
        </>
      ) : preview ? (
        <>
          <p>
            {preview.total_rows} row{preview.total_rows === 1 ? "" : "s"} found — {preview.valid_count} valid,{" "}
            {preview.invalid_count} with errors.
          </p>

          {commitError && <p className="form-error">{commitError}</p>}

          <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Row</th>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Test Type</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => (
                <tr key={row.row_number}>
                  <td>{row.row_number}</td>
                  <td>{row.raw.title || "—"}</td>
                  <td>{row.raw.severity || "—"}</td>
                  <td>{row.raw.status || "draft"}</td>
                  <td>{row.raw.test_type || "—"}</td>
                  <td>
                    {row.errors.length === 0 ? (
                      <span className="badge badge-tone-green">Valid</span>
                    ) : (
                      <span className="form-error">{row.errors.join(" ")}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          <div className="modal-actions" style={{ marginTop: "1rem" }}>
            <button type="button" className="secondary-button" onClick={resetAll} disabled={committing}>
              Choose a Different File
            </button>
            <button type="button" onClick={handleCommit} disabled={committing || preview.valid_count === 0}>
              {committing ? "Importing..." : `Import ${preview.valid_count} Valid Row${preview.valid_count === 1 ? "" : "s"}`}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="import-instructions">
            <p>Upload a CSV file to bulk-create test cases.</p>
            <ul>
              <li>
                Required columns: <code>title</code>, <code>severity</code>, <code>steps</code>
              </li>
              <li>
                Optional columns: <code>preconditions</code>, <code>expected_result</code>, <code>status</code>,{" "}
                <code>test_type</code>
              </li>
              <li>Severity must be one of: {SEVERITIES.join(", ")}</li>
              <li>Status must be one of: {STATUSES.join(", ")} (defaults to draft if left blank)</li>
              <li>Test type must be one of: {TEST_TYPES.join(", ")}</li>
              <li>
                Steps: put one step per line within the cell, or separate steps with <code>|</code>
              </li>
              <li>Up to 1,000 rows per file.</li>
            </ul>
          </div>

          {previewError && <p className="form-error">{previewError}</p>}

          <input
            type="file"
            aria-label="Choose a CSV file to import"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={previewing}
          />
          {previewing && <p>Reading file...</p>}
        </>
      )}
    </main>
  );
}

export default TestCasesImportPage;
