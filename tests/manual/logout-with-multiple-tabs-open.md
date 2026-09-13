# Logout With Multiple Tabs Open

## Preconditions
User is logged in and has the same account open in two browser tabs.

## Steps
1. In Tab A, click "Log Out".
2. Switch to Tab B and attempt to perform any authenticated action (e.g. load a protected page or submit a form).

## Expected Result
Tab B's session is also invalidated — the action fails and the user is redirected to the login page, not left in a stale authenticated state.

## Severity
Major

## Status
draft

## Test Type
Regression
