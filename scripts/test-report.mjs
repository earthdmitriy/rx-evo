#!/usr/bin/env node
/**
 * Writes `src/app/components/contesters/<approach>/test_report.md` for each
 * contester: the failed unit page tests and the failed e2e scenarios of a fresh
 * run. Run with `npm run test:report`. Always exits 0: failures are written to
 * the reports and summarised on the console.
 *
 * - Unit: `PAGE_TARGET=<approach> ng test` on the page tests. Only approaches in
 *   the page-test registry (`page-tests/pages.ts`) have unit results.
 * - E2E: `E2E_CONTESTER=<approach> playwright test`; the failures are read from
 *   `e2e/report/contest-results.json`, which the contest reporter writes.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contestersDir = join(root, 'src/app/components/contesters');
const CONTESTERS = ['resources', 'signal-store', 'stateful-observable', 'vanilla-rxjs'];
/** Folder of an approach when it differs from its target name. */
const FOLDER = { 'signal-store': 'ngrx-signal-store' };
const E2E_RESULTS = join(root, 'e2e/report/contest-results.json');
const seed = process.env.E2E_SEED ?? '1';

/** Approach names registered in the page-test registry (`PAGES`). */
const unitApproaches = () => {
  const source = readFileSync(join(contestersDir, 'page-tests/pages.ts'), 'utf8');
  const block = source.slice(source.indexOf('export const PAGES'));
  return new Set([...block.matchAll(/^\s*'?([a-z-]+)'?:/gm)].map((m) => m[1]));
};

const oneLine = (text = '') =>
  text
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 160);

/** The whole failure text without colours or library stack frames: the assertion, its diff, and the spec line. */
const fullText = (text = '') =>
  text
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .filter((l) => !/^\s*at .*node_modules/.test(l))
    .join('\n')
    .trimEnd();

/**
 * The default reporter's failure blocks (on stderr), by test title: from the
 * ` FAIL ` line (`file > suite > title`) to the `⎯` separator, with the
 * assertion, its diff and the spec lines; library frames are dropped.
 */
const failureBlocks = (stderr) => {
  const blocks = new Map();
  let title = null;
  let lines = [];
  const close = () => {
    if (title) blocks.set(title, lines.join('\n').trim());
    title = null;
    lines = [];
  };
  for (const raw of stderr.replace(/\u001b\[[0-9;]*m/g, '').split('\n')) {
    if (/^\s*FAIL\s/.test(raw)) {
      close();
      title = raw.split(' > ').pop().trim();
    } else if (/^⎯+/.test(raw.trim())) {
      close();
    } else if (title && !/❯ .*(node_modules|chunk-)/.test(raw)) {
      lines.push(raw.trimEnd());
    }
  }
  close();
  return blocks;
};

/** `A1 · stage 1 · title` → { id, stage, title }; other names keep their full text. */
const scenarioOf = (name) => {
  const m = /^(\S+) · stage (\d) · (.*)$/.exec(name);
  return m ? { id: m[1], stage: Number(m[2]), title: m[3] } : { id: name, stage: '', title: name };
};

const runUnit = (approach) => {
  const run = spawnSync(
    'npx',
    ['ng', 'test', '--watch=false', '--no-progress', '--include=src/app/components/contesters/page-tests/**/*.spec.ts', '--reporters=default', '--reporters=json'],
    { cwd: root, env: { ...process.env, PAGE_TARGET: approach }, encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 },
  );
  // the json reporter prints one line to stdout
  const line = (run.stdout ?? '').split('\n').find((l) => l.startsWith('{"numTotalTestSuites"'));
  if (!line) throw new Error(`unit run for ${approach} produced no json report:\n${(run.stderr ?? '').slice(-2000)}`);
  const results = JSON.parse(line).testResults.flatMap((file) => file.assertionResults);
  const blocks = failureBlocks(run.stderr ?? '');
  return {
    total: results.length,
    failed: results
      .filter((a) => a.status === 'failed')
      .map((a) => ({
        ...scenarioOf(a.title),
        message: oneLine(a.failureMessages?.[0]),
        // the JSON reporter has no expected/received diff: take the default reporter's block
        detail: blocks.get(a.title) ?? fullText(a.failureMessages?.[0]),
      })),
  };
};

const runE2e = (approach) => {
  const startedAt = Date.now();
  spawnSync('npx', ['playwright', 'test', '-c', 'e2e/playwright.config.ts'], {
    cwd: root,
    env: { ...process.env, E2E_CONTESTER: approach },
    stdio: 'inherit',
    shell: true,
  });
  const store = existsSync(E2E_RESULTS) ? JSON.parse(readFileSync(E2E_RESULTS, 'utf8')) : {};
  const entry = store[approach];
  if (!entry || Date.parse(entry.at) < startedAt) {
    return { error: 'the e2e run wrote no results (see the output above)', total: 0, failed: [] };
  }
  const all = Object.values(entry.results);
  return {
    total: all.length,
    failed: all
      .filter((r) => r.outcome === 'failed')
      .map((r) => ({ id: r.id, stage: r.stage, title: r.title.split(' · ')[2] ?? r.title, message: r.message ?? '', detail: r.detail ?? r.message ?? '' })),
  };
};

const cell = (text) => String(text).replace(/\|/g, '\\|').replace(/\n/g, ' ');

const table = (rows) =>
  rows.length
    ? ['| Scenario | Stage | Test | Message |', '| --- | --- | --- | --- |', ...rows.map((r) => `| ${cell(r.id)} | ${cell(r.stage)} | ${cell(r.title)} | ${cell(r.message)} |`)]
    : ['No failures.'];

/** The full failure text of each row, untruncated, under the table. */
const details = (name, rows) =>
  rows.length
    ? [`### ${name} details`, '', ...rows.flatMap((r) => [`#### ${r.id} · stage ${r.stage} · ${r.title}`, '', '```text', r.detail || r.message, '```', ''])]
    : [];

const section = (name, result) => {
  if (!result) return [`## ${name}`, '', 'Not run: this approach is not in the page-test registry (`page-tests/pages.ts`).', ''];
  const head = `## ${name} (failed)`;
  if (result.error) return [head, '', `Error: ${result.error}.`, ''];
  return [head, '', `${result.failed.length} failed of ${result.total}.`, '', ...table(result.failed), '', ...details(name, result.failed)];
};

const units = unitApproaches();
const when = new Date().toISOString();
let failures = 0;

for (const approach of CONTESTERS) {
  console.log(`\n=== ${approach} ===`);
  const unit = units.has(approach) ? runUnit(approach) : null;
  const e2e = runE2e(approach);
  failures += (unit?.failed.length ?? 0) + e2e.failed.length;

  const lines = [
    `# Test report: ${approach}`,
    '',
    `Run ${when}. Seed ${seed}.`,
    '',
    '- Unit: page tests with `PAGE_TARGET=' + approach + '` (`src/app/components/contesters/page-tests`).',
    '- E2E: `E2E_CONTESTER=' + approach + '` (`e2e/specs`).',
    '',
    ...section('Unit', unit),
    ...section('E2E', e2e),
  ];
  const folder = FOLDER[approach] ?? approach;
  writeFileSync(join(contestersDir, folder, 'test_report.md'), lines.join('\n'));
  console.log(`wrote src/app/components/contesters/${folder}/test_report.md`);
}

console.log(`\n${failures} failed scenario(s) in total.`);
process.exitCode = 0;
