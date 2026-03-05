import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  combineLatest,
  debounceTime,
  map,
  ObservedValueOf,
  shareReplay,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import {
  isError,
  isLoading,
  statefulObservable,
} from '../../../submodules/stateful-observable/src';
import { trackInReduxDevTools } from '../../../utils/reduxDevTools/trackInReduxDevTools';
import {
  ClientsFilterFormComponent,
  ClientsFilterFormValue,
} from '../../content/clients-filter-form/clients-filter-form.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-pagination',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericErrorComponent,
    ClientsFilterFormComponent,
  ],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.less'],
})
export class PaginationComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly clientApiService = inject(ClientApiService);

  public readonly formValue$ = new Subject<ClientsFilterFormValue>();

  public readonly pagination$ = this.formValue$.pipe(
    map(() =>
      this.fb.group({
        page: this.fb.control(1),
        pageSize: this.fb.control(10),
      }),
    ),
    shareReplay(1),
  );

  public readonly paginationValue$ = this.pagination$.pipe(
    switchMap((x) => x.valueChanges.pipe(startWith(x.value))),
  );

  // expose stream value observable for template usage
  public readonly stream = statefulObservable({
    input: combineLatest([this.formValue$, this.paginationValue$]).pipe(
      debounceTime(0),
    ),
    loader: ([
      { name, email, registeredAfter, registeredBefore },
      { page, pageSize },
    ]) =>
      this.clientApiService.searchClientsPaged$({
        name,
        email,
        registeredBefore: registeredBefore
          ? new Date(registeredBefore)
          : undefined,
        registeredAfter: registeredAfter
          ? new Date(registeredAfter)
          : undefined,
        page,
        pageSize,
      }),
    cacheKey: ([
      { name, email, registeredAfter, registeredBefore },
      { page, pageSize },
    ]) => [name, email, registeredAfter, registeredBefore, page, pageSize],
  }).pipe(
    trackInReduxDevTools({
      name: 'PaginationComponent Stream',
      actionName: (value) => {
        if (isLoading(value)) {
          return 'Loading...';
        }

        if (isError(value)) {
          return 'Error';
        }
        return 'Value';
      },
    }),
  );

  public prevPage(pagination: ObservedValueOf<typeof this.pagination$>) {
    const cur = pagination.controls.page.value || 1;
    pagination.patchValue({ page: Math.max(1, cur - 1) });
  }

  public nextPage(pagination: ObservedValueOf<typeof this.pagination$>) {
    const cur = pagination.controls.page.value || 1;
    pagination.patchValue({ page: cur + 1 });
  }
}
