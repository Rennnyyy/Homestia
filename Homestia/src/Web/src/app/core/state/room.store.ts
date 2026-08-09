import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../api';
import type { Room, CreateRoomPayload, UpdateRoomPayload } from '../api';

/**
 * Room state service.
 *
 * Follows ADR 004: plain @Injectable() exposing signal() for shared state.
 */
@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly api = inject(ApiService);
  private readonly entityPath = 'rooms';

  // ── Signals ────────────────────────────────────────────────────────────────

  readonly rooms = signal<Room[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // ── CRUD ───────────────────────────────────────────────────────────────────

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.list<Room>(this.entityPath).subscribe({
      next: (res) => {
        this.rooms.set(res.items);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to load rooms');
        this.loading.set(false);
      },
    });
  }

  create(payload: CreateRoomPayload, onCreated?: (iri: string) => void): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.create<Room>(this.entityPath, payload).subscribe({
      next: (created) => {
        this.rooms.update(list => [...list, created]);
        this.loading.set(false);
        onCreated?.(created.iri);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to create room');
        this.loading.set(false);
      },
    });
  }

  /** Create a room and return a Promise that resolves when the HTTP call completes. */
  async createAsync(payload: CreateRoomPayload): Promise<Room> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const created = await firstValueFrom(this.api.create<Room>(this.entityPath, payload));
      this.rooms.update(list => [...list, created]);
      return created;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create room';
      this.error.set(msg);
      throw err;
    } finally {
      this.loading.set(false);
    }
  }

  update(id: string, payload: UpdateRoomPayload): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.update<Room>(this.entityPath, id, payload).subscribe({
      next: (updated) => {
        this.rooms.update(list =>
          list.map(r => (r.iri === id ? updated : r))
        );
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to update room');
        this.loading.set(false);
      },
    });
  }

  delete(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.delete(this.entityPath, id).subscribe({
      next: () => {
        this.rooms.update(list => list.filter(r => r.iri !== id));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message ?? 'Failed to delete room');
        this.loading.set(false);
      },
    });
  }

  /** Load rooms filtered by parent property IRI. Returns a Promise for component orchestration. */
  async loadByProperty(propertyIri: string): Promise<Room[]> {
    try {
      const res = await firstValueFrom(
        this.api.list<Room>(this.entityPath, { isPartOf: propertyIri }),
      );
      return res.items;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load rooms for property';
      this.error.set(msg);
      return [];
    }
  }

  /** Fetch a single room by its IRI. Returns null on failure. */
  async getByIri(iri: string): Promise<Room | null> {
    try {
      return await firstValueFrom(this.api.get<Room>(this.entityPath, iri));
    } catch {
      return null;
    }
  }

  /** Delete a room and return a Promise (for sequential orchestration). */
  async deleteAsync(id: string): Promise<void> {
    try {
      await firstValueFrom(this.api.delete(this.entityPath, id));
      this.rooms.update(list => list.filter(r => r.iri !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete room';
      this.error.set(msg);
      throw err;
    }
  }

  /** Update a room and return a Promise that resolves with the updated entity. */
  async updateAsync(id: string, payload: UpdateRoomPayload): Promise<Room> {
    try {
      const updated = await firstValueFrom(this.api.update<Room>(this.entityPath, id, payload));
      this.rooms.update(list => list.map(r => (r.iri === id ? updated : r)));
      return updated;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update room';
      this.error.set(msg);
      throw err;
    }
  }
}
