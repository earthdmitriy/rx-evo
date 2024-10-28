import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MultiSubscribeComponent } from './multi-subscribe.component';
import { interval, map, startWith } from 'rxjs';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-multi-subscribe-input-wrapper',
  standalone: true,
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
