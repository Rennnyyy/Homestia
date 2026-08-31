/**
 * Unit tests for DynamicEntityTableComponent's EntityRef cell rendering —
 * reference values resolve to human labels, and enumeration values translate
 * by key via the i18n dictionary (`enum.<entityPath>.<key>`), falling back to
 * the backend displayName / name / raw IRI.
 */
import { Component, Injectable } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DynamicEntityTableComponent } from './dynamic-entity-table.component';
import type { EntityInfo } from '../../services/aletheia-http-client.models';

/** Inline mock loader — keys render as-is; translations set via setTranslation. */
@Injectable()
class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

/** Small entity with one enum ref (status) and one plain ref (owner). */
const TEST_ENTITY: EntityInfo = {
  entityPath: 'things',
  predicatePath: 'thing',
  displayName: 'Thing',
  properties: [
    { name: 'name', type: 'String', isCollection: false },
    { name: 'status', type: 'EntityRef', isCollection: false, targetEntityPath: 'statuses' },
    { name: 'owner', type: 'EntityRef', isCollection: false, targetEntityPath: 'owners' },
  ],
};

@Component({
  standalone: true,
  imports: [DynamicEntityTableComponent],
  template: `
    <app-dynamic-entity-table
      [entity]="entity"
      [items]="items"
      [loading]="false"
      [error]="null"
    />
  `,
})
class TestHost {
  readonly entity = TEST_ENTITY;
  items: Record<string, unknown>[] = [];
}

/** Runs change detection and flushes pending microtasks so the async load settles. */
async function settle(host: ComponentFixture<TestHost>): Promise<void> {
  host.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  host.detectChanges();
}

describe('DynamicEntityTableComponent — EntityRef cells', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TestHost],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({
          config: {
            availableLangs: [{ id: 'en', label: 'English' }],
            defaultLang: 'en',
            fallbackLang: 'en',
            reRenderOnLangChange: false,
          },
          loader: MockTranslocoLoader,
        }),
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('translates enum refs by key and renders plain refs by displayName', async () => {
    // Deliberately differs from the backend displayName to prove the
    // dictionary (not the fallback) is used for the enum cell.
    TestBed.inject(TranslocoService).setTranslation({ 'enum.statuses.active': 'Aktiv' }, 'en');

    const host = TestBed.createComponent(TestHost);
    host.componentInstance.items = [
      { iri: 'https://x/things/1', name: 'Flat', status: 'https://x/statuses/active', owner: 'https://x/owners/a' },
      { iri: 'https://x/things/2', name: 'Studio', status: 'https://x/statuses/blocked', owner: 'https://x/owners/b' },
    ];
    host.detectChanges();
    // The ref-loading effect fires asynchronously — let it issue the requests.
    await new Promise((resolve) => setTimeout(resolve));

    httpMock.expectOne('/api/entities/statuses').flush({
      items: [
        { iri: 'https://x/statuses/active', key: 'active', displayName: 'Active' },
        { iri: 'https://x/statuses/blocked', key: 'blocked', displayName: 'Blocked' },
      ],
    });
    httpMock.expectOne('/api/entities/owners').flush({
      items: [
        { iri: 'https://x/owners/a', displayName: 'Anna' },
        { iri: 'https://x/owners/b', displayName: 'Ben' },
      ],
    });
    await settle(host);

    const text: string = host.nativeElement.textContent;
    expect(text).toContain('Aktiv'); // enum translated by key
    expect(text).toContain('Blocked'); // enum without dict entry -> backend displayName
    expect(text).toContain('Anna'); // plain ref -> displayName
    expect(text).toContain('Ben');
    expect(text).not.toContain('https://x/statuses/');
  });

  it('falls back to the raw IRI when the referenced value is unknown', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.items = [
      { iri: 'https://x/things/1', name: 'Flat', status: 'https://x/statuses/unknown' },
    ];
    host.detectChanges();
    // The ref-loading effect fires asynchronously — let it issue the requests.
    await new Promise((resolve) => setTimeout(resolve));

    httpMock.expectOne('/api/entities/statuses').flush({ items: [] });
    httpMock.expectOne('/api/entities/owners').flush({ items: [] });
    await settle(host);

    expect(host.nativeElement.textContent).toContain('https://x/statuses/unknown');
  });
});
