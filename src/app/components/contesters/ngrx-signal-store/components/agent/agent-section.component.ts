import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ViewBlockComponent } from '../../../../content/view-block/view-block.component';
import { AgentVm, ConsoleAgentComponent } from '../../../shared';
import { data, error, loading } from '../../data/block-state';
import { SINGLETON, singletonEntry } from '../../data/entity-store';
import { toAgentVm } from '../../data/mappers';
import { PROFILE } from '../../data/sources';
import { mapVm, toVm, Vm } from '../../data/vm';

/** S1: the agent. */
@Component({
  selector: 'app-signal-store-agent-section',
  imports: [ViewBlockComponent, ConsoleAgentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="agent"
      [loading]="loading(agent().state)"
      [error]="error(agent().state)"
      (retry)="cache.reload(id)"
    >
      <app-console-agent [agent]="data(agent())" />
    </app-view-block>
  `,
})
export class SignalStoreAgentSection {
  protected readonly cache = inject(PROFILE);
  protected readonly id = SINGLETON;
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;

  private readonly fetched = singletonEntry(this.cache);
  protected readonly agent = computed(
    (): Vm<AgentVm> => mapVm(toVm('profile', this.fetched()), toAgentVm),
  );
}
