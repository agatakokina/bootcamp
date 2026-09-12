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
