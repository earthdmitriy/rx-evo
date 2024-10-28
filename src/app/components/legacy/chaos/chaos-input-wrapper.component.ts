import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { ChaosComponent } from './chaos.component';
import { interval, map, startWith } from 'rxjs';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-chaos-input-wrapper',
  standalone: true,
  imports: [CommonModule, ChaosComponent],
  template: `<app-chaos
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-chaos>`,
})
export class ChaosInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
