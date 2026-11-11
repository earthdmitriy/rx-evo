import { DatePipe, NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CUSTOMER_NAME_FIELD } from './fields';
import { NotificationVm } from './view-models';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { ACTION_IDLE, ActionState } from './view-state';

/** S2: the bell with the unread badge and the dropdown list. Open/closed is UI state. */
@Component({
  selector: 'app-console-notifications',
  imports: [GenericErrorComponent, DatePipe, NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block',
    'data-testid': 'notifications',
    '[attr.data-content]':
      'notifications() === null ? "none" : notifications()!.length ? "shown" : "empty"',
  },
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-icon relative"
      data-testid="bell"
      aria-label="Notifications"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <svg
        class="size-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"
        />
      </svg>
      @if (unread() > 0) {
        <span
          class="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white"
          data-testid="unread-badge"
          >{{ unread() }}</span
        >
      }
    </button>
    @if (open()) {
      <div
        class="card absolute right-0 z-20 mt-2 w-80 overflow-hidden shadow-md"
        data-testid="notifications-list"
      >
        <div class="card-header">
          <span class="card-title">Notifications</span>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            data-testid="mark-all-read"
            [disabled]="markRead().pending || !unread()"
            (click)="markAllRead.emit()"
          >
            {{ markRead().pending ? 'Marking…' : 'Mark all read' }}
          </button>
        </div>
        <!-- @s2-begin -->
        @if (markRead().error) {
          <app-generic-error
            class="block px-4 pt-3"
            [error]="markRead().error"
          ></app-generic-error>
        }
        <!-- @s2-end -->
        <div data-testid="notifications-body">
          <ul class="max-h-80 overflow-y-auto">
            @for (n of list(); track n.id) {
              <li
                class="flex gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0"
                [attr.data-notification-id]="n.id"
              >
                <span
                  class="mt-2 size-1.5 shrink-0 rounded-full"
                  [class]="n.unread ? 'bg-indigo-500' : 'bg-transparent'"
                ></span>
                <div class="min-w-0">
                  <div
                    class="min-h-5 text-sm text-slate-800"
                    data-testid="notification-text"
                  >
                    @if (n.kind === 'ticket-reply') {
                      <ng-container
                        *ngComponentOutlet="
                          customerName;
                          inputs: {
                            customerId: n.customerId,
                            prefix: n.ticketId + ': new message from ',
                          }
                        "
                      />
                    } @else {
                      {{ sentence(n) }}
                    }
                  </div>
                  <div class="text-xs text-slate-500">
                    {{ n.at | date: 'MMM d, HH:mm' }}
                  </div>
                </div>
              </li>
            }
          </ul>
          @if (notifications() && !list().length) {
            <div class="empty-state">No notifications.</div>
          }
        </div>
      </div>
    }
  `,
})
export class ConsoleNotificationsComponent {
  /** The list, from its own service; null before it is requested. */
  public readonly notifications = input<NotificationVm[] | null>(null);
  /** Shows the name of a customer (CRM): supplied by the implementation (`CUSTOMER_NAME_FIELD`). A reply names its customer; the sentence is empty until the name arrives. Only rendered while the dropdown is open. */
  protected readonly customerName = inject(CUSTOMER_NAME_FIELD);
  protected readonly list = computed(() => this.notifications() ?? []);
  public readonly markRead = input<ActionState>(ACTION_IDLE);
  public readonly markAllRead = output<void>();
  /** The dropdown opened or closed: sentences may need look-ups that are only worth making while it is open. */
  public readonly openChange = output<boolean>();

  protected readonly open = signal(false);
  protected toggle() {
    this.open.update((o) => !o);
    this.openChange.emit(this.open());
  }

  protected readonly unread = computed(
    () => this.list().filter((n) => n.unread).length,
  );

  protected sentence(n: NotificationVm): string {
    switch (n.kind) {
      case 'ticket-reply':
        return ''; // written by the customer name field (prefix + name)
      case 'ticket-escalated':
        return `${n.ticketId} escalated to you`;
      case 'order-delivered':
        return `${n.orderId} delivered`;
    }
  }
}
