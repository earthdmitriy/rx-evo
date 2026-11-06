import { BehaviorSubject, combineLatest, defer, finalize, Observable, of, Subscription } from 'rxjs';
import { ConsoleApiKey, MAX_BATCH } from '../../../../services/contesters';
import { Part, part } from '../../shared';
import { defect } from './defects';

type Batch<K, V> = { slots: Slot<K, V>[]; sub?: Subscription };

/** One id of the cache and everything known about it. */
class Slot<K, V> {
  public readonly subject = new BehaviorSubject<Part<V>>(part.loading());
  public observers = 0;
  public fetching = false;
  public queued = false;
  public stale = false;
  public batch: Batch<K, V> | null = null;

  constructor(public readonly id: K) {}
}

type EntityOptions<K, V> = {
  key: ConsoleApiKey;
  /** One batched call; the cache never passes more than `MAX_BATCH` ids. */
  fetch: (ids: K[]) => Observable<V[]>;
  idOf: (value: V) => K;
};

/**
 * Entities of a batched service, cached per id. Ids requested in the same
 * tick are collected, split into chunks of at most `MAX_BATCH` and fetched
 * once each; later observers of a loaded id get the cached value. A failed
 * batch turns only its ids into `error` parts; `retryFailed` asks for those
 * ids again. A batch is cancelled when nobody observes any of its ids.
 */
export class EntityCache<K extends string | number, V> {
  private readonly slots = new Map<K, Slot<K, V>>();
  /** Private slots of the `no-share` defect: every consumer fetches for itself. */
  private readonly loose = new Set<Slot<K, V>>();
  private readonly pending = new Set<Slot<K, V>>();
  private scheduled = false;

  constructor(private readonly opts: EntityOptions<K, V>) {}

  public get key(): ConsoleApiKey {
    return this.opts.key;
  }

  /** One id as a `Part`: loading until its batch answers, `error` if it failed. */
  public observe(id: K): Observable<Part<V>> {
    return defer(() => {
      const slot = this.slotFor(id);
      slot.observers++;
      if (this.needsFetch(slot)) this.enqueue(slot);
      return slot.subject.pipe(finalize(() => this.detach(slot)));
    });
  }

  public observeMany(ids: K[]): Observable<Part<V>[]> {
    return ids.length ? combineLatest(ids.map((id) => this.observe(id))) : of([]);
  }

  /** The current part of an id without observing it. */
  public peek(id: K): Part<V> | null {
    return this.slots.get(id)?.subject.value ?? null;
  }

  /** Refetch matching ids now if observed, else on the next observer. */
  public invalidate(match: (id: K) => boolean = () => true) {
    for (const slot of this.all()) {
      if (!match(slot.id)) continue;
      if (slot.fetching) this.release(slot);
      if (slot.observers > 0) this.enqueue(slot);
      else slot.stale = true;
    }
  }

  /** Request again the ids of this list that failed (one batch for all). */
  public retryFailed(ids: K[]) {
    const wanted = new Set(ids);
    for (const slot of this.all()) {
      if (wanted.has(slot.id) && slot.subject.value.state === 'error' && slot.observers > 0) this.enqueue(slot);
    }
  }

  /** Forget everything (logout): cancels batches in flight. */
  public clear() {
    if (defect('leak-session')) return;
    this.all().forEach((slot) => slot.batch?.sub?.unsubscribe());
    this.slots.clear();
    this.loose.clear();
    this.pending.clear();
  }

  private all(): Slot<K, V>[] {
    return [...this.slots.values(), ...this.loose];
  }

  private slotFor(id: K): Slot<K, V> {
    if (defect('no-share')) {
      const slot = new Slot<K, V>(id);
      this.loose.add(slot);
      return slot;
    }
    let slot = this.slots.get(id);
    if (!slot) this.slots.set(id, (slot = new Slot<K, V>(id)));
    return slot;
  }

  private needsFetch(slot: Slot<K, V>): boolean {
    if (slot.fetching || slot.queued) return false;
    return defect('no-cache') || slot.stale || slot.subject.value.state !== 'ready';
  }

  private enqueue(slot: Slot<K, V>) {
    if (slot.queued) return;
    slot.queued = true;
    this.pending.add(slot);
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => this.flush());
  }

  /** Everything asked for in this tick goes out as chunks of at most `MAX_BATCH`. */
  private flush() {
    this.scheduled = false;
    const slots = [...this.pending].filter((s) => s.observers > 0);
    this.pending.forEach((s) => (s.queued = false));
    this.pending.clear();
    if (defect('no-share') || defect('no-batch')) return slots.forEach((s) => this.start([s]));
    const size = defect('no-chunk') ? slots.length : MAX_BATCH;
    for (let i = 0; i < slots.length; i += size) this.start(slots.slice(i, i + size));
  }

  private start(slots: Slot<K, V>[]) {
    const batch: Batch<K, V> = { slots: [...slots] };
    for (const slot of slots) {
      slot.fetching = true;
      slot.stale = false;
      slot.batch = batch;
      if (defect('no-stale') && slot.subject.value.state === 'ready') slot.subject.next(part.loading());
    }
    batch.sub = this.opts.fetch(slots.map((s) => s.id)).subscribe({
      next: (items) => {
        const byId = new Map(items.map((v) => [this.opts.idOf(v), v]));
        this.finish(batch, (slot) => (byId.has(slot.id) ? part.ready(byId.get(slot.id)!) : part.error()));
      },
      error: () => this.finish(batch, () => part.error()),
    });
  }

  private finish(batch: Batch<K, V>, result: (slot: Slot<K, V>) => Part<V>) {
    for (const slot of batch.slots) {
      slot.fetching = false;
      slot.batch = null;
      slot.subject.next(result(slot));
    }
    batch.slots = [];
  }

  /** Detach a slot from its batch (a newer request replaces it); cancel the batch if nobody is left in it. */
  private release(slot: Slot<K, V>) {
    const batch = slot.batch;
    if (batch) {
      batch.slots = batch.slots.filter((s) => s !== slot);
      if (!batch.slots.length) batch.sub?.unsubscribe();
    }
    slot.batch = null;
    slot.fetching = false;
  }

  private detach(slot: Slot<K, V>) {
    slot.observers--;
    if (slot.observers > 0) return;
    this.loose.delete(slot);
    const batch = slot.batch;
    if (!slot.fetching || !batch || defect('no-cancel')) return;
    // the answer is still wanted if anyone else waits for this batch
    if (batch.slots.some((s) => s.observers > 0)) return;
    batch.sub?.unsubscribe();
    for (const s of batch.slots) {
      s.fetching = false;
      s.batch = null;
      s.stale = true;
    }
    batch.slots = [];
  }
}
