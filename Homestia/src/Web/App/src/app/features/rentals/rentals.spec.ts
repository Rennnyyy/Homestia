/**
 * Interaction specs for the rentals page — the stage accordion (its whole point:
 * a stage unlocks only once the previous one conformed), the persist-per-stage
 * save, the queued document deletion and the inline tenant create.
 *
 * The page is mounted with its real template. The wire is a route-aware double
 * rather than the SDK's `AletheiaHttpClientMock`, for two reasons that both
 * matter to this page: `refresh()` fans out through `forkJoin` and `saveStage`
 * awaits `lastValueFrom`, so every call must COMPLETE — a BehaviorSubject-backed
 * mock never does — and the page reads four different collections, so the double
 * has to answer per route.
 */
import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { provideHttpClient, type HttpHeaders } from '@angular/common/http';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import { Injectable } from '@angular/core';
import {
  AletheiaHttpClient,
  AletheiaModelService,
  ShaclValidatorService,
  type AletheiaCollection,
  type EntityInfo,
} from '@rennnyyy/aletheia-core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Rentals } from './rentals';
import {
  RENTAL_APPLICATION_SHAPE_IRI,
  RENTAL_OPERATION_IRI,
  TENANT_OPERATION_IRI,
} from '../../core/shapes/shape.model';

@Injectable()
class EmptyTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

interface Call {
  method: string;
  args: unknown[];
}

/**
 * A route-aware, COMPLETING wire double: every method answers from a per-route
 * store and records its call, so a spec can assert both the data flow and the
 * ROUTE each call was addressed by.
 */
class WireMock {
  readonly calls: Call[] = [];
  private readonly store = new Map<string, unknown[]>();
  /** IRIs handed out by successive `create` calls, per route. */
  private readonly createdIris = new Map<string, string[]>();

  seed(route: string, items: unknown[]): void {
    this.store.set(route, items);
  }

  willCreate(route: string, iri: string): void {
    this.createdIris.set(route, [...(this.createdIris.get(route) ?? []), iri]);
  }

  routeOf(method: string): string | undefined {
    return this.calls.find((c) => c.method === method)?.args[0] as string | undefined;
  }

  argsOf(method: string): unknown[] | undefined {
    return this.calls.find((c) => c.method === method)?.args;
  }

  query<T>(route: string, spec?: unknown, headers?: unknown): Observable<AletheiaCollection<T>> {
    this.calls.push({ method: 'query', args: [route, spec, headers] });
    return of({ items: (this.store.get(route) ?? []) as T[], totalCount: null, offset: null, limit: null });
  }

  get<T>(route: string, iri: string, headers?: HttpHeaders): Observable<T> {
    this.calls.push({ method: 'get', args: [route, iri, headers] });
    const found = (this.store.get(route) ?? []).find(
      (row) => (row as Record<string, unknown>)['iri'] === iri,
    );
    return found ? of(found as T) : throwError(() => new Error(`no ${route} at ${iri}`));
  }

  create(
    route: string,
    body: Record<string, unknown>,
    headers?: HttpHeaders,
  ): Observable<{ iri: string }> {
    this.calls.push({ method: 'create', args: [route, body, headers] });
    const queued = this.createdIris.get(route) ?? [];
    const iri = queued.shift() ?? `https://example.test/${route}/created`;
    this.createdIris.set(route, queued);
    this.store.set(route, [...(this.store.get(route) ?? []), { ...body, iri }]);
    return of({ iri });
  }

  update(
    route: string,
    iri: string,
    body: Record<string, unknown>,
    headers?: HttpHeaders,
  ): Observable<{ iri: string }> {
    this.calls.push({ method: 'update', args: [route, iri, body, headers] });
    return of({ iri });
  }

  delete(route: string, iri: string, headers?: HttpHeaders): Observable<void> {
    this.calls.push({ method: 'delete', args: [route, iri, headers] });
    return of(undefined);
  }

  /** The aspect-selection header a recorded call carried, if any. */
  aspectOf(method: string): string | null {
    const args = this.argsOf(method);
    const headers = args?.[args.length - 1] as HttpHeaders | undefined;
    return headers?.get('X-Aletheia-Operation-AspectIri') ?? null;
  }

  uploadObject(route: string, iri: string, file: File): Observable<unknown> {
    this.calls.push({ method: 'uploadObject', args: [route, iri, file] });
    return of(undefined);
  }

  downloadObject(route: string, iri: string): Observable<Blob> {
    this.calls.push({ method: 'downloadObject', args: [route, iri] });
    return of(new Blob());
  }

  deleteObject(route: string, iri: string): Observable<unknown> {
    this.calls.push({ method: 'deleteObject', args: [route, iri] });
    return of(undefined);
  }

  execute(): Observable<unknown> {
    return of({ success: true });
  }

  exploreEntities(): Observable<AletheiaCollection<unknown>> {
    return of({ items: [] });
  }

  exploreOperations(): Observable<AletheiaCollection<unknown>> {
    return of({ items: [] });
  }

  exploreCapabilities(): Observable<AletheiaCollection<unknown>> {
    return of({ items: [] });
  }

  exploreAspects(): Observable<AletheiaCollection<unknown>> {
    return of({ items: [] });
  }
}

/**
 * The page's slots. A real entity declares which of its fields are COLLECTIONS, and the form gives a
 * field the arity its entity declares — so a mock that calls every field scalar is not "simpler", it
 * is a different entity, and the form answers for the one it was given.
 */
function entityInfo(
  predicatePath: string,
  operationRoute: string,
  fields: string[],
  collections: string[] = [],
): EntityInfo {
  return {
    entityPath: predicatePath,
    predicatePath,
    definitionIri: `https://example.test/definitions/${predicatePath}`,
    operationRoute,
    displayName: predicatePath,
    properties: fields.map((name) => ({
      name,
      type: 'string',
      isCollection: collections.includes(name),
    })),
  };
}

const RENTAL_INFO = entityInfo(
  'rental',
  'rentals',
  ['tenant', 'property', 'unit', 'viewingDate', 'rentalDocuments'],
  ['rentalDocuments'],
);
const TENANT_INFO = entityInfo('tenant', 'tenants', ['displayName', 'email', 'phone']);

/** Every definition signal the SDK services may read, so the page mounts whole. */
class ModelStub {
  readonly definitions = signal<EntityInfo[]>([RENTAL_INFO, TENANT_INFO]);
  readonly entities = signal<EntityInfo[]>([RENTAL_INFO, TENANT_INFO]);
  readonly entityDefinitions = signal<unknown[]>([]);
  readonly operationDefinitions = signal<unknown[]>([]);
  readonly capabilities = signal<unknown[]>([]);
  readonly aspects = signal<unknown[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(true);
  readonly error = signal<string | null>(null);
  readonly lastLoadedAt = signal<Date | null>(null);
  getEntity(predicatePath: string): EntityInfo | undefined {
    return this.definitions().find((d) => d.predicatePath === predicatePath);
  }
}

/** Stage catalogue: the keys the accordion gates on, with their IRIs. */
const STAGE_IRIS: Record<string, string> = {
  application: 'https://example.test/rental-stages/application',
  contract: 'https://example.test/rental-stages/contract',
  deposit: 'https://example.test/rental-stages/deposit',
  handover: 'https://example.test/rental-stages/handover',
  tenancy: 'https://example.test/rental-stages/tenancy',
  noticed: 'https://example.test/rental-stages/noticed',
  handback: 'https://example.test/rental-stages/handback',
  terminated: 'https://example.test/rental-stages/terminated',
};

const stageRows = Object.entries(STAGE_IRIS).map(([key, iri]) => ({
  iri,
  key,
  displayName: key,
}));

const RENTAL_IRI = 'https://example.test/rentals/1';

function rental(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iri: RENTAL_IRI,
    tenant: 'https://example.test/tenants/9',
    property: 'https://example.test/properties/1',
    unit: 'https://example.test/rooms/4',
    currentStage: STAGE_IRIS['application'],
    ...overrides,
  };
}

describe('Rentals page', () => {
  let fixture: ComponentFixture<Rentals>;
  let page: Rentals;
  let wire: WireMock;
  let validator: { validate: ReturnType<typeof vi.fn>; loadSchema: ReturnType<typeof vi.fn> };

  const mount = (): void => {
    fixture = TestBed.createComponent(Rentals);
    page = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    wire = new WireMock();
    wire.seed('tenants', [{ iri: 'https://example.test/tenants/9', displayName: 'Anna' }]);
    wire.seed('rooms', [
      {
        iri: 'https://example.test/rooms/4',
        name: 'Room 4',
        isPartOf: 'https://example.test/properties/1',
      },
    ]);
    wire.seed('rental-stages', stageRows);
    validator = { validate: vi.fn(async () => []), loadSchema: vi.fn(async () => ({ keys: [] })) };

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [Rentals],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideSpartanHlm(),
        provideIcons({ lucideChevronDown, lucideChevronUp }),
        provideTransloco({
          config: { availableLangs: ['en'], defaultLang: 'en', reRenderOnLangChange: true },
          loader: EmptyTranslocoLoader,
        }),
        { provide: AletheiaHttpClient, useValue: wire },
        { provide: AletheiaModelService, useClass: ModelStub },
        { provide: ShaclValidatorService, useValue: validator },
        { provide: ActivatedRoute, useValue: { queryParams: new BehaviorSubject({}), snapshot: { queryParams: {} } } },
      ],
    });
  });

  describe('loading', () => {
    it('reads rentals, tenants, rooms and the stage catalogue by ROUTE', async () => {
      mount();
      await fixture.whenStable();

      const routes = wire.calls.filter((c) => c.method === 'query').map((c) => c.args[0]);
      expect(routes).toEqual(
        expect.arrayContaining(['rentals', 'tenants', 'rooms', 'rental-stages']),
      );
      expect(page.loading()).toBe(false);
    });

    it('asks the rentals list for the backend state enrichment', async () => {
      mount();
      await fixture.whenStable();

      const rentalsCall = wire.calls.find((c) => c.method === 'query' && c.args[0] === 'rentals')!;
      const headers = rentalsCall.args[2] as HttpHeaders;
      expect(headers.get('X-Aletheia-Query-AspectIri')).toBe(
        'urn:aletheia:homestia:query:rental-state',
      );
    });

    it('reports a failed load and stops the spinner', async () => {
      vi.spyOn(wire, 'query').mockReturnValue(throwError(() => new Error('backend down')));
      mount();
      await fixture.whenStable();

      expect(page.error()).toBe('backend down');
      expect(page.loading()).toBe(false);
    });
  });

  describe('stage gating', () => {
    it('unlocks a stage only once the previous one is done', () => {
      mount();

      expect(page.stageAvailable(0)).toBe(true);
      expect(page.stageAvailable(1)).toBe(false);
      expect(page.stageStatus(0)).toBe('current');
      expect(page.stageStatus(1)).toBe('locked');

      page.doneStages.set(new Set([0]));
      fixture.detectChanges();

      expect(page.stageStatus(0)).toBe('done');
      expect(page.stageStatus(1)).toBe('current');
      expect(page.stageStatus(2)).toBe('locked');
      expect(page.stageAvailable(1)).toBe(true);
      expect(page.currentStageIndex()).toBe(1);
    });

    it('reports "all stages done" once every stage is complete', () => {
      mount();
      page.doneStages.set(new Set([0, 1, 2, 3, 4, 5, 6, 7]));

      expect(page.currentStageIndex()).toBe(8);
      expect(page.stageStatus(7)).toBe('done');
    });

    it('names each status through an i18n key', () => {
      expect(page.statusLabelKey('done')).toBe('nav.rentals.stageDone');
      expect(page.statusLabelKey('current')).toBe('nav.rentals.stageCurrent');
      expect(page.statusLabelKey('locked')).toBe('nav.rentals.stageLocked');
    });

    it('keeps each stage violation with its own panel', () => {
      mount();
      page.stageViolations.set(
        new Map([[1, [{ jsonPath: 'deposit', message: 'Required' } as never]]]),
      );

      expect(page.stageHasViolations(1)).toBe(true);
      expect(page.stageHasViolations(0)).toBe(false);
      expect(page.stageViolationsFor(1)).toHaveLength(1);
      expect(page.stageViolationsFor(2)).toEqual([]);
    });
  });

  describe('the list', () => {
    it('groups rentals by their lifecycle state, backend enrichment first', async () => {
      wire.seed('rentals', [
        rental({ iri: 'a', state: 'active' }),
        rental({ iri: 'b', state: 'closed' }),
      ]);
      mount();
      await fixture.whenStable();
      fixture.detectChanges();

      const groups = page.displayItems().map((g) => g['__group']);
      expect(groups).toEqual(['active', 'closed']);
      expect(page.displayItems()[0]['__label']).toBe('nav.rentals.state.active');
    });

    it('derives the state locally when the backend sends none', async () => {
      wire.seed('rentals', [
        rental({ iri: 'new-one', tenant: undefined, currentStage: STAGE_IRIS['application'] }),
        rental({ iri: 'moving-in', currentStage: STAGE_IRIS['application'] }),
        rental({ iri: 'living', currentStage: STAGE_IRIS['tenancy'] }),
        rental({ iri: 'finished', currentStage: STAGE_IRIS['terminated'] }),
      ]);
      mount();
      await fixture.whenStable();

      const groups = page.displayItems().map((g) => g['__group']);
      expect(groups).toEqual(['new', 'progressing', 'active', 'closed']);
      // The stage progress carried per row follows `currentStage`.
      const stages = page.displayItems()[0]['__children'] as Record<string, unknown>[];
      expect((stages[0]['__stages'] as { status: string }[])[0].status).toBe('current');
    });

    it('opens the edit mode from a row and normalizes its references', async () => {
      wire.seed('rentals', [
        rental({ tenant: { iri: 'https://example.test/tenants/9' }, rentalDocuments: [{ iri: 'doc-1' }] }),
      ]);
      wire.seed('rental-documents', [{ iri: 'doc-1', name: 'contract.pdf', contentType: 'application/pdf' }]);
      mount();
      await fixture.whenStable();

      page.onRowClick(page.items()[0]);
      await fixture.whenStable();
      fixture.detectChanges();

      expect(page.mode()).toBe('edit');
      expect(page.workingRental()?.['tenant']).toBe('https://example.test/tenants/9');
      expect(page.workingRental()?.['rentalDocuments']).toEqual(['doc-1']);
      // Documents of the edited rental are loaded for the Contract stage.
      expect(page.contractDocuments()).toEqual([
        { iri: 'doc-1', name: 'contract.pdf', contentType: 'application/pdf' },
      ]);
    });

    it('replays stage progress from the stored current stage', async () => {
      wire.seed('rentals', [rental({ currentStage: STAGE_IRIS['deposit'] })]);
      mount();
      await fixture.whenStable();

      page.onRowClick(page.items()[0]);
      fixture.detectChanges();

      expect([...page.doneStages()]).toEqual([0, 1]);
      expect(page.stageStatus(2)).toBe('current');
      expect(page.editingTenantLabel()).toBe('Anna');
    });
  });

  describe('the create/edit lifecycle', () => {
    it('starts a create with an empty draft and resets on exit', () => {
      mount();

      page.enterCreate();
      fixture.detectChanges();

      expect(page.mode()).toBe('create');
      expect(page.workingRental()).toEqual({});
      expect(page.contractDocuments()).toEqual([]);

      page.exitCreate();
      expect(page.mode()).toBe('list');
      expect(page.pendingRental()).toBeNull();
    });
  });

  describe('jump links to the property and its room', () => {
    it('targets the selected property for editing and a create when none is chosen', () => {
      mount();
      page.enterCreate();

      expect(page.propertyManageParams('https://example.test/properties/1')).toEqual({
        mode: 'edit',
        iri: 'https://example.test/properties/1',
      });
      expect(page.propertyManageParams('')).toEqual({ mode: 'create' });
    });

    it('nests the room link inside the property that is selected right now', () => {
      mount();
      page.enterCreate();
      page.pendingRental.set({ property: 'https://example.test/properties/1' });

      expect(page.parentPropertyIri()).toBe('https://example.test/properties/1');
      expect(page.roomManageParams('https://example.test/rooms/4')).toEqual({
        mode: 'edit',
        iri: 'https://example.test/properties/1',
        room: 'https://example.test/rooms/4',
      });
      expect(page.roomManageParams('')).toEqual({
        mode: 'edit',
        iri: 'https://example.test/properties/1',
      });
    });

    it('falls back to a property create when no property is selected', () => {
      mount();
      page.enterCreate();

      expect(page.parentPropertyIri()).toBeNull();
      expect(page.roomManageParams('https://example.test/rooms/4')).toEqual({ mode: 'create' });
    });

    it('clears a room that does not belong to the newly selected property', async () => {
      wire.seed('rooms', [
        { iri: 'https://example.test/rooms/4', name: 'Room 4', isPartOf: 'https://example.test/properties/OTHER' },
      ]);
      mount();
      await fixture.whenStable();
      page.enterCreate();
      page.pendingRental.set({
        property: 'https://example.test/properties/1',
        unit: 'https://example.test/rooms/4',
      });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(page.pendingRental()?.['unit']).toBe('');
    });
  });

  describe('saving a stage', () => {
    it('validates the stage shape and persists the rental with the next stage as current', async () => {
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      await page.saveStage(0);
      fixture.detectChanges();

      expect(validator.validate).toHaveBeenCalledWith(RENTAL_APPLICATION_SHAPE_IRI, expect.anything());

      const [route, iri, body] = wire.argsOf('update')!;
      // Every stage save selects the one rental aspect: the save PUTs the whole
      // record, so a per-stage aspect would erase the stages already filled.
      expect(wire.aspectOf('update')).toBe(RENTAL_OPERATION_IRI);
      expect(route).toBe('rentals');
      expect(iri).toBe(RENTAL_IRI);
      // Stage 1 is the next incomplete stage, so a reload re-opens there.
      expect((body as Record<string, unknown>)['currentStage']).toBe(STAGE_IRIS['contract']);
      expect(page.doneStages().has(0)).toBe(true);
      expect(page.savingStage()).toBe(false);
    });

    it('sends reference collections as plain IRIs', async () => {
      mount();
      page.enterEdit(rental({ rentalDocuments: [{ iri: 'doc-1' }] }));
      fixture.detectChanges();

      await page.saveStage(0);

      const body = wire.argsOf('update')![2] as Record<string, unknown>;
      expect(body['rentalDocuments']).toEqual(['doc-1']);
    });

    it('does not persist while the stage has violations', async () => {
      validator.validate.mockResolvedValue([
        { jsonPath: 'viewingDate', message: 'Required', kind: 'minCount' } as never,
      ]);
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      await page.saveStage(0);
      fixture.detectChanges();

      expect(wire.calls.some((c) => c.method === 'update' || c.method === 'create')).toBe(false);
      expect(page.stageHasViolations(0)).toBe(true);
      expect(page.doneStages().has(0)).toBe(false);
    });

    it('creates the rental on the first save and keeps the draft bound to it', async () => {
      wire.willCreate('rentals', 'https://example.test/rentals/first');
      mount();
      page.enterCreate();
      page.pendingRental.set({ property: 'https://example.test/properties/1' });
      fixture.detectChanges();

      const working = page.workingRental();
      await page.saveStage(0);

      expect(wire.routeOf('create')).toBe('rentals');
      // The mounted forms stay bound to the SAME object — swapping it would orphan
      // their two-way bound edits, so only the IRI is recorded on it.
      expect(page.workingRental()).toBe(working);
      expect(page.workingRental()?.['iri']).toBe('https://example.test/rentals/first');

      // The next save updates instead of creating again.
      await page.saveStage(1);
      expect(wire.argsOf('update')![1]).toBe('https://example.test/rentals/first');
    });

    it('reports a failed save instead of advancing the accordion', async () => {
      vi.spyOn(wire, 'update').mockReturnValue(throwError(() => new Error('write refused')));
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      await page.saveStage(0);
      fixture.detectChanges();

      expect(page.error()).toBe('write refused');
      expect(page.doneStages().has(0)).toBe(false);
      expect(page.savingStage()).toBe(false);
    });
  });

  describe('contract documents', () => {
    it('loads the metadata of the documents the rental references', async () => {
      wire.seed('rental-documents', [
        { iri: 'doc-1', name: 'contract.pdf', contentType: 'application/pdf' },
      ]);
      mount();
      page.enterEdit(rental({ rentalDocuments: ['doc-1'] }));
      await fixture.whenStable();

      expect(wire.argsOf('get')![0]).toBe('rental-documents');
      expect(page.contractDocuments()).toEqual([
        { iri: 'doc-1', name: 'contract.pdf', contentType: 'application/pdf' },
      ]);
    });

    it('treats an unreadable document as absent rather than failing the stage', async () => {
      mount();
      page.enterEdit(rental({ rentalDocuments: ['doc-missing'] }));
      await fixture.whenStable();

      expect(page.contractDocuments()).toEqual([]);
    });

    it('writes a new document list onto the working rental and reloads it', async () => {
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      page.onContractDocumentsChanged(['doc-2']);

      expect(page.workingRental()?.['rentalDocuments']).toEqual(['doc-2']);
      expect(page.contractDocuments()).toEqual([]);
    });

    it('deletes a removed document only AFTER the rental was persisted', async () => {
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      page.onContractDocumentRemoved('doc-3');
      expect(wire.calls.some((c) => c.method === 'delete')).toBe(false);

      await page.saveStage(0);
      await fixture.whenStable();

      expect(wire.argsOf('delete')).toEqual(['rental-documents', 'doc-3', expect.anything()]);
      // The document belongs to the rental's contract stage, so its removal runs
      // under the same aspect as the save that queued it.
      expect(wire.aspectOf('delete')).toBe(RENTAL_OPERATION_IRI);
    });

    it('keeps the documents when the user leaves without saving', () => {
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      page.onContractDocumentRemoved('doc-3');
      page.exitCreate();

      expect(wire.calls.some((c) => c.method === 'delete')).toBe(false);
    });

    it('queues each removal once', () => {
      mount();
      page.enterEdit(rental());
      fixture.detectChanges();

      page.onContractDocumentRemoved('doc-3');
      page.onContractDocumentRemoved('doc-3');
      expect(page['pendingDocDeletes']).toEqual(['doc-3']);
    });
  });

  describe('the inline tenant create', () => {
    it('toggles the quick-create card for the tenant field only', () => {
      mount();

      page.onCreateRequested('tenant');
      expect(page.showTenantForm()).toBe(true);

      page.onCreateRequested('property');
      expect(page.showTenantForm()).toBe(true);

      page.onCreateRequested('tenant');
      expect(page.showTenantForm()).toBe(false);
    });

    it('creates the tenant, selects it and reloads the dropdown without remounting', async () => {
      wire.willCreate('tenants', 'https://example.test/tenants/new');
      mount();
      page.enterCreate();
      page.pendingRental.set({});
      fixture.detectChanges();

      await page.onTenantSaved({ displayName: '  Bernd  ', email: 'b@example.test' });

      expect(wire.argsOf('create')).toEqual([
        'tenants',
        { displayName: 'Bernd', email: 'b@example.test', phone: '' },
        expect.anything(),
      ]);
      // The quick-create writes a Tenant, so it selects the tenant aspect — the
      // server keeps only the fields that shape names.
      expect(wire.aspectOf('create')).toBe(TENANT_OPERATION_IRI);
      expect(page.workingRental()?.['tenant']).toBe('https://example.test/tenants/new');
      expect(page.tenantReloadKey()).toBe(1);
      expect(page.showTenantForm()).toBe(false);
      expect(page.savingTenant()).toBe(false);
    });

    it('ignores a tenant without a name', async () => {
      mount();
      page.enterCreate();
      page.pendingRental.set({});

      await page.onTenantSaved({ displayName: '   ' });

      expect(wire.calls.some((c) => c.method === 'create')).toBe(false);
      expect(page.showTenantForm()).toBe(false);
    });

    it('shows a failed tenant create inline', async () => {
      vi.spyOn(wire, 'create').mockReturnValue(throwError(() => new Error('tenant refused')));
      mount();
      page.enterCreate();
      page.pendingRental.set({});

      await page.onTenantSaved({ displayName: 'Bernd' });
      fixture.detectChanges();

      expect(page.tenantError()).toBe('tenant refused');
      expect(page.savingTenant()).toBe(false);
    });

    it('delegates the save to the generic form instead of validating inline', async () => {
      mount();
      const save = vi.fn(async () => true);

      await page.saveTenantFromForm({ save } as never);

      expect(save).toHaveBeenCalled();
    });
  });

  describe('deleting a rental', () => {
    it('deletes by ROUTE and reloads the list', async () => {
      wire.seed('rentals', [rental()]);
      mount();
      await fixture.whenStable();

      page.rowActions.find((a) => a.label === 'common.delete')!.action(page.items()[0]);
      fixture.detectChanges();
      expect(page.confirmingDelete()).toBe(true);

      page.onDelete();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(wire.argsOf('delete')).toEqual(['rentals', RENTAL_IRI, expect.anything()]);
      expect(wire.aspectOf('delete')).toBe(RENTAL_OPERATION_IRI);
      expect(page.mode()).toBe('list');
      expect(page.confirmingDelete()).toBe(false);
    });

    it('says what went wrong when the delete is refused', async () => {
      vi.spyOn(wire, 'delete').mockReturnValue(throwError(() => new Error('still referenced')));
      mount();

      page.deletingItem.set(rental());
      page.onDelete();
      await fixture.whenStable();

      expect(page.error()).toBe('still referenced');
    });
  });

  it('renders the stage accordion with the later stages locked', async () => {
    mount();
    page.enterCreate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('enum.rental-stages.application');
    expect(page.stageStatus(1)).toBe('locked');
  });
});
