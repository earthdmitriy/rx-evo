import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { SessionApi } from '../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../content/resource-block/resource-block.component';
import { ConsoleAgentComponent } from '../../../shared';
import { toAgentVm } from '../../data/mappers';

/** S1: the agent. No `params`: loads once when this section mounts (once per sign-in), only `reload()` repeats it. */
@Component({
  selector: 'app-resources-agent-section',
  imports: [ResourceBlockComponent, ConsoleAgentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="agent" [resource]="profile">
      <app-console-agent [agent]="agent()" />
    </app-resource-block>
  `,
})
export class ResourcesAgentSection {
  private readonly sessionApi = inject(SessionApi);

  protected readonly profile = rxResource({
    stream: () => this.sessionApi.profile(),
  });
  protected readonly agent = computed(() => {
    const p = this.profile.hasValue() ? this.profile.value() : undefined;
    return p ? toAgentVm(p) : null;
  });
}
