import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { StatefulBlockComponent } from '../../../../../../../content/stateful-block/stateful-block.component';
import { ConsoleTicketsTabComponent } from '../../../../../../shared';
import { TICKETS_BY_CUSTOMER } from '../../../../../sources/lookups';
import { toTicketRowVm } from '../../../../../vm/vm';

/** S7. */
@Component({
  selector: 'app-tickets-tab-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleTicketsTabComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="tab-tickets" [stream]="tickets">
      <app-console-tickets-tab
        [tickets]="tickets.value$ | async"
        [customerId]="customerId()"
        (openTicket)="openTicket.emit($event)"
        (openOrder)="openOrder.emit($event)"
      />
    </app-stateful-block>
  `,
})
export class TicketsTabSectionComponent {
  public readonly customerId = input.required<number>();
  public readonly openTicket = output<string>();
  public readonly openOrder = output<string>();

  private readonly ticketsOf = inject(TICKETS_BY_CUSTOMER);

  /** The tickets of the customer, shared (the writes reload the same entry). */
  protected readonly tickets = this.ticketsOf
    .project(toObservable(this.customerId))
    .pipeValue(map((tickets) => tickets.map(toTicketRowVm)));
}
