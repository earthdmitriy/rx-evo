import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TicketsApi } from '../../../../../../../../services/contesters';
import { ResourceBlockComponent } from '../../../../../../../content/resource-block/resource-block.component';
import { ConsoleTicketsTabComponent } from '../../../../../../shared';
import { Bus } from '../../../../../data/bus';
import { toTicketRowVm } from '../../../../../data/mappers';
import { UiState } from '../../../../../data/ui-state';

/** S7: the Tickets tab. */
@Component({
  selector: 'app-resources-tickets-tab-section',
  imports: [ResourceBlockComponent, ConsoleTicketsTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-resource-block data-section="tab-tickets" [resource]="res">
      <app-console-tickets-tab
        [tickets]="tickets()"
        [customerId]="customerId()"
        (openTicket)="ui.openTicket($event)"
        (openOrder)="ui.openOrder($event)"
      />
    </app-resource-block>
  `,
})
export class ResourcesTicketsTabSection {
  public readonly customerId = input.required<number>();
  protected readonly ui = inject(UiState);

  private readonly ticketsApi = inject(TicketsApi);
  private readonly bus = inject(Bus);
  protected readonly res = rxResource({
    params: () => ({ id: this.customerId(), v: this.bus.tickets() }),
    stream: ({ params }) => this.ticketsApi.tickets(params.id),
  });
  protected readonly tickets = computed(
    () =>
      (this.res.hasValue() ? this.res.value() : undefined)?.map(
        toTicketRowVm,
      ) ?? null,
  );
}
