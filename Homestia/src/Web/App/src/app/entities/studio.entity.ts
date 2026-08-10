// Auto-generated from http://localhost:5001/api/entities/entity-definitions — do not edit manually.
// Entity: Studio  |  predicatePath: "studio"  |  enum: false

import type { EntityInfo } from '../shared/services/aletheia-http-client.models';

// ── API response interface ────────────────────────────────────────────────

export interface Studio {
  /** isPartOf → Property */
  isPartOf: unknown;
  /** The entity's unique IRI. */
  iri: string;
}

// ── Dynamic form definition ───────────────────────────────────────────────

/** Pass to &lt;app-dynamic-entity-form [entity]="StudioEntity"&gt; */
export const StudioEntity: EntityInfo = {
  entityPath: 'studios',
  predicatePath: 'studio',
  displayName: 'Studio',
  properties: [
    { name: 'isPartOf', type: 'EntityRef', isCollection: false },
  ],
};
