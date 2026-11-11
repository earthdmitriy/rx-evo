import { inject } from '@angular/core';
import { exhaustMap, Observable, Subject } from 'rxjs';
import { statefulObservable } from '../lib';
import { LOGGED_IN } from '../sources/session';

/**
 * A write as a stateful stream (recipe "Putting UPDATE result into stream"):
 * `call` pushes the arguments into the input, the loader performs the write,
 * `result.pending$` is the pending state of the control. `exhaustMap` drops a
 * second call while one is pending (R-W2). `active` on the session drops the
 * answer of a write that returns after logout (R-W5). The stream is kept
 * without subscribers, so a write whose panel was closed still refreshes the
 * data it changed. Call it in an injection context (a component field).
 */
export const action = <A, R>(
  name: string,
  loader: (args: A) => Observable<R>,
) => {
  const calls$ = new Subject<A>();
  const result = statefulObservable({
    input: calls$,
    loader,
    mapOperator: exhaustMap,
    active: inject(LOGGED_IN),
    name,
    refCount: false,
  });
  return { call: (args: A) => calls$.next(args), result };
};
