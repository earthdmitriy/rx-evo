import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  AgentNotification,
  NotificationsApi,
} from '../../../../../services/contesters';
import { ViewBlockComponent } from '../../../../content/view-block/view-block.component';
import { ConsoleNotificationsComponent } from '../../../shared';
import { createAction } from '../../data/action';
import { data, error, loading } from '../../data/block-state';
import { poll, SINGLETON, singletonEntry } from '../../data/entity-store';
import { NOTIFICATIONS } from '../../data/sources';
import { UI_STATE } from '../../data/ui-state';
import { toVm, Vm } from '../../data/vm';

/** S2: the bell. */
@Component({
  selector: 'app-signal-store-notifications-section',
  imports: [ViewBlockComponent, ConsoleNotificationsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="notifications"
      [loading]="loading(notifications().state)"
      [error]="error(notifications().state)"
      (retry)="cache.reload(id)"
    >
      <app-console-notifications
        [notifications]="data(notifications())"
        [markRead]="markAllRead.state()"
        (markAllRead)="markAllRead.run(undefined, onMarkedRead)"
        (openChange)="ui.setNotificationsOpen($event)"
      />
    </app-view-block>
  `,
})
export class SignalStoreNotificationsSection {
  protected readonly cache = inject(NOTIFICATIONS);
  protected readonly ui = inject(UI_STATE);
  protected readonly id = SINGLETON;
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = singletonEntry(this.cache);
  protected readonly notifications = computed(
    (): Vm<AgentNotification[]> =>
      toVm('notifications', this.fetched(), (list) => !list.length),
  );

  constructor() {
    poll(
      this.cache,
      computed(() => this.id),
      30_000,
    );
  }

  private readonly notificationsApi = inject(NotificationsApi);
  protected readonly markAllRead = createAction(() =>
    this.notificationsApi.markNotificationsRead(),
  );
  protected readonly onMarkedRead = () => this.cache.reload(this.id);
}
