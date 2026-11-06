import { BehaviorSubject, defer, finalize, interval, Observable, Subscription } from 'rxjs';
import { ConsoleApiKey } from '../../../../services/contesters';
import { defect } from './defects';

/** What one key looks like to its observers. */
export type QueryStatus<T> = {
  data: T | null;
  error: unknown;
  /** A request for this key is in flight. */
  fetching: boolean;
  /** Data has arrived at least once. */
  loaded: boolean;
};

const INITIAL: QueryStatus<never> = { data: null, error: null, fetching: false, loaded: false };

type QueryOptions<A, T> = {
  key: ConsoleApiKey;
  fetch: (arg: A) => Observable<T>;
  /** Cache key of an argument (default: JSON). */
  id?: (arg: A) => string;
  /** Refetch every `pollMs` while observed. */
  pollMs?: number;
  /** Keep showing the last data when a request fails (polled sources). */
  keepOnError?: boolean;
};

class Entry<A, T> {
  public readonly state$ = new BehaviorSubject<QueryStatus<T>>(INITIAL);
  public observers = 0;
  public stale = false;
  private inflight?: Subscription;
  private poll?: Subscription;

  constructor(
    public readonly arg: A,
    private readonly opts: QueryOptions<A, T>,
  ) {}

  public fetch() {
    this.inflight?.unsubscribe();
    this.stale = false;
    const before = this.state$.value;
    this.state$.next({ ...before, fetching: true });
    this.inflight = this.opts.fetch(this.arg).subscribe({
      next: (data) => this.state$.next({ data, error: null, fetching: false, loaded: true }),
      error: (error) => {
        const keep = this.opts.keepOnError && !defect('no-poll-keep');
        this.state$.next({ data: keep ? before.data : null, error, fetching: false, loaded: before.loaded });
      },
    });
  }

  public set(data: T) {
    this.inflight?.unsubscribe();
    this.stale = false;
    this.state$.next({ data, error: null, fetching: false, loaded: true });
  }

  public attach() {
    this.observers++;
    const s = this.state$.value;
    if (defect('no-cache') || ((!s.loaded || this.stale || s.error) && !s.fetching)) this.fetch();
    if (this.observers === 1 && this.opts.pollMs) this.poll = interval(this.opts.pollMs).subscribe(() => this.fetch());
  }

  public detach() {
    this.observers--;
    if (this.observers > 0) return;
    this.poll?.unsubscribe();
    if (this.state$.value.fetching && !defect('no-cancel')) {
      // nobody waits for it: cancel, and fetch again on the next observer
      this.inflight?.unsubscribe();
      this.state$.next({ ...this.state$.value, fetching: false });
      this.stale = true;
    }
  }

  public dispose() {
    this.poll?.unsubscribe();
    if (!defect('no-cancel')) this.inflight?.unsubscribe();
  }
}

/**
 * A keyed read with a cache: one entry per key, shared by every observer of
 * that key; requested on the first observer (or when stale), cancelled when
 * nobody observes it any more, kept in cache afterwards.
 */
export class Query<A, T> {
  private readonly entries = new Map<string, Entry<A, T>>();
  private seq = 0;

  constructor(private readonly opts: QueryOptions<A, T>) {}

  public get key(): ConsoleApiKey {
    return this.opts.key;
  }

  /** The key's status while subscribed. */
  public observe(arg: A): Observable<QueryStatus<T>> {
    return defer(() => {
      const entry = this.entry(arg, defect('no-share'));
      entry.attach();
      return entry.state$.pipe(finalize(() => entry.detach()));
    });
  }

  /** Refetch now if observed, else on the next observer. */
  public invalidate(match: (arg: A) => boolean = () => true) {
    for (const [, entry] of this.entries) {
      if (!match(entry.arg)) continue;
      if (entry.observers > 0) entry.fetch();
      else entry.stale = true;
    }
  }

  /** Refetch one key (Retry). */
  public refetch(arg: A) {
    this.entriesOf(arg).forEach((e) => e.fetch());
  }

  /** Refetch one key only if its last request failed. */
  public retryIfFailed(arg: A) {
    this.entriesOf(arg).forEach((e) => e.state$.value.error && e.fetch());
  }

  /** The current status of a key without observing it (null if never requested). */
  public peek(arg: A): QueryStatus<T> | null {
    const id = this.idOf(arg);
    const found = [...this.entries].find(([k]) => k === id || k.startsWith(`${id}#`));
    return found?.[1].state$.value ?? null;
  }

  /** Store a value received from a write. */
  public set(arg: A, data: T) {
    this.entriesOf(arg).forEach((e) => e.set(data));
  }

  /** Forget everything (logout): cancels requests in flight. */
  public clear() {
    if (defect('leak-session')) return;
    this.entries.forEach((e) => e.dispose());
    this.entries.clear();
  }

  /** Every entry of a key (several only with the `no-share` defect); creates one if none. */
  private entriesOf(arg: A): Entry<A, T>[] {
    const id = this.idOf(arg);
    const found = [...this.entries].filter(([k]) => k === id || k.startsWith(`${id}#`)).map(([, e]) => e);
    return found.length ? found : [this.entry(arg)];
  }

  private idOf(arg: A): string {
    return (this.opts.id ?? ((a: A) => JSON.stringify(a ?? null)))(arg);
  }

  private entry(arg: A, fresh = false): Entry<A, T> {
    const id = this.idOf(arg) + (fresh ? `#${this.seq++}` : '');
    let entry = this.entries.get(id);
    if (!entry) {
      entry = new Entry(arg, this.opts);
      this.entries.set(id, entry);
    }
    return entry;
  }
}
