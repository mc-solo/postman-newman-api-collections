@echo off
REM Run the JSONPlaceholder collection with Newman (dev environment by default).
REM
REM Usage: scripts\run-newman.bat [--env dev^|prod] [--data test-data\posts.json] [...]
REM
REM All options are passed through to scripts\run-newman.js, which reads its
REM defaults from config\newman.config.json. Env var overrides (see .env.example):
REM   NEWMAN_ENV                 dev or prod (default: dev)
REM   BASE_URL                   overrides the baseUrl environment variable
REM   NEWMAN_DATA_FILE           iteration data file, e.g. test-data\posts.json
REM   NEWMAN_ITERATIONS          how many times to run the collection (default: 1)
REM   NEWMAN_DELAY_REQUEST_MS    delay between requests in ms (default: 0)
REM   NEWMAN_TIMEOUT_REQUEST_MS  per-request timeout in ms (default: 10000)
REM   NEWMAN_TIMEOUT_SCRIPT_MS   per-script timeout in ms (default: 5000)
REM   NEWMAN_REPORTERS           e.g. cli,html (default: cli,html,json)
REM   NEWMAN_HTML_REPORT         HTML report path (default: reports\report.html)
REM
REM Examples:
REM   scripts\run-newman.bat
REM   set NEWMAN_ENV=prod && scripts\run-newman.bat
REM   scripts\run-newman.bat --data test-data\posts.json
REM
REM Requires: Node.js and Newman (npm install first).
REM Reports go to reports\report.html and reports\report.json.
cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install Node.js 18+ first, then run 'npm install'.
  exit /b 1
)

if not exist node_modules\newman (
  where newman >nul 2>nul
  if errorlevel 1 (
    echo Newman is not installed. Run 'npm install' first, then try again.
    exit /b 1
  )
)

node scripts\run-newman.js %*
