import { AsyncPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { scan, switchMap } from 'rxjs';
import {
  isInactive,
  isSuccess,
  StatefulObservable,
} from '../../../submodules/stateful-observable/src';
import { GenericErrorComponent } from '../generic-error/generic-error.component';

type BlockView = { readonly inactive: boolean; readonly hasValue: boolean };

const initialView: BlockView = { inactive: false, hasValue: false };

@Component({
  selector: 'app-stateful-block',
  imports: [AsyncPipe, GenericErrorComponent],
  templateUrl: './stateful-block.component.html',
})
export class StatefulBlockComponent<T> {
  public readonly stream = input.required<StatefulObservable<T>>();
  /** Shown instead of the content while the stream is inactive (`active: false`). */
  public readonly inactiveText = input('Signed out');

  /**
   * `inactive`: the stream is switched off. `hasValue`: a value arrived since
   * the stream was last inactive. The slot shows content only then, so data
   * that belonged to an earlier session is never shown again, not even dimmed
   * while the next session loads (the parent's `value$ | async` still holds it).
   */
  protected readonly view$ = toObservable(this.stream).pipe(
    switchMap((stream) =>
      stream.raw$.pipe(
        scan(
          (view: BlockView, event): BlockView =>
            isInactive(event)
              ? { inactive: true, hasValue: false }
              : {
                  inactive: false,
                  hasValue: view.hasValue || isSuccess(event),
                },
          initialView,
        ),
      ),
    ),
  );

  /**
   * Message produced by `pipeError`. A combined stream emits a tuple with one
   * entry per source (`false` for sources that did not fail), possibly nested.
   * Retry uses `reload({ onlyFailed: true })`, so healthy sources are not refetched.
   */
  protected errorText(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    if (Array.isArray(error))
      return error
        .map((e) => this.errorText(e))
        .filter(Boolean)
        .join(' · ');
    return '';
  }
}
