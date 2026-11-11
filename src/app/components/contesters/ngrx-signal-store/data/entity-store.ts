import {
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  Signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import {
  EntityId,
  removeEntity,
  setEntity,
  withEntities,
} from '@ngrx/signals/entities';
import {
  catchError,
  EMPTY,
  interval,
  Observable,
  Subject,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs';
import { Fetched, fetched } from './fetched';

type Slot = {
  id: EntityId;
  status: 'loading' | 'ready' | 'reloading' | 'error';
};

/**
 * A keyed read, shared by every consumer of that key: one `withEntities`
 * collection (so two components reading the same id read the same signal,
 * no duplicate request — R-L10). `attach`/`detach` reference-count a key the
 * same way the RxJS `Query` other approaches use does (one entry per key,
 * requested on the first observer, cancelled when the last one leaves) —
 * matched in behaviour, not in code: no `Query`/`EntityCache` class, just
 * two `Map`s of counts and in-flight `Subject`s next to the store's own
 * methods. Reading (`peek`) and attaching are separate — `peek` is pure,
 * safe inside `computed()`; `attach`/`detach` have side effects, so a
 * consumer calls them from an `effect()`'s body and cleanup.
 *
 * Built from NgRx SignalStore's own primitives (`withEntities`, `patchState`),
 * not from the RxJS `Query`/`EntityCache` classes other approaches use.
 */
export const createKeyedCache = <Id extends EntityId, V>(
  makeLoader: () => (id: Id) => Observable<V>,
) =>
  signalStore(
    { providedIn: 'root' },
    withState({ values: {} as Record<EntityId, V> }),
    withEntities<Slot>(),
    withMethods((store) => {
      // `makeLoader()` runs here, inside the store's own construction (injection
      // context), so it is the right place for the `inject()` calls that build
      // the loader; the loader itself runs later, outside that context.
      const loader = makeLoader();
      /** How many consumers currently attach a key. */
      const observers = new Map<EntityId, number>();
      /** The key's in-flight read, if any — `next()`ed to cancel it. */
      const inFlight = new Map<EntityId, Subject<void>>();

      const run = (id: Id) => {
        const hadValue = store.values()[id] !== undefined;
        patchState(
          store,
          setEntity<Slot>({ id, status: hadValue ? 'reloading' : 'loading' }),
        );
        const stop = new Subject<void>();
        inFlight.set(id, stop);
        return loader(id).pipe(
          takeUntil(stop),
          tap((value) => {
            inFlight.delete(id);
            patchState(store, setEntity<Slot>({ id, status: 'ready' }));
            patchState(store, (s) => ({
              values: { ...s.values, [id]: value },
            }));
          }),
          catchError(() => {
            // the value (if any) is left in `values` — a failed refetch keeps what it had
            inFlight.delete(id);
            patchState(store, setEntity<Slot>({ id, status: 'error' }));
            return EMPTY;
          }),
        );
      };

      return {
        /** One more consumer wants `id`: starts the load the first time, or while it last failed. */
        attach: (id: Id) => {
          observers.set(id, (observers.get(id) ?? 0) + 1);
          const slot = store.entityMap()[id];
          if (!slot || slot.status === 'error') run(id).subscribe();
        },
        /**
         * A consumer no longer wants `id`. The last one out cancels a read still
         * in flight (R-B1, R-B8, "superseded"); a value already in hand stays
         * cached (`ready`), only the `reloading` flag it may have been showing
         * drops — the next attach decides whether to ask again.
         */
        detach: (id: Id) => {
          const left = (observers.get(id) ?? 1) - 1;
          if (left > 0) {
            observers.set(id, left);
            return;
          }
          observers.delete(id);
          const stop = inFlight.get(id);
          if (!stop) return;
          stop.next();
          inFlight.delete(id);
          if (store.values()[id] !== undefined)
            patchState(store, setEntity<Slot>({ id, status: 'ready' }));
          else patchState(store, removeEntity(id));
        },
        /** Drop the kept value (if any) and load again, bypassing the dedup check (Retry, a poll tick, a write's invalidation) — not counted against `attach`/`detach`. */
        reload: (id: Id) => run(id).subscribe(),
        /** Store a value received from a write, with no request. */
        set: (id: Id, value: V) => {
          patchState(store, setEntity<Slot>({ id, status: 'ready' }));
          patchState(store, (s) => ({ values: { ...s.values, [id]: value } }));
        },
        /** Forget everything (logout): also cancels every read in flight. */
        clear: () => {
          inFlight.forEach((stop) => stop.next());
          inFlight.clear();
          observers.clear();
          patchState(store, { values: {}, entityMap: {}, ids: [] });
        },
      };
    }),
    withComputed((store) => ({
      /** `undefined`: never asked for (nothing has `attach`ed it yet). Pure — safe inside `computed()`. */
      peek: computed(() => (id: Id): Fetched<V> | undefined => {
        const slot = store.entityMap()[id];
        if (!slot) return undefined;
        const value = store.values()[id];
        if (slot.status === 'error') return fetched.error(value ?? null);
        if (slot.status === 'loading') return fetched.loading();
        if (slot.status === 'reloading') return fetched.reloading(value as V);
        return fetched.ready(value as V);
      }),
    })),
  );

export type KeyedCache<Id extends EntityId, V> = InstanceType<
  ReturnType<typeof createKeyedCache<Id, V>>
>;

/**
 * A reactive read of one id: attaches it (starting or keeping the load) as
 * long as `id` names it, detaching the previous one when `id` changes or the
 * caller is destroyed — an `effect`'s own cleanup is the attach/detach
 * lifecycle. Returns the id's current `Fetched` value, `loading` before the
 * first answer.
 */
export const cacheEntry = <Id extends EntityId, V>(
  cache: KeyedCache<Id, V>,
  id: Signal<Id>,
  injector?: Injector,
) => {
  // `untracked`: `attach`/`detach` read the cache's own signals along the way (the
  // entity map, to decide whether to start a load); without `untracked` those reads
  // register as extra dependencies of *this* effect, and the `patchState` calls they
  // make would then re-trigger it — a feedback loop that kept retrying a failed id
  // forever instead of leaving it in `error`.
  effect(
    (onCleanup) => {
      const current = id();
      untracked(() => cache.attach(current));
      onCleanup(() => untracked(() => cache.detach(current)));
    },
    injector ? { injector } : undefined,
  );
  return computed((): Fetched<V> => cache.peek()(id()) ?? fetched.loading());
};

/** The same, for a key that may not be known yet (no order panel open, no search text typed): `undefined` while `id` is `null`, nothing loaded until it isn't. */
export const cacheEntryOptional = <Id extends EntityId, V>(
  cache: KeyedCache<Id, V>,
  id: Signal<Id | null>,
  injector?: Injector,
) => {
  effect(
    (onCleanup) => {
      const current = id();
      if (current === null) return;
      untracked(() => cache.attach(current));
      onCleanup(() => untracked(() => cache.detach(current)));
    },
    injector ? { injector } : undefined,
  );
  return computed((): Fetched<V> | undefined => {
    const current = id();
    return current === null
      ? undefined
      : (cache.peek()(current) ?? fetched.loading());
  });
};

/** A read with no key of its own (the agent profile, the notification list): one slot, id `0`. */
export const SINGLETON = 0;
export const singletonEntry = <V>(
  cache: KeyedCache<number, V>,
  injector?: Injector,
) =>
  cacheEntry(
    cache,
    computed(() => SINGLETON),
    injector,
  );

/** Reloads `id` every `ms` while the caller (a section component) is alive, restarting the interval if `id` changes — torn down on destroy, so the poll stops with the view, same as a library's own poll-while-observed (R-D2). */
export const poll = <Id extends EntityId, V>(
  cache: KeyedCache<Id, V>,
  id: Signal<Id>,
  ms: number,
) => {
  const destroyRef = inject(DestroyRef);
  toObservable(id)
    .pipe(
      switchMap((current) =>
        interval(ms).pipe(tap(() => cache.reload(current))),
      ),
      takeUntilDestroyed(destroyRef),
    )
    .subscribe();
};

/** The same, for a list of ids (a list page's rows, a cart's lines): one entry per id, keyed by id. */
export const cacheEntries = <Id extends EntityId, V>(
  cache: KeyedCache<Id, V>,
  ids: Signal<readonly Id[]>,
  injector?: Injector,
) => {
  effect(
    (onCleanup) => {
      const current = ids();
      untracked(() => current.forEach((id) => cache.attach(id)));
      onCleanup(() =>
        untracked(() => current.forEach((id) => cache.detach(id))),
      );
    },
    injector ? { injector } : undefined,
  );
  return computed(() => {
    const peek = cache.peek();
    return Object.fromEntries(
      ids().map((id) => [id, peek(id) ?? fetched.loading()]),
    ) as Record<Id, Fetched<V>>;
  });
};
