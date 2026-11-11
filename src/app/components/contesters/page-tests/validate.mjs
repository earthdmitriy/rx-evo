// Validates the page tests against the reference implementation, like
// e2e/validate-suite.mjs does for the browser suite:
//   1. no defect: every scenario passes;
//   2. each defect switch: the scenarios it targets fail;
//   3. `stage-1` (stage 2-3 behaviours off): every stage-1 scenario still
//      passes; `stage-2` (stage 3 off): stages 1-2 still pass.
//
//   node src/app/components/contesters/page-tests/validate.mjs            everything
//   node src/app/components/contesters/page-tests/validate.mjs no-cache   one defect only
//
// Scenarios run under Vitest (`ng test`); the defect goes in through PAGE_DEFECT.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

/** Scenario keys (`<id> s<stage>`) each defect must make fail (those the page tests cover). */
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
  // stage 3 (A8 s3, the route round trip, is e2e only)
  'no-cache': ['C2 s3', 'C3 s3', 'C4 s3', 'C6 s3'],
  'no-lazy': ['C1 s3'],
  'no-share': ['C2 s3', 'C7 s3', 'C11 s3', 'C13 s3', 'C14 s3'],
  'no-debounce': ['B4 s3', 'B10 s3'],
  'no-progressive': ['D1 s3'],
  'no-batch': ['C11 s3', 'C12 s3'],
  'eager-sentences': ['C10 s3'],
  'clear-public': ['A7 s3'],
};

const root = join(import.meta.dirname, '../../../../..');
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');

/** Runs the page tests with `defect`; returns the keys that failed and the number of tests. */
const run = (defect) => {
  const out = spawnSync('npx', ['ng', 'test', '--watch=false', '--include=src/app/components/contesters/page-tests/**/*.spec.ts'], {
    cwd: root,
    env: { ...process.env, PAGE_DEFECT: defect ?? '' },
    shell: true,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const text = strip(`${out.stdout}\n${out.stderr}`);
  const failed = new Set([...text.matchAll(/^\s*×\s+(\w+) · stage (\d) ·/gm)].map((m) => `${m[1]} s${m[2]}`));
  const total = Number(text.match(/Tests\s+(?:\d+ failed \| )?(\d+) passed/)?.[1] ?? 0) + failed.size;
  if (!total) console.log(text.slice(-2000));
  return { failed, total };
};

const problems = [];
const only = process.argv[2];

if (!only) {
  const { failed, total } = run();
  if (failed.size || !total) problems.push(`clean run: failing ${[...failed].join(', ') || 'nothing ran'}`);
  console.log(`clean: ${failed.size ? 'FAIL ' + [...failed].join(', ') : `all ${total} passed`}`);
}

for (const [defect, keys] of Object.entries(EXPECT)) {
  if (only && only !== defect) continue;
  const { failed } = run(defect);
  const missed = keys.filter((k) => !failed.has(k));
  if (missed.length) problems.push(`${defect}: not caught by ${missed.join(', ')}`);
  console.log(`${defect}: ${missed.length ? 'NOT CAUGHT by ' + missed.join(', ') : 'caught by ' + keys.join(', ')}`);
}

if (!only) {
  for (const alias of ['stage-1', 'stage-2']) {
    const { failed } = run(alias);
    const bad = [...failed].filter((k) => Number(k.split(' s')[1]) <= Number(alias.slice(-1)));
    if (bad.length) problems.push(`${alias}: earlier-stage scenarios fail ${bad.join(', ')}`);
    console.log(`${alias}: ${bad.length ? 'FAIL ' + bad.join(', ') : 'earlier stages intact'}`);
  }
}

console.log(problems.length ? `\nPROBLEMS\n- ${problems.join('\n- ')}` : '\nPage tests validated.');
process.exit(problems.length ? 1 : 0);
