/**
 * Unit tests for DynamicEntityFormComponent — verifies rendering across
 * all three modes, IRI visibility, field generation from EntityInfo,
 * and output emissions.
 */
import { Component, signal, Injectable } from '@angular/core';
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { of } from 'rxjs';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DynamicEntityFormComponent } from './dynamic-entity-form.component';
import type { ShapeViolation } from '../../../core/shapes';
import type { EntityInfo } from '../../services/aletheia-http-client.models';

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
  imports: [DynamicEntityFormComponent],
  template: `
    <app-dynamic-entity-form
      [entity]="entity()"
      [mode]="mode()"
      [value]="value()"
      [violations]="violations()"
      [createActions]="createActions()"
      [fieldDependencies]="fieldDependencies()"
      (saved)="onSaved($event)"
      (cancelled)="onCancelled()"
      (createRequested)="onCreateRequested($event)"
    />
  `,
})
class TestHost {
  readonly entity = signal<EntityInfo>({
    entityPath: 'properties', predicatePath: 'properties',
    displayName: 'Property',
    properties: [],
  });
  readonly mode = signal<'view' | 'edit' | 'create'>('view');
  readonly value = signal<Record<string, unknown> | null>(null);
  readonly violations = signal<ShapeViolation[]>([]);
  readonly createActions = signal<Record<string, { labelKey: string }>>({});
  readonly fieldDependencies = signal<Record<string, { dependsOn: string; via: string }>>({});

  savedData: Record<string, unknown> | null = null;
  cancelledCount = 0;
  requested: { propertyName: string; entityPath: string } | null = null;

  onSaved(data: Record<string, unknown>): void {
    this.savedData = data;
  }

  onCancelled(): void {
    this.cancelledCount++;
  }

  onCreateRequested(event: { propertyName: string; entityPath: string }): void {
    this.requested = event;
  }
}

function makeEntity(overrides?: Partial<EntityInfo>): EntityInfo {
  return {
    entityPath: 'properties', predicatePath: 'properties',
    displayName: 'Property',
    properties: [
      { name: 'address', type: 'String', isCollection: false },
      { name: 'roomCount', type: 'Int32', isCollection: false },
      { name: 'isFurnished', type: 'Boolean', isCollection: false },
      { name: 'builtDate', type: 'DateTime', isCollection: false },
      { name: 'owner', type: 'EntityRef', isCollection: false },
    ],
    ...overrides,
  };
}

/** Runs change detection and flushes pending microtasks so the async load settles. */
async function settle(host: ComponentFixture<TestHost>): Promise<void> {
  host.detectChanges();
  await new Promise((resolve) => setTimeout(resolve));
  host.detectChanges();
}

describe('DynamicEntityFormComponent', () => {
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

  // ═══════════════════════════════════════════════════════════════════════
  // IRI behavior
  // ═══════════════════════════════════════════════════════════════════════

  it('hides IRI field in create mode', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(
      makeEntity({
        properties: [
          { name: '@id', type: 'String', isCollection: false },
          { name: 'address', type: 'String', isCollection: false },
        ],
      }),
    );
    host.componentInstance.mode.set('create');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    // IRI label should not be present
    expect(el.textContent).not.toContain('@id');
    // Address label should be present
    expect(el.textContent).toContain('fields.properties.address');
  });

  it('does not render any chrome (no buttons, no footer)', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    // Core is just fields — no buttons, no footer
    expect(el.querySelector('footer')).toBeNull();
    expect(el.querySelector('button')).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Field count and types
  // ═══════════════════════════════════════════════════════════════════════

  it('renders a field for every entity property', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    // 5 properties: address, roomCount, isFurnished, builtDate, owner
    const inputs = el.querySelectorAll('input');
    // 3 text/number/date inputs + 1 checkbox
    expect(inputs.length).toBeGreaterThanOrEqual(4);
  });

  it('renders number input for Int32 property', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    const numberInputs = el.querySelectorAll('input[type="number"]');
    expect(numberInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('renders checkbox for Boolean property', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    const checkboxes = el.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Mode-dependent behavior
  // ═══════════════════════════════════════════════════════════════════════

  it('renders all form fields with correct types in view mode', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('view');
    host.componentInstance.value.set({ address: '123 Main', roomCount: 3 });
    host.detectChanges();
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;

    // Text input for String type (address)
    const addressInput = el.querySelector('#properties-address') as HTMLInputElement;
    expect(addressInput).toBeTruthy();
    expect(addressInput.type).toBe('text');

    // Number input for Int32 type (roomCount)
    const roomCountInput = el.querySelector('#properties-roomCount') as HTMLInputElement;
    expect(roomCountInput).toBeTruthy();
    expect(roomCountInput.type).toBe('number');

    // Date input for DateTime type (builtDate)
    const dateInput = el.querySelector('#properties-builtDate') as HTMLInputElement;
    expect(dateInput).toBeTruthy();
    expect(dateInput.type).toBe('date');

    // Checkbox for Boolean type (isFurnished)
    const checkbox = el.querySelector('#properties-isFurnished') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.type).toBe('checkbox');

    // Text input for EntityRef type (owner)
    const ownerInput = el.querySelector('#properties-owner') as HTMLInputElement;
    expect(ownerInput).toBeTruthy();
    expect(ownerInput.type).toBe('text');
    expect(ownerInput.placeholder).toBe('fields.placeholder.entityRef');
  });

  it('renders editable inputs in edit mode', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ address: '123 Main' });
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    const firstInput = el.querySelector('input:not([type="checkbox"])') as HTMLInputElement;
    expect(firstInput).toBeTruthy();
    // In edit mode, inputs should NOT have the disabled attribute
    expect(firstInput.hasAttribute('disabled')).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Number input value typing
  // ═══════════════════════════════════════════════════════════════════════

  it('emits a number for number inputs when saving', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ address: '123 Main', roomCount: null });
    host.detectChanges();

    const input = host.nativeElement.querySelector('#properties-roomCount') as HTMLInputElement;
    expect(input).toBeTruthy();

    input.value = '7';
    input.dispatchEvent(new Event('input'));
    host.detectChanges();

    const form = host.debugElement
      .query(By.directive(DynamicEntityFormComponent))
      .componentInstance as DynamicEntityFormComponent;
    await form.save();

    expect(host.componentInstance.savedData).toBeTruthy();
    expect(host.componentInstance.savedData!['roomCount']).toBe(7);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Empty state
  // ═══════════════════════════════════════════════════════════════════════

  it('shows empty message when entity has no properties', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set({
      entityPath: 'empty', predicatePath: 'empty',
      displayName: 'Empty',
      properties: [],
    });
    host.componentInstance.mode.set('view');
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    expect(el.textContent).toContain('dynamicForm.noFields');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // External violations (composite validation)
  // ═══════════════════════════════════════════════════════════════════════

  it('renders external per-field violations passed by the parent', () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity());
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ address: '123 Main' });
    host.componentInstance.violations.set([
      { jsonPath: 'address', key: 'address', message: 'The address is invalid.', severity: 'Violation' },
      { jsonPath: 'rooms[0].name', key: 'name', message: 'Not for this form.', severity: 'Violation' },
    ]);
    host.detectChanges();

    const el: HTMLElement = host.nativeElement;
    expect(el.textContent).toContain('The address is invalid.');
    // Nested violations with a dot path belong to child forms, not this one.
    expect(el.textContent).not.toContain('Not for this form.');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // EntityRef selector (global dropdown)
  // ═══════════════════════════════════════════════════════════════════════

  it('renders an EntityRef with a target path as a real dropdown', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity({
      properties: [
        { name: 'owner', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
      ],
    }));
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ owner: '' });
    host.detectChanges();
    httpMock.expectOne('/api/entities/properties').flush({ items: [{ iri: 'https://x/properties/1', name: 'Haus A' }] });
    await settle(host);

    const select = host.nativeElement.querySelector('app-entity-ref-select select');
    expect(select).toBeTruthy();
    expect((select as HTMLSelectElement).textContent).toContain('Haus A');
    // No raw IRI text input is rendered for this field.
    expect(host.nativeElement.querySelector('input#properties-owner')).toBeNull();
  });

  it('renders a configurable create action and emits createRequested', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity({
      properties: [
        { name: 'tenant', type: 'EntityRef', isCollection: false, targetEntityPath: 'tenants' },
      ],
    }));
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ tenant: '' });
    host.componentInstance.createActions.set({ tenant: { labelKey: 'nav.rentals.addTenant' } });
    host.detectChanges();
    httpMock.expectOne('/api/entities/tenants').flush({ items: [{ iri: 'https://x/tenants/1', displayName: 'Anna' }] });
    await settle(host);

    const button = host.nativeElement.querySelector('app-entity-ref-select button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(host.componentInstance.requested).toEqual({ propertyName: 'tenant', entityPath: 'tenants' });
  });

  it('filters a dependent EntityRef by the selected parent value', async () => {
    const host = TestBed.createComponent(TestHost);
    host.componentInstance.entity.set(makeEntity({
      properties: [
        { name: 'property', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
        { name: 'unit', type: 'EntityRef', isCollection: false, targetEntityPath: 'rooms' },
      ],
    }));
    host.componentInstance.mode.set('edit');
    host.componentInstance.value.set({ property: 'https://x/properties/A', unit: '' });
    host.componentInstance.fieldDependencies.set({ unit: { dependsOn: 'property', via: 'isPartOf' } });
    host.detectChanges();
    httpMock.expectOne('/api/entities/properties').flush({ items: [{ iri: 'https://x/properties/A', name: 'Haus A' }] });
    httpMock.expectOne('/api/entities/rooms').flush({
      items: [
        { iri: 'https://x/rooms/1', name: 'Kitchen', isPartOf: { iri: 'https://x/properties/A' } },
        { iri: 'https://x/rooms/2', name: 'Living', isPartOf: { iri: 'https://x/properties/B' } },
      ],
    });
    await settle(host);

    const selects = host.nativeElement.querySelectorAll('app-entity-ref-select select');
    expect(selects.length).toBe(2);
    // The unit dropdown (second) shows only rooms of the selected property.
    const unitSelect = selects[1] as HTMLSelectElement;
    expect(unitSelect.textContent).toContain('Kitchen');
    expect(unitSelect.textContent).not.toContain('Living');
  });
});
