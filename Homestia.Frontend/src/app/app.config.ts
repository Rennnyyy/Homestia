import { AletheiaModelService, TranslocoHttpLoader, agentSimulationInterceptor, provideAgentSimulation } from '@rennnyyy/aletheia-core';
import { provideSkins } from '@rennnyyy/aletheia-ui';

import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideZoneChangeDetection,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideTransloco } from '@jsverse/transloco';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';

import { routes } from './app.routes';
import { catchError, firstValueFrom, of } from 'rxjs';
import { HOMESTIA_SKINS } from './core/theme/homestia-skin';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([agentSimulationInterceptor]), withInterceptorsFromDi()),

    // Development identity: the header switch declares the agent this browser acts as, and the
    // interceptor puts that declaration on every request. A production build attaches nothing — a
    // shipped bundle cannot name itself — and the host holds the matching lock (it refuses to read
    // the header without AddAgentSimulation()).
    provideAgentSimulation(),
    provideAnimations(),
    provideSpartanHlm(),
    provideIcons({ lucideChevronDown, lucideChevronUp }),

    // Theming — "homestia" first, so it is the default skin.
    provideSkins(HOMESTIA_SKINS),

    // The backend's entity DEFINITIONS are a prerequisite, not a page's data: the
    // model is loaded before the app boots, so a page can read its entity's
    // EntityInfo in a field initializer (getEntity is synchronous) and the routes,
    // IRIs and flags all come from one source. A failure is reported and the app
    // still starts — a page that then finds no entity says so, in words.
    provideAppInitializer(() => {
      const model = inject(AletheiaModelService);
      return firstValueFrom(
        model.load().pipe(
          catchError((err: unknown) => {
            console.error(
              'Could not load the Aletheia model — the entity pages cannot render.',
              err,
            );
            return of(undefined);
          }),
        ),
      );
    }),

    // Transloco (i18n)
    provideTransloco({
      config: {
        availableLangs: [
          { id: 'en', label: 'English' },
          { id: 'de', label: 'Deutsch' },
        ],
        defaultLang: 'en',
        fallbackLang: 'en',
        reRenderOnLangChange: true,
      },
      loader: TranslocoHttpLoader,
    }),
  ],
};
