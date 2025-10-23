import { DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  combineLatest,
  map,
  distinctUntilChanged,
  tap,
  shareReplay,
  filter,
} from 'rxjs';
import { publishWhile } from '../tinyStore/operators/publishWhile';
import {
  tryGetDestroyRef,
  isLoading,
  loadingSymbol,
  isError,
  errorSymbol,
  isSuccess,
  ResponseLoading,
  ResponseError,
} from '../tinyStore/shared';
import { StatefulObservable } from './statefulObservable.types';
import { defaultCache } from './statefulObservable-operators';
import { getPipes, splitResponseWithStatus } from './statefulObservable-pipes';

type UnwrapStatefulObservable<T> =
  T extends StatefulObservable<infer U> ? U : never;
type UnwrapStatefulObservables<T extends unknown[]> = T extends []
  ? [] // stop on empty tuple
  : T extends readonly [infer Head, ...infer Tail]
    ? [UnwrapStatefulObservable<Head>, ...UnwrapStatefulObservables<Tail>] // process as tuple
    : T extends StatefulObservable<infer R>[] // process as array
      ? R[]
      : [];

type UnwrapStatefulObservableError<T> =
  T extends StatefulObservable<any, infer E> ? false | E : never;
type UnwrapStatefulObservablesError<T extends unknown[]> = T extends []
  ? [] // stop on empty tuple
  : T extends [infer Head, ...infer Tail]
    ? [
        UnwrapStatefulObservableError<Head>,
        ...UnwrapStatefulObservablesError<Tail>,
      ] // process as tuple
    : T extends StatefulObservable<any, infer E>[] // process as array
      ? E[]
      : [];

export const combineStatefulObservables = <
  T extends [...StatefulObservable[]],
  Result,
>(
  args: [...T],
  processResponse: (data: UnwrapStatefulObservables<T>) => Result,
): StatefulObservable<Result, UnwrapStatefulObservablesError<T>> => {
  const raw$ = combineLatest(args.map((s) => s.raw)).pipe(
    map((events) => {
      if (events.some((x) => isLoading(x)))
        return { state: loadingSymbol } as ResponseLoading;
      if (events.some((x) => isError(x)))
        return {
          state: errorSymbol,
          error: events.map((x) => (isError(x) ? x.error : false)),
        } as ResponseError<UnwrapStatefulObservablesError<T>>;
      return processResponse(events as UnwrapStatefulObservables<T>);
    }),
    defaultCache(),
  );

  const res = {
    ...splitResponseWithStatus(raw$),

    reload: () => args.forEach((store) => store.reload()),
  };

  return {
    ...res,
    // provide a flexible pipe implementation; use any casts to satisfy the complex overloads
    ...getPipes(res),
  };
};
