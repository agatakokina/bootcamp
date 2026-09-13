import { Router } from "express";
import db from "./db.js";

const router = Router();

function ok(res, data) {
  res.json({ success: true, data, error: null });
}

function fail(res, status, error) {
  res.status(status).json({ success: false, data: null, error });
}

function serializeReport(row, withResults) {
  const base = { ...row };
  if (withResults) {
    base.results = JSON.parse(row.results);
  } else {
    delete base.results;
  }
  return base;
}

function handleListReports(req, res) {
  const rows = db
    .prepare(`
      SELECT id, run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, generated_at
      FROM reports
      ORDER BY generated_at DESC
    `)
    .all();

  ok(res, rows);
}

function handleGetReport(req, res) {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!row) return fail(res, 404, "Report not found.");
  ok(res, serializeReport(row, true));
}

function handleCreateReport(req, res) {
  const runId = Number(req.body.run_id);
  if (!Number.isInteger(runId)) return fail(res, 400, "run_id must be an integer.");

  const run = db
    .prepare(`
      SELECT tr.*, ts.name AS suite_name
      FROM test_runs_v2 tr
      LEFT JOIN test_suites ts ON ts.id = tr.suite_id
      WHERE tr.id = ?
    `)
    .get(runId);

  if (!run) return fail(res, 404, "Test run not found.");

  const results = db
    .prepare(`
      SELECT r.test_case_id, r.result, r.duration_ms, r.notes, tc.title, tc.severity, tc.test_type
      FROM test_run_results r
      JOIN test_cases tc ON tc.id = r.test_case_id
      WHERE r.run_id = ?
      ORDER BY r.sort_order ASC
    `)
    .all(runId);

  const counts = { passed: 0, failed: 0, skipped: 0 };
  results.forEach((r) => {
    if (counts[r.result] !== undefined) counts[r.result] += 1;
  });

  const insertResult = db
    .prepare(`
      INSERT INTO reports
        (run_id, suite_name, run_date, total_count, passed_count, failed_count, skipped_count, results)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      run.id,
      run.suite_name || "(deleted suite)",
      run.start_time,
      results.length,
      counts.passed,
      counts.failed,
      counts.skipped,
      JSON.stringify(results)
    );

  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(insertResult.lastInsertRowid);
  ok(res, serializeReport(row, true));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
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

const RESULT_COLORS = {
  passed: { bg: "#dcfce7", fg: "#166534" },
  failed: { bg: "#fee2e2", fg: "#b91c1c" },
  skipped: { bg: "#fef3c7", fg: "#b45309" },
  pending: { bg: "#e5e7eb", fg: "#4b5563" },
};

const SEVERITY_COLORS = {
  critical: { bg: "#fee2e2", fg: "#b91c1c" },
  major: { bg: "#ffedd5", fg: "#c2410c" },
  minor: { bg: "#dbeafe", fg: "#1d4ed8" },
  trivial: { bg: "#e5e7eb", fg: "#4b5563" },
};

function badgeHtml(text, colors) {
  const c = colors[text] || { bg: "#e5e7eb", fg: "#374151" };
  return `<span class="badge" style="background:${c.bg};color:${c.fg};">${escapeHtml(text)}</span>`;
}

function overallStatus(report) {
  if (report.failed_count > 0) return { label: "FAILED", bg: "#fee2e2", fg: "#b91c1c" };
  if (report.total_count > 0 && report.passed_count === report.total_count) {
    return { label: "ALL PASSED", bg: "#dcfce7", fg: "#166534" };
  }
  return { label: "PARTIAL", bg: "#fef3c7", fg: "#b45309" };
}

function buildReportHtml(report) {
  const results = JSON.parse(report.results);
  const passRate = report.total_count > 0 ? Math.round((report.passed_count / report.total_count) * 1000) / 10 : 0;
  const status = overallStatus(report);

  const rows = results
    .map(
      (r) => `
        <tr>
          <td>${escapeHtml(r.title)}</td>
          <td>${badgeHtml(r.severity, SEVERITY_COLORS)}</td>
          <td>${escapeHtml(r.test_type)}</td>
          <td>${badgeHtml(r.result, RESULT_COLORS)}</td>
          <td>${r.duration_ms != null ? `${r.duration_ms} ms` : "—"}</td>
          <td>${escapeHtml(r.notes || "—")}</td>
        </tr>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Test Report — ${escapeHtml(report.suite_name)}</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
    color: #1f2937;
    background: #f3f4f6;
    margin: 0;
    padding: 2.5rem 1.5rem;
    line-height: 1.5;
  }
  .container {
    max-width: 960px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  }

  /* Header */
  .report-header {
    padding: 2rem 2.5rem 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.75rem;
  }
  .project-title {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .status-badge {
    display: inline-block;
    padding: 0.3rem 0.85rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.03em;
  }
  h1 { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 700; color: #111827; }
  .meta { color: #6b7280; font-size: 0.88rem; }

  /* Summary cards */
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.9rem;
    padding: 1.75rem 2.5rem;
  }
  .summary-card {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 0.75rem 0.85rem;
    text-align: center;
    overflow: hidden;
  }
  .summary-card::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 4px;
    background: var(--accent, #9ca3af);
  }
  .summary-value { font-size: 1.7rem; font-weight: 800; color: #111827; }
  .summary-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #6b7280;
    margin-top: 0.3rem;
  }

  /* Results table */
  .results-section { padding: 0 2.5rem 2rem; }
  .section-title {
    font-size: 0.95rem;
    font-weight: 700;
    color: #111827;
    margin: 0 0 0.75rem;
  }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  th, td { text-align: left; padding: 0.65rem 0.75rem; border-bottom: 1px solid #f0f1f3; vertical-align: top; }
  thead th {
    background: #f9fafb;
    font-weight: 600;
    font-size: 0.72rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: #6b7280;
    border-bottom: 1px solid #e5e7eb;
  }
  tbody tr:last-child td { border-bottom: none; }
  .badge {
    display: inline-block;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
    white-space: nowrap;
  }

  /* Footer */
  .report-footer {
    padding: 1rem 2.5rem;
    border-top: 1px solid #e5e7eb;
    background: #f9fafb;
    color: #9ca3af;
    font-size: 0.75rem;
    display: flex;
    justify-content: space-between;
  }

  @page {
    size: auto;
    margin: 0.6in;
  }

  @media print {
    body { background: white; padding: 0; }
    .container { box-shadow: none; border-radius: 0; max-width: 100%; }
    .summary-card,
    .status-badge,
    .badge,
    thead th,
    .report-footer {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; page-break-after: auto; }
    thead { display: table-header-group; }
  }
</style>
</head>
<body>
  <div class="container">
    <div class="report-header">
      <div class="eyebrow">
        <span class="project-title">Bootcamp App &middot; QA Report</span>
        <span class="status-badge" style="background:${status.bg};color:${status.fg};">${status.label}</span>
      </div>
      <h1>${escapeHtml(report.suite_name)}</h1>
      <p class="meta">Run date: ${formatDate(report.run_date)} &nbsp;·&nbsp; Generated: ${formatDate(report.generated_at)}</p>
    </div>

    <div class="summary-grid">
      <div class="summary-card" style="--accent:#9ca3af;">
        <div class="summary-value">${report.total_count}</div>
        <div class="summary-label">Total</div>
      </div>
      <div class="summary-card" style="--accent:#22c55e;">
        <div class="summary-value" style="color:#166534;">${report.passed_count}</div>
        <div class="summary-label">Passed</div>
      </div>
      <div class="summary-card" style="--accent:#ef4444;">
        <div class="summary-value" style="color:#b91c1c;">${report.failed_count}</div>
        <div class="summary-label">Failed</div>
      </div>
      <div class="summary-card" style="--accent:#f59e0b;">
        <div class="summary-value" style="color:#b45309;">${report.skipped_count}</div>
        <div class="summary-label">Skipped</div>
      </div>
      <div class="summary-card" style="--accent:#6366f1;">
        <div class="summary-value" style="color:#4338ca;">${passRate}%</div>
        <div class="summary-label">Pass Rate</div>
      </div>
    </div>

    <div class="results-section">
      <p class="section-title">Test Case Results</p>
      <table>
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
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      <span>Generated at ${escapeHtml(report.generated_at)}</span>
      <span>Report #${report.id}</span>
    </div>
  </div>
</body>
</html>`;
}

function handleExportReportHtml(req, res) {
  const row = db.prepare("SELECT * FROM reports WHERE id = ?").get(req.params.id);
  if (!row) return fail(res, 404, "Report not found.");

  const html = buildReportHtml(row);
  const disposition = req.query.inline === "1" ? "inline" : "attachment";

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Content-Disposition", `${disposition}; filename="report-${row.id}.html"`);
  res.send(html);
}

router.get("/", handleListReports);
router.get("/:id", handleGetReport);
router.post("/", handleCreateReport);
router.get("/:id/export/html", handleExportReportHtml);

router.use((req, res) => fail(res, 404, "Not found."));

router.use((err, req, res, next) => {
  console.error(err);
  fail(res, 500, "Unexpected server error.");
});

export default router;
