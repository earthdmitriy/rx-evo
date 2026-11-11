import { Component, input } from '@angular/core';
import { SpinnerBlockComponent } from '../../content/spinner-block/spinner-block.component';
import { HitAdded } from '../shared/fields';

/**
 * SKELETON of the Add action of a search hit (docs/contest/spec.md §2.2): the
 * button that adds the product to the order being edited. The shared views
 * render this component with the inputs `sku` and `onAdd`. The business rule
 * is yours to apply (H9): the button is enabled only when the price AND the
 * stock of the sku are known and the stock is above 0. When it is clicked,
 * call `onAdd({ sku, unitPrice })` with the current price; the view puts the
 * line into the draft with that price. `onAdd` is a callback input because
 * `ngComponentOutlet`, which the view renders this with, binds inputs only.
 * The template (hit-add.component.html) is finished; replace the TODO props
 * with whatever you like and change the template's bindings to match.
 *
 * Keep: the selector and the inputs, the `data-testid`s (`state-block` from
 * the block, `add-<sku>` on the button), and the rule above. The button is
 * always there, disabled until it can be used.
 */
@Component({
  selector: 'app-hit-add',
  imports: [SpinnerBlockComponent],
  template: `
    <app-spinner-block class="field-block" [loading]="loading">
      <button
        type="button"
        class="btn btn-secondary btn-sm"
        [attr.data-testid]="'add-' + sku()"
        [disabled]="!canAdd"
        (click)="add()"
      >
        Add
      </button>
    </app-spinner-block>
  `,
})
export class HitAddComponent {
  /** The product to add. */
  public readonly sku = input.required<string>();
  /** The view's handler: call it with the sku and the unit price when Add is clicked. */
  public readonly onAdd = input.required<(added: HitAdded) => void>();

  // TODO: the current price of `sku()`; `undefined` until it has arrived
  protected price: number | undefined = undefined;

  // TODO: the stock of `sku()`; `undefined` until it has arrived (0 is a value)
  protected stock: number | undefined = undefined;

  // TODO: `true` while the price or the stock is on its way
  protected loading = false;

  protected get canAdd(): boolean {
    return (
      this.price !== undefined && this.stock !== undefined && this.stock > 0
    );
  }

  protected add() {
    if (this.price !== undefined)
      this.onAdd()({ sku: this.sku(), unitPrice: this.price });
  }
}
