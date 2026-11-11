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
import { StatefulBlockComponent } from '../../../../../../content/stateful-block/stateful-block.component';
import { ConsoleCustomerHeaderComponent } from '../../../../../shared';
import { CUSTOMER_BY_ID } from '../../../../sources/lookups';
import { toHeaderVm } from '../../../../vm/vm';

/** S4: the profile gates the block; the KPIs are field components of the page (`KPI_FIELD`, `OPEN_TICKETS_FIELD`) looked up by the customer id. */
@Component({
  selector: 'app-customer-header-section',
  imports: [AsyncPipe, StatefulBlockComponent, ConsoleCustomerHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'contents' },
  template: `
    <app-stateful-block data-section="customer-header" [stream]="customer">
      <app-console-customer-header
        [customerId]="customerId()"
        [customer]="customer.value$ | async"
        (clear)="clear.emit()"
      />
    </app-stateful-block>
  `,
})
export class CustomerHeaderSectionComponent {
  public readonly customerId = input.required<number>();
  public readonly clear = output<void>();

  private readonly customers = inject(CUSTOMER_BY_ID);

  /** The profile of the customer: the customer id follows into the shared entry of the factory. */
  protected readonly customer = this.customers
    .project(toObservable(this.customerId))
    .pipeValue(map(toHeaderVm));
}
