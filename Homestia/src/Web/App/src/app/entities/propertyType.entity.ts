// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: PropertyType  |  predicatePath: "propertyType"  |  enum: true

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface PropertyType {
  /** key */
  key: string;
  /** displayName */
  displayName: string;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="PropertyTypeEntity"&gt; */
export const PropertyTypeEntity: EntityInfo = {
  entityPath: 'property-types',
  predicatePath: 'propertyType',
  displayName: 'PropertyType',
  properties: [
    { name: 'key', type: 'String', isCollection: false },
    { name: 'displayName', type: 'String', isCollection: false },
  ],
};

// ── Enumeration values ─────────────────────────────────────────────────

/** Valid keys for this enumeration. */
export const PropertyTypeValues = {
  "apartment": "Apartment",
  "studio": "Studio",
} as const;

/** Union type of valid keys. */
export type PropertyTypeKey = keyof typeof PropertyTypeValues;
