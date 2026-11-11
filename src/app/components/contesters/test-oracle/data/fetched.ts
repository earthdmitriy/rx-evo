/**
 * What the reference knows about one piece of data that arrives on its own,
 * inside the data layer only: not yet (`loading`), failed (`error`) or here
 * (`ready`). The shared views do not know it: at the edge of the store a
 * `Fetched` becomes the plain value or `undefined` (`value`), and the
 * failures are kept for the `no-partial` defect and for the Retry of the
 * section's block.
 */
export type Fetched<T> =
  | { state: 'error'; value: null; error: unknown }
  | { state: 'loading'; value: null }
  | { state: 'ready'; value: T };

export const fetched = {
  loading: <T>(): Fetched<T> => ({ state: 'loading', value: null }),
  ready: <T>(value: T): Fetched<T> => ({ state: 'ready', value }),
  /** The error is kept as it came, to show it as is. */
  error: <T>(error?: unknown): Fetched<T> => ({
    state: 'error',
    value: null,
    error,
  }),
};

/** The value, or `undefined` while it is not here. */
export const value = <T>(f: Fetched<T>): T | undefined =>
  f.state === 'ready' ? f.value : undefined;

export const mapFetched = <A, B>(
  f: Fetched<A>,
  project: (a: A) => B,
): Fetched<B> =>
  f.state === 'ready'
    ? fetched.ready(project(f.value))
    : f.state === 'loading'
      ? fetched.loading()
      : fetched.error(f.error);
