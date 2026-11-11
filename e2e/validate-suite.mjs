// Validates the contest suite against the reference implementation
// (docs/contest/methodology.md §3):
//   1. no defect: every scenario passes;
//   2. each defect switch: the scenarios it targets fail;
//   3. `stage-1` (all stage 2–3 behaviours off): every stage-1 scenario still
//      passes; `stage-2` (stage 3 behaviours off): stages 1–2 still pass.
//      So a stage's tests never depend on a later stage's behaviour.
//
//   node e2e/validate-suite.mjs            everything
//   node e2e/validate-suite.mjs no-cache   one defect only
//
// Needs a dev server with the current code (E2E_BASE_URL, default :4200).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Scenario keys (`<id> s<stage>`) each defect must make fail. */
const EXPECT = {
  // stage 1
  'stale-customer': ['B2 s1', 'H11 s1'],
  'leak-session': ['A5 s1'],
  'stale-stats': ['G1 s1', 'G6 s1'],
  'no-chunk': ['H12 s1', 'C12 s3'],
  // stage 2
  'no-isolation': ['E1 s2', 'E2 s2'],
  'no-partial': ['E3 s2', 'E5 s2', 'E10 s2', 'E11 s2', 'E12 s2', 'E13 s2', 'E14 s2', 'E15 s2', 'E16 s2', 'E17 s2', 'E18 s2', 'E19 s2', 'E20 s2'],
  'retry-all': ['F1 s2'],
  'no-poll-keep': ['E7 s2'],
  'no-stale': ['B3 s2'],
  'no-cancel': ['B1 s2', 'B8 s2', 'A4 s2'],
  'refresh-all': ['G1 s2', 'G6 s2', 'G8 s2', 'G11 s2'],
  'cancel-writes': ['G4 s2'],
  // stage 3
  'no-cache': ['C2 s3', 'C3 s3', 'C4 s3', 'C6 s3', 'A8 s3'],
  'no-lazy': ['C1 s3'],
  'no-share': ['C2 s3', 'C7 s3', 'C11 s3', 'C13 s3', 'C14 s3'],
  'no-debounce': ['B4 s3', 'B10 s3'],
  'no-progressive': ['D1 s3'],
  'no-batch': ['C11 s3', 'C12 s3'],
  'eager-sentences': ['C10 s3'],
  'clear-public': ['A7 s3'],
};

const root = join(import.meta.dirname, '..');
const results = () => JSON.parse(readFileSync(join(root, 'e2e/report/contest-results.json'), 'utf8'));
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Runs the suite on the test oracle with `defect`, limited by `grep`; returns the results of this run. */
const run = (defect, grep) => {
  const env = { ...process.env, E2E_CONTESTER: 'test-oracle', E2E_DEFECT: defect ?? '' };
  const args = ['playwright', 'test', '-c', 'e2e/playwright.config.ts', '--timeout=10000', '--reporter=dot,./e2e/reporters/contest-reporter.ts'];
  if (grep) args.push('--grep', `"${grep}"`);
  spawnSync('npx', args, { cwd: root, env, stdio: 'inherit', shell: true });
  return results()[defect ? `test-oracle~${defect}` : 'test-oracle']?.results ?? {};
};

const keyGrep = (keys) => keys.map((k) => { const [id, s] = k.split(' s'); return `${escape(id)} · stage ${s} ·`; }).join('|');
const failed = (r, keys) => keys.filter((k) => r[k]?.outcome === 'failed');
const problems = [];
const only = process.argv[2];

if (!only) {
  const r = run();
  const bad = Object.keys(r).filter((k) => r[k].outcome === 'failed');
  if (bad.length) problems.push(`clean run: failing ${bad.join(', ')}`);
  console.log(`\nclean: ${bad.length ? 'FAIL ' + bad.join(', ') : `all ${Object.keys(r).length} passed`}`);
}

for (const [defect, keys] of Object.entries(EXPECT)) {
  if (only && only !== defect) continue;
  const r = run(defect, keyGrep(keys));
  const caught = failed(r, keys);
  const missed = keys.filter((k) => !caught.includes(k));
  if (missed.length) problems.push(`${defect}: not caught by ${missed.join(', ')}`);
  console.log(`\n${defect}: ${missed.length ? 'NOT CAUGHT by ' + missed.join(', ') : 'caught by ' + caught.join(', ')}`);
}

if (!only) {
  for (const [alias, tags] of [['stage-1', '@s1'], ['stage-2', '@s1|@s2']]) {
    const r = run(alias, tags);
    const bad = Object.keys(r).filter((k) => r[k].outcome === 'failed' && Number(k.split(' s')[1]) <= Number(alias.slice(-1)));
    if (bad.length) problems.push(`${alias}: earlier-stage scenarios fail ${bad.join(', ')}`);
    console.log(`\n${alias}: ${bad.length ? 'FAIL ' + bad.join(', ') : 'earlier stages intact'}`);
  }
}

console.log(problems.length ? `\nPROBLEMS\n- ${problems.join('\n- ')}` : '\nSuite validated.');
process.exit(problems.length ? 1 : 0);
