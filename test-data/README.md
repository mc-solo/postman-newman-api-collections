# Test data

## Files

- `posts.json` — iteration data for data-driven Newman runs. One object per
  run of the collection (3 rows). Use with `--data test-data/posts.json`.
  Each row supplies the payload titles/bodies and the ids the collection
  reads through `pm.variables.get(...)`, so the same requests run with
  different data each iteration.
- `posts.csv` — the same 3 rows as CSV, for runners that prefer CSV.
  Use with `--data test-data/posts.csv`. Keep the header row exactly as is;
  the column names must match the variable names used in the collection.
- `users.json` — reference data only, NOT an iteration file. Sample user
  records in the shape the `Get all users` request checks (id, name,
  username, email). Use it to eyeball expected values while writing or
  reviewing tests. Do not pass it with `--data`.

## How iteration data works here

Newman runs the **whole collection once per row** in the data file, so
`posts.json` with 3 rows runs all 10 requests 3 times (30 requests).
That is safe here because JSONPlaceholder is a fake API: POST, PUT, PATCH
and DELETE return fake success responses and nothing is really saved.

## Adding a row

Copy one object in `posts.json` (or one line in `posts.csv`), change the
title/body values, and keep `postId`, `userId`, `nonExistentPostId` and
`maxResponseTimeMs` unless you deliberately want to test different ids
or a different response-time limit. No collection change is needed: the
test scripts read these values from the current iteration.
