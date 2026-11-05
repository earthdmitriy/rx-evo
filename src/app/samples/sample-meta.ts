import { Type } from '@angular/core';
import { ActivatedRouteSnapshot, Route, Routes } from '@angular/router';

/**
 * Sample metadata lives in the router config (route `data`), not in the
 * sample components, so that sample code stays short and readable.
 *
 * - Short, structured facts (title, verdict, tags…) → `SampleMeta`.
 * - Long-form explanation → `README.md` next to the sample, loaded lazily,
 *   written with the section template from `docs/sample-description.md`.
 */

/** How close a sample is to the target architecture. */
export type SampleVerdict =
  | 'anti-pattern'
  | 'leaky'
  | 'getting-there'
  | 'target'
  | 'experimental';

/** Which demo screen the sample renders (decides which controls are shown). */
export type SampleScenario = 'client-card' | 'list' | 'auth';

export type DocLink = {
  label: string;
  /** Repo-relative path, e.g. `docs/reactive_patterns/entity-card.md`. */
  path: string;
};

export type SampleMeta = {
  title: string;
  /** One sentence shown under the title and on the index page. */
  summary: string;
  verdict: SampleVerdict;
  scenario: SampleScenario;
  /** Primitives / APIs the sample is built from. */
  tags: string[];
  /** Folder under `src/app/components/`, used for the "source" link. */
  folder: string;
  /** Lazy `README.md` (raw markdown text). */
  readme: () => Promise<string>;
  /** Lazy `*.component.dataflow.md` (raw markdown with mermaid blocks). */
  dataflow?: () => Promise<string>;
  /** Related scenario docs. */
  docs?: DocLink[];
};

export type SampleGroupMeta = {
  title: string;
  /** One sentence about the stage this group represents. */
  blurb: string;
};

export type SampleRouteData = { sample: SampleMeta };
export type GroupRouteData = { group: SampleGroupMeta };

export const REPO_URL = 'https://github.com/earthdmitriy/rx-evo';
export const repoBlob = (path: string) => `${REPO_URL}/blob/master/${path}`;
export const repoTree = (path: string) => `${REPO_URL}/tree/master/${path}`;

export const VERDICTS: Record<
  SampleVerdict,
  { label: string; badge: string; hint: string }
> = {
  'anti-pattern': {
    label: 'Anti-pattern',
    badge: 'badge-bad',
    hint: 'Shows what breaks. Do not copy.',
  },
  leaky: {
    label: 'Works, but leaky',
    badge: 'badge-warn',
    hint: 'Fixes one problem, keeps the imperative shape.',
  },
  'getting-there': {
    label: 'Getting there',
    badge: 'badge-info',
    hint: 'Declarative data flow with remaining rough edges.',
  },
  target: {
    label: 'Target',
    badge: 'badge-good',
    hint: 'The recommended shape.',
  },
  experimental: {
    label: 'Experimental',
    badge: 'badge-accent',
    hint: 'Target primitives applied to harder screens.',
  },
};

/** Declares a sample route. Keeps `app.routes.ts` one block per sample. */
export const sampleRoute = (
  path: string,
  loadComponent: () => Promise<Type<unknown>>,
  sample: SampleMeta,
): Route => ({
  path,
  title: `${sample.title} · rx-evo`,
  loadComponent,
  data: { sample } satisfies SampleRouteData,
});

/** Declares a group of samples (one folder under `components/`). */
export const groupRoute = (
  path: string,
  group: SampleGroupMeta,
  children: Route[],
): Route => ({
  path,
  data: { group } satisfies GroupRouteData,
  children,
});

/* ---------- reading the config back (sidebar, index, pager) ---------- */

export type SampleEntry = SampleMeta & { url: string; step: number };
export type GroupEntry = SampleGroupMeta & {
  url: string;
  step: number;
  samples: SampleEntry[];
};

/** Flattens the router config into the ordered catalog of samples. */
export const collectGroups = (routes: Routes): GroupEntry[] => {
  let sampleStep = 0;
  return routes
    .filter((r) => (r.data as GroupRouteData | undefined)?.group)
    .map((r, idx) => ({
      ...(r.data as GroupRouteData).group,
      url: `/${r.path}`,
      step: idx + 1,
      samples: (r.children ?? [])
        .filter((c) => (c.data as SampleRouteData | undefined)?.sample)
        .map((c) => ({
          ...(c.data as SampleRouteData).sample,
          url: `/${r.path}/${c.path}`,
          step: ++sampleStep,
        })),
    }));
};

/** Deepest sample/group data for the active route. */
export const findActive = (
  root: ActivatedRouteSnapshot,
): { sample?: SampleMeta; group?: SampleGroupMeta } => {
  let node: ActivatedRouteSnapshot | null = root;
  let sample: SampleMeta | undefined;
  let group: SampleGroupMeta | undefined;
  while (node) {
    sample = (node.data as Partial<SampleRouteData>).sample ?? sample;
    group = (node.data as Partial<GroupRouteData>).group ?? group;
    node = node.firstChild;
  }
  return { sample, group };
};
