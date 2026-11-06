import { CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { PartComponent } from './part.component';
import { ACTION_IDLE, ActionState } from './view-state';
import { LinkedTicketVm, OrderLineVm, OrderVm, Part, part, ProductHitVm, TicketStatusVm, TicketThreadVm } from './view-models';

/** What Save sends: the full new list of lines, and the reply on the linked ticket if any. */
export type OrderSave = { lines: { sku: string; qty: number }[]; reply?: { ticketId: string; text: string } };
export type TicketReply = { text: string; status: TicketStatusVm };

const sum = (lines: OrderLineVm[]) => lines.reduce((t, l) => t + l.qty * l.unitPrice, 0);

/**
 * S11: one order.
 *
 * - The linked ticket box shows `ticket`, a `Part` (null or a ready `null`:
 *   no linked ticket, no box).
 * - Lines show their name as a `Part`.
 * - While `editing`: qty ±, remove, and "Add from catalog": typing emits
 *   `search` (not debounced); `hits` are the results, each with price and
 *   stock as `Part`s; Add needs both ready and stock > 0. Then the price
 *   difference, Save (and reply on the linked ticket), Discard.
 *
 * The edited lines and texts are UI state: reset when the order or `editing`
 * changes, kept when a save fails.
 */
@Component({
  selector: 'app-console-order-panel',
  imports: [GenericErrorComponent, PartComponent, CurrencyPipe, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="absolute inset-0 z-30 rounded-xl bg-slate-900/20" (click)="close.emit()" aria-hidden="true"></div>
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
            <div class="text-xs text-slate-500">{{ o.date | date: 'MMM d, y' }} · {{ o.items }} items</div>
          }
        </div>
        <button type="button" class="btn btn-ghost btn-icon" data-testid="close-panel" aria-label="Close order" (click)="close.emit()">✕</button>
      </header>

      <div class="flex-1 space-y-5 overflow-y-auto p-5">
        @if (ticket(); as tp) {
          @if (tp.state !== 'ready' || tp.value) {
            <app-part class="block" data-testid="order-ticket" [part]="tp" [width]="14" errorText="Linked ticket unavailable" [retryable]="true" (retry)="retryTicket.emit()">
              @if (tp.value; as t) {
                <button
                  type="button"
                  class="block w-full rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-left hover:border-sky-300"
                  [attr.data-ticket-id]="t.ticketId"
                  (click)="openTicket.emit(t.ticketId)"
                >
                  <div class="mb-1 flex items-center gap-2 text-xs">
                    <span class="font-mono text-slate-500">{{ t.ticketId }}</span>
                    <span class="badge" [class]="t.status === 'Open' ? 'badge-bad' : t.status === 'Waiting' ? 'badge-warn' : 'badge-good'">{{ t.status }}</span>
                  </div>
                  <p class="text-sm text-slate-800">“{{ t.subject }}”</p>
                </button>
              }
            </app-part>
          }
        }

        <div data-part="main">
          @if (order(); as o) {
            <div class="space-y-5" [attr.data-customer-id]="o.customerId">
              <div class="flex flex-wrap gap-2">
                <span class="badge badge-neutral" data-testid="order-status">{{ o.status }}</span>
                <span class="badge badge-neutral">{{ o.payment }}</span>
                <span class="badge badge-neutral">{{ o.shipping }} shipping</span>
              </div>
              <table class="table">
                <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th></tr></thead>
                <tbody>
                  @for (l of shownLines(); track l.sku) {
                    <tr [attr.data-sku]="l.sku">
                      <th>
                        <app-part (retry)="retryParts.emit()" data-testid="line-name" [part]="l.name" [width]="8">{{ l.name.value }}</app-part>
                        <span class="block font-mono text-xs font-normal text-slate-400">{{ l.sku }}</span>
                      </th>
                      <td class="num">
                        @if (editing()) {
                          <span class="inline-flex items-center gap-1">
                            <button type="button" class="btn btn-ghost btn-icon size-6" [attr.data-testid]="'qty-dec-' + l.sku" [attr.aria-label]="'Decrease ' + l.sku" (click)="setQty(l.sku, l.qty - 1)">−</button>
                            <span class="w-5 text-center">{{ l.qty }}</span>
                            <button type="button" class="btn btn-ghost btn-icon size-6" [attr.data-testid]="'qty-inc-' + l.sku" [attr.aria-label]="'Increase ' + l.sku" (click)="setQty(l.sku, l.qty + 1)">+</button>
                          </span>
                        } @else {
                          {{ l.qty }}
                        }
                      </td>
                      <td class="num">
                        {{ l.unitPrice | currency: 'USD' }}
                        @if (editing()) {
                          <button type="button" class="block w-full text-right text-xs text-rose-600 hover:text-rose-500" [attr.data-testid]="'remove-' + l.sku" (click)="setQty(l.sku, 0)">Remove</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
                <tfoot><tr><th colspan="2">Total</th><td class="num" data-testid="order-panel-total">{{ draftTotal() | currency: 'USD' }}</td></tr></tfoot>
              </table>

              @if (editing()) {
                <div class="relative" data-testid="catalog-search">
                  <label class="label" for="console-catalog">Add from catalog</label>
                  <input id="console-catalog" class="input" type="search" placeholder="Search products…" [value]="query()" (input)="onSearch($any($event.target).value)" />
                  @if (hits(); as h) {
                    <app-part class="mt-1 block" [part]="h" [width]="12" errorText="Search unavailable" [retryable]="true" (retry)="retryHits.emit()">
                    @if (h.value?.length) {
                      <ul class="card mt-1 overflow-hidden">
                        @for (p of h.value; track p.sku) {
                          <li class="flex items-center gap-3 border-t border-slate-100 px-3 py-2 first:border-t-0" [attr.data-sku]="p.sku">
                            <div class="min-w-0 flex-1">
                              <div class="truncate text-sm text-slate-900">{{ p.name }}</div>
                              <div class="text-xs text-slate-500">
                                <app-part (retry)="retryParts.emit()" data-testid="hit-price" [part]="p.price">{{ p.price.value | currency: 'USD' }}</app-part> ·
                                <app-part (retry)="retryParts.emit()" data-testid="hit-stock" [part]="p.stock" [width]="4">
                                  @if (p.stock.value) { {{ p.stock.value }} in stock } @else { <span class="text-rose-600">out of stock</span> }
                                </app-part>
                              </div>
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm" [attr.data-testid]="'add-' + p.sku" [disabled]="!canAdd(p)" (click)="addProduct(p)">Add</button>
                          </li>
                        }
                      </ul>
                    } @else {
                      <div class="empty-state py-3">No products match.</div>
                    }
                    </app-part>
                  }
                </div>
                @if (linked(); as t) {
                  <div>
                    <label class="label" for="console-order-reply">Reply on {{ t.ticketId }}</label>
                    <textarea id="console-order-reply" class="input min-h-16" data-testid="order-reply-text" [value]="replyText()" (input)="replyText.set($any($event.target).value)"></textarea>
                  </div>
                }
              } @else if (o.status !== 'Processing') {
                <p class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">This order has left the warehouse, so its items can't be changed. Create a return instead.</p>
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
            <app-generic-error class="mb-3 block" data-testid="save-error" [error]="saveState().error"></app-generic-error>
          }
          @if (resendState().error) {
            <app-generic-error class="mb-3 block" [error]="resendState().error"></app-generic-error>
          }
          <!-- @s2-end -->
          @if (editing()) {
            <div class="mb-3 flex items-baseline justify-between text-sm" data-testid="price-difference">
              <span class="text-slate-500">
                {{ originalTotal() | currency: 'USD' }} → <span class="font-semibold text-slate-900">{{ draftTotal() | currency: 'USD' }}</span>
              </span>
              @if (draftTotal() > originalTotal()) {
                <span class="text-slate-700">charge {{ draftTotal() - originalTotal() | currency: 'USD' }}</span>
              } @else if (draftTotal() < originalTotal()) {
                <span class="text-slate-700">refund {{ originalTotal() - draftTotal() | currency: 'USD' }}</span>
              }
            </div>
            <div class="flex justify-end gap-2">
              <button type="button" class="btn btn-ghost btn-sm" data-testid="discard" [disabled]="saveState().pending" (click)="editChange.emit(false)">Discard</button>
              <button type="button" class="btn btn-primary btn-sm" data-testid="save" [disabled]="saveState().pending || !draft().length" (click)="emitSave()">
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
              <button type="button" class="btn btn-secondary btn-sm" data-testid="resend" [disabled]="resendState().pending" (click)="resend.emit()">
                {{ resendState().pending ? 'Sending…' : 'Resend confirmation' }}
              </button>
              @if (o.status === 'Processing') {
                <button type="button" class="btn btn-primary btn-sm" data-testid="edit-items" (click)="editChange.emit(true)">Edit items</button>
              } @else {
                <button type="button" class="btn btn-primary btn-sm" data-testid="create-return">Create return</button>
              }
            </div>
          }
        </footer>
      }
    </aside>
  `,
})
export class ConsoleOrderPanelComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly orderId = input.required<string>();
  public readonly order = input<OrderVm | null>(null);
  /** The ticket this order is discussed in; null (or a ready `null`) hides the box. */
  public readonly ticket = input<Part<LinkedTicketVm | null> | null>(null);
  public readonly editing = input(false);
  /** Product search results for the text last emitted by `search`; null before any search. */
  public readonly hits = input<Part<ProductHitVm[]> | null>(null);
  public readonly saveState = input<ActionState>(ACTION_IDLE);
  public readonly resendState = input<ActionState>(ACTION_IDLE);

  public readonly close = output<void>();
  public readonly editChange = output<boolean>();
  /** The search text as typed (not debounced, not trimmed). */
  public readonly search = output<string>();
  public readonly save = output<OrderSave>();
  public readonly resend = output<void>();
  public readonly openTicket = output<string>();
  // @s2-begin
  /** Retry on the linked ticket box, after its failure. */
  public readonly retryTicket = output<void>();
  /** Retry on the product hits, after their failure. */
  public readonly retryHits = output<void>();
  // @s2-end

  protected readonly linked = computed(() => this.ticket()?.value ?? null);

  /** Edited lines (UI state). */
  protected readonly draft = linkedSignal<{ lines: OrderLineVm[]; editing: boolean }, OrderLineVm[]>({
    source: () => ({ lines: this.order()?.lines ?? [], editing: this.editing() }),
    computation: ({ lines }) => lines,
  });
  protected readonly replyText = linkedSignal(() => (this.linked() && this.editing() ? 'Done: your order is updated.' : ''));
  protected readonly query = linkedSignal({ source: this.editing, computation: () => '' });

  protected readonly shownLines = computed(() => (this.editing() ? this.draft() : (this.order()?.lines ?? [])));
  protected readonly originalTotal = computed(() => sum(this.order()?.lines ?? []));
  protected readonly draftTotal = computed(() => sum(this.shownLines()));

  protected onSearch(text: string) {
    this.query.set(text);
    this.search.emit(text);
  }

  protected canAdd(p: ProductHitVm) {
    return p.price.state === 'ready' && p.stock.state === 'ready' && p.stock.value > 0;
  }

  protected setQty(sku: string, qty: number) {
    this.draft.update((ls) => (qty > 0 ? ls.map((l) => (l.sku === sku ? { ...l, qty } : l)) : ls.filter((l) => l.sku !== sku)));
  }

  protected addProduct(p: ProductHitVm) {
    if (!this.canAdd(p)) return;
    const existing = this.draft().find((l) => l.sku === p.sku);
    if (existing) this.setQty(p.sku, existing.qty + 1);
    else this.draft.update((ls) => [...ls, { sku: p.sku, name: part.ready(p.name), qty: 1, unitPrice: p.price.value! }]);
    this.onSearch('');
  }

  protected emitSave() {
    const text = this.replyText().trim();
    const t = this.linked();
    this.save.emit({
      lines: this.draft().map(({ sku, qty }) => ({ sku, qty })),
      reply: t && text ? { ticketId: t.ticketId, text } : undefined,
    });
  }
}

/** S12: one ticket's thread (authors as `Part`s) and the reply box (hidden once Solved). The reply text is kept until the thread changes. */
@Component({
  selector: 'app-console-ticket-panel',
  imports: [GenericErrorComponent, PartComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <div class="absolute inset-0 z-30 rounded-xl bg-slate-900/20" (click)="close.emit()" aria-hidden="true"></div>
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
              <span class="badge" data-testid="ticket-panel-status" [class]="t.status === 'Open' ? 'badge-bad' : t.status === 'Waiting' ? 'badge-warn' : 'badge-good'">{{ t.status }}</span>
              @if (t.orderId; as orderId) {
                <button type="button" class="font-mono text-xs text-indigo-600 hover:text-indigo-500" data-testid="ticket-panel-order" (click)="openOrder.emit(orderId)">{{ orderId }} →</button>
              }
            }
          </div>
          @if (ticket(); as t) {
            <div class="mt-1 text-sm text-slate-700">{{ t.subject }}</div>
          }
        </div>
        <button type="button" class="btn btn-ghost btn-icon shrink-0" data-testid="close-panel" aria-label="Close ticket" (click)="close.emit()">✕</button>
      </header>

      <div data-part="main" class="flex-1 overflow-y-auto">
        @if (ticket(); as t) {
          <ol class="space-y-3 p-5" [attr.data-customer-id]="t.customerId">
            @for (msg of t.messages; track $index) {
              <li class="flex" [class.justify-end]="msg.from === 'agent'" data-testid="ticket-message">
                <div class="max-w-[85%] rounded-xl px-3 py-2" [class]="msg.from === 'agent' ? 'bg-indigo-50' : 'border border-slate-200 bg-white'">
                  <div class="mb-0.5 text-xs text-slate-500">
                    <app-part (retry)="retryParts.emit()" data-testid="message-author" [part]="msg.author" [width]="5">{{ msg.author.value }}</app-part> · {{ msg.at | date: 'MMM d, HH:mm' }}
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
          <form class="border-t border-slate-200 p-4" (submit)="$event.preventDefault(); reply.emit({ text: text(), status: status() })">
            <label class="sr-only" for="console-reply">Reply</label>
            <textarea id="console-reply" class="input mb-2 min-h-20" placeholder="Reply to the customer…" data-testid="reply-text" [value]="text()" (input)="text.set($any($event.target).value)"></textarea>
            <!-- @s2-begin -->
            @if (replyState().error) {
              <app-generic-error class="mb-2 block" data-testid="reply-error" [error]="replyState().error"></app-generic-error>
            }
            <!-- @s2-end -->
            <div class="flex items-center justify-end gap-2">
              <label class="text-xs text-slate-500" for="console-reply-status">Then set</label>
              <select id="console-reply-status" class="input w-auto py-1 text-xs" data-testid="reply-status" [value]="status()" (change)="status.set($any($event.target).value)">
                <option value="Waiting">Waiting on customer</option>
                <option value="Solved">Solved</option>
                <option value="Open">Open</option>
              </select>
              <button type="submit" class="btn btn-primary btn-sm" data-testid="reply-send" [disabled]="replyState().pending || !text().trim()">
                {{ replyState().pending ? 'Sending…' : 'Send reply' }}
              </button>
            </div>
          </form>
        } @else {
          <p class="border-t border-slate-200 px-5 py-3 text-sm text-slate-500">Solved. The customer can reopen it by replying.</p>
        }
      }
    </aside>
  `,
})
export class ConsoleTicketPanelComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  public readonly ticketId = input.required<string>();
  public readonly ticket = input<TicketThreadVm | null>(null);
  public readonly replyState = input<ActionState>(ACTION_IDLE);
  public readonly reply = output<TicketReply>();
  public readonly openOrder = output<string>();
  public readonly close = output<void>();

  protected readonly text = linkedSignal({ source: () => this.ticket()?.messages.length ?? 0, computation: () => '' });
  protected readonly status = linkedSignal<number, TicketStatusVm>({ source: () => this.ticket()?.messages.length ?? 0, computation: () => 'Waiting' });
}
