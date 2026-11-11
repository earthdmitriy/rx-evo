/**
 * What the suite runs against (docs/contest/methodology.md §3): every
 * implemented stage of every approach, plus the test oracle (all stages) with
 * optional defect switches for validating the suite.
 *
 * Env: E2E_CONTESTER=<approach> (default: all), E2E_STAGE=<n> (default: all
 * implemented), E2E_DEFECT=<defects> (test oracle only).
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

/**
 * Stages each CONTEST approach's single implementation claims to meet (no
 * stage folders any more: one implementation per approach, scored against
 * whichever requirements it meets). Add an approach here when it lands.
 */
export const IMPLEMENTED: Record<string, (1 | 2 | 3)[]> = {
  'test-oracle': [3],
  'vanilla-rxjs': [3],
  'signal-store': [3],
  resources: [3],
  'stateful-observable': [3],
};

const env = (name: string) => process.env[name] || undefined;

export const TARGETS: Target[] = [
  ...Object.entries(IMPLEMENTED).flatMap(([approach, stages]) =>
    stages.map((stage): Target => {
      // only the test oracle defines defect switches (E2E_DEFECT)
      const defect = approach === 'test-oracle' ? env('E2E_DEFECT') : undefined;
      return {
        id: defect ? `${approach}~${defect}` : approach,
        approach,
        stage,
        // the oracle is part of the Contest group, the entries are Contesters
        path: approach === 'test-oracle' ? '/contest/test-oracle' : `/contesters/${approach}`,
        defect,
      };
    }),
  ),
];

export const selectedTargets = (): Target[] => {
  const approach = env('E2E_CONTESTER');
  const stage = env('E2E_STAGE');
  return TARGETS.filter(
    (t) =>
      (!approach || t.approach === approach) &&
      (!stage || t.stage === Number(stage)),
  );
};

export const E2E_SEED = Number(process.env['E2E_SEED'] ?? 1);
