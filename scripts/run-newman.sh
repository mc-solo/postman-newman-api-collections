#!/usr/bin/env bash
# Run the JSONPlaceholder collection with Newman (dev environment by default).
#
# Usage:
#   ./scripts/run-newman.sh [--env dev|prod] [--data test-data/posts.json] [...]
#
# All options are passed through to scripts/run-newman.js, which reads its
# defaults from config/newman.config.json. Env var overrides (see .env.example):
#   NEWMAN_ENV                 dev | prod (default: dev)
#   BASE_URL                   overrides the baseUrl environment variable
#   NEWMAN_DATA_FILE           iteration data file, e.g. test-data/posts.json
#   NEWMAN_ITERATIONS          how many times to run the collection (default: 1)
#   NEWMAN_DELAY_REQUEST_MS    delay between requests in ms (default: 0)
#   NEWMAN_TIMEOUT_REQUEST_MS  per-request timeout in ms (default: 10000)
#   NEWMAN_TIMEOUT_SCRIPT_MS   per-script timeout in ms (default: 5000)
#   NEWMAN_REPORTERS           e.g. cli,html (default: cli,html,json)
#   NEWMAN_HTML_REPORT         HTML report path (default: reports/report.html)
#
# Examples:
#   ./scripts/run-newman.sh
#   NEWMAN_ENV=prod ./scripts/run-newman.sh
#   ./scripts/run-newman.sh --data test-data/posts.json --iterations 1
#   BASE_URL=https://jsonplaceholder.typicode.com ./scripts/run-newman.sh
#
# Requires: Node.js and Newman (npm install first).
# Reports go to reports/report.html and reports/report.json.
set -e
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is not installed. Install Node.js 18+ first, then run 'npm install'."
  exit 1
fi

if [ ! -d node_modules/newman ] && ! command -v newman >/dev/null 2>&1; then
  echo "Newman is not installed. Run 'npm install' first, then try again."
  exit 1
fi

node scripts/run-newman.js "$@"
