import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of, switchMap, map } from 'rxjs';
import { AletheiaHttpClient } from './aletheia-http-client';

/**
 * Options for saveWithChildren.
 */
export interface SaveWithChildrenOptions {
  /** API path of the parent entity (e.g. 'properties'). */
  parentPath: string;
  /** Parent form data (without child IRIs — the service strips them). */
  parentData: Record<string, unknown>;
  /** API path of the child entity (e.g. 'rooms'). */
  childPath: string;
  /** The field on the child that holds the parent IRI (e.g. 'isPartOf'). */
  childParentField: string;
  /** Current child entities. Those without an 'iri' key are treated as new. */
  children: Record<string, unknown>[];
  /** For edit: the parent's IRI. Omit for create. */
  parentIRI?: string;
  /** Original children (before edit) — used to detect deletions. Omit for create. */
  originalChildren?: Record<string, unknown>[];
}

/**
 * Options for deleteWithChildren.
 */
export interface DeleteWithChildrenOptions {
  /** API path of the parent entity. */
  parentPath: string;
  /** Parent IRI to delete. */
  parentIRI: string;
  /** API path of the child entity. */
  childPath: string;
  /** Current children (must have 'iri' fields). */
  children: Record<string, unknown>[];
}

/**
 * EntitySyncService — orchestrates save/delete of parent entities with
 * automatic child syncing (create, update, delete of children).
 */
@Injectable({ providedIn: 'root' })
export class EntitySyncService {
  private readonly http = inject(AletheiaHttpClient);

  /**
   * Saves a parent entity and syncs its children.
   *
   * Create (no parentIRI):  POST parent → POST each child with parent IRI
   * Edit (has parentIRI):   PUT parent → DELETE removed, PUT modified, POST new
   *
   * @returns Observable emitting the parent IRI.
   */
  saveWithChildren(opts: SaveWithChildrenOptions): Observable<string> {
    const { parentPath, parentData, childPath, childParentField, children, parentIRI, originalChildren } = opts;

    if (!parentIRI) {
      // ── CREATE ──────────────────────────────────────────────────────────
      return this.http.create(parentPath, parentData).pipe(
        switchMap((res) => {
          const iri = res.iri;
          const childTasks = children.map((child) => {
            const data = this.stripReadonly(child);
            data[childParentField] = iri;
            return this.http.create(childPath, data);
          });
          if (childTasks.length === 0) return of(iri);
          return forkJoin(childTasks).pipe(map(() => iri));
        }),
      );
    }

    // ── EDIT ──────────────────────────────────────────────────────────────
    return this.http.update(parentPath, parentIRI, parentData).pipe(
      switchMap(() => this.syncChildren(childPath, childParentField, parentIRI, children, originalChildren ?? [])),
      map(() => parentIRI),
    );
  }

  /**
   * Deletes a parent and all its children.
   *
   * Children are deleted first (in parallel), then the parent.
   */
  deleteWithChildren(opts: DeleteWithChildrenOptions): Observable<void> {
    const { parentPath, parentIRI, childPath, children } = opts;

    const childDeletes = children
      .filter((c) => c['iri'])
      .map((c) => this.http.delete(childPath, c['iri'] as string));

    const childDelete$ = childDeletes.length > 0
      ? forkJoin(childDeletes).pipe(map(() => undefined))
      : of(undefined);

    return childDelete$.pipe(
      switchMap(() => this.http.delete(parentPath, parentIRI)),
    );
  }

  // ── Helpers ────────────────────────────────────────────────────────────

  /**
   * Sync children: DELETE removed, PUT modified, POST new.
   */
  private syncChildren(
    childPath: string,
    childParentField: string,
    parentIRI: string,
    current: Record<string, unknown>[],
    original: Record<string, unknown>[],
  ): Observable<void> {
    const originalIris = new Set(original.map((c) => c['iri'] as string).filter(Boolean));
    const currentIris = new Set(current.map((c) => c['iri'] as string).filter(Boolean));

    // Children to delete (were in original but not in current)
    const toDelete: string[] = [];
    for (const iri of originalIris) {
      if (!currentIris.has(iri)) toDelete.push(iri);
    }

    const tasks: Observable<unknown>[] = [];

    // Delete removed children
    for (const iri of toDelete) {
      tasks.push(this.http.delete(childPath, iri));
    }

    // Update or create
    for (const child of current) {
      const data = this.stripReadonly(child);
      data[childParentField] = parentIRI;

      if (child['iri']) {
        // Update existing
        tasks.push(this.http.update(childPath, child['iri'] as string, data));
      } else {
        // Create new
        tasks.push(this.http.create(childPath, data));
      }
    }

    if (tasks.length === 0) return of(undefined);
    return forkJoin(tasks).pipe(map(() => undefined));
  }

  /** Remove read-only fields (iri, @id) before sending to API. */
  private stripReadonly(data: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'iri' || key === '@id') continue;
      // Normalize EntityRef objects to their IRI string
      if (typeof value === 'object' && value !== null && 'iri' in value) {
        cleaned[key] = (value as { iri: string }).iri;
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  }
}
