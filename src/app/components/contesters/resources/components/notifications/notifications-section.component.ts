import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { NotificationsApi } from '../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../content/resource-block/resource-block.component';
import { ConsoleNotificationsComponent } from '../../../shared';
import { createAction } from '../../data/action';
import { UiState } from '../../data/ui-state';

/** S2: the bell. No `params`: loads once per sign-in; a 30s poll keeps it fresh (R-D2) via `reload()`, same as any other caller would. */
@Component({
  selector: 'app-resources-notifications-section',
  imports: [ResourceBlockComponent, ConsoleNotificationsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="notifications" [resource]="notifications">
      <app-console-notifications
        [notifications]="
          (notifications.hasValue() ? notifications.value() : undefined) ?? null
        "
        [markRead]="markAllRead.state()"
        (markAllRead)="onMarkedRead()"
        (openChange)="ui.setNotificationsOpen($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesNotificationsSection {
  protected readonly ui = inject(UiState);

  private readonly notificationsApi = inject(NotificationsApi);
  protected readonly notifications = rxResource({
    stream: () => this.notificationsApi.notifications(),
  });

  protected readonly markAllRead = createAction(() =>
    this.notificationsApi.markNotificationsRead(),
  );
  protected onMarkedRead() {
    this.markAllRead.run(undefined, () => this.notifications.reload());
  }

  constructor() {
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.notifications.reload());
  }
}
