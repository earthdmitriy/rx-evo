import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../content/generic-error/generic-error.component';
import { ConsoleNotificationsComponent } from '../../../shared';
import { data, error, idle, loading, notices } from '../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../data/console.store';

/** S2: the bell. */
@Component({
  selector: 'app-vanilla-rxjs-notifications-section',
  imports: [
    ViewBlockComponent,
    GenericErrorComponent,
    ConsoleNotificationsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="notifications"
      [loading]="loading(notifications().state)"
      [error]="error(notifications().state)"
      (retry)="s.retryNotifications()"
    >
      <app-console-notifications
        [notifications]="data(notifications())"
        [markRead]="markRead()"
        (markAllRead)="s.markAllRead()"
        (openChange)="s.notificationsOpen$.next($event)"
      />
      <div class="contents">
        @for (n of notices(notifications().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsNotificationsSection {
  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly notifications = toSignal(this.s.notifications$, {
    initialValue: idle,
  });
  protected readonly markRead = toSignal(this.s.markRead$, {
    requireSync: true,
  });
}
