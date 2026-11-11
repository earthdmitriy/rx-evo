import { Signal, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { ACTION_IDLE, ActionState } from '../../shared';

/** A write: pending/error state as a signal, no double submission, `onDone()` runs on success. */
export const createAction = <Arg, Result>(
  perform: (arg: Arg) => Observable<Result>,
) => {
  const state = signal<ActionState>(ACTION_IDLE);
  const run = (arg: Arg, onDone?: (result: Result) => void) => {
    if (state().pending) return;
    state.set({ pending: true });
    perform(arg).subscribe({
      next: (result) => {
        state.set(ACTION_IDLE);
        onDone?.(result);
      },
      error: (error: unknown) => state.set({ pending: false, error }),
    });
  };
  return { state: state as Signal<ActionState>, run };
};
