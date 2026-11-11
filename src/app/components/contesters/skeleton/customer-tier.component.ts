import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';
import { TierVm } from '../shared/view-models';

/**
 * SKELETON of the customer tier field (docs/contest/spec.md §2.2): the tier
 * badge of a customer in the list of customers. The shared view renders this
 * component with the input `customerId`. The template (customer-tier.component.html)
 * is finished; the data is yours: replace the two TODO props with whatever you
 * like (a signal, an observable + `async`, a getter, a resource ...) and change
 * the template's bindings to match.
 *
 * Keep: the selector and the input, the `data-testid`s of the template
 * (`state-block` from the block, `field-tier`), and the rule that nothing is
 * rendered while the tier has not arrived.
 */
@Component({
  selector: 'app-customer-tier',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (tier) {
        <span
          class="badge px-1.5 py-0 text-[10px]"
          data-testid="field-tier"
          [class]="tier === 'VIP' ? 'badge-accent' : 'badge-neutral'"
          >{{ tier }}</span
        >
      }
    </app-spinner-block>
  `,
})
export class CustomerTierComponent {
  /** The customer whose tier is shown. */
  public readonly customerId = input.required<number>();

  // TODO: the tier of `customerId()`; `undefined` until it has arrived
  protected tier: TierVm | undefined = undefined;

  // TODO: `true` while the tier is on its way
  protected loading = false;
}
