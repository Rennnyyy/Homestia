import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { provideTranslateService, MissingTranslationHandler } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';

import { routes } from './app.routes';
import { mockApiInterceptor } from './core/api/mock';
import { HomestiaMissingTranslationHandler } from './core/i18n/missing-translation-handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([mockApiInterceptor]),
      withInterceptorsFromDi(),
    ),
    provideTranslateService({
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useClass: HomestiaMissingTranslationHandler,
      },
    }),
    provideTranslateHttpLoader(),
  ],
};
