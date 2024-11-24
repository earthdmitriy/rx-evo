import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { SignalComponent } from './signal.component';

@Component({
  selector: 'app-signal-input-wrapper',
  imports: [CommonModule, SignalComponent],
  template: `<app-signal
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-signal>`,
})
export class SignalInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
