# Postman + Newman API Collections

Postman collection and Newman runner for the [JSONPlaceholder](https://jsonplaceholder.typicode.com) demo API. It is a practice project, not a real product backend. JSONPlaceholder does not save changes, so POST, PUT, PATCH and DELETE return fake success responses.

## What is covered

- Posts: get all, get one, create, full update (PUT), partial update (PATCH), delete
- Users: get all
- Comments: get comments for post 1 (`?postId={{postId}}`)
- Negative cases: get a post that does not exist (`/posts/{{nonExistentPostId}}`), get an invalid endpoint
- Auth (`collections/auth-negative.postman_collection.json`, 7 requests, 21 assertions): basic auth valid / wrong password and bearer token valid / missing against httpbin, plus create post missing title and body (documents that the fake API accepts it with 201), non-existent post and invalid endpoint

Each request has test scripts that check the status code, response time (against the `maxResponseTimeMs` variable, default 2000 ms), and the JSON fields returned. A collection-level pre-request script adds an `X-Request-Timestamp` header to every request. No URL, id, payload value or timeout is hard-coded in a request or test script: they all come from collection, environment or data-file variables (see `ARCHITECTURE.md`).

## Folder tree

```text
├── collections/    two Postman collections (10 + 7 requests, 33 + 21 assertions)
├── config/         newman.config.json — timeouts, reporters, defaults
├── docs/           SETUP.md, TESTING.md
├── environments/   dev + prod (both point at the same demo API)
├── scripts/        run-newman.js + .sh / .bat wrappers
├── test-data/      posts.json / posts.csv iteration data, users.json reference
└── reports/        generated HTML + JSON reports (git-ignored)
```

## Setup

```bash
npm install
cp .env.example .env   # optional, for local overrides
```

Details: `docs/SETUP.md`.

## Run

```bash
npm test              # both collections, dev environment, terminal + HTML + JSON reports
npm run test:html     # same, explicit
npm run test:prod     # both collections, prod environment
npm run test:data     # data-driven run with test-data/posts.json (3 rows)
npm run test:csv      # data-driven run with test-data/posts.csv (3 rows)
npm run test:auth     # auth collection only
```

Or directly:

```bash
./scripts/run-newman.sh [--env dev|prod] [--data test-data/posts.json]
```

On Windows, use `scripts\run-newman.bat`. Reports go to `reports/report.html` and `reports/report.json`.

Common overrides (no file editing needed):

```bash
NEWMAN_ENV=prod npm test
BASE_URL=https://jsonplaceholder.typicode.com ./scripts/run-newman.sh
./scripts/run-newman.sh --data test-data/posts.json --iterations 1
```

Full list: `.env.example`, `config/newman.config.json`, `docs/SETUP.md`.

## Import into Postman

1. Open Postman, go to Import, and pick `collections/jsonplaceholder-api.postman_collection.json`.
2. Import an environment too: `environments/dev.postman_environment.json` (or `prod.postman_environment.json`).
3. Select that environment in the top right, then run the collection with the Collection Runner.

Both environments point at the same public demo API. The only difference is the `envName` label (`dev` vs `prod`). There is no real prod backend here.

## Verified results

Honest status, verified 2026-11-20:

- All JSON files in the repo parse cleanly (`python3 -m json.tool`): collection, both environments, `config/newman.config.json`, `test-data/posts.json`, `test-data/users.json`, `package.json`.
- `scripts/run-newman.sh` passes `bash -n` (syntax check).
- `scripts/run-newman.js` passes `node --check`.
- Collection structure confirmed: 10 requests, 33 `pm.test` assertions in the main collection; 7 requests, 21 assertions in the auth collection; no hard-coded host, id, credential or timeout remains in any request URL, body or test script (values live in collection/environment/data-file variables).
- **Newman was not run.** Newman is not installed in this environment (`node_modules/` does not exist) and neither collection has ever been executed, so there are no pass/fail numbers to report. Run it yourself (`npm install && npm test`) and read `reports/report.html` and `reports/report-auth.html` for the current state. See `docs/TESTING.md`.
