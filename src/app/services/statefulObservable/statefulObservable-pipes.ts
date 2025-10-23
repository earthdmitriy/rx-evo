import {
  Observable,
  OperatorFunction,
  filter,
  map,
  MonoTypeOperatorFunction,
  merge,
} from 'rxjs';
import {
  isSuccess,
  isError,
  isLoading,
  errorSymbol,
} from '../tinyStore/shared';
import {
  defaultCache,
  catchResponseError,
} from './statefulObservable-operators';
import {
  StatefulObservableForPipe,
  StatefulObservable,
  StatefulObservableStreams,
} from './statefulObservable.types';
import {
  ResponseWithStatus,
  ResponseError,
  ResponseLoading,
} from '../tinyStore/shared';

// helper to apply an array of operator functions to an observable's pipe
export const applyPipe = <T, R = any>(
  obs: Observable<T>,
  operations: OperatorFunction<any, any>[],
): Observable<R> => (obs.pipe as any).apply(obs, operations) as Observable<R>;

/**
 * Splits a stream of ResponseWithStatus into separate, typed streams for raw responses, successful values, errors, and pending state.
 *
 * @template Result - Type of the successful result payload carried by ResponseWithStatus.
 * @template Error - Type of the error payload carried by ResponseWithStatus.
 *
 * @param raw - Source Observable that emits ResponseWithStatus<Result, Error> items.
 *
 * @returns An object of type StatefulObservableStreams<Result, Error> containing:
 *  - raw: the original source Observable (unchanged),
 *  - value: a cached Observable that emits only successful ResponseWithStatus items (filtered by isSuccess),
 *  - error: an Observable that emits only the error payloads extracted from error responses (filtered by isError and mapped to e.error),
 *  - pending: an Observable that emits booleans representing the loading state (mapped via isLoading).
 *
 * @remarks
 * All streams are created from a cached version of the source raw stream (via `defaultCache()`), so late subscribers receive the latest successful emission. The `value`, `error`, and `pending` streams are derived directly from the incoming source.
 */
export const splitResponseWithStatus = <Result, Error>(
  raw: Observable<ResponseWithStatus<Result, Error>>,
): StatefulObservableStreams<Result, Error> => {
  const rawCached = raw.pipe(defaultCache());
  return {
    raw: rawCached,
    value: rawCached.pipe(filter(isSuccess)),
    error: rawCached.pipe(
      filter(isError),
      map((e) => e.error),
    ),
    pending: rawCached.pipe(map(isLoading)),
  };
};

/**
 * Creates a new stateful observable "pipe" by applying the given RxJS operators to the
 * provided raw observable and returning a new StatefulObservableForPipe that exposes
 * the split response streams and pipe helpers.
 *
 * @template Result - Type of the successful response payload.
 * @template Error - Type of the error payload.
 *
 * @param state - The source stateful observable containing:
 *   - raw: Observable<ResponseWithStatus<Result, Error>> — the underlying observable to pipe.
 *   - reload: () => void — a reload function which is preserved on the returned object.
 * @param operations - One or more MonoTypeOperatorFunction operators that operate on
 *   ResponseWithStatus<Result, Error>. These operators will be applied to `raw`
 *   via the internal applyPipe helper.
 *
 * @returns A new StatefulObservableForPipe<Result, Error> that:
 *   - exposes the split response streams produced by splitResponseWithStatus(newRaw);
 *   - preserves the original reload function;
 *   - includes any helper pipes returned by getPipes(res).
 *
 * @remarks
 * - The function is pure with respect to the input state object: it returns a new
 *   object that spreads the derived pieces rather than mutating the input.
 * - The applyPipe helper is used to keep the `.apply` usage consistent and readable
 *   when composing the provided operators.
 * - The resulting raw observable has the type Observable<ResponseWithStatus<Result, Error>>
 *   after operator application; callers should ensure the supplied operators match that type.
 *
 * @example
 * // Given a state { raw, reload } and operators [op1, op2]:
 * // const piped = pipeRaw({ raw, reload }, op1, op2);
 */
export const pipeRaw = <Result, Error>(
  { raw, reload }: StatefulObservableForPipe<Result, Error>,
  ...operations: MonoTypeOperatorFunction<ResponseWithStatus<Result, Error>>[]
): StatefulObservableForPipe<Result, Error> => {
  const newRaw = applyPipe(raw, operations) as Observable<
    ResponseWithStatus<Result, Error>
  >;

  // Using applyPipe helper keeps .apply usage consistent and readable

  const res = {
    ...splitResponseWithStatus(newRaw),

    reload,
  };
  return {
    ...res,
    ...getPipes(res),
  };
};

/**
 * Pipes the successful values of a `StatefulObservable` through the provided RxJS operator functions,
 * while preserving error and non-successful states. Returns a new `StatefulObservable` with the transformed result type.
 *
 * @template Result - The type of the original successful result.
 * @template Result2 - The type of the transformed successful result.
 * @template Error - The type of the error.
 *
 * @param {StatefulObservableForPipe<Result, Error>} param0 - The source stateful observable and its reload function.
 * @param {...OperatorFunction<any, any>[]} operations - RxJS operator functions to apply to successful values.
 * @returns {StatefulObservable<Result2, unknown>} A new stateful observable with transformed successful values and preserved error states.
 */
export const pipeValue = <Result, Result2, Error>(
  { raw, reload }: StatefulObservableForPipe<Result, Error>,
  ...operations: OperatorFunction<any, any>[]
): StatefulObservable<Result2, unknown> => {
  const rawValue = raw.pipe(filter(isSuccess));

  const rawPipedValue = applyPipe(rawValue, operations).pipe(
    catchResponseError(),
  );

  const rawNotValue = raw.pipe(filter((r) => !isSuccess(r)));

  const newRaw = merge(rawNotValue, rawPipedValue);

  const res: StatefulObservableForPipe<Result2, unknown> = {
    ...splitResponseWithStatus(newRaw),

    reload,
  };

  return {
    ...res,
    ...getPipes(res),
  };
};

/**
 * Pipes error responses from a `StatefulObservable` through the provided RxJS operator functions,
 * transforming the error state while leaving non-error states untouched.
 *
 * @template Result - The type of the successful result.
 * @template Error - The type of the error (defaults to `unknown`).
 * @param {StatefulObservableForPipe<Result, Error>} param0 - The stateful observable object containing the raw observable and reload function.
 * @param {...OperatorFunction<any, any>[]} operations - RxJS operator functions to apply to the error stream.
 * @returns {StatefulObservable<Result, Error>} A new stateful observable with the error stream piped through the provided operators.
 */
export const pipeError = <Result, Error = unknown>(
  { raw, reload }: StatefulObservableForPipe<Result, Error>,
  ...operations: OperatorFunction<any, any>[]
): StatefulObservable<Result, Error> => {
  const rawError = raw.pipe(
    filter(isError),
    map((r) => r.error),
  );

  const rawPipedError = applyPipe(rawError, operations).pipe(
    map((error): ResponseError<Error> => ({ state: errorSymbol, error })),
  );

  const rawNotError = raw.pipe(filter((r) => !isError(r)));

  const newRaw = merge(rawPipedError, rawNotError);

  const res: StatefulObservableForPipe<Result, Error> = {
    ...splitResponseWithStatus(newRaw),

    reload,
  };

  return {
    ...res,
    ...getPipes(res),
  };
};

/**
 * Returns an object containing pipe functions for a given `StatefulObservableForPipe`.
 *
 * The returned object includes:
 * - `pipe`: Applies a sequence of RxJS operator functions to the raw observable.
 * - `pipeValue`: Applies operator functions to the value stream of the observable.
 * - `pipeError`: Applies operator functions to the error stream of the observable.
 *
 * @typeParam Result - The type of the value emitted by the observable.
 * @typeParam Error - The type of the error emitted by the observable.
 * @param statefulObservable - The stateful observable to create pipe functions for.
 * @returns An object with `pipe`, `pipeValue`, and `pipeError` functions.
 */
export const getPipes = <Result, Error>(
  statefulObservable: StatefulObservableForPipe<Result, Error>,
): {
  pipe: StatefulObservable<Result, Error>['pipe'];
  pipeValue: StatefulObservable<Result, Error>['pipeValue'];
  pipeError: StatefulObservable<Result, Error>['pipeError'];
} => ({
  pipe: (...args: OperatorFunction<any, any>[]) =>
    pipeRaw(
      statefulObservable,
      ...(args as unknown as OperatorFunction<any, any>[]),
    ) as any,
  pipeValue: (...args: OperatorFunction<any, any>[]) =>
    pipeValue(
      statefulObservable,
      ...(args as unknown as OperatorFunction<any, any>[]),
    ) as any,
  pipeError: (...args: OperatorFunction<any, any>[]) =>
    pipeError(
      statefulObservable,
      ...(args as unknown as OperatorFunction<any, any>[]),
    ) as any,
});
