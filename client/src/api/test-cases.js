const BASE_URL = "/api/test-cases";

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "Request failed.");
  return body.data;
}

export function fetchTestCases({ page, pageSize, search, status, sortBy, sortDir, deleted }) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    sortBy,
    sortDir,
  });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (deleted) params.set("deleted", "true");
  return request(`${BASE_URL}?${params.toString()}`);
}

export function fetchDeletedTestCases() {
  return fetchTestCases({ page: 1, pageSize: 100, sortBy: "updated_at", sortDir: "desc", deleted: true });
}

export function restoreTestCase(id) {
  return request(`${BASE_URL}/${id}/restore`, { method: "POST" });
}

export function createTestCase(payload) {
  return request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateTestCase(id, payload) {
  return request(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteTestCase(id) {
  return request(`${BASE_URL}/${id}`, { method: "DELETE" });
}

export function previewImport(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`${BASE_URL}/import/preview`, { method: "POST", body: formData });
}

export function commitImport(rows) {
  return request(`${BASE_URL}/import/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows }),
  });
}

export async function exportTestCases({ search, status, sortBy, sortDir }) {
  const params = new URLSearchParams({ sortBy, sortDir });
  if (search) params.set("search", search);
  if (status) params.set("status", status);

  const res = await fetch(`${BASE_URL}/export?${params.toString()}`);
  if (!res.ok) {
    let message = "Export failed.";
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {
      // response wasn't JSON; keep the default message
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob, filename: match ? match[1] : "test-cases-export.csv" };
}
