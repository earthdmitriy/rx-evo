// Builds the contest base of one approach and stage (methodology §6.2): a
// fresh single-commit repository with what an implementer may see, and
// nothing else. The prompt for the implementer is written next to it.
//
//   node tools/contest/make-base.mjs <approach> <stage> --tool "<TOOL>" --out <dir>
//        [--prev <dir>]    a finished stage-(n-1) folder of this approach (stages 2-3)
//        [--docs <dir>]    snapshot of the tool's docs, copied to docs-vendor/<approach>/
//        [--ref <ref>]     commit of this repo to build from (default HEAD)
//        [--verify]        ng build and the list of its smoke scenarios
//
// What the base contains:
//  - the app shell, the shared views, the fake backend and the harness;
//  - docs/contest/spec.md and stage-1.md … stage-<n>.md, no other doc;
//  - e2e with the SMOKE scenarios of stages 1…n only, as source and as run;
//  - the stage folder (a stub for stage 1, a copy of the previous stage after).
// Not in it: the reference, the page tests, the other approaches and
// samples, the evaluator docs and tools, the report, the later stages' tests.
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'));
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const [approach, stageArg] = positional;
const stage = Number(stageArg);
const tool = opt('tool');
const out = opt('out') && resolve(opt('out'));
if (!approach || ![1, 2, 3].includes(stage) || !tool || !out) {
  console.error('usage: node tools/contest/make-base.mjs <approach> <stage 1-3> --tool "<TOOL>" --out <dir> [--prev <dir>] [--docs <dir>] [--ref <ref>] [--verify]');
  process.exit(2);
}
const ref = opt('ref') ?? 'HEAD';
const prev = opt('prev') && resolve(opt('prev'));
const docs = opt('docs') && resolve(opt('docs'));
const verify = args.includes('--verify');
const repo = resolve(import.meta.dirname, '../..');

const run = (cmd, cmdArgs, cwd, extra = {}) => {
  const r = spawnSync(cmd, cmdArgs, { cwd, encoding: 'utf8', shell: process.platform === 'win32' && cmd === 'npm', ...extra });
  if (r.status !== 0) {
    console.error(`${cmd} ${cmdArgs.join(' ')} failed\n${r.stdout ?? ''}${r.stderr ?? ''}`);
    process.exit(1);
  }
  return r.stdout;
};
const read = (p) => readFileSync(join(out, p), 'utf8');
const write = (p, text) => {
  mkdirSync(dirname(join(out, p)), { recursive: true });
  writeFileSync(join(out, p), text);
};
const remove = (p) => rmSync(join(out, p), { recursive: true, force: true });

// ---------- 1. the files of the ref, without history ----------

if (existsSync(out) && readdirSync(out).length) {
  console.error(`${out} is not empty`);
  process.exit(1);
}
mkdirSync(out, { recursive: true });
const tar = join(out, '..', `base-${Date.now()}.tar`);
let source = ref;
if (ref === 'WORKTREE') {
  // the working tree as it is (tracked and new files), without touching the repo's index or history
  const index = join(out, '..', `index-${Date.now()}`);
  const env = { ...process.env, GIT_INDEX_FILE: index };
  run('git', ['add', '-A'], repo, { env });
  source = run('git', ['write-tree'], repo, { env }).trim();
  rmSync(index, { force: true });
}
run('git', ['archive', '--format=tar', '-o', tar, source], repo);
run('tar', ['-xf', relative(out, tar).split('\\').join('/')], out); // relative: GNU tar reads 'C:' as a host
rmSync(tar);

// ---------- 2. remove what an implementer must not see ----------

const REMOVE = [
  // evaluator material
  'AGENTS.md', 'TODO.md', 'opencode.json', '.opencode', 'skills', 'tools', 'docs', 'README.md',
  'e2e/reporters', 'e2e/validate-suite.mjs',
  'src/app/components/contesters/reference', 'src/app/components/contesters/page-tests', 'src/app/components/contesters/layout-draft',
  // other samples and their machinery
  ...['legacy', 'optimized', 'pipe', 'signals', 'wip', 'xprerimental'].map((g) => `src/app/components/${g}`),
  'src/app/services/tinyStore', 'src/app/services/resource', 'src/app/services/rx-utils.ts',
  'src/app/app.component.spec.ts', 'src/app/app.component.dataflow.md', 'src/app/directives', 'src/app/utils',
  ...(approach === 'stateful-observable' ? [] : ['src/app/submodules', '.gitmodules']),
];
for (const p of REMOVE) remove(p);
// the specs of removed code (the backend spec stays)
const dropSpecs = (dir) => {
  for (const n of readdirSync(join(out, dir))) {
    const p = `${dir}/${n}`;
    if (statSync(join(out, p)).isDirectory()) dropSpecs(p);
    else if (n.endsWith('.spec.ts') && !p.includes('services/contesters/')) remove(p);
  }
};
dropSpecs('src');

// ---------- 3. docs: the spec and the stage files up to this stage ----------

mkdirSync(join(out, 'docs/contest'), { recursive: true });
for (const f of ['spec.md', ...[1, 2, 3].filter((n) => n <= stage).map((n) => `stage-${n}.md`)]) {
  cpSync(join(repo, 'docs/contest', f), join(out, 'docs/contest', f));
}
// the spec may only point at files that exist here
if (docs) cpSync(docs, join(out, 'docs-vendor', approach), { recursive: true });

// ---------- 3b. the vocabulary of the stage: nothing about errors before stage 2 ----------
//
// The shared views and docs carry the vocabulary of later stages behind
// markers; a base keeps only what its stage may know:
//   `// @s2-begin` … `// @s2-end` (also `<!-- … -->`)  dropped before stage 2
//   `@s2-line`                                          line dropped before stage 2
//   `@s1-line`                                          line dropped from stage 2 on
//   `<!-- @s1-alt … -->`                                what a stage-1 base shows in place of the stage-2 lines before it
//   `@s2-narrow`                                        `| 'error'` leaves the line before stage 2
// Before stage 2 a few attributes are dropped as well (they only exist on
// parts that can fail), and the blocks that show errors are not shipped.

const dropUntilStage2 = (text) => {
  let t = text.replace(/^[^\n]*@s2-begin[^\n]*\n[\s\S]*?^[^\n]*@s2-end[^\n]*\n/gm, '');
  t = t
    .split('\n')
    .filter((l) => !l.includes('@s2-line'))
    .map((l) => (l.includes('@s2-narrow') ? l.replace(/ \| '(?:stale-)?error'/g, '') : l))
    .join('\n');
  return t;
};
const cleanMarkers = (text) =>
  text
    .replace(/^[^\n]*@s2-(?:begin|end)[^\n]*\n/gm, '')
    .replace(/ *(?:\/\/|<!--) *@(?:s1-line|s2-line|s2-narrow) *(?:-->)?/g, '');
/** `<!-- @s1-alt … -->` holds the text a stage-1 base shows in place of the stage-2 lines before it. */
const S1_ALT = /<!-- @s1-alt\n([\s\S]*?)\n-->\n?/g;
const forStage = (raw) => {
  const text = raw.replace(/\r\n/g, '\n'); // the archive may carry CRLF
  const staged = stage < 2 ? dropUntilStage2(text).replace(S1_ALT, '$1\n') : text.replace(S1_ALT, '').split('\n').filter((l) => !l.includes('@s1-line')).join('\n');
  return cleanMarkers(staged);
};
const FRAGMENTS_BEFORE_STAGE_2 = [
  / \(retry\)="[^"]*"/g,
  / \[retryable\]="true"/g,
  / errorText="[^"]*"/g,
  /imports: \[GenericErrorComponent\]/g,
  /GenericErrorComponent, /g,
  /, GenericErrorComponent/g,
];
/** The Retry outputs listed in the shared README's table. */
const README_RETRY_TOKENS = [/, `retry[A-Za-z]*(?:: \w+)?`/g, /`retry[A-Za-z]*(?:: \w+)?`, /g];
const walkFiles = (dir) =>
  readdirSync(join(out, dir)).flatMap((n) => {
    const p = `${dir}/${n}`;
    return statSync(join(out, p)).isDirectory() ? walkFiles(p) : [p];
  });
for (const p of [...walkFiles('src/app/components/contesters/shared'), ...walkFiles('e2e/support'), 'docs/contest/spec.md']) {
  if (!/\.(ts|md)$/.test(p)) continue;
  let text = forStage(read(p));
  if (stage < 2 && p.startsWith('src/app/components/contesters/shared/') && p.endsWith('.ts')) {
    for (const re of FRAGMENTS_BEFORE_STAGE_2) text = text.replace(re, '');
  }
  if (stage < 2 && p === 'src/app/components/contesters/shared/README.md') {
    for (const re of README_RETRY_TOKENS) text = text.replace(re, '');
    text = text.replace(/\| `retry[A-Za-z]*` \|/g, '| — |'); // a cell that had only a Retry output
  }
  write(p, text);
}
// sample-app components that have nothing to do with the support console
for (const dir of ['client-bucket', 'client-info', 'client-skeleton', 'clients-filter-form']) remove(`src/app/components/content/${dir}`);
if (stage < 2) {
  // blocks that show errors, and the error alert they use, belong to stage 2
  for (const dir of ['stateful-block', 'stateful-observable-block', 'generic-error']) remove(`src/app/components/content/${dir}`);
} else {
  remove('src/app/components/content/stateful-observable-block'); // library-specific, not the contest's
}

// ---------- 4. the stage folder and its route ----------

const folder = `src/app/components/contesters/${approach}/stage-${stage}`;
if (stage > 1) {
  if (!prev || !existsSync(prev)) {
    console.error(`stage ${stage} starts from the finished stage ${stage - 1}: pass --prev <its folder>`);
    process.exit(1);
  }
  cpSync(prev, join(out, `src/app/components/contesters/${approach}/stage-${stage - 1}`), { recursive: true });
  cpSync(prev, join(out, folder), { recursive: true });
}
if (!existsSync(join(out, folder, 'console-page.component.ts'))) {
  write(
    `${folder}/console-page.component.ts`,
    `import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Root of the ${tool} implementation, stage ${stage} (docs/contest/spec.md §2.4). */
@Component({
  selector: 'app-console-page',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsolePageComponent {}
`,
  );
}
if (!existsSync(join(out, folder, 'README.md'))) write(`${folder}/README.md`, `# ${tool} · stage ${stage}\n`);

const stages = [1, 2, 3].filter((n) => n <= stage);
const routeEntry = (n) => `      sampleRoute(
        '${approach}/stage-${n}',
        () =>
          import('./components/contesters/${approach}/stage-${n}/console-page.component').then(
            (m) => m.ConsolePageComponent,
          ),
        {
          title: '${tool} · stage ${n}',
          summary: 'Support console on ${tool}, stage ${n}.',
          verdict: 'experimental',
          scenario: 'dashboard',
          layout: 'wide',
          tags: ['${tool}'],
          folder: 'contesters/${approach}/stage-${n}',
          readme: () =>
            import('./components/contesters/${approach}/stage-${n}/README.md').then(
              (m) => m.default,
            ),
        },
      ),`;
write(
  'src/app/app.routes.ts',
  `import { Routes } from '@angular/router';
import { groupRoute, sampleRoute } from './samples/sample-meta';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: 'Contest base',
    loadComponent: () =>
      import('./layout/home/home.component').then((m) => m.HomeComponent),
  },

  groupRoute(
    'contesters',
    {
      title: 'Contesters',
      blurb: 'The support console on one data layer.',
    },
    [
${stages.filter((n) => n === stage || existsSync(join(out, `src/app/components/contesters/${approach}/stage-${n}`))).map(routeEntry).join('\n')}
    ],
  ),

  { path: '**', redirectTo: '' },
];
`,
);

// ---------- 5. e2e: the smoke scenarios up to this stage, a plain reporter ----------

write(
  'e2e/targets.ts',
  `/** The page under test (the base holds one approach and stage). */
export type Target = {
  id: string;
  approach: string;
  stage: 1 | 2 | 3;
  path: string;
};

export const TARGETS: Target[] = [
  { id: '${approach}/stage-${stage}', approach: '${approach}', stage: ${stage}, path: '/contesters/${approach}/stage-${stage}' },
];

export const selectedTargets = (): Target[] => TARGETS;

export const E2E_SEED = Number(process.env['E2E_SEED'] ?? 1);
`,
);
write(
  'e2e/playwright.config.ts',
  `import { defineConfig } from '@playwright/test';
import { selectedTargets } from './targets';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './specs',
  outputDir: './.results',
  fullyParallel: false,
  workers: 1,
  timeout: 10_000,
  expect: { timeout: 3_000 },
  reporter: [['list']],
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: selectedTargets().map((target) => ({ name: target.id, use: { target } })),
  webServer: {
    command: \`npm start -- --port \${new URL(baseURL).port || 4200}\`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
`,
);
// the harness knows nothing of switches the evaluator uses
write('e2e/support/console.ts', read('e2e/support/console.ts').replace(/\n\s*const defect = [^\n]*\n/, '\n').replace('${defect}', ''));

const parse = (text) => ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true);
const isDeclaration = (s) => ts.isVariableStatement(s) || ts.isFunctionDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isClassDeclaration(s) || ts.isInterfaceDeclaration(s);
const declaredNames = (s) =>
  ts.isVariableStatement(s)
    ? s.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [d.name.text] : d.name.elements.map((e) => e.name.getText())))
    : s.name
      ? [s.name.text]
      : [];
const used = (name, text) => new RegExp(`\\b${name.replace(/\$/g, '\\$')}\\b`).test(text);

/** A scenario call: `{ stage, smoke }` when the statement is one. */
const scenarioOf = (s) => {
  if (!ts.isExpressionStatement(s) || !ts.isCallExpression(s.expression) || s.expression.expression.getText() !== 'scenario') return null;
  const [, st, , , options] = s.expression.arguments;
  const smoke = !!options && ts.isObjectLiteralExpression(options) && options.properties.some((p) => p.name?.getText() === 'smoke' && p.initializer.kind === ts.SyntaxKind.TrueKeyword);
  return { stage: st && ts.isNumericLiteral(st) ? Number(st.text) : 99, smoke };
};

/**
 * Keeps what is needed by `keep` and drops the rest: statements failing
 * `keep`, then declarations and imports nothing uses. Leading comments go
 * with their statements (they name later stages).
 */
const prune = (text, keep, others = '') => {
  const sf = parse(text);
  let stmts = [...sf.statements].filter((s) => ts.isImportDeclaration(s) || keep(s));
  for (let changed = true; changed; ) {
    changed = false;
    for (const s of stmts) {
      if (!isDeclaration(s)) continue;
      const rest = stmts.filter((x) => x !== s).map((x) => x.getText()).join('\n') + others;
      if (!declaredNames(s).some((n) => used(n, rest))) {
        stmts = stmts.filter((x) => x !== s);
        changed = true;
      }
    }
  }
  const body = stmts.filter((s) => !ts.isImportDeclaration(s)).map((s) => s.getText()).join('\n');
  const imports = stmts
    .filter(ts.isImportDeclaration)
    .map((s) => {
      const clause = s.importClause;
      const from = s.moduleSpecifier.getText();
      if (!clause) return `import ${from};`;
      const names = clause.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements.filter((e) => used(e.name.text, body + others)) : [];
      const def = clause.name && used(clause.name.text, body + others) ? clause.name.text : '';
      if (!names.length && !def) return '';
      const parts = [def, names.length ? `{ ${names.map((e) => e.getText()).join(', ')} }` : ''].filter(Boolean).join(', ');
      return `import ${clause.isTypeOnly ? 'type ' : ''}${parts} from ${from};`;
    })
    .filter(Boolean);
  return { text: `${[...imports, '', ...body.split('\n\n')].join('\n').trim()}\n`, empty: !stmts.some((s) => scenarioOf(s) || (!isDeclaration(s) && !ts.isImportDeclaration(s))) };
};

const specs = readdirSync(join(out, 'e2e/specs')).filter((f) => f.endsWith('.spec.ts'));
let allSpecs = '';
for (const f of specs) {
  const { text, empty } = prune(read(`e2e/specs/${f}`), (s) => {
    const sc = scenarioOf(s);
    if (sc) return sc.smoke && sc.stage <= stage;
    return isDeclaration(s); // helpers stay while something uses them
  });
  if (empty) remove(`e2e/specs/${f}`);
  else {
    write(`e2e/specs/${f}`, text);
    allSpecs += text;
  }
}
// the shared flows: only what the remaining specs use
{
  const flows = prune(read('e2e/support/flows.ts'), () => true, allSpecs + read('e2e/support/console.ts'));
  write('e2e/support/flows.ts', flows.text);
}

// ---------- 6. package.json, a README, the docs of the tool ----------

const pkg = JSON.parse(read('package.json'));
pkg.scripts = { ng: 'ng', start: 'ng serve', build: 'ng build', test: 'ng test --watch=false', e2e: 'playwright test -c e2e/playwright.config.ts', 'e2e:smoke': 'playwright test -c e2e/playwright.config.ts --grep @smoke' };
write('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
write('README.md', `# Contest base: ${tool}, stage ${stage}\n\nRead docs/contest/spec.md and the stage files in docs/contest/.\n`);
write('.gitignore', `${read('.gitignore')}\n/e2e/.results\n/e2e/report\n`);

// ---------- 7. one clean commit ----------

const exploreList = ['docs/contest', 'src/app/components/contesters/shared', 'src/app/services/contesters', 'e2e', folder, ...(docs ? [`docs-vendor/${approach}`] : [])];
run('git', ['init', '-q', '-b', 'contest-base'], out);
run('git', ['add', '-A'], out);
run('git', ['-c', 'user.name=contest', '-c', 'user.email=contest@localhost', 'commit', '-q', '-m', `contest base: ${approach} stage ${stage}`], out);
const base = run('git', ['rev-parse', 'HEAD'], out).trim();

const prompt = `read docs/contest/spec.md and docs/contest/stage-1.md … stage-${stage}.md
and implement stage ${stage} of the page
approach: ${approach}
use ${tool} to handle dataflow
you can explore only folders: ${exploreList.join(', ')}
forbidden to change: ${['src/app/services/contesters', 'src/app/components/contesters/shared', 'e2e', 'docs', 'src/app/layout', 'src/app/app.component.*', 'tsconfig*.json', 'angular.json'].join(', ')}
`;
writeFileSync(`${out}.prompt.txt`, prompt);
console.log(`base: ${out}\ncommit: ${base}\nprompt: ${out}.prompt.txt\n\n${prompt}`);

// ---------- 8. optional: does the base itself work? ----------

if (verify) {
  console.log('verifying: ng build and the list of smoke scenarios');
  // same dependencies as this repo: link them instead of installing again
  symlinkSync(join(repo, 'node_modules'), join(out, 'node_modules'), 'junction');
  run('npm', ['run', 'build'], out, { stdio: 'inherit' });
  const list = run('npx', ['playwright', 'test', '-c', 'e2e/playwright.config.ts', '--grep', '@smoke', '--list'], out, { shell: process.platform === 'win32' });
  console.log(list.split('\n').slice(0, 30).join('\n'));
}
