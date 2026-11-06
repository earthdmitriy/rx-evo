import { Component, input, output } from '@angular/core';
import { GenericErrorComponent } from '../generic-error/generic-error.component';

@Component({
  selector: 'app-stateful-block',
  imports: [GenericErrorComponent],
  templateUrl: './stateful-block.component.html',
})
export class StatefulBlockComponent {
  /** A fetch is in flight: the content is dimmed. */
  public readonly loading = input(false);
  /** Set when the fetch failed: shown above the content, which stays (the view shows what it has) and offers Retry. */
  public readonly error = input<unknown>(null);
  /** The user asked to try again. */
  public readonly retry = output<void>();
}
