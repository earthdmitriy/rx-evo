import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { E2E_SEED, TARGETS } from '../targets';

type Outcome = 'passed' | 'failed';
type Entry = { id: string; stage: number; title: string; outcome: Outcome; message?: string };
type Store = Record<string, { stage: number; at: string; results: Record<string, Entry> }>;

const DIR = join(__dirname, '..', 'report');
const JSON_PATH = join(DIR, 'contest-results.json');
const MD_PATH = join(DIR, 'contest-report.md');

const read = (): Store => {
  try {
    return JSON.parse(readFileSync(JSON_PATH, 'utf8'));
  } catch {
    return {};
  }
};

const firstLine = (text?: string) =>
  (text ?? '')
    .replace(/\u001b\[[0-9;]*m/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join(' ')
    .slice(0, 160);

/** ✅ met · ❌ missing (required, failed) · 🎁 free (ahead, passed) · · not yet (ahead, failed). */
export const mark = (targetStage: number, testStage: number, outcome?: Outcome) =>
  !outcome ? '' : testStage <= targetStage ? (outcome === 'passed' ? '✅' : '❌') : outcome === 'passed' ? '🎁' : '·';

/**
 * Contest report (docs/contest/methodology.md §3, §5). Keeps the latest result
 * of every target in contest-results.json and renders contest-report.md:
 * a matrix of scenario × target and, per target, met / missing / free.
 */
export default class ContestReporter implements Reporter {
  private readonly runs = new Map<string, Record<string, Entry>>();

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name ?? 'default';
    const tag = test.tags.find((t) => /^@s\d$/.test(t));
    const stage = tag ? Number(tag.slice(2)) : 1;
    const [id] = test.title.split(' · ');
    const outcome: Outcome = result.status === 'passed' ? 'passed' : 'failed';
    const key = `${id} s${stage}`;
    const runs = this.runs.get(project) ?? {};
    runs[key] = { id, stage, title: test.title, outcome, message: outcome === 'failed' ? firstLine(result.error?.message) : undefined };
    this.runs.set(project, runs);
  }

  onEnd(_: FullResult) {
    const store = read();
    for (const [project, results] of this.runs) {
      const target = TARGETS.find((t) => t.id === project) ?? { stage: 3 };
      store[project] = { stage: target.stage, at: new Date().toISOString(), results: { ...(store[project]?.results ?? {}), ...results } };
    }
    mkdirSync(dirname(JSON_PATH), { recursive: true });
    writeFileSync(JSON_PATH, JSON.stringify(store, null, 2));
    writeFileSync(MD_PATH, render(store));
  }
}

const render = (store: Store): string => {
  const targets = Object.keys(store).sort();
  const keys = [...new Set(targets.flatMap((t) => Object.keys(store[t].results)))].sort((a, b) => {
    const [ia, sa] = a.split(' s');
    const [ib, sb] = b.split(' s');
    return ia.localeCompare(ib, undefined, { numeric: true }) || Number(sa) - Number(sb);
  });
  const title = (k: string) => targets.map((t) => store[t].results[k]?.title).find(Boolean)?.split(' · ')[2] ?? '';

  const lines: string[] = [];
  lines.push('# Contest report', '');
  lines.push(`Seed ${E2E_SEED}. ✅ met · ❌ missing · 🎁 free (passes before its stage) · · not yet.`, '');

  lines.push('## Summary', '', '| Target | Claims stage | Stage 1 | Stage 2 | Stage 3 | Missing | Free |', '| --- | --- | --- | --- | --- | --- | --- |');
  for (const t of targets) {
    const { stage, results } = store[t];
    const per = [1, 2, 3].map((s) => {
      const of = Object.values(results).filter((r) => r.stage === s);
      return `${of.filter((r) => r.outcome === 'passed').length}/${of.length}`;
    });
    const missing = Object.values(results).filter((r) => r.stage <= stage && r.outcome === 'failed').length;
    const free = Object.values(results).filter((r) => r.stage > stage && r.outcome === 'passed').length;
    lines.push(`| ${t} | ${stage} | ${per.join(' | ')} | ${missing} | ${free} |`);
  }
  lines.push('');

  lines.push('## Matrix', '', `| Scenario | Stage | | ${targets.join(' | ')} |`, `| --- | --- | --- | ${targets.map(() => '---').join(' | ')} |`);
  for (const k of keys) {
    const [id, s] = k.split(' s');
    lines.push(`| ${id} | ${s} | ${title(k)} | ${targets.map((t) => mark(store[t].stage, Number(s), store[t].results[k]?.outcome)).join(' | ')} |`);
  }
  lines.push('');

  lines.push('## Missing', '');
  for (const t of targets) {
    const missing = Object.values(store[t].results).filter((r) => r.stage <= store[t].stage && r.outcome === 'failed');
    if (!missing.length) continue;
    lines.push(`### ${t}`, '');
    for (const r of missing) lines.push(`- **${r.id} s${r.stage}** ${r.title.split(' · ')[2]}: ${r.message ?? ''}`);
    lines.push('');
  }
  return lines.join('\n');
};
