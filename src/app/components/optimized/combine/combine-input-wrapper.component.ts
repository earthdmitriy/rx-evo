import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CombineComponent } from './combine.component';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-combine-input-wrapper',
  standalone: true,
  imports: [CommonModule, CombineComponent],
  template: `<app-combine
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-combine>`,
})
export class CombineInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
