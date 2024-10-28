import {
  ApplicationConfig,
  InjectionToken,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';

export const SKIPDELAY_TOKEN = new InjectionToken<boolean>('skipDelay', {
  providedIn: 'root',
  factory: () => false,
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    {
      provide: SKIPDELAY_TOKEN,
      useValue: false,
    },
  ],
};
