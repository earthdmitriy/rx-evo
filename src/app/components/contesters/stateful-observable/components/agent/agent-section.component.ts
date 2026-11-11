import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { map } from 'rxjs';
import { SessionApi } from '../../../../../services/contesters';
import { StatefulBlockComponent } from '../../../../content/stateful-block/stateful-block.component';
import { ConsoleAgentComponent } from '../../../shared';
import { statefulObservable } from '../../lib';
import { LOGGED_IN } from '../../sources/session';
import { toAgentVm } from '../../vm/vm';

/** S1: the agent. */
@Component({
  selector: 'app-agent-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleAgentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="agent" [stream]="profile">
      <app-console-agent [agent]="profile.value$ | async" />
    </app-stateful-block>
  `,
})
export class AgentSectionComponent {
  private readonly api = inject(SessionApi);
  protected readonly profile = statefulObservable({
    loader: () => this.api.profile(),
    active: inject(LOGGED_IN),
    name: 'profile',
  }).pipeValue(map(toAgentVm));
}
