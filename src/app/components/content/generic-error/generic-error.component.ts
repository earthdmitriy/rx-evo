import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-generic-error',
  templateUrl: './generic-error.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericErrorComponent {
  public readonly text = input<string>('');
}
