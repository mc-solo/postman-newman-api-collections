#!/usr/bin/env node
/**
 * Run the JSONPlaceholder Postman collection with Newman.
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
 * NEWMAN_TIMEOUT_SCRIPT_MS, NEWMAN_REPORTERS, NEWMAN_HTML_REPORT, BASE_URL.
 * A local .env file (if present) is read for the same keys; real shell
 * environment variables take precedence over .env values.
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
    '  --collection <file>       Collection file (default: from config)',
    '  --environment <file>      Environment file (default: from --env)',
    '  --data <file>             Iteration data file, JSON or CSV (default: none)',
    '  --reporters <a,b>         Comma-separated reporters (default: cli,html,json)',
    '  --iterations <n>          Iteration count (default: 1)',
    '  --delay <ms>              Delay between requests (default: 0)',
    '  --timeout-request <ms>    Per-request timeout (default: 10000)',
    '  --timeout-script <ms>     Per-script timeout (default: 5000)',
    '  --html-report <file>      HTML report path (default: reports/report.html)',
    '  --help                    Show this help',
    '',
    'Env vars: NEWMAN_ENV, NEWMAN_COLLECTION, NEWMAN_ENVIRONMENT,',
    'NEWMAN_DATA_FILE, NEWMAN_ITERATIONS, NEWMAN_DELAY_REQUEST_MS,',
    'NEWMAN_TIMEOUT_REQUEST_MS, NEWMAN_TIMEOUT_SCRIPT_MS,',
    'NEWMAN_REPORTERS, NEWMAN_HTML_REPORT, BASE_URL. See .env.example.',
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

loadDotEnv();
const args = parseArgs(process.argv.slice(2));

const configPath = path.join(ROOT, 'config', 'newman.config.json');
if (!fs.existsSync(configPath)) fail(`config file not found: ${configPath}`);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const envName = args.env || process.env.NEWMAN_ENV || config.defaultEnvironment || 'dev';
const collectionPath = resolve(
  args.collection || process.env.NEWMAN_COLLECTION || config.collection);
const environmentPath = resolve(
  args.environment || process.env.NEWMAN_ENVIRONMENT ||
  (config.environments && config.environments[envName]));
if (!environmentPath) {
  fail(`no environment configured for "${envName}" (see config/newman.config.json)`);
}
const dataFileRaw = args.data || process.env.NEWMAN_DATA_FILE || '';
const dataFile = dataFileRaw ? resolve(dataFileRaw) : null;
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
const htmlReport = resolve(
  args['html-report'] || process.env.NEWMAN_HTML_REPORT ||
  config.htmlReport || 'reports/report.html');
const jsonReport = resolve(config.jsonReport || 'reports/report.json');

for (const [label, file] of [['collection', collectionPath], ['environment', environmentPath]]) {
  if (!fs.existsSync(file)) fail(`${label} file not found: ${file}`);
}
if (dataFile && !fs.existsSync(dataFile)) {
  fail(`data file not found: ${dataFile}`);
}

let newman;
try {
  newman = require('newman');
} catch (err) {
  fail('Newman is not installed. Run `npm install` first, then try again.');
}

// Load the environment so BASE_URL can override baseUrl in memory.
const environment = JSON.parse(fs.readFileSync(environmentPath, 'utf8'));
if (process.env.BASE_URL) {
  const entry = environment.values.find((v) => v.key === 'baseUrl');
  if (entry) entry.value = process.env.BASE_URL;
  else environment.values.push({ key: 'baseUrl', value: process.env.BASE_URL, enabled: true });
}

for (const report of [htmlReport, jsonReport]) {
  fs.mkdirSync(path.dirname(report), { recursive: true });
}

const reporter = {};
if (reporters.includes('html')) reporter.html = { export: htmlReport };
if (reporters.includes('json')) reporter.json = { export: jsonReport };

console.log(`Collection:   ${path.relative(ROOT, collectionPath)}`);
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
  if (err) fail(`Newman run failed: ${err.message || err}`);
  const stats = summary.run.stats;
  const failures = summary.run.failures || [];
  console.log(`\nRequests: ${stats.requests.total}` +
    `  assertions: ${stats.assertions.total}` +
    `  failed assertions: ${stats.assertions.failed}`);
  if (reporters.includes('html')) console.log(`HTML report: ${path.relative(ROOT, htmlReport)}`);
  if (reporters.includes('json')) console.log(`JSON report: ${path.relative(ROOT, jsonReport)}`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((f) => {
      console.log(`- ${f.source && f.source.name ? f.source.name + ': ' : ''}${f.error.message}`);
    });
    process.exit(1);
  }
  console.log('Newman run passed.');
});
