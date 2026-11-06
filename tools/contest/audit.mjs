// Audit of one submitted contest stage (docs/contest/methodology.md §6.3).
// Any finding rejects the submission; review the "check by hand" list.
//
//   node tools/contest/audit.mjs <approach> <stage> [<base-ref>]
//   base-ref: the contest base commit the stage was built from (default HEAD)
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [approach, stage, base = 'HEAD'] = process.argv.slice(2);
if (!approach || !stage) {
  console.error('usage: node tools/contest/audit.mjs <approach> <stage> [<base-ref>]');
  process.exit(2);
}
const folder = `src/app/components/contesters/${approach}/stage-${stage}`;

const git = (...args) => spawnSync('git', args, { encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
const changed = [...new Set([...git('diff', '--name-only', base), ...git('ls-files', '--others', '--exclude-standard')])];

const allowed = [
  (p) => p.startsWith(`${folder}/`),
  (p) => p === 'src/app/app.routes.ts',
  (p) => p === 'package.json' || p === 'package-lock.json',
];
const IGNORED = [/^\.opencode\//, /^opencode\.json$/, /^tsconfig\.json$/, /^\.claude\//, /^\.kilo\//, /^\.langflower\//];

const findings = [];
const review = [];

for (const p of changed) {
  if (IGNORED.some((r) => r.test(p))) continue;
  if (!allowed.some((ok) => ok(p))) findings.push(`changed outside the stage: ${p}`);
}
if (changed.includes('package.json')) review.push('package.json changed: only the declared tool may be added');

const files = (dir) => {
  try {
    return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)]));
  } catch {
    return [];
  }
};

const FORBIDDEN = [
  [/__api\b/, 'test hook (window.__api)'],
  [/FakeTransport|FakeBackend|services\/contesters\/backend|services\/contesters\/harness/, 'server side of the fake backend'],
  [/navigator\.webdriver/, 'test detection'],
  [/[?&](latency|seed|defect|push)=|['"](latency|seed|defect)['"]/, 'harness URL parameters'],
  [/getByTestId|querySelector(All)?\s*\(/, 'DOM querying in the data layer'],
  [/from\s+'[^']*contesters\/(?!shared)[^']*'/, 'import from another approach'],
  [/from\s+'\.\.\/(\.\.\/)?(stage-\d|reference|layout-draft)/, 'import from another stage or the reference'],
];

for (const f of files(folder).filter((f) => /\.(ts|html)$/.test(f))) {
  const text = readFileSync(f, 'utf8');
  for (const [re, what] of FORBIDDEN) if (re.test(text)) findings.push(`${f}: ${what}`);
  if (/data-testid/.test(text) && f.endsWith('.ts') && !f.endsWith('.component.ts')) findings.push(`${f}: test ids in data-layer code`);
  for (const m of text.matchAll(/setTimeout\([^,]+,\s*\d+\)/g)) review.push(`${f}: constant timeout "${m[0].slice(0, 60)}" (waiting for data?)`);
  if (/@ts-ignore|eslint-disable/.test(text)) review.push(`${f}: suppressed checks`);
}
if (!files(folder).length) findings.push(`no files in ${folder}`);

console.log(`Audit of ${folder} against ${base}\n`);
console.log(findings.length ? `REJECTED\n- ${findings.join('\n- ')}` : 'No findings.');
if (review.length) console.log(`\nCheck by hand\n- ${review.join('\n- ')}`);
console.log('\nAlso by review: no code for requirements of later stages (methodology §2).');
process.exit(findings.length ? 1 : 0);
