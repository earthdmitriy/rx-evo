import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
  NonNullableFormBuilder,
  ReactiveFormsModule,
} from '@angular/forms';
import { EventBusService } from '../../../services/EventBus.service';
import {
  ApiKey,
  ApiStats,
  RequestMonitorService,
} from '../../../services/RequestMonitor.service';
import { clientCount } from '../../../services/consts';
import { SampleScenario } from '../../../samples/sample-meta';

type ApiRow = {
  key: ApiKey;
  label: string;
  stats: ApiStats;
  throwCtrl: FormControl<boolean>;
};

/** Demo controls: drive the inputs, break the APIs, watch every request. */
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
  private readonly monitor = inject(RequestMonitorService);

  /** Client-card samples get the client/bucket controls; lists only use the client API. */
  public readonly scenario = input<SampleScenario>('client-card');

  public readonly incrementCtrl = this.fb.control<boolean>(
    this.eventBus.toggleAutoIncrement$.value,
  );
  public readonly showBucketCtrl = this.fb.control<boolean>(
    this.eventBus.showBucket$.value,
  );
  public readonly slowApiCtrl = this.fb.control<boolean>(
    this.eventBus.slowApi$.value,
  );

  public readonly throwClientCtrl = this.fb.control<boolean>(
    this.eventBus.throwClientApiError$.value,
  );
  public readonly throwProductsCtrl = this.fb.control<boolean>(
    this.eventBus.throwProductApiError$.value,
  );
  public readonly throwBucketCtrl = this.fb.control<boolean>(
    this.eventBus.throwBucketApiError$.value,
  );

  protected readonly apis = computed<ApiRow[]>(() => {
    const rows: ApiRow[] = [
      {
        key: 'client',
        label: 'Client',
        stats: this.monitor.client(),
        throwCtrl: this.throwClientCtrl,
      },
      {
        key: 'bucket',
        label: 'Bucket',
        stats: this.monitor.bucket(),
        throwCtrl: this.throwBucketCtrl,
      },
      {
        key: 'product',
        label: 'Products',
        stats: this.monitor.product(),
        throwCtrl: this.throwProductsCtrl,
      },
    ];
    return this.scenario() === 'list' ? rows.slice(0, 1) : rows;
  });

  constructor() {
    this.incrementCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.toggleAutoIncrement$.next(value));
    this.showBucketCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.showBucket$.next(value));
    this.slowApiCtrl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.eventBus.slowApi$.next(value));
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

  public setSpeed(slow: boolean) {
    this.slowApiCtrl.setValue(slow);
  }

  public resetCounters() {
    this.monitor.resetCounters();
  }
}
