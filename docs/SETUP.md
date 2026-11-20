# Setup

## Requirements

- Node.js 18 or later (`node --version`)
- npm (comes with Node.js)
- No Postman account needed. Postman itself is only needed if you want
  to edit the collection by hand; Newman runs it from the command line.

## Install

```bash
npm install
```

This installs Newman (see `package.json`, `devDependencies`) into
`node_modules/`. Nothing else is installed globally.

## Optional: local overrides

```bash
cp .env.example .env
```

Edit `.env` to change the environment, base URL, timeouts, reporters or
data file. `.env` is git-ignored and never committed. A real shell
variable always wins over the same key in `.env`. You can also skip
`.env` entirely and pass values per run, for example:

```bash
NEWMAN_ENV=prod npm test
```

## Run the collection

```bash
npm test
```

That runs the collection once against the dev environment and prints
results to the terminal. For HTML and JSON reports as well:

```bash
npm run test:html
```

Or use the runner script directly (same thing, more options):

```bash
./scripts/run-newman.sh
./scripts/run-newman.sh --env prod
./scripts/run-newman.sh --data test-data/posts.json
```

On Windows, use `scripts\run-newman.bat` with the same options.

Reports are written to `reports/report.html` and `reports/report.json`.
They are generated files and are git-ignored.

## Import into Postman (optional)

1. Open Postman, go to Import, and pick
   `collections/jsonplaceholder-api.postman_collection.json`.
2. Import an environment too: `environments/dev.postman_environment.json`
   (or `prod.postman_environment.json`).
3. Select that environment in the top right, then run the collection
   with the Collection Runner.

Both environments point at the same public demo API. The only difference
is the `envName` label (`dev` vs `prod`). There is no real prod backend
here; the split exists to show how environment switching works.

## Troubleshooting

- `Newman is not installed` — run `npm install` first.
- `collection file not found` / `environment file not found` — run from
  the repo root, not from inside `scripts/`. The runner resolves paths
  from the repo root either way, but npm scripts assume the root.
- `data file not found` — check the path passed with `--data` or
  `NEWMAN_DATA_FILE`; it is resolved from the repo root.
- Network errors / timeouts — JSONPlaceholder is a public demo API.
  Check your connection, or raise `NEWMAN_TIMEOUT_REQUEST_MS`.
