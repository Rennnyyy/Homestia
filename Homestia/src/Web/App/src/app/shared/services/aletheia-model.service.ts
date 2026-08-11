import { Injectable, inject, signal } from '@angular/core';
import { Observable, of, switchMap, tap, catchError, map } from 'rxjs';
import { AletheiaHttpClient } from './aletheia-http-client';
import type {
  EntityDefinition,
  EntityPropertyDefinition,
  EntityRelationDefinition,
  CapabilityDefinition,
  EntityInfo,
  EntityPropertyInfo,
} from './aletheia-http-client.models';

// Re-export the simplified types for consumers.
export type { EntityInfo, EntityPropertyInfo, CapabilityDefinition };

/**
 * Map a raw EntityDefinition from the SDK to the simplified EntityInfo
 * used by the dynamic form. Owning relations with isCollection=true are
 * treated as collection properties.
 *
 * @param def The raw entity definition.
 * @param entityPathByName Optional map from entity name to entity path,
 *                         used to resolve targetEntityPath for EntityRef properties.
 */
function toEntityInfo(def: EntityDefinition, entityPathByName?: Map<string, string>): EntityInfo {
  const relationMap = new Map<string, EntityRelationDefinition>();
  for (const r of def.owningRelations) {
    relationMap.set(r.propertyName, r);
  }

  const properties: EntityPropertyInfo[] = def.properties.map((p) => {
    const rel = relationMap.get(p.propertyName);
    const prop: EntityPropertyInfo = {
      name: p.propertyName,
      type: p.clrType,
      isCollection: rel?.isCollection ?? false,
    };
    if (rel && entityPathByName) {
      prop.targetEntityPath = entityPathByName.get(rel.relatedEntityName);
    }
    return prop;
  });

  // Add owning relations that don't have a corresponding scalar property
  // (e.g. segmentedInto which is an inverse relation from the parent entity).
  // Actually, for the dynamic form, we need ALL fields that can be set.
  // Owning relations appear both in properties AND owningRelations.
  // But some relations only appear in owningRelations without a matching
  // scalar property. Let's add those too.
  for (const r of def.owningRelations) {
    if (!def.properties.some((p) => p.propertyName === r.propertyName)) {
      const prop: EntityPropertyInfo = {
        name: r.propertyName,
        type: 'EntityRef',
        isCollection: r.isCollection,
      };
      if (entityPathByName) {
        prop.targetEntityPath = entityPathByName.get(r.relatedEntityName);
      }
      properties.push(prop);
    }
  }

  // Also add identity properties that may be hidden
  return {
    entityPath: def.entityPath,
    predicatePath: def.predicatePath,
    displayName: def.name,
    properties,
  };
}

/**
 * AletheiaModelService — loads, caches, and provides typed access to the
 * Aletheia backend's entity and capability definitions.
 *
 * Definitions describe the shape of the domain: which entities exist, what
 * properties they carry, and which capabilities are available. They are
 * treated as immutable at runtime but can be force-reloaded when the backend
 * schema changes (e.g. after a deploy or branch switch).
 *
 * Caching:
 *   load() is idempotent — once loaded, subsequent calls are no-ops.
 *   Use reload() or load(true) to bypass the cache and re-fetch.
 *   Use isStale(ms) to check if the cache is older than a given threshold.
 *
 * Usage:
 *   readonly model = inject(AletheiaModelService);
 *   this.model.load().subscribe(() => {
 *     const prop = this.model.getEntity('properties');
 *     console.log(prop?.properties.map(p => p.name));
 *   });
 *
 *   // Force reload after a deploy:
 *   this.model.reload().subscribe();
 *
 *   // Stale-while-revalidate pattern:
 *   if (this.model.isStale(60_000)) this.model.reload().subscribe();
 */
@Injectable({ providedIn: 'root' })
export class AletheiaModelService {
  private readonly aletheia = inject(AletheiaHttpClient);

  // ── Reactive state ─────────────────────────────────────────────────────

  readonly entities = signal<EntityInfo[]>([]);
  readonly capabilities = signal<CapabilityDefinition[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);

  /** Timestamp of the last successful load. Null if never loaded. */
  readonly lastLoadedAt = signal<Date | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────

  /**
   * Fetch entity and capability definitions from the backend.
   *
   * @param force If true, bypasses the cache and re-fetches even if already
   *              loaded. Default is false (idempotent).
   * @returns An Observable that completes when both definitions are loaded.
   */
  load(force = false): Observable<void> {
    if (this.loaded() && !force) {
      return of(undefined);
    }

    if (force) {
      this.reset();
    }

    this.loading.set(true);
    this.error.set(null);

    return this.aletheia.exploreEntities().pipe(
      tap((res) => {
        const definitions = res.items ?? [];
        // Build name → entityPath lookup for resolving EntityRef targets
        const entityPathByName = new Map<string, string>();
        for (const d of definitions) {
          entityPathByName.set(d.name, d.entityPath);
        }
        this.entities.set(definitions.map((d) => toEntityInfo(d, entityPathByName)));
      }),
      switchMap(() => this.aletheia.exploreCapabilities()),
      tap((res) => {
        this.capabilities.set(res.items ?? []);
        this.loaded.set(true);
        this.loading.set(false);
        this.lastLoadedAt.set(new Date());
      }),
      map(() => undefined),
      catchError((err) => {
        this.error.set(err?.message ?? 'Failed to load model definitions');
        this.loading.set(false);
        return of(undefined);
      }),
    );
  }

  /**
   * Force-reload definitions, bypassing the cache.
   * Equivalent to `load(true)`.
   */
  reload(): Observable<void> {
    return this.load(true);
  }

  // ── Cache helpers ──────────────────────────────────────────────────────

  /**
   * Returns true if the cache has never been loaded or is older than maxAgeMs.
   * Useful for stale-while-revalidate patterns.
   *
   * @param maxAgeMs Maximum cache age in milliseconds.
   */
  isStale(maxAgeMs: number): boolean {
    const ts = this.lastLoadedAt();
    if (!ts) return true;
    return Date.now() - ts.getTime() > maxAgeMs;
  }

  /** Age of the cache in milliseconds, or null if never loaded. */
  cacheAgeMs(): number | null {
    const ts = this.lastLoadedAt();
    if (!ts) return null;
    return Date.now() - ts.getTime();
  }

  // ── Lookup helpers ─────────────────────────────────────────────────────

  /** Find an entity definition by its predicate path (e.g. "properties"). */
  getEntity(predicatePath: string): EntityInfo | undefined {
    return this.entities().find((e) => e.predicatePath === predicatePath);
  }

  /** Find a capability definition by its name (e.g. "greet"). */
  getCapability(name: string): CapabilityDefinition | undefined {
    return this.capabilities().find((c) => c.name === name);
  }

  /**
   * Get the property names for an entity — useful for generating table columns
   * or form fields dynamically.
   */
  getPropertyNames(predicatePath: string): string[] {
    return this.getEntity(predicatePath)?.properties.map((p) => p.name) ?? [];
  }

  // ── Reset ──────────────────────────────────────────────────────────────

  /** Clear all cached state. The next load() call will re-fetch. */
  reset(): void {
    this.entities.set([]);
    this.capabilities.set([]);
    this.loaded.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.lastLoadedAt.set(null);
  }
}
