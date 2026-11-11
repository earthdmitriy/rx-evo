import { inject, Injectable } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  defer,
  debounce,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  map,
  merge,
  Observable,
  of,
  skip,
  switchMap,
  takeUntil,
  timer,
} from 'rxjs';
import {
  ActivityEntry,
  Agent,
  AgentNotification,
  CartLine,
  ConsoleApiKey,
  CustomerHit,
  CustomerProfile,
  CustomerQuery,
  IN_FLIGHT,
  Note,
  NotesApi,
  NotificationsApi,
  OrderDetail,
  OrderRow,
  OrdersApi,
  Page,
  Product,
  SessionApi,
  Shipment,
  TicketRow,
  TicketsApi,
  TicketThread,
} from '../../../../services/contesters';
import {
  ACTION_IDLE,
  ActionState,
  AgentVm,
  CustomerTab,
  LinkedTicketVm,
  OrderRowVm,
  OrderSave,
  TicketReply,
  TicketRowVm,
} from '../../shared';
import { Fetched } from './fetched';
import { IDLE, RefShipmentRow, ViewState } from './view-state';
import { defect } from './defects';
import {
  initialsOf,
  toActivityVm,
  toAgentVm,
  toHeaderVm,
  toLinkedTicket,
  toNotificationVm,
  toOrderRowVm,
  toShipmentVm,
  toTicketRowVm,
  unique,
} from './mappers';
import { EntityCache } from './entity-cache';
import { Query } from './query';
import { ConsoleSources } from './sources';
import { mapFetched } from './fetched';
import {
  activityNamesOf,
  authorsOf,
  cartNamesOf,
  orderNamesOf,
  cartPricesOf,
  hitErrorsOf,
  hitPricesOf,
  hitStockOf,
  customerNamesOf,
  threadNamesOf,
  openTicketsCountOf,
  openTicketsOf,
  orderStatsOf,
  ownActivity,
  ownCart,
  ownNotes,
  ownNotifications,
  ownPage,
  RawActivity,
  RawCartLine,
  RawCustomerPage,
  RawHit,
  RawKpis,
  RawNote,
  RawNotification,
  RawOrder,
  RawThread,
  tiersOf,
} from './raw-models';
import {
  errorCalls,
  failedCalls,
  FailedCall,
  flag,
  IDLE_VM,
  keepPrevious,
  mapVm,
  memo,
  shared,
  statusFetched,
  toVm,
  Vm,
  withParts,
} from './vm';

export type { Vm } from './vm';

export type Panel =
  | { kind: 'order'; id: string }
  | { kind: 'ticket'; id: string }
  | null;

const INITIAL_QUERY: Required<CustomerQuery> = {
  text: '',
  filter: 'all',
  sort: 'name',
  dir: 'asc',
  page: 1,
};

const agentVm = memo(toAgentVm);
const headerVm = memo(toHeaderVm);
const orderRowVms = memo((rows: OrderRow[]) => rows.map(toOrderRowVm));
const ticketRowVms = memo((rows: TicketRow[]) => rows.map(toTicketRowVm));
const linkedTicket = memo(toLinkedTicket);

/**
 * The reference data layer (test oracle for the e2e suite, not a contest
 * entry): plain RxJS over a small keyed-query cache and batched entity
 * caches (`ConsoleSources`). Lives at the root, so the session and the
 * page's inputs survive navigation.
 */
@Injectable({ providedIn: 'root' })
export class OracleConsoleStore {
  private readonly d = inject(ConsoleSources);
  private readonly sessionApi = inject(SessionApi);
  private readonly ordersApi = inject(OrdersApi);
  private readonly ticketsApi = inject(TicketsApi);
  private readonly notesApi = inject(NotesApi);
  private readonly notificationsApi = inject(NotificationsApi);

  // ---------- inputs ----------

  public readonly signedIn$ = new BehaviorSubject(false);
  private epoch = 0;
  private readonly typed$ = new BehaviorSubject('');
  private readonly query$ = new BehaviorSubject<Required<CustomerQuery>>(
    INITIAL_QUERY,
  );
  public readonly selected$ = new BehaviorSubject<number | null>(null);
  public readonly tab$ = new BehaviorSubject<CustomerTab>('orders');
  public readonly panel$ = new BehaviorSubject<Panel>(null);
  public readonly editing$ = new BehaviorSubject(false);
  /** The notification dropdown is open (reported by the bell): sentences look up customers only then. */
  public readonly notificationsOpen$ = new BehaviorSubject(false);
  /** The catalog search text of the order editor, as typed. */
  private readonly searchText$ = new BehaviorSubject('');

  // ---------- writes ----------

  public readonly login$ = new BehaviorSubject<ActionState>(ACTION_IDLE);
  public readonly save$ = new BehaviorSubject<
    ActionState & { orderId?: string }
  >(ACTION_IDLE);
  public readonly reply$ = new BehaviorSubject<
    ActionState & { ticketId?: string }
  >(ACTION_IDLE);
  public readonly note$ = new BehaviorSubject<ActionState>(ACTION_IDLE);
  public readonly markRead$ = new BehaviorSubject<ActionState>(ACTION_IDLE);
  public readonly resend$ = new BehaviorSubject<ActionState>(ACTION_IDLE);

  constructor() {
    const typed = this.typed$.pipe(skip(1), distinctUntilChanged());
    (defect('no-debounce') ? typed : typed.pipe(debounceTime(300))).subscribe(
      (text) => this.setQuery({ text }),
    );

    // the editor's search starts empty every time editing flips
    this.editing$
      .pipe(distinctUntilChanged())
      .subscribe(() => this.searchText$.next(''));

    if (defect('no-lazy')) {
      this.selected$
        .pipe(
          switchMap((id) =>
            id === null
              ? EMPTY
              : merge(
                  this.cartSource(id),
                  this.d.tickets.observe(id),
                  this.d.notes.observe(id),
                ),
          ),
        )
        .subscribe();
    }
  }

  // ---------- view models ----------

  private signedIn<T>(project: () => Observable<T>, off: T): Observable<T> {
    return this.signedIn$.pipe(switchMap((on) => (on ? project() : of(off))));
  }

  public readonly agent$ = this.signedIn(
    () =>
      this.d.profile.observe().pipe(
        map(toVm<Agent>('profile')),
        map((vm): Vm<AgentVm> => mapVm(vm, agentVm)),
      ),
    IDLE_VM as Vm<AgentVm>,
  ).pipe(shared());

  /** Text of a notification needs the customer's name (tickets) from the CRM, looked up only while the dropdown is open. */
  private notificationVms(
    list: AgentNotification[],
  ): Observable<RawNotification[]> {
    const ids = unique(
      list.filter((n) => n.kind === 'ticket-reply').map((n) => n.customerId),
    );
    const closed = list.map((n) => toNotificationVm(n, null));
    if (!ids.length) return of(closed);
    const named = combineLatest(
      ids.map((id) => this.d.customer.observe(id)),
    ).pipe(
      map((statuses) => {
        const names = new Map(
          ids.map((id, i) => [id, statusFetched(statuses[i], (c) => c.name)]),
        );
        return list.map((n) =>
          toNotificationVm(n, names.get(n.customerId) ?? null),
        );
      }),
    );
    const open$ = defect('eager-sentences')
      ? of(true)
      : this.notificationsOpen$.pipe(distinctUntilChanged());
    return open$.pipe(switchMap((open) => (open ? named : of(closed))));
  }

  private readonly notificationsRaw$ = this.signedIn(
    () =>
      this.d.notifications.observe().pipe(
        map(toVm<AgentNotification[]>('notifications', (d) => !d.length)),
        withParts((list) => this.notificationVms(list)),
        map((vm) =>
          flag(
            vm,
            failedCalls(
              (vm.data ?? []).map(
                (n): [ConsoleApiKey, Fetched<unknown> | null | undefined] => [
                  'customer',
                  n.name,
                ],
              ),
            ),
          ),
        ),
      ),
    IDLE_VM as Vm<RawNotification[]>,
  ).pipe(shared());
  public readonly notifications$ = this.notificationsRaw$.pipe(
    map((vm) => mapVm(vm, ownNotifications)),
  );
  /** The CRM's names of the customers the replies are about. */
  public readonly customerNames$ = this.notificationsRaw$.pipe(
    map((vm) => (vm.data ? customerNamesOf(vm.data) : {})),
  );

  /** The query as shown in the list: the text as typed, the rest as applied. */
  public readonly displayQuery$ = combineLatest([
    this.query$,
    this.typed$,
  ]).pipe(map(([q, text]) => ({ ...q, text })));

  /** Tier and open tickets of the whole page: one batched call each. */
  private customerRows(page: Page<CustomerHit>): Observable<RawCustomerPage> {
    const ids = page.items.map((h) => h.customerId);
    return combineLatest([
      this.d.tiers.observeMany(ids),
      this.d.ticketCounts.observeMany(ids),
    ]).pipe(
      map(([tiers, counts]) => ({
        rows: page.items.map((h, i) => ({
          customerId: h.customerId,
          name: h.name,
          initials: initialsOf(h.name),
          email: h.email,
          tier: mapFetched(tiers[i], (t) => t.tier),
          openTickets: mapFetched(counts[i], (c) => c.open),
        })),
        total: page.total,
        page: page.page,
        pageSize: page.pageSize,
      })),
    );
  }

  private readonly customersRaw$ = this.signedIn(
    () =>
      this.query$.pipe(
        switchMap((q) =>
          this.d.customers.observe(q).pipe(
            map(toVm<Page<CustomerHit>>('customers', (d) => !d.items.length)),
            withParts((page) => this.customerRows(page)),
            map((vm) =>
              flag(
                vm,
                failedCalls(
                  (vm.data?.rows ?? []).flatMap(
                    (r): [ConsoleApiKey, Fetched<unknown>][] => [
                      ['tiers', r.tier],
                      ['ticketCounts', r.openTickets],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        defect('no-stale') ? (s) => s : keepPrevious<RawCustomerPage>(),
      ),
    IDLE_VM as Vm<RawCustomerPage>,
  ).pipe(shared());
  public readonly customers$ = this.customersRaw$.pipe(
    map((vm) => mapVm(vm, ownPage)),
  );
  /** The CRM's tiers of the customers on the page. */
  public readonly tiers$ = this.customersRaw$.pipe(
    map((vm) => (vm.data ? tiersOf(vm.data) : {})),
  );
  /** The tickets service's open-ticket counts of the customers on the page. */
  public readonly openTicketsOfPage$ = this.customersRaw$.pipe(
    map((vm) => (vm.data ? openTicketsOf(vm.data) : {})),
  );

  private perCustomer<T>(
    project: (id: number) => Observable<Vm<T>>,
  ): Observable<Vm<T>> {
    return this.selected$.pipe(
      switchMap((id) => (id === null ? of(IDLE_VM as Vm<T>) : project(id))),
      defect('stale-customer') ? keepPrevious<T>({ lies: true }) : (s) => s,
    );
  }

  /** Activity sentences: a viewed product needs its name from the product service. */
  private activityVms(entries: ActivityEntry[]): Observable<RawActivity[]> {
    const skus = unique(
      entries.filter((e) => e.kind === 'product-viewed').map((e) => e.refId),
    );
    if (!skus.length) return of(entries.map((e) => toActivityVm(e, null)));
    return this.d.products.observeMany(skus).pipe(
      map((products) => {
        const names = new Map(
          skus.map((sku, i) => [sku, mapFetched(products[i], (p) => p.name)]),
        );
        return entries.map((e) =>
          toActivityVm(
            e,
            e.kind === 'product-viewed' ? (names.get(e.refId) ?? null) : null,
          ),
        );
      }),
    );
  }

  /** Header, orders and activity: independent unless a defect couples them. */
  private readonly core$ = combineLatest([
    this.perCustomer((id) =>
      this.d.customer.observe(id).pipe(map(toVm<CustomerProfile>('customer'))),
    ),
    this.perCustomer((id) =>
      this.d.orders
        .observe(id)
        .pipe(map(toVm<OrderRow[]>('orders', (d) => !d.length))),
    ),
    this.perCustomer((id) =>
      this.d.activity.observe(id).pipe(
        map(toVm<ActivityEntry[]>('activity', (d) => !d.length)),
        withParts((entries) => this.activityVms(entries)),
        map((vm) =>
          flag(
            vm,
            failedCalls(
              (vm.data ?? []).map(
                (a): [ConsoleApiKey, Fetched<unknown> | null | undefined] => [
                  'product',
                  a.name,
                ],
              ),
            ),
          ),
        ),
      ),
    ),
  ]).pipe(
    map(([header, orders, activity]) => {
      const all = [header, orders, activity];
      if (defect('no-isolation')) {
        const calls = all.flatMap((v) => errorCalls(v.state));
        if (calls.length)
          return all.map((v) => ({
            ...v,
            state: {
              kind: 'error',
              failed: calls.map((c) => c.key),
              stale: false,
              error: calls[0].error,
            } as ViewState,
          })) as typeof all;
      }
      if (
        defect('no-progressive') &&
        all.some((v) => v.state.kind === 'loading')
      ) {
        return all.map((v) => ({
          ...v,
          state: { kind: 'loading' } as ViewState,
        })) as typeof all;
      }
      return all;
    }),
    shared(),
  );

  private readonly ordersRaw$ = this.core$.pipe(
    map(([, o]) => o as Vm<OrderRow[]>),
  );
  public readonly orders$ = this.ordersRaw$.pipe(
    map((o): Vm<OrderRowVm[]> => mapVm(o, orderRowVms)),
  );
  private readonly activityRaw$ = this.core$.pipe(
    map(([, , a]) => a as Vm<RawActivity[]>),
  );
  public readonly activity$ = this.activityRaw$.pipe(
    map((vm) => mapVm(vm, ownActivity)),
  );
  /** The products service's names of the viewed products. */
  public readonly activityNames$ = this.activityRaw$.pipe(
    map((vm) => (vm.data ? activityNamesOf(vm.data) : {})),
  );

  /** KPIs and tab badges: the orders service and the tickets service, each a part of its own. */
  private readonly stats$ = this.selected$.pipe(
    switchMap((id) =>
      id === null
        ? of(null)
        : combineLatest([
            this.d.orderStats.observe(id),
            this.d.ticketCounts.observe(id),
          ]).pipe(
            map(([stats, counts]) => {
              const kpis = {
                orderStats: statusFetched(stats, (s) => ({
                  lifetimeSpend: s.lifetimeSpend,
                  orders: s.orders,
                  avgOrder: s.avgOrder,
                })),
                openTickets: mapFetched(counts, (c) => c.open),
              } satisfies RawKpis;
              return {
                kpis,
                failed: failedCalls([
                  ['orderStats', kpis.orderStats],
                  ['ticketCounts', kpis.openTickets],
                ]),
              };
            }),
          ),
    ),
    shared(),
  );

  /** The profile; a failed KPI source is named next to it (with Retry) while the profile stays shown. */
  public readonly header$ = combineLatest([this.core$, this.stats$]).pipe(
    map(([[header], stats]) =>
      defect('no-partial')
        ? flag(
            mapVm(header as Vm<CustomerProfile>, headerVm),
            stats?.failed ?? [],
          )
        : mapVm(header as Vm<CustomerProfile>, headerVm),
    ),
  );
  /** The orders service's part of the KPIs (also the Orders tab's badge). */
  public readonly orderStats$ = this.stats$.pipe(
    map((s) => (s ? orderStatsOf(s.kpis) : null)),
  );
  /** The orders service's failure, for the KPI fields and the Orders badge: each shows an error with a Reload button. */
  public readonly orderStatsError$ = this.stats$.pipe(
    map((s) =>
      s?.kpis.orderStats.state === 'error'
        ? { error: s.kpis.orderStats.error }
        : null,
    ),
  );
  /** The tickets service's open tickets (the fourth KPI, also the Tickets tab's badge). */
  public readonly openTickets$ = this.stats$.pipe(
    map((s) => (s ? openTicketsCountOf(s.kpis) : null)),
  );

  public readonly shipments$: Observable<Vm<RefShipmentRow[]>> =
    this.ordersRaw$.pipe(
      map((o) => ({
        state: o.state,
        inFlight: (o.data ?? []).filter((r) => IN_FLIGHT.includes(r.status)),
      })),
      distinctUntilChanged(
        (a, b) =>
          a.state.kind === b.state.kind &&
          a.inFlight.map((r) => r.orderId + r.status).join() ===
            b.inFlight.map((r) => r.orderId + r.status).join(),
      ),
      switchMap(({ state, inFlight }) => {
        if (state.kind !== 'ready' && state.kind !== 'empty')
          return of({ state, data: null });
        if (!inFlight.length)
          return of({ state: { kind: 'empty' } as ViewState, data: [] });
        return combineLatest(
          inFlight.map((r) =>
            this.d.shipment
              .observe(r.orderId)
              .pipe(
                map((s) => ({ order: r, vm: toVm<Shipment>('shipment')(s) })),
              ),
          ),
        ).pipe(
          map((rows): Vm<RefShipmentRow[]> => {
            const data = rows.map(({ order, vm }) => ({
              orderId: order.orderId,
              status: order.status,
              state: vm.state,
              shipment: vm.data ? toShipmentVm(vm.data) : null,
            }));
            const errors = data.flatMap((r) =>
              r.state.kind === 'error' ? [r.state.error] : [],
            );
            if (defect('no-partial') && errors.length)
              return {
                state: {
                  kind: 'error',
                  failed: ['shipment'],
                  stale: false,
                  error: errors[0],
                },
                data,
              };
            return {
              state: {
                kind: 'ready',
                reloading: false,
                ...(errors.length ? { notices: errors } : {}),
              },
              data,
            };
          }),
        );
      }),
      shared(),
    );

  private onTab<T>(
    tab: CustomerTab,
    project: (id: number) => Observable<Vm<T>>,
  ): Observable<Vm<T>> {
    return combineLatest([this.selected$, this.tab$]).pipe(
      map(([id, t]) => (t === tab ? id : null)),
      distinctUntilChanged(),
      switchMap((id) => (id === null ? of(IDLE_VM as Vm<T>) : project(id))),
      shared(),
    );
  }

  /** Cart lines: skus from the cart service, names from products, current prices from pricing. */
  private cartLines(lines: CartLine[]): Observable<RawCartLine[]> {
    const skus = unique(lines.map((l) => l.sku));
    return combineLatest([
      this.d.products.observeMany(skus),
      this.d.prices.observeMany(skus),
    ]).pipe(
      map(([products, prices]) => {
        const name = new Map(
          skus.map((sku, i) => [sku, mapFetched(products[i], (p) => p.name)]),
        );
        const price = new Map(
          skus.map((sku, i) => [sku, mapFetched(prices[i], (p) => p.price)]),
        );
        return lines.map((l) => ({
          sku: l.sku,
          qty: l.qty,
          name: name.get(l.sku)!,
          price: price.get(l.sku)!,
        }));
      }),
    );
  }

  private cartSource(id: number): Observable<Vm<RawCartLine[]>> {
    return this.d.cart.observe(id).pipe(
      map(toVm<CartLine[]>('cart', (d) => !d.length)),
      withParts((lines) => this.cartLines(lines)),
      map((vm) =>
        flag(
          vm,
          failedCalls(
            (vm.data ?? []).flatMap(
              (l): [ConsoleApiKey, Fetched<unknown>][] => [
                ['product', l.name],
                ['prices', l.price],
              ],
            ),
          ),
        ),
      ),
    );
  }

  private readonly cartRaw$ = this.onTab('cart', (id) => this.cartSource(id));
  public readonly cart$ = this.cartRaw$.pipe(map((vm) => mapVm(vm, ownCart)));
  /** The products service's names of the cart's skus. */
  public readonly cartNames$ = this.cartRaw$.pipe(
    map((vm) => (vm.data ? cartNamesOf(vm.data) : {})),
  );
  /** The pricing service's current prices of the cart's skus. */
  public readonly cartPrices$ = this.cartRaw$.pipe(
    map((vm) => (vm.data ? cartPricesOf(vm.data) : {})),
  );
  public readonly tickets$ = this.onTab('tickets', (id) =>
    this.d.tickets.observe(id).pipe(
      map(toVm<TicketRow[]>('tickets', (d) => !d.length)),
      map((vm): Vm<TicketRowVm[]> => mapVm(vm, ticketRowVms)),
    ),
  );
  private readonly notesRaw$ = this.onTab('notes', (id) =>
    this.d.notes.observe(id).pipe(
      map(toVm<Note[]>('notes', (d) => !d.length)),
      withParts((notes) => this.noteVms(notes)),
      map((vm) =>
        flag(
          vm,
          failedCalls(
            (vm.data ?? []).map(
              (n): [ConsoleApiKey, Fetched<unknown> | null | undefined] => [
                'agent',
                n.author,
              ],
            ),
          ),
        ),
      ),
    ),
  );
  public readonly notes$ = this.notesRaw$.pipe(
    map((vm) => mapVm(vm, ownNotes)),
  );
  /** The agent directory's names of the notes' authors. */
  public readonly noteAuthors$ = this.notesRaw$.pipe(
    map((vm) => (vm.data ? authorsOf(vm.data) : {})),
  );

  /** Note authors are agents: names from the agent directory, one batched call. */
  private noteVms(notes: Note[]): Observable<RawNote[]> {
    const ids = unique(notes.map((n) => n.authorId));
    return this.d.agents.observeMany(ids).pipe(
      map((agents) => {
        const names = new Map(
          ids.map((id, i) => [id, mapFetched(agents[i], (a) => a.name)]),
        );
        return notes.map((n) => ({
          noteId: n.noteId,
          authorId: n.authorId,
          author: names.get(n.authorId)!,
          at: n.at,
          text: n.text,
        }));
      }),
    );
  }

  private readonly openOrderId$ = this.panel$.pipe(
    map((p) => (p?.kind === 'order' ? p.id : null)),
    distinctUntilChanged(),
  );

  /** Order lines: names from the product service. */
  private orderVm(o: OrderDetail): Observable<RawOrder> {
    const skus = unique(o.lines.map((l) => l.sku));
    return this.d.products.observeMany(skus).pipe(
      map((products) => {
        const names = new Map(
          skus.map((sku, i) => [sku, mapFetched(products[i], (p) => p.name)]),
        );
        return {
          orderId: o.orderId,
          customerId: o.customerId,
          date: o.date,
          status: o.status,
          items: o.items,
          total: o.total,
          address: o.address,
          payment: o.payment,
          shipping: o.shipping,
          lines: o.lines.map((l) => ({
            sku: l.sku,
            name: names.get(l.sku)!,
            qty: l.qty,
            unitPrice: l.unitPrice,
          })),
        };
      }),
    );
  }

  /** Search hits: name from the search, price and stock from their services. */
  private hitVms(products: Product[]): Observable<RawHit[]> {
    const skus = products.map((p) => p.sku);
    return combineLatest([
      this.d.prices.observeMany(skus),
      this.d.stock.observeMany(skus),
    ]).pipe(
      map(([prices, stock]) =>
        products.map((p, i) => ({
          sku: p.sku,
          name: p.name,
          price: mapFetched(prices[i], (x) => x.price),
          stock: mapFetched(stock[i], (x) => x.stock),
        })),
      ),
    );
  }

  /** The editor's catalog search: debounced, latest text wins, only while editing. */
  private readonly hits$: Observable<Vm<RawHit[]>> = this.editing$.pipe(
    switchMap((on) =>
      !on
        ? of(IDLE_VM as Vm<RawHit[]>)
        : this.searchText$.pipe(
            defect('no-debounce')
              ? (s) => s
              : debounce((t) => (t === '' ? of(0) : timer(300))),
            map((t) => t.trim()),
            distinctUntilChanged(),
            switchMap((text) =>
              !text
                ? of(IDLE_VM as Vm<RawHit[]>)
                : this.d.searchProducts.observe(text).pipe(
                    map(toVm<Product[]>('searchProducts', (d) => !d.length)),
                    withParts((products) => this.hitVms(products)),
                    map((vm) =>
                      defect('no-partial')
                        ? flag(
                            vm,
                            failedCalls(
                              (vm.data ?? []).flatMap(
                                (
                                  h,
                                ): [
                                  ConsoleApiKey,
                                  Fetched<unknown> | null | undefined,
                                ][] => [
                                  ['prices', h.price],
                                  ['stock', h.stock],
                                ],
                              ),
                            ),
                          )
                        : vm,
                    ),
                  ),
            ),
          ),
    ),
  );

  /** The product names every section above looked up (cart, activity, the open order), for the product name field. */
  public readonly productNames$ = defer(() =>
    combineLatest([
      this.cartNames$,
      this.activityNames$,
      this.orderPanel$.pipe(
        map((p) => (p?.order.data ? orderNamesOf(p.order.data) : {})),
      ),
    ]),
  ).pipe(map((all) => Object.assign({}, ...all) as Record<string, string>));

  /** The prices the cart and the editor's hits looked up, for the price, total and Add fields. */
  public readonly productPrices$ = defer(() =>
    combineLatest([
      this.cartPrices$,
      this.orderPanel$.pipe(
        map((p) => (p?.hits.data ? hitPricesOf(p.hits.data) : {})),
      ),
    ]),
  ).pipe(map((all) => Object.assign({}, ...all) as Record<string, number>));

  /** The stock the editor's hits looked up, for the stock and Add fields. */
  /** The hit rows' failed price and stock, for their error views (each with a Reload button). */
  public readonly hitErrors$ = defer(() => this.orderPanel$).pipe(
    map((p) => hitErrorsOf(p?.hits.data ?? [])),
  );
  /** Reload of one hit's failed price or stock: only that source is asked again. */
  public retryHit(hit: { sku: string; key: 'prices' | 'stock' }) {
    if (hit.key === 'prices') this.d.prices.retryFailed([hit.sku]);
    else this.d.stock.retryFailed([hit.sku]);
  }
  /** Reload of the failed orders service's KPIs (the Orders badge and the KPIs). */
  public retryOrderStats() {
    const id = this.selected$.value;
    if (id !== null) this.d.orderStats.retryIfFailed(id);
  }

  public readonly productStock$ = defer(() => this.orderPanel$).pipe(
    map(
      (p) =>
        (p?.hits.data ? hitStockOf(p.hits.data) : {}) as Record<string, number>,
    ),
  );

  /** The CRM's names the bell and the open ticket looked up, for the customer name field. */
  public readonly allCustomerNames$ = defer(() =>
    combineLatest([
      this.customerNames$,
      this.ticketPanel$.pipe(
        map((t) => (t?.data ? threadNamesOf(t.data, 'customer') : {})),
      ),
    ]),
  ).pipe(map((all) => Object.assign({}, ...all) as Record<string, string>));

  /** The agent directory's names the notes and the open ticket looked up, for the agent name field. */
  public readonly allAgentNames$ = defer(() =>
    combineLatest([
      this.noteAuthors$,
      this.ticketPanel$.pipe(
        map((t) => (t?.data ? threadNamesOf(t.data, 'agent') : {})),
      ),
    ]),
  ).pipe(map((all) => Object.assign({}, ...all) as Record<string, string>));

  /** The shipping service's tracking of the in-flight orders that arrived, by order id, for the shipment tracking field. */
  public readonly tracking$ = defer(() => this.shipments$).pipe(
    map((vm) => {
      const out: Record<string, NonNullable<RefShipmentRow['shipment']>> = {};
      for (const r of vm.data ?? [])
        if (r.state.kind === 'ready' && r.shipment) out[r.orderId] = r.shipment;
      return out;
    }),
  );

  public readonly orderPanel$ = this.openOrderId$.pipe(
    switchMap((id) => {
      if (id === null) return of(null);
      const order$ = this.d.order.observe(id).pipe(
        map(toVm<OrderDetail>('order')),
        withParts((o) => this.orderVm(o)),
        map((vm) =>
          flag(
            vm,
            failedCalls(
              (vm.data?.lines ?? []).map(
                (l): [ConsoleApiKey, Fetched<unknown>] => ['product', l.name],
              ),
            ),
          ),
        ),
      );
      // the linked ticket is looked up by the order id: it does not wait for the order
      const ticket$: Observable<Vm<LinkedTicketVm | null>> =
        this.d.ticketsByOrder.observe(id).pipe(
          map(toVm<TicketRow[]>('ticketsByOrder', (rows) => !rows.length)),
          map((vm): Vm<LinkedTicketVm | null> => mapVm(vm, linkedTicket)),
        );
      return combineLatest([order$, ticket$, this.hits$, this.editing$]).pipe(
        map(([order, ticket, hits, editing]) => {
          // `no-partial`: a failed box or search fails the whole panel
          const other: FailedCall[] = [
            ...errorCalls(ticket.state),
            ...errorCalls(hits.state),
          ];
          return {
            id,
            order: defect('no-partial') ? flag(order, other) : order,
            ticket,
            hits,
            editing,
          };
        }),
      );
    }),
    shared(),
  );

  /** Thread authors: customers from the CRM, agents from the agent directory. */
  private threadVm(t: TicketThread): Observable<RawThread> {
    const agentIds = unique(
      t.messages.filter((m) => m.from === 'agent').map((m) => m.authorId),
    );
    const customerIds = unique(
      t.messages.filter((m) => m.from === 'customer').map((m) => m.authorId),
    );
    const customers$ = customerIds.length
      ? combineLatest(customerIds.map((id) => this.d.customer.observe(id)))
      : of([]);
    return combineLatest([
      this.d.agents.observeMany(agentIds),
      customers$,
    ]).pipe(
      map(([agents, customers]) => {
        const agentName = new Map(
          agentIds.map((id, i) => [id, mapFetched(agents[i], (a) => a.name)]),
        );
        const customerName = new Map(
          customerIds.map((id, i) => [
            id,
            statusFetched(customers[i], (c) => c.name),
          ]),
        );
        return {
          ticketId: t.ticketId,
          customerId: t.customerId,
          subject: t.subject,
          status: t.status,
          orderId: t.orderId ?? null,
          messages: t.messages.map((m) => ({
            from: m.from,
            authorId: m.authorId,
            author: (m.from === 'agent' ? agentName : customerName).get(
              m.authorId,
            )!,
            at: m.at,
            text: m.text,
          })),
        };
      }),
    );
  }

  public readonly ticketPanel$ = this.panel$.pipe(
    map((p) => (p?.kind === 'ticket' ? p.id : null)),
    distinctUntilChanged(),
    switchMap((id) =>
      id === null
        ? of(null)
        : this.d.ticket.observe(id).pipe(
            map(toVm<TicketThread>('ticket')),
            withParts((t) => this.threadVm(t)),
            map((vm) =>
              flag(
                vm,
                failedCalls(
                  (vm.data?.messages ?? []).map(
                    (
                      m,
                    ): [ConsoleApiKey, Fetched<unknown> | null | undefined] => [
                      m.from === 'agent' ? 'agent' : 'customer',
                      m.author,
                    ],
                  ),
                ),
              ),
            ),
            map((vm) => ({ id, ...vm })),
          ),
    ),
    shared(),
  );

  // ---------- user intents ----------

  public typeSearch(text: string) {
    this.typed$.next(text);
  }

  public setQuery(patch: Partial<CustomerQuery>) {
    if ('text' in patch && patch.text !== this.typed$.value)
      this.typed$.next(patch.text ?? '');
    const resetsPage =
      'text' in patch || 'filter' in patch || 'sort' in patch || 'dir' in patch;
    this.query$.next({
      ...this.query$.value,
      ...patch,
      ...(resetsPage ? { page: 1 } : {}),
    } as Required<CustomerQuery>);
  }

  public changeQuery(patch: Partial<CustomerQuery>) {
    if ('text' in patch) this.typeSearch(patch.text ?? '');
    else this.setQuery(patch);
  }

  public searchProducts(text: string) {
    this.searchText$.next(text);
  }

  public selectCustomer(id: number | null) {
    this.selected$.next(id);
    this.panel$.next(null);
    this.editing$.next(false);
  }

  public openOrder(id: string) {
    this.editing$.next(false);
    this.panel$.next({ kind: 'order', id });
  }

  public openTicket(id: string) {
    this.editing$.next(false);
    this.panel$.next({ kind: 'ticket', id });
  }

  public closePanel() {
    this.editing$.next(false);
    this.panel$.next(null);
  }

  // ---------- retry: only what failed ----------

  /** Request a key again if its last request failed (`retry-all` defect: always). */
  private again<A, T>(query: Query<A, T>, arg: A) {
    if (defect('retry-all')) query.refetch(arg);
    else query.retryIfFailed(arg);
  }

  /** Request again the ids that failed (`retry-all` defect: all of them). */
  private againIds<K extends string | number, V>(
    cache: EntityCache<K, V>,
    ids: K[],
  ) {
    if (defect('retry-all')) cache.invalidate((id) => ids.includes(id));
    else cache.retryFailed(ids);
  }

  public retryCustomerSource(
    key: 'customer' | 'orders' | 'activity' | 'cart' | 'tickets' | 'notes',
  ) {
    const id = this.selected$.value;
    if (id === null) return;
    if (defect('retry-all')) return this.refetchCustomer(id);
    const d = this.d;
    switch (key) {
      case 'customer':
        // the KPIs and tab badges are parts of the header: request the ones that failed
        d.customer.retryIfFailed(id);
        d.orderStats.retryIfFailed(id);
        d.ticketCounts.retryFailed([id]);
        break;
      case 'orders':
        d.orders.retryIfFailed(id);
        break;
      case 'activity':
        d.activity.retryIfFailed(id);
        d.products.retryFailed(
          (d.activity.peek(id)?.data ?? [])
            .filter((e) => e.kind === 'product-viewed')
            .map((e) => e.refId),
        );
        break;
      case 'cart': {
        d.cart.retryIfFailed(id);
        const skus = (d.cart.peek(id)?.data ?? []).map((l) => l.sku);
        d.products.retryFailed(skus);
        d.prices.retryFailed(skus);
        break;
      }
      case 'tickets':
        d.tickets.retryIfFailed(id);
        break;
      case 'notes':
        d.notes.retryIfFailed(id);
        d.agents.retryFailed(
          (d.notes.peek(id)?.data ?? []).map((n) => n.authorId),
        );
        break;
    }
  }

  public retryCart() {
    this.retryCustomerSource('cart');
  }

  public retryOrder() {
    const p = this.panel$.value;
    if (p?.kind !== 'order') return;
    this.again(this.d.order, p.id);
    this.againIds(
      this.d.products,
      (this.d.order.peek(p.id)?.data?.lines ?? []).map((l) => l.sku),
    );
  }

  public retryTicket(ticketId: string) {
    const d = this.d;
    this.again(d.ticket, ticketId);
    const messages = d.ticket.peek(ticketId)?.data?.messages ?? [];
    this.againIds(
      d.agents,
      messages.filter((m) => m.from === 'agent').map((m) => m.authorId),
    );
    messages
      .filter((m) => m.from === 'customer')
      .forEach((m) => this.again(d.customer, m.authorId));
  }

  public retryProfile() {
    this.d.profile.refetch(undefined);
  }

  public retryNotifications() {
    this.again(this.d.notifications, undefined);
    (this.d.notifications.peek(undefined)?.data ?? [])
      .filter((n) => n.kind === 'ticket-reply')
      .forEach((n) => this.again(this.d.customer, n.customerId));
  }

  public retryCustomers() {
    const q = this.query$.value;
    this.again(this.d.customers, q);
    const ids = (this.d.customers.peek(q)?.data?.items ?? []).map(
      (h) => h.customerId,
    );
    this.againIds(this.d.tiers, ids);
    this.againIds(this.d.ticketCounts, ids);
  }

  private refetchCustomer(id: number) {
    const d = this.d;
    [
      d.customer,
      d.orders,
      d.orderStats,
      d.activity,
      d.cart,
      d.tickets,
      d.notes,
    ].forEach((q) => q.refetch(id));
    d.ticketCounts.invalidate((c) => c === id);
  }

  // ---------- writes ----------

  public login(email: string, password: string) {
    if (this.login$.value.pending) return;
    this.login$.next({ pending: true, error: null });
    this.sessionApi.login(email, password).subscribe({
      next: () => {
        this.epoch++;
        this.login$.next(ACTION_IDLE);
        this.signedIn$.next(true);
      },
      error: (error) => this.login$.next({ pending: false, error }),
    });
  }

  public logout() {
    this.sessionApi.logout().subscribe({ error: () => undefined });
    this.epoch++;
    this.signedIn$.next(false);
    this.selectCustomer(null);
    this.tab$.next('orders');
    this.typed$.next('');
    this.query$.next(INITIAL_QUERY);
    [this.save$, this.reply$, this.note$, this.markRead$, this.resend$].forEach(
      (s) => s.next(ACTION_IDLE),
    );
    this.d.clearSession();
  }

  /** Runs a write; its result is dropped if the session changed meanwhile. */
  private write<T>(
    call: Observable<T>,
    state$: BehaviorSubject<ActionState & Record<string, unknown>>,
    tag: Record<string, unknown>,
    done: (value: T) => void,
  ) {
    if (state$.value.pending) return; // no double submission
    const epoch = this.epoch;
    state$.next({ pending: true, error: null, ...tag });
    const guarded = defect('cancel-writes')
      ? call.pipe(takeUntil(this.selected$.pipe(skip(1))))
      : call;
    guarded.subscribe({
      next: (value) => {
        if (epoch !== this.epoch) return;
        state$.next({ ...ACTION_IDLE, ...tag });
        done(value);
      },
      error: (error) => {
        if (epoch === this.epoch)
          state$.next({ pending: false, error, ...tag });
      },
    });
  }

  public saveOrder(orderId: string, customerId: number, save: OrderSave) {
    const before = this.d.order.peek(orderId)?.data;
    this.write(
      this.ordersApi.updateOrder(orderId, save.lines, save.reply),
      this.save$,
      { orderId },
      (detail) => {
        const d = this.d;
        const p = this.panel$.value;
        if (p?.kind === 'order' && p.id === orderId) this.editing$.next(false);
        d.order.set(orderId, detail);
        if (defect('refresh-all')) {
          this.refetchCustomer(customerId);
          d.customers.invalidate();
          return;
        }
        d.orders.invalidate((id) => id === customerId);
        if (!defect('stale-stats'))
          d.orderStats.invalidate((id) => id === customerId);
        // the order changed the stock of the skus it touches
        const skus = new Set(
          [...detail.lines, ...(before?.lines ?? [])].map((l) => l.sku),
        );
        d.stock.invalidate((sku) => skus.has(sku));
        if (save.reply) {
          const ticketId = save.reply.ticketId;
          d.ticket.invalidate((id) => id === ticketId);
          d.tickets.invalidate((id) => id === customerId);
          d.ticketsByOrder.invalidate((id) => id === orderId);
          if (!defect('stale-stats'))
            d.ticketCounts.invalidate((id) => id === customerId);
        }
      },
    );
  }

  public replyTicket(ticketId: string, reply: TicketReply) {
    this.write(
      this.ticketsApi.replyTicket(ticketId, reply.text, reply.status),
      this.reply$,
      { ticketId },
      (thread) => {
        const d = this.d;
        d.ticket.set(ticketId, thread);
        d.tickets.invalidate((id) => id === thread.customerId);
        if (!defect('stale-stats'))
          d.ticketCounts.invalidate((id) => id === thread.customerId);
        if (thread.orderId)
          d.ticketsByOrder.invalidate((id) => id === thread.orderId);
        if (defect('refresh-all')) this.refetchCustomer(thread.customerId);
      },
    );
  }

  public addNote(customerId: number, text: string) {
    this.write(this.notesApi.addNote(customerId, text), this.note$, {}, () => {
      this.d.notes.invalidate((id) => id === customerId);
      if (defect('refresh-all')) this.refetchCustomer(customerId);
    });
  }

  public markAllRead() {
    this.write(
      this.notificationsApi.markNotificationsRead(),
      this.markRead$,
      {},
      () => this.d.notifications.invalidate(),
    );
  }

  public resendConfirmation(orderId: string) {
    this.write(
      this.ordersApi.resendConfirmation(orderId),
      this.resend$,
      { orderId },
      () => undefined,
    );
  }
}
