# Logout Triggered by Session Expiry

## Preconditions
User is logged in and their session/token has expired (server-side timeout), without the user clicking "Log Out".

## Steps
1. Wait for the session to expire (or simulate an expired token).
2. Attempt to perform any authenticated action.

## Expected Result
The user is treated as logged out: local session data is cleared and they are redirected to the login page, optionally with a message explaining the session expired.

## Severity
Major

## Status
draft

## Test Type
Regression
