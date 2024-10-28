import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { SignalComponent } from './signal.component';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-signal-input-wrapper',
  standalone: true,
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
