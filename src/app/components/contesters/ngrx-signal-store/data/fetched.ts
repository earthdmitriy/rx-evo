/**
 * What the store knows about one piece of data that arrives on its own,
 * inside the data layer only: not yet (`loading`), failed (`error`) or here
 * (`ready`). The shared views do not know it: at the edge of the store a
 * `Fetched` becomes the plain value or `undefined` (`value`); the failure
 * state is kept for the Retry of the section's block.
 */
export type Fetched<T> =
  /** A failed (re)load: `value` is the last good one, kept, or `null` if there never was one. */
  | { state: 'error'; value: T | null }
  | { state: 'loading'; value: null }
  /** A reload of an id that already has a value: kept (dimmed) while the new one is in flight. */
  | { state: 'reloading'; value: T }
  | { state: 'ready'; value: T };

export const fetched = {
  loading: <T>(): Fetched<T> => ({ state: 'loading', value: null }),
  reloading: <T>(value: T): Fetched<T> => ({ state: 'reloading', value }),
  ready: <T>(value: T): Fetched<T> => ({ state: 'ready', value }),
  error: <T>(value: T | null = null): Fetched<T> => ({ state: 'error', value }),
};

/** The value, or `undefined` while it is not here. */
export const value = <T>(f: Fetched<T>): T | undefined =>
  f.state === 'ready' || f.state === 'reloading'
    ? f.value
    : f.state === 'error'
      ? (f.value ?? undefined)
      : undefined;

export const mapFetched = <A, B>(
  f: Fetched<A>,
  project: (a: A) => B,
): Fetched<B> => {
  if (f.state === 'ready') return fetched.ready(project(f.value));
  if (f.state === 'reloading') return fetched.reloading(project(f.value));
  if (f.state === 'loading') return fetched.loading();
  return fetched.error(f.value === null ? null : project(f.value));
};
