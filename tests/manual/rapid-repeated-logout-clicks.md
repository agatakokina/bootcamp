# Rapid Repeated Logout Clicks

## Preconditions
User is logged in.

## Steps
1. Click the "Log Out" control multiple times in rapid succession (double/triple click) before the page navigates away.

## Expected Result
Only one logout request has any effect; no error is shown, and the user ends up on the login page exactly as with a single click.

## Severity
Minor

## Status
draft

## Test Type
Regression
