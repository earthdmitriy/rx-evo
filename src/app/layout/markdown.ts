import { marked } from 'marked';

/** Kinds of README sections the notes panel knows how to style. */
export type SectionKind = 'warning' | 'idea' | 'good' | 'bad' | 'try' | 'next' | 'other';

export type MarkdownSection = {
  kind: SectionKind;
  heading: string;
  html: string;
};

const KIND_BY_HEADING: Record<string, SectionKind> = {
  warning: 'warning',
  idea: 'idea',
  good: 'good',
  bad: 'bad',
  'try it': 'try',
  'next step': 'next',
};

const ORDER: SectionKind[] = ['warning', 'idea', 'good', 'bad', 'try', 'next', 'other'];

export const renderMarkdown = (md: string): string =>
  marked.parse(md, { async: false, gfm: true });

/**
 * Splits a sample README on `## ` headings (see docs/sample-description.md).
 * Text before the first `##` (the `# Title`) is dropped.
 */
export const splitSections = (md: string): MarkdownSection[] =>
  md
    .replace(/\r\n/g, '\n')
    .split(/^## +/m)
    .slice(1)
    .map((chunk) => {
      const [first, ...rest] = chunk.split('\n');
      const heading = first.trim();
      return {
        heading,
        kind: KIND_BY_HEADING[heading.toLowerCase()] ?? 'other',
        html: renderMarkdown(rest.join('\n').trim()),
      };
    })
    .filter((s) => s.html.trim().length > 0)
    .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));

/** Code of every ```mermaid block in a markdown document. */
export const extractMermaid = (md: string): string[] =>
  [...md.replace(/\r\n/g, '\n').matchAll(/```mermaid\n([\s\S]*?)```/g)].map(
    (m) => m[1].trim(),
  );
