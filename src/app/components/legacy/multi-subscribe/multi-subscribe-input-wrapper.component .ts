import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EventBusService } from '../../../services/EventBus.service';
import { MultiSubscribeComponent } from './multi-subscribe.component';

@Component({
  selector: 'app-multi-subscribe-input-wrapper',
  imports: [CommonModule, MultiSubscribeComponent],
  template: `<app-multi-subscribe
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-multi-subscribe>`,
})
export class MultiSubscribeInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
