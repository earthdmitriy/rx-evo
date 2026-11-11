import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { catchError, EMPTY, switchMap, tap, timer } from 'rxjs';
import { NotificationsApi } from '../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../content/stateful-block/stateful-block.component';
import { ConsoleNotificationsComponent } from '../../../shared';
import { statefulObservable } from '../../lib';
import { LOGGED_IN } from '../../sources/session';
import { action } from '../../utils/action';

/**
 * S2: the bell. The notifications are the polled stream; a reply names its
 * customer, which the CRM knows: a field component of the page
 * (`CUSTOMER_NAME_FIELD`), rendered only while the dropdown is open.
 */
@Component({
  selector: 'app-notifications-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleNotificationsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="notifications" [stream]="notifications">
      <app-console-notifications
        [notifications]="notifications.value$ | async"
        [markRead]="{
          pending: !!(markRead.result.pending$ | async),
          error: markRead.result.error$ | async,
        }"
        (markAllRead)="markRead.call()"
      />
    </app-stateful-block>
  `,
})
export class NotificationsSectionComponent {
  private readonly api = inject(NotificationsApi);

  /** The notifications of the agent, polled every 30 s while signed in (R-D2). */
  protected readonly notifications = statefulObservable({
    // a poll that fails after the first answer is silent: the last list stays (R-G4)
    loader: () =>
      timer(0, 30_000).pipe(
        switchMap((poll) =>
          this.api
            .notifications()
            .pipe(poll === 0 ? tap() : catchError(() => EMPTY)),
        ),
      ),
    active: inject(LOGGED_IN),
    name: 'notifications',
  });

  protected readonly markRead = action('markNotificationsRead', (_: void) =>
    this.api
      .markNotificationsRead()
      .pipe(tap(() => this.notifications.reload())),
  );
}
