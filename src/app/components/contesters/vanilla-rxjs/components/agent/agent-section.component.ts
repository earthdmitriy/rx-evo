import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ViewBlockComponent } from '../../../../content/view-block/view-block.component';
import { GenericErrorComponent } from '../../../../content/generic-error/generic-error.component';
import { ConsoleAgentComponent } from '../../../shared';
import { data, error, idle, loading, notices } from '../../data/block-state';
import { VanillaRxjsConsoleStore } from '../../data/console.store';

/** S1: the agent. */
@Component({
  selector: 'app-vanilla-rxjs-agent-section',
  imports: [ViewBlockComponent, GenericErrorComponent, ConsoleAgentComponent],
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
      <div class="contents">
        @for (n of notices(agent().state); track n) {
          <app-generic-error [error]="n" />
        }
      </div>
    </app-view-block>
  `,
})
export class VanillaRxjsAgentSection {
  protected readonly s = inject(VanillaRxjsConsoleStore);
  protected readonly loading = loading;
  protected readonly error = error;
  protected readonly notices = notices;
  protected readonly data = data;
  protected readonly agent = toSignal(this.s.agent$, { initialValue: idle });
}
