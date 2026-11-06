import { ChangeDetectionStrategy, Component, output } from '@angular/core';

/** Temporary: the console's signed-out screen. Static, no auth. */
@Component({
  selector: 'app-sign-in-draft',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-[32rem] items-center justify-center">
      <form
        class="card w-full max-w-sm p-6"
        (submit)="$event.preventDefault(); signIn.emit()"
      >
        <div class="mb-5 flex items-center gap-3">
          <span class="logo-mark size-9">SD</span>
          <div>
            <div class="font-semibold text-slate-900">ShopDesk</div>
            <div class="text-xs text-slate-500">Support console</div>
          </div>
        </div>
        <label class="label" for="ld-email">Work email</label>
        <input
          id="ld-email"
          class="input mb-3"
          type="email"
          value="dana.whitfield@shop.example"
        />
        <label class="label" for="ld-password">Password</label>
        <input
          id="ld-password"
          class="input mb-5"
          type="password"
          value="password"
        />
        <button type="submit" class="btn btn-primary w-full">Sign in</button>
        <p class="mt-4 text-center text-xs text-slate-500">
          Internal use only. Access is granted per role by your team lead.
        </p>
      </form>
    </div>
  `,
})
export class SignInDraftComponent {
  public readonly signIn = output<void>();
}
