import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AletheiaCollection,
  AletheiaCreatedResponse,
  AletheiaUpdatedResponse,
  CapabilityResponse,
  EntityDefinition,
  CapabilityDefinition,
  AspectDefinition,
} from './aletheia-http-client.models';

/**
 * AletheiaHttpClient — the single HTTP gateway to the Aletheia SDK backend.
 *
 * Covers all endpoint families:
 *   Operations  → /api/entities/{predicatePath}     (CRUD)
 *   Capabilities → /api/capabilities/{name}          (POST command/response)
 *   Objects     → /api/objects/...                   (blob upload/download)
 *   Exploration → /api/entities, /api/capabilities, /api/aspects  (introspection)
 *
 * Usage:
 *   readonly aletheia = inject(AletheiaHttpClient);
 *   this.aletheia.list<Property>('properties').subscribe(c => ...);
 *   this.aletheia.execute<GreetRequest, GreetResponse>('greet', { name: 'A' });
 *
 * Extensibility:
 *   Aspect loading, auth token injection, and error interception are wired
 *   through the #request() pipeline — add interceptors or hooks there later.
 */
@Injectable({ providedIn: 'root' })
export class AletheiaHttpClient {
  private readonly http = inject(HttpClient);

  // ═══════════════════════════════════════════════════════════════════════
  // Operations — Entity CRUD
  // ═══════════════════════════════════════════════════════════════════════

  /** List all entities of the given predicate path. */
  list<T>(entityPath: string, params?: HttpParams, headers?: HttpHeaders): Observable<AletheiaCollection<T>> {
    return this.http.get<AletheiaCollection<T>>(
      `/api/entities/${entityPath}`,
      { params, headers },
    );
  }

  /** Get a single entity by its full IRI (e.g. https://.../segmentations/{id}). */
  get<T>(entityPath: string, iri: string): Observable<T> {
    const params = new HttpParams().set('iri', iri);
    return this.http.get<T>(`/api/entities/${entityPath}`, { params });
  }

  /**
   * Create a new entity. The backend returns just the IRI of the created entity.
   * To get the full entity, call get() with the returned IRI afterward.
   */
  create(entityPath: string, body: Record<string, unknown>): Observable<AletheiaCreatedResponse> {
    return this.http.post<AletheiaCreatedResponse>(`/api/entities/${entityPath}`, body);
  }

  /** Update an existing entity identified by its full IRI. */
  update(entityPath: string, iri: string, body: Record<string, unknown>): Observable<AletheiaUpdatedResponse> {
    const params = new HttpParams().set('iri', iri);
    return this.http.put<AletheiaUpdatedResponse>(`/api/entities/${entityPath}`, body, { params });
  }

  /** Delete an entity identified by its full IRI. */
  delete(entityPath: string, iri: string): Observable<void> {
    const params = new HttpParams().set('iri', iri);
    return this.http.delete<void>(`/api/entities/${entityPath}`, { params });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Capabilities — Command / Response
  // ═══════════════════════════════════════════════════════════════════════

  /** Execute a capability by name. POSTs the request body, returns the response. */
  execute<TRequest, TResponse = unknown>(
    capabilityName: string,
    body: TRequest,
  ): Observable<CapabilityResponse<TResponse>> {
    return this.http.post<CapabilityResponse<TResponse>>(
      `/api/capabilities/${capabilityName}`,
      body,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Objects — blob upload / download for [ObjectBearing] entities
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * Upload a file to an object-bearing entity (e.g. 'rental-documents').
   * Streams multipart/form-data to PUT /api/objects/{path}/content and
   * updates the entity's ObjectKey/ContentType atomically.
   */
  uploadObject(entityPath: string, iri: string, file: File): Observable<unknown> {
    const params = new HttpParams().set('iri', iri);
    const formData = new FormData();
    formData.append('content', file, file.name);
    return this.http.put(`/api/objects/${entityPath}/content`, formData, { params });
  }

  /** Download an object-bearing entity's binary content as a Blob. */
  downloadObject(entityPath: string, iri: string): Observable<Blob> {
    const params = new HttpParams().set('iri', iri);
    return this.http.get(`/api/objects/${entityPath}/content`, {
      params,
      responseType: 'blob',
    });
  }

  /** Delete an object-bearing entity's blob only; clears its ObjectKey/ContentType. */
  deleteObject(entityPath: string, iri: string): Observable<unknown> {
    const params = new HttpParams().set('iri', iri);
    return this.http.delete(`/api/objects/${entityPath}/content`, { params });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Exploration — Runtime introspection
  // ═══════════════════════════════════════════════════════════════════════

  /** List all registered entity definitions. */
  exploreEntities(): Observable<AletheiaCollection<EntityDefinition>> {
    return this.http.get<AletheiaCollection<EntityDefinition>>('/api/entities/entity-definitions');
  }

  /** List all registered capability definitions. */
  exploreCapabilities(): Observable<AletheiaCollection<CapabilityDefinition>> {
    return this.http.get<AletheiaCollection<CapabilityDefinition>>('/api/entities/capability-definitions');
  }

  /** List all registered aspect definitions. */
  exploreAspects(): Observable<AletheiaCollection<AspectDefinition>> {
    return this.http.get<AletheiaCollection<AspectDefinition>>('/api/entities/aspect-definitions');
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Raw — Escape hatch for endpoints not yet covered
  // ═══════════════════════════════════════════════════════════════════════

  /** Raw HTTP request — for endpoints not covered by the typed helpers above. */
  request<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, options?: {
    body?: unknown;
    params?: HttpParams;
    headers?: HttpHeaders;
    responseType?: 'json' | 'blob';
  }): Observable<T> {
    return this.http.request<T>(method, url, {
      body: options?.body,
      params: options?.params,
      headers: options?.headers,
      responseType: (options?.responseType as 'json') ?? 'json',
    });
  }
}
