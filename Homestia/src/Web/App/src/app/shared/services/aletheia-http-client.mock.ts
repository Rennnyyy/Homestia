import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { AletheiaHttpClient } from './aletheia-http-client';
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
 * Tracked call record — stored for every method invocation so tests can assert
 * what was called and with which arguments.
 */
export interface MockCall {
  method: string;
  args: unknown[];
}

/**
 * AletheiaHttpClientMock — fully in-memory mock of {@link AletheiaHttpClient}.
 *
 * Every method records its calls in {@link calls} and returns an observable
 * from a configurable BehaviorSubject. Tests set the subject's value before
 * triggering the code under test, then assert against {@link calls}.
 *
 * Usage in TestBed:
 *   { provide: AletheiaHttpClient, useClass: AletheiaHttpClientMock }
 *
 * Usage in a spec:
 *   const mock = TestBed.inject(AletheiaHttpClient) as unknown as AletheiaHttpClientMock;
 *   mock.listResult.next({ items: [...], totalCount: 3 });
 *   // ... trigger component logic ...
 *   expect(mock.calls.find(c => c.method === 'list')).toBeTruthy();
 */
@Injectable()
export class AletheiaHttpClientMock {
  // ── Call tracking ──────────────────────────────────────────────────────

  readonly calls: MockCall[] = [];

  private track(method: string, args: unknown[]): void {
    this.calls.push({ method, args });
  }

  /** Reset all recorded calls and return subjects to defaults. */
  reset(): void {
    this.calls.length = 0;
    this.listResult.next({ items: [] });
    this.getResult.next(null);
    this.createResult.next({ iri: '' });
    this.updateResult.next({ iri: '' });
    this.deleteResult.next(undefined);
    this.executeResult.next({ success: true });
    this.objectUploadResult.next(undefined);
    this.downloadResult.next(new Blob());
    this.objectDeleteResult.next(undefined);
    this.exploreEntitiesResult.next({ items: [] });
    this.exploreCapabilitiesResult.next({ items: [] });
    this.exploreAspectsResult.next({ items: [] });
    this.requestResult.next(null);
  }

  // ── Configurable return subjects (per-endpoint) ────────────────────────

  readonly listResult = new BehaviorSubject<AletheiaCollection<unknown>>({ items: [] });
  readonly getResult = new BehaviorSubject<unknown>(null);
  readonly createResult = new BehaviorSubject<AletheiaCreatedResponse>({ iri: '' });
  readonly updateResult = new BehaviorSubject<AletheiaUpdatedResponse>({ iri: '' });
  readonly deleteResult = new BehaviorSubject<void | undefined>(undefined);
  readonly executeResult = new BehaviorSubject<CapabilityResponse<unknown>>({ success: true });
  readonly objectUploadResult = new BehaviorSubject<unknown>(undefined);
  readonly downloadResult = new BehaviorSubject<Blob>(new Blob());
  readonly objectDeleteResult = new BehaviorSubject<unknown>(undefined);
  readonly exploreEntitiesResult = new BehaviorSubject<AletheiaCollection<EntityDefinition>>({ items: [] });
  readonly exploreCapabilitiesResult = new BehaviorSubject<AletheiaCollection<CapabilityDefinition>>({ items: [] });
  readonly exploreAspectsResult = new BehaviorSubject<AletheiaCollection<AspectDefinition>>({ items: [] });
  readonly requestResult = new BehaviorSubject<unknown>(null);

  // ── Operations — Entity CRUD ───────────────────────────────────────────

  list<T>(entityPath: string, params?: HttpParams): Observable<AletheiaCollection<T>> {
    this.track('list', [entityPath, params]);
    return this.listResult.asObservable() as Observable<AletheiaCollection<T>>;
  }

  get<T>(entityPath: string, iri: string): Observable<T> {
    this.track('get', [entityPath, iri]);
    return this.getResult.asObservable() as Observable<T>;
  }

  create(entityPath: string, body: Record<string, unknown>): Observable<AletheiaCreatedResponse> {
    this.track('create', [entityPath, body]);
    return this.createResult.asObservable();
  }

  update(entityPath: string, iri: string, body: Record<string, unknown>): Observable<AletheiaUpdatedResponse> {
    this.track('update', [entityPath, iri, body]);
    return this.updateResult.asObservable();
  }

  delete(entityPath: string, iri: string): Observable<void> {
    this.track('delete', [entityPath, iri]);
    return this.deleteResult.asObservable() as Observable<void>;
  }

  // ── Capabilities ───────────────────────────────────────────────────────

  execute<TRequest, TResponse = unknown>(
    capabilityName: string,
    body: TRequest,
  ): Observable<CapabilityResponse<TResponse>> {
    this.track('execute', [capabilityName, body]);
    return this.executeResult.asObservable() as Observable<CapabilityResponse<TResponse>>;
  }

  // ── Objects — blob upload / download for [ObjectBearing] entities ───────

  uploadObject(entityPath: string, iri: string, file: File): Observable<unknown> {
    this.track('uploadObject', [entityPath, iri, file]);
    return this.objectUploadResult.asObservable();
  }

  downloadObject(entityPath: string, iri: string): Observable<Blob> {
    this.track('downloadObject', [entityPath, iri]);
    return this.downloadResult.asObservable();
  }

  deleteObject(entityPath: string, iri: string): Observable<unknown> {
    this.track('deleteObject', [entityPath, iri]);
    return this.objectDeleteResult.asObservable();
  }

  // ── Exploration ────────────────────────────────────────────────────────

  exploreEntities(): Observable<AletheiaCollection<EntityDefinition>> {
    this.track('exploreEntities', []);
    return this.exploreEntitiesResult.asObservable();
  }

  exploreCapabilities(): Observable<AletheiaCollection<CapabilityDefinition>> {
    this.track('exploreCapabilities', []);
    return this.exploreCapabilitiesResult.asObservable();
  }

  exploreAspects(): Observable<AletheiaCollection<AspectDefinition>> {
    this.track('exploreAspects', []);
    return this.exploreAspectsResult.asObservable();
  }

  // ── Raw escape hatch ───────────────────────────────────────────────────

  request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    url: string,
    options?: { body?: unknown; params?: HttpParams; responseType?: 'json' | 'blob' },
  ): Observable<T> {
    this.track('request', [method, url, options]);
    return this.requestResult.asObservable() as Observable<T>;
  }
}

/**
 * Provider factory for TestBed. Replaces {@link AletheiaHttpClient} with the mock.
 *
 * Usage:
 *   TestBed.configureTestingModule({
 *     providers: [provideAletheiaHttpClientMock()],
 *   });
 *
 * Then cast to access mock-specific members:
 *   const mock = TestBed.inject(AletheiaHttpClient) as unknown as AletheiaHttpClientMock;
 */
export function provideAletheiaHttpClientMock() {
  return { provide: AletheiaHttpClient, useClass: AletheiaHttpClientMock };
}
