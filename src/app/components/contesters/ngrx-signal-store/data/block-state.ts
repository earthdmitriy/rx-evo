import type { Fetched } from './fetched';
import { IDLE, ViewState } from './view-state';
import { Vm } from './vm';

/** What a section starts with, before its stream has said anything. */
export const idle = { state: IDLE, data: null };

/** Block input `loading`: first load or a reload. */
export const loading = (state: ViewState): boolean =>
  state.kind === 'loading' || (state.kind === 'ready' && state.reloading);

/** Block input `error`: the text of a failure that left nothing to show. */
export const error = (state: ViewState): string | null => {
  // a failed refetch that kept its data (polls, reloads) is silent: the view keeps what it has
  if (state.kind !== 'error' || state.stale) return null;
  return state.failed.length
    ? `Couldn't load ${state.failed.join(', ')}.`
    : "Couldn't load this.";
};

/** The data a view gets: nothing while the block shows the error. */
export const data = <T>(vm: Vm<T>): T | null =>
  vm.state.kind === 'error' && !vm.state.stale ? null : vm.data;

/** A field's error text: shown only when the field has nothing to show (a failed load that kept no value); a kept value stays silent. */
export const fieldError = <T>(f: Fetched<T>): string | null =>
  f.state === 'error' && f.value === null ? "Couldn't load this." : null;
