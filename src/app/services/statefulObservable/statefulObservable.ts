import {
  BehaviorSubject,
  combineLatest,
  concatMap,
  map,
  Observable,
  ObservedValueOf,
  of,
  OperatorFunction,
  switchMap,
} from 'rxjs';
import {
  StatefulObservableForPipe,
  StatefulObservable,
} from './statefulObservable.types';
import {
  catchResponseError,
  startWithLoading,
  defaultCache,
} from './statefulObservable-operators';
import { splitResponseWithStatus, getPipes } from './statefulObservable-pipes';
import { ResponseWithStatus } from '../tinyStore/shared';

type TmapOperator = <T, O extends Observable<any>>(
  project: (value: T, index: number) => O,
) => OperatorFunction<T, ObservedValueOf<O>>;

export const statefulObservable = <Input, Response = Input>(
  options:
    | {
        input: Observable<Input>;
        loader?: (input: Input) => Observable<Response>;
        mapOperator?: TmapOperator;
      }
    | {
        input?: Observable<Input>;
        loader: (input: Input) => Observable<Response>;
        mapOperator?: TmapOperator;
      },
): StatefulObservable<Response, unknown> => {
  const { input, loader, mapOperator = switchMap } = options;

  const source$ = input ? input : of(true as Input);
  const reload$ = new BehaviorSubject(true);

  const raw$ = loader
    ? combineLatest([source$, reload$]).pipe(
        map(([input]) => input),
        mapOperator((input) => loader(input).pipe(startWithLoading())), // ensure async processing on reload
        catchResponseError(),
      )
    : combineLatest([source$, reload$]).pipe(
        map(([input]) => input),
        mapOperator((input) =>
          of(input as unknown as Response).pipe(startWithLoading()),
        ), // ensure async processing on reload
        catchResponseError(),
      );

  const res: StatefulObservableForPipe<Response, unknown> = {
    ...splitResponseWithStatus(raw$),

    reload: () => reload$.next(true),
  };

  return {
    ...res,
    // provide a flexible pipe implementation; use any casts to satisfy the complex overloads
    ...getPipes(res),
  };
};
