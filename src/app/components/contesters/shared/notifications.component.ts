import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { PartComponent } from './part.component';
import { NotificationVm, Part } from './view-models';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { ACTION_IDLE, ActionState } from './view-state';

/** S2: the bell with the unread badge and the dropdown list. Open/closed is UI state. */
@Component({
  selector: 'app-console-notifications',
  imports: [GenericErrorComponent, PartComponent, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block', 'data-testid': 'notifications', '[attr.data-content]': 'list() === null ? "none" : list()!.length ? "shown" : "empty"' },
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-icon relative"
      data-testid="bell"
      aria-label="Notifications"
      [attr.aria-expanded]="open()"
      (click)="toggle()"
    >
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <!-- @s2-begin -->
      @if (notifications()?.state === 'error') {
        <span class="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white" data-testid="bell-error" title="Notifications unavailable">!</span>
      }
      <!-- @s2-end -->
      @if (unread() > 0) {
        <span class="absolute -top-0.5 -right-0.5 inline-flex size-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-semibold text-white" data-testid="unread-badge">{{ unread() }}</span>
      }
    </button>
    @if (open()) {
      <div class="card absolute right-0 z-20 mt-2 w-80 overflow-hidden shadow-md" data-testid="notifications-list">
        <div class="card-header">
          <span class="card-title">Notifications</span>
          <button type="button" class="btn btn-ghost btn-sm" data-testid="mark-all-read" [disabled]="markRead().pending || !unread()" (click)="markAllRead.emit()">
            {{ markRead().pending ? 'Marking…' : 'Mark all read' }}
          </button>
        </div>
        <!-- @s2-begin -->
        @if (markRead().error) {
          <app-generic-error class="block px-4 pt-3" [error]="markRead().error"></app-generic-error>
        }
        <!-- @s2-end -->
        <app-part class="block p-4" data-testid="notifications-part" [part]="notifications() ?? loading" [width]="14" errorText="Notifications unavailable" [retryable]="true" (retry)="retryParts.emit()">
          <ul class="max-h-80 overflow-y-auto">
            @for (n of list() ?? []; track n.id) {
              <li class="flex gap-3 border-t border-slate-100 px-4 py-3 first:border-t-0" [attr.data-notification-id]="n.id">
                <span class="mt-2 size-1.5 shrink-0 rounded-full" [class]="n.unread ? 'bg-indigo-500' : 'bg-transparent'"></span>
                <div class="min-w-0">
                  <div class="text-sm text-slate-800"><app-part (retry)="retryParts.emit()" [part]="n.text" [width]="10">{{ n.text.value }}</app-part></div>
                  <div class="text-xs text-slate-500">{{ n.at | date: 'MMM d, HH:mm' }}</div>
                </div>
              </li>
            }
          </ul>
          @if (list() && !list()!.length) {
            <div class="empty-state">No notifications.</div>
          }
        </app-part>
      </div>
    }
  `,
})
export class ConsoleNotificationsComponent {
  // @s2-begin
  /** A failed `Part` of this view asked to be tried again. */
  public readonly retryParts = output<void>();
  // @s2-end
  /** The list, from its own service; null before it is requested. */
  public readonly notifications = input<Part<NotificationVm[]> | null>(null);
  protected readonly loading: Part<NotificationVm[]> = { state: 'loading', value: null };
  protected readonly list = computed(() => this.notifications()?.value ?? null);
  public readonly markRead = input<ActionState>(ACTION_IDLE);
  public readonly markAllRead = output<void>();
  /** The dropdown opened or closed: sentences may need look-ups that are only worth making while it is open. */
  public readonly openChange = output<boolean>();

  protected readonly open = signal(false);
  protected toggle() {
    this.open.update((o) => !o);
    this.openChange.emit(this.open());
  }

  protected readonly unread = computed(() => (this.list() ?? []).filter((n) => n.unread).length);
}
