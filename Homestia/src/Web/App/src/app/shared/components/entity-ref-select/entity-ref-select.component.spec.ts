/**
 * Unit tests for EntityRefSelectComponent — verifies that an EntityRef field
 * always renders a real dropdown (never a bare IRI text input), with options,
 * loading/error feedback, and the configurable inline create action.
 */
import { Component, signal, Injectable } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco, TranslocoLoader, TranslocoService } from '@jsverse/transloco';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EntityRefSelectComponent } from './entity-ref-select.component';

/** Inline mock loader — returns empty translations so keys render as-is. */
@Injectable()
class MockTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

/** Minimal host to bind inputs/outputs in tests. */
@Component({
  standalone: true,
  imports: [EntityRefSelectComponent],
  template: `
    <app-entity-ref-select
      [entityPath]="path()"
      [value]="value()"
      [allowCreate]="allowCreate()"
      [createLabelKey]="'nav.rentals.addTenant'"
      [hint]="hint()"
      [filter]="filter()"
      (valueChange)="value.set($event)"
      (create)="onCreate()"
    />
  `,
})
class TestHost {
  readonly path = signal('tenants');
  readonly value = signal('');
  readonly allowCreate = signal(true);
  readonly hint = signal<string | null>(null);
  readonly filter = signal<{ predicate: string; value: string | null } | null>(null);
  created = 0;

  onCreate(): void {
    this.created++;
  }
}

function selectOf(host: ReturnType<typeof TestBed.createComponent<TestHost>>): HTMLSelectElement {
  return host.nativeElement.querySelector('select') as HTMLSelectElement;
}

/** Runs change detection and flushes pending microtasks so the async load settles. */
async function settle(host: ComponentFixture<TestHost>): Promise<void> {
  host.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  host.detectChanges();
}

describe('EntityRefSelectComponent', () => {
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
  });

  it('always renders a dropdown with the loaded options', async () => {
    const host = TestBed.createComponent(TestHost);
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush({
      items: [
        { iri: 'https://x/tenants/1', displayName: 'Anna' },
        { iri: 'https://x/tenants/2', displayName: 'Ben' },
      ],
    });
    await settle(host);

    const select = selectOf(host);
    expect(select).toBeTruthy();
    // placeholder + two loaded options — never a text input
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(3);
    expect(select.textContent).toContain('Anna');
    expect(select.textContent).toContain('Ben');
  });

  it('emits valueChange when the user picks an option', async () => {
    const host = TestBed.createComponent(TestHost);
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush({
      items: [
        { iri: 'https://x/tenants/1', displayName: 'Anna' },
        { iri: 'https://x/tenants/2', displayName: 'Ben' },
      ],
    });
    await settle(host);

    const select = selectOf(host);
    select.value = 'https://x/tenants/2';
    select.dispatchEvent(new Event('change'));
    host.detectChanges();

    expect(host.componentInstance.value()).toBe('https://x/tenants/2');
  });

  it('shows the inline create button and emits create on click', async () => {
    const host = TestBed.createComponent(TestHost);
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush({ items: [{ iri: 'https://x/tenants/1', displayName: 'Anna' }] });
    await settle(host);

    const button = host.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.textContent).toContain('nav.rentals.addTenant');
    button.click();
    expect(host.componentInstance.created).toBe(1);
  });

  it('hides the create button when allowCreate is off', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.allowCreate.set(false);
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush({ items: [{ iri: 'https://x/tenants/1', displayName: 'Anna' }] });
    await settle(host);

    expect(host.nativeElement.querySelector('button')).toBeNull();
  });

  it('shows an error with retry instead of a bare input when loading fails', async () => {
    const host = TestBed.createComponent(TestHost);
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush('boom', { status: 500, statusText: 'Server Error' });
    await settle(host);

    const el: HTMLElement = host.nativeElement;
    expect(el.textContent).toContain('entityRefSelect.loadError');
    expect(el.textContent).toContain('entityRefSelect.retry');
    // Still a dropdown — never a raw IRI text input
    expect(selectOf(host)).toBeTruthy();
  });

  it('filters options by the configured predicate and reacts to filter changes', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.path.set('rooms');
    host.componentInstance.filter.set({ predicate: 'isPartOf', value: 'https://x/properties/A' });
    host.detectChanges();
    httpMock.expectOne('/api/entities/rooms').flush({
      items: [
        { iri: 'https://x/rooms/1', name: 'Kitchen', isPartOf: { iri: 'https://x/properties/A' } },
        { iri: 'https://x/rooms/2', name: 'Living', isPartOf: { iri: 'https://x/properties/B' } },
      ],
    });
    await settle(host);

    const select = selectOf(host);
    expect(select.textContent).toContain('Kitchen');
    expect(select.textContent).not.toContain('Living');

    // Changing the filter value reactively swaps the shown options.
    host.componentInstance.filter.set({ predicate: 'isPartOf', value: 'https://x/properties/B' });
    host.detectChanges();
    expect(select.textContent).not.toContain('Kitchen');
    expect(select.textContent).toContain('Living');
  });

  it('translates enum option labels by key, falling back to displayName', async () => {
    // A translation that deliberately differs from the backend displayName
    // proves the dictionary (not the fallback) is used.
    TestBed.inject(TranslocoService).setTranslation(
      { 'enum.furnishing-statuses.unfurnished': 'Unmöbliert' },
      'en'
    );
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.path.set('furnishing-statuses');
    host.detectChanges();
    httpMock.expectOne('/api/entities/furnishing-statuses').flush({
      items: [
        { iri: 'https://x/furnishing-statuses/unfurnished', key: 'unfurnished', displayName: 'Unfurnished' },
        { iri: 'https://x/furnishing-statuses/blocked', key: 'blocked', displayName: 'Blocked' },
      ],
    });
    await settle(host);

    const select = selectOf(host);
    expect(select.textContent).toContain('Unmöbliert'); // translated by key
    expect(select.textContent).toContain('Blocked');     // untranslated -> backend displayName
  });

  it('leaves non-enum entities (no key) showing their displayName', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.path.set('properties');
    host.detectChanges();
    httpMock.expectOne('/api/entities/properties').flush({
      items: [{ iri: 'https://x/properties/1', name: 'Haus am See', address: 'Seeufer 1' }],
    });
    await settle(host);

    expect(selectOf(host).textContent).toContain('Haus am See');
  });
});
