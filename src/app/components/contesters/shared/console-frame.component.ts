import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

const NAV: { label: string; owner?: string }[] = [
  { label: 'Customers' },
  { label: 'Catalog', owner: 'Merchandising' },
  { label: 'Inventory', owner: 'Warehouse' },
  { label: 'Promotions', owner: 'Marketing' },
  { label: 'Finance', owner: 'Accounting' },
  { label: 'Reports', owner: 'Management' },
  { label: 'Settings', owner: 'Admin' },
];

/**
 * The signed-in console: top bar (search and section nav are static stubs),
 * then a responsive grid. Slots, by attribute on the projected element:
 * `consoleBell`, `consoleAgent` (top bar), `consoleList` (left column),
 * `consoleMain` (centre, shown while a customer is selected), `consoleRail`
 * (right column, same), `consolePanel` (overlay panels). Log out is the
 * frame's: it is there whatever state the sections are in.
 */
@Component({
  selector: 'app-console-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="@container relative">
      <div class="flex flex-col gap-4">
        <header class="card">
          <div class="flex items-center gap-3 px-4 py-2.5">
            <span class="logo-mark">SD</span>
            <div class="hidden leading-tight @2xl:block">
              <div class="text-sm font-semibold text-slate-900">ShopDesk</div>
              <div class="text-xs text-slate-500">Support console</div>
            </div>
            <div class="relative mx-auto w-full max-w-md">
              <input
                class="input"
                type="search"
                placeholder="Search orders, customers, tickets…"
                aria-label="Global search (not available)"
                disabled
              />
            </div>
            <ng-content select="[consoleBell]" />
            <div
              class="flex items-center gap-2.5 border-l border-slate-200 pl-3"
            >
              <ng-content select="[consoleAgent]" />
              <button
                type="button"
                class="btn btn-secondary btn-sm whitespace-nowrap"
                data-testid="logout"
                (click)="logout.emit()"
              >
                Log out
              </button>
            </div>
          </div>
          <nav
            class="flex gap-1 overflow-x-auto overflow-y-hidden border-t border-slate-200 px-3"
            aria-label="Console sections"
          >
            @for (item of nav; track item.label) {
              @if (!item.owner) {
                <a
                  class="border-b-2 border-indigo-600 px-3 py-2.5 text-sm font-medium whitespace-nowrap text-indigo-700"
                  aria-current="page"
                  >{{ item.label }}</a
                >
              } @else {
                <a
                  class="flex cursor-not-allowed items-center gap-1.5 px-3 py-2.5 text-sm whitespace-nowrap text-slate-400"
                  role="link"
                  aria-disabled="true"
                  [title]="
                    'Owned by ' +
                    item.owner +
                    ' — ask your team lead for access'
                  "
                  >{{ item.label }} 🔒</a
                >
              }
            }
          </nav>
        </header>

        <div
          class="grid items-start gap-4 @3xl:grid-cols-[16rem_minmax(0,1fr)] @6xl:grid-cols-[16rem_minmax(0,1fr)_17rem]"
        >
          <div class="min-w-0 @3xl:row-span-2 @6xl:row-span-1">
            <ng-content select="[consoleList]" />
          </div>
          @if (customerSelected()) {
            <div class="flex min-w-0 flex-col gap-4" data-testid="console-main">
              <ng-content select="[consoleMain]" />
            </div>
            <div
              class="grid min-w-0 gap-4 @3xl:col-start-2 @3xl:grid-cols-2 @6xl:col-start-3 @6xl:row-start-1 @6xl:grid-cols-1"
              data-testid="console-rail"
            >
              <ng-content select="[consoleRail]" />
            </div>
          } @else {
            <section class="card @6xl:col-span-2" data-testid="console-main">
              <div class="empty-state py-24">
                Select a customer to see their orders, cart and tickets.
              </div>
            </section>
          }
        </div>
      </div>
      <ng-content select="[consolePanel]" />
    </div>
  `,
})
export class ConsoleFrameComponent {
  public readonly customerSelected = input(false);
  public readonly logout = output<void>();
  protected readonly nav = NAV;
}
