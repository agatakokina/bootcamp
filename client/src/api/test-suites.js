const BASE_URL = "/api/test-suites";

async function request(url, options) {
  const res = await fetch(url, options);
  const body = await res.json();
  if (!body.success) throw new Error(body.error || "Request failed.");
  return body.data;
}

export function fetchSuites({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  const query = params.toString();
  return request(`${BASE_URL}${query ? `?${query}` : ""}`);
}

export function fetchSuite(id) {
  return request(`${BASE_URL}/${id}`);
}

export function createSuite(payload) {
  return request(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function updateSuite(id, payload) {
  return request(`${BASE_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export function deleteSuite(id) {
  return request(`${BASE_URL}/${id}`, { method: "DELETE" });
}

export function addCaseToSuite(suiteId, testCaseId) {
  return request(`${BASE_URL}/${suiteId}/cases`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ test_case_id: testCaseId }),
  });
}

export function removeCaseFromSuite(suiteId, testCaseId) {
  return request(`${BASE_URL}/${suiteId}/cases/${testCaseId}`, { method: "DELETE" });
}

export function reorderSuiteCases(suiteId, order) {
  return request(`${BASE_URL}/${suiteId}/reorder`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ order }),
  });
}
