/**
 * Unit tests for FieldRendererRegistry — verifies default mappings,
 * custom registration, unregistration, and fallback behavior.
 */
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  FieldRendererRegistry,
  FieldRendererConfig,
} from './field-renderer-registry.service';
import type { EntityPropertyInfo } from '../../services/aletheia-http-client.models';

describe('FieldRendererRegistry', () => {
  let registry: FieldRendererRegistry;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    registry = TestBed.inject(FieldRendererRegistry);
  });

  function prop(name: string, type: string, isCollection = false): EntityPropertyInfo {
    return { name, type, isCollection };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Defaults
  // ═══════════════════════════════════════════════════════════════════════

  it('maps String → text renderer', () => {
    expect(registry.resolve(prop('address', 'String')).template).toBe('text');
    expect(registry.resolve(prop('address', 'String')).inputType).toBe('text');
  });

  it('maps Decimal → number renderer', () => {
    expect(registry.resolve(prop('price', 'Decimal')).template).toBe('number');
  });

  it('maps Int32 → number renderer', () => {
    expect(registry.resolve(prop('count', 'Int32')).template).toBe('number');
  });

  it('maps Int64 → number renderer', () => {
    expect(registry.resolve(prop('bigCount', 'Int64')).template).toBe('number');
  });

  it('maps Boolean → checkbox renderer', () => {
    expect(registry.resolve(prop('active', 'Boolean')).template).toBe('checkbox');
  });

  it('maps DateTime → date renderer', () => {
    expect(registry.resolve(prop('created', 'DateTime')).template).toBe('date');
    expect(registry.resolve(prop('created', 'DateTime')).inputType).toBe('date');
  });

  it('maps EntityRef → select renderer', () => {
    expect(registry.resolve(prop('owner', 'EntityRef')).template).toBe('select');
  });

  it('maps EntityRef isCollection → select renderer', () => {
    const p = prop('items', 'EntityRef', true);
    expect(registry.resolve(p).template).toBe('select');
  });

  it('falls back to text for unknown types', () => {
    const p = prop('custom', 'CustomUnknown');
    expect(registry.resolve(p).template).toBe('text');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Custom registration
  // ═══════════════════════════════════════════════════════════════════════

  it('register overrides a default type', () => {
    registry.register('String', { template: 'textarea' });
    expect(registry.resolve(prop('desc', 'String')).template).toBe('textarea');
  });

  it('register adds a new custom type', () => {
    registry.register('Email', { template: 'text', inputType: 'email' });
    const p = prop('contact', 'Email');
    expect(registry.resolve(p).template).toBe('text');
    expect(registry.resolve(p).inputType).toBe('email');
  });

  // ═══════════════════════════════════════════════════════════════════════
  // Unregister
  // ═══════════════════════════════════════════════════════════════════════

  it('unregister restores the default for a type', () => {
    registry.register('String', { template: 'textarea' });
    expect(registry.resolve(prop('x', 'String')).template).toBe('textarea');

    registry.unregister('String');
    expect(registry.resolve(prop('x', 'String')).template).toBe('text');
  });

  it('unregister removes a custom type entirely (falls back to text)', () => {
    registry.register('Email', { template: 'text', inputType: 'email' });
    registry.unregister('Email');
    expect(registry.resolve(prop('x', 'Email')).template).toBe('text');
  });
});
