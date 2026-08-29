// Auto-generated from http://localhost:5000/api/entities/entity-definitions — do not edit manually.
// Entity: Studio  |  predicatePath: "studio"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Studio {
  /** isPartOf → Property */
  isPartOf: unknown;
  /** The entity's unique IRI. */
  iri: string;
  /** Inherited — resolved from entity hierarchy. */
  isCommonArea: boolean;
  /** Inherited — resolved from entity hierarchy. */
  name: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="StudioEntity"&gt; */
export const StudioEntity: EntityInfo = {
  entityPath: 'studios',
  predicatePath: 'studio',
  displayName: 'Studio',
  properties: [
    { name: 'isPartOf', type: 'EntityRef', isCollection: false, targetEntityPath: 'properties' },
    { name: 'isCommonArea', type: 'Boolean', isCollection: false },
    { name: 'name', type: 'String', isCollection: false },
  ],
};
