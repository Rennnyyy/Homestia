import { Injectable, inject, type Signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

/**
 * EnumI18nService — translates RDF enumeration values by their `key`.
 *
 * Enumeration entities (FurnishingStatus, PropertyType, RoomStatus, …) are
 * returned by the backend with a stable `key` (e.g. "unfurnished") and an
 * English-only `displayName`. This service resolves the per-language label
 * from the i18n dictionary under `enum.<entityPath>.<key>` (e.g.
 * `enum.furnishing-statuses.unfurnished`) and falls back to the raw
 * displayName/key when no translation exists — so a freshly added backend
 * enum value never renders as a missing key.
 *
 * The dictionary is keyed by the enum's API **entityPath** (not its
 * predicatePath) because that is the identifier every consumer already has:
 * `EntityRefSelectComponent` loads options by entityPath, so enum dropdowns
 * are localized with no extra wiring.
 */
@Injectable({ providedIn: 'root' })
export class EnumI18nService {
  private readonly transloco = inject(TranslocoService);

  /** Reactive active language — read inside `computed`s to re-derive on switch. */
  readonly activeLang: Signal<string> = this.transloco.activeLang;

  /** Build the i18n dictionary key for an enum value: `enum.<entityPath>.<key>`. */
  key(entityPath: string, key: string): string {
    return `enum.${entityPath}.${key}`;
  }

  /**
   * Resolve the localized label for an enum value.
   *
   * @param entityPath The enum's API entity path (e.g. "furnishing-statuses").
   * @param key        The enum instance key (e.g. "unfurnished").
   * @param fallback   Returned when the dictionary has no entry; defaults to
   *                   the raw `key` so the UI never shows a missing-key token.
   */
  translate(entityPath: string, key: string, fallback = key): string {
    const i18nKey = this.key(entityPath, key);
    const translated = this.transloco.translate(i18nKey);
    return translated && translated !== i18nKey ? translated : fallback;
  }

  /**
   * Localized label for a raw API item (enum or plain entity). This is the
   * single rule every consumer uses — dropdowns and tables alike.
   *
   * Enumeration items carry a stable `key`, so they translate by key with a
   * fallback to the backend displayName. Other entities (tenants, properties,
   * rooms) fall back to displayName / name / IRI.
   */
  labelFor(entityPath: string, item: Record<string, unknown>): string {
    const key = (item['key'] as string) ?? '';
    const displayName = (item['displayName'] as string) ?? '';
    if (key) {
      return this.translate(entityPath, key, displayName || key);
    }
    return displayName || (item['name'] as string) || (item['iri'] as string) || '';
  }
}
