import {
  OperatorFunction,
  catchError,
  of,
  startWith,
  MonoTypeOperatorFunction,
  shareReplay,
} from 'rxjs';
import { errorSymbol, loadingSymbol } from '../tinyStore/shared';
import {
  ResponseWithStatus,
  ResponseError,
  ResponseLoading,
} from '../tinyStore/shared';

/**
 * RxJS operator that catches any error from the upstream observable and
 * converts it into a ResponseError<unknown> value instead of letting the
 * stream error out.
 *
 * The operator leaves successful emissions of type T unchanged. If an error
 * occurs, it emits a single ResponseError<unknown> object constructed as:
 * { state: errorSymbol, error: <caught error> } and completes the stream.
 *
 * Use this when you want to represent errors as stream values (a "stateful"
 * error representation) rather than terminating the observable with an error.
 *
 * @typeParam T - Type of values emitted by the upstream observable.
 * @returns An OperatorFunction that maps Observable<T> to Observable<T | ResponseError<unknown>>.
 *
 * @remarks
 * - The returned observable will never error because upstream errors are
 *   transformed into a value of type ResponseError<unknown>.
 * - The wrapped error is stored in the `error` property of the ResponseError.
 * - The `state` property is set to `errorSymbol` to indicate the error state.
 *
 * @example
 * // source$: Observable<MyData>
 * // source$.pipe(catchResponseError<MyData>()) -> Observable<MyData | ResponseError<unknown>>
 */
export const catchResponseError = <T>(): OperatorFunction<
  T,
  T | ResponseError<unknown>
> =>
  catchError((error) =>
    of<ResponseError<unknown>>({ state: errorSymbol, error: error }),
  );

/**
 * Emits a loading sentinel before any values from the source observable.
 *
 * Prepends a ResponseLoading object ({ state: loadingSymbol }) to the stream so
 * subscribers receive an immediate "loading" state and then receive the actual
 * values emitted by the source. This is useful for UI/state management where a
 * loading indicator should be shown until the first real value arrives.
 *
 * @typeParam T - The type of values emitted by the source observable.
 * @returns An RxJS OperatorFunction that emits either a ResponseLoading or values of type T.
 *
 * @example
 * // Emits ResponseLoading first, then the source value(s)
 * source$.pipe(startWithLoading()).subscribe(value => {
 *   // value is ResponseLoading initially, then T values
 * });
 */
export const startWithLoading = <T>(): OperatorFunction<
  T,
  T | ResponseLoading
> => startWith({ state: loadingSymbol } as ResponseLoading);

/**
 * Creates an RxJS operator that shares a single subscription to the source
 * and caches (replays) the most recent emission for new subscribers.
 *
 * This operator is equivalent to using `shareReplay({ bufferSize: 1, refCount: true })`.
 * It keeps only the last emitted value and automatically unsubscribes from the
 * source when there are no subscribers, preventing unnecessary work or leaks.
 *
 * @typeParam T - The type of items emitted by the source observable.
 * @returns A MonoTypeOperatorFunction<T> that shares a single subscription and
 *          replays the latest value to new subscribers while using reference counting.
 *
 * @example
 * ```ts
 * const cached$ = source$.pipe(defaultCache());
 * // Multiple subscribers share one underlying subscription and receive the last value.
 * ```
 */
export const defaultCache = <T>(): MonoTypeOperatorFunction<T> =>
  shareReplay({ bufferSize: 1, refCount: true });
