import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { AlmostThereComponent } from './almost-there.component';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-almost-there-input-wrapper',
  standalone: true,
  imports: [CommonModule, AlmostThereComponent],
  template: `<app-almost-there
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-almost-there>`,
})
export class AlmostThereInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
