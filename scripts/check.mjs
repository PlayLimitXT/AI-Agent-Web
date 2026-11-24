#!/usr/bin/env node
/**
 * Zero-dependency repository checks for PLXT.
 *
 * Verifies syntax, asset wiring, Service Worker coverage, version consistency,
 * documentation links, licensing and basic security invariants.
 *
 * Usage: npm run check
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const passes = [];
const failures = [];
let total = 0;

function ok(name) {
  total += 1;
  passes.push(name);
}

function fail(name, detail) {
  total += 1;
  failures.push(detail ? `${name} — ${detail}` : name);
}

function assert(condition, name, detail) {
  if (condition) ok(name);
  else fail(name, detail);
}

function read(file) {
  return readFileSync(join(ROOT, file), 'utf8');
}

function exists(file) {
  return existsSync(join(ROOT, file));
}

/* ---------------------------------------------------------------- filesystem */

const requiredFiles = [
  'index.html',
  'styles.css',
  'manifest.json',
  'sw.js',
  'offline.html',
  'logo.svg',
  'README.md',
  'LICENSE',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'DEPLOY.md',
  'CODE_OF_CONDUCT.md',
  'AGENTS.md',
  'docs/USAGE.md',
  'package.json',
  'scripts/serve.mjs',
  'scripts/check.mjs',
  '.github/workflows/ci.yml',
  '.github/PULL_REQUEST_TEMPLATE.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml'
];

const missingFiles = requiredFiles.filter(file => !exists(file));
assert(missingFiles.length === 0, 'required repository files exist', missingFiles.join(', '));

/* ---------------------------------------------------------------- versions */

const indexHtml = read('index.html');
const swJs = read('sw.js');
const manifest = JSON.parse(read('manifest.json'));
const pkg = JSON.parse(read('package.json'));
const readme = read('README.md');
const changelog = read('CHANGELOG.md');

const brandVersion = indexHtml.match(/window\.PLXT_BRAND\s*=\s*\{[\s\S]*?version:\s*'([^']+)'/)?.[1];
const swVersion = swJs.match(/const VERSION = '([^']+)'/)?.[1];
const versions = {
  'index.html': brandVersion,
  'sw.js': swVersion,
  'manifest.json': manifest.version,
  'package.json': pkg.version
};
const uniqueVersions = new Set(Object.values(versions));
assert(
  uniqueVersions.size === 1 && !uniqueVersions.has(undefined),
  'version is identical in all four locations',
  JSON.stringify(versions)
);
const version = brandVersion || pkg.version;
assert(readme.includes(version), 'README shows the current version', version);
assert(changelog.includes(`[${version}]`), 'CHANGELOG contains the current version', version);

/* ---------------------------------------------------------------- branding */

assert(indexHtml.includes('window.PLXT_BRAND'), 'brand is defined once as window.PLXT_BRAND');
assert(!indexHtml.includes('FOLIO_BRAND'), 'no stale FOLIO_BRAND reference');
assert(manifest.name.includes('PLXT') && manifest.short_name.includes('PLXT'), 'manifest uses the PLXT brand');

/* ---------------------------------------------------------------- security */

assert(/http-equiv="Content-Security-Policy"/.test(indexHtml), 'CSP meta tag is present');
assert(/object-src 'none'/.test(indexHtml), "CSP keeps object-src 'none'");
assert(/base-uri 'self'/.test(indexHtml), "CSP keeps base-uri 'self'");
assert(read('js/04-render.js').includes('DOMPurify.sanitize'), 'model HTML passes through DOMPurify');

const runtimeFiles = [...readdirSync(join(ROOT, 'js')).filter(file => file.endsWith('.js')).sort().map(file => `js/${file}`), 'sw.js'];
const debugResidue = runtimeFiles.filter(file => /\bdebugger\b|\bconsole\.log\s*\(/.test(read(file)));
assert(debugResidue.length === 0, 'no debugger/console.log residue', debugResidue.join(', '));

/* ---------------------------------------------------------------- scripts */

const appScripts = [...indexHtml.matchAll(/<script\s+defer\s+src="(js\/[^"]+)"/g)].map(match => match[1]);
const expectedScripts = readdirSync(join(ROOT, 'js'))
  .filter(file => file.endsWith('.js'))
  .sort()
  .map(file => `js/${file}`);

assert(
  appScripts.length === expectedScripts.length && appScripts.every((file, index) => file === expectedScripts[index]),
  'index.html loads every js module in numeric order',
  `found ${appScripts.join(', ')}`
);

const allScriptSources = [...indexHtml.matchAll(/<script\s+[^>]*src="([^"]+)"/g)].map(match => match[1]);
const missingScriptSources = allScriptSources.filter(file => !/^https?:/.test(file) && !exists(file));
assert(missingScriptSources.length === 0, 'all local script sources exist', missingScriptSources.join(', '));

/* ---------------------------------------------------------------- service worker */

const shellBlock = swJs.match(/const SHELL = \[([\s\S]*?)\];/)?.[1] || '';
const shellEntries = [...shellBlock.matchAll(/'\.\/([^']+)'/g)].map(match => match[1]);
const shellSet = new Set(shellEntries);
const shellRequired = [
  'index.html',
  'offline.html',
  'styles.css',
  'manifest.json',
  'logo.svg',
  'vendor/marked.min.js',
  'vendor/purify.min.js',
  'vendor/github.min.css',
  'vendor/github-dark.min.css',
  ...expectedScripts
];
const missingFromShell = shellRequired.filter(file => !shellSet.has(file));
assert(missingFromShell.length === 0, 'Service Worker SHELL covers the application shell', missingFromShell.join(', '));

const staleShellEntries = shellEntries.filter(file => !/^https?:/.test(file) && !exists(file));
assert(staleShellEntries.length === 0, 'Service Worker SHELL entries exist on disk', staleShellEntries.join(', '));

/* ---------------------------------------------------------------- syntax */

const syntaxTargets = [...expectedScripts, 'sw.js', 'scripts/check.mjs', 'scripts/serve.mjs'];
for (const file of syntaxTargets) {
  const result = spawnSync(process.execPath, ['--check', join(ROOT, file)], { encoding: 'utf8' });
  assert(result.status === 0, `syntax: ${file}`, (result.stderr || '').trim());
}

/* ---------------------------------------------------------------- manifest */

const iconSources = [
  ...(manifest.icons || []).map(icon => icon.src),
  ...(manifest.shortcuts || []).flatMap(shortcut => (shortcut.icons || []).map(icon => icon.src))
];
const missingIcons = [...new Set(iconSources)].filter(file => !exists(file));
assert(iconSources.length > 0 && missingIcons.length === 0, 'manifest icons exist', missingIcons.join(', '));

/* ---------------------------------------------------------------- licensing */

const license = read('LICENSE');
assert(license.startsWith('MIT License'), 'LICENSE is MIT');
assert(pkg.license === 'MIT' && pkg.private === true, 'package.json is MIT and not publishable to npm');

/* ---------------------------------------------------------------- docs */

assert(readme.includes('MIT') && /无遥测|No telemetry|no telemetry/.test(readme), 'README documents licensing and privacy');
assert(!/googletagmanager|google-analytics/.test(indexHtml), 'index.html contains no analytics scripts');

const markdownFiles = [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'DEPLOY.md',
  'CODE_OF_CONDUCT.md',
  'AGENTS.md',
  'docs/USAGE.md'
];
const brokenLinks = [];

for (const file of markdownFiles) {
  if (!exists(file)) continue;
  const source = read(file);
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    let target = match[1];
    if (/^(?:https?:|mailto:|#|<)/.test(target)) continue;
    target = target.split('#')[0].split('?')[0];
    if (!target || target.startsWith('/')) continue;

    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      /* keep the raw target */
    }

    const absolute = resolve(dirname(join(ROOT, file)), decoded);
    if (!existsSync(absolute)) brokenLinks.push(`${file} -> ${target}`);
  }
}

assert(brokenLinks.length === 0, 'local Markdown links resolve', brokenLinks.join('; '));

/* ---------------------------------------------------------------- summary */

if (failures.length === 0) {
  console.log(`\nPLXT check: ${total} checks passed.\n`);
  process.exit(0);
}

console.log(`\nPLXT check: ${passes.length}/${total} passed, ${failures.length} failed.\n`);
for (const failure of failures) console.log(`  ✗ ${failure}`);
console.log('');
process.exit(1);