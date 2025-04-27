import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { EventBusService } from '../../../services/EventBus.service';
import { clientCount } from '../../../services/consts';

@Component({
  selector: 'app-controller',
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

  public readonly throwClientCtrl = this.fb.control<boolean>(false);
  public readonly throwProductsCtrl = this.fb.control<boolean>(false);
  public readonly throwBucketCtrl = this.fb.control<boolean>(false);

  constructor() {
    this.incrementCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.toggleAutoIncrement$.next(value));
    this.showBucketCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.showBucket$.next(value));
    this.throwClientCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.throwClientApiError$.next(value));
    this.throwProductsCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.throwProductApiError$.next(value));
    this.throwBucketCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.throwBucketApiError$.next(value));
  }

  public next() {
    this.eventBus.clientId$.next(
      (this.eventBus.clientId$.value + 1) % clientCount,
    );
  }
}
