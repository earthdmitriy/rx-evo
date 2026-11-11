import { IDLE, ViewState } from './view-state';
import { Vm } from './vm';

/** What a section starts with, before its stream has said anything. */
export const idle = { state: IDLE, data: null };

/** Block input `loading`: first load or a reload. */
export const loading = (state: ViewState): boolean =>
  state.kind === 'loading' || (state.kind === 'ready' && state.reloading);

/** Block input `error`: the failure as it came, for the error view to show. */
export const error = (state: ViewState): unknown => {
  // a failed refetch that kept its data (polls, reloads) is silent: the view keeps what it has
  if (state.kind !== 'error' || state.stale) return null;
  return state.error;
};

/**
 * The notices a section shows inside its view: the errors, as they came, of
 * the failed fields of a shown section, and the failure of a part (its own
 * block shows the rest).
 */
export const notices = (...states: ViewState[]): unknown[] =>
  states.flatMap((s) =>
    s.kind === 'ready'
      ? (s.notices ?? [])
      : s.kind === 'error' && !s.stale
        ? [s.error]
        : [],
  );

/** The data a view gets: nothing while the block shows the error. */
export const data = <T>(vm: Vm<T>): T | null =>
  vm.state.kind === 'error' && !vm.state.stale ? null : vm.data;
