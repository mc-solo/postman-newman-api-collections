#!/usr/bin/env node
/**
 * Run the Postman collections with Newman.
 *
 * By default it runs all THREE collections in order:
 *   1. collections/jsonplaceholder-api.postman_collection.json
 *   2. collections/auth-negative.postman_collection.json
 *   3. collections/schema-validation.postman_collection.json
 *      (data-driven from test-data/posts.csv by default, see
 *      config/newman.config.json dataFiles)
 * Use --collection <file> to run only one of them.
 *
 * Single source of defaults: config/newman.config.json
 * Override precedence: CLI flag > environment variable / .env > config file.
 *
 *   node scripts/run-newman.js [--env dev|prod] [--data <file>]
 *     [--collection <file>] [--reporters cli,html]
 *     [--iterations N] [--delay N] [--timeout-request N] [--timeout-script N]
 *
 * Env vars (see .env.example): NEWMAN_ENV, NEWMAN_COLLECTION,
 * NEWMAN_ENVIRONMENT, NEWMAN_DATA_FILE, NEWMAN_ITERATIONS,
 * NEWMAN_DELAY_REQUEST_MS, NEWMAN_TIMEOUT_REQUEST_MS,
 * NEWMAN_TIMEOUT_SCRIPT_MS, NEWMAN_REPORTERS, NEWMAN_HTML_REPORT,
 * BASE_URL, HTTPBIN_BASE_URL. A local .env file (if present) is read
 * for the same keys; real shell environment variables take
 * precedence over .env values.
 *
 * Reports: the first collection writes reports/report.html and
 * reports/report.json; the second writes reports/report-auth.html
 * and reports/report-auth.json; the third writes
 * reports/report-schema-validation.html and
 * reports/report-schema-validation.json (suffix from the collection
 * file name, see reportPaths() below).
 *
 * Requires: Node.js and Newman (`npm install` first). Exits 1 on any
 * failed assertion or Newman error, so CI can fail the build.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function usage() {
  console.log([
    'Usage: node scripts/run-newman.js [options]',
    '',
    '  --env <dev|prod>          Environment to run against (default: dev)',
    '  --collection <file>       Run only this collection (default: all three collections in config)',
    '  --environment <file>      Environment file (default: from --env)',
    '  --data <file>             Iteration data file, JSON or CSV (default: per-collection default in config)',
    '  --reporters <a,b>         Comma-separated reporters (default: cli,html,json)',
    '  --iterations <n>          Iteration count (default: 1)',
    '  --delay <ms>              Delay between requests (default: 0)',
    '  --timeout-request <ms>    Per-request timeout (default: 10000)',
    '  --timeout-script <ms>     Per-script timeout (default: 5000)',
    '  --html-report <file>      HTML report path for the first collection (default: reports/report.html)',
    '  --help                    Show this help',
    '',
    'Env vars: NEWMAN_ENV, NEWMAN_COLLECTION, NEWMAN_ENVIRONMENT,',
    'NEWMAN_DATA_FILE, NEWMAN_ITERATIONS, NEWMAN_DELAY_REQUEST_MS,',
    'NEWMAN_TIMEOUT_REQUEST_MS, NEWMAN_TIMEOUT_SCRIPT_MS,',
    'NEWMAN_REPORTERS, NEWMAN_HTML_REPORT, BASE_URL, HTTPBIN_BASE_URL.',
    'See .env.example.',
  ].join('\n'));
}

/** Minimal .env loader (KEY=value, # comments, no dependency). */
function loadDotEnv() {
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !(key in process.env)) process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') { usage(); process.exit(0); }
    const match = arg.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (!match) {
      console.error(`Unknown argument: ${arg}`);
      usage();
      process.exit(2);
    }
    const key = match[1];
    const value = match[2] !== undefined ? match[2] : argv[++i];
    if (value === undefined) {
      console.error(`Missing value for --${key}`);
      process.exit(2);
    }
    out[key] = value;
  }
  return out;
}

function resolve(relativePath) {
  return path.isAbsolute(relativePath)
    ? relativePath
    : path.join(ROOT, relativePath);
}

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

/** Report paths for one collection: main collection keeps the plain
 *  names, later collections get a suffix from their file name
 *  (auth-negative -> -auth, schema-validation -> -schema-validation). */
function reportPaths(collectionPath, config, args) {
  const stem = path.basename(collectionPath, '.postman_collection.json');
  const suffix = stem === 'jsonplaceholder-api' ? '' : `-${stem.replace('auth-negative', 'auth')}`;
  const htmlReport = resolve(
    args['html-report'] || process.env.NEWMAN_HTML_REPORT ||
    (config.htmlReport || 'reports/report.html').replace(/\.html$/, `${suffix}.html`));
  const jsonReport = resolve(
    (config.jsonReport || 'reports/report.json').replace(/\.json$/, `${suffix}.json`));
  return { htmlReport, jsonReport };
}

loadDotEnv();
const args = parseArgs(process.argv.slice(2));

const configPath = path.join(ROOT, 'config', 'newman.config.json');
if (!fs.existsSync(configPath)) fail(`config file not found: ${configPath}`);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const envName = args.env || process.env.NEWMAN_ENV || config.defaultEnvironment || 'dev';
const environmentPath = resolve(
  args.environment || process.env.NEWMAN_ENVIRONMENT ||
  (config.environments && config.environments[envName]));
if (!environmentPath) {
  fail(`no environment configured for "${envName}" (see config/newman.config.json)`);
}
if (!fs.existsSync(environmentPath)) fail(`environment file not found: ${environmentPath}`);

// Collections to run: one file with --collection / NEWMAN_COLLECTION,
// otherwise the list in config.collections (or the single legacy
// config.collection).
const collectionList = args.collection || process.env.NEWMAN_COLLECTION
  ? [args.collection || process.env.NEWMAN_COLLECTION]
  : (config.collections || [config.collection]);
const collections = collectionList.map((c) => resolve(c));
for (const collectionPath of collections) {
  if (!fs.existsSync(collectionPath)) fail(`collection file not found: ${collectionPath}`);
}

const reporters = (args.reporters || process.env.NEWMAN_REPORTERS ||
  (config.reporters || ['cli']).join(',')).split(',').map((r) => r.trim()).filter(Boolean);
const iterationCount = Number(
  args.iterations || process.env.NEWMAN_ITERATIONS || config.iterationCount || 1);
const delayRequest = Number(
  args.delay || process.env.NEWMAN_DELAY_REQUEST_MS || config.delayRequestMs || 0);
const timeoutRequest = Number(
  args['timeout-request'] || process.env.NEWMAN_TIMEOUT_REQUEST_MS ||
  config.timeoutRequestMs || 10000);
const timeoutScript = Number(
  args['timeout-script'] || process.env.NEWMAN_TIMEOUT_SCRIPT_MS ||
  config.timeoutScriptMs || 5000);

// Per-collection default data file: config.dataFiles maps the
// collection file name to its data file. An explicit --data /
// NEWMAN_DATA_FILE wins for every collection.
const dataFileRaw = args.data || process.env.NEWMAN_DATA_FILE || '';

let newman;
try {
  newman = require('newman');
} catch (err) {
  fail('Newman is not installed. Run `npm install` first, then try again.');
}

// Load the environment once so BASE_URL / HTTPBIN_BASE_URL can
// override the baseUrl / httpbinBaseUrl variables in memory.
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));
for (const [key, envVar] of [['baseUrl', 'BASE_URL'], ['httpbinBaseUrl', 'HTTPBIN_BASE_URL']]) {
  if (process.env[envVar]) {
    const entry = environment.values.find((v) => v.key === key);
    if (entry) entry.value = process.env[envVar];
    else environment.values.push({ key, value: process.env[envVar], enabled: true });
  }
}

function runCollection(collectionPath) {
  return new Promise((resolveRun, rejectRun) => {
    const { htmlReport, jsonReport } = reportPaths(collectionPath, config, args);
    const stem = path.basename(collectionPath, '.postman_collection.json');
    const defaultData = (config.dataFiles || {})[stem] || config.defaultDataFile || '';
    const dataFile = dataFileRaw ? resolve(dataFileRaw)
      : (defaultData ? resolve(defaultData) : null);
    if (dataFile && !fs.existsSync(dataFile)) {
      fail(`data file not found: ${dataFile}`);
    }
    for (const report of [htmlReport, jsonReport]) {
      fs.mkdirSync(path.dirname(report), { recursive: true });
    }
    const reporter = {};
    if (reporters.includes('html')) reporter.html = { export: htmlReport };
    if (reporters.includes('json')) reporter.json = { export: jsonReport };

    console.log(`\nCollection:   ${path.relative(ROOT, collectionPath)}`);
    console.log(`Environment:  ${envName} (${path.relative(ROOT, environmentPath)})`);
    console.log(`Base URL:     ${(environment.values.find((v) => v.key === 'baseUrl') || {}).value}`);
    console.log(`Data file:    ${dataFile ? path.relative(ROOT, dataFile) : '(none)'}`);
    console.log(`Iterations:   ${iterationCount}  delay: ${delayRequest}ms` +
      `  timeouts: request ${timeoutRequest}ms / script ${timeoutScript}ms`);
    console.log(`Reporters:    ${reporters.join(', ')}`);

    newman.run({
      collection: collectionPath,
      environment,
      iterationData: dataFile || undefined,
      iterationCount,
      delayRequest,
      timeoutRequest,
      timeoutScript,
      reporters,
      reporter,
    }, (err, summary) => {
      if (err) return rejectRun(new Error(`Newman run failed: ${err.message || err}`));
      const stats = summary.run.stats;
      const failures = summary.run.failures || [];
      console.log(`Requests: ${stats.requests.total}` +
        `  assertions: ${stats.assertions.total}` +
        `  failed assertions: ${stats.assertions.failed}`);
      if (reporters.includes('html')) console.log(`HTML report: ${path.relative(ROOT, htmlReport)}`);
      if (reporters.includes('json')) console.log(`JSON report: ${path.relative(ROOT, jsonReport)}`);
      if (failures.length > 0) {
        console.log('\nFailures:');
        failures.forEach((f) => {
          console.log(`- ${f.source && f.source.name ? f.source.name + ': ' : ''}${f.error.message}`);
        });
        return rejectRun(new Error(`${failures.length} assertion(s) failed in ${path.basename(collectionPath)}`));
      }
      console.log('Newman run passed.');
      return resolveRun();
    });
  });
}

(async () => {
  try {
    for (const collectionPath of collections) {
      await runCollection(collectionPath);
    }
    console.log('\nAll collections passed.');
  } catch (err) {
    fail(err.message);
  }
})();
