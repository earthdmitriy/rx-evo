import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../content/view-block/view-block.component';
import { ConsoleAgentComponent } from '../../../shared';
import { data, error, idle, loading } from '../../data/block-state';
import { OracleConsoleStore } from '../../data/console.store';

/** S1: the agent. */
@Component({
  selector: 'app-oracle-agent-section',
  imports: [ViewBlockComponent, ConsoleAgentComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-view-block
      data-section="agent"
      [loading]="loading(agent().state)"
      [error]="error(agent().state)"
      (retry)="s.retryProfile()"
    >
      <app-console-agent [agent]="data(agent())" />
    </app-view-block>
  `,
})
export class OracleAgentSection {
  protected readonly s = inject(OracleConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly data = data;
  protected readonly agent = toSignal(this.s.agent$, { initialValue: idle });
}
