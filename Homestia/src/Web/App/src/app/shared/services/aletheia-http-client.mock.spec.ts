/**
 * Unit tests for AletheiaHttpClientMock — verifies call tracking,
 * configurable return subjects, and the reset() method.
 */
import { TestBed } from '@angular/core/testing';
import { HttpParams } from '@angular/common/http';
import { describe, it, expect, beforeEach } from 'vitest';
import { AletheiaHttpClient } from './aletheia-http-client';
import {
  AletheiaHttpClientMock,
  provideAletheiaHttpClientMock,
} from './aletheia-http-client.mock';
import { AletheiaCollection } from './aletheia-http-client.models';

describe('AletheiaHttpClientMock', () => {
  let mock: AletheiaHttpClientMock;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideAletheiaHttpClientMock()],
    });
    // The injector returns the mock cast as the real type; cast back for access to mock members.
    mock = TestBed.inject(AletheiaHttpClient) as unknown as AletheiaHttpClientMock;
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Provider
  // ═══════════════════════════════════════════════════════════════════════

  it('replaces AletheiaHttpClient with the mock in DI', () => {
    const injected = TestBed.inject(AletheiaHttpClient);
    expect(injected).toBeInstanceOf(AletheiaHttpClientMock);
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Call tracking
  // ═══════════════════════════════════════════════════════════════════════

  it('tracks list calls with entityPath and params', () => {
    const params = new HttpParams().set('page', '1');
    mock.list('properties', params).subscribe();
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].method).toBe('list');
    expect(mock.calls[0].args).toEqual(['properties', params]);
  });

  it('tracks get calls', () => {
    mock.get('properties', 'abc').subscribe();
    expect(mock.calls[0].method).toBe('get');
    expect(mock.calls[0].args).toEqual(['properties', 'abc']);
  });

  it('tracks create calls with body', () => {
    const body = { address: 'Test' };
    mock.create('properties', body).subscribe();
    expect(mock.calls[0].method).toBe('create');
    expect(mock.calls[0].args).toEqual(['properties', body]);
  });

  it('tracks update calls', () => {
    const body = { address: 'Updated' };
    mock.update('properties', 'abc', body).subscribe();
    expect(mock.calls[0].method).toBe('update');
    expect(mock.calls[0].args).toEqual(['properties', 'abc', body]);
  });

  it('tracks delete calls', () => {
    mock.delete('properties', 'abc').subscribe();
    expect(mock.calls[0].method).toBe('delete');
    expect(mock.calls[0].args).toEqual(['properties', 'abc']);
  });

  it('tracks execute calls', () => {
    const body = { name: 'World' };
    mock.execute('greet', body).subscribe();
    expect(mock.calls[0].method).toBe('execute');
    expect(mock.calls[0].args).toEqual(['greet', body]);
  });

  it('tracks upload calls', () => {
    const file = new File([], 'test.txt');
    mock.upload(file).subscribe();
    expect(mock.calls[0].method).toBe('upload');
    expect(mock.calls[0].args[0]).toBe(file);
  });

  it('tracks download calls', () => {
    mock.download('obj-1').subscribe();
    expect(mock.calls[0].method).toBe('download');
    expect(mock.calls[0].args).toEqual(['obj-1']);
  });

  it('tracks exploreEntities calls', () => {
    mock.exploreEntities().subscribe();
    expect(mock.calls[0].method).toBe('exploreEntities');
  });

  it('tracks exploreCapabilities calls', () => {
    mock.exploreCapabilities().subscribe();
    expect(mock.calls[0].method).toBe('exploreCapabilities');
  });

  it('tracks exploreAspects calls', () => {
    mock.exploreAspects().subscribe();
    expect(mock.calls[0].method).toBe('exploreAspects');
  });

  it('tracks raw request calls', () => {
    mock.request('POST', '/api/custom', { body: { x: 1 } }).subscribe();
    expect(mock.calls[0].method).toBe('request');
  });

  it('accumulates multiple calls in order', () => {
    mock.list('properties').subscribe();
    mock.get('properties', '1').subscribe();
    mock.delete('properties', '1').subscribe();
    expect(mock.calls).toHaveLength(3);
    expect(mock.calls[0].method).toBe('list');
    expect(mock.calls[1].method).toBe('get');
    expect(mock.calls[2].method).toBe('delete');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Configurable return values
  // ═══════════════════════════════════════════════════════════════════════

  it('emits the configured listResult', () => {
    const items = [{ id: '1' }, { id: '2' }];
    let result: AletheiaCollection<unknown> | undefined;

    mock.list('properties').subscribe((r) => (result = r));
    mock.listResult.next({ items, totalCount: 2 });

    expect(result?.items).toEqual(items);
    expect(result?.totalCount).toBe(2);
  });

  it('emits the configured getResult', () => {
    let result: unknown;
    mock.get('properties', '1').subscribe((r) => (result = r));
    mock.getResult.next({ id: '1', address: 'Test' });
    expect(result).toEqual({ id: '1', address: 'Test' });
  });

  it('emits the configured executeResult', () => {
    let result: unknown;
    mock.execute('greet', {}).subscribe((r) => (result = r));
    mock.executeResult.next({ success: true, data: { greeting: 'Hi' } });
    expect(result).toEqual({ success: true, data: { greeting: 'Hi' } });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Reset
  // ═══════════════════════════════════════════════════════════════════════

  it('reset clears all recorded calls', () => {
    mock.list('properties').subscribe();
    mock.get('properties', '1').subscribe();
    expect(mock.calls).toHaveLength(2);

    mock.reset();
    expect(mock.calls).toHaveLength(0);
  });

  it('reset returns subjects to defaults', () => {
    mock.listResult.next({ items: [{ id: 'stale' }], totalCount: 99 });
    mock.reset();

    let result: AletheiaCollection<unknown> | undefined;
    mock.list('properties').subscribe((r) => (result = r));
    // After reset, the subject emits the default empty collection.
    expect(result?.items).toEqual([]);
    expect(result?.totalCount).toBeUndefined();
  });
});
