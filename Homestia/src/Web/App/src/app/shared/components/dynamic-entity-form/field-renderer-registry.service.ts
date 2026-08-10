import { Injectable, Type } from '@angular/core';
import type { EntityPropertyInfo } from '../../services/aletheia-http-client.models';

/**
 * Config for a field renderer. Describes how a property type should be rendered.
 *
 * For now we use a string template name. When custom components are needed,
 * change `template` to a `Type<unknown>` component reference.
 */
export interface FieldRendererConfig {
  /** Template name: 'text', 'number', 'checkbox', 'date', 'select', 'textarea'. */
  template: string;
  /** Input type for <input /> elements. */
  inputType?: string;
  /** Whether the field is read-only (view mode only). */
  readOnly?: boolean;
}

/**
 * FieldRendererRegistry — maps Aletheia property types to renderer configs.
 *
 * Default renderers are registered eagerly. Feature modules can call
 * `register()` to override or add custom renderers for specific types.
 *
 * Usage:
 *   registry.register('MyCustomType', { template: 'custom', ... });
 */
@Injectable({ providedIn: 'root' })
export class FieldRendererRegistry {
  private readonly map = new Map<string, FieldRendererConfig>();

  constructor() {
    this.registerDefaults();
  }

  /** Register or override the renderer for a given Aletheia type name. */
  register(typeName: string, config: FieldRendererConfig): void {
    this.map.set(typeName, config);
  }

  /** Get the renderer config for a property, falling back to 'text'. */
  resolve(prop: EntityPropertyInfo): FieldRendererConfig {
    if (prop.isCollection && prop.type === 'EntityRef') {
      return this.map.get('EntityRefCollection') ?? { template: 'text' };
    }
    return this.map.get(prop.type) ?? { template: 'text' };
  }

  /** Remove a custom registration (restore default on next resolve). */
  unregister(typeName: string): void {
    this.map.delete(typeName);
    // Re-register default if one existed
    const defaults = this.buildDefaults();
    if (defaults.has(typeName)) {
      this.map.set(typeName, defaults.get(typeName)!);
    }
  }

  private registerDefaults(): void {
    const defaults = this.buildDefaults();
    defaults.forEach((config, type) => this.map.set(type, config));
  }

  private buildDefaults(): Map<string, FieldRendererConfig> {
    const d = new Map<string, FieldRendererConfig>();
    d.set('String', { template: 'text', inputType: 'text' });
    d.set('Decimal', { template: 'number', inputType: 'number' });
    d.set('Int32', { template: 'number', inputType: 'number' });
    d.set('Int64', { template: 'number', inputType: 'number' });
    d.set('Boolean', { template: 'checkbox' });
    d.set('DateTime', { template: 'date', inputType: 'date' });
    d.set('EntityRef', { template: 'select' });
    d.set('EntityRefCollection', { template: 'select' });
    return d;
  }
}
