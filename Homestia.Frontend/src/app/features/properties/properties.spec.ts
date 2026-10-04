/**
 * Interaction specs for the properties page — the list, the create/edit modes,
 * the room tree and the deep-link entry from the rentals page.
 *
 * The page is mounted with its REAL template (the SDK table, form and wizard
 * included); only the wire and the model are stubbed, so a broken binding is
 * caught here rather than in the browser.
 *
 * Two assertions carry a regression that cost this app a release: every call the
 * page makes is addressed by the entity's API ROUTE (`operationRoute`) — the
 * generated consts also carry a definition's own `entityPath` (`segmentations`
 * for Property, because it is a subtype), and using THAT as a route asks the
 * backend for a collection that does not exist.
 */
import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideSpartanHlm } from '@spartan-ng/helm/utils';
import { provideIcons } from '@ng-icons/core';
import { lucideChevronDown, lucideChevronUp } from '@ng-icons/lucide';
import { provideTransloco, TranslocoLoader } from '@jsverse/transloco';
import {
  AletheiaAiClient,
  AletheiaHttpClient,
  AletheiaHttpClientMock,
  AletheiaModelService,
  EntitySyncService,
  QUERY_ASPECT_HEADER,
  ShaclValidatorService,
  type EntityInfo,
} from '@rennnyyy/aletheia-core';
import { Injectable } from '@angular/core';
import { BehaviorSubject, of } from 'rxjs';

import { Properties } from './properties';
import { PROPERTY_SHAPE_IRI, ROOM_SHAPE_IRI, PROPERTY_OPERATION_IRI, ROOM_OPERATION_IRI, LANDLORD_QUERY_ASPECT_IRI } from '../../core/shapes/shape.model';

/** Inline loader — the dictionary stays empty, so keys render as their own id. */
@Injectable()
class EmptyTranslocoLoader implements TranslocoLoader {
  getTranslation() {
    return of({});
  }
}

/** The two definitions the page reads in its field initializers. */
function entityInfo(predicatePath: string, operationRoute: string, fields: string[]): EntityInfo {
  return {
    entityPath: predicatePath,
    predicatePath,
    definitionIri: `https://example.test/definitions/${predicatePath}`,
    operationRoute,
    displayName: predicatePath,
    properties: fields.map((name) => ({
      name,
      type: 'string',
      isCollection: false,
      propertyName: name.charAt(0).toUpperCase() + name.slice(1),
    })),
  };
}

const PROPERTY_INFO = entityInfo('property', 'properties', ['name', 'address']);
const ROOM_INFO = entityInfo('room', 'rooms', ['name', 'floor']);

/** Minimal model double: the page only ever asks it for a definition by predicate path. */
class ModelStub {
  readonly definitions = signal<EntityInfo[]>([PROPERTY_INFO, ROOM_INFO]);
  readonly entities = signal<EntityInfo[]>([PROPERTY_INFO, ROOM_INFO]);
  getEntity(predicatePath: string): EntityInfo | undefined {
    return this.definitions().find((d) => d.predicatePath === predicatePath);
  }
}

/** A model whose definitions are empty — what a boot that never loaded looks like. */
class MissingModel extends ModelStub {
  override getEntity(): EntityInfo | undefined {
    return undefined;
  }
}

/** Everything the page injects; only the model and the wire differ per spec. */
interface Doubles {
  http: AletheiaHttpClientMock;
  sync: { saveWithChildren: ReturnType<typeof vi.fn>; deleteWithChildren: ReturnType<typeof vi.fn> };
  validator: { validate: ReturnType<typeof vi.fn>; loadSchema: ReturnType<typeof vi.fn> };
  queryParams: BehaviorSubject<Record<string, string>>;
}

/**
 * Fresh doubles + a configured TestBed. Called from a `beforeEach` because a test
 * module cannot be reconfigured once something has been injected from it.
 */
function setupTestBed(modelClass: new () => unknown): Doubles {
  const http = new AletheiaHttpClientMock();
  const sync = {
    saveWithChildren: vi.fn(() => of({ iri: 'https://example.test/properties/1' })),
    deleteWithChildren: vi.fn(() => of(undefined)),
  };
  const validator = {
    validate: vi.fn(async () => []),
    loadSchema: vi.fn(async () => ({ keys: [] })),
  };
  const queryParams = new BehaviorSubject<Record<string, string>>({});

  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Properties],
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideSpartanHlm(),
      provideIcons({ lucideChevronDown, lucideChevronUp }),
      provideTransloco({
        config: { availableLangs: ['en'], defaultLang: 'en', reRenderOnLangChange: true },
        loader: EmptyTranslocoLoader,
      }),
      { provide: AletheiaHttpClient, useValue: http },
      { provide: AletheiaModelService, useClass: modelClass },
      { provide: EntitySyncService, useValue: sync },
      { provide: ShaclValidatorService, useValue: validator },
      { provide: AletheiaAiClient, useValue: { flowStream: vi.fn(() => of()) } },
      { provide: ActivatedRoute, useValue: { queryParams, snapshot: { queryParams: {} } } },
    ],
  });

  return { http, sync, validator, queryParams };
}

describe('Properties page', () => {
  let fixture: ComponentFixture<Properties>;
  let page: Properties;
  let http: AletheiaHttpClientMock;
  let sync: Doubles['sync'];
  let validator: Doubles['validator'];
  let queryParams: BehaviorSubject<Record<string, string>>;

  const mount = (): void => {
    fixture = TestBed.createComponent(Properties);
    page = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    ({ http, sync, validator, queryParams } = setupTestBed(ModelStub));
  });

  describe('the list', () => {
    it('queries the property collection by its API ROUTE, not its entity path', () => {
      mount();

      const query = http.calls.find((c) => c.method === 'query');
      expect(query?.args[0]).toBe('properties');
      expect(query?.args[0]).not.toBe(PROPERTY_INFO.entityPath);
    });

    it('renders the configured columns and the loaded rows', async () => {
      http.queryResult.next({
        items: [{ iri: 'https://example.test/properties/1', name: 'Haus A', address: 'Weg 1' }],
        totalCount: 1,
      } as never);

      mount();
      await fixture.whenStable();
      fixture.detectChanges();

      const headers = [...fixture.nativeElement.querySelectorAll('th')]
        .map((th) => (th as HTMLElement).textContent?.trim())
        .filter(Boolean);
      expect(headers).toContain('Name');
      expect(headers).toContain('Address');

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('Haus A');
      expect(text).toContain('Weg 1');
    });

    it('reports a failed load instead of leaving the table empty', () => {
      http.queryResult.error(new Error('backend down'));

      mount();

      expect(page.error()).toBe('backend down');
      expect(page.loading()).toBe(false);
    });
  });

  describe('the create mode', () => {
    it('resets the create state on entry, so a second create starts clean', () => {
      mount();

      page.enterCreate();
      page.pendingProperty.set({ name: 'Draft' });
      page.rooms.set([{ name: 'Room 1' }]);
      page.createStep.set('review');
      fixture.detectChanges();

      expect(page.mode()).toBe('create');

      page.exitCreate();
      fixture.detectChanges();

      expect(page.mode()).toBe('list');
      expect(page.pendingProperty()).toBeNull();
      expect(page.createStep()).toBe('details');

      // `enterCreate` is what clears the tree — exiting only closes the mode, so a
      // second create must not inherit the previous draft or its violations.
      page.enterCreate();
      page.validationErrors.set([{ jsonPath: 'name', message: 'stale' } as never]);
      page.enterCreate();
      fixture.detectChanges();

      expect(page.rooms()).toEqual([]);
      expect(page.validationErrors()).toEqual([]);
    });

    it('hands the mobile wizard forward and back through its steps', async () => {
      mount();
      page.enterCreate();
      fixture.detectChanges();

      expect(page.createStep()).toBe('details');
      expect(page.stepIndex('details')).toBe(0);
      expect(page.stepIndex('room')).toBe(1);
      expect(page.stepIndex('review')).toBe(2);
    });
  });

  describe('the room tree', () => {
    it('adds, updates and removes rooms, tracking open rows by index', () => {
      mount();
      page.enterCreate();

      page.addRoom();
      page.addRoom();
      expect(page.rooms()).toHaveLength(2);

      page.updateRoom(1, { name: 'Balcony' });
      expect(page.rooms()[1]['name']).toBe('Balcony');

      page.removeRoom(0);
      expect(page.rooms()).toHaveLength(1);
      expect(page.rooms()[0]['name']).toBe('Balcony');
    });

    it('keeps each room violation with its own row', async () => {
      mount();
      page.enterCreate();
      page.addRoom();
      page.addRoom();
      fixture.detectChanges();

      // Composite violations arrive with a `rooms[i].` prefix (the shape engine
      // validates the property and its rooms as ONE document).
      page.validationErrors.set([
        { jsonPath: 'rooms[0].name', message: 'Name is required', kind: 'minCount' } as never,
        { jsonPath: 'rooms[1].floor', message: 'Floor is required', kind: 'minCount' } as never,
        { jsonPath: 'name', message: 'Name is required', kind: 'minCount' } as never,
      ]);

      // Each row shows its own violations with the prefix stripped, so the message
      // points at a field of THIS room.
      expect(page.violationsForRoom(0)).toEqual([
        { jsonPath: 'name', message: 'Name is required', kind: 'minCount' },
      ]);
      expect(page.violationsForRoom(2)).toEqual([]);
      expect(page.roomHasViolations(0)).toBe(true);
      expect(page.roomHasViolations(1)).toBe(true);
      expect(page.roomHasViolations(2)).toBe(false);

      // …and the property's own panel must not repeat them.
      expect(page.propertyViolations()).toEqual([
        { jsonPath: 'name', message: 'Name is required', kind: 'minCount' },
      ]);
    });
  });

  describe('saving', () => {
    it('refuses to save while the view engine reports violations', async () => {
      validator.validate.mockResolvedValue([
        { jsonPath: 'name', message: 'Name is required', kind: 'minCount' } as never,
      ]);
      mount();

      await page.onPropertySaved({ name: '' });
      fixture.detectChanges();

      expect(page.validationErrors()).toHaveLength(1);
      expect(sync.saveWithChildren).not.toHaveBeenCalled();
    });

    it('saves property and rooms as one composite document by ROUTE', async () => {
      validator.validate.mockResolvedValue([]);
      mount();
      page.enterCreate();
      page.pendingProperty.set({ name: 'Haus A' });
      page.rooms.set([{ name: 'Room 1' }]);

      await page.onPropertySaved({ name: 'Haus A' });
      fixture.detectChanges();

      expect(sync.saveWithChildren).toHaveBeenCalledTimes(1);
      const request = sync.saveWithChildren.mock.calls[0][0];
      expect(request.parentPath).toBe('properties');
      expect(request.childPath).toBe('rooms');
      // A property and its rooms are different entity types, so the save selects the aspect that
      // governs EACH side — one aspect per entity.
      expect(request.parentAspectIri).toBe(PROPERTY_OPERATION_IRI);
      expect(request.childAspectIri).toBe(ROOM_OPERATION_IRI);
      expect(page.mode()).toBe('list');
    });

    it('asks the room forms for their drafts BEFORE the property form saves', async () => {
      mount();
      // A form hands its draft back only when it saves, so a room's typed values reach `rooms()` —
      // the collection the composite validation reads — only if the room forms are asked FIRST.
      // Saving the property first validates the drafts the page seeded: the values the user typed
      // are reported blank and the write is rejected.
      const order: string[] = [];
      const roomSave = vi.fn(async () => {
        order.push('room');
        return true;
      });
      const propertySave = vi.fn(async () => {
        order.push('property');
        return true;
      });
      vi.spyOn(page, 'roomForms').mockReturnValue([{ save: roomSave }] as never);
      vi.spyOn(page, 'formRef').mockReturnValue({ save: propertySave } as never);

      await page.saveWithRooms();

      expect(order).toEqual(['room', 'property']);
    });
  });

  describe('the landlord a new property is bound to', () => {
    const LANDLORD = 'https://example.test/landlords/1';

    it('binds the property to the landlord the read gate answers with', async () => {
      http.queryResult.next({ items: [{ iri: LANDLORD }] });
      mount();
      page.enterCreate();

      await page.onPropertySaved({ name: 'Haus A' });

      // The landlord is part of the property's OWN record: the read and the write gates resolve it
      // from there, so a property saved without one is unreachable for everyone.
      expect(sync.saveWithChildren).toHaveBeenCalledTimes(1);
      expect(sync.saveWithChildren.mock.calls[0][0].parentData.landlord).toBe(LANDLORD);

      // The lookup is itself a gated read — the collection answers with the caller's own landlord
      // and no other, which is why the page needs no way to name the agent it owns through.
      const landlordRead = http.calls.find(
        (call) => call.method === 'query' && call.args[0] === 'landlords',
      );
      expect(landlordRead, 'the page asks the landlord collection for its own landlord').toBeDefined();
      const headers = landlordRead!.args[2] as { get(name: string): string | null };
      expect(headers.get(QUERY_ASPECT_HEADER)).toBe(LANDLORD_QUERY_ASPECT_IRI);

      // The page never provisions one: the host does that for the acting agent, and a client that
      // tried would have to name an agent IRI it cannot know.
      expect(http.calls.some((call) => call.method === 'create')).toBe(false);
    });

    it('binds nothing when the caller has no landlord — there is no agent to own the property', async () => {
      http.queryResult.next({ items: [] });
      mount();
      page.enterCreate();

      await page.onPropertySaved({ name: 'Haus A' });

      const parentData = sync.saveWithChildren.mock.calls[0][0].parentData;
      expect(parentData.landlord).toBeUndefined();
      expect(parentData.name).toBe('Haus A');
    });
  });

  describe('deleting', () => {
    it('routes a row action to the confirm dialog and deletes the whole tree by ROUTE', () => {
      mount();
      const item = { iri: 'https://example.test/properties/1', name: 'Haus A' };

      const deleteAction = page.rowActions.find((a) => a.label === 'common.delete')!;
      deleteAction.action(item);
      fixture.detectChanges();

      expect(page.deletingItem()).toBe(item);
      expect(page.confirmingDelete()).toBe(true);

      page.rooms.set([{ name: 'Room 1' }]);
      page.onDelete();

      expect(sync.deleteWithChildren).toHaveBeenCalledTimes(1);
      const request = sync.deleteWithChildren.mock.calls[0][0];
      expect(request.parentPath).toBe('properties');
      expect(request.childPath).toBe('rooms');
      expect(request.parentAspectIri).toBe(PROPERTY_OPERATION_IRI);
      expect(request.childAspectIri).toBe(ROOM_OPERATION_IRI);
    });

    it('opens the edit mode from a row action', () => {
      mount();
      const item = { iri: 'https://example.test/properties/1', name: 'Haus A' };

      page.rowActions.find((a) => a.label === 'common.edit')!.action(item);
      fixture.detectChanges();

      expect(page.mode()).toBe('edit');
      expect(page.editingItem()).toEqual(item);
    });
  });

  describe('deep links from the rentals page', () => {
    it('opens the create mode for ?mode=create', async () => {
      queryParams.next({ mode: 'create' });
      mount();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(page.mode()).toBe('create');
    });

    it('opens the linked property, and the linked room inside it, for ?mode=edit', async () => {
      const item = { iri: 'https://example.test/properties/1', name: 'Haus A' };
      http.queryResult.next({ items: [item], totalCount: 1 } as never);

      mount();
      await fixture.whenStable();

      queryParams.next({
        mode: 'edit',
        iri: 'https://example.test/properties/1',
        room: 'https://example.test/rooms/9',
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(page.mode()).toBe('edit');
      expect(page.editingItem()).toEqual(item);
    });

    it('ignores a deep link that names a property the list does not carry', async () => {
      mount();
      await fixture.whenStable();

      queryParams.next({ mode: 'edit', iri: 'https://example.test/properties/404' });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(page.mode()).toBe('list');
    });
  });

  describe('the mobile create wizard', () => {
    /** The wizard's two forms are view children; their verdict is what gates a step. */
    const detailsForm = (passed: boolean): void => {
      vi.spyOn(page, 'mobileDetailsForm').mockReturnValue({ save: async () => passed } as never);
    };
    const roomForm = (passed: boolean): void => {
      vi.spyOn(page, 'mobileRoomForm').mockReturnValue({ save: async () => passed } as never);
    };

    it('advances to review only when the details form passed', async () => {
      mount();
      page.enterCreate();

      detailsForm(false);
      await page.savePropertyToReview();
      expect(page.createStep()).toBe('details');

      detailsForm(true);
      await page.savePropertyToReview();
      expect(page.createStep()).toBe('review');
    });

    it('adds a room and opens the room step after the details passed', async () => {
      mount();
      page.enterCreate();
      detailsForm(true);

      await page.addRoomAndNext();

      expect(page.rooms()).toHaveLength(1);
      expect(page.createStep()).toBe('room');
      expect([...page.openRoomIndices()]).toContain(0);
    });

    it('stays on the details step when the form refuses', async () => {
      mount();
      page.enterCreate();
      detailsForm(false);

      await page.addRoomAndNext();

      expect(page.rooms()).toEqual([]);
      expect(page.createStep()).toBe('details');
    });

    it('appends another room from the room step', async () => {
      mount();
      page.enterCreate();
      detailsForm(true);
      roomForm(true);

      await page.addRoomAndNext();
      await page.nextRoom();

      expect(page.rooms()).toHaveLength(2);
    });

    it('goes to review from the room step, and back to the details', async () => {
      mount();
      page.enterCreate();
      roomForm(true);

      await page.finishToReview();
      expect(page.createStep()).toBe('review');

      page.backToDetails();
      expect(page.createStep()).toBe('details');
    });

    it('does not leave the room step while the room form refuses', async () => {
      mount();
      page.enterCreate();
      page.createStep.set('room');
      roomForm(false);

      await page.finishToReview();

      expect(page.createStep()).toBe('room');
    });

    it('adds a room inline on the review step and expands it', () => {
      mount();
      page.enterCreate();
      page.createStep.set('review');

      page.addRoomInline();

      expect(page.rooms()).toHaveLength(1);
      expect([...page.openRoomIndices()]).toContain(0);
    });

    it('validates the whole draft — property AND rooms — before the final save', async () => {
      validator.validate.mockResolvedValue([
        { jsonPath: 'name', message: 'Name is required', kind: 'minCount' } as never,
      ]);
      mount();
      page.enterCreate();
      page.pendingProperty.set({ name: '' });
      page.rooms.set([{ name: 'Room 1' }]);

      await page.finalSave();

      expect(validator.validate).toHaveBeenCalledWith(
        PROPERTY_SHAPE_IRI,
        expect.objectContaining({ rooms: [{ name: 'Room 1' }] }),
      );
      expect(page.validationErrors()).toHaveLength(1);
      expect(sync.saveWithChildren).not.toHaveBeenCalled();
    });

    it('asks the room forms before the mobile review validates', async () => {
      validator.validate.mockResolvedValue([]);
      mount();
      page.enterCreate();
      page.pendingProperty.set({ name: 'Haus A' });
      const roomSave = vi.fn(async () => true);
      vi.spyOn(page, 'roomForms').mockReturnValue([{ save: roomSave }] as never);

      await page.finalSave();

      expect(roomSave).toHaveBeenCalled();
    });

    it('saves the drafted property and its rooms once the shape conforms', async () => {
      validator.validate.mockResolvedValue([]);
      mount();
      page.enterCreate();
      page.pendingProperty.set({ name: 'Haus A' });

      await page.finalSave();

      expect(sync.saveWithChildren).toHaveBeenCalledTimes(1);
      expect(page.mode()).toBe('list');
    });

    it('tells the room form which shape to validate against', () => {
      mount();
      expect(page.ROOM_SHAPE_KEY).toBe(ROOM_SHAPE_IRI);
    });
  });

  describe('the AI proposal', () => {
    it('opens the overlay and hands a create proposal to the create flow', async () => {
      mount();
      page.openAiWizard();
      fixture.detectChanges();
      expect(page.aiWizardOpen()).toBe(true);

      await page.onAiProposal({ name: 'Haus A', rooms: [{ name: 'Room 1' }] });

      expect(page.aiWizardOpen()).toBe(false);
      expect(page.mode()).toBe('create');
      expect(page.createStep()).toBe('review');
      expect(page.pendingProperty()).toEqual({ name: 'Haus A' });
      expect(page.rooms()).toEqual([{ name: 'Room 1' }]);
    });

    it('surfaces what the AI left out instead of filling it silently', async () => {
      validator.validate.mockResolvedValue([
        { jsonPath: 'address', message: 'Address is required', kind: 'minCount' } as never,
      ]);
      mount();

      await page.onAiProposal({ name: 'Haus A' });
      fixture.detectChanges();

      expect(page.aiWarnings()).toHaveLength(1);
    });

    it('merges an edit proposal onto the property the AI named', async () => {
      http.queryResult.next({
        items: [{ iri: 'https://example.test/properties/1', name: 'Haus A', address: 'Weg 1' }],
        totalCount: 1,
      } as never);
      mount();
      await fixture.whenStable();
      page.aiEditIri.set('https://example.test/properties/1');

      await page.onAiProposal({ address: 'Weg 2', rooms: [{ name: 'Room 9' }] });

      expect(page.mode()).toBe('edit');
      expect(page.editingItem()).toMatchObject({ name: 'Haus A', address: 'Weg 2' });
      expect(page.rooms()).toEqual([{ name: 'Room 9' }]);
      expect(page.aiEditIri()).toBeNull();
    });

    it('falls back to a create when the property the AI named is gone', async () => {
      mount();
      page.aiEditIri.set('https://example.test/properties/gone');

      await page.onAiProposal({ name: 'Neu' });

      expect(page.mode()).toBe('create');
      expect(page.pendingProperty()).toEqual({ name: 'Neu' });
    });

    it('loads the existing rooms when the proposal carries none', async () => {
      http.queryResult.next({
        items: [
          {
            iri: 'https://example.test/properties/1',
            name: 'Haus A',
            // The parent's inverse field is present and non-empty here ON PURPOSE: the page must
            // read the rooms through their own predicate anyway, because a store that does not
            // materialize the inverse reports `segmentedInto: []` for a property that has rooms.
            segmentedInto: [{ iri: 'https://example.test/rooms/4' }],
          },
        ],
        totalCount: 1,
      } as never);
      mount();
      await fixture.whenStable();
      page.aiEditIri.set('https://example.test/properties/1');

      await page.onAiProposal({ address: 'Weg 2' });
      await fixture.whenStable();

      // The rooms come from the relationship the room itself carries: `isPartOf` = this property.
      const roomQuery = http.calls.find((c) => c.method === 'query' && c.args[0] === 'rooms');
      expect(roomQuery?.args[1]).toMatchObject({
        where: { pred: 'isPartOf', op: 'eq', value: 'https://example.test/properties/1' },
      });
      expect(page.mode()).toBe('edit');
      expect(page.editingItem()).toMatchObject({ name: 'Haus A', address: 'Weg 2' });
    });

    it('reopens the wizard to finish a partial fill', () => {
      mount();

      page.reopenAiWizard();

      expect(page.aiWizardOpen()).toBe(true);
    });
  });

  describe('the model contract', () => {
    it('says in words when the definitions carry no such entity', () => {
      setupTestBed(MissingModel);

      expect(() => TestBed.createComponent(Properties)).toThrow(/carry no 'property' entity/);
    });
  });
});
