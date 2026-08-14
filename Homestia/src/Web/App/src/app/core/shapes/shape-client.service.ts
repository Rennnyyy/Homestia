import { HttpClient, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { ShapeInfo } from './shape.model';

interface CachedShape {
  ttl: string;
  etag: string;
}

/**
 * ShapeClientService — fetches frontend shapes from the SDK's exploration
 * endpoint: GET /api/entities/aspect-definitions/{iri}/view.
 *
 * Caching strategy: the first fetch is cached in memory; subsequent calls
 * revalidate with `If-None-Match` so a 304 keeps the cached TTL. Shapes are
 * static per deployment, so memory caching is sufficient — no disk, no TTL.
 */
@Injectable({ providedIn: 'root' })
export class ShapeClientService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, CachedShape>();
  private readonly pending = new Map<string, Promise<string>>();

  /** Lists all shapes available in the exploration catalog. */
  listShapes(): Promise<ShapeInfo[]> {
    return firstValueFrom(
      this.http.get<{ items: { aspectFamily?: string; aspectIri?: string; iri?: string; etag?: string }[] }>(
        '/api/entities/aspect-definitions',
      ),
    ).then((response) =>
      (response.items ?? [])
        .filter((item) => item.aspectFamily === 'shape')
        .map((item) => ({
          key: item.aspectIri ?? item.iri ?? '',
          iri: item.aspectIri ?? item.iri ?? '',
          etag: item.etag ?? '',
        })),
    );
  }

  /** Fetches the Turtle source of a shape by its IRI (cached + revalidated). */
  getShapeTtl(iri: string): Promise<string> {
    const cached = this.cache.get(iri);
    if (cached) return Promise.resolve(cached.ttl);

    const pending = this.pending.get(iri);
    if (pending) return pending;

    const request = this.fetchTtl(iri, cached).then(
      (result) => {
        this.cache.set(iri, result);
        return result.ttl;
      },
      (error) => {
        throw error;
      },
    ).finally(() => this.pending.delete(iri));

    this.pending.set(iri, request);
    return request;
  }

  private async fetchTtl(iri: string, cached: CachedShape | undefined): Promise<CachedShape> {
    const headers = new HttpHeaders(
      cached ? { 'If-None-Match': `"${cached.etag}"` } : {},
    );

    try {
      const response = await firstValueFrom(
        this.http.get(`/api/entities/aspect-definitions/${encodeURIComponent(iri)}/view`, {
          headers,
          observe: 'response',
          responseType: 'text',
        }),
      );
      return {
        ttl: response.body ?? '',
        etag: parseEtag(response) ?? cached?.etag ?? '',
      };
    } catch (error) {
      // 304 Not Modified → the cached copy is still current.
      if (isNotModified(error) && cached) return cached;
      throw error;
    }
  }
}

function parseEtag(response: HttpResponse<string>): string | null {
  const value = response.headers.get('ETag');
  return value ? value.replaceAll('"', '') : null;
}

function isNotModified(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status: number }).status === 304
  );
}
