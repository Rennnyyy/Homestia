import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../api';
import type { InventoryItem, CreateInventoryItemPayload, UpdateInventoryItemPayload } from '../api';

/**
 * InventoryItem state service.
 *
 * Follows ADR 004: plain @Injectable() exposing signal() for shared state.
 */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiService);
  private readonly entityPath = 'inventory-items';

  // ── Signals ────────────────────────────────────────────────────────────────

  readonly items = signal<InventoryItem[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list<InventoryItem>(this.entityPath).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load inventory items');
        this.loading.set(false);
      },
    });
  }

  create(payload: CreateInventoryItemPayload): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.create<InventoryItem>(this.entityPath, payload).subscribe({
      next: (created) => {
        this.items.update(list => [...list, created]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to create inventory item');
        this.loading.set(false);
      },
    });
  }

  update(id: string, payload: UpdateInventoryItemPayload): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.update<InventoryItem>(this.entityPath, id, payload).subscribe({
      next: (updated) => {
        this.items.update(list =>
          list.map(i => (i.iri === id ? updated : i))
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to update inventory item');
        this.loading.set(false);
      },
    });
  }

  delete(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.delete(this.entityPath, id).subscribe({
      next: () => {
        this.items.update(list => list.filter(i => i.iri !== id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to delete inventory item');
        this.loading.set(false);
      },
    });
  }
}
