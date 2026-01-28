import { Component, inject, Output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, shareReplay, startWith } from 'rxjs';

export type ClientsFilterFormValue = Partial<{
  name: string;
  email: string;
  registeredBefore: string | null;
  registeredAfter: string | null;
}>;

@Component({
  selector: 'app-clients-filter-form',
  imports: [ReactiveFormsModule],
  templateUrl: './clients-filter-form.component.html',
})
export class ClientsFilterFormComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  public readonly filters = this.fb.group({
    name: this.fb.control(''),
    email: this.fb.control(''),
    registeredBefore: this.fb.control<string | null>(null),
    registeredAfter: this.fb.control<string | null>(null),
  });

  @Output() public readonly formValue$ = this.filters.valueChanges.pipe(
    startWith(this.filters.value),
    debounceTime(300),
    shareReplay(1),
  );
}
