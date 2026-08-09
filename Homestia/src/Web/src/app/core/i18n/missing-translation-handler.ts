import { Injectable, InjectionToken } from '@angular/core';
import type { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';

/**
 * Custom missing-translation handler.
 * When an i18n key is not found, shows "Unknown value (<key>)" so developers
 * can immediately see what's missing and users get a meaningful fallback.
 */
export class HomestiaMissingTranslationHandler implements MissingTranslationHandler {
  handle(params: MissingTranslationHandlerParams): string {
    // Interpolate params if present
    const key = params.interpolateParams
      ? `${params.key} (${JSON.stringify(params.interpolateParams)})`
      : params.key;
    return `Unknown value (${key})`;
  }
}

/** Provider token for the custom missing translation handler. */
export const MISSING_TRANSLATION_HANDLER_PROVIDER = {
  provide: 'MissingTranslationHandler' as never,
  useClass: HomestiaMissingTranslationHandler,
};
