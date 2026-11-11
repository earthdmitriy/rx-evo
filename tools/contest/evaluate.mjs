// Evaluates one submitted stage against the FULL suite (methodology §3, §5):
// audit, build, every e2e scenario and every page test of every stage, then
// the report that sorts results into met / missing / free / not yet.
//
//   node tools/contest/evaluate.mjs <approach> <stage> --sub <dir> [--ref <ref>] [--port 4310] [--out <dir>]
//        [--skip-e2e] [--skip-pages]
//
//   --sub   the implementer's repository (a clone of the contest base, with
//           their work committed or not)
//   --ref   commit of this repo the evaluator files are taken from (default HEAD)
//   --out   where the working copy, logs and the report go
//           (default e2e/report/evaluations/<approach>-stage-<stage>)
//
// The submission is copied; its stage folder (and package.json / lock file)
// is used as is, while the shared views, the fake backend, the harness and
// the whole suite are put back from this repo, so nothing there can be
// altered by the implementation.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [approach, stageArg] = positional;
const stage = Number(stageArg);
const sub = opt('sub') && resolve(opt('sub'));
if (!approach || ![1, 2, 3].includes(stage) || !sub) {
  console.error('usage: node tools/contest/evaluate.mjs <approach> <stage 1-3> --sub <dir> [--ref <ref>] [--port 4310] [--out <dir>] [--skip-e2e] [--skip-pages]');
  process.exit(2);
}
const repo = resolve(import.meta.dirname, '../..');
const ref = opt('ref') ?? 'HEAD';
const port = opt('port') ?? '4310';
const out = resolve(opt('out') ?? join(repo, 'e2e/report/evaluations', `${approach}-stage-${stage}`));
const work = join(out, 'work');
const win = process.platform === 'win32';

const sh = (cmd, cmdArgs, cwd, extra = {}) =>
  spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', shell: win && ['npm', 'npx'].includes(cmd), maxBuffer: 256 * 1024 * 1024, ...extra });
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const log = (name, r) => writeFileSync(join(out, name), strip(`${r.stdout ?? ''}\n${r.stderr ?? ''}`));
const step = (msg) => console.log(`\n== ${msg}`);

// ---------- 1. the audit, in the submission ----------

step('audit');
const baseCommit = sh('git', ['rev-list', '--max-parents=0', 'HEAD'], sub).stdout.trim().split('\n').pop();
const audit = sh('node', [join(repo, 'tools/contest/audit.mjs'), approach, String(stage), baseCommit], sub);
const auditText = strip(audit.stdout ?? '');
console.log(auditText.trim());

// ---------- 2. a working copy: the submission, with the evaluator's files put back ----------

step('working copy');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(sub, work, { recursive: true, filter: (p) => !/(^|[\\/])(node_modules|dist|\.git|\.results|\.angular)([\\/]|$)/.test(relative(sub, p)) });
for (const p of ['e2e', 'src/app/components/contesters/shared', 'src/app/services/contesters', 'src/app/components/contesters/page-tests', 'src/app/components/content']) {
  rmSync(join(work, p), { recursive: true, force: true });
}
const tar = join(out, 'evaluator.tar');
const archive = sh('git', ['archive', '--format=tar', '-o', tar, ref, 'e2e', 'src/app/components/contesters/shared', 'src/app/services/contesters', 'src/app/components/contesters/page-tests', 'src/app/components/content'], repo);
if (archive.status !== 0) throw new Error(archive.stderr);
const extract = sh('tar', ['-xf', relative(work, tar).split('\\').join('/')], work);
if (extract.status !== 0) throw new Error(extract.stderr);
rmSync(tar);
rmSync(join(work, 'src/app/components/content/stateful-observable-block'), { recursive: true, force: true }); // library-specific, needs the submodule
rmSync(join(work, 'e2e/validate-suite.mjs'), { force: true });

symlinkSync(existsSync(join(sub, 'node_modules')) ? join(sub, 'node_modules') : join(repo, 'node_modules'), join(work, 'node_modules'), 'junction');

// the page under test, for the e2e targets and for the page tests
const targets = join(work, 'e2e/targets.ts');
let t = readFileSync(targets, 'utf8');
// (not a substring of another key: `stateful-observable` must not match `x-stateful-observable`)
t = new RegExp(`(?<![\\w-])['"]?${approach}['"]?:\\s*\\[[^\\]]*\\]`).test(t)
  ? t.replace(new RegExp(`(?<![\\w-])(['"]?${approach}['"]?):\\s*\\[[^\\]]*\\]`), `'${approach}': [${stage}]`)
  : t.replace('export const IMPLEMENTED: Record<string, (1 | 2 | 3)[]> = {', `export const IMPLEMENTED: Record<string, (1 | 2 | 3)[]> = {\n  '${approach}': [${stage}],`);
writeFileSync(targets, t);
// the page tests mount the submission: a registry with just this page
writeFileSync(
  join(work, 'src/app/components/contesters/page-tests/pages.ts'),
  `import type { Type } from '@angular/core';
import { ConsolePageComponent } from '../${approach}/stage-${stage}/console-page.component';

export const PAGES: Record<string, Type<unknown>> = { '${approach}/stage-${stage}': ConsolePageComponent };
`,
);

// ---------- 3. the build ----------

step('build');
const build = sh('npm', ['run', 'build'], work);
log('build.log', build);
const buildOk = build.status === 0;
const warnings = (strip(`${build.stdout}${build.stderr}`).match(/\[WARNING\]/g) ?? []).length;
console.log(buildOk ? `build ok, ${warnings} warnings` : 'BUILD FAILED (see build.log)');

// ---------- 4. every e2e scenario ----------

/** `ID sN` -> passed | failed */
const e2e = {};
if (buildOk && !args.includes('--skip-e2e')) {
  step('e2e (all scenarios, all stages)');
  const r = sh('npx', ['playwright', 'test', '-c', 'e2e/playwright.config.ts', '--timeout=10000', '--reporter=dot,./e2e/reporters/contest-reporter.ts'], work, {
    env: { ...process.env, E2E_CONTESTER: approach, E2E_STAGE: String(stage), E2E_BASE_URL: `http://localhost:${port}` },
  });
  log('e2e.log', r);
  const file = join(work, 'e2e/report/contest-results.json');
  if (existsSync(file)) {
    const results = JSON.parse(readFileSync(file, 'utf8'))[`${approach}/stage-${stage}`]?.results ?? {};
    for (const [k, v] of Object.entries(results)) e2e[k] = { outcome: v.outcome, message: v.message };
  }
  console.log(`${Object.keys(e2e).length} scenarios run`);
}

// ---------- 5. every page test ----------

const pages = {};
if (buildOk && !args.includes('--skip-pages')) {
  step('page tests (all scenarios, all stages)');
  const r = sh('npx', ['ng', 'test', '--watch=false', '--reporters=verbose', '--include=src/app/components/contesters/page-tests/**/*.spec.ts'], work, {
    env: { ...process.env, PAGE_TARGET: `${approach}/stage-${stage}` },
  });
  log('pages.log', r);
  for (const m of strip(`${r.stdout}\n${r.stderr}`).matchAll(/^\s*([✓×])\s+\S+\s+\S+\.spec\.ts > .*?> (\w+) · stage (\d) ·/gm)) {
    pages[`${m[2]} s${m[3]}`] = { outcome: m[1] === '✓' ? 'passed' : 'failed' };
  }
  console.log(`${Object.keys(pages).length} page tests run`);
}

// ---------- 6. the report ----------

const mark = (testStage, outcome) => (!outcome ? '' : testStage <= stage ? (outcome === 'passed' ? '✅' : '❌') : outcome === 'passed' ? '🎁' : '·');
const stageOf = (key) => Number(key.split(' s')[1]);
const keys = [...new Set([...Object.keys(e2e), ...Object.keys(pages)])].sort((a, b) => a.split(' s')[0].localeCompare(b.split(' s')[0], undefined, { numeric: true }) || stageOf(a) - stageOf(b));
const layers = { 'e2e': e2e, 'page tests': pages };

const lines = [`# Evaluation: ${approach}, stage ${stage}`, ''];
lines.push(`Audit: ${audit.status === 0 ? 'no findings' : '**REJECTED**'}. Build: ${buildOk ? `ok, ${warnings} warnings` : '**failed**'}.`, '');
if (audit.status !== 0 || /Check by hand/.test(auditText)) lines.push('```', auditText.trim(), '```', '');
lines.push('✅ met · ❌ missing (required, failed) · 🎁 free (passes before its stage) · · not yet.', '');
lines.push('## Summary', '', '| Layer | Stage 1 | Stage 2 | Stage 3 | Missing | Free |', '| --- | --- | --- | --- | --- | --- |');
for (const [name, res] of Object.entries(layers)) {
  const all = Object.entries(res);
  const per = [1, 2, 3].map((s) => {
    const of = all.filter(([k]) => stageOf(k) === s);
    return `${of.filter(([, v]) => v.outcome === 'passed').length}/${of.length}`;
  });
  const missing = all.filter(([k, v]) => stageOf(k) <= stage && v.outcome === 'failed').length;
  const free = all.filter(([k, v]) => stageOf(k) > stage && v.outcome === 'passed').length;
  lines.push(`| ${name} | ${per.join(' | ')} | ${missing} | ${free} |`);
}
lines.push('', '## Matrix', '', '| Scenario | Stage | e2e | page tests |', '| --- | --- | --- | --- |');
for (const k of keys) lines.push(`| ${k.split(' s')[0]} | ${stageOf(k)} | ${mark(stageOf(k), e2e[k]?.outcome)} | ${mark(stageOf(k), pages[k]?.outcome)} |`);
lines.push('', '## Missing', '');
const missing = keys.filter((k) => stageOf(k) <= stage && (e2e[k]?.outcome === 'failed' || pages[k]?.outcome === 'failed'));
for (const k of missing) lines.push(`- **${k}**: ${[e2e[k]?.outcome === 'failed' && `e2e ${e2e[k].message ?? ''}`, pages[k]?.outcome === 'failed' && 'page test'].filter(Boolean).join('; ')}`);
if (!missing.length) lines.push('Nothing missing.');
lines.push('', 'Logs: build.log, e2e.log, pages.log. Costs (code size, complexity, growth) come from `tools/contest/metrics.mjs`; tradeoffs from review (methodology §4).', '');
writeFileSync(join(out, 'evaluation.md'), lines.join('\n'));
writeFileSync(join(out, 'evaluation.json'), JSON.stringify({ approach, stage, audit: audit.status === 0, build: buildOk, e2e, pages }, null, 2));
console.log(`\nreport: ${join(out, 'evaluation.md')}`);
process.exit(audit.status === 0 && buildOk && !missing.length ? 0 : 1);
