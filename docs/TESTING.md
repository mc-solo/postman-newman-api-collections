# Testing

## What is tested

Target API: JSONPlaceholder (`https://jsonplaceholder.typicode.com`),
a free demo API. It does not save changes, so POST, PUT, PATCH and
DELETE return fake success responses. This repo tests the contract
(status, shape, echoed fields), not persistence.

The collection has 10 requests in 4 folders, 33 assertions in total:

| Folder | Requests | Checks |
| --- | --- | --- |
| Posts | Get all posts, Get single post, Create post, Update post (PUT), Partially update post (PATCH), Delete post | Status, response time, field presence, echoed payload values |
| Users | Get all users | Status, response time, non-empty array, id/name/username/email on each user |
| Comments | Get comments for post 1 | Status, response time, non-empty array, every comment belongs to post 1 and has name/email/body |
| Negative Cases | Get non-existent post, Get invalid endpoint | Status 404, response time, empty body |

Every request also checks response time against `maxResponseTimeMs`
(default 2000 ms), and a collection-level pre-request script adds an
`X-Request-Timestamp` header to every request so runs can be traced.

No test result is claimed in this repo: the collection has only ever
been JSON-validated, never executed (see "Current status" below).

## How to run

```bash
npm install   # first time only
npm test              # dev environment, terminal output only
npm run test:html     # dev environment, plus HTML + JSON reports
npm run test:prod     # prod environment
npm run test:data     # data-driven run, test-data/posts.json (3 rows)
npm run test:csv      # data-driven run, test-data/posts.csv (3 rows)
```

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
- The collection was **never executed**: Newman is not installed in
  this environment and no run has taken place, so there are no
  pass/fail numbers to report. Run it yourself and read
  `reports/report.html` for the current state.
