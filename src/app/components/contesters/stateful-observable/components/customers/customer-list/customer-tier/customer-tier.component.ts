import { AsyncPipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { StatefulBlockComponent } from '../../../../../../content/stateful-block/stateful-block.component';
import { map } from 'rxjs';
import { TIER_BY_CUSTOMER } from '../../../../sources/lookups';

/**
 * The customer tier field: the skeleton (`contesters/skeleton`) with its TODO
 * props filled. The customer id is the input of a projection of the shared
 * tier factory: one request and one cached tier per customer, however many
 * rows show it. The template reads the stream with the `async` pipe, and the
 * block dims on its `pending$`.
 */
@Component({
  selector: 'app-customer-tier',
  imports: [AsyncPipe, StatefulBlockComponent],
  template: `
    <app-stateful-block class="field-block" [stream]="tier">
      @if (tier.value$ | async; as value) {
        <span
          class="badge px-1.5 py-0 text-[10px]"
          data-testid="field-tier"
          [class]="value === 'VIP' ? 'badge-accent' : 'badge-neutral'"
          >{{ value }}</span
        >
      }
    </app-stateful-block>
  `,
})
export class CustomerTierComponent {
  public readonly customerId = input.required<number>();

  protected readonly tier = inject(TIER_BY_CUSTOMER)
    .project(toObservable(this.customerId))
    .pipeValue(map((entry) => entry.tier));
}
