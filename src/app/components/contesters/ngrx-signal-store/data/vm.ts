import { ViewState, IDLE } from './view-state';
import { Fetched } from './fetched';
import { ConsoleApiKey } from '../../../../services/contesters';

/** A section's data and how to show it. */
export type Vm<T> = { state: ViewState; data: T | null };

export const IDLE_VM: Vm<never> = { state: IDLE, data: null };

/** A `Fetched` read (a whole response, not yet split into section data) as a `Vm`. `key` names the failed source when it errors, for the block's error text and for a parent that joins several sources (`failedKeys`). */
export const toVm = <T>(
  key: ConsoleApiKey,
  f: Fetched<T>,
  isEmpty: (d: T) => boolean = () => false,
): Vm<T> => {
  if (f.state === 'error')
    return {
      state: { kind: 'error', failed: [key], stale: f.value !== null },
      data: f.value,
    };
  if (f.state === 'loading') return { state: { kind: 'loading' }, data: null };
  if (isEmpty(f.value)) return { state: { kind: 'empty' }, data: f.value };
  return {
    state: { kind: 'ready', reloading: f.state === 'reloading' },
    data: f.value,
  };
};

export const mapVm = <A, B>(vm: Vm<A>, f: (a: A) => B): Vm<B> => ({
  state: vm.state,
  data: vm.data === null ? null : f(vm.data),
});
