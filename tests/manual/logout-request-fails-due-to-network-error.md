# Logout Request Fails Due to Network Error

## Preconditions
User is logged in; the network connection is interrupted or the server is unreachable.

## Steps
1. Click "Log Out" while offline or with the server down.

## Expected Result
The client still clears local session data and directs the user toward the login page (or clearly indicates the logout could not be confirmed), rather than leaving the user in a broken, half-authenticated state.

## Severity
Major

## Status
draft

## Test Type
Regression
