import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { StatefulBlockComponent } from '../../../../../content/stateful-block/stateful-block.component';
import { CUSTOMER_BY_ID } from '../../../sources/lookups';

/**
 * The customer name field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The customer id is the input of a projection of the shared
 * customer factory (the header profile reads the same entry); the name is
 * picked out of the customer.
 */
@Component({
  selector: 'app-customer-name',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="name">
      @if (name.value$ | async; as value) {
        <span data-testid="field-customer-name">{{ prefix() }}{{ value }}</span>
      }
    </app-stateful-block>
  `,
})
export class CustomerNameComponent {
  public readonly customerId = input.required<number>();
  public readonly prefix = input('');

  protected readonly name = inject(CUSTOMER_BY_ID)
    .project(toObservable(this.customerId))
    .pipeValue(map((customer) => customer.name));
}
