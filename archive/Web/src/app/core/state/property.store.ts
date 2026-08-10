import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api';
import type {
  Property,
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from '../api';

/**
 * Property state service — dead simple.
 * - loadAll() fetches the full list from the backend.
 * - create/update/delete call the backend, wait, then reload the list.
 * - A `saving` signal drives a loading spinner during writes.
 */
@Injectable({ providedIn: 'root' })
export class PropertyService {
  private readonly api = inject(ApiService);
  private readonly entityPath = 'properties';

  readonly properties = signal<Property[]>([]);
  readonly loading = signal(false);   // true during loadAll
  readonly saving = signal(false);    // true during create/update/delete
  readonly error = signal<string | null>(null);

  // ── Load ───────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list<Property>(this.entityPath).subscribe({
      next: (res) => {
        this.properties.set(res.items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load properties');
        this.loading.set(false);
      },
    });
  }

  // ── Write (wait → reload) ──────────────────────────────────────────────────

  create(payload: CreatePropertyPayload): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.create<Property>(this.entityPath, payload).subscribe({
      next: () => {
        this.loadAll(); // reload fresh list from backend
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to create property');
        this.saving.set(false);
      },
    });
  }

  /** Create property and invoke callback with the created entity's IRI. */
  createAndReturn(payload: CreatePropertyPayload, onCreated: (iri: string) => void): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.create<Property>(this.entityPath, payload).subscribe({
      next: (created) => {
        this.properties.update(list => [created, ...list]);
        onCreated(created.iri);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to create property');
        this.saving.set(false);
      },
    });
  }

  update(id: string, payload: UpdatePropertyPayload): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.update<Property>(this.entityPath, id, payload).subscribe({
      next: () => {
        this.loadAll();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to update property');
        this.saving.set(false);
      },
    });
  }

  delete(id: string): void {
    this.saving.set(true);
    this.error.set(null);
    this.api.delete(this.entityPath, id).subscribe({
      next: () => {
        this.loadAll();
        this.saving.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to delete property');
        this.saving.set(false);
      },
    });
  }
}
