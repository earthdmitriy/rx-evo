// Code metrics of one contest stage, and growth between two stages
// (docs/contest/methodology.md §4.1, §4.2). Measured, not judged: plumbing
// lines and cognitive complexity need review / ESLint and are not counted here.
//
//   node tools/contest/metrics.mjs <stage-folder>
//   node tools/contest/metrics.mjs <stage-folder-a> <stage-folder-b>   (growth a → b)
//   add --json for machine-readable output
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import * as prettier from 'prettier';

const args = process.argv.slice(2).filter((a) => a !== '--json');
const asJson = process.argv.includes('--json');

const files = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });

const format = async (path, text) => {
  try {
    return await prettier.format(text, { filepath: path });
  } catch {
    return text;
  }
};

/** Non-blank lines without comments. */
const codeLines = (text) => {
  let inBlock = false;
  return text.split('\n').filter((raw) => {
    let line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) {
        inBlock = false;
        line = line.slice(line.indexOf('*/') + 2).trim();
      } else return false;
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      return false;
    }
    if (line.startsWith('//') || line.startsWith('*') || line.startsWith('<!--')) return false;
    return line.length > 0;
  });
};

const TEMPLATE_WIRING = /\|\s*async|@if|@switch|@case|\[state\]|State\(\)|\.state\b/;

const measure = async (dir) => {
  const all = files(dir);
  const ts = all.filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'));
  const html = all.filter((f) => f.endsWith('.html'));
  const out = { folder: dir, lines: 0, templateWiring: 0, concepts: new Set(), imperativeWriters: 0, manualSubscribe: 0, files: ts.length + html.length };
  for (const f of ts) {
    const formatted = await format(f, readFileSync(f, 'utf8'));
    // inline templates are counted as templates (wiring), not as code lines
    const inlineTemplate = /template: `([\s\S]*?)`,?\n/g;
    for (const [, tpl] of formatted.matchAll(inlineTemplate)) out.templateWiring += codeLines(tpl).filter((l) => TEMPLATE_WIRING.test(l)).length;
    const lines = codeLines(formatted.replace(inlineTemplate, ''));
    out.lines += lines.length;
    const text = lines.join('\n');
    for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^.'"][^'"]*)['"]/g)) {
      const pkg = m[2];
      if (!/^(rxjs|@angular\/core|@ngrx|@tanstack|.*stateful-observable)/.test(pkg)) continue;
      m[1].split(',').map((s) => s.trim().replace(/^type\s+/, '')).filter(Boolean).forEach((name) => out.concepts.add(`${pkg}:${name}`));
    }
    out.imperativeWriters += (text.match(/\.(next|set|update)\(|patchState\(/g) ?? []).length;
    out.manualSubscribe += (text.match(/\.subscribe\(/g) ?? []).length;
  }
  for (const f of html) {
    const lines = codeLines(readFileSync(f, 'utf8'));
    out.templateWiring += lines.filter((l) => TEMPLATE_WIRING.test(l)).length;
  }
  return { ...out, concepts: [...out.concepts].sort() };
};

const growth = (a, b, linesA) => {
  const res = spawnSync('git', ['diff', '--no-index', '--numstat', '-w', '-M', a, b], { encoding: 'utf8' });
  let added = 0;
  let removed = 0;
  const touched = [];
  for (const line of res.stdout.split('\n').filter(Boolean)) {
    const [ad, rm, path] = line.split('\t');
    added += Number(ad) || 0;
    removed += Number(rm) || 0;
    touched.push(path);
  }
  return { added, removed, filesTouched: touched.length, rewriteRatio: linesA ? +(removed / linesA).toFixed(2) : 0 };
};

const [a, b] = args;
if (!a) {
  console.error('usage: node tools/contest/metrics.mjs <stage-folder> [<next-stage-folder>] [--json]');
  process.exit(2);
}
const ma = await measure(a);
const report = { stage: ma };
if (b) {
  report.next = await measure(b);
  report.growth = growth(a, b, ma.lines);
}

if (asJson) console.log(JSON.stringify(report, null, 2));
else {
  const row = (m) => `| ${relative(process.cwd(), m.folder)} | ${m.lines} | ${m.templateWiring} | ${m.concepts.length} | ${m.imperativeWriters} | ${m.manualSubscribe} |`;
  console.log('| Folder | Lines | Template wiring | Concepts | Imperative writers | Manual subscribe |');
  console.log('| --- | --- | --- | --- | --- | --- |');
  console.log(row(ma));
  if (report.next) console.log(row(report.next));
  if (report.growth) {
    const g = report.growth;
    console.log(`\nGrowth: +${g.added} −${g.removed} lines, ${g.filesTouched} files, rewrite ratio ${g.rewriteRatio}`);
  }
  console.log(`\nConcepts: ${ma.concepts.join(', ')}`);
  console.log('Not measured here: plumbing share (review checklist), cognitive complexity (eslint sonarjs).');
}
