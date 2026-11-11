import { Component, inject, input } from '@angular/core';
import { ViewBlockComponent } from '../../../../../content/view-block/view-block.component';
import { fieldError } from '../../../data/block-state';
import { cacheEntry } from '../../../data/entity-store';
import { AGENT_NAME } from '../../../data/sources';

/** The agent name field: one request and one cached name per agent. */
@Component({
  selector: 'app-signal-store-agent-name',
  imports: [ViewBlockComponent],
  template: `
    <app-view-block
      class="field-block"
      [loading]="entry().state === 'loading'"
      [error]="fieldError(entry())"
      (retry)="cache.reload(agentId())"
    >
      @let e = entry();
      @if (e.state === 'ready') {
        <span data-testid="field-agent-name">{{ e.value.name }}</span>
      }
    </app-view-block>
  `,
})
export class SignalStoreAgentName {
  public readonly agentId = input.required<number>();

  protected readonly cache = inject(AGENT_NAME);
  protected readonly entry = cacheEntry(this.cache, this.agentId);
  protected readonly fieldError = fieldError;
}
