import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  startWith, switchMap
} from 'rxjs';
import { IntersectionobserverDirective } from '../../../directives/intersectionobserver.directive';
import {
  Client,
  ClientApiService,
} from '../../../services/api/ClientApi.service';
import { statefulObservable } from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component';

const getEmptyAcc = () => ({ data: [], page: 0, totalPages: 1 } as {
        data: Client[];
        page: number;
        totalPages: number;
      })

@Component({
  selector: 'app-infinite-scroll',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    GenericErrorComponent,
    IntersectionobserverDirective,
  ],
  templateUrl: './infinite-scroll.component.html',
  styleUrl: './infinite-scroll.component.less',
})
export class InfiniteScrollComponent {
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
    shareReplay(1),
  );

  public readonly pageSubject$ = this.formValue$.pipe(
    map(() => new BehaviorSubject<number>(1)),
    shareReplay(1),
  );

  public readonly currentPage$ =this.pageSubject$.pipe(
        switchMap((x) => x),
        distinctUntilChanged(),
      )

  public readonly isFirstLoading$ = this.currentPage$.pipe(map(x => x ===1));

  constructor() {
    this.pageSubject$.subscribe((x) => console.log('Page:', x));
  }

  public readonly stream = statefulObservable({
    input: combineLatest([
      this.formValue$,
      this.currentPage$,
    ]),
    loader: ([{ name, email, regsteredAfter, regsteredBefore }, page]) =>
      this.clientApiService.searchClients$({
        name,
        email,
        registeredBefore: regsteredBefore
          ? new Date(regsteredBefore)
          : undefined,
        registeredAfter: regsteredAfter ? new Date(regsteredAfter) : undefined,
        page,
        pageSize: 10,
      }),
  }).pipeValue(
    scan(
      (acc, curr) => {
        if (curr.page === 1) {
          // reset accumulated data on new search
          acc.data = curr.data;
        } else {
          acc.data.push(...curr.data);
        }
        acc.page = curr.page;
        acc.totalPages = curr.totalPages;
        return acc;
      },
      getEmptyAcc(),
    ),
  );
}
