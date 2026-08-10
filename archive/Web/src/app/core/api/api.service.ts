import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { AletheiaEntity, EntityListResponse } from './models';

/**
 * Thin HTTP wrapper for the Aletheia entity REST API.
 *
 * All Aletheia CRUD lives under /api/entities/{entityPath}.
 * This service provides typed GET/POST/PUT/DELETE helpers.
 *
 * Per ADR 004: HTTP calls are not embedded in state services —
 * state services call this layer and update signals.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/entities';

  // ── Read ──────────────────────────────────────────────────────────────────

  /** List all entities of a given type. */
  list<T extends AletheiaEntity>(entityPath: string, params?: Record<string, string>): Observable<EntityListResponse<T>> {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        httpParams = httpParams.set(key, value);
      }
    }
    return this.http.get<EntityListResponse<T>>(`${this.base}/${entityPath}`, { params: httpParams });
  }

  /** Get a single entity by its IRI. */
  get<T extends AletheiaEntity>(entityPath: string, iri: string): Observable<T> {
    return this.http.get<T>(`${this.base}/${entityPath}`, { params: { iri } });
  }

  // ── Write ─────────────────────────────────────────────────────────────────

  /** Create a new entity. */
  create<T extends AletheiaEntity>(entityPath: string, payload: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}/${entityPath}`, payload);
  }

  /** Update an existing entity identified by its IRI. */
  update<T extends AletheiaEntity>(entityPath: string, iri: string, payload: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}/${entityPath}`, payload, { params: { iri } });
  }

  /** Delete an entity identified by its IRI. */
  delete(entityPath: string, iri: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${entityPath}`, { params: { iri } });
  }
}
