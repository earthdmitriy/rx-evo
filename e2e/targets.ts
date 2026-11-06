/**
 * What the suite runs against (docs/contest/methodology.md §3): every
 * implemented stage of every approach, plus the reference (all stages) with
 * optional defect switches for validating the suite.
 *
 * Env: E2E_CONTESTER=<approach> (default: all), E2E_STAGE=<n> (default: all
 * implemented), E2E_DEFECT=<defects> (reference only).
 */
export type Target = {
  /** Playwright project name and report column. */
  id: string;
  approach: string;
  /** The stage this page claims: assertions of later stages are "ahead". */
  stage: 1 | 2 | 3;
  path: string;
  defect?: string;
};

/** Implemented stages per approach. Add a stage here when it lands. */
export const IMPLEMENTED: Record<string, (1 | 2 | 3)[]> = {
  reference: [3],
  'vanilla-rxjs': [],
  'stateful-observable': [],
  resources: [],
  'signal-store': [],
  'tanstack-query': [],
};

const env = (name: string) => process.env[name] || undefined;

export const TARGETS: Target[] = Object.entries(IMPLEMENTED).flatMap(([approach, stages]) =>
  stages.map((stage): Target => {
    if (approach === 'reference') {
      const defect = env('E2E_DEFECT');
      return { id: defect ? `reference~${defect}` : 'reference', approach, stage, path: '/contesters/reference', defect };
    }
    return { id: `${approach}/stage-${stage}`, approach, stage, path: `/contesters/${approach}/stage-${stage}` };
  }),
);

export const selectedTargets = (): Target[] => {
  const approach = env('E2E_CONTESTER');
  const stage = env('E2E_STAGE');
  return TARGETS.filter((t) => (!approach || t.approach === approach) && (!stage || t.stage === Number(stage)));
};

export const E2E_SEED = Number(process.env['E2E_SEED'] ?? 1);
