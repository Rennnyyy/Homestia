import { Injectable, InjectionToken, inject, Type } from '@angular/core';
import type { EntityPropertyInfo } from './aletheia-http-client.models';

/**
 * A renderer component receives these inputs from the DynamicFormComponent.
 * Implement this interface on any custom field renderer.
 */
export interface FieldRendererInputs {
  /** The property definition from the entity model. */
  property: EntityPropertyInfo;
  /** Current value of the field (undefined if not set). */
  value: unknown;
  /** Display mode: view, edit, or create. */
  mode: 'view' | 'edit' | 'create';
  /** The entity's predicate path (e.g. "properties") for i18n lookup. */
  entityPath: string;
  /** Whether the field is disabled (view mode). */
  disabled: boolean;
}

/**
 * A renderer kind — a string key the template switches on.
 * Built-in kinds: text, number, boolean, entity-ref, iri.
 * Register custom kinds via FieldRendererRegistry.
 */
export type RendererKind = string;

/**
 * Resolves which renderer kind to use for a given property type.
 * Override or extend by providing a custom resolver function.
 */
export type RendererResolver = (prop: EntityPropertyInfo) => RendererKind;

/** Injection token for custom renderer resolvers. */
export const FIELD_RENDERER_RESOLVER = new InjectionToken<RendererResolver>(
  'FIELD_RENDERER_RESOLVER',
);

/**
 * Default type → renderer mapping.
 * Covers the Aletheia SDK's common property types.
 */
const DEFAULT_TYPE_MAP: Record<string, RendererKind> = {
  String: 'text',
  Decimal: 'number',
  Int32: 'number',
  Int64: 'number',
  Single: 'number',
  Double: 'number',
  Boolean: 'boolean',
  DateTime: 'text', // text for now; swap in a date-picker later
  DateTimeOffset: 'text',
  EntityRef: 'entity-ref',
  EntityRefCollection: 'entity-ref',
};

const IRI_PROPERTY_NAME = '@id';

/**
 * FieldRendererRegistry — resolves which renderer kind to use for a given
 * Aletheia entity property. Extensible via the FIELD_RENDERER_RESOLVER token.
 *
 * Usage:
 *   providers: [{ provide: FIELD_RENDERER_RESOLVER, useValue: myResolver }]
 */
@Injectable({ providedIn: 'root' })
export class FieldRendererRegistry {
  private readonly customResolver = inject(FIELD_RENDERER_RESOLVER, { optional: true });

  /**
   * Resolve the renderer kind for a property.
   * Falls back to 'text' for unknown types.
   */
  resolve(prop: EntityPropertyInfo): RendererKind {
    // IRI is special — always mapped to 'iri'
    if (prop.name === IRI_PROPERTY_NAME) {
      return 'iri';
    }
    if (this.customResolver) {
      return this.customResolver(prop);
    }
    return DEFAULT_TYPE_MAP[prop.type] ?? 'text';
  }

  /**
   * Returns true if the property is the RDF @id (IRI) field.
   */
  isIri(prop: EntityPropertyInfo): boolean {
    return prop.name === IRI_PROPERTY_NAME;
  }

  /**
   * Returns true if the field should be hidden entirely based on mode.
   * IRI is hidden in create mode, shown in view/edit.
   */
  isHidden(prop: EntityPropertyInfo, mode: 'view' | 'edit' | 'create'): boolean {
    return this.isIri(prop) && mode === 'create';
  }
}
