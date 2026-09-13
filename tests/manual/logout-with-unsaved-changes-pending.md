# Logout With Unsaved Changes Pending

## Preconditions
User is logged in and has unsaved changes in an open form (e.g. editing a test case).

## Steps
1. Click "Log Out" while the form has unsaved changes.

## Expected Result
The user is either warned that unsaved changes will be lost before logout proceeds, or the app's stated behavior for this case is followed consistently — logout must not silently corrupt or partially save the data.

## Severity
Major

## Status
draft

## Test Type
Regression
