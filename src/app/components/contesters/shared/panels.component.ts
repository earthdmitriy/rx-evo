import { CurrencyPipe, DatePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { ACTION_IDLE, ActionState } from './view-state';
import {
  AGENT_NAME_FIELD,
  CUSTOMER_NAME_FIELD,
  HIT_ADD_FIELD,
  HitAdded,
  PRODUCT_NAME_FIELD,
  PRODUCT_PRICE_FIELD,
  PRODUCT_STOCK_FIELD,
} from './fields';
import {
  LinkedTicketVm,
  MessageVm,
  OrderLineVm,
  OrderVm,
  ProductHitVm,
  TicketStatusVm,
  TicketThreadVm,
} from './view-models';

/** The failed price and stock of each hit, with their errors as they came. */
export type HitErrors = Record<
  string,
  { prices?: { error: unknown }; stock?: { error: unknown } }
>;

/** What Save sends: the full new list of lines, and the reply on the linked ticket if any. */
export type OrderSave = {
  lines: { sku: string; qty: number }[];
  reply?: { ticketId: string; text: string };
};
export type TicketReply = { text: string; status: TicketStatusVm };

const sum = (lines: OrderLineVm[]) =>
  lines.reduce((t, l) => t + l.qty * l.unitPrice, 0);

/**
 * S11: one order.
 *
 * - The linked ticket box shows `ticket`: `undefined` until it is known,
 *   `null` when there is none (no box).
 * - Lines show their name with the product name field (`PRODUCT_NAME_FIELD`,
 *   empty until the product service answers); a product added in this edit
 *   shows the name its hit carried.
 * - While `editing`: qty ±, remove, and "Add from catalog": typing emits
 *   `search` (not debounced); `hits` are the results (null: none to show),
 *   each with its price, its stock and its Add button as field components by
 *   sku (`PRODUCT_PRICE_FIELD`, `PRODUCT_STOCK_FIELD`, `HIT_ADD_FIELD`), empty
 *   until they arrive; Add needs both and stock > 0, and hands the view the
 *   price to put on the new line. Then the price
 *   difference, Save (and reply on the linked ticket), Discard.
 *
 * The edited lines and texts are UI state: reset when the order or `editing`
 * changes, kept when a save fails.
 */
@Component({
  selector: 'app-console-order-panel',
  imports: [GenericErrorComponent, CurrencyPipe, DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div
      class="absolute inset-0 z-30 rounded-xl bg-slate-900/20"
      (click)="close.emit()"
      aria-hidden="true"
    ></div>
    <aside
      class="card fixed top-0 right-0 bottom-0 z-40 flex w-full max-w-md flex-col shadow-md"
      aria-label="Order details"
      data-testid="order-panel"
      [attr.data-content]="order() ? 'shown' : 'none'"
      [attr.data-order-id]="orderId()"
    >
      <header class="card-header">
        <div>
          <h3 class="card-title font-mono">{{ orderId() }}</h3>
          @if (order(); as o) {
            <div class="text-xs text-slate-500">
              {{ o.date | date: 'MMM d, y' }} · {{ o.items }} items
            </div>
          }
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon"
          data-testid="close-panel"
          aria-label="Close order"
          (click)="close.emit()"
        >
          ✕
        </button>
      </header>

      <div class="flex-1 space-y-5 overflow-y-auto p-5">
        @if (ticket() !== null) {
          <div class="block min-h-16" data-testid="order-ticket">
            @if (ticketError(); as e) {
              <app-generic-error [error]="e" />
            }
            @if (ticket(); as t) {
              <button
                type="button"
                class="block w-full rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-left hover:border-sky-300"
                [attr.data-ticket-id]="t.ticketId"
                (click)="openTicket.emit(t.ticketId)"
              >
                <div class="mb-1 flex items-center gap-2 text-xs">
                  <span class="font-mono text-slate-500">{{ t.ticketId }}</span>
                  <span
                    class="badge"
                    [class]="
                      t.status === 'Open'
                        ? 'badge-bad'
                        : t.status === 'Waiting'
                          ? 'badge-warn'
                          : 'badge-good'
                    "
                    >{{ t.status }}</span
                  >
                </div>
                <p class="text-sm text-slate-800">“{{ t.subject }}”</p>
              </button>
            }
          </div>
        }

        <div data-part="main">
          @if (order(); as o) {
            <div class="space-y-5" [attr.data-customer-id]="o.customerId">
              <div class="flex flex-wrap gap-2">
                <span class="badge badge-neutral" data-testid="order-status">{{
                  o.status
                }}</span>
                <span class="badge badge-neutral">{{ o.payment }}</span>
                <span class="badge badge-neutral"
                  >{{ o.shipping }} shipping</span
                >
              </div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="num">Qty</th>
                    <th class="num">Price</th>
                  </tr>
                </thead>
                <tbody>
                  @for (l of shownLines(); track l.sku) {
                    <tr [attr.data-sku]="l.sku">
                      <th>
                        <span
                          class="inline-block min-w-24"
                          data-testid="line-name"
                        >
                          @if (addedNames()[l.sku]; as added) {
                            <ng-container>{{ added }}</ng-container>
                          } @else {
                            <ng-container
                              *ngComponentOutlet="
                                productName;
                                inputs: { sku: l.sku }
                              "
                            />
                          }
                        </span>
                        <span
                          class="block font-mono text-xs font-normal text-slate-400"
                          >{{ l.sku }}</span
                        >
                      </th>
                      <td class="num">
                        @if (editing()) {
                          <span class="inline-flex items-center gap-1">
                            <button
                              type="button"
                              class="btn btn-ghost btn-icon size-6"
                              [attr.data-testid]="'qty-dec-' + l.sku"
                              [attr.aria-label]="'Decrease ' + l.sku"
                              (click)="setQty(l.sku, l.qty - 1)"
                            >
                              −
                            </button>
                            <span class="w-5 text-center">{{ l.qty }}</span>
                            <button
                              type="button"
                              class="btn btn-ghost btn-icon size-6"
                              [attr.data-testid]="'qty-inc-' + l.sku"
                              [attr.aria-label]="'Increase ' + l.sku"
                              (click)="setQty(l.sku, l.qty + 1)"
                            >
                              +
                            </button>
                          </span>
                        } @else {
                          {{ l.qty }}
                        }
                      </td>
                      <td class="num">
                        {{ l.unitPrice | currency: 'USD' }}
                        @if (editing()) {
                          <button
                            type="button"
                            class="block w-full text-right text-xs text-rose-600 hover:text-rose-500"
                            [attr.data-testid]="'remove-' + l.sku"
                            (click)="setQty(l.sku, 0)"
                          >
                            Remove
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot>
                  <tr>
                    <th colspan="2">Total</th>
                    <td class="num" data-testid="order-panel-total">
                      {{ draftTotal() | currency: 'USD' }}
                    </td>
                  </tr>
                </tfoot>
              </table>

              @if (editing()) {
                <div class="relative" data-testid="catalog-search">
                  <label class="label" for="console-catalog"
                    >Add from catalog</label
                  >
                  <input
                    id="console-catalog"
                    class="input"
                    type="search"
                    placeholder="Search products…"
                    [value]="query()"
                    (input)="onSearch($any($event.target).value)"
                  />
                  @if (hits(); as h) {
                    @if (h.length) {
                      <ul class="card mt-1 overflow-hidden">
                        @for (p of h; track p.sku) {
                          <li
                            class="flex items-center gap-3 border-t border-slate-100 px-3 py-2 first:border-t-0"
                            [attr.data-sku]="p.sku"
                          >
                            <div class="min-w-0 flex-1">
                              <div class="truncate text-sm text-slate-900">
                                {{ p.name }}
                              </div>
                              <div class="text-xs text-slate-500">
                                @if (hitErrors()[p.sku]?.prices; as f) {
                                  <app-generic-error
                                    [error]="f.error"
                                    [showReload]="true"
                                    (reload)="
                                      retryHit.emit({
                                        sku: p.sku,
                                        key: 'prices',
                                      })
                                    "
                                  />
                                } @else {
                                  <span
                                    class="inline-block min-w-12"
                                    data-testid="hit-price"
                                    ><ng-container
                                      *ngComponentOutlet="
                                        productPrice;
                                        inputs: { sku: p.sku }
                                      "
                                  /></span>
                                }
                                ·
                                @if (hitErrors()[p.sku]?.stock; as f) {
                                  <app-generic-error
                                    [error]="f.error"
                                    [showReload]="true"
                                    (reload)="
                                      retryHit.emit({
                                        sku: p.sku,
                                        key: 'stock',
                                      })
                                    "
                                  />
                                } @else {
                                  <span
                                    class="inline-block min-w-16"
                                    data-testid="hit-stock"
                                    ><ng-container
                                      *ngComponentOutlet="
                                        productStock;
                                        inputs: { sku: p.sku }
                                      "
                                  /></span>
                                }
                              </div>
                            </div>
                            <ng-container
                              *ngComponentOutlet="
                                hitAdd;
                                inputs: { sku: p.sku, onAdd: added }
                              "
                            />
                          </li>
                        }
                      </ul>
                    } @else {
                      <div class="empty-state py-3">No products match.</div>
                    }
                  }
                </div>
                @if (linked(); as t) {
                  <div>
                    <label class="label" for="console-order-reply"
                      >Reply on {{ t.ticketId }}</label
                    >
                    <textarea
                      id="console-order-reply"
                      class="input min-h-16"
                      data-testid="order-reply-text"
                      [value]="replyText()"
                      (input)="replyText.set($any($event.target).value)"
                    ></textarea>
                  </div>
                }
              } @else if (o.status !== 'Processing') {
                <p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  This order has left the warehouse, so its items can't be
                  changed. Create a return instead.
                </p>
              }

              <div>
                <div class="section-title mb-1">Ship to</div>
                <p class="text-sm text-slate-700">{{ o.address }}</p>
              </div>
            </div>
          }
        </div>
      </div>

      @if (order(); as o) {
        <footer class="border-t border-slate-200 px-5 py-3">
          <!-- @s2-begin -->
          @if (saveState().error) {
            <app-generic-error
              class="mb-3 block"
              data-testid="save-error"
              [error]="saveState().error"
            ></app-generic-error>
          }
          @if (resendState().error) {
            <app-generic-error
              class="mb-3 block"
              [error]="resendState().error"
            ></app-generic-error>
          }
          <!-- @s2-end -->
          @if (editing()) {
            <div
              class="mb-3 flex items-baseline justify-between text-sm"
              data-testid="price-difference"
            >
              <span class="text-slate-500">
                {{ originalTotal() | currency: 'USD' }} →
                <span class="font-semibold text-slate-900">{{
                  draftTotal() | currency: 'USD'
                }}</span>
              </span>
              @if (draftTotal() > originalTotal()) {
                <span class="text-slate-700"
                  >charge
                  {{ draftTotal() - originalTotal() | currency: 'USD' }}</span
                >
              } @else if (draftTotal() < originalTotal()) {
                <span class="text-slate-700"
                  >refund
                  {{ originalTotal() - draftTotal() | currency: 'USD' }}</span
                >
              }
            </div>
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                data-testid="discard"
                [disabled]="saveState().pending"
                (click)="editChange.emit(false)"
              >
                Discard
              </button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                data-testid="save"
                [disabled]="saveState().pending || !draft().length"
                (click)="emitSave()"
              >
                @if (saveState().pending) {
                  Saving…
                } @else if (linked() && replyText().trim()) {
                  Save and reply on {{ linked()!.ticketId }}
                } @else {
                  Save changes
                }
              </button>
            </div>
          } @else {
            <div class="flex justify-end gap-2">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                data-testid="resend"
                [disabled]="resendState().pending"
                (click)="resend.emit()"
              >
                {{ resendState().pending ? 'Sending…' : 'Resend confirmation' }}
              </button>
              @if (o.status === 'Processing') {
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  data-testid="edit-items"
                  (click)="editChange.emit(true)"
                >
                  Edit items
                </button>
              } @else {
                <button
                  type="button"
                  class="btn btn-primary btn-sm"
                  data-testid="create-return"
                >
                  Create return
                </button>
              }
            </div>
          }
        </footer>
      }
    </aside>
  `,
})
export class ConsoleOrderPanelComponent {
  public readonly orderId = input.required<string>();
  public readonly order = input<OrderVm | null>(null);
  /** The ticket this order is discussed in: `undefined` until known, `null` (none) hides the box. */
  public readonly ticket = input<LinkedTicketVm | null | undefined>(undefined);
  /** The linked ticket failed: its error view shows in the box, the rest of the panel stays. */
  public readonly ticketError = input<unknown>(null);
  public readonly editing = input(false);
  /** Product search results for the text last emitted by `search`; null: none to show (before any search, until the answer). */
  public readonly hits = input<ProductHitVm[] | null>(null);
  /** The hits whose price or stock failed: their field shows the error with a Reload button. */
  public readonly hitErrors = input<HitErrors>({});
  /** Reload of a hit's failed price or stock. */
  public readonly retryHit = output<{ sku: string; key: 'prices' | 'stock' }>();
  /** Shows the product name by sku (the order's lines): supplied by the implementation (`PRODUCT_NAME_FIELD`). */
  protected readonly productName = inject(PRODUCT_NAME_FIELD);
  /** Show the price, the stock and the Add button of a hit by sku: supplied by the implementation. */
  protected readonly productPrice = inject(PRODUCT_PRICE_FIELD);
  protected readonly productStock = inject(PRODUCT_STOCK_FIELD);
  protected readonly hitAdd = inject(HIT_ADD_FIELD);
  public readonly saveState = input<ActionState>(ACTION_IDLE);
  public readonly resendState = input<ActionState>(ACTION_IDLE);

  public readonly close = output<void>();
  public readonly editChange = output<boolean>();
  /** The search text as typed (not debounced, not trimmed). */
  public readonly search = output<string>();
  public readonly save = output<OrderSave>();
  public readonly resend = output<void>();
  public readonly openTicket = output<string>();

  protected readonly linked = computed(() => this.ticket() ?? null);

  /** Edited lines (UI state). */
  protected readonly draft = linkedSignal<
    { lines: OrderLineVm[]; editing: boolean },
    OrderLineVm[]
  >({
    source: () => ({
      lines: this.order()?.lines ?? [],
      editing: this.editing(),
    }),
    computation: ({ lines }) => lines,
  });
  protected readonly replyText = linkedSignal(() =>
    this.linked() && this.editing() ? 'Done: your order is updated.' : '',
  );
  protected readonly query = linkedSignal({
    source: this.editing,
    computation: () => '',
  });

  protected readonly shownLines = computed(() =>
    this.editing() ? this.draft() : (this.order()?.lines ?? []),
  );
  protected readonly originalTotal = computed(() =>
    sum(this.order()?.lines ?? []),
  );
  protected readonly draftTotal = computed(() => sum(this.shownLines()));

  protected onSearch(text: string) {
    this.query.set(text);
    this.search.emit(text);
  }

  /** Names of the products added in this edit (their hit carried the name). */
  protected readonly addedNames = signal<Record<string, string>>({});

  protected setQty(sku: string, qty: number) {
    this.draft.update((ls) =>
      qty > 0
        ? ls.map((l) => (l.sku === sku ? { ...l, qty } : l))
        : ls.filter((l) => l.sku !== sku),
    );
  }

  /** The Add action of a hit hands over the sku and the current price. */
  protected readonly added = ({ sku, unitPrice }: HitAdded) => {
    const hit = this.hits()?.find((h) => h.sku === sku);
    if (!hit) return;
    const existing = this.draft().find((l) => l.sku === sku);
    if (existing) this.setQty(sku, existing.qty + 1);
    else {
      this.addedNames.update((names) => ({ ...names, [sku]: hit.name }));
      this.draft.update((ls) => [...ls, { sku, qty: 1, unitPrice }]);
    }
    this.onSearch('');
  };

  protected emitSave() {
    const text = this.replyText().trim();
    const t = this.linked();
    this.save.emit({
      lines: this.draft().map(({ sku, qty }) => ({ sku, qty })),
      reply: t && text ? { ticketId: t.ticketId, text } : undefined,
    });
  }
}

/** S12: one ticket's thread (authors are field components by id, `CUSTOMER_NAME_FIELD` / `AGENT_NAME_FIELD`, empty until they arrive) and the reply box (hidden once Solved). The reply text is kept until the thread changes. */
@Component({
  selector: 'app-console-ticket-panel',
  imports: [GenericErrorComponent, DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div
      class="absolute inset-0 z-30 rounded-xl bg-slate-900/20"
      (click)="close.emit()"
      aria-hidden="true"
    ></div>
    <aside
      class="card fixed top-0 right-0 bottom-0 z-40 flex w-full max-w-md flex-col shadow-md"
      aria-label="Ticket"
      data-testid="ticket-panel"
      [attr.data-content]="ticket() ? 'shown' : 'none'"
      [attr.data-ticket-id]="ticketId()"
    >
      <header class="card-header items-start">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h3 class="card-title font-mono">{{ ticketId() }}</h3>
            @if (ticket(); as t) {
              <span
                class="badge"
                data-testid="ticket-panel-status"
                [class]="
                  t.status === 'Open'
                    ? 'badge-bad'
                    : t.status === 'Waiting'
                      ? 'badge-warn'
                      : 'badge-good'
                "
                >{{ t.status }}</span
              >
              @if (t.orderId; as orderId) {
                <button
                  type="button"
                  class="font-mono text-xs text-indigo-600 hover:text-indigo-500"
                  data-testid="ticket-panel-order"
                  (click)="openOrder.emit(orderId)"
                >
                  {{ orderId }} →
                </button>
              }
            }
          </div>
          @if (ticket(); as t) {
            <div class="mt-1 text-sm text-slate-700">{{ t.subject }}</div>
          }
        </div>
        <button
          type="button"
          class="btn btn-ghost btn-icon shrink-0"
          data-testid="close-panel"
          aria-label="Close ticket"
          (click)="close.emit()"
        >
          ✕
        </button>
      </header>

      <div data-part="main" class="flex-1 overflow-y-auto">
        @if (ticket(); as t) {
          <ol class="space-y-3 p-5" [attr.data-customer-id]="t.customerId">
            @for (msg of t.messages; track $index) {
              <li
                class="flex"
                [class.justify-end]="msg.from === 'agent'"
                data-testid="ticket-message"
              >
                <div
                  class="max-w-[85%] rounded-xl px-3 py-2"
                  [class]="
                    msg.from === 'agent'
                      ? 'bg-indigo-50'
                      : 'border border-slate-200 bg-white'
                  "
                >
                  <div class="mb-0.5 text-xs text-slate-500">
                    <span
                      class="inline-block min-w-12"
                      data-testid="message-author"
                    >
                      @if (msg.from === 'agent') {
                        <ng-container
                          *ngComponentOutlet="
                            agentName;
                            inputs: { agentId: msg.authorId }
                          "
                        />
                      } @else {
                        <ng-container
                          *ngComponentOutlet="
                            customerName;
                            inputs: { customerId: msg.authorId }
                          "
                        />
                      }
                    </span>
                    · {{ msg.at | date: 'MMM d, HH:mm' }}
                  </div>
                  <p class="text-sm text-slate-800">{{ msg.text }}</p>
                </div>
              </li>
            }
          </ol>
        }
      </div>

      @if (ticket(); as t) {
        @if (t.status !== 'Solved') {
          <form
            class="border-t border-slate-200 p-4"
            (submit)="
              $event.preventDefault();
              reply.emit({ text: text(), status: status() })
            "
          >
            <label class="sr-only" for="console-reply">Reply</label>
            <textarea
              id="console-reply"
              class="input mb-2 min-h-20"
              placeholder="Reply to the customer…"
              data-testid="reply-text"
              [value]="text()"
              (input)="text.set($any($event.target).value)"
            ></textarea>
            <!-- @s2-begin -->
            @if (replyState().error) {
              <app-generic-error
                class="mb-2 block"
                data-testid="reply-error"
                [error]="replyState().error"
              ></app-generic-error>
            }
            <!-- @s2-end -->
            <div class="flex items-center justify-end gap-2">
              <label class="text-xs text-slate-500" for="console-reply-status"
                >Then set</label
              >
              <select
                id="console-reply-status"
                class="input w-auto py-1 text-xs"
                data-testid="reply-status"
                [value]="status()"
                (change)="status.set($any($event.target).value)"
              >
                <option value="Waiting">Waiting on customer</option>
                <option value="Solved">Solved</option>
                <option value="Open">Open</option>
              </select>
              <button
                type="submit"
                class="btn btn-primary btn-sm"
                data-testid="reply-send"
                [disabled]="replyState().pending || !text().trim()"
              >
                {{ replyState().pending ? 'Sending…' : 'Send reply' }}
              </button>
            </div>
          </form>
        } @else {
          <p class="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">
            Solved. The customer can reopen it by replying.
          </p>
        }
      }
    </aside>
  `,
})
export class ConsoleTicketPanelComponent {
  public readonly ticketId = input.required<string>();
  public readonly ticket = input<TicketThreadVm | null>(null);
  /** Shows the name of a customer (CRM, customer messages): supplied by the implementation (`CUSTOMER_NAME_FIELD`). */
  protected readonly customerName = inject(CUSTOMER_NAME_FIELD);
  /** Shows the name of an agent (agent directory, agent messages): supplied by the implementation (`AGENT_NAME_FIELD`). */
  protected readonly agentName = inject(AGENT_NAME_FIELD);
  public readonly replyState = input<ActionState>(ACTION_IDLE);
  public readonly reply = output<TicketReply>();
  public readonly openOrder = output<string>();
  public readonly close = output<void>();

  protected readonly text = linkedSignal({
    source: () => this.ticket()?.messages.length ?? 0,
    computation: () => '',
  });
  protected readonly status = linkedSignal<number, TicketStatusVm>({
    source: () => this.ticket()?.messages.length ?? 0,
    computation: () => 'Waiting',
  });
}
