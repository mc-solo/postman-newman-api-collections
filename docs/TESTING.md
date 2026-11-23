# Testing

## What is tested

Target API: JSONPlaceholder (`https://jsonplaceholder.typicode.com`),
a free demo API. It does not save changes, so POST, PUT, PATCH and
DELETE return fake success responses. This repo tests the contract
(status, shape, echoed fields), not persistence.

The main collection has 10 requests in 4 folders, 33 assertions in total:

| Folder | Requests | Checks |
| --- | --- | --- |
| Posts | Get all posts, Get single post, Create post, Update post (PUT), Partially update post (PATCH), Delete post | Status, response time, field presence, echoed payload values |
| Users | Get all users | Status, response time, non-empty array, id/name/username/email on each user |
| Comments | Get comments for post 1 | Status, response time, non-empty array, every comment belongs to post 1 and has name/email/body |
| Negative Cases | Get non-existent post, Get invalid endpoint | Status 404, response time, empty body |

Every request also checks response time against `maxResponseTimeMs`
(default 2000 ms), and a collection-level pre-request script adds an
`X-Request-Timestamp` header to every request so runs can be traced.

## Second collection: auth and negative cases

`collections/auth-negative.postman_collection.json` has 7 requests
in 2 folders, 21 assertions in total:

| Folder | Requests | Checks |
| --- | --- | --- |
| Auth | Basic auth valid credentials, Basic auth wrong password, Bearer token valid, Bearer token missing | Status (200 for valid, 401 for wrong/missing), response time, `authenticated` flag and echoed user/token on the valid calls |
| Negative Cases | Create post missing title and body, Get non-existent post, Get invalid endpoint | Status, response time, empty body on the 404s |

Auth runs against httpbin (`{{httpbinBaseUrl}}`, the documented demo
user `user` / `passwd` and a dummy bearer token from
`test-data/auth.json`); the negative cases run against JSONPlaceholder.
The missing-fields request documents real behaviour: JSONPlaceholder
is a fake API with no validation, so it accepts the post with 201 and
an id, and the test asserts the title is absent rather than expecting
a 400 that never comes.

Running both collections (the default) is 17 requests and
54 assertions. Each collection has its own default iteration data
file in `config/newman.config.json` (`dataFiles`): `test-data/posts.json`
for the main collection, `test-data/auth.json` for the auth collection.
`test-data/negative.json` (2 rows) is the data file for the negative
cases when you run the auth collection with `--data test-data/negative.json`.

No test result is claimed in this repo: the collection has only ever
been JSON-validated, never executed (see "Current status" below).

## How to run

```bash
npm install   # first time only
npm test              # both collections, dev environment, terminal output only
npm run test:html     # both collections, plus HTML + JSON reports
npm run test:prod     # both collections, prod environment
npm run test:data     # data-driven run, test-data/posts.json (3 rows)
npm run test:csv      # data-driven run, test-data/posts.csv (3 rows)
npm run test:auth     # auth collection only, test-data/auth.json (1 row)
```

`npm test` runs both collections in order. The main collection
writes `reports/report.html` and `reports/report.json`; the auth
collection writes `reports/report-auth.html` and
`reports/report-auth.json`.

Direct runner with options:

```bash
./scripts/run-newman.sh --env prod --data test-data/posts.json --iterations 1
```

## How to run with a data file

```bash
./scripts/run-newman.sh --data test-data/posts.json
```

Newman runs the **whole collection once per row** in the data file, so
the 3-row `posts.json` runs all 10 requests 3 times (30 requests, 99
assertions). Each row supplies the payload titles/bodies and ids the
requests and test scripts read through variables, so the same requests
run with different data each iteration. See `test-data/README.md` for
the file formats and how to add a row. CSV works the same way
(`test-data/posts.csv`).

## How to read the HTML report

Open `reports/report.html` in a browser after a run that includes the
`html` reporter (`npm run test:html` or the default `npm test` — the
default reporters are `cli,html,json`, see `config/newman.config.json`).

- Top summary: total requests, passed/failed assertions, run duration.
- Each request is listed with its folder, method, URL and status.
- Failed assertions are highlighted with the expected vs actual values
  and the test name; passing assertions are listed under each request.
- `reports/report.json` holds the same run in machine-readable form
  (use it for CI parsing instead of scraping the HTML).

## Exit code

The runner exits `0` when every assertion passes and `1` when any
assertion fails or Newman errors, so CI can fail the build on a red run.

## Current status (honest)

- All JSON files in this repo parse cleanly (validated 2026-11-20).
- Shell script syntax checks pass (`bash -n`).
- The collections were **never executed**: Newman is not installed in
  this environment and no run has taken place, so there are no
  pass/fail numbers to report. Run it yourself and read
  `reports/report.html` (and `reports/report-auth.html`) for the
  current state. The auth collection is in the same state: written
  and JSON-validated only, never run.
