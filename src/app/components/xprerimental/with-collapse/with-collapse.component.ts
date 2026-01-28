import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
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
import { trackInReduxDevTools } from '../../../services/dev/trackInReduxDevTools';
import {
  isError,
  isLoading,
  statefulObservable,
  statefulObservableFactory,
} from '../../../submodules/stateful-observable/src';
import { ClientInfoComponent } from '../../content/client-info/client-info.component';
import {
  ClientsFilterFormComponent,
  ClientsFilterFormValue,
} from '../../content/clients-filter-form/clients-filter-form.component';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';
import { StatefulBlockComponent } from '../../content/stateful-block/stateful-block.component';

@Component({
  selector: 'app-with-collapse',
  imports: [
    ClientsFilterFormComponent,
    CommonModule,
    ReactiveFormsModule,
    GenericErrorComponent,
    StatefulBlockComponent,
    ClientInfoComponent,
  ],
  templateUrl: './with-collapse.component.html',
  styleUrl: './with-collapse.component.less',
})
export class WithCollapseComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly clientApiService = inject(ClientApiService);
  private readonly destroyRef = inject(DestroyRef);

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
  })
    .pipeValue(
      map((response) => ({
        ...response,
        data: response.data.map((client) => ({
          ...client,
          isExpanded: signal(false),
        })),
      })),
    )
    .pipe(
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

  public readonly clientRequestFactory = statefulObservableFactory({
    loader: (clientId: number) => this.clientApiService.getClient$(clientId),
    cacheKey: (clientId: number) => [clientId],
  });

  public prevPage(pagination: ObservedValueOf<typeof this.pagination$>) {
    const cur = pagination.controls.page.value || 1;
    pagination.patchValue({ page: Math.max(1, cur - 1) });
  }

  public nextPage(pagination: ObservedValueOf<typeof this.pagination$>) {
    const cur = pagination.controls.page.value || 1;
    pagination.patchValue({ page: cur + 1 });
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clientRequestFactory.reset(true);
    });
  }
}
