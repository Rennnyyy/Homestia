/**
 * Unit tests for EnumI18nService — the mechanism that translates RDF
 * enumeration values by their `key` from the i18n dictionary
 * (`enum.<entityPath>.<key>`), with graceful fallback when a value is
 * untranslated.
 */
import { Injectable } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EnumI18nService } from './enum-i18n.service';

/** Minimal loader — the store is populated deterministically via setTranslation. */
@Injectable()
class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

describe('EnumI18nService', () => {
  let service: EnumI18nService;
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideTransloco({
          config: {
            availableLangs: ['en', 'de'],
            defaultLang: 'en',
            fallbackLang: 'en',
          },
          loader: MockTranslocoLoader,
        }),
      ],
    });
    service = TestBed.inject(EnumI18nService);
    transloco = TestBed.inject(TranslocoService);
    // Populate the store synchronously so translate() is deterministic.
    transloco.setTranslation(
      {
        'enum.furnishing-statuses.unfurnished': 'Unmöbliert',
        'enum.furnishing-statuses.fully-furnished': 'Voll möbliert',
        'enum.rental-stages.application': 'Bewerbung',
      },
      'en'
    );
  });

  it('builds the dotted dictionary key from entityPath and key', () => {
    expect(service.key('furnishing-statuses', 'unfurnished')).toBe(
      'enum.furnishing-statuses.unfurnished'
    );
  });

  it('translates an existing enum value by its key', () => {
    expect(service.translate('furnishing-statuses', 'unfurnished')).toBe('Unmöbliert');
  });

  it('falls back to the raw key when no translation exists', () => {
    expect(service.translate('furnishing-statuses', 'alien')).toBe('alien');
  });

  it('uses a provided fallback label (e.g. the backend displayName)', () => {
    expect(service.translate('furnishing-statuses', 'alien', 'Display Name')).toBe('Display Name');
  });

  it('translates stage keys too (single dictionary, entityPath-keyed)', () => {
    expect(service.translate('rental-stages', 'application')).toBe('Bewerbung');
  });

  it('labelFor translates enum items by key with displayName fallback', () => {
    expect(service.labelFor('furnishing-statuses', { key: 'unfurnished', displayName: 'Unfurnished' })).toBe('Unmöbliert');
    expect(service.labelFor('furnishing-statuses', { key: 'alien', displayName: 'Alien' })).toBe('Alien');
  });

  it('labelFor leaves non-enum items on displayName / name', () => {
    expect(service.labelFor('tenants', { displayName: 'Anna' })).toBe('Anna');
    expect(service.labelFor('properties', { name: 'Haus am See' })).toBe('Haus am See');
  });
});
