import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';

/**
 * SKELETON of the product name field (docs/contest/spec.md §2.2).
 *
 * The shared views render this component wherever a product name is shown
 * (cart line, order line, the activity sentence "Viewed <name>"), with the
 * inputs `sku` and `prefix`. The template (product-name.component.html) is
 * finished; the data is yours: replace the two TODO props below with whatever
 * you like (a signal, an observable + `async`, a getter, a resource ...) and
 * change the template's bindings to match.
 *
 * Keep: the selector and the two inputs (the views set them), the
 * `data-testid`s of the template (`state-block` from the block,
 * `product-name`), and the rule that the prefix is shown only together with
 * the name.
 */
@Component({
  selector: 'app-product-name',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      @if (name) {
        <span data-testid="product-name">{{ prefix() }}{{ name }}</span>
      }
    </app-spinner-block>
  `,
})
export class ProductNameComponent {
  /** The product to show. */
  public readonly sku = input.required<string>();
  /** Text shown before the name, only together with it. */
  public readonly prefix = input('');

  // TODO: the name of `sku()`; `undefined` until it has arrived
  protected name: string | undefined = undefined;

  // TODO: `true` while the name is on its way
  protected loading = false;
}
