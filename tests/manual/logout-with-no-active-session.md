# Logout With No Active Session

## Preconditions
User has no active session (already logged out), but navigates directly to a URL that triggers the logout action (e.g. via browser history or a stale link).

## Steps
1. Trigger the logout action without an active session.

## Expected Result
The app handles the request gracefully — no error is shown to the user, and they land on the login page.

## Severity
Minor

## Status
draft

## Test Type
Regression
