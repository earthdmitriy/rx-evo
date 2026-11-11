import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { GenericErrorComponent } from '../../content/generic-error/generic-error.component'; // @s2-line
import { ActionState, ACTION_IDLE } from './view-state';

export type Credentials = { email: string; password: string };

/** S0: the signed-out console. Emits the credentials; shows the login write's state. */
@Component({
  selector: 'app-console-sign-in',
  imports: [GenericErrorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block', 'data-testid': 'signin' },
  template: `
    <div class="flex min-h-[32rem] items-center justify-center">
      <form
        class="card w-full max-w-sm p-6"
        (submit)="
          $event.preventDefault();
          signIn.emit({ email: email.value, password: password.value })
        "
      >
        <div class="mb-5 flex items-center gap-3">
          <span class="logo-mark size-9">SD</span>
          <div>
            <div class="font-semibold text-slate-900">ShopDesk</div>
            <div class="text-xs text-slate-500">Support console</div>
          </div>
        </div>
        <label class="label" for="console-email">Work email</label>
        <input
          #email
          id="console-email"
          class="input mb-3"
          type="email"
          data-testid="login-email"
          [value]="defaultEmail()"
        />
        <label class="label" for="console-password">Password</label>
        <input
          #password
          id="console-password"
          class="input mb-5"
          type="password"
          data-testid="login-password"
          value="password"
        />
        <!-- @s2-begin -->
        @if (state().error) {
          <app-generic-error
            class="mb-3 block"
            [error]="state().error"
          ></app-generic-error>
        }
        <!-- @s2-end -->
        <button
          type="submit"
          class="btn btn-primary w-full"
          data-testid="login"
          [disabled]="state().pending"
        >
          {{ state().pending ? 'Signing in…' : 'Sign in' }}
        </button>
        <p class="mt-4 text-center text-xs text-slate-500">
          Internal use only. Access is granted per role by your team lead.
        </p>
      </form>
    </div>
  `,
})
export class ConsoleSignInComponent {
  public readonly state = input<ActionState>(ACTION_IDLE);
  public readonly defaultEmail = input('dana.whitfield@shop.example');
  public readonly signIn = output<Credentials>();
}
