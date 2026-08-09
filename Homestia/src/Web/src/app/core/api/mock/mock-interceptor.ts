import { HttpInterceptorFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { createInitialStore, type MockStore } from './mock-data';
import type { AletheiaEntity, EntityListResponse } from '../models';

/**
 * Whether the app is running on the Angular dev server (port 4200).
 * When true → mock interceptor is active (no .NET backend needed).
 * When false (e.g. served by .NET on :5000, or production deploy) → real API calls pass through.
 */
function isNgServe(): boolean {
  return typeof window !== 'undefined' && window.location.port === '4200';
}

/**
 * Mock API interceptor for local development without the .NET backend.
 *
 * Route pattern: /api/entities/{entityPath}?iri={iri}
 * - GET    /api/entities/{path}           → list all
 * - GET    /api/entities/{path}?iri={iri} → get by iri
 * - POST   /api/entities/{path}           → create
 * - PUT    /api/entities/{path}?iri={iri} → update
 * - DELETE /api/entities/{path}?iri={iri} → delete
 */

// URL pattern: /api/entities/{path} (with optional query string)
const ENTITY_URL_RE = /^\/api\/entities\/([a-z-]+)(?:\?.*)?$/;

/** Parse all query parameters from the request URL. */
function getQueryParams(req: { url: string }): URLSearchParams {
  try {
    const url = new URL(req.url, 'http://localhost');
    return url.searchParams;
  } catch {
    return new URLSearchParams();
  }
}

// In-memory store survives Hot Module Replacement
let store: MockStore | null = null;

function getStore(): MockStore {
  if (!store) {
    store = createInitialStore();
  }
  return store;
}

function generateId(): string {
  return `mock-${crypto.randomUUID().slice(0, 8)}`;
}

function findEntity(collection: AletheiaEntity[], id: string): AletheiaEntity | undefined {
  return collection.find(e => e.iri === id);
}

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  // Only mock on the Angular dev server (port 4200).
  // When served by .NET (any other port, including :5000), pass through to the real API.
  if (!isNgServe()) {
    return next(req);
  }

  const match = req.url.match(ENTITY_URL_RE);
  if (!match) {
    return next(req);
  }

  const entityPath = match[1];
  const query = getQueryParams(req);
  const entityId = query.get('iri');
  const db = getStore();
  const collection = (db as unknown as Record<string, AletheiaEntity[]>)[entityPath];

  // If the entity path isn't in our mock store, pass through
  if (!collection) {
    return next(req);
  }

  // Simulate network latency
  const latency = 200 + Math.random() * 300;

  try {
    switch (req.method) {
      case 'GET': {
        if (entityId) {
          // GET /api/entities/{path}/{id}
          const entity = findEntity(collection, entityId);
          if (!entity) {
            return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })).pipe(delay(latency));
          }
          return of(new HttpResponse({ status: 200, body: entity })).pipe(delay(latency));
        }
        // GET /api/entities/{path} — with optional query filters
        let filtered = [...collection];

        // Apply query parameter filters (skip 'iri' — that's a single-entity lookup)
        query.forEach((value, key) => {
          if (key === 'iri') return;
          filtered = filtered.filter(e => {
            const field = (e as unknown as Record<string, unknown>)[key];
            // Match if field value equals the query value (string comparison)
            return String(field ?? '') === value;
          });
        });

        const response: EntityListResponse<AletheiaEntity> = {
          items: filtered,
          totalCount: filtered.length,
        };
        return of(new HttpResponse({ status: 200, body: response })).pipe(delay(latency));
      }

      case 'POST': {
        // POST /api/entities/{path}
        const body = req.body as Record<string, unknown> | null;
        const newEntity: AletheiaEntity = {
          iri: generateId(),
          ...(body ?? {}),
        } as AletheiaEntity;
        collection.push(newEntity);

        // Maintain inverse: if this is a room with isPartOf, add to parent property's segmentedInto
        if (entityPath === 'rooms' && body?.['isPartOf']) {
          const parentIri = body['isPartOf'] as string;
          const properties = (db as unknown as Record<string, AletheiaEntity[]>)['properties'];
          if (properties) {
            const parent = properties.find(p => p.iri === parentIri) as unknown as Record<string, unknown> | undefined;
            if (parent) {
              const segmented = (parent['segmentedInto'] as string[]) ?? [];
              if (!segmented.includes(newEntity.iri)) {
                (parent as Record<string, unknown>)['segmentedInto'] = [...segmented, newEntity.iri];
              }
            }
          }
        }

        return of(new HttpResponse({ status: 201, body: newEntity })).pipe(delay(latency));
      }

      case 'PUT': {
        // PUT /api/entities/{path}/{id}
        if (!entityId) {
          return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request — missing id' })).pipe(delay(latency));
        }
        const existingIndex = collection.findIndex(e => e.iri === entityId);
        if (existingIndex === -1) {
          return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })).pipe(delay(latency));
        }
        const body = req.body as Record<string, unknown> | null;
        const updated: AletheiaEntity = {
          ...collection[existingIndex],
          ...(body ?? {}),
          iri: entityId, // preserve id
        } as AletheiaEntity;
        collection[existingIndex] = updated;
        return of(new HttpResponse({ status: 200, body: updated })).pipe(delay(latency));
      }

      case 'DELETE': {
        // DELETE /api/entities/{path}/{id}
        if (!entityId) {
          return throwError(() => new HttpErrorResponse({ status: 400, statusText: 'Bad Request — missing id' })).pipe(delay(latency));
        }
        const idx = collection.findIndex(e => e.iri === entityId);
        if (idx === -1) {
          return throwError(() => new HttpErrorResponse({ status: 404, statusText: 'Not Found' })).pipe(delay(latency));
        }
        collection.splice(idx, 1);
        return of(new HttpResponse({ status: 204 })).pipe(delay(latency));
      }

      default:
        return next(req);
    }
  } catch (err) {
    return throwError(() => new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' })).pipe(delay(latency));
  }
};
