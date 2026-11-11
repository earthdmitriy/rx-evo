// Validates make-base.mjs (docs/contest/methodology.md §6.2): builds a base
// for each stage and checks that it
//   1. holds nothing it must not (paths, words, later stages' requirements and scenarios),
//   2. builds, and its own tests pass,
//   3. with a working implementation in the stage folder, passes every smoke
//      scenario it lists, and lists no scenario of a later stage.
//
//   node tools/contest/validate-base.mjs [--out <dir>] [--ref <ref|WORKTREE>] [--no-impl]
//
// For stages 2 and 3 the test oracle, copied and re-rooted as a stage folder,
// stands in for the work of an implementer (it uses the vocabulary of stage
// 2). Stage 1 has no stand-in: the stage-1 vocabulary is too small for the
// test oracle, so only the empty stage is built and its smoke scenarios listed;
// a real stage-1 submission is checked by evaluate.mjs.
// --ref WORKTREE validates the working tree without committing it.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const repo = resolve(import.meta.dirname, '../..');
const useImpl = !args.includes('--no-impl');
const out = resolve(opt('out') ?? join(repo, 'e2e/report/base-validation'));
const ref = opt('ref') ?? 'HEAD';
const win = process.platform === 'win32';
const strip = (s) => s.replace(/\x1b\[[0-9;]*m/g, '');
const sh = (cmd, cmdArgs, cwd, extra = {}) =>
  spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', shell: win && ['npm', 'npx'].includes(cmd), maxBuffer: 256 * 1024 * 1024, ...extra });

const problems = [];
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) problems.push(what);
};

const walk = (dir) =>
  readdirSync(dir).flatMap((n) => {
    if (['node_modules', '.git', 'dist', '.angular', '.results'].includes(n)) return [];
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

/** The test oracle as a stage folder of an approach: renamed, imports re-rooted, defect switches off. */
const makeImpl = () => {
  const dir = join(out, 'impl');
  const tree = (() => {
    if (ref !== 'WORKTREE') return ref;
    const index = join(out, 'index');
    const env = { ...process.env, GIT_INDEX_FILE: index };
    sh('git', ['add', '-A'], repo, { env });
    const id = sh('git', ['write-tree'], repo, { env }).stdout.trim();
    rmSync(index, { force: true });
    return id;
  })();
  const tar = join(out, 'oracle.tar');
  sh('git', ['archive', '--format=tar', '-o', tar, tree, 'src/app/components/contesters/test-oracle'], repo);
  mkdirSync(dir, { recursive: true });
  const x = sh('tar', ['-xf', relative(dir, tar).split('\\').join('/')], dir);
  if (x.status !== 0) throw new Error(x.stderr);
  const ref0 = join(dir, 'src/app/components/contesters/test-oracle');
  const stageDir = join(out, 'impl-stage');
  cpSync(ref0, stageDir, { recursive: true });
  rmSync(dir, { recursive: true, force: true });
  rmSync(tar, { force: true });
  for (const f of ['README.md']) rmSync(join(stageDir, f), { force: true });
  renameSync(join(stageDir, 'oracle-console.component.ts'), join(stageDir, 'console-page.component.ts'));
  const edit = (p, f) => writeFileSync(p, f(readFileSync(p, 'utf8')));
  edit(join(stageDir, 'console-page.component.ts'), (s) =>
    s
      .replace(/OracleConsoleComponent/g, 'ConsolePageComponent')
      .replace(/app-oracle-console/g, 'app-console-page'),
  );
  // the stand-in sits one folder deeper than the test oracle (contesters/<approach>/stage-N): every relative import that
  // leaves the test oracle tree (shared, content, services) needs one more ../; imports inside the tree are unchanged
  for (const file of walk(stageDir).filter((p) => p.endsWith('.ts'))) {
    const depth = relative(stageDir, dirname(file)).split(/[\\/]/).filter(Boolean).length;
    edit(file, (s) =>
      s.replace(/(from\s+['"])((?:\.\.\/)+)/g, (m, head, ups) => (ups.length / 3 > depth ? head + '../' + ups : m)),
    );
  }
  // no defect switches in an implementation
  writeFileSync(join(stageDir, 'data/defects.ts'), "export type Defect = string;\nexport const defect = (_name: Defect): boolean => false;\n");
  return stageDir;
};
const impl = useImpl ? makeImpl() : undefined;

const APPROACH = 'validation';
const MUST_NOT_EXIST = [
  'AGENTS.md', 'TODO.md', 'tools', '.opencode', 'opencode.json', 'skills',
  'e2e/reporters', 'e2e/validate-suite.mjs',
  'src/app/components/contesters/test-oracle', 'src/app/components/contesters/page-tests', 'src/app/components/contesters/layout-draft',
  'src/app/components/legacy', 'src/app/components/wip', 'src/app/components/xprerimental', 'src/app/components/signals',
  'src/app/components/pipe', 'src/app/components/optimized', 'src/app/submodules',
  'docs/contest/methodology.md', 'docs/contest/dataflow.md', 'docs/contest/README.md', 'docs/reactive_patterns',
];
const WORDS = [/\bdefect\b/i, /page-tests/, /validate-suite/, /contest-reporter/, /methodology/, /OracleConsole/, /contesters\/test-oracle/];

for (const stage of [1, 2, 3]) {
  console.log(`\n== stage ${stage}`);
  const base = join(out, `stage-${stage}`);
  const folder = `src/app/components/contesters/${APPROACH}/stage-${stage}`;
  const make = ['tools/contest/make-base.mjs', APPROACH, String(stage), '--tool', 'Validation tool', '--out', base, '--ref', ref];
  if (stage > 1) make.push('--prev', join(out, `stage-${stage - 1}`, `src/app/components/contesters/${APPROACH}/stage-${stage - 1}`));
  // the implementer's work of the previous stage is the next stage's start
  if (impl && stage === 1) {
    // built below: the impl goes in after the base exists
  }
  const made = sh('node', make, repo);
  check(made.status === 0, `make-base ran${made.status ? `: ${strip(made.stderr).split('\n')[0]}` : ''}`);
  if (made.status !== 0) break;

  // ---- 1. nothing it must not hold ----
  for (const p of MUST_NOT_EXIST) check(!existsSync(join(base, p)), `absent: ${p}`);
  for (const later of [1, 2, 3].filter((n) => n > stage)) check(!existsSync(join(base, `docs/contest/stage-${later}.md`)), `absent: docs/contest/stage-${later}.md`);
  // the implementation under test (the approach's stage folders) is not the base
  const ownCode = `src/app/components/contesters/${APPROACH}/`;
  const files = walk(base).filter((f) => !/package-lock\.json$|\.prompt\.txt$/.test(f) && !relative(base, f).split('\\').join('/').startsWith(ownCode));
  for (const re of WORDS) {
    const hits = files.filter((f) => re.test(readFileSync(f, 'utf8'))).map((f) => relative(base, f));
    check(!hits.length, `no ${re} in the base${hits.length ? ` (${hits.slice(0, 4).join(', ')})` : ''}`);
  }
  // every requirement id mentioned is defined by a stage file the base holds
  const docs = ['spec.md', ...[1, 2, 3].filter((n) => n <= stage).map((n) => `stage-${n}.md`)].map((f) => readFileSync(join(base, 'docs/contest', f), 'utf8')).join('\n');
  const defined = new Set([...docs.matchAll(/\*\*(R-[A-Z]+\d+)\./g)].map((m) => m[1]));
  const mentioned = new Set([...docs.matchAll(/\bR-[A-Z]+\d+\b/g)].map((m) => m[0]));
  const dangling = [...mentioned].filter((id) => !defined.has(id));
  check(!dangling.length, `every requirement id in the docs is defined in them${dangling.length ? ` (${dangling.join(', ')})` : ''}`);
  // the vocabulary of the stage: nothing about errors or retrying before stage 2
  const SHARED = 'src/app/components/contesters/shared';
  const BLOCKS = ['stateful-block', 'generic-error'];
  if (stage < 2) {
    for (const d of BLOCKS) check(!existsSync(join(base, `src/app/components/content/${d}`)), `absent before stage 2: content/${d}`);
    const VOCAB = /retry|stateful|generic-error|\bstale|errorText|retryable|unavailable|\[error\]|\berror\(\)/i;
    const hits = [...walk(join(base, SHARED)), join(base, 'docs/contest/spec.md')]
      .filter((f) => /\.(ts|md)$/.test(f) && !f.endsWith('console-controls.component.ts'))
      .filter((f) => VOCAB.test(readFileSync(f, 'utf8')))
      .map((f) => relative(base, f));
    check(!hits.length, `no error or retry vocabulary in the shared views, their README and the spec${hits.length ? ` (${hits.join(', ')})` : ''}`);
  } else {
    check(existsSync(join(base, 'src/app/components/content/stateful-block')), 'stateful-block present from stage 2');
  }
  check(!existsSync(join(base, 'src/app/components/content/stateful-observable-block')), 'absent: content/stateful-observable-block');
  check(!/@s[12]-/.test(readdirSync(join(base, SHARED)).map((f) => readFileSync(join(base, SHARED, f), 'utf8')).join('\n')), 'no stage markers left in the shared views');

  // the suite in the base: smoke scenarios of this stage and earlier only
  const specText = readdirSync(join(base, 'e2e/specs')).map((f) => readFileSync(join(base, 'e2e/specs', f), 'utf8')).join('\n');
  const scenarios = [...specText.matchAll(/scenario\('(\w+)',\s*(\d),/g)].map((m) => ({ id: m[1], stage: Number(m[2]) }));
  check(scenarios.length > 0 && scenarios.every((s) => s.stage <= stage), `e2e source holds ${scenarios.length} scenarios, none of a later stage`);
  check((specText.match(/smoke: true/g) ?? []).length === scenarios.length, 'every scenario in the base is a smoke scenario');

  // ---- an implementation in the stage folder ----
  const standIn = impl && stage >= 2;
  if (standIn) {
    cpSync(impl, join(base, folder), { recursive: true });
    sh('git', ['add', '-A'], base);
  }

  // ---- 2. it builds and its tests pass ----
  symlinkSync(join(repo, 'node_modules'), join(base, 'node_modules'), 'junction');
  const build = sh('npm', ['run', 'build'], base);
  const warnings = (strip(`${build.stdout}${build.stderr}`).match(/\[WARNING\]/g) ?? []).length;
  check(build.status === 0, `ng build${build.status ? ' failed' : `, ${warnings} warnings`}`);
  // the build only compiles what the page reaches: compile every shared view as well (the stub page uses none)
  writeFileSync(join(base, 'tsconfig.shared.json'), JSON.stringify({ extends: './tsconfig.app.json', files: [], include: ['src/app/components/contesters/shared/**/*.ts', 'src/**/*.d.ts'] }));
  const sharedTsc = sh('npx', ['tsc', '-p', 'tsconfig.shared.json', '--noEmit'], base);
  check(sharedTsc.status === 0, `every shared view compiles${sharedTsc.status ? `: ${strip(sharedTsc.stdout).split('\n').slice(0, 3).join(' | ')}` : ''}`);
  rmSync(join(base, 'tsconfig.shared.json'), { force: true });
  const unit = sh('npm', ['test'], base);
  const unitText = strip(`${unit.stdout}${unit.stderr}`);
  check(unit.status === 0, `npm test: ${unitText.match(/Tests\s+[^\n]*/)?.[0]?.trim() ?? 'failed'}`);

  // ---- 3. the smoke run ----
  const list = sh('npx', ['playwright', 'test', '-c', 'e2e/playwright.config.ts', '--grep', '@smoke', '--list'], base);
  const listed = [...strip(list.stdout).matchAll(/›\s+(\w+) · stage (\d) ·/g)].map((m) => ({ id: m[1], stage: Number(m[2]) }));
  check(listed.length === scenarios.length && listed.every((s) => s.stage <= stage), `smoke lists ${listed.length} scenarios (${[...new Set(listed.map((s) => `s${s.stage}`))].join(', ')}), none of a later stage`);
  if (standIn) {
    const smoke = sh('npm', ['run', 'e2e:smoke'], base, { env: { ...process.env, E2E_BASE_URL: `http://localhost:${4320 + stage}` } });
    const smokeText = strip(`${smoke.stdout}${smoke.stderr}`);
    check(smoke.status === 0, `smoke passes with a working implementation: ${smokeText.match(/\d+ passed[^\n]*/)?.[0] ?? smokeText.match(/\d+ failed[^\n]*/)?.[0] ?? 'no result'}`);
  }
}

console.log(problems.length ? `\nPROBLEMS\n- ${problems.join('\n- ')}` : '\nBases validated.');
process.exit(problems.length ? 1 : 0);
