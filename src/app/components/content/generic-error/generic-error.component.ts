import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  input,
  Output,
} from '@angular/core';

@Component({
  selector: 'app-generic-error',
  templateUrl: './generic-error.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GenericErrorComponent {
  public readonly text = input<string>('');

  public readonly showReload = input<boolean>(false);

  @Output() public readonly reload = new EventEmitter<void>();
}
