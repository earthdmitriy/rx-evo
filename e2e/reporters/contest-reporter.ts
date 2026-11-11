import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { E2E_SEED, TARGETS } from '../targets';

type Outcome = 'passed' | 'failed';
/** `check` is set for the two tests of a failure: `view` (error view shown) and `key` (it names the API call). */
type Entry = { id: string; stage: number; check?: string; title: string; outcome: Outcome; message?: string; detail?: string };
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

/** The whole message (diff and call log included), without colours. */
const fullText = (text?: string) => (text ?? '').replace(/\u001b\[[0-9;]*m/g, '').trimEnd();

/** ✅ met · ❌ missing (required, failed) · 🎁 free (ahead, passed) · · not yet (ahead, failed). */
export const mark = (targetStage: number, testStage: number, outcome?: Outcome) =>
  !outcome ? '' : testStage <= targetStage ? (outcome === 'passed' ? '✅' : '❌') : outcome === 'passed' ? '🎁' : '·';

/** The label of an entry: its id, and the check of a failure's second test. */
const labelOf = (e: Entry) => (e.check ? `${e.id} · ${e.check}` : e.id);

/**
 * Contest report (docs/contest/methodology.md §3, §5). Keeps the latest result
 * of every target in contest-results.json (a target's results are replaced by the
 * latest run, so a filtered run cannot leave old entries behind) and renders contest-report.md:
 * a matrix of scenario × target and, per target, met / missing / free.
 */
export default class ContestReporter implements Reporter {
  private readonly runs = new Map<string, Record<string, Entry>>();

  onTestEnd(test: TestCase, result: TestResult) {
    const project = test.parent.project()?.name ?? 'default';
    const tag = test.tags.find((t) => /^@s\d$/.test(t));
    const stage = tag ? Number(tag.slice(2)) : 1;
    const [id] = test.title.split(' · ');
    const check = /· error (view|key)$/.exec(test.title)?.[1];
    const outcome: Outcome = result.status === 'passed' ? 'passed' : 'failed';
    const key = `${id} s${stage}${check ? ` ${check}` : ''}`;
    const runs = this.runs.get(project) ?? {};
    const failed = outcome === 'failed';
    runs[key] = {
      id,
      stage,
      check,
      title: test.title,
      outcome,
      message: failed ? firstLine(result.error?.message) : undefined,
      detail: failed ? fullText(result.error?.message) : undefined,
    };
    this.runs.set(project, runs);
  }

  onEnd(_: FullResult) {
    const store = read();
    for (const [project, results] of this.runs) {
      const target = TARGETS.find((t) => t.id === project) ?? { stage: 3 };
      store[project] = { stage: target.stage, at: new Date().toISOString(), results };
    }
    mkdirSync(dirname(JSON_PATH), { recursive: true });
    writeFileSync(JSON_PATH, JSON.stringify(store, null, 2));
    writeFileSync(MD_PATH, render(store));
  }
}

const render = (store: Store): string => {
  const targets = Object.keys(store).sort();
  const entries = [...new Set(targets.flatMap((t) => Object.keys(store[t].results)))].map((k) => {
    const found = targets.map((t) => store[t].results[k]).find(Boolean);
    return { k, entry: found! };
  });
  entries.sort((a, b) => a.entry.id.localeCompare(b.entry.id, undefined, { numeric: true }) || a.entry.stage - b.entry.stage || (a.entry.check ?? '').localeCompare(b.entry.check ?? ''));
  const title = (e: Entry) => e.title.split(' · ')[2] ?? '';

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
  for (const { k, entry } of entries) {
    lines.push(`| ${labelOf(entry)} | ${entry.stage} | ${title(entry)} | ${targets.map((t) => mark(store[t].stage, entry.stage, store[t].results[k]?.outcome)).join(' | ')} |`);
  }
  lines.push('');

  lines.push('## Missing', '');
  for (const t of targets) {
    const missing = Object.values(store[t].results).filter((r) => r.stage <= store[t].stage && r.outcome === 'failed');
    if (!missing.length) continue;
    lines.push(`### ${t}`, '');
    for (const r of missing) lines.push(`- **${labelOf(r)} s${r.stage}** ${title(r)}: ${r.message ?? ''}`);
    lines.push('');
  }
  return lines.join('\n');
};
