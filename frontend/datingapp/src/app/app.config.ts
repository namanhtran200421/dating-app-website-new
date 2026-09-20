import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withNoIncrementalHydration } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    /*
     * Incremental hydration and event replay both make Angular emit an inline bootstrap script,
     * which this site's Content-Security-Policy forbids (see scripts/check-security.mjs). They
     * stay off, so `@defer` here means "load this chunk later", never "hydrate this later".
     */
    provideClientHydration(withNoIncrementalHydration()),
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'top',
      }),
    ),
  ],
};
