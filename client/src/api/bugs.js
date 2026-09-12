const BASE_URL = "/api/bugs";

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "Request failed.");
  return body.data;
}

export function fetchBugs({ page, pageSize, status, severity, priority, search, sortBy, sortDir, deleted } = {}) {
  const params = new URLSearchParams({
    page: String(page || 1),
    pageSize: String(pageSize || 20),
  });
  if (status) params.set("status", status);
  if (severity) params.set("severity", severity);
  if (priority) params.set("priority", priority);
  if (search) params.set("search", search);
  if (sortBy) params.set("sortBy", sortBy);
  if (sortDir) params.set("sortDir", sortDir);
  if (deleted) params.set("deleted", "true");
  return request(`${BASE_URL}?${params.toString()}`);
}

export function fetchDeletedBugs() {
  return fetchBugs({ page: 1, pageSize: 100, sortBy: "updated_at", sortDir: "desc", deleted: true });
}

export function restoreBug(id) {
  return request(`${BASE_URL}/${id}/restore`, { method: "POST" });
}

export function fetchBug(id) {
  return request(`${BASE_URL}/${id}`);
}

export function createBug(payload) {
  return request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateBug(id, payload) {
  return request(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteBug(id) {
  return request(`${BASE_URL}/${id}`, { method: "DELETE" });
}

export function changeBugStatus(id, status, message) {
  return request(`${BASE_URL}/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, message }),
  });
}

export function addBugComment(id, message) {
  return request(`${BASE_URL}/${id}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
}
