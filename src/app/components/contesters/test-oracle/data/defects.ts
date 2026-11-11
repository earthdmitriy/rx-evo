/**
 * Defect switches of the reference implementation (`?defect=a,b`). Each one
 * turns off one behaviour, so the e2e suite can be validated: with no defect
 * everything passes; with a defect, its matching assertions must fail.
 * Not part of any contest implementation.
 */
export type Defect =
  // stage 1 (baseline) breakers
  | 'stale-customer' // previous customer's data stays on screen while the next one loads, without saying it is loading
  | 'leak-session' // caches survive logout
  | 'stale-stats' // writes do not refresh the other services' counters (orderStats, ticketCounts)
  | 'no-chunk' // batch calls are not split at 20 ids
  // stage 2 (robust)
  | 'no-isolation' // one failing customer source fails every customer section
  | 'no-partial' // a failing row or box fails its whole section
  | 'retry-all' // Retry refetches every source of the customer
  | 'no-poll-keep' // a failed poll drops the data
  | 'no-stale' // same-key reloads show the skeleton instead of dimmed content
  | 'no-cancel' // superseded reads keep running
  | 'refresh-all' // a write refetches everything of the customer
  | 'cancel-writes' // switching customer cancels a write in flight
  // stage 3 (efficient)
  | 'no-cache' // every observe refetches
  | 'no-lazy' // tabs and catalog load without being shown
  | 'no-share' // each consumer has its own request
  | 'no-debounce' // one search request per keystroke
  | 'no-progressive' // customer sections wait for each other
  | 'no-batch' // one call per id instead of one per batch
  | 'eager-sentences' // notification sentences look up customers while the dropdown is closed
  | 'clear-public'; // logout forgets products, prices and stock

const STAGE_3: Defect[] = [
  'no-cache',
  'no-lazy',
  'no-share',
  'no-debounce',
  'no-progressive',
  'no-batch',
  'eager-sentences',
  'clear-public',
];
const STAGE_2: Defect[] = [
  'no-isolation',
  'no-partial',
  'retry-all',
  'no-poll-keep',
  'no-stale',
  'no-cancel',
  'refresh-all',
  'cancel-writes',
];

/** `stage-1` imitates a baseline-only page, `stage-2` a robust one. */
const ALIASES: Record<string, Defect[]> = {
  'stage-1': [...STAGE_2, ...STAGE_3],
  'stage-2': STAGE_3,
};

const read = (): Set<Defect> => {
  const raw =
    typeof location === 'undefined'
      ? ''
      : (new URLSearchParams(location.search).get('defect') ?? '');
  return new Set(
    raw
      .split(',')
      .filter(Boolean)
      .flatMap((d) => ALIASES[d] ?? [d as Defect]),
  );
};

/** Read from the URL on every call, so a page test can switch defects between pages. */
export const defect = (name: Defect): boolean => read().has(name);
