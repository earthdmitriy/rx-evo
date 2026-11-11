import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { AGENT_NAME } from '../../../sources/lookups';

/**
 * The agent name field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The agent id is the input of a projection of the shared agent
 * factory: one request and one cached name per agent.
 */
@Component({
  selector: 'app-agent-name',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="agent">
      @if (agent.value$ | async; as name) {
        <span data-testid="field-agent-name">{{ name }}</span>
      }
    </app-stateful-block>
  `,
})
export class AgentNameComponent {
  public readonly agentId = input.required<number>();

  protected readonly agent = inject(AGENT_NAME).project(
    toObservable(this.agentId),
  );
}
