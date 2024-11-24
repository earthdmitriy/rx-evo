import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { ChaosComponent } from './chaos.component';

@Component({
  selector: 'app-chaos-input-wrapper',
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
