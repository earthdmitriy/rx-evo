import {
  ApplicationConfig,
  InjectionToken,
  provideAppInitializer,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { installConsoleTestHook } from './services/contesters/harness/test-hook';

export const SKIPDELAY_TOKEN = new InjectionToken<boolean>('skipDelay', {
  providedIn: 'root',
  factory: () => false,
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAppInitializer(installConsoleTestHook),
    {
      provide: SKIPDELAY_TOKEN,
      useValue: false,
    },
  ],
};
