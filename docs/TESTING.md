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

Running all three collections (the default) is 22 requests and
74 assertions. Each collection has its own default iteration data
file in `config/newman.config.json` (`dataFiles`): `test-data/posts.json`
for the main collection, `test-data/auth.json` for the auth collection,
`test-data/posts.csv` for the schema collection.
`test-data/negative.json` (2 rows) is the data file for the negative
cases when you run the auth collection with `--data test-data/negative.json`.

## Third collection: schema validation

`collections/schema-validation.postman_collection.json` has 5 requests
in 2 folders, 20 assertions in total:

| Folder | Requests | Checks |
| --- | --- | --- |
| Posts Schema | Get single post, Get all posts, Create post | Status, response time, `tv4` schema validation, required fields and types |
| Users Schema | Get single user, Get all users | Status, response time, `tv4` schema validation, required fields and types |

Each request checks the response two ways. First, a valid-schema case:
`tv4.validateResult(jsonData, schema)` against the `postSchema` or
`userSchema` collection variable, which holds the JSON schema as a
string (parsed with `JSON.parse` in the test script, so the schema
lives in the collection and is shared by every request instead of
being repeated per request). The post schema requires `id`, `userId`,
`title` and `body`, all with integer/string types; the user schema
requires `id`, `name`, `username`, `email`, `address`, `phone`,
`website` and `company`, including the nested `address.geo` and
`company` objects. For the list endpoints the schema is wrapped as
`{ type: 'array', items: <schema> }`. Second, a required-fields-and-types
case: explicit `pm.expect` checks that each required field is present
and the right type (numbers for ids, non-empty strings for titles,
`@` in emails, objects for `address` and `company`), plus the echoed
title/body on the create request. The create request uses the
`{{newPostTitle}}` / `{{newPostBody}}` variables, so a data-driven run
validates the created post against a different title/body per row.

The schema collection's default data file is `test-data/posts.csv`
(3 rows), so `npm run test:schema` runs the 5 requests once per CSV
row (15 requests, 60 assertions). `npm run test:schema-csv` is the
same run with the data file passed explicitly with `--data`.

No test result is claimed in this repo: the collection has only ever
been JSON-validated, never executed (see "Current status" below).

## How to run

```bash
npm install   # first time only
npm test              # all three collections, dev environment, terminal output only
npm run test:html     # all three collections, plus HTML + JSON reports
npm run test:prod     # all three collections, prod environment
npm run test:data     # data-driven run, test-data/posts.json (3 rows)
npm run test:csv      # data-driven run, test-data/posts.csv (3 rows)
npm run test:auth     # auth collection only, test-data/auth.json (1 row)
npm run test:schema   # schema collection only, data-driven from test-data/posts.csv (3 rows)
npm run test:schema-csv  # schema collection only, explicit --data test-data/posts.csv
```

`npm test` runs all three collections in order. The main collection
writes `reports/report.html` and `reports/report.json`; the auth
collection writes `reports/report-auth.html` and
`reports/report-auth.json`; the schema collection writes
`reports/report-schema-validation.html` and
`reports/report-schema-validation.json`.

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

The schema collection is the CSV data-driven run: its default data
file in `config/newman.config.json` is `test-data/posts.csv`, so
`npm run test:schema` needs no `--data` flag and runs the 5 schema
requests once per CSV row (15 requests, 60 assertions). Passing
`--data` overrides the default for every collection, so
`./scripts/run-newman.sh --data test-data/posts.csv` runs all three
collections with the CSV rows, and
`./scripts/run-newman.sh --collection collections/schema-validation.postman_collection.json --data test-data/posts.csv`
runs only the schema collection with the CSV rows.

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
  `reports/report.html`, `reports/report-auth.html` and
  `reports/report-schema-validation.html` for the current state. The
  auth and schema collections are in the same state: written
  and JSON-validated only, never run.
