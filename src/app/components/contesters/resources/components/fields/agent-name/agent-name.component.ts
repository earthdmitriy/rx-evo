import { Component, computed, inject, input } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ResourceBlockComponent } from '../../../../../content/resource-block/resource-block.component';
import { AgentsApi } from '../../../../../../services/contesters';

/** The agent name field: its own request per agent id (R-L10's documented gap). */
@Component({
  selector: 'app-resources-agent-name',
  imports: [ResourceBlockComponent],
  template: `
    <app-resource-block class="field-block" [resource]="res">
      @if (name(); as n) {
        <span data-testid="field-agent-name">{{ n }}</span>
      }
    </app-resource-block>
  `,
})
export class ResourcesAgentName {
  public readonly agentId = input.required<number>();

  private readonly agentsApi = inject(AgentsApi);
  protected readonly res = rxResource({
    params: () => this.agentId(),
    stream: ({ params }) => this.agentsApi.agent(params),
  });
  protected readonly name = computed(
    () => (this.res.hasValue() ? this.res.value() : undefined)?.name ?? null,
  );
}
