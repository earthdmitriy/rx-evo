import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { InputComponent } from './input.component';
import { interval, map, startWith } from 'rxjs';
import { clientCount } from '../../../services/consts';
import { createCounter$ } from '../../../services/utils';
import { EventBusService } from '../../../services/EventBus.service';

@Component({
  selector: 'app-input-input-wrapper',
  standalone: true,
  imports: [CommonModule, InputComponent],
  template: `<app-input
    *ngIf="counter$ | async as counter"
    [clientId]="counter"
    [showBucket]="(showBucket$ | async) ?? false"
  ></app-input>`,
})
export class InputInputWrapperComponent {
  public readonly counter$ = inject(EventBusService).clientId$;
  public readonly showBucket$ = inject(EventBusService).showBucket$;
}
