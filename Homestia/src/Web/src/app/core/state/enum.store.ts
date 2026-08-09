import { Injectable, inject, signal } from '@angular/core';
import { ApiService, entityRefId, type EntityRef, type PropertyType, type RentalModel, type FurnishingStatus, type RoomStatus } from '../api';
import type { AletheiaEntity } from '../api';

/**
 * Enumeration service — loads all fixed-list entity types from the backend
 * and exposes them as signals. Components use this instead of hardcoded option lists.
 *
 * Follows ADR 004: plain @Injectable() exposing signals.
 */
@Injectable({ providedIn: 'root' })
export class EnumService {
  private readonly api = inject(ApiService);

  readonly propertyTypes = signal<PropertyType[]>([]);
  readonly rentalModels = signal<RentalModel[]>([]);
  readonly furnishingStatuses = signal<FurnishingStatus[]>([]);
  readonly roomStatuses = signal<RoomStatus[]>([]);
  readonly loading = signal(false);
  readonly loaded = signal(false);

  /** Load all enumerations from the backend. Idempotent — skips if already loaded. */
  loadAll(): void {
    if (this.loaded()) return;
    this.loading.set(true);

    this.api.list<PropertyType>('property-types').subscribe({
      next: (res) => this.propertyTypes.set(res.items),
      error: () => {} /* mock interceptor handles this in dev */,
    });
    this.api.list<RentalModel>('rental-models').subscribe({
      next: (res) => this.rentalModels.set(res.items),
      error: () => {},
    });
    this.api.list<FurnishingStatus>('furnishing-statuses').subscribe({
      next: (res) => this.furnishingStatuses.set(res.items),
      error: () => {},
    });
    this.api.list<RoomStatus>('room-statuses').subscribe({
      next: (res) => {
        this.roomStatuses.set(res.items);
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: () => {
        this.loading.set(false);
        this.loaded.set(true); // mark loaded even on error to avoid infinite retry
      },
    });
  }

  // ── Display helpers ────────────────────────────────────────────────────────

  /** Get the display name for an enum value by its key. */
  displayName(collection: AletheiaEntity[], key: string): string {
    const found = collection.find(e => (e as unknown as Record<string, string>)['key'] === key);
    return (found as unknown as Record<string, string> | undefined)?.['displayName'] ?? `Unknown value (${key})`;
  }

  /** Resolve an EntityRef to its display name. */
  refDisplayName(ref: EntityRef<AletheiaEntity>, collection: AletheiaEntity[]): string {
    const id = entityRefId(ref);
    return this.displayName(collection, id);
  }

  /** Build i18n-friendly select options from an enum collection. */
  toSelectOptions(collection: AletheiaEntity[]): { value: string; labelKey: string }[] {
    return collection.map(e => {
      const id = e.iri;
      const display = (e as unknown as Record<string, string>)['displayName'] ?? `Unknown value (${id})`;
      return { value: id, labelKey: display };
    });
  }

  private readonly baseIri = 'https://www.aletheia.arkenforge.de';

  /** Find the IRI of an enum by its key. Falls back to constructing the IRI from the base path. */
  iriByKey(collection: AletheiaEntity[], key: string, fallbackPath?: string): string {
    const found = collection.find(e => (e as unknown as Record<string, string>)['key'] === key);
    if (found?.iri) return found.iri;
    // Fallback: build IRI from known base path
    if (fallbackPath && key) return `${this.baseIri}/${fallbackPath}/${key}`;
    return key;
  }
}
