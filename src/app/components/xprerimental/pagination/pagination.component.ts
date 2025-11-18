import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { combineLatest, debounceTime, startWith, tap } from 'rxjs';
import { ClientApiService } from '../../../services/api/ClientApi.service';
import { statefulObservable } from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

@Component({
  selector: 'app-pagination',
  imports: [CommonModule, ReactiveFormsModule, GenericErrorComponent],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.less'],
})
export class PaginationComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly clientApiService = inject(ClientApiService);

  public readonly filters = this.fb.group({
    name: this.fb.control(''),
    email: this.fb.control(''),
    regsteredBefore: this.fb.control<string | null>(null),
    regsteredAfter: this.fb.control<string | null>(null),
  });

  public readonly formValue$ = this.filters.valueChanges.pipe(
    startWith(this.filters.value),
    debounceTime(300),
    tap(() => {
      this.pagination.patchValue({ page: 1 }, { emitEvent: false });
    }),
  );

  public readonly pagination = this.fb.group({
    page: this.fb.control(1),
    pageSize: this.fb.control(10),
  });

  public readonly paginationValue$ = this.pagination.valueChanges.pipe(
    startWith(this.pagination.value),
  );

  // expose stream value observable for template usage
  public readonly stream = statefulObservable({
    input: combineLatest([this.formValue$, this.paginationValue$]),
    loader: ([
      { name, email, regsteredAfter, regsteredBefore },
      { page, pageSize },
    ]) =>
      this.clientApiService.searchClients$({
        name,
        email,
        registeredBefore: regsteredBefore
          ? new Date(regsteredBefore)
          : undefined,
        registeredAfter: regsteredAfter ? new Date(regsteredAfter) : undefined,
        page,
        pageSize,
      }),
    cacheKey: ([
      { name, email, regsteredAfter, regsteredBefore },
      { page, pageSize },
    ]) => [name, email, regsteredAfter, regsteredBefore, page, pageSize],
  });

  public prevPage() {
    const cur = this.pagination.controls.page.value || 1;
    this.pagination.patchValue({ page: Math.max(1, cur - 1) });
  }

  public nextPage() {
    const cur = this.pagination.controls.page.value || 1;
    this.pagination.patchValue({ page: cur + 1 });
  }
}
