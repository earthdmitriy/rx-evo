import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the customer name field (docs/contest/spec.md §2.2): the name of
 * a customer from the CRM (the author of a customer message in a thread, the
 * customer a bell notification names). The shared views render this component
 * with the inputs `customerId` and `prefix`. The template
 * (customer-name.component.html) is finished; the data is yours: replace the
 * two TODO props with whatever you like and change the template's bindings to
 * match.
 *
 * Keep: the selector and the inputs, the `data-testid`s (`state-block` from the
 * block, `field-customer-name`), and the rule that the prefix is shown only
 * together with the name.
 */
@Component({
  selector: 'app-customer-name',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (name) {
        <span data-testid="field-customer-name">{{ prefix() }}{{ name }}</span>
      }
    </app-spinner-block>
  `,
})
export class CustomerNameComponent {
  /** The customer whose name is shown. */
  public readonly customerId = input.required<number>();
  /** Text shown before the name, only together with it. */
  public readonly prefix = input('');

  // TODO: the name of `customerId()`; `undefined` until it has arrived
  protected name: string | undefined = undefined;

  // TODO: `true` while the name is on its way
  protected loading = false;
}
