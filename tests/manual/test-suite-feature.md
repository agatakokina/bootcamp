# Test Suite Feature — Manual Test Cases

Covers `/test-suites` (list), `/test-suites/:id` (detail), and the underlying
`/api/test-suites` endpoints, based on the implementation in:
- `server/db.js`
- `server/test-suites.js`
- `server/test-cases.js`
- `client/src/pages/TestSuitesPage.jsx`
- `client/src/components/SuiteFormModal.jsx`
- `client/src/pages/TestSuiteDetailPage.jsx`
- `client/src/components/DeleteConfirmModal.jsx`

Grouped into four areas: (1) Suite Creation, (2) Suite List/Detail View,
(3) Drag-and-Drop Reordering, (4) Case Add/Remove Management.

Fields, severity levels, status values, and voice follow `CLAUDE.md`.

---

## 1. Suite Creation

### TC-SC-01 — Create a suite with valid name and feature, default status
**Preconditions:** User is on `/test-suites`.
**Steps:**
1. Click "+ New Suite".
2. Enter "Checkout Regression Suite" in Name.
3. Enter "checkout" in Feature.
4. Leave Status at its default value.
5. Click Save.
**Expected Result:** The suite is created with status "draft", the modal closes, and the new suite appears in the list with feature "checkout" and 0 cases.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-SC-02 — Create a suite with valid name, feature, and explicit status
**Preconditions:** User is on `/test-suites`.
**Steps:**
1. Click "+ New Suite".
2. Enter "Payments Smoke Suite" in Name.
3. Enter "payments" in Feature.
4. Select "ready" from the Status dropdown.
5. Click Save.
**Expected Result:** The suite is created with status "ready" and appears in the list with that status.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-03 — Name at minimum valid length (1 character)
**Preconditions:** User is on `/test-suites`.
**Steps:**
1. Click "+ New Suite".
2. Enter "A" in Name.
3. Enter "misc" in Feature.
4. Click Save.
**Expected Result:** The suite is created successfully with name "A".
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-SC-04 — Empty name is rejected
**Preconditions:** User is on `/test-suites`, or calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with `name` set to `""` and a valid `feature`.
**Expected Result:** The request fails with a 400 response, `success: false`, and an error stating name must be a non-empty string. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-05 — Whitespace-only name is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with `name` set to `"   "` and a valid `feature`.
**Expected Result:** The request fails with a 400 response and an error stating name must be a non-empty string. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-06 — Empty feature is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with a valid `name` and `feature` set to `""`.
**Expected Result:** The request fails with a 400 response and an error stating feature must be a non-empty string. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-07 — Whitespace-only feature is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with a valid `name` and `feature` set to `"   "`.
**Expected Result:** The request fails with a 400 response and an error stating feature must be a non-empty string. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-08 — Leading/trailing whitespace in name and feature is trimmed
**Preconditions:** User is on `/test-suites`.
**Steps:**
1. Click "+ New Suite".
2. Enter "  Login Suite  " in Name.
3. Enter "  login  " in Feature.
4. Click Save.
**Expected Result:** The suite is created with name "Login Suite" and feature "login", with no leading or trailing spaces stored.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-SC-09 — Extremely long name is accepted (no enforced maximum length)
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with `name` set to a 5,000-character string and a valid `feature`.
**Expected Result:** The suite is created successfully; the full string is stored without truncation or error, since the schema imposes no length limit.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-SC-10 — Name field missing entirely
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with no `name` key at all, and a valid `feature`.
**Expected Result:** The request fails with a 400 response and an error stating name is required. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-11 — Feature field missing entirely
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with a valid `name` and no `feature` key at all.
**Expected Result:** The request fails with a 400 response and an error stating feature is required. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-12 — Status omitted on create defaults to "draft"
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with valid `name` and `feature` and no `status` key.
**Expected Result:** The suite is created with `status` set to "draft".
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-SC-13 — Invalid status enum value is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with valid `name` and `feature` and `status` set to `"archived"`.
**Expected Result:** The request fails with a 400 response and an error listing the allowed status values (draft, ready, in-progress, passed, failed). No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-14 — Status sent as the wrong type is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with valid `name` and `feature` and `status` set to the number `1`.
**Expected Result:** The request fails with a 400 response and an error listing the allowed status values. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-15 — Name sent as the wrong type is rejected
**Preconditions:** Calling `POST /api/test-suites` directly.
**Steps:**
1. Submit a create request with `name` set to the number `123` and a valid `feature`.
**Expected Result:** The request fails with a 400 response and an error stating name must be a non-empty string. No suite is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-SC-16 — Duplicate suite name is allowed
**Preconditions:** A suite named "Login Regression Suite" already exists.
**Steps:**
1. Create a new suite with `name` "Login Regression Suite" and a different `feature`.
**Expected Result:** The second suite is created successfully; there is no uniqueness constraint on `name`, so both suites coexist.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-SC-17 — Client-side validation blocks submission of an empty form
**Preconditions:** User is on `/test-suites` with the "+ New Suite" modal open.
**Steps:**
1. Leave Name and Feature blank.
2. Click Save.
**Expected Result:** The form does not submit; an inline error reads "Name and feature are required." No request is sent to the API.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

---

## 2. Suite List / Detail View

### TC-LV-01 — List page displays all suites with correct columns
**Preconditions:** At least one suite exists.
**Steps:**
1. Navigate to `/test-suites`.
**Expected Result:** A table shows each suite's Name (linked), Feature, Status badge, Cases count, and Updated date/time.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-LV-02 — Detail page shows suite metadata and ordered case list
**Preconditions:** A suite exists with at least two test cases attached.
**Steps:**
1. Navigate to `/test-suites`.
2. Click the suite's name.
**Expected Result:** The detail page shows the suite name, feature, status badge, case count, and a table of its test cases ordered by `sort_order`.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-LV-03 — Filtering the list by status shows only matching suites
**Preconditions:** Suites exist with at least two different statuses.
**Steps:**
1. Navigate to `/test-suites`.
2. Select "ready" from the status filter dropdown.
**Expected Result:** Only suites with status "ready" are listed.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-LV-04 — Empty suite list shows the empty state
**Preconditions:** No suites exist in the system (or the active filter matches none).
**Steps:**
1. Navigate to `/test-suites`.
**Expected Result:** The table shows a single row reading "No test suites found."
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-05 — "All statuses" filter shows every suite regardless of status
**Preconditions:** Suites exist with multiple different statuses.
**Steps:**
1. Navigate to `/test-suites`.
2. Select an explicit status filter, then switch back to "All statuses".
**Expected Result:** All suites are shown again, regardless of status.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-06 — Suite with zero cases shows the empty case-list state
**Preconditions:** A suite exists with no test cases attached.
**Steps:**
1. Navigate to that suite's detail page.
**Expected Result:** The case count reads 0, and the case table shows "No test cases in this suite yet."
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-07 — Filtering by each valid status value returns correct results
**Preconditions:** At least one suite exists with status "in-progress".
**Steps:**
1. Navigate to `/test-suites`.
2. Select "in-progress" from the status filter.
**Expected Result:** Only suites with status "in-progress" are shown; the API request `GET /api/test-suites?status=in-progress` succeeds.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-08 — Soft-deleted test cases are excluded from a suite's case list and count
**Preconditions:** A suite contains a test case that is subsequently soft-deleted (`deleted_at` set) via the test cases feature.
**Steps:**
1. Soft-delete a test case that belongs to a suite.
2. Navigate to that suite's detail page.
**Expected Result:** The deleted case no longer appears in the case table, and the case count excludes it, while the underlying `suite_test_cases` link row is untouched.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-LV-09 — Invalid status filter value is rejected by the API
**Preconditions:** None.
**Steps:**
1. Call `GET /api/test-suites?status=bogus`.
**Expected Result:** The request fails with a 400 response and an error listing the allowed status values.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-10 — Detail page handles a non-existent suite ID gracefully
**Preconditions:** No suite exists with ID `99999`.
**Steps:**
1. Navigate to `/test-suites/99999`.
**Expected Result:** The page shows an error message (based on the API's 404 "Suite not found.") instead of crashing or showing a blank page.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-LV-11 — Detail page handles a non-numeric suite ID gracefully
**Preconditions:** None.
**Steps:**
1. Navigate to `/test-suites/abc`.
**Expected Result:** The page shows an error message instead of crashing; no suite data is rendered.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-LV-12 — Inline status change on detail page persists
**Preconditions:** A suite exists with status "draft".
**Steps:**
1. Navigate to the suite's detail page.
2. Change the status dropdown to "passed".
3. Reload the page.
**Expected Result:** The status shown after reload is "passed", and `updated_at` reflects the change.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-LV-13 — Updating suite status to an invalid value is rejected
**Preconditions:** A suite exists.
**Steps:**
1. Call `PUT /api/test-suites/:id` with `status` set to `"archived"`.
**Expected Result:** The request fails with a 400 response and an error listing the allowed status values; the suite's stored status is unchanged.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

---

## 3. Drag-and-Drop Reordering

### TC-DR-01 — Dragging a case to a new position persists after reload
**Preconditions:** A suite has at least three test cases in a known order.
**Steps:**
1. Open the suite's detail page.
2. Drag the second case row and drop it onto the third row's position.
3. Reload the page.
**Expected Result:** The new order is preserved after reload, matching what was dropped; `suite.updated_at` is refreshed.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-DR-02 — Dragging the first case to the last position
**Preconditions:** A suite has at least three test cases.
**Steps:**
1. Open the suite's detail page.
2. Drag the first row and drop it onto the last row's position.
**Expected Result:** The dragged case moves to the end of the list; all other cases shift up by one position.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-03 — Dragging the last case to the first position
**Preconditions:** A suite has at least three test cases.
**Steps:**
1. Open the suite's detail page.
2. Drag the last row and drop it onto the first row's position.
**Expected Result:** The dragged case moves to the top of the list; all other cases shift down by one position.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-04 — Single-case suite: drag has no effect
**Preconditions:** A suite has exactly one test case.
**Steps:**
1. Open the suite's detail page.
2. Attempt to drag the only row and drop it on itself.
**Expected Result:** No reorder request is sent; the case remains in place with `sort_order` 0.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-05 — Two-case suite: swap order
**Preconditions:** A suite has exactly two test cases, A then B.
**Steps:**
1. Open the suite's detail page.
2. Drag case A and drop it onto case B's row.
**Expected Result:** The order becomes B then A, and this persists after reload.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-06 — Dropping a row onto its own original position is a no-op
**Preconditions:** A suite has at least two test cases.
**Steps:**
1. Open the suite's detail page.
2. Start dragging a row, then drop it back onto the same row.
**Expected Result:** No reorder request is sent (source index equals target index); the order is unchanged.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-07 — Valid reorder payload with exactly the current case IDs succeeds
**Preconditions:** A suite contains cases with IDs [1, 2, 3].
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: [3, 1, 2]`.
**Expected Result:** The request succeeds; `sort_order` values are updated to reflect the new order (3→0, 1→1, 2→2), and `updated_at` changes.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-08 — Reorder payload missing one case ID is rejected
**Preconditions:** A suite contains cases with IDs [1, 2, 3].
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: [1, 2]`.
**Expected Result:** The request fails with a 400 response stating the order must contain exactly the current case IDs. No `sort_order` values change.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-09 — Reorder payload containing a foreign ID is rejected
**Preconditions:** A suite contains cases with IDs [1, 2, 3]; test case ID 999 exists but is not in this suite.
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: [1, 2, 999]`.
**Expected Result:** The request fails with a 400 response stating the order must contain exactly the current case IDs. No `sort_order` values change.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-10 — Reorder payload with a duplicate ID replacing a different one is rejected
**Preconditions:** A suite contains cases with IDs [1, 2, 3].
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: [1, 1, 2]`.
**Expected Result:** The request fails with a 400 response because the set of IDs doesn't match the current set (3 is missing, 1 is duplicated). No `sort_order` values change.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-11 — Reorder payload with non-integer values is rejected
**Preconditions:** A suite contains at least one case.
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: ["1", "2"]` or `order: [1.5, 2]`.
**Expected Result:** The request fails with a 400 response stating order must be an array of test case IDs.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-12 — Reorder payload that is not an array is rejected
**Preconditions:** A suite contains at least one case.
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: { "1": true }`.
**Expected Result:** The request fails with a 400 response stating order must be an array of test case IDs.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-13 — Reorder on a non-existent suite returns 404
**Preconditions:** No suite exists with ID `99999`.
**Steps:**
1. Call `PUT /api/test-suites/99999/reorder` with any `order` array.
**Expected Result:** The request fails with a 404 response stating the suite was not found.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-DR-14 — Reorder API failure during drag-drop reverts the UI to server state
**Preconditions:** A suite has at least two cases; the reorder API call is made to fail (e.g. network error).
**Steps:**
1. Open the suite's detail page.
2. Drag one row and drop it in a new position.
3. Simulate the `PUT /:id/reorder` request failing.
**Expected Result:** An error message is shown, and the suite's case list is reloaded from the server, discarding the optimistic UI reorder.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-15 — Empty reorder array on a non-empty suite is rejected
**Preconditions:** A suite contains at least one case.
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: []`.
**Expected Result:** The request fails with a 400 response because the empty set doesn't match the suite's current case IDs.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-DR-16 — Empty reorder array on an empty suite succeeds
**Preconditions:** A suite exists with zero cases.
**Steps:**
1. Call `PUT /api/test-suites/:id/reorder` with `order: []`.
**Expected Result:** The request succeeds (trivially matching the current empty set); the suite's `updated_at` changes.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

---

## 4. Case Add/Remove Management (incl. Delete-Suite and Remove-Case Confirmations)

### TC-CM-01 — Add an available test case to a suite
**Preconditions:** A suite exists; at least one test case exists that is not already in the suite.
**Steps:**
1. Open the suite's detail page.
2. Select a test case from the "Add a test case..." dropdown.
3. Click "Add Case".
**Expected Result:** The case appears at the end of the suite's case table, the case count increments, and the dropdown resets to its placeholder.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-CM-02 — Remove a case from a suite via confirmation
**Preconditions:** A suite has at least one test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Remove" on a case row.
3. Confirm the removal in the modal.
**Expected Result:** The case is removed from the suite's case table, the case count decrements, and the underlying test case still exists in the system.
**Severity:** Major
**Status:** draft
**Test Type:** Smoke / Regression

### TC-CM-03 — Delete an entire suite via confirmation
**Preconditions:** A suite exists, with or without cases.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
3. Confirm the deletion in the modal.
**Expected Result:** The suite and its `suite_test_cases` link rows are deleted (cascade), the user is redirected to `/test-suites`, and the deleted suite no longer appears in the list. The linked test cases themselves are not deleted.
**Severity:** Critical
**Status:** draft
**Test Type:** Smoke / Regression

### TC-CM-04 — "Add Case" button is disabled with no case selected
**Preconditions:** A suite's detail page is open.
**Steps:**
1. Leave the "Add a test case..." dropdown at its placeholder value.
**Expected Result:** The "Add Case" button is disabled and cannot be clicked.
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-05 — Removing the last case in a suite leaves it empty
**Preconditions:** A suite has exactly one test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Remove" on the only case row and confirm.
**Expected Result:** The case count becomes 0, and the case table shows "No test cases in this suite yet."
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-06 — Delete-suite confirmation shows no case warning for an empty suite
**Preconditions:** A suite exists with zero cases.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
**Expected Result:** The confirmation modal asks for confirmation but shows no warning text about detaching cases.
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-07 — Delete-suite confirmation uses singular wording for exactly 1 case
**Preconditions:** A suite exists with exactly 1 test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
**Expected Result:** The warning reads "This suite has 1 test case." (singular), not "1 test cases."
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-08 — Delete-suite confirmation uses plural wording for multiple cases
**Preconditions:** A suite exists with 3 test cases.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
**Expected Result:** The warning reads "This suite has 3 test cases." (plural).
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-09 — Add-case dropdown excludes cases already in the suite
**Preconditions:** A suite already contains at least one test case, and at least one other test case exists that is not in the suite.
**Steps:**
1. Open the suite's detail page.
2. Open the "Add a test case..." dropdown.
**Expected Result:** The dropdown lists only test cases not currently in the suite; cases already added do not appear.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-CM-10 — Adding a case already in the suite is rejected
**Preconditions:** A suite already contains test case ID 5.
**Steps:**
1. Call `POST /api/test-suites/:id/cases` with `test_case_id: 5`.
**Expected Result:** The request fails with a 400 response stating the test case is already in the suite. No duplicate link row is created.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-CM-11 — Adding a soft-deleted test case is rejected
**Preconditions:** Test case ID 7 has `deleted_at` set (soft-deleted).
**Steps:**
1. Call `POST /api/test-suites/:id/cases` with `test_case_id: 7`.
**Expected Result:** The request fails with a 404 response stating the test case was not found.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-CM-12 — Adding a case with a non-integer test_case_id is rejected
**Preconditions:** A suite exists.
**Steps:**
1. Call `POST /api/test-suites/:id/cases` with `test_case_id: "abc"`.
**Expected Result:** The request fails with a 400 response stating test_case_id must be an integer.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-CM-13 — Adding a case to a non-existent suite returns 404
**Preconditions:** No suite exists with ID `99999`.
**Steps:**
1. Call `POST /api/test-suites/99999/cases` with a valid `test_case_id`.
**Expected Result:** The request fails with a 404 response stating the suite was not found.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-14 — Removing a case not linked to the suite returns 404
**Preconditions:** Test case ID 8 exists but is not in suite ID 2.
**Steps:**
1. Call `DELETE /api/test-suites/2/cases/8`.
**Expected Result:** The request fails with a 404 response stating the test case is not in the suite.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-15 — Removing a case from a non-existent suite returns 404
**Preconditions:** No suite exists with ID `99999`.
**Steps:**
1. Call `DELETE /api/test-suites/99999/cases/1`.
**Expected Result:** The request fails with a 404 response stating the suite was not found.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-16 — Deleting a non-existent (or already-deleted) suite returns 404
**Preconditions:** No suite exists with ID `99999`.
**Steps:**
1. Call `DELETE /api/test-suites/99999`.
**Expected Result:** The request fails with a 404 response stating the suite was not found.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-17 — Cancel on the Delete Suite modal takes no action
**Preconditions:** A suite exists.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
3. Click "Cancel" in the modal.
**Expected Result:** The modal closes; the suite is not deleted and remains accessible.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-18 — Cancel on the Remove Case modal takes no action
**Preconditions:** A suite has at least one test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Remove" on a case row.
3. Click "Cancel" in the modal.
**Expected Result:** The modal closes; the case remains in the suite unchanged.
**Severity:** Minor
**Status:** draft
**Test Type:** Regression

### TC-CM-19 — Clicking the modal overlay closes a confirmation modal without action
**Preconditions:** A suite has at least one test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite" (or "Remove" on a case) to open a confirmation modal.
3. Click outside the modal, on the overlay.
**Expected Result:** The modal closes without deleting the suite or removing the case.
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-20 — Suite deletion failure keeps the modal open with an error
**Preconditions:** A suite exists; the delete API call is made to fail (e.g. server error).
**Steps:**
1. Open the suite's detail page.
2. Click "Delete Suite".
3. Confirm the deletion while the API call fails.
**Expected Result:** The modal stays open, shows an error message, re-enables the "Delete" button, and the suite is not removed, allowing the user to retry or cancel.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

### TC-CM-21 — Remove-case modal clarifies the case itself is not deleted
**Preconditions:** A suite has at least one test case.
**Steps:**
1. Open the suite's detail page.
2. Click "Remove" on a case row.
**Expected Result:** The modal text states this only removes the case from the suite, the test case itself is not deleted, and it can be added back anytime.
**Severity:** Trivial
**Status:** draft
**Test Type:** Regression

### TC-CM-22 — Removing a middle case renumbers remaining sort orders contiguously
**Preconditions:** A suite has 3 cases with `sort_order` 0, 1, 2.
**Steps:**
1. Remove the case with `sort_order` 1 (the middle one).
2. Reload the suite detail page.
**Expected Result:** The two remaining cases have `sort_order` 0 and 1 (renumbered with no gaps), and display in the correct order.
**Severity:** Major
**Status:** draft
**Test Type:** Regression

---

## Summary

| Area | Test Cases |
|---|---|
| 1. Suite Creation | TC-SC-01 – TC-SC-17 (17) |
| 2. Suite List/Detail View | TC-LV-01 – TC-LV-13 (13) |
| 3. Drag-and-Drop Reordering | TC-DR-01 – TC-DR-16 (16) |
| 4. Case Add/Remove Management | TC-CM-01 – TC-CM-22 (22) |
| **Total** | **68** |
