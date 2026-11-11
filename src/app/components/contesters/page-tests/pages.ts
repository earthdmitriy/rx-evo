import type { Type } from '@angular/core';
import { SignalStoreConsoleComponent } from '../ngrx-signal-store/signal-store-console.component';
import { ResourcesConsoleComponent } from '../resources/resources-console.component';
import { ConsolePageComponent as StatefulObservableConsoleComponent } from '../stateful-observable/console-page.component';
import { OracleConsoleComponent } from '../test-oracle/oracle-console.component';
import { VanillaRxjsConsoleComponent } from '../vanilla-rxjs/vanilla-rxjs-console.component';

/**
 * Every implementation in the repo that the page tests can judge, by
 * approach name (the test oracle is `test-oracle`). Approaches built on
 * Angular's `resource()`/`rxResource()` are registered too; where their
 * native `async`/`await` never settles under `fakeAsync`, the e2e suite
 * judges them as well.
 * Add an accepted implementation here, next to its route (`app.routes.ts`)
 * and its e2e target (`e2e/targets.ts`). The page tests run against
 * `PAGE_TARGET` (default `test-oracle`):
 *
 *   PAGE_TARGET=stateful-observable npm test
 */
export const PAGES: Record<string, Type<unknown>> = {
  'test-oracle': OracleConsoleComponent,
  'stateful-observable': StatefulObservableConsoleComponent,
  'vanilla-rxjs': VanillaRxjsConsoleComponent,
  'signal-store': SignalStoreConsoleComponent,
  resources: ResourcesConsoleComponent,
};
