# Postman + Newman API Collections

Postman collection and Newman runner for the [JSONPlaceholder](https://jsonplaceholder.typicode.com) demo API. It is a practice project, not a real product backend. JSONPlaceholder does not save changes, so POST, PUT, PATCH and DELETE return fake success responses.

## What is covered

- Posts: get all, get one, create, full update (PUT), partial update (PATCH), delete
- Users: get all
- Comments: get comments for post 1 (`?postId=1`)
- Negative cases: get a post that does not exist (`/posts/999999`), get an invalid endpoint

Each request has test scripts that check the status code, response time (under 2000ms), and the JSON fields returned. A collection-level pre-request script adds an `X-Request-Timestamp` header to every request.

## Import into Postman

1. Open Postman, go to Import, and pick `collections/jsonplaceholder-api.postman_collection.json`.
2. Import an environment too: `environments/dev.postman_environment.json` (or `prod.postman_environment.json`).
3. Select that environment in the top right, then run the collection with the Collection Runner.

Both environments point at the same public demo API. The only difference is the `envName` label (`dev` vs `prod`). There is no real prod backend here.

## Run with Newman

```bash
npm install
npm test
```

For an HTML report as well:

```bash
npm run test:html
```

Or use the script directly:

```bash
./newman/run-newman.sh
```

The HTML report is written to `newman/reports/report.html`. On Windows, use `newman\run-newman.bat`.

## Files

- `collections/jsonplaceholder-api.postman_collection.json` — the collection
- `environments/dev.postman_environment.json` — dev environment (demo values)
- `environments/prod.postman_environment.json` — prod environment (demo values)
- `newman/run-newman.sh` / `newman/run-newman.bat` — Newman runner scripts
- `package.json` — Newman as a dev dependency, plus `test` and `test:html` scripts

## Notes

- No test results are claimed here. Run the collection yourself to see the current pass/fail state.
- Newman is not installed by this repo. Run `npm install` first if you have not already.
