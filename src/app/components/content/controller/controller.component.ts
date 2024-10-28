import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import {
  FormBuilder,
  FormsModule,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-controller',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './controller.component.html',
  styleUrl: './controller.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ControllerComponent {
  public readonly eventBus = inject(EventBusService);
  private readonly fb = inject(NonNullableFormBuilder);

  public readonly incrementCtrl = this.fb.control<boolean>(true);
  public readonly showBucketCtrl = this.fb.control<boolean>(true);

  constructor() {
    this.incrementCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.toggleAutoIncrement$.next(value));
    this.showBucketCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.showBucket$.next(value));
  }
}
