import { Component, input } from '@angular/core';

/**
 * The simplest block: while `loading` is true the projected content is
 * dimmed and a spinner is drawn over it (the `.loading` class of
 * `styles.css`).
 */
@Component({
  selector: 'app-spinner-block',
  template: `
    <div data-testid="state-block" [class.loading]="loading()">
      <ng-content></ng-content>
    </div>
  `,
})
export class SpinnerBlockComponent {
  /** A fetch is in flight. */
  public readonly loading = input(false);
}
