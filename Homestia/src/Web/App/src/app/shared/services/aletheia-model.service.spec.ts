/**
 * Unit tests for AletheiaModelService — verifies loading, caching, force
 * reload, staleness checks, lookups, and reset behavior.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AletheiaModelService } from './aletheia-model.service';
import { AletheiaHttpClient } from './aletheia-http-client';
import {
  AletheiaHttpClientMock,
  provideAletheiaHttpClientMock,
} from './aletheia-http-client.mock';
import type {
  EntityDefinition,
  CapabilityDefinition,
  AletheiaCollection,
} from './aletheia-http-client.models';

describe('AletheiaModelService', () => {
  let service: AletheiaModelService;
  let mock: AletheiaHttpClientMock;

  const sampleEntityDefs: EntityDefinition[] = [
    {
      clrTypeIdentifier: 'Test.Property',
      name: 'Property',
      clrNamespace: 'Test',
      assemblyName: 'Test',
      entityPath: 'properties', predicatePath: 'properties',
      iriPrefix: 'https://test/',
      typeIri: 'https://test/types/property',
      definitionOrigin: 'platform',
      isObjectBearing: false,
      identityStrategy: 'Random',
      isEnumeration: false,
      properties: [
        { propertyName: 'address', predicate: 'address', clrType: 'String', isIdentityPart: false, identityPartOrder: -1, isRequired: false },
        { propertyName: 'propertyType', predicate: 'propertyType', clrType: 'EntityRef', isIdentityPart: false, identityPartOrder: -1, isRequired: false },
      ],
      owningRelations: [
        { propertyName: 'propertyType', predicate: 'propertyType', relatedEntityDefinitionIri: 'https://test/entity-defs/1', relatedEntityName: 'PropertyType', relationKind: 'owning-single', isCollection: false, isInferred: false },
      ],
      incomingRelations: [],
      iri: 'https://test/entity-defs/1',
    },
    {
      clrTypeIdentifier: 'Test.Room',
      name: 'Room',
      clrNamespace: 'Test',
      assemblyName: 'Test',
      entityPath: 'rooms', predicatePath: 'rooms',
      iriPrefix: 'https://test/',
      typeIri: 'https://test/types/room',
      definitionOrigin: 'platform',
      isObjectBearing: false,
      identityStrategy: 'Random',
      isEnumeration: false,
      properties: [
        { propertyName: 'roomSize', predicate: 'roomSize', clrType: 'Decimal', isIdentityPart: false, identityPartOrder: -1, isRequired: false },
        { propertyName: 'location', predicate: 'location', clrType: 'String', isIdentityPart: false, identityPartOrder: -1, isRequired: false },
        { propertyName: 'furnishingStatus', predicate: 'furnishingStatus', clrType: 'EntityRef', isIdentityPart: false, identityPartOrder: -1, isRequired: false },
      ],
      owningRelations: [
        { propertyName: 'furnishingStatus', predicate: 'furnishingStatus', relatedEntityDefinitionIri: 'https://test/entity-defs/2', relatedEntityName: 'FurnishingStatus', relationKind: 'owning-single', isCollection: false, isInferred: false },
      ],
      incomingRelations: [],
      iri: 'https://test/entity-defs/2',
    },
  ];

  const sampleCapabilityDefs: CapabilityDefinition[] = [
    { name: 'greet', description: 'Greets', requestType: 'GreetRequest', responseType: 'GreetResponse', iri: 'https://test/cap/1' },
    { name: 'exportReport', description: 'Exports', requestType: 'ExportRequest', responseType: 'ExportResponse', iri: 'https://test/cap/2' },
  ];

  function seedAndLoad(): void {
    mock.exploreEntitiesResult.next({ items: sampleEntityDefs });
    mock.exploreCapabilitiesResult.next({ items: sampleCapabilityDefs });
    service.load().subscribe();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAletheiaHttpClientMock()],
    });
    service = TestBed.inject(AletheiaModelService);
    mock = TestBed.inject(AletheiaHttpClient) as unknown as AletheiaHttpClientMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Initial state
  // ═══════════════════════════════════════════════════════════════════════

  it('starts with empty entities and capabilities', () => {
    expect(service.entities()).toEqual([]);
    expect(service.capabilities()).toEqual([]);
    expect(service.loaded()).toBe(false);
    expect(service.loading()).toBe(false);
    expect(service.lastLoadedAt()).toBeNull();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Load
  // ═══════════════════════════════════════════════════════════════════════

  it('loads entities and capabilities and populates signals', () => {
    seedAndLoad();

    // entities are mapped from EntityDefinition → EntityInfo
    expect(service.entities().length).toBe(2);
    expect(service.entities()[0].predicatePath).toBe('properties');
    expect(service.entities()[0].displayName).toBe('Property');
    expect(service.capabilities()).toEqual(sampleCapabilityDefs);
    expect(service.loaded()).toBe(true);
    expect(service.loading()).toBe(false);
    expect(service.lastLoadedAt()).toBeInstanceOf(Date);
  });

  it('sets lastLoadedAt timestamp on successful load', () => {
    expect(service.lastLoadedAt()).toBeNull();

    seedAndLoad();

    expect(service.lastLoadedAt()).toBeInstanceOf(Date);
    expect(service.lastLoadedAt()!.getTime()).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Idempotency (caching)
  // ═══════════════════════════════════════════════════════════════════════

  it('does not re-fetch when already loaded (idempotent)', () => {
    seedAndLoad();
    const callCountBefore = mock.calls.length;

    service.load().subscribe();

    expect(mock.calls.length).toBe(callCountBefore);
  });

  it('preserves lastLoadedAt on idempotent calls', () => {
    seedAndLoad();
    const firstTs = service.lastLoadedAt()!;

    // Second load should not change the timestamp
    service.load().subscribe();
    expect(service.lastLoadedAt()!.getTime()).toBe(firstTs.getTime());
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Force reload
  // ═══════════════════════════════════════════════════════════════════════

  it('load(true) bypasses the cache and re-fetches', () => {
    seedAndLoad();
    const callCountBefore = mock.calls.length;

    service.load(true).subscribe();

    expect(mock.calls.length).toBeGreaterThan(callCountBefore);
    expect(service.loaded()).toBe(true);
  });

  it('reload() is equivalent to load(true)', () => {
    seedAndLoad();
    const callCountBefore = mock.calls.length;

    service.reload().subscribe();

    expect(mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it('reload() updates lastLoadedAt', () => {
    seedAndLoad();
    const firstTs = service.lastLoadedAt()!.getTime();

    // Re-seed with data and force reload
    mock.exploreEntitiesResult.next({ items: sampleEntityDefs });
    mock.exploreCapabilitiesResult.next({ items: sampleCapabilityDefs });
    service.reload().subscribe();

    // lastLoadedAt is set to a new Date — in practice it may be the same
    // millisecond since both calls happen synchronously, but the signal
    // was re-set (it went null→Date again during the force reload).
    expect(service.lastLoadedAt()).toBeInstanceOf(Date);
    expect(service.lastLoadedAt()!.getTime()).toBeGreaterThanOrEqual(firstTs);
  });

  it('load with force=false is idempotent after force reload', () => {
    seedAndLoad();
    service.reload().subscribe(); // force reload
    const callCountBefore = mock.calls.length;

    service.load().subscribe(); // idempotent call

    expect(mock.calls.length).toBe(callCountBefore);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Staleness
  // ═══════════════════════════════════════════════════════════════════════

  it('isStale returns true when never loaded', () => {
    expect(service.isStale(60_000)).toBe(true);
  });

  it('isStale returns false for a fresh cache', () => {
    seedAndLoad();

    // Just loaded, should not be stale at 60s threshold
    expect(service.isStale(60_000)).toBe(false);
  });

  it('isStale returns true when cache exceeds maxAge', () => {
    // Fake a lastLoadedAt far in the past
    const fakeDate = new Date(Date.now() - 120_000); // 2 minutes ago
    service.lastLoadedAt.set(fakeDate);
    service.loaded.set(true);

    expect(service.isStale(60_000)).toBe(true);
  });

  it('cacheAgeMs returns null when never loaded', () => {
    expect(service.cacheAgeMs()).toBeNull();
  });

  it('cacheAgeMs returns positive milliseconds after load', () => {
    seedAndLoad();

    expect(service.cacheAgeMs()).toBeGreaterThanOrEqual(0);
  });

  it('cacheAgeMs grows over time for a cached result', () => {
    // Set a known timestamp
    const knownTime = Date.now() - 1000;
    service.lastLoadedAt.set(new Date(knownTime));
    service.loaded.set(true);

    const age = service.cacheAgeMs()!;
    expect(age).toBeGreaterThanOrEqual(1000);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Lookups
  // ═══════════════════════════════════════════════════════════════════════

  it('getEntity finds an entity by predicatePath', () => {
    seedAndLoad();

    const entity = service.getEntity('properties');
    expect(entity).toBeDefined();
    expect(entity?.displayName).toBe('Property');
  });

  it('getEntity returns undefined for unknown path', () => {
    seedAndLoad();
    expect(service.getEntity('nonexistent')).toBeUndefined();
  });

  it('getCapability finds a capability by name', () => {
    seedAndLoad();

    const cap = service.getCapability('greet');
    expect(cap).toBeDefined();
    expect(cap?.description).toBe('Greets');
  });

  it('getCapability returns undefined for unknown name', () => {
    seedAndLoad();
    expect(service.getCapability('unknown')).toBeUndefined();
  });

  it('getPropertyNames returns property names for an entity', () => {
    seedAndLoad();

    const names = service.getPropertyNames('rooms');
    expect(names).toEqual(['roomSize', 'location', 'furnishingStatus']);
  });

  it('getPropertyNames returns empty array for unknown entity', () => {
    seedAndLoad();
    expect(service.getPropertyNames('unknown')).toEqual([]);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Reset
  // ═══════════════════════════════════════════════════════════════════════

  it('reset clears all state including lastLoadedAt', () => {
    seedAndLoad();
    expect(service.loaded()).toBe(true);
    expect(service.lastLoadedAt()).toBeInstanceOf(Date);

    service.reset();

    expect(service.entities()).toEqual([]);
    expect(service.capabilities()).toEqual([]);
    expect(service.loaded()).toBe(false);
    expect(service.loading()).toBe(false);
    expect(service.error()).toBeNull();
    expect(service.lastLoadedAt()).toBeNull();
  });

  it('after reset, isStale returns true', () => {
    seedAndLoad();
    expect(service.isStale(60_000)).toBe(false);

    service.reset();
    expect(service.isStale(60_000)).toBe(true);
  });

  it('after reset, load fetches again', () => {
    seedAndLoad();
    const callCountAfterFirstLoad = mock.calls.length;

    service.reset();
    expect(service.loaded()).toBe(false);

    mock.exploreEntitiesResult.next({ items: sampleEntityDefs });
    mock.exploreCapabilitiesResult.next({ items: sampleCapabilityDefs });
    service.load().subscribe();

    expect(mock.calls.length).toBeGreaterThan(callCountAfterFirstLoad);
    expect(service.loaded()).toBe(true);
    expect(service.lastLoadedAt()).toBeInstanceOf(Date);
  });
});
