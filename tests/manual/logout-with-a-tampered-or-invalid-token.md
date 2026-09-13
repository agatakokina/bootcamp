# Logout With a Tampered or Invalid Token

## Preconditions
User's stored session token has been manually altered or is otherwise invalid, but a logout action is triggered.

## Steps
1. Trigger the logout action with the invalid token present.

## Expected Result
The server rejects or ignores the invalid token without error; the client still clears local data and redirects to the login page.

## Severity
Minor

## Status
draft

## Test Type
Regression
