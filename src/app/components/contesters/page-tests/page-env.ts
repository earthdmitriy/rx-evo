/**
 * Must be imported before any implementation: the defect switches of the
 * test oracle (`?defect=`) are read from the URL once, when its modules load.
 * `PAGE_DEFECT=<names>` in the environment turns them on (suite validation).
 */
const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {};

export const PAGE_DEFECT = env['PAGE_DEFECT'] ?? '';

/** The implementation the page tests mount: `test-oracle` or `<approach>/stage-<n>` (see pages.ts). */
export const PAGE_TARGET = env['PAGE_TARGET'] ?? 'test-oracle';

export const pageUrl = (seed = 1) =>
  `/?seed=${seed}&latency=manual&push=off${PAGE_DEFECT ? `&defect=${PAGE_DEFECT}` : ''}`;

window.history.replaceState(null, '', pageUrl());
