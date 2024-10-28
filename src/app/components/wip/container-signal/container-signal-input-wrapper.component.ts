import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { ContainerSignalComponent } from './container-signal.component';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-signal-input-wrapper',
  standalone: true,
  imports: [CommonModule, ContainerSignalComponent],
  template: `<app-container-signal
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-container-signal>`,
})
export class ContainerSignalInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
