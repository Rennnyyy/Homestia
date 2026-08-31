/**
 * Unit tests for AletheiaHttpClient — verifies every method constructs the
 * correct URL, HTTP verb, and passes body/params through to HttpClient.
 */
import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AletheiaHttpClient } from './aletheia-http-client';
import {
  AletheiaCollection,
  AletheiaCreatedResponse,
  CapabilityResponse,
  EntityDefinition,
  CapabilityDefinition,
  AspectDefinition,
} from './aletheia-http-client.models';

describe('AletheiaHttpClient', () => {
  let client: AletheiaHttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    client = TestBed.inject(AletheiaHttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // ensure no outstanding requests
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Operations — Entity CRUD
  // ═══════════════════════════════════════════════════════════════════════

  describe('list', () => {
    it('GETs /api/entities/{path} and returns the collection', () => {
      const mockCollection: AletheiaCollection<{ id: string }> = {
        items: [{ id: '1' }, { id: '2' }],
        totalCount: 2,
      };

      client.list<{ id: string }>('properties').subscribe((c) => {
        expect(c.items).toHaveLength(2);
        expect(c.totalCount).toBe(2);
      });

      const req = httpMock.expectOne('/api/entities/properties');
      expect(req.request.method).toBe('GET');
      req.flush(mockCollection);
    });

    it('passes query params when provided', () => {
      const params = new HttpParams().set('page', '1').set('size', '10');

      client.list('properties', params).subscribe();

      const req = httpMock.expectOne(
        (r) => r.url === '/api/entities/properties' && r.params.get('page') === '1',
      );
      expect(req.request.method).toBe('GET');
      req.flush({ items: [] });
    });
  });

  describe('get', () => {
    it('GETs /api/entities/{path}?iri=...', () => {
      const mockEntity = { iri: 'https://example.com/abc', address: '123 Main St' };
      const iri = 'https://example.com/abc';

      client.get<{ iri: string; address: string }>('properties', iri).subscribe((e) => {
        expect(e.iri).toBe(iri);
        expect(e.address).toBe('123 Main St');
      });

      const req = httpMock.expectOne((r) => r.url === '/api/entities/properties' && r.params.get('iri') === iri);
      expect(req.request.method).toBe('GET');
      req.flush(mockEntity);
    });
  });

  describe('create', () => {
    it('POSTs to /api/entities/{path} and returns { iri }', () => {
      const body = { address: 'New Property' };
      const created = { iri: 'https://example.com/new-1' };

      client.create('properties', body).subscribe((r) => {
        expect(r.iri).toBe('https://example.com/new-1');
      });

      const req = httpMock.expectOne('/api/entities/properties');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush(created);
    });
  });

  describe('update', () => {
    it('PUTs to /api/entities/{path}?iri=... with body', () => {
      const iri = 'https://example.com/abc';
      const body = { address: 'Updated Address' };

      client.update('properties', iri, body).subscribe((r) => {
        expect(r.iri).toBe(iri);
      });

      const req = httpMock.expectOne((r) => r.url === '/api/entities/properties' && r.params.get('iri') === iri);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({ iri });
    });
  });

  describe('delete', () => {
    it('DELETEs /api/entities/{path}?iri=...', () => {
      const iri = 'https://example.com/abc';
      let completed = false;

      client.delete('properties', iri).subscribe({
        complete: () => (completed = true),
      });

      const req = httpMock.expectOne((r) => r.url === '/api/entities/properties' && r.params.get('iri') === iri);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
      expect(completed).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Capabilities
  // ═══════════════════════════════════════════════════════════════════════

  describe('execute', () => {
    it('POSTs to /api/capabilities/{name} with request body', () => {
      const request = { name: 'World' };
      const response: CapabilityResponse<{ greeting: string }> = {
        success: true,
        data: { greeting: 'Hello, World' },
      };

      client.execute<{ name: string }, { greeting: string }>('greet', request).subscribe((r) => {
        expect(r.success).toBe(true);
        expect(r.data?.greeting).toBe('Hello, World');
      });

      const req = httpMock.expectOne('/api/capabilities/greet');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });

    it('handles capability errors', () => {
      const errorResponse: CapabilityResponse = {
        success: false,
        errors: [{ code: 'INVALID', message: 'Bad request' }],
      };

      client.execute('greet', {}).subscribe((r) => {
        expect(r.success).toBe(false);
        expect(r.errors).toHaveLength(1);
      });

      const req = httpMock.expectOne('/api/capabilities/greet');
      req.flush(errorResponse);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Objects
  // ═══════════════════════════════════════════════════════════════════════

  describe('uploadObject', () => {
    it('PUTs a multipart FormData with a content part to /api/objects/{path}/content', () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      client.uploadObject('rental-documents', 'https://iri/doc-1', file).subscribe();

      const req = httpMock.expectOne((r) =>
        r.method === 'PUT' &&
        r.url === '/api/objects/rental-documents/content' &&
        r.params.get('iri') === 'https://iri/doc-1');
      expect(req.request.body instanceof FormData).toBe(true);
      const sent = req.request.body.get('content') as File;
      expect(sent.name).toBe('test.txt');
      expect(sent.type).toBe('text/plain');
      req.flush({});
    });
  });

  describe('downloadObject', () => {
    it('GETs /api/objects/{path}/content?iri=... as blob', () => {
      const blob = new Blob(['data'], { type: 'application/pdf' });

      client.downloadObject('rental-documents', 'https://iri/doc-1').subscribe((b) => {
        expect(b instanceof Blob).toBe(true);
      });

      const req = httpMock.expectOne((r) =>
        r.method === 'GET' &&
        r.url === '/api/objects/rental-documents/content' &&
        r.params.get('iri') === 'https://iri/doc-1');
      expect(req.request.responseType).toBe('blob');
      req.flush(blob);
    });
  });

  describe('deleteObject', () => {
    it('DELETEs /api/objects/{path}/content?iri=...', () => {
      client.deleteObject('rental-documents', 'https://iri/doc-1').subscribe();

      const req = httpMock.expectOne((r) =>
        r.method === 'DELETE' &&
        r.url === '/api/objects/rental-documents/content' &&
        r.params.get('iri') === 'https://iri/doc-1');
      req.flush({});
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Exploration
  // ═══════════════════════════════════════════════════════════════════════

  describe('exploreEntities', () => {
    it('GETs /api/entities/entity-definitions', () => {
      const collection: AletheiaCollection<EntityDefinition> = {
        items: [{
          clrTypeIdentifier: 'Test', name: 'Property', clrNamespace: '', assemblyName: '',
          entityPath: 'properties', predicatePath: 'properties', iriPrefix: '', typeIri: '',
          definitionOrigin: '', isObjectBearing: false, identityStrategy: '', isEnumeration: false,
          properties: [], owningRelations: [], incomingRelations: [], iri: 'https://test/1',
        }],
      };

      client.exploreEntities().subscribe((res) => {
        expect(res.items).toHaveLength(1);
        expect(res.items[0].predicatePath).toBe('properties');
      });

      const req = httpMock.expectOne('/api/entities/entity-definitions');
      expect(req.request.method).toBe('GET');
      req.flush(collection);
    });
  });

  describe('exploreCapabilities', () => {
    it('GETs /api/entities/capability-definitions', () => {
      const collection: AletheiaCollection<CapabilityDefinition> = {
        items: [{ name: 'greet', description: 'Greets', requestType: 'GreetRequest', responseType: 'GreetResponse', iri: 'https://test/cap/1' }],
      };

      client.exploreCapabilities().subscribe((res) => {
        expect(res.items[0].name).toBe('greet');
      });

      const req = httpMock.expectOne('/api/entities/capability-definitions');
      expect(req.request.method).toBe('GET');
      req.flush(collection);
    });
  });

  describe('exploreAspects', () => {
    it('GETs /api/entities/aspect-definitions', () => {
      const collection: AletheiaCollection<AspectDefinition> = {
        items: [{ name: 'ValidationAspect', description: 'Validates', iri: 'https://test/asp/1' }],
      };

      client.exploreAspects().subscribe((res) => {
        expect(res.items[0].name).toBe('ValidationAspect');
      });

      const req = httpMock.expectOne('/api/entities/aspect-definitions');
      expect(req.request.method).toBe('GET');
      req.flush(collection);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Raw request
  // ═══════════════════════════════════════════════════════════════════════

  describe('request', () => {
    it('sends a raw GET', () => {
      client.request<{ ok: boolean }>('GET', '/api/custom').subscribe((r) => {
        expect(r.ok).toBe(true);
      });

      const req = httpMock.expectOne('/api/custom');
      expect(req.request.method).toBe('GET');
      req.flush({ ok: true });
    });

    it('sends a raw POST with body', () => {
      const body = { key: 'value' };

      client.request<{ echo: string }>('POST', '/api/custom', { body }).subscribe((r) => {
        expect(r.echo).toBe('value');
      });

      const req = httpMock.expectOne('/api/custom');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ echo: 'value' });
    });

    it('supports blob responseType', () => {
      const blob = new Blob();

      client.request<Blob>('GET', '/api/custom', { responseType: 'blob' }).subscribe((b) => {
        expect(b instanceof Blob).toBe(true);
      });

      const req = httpMock.expectOne('/api/custom');
      expect(req.request.responseType).toBe('blob');
      req.flush(blob);
    });
  });
});
